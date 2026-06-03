from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL

# /.env (Postgres + ports) and backend/.env (app secrets) — later wins.
# Real process env vars override both. In Docker, compose injects everything
# as real env vars and these file lookups are no-ops.
_ROOT = Path(__file__).resolve().parents[2]
_BACKEND = Path(__file__).resolve().parents[1]
_ENV_FILES = (_ROOT / ".env", _BACKEND / ".env")


class Settings(BaseSettings):
    APP_NAME: str = "Inventaire"
    VERSION: str = "0.1.0"
    DEBUG: bool = False
    TESTING: bool = False

    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE: int = 30

    MISTRAL_API_KEY: str
    MISTRAL_MODEL: str = "mistral-ocr-latest"
    CORS_ORIGINS: str

    OTEL_ENDPOINT: str = ""

    @property
    def DATABASE_URL(self) -> URL:
        return URL.create(
            "postgresql+psycopg2",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_HOST,
            port=self.POSTGRES_PORT,
            database=self.POSTGRES_DB,
        )

    model_config = SettingsConfigDict(
        env_file=_ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()
