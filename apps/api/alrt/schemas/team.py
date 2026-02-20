import uuid
from datetime import datetime

from pydantic import BaseModel


class CreateTeam(BaseModel):
    name: str


class TeamResponse(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateApiKey(BaseModel):
    key_type: str = "server"


class ApiKeyResponse(BaseModel):
    id: uuid.UUID
    key_prefix: str
    key_type: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiKeyCreatedResponse(ApiKeyResponse):
    raw_key: str
