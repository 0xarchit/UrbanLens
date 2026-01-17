from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Department(Base):
    __tablename__ = "departments"
    
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    categories: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    default_sla_hours: Mapped[int] = mapped_column(Integer, default=48)
    escalation_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
    
    members: Mapped[list["Member"]] = relationship(back_populates="department", lazy="selectin")


class Member(Base):
    __tablename__ = "members"
    
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    department_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    role: Mapped[str] = mapped_column(String(50), default="worker")
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    locality: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    current_workload: Mapped[int] = mapped_column(Integer, default=0)
    max_workload: Mapped[int] = mapped_column(Integer, default=10)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
    
    department: Mapped[Optional["Department"]] = relationship(back_populates="members")




class Issue(Base):
    __tablename__ = "issues"
    
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    accuracy_meters: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    state: Mapped[str] = mapped_column(String(20), default="reported", index=True)
    priority: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    priority_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    validation_source: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    validation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    parent_issue_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("issues.id"), nullable=True)
    geo_cluster_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    device_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    department_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    assigned_member_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("members.id"), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    locality: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    full_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    sla_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sla_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    escalation_level: Mapped[int] = mapped_column(Integer, default=0)
    escalated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, index=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    proof_image_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    
    images: Mapped[list["IssueImage"]] = relationship(back_populates="issue", lazy="selectin", foreign_keys="IssueImage.issue_id")
    classification: Mapped[Optional["Classification"]] = relationship(back_populates="issue", uselist=False, lazy="selectin")
    
    department: Mapped[Optional["Department"]] = relationship("Department", lazy="selectin")
    assigned_member: Mapped[Optional["Member"]] = relationship("Member", foreign_keys=[assigned_member_id], lazy="selectin")
    
    events: Mapped[list["IssueEvent"]] = relationship(back_populates="issue", lazy="noload")
    duplicates: Mapped[list["Issue"]] = relationship(back_populates="parent_issue", foreign_keys=[parent_issue_id])
    parent_issue: Mapped[Optional["Issue"]] = relationship(back_populates="duplicates", remote_side=[id], foreign_keys=[parent_issue_id])


class IssueImage(Base):
    __tablename__ = "issue_images"
    
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    issue_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), index=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    annotated_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    original_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    
    issue: Mapped["Issue"] = relationship(back_populates="images", foreign_keys=[issue_id])


class Classification(Base):
    __tablename__ = "classifications"
    
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    issue_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), unique=True)
    
    primary_category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    primary_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    
    detections_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    inference_time_ms: Mapped[float] = mapped_column(Float, default=0.0)
    model_version: Mapped[str] = mapped_column(String(20), default="1.0")
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    
    issue: Mapped["Issue"] = relationship(back_populates="classification")


class IssueEvent(Base):
    __tablename__ = "issue_events"
    
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    issue_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), index=True)
    
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    agent_name: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    event_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), index=True)
    
    issue: Mapped["Issue"] = relationship(back_populates="events")


class Escalation(Base):
    __tablename__ = "escalations"
    
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    issue_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), index=True)
    
    from_level: Mapped[int] = mapped_column(Integer, nullable=False)
    to_level: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    
    escalated_by: Mapped[str] = mapped_column(String(50), default="system")
    notified_emails: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
