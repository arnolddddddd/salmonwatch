import logging

from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    database_url: str = "postgresql://localhost:5432/salmonwatch"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]
    debug: bool = False
    mapbox_token: str = ""

    model_config = {"env_prefix": "SALMONWATCH_"}


settings = Settings()


def check_cors_config() -> None:
    """Log a warning if CORS origins are localhost-only."""
    localhost_only = all(
        "localhost" in origin or "127.0.0.1" in origin
        for origin in settings.cors_origins
    )
    if localhost_only:
        logger.warning(
            "CORS origins are localhost-only: %s. "
            "Set SALMONWATCH_CORS_ORIGINS to include your production domain.",
            settings.cors_origins,
        )
