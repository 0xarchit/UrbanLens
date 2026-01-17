import json
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import google.generativeai as genai

from Backend.core.events import Event, event_bus
from Backend.core.logging import get_logger
from Backend.core.config import settings
from Backend.database.models import Classification, Issue, IssueEvent, Member
from Backend.orchestration.base import BaseAgent
from Backend.services.email import email_service

logger = get_logger(__name__, agent_name="NotificationAgent")

if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)


class NotificationSent(Event):
    notification_type: str
    recipients: list[str]
    message: str


class NotificationAgent(BaseAgent):
    def __init__(self, db: AsyncSession):
        super().__init__("NotificationAgent")
        self.db = db
        self.pending_notifications: list[dict] = []
        if settings.gemini_api_key:
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        else:
            self.model = None

    async def get_issue_with_classification(self, issue_id: UUID) -> Optional[Issue]:
        query = (
            select(Issue)
            .options(selectinload(Issue.classification))
            .where(Issue.id == issue_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def format_issue_summary(self, issue: Issue) -> str:
        if not self.model:
            category = (
                issue.classification.primary_category if issue.classification else "Unknown"
            )
            priority_map = {1: "CRITICAL", 2: "HIGH", 3: "MEDIUM", 4: "LOW"}
            priority_str = priority_map.get(issue.priority, "UNKNOWN")
            return (
                f"Issue #{str(issue.id)[:8]}\n"
                f"Category: {category}\n"
                f"Priority: {priority_str}\n"
                f"Location: ({issue.latitude:.4f}, {issue.longitude:.4f})\n"
                f"Description: {issue.description or 'No description'}\n"
                f"State: {issue.state}"
            )
        
        category = (
            issue.classification.primary_category if issue.classification else "Unknown"
        )
        priority_map = {1: "CRITICAL", 2: "HIGH", 3: "MEDIUM", 4: "LOW"}
        priority_str = priority_map.get(issue.priority, "UNKNOWN")
        
        prompt = f"""Generate concise civic issue summary for notification (max 150 words):

Issue ID: {str(issue.id)[:8]}
Category: {category}
Priority: {priority_str}
State: {issue.state}
Location: {issue.city or 'Unknown'}, ({issue.latitude:.4f}, {issue.longitude:.4f})
Description: {issue.description[:200] if issue.description else 'No description'}

Create professional, clear summary for stakeholders."""
        
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini summary generation failed: {e}")
            return (
                f"Issue #{str(issue.id)[:8]}\n"
                f"Category: {category}\n"
                f"Priority: {priority_str}\n"
                f"Location: ({issue.latitude:.4f}, {issue.longitude:.4f})\n"
                f"Description: {issue.description or 'No description'}\n"
                f"State: {issue.state}"
            )

    async def queue_notification(
        self,
        notification_type: str,
        recipients: list[str],
        subject: str,
        message: str,
        issue_id: Optional[UUID] = None,
    ):
        notification = {
            "type": notification_type,
            "recipients": recipients,
            "subject": subject,
            "message": message,
            "issue_id": str(issue_id) if issue_id else None,
            "queued_at": datetime.utcnow().isoformat(),
        }
        self.pending_notifications.append(notification)

        logger.info(f"Notification queued: {notification_type} to {recipients}")

        if issue_id:
            event_record = IssueEvent(
                issue_id=issue_id,
                event_type="notification_queued",
                agent_name=self.name,
                event_data=json.dumps(notification),
            )
            self.db.add(event_record)
            await self.db.flush()

        return notification

    async def notify_assignment(self, issue_id: UUID):
        issue = await self.get_issue_with_classification(issue_id)
        if not issue:
            return

        recipients = []
        worker_name = "Worker"

        if issue.assigned_member_id:
            query = select(Member).where(Member.id == issue.assigned_member_id)
            result = await self.db.execute(query)
            member = result.scalar_one_or_none()
            if member:
                recipients.append(member.email)
                worker_name = member.name
                
                category = (
                    issue.classification.primary_category 
                    if issue.classification 
                    else "Unknown"
                )
                priority_map = {1: "CRITICAL", 2: "HIGH", 3: "MEDIUM", 4: "LOW"}
                priority_str = priority_map.get(issue.priority, "UNKNOWN")
                location = f"({issue.latitude:.4f}, {issue.longitude:.4f})"
                
                try:
                    await email_service.send_assignment_email(
                        worker_email=member.email,
                        worker_name=worker_name,
                        issue_id=str(issue.id)[:8],
                        category=category,
                        priority=priority_str,
                        location=location,
                        description=issue.description or "No description"
                    )
                    logger.info(f"Assignment email sent to {member.email}")
                except Exception as e:
                    logger.error(f"Failed to send assignment email: {e}")

        if recipients:
            summary = self.format_issue_summary(issue)
            await self.queue_notification(
                notification_type="assignment",
                recipients=recipients,
                subject=f"New Issue Assigned: #{str(issue.id)[:8]}",
                message=f"You have been assigned a new issue:\n\n{summary}",
                issue_id=issue_id,
            )

    async def notify_escalation(self, issue_id: UUID, reason: str, targets: list[str]):
        issue = await self.get_issue_with_classification(issue_id)
        if not issue:
            return

        category = (
            issue.classification.primary_category 
            if issue.classification 
            else "Unknown"
        )
        priority_map = {1: "CRITICAL", 2: "HIGH", 3: "MEDIUM", 4: "LOW"}
        priority_str = priority_map.get(issue.priority, "UNKNOWN")
        
        for target in targets:
            try:
                await email_service.send_escalation_email(
                    admin_email=target,
                    issue_id=str(issue.id)[:8],
                    category=category,
                    priority=priority_str,
                    reason=reason,
                    escalation_level=issue.escalation_level
                )
                logger.info(f"Escalation email sent to {target}")
            except Exception as e:
                logger.error(f"Failed to send escalation email: {e}")

        summary = self.format_issue_summary(issue)
        await self.queue_notification(
            notification_type="escalation",
            recipients=targets,
            subject=f"ESCALATION: Issue #{str(issue.id)[:8]} - Level {issue.escalation_level}",
            message=f"Issue has been escalated:\n\nReason: {reason}\n\n{summary}",
            issue_id=issue_id,
        )

    async def notify_resolution(self, issue_id: UUID):
        issue = await self.get_issue_with_classification(issue_id)
        if not issue:
            return
        
        category = (
            issue.classification.primary_category 
            if issue.classification 
            else "Unknown"
        )
        location = f"({issue.latitude:.4f}, {issue.longitude:.4f})"
        
        if issue.user_id:
            try:
                await email_service.send_completion_email(
                    user_email=issue.user_id,
                    issue_id=str(issue.id)[:8],
                    category=category,
                    location=location,
                    resolution_notes=issue.resolution_notes or "Issue resolved successfully"
                )
                logger.info(f"Resolution email sent to user {issue.user_id}")
            except Exception as e:
                logger.error(f"Failed to send resolution email: {e}")

        await self.queue_notification(
            notification_type="resolution",
            recipients=[settings.admin_email],
            subject=f"Issue Resolved: #{str(issue.id)[:8]}",
            message=f"Issue has been marked as resolved.\n\n{self.format_issue_summary(issue)}",
            issue_id=issue_id,
        )
    
    async def notify_manual_review(self, issue_id: UUID, reason: str):
        issue = await self.get_issue_with_classification(issue_id)
        if not issue:
            return
        
        category = (
            issue.classification.primary_category 
            if issue.classification 
            else "Unknown"
        )
        location = f"({issue.latitude:.4f}, {issue.longitude:.4f})"
        image_url = f"{settings.supabase_url}/storage/v1/object/public/{settings.supabase_bucket}/{issue.id}/original.jpg"
        
        try:
            await email_service.send_manual_review_email(
                issue_id=str(issue.id)[:8],
                reason=reason,
                category=category,
                location=location,
                image_url=image_url
            )
            logger.info(f"Manual review email sent to admin")
        except Exception as e:
            logger.error(f"Failed to send manual review email: {e}")
        
        await self.queue_notification(
            notification_type="manual_review",
            recipients=[settings.admin_email],
            subject=f"Manual Review Required: #{str(issue.id)[:8]}",
            message=f"Issue requires manual review.\n\nReason: {reason}\n\n{self.format_issue_summary(issue)}",
            issue_id=issue_id,
        )
    
    async def notify_user_confirmation(self, issue_id: UUID):
        issue = await self.get_issue_with_classification(issue_id)
        if not issue:
            return
        
        category = (
            issue.classification.primary_category 
            if issue.classification 
            else "Unknown"
        )
        confirmation_link = f"https://app.urbanlens.city/confirm/{issue.id}"
        
        if issue.user_id:
            try:
                await email_service.send_confirmation_request_email(
                    user_email=issue.user_id,
                    issue_id=str(issue.id)[:8],
                    category=category,
                    confirmation_link=confirmation_link
                )
                logger.info(f"Confirmation request email sent to user {issue.user_id}")
            except Exception as e:
                logger.error(f"Failed to send confirmation email: {e}")
        
        await self.queue_notification(
            notification_type="user_confirmation",
            recipients=[issue.user_id] if issue.user_id else [],
            subject=f"Please Confirm Resolution: #{str(issue.id)[:8]}",
            message=f"Please confirm if this issue has been resolved.\n\n{self.format_issue_summary(issue)}",
            issue_id=issue_id,
        )
    
    async def notify_issue_accepted(self, issue_id: UUID, accepted_by: str = "automatic"):
        issue = await self.get_issue_with_classification(issue_id)
        if not issue:
            return
        
        category = (
            issue.classification.primary_category 
            if issue.classification 
            else "Unknown"
        )
        priority_map = {1: "CRITICAL", 2: "HIGH", 3: "MEDIUM", 4: "LOW"}
        priority_str = priority_map.get(issue.priority, "UNKNOWN")
        location = f"({issue.latitude:.4f}, {issue.longitude:.4f})"
        tracking_url = f"https://app.urbanlens.city/track/{issue.id}"
        
        if issue.user_id:
            try:
                await email_service.send_issue_accepted_email(
                    user_email=issue.user_id,
                    issue_id=str(issue.id)[:8],
                    category=category,
                    priority=priority_str,
                    location=location,
                    accepted_by=accepted_by,
                    tracking_url=tracking_url
                )
                logger.info(f"Issue accepted email sent to user {issue.user_id} ({accepted_by})")
            except Exception as e:
                logger.error(f"Failed to send issue accepted email: {e}")
        
        await self.queue_notification(
            notification_type="issue_accepted",
            recipients=[issue.user_id] if issue.user_id else [],
            subject=f"Issue Accepted: #{str(issue.id)[:8]}",
            message=f"Your issue has been accepted {accepted_by}.\n\n{self.format_issue_summary(issue)}",
            issue_id=issue_id,
        )

    async def process_issue(
        self, issue_id: UUID, event_type: str = "assignment"
    ) -> dict:
        if event_type == "assignment":
            await self.notify_assignment(issue_id)
        elif event_type == "resolution":
            await self.notify_resolution(issue_id)
        elif event_type == "escalation":
            await self.notify_escalation(issue_id, "SLA breach or priority escalation", [settings.admin_email])
        elif event_type == "manual_review":
            await self.notify_manual_review(issue_id, "Requires admin attention")
        elif event_type == "user_confirmation":
            await self.notify_user_confirmation(issue_id)
        elif event_type == "issue_accepted":
            accepted_by = "automatic"
            await self.notify_issue_accepted(issue_id, accepted_by)
        elif event_type == "issue_accepted_manual":
            await self.notify_issue_accepted(issue_id, "manual")

        return {"queued": len(self.pending_notifications)}

    async def handle(self, event) -> None:
        event_type = getattr(event, "notification_type", "assignment")
        await self.process_issue(event.issue_id, event_type)
