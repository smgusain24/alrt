import uuid
from typing import Literal

from pydantic import BaseModel, field_validator

VALID_CHANNELS = {"in_app", "email", "slack"}
ChannelType = Literal["in_app", "email", "slack"]


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


class TriggerEvent(BaseModel):
    workflow: str
    subscriber_id: str
    payload: dict = {}
    channels: list[ChannelType] | None = None
    overrides: ChannelOverrides | None = None
    idempotency_key: str | None = None

    @field_validator("channels")
    @classmethod
    def validate_channels(cls, v):
        if v is not None and len(v) == 0:
            raise ValueError("channels list cannot be empty")
        return v


class TriggerResponse(BaseModel):
    event_id: uuid.UUID
    status: str = "accepted"
    channels_requested: list[str] | None = None
    channels_matched: list[str] | None = None
    warnings: list[str] = []
