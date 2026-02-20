import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from alrt_db.base import Base, IDMixin, TimestampMixin


class Workflow(Base, IDMixin, TimestampMixin):
    __tablename__ = "workflows"
    __table_args__ = (
        UniqueConstraint("team_id", "event_name", name="uq_workflow_team_event"),
    )

    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id"))
    name: Mapped[str] = mapped_column(String(255))
    event_name: Mapped[str] = mapped_column(String(255))
    definition = mapped_column(JSONB, server_default="{}")
    status: Mapped[str] = mapped_column(String(20), default="draft")

    team = relationship("Team", back_populates="workflows")
