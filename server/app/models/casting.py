import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CastingCall(Base):
    __tablename__ = "casting_calls"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    character_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role_description: Mapped[str] = mapped_column(Text, nullable=True)
    requirements: Mapped[str] = mapped_column(Text, nullable=True)      # age range, ethnicity, skills etc.
    audition_format: Mapped[str] = mapped_column(String(100), nullable=True)  # in-person | self-tape | remote
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=True)
    compensation_notes: Mapped[str] = mapped_column(String(500), nullable=True)
    poster_text: Mapped[str] = mapped_column(Text, nullable=True)       # AI-generated poster content
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship("Project", back_populates="casting_calls")
