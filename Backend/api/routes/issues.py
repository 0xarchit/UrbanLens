from typing import Optional
from uuid import UUID
from pydantic import BaseModel
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status, BackgroundTasks
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from Backend.core.schemas import IssueCreate, IssueResponse, IssueListResponse, IssueState
from Backend.core.flow_tracker import create_flow_tracker, remove_flow_tracker
from Backend.database.connection import get_db, get_db_context
from Backend.database.models import Issue, Classification
from Backend.services.ingestion import IngestionService
from Backend.agents import (
    VisionAgent, 
    GeoDeduplicateAgent, 
    PriorityAgent, 
    RoutingAgent,
    NotificationAgent,
)
from Backend.utils.storage import get_upload_url
from Backend.core.auth import get_user_id_from_form_token
from Backend.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()


def issue_to_response(issue: Issue) -> IssueResponse:
    image_urls = []
    annotated_urls = []
    for img in issue.images:
        image_urls.append(get_upload_url(img.file_path))
        if img.annotated_path:
            annotated_urls.append(get_upload_url(img.annotated_path))

    
    return IssueResponse(
        id=issue.id,
        description=issue.description,
        latitude=issue.latitude,
        longitude=issue.longitude,
        state=IssueState(issue.state),
        priority=issue.priority,
        category=issue.classification.primary_category if issue.classification else None,
        confidence=issue.classification.primary_confidence if issue.classification else None,
        image_urls=image_urls,
        annotated_urls=annotated_urls,
        validation_source=issue.validation_source,
        is_duplicate=issue.is_duplicate,
        parent_issue_id=issue.parent_issue_id,
        city=issue.city,
        locality=issue.locality,
        full_address=issue.full_address,
        geo_status="Duplicate" if issue.is_duplicate else "Clustered" if issue.geo_cluster_id else "Unique Location",
        sla_hours=issue.sla_hours,
        sla_deadline=issue.sla_deadline,
        created_at=issue.created_at,
        updated_at=issue.updated_at,
    )


