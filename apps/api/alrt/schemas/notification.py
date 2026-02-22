import json
import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator


class NotificationResponse(BaseModel):
    id: uuid.UUID
    channel: str
    title: str | None
    body: str | None
    action_url: str | None
    payload: dict
    status: str
    is_read: bool
    is_archived: bool
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("payload", mode="before")
    @classmethod
    def parse_payload(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return {}
        return v if v is not None else {}


class UpdateNotification(BaseModel):
    is_read: bool | None = None
    is_archived: bool | None = None
