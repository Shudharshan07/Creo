import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.asset import Asset
from app.models.project import Project
from app.models.user import User
from app.schemas.asset import AssetSearchRequest, AssetOut
from app.auth.jwt import get_current_user
from app.services.asset_service import search_assets
from app.services.project_service import touch_project

router = APIRouter(prefix="/projects/{project_id}/assets", tags=["Assets"])


async def _get_project_or_404(project_id: uuid.UUID, user: User, db: AsyncSession) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id, Project.owner_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("", response_model=list[AssetOut])
async def list_assets(project_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_project_or_404(project_id, current_user, db)
    result = await db.execute(select(Asset).where(Asset.project_id == project_id))
    return result.scalars().all()


@router.post("/search", response_model=list[AssetOut], status_code=201)
async def search_and_save_assets(project_id: uuid.UUID, body: AssetSearchRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = await _get_project_or_404(project_id, current_user, db)
    assets_data = await search_assets(body.query, body.asset_type, body.limit, project=project, page=body.page)
    saved = []
    for a in assets_data:
        asset = Asset(**a, project_id=project_id)
        db.add(asset)
        saved.append(asset)
    if saved:
        touch_project(project)
    await db.commit()
    for a in saved:
        await db.refresh(a)
    return saved


@router.delete("/{asset_id}", status_code=204)
async def delete_asset(project_id: uuid.UUID, asset_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = await _get_project_or_404(project_id, current_user, db)
    result = await db.execute(select(Asset).where(Asset.id == asset_id, Asset.project_id == project_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    await db.delete(asset)
    touch_project(project)
    await db.commit()
