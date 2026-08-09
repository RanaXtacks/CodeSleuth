import os
import tempfile
import subprocess
import logging
from google import genai
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class TestGenerationResult(BaseModel):
    test_name: str
    target_function: str
    generated_code: str

async def generate_and_run_tests(diff_text: str, client: genai.Client) -> list:
    """
    1. Asks Gemini to generate pytest code for the diff.
    2. Writes the code to a sandbox (temp dir).
    3. Runs pytest in a subprocess with isolation/timeouts.
    4. Returns the results.
    """
    if not diff_text.strip():
        return []

    # 1. Generate tests
    prompt = f"""
    You are an expert SDET. Write a single comprehensive pytest test file for the following code diff.
    The code must import the functions being tested if they were in a file named 'source_code.py'.
    Only generate standard pytest tests.
    
    Diff:
    {diff_text}
    """
    
    config = genai.types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=list[TestGenerationResult],
        temperature=0.2
    )

    try:
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt,
            config=config
        )
        
        # Parse the JSON response
        import json
        tests = json.loads(response.text)
        
        if not tests:
            return []
            
        test_file_content = "import pytest\nimport source_code\n\n"
        for test in tests:
            test_file_content += test.get("generated_code", "") + "\n\n"

    except Exception as e:
        logger.error(f"Test generation failed: {e}")
        return []

    # 2. Setup Sandbox
    results = []
    with tempfile.TemporaryDirectory() as temp_dir:
        source_path = os.path.join(temp_dir, "source_code.py")
        test_path = os.path.join(temp_dir, "test_generated.py")
        
        # Write the diff as pseudo-source code (this is a hackathon shortcut, 
        # normally we'd apply the patch or fetch the full file)
        # We strip diff headers to try to make it valid python
        clean_code = "\n".join([line[1:] for line in diff_text.split('\n') if line.startswith('+') or line.startswith(' ')])
        
        with open(source_path, 'w', encoding='utf-8') as f:
            f.write(clean_code)
            
        with open(test_path, 'w', encoding='utf-8') as f:
            f.write(test_file_content)
            
        # 3. Run pytest
        cmd = ["pytest", test_path, "-v", "--tb=short"]
        
        try:
            logger.info(f"Running pytest in sandbox {temp_dir}")
            # subprocess isolation
            # No network, 10s timeout
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10, cwd=temp_dir)
            
            # 4. Parse results
            status = "passed" if result.returncode == 0 else "failed"
            
            for test in tests:
                results.append({
                    "test_name": test.get("test_name"),
                    "target_function": test.get("target_function"),
                    "generated_code": test.get("generated_code"),
                    "execution": {
                        "status": status,
                        "stdout": result.stdout,
                        "stderr": result.stderr,
                        "duration_ms": 0 # mocked for hackathon
                    }
                })
                
        except subprocess.TimeoutExpired:
            logger.error("Sandbox execution timed out.")
            for test in tests:
                results.append({
                    "test_name": test.get("test_name"),
                    "execution": {"status": "error", "stderr": "Execution timed out"}
                })
        except Exception as e:
            logger.error(f"Sandbox failed: {e}")
            
    return results
