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
from Backend.database.models import Issue, IssueEvent, Member, Department
from Backend.orchestration.base import BaseAgent

logger = get_logger(__name__, agent_name="SLAAgent")

if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)


class SLAWarning(Event):
    hours_remaining: float
    threshold_hours: float
    warning_level: str  
    assigned_email: Optional[str] = None


class SLAAgent(BaseAgent):
    def __init__(self, db: AsyncSession):
        super().__init__("SLAAgent")
        self.db = db
        if settings.gemini_api_key:
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        else:
            self.model = None
        
    async def check_sla_status(self, issue: Issue) -> tuple[bool, str, Optional[str]]:
        """
        Checks if an issue needs an SLA warning.
        Returns: (needs_warning, warning_type, reason)
        """
        if not issue.sla_deadline or issue.state in ["resolved", "verified", "closed", "escalated"]:
            return False, "", None
        
        if not self.model:
            now = datetime.utcnow()
            hours_remaining = (issue.sla_deadline - now).total_seconds() / 3600
            total_sla_hours = issue.sla_hours or 48
            
            if 0 < hours_remaining <= (total_sla_hours * 0.5) and hours_remaining > (total_sla_hours * 0.2):
                 return True, "warning", f"50% SLA time remaining ({hours_remaining:.1f}h)"
            elif 0 < hours_remaining <= (total_sla_hours * 0.2):
                 return True, "critical", f"Critical: Less than 20% SLA time remaining ({hours_remaining:.1f}h)"
            return False, "", None
            
        now = datetime.utcnow()
        hours_remaining = (issue.sla_deadline - now).total_seconds() / 3600
        total_sla_hours = issue.sla_hours or 48
        hours_elapsed = total_sla_hours - hours_remaining
        
        prompt = f"""Assess SLA status for civic issue:

Priority: {issue.priority} (1=Critical, 2=High, 3=Medium, 4=Low)
State: {issue.state}
Total SLA Hours: {total_sla_hours}
Hours Elapsed: {hours_elapsed:.1f}
Hours Remaining: {hours_remaining:.1f}
Time Used: {(hours_elapsed/total_sla_hours*100):.1f}%

Determine if warning is needed:
- "none": No warning needed (>50% time remaining)
- "warning": Warning level (20-50% time remaining)
- "critical": Critical warning (<20% time remaining)

Return ONLY valid JSON:
{{"warning_level": "none/warning/critical", "reason": "max 60 chars"}}"""
        
        try:
            response = self.model.generate_content(prompt)
            result = json.loads(response.text.replace("```json", "").replace("```", "").strip())
            level = result.get("warning_level", "none")
            reason = result.get("reason", "SLA assessment completed")
            
            if level == "none":
                return False, "", None
            return True, level, reason
        except Exception as e:
            logger.error(f"Gemini SLA check failed: {e}")
            if 0 < hours_remaining <= (total_sla_hours * 0.2):
                return True, "critical", f"Less than 20% SLA time remaining"
            elif 0 < hours_remaining <= (total_sla_hours * 0.5):
                return True, "warning", f"50% SLA time remaining"
            return False, "", None
    
    async def process_issue(self, issue_id: UUID) -> dict:
        issue = await self.db.get(Issue, issue_id)
        if not issue:
            return {"error": "Issue not found"}
            
        needs_warning, level, reason = await self.check_sla_status(issue)
        
        if not needs_warning:
            return {"status": "ok"}
            
        
        assigned_email = None
        if issue.assigned_member_id:
            member = await self.db.get(Member, issue.assigned_member_id)
            if member:
                assigned_email = member.email
        
        
        warning_event = SLAWarning(
            issue_id=issue_id,
            hours_remaining=(issue.sla_deadline - datetime.utcnow()).total_seconds() / 3600,
            threshold_hours=0, 
            warning_level=level,
            assigned_email=assigned_email
        )
        await event_bus.publish(warning_event)
        
        
        event_record = IssueEvent(
            issue_id=issue_id,
            event_type=f"sla_{level}",
            agent_name=self.name,
            event_data=json.dumps({
                "hours_remaining": warning_event.hours_remaining,
                "level": level,
                "reason": reason
            })
        )
        self.db.add(event_record)
        await self.db.flush()
        
        return {"warning_sent": True, "level": level, "recipient": assigned_email}

    async def check_all_active(self) -> list[dict]:
        """Scans all active issues for SLA breaches."""
        query = select(Issue).where(
            Issue.state.in_(["assigned", "in_progress"]),
            Issue.sla_deadline.isnot(None)
        )
        result = await self.db.execute(query)
        issues = result.scalars().all()
        
        results = []
        for issue in issues:
            res = await self.process_issue(issue.id)
            if res.get("warning_sent"):
                results.append(res)
        return results

    async def handle(self, event) -> None:
        
        
        pass
