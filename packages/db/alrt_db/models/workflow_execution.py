import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from alrt_db.base import Base, IDMixin, TimestampMixin


class WorkflowExecution(Base, IDMixin, TimestampMixin):
    __tablename__ = "workflow_executions"

    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id"))
    workflow_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workflows.id"))
    subscriber_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("subscribers.id"))
    event_payload = mapped_column(JSONB, server_default="{}")
    status: Mapped[str] = mapped_column(String(20), default="running")
    idempotency_key: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
