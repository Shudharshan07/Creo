import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.script import Script
from app.models.project import Project
from app.models.user import User
from app.schemas.script import ScriptCreate, ScriptGenerateRequest, ScriptOut
from app.auth.jwt import get_current_user
from app.services.project_service import touch_project
from app.services.script_service import generate_script

router = APIRouter(prefix="/projects/{project_id}/scripts", tags=["Scripts"])


async def _get_project_or_404(project_id: uuid.UUID, user: User, db: AsyncSession) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id, Project.owner_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("", response_model=list[ScriptOut])
async def list_scripts(project_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_project_or_404(project_id, current_user, db)
    result = await db.execute(select(Script).where(Script.project_id == project_id))
    return result.scalars().all()


@router.post("", response_model=ScriptOut, status_code=201)
async def create_script(project_id: uuid.UUID, body: ScriptCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = await _get_project_or_404(project_id, current_user, db)
    version_result = await db.execute(select(func.count()).where(Script.project_id == project_id))
    version = (version_result.scalar() or 0) + 1
    script = Script(**body.model_dump(), project_id=project_id, version=version)
    db.add(script)
    touch_project(project)
    await db.commit()
    await db.refresh(script)
    return script


@router.post("/generate", response_model=ScriptOut, status_code=201)
async def generate_script_endpoint(project_id: uuid.UUID, body: ScriptGenerateRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = await _get_project_or_404(project_id, current_user, db)
    version_result = await db.execute(select(func.count()).where(Script.project_id == project_id))
    version = (version_result.scalar() or 0) + 1
    script_data = await generate_script(body.prompt, project)
    script = Script(project_id=project_id, version=version, **script_data)
    db.add(script)
    touch_project(project)
    await db.commit()
    await db.refresh(script)
    return script


@router.get("/{script_id}", response_model=ScriptOut)
async def get_script(project_id: uuid.UUID, script_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_project_or_404(project_id, current_user, db)
    result = await db.execute(select(Script).where(Script.id == script_id, Script.project_id == project_id))
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    return script
