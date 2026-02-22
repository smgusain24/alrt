import uuid
from typing import Literal

from pydantic import BaseModel, field_validator

VALID_CHANNELS = {"in_app", "email", "slack"}
ChannelType = Literal["in_app", "email", "slack"]


class TriggerEvent(BaseModel):
    workflow: str
    subscriber_id: str
    channels: list[ChannelType] | None = None
    payload: dict = {}
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
