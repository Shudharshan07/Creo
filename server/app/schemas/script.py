import uuid
from datetime import datetime
from pydantic import BaseModel


class ScriptCreate(BaseModel):
    content: str | None = None
    scene_breakdown: str | None = None
    characters: str | None = None


class ScriptGenerateRequest(BaseModel):
    prompt: str  # e.g. "Write a 3-act thriller about a detective in Mumbai"


class ScriptOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    version: int
    content: str | None
    scene_breakdown: str | None
    characters: str | None
    ai_notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
