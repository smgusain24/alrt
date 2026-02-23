from pydantic import BaseModel


class OverviewMetrics(BaseModel):
    total_sent: int
    total_failed: int
    total_pending: int


class ChannelMetrics(BaseModel):
    channel: str
    sent: int
    failed: int
    pending: int
    success_rate: float


class WorkflowMetrics(BaseModel):
    workflow_id: str
    workflow_name: str
    total_executions: int
    success_executions: int
    failed_executions: int
    success_rate: float
    avg_duration_ms: float


class TimelinePoint(BaseModel):
    date: str
    sent: int
    failed: int


class AnalyticsOverviewResponse(BaseModel):
    metrics: OverviewMetrics
    days: int


class AnalyticsDeliveryResponse(BaseModel):
    channels: list[ChannelMetrics]
    days: int


class AnalyticsWorkflowsResponse(BaseModel):
    workflows: list[WorkflowMetrics]


class AnalyticsTimelineResponse(BaseModel):
    timeline: list[TimelinePoint]
    days: int
