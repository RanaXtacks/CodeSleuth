"""
Models package — re-exports all models for clean imports.

Usage:
    from app.models import ReviewRequest, ReviewResponse, DiffPayload, ...
"""

# Internal contracts (inter-member)
from app.models.internal import (
    DiffFile,
    DiffPayload,
    SemgrepFinding,
    TestResult,
)

# API request models
from app.models.requests import (
    ReviewRequest,
    TestRequest,
)

# API response models
from app.models.responses import (
    Bug,
    ErrorResponse,
    GeneratedTest,
    HealthResponse,
    PerformanceNote,
    ReviewMeta,
    ReviewResponse,
    SecurityFinding,
    TestExecution,
    TestResponse,
    TestSummary,
)

__all__ = [
    # Internal
    "DiffFile",
    "DiffPayload",
    "SemgrepFinding",
    "TestResult",
    # Requests
    "ReviewRequest",
    "TestRequest",
    # Responses
    "Bug",
    "ErrorResponse",
    "GeneratedTest",
    "HealthResponse",
    "PerformanceNote",
    "ReviewMeta",
    "ReviewResponse",
    "SecurityFinding",
    "TestExecution",
    "TestResponse",
    "TestSummary",
]
