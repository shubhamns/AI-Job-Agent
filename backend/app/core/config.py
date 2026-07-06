from functools import lru_cache
import json
from pathlib import Path
from typing import Annotated, Any, Literal
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import BeforeValidator, Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


def parse_cors_origins(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith("["):
            parsed = json.loads(stripped)
            return [str(item).strip() for item in parsed if str(item).strip()]
        return [item.strip() for item in value.split(",") if item.strip()]
    return []


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        populate_by_name=True,
    )

    app_name: str = "AI-Job-Agent"
    environment: Literal["local", "development", "staging", "production", "test"] = "local"
    api_v1_prefix: str = "/api/v1"
    api_base_url: str = Field(default="http://localhost:8000/api/v1", alias="API_BASE_URL")
    database_url: str | None = Field(default=None, alias="DATABASE_URL")
    jwt_secret_key: str = Field(default="change-me", alias="JWT_SECRET_KEY")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = Field(default=7, alias="REFRESH_TOKEN_EXPIRE_DAYS")
    resume_upload_dir: Path = Field(
        default=Path("./uploads/resumes"),
        alias="RESUME_UPLOAD_DIR",
    )
    max_resume_file_size_bytes: int = Field(
        default=5 * 1024 * 1024,
        alias="MAX_RESUME_FILE_SIZE_BYTES",
    )
    cors_origins: Annotated[list[str], NoDecode, BeforeValidator(parse_cors_origins)] = Field(
        default_factory=lambda: ["http://localhost:5173"],
        alias="CORS_ORIGINS",
    )
    adzuna_app_id: str | None = Field(default=None, alias="ADZUNA_APP_ID")
    adzuna_app_key: str | None = Field(default=None, alias="ADZUNA_APP_KEY")
    adzuna_country: str = Field(default="in", alias="ADZUNA_COUNTRY")
    adzuna_base_url: str = Field(default="https://api.adzuna.com", alias="ADZUNA_BASE_URL")
    adzuna_results_per_page: int = Field(default=20, alias="ADZUNA_RESULTS_PER_PAGE")
    telegram_bot_token: str | None = Field(default=None, alias="TELEGRAM_BOT_TOKEN")
    telegram_webhook_secret: str | None = Field(default=None, alias="TELEGRAM_WEBHOOK_SECRET")
    telegram_mode: Literal["polling", "webhook", "disabled"] = Field(
        default="disabled",
        alias="TELEGRAM_MODE",
    )
    cron_enabled: bool = Field(default=False, alias="CRON_ENABLED")
    job_check_daily_hour: int = Field(default=9, alias="JOB_CHECK_DAILY_HOUR")
    job_check_timezone: str = Field(default="Asia/Kolkata", alias="JOB_CHECK_TIMEZONE")

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str | None) -> str | None:
        if not value:
            return value
        if value.startswith("sqlite"):
            return value
        normalized = value
        if normalized.startswith("postgres://"):
            normalized = normalized.replace("postgres://", "postgresql+asyncpg://", 1)
        elif normalized.startswith("postgresql://"):
            normalized = normalized.replace("postgresql://", "postgresql+asyncpg://", 1)

        parts = urlsplit(normalized)
        query = dict(parse_qsl(parts.query, keep_blank_values=True))
        host = parts.hostname or ""
        if host not in {"localhost", "127.0.0.1", "postgres"} and "ssl" not in query:
            query["ssl"] = "require"
        return urlunsplit(
            (parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment)
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
