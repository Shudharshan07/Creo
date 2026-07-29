import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.music import MusicTrack
from app.models.project import Project
from app.models.user import User
from app.schemas.music import MusicSearchRequest, MusicTrackOut
from app.auth.jwt import get_current_user
from app.services.music_service import search_jamendo_music
from app.services.project_service import touch_project

router = APIRouter(prefix="/projects/{project_id}/music", tags=["Music"])


async def _get_project_or_404(project_id: uuid.UUID, user: User, db: AsyncSession) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id, Project.owner_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("", response_model=list[MusicTrackOut])
async def list_music_tracks(project_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_project_or_404(project_id, current_user, db)
    result = await db.execute(select(MusicTrack).where(MusicTrack.project_id == project_id))
    return result.scalars().all()


@router.post("/search", response_model=list[MusicTrackOut], status_code=201)
async def search_and_save_music(project_id: uuid.UUID, body: MusicSearchRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = await _get_project_or_404(project_id, current_user, db)
    tracks_data = await search_jamendo_music(body.query, body.limit, body.page, project=project)
    saved = []
    for t in tracks_data:
        track = MusicTrack(**t, project_id=project_id)
        db.add(track)
        saved.append(track)
    if saved:
        touch_project(project)
    await db.commit()
    for t in saved:
        await db.refresh(t)
    return saved
