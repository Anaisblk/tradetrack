from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://tradetrack:tradetrack_password@localhost:5432/tradetrack"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REDIS_URL: str = "redis://localhost:6379"

    # Allowed origins, separated by commas. Add the deployed frontend URL in production.
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    STOCK_ALERT_THRESHOLD: int = 3

    @field_validator("DATABASE_URL")
    @classmethod
    def _normalize_database_url(cls, url: str) -> str:
        """Hosting providers give a postgresql:// URL, but async SQLAlchemy needs
        the asyncpg driver, and asyncpg expects `ssl` instead of `sslmode`."""
        for prefix in ("postgresql+asyncpg://", "postgresql://", "postgres://"):
            if url.startswith(prefix):
                url = "postgresql+asyncpg://" + url[len(prefix) :]
                break
        return url.replace("?sslmode=", "?ssl=").replace("&sslmode=", "&ssl=")

    @property
    def cors_origins(self) -> list[str]:
        """Trailing slash is removed: the browser Origin header never has one."""
        origins = []
        for origin in self.CORS_ORIGINS.split(","):
            origin = origin.strip().rstrip("/")
            if origin and origin not in origins:
                origins.append(origin)
        return origins


settings = Settings()
