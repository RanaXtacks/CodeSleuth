"""
CodeSleuth / GitMentor — FastAPI Application

This is the entry point for the backend. It:
1. Configures CORS for Member D's React frontend
2. Mounts all route modules
3. Registers custom exception handlers matching Api_specs.md error shapes
4. Initializes the Gemini client on startup

Run with:
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.config import get_settings
from app.routes import health, review, tests
from app.services.gemini_service import GeminiServiceError
from agent.reviewer_agent import reviewer_agent

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Application lifespan — startup / shutdown
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan handler.

    On startup:
    - Loads and validates settings (fails fast if .env is misconfigured)
    - Initializes the ADK reviewer agent and stores it on app.state
    """
    logger.info("=" * 60)
    logger.info("CodeSleuth backend starting up...")
    logger.info("=" * 60)

    # Load settings — this will fail fast if GEMINI_API_KEY is missing
    try:
        settings = get_settings()
        logger.info("Settings loaded (env=%s, model=%s)", settings.app_env, settings.gemini_model)
    except Exception as exc:
        logger.error("Failed to load settings: %s", exc)
        logger.error("Did you create a .env file from .env.example?")
        raise

    # Store agent and settings
    app.state.reviewer_agent = reviewer_agent
    app.state.settings = settings
    logger.info("ADK Reviewer agent initialized successfully")

    logger.info("Backend ready at http://localhost:8000")
    logger.info("API docs at http://localhost:8000/docs")
    logger.info("=" * 60)

    yield  # App is running

    # Shutdown
    logger.info("CodeSleuth backend shutting down...")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="CodeSleuth / GitMentor",
    description=(
        "A PR review copilot that grounds its claims. "
        "Combines Semgrep static analysis with Gemini AI review "
        "and sandboxed test execution."
    ),
    version="0.1.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# CORS — allow Member D's React frontend to call us
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Create React App default
        "http://localhost:5173",   # Vite default
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Route registration
# ---------------------------------------------------------------------------

app.include_router(review.router)
app.include_router(tests.router)
app.include_router(health.router)


# ---------------------------------------------------------------------------
# Exception handlers — match Api_specs.md error shapes exactly
# ---------------------------------------------------------------------------


@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """
    Handle Pydantic validation errors as 400 with the Api_specs.md error shape.
    """
    return JSONResponse(
        status_code=400,
        content={
            "error": "invalid_input",
            "detail": str(exc.errors()[0]["msg"]) if exc.errors() else str(exc),
        },
    )


@app.exception_handler(GeminiServiceError)
async def gemini_error_handler(request: Request, exc: GeminiServiceError) -> JSONResponse:
    """
    Handle Gemini API failures as 502 with the Api_specs.md error shape.

    From Api_specs.md lines 113–114:
    { "error": "upstream_failure", "detail": "...", "upstream": "gemini" }
    """
    logger.error("Gemini service error: %s", exc)
    return JSONResponse(
        status_code=502,
        content={
            "error": "upstream_failure",
            "detail": str(exc),
            "upstream": exc.upstream,
        },
    )
