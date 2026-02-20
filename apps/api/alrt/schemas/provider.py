import uuid
from datetime import datetime

from pydantic import BaseModel


class CreateProvider(BaseModel):
    channel: str
    provider_type: str
    config: dict


class ProviderResponse(BaseModel):
    id: uuid.UUID
    channel: str
    provider_type: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
