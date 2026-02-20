import uuid

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from alrt_db.base import Base, IDMixin, TimestampMixin


class ApiKey(Base, IDMixin, TimestampMixin):
    __tablename__ = "api_keys"

    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id"))
    key_hash: Mapped[str] = mapped_column(String(64))
    key_prefix: Mapped[str] = mapped_column(String(20))
    key_type: Mapped[str] = mapped_column(String(10))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    team = relationship("Team", back_populates="api_keys")
