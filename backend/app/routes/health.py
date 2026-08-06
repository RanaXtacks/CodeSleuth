"""
GET /health — Health check endpoint.

Owned by Member C (per Api_specs.md), but scaffolded by Member A.
Member A owns the Gemini health check; Member C fills in the rest
(semgrep, sandbox, github) when they wire their components.

Per Api_specs.md lines 149–155:
"Each field reflects a real check (last successful call within N seconds),
not a hardcoded 'ok'."
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Request

from app.models.responses import HealthResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="System health check",
    description=(
        "Returns connectivity status for all subsystems. "
        "Each field reflects a real check, not a hardcoded 'ok'. "
        "This is what everyone curls 30 seconds before walking on stage."
    ),
)
async def health_check(request: Request) -> HealthResponse:
    """
    Returns health status for each subsystem.

    Member A owns: gemini check
    Member C owns: semgrep, sandbox, github checks (scaffolded as "unknown")
    """
    gemini_status = "unknown"

    # Check Gemini connectivity — our responsibility
    gemini_service = getattr(request.app.state, "gemini_service", None)
    if gemini_service is not None:
        gemini_status = gemini_service.check_health()
    else:
        gemini_status = "not_initialized"

    return HealthResponse(
        status="ok" if gemini_status == "ok" else "degraded",
        gemini=gemini_status,
        # These are Member C's responsibility — scaffolded as "unknown"
        semgrep="unknown",
        sandbox="unknown",
        github="unknown",
    )
