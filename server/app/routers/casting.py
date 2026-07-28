import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.casting import CastingCall
from app.models.project import Project
from app.models.user import User
from app.schemas.casting import CastingCallCreate, CastingCallUpdate, CastingCallOut
from app.auth.jwt import get_current_user
from app.services.casting_service import generate_casting_poster

router = APIRouter(prefix="/projects/{project_id}/casting", tags=["Casting"])


async def _get_project_or_404(project_id: uuid.UUID, user: User, db: AsyncSession) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id, Project.owner_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("", response_model=list[CastingCallOut])
async def list_casting_calls(project_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_project_or_404(project_id, current_user, db)
    result = await db.execute(select(CastingCall).where(CastingCall.project_id == project_id))
    return result.scalars().all()


@router.post("", response_model=CastingCallOut, status_code=201)
async def create_casting_call(project_id: uuid.UUID, body: CastingCallCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = await _get_project_or_404(project_id, current_user, db)
    poster_text = await generate_casting_poster(body, project)
    call = CastingCall(**body.model_dump(), project_id=project_id, poster_text=poster_text)
    db.add(call)
    await db.commit()
    await db.refresh(call)
    return call


@router.patch("/{call_id}", response_model=CastingCallOut)
async def update_casting_call(project_id: uuid.UUID, call_id: uuid.UUID, body: CastingCallUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_project_or_404(project_id, current_user, db)
    result = await db.execute(select(CastingCall).where(CastingCall.id == call_id, CastingCall.project_id == project_id))
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Casting call not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(call, field, value)
    await db.commit()
    await db.refresh(call)
    return call


@router.delete("/{call_id}", status_code=204)
async def delete_casting_call(project_id: uuid.UUID, call_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_project_or_404(project_id, current_user, db)
    result = await db.execute(select(CastingCall).where(CastingCall.id == call_id, CastingCall.project_id == project_id))
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Casting call not found")
    await db.delete(call)
    await db.commit()
