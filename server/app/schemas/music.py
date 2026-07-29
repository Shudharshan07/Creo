import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class MusicSearchRequest(BaseModel):
    query: str
    limit: int = 3
    page: int = 1
    project_title: str | None = None


class MusicTrackOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    artist: str | None
    album: str | None
    preview_url: str | None
    deezer_url: str | None
    cover_url: str | None
    duration: int | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
