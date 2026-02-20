import uuid
from datetime import datetime

from pydantic import BaseModel


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


class UpdateNotification(BaseModel):
    is_read: bool | None = None
    is_archived: bool | None = None
