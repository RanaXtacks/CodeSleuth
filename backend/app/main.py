from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
import uuid
import asyncio
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import services
from app.services.github_fetcher import fetch_pr_diff
from app.services.semgrep_runner import run_semgrep
from app.services.sandbox_runner import generate_and_run_tests

app = FastAPI(
    title="CodeSleuth API",
    description="AI-powered code review, security audit, and test generation assistant",
    version="1.0.0"
)

# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dynamic Gemini Client helper
def get_gemini_client():
    load_dotenv(override=True)
    key = os.environ.get("GEMINI_API_KEY")
    if not key or key in ["YOUR_NEW_GEMINI_API_KEY_HERE", "YOUR_GEMINI_API_KEY_HERE"]:
        return None
    try:
        return genai.Client(api_key=key)
    except Exception:
        return None

# Supported and active Gemini models list with automatic fallback
ACTIVE_GEMINI_MODELS = [
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest'
]

# ---------------------------------------------------------
# Define the strict output schema matching Api_specs.md
# ---------------------------------------------------------
class SecurityFinding(BaseModel):
    id: str
    source: str = "semgrep"
    severity: str  # low | medium | high | critical
    file: str
    line: Optional[int] = None
    raw_message: str
    llm_explanation: str
    suggested_fix: Optional[str] = None

class Bug(BaseModel):
    file: str
    line: Optional[int] = None
    severity: str
    description: str
    suggested_fix: str

class PerformanceNote(BaseModel):
    file: str
    line: Optional[int] = None
    description: str
    suggestion: str

class ReviewResult(BaseModel):
    security_findings: List[SecurityFinding] = []
    bugs: List[Bug] = []
    performance_notes: List[PerformanceNote] = []

# ---------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------
@app.post("/review")
async def review_code(payload: dict):
    client = get_gemini_client()
    if not client:
        raise HTTPException(status_code=502, detail={"error": "upstream_failure", "detail": "GEMINI_API_KEY is missing or invalid in backend/.env file."})

    try:
        # 1. Fetch & Normalize Diff (Member C)
        source_type = payload.get("source_type", "raw_diff")
        if source_type == "github_pr":
            pr_url = payload.get("pr_url")
            if not pr_url or not str(pr_url).strip():
                raise HTTPException(status_code=400, detail={"error": "invalid_input", "detail": "pr_url required when source_type is github_pr"})
            try:
                diff_text = await fetch_pr_diff(pr_url)
            except ValueError as ve:
                raise HTTPException(status_code=400, detail={"error": "invalid_input", "detail": str(ve)})
            except Exception as e:
                err_str = str(e).lower()
                status = 502
                if "rate limit" in err_str:
                    status = 403
                elif "not found" in err_str:
                    status = 404
                elif "406" in err_str or "too_large" in err_str or "too large" in err_str:
                    status = 406
                raise HTTPException(status_code=status, detail={"error": "github_error", "detail": str(e), "upstream": "github"})
        else:
            diff_text = payload.get("diff_text", "")
            if not diff_text or not str(diff_text).strip():
                raise HTTPException(status_code=400, detail={"error": "invalid_input", "detail": "diff_text required when source_type is raw_diff"})

        # Enforce 2000-line diff limit per Api_specs.md
        line_count = diff_text.count("\n") + 1
        if line_count > 2000:
            raise HTTPException(
                status_code=413,
                detail={
                    "error": "diff_too_large",
                    "detail": "Diff exceeds 2000 line limit",
                    "lines_received": line_count
                }
            )

        # 2. Run Semgrep for static grounding (Member B)
        language = payload.get("language", "python")
        semgrep_findings = run_semgrep(diff_text, language=language)

        # 3. Construct prompt with grounding
        prompt = f"""
Analyze the following code diff for security vulnerabilities, bugs, and performance improvements.
You MUST ground security findings in the provided static analysis output.
Do not invent security vulnerabilities that are not supported by the code or the Semgrep findings.

Code Diff:
{diff_text}

Semgrep Static Analysis Findings:
{json.dumps(semgrep_findings, indent=2)}
"""

        # 4. Call Gemini with strict JSON schema and retry/fallback logic
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ReviewResult,
            temperature=0.2,
            system_instruction="You are a senior security engineer and code reviewer. Analyze the code diff and static analysis results, returning ONLY valid JSON matching the requested schema."
        )

        response = None
        last_error = None

        for model_name in ACTIVE_GEMINI_MODELS:
            for attempt in range(2):
                try:
                    response = await asyncio.to_thread(
                        client.models.generate_content,
                        model=model_name,
                        contents=prompt,
                        config=config
                    )
                    if response and response.text:
                        break
                except Exception as e:
                    last_error = e
                    err_str = str(e).lower()
                    if "404" in err_str or "not_found" in err_str:
                        break
                    elif "429" in err_str or "503" in err_str or "resource_exhausted" in err_str or "unavailable" in err_str:
                        await asyncio.sleep(1.5)
                    else:
                        break
            if response and response.text:
                break

        if not response or not response.text:
            status_code = 502
            if last_error and ("429" in str(last_error) or "resource_exhausted" in str(last_error).lower()):
                status_code = 429
            raise HTTPException(
                status_code=status_code,
                detail={"error": "upstream_failure", "detail": f"Gemini API error: {last_error}", "upstream": "gemini"}
            )

        # Parse JSON response to ensure clean structured dictionary return
        try:
            review_dict = json.loads(response.text)
        except json.JSONDecodeError:
            review_dict = {
                "security_findings": [],
                "bugs": [],
                "performance_notes": []
            }

        return {
            "request_id": str(uuid.uuid4()),
            "meta": {
                "files_changed": 1,
                "lines_changed": line_count,
                "truncated": False
            },
            "security_findings": review_dict.get("security_findings", []),
            "bugs": review_dict.get("bugs", []),
            "performance_notes": review_dict.get("performance_notes", []),
            "test_generation_request_id": str(uuid.uuid4())
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail={"error": "upstream_failure", "detail": str(e)}
        )

