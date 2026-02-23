import uuid
from datetime import datetime

from pydantic import BaseModel


class EventLogResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    method: str
    path: str
    status_code: int | None = None
    latency_ms: int | None = None
    request_body: dict | None = None
    response_summary: dict | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime


class EventLogListResponse(BaseModel):
    logs: list[EventLogResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
