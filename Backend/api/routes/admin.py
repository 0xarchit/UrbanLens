from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func, or_, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, aliased
import bcrypt
import jwt

from Backend.database.connection import get_db
from Backend.database.models import Department, Member, Issue, Escalation, Classification, IssueEvent, IssueImage
from Backend.core.config import settings
from Backend.core.logging import get_logger
from Backend.core.schemas import IssueResponse, IssueState
from Backend.utils.storage import get_upload_url

logger = get_logger(__name__)
router = APIRouter()

SECRET_KEY = settings.supabase_jwt_secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_access_token(member_id: UUID, role: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(member_id),
        "role": role,
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


class LoginRequest(BaseModel):
    email: str
    password: str
    expected_role: Optional[str] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict



from fastapi.security import OAuth2PasswordBearer
from jwt import PyJWTError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/admin/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        member_id: str = payload.get("sub")
        if member_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
    member = await db.get(Member, UUID(member_id))
    if member is None:
        raise HTTPException(status_code=401, detail="User not found")
    return member

async def get_current_active_user(current_user: Member = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_admin(current_user: Member = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user


@router.post("/login", response_model=LoginResponse)
async def staff_login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    member = await db.execute(
        select(Member).where(Member.email == data.email, Member.is_active == True)
    )
    member = member.scalar_one_or_none()
    
    if not member or not member.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(data.password, member.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if data.expected_role:
        if data.expected_role == "admin" and member.role != "admin":
            raise HTTPException(status_code=403, detail="Access denied. You are not an admin.")
        if data.expected_role == "worker" and member.role == "admin":
            raise HTTPException(status_code=403, detail="Admins should login as Admin, not Worker.")
    
    access_token = create_access_token(member.id, member.role)
    
    return LoginResponse(
        access_token=access_token,
        user={
            "id": str(member.id),
            "name": member.name,
            "email": member.email,
            "role": member.role,
            "department_id": str(member.department_id) if member.department_id else None,
        },
    )


class DepartmentCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    categories: Optional[str] = None
    default_sla_hours: int = 48
    escalation_email: Optional[str] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    categories: Optional[str] = None
    default_sla_hours: Optional[int] = None
    escalation_email: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentResponse(BaseModel):
    id: UUID
    name: str
    code: str
    description: Optional[str]
    categories: Optional[str]
    default_sla_hours: int
    escalation_email: Optional[str]
    is_active: bool
    member_count: int = 0

    class Config:
        from_attributes = True


class MemberInvite(BaseModel):
    department_id: UUID
    name: str
    email: str
    phone: Optional[str] = None
    role: str = "officer"
    city: Optional[str] = None
    locality: Optional[str] = None
    max_workload: int = 10
    send_invite: bool = True


class MemberCreate(BaseModel):
    department_id: UUID
    name: str
    email: str
    phone: Optional[str] = None
    role: str = "worker"
    city: Optional[str] = None
    locality: Optional[str] = None
    max_workload: int = 10
    password: str


class MemberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    city: Optional[str] = None
    locality: Optional[str] = None
    max_workload: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class MemberResponse(BaseModel):
    id: UUID
    department_id: Optional[UUID]
    name: str
    email: str
    phone: Optional[str]
    role: str
    city: Optional[str]
    locality: Optional[str]
    is_active: bool
    current_workload: int
    max_workload: int
    invite_status: Optional[str] = None

    class Config:
        from_attributes = True





@router.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(
    data: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_admin),
):

    existing = await db.execute(select(Department).where(Department.code == data.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Department code already exists")
    
    department = Department(
        name=data.name,
        code=data.code.upper(),
        description=data.description,
        categories=data.categories,
        default_sla_hours=data.default_sla_hours,
        escalation_email=data.escalation_email,
    )
    db.add(department)
    await db.flush()
    await db.refresh(department)
    
    return DepartmentResponse(
        id=department.id,
        name=department.name,
        code=department.code,
        description=department.description,
        categories=department.categories,
        default_sla_hours=department.default_sla_hours,
        escalation_email=department.escalation_email,
        is_active=department.is_active,
        member_count=0,
    )


@router.get("/departments", response_model=list[DepartmentResponse])
async def list_departments(
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_active_user),
):
    query = select(Department).order_by(Department.name)
    result = await db.execute(query)
    departments = result.scalars().all()
    
    response = []
    for dept in departments:
        member_count = await db.execute(
            select(func.count(Member.id)).where(Member.department_id == dept.id)
        )
        count = member_count.scalar() or 0
        
        response.append(DepartmentResponse(
            id=dept.id,
            name=dept.name,
            code=dept.code,
            description=dept.description,
            categories=dept.categories,
            default_sla_hours=dept.default_sla_hours,
            escalation_email=dept.escalation_email,
            is_active=dept.is_active,
            member_count=count,
        ))
    
    return response


@router.get("/departments/{department_id}", response_model=DepartmentResponse)
async def get_department(
    department_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_active_user),
):
    department = await db.get(Department, department_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    member_count = await db.execute(
        select(func.count(Member.id)).where(Member.department_id == department.id)
    )
    count = member_count.scalar() or 0
    
    return DepartmentResponse(
        id=department.id,
        name=department.name,
        code=department.code,
        description=department.description,
        categories=department.categories,
        default_sla_hours=department.default_sla_hours,
        escalation_email=department.escalation_email,
        is_active=department.is_active,
        member_count=count,
    )


@router.patch("/departments/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: UUID,
    data: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_admin),
):
    department = await db.get(Department, department_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(department, key, value)
    
    await db.flush()
    
    member_count = await db.execute(
        select(func.count(Member.id)).where(Member.department_id == department.id)
    )
    count = member_count.scalar() or 0
    
    return DepartmentResponse(
        id=department.id,
        name=department.name,
        code=department.code,
        description=department.description,
        categories=department.categories,
        default_sla_hours=department.default_sla_hours,
        escalation_email=department.escalation_email,
        is_active=department.is_active,
        member_count=count,
    )


@router.delete("/departments/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    department_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_admin),
):
    department = await db.get(Department, department_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    await db.delete(department)
    await db.flush()


@router.post("/members/invite", status_code=status.HTTP_201_CREATED)
async def invite_member(
    data: MemberInvite,
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_admin),
):
    department = await db.get(Department, data.department_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    existing = await db.execute(select(Member).where(Member.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")
    
    invite_result = None
    if data.send_invite:
        invite_result = await supabase_auth.invite_user(
            email=data.email,
            redirect_to=f"{settings.frontend_url}/auth/callback"
        )
    
    member = Member(
        department_id=data.department_id,
        name=data.name,
        email=data.email,
        phone=data.phone,
        role=data.role,
        city=data.city,
        locality=data.locality,
        max_workload=data.max_workload,
    )
    db.add(member)
    await db.flush()
    await db.refresh(member)
    
    return {
        "member": MemberResponse(
            id=member.id,
            department_id=member.department_id,
            name=member.name,
            email=member.email,
            phone=member.phone,
            role=member.role,
            city=member.city,
            locality=member.locality,
            is_active=member.is_active,
            current_workload=member.current_workload,
            max_workload=member.max_workload,
            invite_status="sent" if invite_result and invite_result.get("success") else "not_sent",
        ),
        "invite": invite_result,
        "message": f"Member created. {'Invite email sent!' if invite_result and invite_result.get('success') else 'No invite sent.'}",
    }





@router.post("/members", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
async def create_member(
    data: MemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_admin),
):

    department = await db.get(Department, data.department_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    existing = await db.execute(select(Member).where(Member.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")
    
    member = Member(
        department_id=data.department_id,
        name=data.name,
        email=data.email,
        phone=data.phone,
        role=data.role,
        city=data.city,
        locality=data.locality,
        max_workload=data.max_workload,
        password_hash=hash_password(data.password),
    )
    db.add(member)
    await db.flush()
    await db.refresh(member)

    
    return MemberResponse(
        id=member.id,
        department_id=member.department_id,
        name=member.name,
        email=member.email,
        phone=member.phone,
        role=member.role,
        city=member.city,
        locality=member.locality,
        is_active=member.is_active,
        current_workload=member.current_workload,
        max_workload=member.max_workload,
    )


@router.post("/members/{member_id}/send-invite")
async def send_member_invite(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_admin),
):
    member = await db.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    if not settings.frontend_url:
        raise HTTPException(status_code=500, detail="FRONTEND_URL not configured")

    result = await supabase_auth.invite_user(
        email=member.email,
        redirect_to=f"{settings.frontend_url}/auth/callback"
    )
    
    if result.get("success"):
        return {
            "success": True,
            "message": f"Invite sent to {member.email}",
            "member_id": str(member.id),
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=result.get("message", "Failed to send invite")
        )


@router.post("/members/{member_id}/magic-link")
async def send_magic_link(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_admin),
):
    member = await db.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    if not settings.frontend_url:
        raise HTTPException(status_code=500, detail="FRONTEND_URL not configured")

    result = await supabase_auth.send_magic_link(
        email=member.email,
        redirect_to=f"{settings.frontend_url}/auth/callback"
    )
    
    if result.get("success"):
        return {
            "success": True,
            "message": f"Magic link sent to {member.email}",
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=result.get("message", "Failed to send magic link")
        )


@router.get("/members", response_model=list[MemberResponse])
async def list_members(
    department_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_active_user),
):
    query = select(Member).order_by(Member.name)
    if department_id:
        query = query.where(Member.department_id == department_id)
    
    result = await db.execute(query)
    members = result.scalars().all()
    
    return [
        MemberResponse(
            id=m.id,
            department_id=m.department_id,
            name=m.name,
            email=m.email,
            phone=m.phone,
            role=m.role,
            city=m.city,
            locality=m.locality,
            is_active=m.is_active,
            current_workload=m.current_workload,
            max_workload=m.max_workload,
        )
        for m in members
    ]


@router.get("/members/{member_id}", response_model=MemberResponse)
async def get_member(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_active_user),
):
    member = await db.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    return MemberResponse(
        id=member.id,
        department_id=member.department_id,
        name=member.name,
        email=member.email,
        phone=member.phone,
        role=member.role,
        city=member.city,
        locality=member.locality,
        is_active=member.is_active,
        current_workload=member.current_workload,
        max_workload=member.max_workload,
    )


@router.patch("/members/{member_id}", response_model=MemberResponse)
async def update_member(
    member_id: UUID,
    data: MemberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_admin),
):
    member = await db.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(member, key, value)
    
    await db.flush()
    
    return MemberResponse(
        id=member.id,
        department_id=member.department_id,
        name=member.name,
        email=member.email,
        phone=member.phone,
        role=member.role,
        city=member.city,
        locality=member.locality,
        is_active=member.is_active,
        current_workload=member.current_workload,
        max_workload=member.max_workload,
    )


@router.delete("/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_admin),
):
    member = await db.get(Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    await db.delete(member)
    await db.flush()


@router.get("/stats")
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_active_user),
):
    from Backend.database.models import Issue, Classification
    from datetime import datetime, timedelta
    
    dept_count = await db.execute(select(func.count(Department.id)))
    member_count = await db.execute(select(func.count(Member.id)))
    issue_count = await db.execute(select(func.count(Issue.id)))
    pending_count = await db.execute(
        select(func.count(Issue.id)).where(Issue.state.in_(["reported", "validated", "assigned"]))
    )
    resolved_count = await db.execute(
        select(func.count(Issue.id)).where(Issue.state.in_(["resolved", "closed", "verified"]))
    )
    verification_count = await db.execute(
        select(func.count(Issue.id)).where(Issue.state == "pending_verification")
    )
    
    category_query = (
        select(
            Classification.primary_category,
            func.count(Classification.id).label("count")
        )
        .group_by(Classification.primary_category)
        .order_by(func.count(Classification.id).desc())
        .limit(6)
    )
    category_result = await db.execute(category_query)
    categories = category_result.all()
    issues_by_category = [{"name": cat or "Unknown", "value": cnt} for cat, cnt in categories]
    
    today = datetime.utcnow().date()
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    issues_activity = []
    
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        
        reported_q = await db.execute(
            select(func.count(Issue.id)).where(
                Issue.created_at >= day_start,
                Issue.created_at <= day_end
            )
        )
        resolved_q = await db.execute(
            select(func.count(Issue.id)).where(
                Issue.resolved_at >= day_start,
                Issue.resolved_at <= day_end
            )
        )
        
        issues_activity.append({
            "name": day_names[day.weekday()],
            "reported": reported_q.scalar() or 0,
            "resolved": resolved_q.scalar() or 0
        })
    
    return {
        "departments": dept_count.scalar() or 0,
        "members": member_count.scalar() or 0,
        "total_issues": issue_count.scalar() or 0,
        "pending_issues": pending_count.scalar() or 0,
        "resolved_issues": resolved_count.scalar() or 0,
        "verification_needed": verification_count.scalar() or 0,
        "issues_by_category": issues_by_category,
        "issues_activity": issues_activity,
    }


@router.get("/stats/heatmap")
async def get_issue_heatmap(
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_active_user),
):
    """
    Returns city-aggregated issue counts for heatmap visualization.
    """
    query = (
        select(
            Issue.city,
            func.count(Issue.id).label("count"),
            func.avg(Issue.priority).label("priority_avg")
        )
        .where(Issue.state.notin_(["closed", "resolved", "verified"]))
        .where(Issue.city.isnot(None))
        .group_by(Issue.city)
        .order_by(func.count(Issue.id).desc())
    )
    result = await db.execute(query)
    rows = result.all()
    
    heatmap_data = []
    for city, count, priority_avg in rows:
        heatmap_data.append({
            "city": city or "Unknown",
            "count": count,
            "priority_avg": round(float(priority_avg or 3), 1)
        })
        
    return heatmap_data


@router.get("/stats/escalations", response_model=list[dict])
async def get_escalation_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_active_user),
):
    """
    Returns a list of currently escalated issues with details.
    """
    query = (
        select(Issue, Escalation)
        .join(Escalation, Issue.id == Escalation.issue_id)
        .where(Issue.state == "escalated")
        .order_by(Escalation.created_at.desc())
    )
    result = await db.execute(query)
    rows = result.all()
    
    alerts = []
    for issue, esc in rows:
        alerts.append({
            "issue_id": issue.id,
            "category": issue.classification.primary_category if issue.classification else "Unknown",
            "priority": issue.priority,
            "escalated_at": esc.created_at,
            "level": esc.to_level,
            "reason": esc.reason,
            "city": issue.city,
            "locality": issue.locality
        })
        

class ManualReviewRequest(BaseModel):
    status: str  
    reason: Optional[str] = None



class AdminIssueListItem(BaseModel):
    id: UUID
    description: Optional[str]
    state: str
    priority: Optional[int]
    city: Optional[str]
    created_at: datetime
    updated_at: datetime
    department: Optional[str]
    assigned_to: Optional[str]
    category: Optional[str]
    sla_deadline: Optional[datetime]
    thumbnail: Optional[str]

    class Config:
        from_attributes = True

def issue_to_response(issue: Issue) -> IssueResponse:
    image_urls = []
    annotated_urls = []
    for img in issue.images:
        image_urls.append(get_upload_url(img.file_path))
        if img.annotated_path:
            annotated_urls.append(get_upload_url(img.annotated_path))
    
    proof_image_url = None
    if issue.proof_image_path:
        proof_image_url = get_upload_url(issue.proof_image_path)

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
        proof_image_url=proof_image_url,
        validation_source=issue.validation_source,
        is_duplicate=issue.is_duplicate,
        parent_issue_id=issue.parent_issue_id,
        city=issue.city,
        locality=issue.locality,
        full_address=issue.full_address,
        sla_hours=issue.sla_hours,
        sla_deadline=issue.sla_deadline,
        created_at=issue.created_at,
        updated_at=issue.updated_at,
    )

