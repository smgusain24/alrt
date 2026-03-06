import uuid
from datetime import datetime

from pydantic import BaseModel, Field


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
    custom_properties: dict = {}
    channel_preferences: dict = {}


class UpdateSubscriber(BaseModel):
    email: str | None = None
    name: str | None = None
    phone_number: str | None = None
    slack_user_id: str | None = None
    discord_webhook_url: str | None = None
    telegram_chat_id: str | None = None
    custom_properties: dict | None = None
    channel_preferences: dict | None = None


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
