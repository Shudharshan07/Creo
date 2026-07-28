import uuid
from datetime import datetime
from pydantic import BaseModel


class CastingCallCreate(BaseModel):
    character_name: str
    role_description: str | None = None
    requirements: str | None = None
    audition_format: str | None = "self-tape"
    deadline: datetime | None = None
    is_paid: bool = True
    compensation_notes: str | None = None


class CastingCallUpdate(BaseModel):
    role_description: str | None = None
    requirements: str | None = None
    audition_format: str | None = None
    deadline: datetime | None = None
    is_paid: bool | None = None
    compensation_notes: str | None = None
    is_active: bool | None = None


class CastingCallOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    character_name: str
    role_description: str | None
    requirements: str | None
    audition_format: str | None
    deadline: datetime | None
    is_paid: bool
    compensation_notes: str | None
    poster_text: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