@router.get("/issues", response_model=dict)
async def list_admin_issues(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[int] = None,
    department_id: Optional[UUID] = None,
    worker_id: Optional[UUID] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_active_user),
):
    query = (
        select(Issue)
        .options(
            selectinload(Issue.department),
            selectinload(Issue.assigned_member),
            selectinload(Issue.classification),
            selectinload(Issue.images)
        )
    )
    
    
    if status:
        statuses = status.split(",")
        query = query.where(Issue.state.in_(statuses))
    
    if priority is not None:
        query = query.where(Issue.priority == priority)
        
    if department_id:
        query = query.where(Issue.department_id == department_id)
        
    if worker_id:
        query = query.where(Issue.assigned_member_id == worker_id)
        
    if search:
        search_filter = or_(
            Issue.description.ilike(f"%{search}%"),
            Issue.city.ilike(f"%{search}%"),
            Issue.locality.ilike(f"%{search}%"),
            Issue.id.cast(String).ilike(f"%{search}%")
        )
        query = query.where(search_filter)

    
    sort_column = getattr(Issue, sort_by, Issue.created_at)
    if sort_order == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))
        
    
    total_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(total_query)
    total = total_result.scalar_one()
    
    query = query.offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    issues = result.scalars().all()
    
    
    
    
    items = []
    for issue in issues:
        thumb = None
        if issue.images and len(issue.images) > 0:
             thumb = get_upload_url(issue.images[0].file_path)

        items.append(AdminIssueListItem(
            id=issue.id,
            description=issue.description,
            state=issue.state,
            priority=issue.priority,
            city=issue.city,
            created_at=issue.created_at,
            updated_at=issue.updated_at,
            department=issue.department.name if issue.department else None,
            assigned_to=issue.assigned_member.name if issue.assigned_member else None,
            category=issue.classification.primary_category if issue.classification else None,
            sla_deadline=issue.sla_deadline,
            thumbnail=thumb
        ))
        
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.get("/issues/{issue_id}/details")
async def get_admin_issue_details(
    issue_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_active_user),
):
    query = (
        select(Issue)
        .options(
            selectinload(Issue.department),
            selectinload(Issue.classification),
            selectinload(Issue.images),
            selectinload(Issue.events),
            selectinload(Issue.duplicates)
        )
        .where(Issue.id == issue_id)
    )
    result = await db.execute(query)
    issue = result.scalar_one_or_none()
    
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    
    worker = None
    if issue.assigned_member_id:
        worker = await db.get(Member, issue.assigned_member_id)
        
    return {
        "issue": issue_to_response(issue), 
        "department": {
            "id": issue.department.id, 
            "name": issue.department.name
        } if issue.department else None,
        "worker": {
            "id": worker.id,
            "name": worker.name,
            "email": worker.email,
            "workload": worker.current_workload
        } if worker else None,
        "events": [
            {
                "id": e.id,
                "type": e.event_type,
                "agent": e.agent_name,
                "data": e.event_data,
                "created_at": e.created_at
            } for e in sorted(issue.events, key=lambda x: x.created_at, reverse=True)
        ],
        "duplicates": [
            {
                "id": d.id,
                "created_at": d.created_at,
                "status": d.state
            } for d in issue.duplicates
        ]
    }

