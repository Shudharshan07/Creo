import uuid
from datetime import datetime
from pydantic import BaseModel


class ProjectCreate(BaseModel):
    title: str
    genre: str | None = None
    logline: str | None = None


class ProjectUpdate(BaseModel):
    title: str | None = None
    genre: str | None = None
    logline: str | None = None
    status: str | None = None


class ProjectOut(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    genre: str | None
    logline: str | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
