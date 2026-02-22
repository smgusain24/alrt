from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://alrt:alrt@localhost:5432/alrt"
    redis_url: str = "redis://localhost:6379"
    api_secret_key: str = "change-me"
    encryption_key: str = "change-me-generate-with-fernet"
    cors_origins: list[str] = ["http://localhost:3000", "https://alrt.dev"]

    # Slack OAuth
    slack_client_id: str = ""
    slack_client_secret: str = ""
    slack_redirect_uri: str = "http://localhost:8000/providers/slack/callback"
    dashboard_url: str = "http://localhost:3000"

    # Rate limiting
    rate_limit_write: str = "60/minute"
    rate_limit_read: str = "120/minute"
    rate_limit_public: str = "30/minute"

    model_config = {"env_file": ["../../.env", ".env"]}


settings = Settings()
