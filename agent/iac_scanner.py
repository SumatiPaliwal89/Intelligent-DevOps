import sys
import subprocess
import json
import os

def run_checkov_scan(repo_path: str):
    try:
        print("\n========== CHECKOV DEBUG START ==========")
        print(f"[DEBUG] Python executable: {sys.executable}")
        print(f"[DEBUG] Running Checkov on path: {repo_path}")
        print(f"[DEBUG] Directory exists: {os.path.exists(repo_path)}")

        command = [
            sys.executable,
            "-m",
            "checkov.main",
            "--directory", repo_path,
            "--framework", "terraform,kubernetes,dockerfile,secrets,github_actions",
            "--output", "json"
        ]

        print("[DEBUG] Command being executed:")
        print(" ".join(command))

        result = subprocess.run(command, capture_output=True, text=True)

        print(f"[DEBUG] Checkov return code: {result.returncode}")
        print(f"[DEBUG] Checkov stderr (first 500 chars):\n{result.stderr[:500]}")
        print(f"[DEBUG] Checkov stdout length: {len(result.stdout)}")
        print(f"[DEBUG] Checkov stdout first 500 chars:\n{result.stdout[:500]}")
        print("========== CHECKOV DEBUG END ==========\n")

        # ❌ If Checkov crashed
        if result.returncode not in [0, 1]:
            return {"error": result.stderr or "Checkov execution failed"}

        stdout = result.stdout.strip()

        if not stdout:
            return {
                "summary": {"failed": 0, "passed": 0},
                "results": {"failed_checks": []},
                "message": "Checkov produced no output"
            }

        # 🔥 Extract full JSON array safely
        start = stdout.find("[")
        end = stdout.rfind("]")

        if start == -1 or end == -1:
            return {"error": "Could not locate JSON array in Checkov output"}

        json_output = stdout[start:end+1]

        try:
            parsed = json.loads(json_output)
        except Exception as e:
            return {"error": f"JSON parsing failed: {str(e)}"}

        # 🔥 Merge results from multiple frameworks
        all_failed = []
        all_passed = 0

        for report in parsed:
            results = report.get("results", {})
            summary = report.get("summary", {})

            all_failed.extend(results.get("failed_checks", []))
            all_passed += summary.get("passed", 0)

        return {
            "summary": {
                "failed": len(all_failed),
                "passed": all_passed
            },
            "results": {
                "failed_checks": all_failed
            }
        }

    except Exception as e:
        print(f"[DEBUG] Exception occurred: {e}")
        return {"error": str(e)}
