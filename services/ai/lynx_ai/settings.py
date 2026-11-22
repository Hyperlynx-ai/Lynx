"""Service settings, read once from the environment."""

from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

SERVICE_DIR = Path(__file__).resolve().parent.parent

# Local development: load services/ai/.env.local into the process environment, so
# model providers (which read their own variables, e.g. GOOGLE_API_KEY) can see it.
# Deployed environments get real environment variables from Vercel.
load_dotenv(SERVICE_DIR / ".env.local", override=False)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    #: Shared secret that apps/api sends in `Authorization: Bearer ...` (policy SEC-05).
    ai_service_token: str | None = None
    #: Set by Vercel: development, preview or production.
    vercel_env: str | None = None
    #: Postgres connection string (Supabase transaction pooler when deployed).
    database_url: str | None = None
    #: Which model runs each task (policy AI-01).
    models_file: Path = SERVICE_DIR / "config" / "models.yaml"
    prompts_dir: Path = SERVICE_DIR / "prompts"


@lru_cache
def get_settings() -> Settings:
    return Settings()
