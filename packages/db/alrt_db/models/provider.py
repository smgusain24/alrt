import uuid

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from alrt_db.base import Base, IDMixin, TimestampMixin


class Provider(Base, IDMixin, TimestampMixin):
    __tablename__ = "providers"

    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id"))
    channel: Mapped[str] = mapped_column(String(20))
    provider_type: Mapped[str] = mapped_column(String(50))
    config = mapped_column(JSONB, server_default="{}")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    team = relationship("Team", back_populates="providers")
