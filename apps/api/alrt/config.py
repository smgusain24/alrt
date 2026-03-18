from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://alrt:alrt@localhost:5432/alrt"
    redis_url: str = "redis://localhost:6379"
    api_secret_key: str = "change-me"
    encryption_key: str = "change-me-generate-with-fernet"
    cors_origins: str = "http://localhost:3000"

    # Slack OAuth
    slack_client_id: str = ""
    slack_client_secret: str = ""

    # alrt-hosted infrastructure
    resend_api_key: str = ""                # alrt's shared Resend account key
    slack_signing_secret: str = ""          # Slack app signing secret for Events API verification

    # Billing
    billing_provider: str = "razorpay"
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""

    slack_redirect_uri: str = "http://localhost:8000/providers/slack/callback"
    dashboard_url: str = "http://localhost:3000"

    # New channels (WhatsApp / Telegram)
    whatsapp_token: str = ""                 # Meta System User permanent token (WABA-level)
    whatsapp_phone_number_id: str = ""       # Meta Phone Number ID for outbound messages
    whatsapp_app_secret: str = ""            # Meta App Secret for webhook signature verification
    telegram_bot_token: str = ""             # alrt's shared Telegram bot token

    # alrt-hosted push notifications
    fcm_server_key: str = ""
    fcm_project_id: str = ""
    apns_key_id: str = ""
    apns_team_id: str = ""
    apns_key_path: str = ""
    apns_bundle_id: str = ""

    # Cookie security (set COOKIE_SECURE=true in production)
    cookie_secure: bool = False

    # Rate limiting
    rate_limit_write: str = "60/minute"
    rate_limit_read: str = "120/minute"
    rate_limit_public: str = "30/minute"

    model_config = {"env_file": ["../../.env", ".env"]}

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
