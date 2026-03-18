"""Request and response types for the alrt API."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(w.capitalize() for w in parts[1:])


class _CamelModel(BaseModel):
    """Base model with camelCase serialization for API wire format."""
    model_config = ConfigDict(
        alias_generator=_to_camel,
        populate_by_name=True,
    )


# --- Request Types ---

class SubscriberInline(_CamelModel):
    id: str
    email: str | None = None
    name: str | None = None
    phone: str | None = None
    data: dict | None = None


class EmailOverrides(_CamelModel):
    to: str | None = None
    subject: str | None = None
    reply_to: str | None = None
    cc: list[str] | None = None
    bcc: list[str] | None = None


class SlackOverrides(_CamelModel):
    channel_id: str | None = None
    thread_ts: str | None = None


class InAppOverrides(_CamelModel):
    action_url: str | None = None


class ChannelOverrides(_CamelModel):
    email: EmailOverrides | None = None
    slack: SlackOverrides | None = None
    in_app: InAppOverrides | None = None


class TriggerEventRequest(_CamelModel):
    workflow: str
    subscriber_id: str | None = None
    subscriber: SubscriberInline | None = None
    payload: dict | None = None
    channels: list[str] | None = None
    overrides: ChannelOverrides | None = None
    deliver_at: str | None = None
    metadata: dict | None = None
    idempotency_key: str | None = None


class TriggerBulkRequest(_CamelModel):
    workflow: str
    subscribers: list[SubscriberInline]
    payload: dict | None = None
    channels: list[str] | None = None
    overrides: ChannelOverrides | None = None
    deliver_at: str | None = None
    metadata: dict | None = None
    idempotency_key: str | None = None


class CreateSubscriberRequest(_CamelModel):
    external_id: str
    email: str | None = None
    name: str | None = None
    phone_number: str | None = None
    slack_user_id: str | None = None
    discord_webhook_url: str | None = None
    telegram_chat_id: str | None = None
    custom_properties: dict | None = None
    channel_preferences: dict | None = None


class UpdateSubscriberRequest(_CamelModel):
    email: str | None = None
    name: str | None = None
    phone_number: str | None = None
    slack_user_id: str | None = None
    discord_webhook_url: str | None = None
    telegram_chat_id: str | None = None
    custom_properties: dict | None = None
    channel_preferences: dict | None = None


class RegisterPushTokenRequest(_CamelModel):
    token: str
    platform: str  # "android" | "ios" | "web"
    device_id: str | None = None


# --- Response Types ---

class TriggerEventResponse(_CamelModel):
    event_id: str
    status: str
    channels_requested: list[str] | None = None
    channels_matched: list[str] | None = None
    warnings: list[str] = []
    scheduled_at: str | None = None


class SubscriberTriggerStatus(_CamelModel):
    subscriber_id: str
    event_id: str | None = None
    status: str
    error: str | None = None


class TriggerBulkResponse(_CamelModel):
    batch_id: str
    status: str
    total: int
    accepted: int
    duplicates: int
    errors: int
    results: list[SubscriberTriggerStatus]


class PushTokenResponse(_CamelModel):
    token: str
    platform: str
    device_id: str | None = None
    last_seen: str | None = None


class SubscriberResponse(_CamelModel):
    id: str
    external_id: str
    email: str | None = None
    name: str | None = None
    phone_number: str | None = None
    slack_user_id: str | None = None
    discord_webhook_url: str | None = None
    telegram_chat_id: str | None = None
    push_tokens: list[PushTokenResponse] = []
    custom_properties: dict = {}
    channel_preferences: dict = {}
    created_at: str
    updated_at: str


class PreferencesResponse(_CamelModel):
    global_prefs: dict[str, bool] | None = Field(default=None, alias="global")
    categories: dict[str, dict[str, bool]] | None = None
    dnd: dict | None = None
    frequency: dict | None = None
