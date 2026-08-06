"""
POST /tests — Test generation and execution endpoint.

Phase 0: Returns mock data from fixtures.
Phase 2: Wires into real Gemini test generation + Member B's sandbox execution.

Owned by Member A (orchestration).
Consumed by Member D (frontend).
Uses Member B's TestResults from sandbox execution.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.models.requests import TestRequest
from app.models.responses import ErrorResponse, TestResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Tests"])

_FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent / "fixtures"


@router.post(
    "/tests",
    response_model=TestResponse,
    responses={
        400: {"model": ErrorResponse, "description": "No testable functions found"},
    },
    summary="Generate and run tests for a reviewed diff",
    description=(
        "Given a request_id from a previous /review call, generates pytest tests "
        "for functions in the diff and executes them in a sandbox."
    ),
)
async def create_tests(request: TestRequest) -> TestResponse:
    """
    Phase 0 stub: returns mock test data.

    In Phase 2, this will:
    1. Retrieve the review context for the given request_id
    2. Call Gemini to generate pytest code
    3. Hand generated code to Member B's sandbox runner
    4. Merge TestResults into TestResponse
    """
    logger.info("POST /tests received (request_id=%s)", request.request_id)

    # Phase 0: Return mock data
    mock_file = _FIXTURES_DIR / "mock_test_response.json"
    if mock_file.exists():
        with open(mock_file, "r", encoding="utf-8") as f:
            mock_data = json.load(f)
        # Use the provided request_id
        mock_data["request_id"] = request.request_id
        return TestResponse(**mock_data)

    # If fixture is missing, return a "no testable functions" error
    # This matches Api_specs.md line 144
    raise HTTPException(
        status_code=400,
        detail={
            "error": "no_testable_functions",
            "detail": "No function-level changes found in diff",
        },
    )