@router.get("/workers/performance")
async def get_worker_performance(
    department_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_active_user),
):
    
    q = select(Member).where(Member.role == "worker")
    if department_id:
        q = q.where(Member.department_id == department_id)
        
    res = await db.execute(q)
    workers = res.scalars().all()
    
    performance_data = []
    
    for w in workers:
        
        
        resolved_count = await db.execute(
            select(func.count(Issue.id)).where(
                Issue.assigned_member_id == w.id,
                Issue.state.in_(["resolved", "closed"])
            )
        )
        resolved = resolved_count.scalar() or 0
        
        
        
        
        
        performance_data.append({
            "id": w.id,
            "name": w.name,
            "active": w.is_active,
            "current_load": w.current_workload,
            "max_load": w.max_workload,
            "resolved_total": resolved,
            "efficiency": round(resolved / (max(1, (datetime.utcnow() - w.created_at).days / 7)), 1) 
        })
        
    return performance_data

@router.patch("/issues/{issue_id}", response_model=IssueResponse)
async def update_issue_details(
    issue_id: UUID,
    data: dict, 
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_admin),
):
    issue = await db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if "priority" in data:
        issue.priority = data["priority"]
        
    
    if "assigned_member_id" in data:
        new_worker_id = data["assigned_member_id"]
        if new_worker_id:
            worker = await db.get(Member, UUID(new_worker_id))
            if not worker:
                raise HTTPException(status_code=400, detail="Worker not found")
            issue.assigned_member_id = worker.id
            issue.state = "assigned" 
            worker.current_workload += 1
            
            
        else:
             issue.assigned_member_id = None
             
    await db.commit()
    await db.refresh(issue) 
    
    
    
    
    return issue_to_response(issue)

