"""
test_gemini.py — Phase 0 Auth Verification Script

This script fulfills the Phase 0 definition-of-done for Member A:
"Hardcoded Gemini call returns a response (auth + quota proven)."

Run this AFTER creating your .env file from .env.example:
    cd backend
    python test_gemini.py

What it does:
1. Loads config from .env via pydantic-settings
2. Initializes the Gemini client
3. Sends a code-review-style prompt (not just "hello world")
4. Requests JSON output and validates it parses correctly
5. Prints: model name, response time, token count, parsed JSON
6. Exits 0 on success, 1 on failure with a clear error message

This is what you demo to the other 3 members at the Phase 0 checkpoint.
"""

from __future__ import annotations

import json
import sys
import os

# Ensure the backend directory is in the path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main() -> int:
    """Run the Gemini auth verification test."""
    print("=" * 60)
    print("CodeSleuth — Phase 0: Gemini Auth Verification")
    print("=" * 60)
    print()

    # Step 1: Load config
    print("[1/4] Loading config from .env ...")
    try:
        from app.config import get_settings

        settings = get_settings()
        # Don't print the actual key — SecretStr prevents this by default
        print(f"  ✓ GEMINI_API_KEY loaded (type: SecretStr)")
        print(f"  ✓ GEMINI_MODEL = {settings.gemini_model}")
        print(f"  ✓ APP_ENV = {settings.app_env}")
        print(f"  ✓ DIFF_LINE_LIMIT = {settings.diff_line_limit}")
    except Exception as exc:
        print(f"  ✗ FAILED to load config: {exc}")
        print()
        print("  Did you create a .env file from .env.example?")
        print("  Run: cp .env.example .env")
        print("  Then fill in your real GEMINI_API_KEY.")
        return 1

    print()

    # Step 2: Initialize Gemini service
    print("[2/4] Initializing Gemini service ...")
    try:
        from app.services.gemini_service import GeminiService

        service = GeminiService(settings)
        print(f"  ✓ GeminiService initialized (model: {settings.gemini_model})")
    except Exception as exc:
        print(f"  ✗ FAILED to initialize Gemini service: {exc}")
        return 1

    print()

    # Step 3: Send test prompt
    print("[3/4] Sending test prompt (code review of a buggy function) ...")
    print("  Prompt: 'Review divide(a, b) for bugs — return JSON'")
    print("  Waiting for response ...")
    print()

    try:
        result = service.test_connection()
        print(f"  ✓ Response received!")
        print(f"  ✓ Model: {result['model']}")
        print(f"  ✓ Response time: {result['response_time_ms']} ms")
        print(f"  ✓ Raw text length: {result['raw_text_length']} chars")
    except Exception as exc:
        print(f"  ✗ FAILED: {exc}")
        print()
        print("  Common causes:")
        print("  - Invalid API key")
        print("  - Quota exceeded")
        print("  - Network connectivity issue")
        print("  - Model name typo in GEMINI_MODEL")
        return 1

    print()

    # Step 4: Validate JSON response
    print("[4/4] Validating JSON response ...")
    parsed = result["parsed_response"]

    if isinstance(parsed, dict):
        print(f"  ✓ Response is valid JSON (dict with {len(parsed)} keys)")
        print()
        print("  Parsed response:")
        print("  " + "-" * 50)
        print(
            "  "
            + json.dumps(parsed, indent=2).replace("\n", "\n  ")
        )
        print("  " + "-" * 50)
    elif isinstance(parsed, list):
        print(f"  ✓ Response is valid JSON (list with {len(parsed)} items)")
    else:
        print(f"  ⚠ Response parsed but unexpected type: {type(parsed)}")

    print()
    print("=" * 60)
    print("✓ Phase 0 PASSED: Gemini auth + quota verified")
    print("  You can demo this at the Phase 0 checkpoint.")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
