from agent.llm_client import analyze_vulnerabilities

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
import os, json, re, uuid
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv
from mem0 import MemoryClient
from agent.tools_semgrep import run_semgrep, read_file_snippet, remediation_hint
from agent.github_utils import clone_repo, delete_repo
from agent.iac_scanner import run_checkov_scan

load_dotenv()

# ─── App Setup ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="AI DevSecOps Scanner API",
    version="2.0",
    description="AI-powered security scanner — Gemini 2.5 Flash + Semgrep + Checkov + Mem0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

memory_client = MemoryClient(api_key=os.getenv("MEM0_API_KEY", ""))

# In-memory scan status tracker  {scan_id: {...}}
_active_scans: dict = {}

GITHUB_URL_RE = re.compile(
    r'^https?://(www\.)?github\.com/[\w.\-]+/[\w.\-]+(\.git)?/?$'
)

# ─── Models ───────────────────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    path: str

class GithubScanRequest(BaseModel):
    repo_url: str

    @field_validator("repo_url")
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        v = v.strip().rstrip("/")
        if not GITHUB_URL_RE.match(v):
            raise ValueError(
                "Invalid GitHub URL. Expected: https://github.com/owner/repo"
            )
        return v

# ─── Helpers ─────────────────────────────────────────────────────────────────

def sanitize_for_json(text: str) -> str:
    try:
        text.encode("utf-8")
        return text
    except Exception:
        return text.encode("ascii", "ignore").decode("ascii")


def _store_findings_in_mem0(results: list, repo_name: str, scan_type: str = "code") -> int:
    """Store scan findings in Mem0 memory. Returns count stored."""
    stored = 0
    for r in results:
        try:
            if scan_type == "iac":
                file_path = r.get("file_path", "")
                severity = r.get("severity", "UNKNOWN")
                check_id = r.get("check_id", "")
                content = (
                    f"IaC issue in {file_path} — {r.get('check_name', '')} "
                    f"({check_id}) severity={severity} guideline={r.get('guideline','')}"
                )
            else:
                extra = r.get("extra", {}) or {}
                meta = extra.get("metadata", {}) or {}
                file_path = r.get("path", "")
                start_line = r.get("start", {}).get("line", 0)
                end_line = r.get("end", {}).get("line", start_line)
                severity = extra.get("severity", "UNKNOWN")
                message = extra.get("message", "")
                snippet = read_file_snippet(file_path, start_line, end_line)
                content = (
                    f"Code vuln in {file_path}:{start_line}-{end_line} "
                    f"[{severity}] {message} "
                    f"CWE={','.join(meta.get('cwe',[]))} "
                    f"OWASP={','.join(meta.get('owasp',[]))}\n"
                    f"Snippet:\n{snippet.get('snippet','')[:300]}"
                )
                check_id = r.get("check_id", "")

            memory_client.add(
                messages=[
                    {"role": "user", "content": f"Scan for {repo_name}"},
                    {"role": "assistant", "content": content},
                ],
                user_id="ai_code_scanner",
                metadata={
                    "repo": repo_name,
                    "file": file_path,
                    "severity": severity,
                    "rule_id": check_id,
                    "type": scan_type,
                    "scanned_at": datetime.utcnow().isoformat(),
                },
            )
            stored += 1
        except Exception as e:
            print(f"Mem0 storage error: {e}")
    return stored


def _fetch_related(repo_name: str, scan_type: str = "code") -> list:
    try:
        return memory_client.search(
            query=repo_name,
            user_id="ai_code_scanner",
            limit=3,
        )
    except Exception:
        return []

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def home():
    return {
        "message": "AI DevSecOps Scanner API v2.0 — Gemini 2.5 Flash",
        "docs": "/docs",
        "endpoints": ["/", "/health", "/scan", "/scan-github", "/scan-iac", "/scan-history", "/scan-status/{id}"]
    }


@app.get("/health")
async def health_check():
    """Check Gemini + Mem0 connectivity."""
    status = {
        "api": "ok",
        "gemini": "unknown",
        "mem0": "unknown",
        "model": os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        "timestamp": datetime.utcnow().isoformat(),
    }
    try:
        from agent.llm_client import SecurityAnalyzer
        analyzer = SecurityAnalyzer()
        test = analyzer.llm.invoke("Reply with one word: healthy")
        status["gemini"] = "ok" if test else "error"
    except Exception as e:
        status["gemini"] = f"error: {str(e)[:100]}"

    try:
        memory_client.search(query="health_check", user_id="ai_code_scanner", limit=1)
        status["mem0"] = "ok"
    except Exception as e:
        status["mem0"] = f"error: {str(e)[:100]}"

    status["status"] = "healthy" if status["gemini"] == "ok" and status["mem0"] == "ok" else "degraded"
    return status


@app.get("/scan-history")
async def get_scan_history(limit: int = 20):
    """Retrieve past scan results from Mem0."""
    try:
        memories = memory_client.get_all(user_id="ai_code_scanner", limit=limit)
        history = [
            {
                "id": m.get("id"),
                "content": m.get("memory", "")[:300],
                "metadata": m.get("metadata", {}),
                "created_at": m.get("created_at"),
            }
            for m in memories
        ]
        return {"status": "success", "count": len(history), "history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")


@app.get("/scan-status/{scan_id}")
async def get_scan_status(scan_id: str):
    """Get status of an ongoing or completed scan."""
    if scan_id not in _active_scans:
        raise HTTPException(status_code=404, detail=f"Scan '{scan_id}' not found")
    return _active_scans[scan_id]


