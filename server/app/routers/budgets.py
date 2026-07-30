import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.project import Project
from app.models.user import User
from app.auth.jwt import get_current_user
from app.services.project_service import touch_project
from app.services.budget_service import generate_film_budget

router = APIRouter(prefix="/projects/{project_id}/budgets", tags=["Budgets"])


class BudgetGenerateRequest(BaseModel):
    prompt: str


async def _get_project_or_404(project_id: uuid.UUID, user: User, db: AsyncSession) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id, Project.owner_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/generate")
async def generate_budget(
    project_id: uuid.UUID,
    body: BudgetGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _get_project_or_404(project_id, current_user, db)
    result = await generate_film_budget(body.prompt, project)
    touch_project(project)
    await db.commit()
    return result
