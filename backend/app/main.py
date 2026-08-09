from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel
from typing import List, Optional
import os
import uuid
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import our new services
from app.services.github_fetcher import fetch_pr_diff, normalize_diff
from app.services.semgrep_runner import run_semgrep

app = FastAPI()

# VERY IMPORTANT: Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # for hackathon prototype
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# ---------------------------------------------------------
# Define the strict output schema matching Api_specs.md
# ---------------------------------------------------------
class SecurityFinding(BaseModel):
    id: str
    source: str
    severity: str
    file: str
    line: Optional[int]
    raw_message: str
    llm_explanation: str
    suggested_fix: Optional[str]

class Bug(BaseModel):
    file: str
    line: Optional[int]
    severity: str
    description: str
    suggested_fix: str

class PerformanceNote(BaseModel):
    file: str
    line: Optional[int]
    description: str
    suggestion: str

class ReviewResult(BaseModel):
    security_findings: List[SecurityFinding]
    bugs: List[Bug]
    performance_notes: List[PerformanceNote]

# ---------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------
@app.post("/review")
async def review_code(payload: dict):
    try:
        # 1. Fetch & Normalize Diff (Member C)
        if payload.get("source_type") == "github_pr":
            raw_diff = await fetch_pr_diff(payload.get("pr_url"))
            diff_text = raw_diff
        else:
            diff_text = payload.get("diff_text", "")
            
        if not diff_text:
            raise HTTPException(status_code=400, detail="diff_text or pr_url required")

        # 2. Run Semgrep for grounding (Member B)
        semgrep_findings = run_semgrep(diff_text)
        
        # 3. Construct the prompt with grounding
        prompt = f"""
        Analyze the following code diff. 
        You MUST ground your security findings using the provided Semgrep output.
        Do not invent security vulnerabilities that are not supported by the code or the Semgrep output.
        
        Code Diff:
        {diff_text}
        
        Semgrep Static Analysis Findings:
        {semgrep_findings}
        """

        # 4. Call Gemini with strict JSON schema (Member A)
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ReviewResult,
            temperature=0.2, 
            system_instruction="You are a strict technical code reviewer. Analyze the code diff and static analysis results, returning ONLY valid JSON matching the requested schema. Never invent vulnerabilities."
        )

        # Using gemini-2.5-flash as it's the current fast model
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=config
        )
        
        # The response.text is guaranteed to be a JSON string matching the ReviewResult schema
        return {"status": "success", "data": response.text}
        
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

from app.services.sandbox_runner import generate_and_run_tests

@app.post("/tests")
async def generate_tests(payload: dict):
    try:
        # 1. Fetch & Normalize Diff (Member C)
        if payload.get("source_type") == "github_pr":
            raw_diff = await fetch_pr_diff(payload.get("pr_url"))
            diff_text = raw_diff
        else:
            diff_text = payload.get("diff_text", "")
            
        if not diff_text:
            raise HTTPException(status_code=400, detail="diff_text or pr_url required")

        # 2. Run Sandbox (Member B)
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
        
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))