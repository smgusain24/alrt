from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from alrt_db.base import Base, IDMixin, TimestampMixin


class Team(Base, IDMixin, TimestampMixin):
    __tablename__ = "teams"

    name: Mapped[str] = mapped_column(String(255))

    api_keys = relationship("ApiKey", back_populates="team", cascade="all, delete-orphan")
    subscribers = relationship("Subscriber", back_populates="team", cascade="all, delete-orphan")
    workflows = relationship("Workflow", back_populates="team", cascade="all, delete-orphan")
    providers = relationship("Provider", back_populates="team", cascade="all, delete-orphan")
