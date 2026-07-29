import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class LocationScoutBase(BaseModel):
    location_name: str
    location_type: str | None = None
    visual_description: str | None = None
    recommended_spots: str | None = None
    permits_lighting_notes: str | None = None


class LocationScoutCreate(LocationScoutBase):
    pass


class LocationScoutUpdate(BaseModel):
    location_name: str | None = None
    location_type: str | None = None
    visual_description: str | None = None
    recommended_spots: str | None = None
    permits_lighting_notes: str | None = None


class LocationScoutOut(LocationScoutBase):
    id: uuid.UUID
    project_id: uuid.UUID
    scout_report: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
