import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    asset_type: Mapped[str] = mapped_column(String(50), nullable=False)   # video | audio | image | moodboard
    title: Mapped[str] = mapped_column(String(255), nullable=True)
    source_url: Mapped[str] = mapped_column(Text, nullable=False)         # external URL
    thumbnail_url: Mapped[str] = mapped_column(Text, nullable=True)
    license_type: Mapped[str] = mapped_column(String(100), nullable=True) # CC0, royalty-free, etc.
    source_provider: Mapped[str] = mapped_column(String(100), nullable=True)  # pexels | pixabay | freesound
    tags: Mapped[str] = mapped_column(Text, nullable=True)                # comma-separated or JSON
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship("Project", back_populates="assets")