@app.post("/tests")
async def generate_tests(payload: dict):
    client = get_gemini_client()
    if not client:
        raise HTTPException(status_code=502, detail={"error": "upstream_failure", "detail": "GEMINI_API_KEY is missing or invalid in backend/.env file."})

    try:
        source_type = payload.get("source_type", "raw_diff")
        if source_type == "github_pr":
            pr_url = payload.get("pr_url")
            if not pr_url or not str(pr_url).strip():
                raise HTTPException(status_code=400, detail={"error": "invalid_input", "detail": "pr_url required when source_type is github_pr"})
            try:
                diff_text = await fetch_pr_diff(pr_url)
            except Exception as e:
                err_str = str(e).lower()
                status = 502
                if "rate limit" in err_str:
                    status = 403
                elif "not found" in err_str:
                    status = 404
                elif "406" in err_str or "too_large" in err_str or "too large" in err_str:
                    status = 406
                raise HTTPException(status_code=status, detail={"error": "github_error", "detail": str(e), "upstream": "github"})
        else:
            diff_text = payload.get("diff_text", "")
            if not diff_text or not str(diff_text).strip():
                raise HTTPException(status_code=400, detail={"error": "invalid_input", "detail": "diff_text required when source_type is raw_diff"})

        results = await generate_and_run_tests(diff_text, client)

        return {
            "request_id": str(uuid.uuid4()),
            "tests": results,
            "summary": {
                "total": len(results),
                "passed": sum(1 for r in results if r.get("execution", {}).get("status") == "passed"),
                "failed": sum(1 for r in results if r.get("execution", {}).get("status") != "passed")
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@app.get("/")
async def root():
    return {
        "name": "CodeSleuth API",
        "description": "AI-powered code review, security audit, and test generation assistant",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    """
    Subsystem health check matching Api_specs.md lines 149-155.
    Performs real checks on Gemini API key, Semgrep CLI, Pytest sandbox, and GitHub token.
    """
    current_client = get_gemini_client()
    gemini_status = "ok" if current_client else "missing_api_key"

    semgrep_status = "ok"
    try:
        import subprocess
        res = subprocess.run(["semgrep", "--version"], capture_output=True, timeout=2)
        if res.returncode != 0:
            semgrep_status = "not_available"
    except Exception:
        semgrep_status = "not_installed"

    sandbox_status = "ok"
    try:
        import pytest
    except ImportError:
        sandbox_status = "pytest_missing"

    github_status = "ok" if (os.environ.get("GITHUB_TOKEN") or os.environ.get("GITHUB_PAT")) else "unauthenticated"

    overall = "ok" if (gemini_status == "ok") else "degraded"

    return {
        "status": overall,
        "gemini": gemini_status,
        "semgrep": semgrep_status,
        "sandbox": sandbox_status,
        "github": github_status
    }