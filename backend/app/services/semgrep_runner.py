import json
import logging
import subprocess
import tempfile
import os
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def run_semgrep(code_content: str, language: str = "python") -> List[Dict[str, Any]]:
    """
    Writes code to a temp file, runs Semgrep against it, and returns the findings.
    This aligns with Member B's grounding requirement.
    """
    if not code_content or not code_content.strip():
        return []

    # Map generic language strings to extensions
    ext_map = {
        "python": ".py",
        "javascript": ".js",
        "typescript": ".ts",
        "go": ".go",
        "java": ".java"
    }
    ext = ext_map.get(language.lower(), ".py")

    findings = []
    
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False, mode='w', encoding='utf-8') as temp_file:
        temp_file.write(code_content)
        temp_path = temp_file.name

    try:
        # Run semgrep with security rules
        # We use p/security-audit which is standard for these types of reviews
        cmd = [
            "semgrep",
            "--config=p/security-audit",
            "--config=p/python",  # add python specific rules
            "--json",
            temp_path
        ]
        
        logger.info(f"Running semgrep on temp file {temp_path}")
        
        # We don't check=True because semgrep returns non-zero if it finds issues
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        
        if result.stdout:
            try:
                parsed = json.loads(result.stdout)
                for match in parsed.get("results", []):
                    findings.append({
                        "rule_id": match.get("check_id"),
                        "severity": match.get("extra", {}).get("severity", "medium").lower(),
                        "file": "snippet" + ext, # mask the temp path
                        "line": match.get("start", {}).get("line"),
                        "raw_message": match.get("extra", {}).get("message")
                    })
            except json.JSONDecodeError:
                logger.error("Failed to parse Semgrep JSON output.")
                logger.error(f"Raw stdout: {result.stdout}")
        
        if result.stderr:
            logger.warning(f"Semgrep stderr: {result.stderr}")
            
    except subprocess.TimeoutExpired:
        logger.error("Semgrep execution timed out.")
    except Exception as e:
        logger.error(f"Semgrep execution failed: {e}")
    finally:
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return findings
