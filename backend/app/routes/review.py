"""
POST /review — Code review endpoint.

Phase 0: Returns mock data from fixtures.
Phase 1: Wires into real Gemini pipeline with Semgrep grounding.

Owned by Member A (orchestration).
Consumed by Member D (frontend).
Uses Member C's DiffPayload and Member B's SemgrepFindings.
"""

from __future__ import annotations

import json
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.models.requests import ReviewRequest
from app.models.responses import ErrorResponse, ReviewResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Review"])

# Path to mock fixture — used until Phase 1 replaces this with real pipeline
_FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent / "fixtures"


@router.post(
    "/review",
    response_model=ReviewResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid input"},
        413: {"model": ErrorResponse, "description": "Diff too large"},
        502: {"model": ErrorResponse, "description": "Upstream failure"},
    },
    summary="Submit code for review",
    description=(
        "Submit a diff (raw text or GitHub PR URL) for AI-powered code review. "
        "Returns security findings (grounded in Semgrep), bugs, and performance notes."
    ),
)
async def create_review(request: ReviewRequest) -> ReviewResponse:
    """
    Phase 0 stub: validates the request and returns mock data.

    In Phase 1, this will:
    1. Normalize input via Member C's DiffPayload logic
    2. Run Semgrep via Member B → SemgrepFindings
    3. Call Gemini with diff + findings → structured review
    4. Return the combined ReviewResponse
    """
    logger.info(
        "POST /review received (source_type=%s, language=%s)",
        request.source_type,
        request.language,
    )

    # Validate diff size if raw_diff is provided
    if request.source_type == "raw_diff" and request.diff_text:
        line_count = request.diff_text.count("\n") + 1
        # Import settings here to avoid circular imports during startup
        from app.config import get_settings

        settings = get_settings()
        if line_count > settings.diff_line_limit:
            raise HTTPException(
                status_code=413,
                detail={
                    "error": "diff_too_large",
                    "detail": f"Diff exceeds {settings.diff_line_limit} line limit",
                    "lines_received": line_count,
                },
            )

    # Phase 0: Return mock data
    mock_file = _FIXTURES_DIR / "mock_review_response.json"
    if mock_file.exists():
        with open(mock_file, "r", encoding="utf-8") as f:
            mock_data = json.load(f)
        # Override the request_id with a fresh UUID for each call
        mock_data["request_id"] = str(uuid.uuid4())
        mock_data["test_generation_request_id"] = str(uuid.uuid4())
        return ReviewResponse(**mock_data)

    # If fixture is missing, return a minimal valid response
    return ReviewResponse(
        request_id=str(uuid.uuid4()),
        meta={"files_changed": 0, "lines_changed": 0, "truncated": False},
        security_findings=[],
        bugs=[],
        performance_notes=[],
        test_generation_request_id=str(uuid.uuid4()),
    )
