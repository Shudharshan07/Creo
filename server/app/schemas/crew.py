import uuid
from datetime import datetime
from pydantic import BaseModel


class CrewPostingCreate(BaseModel):
    role_title: str
    department: str | None = None
    description: str | None = None
    requirements: str | None = None
    experience_level: str | None = "mid"
    is_paid: bool = True
    compensation_notes: str | None = None
    location: str | None = None
    is_remote: bool = False


class CrewPostingUpdate(BaseModel):
    description: str | None = None
    requirements: str | None = None
    experience_level: str | None = None
    is_paid: bool | None = None
    compensation_notes: str | None = None
    location: str | None = None
    is_remote: bool | None = None
    is_active: bool | None = None


class CrewPostingOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    role_title: str
    department: str | None
    description: str | None
    requirements: str | None
    experience_level: str | None
    is_paid: bool
    compensation_notes: str | None
    location: str | None
    is_remote: bool
    poster_text: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
