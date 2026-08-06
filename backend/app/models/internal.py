"""
Internal data models — inter-member contracts.

These models define the shapes exchanged BETWEEN team members internally.
They are NOT directly exposed via the API; they're used as building blocks
inside the pipeline.

Every field name and type is mapped 1:1 from Api_specs.md.
Changes require a flagged team message before implementation.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# DiffPayload  (Member C → Member A)
# Api_specs.md lines 24–34
# ---------------------------------------------------------------------------

class DiffFile(BaseModel):
    """A single file within a diff."""

    filename: str = Field(
        ...,
        description="Relative path of the changed file, e.g. 'app/auth.py'",
        examples=["app/auth.py"],
    )
    diff_hunk: str = Field(
        ...,
        description="The unified diff hunk for this file",
    )
    language: str = Field(
        default="python",
        description="Programming language of the file",
        examples=["python"],
    )


class DiffPayload(BaseModel):
    """
    Normalized diff payload — the common shape for both raw-paste and
    GitHub-sourced diffs.

    Produced by Member C's diff/PR fetcher, consumed by Member A's
    pipeline. See architecture.md §2.1.
    """

    files: list[DiffFile] = Field(
        ...,
        description="List of changed files with their diff hunks",
        min_length=1,
    )
    source_type: Literal["raw_diff", "github_pr"] = Field(
        ...,
        description="How the diff was sourced",
    )
    pr_url: str | None = Field(
        default=None,
        description="GitHub PR URL, if source_type is 'github_pr'",
    )


# ---------------------------------------------------------------------------
# SemgrepFinding  (Member B → Member A)
# Api_specs.md lines 36–48
# ---------------------------------------------------------------------------

class SemgrepFinding(BaseModel):
    """
    A single Semgrep finding from Member B's scanner.

    These are used as grounding context in Member A's Gemini prompt —
    they are NOT replaced by the LLM output. See architecture.md §2.2.
    """

    rule_id: str = Field(
        ...,
        description="Semgrep rule identifier",
        examples=["python.lang.security.audit.eval-injection"],
    )
    severity: Literal["low", "medium", "high", "critical"] = Field(
        ...,
        description="Finding severity level",
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
        description="Raw Semgrep message for this finding",
    )


# ---------------------------------------------------------------------------
# TestResult  (Member B → Member A)
# Api_specs.md lines 50–62
# ---------------------------------------------------------------------------

class TestResult(BaseModel):
    """
    Execution result for a single generated test, returned by Member B's
    sandbox runner. See architecture.md §2.4.
    """

    test_name: str = Field(
        ...,
        description="Name of the test function",
        examples=["test_auth_rejects_empty_token"],
    )
    status: Literal["passed", "failed", "error"] = Field(
        ...,
        description="Execution outcome",
    )
    stdout: str = Field(
        default="",
        description="Standard output captured during test execution",
    )
    stderr: str = Field(
        default="",
        description="Standard error captured during test execution",
    )
    duration_ms: int = Field(
        ...,
        description="Test execution duration in milliseconds",
        ge=0,
    )
