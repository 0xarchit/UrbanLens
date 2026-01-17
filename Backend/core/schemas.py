from datetime import datetime
from enum import IntEnum, StrEnum
from typing import Optional
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, field_validator


class IssueState(StrEnum):
    REPORTED = "reported"
    PENDING_CONFIRMATION = "pending_confirmation"
    VALIDATED = "validated"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    PENDING_VERIFICATION = "pending_verification"
    RESOLVED = "resolved"
    VERIFIED = "verified"
    CLOSED = "closed"
    ESCALATED = "escalated"
    REJECTED = "rejected"


class PriorityLevel(IntEnum):
    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4


class IssueCategory(StrEnum):
    DAMAGED_ROAD = "Damaged Road Issues"
    POTHOLE = "Pothole Issues"
    ILLEGAL_PARKING = "Illegal Parking Issues"
    BROKEN_SIGN = "Broken Road Sign Issues"
    FALLEN_TREE = "Fallen Trees"
    GARBAGE = "Littering/Garbage on Public Places"
    VANDALISM = "Vandalism Issues"
    DEAD_ANIMAL = "Dead Animal Pollution"
    DAMAGED_CONCRETE = "Damaged Concrete Structures"
    DAMAGED_ELECTRIC = "Damaged Electric Wires and Poles"


CLASS_ID_TO_CATEGORY = {
    0: IssueCategory.DAMAGED_ROAD,
    1: IssueCategory.POTHOLE,
    2: IssueCategory.ILLEGAL_PARKING,
    3: IssueCategory.BROKEN_SIGN,
    4: IssueCategory.FALLEN_TREE,
    5: IssueCategory.GARBAGE,
    6: IssueCategory.VANDALISM,
    7: IssueCategory.DEAD_ANIMAL,
    8: IssueCategory.DAMAGED_CONCRETE,
    9: IssueCategory.DAMAGED_ELECTRIC,
}


class Coordinates(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy_meters: Optional[float] = Field(None, ge=0)


class DeviceMetadata(BaseModel):
    platform: str = Field(..., max_length=50)
    device_model: Optional[str] = Field(None, max_length=100)
    os_version: Optional[str] = Field(None, max_length=50)
    app_version: Optional[str] = Field(None, max_length=20)


class IssuePacket(BaseModel):
    description: Optional[str] = Field(None, max_length=2000)
    coordinates: Coordinates
    device_metadata: DeviceMetadata
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    @field_validator("description")
    @classmethod
    def clean_description(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return v.strip()
        return v


class DetectionBox(BaseModel):
    class_id: int
    class_name: str
    confidence: float = Field(..., ge=0, le=1)
    bbox: tuple[float, float, float, float]


class ClassificationResult(BaseModel):
    issue_id: UUID
    detections: list[DetectionBox]
    primary_category: Optional[IssueCategory] = None
    primary_confidence: float = 0.0
    annotated_urls: list[str] = []
    inference_time_ms: float
    model_version: str = "1.0"
    
    def model_post_init(self, __context) -> None:
        if self.detections and not self.primary_category:
            best = max(self.detections, key=lambda d: d.confidence)
            self.primary_category = CLASS_ID_TO_CATEGORY.get(best.class_id)
            self.primary_confidence = best.confidence


class IssueCreate(BaseModel):
    description: Optional[str] = Field(None, max_length=2000)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy_meters: Optional[float] = Field(None, ge=0)
    platform: str = Field(..., max_length=50)
    device_model: Optional[str] = Field(None, max_length=100)


class AgentOutput(BaseModel):
    agent: str
    decision: str
    reasoning: Optional[str] = None
    duration_ms: Optional[float] = None


class IssueResponse(BaseModel):
    id: UUID
    description: Optional[str]
    latitude: float
    longitude: float
    state: IssueState
    priority: Optional[PriorityLevel]
    priority_reason: Optional[str] = None
    category: Optional[str]
    confidence: Optional[float]
    detections_count: Optional[int] = None
    image_urls: list[str]
    annotated_urls: list[str] = []
    proof_image_url: Optional[str] = None
    validation_source: Optional[str] = None
    is_duplicate: bool = False
    parent_issue_id: Optional[UUID] = None
    nearby_count: Optional[int] = None
    city: Optional[str] = None
    locality: Optional[str] = None
    full_address: Optional[str] = None
    department: Optional[str] = None
    assigned_member: Optional[str] = None
    sla_hours: Optional[int] = None
    sla_deadline: Optional[datetime] = None
    agent_flow: list[AgentOutput] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class IssueListResponse(BaseModel):
    items: list[IssueResponse]
    total: int
    page: int
    page_size: int

