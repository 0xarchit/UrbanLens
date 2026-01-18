import json
from typing import Optional
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import google.generativeai as genai

from Backend.core.config import settings
from Backend.core.events import event_bus, Event
from Backend.core.logging import get_logger
from Backend.database.models import Issue, IssueEvent, Classification
from Backend.orchestration.base import BaseAgent

logger = get_logger(__name__, agent_name="PriorityAgent")

if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)


class IssuePrioritized(Event):
    priority: int
    reasoning: str


class PriorityAgent(BaseAgent):
    def __init__(self, db: AsyncSession):
        super().__init__("PriorityAgent")
        self.db = db
        if settings.gemini_api_key:
            self.model = genai.GenerativeModel('gemma-3-27b-it')
        else:
            self.model = None
    
    async def calculate_priority(
        self,
        category: Optional[str],
        confidence: float,
        is_duplicate: bool,
        duplicate_count: int = 0,
        description: Optional[str] = None,
        city: Optional[str] = None
    ) -> tuple[int, str]:
        if not self.model:
            return 3, "Gemini API not configured"
        
        prompt = f"""Assign priority for civic infrastructure issue:

Category: {category or 'Unknown'}
AI Confidence: {confidence:.1%}
Duplicate Reports: {duplicate_count}
Location: {city or 'Unknown'}
Description: {description[:200] if description else 'N/A'}

Priority Scale:
1 = CRITICAL (Public safety, electrical hazards, major hazards)
2 = HIGH (Potholes, road damage, fallen trees)
3 = MEDIUM (Garbage, broken signs, minor structures)
4 = LOW (Parking violations, minor vandalism)

Consider safety impact, infrastructure criticality, and community accessibility.

Return ONLY valid JSON:
{{"priority": 1-4, "reasoning": "max 80 chars"}}"""
        
        try:
            response = self.model.generate_content(prompt)
            result = json.loads(response.text.replace("```json", "").replace("```", "").strip())
            return result.get("priority", 3), result.get("reasoning", "Priority assigned")
        except Exception as e:
            logger.error(f"Gemini priority calculation failed: {e}")
            return 3, "Analysis error"
    
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
        
        if issue.is_duplicate:
            self.log_decision(
                issue_id=issue_id,
                decision="Skipped prioritization",
                reasoning="Issue is a duplicate, priority inherited from parent"
            )
            return {"skipped": True, "reason": "duplicate"}
        
        category = None
        confidence = 0.0
        if issue.classification:
            category = issue.classification.primary_category
            confidence = issue.classification.primary_confidence
        
        dup_count_result = await self.db.execute(
            select(func.count(Issue.id)).where(Issue.parent_issue_id == issue_id)
        )
        duplicate_count = dup_count_result.scalar() or 0
        
        priority, reasoning = await self.calculate_priority(
            category, confidence, issue.is_duplicate, duplicate_count, issue.description, issue.city
        )
        
        issue.priority = priority
        issue.priority_reason = reasoning
        
        self.log_decision(
            issue_id=issue_id,
            decision=f"Priority set to {priority}",
            reasoning=reasoning
        )
        
        event_record = IssueEvent(
            issue_id=issue_id,
            event_type="prioritized",
            agent_name=self.name,
            event_data=json.dumps({
                "priority": priority,
                "reasoning": reasoning,
                "category": category,
                "confidence": confidence,
            })
        )
        self.db.add(event_record)
        await self.db.flush()
        
        priority_event = IssuePrioritized(
            issue_id=issue_id,
            priority=priority,
            reasoning=reasoning,
        )
        await event_bus.publish(priority_event)
        
        return {
            "priority": priority,
            "reasoning": reasoning,
        }
    
    async def handle(self, event) -> None:
        await self.process_issue(event.issue_id)
