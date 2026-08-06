"""
Response models — what we return to the frontend (Member D).

Every field name, type, and nesting is mapped 1:1 from Api_specs.md.
Member D builds their React UI against these exact shapes, so any
change here MUST be flagged to the team before implementation.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# POST /review  response components
# Api_specs.md lines 78–103
# ---------------------------------------------------------------------------

class SecurityFinding(BaseModel):
    """
    A security finding that combines Semgrep's raw detection with
    the LLM's contextual explanation. This is the "grounded + explained"
    story — the raw_message comes from Semgrep (deterministic), the
    llm_explanation comes from Gemini (generated but grounded).
    """

    id: str = Field(
        ...,
        description="Semgrep rule ID that triggered this finding",
        examples=["python.lang.security.audit.eval-injection"],
    )
    source: str = Field(
        default="semgrep",
        description="Source of the detection (always 'semgrep' for now)",
    )
    severity: Literal["low", "medium", "high", "critical"] = Field(
        ...,
        description="Finding severity",
    )
    file: str = Field(
        ...,
        description="File where the finding was detected",
        examples=["app/auth.py"],
    )
    line: int = Field(
        ...,
        description="Line number of the finding",
        gt=0,
    )
    raw_message: str = Field(
        ...,
        description="Raw message from Semgrep",
    )
    llm_explanation: str = Field(
        ...,
        description="LLM-generated plain-language explanation of this finding in context",
    )
    suggested_fix: str | None = Field(
        default=None,
        description="LLM-suggested code fix, if applicable",
    )


class Bug(BaseModel):
    """A bug identified by the LLM in the diff."""

    file: str = Field(..., description="File containing the bug")
    line: int = Field(..., description="Line number", gt=0)
    severity: Literal["low", "medium", "high", "critical"] = Field(
        ...,
        description="Bug severity",
    )
    description: str = Field(..., description="Description of the bug")
    suggested_fix: str = Field(..., description="Suggested fix for the bug")


class PerformanceNote(BaseModel):
    """A performance concern identified by the LLM."""

    file: str = Field(..., description="File with the performance concern")
    line: int = Field(..., description="Line number", gt=0)
    description: str = Field(..., description="Description of the issue")
    suggestion: str = Field(..., description="Suggested improvement")


class ReviewMeta(BaseModel):
    """Metadata about the review request."""

    files_changed: int = Field(..., description="Number of files in the diff", ge=0)
    lines_changed: int = Field(..., description="Total lines changed", ge=0)
    truncated: bool = Field(
        default=False,
        description="Whether the diff was truncated to fit limits",
    )


class ReviewResponse(BaseModel):
    """
    POST /review 200 OK response.
    Api_specs.md lines 78–103.
    """

    request_id: str = Field(
        ...,
        description="Unique identifier for this review request",
    )
    meta: ReviewMeta
    security_findings: list[SecurityFinding] = Field(default_factory=list)
    bugs: list[Bug] = Field(default_factory=list)
    performance_notes: list[PerformanceNote] = Field(default_factory=list)
    test_generation_request_id: str = Field(
        ...,
        description="UUID to use with POST /tests to get generated tests",
    )


# ---------------------------------------------------------------------------
# POST /tests  response components
# Api_specs.md lines 126–139
# ---------------------------------------------------------------------------

class TestExecution(BaseModel):
    """Execution result of a single generated test."""

    status: Literal["passed", "failed", "error"] = Field(
        ...,
        description="Test execution outcome",
    )
    stdout: str = Field(default="", description="Captured stdout")
    stderr: str = Field(default="", description="Captured stderr")
    duration_ms: int = Field(..., description="Execution duration in ms", ge=0)


class GeneratedTest(BaseModel):
    """A single LLM-generated test with its execution result."""

    test_name: str = Field(
        ...,
        description="Name of the generated test function",
        examples=["test_auth_rejects_empty_token"],
    )
    target_function: str = Field(
        ...,
        description="Fully qualified name of the function being tested",
        examples=["app.auth.validate_token"],
    )
    generated_code: str = Field(
        ...,
        description="The generated pytest test code",
    )
    execution: TestExecution


class TestSummary(BaseModel):
    """Aggregate summary of test results."""

    total: int = Field(..., ge=0)
    passed: int = Field(..., ge=0)
    failed: int = Field(..., ge=0)


class TestResponse(BaseModel):
    """
    POST /tests 200 OK response.
    Api_specs.md lines 126–139.
    """

    request_id: str = Field(
        ...,
        description="The request_id from the original /review call",
    )
    tests: list[GeneratedTest] = Field(default_factory=list)
    summary: TestSummary


# ---------------------------------------------------------------------------
# GET /health  response
# Api_specs.md lines 149–155
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    """
    GET /health response.

    Each field reflects a REAL check, not a hardcoded "ok".
    Member C owns this endpoint; we scaffold it, they fill in the
    real checks for semgrep/sandbox/github. We own the gemini check.
    """

    status: str = Field(default="ok", description="Overall status")
    gemini: str = Field(default="unknown", description="Gemini API connectivity")
    semgrep: str = Field(default="unknown", description="Semgrep availability")
    sandbox: str = Field(default="unknown", description="Sandbox runner status")
    github: str = Field(default="unknown", description="GitHub API connectivity")


# ---------------------------------------------------------------------------
# Error responses
# Api_specs.md lines 105–115, 142–145
# ---------------------------------------------------------------------------

class ErrorResponse(BaseModel):
    """
    Standardized error response shape.
    Used for 400, 413, and 502 errors as defined in Api_specs.md.
    """

    error: str = Field(
        ...,
        description="Error code",
        examples=["invalid_input", "diff_too_large", "upstream_failure", "no_testable_functions"],
    )
    detail: str = Field(
        ...,
        description="Human-readable error description",
    )
    # Optional fields that appear only in specific error types
    lines_received: int | None = Field(
        default=None,
        description="Only present in diff_too_large errors",
    )
    upstream: str | None = Field(
        default=None,
        description="Only present in upstream_failure errors — identifies which upstream failed",
        examples=["gemini", "github", "semgrep"],
    )
