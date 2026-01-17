import resend
from typing import List
from Backend.core.config import settings
from Backend.core.logging import get_logger

logger = get_logger(__name__)


class EmailService:
    def __init__(self):
        self.sender_email = settings.sender_email
        if settings.resend_api_key:
            resend.api_key = settings.resend_api_key
        else:
            logger.warning("Resend API key not configured")
    
    async def send_email(
        self,
        to: List[str],
        subject: str,
        body: str,
        html: bool = False
    ) -> bool:
        if not settings.resend_api_key:
            logger.warning("Resend API key not configured. Email not sent.")
            logger.info(f"Would send email to {to}: {subject}")
            return False
        
        try:
            for recipient in to:
                try:
                    params = {
                        "from": self.sender_email,
                        "to": [recipient],
                        "subject": subject,
                    }
                    
                    if html:
                        params["html"] = body
                    else:
                        params["text"] = body
                    
                    resend.Emails.send(params)
                    logger.info(f"Email sent successfully to {recipient}")
                except Exception as e:
                    logger.error(f"Failed to send email to {recipient}: {e}")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Email service error: {e}")
            return False
    
    async def send_assignment_email(
        self,
        worker_email: str,
        worker_name: str,
        issue_id: str,
        category: str,
        priority: str,
        location: str,
        description: str
    ):
        subject = f"🔔 New Task Assigned: {category} [{priority}]"
        
        body = f"""
Hello {worker_name},

You have been assigned a new task in UrbanLens.

ISSUE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue ID: {issue_id}
Category: {category}
Priority: {priority}
Location: {location}
Description: {description or 'No description provided'}

NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Review the issue details in your worker dashboard
2. Navigate to the location
3. Resolve the issue
4. Upload proof of resolution

Thank you for your service!

UrbanLens Team
"Governance at the Speed of Software"
"""
        
        return await self.send_email([worker_email], subject, body)
    
    async def send_manual_review_email(
        self,
        issue_id: str,
        reason: str,
        category: str,
        location: str,
        image_url: str
    ):
        subject = f"⚠️ Manual Review Required: {category}"
        
        body = f"""
Admin Team,

An issue requires manual review in UrbanLens.

ISSUE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue ID: {issue_id}
Category: {category}
Location: {location}
Reason: {reason}

Image: {image_url}

ACTION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Please review this issue in the admin dashboard and take appropriate action.

UrbanLens System
"""
        
        return await self.send_email([settings.admin_email], subject, body)
    
    async def send_completion_email(
        self,
        user_email: str,
        issue_id: str,
        category: str,
        location: str,
        resolution_notes: str
    ):
        subject = f"✅ Your Report Has Been Resolved: {category}"
        
        body = f"""
Dear Citizen,

Great news! Your reported issue has been resolved.

ISSUE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue ID: {issue_id}
Category: {category}
Location: {location}
Resolution: {resolution_notes or 'Issue has been successfully addressed'}

FEEDBACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
We value your input! Please confirm if the issue has been resolved by checking the app.

Thank you for making our city better!

UrbanLens Team
"Governance at the Speed of Software"
"""
        
        return await self.send_email([user_email], subject, body)
    
    async def send_escalation_email(
        self,
        admin_email: str,
        issue_id: str,
        category: str,
        priority: str,
        reason: str,
        escalation_level: int
    ):
        subject = f"🚨 ESCALATION LEVEL {escalation_level}: {category}"
        
        body = f"""
URGENT: Issue Escalation

An issue has been escalated and requires immediate attention.

ISSUE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue ID: {issue_id}
Category: {category}
Priority: {priority}
Escalation Level: {escalation_level}
Reason: {reason}

IMMEDIATE ACTION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Please review and address this issue immediately in the admin dashboard.

UrbanLens System
"""
        
        return await self.send_email([admin_email], subject, body)
    
    async def send_confirmation_request_email(
        self,
        user_email: str,
        issue_id: str,
        category: str,
        confirmation_link: str
    ):
        subject = f"🔍 Please Confirm: Is This Issue Resolved?"
        
        body = f"""
Dear Citizen,

Your reported issue has been marked as resolved by our team.

ISSUE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue ID: {issue_id}
Category: {category}

CONFIRMATION NEEDED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Please confirm if the issue has been properly resolved:
{confirmation_link}

Your feedback helps us improve our service quality.

Thank you!

UrbanLens Team
"""
        
        return await self.send_email([user_email], subject, body)
    
    async def send_issue_accepted_email(
        self,
        user_email: str,
        issue_id: str,
        category: str,
        priority: str,
        location: str,
        accepted_by: str = "automatic",
        tracking_url: str = None
    ):
        acceptance_type = "automatically" if accepted_by == "automatic" else "manually by our team"
        subject = f"✓ Your Report Has Been Accepted: {category}"
        
        body = f"""
Dear Citizen,

Thank you for reporting an issue! Your report has been accepted {acceptance_type}.

ISSUE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Issue ID: {issue_id}
Category: {category}
Priority: {priority}
Location: {location}

WHAT HAPPENS NEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Your issue has been assigned to the appropriate department
2. A field worker will be dispatched to address it
3. You will receive updates on the progress
4. Once resolved, you'll get a confirmation notification

TRACK YOUR REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{tracking_url or 'Check the UrbanLens app for real-time updates'}

Thank you for helping make our city better!

UrbanLens Team
"Governance at the Speed of Software"
"""
        
        return await self.send_email([user_email], subject, body)


email_service = EmailService()
