import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator, model_validator

VALID_CHANNELS = {"in_app", "email", "slack", "whatsapp", "discord", "telegram"}
ChannelType = Literal["in_app", "email", "slack", "whatsapp", "discord", "telegram"]


class EmailOverrides(BaseModel):
    to: str | None = None
    subject: str | None = None
    reply_to: str | None = None
    cc: list[str] = []
    bcc: list[str] = []


class SlackOverrides(BaseModel):
    channel_id: str | None = None
    thread_ts: str | None = None


class InAppOverrides(BaseModel):
    action_url: str | None = None


class ChannelOverrides(BaseModel):
    email: EmailOverrides | None = None
    slack: SlackOverrides | None = None
    in_app: InAppOverrides | None = None


class SubscriberInline(BaseModel):
    id: str                         # client's own user ID (external_id)
    email: str | None = None
    name: str | None = None
    phone: str | None = None        # for WhatsApp (Phase 4)
    data: dict = {}                 # merged into custom_properties


class TriggerEvent(BaseModel):
    workflow: str
    subscriber: SubscriberInline | None = None
    subscriber_id: str | None = None   # deprecated — use subscriber.id instead
    payload: dict = {}
    channels: list[ChannelType] | None = None
    overrides: ChannelOverrides | None = None
    deliver_at: datetime | None = None
    metadata: dict = {}
    idempotency_key: str | None = None

    @field_validator("channels")
    @classmethod
    def validate_channels(cls, v):
        if v is not None and len(v) == 0:
            raise ValueError("channels list cannot be empty")
        return v

    @model_validator(mode="after")
    def validate_subscriber(self):
        if self.subscriber is None and self.subscriber_id is None:
            raise ValueError("either 'subscriber' or 'subscriber_id' must be provided")
        # If both provided, subscriber takes precedence (subscriber_id ignored)
        return self


class TriggerResponse(BaseModel):
    event_id: uuid.UUID
    status: str = "accepted"
    channels_requested: list[str] | None = None
    channels_matched: list[str] | None = None
    warnings: list[str] = []
    scheduled_at: datetime | None = None


class TriggerBulkEvent(BaseModel):
    workflow: str
    subscribers: list[SubscriberInline]
    payload: dict = {}
    channels: list[ChannelType] | None = None
    overrides: ChannelOverrides | None = None
    deliver_at: datetime | None = None
    metadata: dict = {}
    idempotency_key: str | None = None

    @field_validator("channels")
    @classmethod
    def validate_channels(cls, v):
        if v is not None and len(v) == 0:
            raise ValueError("channels list cannot be empty")
        return v

    @field_validator("subscribers")
    @classmethod
    def validate_subscribers(cls, v):
        if len(v) == 0:
            raise ValueError("subscribers list cannot be empty")
        if len(v) > 1000:
            raise ValueError("subscribers list cannot exceed 1000 entries")
        return v


class SubscriberTriggerStatus(BaseModel):
    subscriber_id: str
    event_id: uuid.UUID | None = None
    status: str   # "accepted" | "duplicate" | "error"
    error: str | None = None


class TriggerBulkResponse(BaseModel):
    batch_id: uuid.UUID
    status: str = "accepted"
    total: int
    accepted: int
    duplicates: int
    errors: int
    results: list[SubscriberTriggerStatus]
