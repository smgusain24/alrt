import uuid

from pydantic import BaseModel


class TriggerEvent(BaseModel):
    workflow: str
    subscriber_id: str
    payload: dict = {}
    idempotency_key: str | None = None


class TriggerResponse(BaseModel):
    event_id: uuid.UUID
    status: str = "accepted"