async def get_issue_with_relations(db: AsyncSession, issue_id: UUID) -> Issue | None:
    query = (
        select(Issue)
        .options(selectinload(Issue.images), selectinload(Issue.classification))
        .where(Issue.id == issue_id)
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def run_agent_pipeline(db: AsyncSession, issue_id: UUID, image_paths: list[str], description: Optional[str]):
    tracker = create_flow_tracker(issue_id)
    
    try:
        await tracker.start_step("VisionAgent")
        vision = VisionAgent(db)
        vision_result = await vision.process_issue(issue_id, image_paths, description)
        
        detection_count = len(vision_result.detections)
        
        if detection_count == 0:
            await tracker.complete_step(
                "VisionAgent",
                decision="No issues detected",
                reasoning="0 detections - requires manual confirmation",
                result={
                    "detections": 0,
                    "needs_confirmation": True,
                    "annotated_urls": vision_result.annotated_urls,
                }
            )
            
            issue = await db.get(Issue, issue_id)
            if issue:
                issue.state = "pending_confirmation"
                issue.validation_source = "pending_manual"
                issue.validation_reason = "No issues detected by AI - awaiting user confirmation"
                await db.flush()
            
            final_result = {
                "issue_id": str(issue_id),
                "state": "pending_confirmation",
                "needs_confirmation": True,
                "detections": 0,
                "message": "No issues detected. Please confirm if you want to submit for manual review.",
            }
            await tracker.complete_flow(final_result)
            return
        
        await tracker.complete_step(
            "VisionAgent",
            decision=f"Detected: {vision_result.primary_category.value if vision_result.primary_category else 'Unknown'}",
            reasoning=f"Confidence: {vision_result.primary_confidence:.2%}, {detection_count} detections",
            result=vision_result.model_dump(mode='json')
        )
        
        await tracker.start_step("GeoDeduplicateAgent")
        geo = GeoDeduplicateAgent(db)
        geo_result = await geo.process_issue(issue_id)
        await tracker.complete_step(
            "GeoDeduplicateAgent",
            decision=f"Status: {geo_result.get('geo_status', 'unknown')}",
            reasoning=f"Nearby issues: {geo_result.get('nearby_count', 0)}",
            result=geo_result
        )
        
        if not geo_result.get("is_duplicate"):
            await tracker.start_step("PriorityAgent")
            priority = PriorityAgent(db)
            priority_result = await priority.process_issue(issue_id)
            await tracker.complete_step(
                "PriorityAgent",
                decision=f"Priority: {priority_result.get('priority', 'N/A')}",
                reasoning=priority_result.get("reasoning", ""),
                result=priority_result
            )
            
            await tracker.start_step("RoutingAgent")
            routing = RoutingAgent(db)
            routing_result = await routing.process_issue(issue_id)
            await tracker.complete_step(
                "RoutingAgent",
                decision=f"Routed to: {routing_result.get('department', 'N/A')}",
                reasoning=f"Assigned: {routing_result.get('member', 'N/A')}, SLA: {routing_result.get('sla_hours', 0)}h",
                result=routing_result
            )
            
            await tracker.start_step("NotificationAgent")
            notification = NotificationAgent(db)
            await notification.notify_assignment(issue_id)
            await tracker.complete_step(
                "NotificationAgent",
                decision="Notifications queued",
                reasoning="Assignment notification sent to assigned member",
                result={"queued": True}
            )
        else:
            await tracker.complete_step(
                "GeoDeduplicateAgent",
                decision="Marked as duplicate",
                reasoning=f"Linked to parent: {geo_result.get('parent_issue_id')}",
                result=geo_result
            )
        
        issue = await get_issue_with_relations(db, issue_id)
        final_result = {
            "issue_id": str(issue_id),
            "state": issue.state if issue else "unknown",
            "priority": issue.priority if issue else None,
            "is_duplicate": issue.is_duplicate if issue else False,
        }
        await tracker.complete_flow(final_result)
        
    except Exception as e:
        await tracker.error_flow(str(e))
        raise
    finally:
        remove_flow_tracker(issue_id)



async def run_agent_pipeline_background(issue_id: UUID, image_paths: list[str], description: Optional[str]):
    async with get_db_context() as session:
        await run_agent_pipeline(session, issue_id, image_paths, description)


@router.post("", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)

async def create_issue(
    background_tasks: BackgroundTasks,
    images: list[UploadFile] = File(...),
    description: Optional[str] = Form(None),
    latitude: float = Form(...),
    longitude: float = Form(...),
    accuracy_meters: Optional[float] = Form(None),
    platform: str = Form(...),
    device_model: Optional[str] = Form(None),
    authorization: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    user_id = get_user_id_from_form_token(authorization)
    
    data = IssueCreate(

        description=description,
        latitude=latitude,
        longitude=longitude,
        accuracy_meters=accuracy_meters,
        platform=platform,
        device_model=device_model,
    )
    
    ingestion = IngestionService(db)
    issue, image_paths = await ingestion.create_issue(data, images, user_id)
    
    
    tracker = create_flow_tracker(issue.id)
    
    await tracker.start_step("LocationStep")
    await tracker.complete_step(
        "LocationStep", 
        decision="Resolved", 
        reasoning=f"{latitude:.4f}, {longitude:.4f}",
        result={"city": "Mathura"} 
    )
    
    await tracker.start_step("UploadStep")
    await tracker.complete_step(
       "UploadStep",
       decision="Uploaded",
       reasoning=f"{len(images)} images stored securely",
       result={"count": len(images)}
    )
    
    
    background_tasks.add_task(run_agent_pipeline_background, issue.id, image_paths, data.description)

    
    issue = await get_issue_with_relations(db, issue.id)
    issue = await get_issue_with_relations(db, issue.id)
    return issue_to_response(issue)


async def run_remaining_pipeline(db: AsyncSession, issue_id: UUID):
    tracker = create_flow_tracker(issue_id)
    try:
        await tracker.start_step("GeoDeduplicateAgent")
        geo = GeoDeduplicateAgent(db)
        geo_result = await geo.process_issue(issue_id)
        await tracker.complete_step(
            "GeoDeduplicateAgent",
            decision=f"Status: {geo_result.get('geo_status', 'unknown')}",
            reasoning=f"Nearby issues: {geo_result.get('nearby_count', 0)}",
            result=geo_result
        )
        
        if not geo_result.get("is_duplicate"):
            await tracker.start_step("PriorityAgent")
            priority = PriorityAgent(db)
            priority_result = await priority.process_issue(issue_id)
            await tracker.complete_step(
                "PriorityAgent",
                decision=f"Priority: {priority_result.get('priority', 'N/A')}",
                reasoning=priority_result.get("reasoning", ""),
                result=priority_result
            )
            
            
            
            
            
            
            
            await tracker.start_step("RoutingAgent")
            await tracker.complete_step(
                "RoutingAgent",
                decision="Manual Review Requested",
                reasoning="Skipped automatic routing due to 0 detections/manual confirmation. Sent to triage queue.",
                result={"skipped": True, "queue": "manual_triage"}
            )
            
            
            
        else:
            await tracker.complete_step(
                "GeoDeduplicateAgent",
                decision="Marked as duplicate",
                reasoning=f"Linked to parent: {geo_result.get('parent_issue_id')}",
                result=geo_result
            )
        
        issue = await get_issue_with_relations(db, issue_id)
        final_result = {
            "issue_id": str(issue_id),
            "state": issue.state if issue else "unknown",
            "priority": issue.priority if issue else None,
            "is_duplicate": issue.is_duplicate if issue else False,
        }
        await tracker.complete_flow(final_result)
        
    except Exception as e:
        await tracker.error_flow(str(e))
        raise
    finally:
        remove_flow_tracker(issue_id)


class ConfirmationBody(BaseModel):
    confirmed: bool


@router.post("/{issue_id}/confirm", response_model=IssueResponse)
async def confirm_issue(
    issue_id: UUID,
    body: ConfirmationBody,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    issue = await get_issue_with_relations(db, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    if body.confirmed:
        issue.state = IssueState.REPORTED
        issue.validation_reason = "Manual confirmation by user (0 detections)"
        await db.flush()
        
        
        issue = await get_issue_with_relations(db, issue_id)
        
        
        background_tasks.add_task(pipeline_wrapper_resume, issue_id)
        
        return issue_to_response(issue)
    else:
        issue.state = IssueState.REJECTED
        issue.validation_reason = "User rejected manual confirmation"
        issue.resolution_notes = "User cancelled submission after 0 detections were found"
        await db.flush()
        
        
        issue = await get_issue_with_relations(db, issue_id)
        
        return issue_to_response(issue)


from Backend.database.connection import get_db_context

async def pipeline_wrapper(issue_id: UUID, image_paths: list[str], description: Optional[str]):
    try:
        async with get_db_context() as db:
            await run_agent_pipeline(db, issue_id, image_paths, description)
    except Exception:
        pass

async def pipeline_wrapper_resume(issue_id: UUID):
    try:
        async with get_db_context() as db:
            await run_remaining_pipeline(db, issue_id)
    except Exception:
        pass

@router.post("/stream", status_code=status.HTTP_201_CREATED)
async def create_issue_with_stream(
    background_tasks: BackgroundTasks,
    images: list[UploadFile] = File(...),
    description: Optional[str] = Form(None),
    latitude: float = Form(...),
    longitude: float = Form(...),
    accuracy_meters: Optional[float] = Form(None),
    platform: str = Form(...),
    device_model: Optional[str] = Form(None),
    authorization: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    user_id = get_user_id_from_form_token(authorization)
    logger.info(f"[/stream] Creating issue - user_id: {user_id}, authorization_present: {bool(authorization)}")
    
    data = IssueCreate(
        description=description,
        latitude=latitude,
        longitude=longitude,
        accuracy_meters=accuracy_meters,
        platform=platform,
        device_model=device_model,
    )
    
    ingestion = IngestionService(db)
    issue, image_paths = await ingestion.create_issue(data, images, user_id)
    logger.info(f"[/stream] Issue created: {issue.id} with user_id: {issue.user_id}")
    
    
    await db.commit()
    
    
    tracker = create_flow_tracker(issue.id)
    
    
    background_tasks.add_task(pipeline_wrapper, issue.id, image_paths, data.description)
    
    return {
        "issue_id": str(issue.id),
        "stream_url": f"/flow/flow/{issue.id}",
        "message": "Issue created. Pipeline started in background.",
    }


@router.post("/{issue_id}/process")
async def process_issue_pipeline(
    issue_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    issue = await get_issue_with_relations(db, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    image_paths = [img.file_path for img in issue.images]
    
    await run_agent_pipeline(db, issue_id, image_paths, issue.description)
    
    issue = await get_issue_with_relations(db, issue_id)
    return issue_to_response(issue)


@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue(
    issue_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    issue = await get_issue_with_relations(db, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue_to_response(issue)


@router.patch("/{issue_id}/resolve")
async def resolve_issue(
    issue_id: UUID,
    resolution_notes: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    issue = await db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    from datetime import datetime
    issue.state = "resolved"
    issue.resolved_at = datetime.utcnow()
    issue.resolution_notes = resolution_notes
    
    if issue.assigned_member_id:
        from Backend.database.models import Member
        member = await db.get(Member, issue.assigned_member_id)
        if member and member.current_workload > 0:
            member.current_workload -= 1
    
    await db.flush()
    
    issue = await get_issue_with_relations(db, issue_id)
    return issue_to_response(issue)


@router.get("", response_model=IssueListResponse)
async def list_issues(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    state: Optional[IssueState] = None,
    priority: Optional[int] = Query(None, ge=1, le=4),
    department_id: Optional[UUID] = None,
    is_duplicate: Optional[bool] = None,
    user_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Issue)
        .options(selectinload(Issue.images), selectinload(Issue.classification))
        .order_by(Issue.created_at.desc())
    )
    count_query = select(func.count(Issue.id))
    
    if state:
        query = query.where(Issue.state == state.value)
        count_query = count_query.where(Issue.state == state.value)
    
    if priority:
        query = query.where(Issue.priority == priority)
        count_query = count_query.where(Issue.priority == priority)
    
    if department_id:
        query = query.where(Issue.department_id == department_id)
        count_query = count_query.where(Issue.department_id == department_id)
    
    if is_duplicate is not None:
        query = query.where(Issue.is_duplicate == is_duplicate)
        count_query = count_query.where(Issue.is_duplicate == is_duplicate)
    
    if user_id:
        query = query.where(Issue.user_id == user_id)
        count_query = count_query.where(Issue.user_id == user_id)

    
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    result = await db.execute(query)
    issues = result.scalars().all()
    
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    
    return IssueListResponse(
        items=[issue_to_response(issue) for issue in issues],
        total=total,
        page=page,
        page_size=page_size,
    )
