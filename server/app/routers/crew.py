import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.crew import CrewPosting
from app.models.project import Project
from app.models.user import User
from app.schemas.crew import CrewPostingCreate, CrewPostingUpdate, CrewPostingOut
from app.auth.jwt import get_current_user
from app.services.project_service import touch_project
from app.services.crew_service import generate_crew_posting

router = APIRouter(prefix="/projects/{project_id}/crew", tags=["Crew"])


async def _get_project_or_404(project_id: uuid.UUID, user: User, db: AsyncSession) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id, Project.owner_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("", response_model=list[CrewPostingOut])
async def list_crew_postings(project_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_project_or_404(project_id, current_user, db)
    result = await db.execute(select(CrewPosting).where(CrewPosting.project_id == project_id))
    return result.scalars().all()


@router.post("", response_model=CrewPostingOut, status_code=201)
async def create_crew_posting(project_id: uuid.UUID, body: CrewPostingCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = await _get_project_or_404(project_id, current_user, db)
    poster_text = await generate_crew_posting(body, project)
    posting = CrewPosting(**body.model_dump(), project_id=project_id, poster_text=poster_text)
    db.add(posting)
    touch_project(project)
    await db.commit()
    await db.refresh(posting)
    return posting


@router.patch("/{posting_id}", response_model=CrewPostingOut)
async def update_crew_posting(project_id: uuid.UUID, posting_id: uuid.UUID, body: CrewPostingUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = await _get_project_or_404(project_id, current_user, db)
    result = await db.execute(select(CrewPosting).where(CrewPosting.id == posting_id, CrewPosting.project_id == project_id))
    posting = result.scalar_one_or_none()
    if not posting:
        raise HTTPException(status_code=404, detail="Crew posting not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(posting, field, value)
    touch_project(project)
    await db.commit()
    await db.refresh(posting)
    return posting


@router.delete("/{posting_id}", status_code=204)
async def delete_crew_posting(project_id: uuid.UUID, posting_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = await _get_project_or_404(project_id, current_user, db)
    result = await db.execute(select(CrewPosting).where(CrewPosting.id == posting_id, CrewPosting.project_id == project_id))
    posting = result.scalar_one_or_none()
    if not posting:
        raise HTTPException(status_code=404, detail="Crew posting not found")
    await db.delete(posting)
    touch_project(project)
    await db.commit()
