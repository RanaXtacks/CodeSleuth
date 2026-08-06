"""
Request models — what the frontend (Member D) sends to us.

Every field name and type is mapped 1:1 from Api_specs.md.
Validation logic enforces the conditional requirements described
in the spec (e.g., diff_text required when source_type is raw_diff).
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator


class ReviewRequest(BaseModel):
    """
    POST /review request body.
    Api_specs.md lines 66–76.

    Validation rules:
    - If source_type == "raw_diff"  → diff_text must be non-null and non-empty.
    - If source_type == "github_pr" → pr_url must be non-null and non-empty.

    These rules produce the exact 400 error shape from Api_specs.md line 108.
    """

    source_type: Literal["raw_diff", "github_pr"] = Field(
        ...,
        description='How the diff is provided: "raw_diff" for pasted text, "github_pr" for a PR URL',
    )
    diff_text: str | None = Field(
        default=None,
        description="Raw diff text — required when source_type is 'raw_diff'",
    )
    pr_url: str | None = Field(
        default=None,
        description="GitHub PR URL — required when source_type is 'github_pr'",
    )
    language: str = Field(
        default="python",
        description="Primary language of the code being reviewed",
        examples=["python"],
    )

    @model_validator(mode="after")
    def _validate_source_fields(self) -> "ReviewRequest":
        """
        Enforce conditional field requirements exactly matching the
        error contract in Api_specs.md lines 106–108.
        """
        if self.source_type == "raw_diff":
            if not self.diff_text or not self.diff_text.strip():
                raise ValueError(
                    "diff_text required when source_type is raw_diff"
                )
        elif self.source_type == "github_pr":
            if not self.pr_url or not self.pr_url.strip():
                raise ValueError(
                    "pr_url required when source_type is github_pr"
                )
        return self


class TestRequest(BaseModel):
    """
    POST /tests request body.
    Api_specs.md lines 119–124.
    """

    request_id: str = Field(
        ...,
        description="UUID of a previous /review request to generate tests for",
    )
