import uuid
from datetime import datetime

from pydantic import BaseModel


class CreateSubscriber(BaseModel):
    external_id: str
    email: str | None = None
    name: str | None = None
    slack_user_id: str | None = None
    custom_properties: dict = {}
    channel_preferences: dict = {}


class UpdateSubscriber(BaseModel):
    email: str | None = None
    name: str | None = None
    slack_user_id: str | None = None
    custom_properties: dict | None = None
    channel_preferences: dict | None = None


class SubscriberResponse(BaseModel):
    id: uuid.UUID
    external_id: str
    email: str | None
    name: str | None
    slack_user_id: str | None
    custom_properties: dict
    channel_preferences: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UpdatePreferences(BaseModel):
    channel_preferences: dict
