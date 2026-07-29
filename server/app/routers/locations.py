import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.location import LocationScout
from app.models.project import Project
from app.models.user import User
from app.schemas.location import LocationScoutCreate, LocationScoutUpdate, LocationScoutOut
from app.auth.jwt import get_current_user
from app.services.project_service import touch_project
from app.services.location_service import generate_location_report

router = APIRouter(prefix="/projects/{project_id}/locations", tags=["Locations"])


async def _get_project_or_404(project_id: uuid.UUID, user: User, db: AsyncSession) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id, Project.owner_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("", response_model=list[LocationScoutOut])
async def list_location_scouts(project_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_project_or_404(project_id, current_user, db)
    result = await db.execute(select(LocationScout).where(LocationScout.project_id == project_id))
    return result.scalars().all()


@router.post("/scout", response_model=LocationScoutOut, status_code=201)
async def scout_location(project_id: uuid.UUID, body: LocationScoutCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = await _get_project_or_404(project_id, current_user, db)
    scout_report = await generate_location_report(body, project)
    scout = LocationScout(**body.model_dump(), project_id=project_id, scout_report=scout_report)
    db.add(scout)
    touch_project(project)
    await db.commit()
    await db.refresh(scout)
    return scout


@router.patch("/{scout_id}", response_model=LocationScoutOut)
async def update_location_scout(project_id: uuid.UUID, scout_id: uuid.UUID, body: LocationScoutUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = await _get_project_or_404(project_id, current_user, db)
    result = await db.execute(select(LocationScout).where(LocationScout.id == scout_id, LocationScout.project_id == project_id))
    scout = result.scalar_one_or_none()
    if not scout:
        raise HTTPException(status_code=404, detail="Location scout record not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(scout, field, value)
    touch_project(project)
    await db.commit()
    await db.refresh(scout)
    return scout


@router.delete("/{scout_id}", status_code=204)
async def delete_location_scout(project_id: uuid.UUID, scout_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = await _get_project_or_404(project_id, current_user, db)
    result = await db.execute(select(LocationScout).where(LocationScout.id == scout_id, LocationScout.project_id == project_id))
    scout = result.scalar_one_or_none()
    if not scout:
        raise HTTPException(status_code=404, detail="Location scout record not found")
    await db.delete(scout)
    touch_project(project)
    await db.commit()
