"""
Admin Database Models for Astegni Educational Platform
Separate database for admin/system data (astegni_admin_db)
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Column, Integer, String, DateTime, Float, Boolean, Text, JSON,
    ForeignKey, Date, Numeric, create_engine
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from pydantic import BaseModel, EmailStr
from config import ADMIN_DATABASE_URL

# ============================================
# ADMIN DATABASE SETUP
# ============================================

admin_engine = create_engine(ADMIN_DATABASE_URL)
AdminSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=admin_engine)
AdminBase = declarative_base()


def get_admin_db():
    """Dependency to get admin database session"""
    db = AdminSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================
# ADMIN DATABASE MODELS
# ============================================

class AdminUser(AdminBase):
    """Admin users with access to admin panel"""
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default='admin')  # super_admin, admin, moderator, support
    permissions = Column(JSON, default=[])
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    activity_logs = relationship("AdminActivityLog", back_populates="admin")


class AdminActivityLog(AdminBase):
    """Log of admin actions for audit trail"""
    __tablename__ = "admin_activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("admin_users.id"))
    action = Column(String(255), nullable=False)
    entity_type = Column(String(100))  # user, tutor, content, etc.
    entity_id = Column(Integer)
    details = Column(JSON)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    admin = relationship("AdminUser", back_populates="activity_logs")


class SystemSetting(AdminBase):
    """System-wide configuration settings"""
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    setting_key = Column(String(100), unique=True, nullable=False)
    setting_value = Column(Text)
    setting_type = Column(String(50), default='string')  # string, json, boolean, number
    category = Column(String(100))
    description = Column(Text)
    is_public = Column(Boolean, default=False)
    updated_by = Column(Integer, ForeignKey("admin_users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ModerationQueue(AdminBase):
    """Content moderation queue"""
    __tablename__ = "moderation_queue"

    id = Column(Integer, primary_key=True, index=True)
    content_type = Column(String(100), nullable=False)  # video, blog, comment, profile
    content_id = Column(Integer, nullable=False)
    user_id = Column(Integer, nullable=False)  # from user_db
    reason = Column(String(255))
    status = Column(String(50), default='pending')  # pending, approved, rejected, flagged
    reviewed_by = Column(Integer, ForeignKey("admin_users.id"))
    review_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime)


class UserReport(AdminBase):
    """User-submitted reports about other users"""
    __tablename__ = "user_reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, nullable=False)  # from user_db
    reported_user_id = Column(Integer, nullable=False)  # from user_db
    report_type = Column(String(100), nullable=False)  # spam, harassment, inappropriate, fraud
    description = Column(Text)
    evidence = Column(JSON)  # screenshots, message ids, etc.
    status = Column(String(50), default='open')  # open, investigating, resolved, dismissed
    assigned_to = Column(Integer, ForeignKey("admin_users.id"))
    resolution_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime)


class PlatformAnalytics(AdminBase):
    """Aggregated platform analytics"""
    __tablename__ = "platform_analytics"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    metric_name = Column(String(100), nullable=False)
    metric_value = Column(Numeric)
    dimensions = Column(JSON)  # country, role, etc.
    created_at = Column(DateTime, default=datetime.utcnow)


class FeatureFlag(AdminBase):
    """Feature flags for controlled rollouts"""
    __tablename__ = "feature_flags"

    id = Column(Integer, primary_key=True, index=True)
    flag_name = Column(String(100), unique=True, nullable=False)
    is_enabled = Column(Boolean, default=False)
    rollout_percentage = Column(Integer, default=0)
    target_users = Column(JSON)  # specific user ids or roles
    description = Column(Text)
    created_by = Column(Integer, ForeignKey("admin_users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Announcement(AdminBase):
    """Platform announcements"""
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    target_audience = Column(JSON, default=['all'])  # all, students, tutors, parents
    priority = Column(String(50), default='normal')  # low, normal, high, urgent
    is_active = Column(Boolean, default=True)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    created_by = Column(Integer, ForeignKey("admin_users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmailTemplate(AdminBase):
    """Email templates for system emails"""
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    template_name = Column(String(100), unique=True, nullable=False)
    subject = Column(String(255), nullable=False)
    body_html = Column(Text, nullable=False)
    body_text = Column(Text)
    variables = Column(JSON)  # expected variables like {{user_name}}
    category = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("admin_users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ScheduledJob(AdminBase):
    """Scheduled background jobs"""
    __tablename__ = "scheduled_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_name = Column(String(100), nullable=False)
    job_type = Column(String(100), nullable=False)  # email, cleanup, report, sync
    schedule = Column(String(100))  # cron expression
    parameters = Column(JSON)
    is_active = Column(Boolean, default=True)
    last_run = Column(DateTime)
    next_run = Column(DateTime)
    status = Column(String(50), default='idle')  # idle, running, failed
    last_error = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditTrail(AdminBase):
    """Audit trail for data changes"""
    __tablename__ = "audit_trail"

    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String(100), nullable=False)
    record_id = Column(Integer, nullable=False)
    action = Column(String(50), nullable=False)  # INSERT, UPDATE, DELETE
    old_values = Column(JSON)
    new_values = Column(JSON)
    changed_by = Column(Integer)  # admin_id or user_id
    changed_by_type = Column(String(20))  # admin, user, system
    ip_address = Column(String(45))
    created_at = Column(DateTime, default=datetime.utcnow)


class SupportTicket(AdminBase):
    """Support tickets from users"""
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)  # from user_db
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100))  # technical, billing, content, other
    priority = Column(String(50), default='normal')
    status = Column(String(50), default='open')  # open, in_progress, waiting, resolved, closed
    assigned_to = Column(Integer, ForeignKey("admin_users.id"))
    resolution = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime)

    messages = relationship("SupportTicketMessage", back_populates="ticket")


class SupportTicketMessage(AdminBase):
    """Messages within support tickets"""
    __tablename__ = "support_ticket_messages"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id", ondelete="CASCADE"))
    sender_type = Column(String(20), nullable=False)  # user, admin
    sender_id = Column(Integer, nullable=False)
    message = Column(Text, nullable=False)
    attachments = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship("SupportTicket", back_populates="messages")


class BasePriceRule(AdminBase):
    """Base price rules for new tutors without market data"""
    __tablename__ = "base_price_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_name = Column(String(200), nullable=False)
    country = Column(String(100), default='all')  # Country code (ET, CM, KE, MX, etc.) or 'all' for global
    subject_category = Column(String(100), nullable=False)  # all, mathematics, science, languages, etc.
    session_format = Column(String(50), nullable=False)  # all, Online, In-Person, Hybrid
    min_grade_level = Column(Integer, default=1)  # Minimum grade level (1-14: 1-12=grades, 13=university, 14=certification)
    max_grade_level = Column(Integer, default=14)  # Maximum grade level (1-14: 1-12=grades, 13=university, 14=certification)
    base_price_per_hour = Column(Numeric(10, 2), nullable=False)
    credential_bonus = Column(Numeric(10, 2), default=0)  # Additional price per verified credential
    experience_bonus_per_year = Column(Numeric(10, 2), default=0)  # Bonus per year of experience
    priority = Column(Integer, default=2)  # 1=high, 2=medium, 3=low
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True)


class SystemMediaSettings(AdminBase):
    """System media settings for subscription-based storage limits"""
    __tablename__ = "system_media_settings"

    id = Column(Integer, primary_key=True, index=True)
    subscription_plan_id = Column(Integer, nullable=True, index=True)
    max_image_size_mb = Column(Integer, default=5)
    max_video_size_mb = Column(Integer, default=200)
    max_document_size_mb = Column(Integer, default=10)
    max_audio_size_mb = Column(Integer, default=50)
    storage_limit_gb = Column(Integer, default=10)
    max_image_storage_mb = Column(Integer, default=0)  # 0 = unlimited
    max_video_storage_mb = Column(Integer, default=0)  # 0 = unlimited
    allowed_video_formats = Column(JSON, default=["mp4", "mov", "avi", "webm"])
    allowed_image_formats = Column(JSON, default=["jpg", "jpeg", "png", "gif"])
    allowed_document_formats = Column(JSON, default=["pdf", "doc", "docx"])
    allowed_audio_formats = Column(JSON, default=["mp3", "wav", "ogg"])
    auto_optimize_images = Column(Boolean, default=True)
    auto_optimize_videos = Column(Boolean, default=False)
    auto_generate_thumbnails = Column(Boolean, default=True)
    video_quality_max = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ============================================
# PYDANTIC SCHEMAS FOR ADMIN API
# ============================================

class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = 'admin'
    permissions: List[str] = []


class AdminUserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    permissions: List[str]
    is_active: bool
    last_login: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class SystemSettingUpdate(BaseModel):
    setting_value: str
    description: Optional[str] = None


class SystemSettingResponse(BaseModel):
    id: int
    setting_key: str
    setting_value: Optional[str]
    setting_type: str
    category: Optional[str]
    description: Optional[str]
    is_public: bool

    class Config:
        from_attributes = True


class ModerationQueueItem(BaseModel):
    id: int
    content_type: str
    content_id: int
    user_id: int
    reason: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    target_audience: List[str] = ['all']
    priority: str = 'normal'
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    content: str
    target_audience: List[str]
    priority: str
    is_active: bool
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class SupportTicketCreate(BaseModel):
    subject: str
    description: str
    category: Optional[str] = 'other'
    priority: str = 'normal'


class SupportTicketResponse(BaseModel):
    id: int
    user_id: int
    subject: str
    description: str
    category: Optional[str]
    priority: str
    status: str
    assigned_to: Optional[int]
    resolution: Optional[str]
    created_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True


# ============================================
# CREATE ADMIN TABLES
# ============================================

def create_admin_tables():
    """Create all admin database tables"""
    AdminBase.metadata.create_all(bind=admin_engine)
    print("Admin database tables created successfully!")


if __name__ == "__main__":
    create_admin_tables()
