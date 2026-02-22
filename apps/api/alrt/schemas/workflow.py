import uuid
from datetime import datetime

from pydantic import BaseModel


class CreateWorkflow(BaseModel):
    name: str
    event_name: str
    definition: dict = {}


class UpdateWorkflow(BaseModel):
    name: str | None = None
    event_name: str | None = None
    definition: dict | None = None


class WorkflowResponse(BaseModel):
    id: uuid.UUID
    name: str
    event_name: str
    definition: dict
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
