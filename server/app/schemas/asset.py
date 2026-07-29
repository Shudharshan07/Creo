import uuid
from datetime import datetime
from pydantic import BaseModel


class AssetSearchRequest(BaseModel):
    query: str
    asset_type: str = "image"  # image | video | audio
    limit: int = 3


class AssetOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    asset_type: str
    title: str | None
    source_url: str
    thumbnail_url: str | None
    license_type: str | None
    source_provider: str | None
    tags: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