@app.post("/scan")
async def scan_local_path(req: ScanRequest):
    """Run Semgrep on a local path."""
    scan_id = str(uuid.uuid4())[:8]
    _active_scans[scan_id] = {"scan_id": scan_id, "status": "running", "started_at": datetime.utcnow().isoformat()}
    try:
        if not os.path.exists(req.path):
            raise HTTPException(status_code=400, detail=f"Path not found: {req.path}")

        scan_result = run_semgrep(req.path)
        if "error" in scan_result:
            raise HTTPException(status_code=500, detail=scan_result["error"])

        results = scan_result.get("results", [])
        summary_text = f"{len(results)} vulnerabilities found"

        try:
            from agent.llm_client import SecurityAnalyzer
            analyzer = SecurityAnalyzer()
            llm_summary = analyzer.analyze_vulnerabilities(results, analysis_type="code",
                                                           context={"repo_name": os.path.basename(req.path)})
        except Exception as e:
            llm_summary = f"AI analysis unavailable: {str(e)}"

        stored = _store_findings_in_mem0(results, os.path.basename(req.path), "code")
        related = _fetch_related(os.path.basename(req.path))

        _active_scans[scan_id]["status"] = "completed"
        return {
            "scan_id": scan_id,
            "status": "success",
            "repository": os.path.basename(req.path),
            "summary": summary_text,
            "llm_analysis": sanitize_for_json(llm_summary),
            "stored_in_mem0": stored,
            "results": results[:10],
            "related_previous_scans": related,
        }
    except HTTPException:
        _active_scans[scan_id]["status"] = "failed"
        raise
    except Exception as e:
        _active_scans[scan_id]["status"] = "failed"
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/scan-github")
async def scan_github_repo(req: GithubScanRequest):
    """Clone a GitHub repo, run Semgrep, return AI analysis, then delete clone."""
    scan_id = str(uuid.uuid4())[:8]
    _active_scans[scan_id] = {
        "scan_id": scan_id, "status": "running",
        "repo": req.repo_url, "started_at": datetime.utcnow().isoformat()
    }
    repo_path = None
    try:
        repo_path = clone_repo(req.repo_url)
        if not os.path.exists(repo_path):
            raise HTTPException(status_code=500, detail="Failed to clone repository")

        scan_result = run_semgrep(repo_path)
        if "error" in scan_result:
            raise HTTPException(status_code=500, detail=scan_result["error"])

        results = scan_result.get("results", [])
        summary_text = f"{len(results)} vulnerabilities found"

        try:
            from agent.llm_client import SecurityAnalyzer
            analyzer = SecurityAnalyzer()
            llm_summary = analyzer.analyze_vulnerabilities(
                results, analysis_type="code",
                context={"repo_name": os.path.basename(repo_path)}
            )
        except Exception as e:
            llm_summary = f"AI analysis unavailable: {str(e)}"

        stored = _store_findings_in_mem0(results, os.path.basename(repo_path), "code")
        related = _fetch_related(os.path.basename(repo_path))

        _active_scans[scan_id]["status"] = "completed"
        return {
            "scan_id": scan_id,
            "status": "success",
            "repository": os.path.basename(repo_path),
            "summary": summary_text,
            "llm_analysis": sanitize_for_json(llm_summary),
            "stored_in_mem0": stored,
            "results": results,
            "related_previous_scans": related,
        }
    except HTTPException:
        _active_scans[scan_id]["status"] = "failed"
        raise
    except Exception as e:
        _active_scans[scan_id]["status"] = "failed"
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if repo_path:
            delete_repo(repo_path)


@app.post("/scan-iac")
async def scan_iac_repo(req: GithubScanRequest):
    """Clone a GitHub repo, run Checkov IaC scan, return AI analysis, then delete clone."""
    scan_id = str(uuid.uuid4())[:8]
    _active_scans[scan_id] = {
        "scan_id": scan_id, "status": "running",
        "repo": req.repo_url, "started_at": datetime.utcnow().isoformat()
    }
    repo_path = None
    try:
        repo_path = clone_repo(req.repo_url)
        if not os.path.exists(repo_path):
            raise HTTPException(status_code=500, detail="Failed to clone repository")

        iac_result = run_checkov_scan(repo_path)
        if "error" in iac_result:
            raise HTTPException(status_code=500, detail=iac_result["error"])

        failed_checks = iac_result.get("results", {}).get("failed_checks", [])
        passed_checks = iac_result.get("results", {}).get("passed_checks", [])
        summary_text = f"{len(failed_checks)} IaC misconfigurations found"

        try:
            from agent.llm_client import SecurityAnalyzer
            analyzer = SecurityAnalyzer()
            llm_summary = analyzer.analyze_vulnerabilities(
                failed_checks, analysis_type="iac",
                context={"repo_name": os.path.basename(repo_path)}
            )
        except Exception as e:
            llm_summary = f"AI analysis unavailable: {str(e)}"

        stored = _store_findings_in_mem0(failed_checks, os.path.basename(repo_path), "iac")
        related = _fetch_related(os.path.basename(repo_path), "iac")

        _active_scans[scan_id]["status"] = "completed"
        return {
            "scan_id": scan_id,
            "status": "success",
            "repository": os.path.basename(repo_path),
            "summary": summary_text,
            "llm_analysis": sanitize_for_json(llm_summary),
            "stored_in_mem0": stored,
            "failed_checks": failed_checks,
            "passed_checks_count": len(passed_checks),
            "related_previous_scans": related,
        }
    except HTTPException:
        _active_scans[scan_id]["status"] = "failed"
        raise
    except Exception as e:
        _active_scans[scan_id]["status"] = "failed"
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if repo_path:
            delete_repo(repo_path)
