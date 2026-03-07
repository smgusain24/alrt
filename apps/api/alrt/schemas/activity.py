from pydantic import BaseModel


class ChannelStatus(BaseModel):
    channel: str
    status: str
    error_reason: str | None = None


class ActivityItem(BaseModel):
    execution_id: str
    created_at: str
    event_name: str | None = None
    workflow_name: str | None = None
    execution_status: str | None = None
    event_payload: dict | None = None
    subscriber_name: str | None = None
    subscriber_external_id: str | None = None
    channels: list[ChannelStatus]
    has_failure: bool


class ActivityFeedResponse(BaseModel):
    items: list[ActivityItem]
    total: int
    page: int
    per_page: int
    total_pages: int
