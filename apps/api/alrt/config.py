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

    # Cache Redis — optional split from the broker/idempotency Redis. Empty means
    # "reuse redis_url"; set it to point ephemeral caches at a separate instance.
    cache_redis_url: str = ""

    # Postgres pool safety limits (seconds / milliseconds). A hung query without
    # these drains the pool and stalls every request sharing it.
    db_command_timeout: float = 30.0
    db_statement_timeout_ms: int = 30000
    db_idle_in_txn_timeout_ms: int = 10000

    # 0 disables asyncpg's prepared-statement cache — required to run safely behind
    # PgBouncer in transaction-pooling mode (prepared statements break there).
    db_statement_cache_size: int = 0

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
    # Tight limit on unauthenticated credential endpoints (login/signup) to blunt
    # brute-force / credential-stuffing. Keyed on client IP.
    rate_limit_auth: str = "5/minute"

    # Meta WhatsApp webhook signing secret (app secret). When set, inbound
    # webhook bodies are HMAC-verified; when empty, verification is skipped (dev).
    whatsapp_app_secret: str = ""
    # Meta webhook verify token (GET challenge). Falls back to encryption_key[:16].
    whatsapp_verify_token: str = ""

    # Observability (optional — Sentry is a no-op when the DSN is empty)
    sentry_dsn: str = ""
    environment: str = "development"

    # extra="ignore" so a shared repo .env carrying dashboard/worker keys
    # (e.g. NEXT_PUBLIC_API_URL) doesn't fail API startup with extra_forbidden.
    model_config = {"env_file": ["../../.env", ".env"], "extra": "ignore"}

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def cache_redis_url_effective(self) -> str:
        """Redis URL for ephemeral caches, falling back to the broker Redis."""
        return self.cache_redis_url or self.redis_url


settings = Settings()
