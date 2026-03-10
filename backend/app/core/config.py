"""Travel Companion Backend – environment configuration."""

from __future__ import annotations

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────
    APP_NAME: str = "Tripco API"
    DEBUG: bool = False
    ALLOWED_ORIGINS: str = "http://localhost:3000"  # comma-separated

    # ── JWT ──────────────────────────────────────────────
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Azure Cosmos DB ──────────────────────────────────
    COSMOS_ENDPOINT: str = "https://localhost:8081"
    COSMOS_KEY: str = ""
    COSMOS_DATABASE: str = "tripco"

    # ── Azure Blob Storage ───────────────────────────────
    BLOB_ACCOUNT_NAME: str = ""
    BLOB_ACCOUNT_KEY: str = ""
    BLOB_CONTAINER_MEDIA: str = "media"
    BLOB_CONTAINER_TICKETS: str = "tickets"

    # ── Azure Web PubSub ─────────────────────────────────
    WEBPUBSUB_ENDPOINT: str = ""
    WEBPUBSUB_KEY: str = ""
    WEBPUBSUB_HUB: str = "trips"

    # ── Currency ─────────────────────────────────────────
    EXCHANGE_RATE_API: str = "https://api.exchangerate.host/latest"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
