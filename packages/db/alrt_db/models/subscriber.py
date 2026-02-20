import uuid

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from alrt_db.base import Base, IDMixin, TimestampMixin


class Subscriber(Base, IDMixin, TimestampMixin):
    __tablename__ = "subscribers"
    __table_args__ = (
        UniqueConstraint("team_id", "external_id", name="uq_subscriber_team_external"),
    )

    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id"))
    external_id: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    slack_user_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    custom_properties = mapped_column(JSONB, server_default="{}")
    channel_preferences = mapped_column(JSONB, server_default="{}")
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    team = relationship("Team", back_populates="subscribers")