class ResolutionReviewRequest(BaseModel):
    action: str  
    comment: Optional[str] = None

@router.post("/issues/{issue_id}/approve_resolution")
async def approve_resolution(
    issue_id: UUID,
    data: ResolutionReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_admin),
):
    issue = await db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    if issue.state != "pending_verification":
        raise HTTPException(status_code=400, detail="Issue is not pending verification.")

    if data.action == "approve":
        issue.state = "resolved"
        issue.completed_at = datetime.utcnow()
        if data.comment:
            issue.resolution_notes = (issue.resolution_notes or "") + f"\nAdmin Note: {data.comment}"
        
        
        if issue.assigned_member_id:
            worker = await db.get(Member, issue.assigned_member_id)
            if worker and worker.current_workload > 0:
                worker.current_workload -= 1
        
        await db.commit()
        return {"message": "Issue resolution approved and marked as resolved."}

    elif data.action == "reject":
        issue.state = "in_progress"
        
        if data.comment:
             issue.resolution_notes = (issue.resolution_notes or "") + f"\n[REJECTED]: {data.comment}"
        
        
        
        await db.commit()
        return {"message": "Issue resolution rejected. Sent back to worker."}
    
    else:
         raise HTTPException(status_code=400, detail="Invalid action.")

@router.post("/issues/{issue_id}/review")
async def review_issue(
    issue_id: UUID,
    data: ManualReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Member = Depends(get_current_admin),
):
    """
    Manually review an issue.
    - If REJECTED: Mark as rejected.
    - If APPROVED: Mark as assigned and auto-assign to a worker.
    """
    issue = await db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if data.status == "rejected":
        issue.state = "rejected"
        issue.resolution_notes = data.reason or "Rejected during manual review."
        await db.commit()
        return {"message": "Issue rejected successfully"}

    elif data.status == "approved":
        
        
        
        query = select(Member).where(Member.role == "worker", Member.is_active == True).order_by(Member.current_workload.asc())
        
        
        if issue.department_id:
            query = query.where(Member.department_id == issue.department_id)
            
        result = await db.execute(query)
        Workers = result.scalars().all()
        
        selected_worker = None
        
        if not Workers:
            
            
             issue.state = "verified" 
             issue.resolution_notes = "Verified but no workers available for auto-assignment."
        else:
            selected_worker = Workers[0]
            issue.assigned_member_id = selected_worker.id
            issue.state = "assigned"
            selected_worker.current_workload += 1
            db.add(selected_worker)
            
        await db.commit()
        
        return {
            "message": f"Issue approved. {'Assigned to ' + selected_worker.name if selected_worker else 'No worker available, queued as verified.'}",
            "assigned_to": str(selected_worker.id) if selected_worker else None
        }

    else:
        raise HTTPException(status_code=400, detail="Invalid status. Use 'approved' or 'rejected'.")
