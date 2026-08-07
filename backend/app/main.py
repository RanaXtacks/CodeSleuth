# Moved to root as backend/main.py
from fastapi import FastAPI, HTTPException
from google import genai
from google.genai import types
import os

app = FastAPI()
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

@app.post("/review")
async def review_code(payload: dict):
    try:
        # Enforce structured JSON output matching your Api_specs.md contract
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2, # Lower temperature for stable, grounded code analysis
            system_instruction="You are a strict technical code reviewer. Analyze the code diff and return only valid JSON matching the requested schema. Never invent vulnerabilities not supported by the code."
        )

        response = client.models.generate_content(
            model='gemini-3.5-flash', # Using frontier flash-tier speed & reasoning
            contents=f"Analyze this code diff and return JSON: {payload.get('diff_text')}",
            config=config
        )
        
        return {"status": "success", "data": response.text}
        
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))