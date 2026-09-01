"""
Centralised settings — reads from environment variables / .env file.
All settings attributes used anywhere in the codebase are defined here.
"""

from functools import lru_cache
from typing import List

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────────────────────
    app_name: str = Field("AI Risk Manager", alias="PROJECT_NAME")
    app_version: str = Field("1.0.0", alias="VERSION")
    debug: bool = Field(False, alias="DEBUG")
    port: int = Field(8000, alias="PORT")
    allowed_origins: str = Field("*", alias="ALLOWED_ORIGINS")

    # ── Database ──────────────────────────────────────────────────────────────
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_SERVER: str
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_url: str = Field("redis://localhost:6379/0", alias="REDIS_URL")

    # ── Security ──────────────────────────────────────────────────────────────
    secret_key: str = Field(..., alias="SECRET_KEY")
    jwt_algorithm: str = Field("HS256", alias="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(60, alias="JWT_EXPIRE_MINUTES")

    # ── ML Models ─────────────────────────────────────────────────────────────
    model_dir: str = Field("app/ml/models", alias="MODEL_DIR")
    model_version: str = Field("1.0.0", alias="MODEL_VERSION")

    # ── LLM (Anthropic Claude) ────────────────────────────────────────────────
    anthropic_api_key: str = Field("", alias="ANTHROPIC_API_KEY")
    anthropic_model: str = Field("claude-sonnet-4-6", alias="ANTHROPIC_MODEL")

    # ── Webhooks ──────────────────────────────────────────────────────────────
    webhook_timeout_seconds: float = Field(5.0, alias="WEBHOOK_TIMEOUT_SECONDS")

    # ── Rate limiting ─────────────────────────────────────────────────────────
    rate_limit_requests: int = Field(100, alias="RATE_LIMIT_REQUESTS")
    rate_limit_window_seconds: int = Field(60, alias="RATE_LIMIT_WINDOW_SECONDS")

    # ── Computed ──────────────────────────────────────────────────────────────
    @computed_field
    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @computed_field
    @property
    def allowed_origins_list(self) -> List[str]:
        if self.allowed_origins == "*":
            return ["*"]
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,   # allows both REDIS_URL and redis_url to match
        populate_by_name=True,  # allow access by field name AND alias
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()