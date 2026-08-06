"""
Application configuration — loaded from .env via pydantic-settings.

Uses SecretStr for sensitive values to prevent accidental logging.
See .env.example for the full list of expected variables.
"""

from __future__ import annotations

from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Validated application settings.

    All values are loaded from environment variables (or .env file).
    Missing required values raise a clear error at startup, not at
    first request — fail fast.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Don't fail on extra vars (e.g., GITHUB_TOKEN before C wires it in)
    )

    # --- Gemini (Member A) ---
    gemini_api_key: SecretStr = Field(
        ...,
        description="Google Gemini API key",
    )
    gemini_model: str = Field(
        default="gemini-2.5-flash",
        description="Gemini model to use for review and test generation",
    )

    # --- App ---
    app_env: Literal["development", "production"] = Field(
        default="development",
        description="Application environment",
    )
    log_level: str = Field(
        default="INFO",
        description="Logging level",
    )
    diff_line_limit: int = Field(
        default=2000,
        description="Maximum number of diff lines accepted (returns 413 if exceeded)",
        gt=0,
    )


def get_settings() -> Settings:
    """
    Factory function for Settings.

    In Phase 1+ this can be wrapped with @lru_cache for singleton behavior,
    but for now we keep it simple and re-instantiate to pick up any
    .env changes during development.
    """
    return Settings()
