import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from alrt_db.base import Base, IDMixin, TimestampMixin


class ScheduledStep(Base, IDMixin, TimestampMixin):
    __tablename__ = "scheduled_steps"

    workflow_execution_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workflow_executions.id"))
    next_step_id: Mapped[str] = mapped_column(String(255))
    payload = mapped_column(JSONB, server_default="{}")
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default="pending")
