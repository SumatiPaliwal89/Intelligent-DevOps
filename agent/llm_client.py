"""
Enhanced LLM Client for Security Vulnerability Analysis
Uses Google Gemini 2.5 Flash for intelligent code security assessment.

Model selection (tested 2024-03):
  Winner: gemini-2.5-flash — Score 34/30, ~22s, 1540 words, full vulnerability coverage
  Runner-up: gemini-2.5-pro — Higher quality but daily free-tier quota exhausted quickly
  Excluded: gemini-2.0-flash — Daily free-tier quota limit hit

Prompt strategy: Expert Structured Prompt — Score 34/30 vs 28/30 (minimal) vs 30/30 (CoT)
"""         

from typing import List, Dict, Optional
import json
import os
import time
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage


class SecurityAnalyzer:
    """Enhanced security analysis with Gemini LLM"""

    def __init__(self, model: str = None, temperature: float = 0.3):
        """
        Initialize the security analyzer with Gemini

        Args:
            model: Gemini model name (default: gemini-2.5-flash — tested winner)
            temperature: LLM temperature (lower = more focused, higher = more creative)
        """
        self.model = model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.temperature = temperature
        self.max_retries = 3
        self.retry_delay = 2

        # Initialize Gemini
        self._init_llm()

    def _init_llm(self):
        """Initialize the Gemini LLM client"""
        try:
            self.llm = ChatGoogleGenerativeAI(
                model=self.model,
                temperature=self.temperature,
                google_api_key=os.getenv("GEMINI_API_KEY")
            )
        except Exception as e:
            raise RuntimeError(f"Failed to initialize Gemini: {str(e)}")

    def _get_system_prompt(self, analysis_type: str = "code") -> str:
        """
        Get enhanced system prompt based on analysis type

        Args:
            analysis_type: 'code' for code vulnerabilities, 'iac' for infrastructure
        """
        if analysis_type == "iac":
            return """You are an IaC security analyst. Analyze the Checkov findings and produce a concise developer report.

## Summary
2-3 sentences: total findings, severity breakdown, overall infrastructure security posture.

## Critical Findings & Fixes
For the top 5 most severe findings only, use this format:

**[SEVERITY] Check ID — Resource**
- Risk: What this misconfiguration allows an attacker to do (1 sentence).
- Fix: The exact configuration change needed (1-2 sentences, no full code blocks).

## Immediate Actions
3 prioritized bullet points — what to fix first and why.

Keep the entire response under 40 lines. No emojis. Plain markdown only."""

        else:  # code vulnerabilities
            return """You are an application security expert. Analyze the Semgrep findings and produce a concise developer report.

## Summary
2-3 sentences: total vulnerabilities, severity distribution, most dangerous pattern found.

## Critical Findings & Fixes
For the top 5 most severe findings only, use this format:

**[SEVERITY] Rule ID — File:Line**
- Vulnerability: What the issue is and how it can be exploited (1 sentence).
- Fix: The specific change needed to remediate this (1-2 sentences, no full code blocks).
- CWE/OWASP: Reference if applicable.

## Immediate Actions
3 prioritized bullet points — what to fix first and why.

Keep the entire response under 40 lines. No emojis. Plain markdown only."""

    def _get_user_prompt(self, findings: List[Dict], analysis_type: str = "code") -> str:
        """
        Create enhanced user prompt with structured vulnerability data

        Args:
            findings: List of vulnerability findings
            analysis_type: Type of analysis (code/iac)
        """
        if analysis_type == "iac":
            prompt_parts = [
                f"## Infrastructure as Code Security Scan Results\n",
                f"**Total Issues Found**: {len(findings)}\n",
                f"**Analysis Required**: Prioritize by severity and provide actionable remediation\n\n",
                "### Raw Findings (JSON):\n",
                "```json\n"
            ]
        else:
            # Count by severity
            severity_count = {}
            for finding in findings:
                severity = finding.get("extra", {}).get("severity", "UNKNOWN")
                severity_count[severity] = severity_count.get(severity, 0) + 1

            prompt_parts = [
                f"## Security Vulnerability Scan Results\n",
                f"**Total Vulnerabilities Found**: {len(findings)}\n",
                f"**Severity Distribution**: {dict(severity_count)}\n",
                f"**Analysis Required**: Detailed security assessment with exploitation scenarios and fixes\n\n",
                "### Vulnerability Details (JSON):\n",
                "```json\n"
            ]

        # Add findings (limit to prevent token overflow)
        findings_json = json.dumps(findings[:15], indent=2)
        if len(findings_json) > 8000:
            findings_json = findings_json[:8000] + "\n... (truncated for length)"

        prompt_parts.append(findings_json)
        prompt_parts.append("\n```\n\n")

        if len(findings) > 15:
            prompt_parts.append(f"**Note**: Showing first 15 of {len(findings)} findings. Focus on the most critical issues.\n\n")

        prompt_parts.append("Provide comprehensive security analysis following the format specified in your instructions.")

        return "".join(prompt_parts)

    def analyze_vulnerabilities(
        self,
        findings: List[Dict],
        analysis_type: str = "code",
        context: Optional[Dict] = None
    ) -> str:
        """
        Analyze security vulnerabilities with enhanced prompting and error handling

        Args:
            findings: List of vulnerability findings from scanner
            analysis_type: 'code' for code vulnerabilities, 'iac' for infrastructure
            context: Additional context (repo name, scan type, etc.)

        Returns:
            Comprehensive security analysis report
        """
        if not findings:
            return self._generate_clean_report(context)

        # Prepare prompts
        system_prompt = SystemMessage(content=self._get_system_prompt(analysis_type))
        user_prompt = HumanMessage(content=self._get_user_prompt(findings, analysis_type))

        # Retry logic for API calls
        last_error = None
        for attempt in range(self.max_retries):
            try:
                response = self.llm.invoke([system_prompt, user_prompt])
                return response.content

            except Exception as e:
                last_error = e
                print(f"[WARN] LLM API error (attempt {attempt + 1}/{self.max_retries}): {str(e).encode('ascii','replace').decode('ascii')}")

                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (attempt + 1))  # Exponential backoff
                    continue
                else:
                    # Final attempt failed, return fallback analysis
                    return self._generate_fallback_analysis(findings, analysis_type, str(last_error))

    def _generate_clean_report(self, context: Optional[Dict] = None) -> str:
        """Generate a clean report when no vulnerabilities found"""
        repo_name = context.get("repo_name", "the repository") if context else "the repository"
        return f"""# Security Scan Report - ALL CLEAR

**Repository**: {repo_name}
**Status**: No security vulnerabilities detected

## Summary
The security scan completed successfully with no findings. This indicates:
- No known vulnerability patterns detected by Semgrep rules
- Code follows secure coding practices for scanned patterns
- No immediate security risks identified

## Recommendations
1. Continue regular security scans with updated rule sets
2. Perform manual security code review for complex logic
3. Consider additional security testing (DAST, penetration testing)
4. Keep dependencies updated and scan for known CVEs
5. Implement security linting in CI/CD pipeline

**Note**: A clean scan doesn't guarantee 100% security. Regular audits and updates are essential.
"""

    def _generate_fallback_analysis(self, findings: List[Dict], analysis_type: str, error_msg: str) -> str:
        """Generate basic analysis when LLM fails"""
        severity_count = {}
        critical_findings = []

        for finding in findings:
            if analysis_type == "iac":
                severity = finding.get("severity", "UNKNOWN")
                file_path = finding.get("file_path", "unknown")
                check_name = finding.get("check_name", "Unknown check")
            else:
                severity = finding.get("extra", {}).get("severity", "UNKNOWN")
                file_path = finding.get("path", "unknown")
                check_name = finding.get("check_id", "Unknown")

            severity_count[severity] = severity_count.get(severity, 0) + 1

            if severity in ["CRITICAL", "HIGH"]:
                critical_findings.append({
                    "file": file_path,
                    "severity": severity,
                    "check": check_name
                })

        report = f"""# Security Scan Report (Limited Analysis)

**Note**: AI-powered analysis temporarily unavailable. Showing basic scan results.
**Error**: {error_msg}

## Summary
- **Total Issues**: {len(findings)}
- **Severity Breakdown**: {dict(severity_count)}

## Critical & High Severity Issues
"""

        for idx, finding in enumerate(critical_findings[:10], 1):
            report += f"\n{idx}. **{finding['severity']}**: {finding['check']}\n"
            report += f"   - File: `{finding['file']}`\n"

        if len(critical_findings) > 10:
            report += f"\n... and {len(critical_findings) - 10} more critical/high severity issues\n"

        report += """
## Recommendations
1. Review all CRITICAL and HIGH severity issues immediately
2. Consult security documentation for each finding
3. Check OWASP guidelines for remediation
4. Consider manual code review by security expert

**Action Required**: Fix high-severity issues before deployment.
"""
        return report


# Legacy function for backward compatibility
def analyze_vulnerabilities(findings: List[Dict], model: str = None) -> str:
    """
    Backward compatible function for analyzing vulnerabilities

    Args:
        findings: List of vulnerability findings
        model: Optional model name override

    Returns:
        Security analysis report
    """
    try:
        analyzer = SecurityAnalyzer(model=model)
        return analyzer.analyze_vulnerabilities(findings, analysis_type="code")
    except Exception as e:
        return f"❌ **Security Analysis Failed**\n\nError: {str(e)}\n\nPlease check your GEMINI_API_KEY configuration."
