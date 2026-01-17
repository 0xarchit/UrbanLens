from typing import Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import jwt
from jwt import PyJWTError

from Backend.database.connection import get_db
from Backend.database.models import Issue, Member
from Backend.core.logging import get_logger
from Backend.core.config import settings
from Backend.utils.storage import save_upload, get_upload_url

logger = get_logger(__name__)
router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/admin/login")

async def get_current_worker(
    token: str = Depends(oauth2_scheme), 
    db: AsyncSession = Depends(get_db)
) -> Member:
    try:
        payload = jwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256"])
        member_id = payload.get("sub")
        if not member_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        member = await db.get(Member, UUID(member_id))
        if not member or not member.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")
        
        if member.role not in ["worker", "admin"]:
            raise HTTPException(status_code=403, detail="Not a worker")
        
        return member
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


class TaskResponse(BaseModel):
    id: UUID
    description: Optional[str]
    priority: Optional[int]
    state: str
    city: Optional[str]
    locality: Optional[str]
    full_address: Optional[str]
    latitude: float
    longitude: float
    image_url: Optional[str]
    annotated_url: Optional[str]
    created_at: datetime
    sla_deadline: Optional[datetime]
    category: Optional[str] = None


@router.get("/tasks", response_model=list[TaskResponse])
async def get_worker_tasks(
    db: AsyncSession = Depends(get_db),
    current_worker: Member = Depends(get_current_worker),
):
    result = await db.execute(
        select(Issue)
        .options(selectinload(Issue.images), selectinload(Issue.classification))
        .where(Issue.assigned_member_id == current_worker.id)
        .where(Issue.state.in_(["assigned", "in_progress", "pending_verification", "resolved"]))
        .order_by(Issue.priority.asc().nullslast(), Issue.created_at.asc())
    )
    issues = result.scalars().all()
    
    tasks = []
    for issue in issues:
        image_url = None
        annotated_url = None
        if issue.images:
            image_url = get_upload_url(issue.images[0].file_path)
            if issue.images[0].annotated_path:
                annotated_url = get_upload_url(issue.images[0].annotated_path)
        
        tasks.append(TaskResponse(
            id=issue.id,
            description=issue.description,
            priority=issue.priority,
            state=issue.state,
            city=issue.city,
            locality=issue.locality,
            full_address=issue.full_address,
            latitude=issue.latitude,
            longitude=issue.longitude,
            image_url=image_url,
            annotated_url=annotated_url,
            created_at=issue.created_at,
            sla_deadline=issue.sla_deadline,
            category=issue.classification.primary_category if issue.classification else None,
        ))
    
    return tasks


@router.post("/tasks/{task_id}/start")
async def start_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_worker: Member = Depends(get_current_worker),
):
    issue = await db.get(Issue, task_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if issue.assigned_member_id != current_worker.id:
        raise HTTPException(status_code=403, detail="Not assigned to this task")
    
    issue.state = "in_progress"
    await db.commit()
    
    logger.info(f"Worker {current_worker.id} started task {task_id}")
    return {"status": "started"}


@router.post("/tasks/{task_id}/complete")
async def complete_task(
    task_id: UUID,
    notes: Optional[str] = Form(None),
    proof_image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_worker: Member = Depends(get_current_worker),
):
    issue = await db.get(Issue, task_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if issue.assigned_member_id != current_worker.id:
        raise HTTPException(status_code=403, detail="Not assigned to this task")
    
    proof_path = await save_upload(proof_image, f"proofs/{task_id}")
    
    issue.state = "pending_verification"
    issue.proof_image_path = proof_path
    issue.resolution_notes = notes
    issue.resolved_at = datetime.utcnow()
    
    
    
    await db.commit()
    
    logger.info(f"Worker {current_worker.id} completed task {task_id}")
    
    return {
        "status": "completed",
        "proof_url": get_upload_url(proof_path),
    }


@router.get("/tasks/{task_id}")
async def get_task_detail(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_worker: Member = Depends(get_current_worker),
):
    result = await db.execute(
        select(Issue)
        .options(selectinload(Issue.images), selectinload(Issue.classification))
        .where(Issue.id == task_id)
    )
    issue = result.scalar_one_or_none()
    
    if not issue:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if issue.assigned_member_id != current_worker.id:
        raise HTTPException(status_code=403, detail="Not assigned to this task")
    
    image_url = None
    annotated_url = None
    if issue.images:
        image_url = get_upload_url(issue.images[0].file_path)
        if issue.images[0].annotated_path:
            annotated_url = get_upload_url(issue.images[0].annotated_path)
    
    return {
        "id": str(issue.id),
        "description": issue.description,
        "priority": issue.priority,
        "state": issue.state,
        "city": issue.city,
        "locality": issue.locality,
        "full_address": issue.full_address,
        "latitude": issue.latitude,
        "longitude": issue.longitude,
        "image_url": image_url,
        "annotated_url": annotated_url,
        "created_at": issue.created_at,
        "sla_deadline": issue.sla_deadline,
        "category": issue.classification.primary_category if issue.classification else None,
        "proof_image_url": get_upload_url(issue.proof_image_path) if issue.proof_image_path else None,
        "resolution_notes": issue.resolution_notes,
        "resolved_at": issue.resolved_at,
    }
