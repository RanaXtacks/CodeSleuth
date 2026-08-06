"""
Gemini API service — Member A's core responsibility.

Handles:
- Client initialization with API key
- Connection testing (Phase 0 deliverable)
- JSON response enforcement (fence-stripping, parse validation)
- Single retry with backoff on 429/5xx (Api_specs.md rate-limit policy)
- Explicit failure on empty/unparseable output (NEVER silent empty arrays)

Phase 0: Only test_connection() is functional.
Phase 1: review_diff() gets implemented.
Phase 2: generate_tests() gets implemented.
"""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

from google import genai
from google.genai import types

from app.config import Settings

logger = logging.getLogger(__name__)


class GeminiServiceError(Exception):
    """Raised when a Gemini API call fails in a way that should surface as 502."""

    def __init__(self, message: str, upstream: str = "gemini"):
        super().__init__(message)
        self.upstream = upstream


class GeminiService:
    """
    Wrapper around the Google GenAI SDK.

    Design decisions (from Api_specs.md and architecture.md):
    - Forces JSON output via response_mime_type where supported.
    - Strips markdown fences defensively as a fallback.
    - Treats parse failures as explicit errors (502), never silent empty results.
    - Retries once with backoff on 429/5xx, surfaces 4xx immediately.
    """

    # Regex to strip markdown code fences from LLM output
    _FENCE_PATTERN = re.compile(
        r"^```(?:json)?\s*\n?(.*?)\n?\s*```$",
        re.DOTALL | re.MULTILINE,
    )

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._model_name = settings.gemini_model
        self._client = genai.Client(
            api_key=settings.gemini_api_key.get_secret_value(),
        )
        logger.info("Gemini client initialized (model: %s)", self._model_name)

    # ------------------------------------------------------------------
    # Phase 0: Connection test
    # ------------------------------------------------------------------

    def test_connection(self) -> dict[str, Any]:
        """
        Send a hardcoded prompt and verify we get a valid JSON response.

        This is the Phase 0 definition-of-done: "Hardcoded Gemini call
        returns a response (auth + quota proven)."

        Returns a dict with model info, response time, and the parsed response.
        Raises GeminiServiceError on any failure.
        """
        test_prompt = (
            "You are a senior Python code reviewer. Review the following function "
            "and return your analysis as JSON with keys: 'bugs' (list of strings), "
            "'suggestions' (list of strings), 'overall_quality' (string: good/fair/poor).\n\n"
            "```python\n"
            "def divide(a, b):\n"
            "    return a / b\n"
            "```"
        )

        start_time = time.time()

        response = self._call_gemini(
            prompt=test_prompt,
            system_instruction=(
                "You are a code review assistant. Respond ONLY with valid JSON. "
                "No markdown fences, no prose preamble, no trailing text."
            ),
        )

        elapsed_ms = int((time.time() - start_time) * 1000)

        parsed = self._parse_json_response(response)

        return {
            "model": self._model_name,
            "response_time_ms": elapsed_ms,
            "parsed_response": parsed,
            "raw_text_length": len(response),
        }

    # ------------------------------------------------------------------
    # Phase 1: Review diff (stub — implemented in Phase 1)
    # ------------------------------------------------------------------

    def review_diff(
        self,
        diff_text: str,
        semgrep_findings: list[dict],
        language: str = "python",
    ) -> dict[str, Any]:
        """
        Analyze a diff with Semgrep findings context and return structured review.

        NOT YET IMPLEMENTED — this is Phase 1 work.
        """
        raise NotImplementedError(
            "review_diff() is a Phase 1 deliverable. "
            "Use the mock fixtures in fixtures/ for now."
        )

    # ------------------------------------------------------------------
    # Phase 2: Generate tests (stub — implemented in Phase 2)
    # ------------------------------------------------------------------

    def generate_tests(
        self,
        diff_text: str,
        review_context: dict[str, Any],
        language: str = "python",
    ) -> dict[str, Any]:
        """
        Generate pytest test code for functions in the diff.

        NOT YET IMPLEMENTED — this is Phase 2 work.
        """
        raise NotImplementedError(
            "generate_tests() is a Phase 2 deliverable. "
            "Use the mock fixtures in fixtures/ for now."
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _call_gemini(
        self,
        prompt: str,
        system_instruction: str | None = None,
        max_retries: int = 1,
    ) -> str:
        """
        Call the Gemini API with retry logic.

        Retry policy (from Api_specs.md lines 167–170):
        - Single retry with backoff on 429/5xx
        - No retry on 4xx — surface immediately
        """
        last_error: Exception | None = None

        for attempt in range(max_retries + 1):
            try:
                # Build the generation config requesting JSON output
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    temperature=0.2,  # Low temperature for deterministic reviews
                )

                response = self._client.models.generate_content(
                    model=self._model_name,
                    contents=prompt,
                    config=config,
                )

                # Extract text from the response
                if not response.text:
                    raise GeminiServiceError(
                        "Gemini returned an empty response. "
                        "A confidently-empty result is the most damaging failure mode "
                        "(Api_specs.md §Internal contract). Raising as explicit error."
                    )

                return response.text

            except GeminiServiceError:
                # Our own errors — don't retry, surface immediately
                raise

            except Exception as exc:
                last_error = exc
                error_str = str(exc).lower()

                # Check if this is a 4xx error — don't retry those
                if any(code in error_str for code in ["400", "401", "403", "404"]):
                    raise GeminiServiceError(
                        f"Gemini API client error (no retry): {exc}"
                    ) from exc

                # For 429/5xx: retry with backoff
                if attempt < max_retries:
                    backoff = 2 ** attempt  # 1s, 2s, ...
                    logger.warning(
                        "Gemini API call failed (attempt %d/%d), retrying in %ds: %s",
                        attempt + 1,
                        max_retries + 1,
                        backoff,
                        exc,
                    )
                    time.sleep(backoff)
                else:
                    logger.error(
                        "Gemini API call failed after %d attempts: %s",
                        max_retries + 1,
                        exc,
                    )

        raise GeminiServiceError(
            f"Gemini API request failed after {max_retries + 1} attempts: {last_error}"
        )

    def _parse_json_response(self, raw_text: str) -> dict[str, Any] | list[Any]:
        """
        Parse JSON from Gemini output, with defensive fence-stripping.

        From Api_specs.md lines 159–165:
        - If Gemini API supports JSON mode, we use it (done in _call_gemini).
        - Otherwise strip fences defensively.
        - Treat a parse failure as 502 upstream_failure — NEVER as a silent empty array.
        """
        text = raw_text.strip()

        # Try direct parse first (should work if JSON mode is active)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Defensive: strip markdown fences
        fence_match = self._FENCE_PATTERN.search(text)
        if fence_match:
            try:
                return json.loads(fence_match.group(1).strip())
            except json.JSONDecodeError:
                pass

        # All parsing attempts failed — this is a 502, not a silent empty
        raise GeminiServiceError(
            f"Failed to parse Gemini response as JSON. "
            f"Raw text (first 500 chars): {text[:500]}"
        )

    def check_health(self) -> str:
        """
        Quick connectivity check for the /health endpoint.
        Returns "ok" on success, error message string on failure.
        """
        try:
            response = self._client.models.generate_content(
                model=self._model_name,
                contents="Respond with exactly: {\"status\": \"ok\"}",
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    max_output_tokens=20,
                ),
            )
            if response.text:
                return "ok"
            return "empty_response"
        except Exception as exc:
            logger.warning("Gemini health check failed: %s", exc)
            return f"error: {exc}"
