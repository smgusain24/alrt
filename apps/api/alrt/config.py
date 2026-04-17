"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """alrt API configuration.

    All values are loaded from environment variables. Required values
    have no default and will raise an error at startup if missing.
    Optional values fall back to sensible development defaults.
    """

    # Required — no defaults, must be set via env or .env file
    database_url: str
    redis_url: str
    api_secret_key: str
    encryption_key: str

    # Application URLs
    cors_origins: str = "http://localhost:3000"
    dashboard_url: str = "http://localhost:3000"

    # Slack OAuth (optional — needed only for Slack channel)
    slack_client_id: str = ""
    slack_client_secret: str = ""
    slack_redirect_uri: str = ""

    # Cookie security (set to true behind HTTPS in production)
    cookie_secure: bool = False

    # Rate limiting
    rate_limit_write: str = "60/minute"
    rate_limit_read: str = "120/minute"
    rate_limit_public: str = "30/minute"

    model_config = {"env_file": ["../../.env", ".env"]}

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
