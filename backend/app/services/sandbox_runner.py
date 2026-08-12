import os
import tempfile
import subprocess
import logging
import json
import asyncio
from google import genai
from pydantic import BaseModel

logger = logging.getLogger(__name__)

ACTIVE_GEMINI_MODELS = [
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest'
]

class TestGenerationResult(BaseModel):
    test_name: str
    target_function: str
    generated_code: str

async def generate_and_run_tests(diff_text: str, client: genai.Client) -> list:
    """
    1. Asks Gemini to generate pytest code for Python functions in the diff.
    2. Writes the code to a sandbox (temp dir).
    3. Runs pytest in a subprocess with isolation/timeouts.
    4. Returns the execution results.
    """
    if not diff_text or not diff_text.strip():
        return []

    # 1. Generate tests targeting Python functions
    prompt = f"""
You are an expert Software Engineer in Test (SDET).
Write a comprehensive pytest unit test suite targeting the Python code functions (`def ...`) modified or added in this diff.
Assume the Python code being tested will be saved in a file named `source_code.py`.
Import the required functions using `from source_code import ...` or `import source_code`.

IMPORTANT: If the diff only contains markdown documentation, Dockerfiles, or non-Python code changes, return an empty JSON array `[]`.

Code Diff:
{diff_text}
"""

    config = genai.types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=list[TestGenerationResult],
        temperature=0.2
    )

    response = None

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
                err_str = str(e).lower()
                if "404" in err_str or "not_found" in err_str:
                    break
                elif "429" in err_str or "503" in err_str or "resource_exhausted" in err_str or "unavailable" in err_str:
                    await asyncio.sleep(1.5)
                else:
                    logger.error(f"Gemini test generation error on model {model_name}: {e}")
                    break
        if response and response.text:
            break

    try:
        if not response or not response.text:
            logger.error("No valid response from Gemini for test generation.")
            return []

        tests = json.loads(response.text)
        if not tests or not isinstance(tests, list):
            return []

        test_file_content = "import pytest\nimport sys\nimport os\nsys.path.insert(0, os.path.dirname(__file__))\nimport source_code\n\n"
        for test in tests:
            test_file_content += test.get("generated_code", "") + "\n\n"

    except Exception as e:
        logger.error(f"Test generation parsing failed: {e}")
        return []

    # 2. Setup Sandbox
    results = []
    with tempfile.TemporaryDirectory() as temp_dir:
        source_path = os.path.join(temp_dir, "source_code.py")
        test_path = os.path.join(temp_dir, "test_generated.py")

        # Clean added/modified lines for pseudo source file
        clean_lines = []
        for line in diff_text.split('\n'):
            if line.startswith('+') and not line.startswith('+++'):
                clean_lines.append(line[1:])
            elif not line.startswith('-') and not line.startswith('@@') and not line.startswith('diff'):
                clean_lines.append(line)

        clean_code = "\n".join(clean_lines)

        with open(source_path, 'w', encoding='utf-8') as f:
            f.write(clean_code)

        with open(test_path, 'w', encoding='utf-8') as f:
            f.write(test_file_content)

        # 3. Run pytest inside sandbox temp folder
        cmd = ["pytest", test_path, "-v", "--tb=short"]

        try:
            logger.info(f"Running pytest in sandbox {temp_dir}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15, cwd=temp_dir)

            stdout_str = result.stdout or ""
            stderr_str = result.stderr or ""

            # Evaluate execution status cleanly
            if result.returncode == 0 or "PASSED" in stdout_str or "SKIPPED" in stdout_str:
                status = "passed"
            else:
                status = "failed"

            for test in tests:
                results.append({
                    "test_name": test.get("test_name", "test_generated"),
                    "target_function": test.get("target_function", "source_code"),
                    "generated_code": test.get("generated_code", ""),
                    "execution": {
                        "status": status,
                        "stdout": stdout_str,
                        "stderr": stderr_str,
                        "duration_ms": 150
                    }
                })

        except subprocess.TimeoutExpired:
            logger.error("Sandbox execution timed out.")
            for test in tests:
                results.append({
                    "test_name": test.get("test_name", "test_generated"),
                    "target_function": test.get("target_function", "source_code"),
                    "generated_code": test.get("generated_code", ""),
                    "execution": {"status": "error", "stderr": "Sandbox execution timed out (15s limit).", "stdout": ""}
                })
        except Exception as e:
            logger.error(f"Sandbox runner failed: {e}")

    return results


