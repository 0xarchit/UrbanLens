import json
from typing import Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import google.generativeai as genai

from Backend.core.config import settings
from Backend.core.events import event_bus, IssueClassified, Event
from Backend.core.logging import get_logger
from Backend.database.models import Issue, IssueEvent, Classification
from Backend.utils.geo import haversine_distance, get_bounding_box
from Backend.orchestration.base import BaseAgent

logger = get_logger(__name__, agent_name="GeoDeduplicateAgent")

if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)


class IssueDeduplicated(Event):
    is_duplicate: bool
    parent_issue_id: Optional[UUID] = None
    cluster_id: Optional[str] = None
    nearby_count: int = 0


class GeoDeduplicateAgent(BaseAgent):
    def __init__(self, db: AsyncSession):
        super().__init__("GeoDeduplicateAgent")
        self.db = db
        self.radius_meters = settings.duplicate_radius_meters
        if settings.gemini_api_key:
            self.model = genai.GenerativeModel('gemma-3-27b-it')
        else:
            self.model = None
    
    async def semantic_similarity(self, desc1: str, desc2: str, cat1: str, cat2: str) -> float:
        if not self.model:
            return 0.5
        
        prompt = f"""Rate semantic similarity (0.0-1.0) between civic issue reports:

Issue A:
Category: {cat1}
Description: {desc1[:200] if desc1 else 'N/A'}

Issue B:
Category: {cat2}
Description: {desc2[:200] if desc2 else 'N/A'}

Consider:
- Same problem type?
- Same physical location context?
- Same infrastructure element?

Return ONLY a decimal number between 0.0 and 1.0."""
        
        try:
            response = self.model.generate_content(prompt)
            score = float(response.text.strip())
            return max(0.0, min(1.0, score))
        except Exception as e:
            logger.error(f"Gemini similarity failed: {e}")
            return 0.5
    
    async def find_nearby_issues(
        self,
        latitude: float,
        longitude: float,
        exclude_id: UUID,
        category: Optional[str] = None
    ) -> list[tuple[Issue, float]]:
        min_lat, max_lat, min_lon, max_lon = get_bounding_box(
            latitude, longitude, self.radius_meters
        )
        
        query = (
            select(Issue)
            .options(selectinload(Issue.classification))
            .where(Issue.latitude >= min_lat)
            .where(Issue.latitude <= max_lat)
            .where(Issue.longitude >= min_lon)
            .where(Issue.longitude <= max_lon)
            .where(Issue.id != exclude_id)
            .where(Issue.state.in_(["reported", "validated", "assigned", "in_progress"]))
            .where(Issue.is_duplicate == False)
        )
        
        result = await self.db.execute(query)
        candidates = result.scalars().all()
        
        nearby = []
        for issue in candidates:
            distance = haversine_distance(
                latitude, longitude,
                issue.latitude, issue.longitude
            )
            if distance <= self.radius_meters:
                if category and issue.classification:
                    if issue.classification.primary_category == category:
                        nearby.append((issue, distance))
                else:
                    nearby.append((issue, distance))
        
        return sorted(nearby, key=lambda x: x[1])
    
    async def check_duplicate(
        self,
        issue_id: UUID,
        latitude: float,
        longitude: float,
        category: Optional[str] = None,
        description: Optional[str] = None
    ) -> tuple[bool, Optional[UUID], list[tuple[Issue, float]]]:
        nearby = await self.find_nearby_issues(
            latitude, longitude, issue_id, category
        )
        
        if not nearby:
            return False, None, []
        
        best_match = None
        highest_score = 0.0
        
        for issue, distance in nearby:
            if issue.classification and category:
                cat1 = category
                cat2 = issue.classification.primary_category
                desc1 = description or ""
                desc2 = issue.description or ""
                
                similarity = await self.semantic_similarity(desc1, desc2, cat1, cat2)
                
                if similarity > highest_score:
                    highest_score = similarity
                    best_match = issue
        
        if highest_score > 0.75 and best_match:
            return True, best_match.id, nearby
        
        return False, None, nearby
    
    async def process_issue(self, issue_id: UUID) -> dict:
        query = (
            select(Issue)
            .options(selectinload(Issue.classification))
            .where(Issue.id == issue_id)
        )
        result = await self.db.execute(query)
        issue = result.scalar_one_or_none()
        if not issue:
            return {"error": "Issue not found"}
        
        category = None
        if issue.classification:
            category = issue.classification.primary_category
        
        is_duplicate, parent_id, nearby = await self.check_duplicate(
            issue.id,
            issue.latitude,
            issue.longitude,
            category,
            issue.description
        )
        
        if is_duplicate and parent_id:
            issue.is_duplicate = True
            issue.parent_issue_id = parent_id
            issue.geo_status = "duplicate"
            issue.geo_cluster_id = str(parent_id)
            
            parent = await self.db.get(Issue, parent_id)
            if parent and issue.priority and parent.priority:
                if issue.priority < parent.priority:
                    parent.priority = issue.priority
            
            self.log_decision(
                issue_id=issue_id,
                decision="Marked as duplicate",
                reasoning=f"Found {len(nearby)} nearby issues within {self.radius_meters}m, linked to parent {parent_id}"
            )
        else:
            issue.is_duplicate = False
            issue.geo_status = "unique"
            
            self.log_decision(
                issue_id=issue_id,
                decision="Marked as unique",
                reasoning=f"No similar issues found within {self.radius_meters}m radius"
            )
        
        event_record = IssueEvent(
            issue_id=issue_id,
            event_type="geo_deduplicated",
            agent_name=self.name,
            event_data=json.dumps({
                "is_duplicate": is_duplicate,
                "parent_issue_id": str(parent_id) if parent_id else None,
                "nearby_count": len(nearby),
                "radius_meters": self.radius_meters,
            })
        )
        self.db.add(event_record)
        await self.db.flush()
        
        dedup_event = IssueDeduplicated(
            issue_id=issue_id,
            is_duplicate=is_duplicate,
            parent_issue_id=parent_id,
            cluster_id=str(parent_id) if parent_id else None,
            nearby_count=len(nearby),
        )
        await event_bus.publish(dedup_event)
        
        return {
            "is_duplicate": is_duplicate,
            "parent_issue_id": str(parent_id) if parent_id else None,
            "nearby_count": len(nearby),
            "geo_status": issue.geo_status,
        }
    
    async def handle(self, event: IssueClassified) -> None:
        await self.process_issue(event.issue_id)
