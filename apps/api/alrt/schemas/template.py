import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CreateTemplate(BaseModel):
    name: str = Field(..., max_length=255)
    channel: str = Field(..., pattern="^(email|in_app|slack)$")
    subject: str | None = Field(None, max_length=500)
    body: str
    variables: list[str] = Field(default_factory=list)


class UpdateTemplate(BaseModel):
    name: str | None = Field(None, max_length=255)
    channel: str | None = Field(None, pattern="^(email|in_app|slack)$")
    subject: str | None = None
    body: str | None = None
    variables: list[str] | None = None
    status: str | None = Field(None, pattern="^(draft|active)$")


class TemplateResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    name: str
    channel: str
    subject: str | None
    body: str
    variables: list[str]
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TemplateListResponse(BaseModel):
    items: list[TemplateResponse]
    total: int


class TemplatePreviewRequest(BaseModel):
    payload: dict = Field(default_factory=dict)
    subscriber_id: str | None = None


class TemplatePreviewResponse(BaseModel):
    subject: str | None
    body: str
