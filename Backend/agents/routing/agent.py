import json
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import google.generativeai as genai

from Backend.core.config import settings
from Backend.core.events import event_bus, Event
from Backend.core.logging import get_logger
from Backend.database.models import Issue, IssueEvent, Department, Member, Classification
from Backend.orchestration.base import BaseAgent

logger = get_logger(__name__, agent_name="RoutingAgent")

if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)

PRIORITY_SLA_HOURS = {
    1: 4,
    2: 12,
    3: 48,
    4: 168,
}


class IssueAssigned(Event):
    department_code: str
    member_id: Optional[UUID] = None
    member_name: Optional[str] = None
    sla_deadline: datetime
    sla_hours: int


class RoutingAgent(BaseAgent):
    def __init__(self, db: AsyncSession):
        super().__init__("RoutingAgent")
        self.db = db
        if settings.gemini_api_key:
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        else:
            self.model = None
    
    async def find_department(self, category: Optional[str], description: Optional[str] = None) -> Optional[Department]:
        query = select(Department).where(Department.is_active == True)
        result = await self.db.execute(query)
        departments = result.scalars().all()
        
        if not departments:
            return None
        
        if not self.model or not category:
            return departments[0]
        
        dept_info = "\n".join([f"- {d.code}: {d.name} ({d.categories})" for d in departments])
        
        prompt = f"""Route civic issue to correct department:

Issue Category: {category}
Description: {description[:150] if description else 'N/A'}

Available Departments:
{dept_info}

Return ONLY the department CODE (e.g., PWD, TRAFFIC, SANITATION)"""
        
        try:
            response = self.model.generate_content(prompt)
            dept_code = response.text.strip().upper()
            
            for dept in departments:
                if dept.code == dept_code:
                    return dept
        except Exception as e:
            logger.error(f"Gemini routing failed: {e}")
        
        return departments[0]
    
    async def find_available_member(
        self, 
        department_id: UUID, 
        city: Optional[str] = None,
        locality: Optional[str] = None
    ) -> Optional[Member]:
        base_query = (
            select(Member)
            .where(Member.department_id == department_id)
            .where(Member.is_active == True)
            .where(Member.current_workload < Member.max_workload)
        )
        
        if city:
            city_query = base_query.where(Member.city.ilike(f"%{city}%"))
            result = await self.db.execute(city_query.order_by(Member.current_workload.asc()))
            member = result.scalars().first()
            if member:
                logger.info(f"Found member in city: {city}")
                return member
        
        if locality:
            locality_query = base_query.where(Member.locality.ilike(f"%{locality}%"))
            result = await self.db.execute(locality_query.order_by(Member.current_workload.asc()))
            member = result.scalars().first()
            if member:
                logger.info(f"Found member in locality: {locality}")
                return member
        
        result = await self.db.execute(base_query.order_by(Member.current_workload.asc()))
        member = result.scalars().first()
        if member:
            logger.info(f"Assigned to available member (no location match)")
        return member
    
    def calculate_sla(self, priority: int, department: Optional[Department]) -> tuple[int, datetime]:
        base_hours = PRIORITY_SLA_HOURS.get(priority, 48)
        
        if department and department.default_sla_hours:
            base_hours = min(base_hours, department.default_sla_hours)
        
        deadline = datetime.utcnow() + timedelta(hours=base_hours)
        return base_hours, deadline
    
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
                decision="Skipped routing",
                reasoning="Issue is a duplicate"
            )
            return {"skipped": True, "reason": "duplicate"}
        
        category = issue.classification.primary_category if issue.classification else None
        priority = issue.priority or 3
        
        department = await self.find_department(category, issue.description)
        
        member = None
        if department:
            member = await self.find_available_member(
                department.id, 
                city=issue.city,
                locality=issue.locality
            )
            if member:
                member.current_workload += 1
        
        sla_hours, sla_deadline = self.calculate_sla(priority, department)
        
        issue.department_id = department.id if department else None
        issue.assigned_member_id = member.id if member else None
        issue.sla_hours = sla_hours
        issue.sla_deadline = sla_deadline
        issue.state = "assigned"
        
        dept_code = department.code if department else "UNASSIGNED"
        member_name = member.name if member else "Unassigned"
        member_city = member.city if member else "N/A"
        
        reasoning = f"Category '{category}' → {dept_code}"
        if issue.city:
            reasoning += f", Issue location: {issue.city}"
        if member:
            reasoning += f", Member location: {member_city}"
        reasoning += f", SLA: {sla_hours}h"
        
        self.log_decision(
            issue_id=issue_id,
            decision=f"Routed to {dept_code} → {member_name}",
            reasoning=reasoning
        )
        
        event_record = IssueEvent(
            issue_id=issue_id,
            event_type="assigned",
            agent_name=self.name,
            event_data=json.dumps({
                "department_code": dept_code,
                "member_id": str(member.id) if member else None,
                "member_name": member_name,
                "issue_city": issue.city,
                "issue_locality": issue.locality,
                "member_city": member.city if member else None,
                "sla_hours": sla_hours,
                "sla_deadline": sla_deadline.isoformat(),
            })
        )
        self.db.add(event_record)
        await self.db.flush()
        
        assign_event = IssueAssigned(
            issue_id=issue_id,
            department_code=dept_code,
            member_id=member.id if member else None,
            member_name=member_name,
            sla_deadline=sla_deadline,
            sla_hours=sla_hours,
        )
        await event_bus.publish(assign_event)
        
        return {
            "department": dept_code,
            "member": member_name,
            "issue_city": issue.city,
            "issue_locality": issue.locality,
            "sla_hours": sla_hours,
            "sla_deadline": sla_deadline.isoformat(),
        }
    
    async def handle(self, event) -> None:
        await self.process_issue(event.issue_id)
