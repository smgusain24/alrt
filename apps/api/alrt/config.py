from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://alrt:alrt@localhost:5432/alrt"
    redis_url: str = "redis://localhost:6379"
    api_secret_key: str = "change-me"
    encryption_key: str = "change-me-generate-with-fernet"
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = {"env_file": ".env"}


settings = Settings()
