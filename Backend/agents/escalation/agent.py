import json
from datetime import datetime
from typing import Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import google.generativeai as genai

from Backend.core.events import event_bus, Event
from Backend.core.logging import get_logger
from Backend.core.config import settings
from Backend.database.models import Issue, IssueEvent, Escalation, Department, Member
from Backend.orchestration.base import BaseAgent

logger = get_logger(__name__, agent_name="EscalationAgent")

if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)


class IssueEscalated(Event):
    from_level: int
    to_level: int
    reason: str
    hours_overdue: float


class EscalationAgent(BaseAgent):
    def __init__(self, db: AsyncSession):
        super().__init__("EscalationAgent")
        self.db = db
        if settings.gemini_api_key:
            self.model = genai.GenerativeModel('gemma-3-27b-it')
        else:
            self.model = None
    
    async def should_escalate(self, issue: Issue) -> tuple[bool, int, str]:
        if not issue.sla_deadline:
            return False, 0, "No SLA deadline set"
        
        if not self.model:
            return False, 0, "Gemini API not configured"
        
        now = datetime.utcnow()
        hours_since_creation = (now - issue.created_at).total_seconds() / 3600
        hours_until_deadline = (issue.sla_deadline - now).total_seconds() / 3600
        
        prompt = f"""Analyze civic issue escalation:

Issue State: {issue.state}
Priority: {issue.priority} (1=Critical, 2=High, 3=Medium, 4=Low)
Current Escalation Level: {issue.escalation_level}
Hours Since Creation: {hours_since_creation:.1f}
Hours Until Deadline: {hours_until_deadline:.1f}
Category: {issue.description[:100] if issue.description else 'N/A'}

Determine if escalation is needed. Consider:
- SLA breach (negative deadline hours)
- Priority urgency
- Time criticality

Return ONLY valid JSON:
{{"should_escalate": true/false, "new_level": 0-3, "reason": "max 80 chars"}}"""
        
        try:
            response = self.model.generate_content(prompt)
            result = json.loads(response.text.replace("```json", "").replace("```", "").strip())
            return result.get("should_escalate", False), result.get("new_level", issue.escalation_level), result.get("reason", "Analysis completed")
        except Exception as e:
            logger.error(f"Gemini escalation analysis failed: {e}")
            return False, issue.escalation_level, "Analysis error"
    
    async def get_escalation_targets(self, issue: Issue) -> list[str]:
        targets = []
        
        if issue.department_id:
            query = select(Department).where(Department.id == issue.department_id)
            result = await self.db.execute(query)
            dept = result.scalar_one_or_none()
            if dept and dept.escalation_email:
                targets.append(dept.escalation_email)
        
        if issue.assigned_member_id:
            query = select(Member).where(Member.id == issue.assigned_member_id)
            result = await self.db.execute(query)
            member = result.scalar_one_or_none()
            if member:
                targets.append(member.email)
        
        return targets
    
    async def process_issue(self, issue_id: UUID) -> dict:
        issue = await self.db.get(Issue, issue_id)
        if not issue:
            return {"error": "Issue not found"}
        
        if issue.state in ["resolved", "verified", "closed"]:
            return {"skipped": True, "reason": "Issue already resolved"}
        
        should_esc, new_level, reason = await self.should_escalate(issue)
        
        if not should_esc:
            return {"escalated": False, "reason": reason}
        
        old_level = issue.escalation_level
        issue.escalation_level = new_level
        issue.escalated_at = datetime.utcnow()
        issue.state = "escalated"
        
        targets = await self.get_escalation_targets(issue)
        
        escalation = Escalation(
            issue_id=issue_id,
            from_level=old_level,
            to_level=new_level,
            reason=reason,
            escalated_by="EscalationAgent",
            notified_emails=",".join(targets) if targets else None,
        )
        self.db.add(escalation)
        
        self.log_decision(
            issue_id=issue_id,
            decision=f"Escalated from level {old_level} to {new_level}",
            reasoning=reason
        )
        
        event_record = IssueEvent(
            issue_id=issue_id,
            event_type="escalated",
            agent_name=self.name,
            event_data=json.dumps({
                "from_level": old_level,
                "to_level": new_level,
                "reason": reason,
                "notified": targets,
            })
        )
        self.db.add(event_record)
        await self.db.flush()
        
        esc_event = IssueEscalated(
            issue_id=issue_id,
            from_level=old_level,
            to_level=new_level,
            reason=reason,
            hours_overdue=0,
        )
        await event_bus.publish(esc_event)
        
        return {
            "escalated": True,
            "from_level": old_level,
            "to_level": new_level,
            "reason": reason,
            "notified": targets,
        }
    
    async def check_all_pending(self) -> list[dict]:
        query = (
            select(Issue)
            .where(Issue.state.in_(["assigned", "in_progress", "escalated"]))
            .where(Issue.is_duplicate == False)
            .where(Issue.sla_deadline.isnot(None))
        )
        result = await self.db.execute(query)
        issues = result.scalars().all()
        
        results = []
        for issue in issues:
            result = await self.process_issue(issue.id)
            if result.get("escalated"):
                results.append(result)
        
        return results
    
    async def handle(self, event) -> None:
        await self.process_issue(event.issue_id)
