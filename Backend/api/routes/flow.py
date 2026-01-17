import asyncio
import json
from dataclasses import asdict
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from Backend.database.connection import get_db
from Backend.database.models import Issue, IssueEvent
from Backend.core.flow_tracker import get_flow_tracker, _active_flows

router = APIRouter()


async def event_generator(issue_id: UUID, timeout: int = 300):
    tracker = get_flow_tracker(issue_id)
    
    if not tracker:
        yield f"data: {json.dumps({'type': 'error', 'message': 'No active flow for this issue'})}\n\n"
        return
    
    queue = tracker.subscribe()
    
    try:
        start_msg = {
            "type": "connected",
            "issue_id": str(issue_id),
            "message": "Connected to agent flow stream",
            "current_steps": [asdict(s) for s in tracker.flow.steps]
        }
        yield f"data: {json.dumps(start_msg)}\n\n"
        
        
        
        
        
        
        
        
        if tracker.flow.status in ["completed", "error"]:
             yield f"data: {json.dumps({'type': 'flow_' + tracker.flow.status, 'data': tracker.flow.to_dict()})}\n\n"
             return

        while True:
            try:
                message = await asyncio.wait_for(queue.get(), timeout=30)
                yield f"data: {json.dumps(message)}\n\n"
                
                if message.get("type") in ["flow_completed", "flow_error"]:
                    break
            except asyncio.TimeoutError:
                yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
    finally:
        tracker.unsubscribe(queue)


@router.get("/flow/{issue_id}")
async def stream_agent_flow(issue_id: UUID):
    return StreamingResponse(
        event_generator(issue_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/flow/active")
async def list_active_flows():
    return {
        "active_flows": [
            {
                "issue_id": str(issue_id),
                "status": tracker.flow.status,
                "steps_count": len(tracker.flow.steps),
                "started_at": tracker.flow.started_at,
            }
            for issue_id, tracker in _active_flows.items()
        ]
    }


@router.get("/events/{issue_id}")
async def get_issue_events(
    issue_id: UUID,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(IssueEvent)
        .where(IssueEvent.issue_id == issue_id)
        .order_by(IssueEvent.created_at.asc())
        .limit(limit)
    )
    result = await db.execute(query)
    events = result.scalars().all()
    
    return {
        "issue_id": str(issue_id),
        "events": [
            {
                "id": str(e.id),
                "event_type": e.event_type,
                "agent_name": e.agent_name,
                "event_data": json.loads(e.event_data) if e.event_data else None,
                "created_at": e.created_at.isoformat(),
            }
            for e in events
        ]
    }


@router.get("/timeline/{issue_id}")
async def get_issue_timeline(
    issue_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    issue = await db.get(Issue, issue_id)
    if not issue:
        return {"error": "Issue not found"}
    
    query = (
        select(IssueEvent)
        .where(IssueEvent.issue_id == issue_id)
        .order_by(IssueEvent.created_at.asc())
    )
    result = await db.execute(query)
    events = result.scalars().all()
    
    timeline = []
    
    timeline.append({
        "timestamp": issue.created_at.isoformat(),
        "event": "issue_created",
        "agent": "System",
        "details": {
            "latitude": issue.latitude,
            "longitude": issue.longitude,
            "description": issue.description,
        }
    })
    
    for event in events:
        event_data = json.loads(event.event_data) if event.event_data else {}
        timeline.append({
            "timestamp": event.created_at.isoformat(),
            "event": event.event_type,
            "agent": event.agent_name or "Unknown",
            "details": event_data,
        })
    
    return {
        "issue_id": str(issue_id),
        "current_state": issue.state,
        "priority": issue.priority,
        "is_duplicate": issue.is_duplicate,
        "timeline": timeline,
    }
