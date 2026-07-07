import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

# Discord webhooks only ever live on these hosts. Pinning the prefix at ingestion
# stops a subscriber webhook URL from being used to SSRF internal hosts
# (e.g. http://169.254.169.254/...) when a worker later POSTs to it.
_DISCORD_WEBHOOK_PREFIXES = (
    "https://discord.com/api/webhooks/",
    "https://discordapp.com/api/webhooks/",
)


def _validate_discord_webhook(v):
    if not v:
        return v
    v = v.strip()
    if not v:
        return None
    if not v.startswith(_DISCORD_WEBHOOK_PREFIXES):
        raise ValueError("discord_webhook_url must be a https://discord.com/api/webhooks/ URL")
    return v


class DndWindow(BaseModel):
    timezone: str = "UTC"
    start: str = "22:00"
    end: str = "08:00"


class FrequencyCap(BaseModel):
    max_per_day: int | None = None
    max_per_hour: int | None = None


class ChannelPreferences(BaseModel):
    global_: dict[str, bool] = Field(default_factory=dict, alias="global")
    categories: dict[str, dict[str, bool]] = Field(default_factory=dict)
    dnd: DndWindow | None = None
    frequency: FrequencyCap | None = None

class CreateSubscriber(BaseModel):
    external_id: str
    email: str | None = None
    name: str | None = None
    phone_number: str | None = None
    slack_user_id: str | None = None
    discord_webhook_url: str | None = None
    telegram_chat_id: str | None = None
    custom_properties: dict = Field(default_factory=dict)
    channel_preferences: dict = Field(default_factory=dict)

    _v_discord = field_validator("discord_webhook_url")(_validate_discord_webhook)


class UpdateSubscriber(BaseModel):
    email: str | None = None
    name: str | None = None
    phone_number: str | None = None
    slack_user_id: str | None = None
    discord_webhook_url: str | None = None
    telegram_chat_id: str | None = None
    custom_properties: dict | None = None
    channel_preferences: dict | None = None

    _v_discord = field_validator("discord_webhook_url")(_validate_discord_webhook)


class SubscriberResponse(BaseModel):
    id: uuid.UUID
    external_id: str
    email: str | None
    name: str | None
    phone_number: str | None
    slack_user_id: str | None
    discord_webhook_url: str | None
    telegram_chat_id: str | None
    custom_properties: dict
    channel_preferences: dict
    push_tokens: list[dict] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PreferencesResponse(BaseModel):
    global_: dict[str, bool] = Field(default_factory=dict, alias="global")
    categories: dict[str, dict[str, bool]] = Field(default_factory=dict)
    dnd: DndWindow | None = None
    frequency: FrequencyCap | None = None

    model_config = {"from_attributes": True, "populate_by_name": True}


class UpdatePreferences(BaseModel):
    channel_preferences: ChannelPreferences


class PushTokenRegister(BaseModel):
    token: str
    platform: str  # "android" | "ios" | "web"
    device_id: str | None = None


class PushTokenResponse(BaseModel):
    token: str
    platform: str
    device_id: str | None
    last_seen: str | None
