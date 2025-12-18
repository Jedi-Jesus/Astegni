"""
Database and Pydantic models for Astegni Educational Platform
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Column, Integer, String, DateTime, Float, Boolean, Text, JSON,
    ForeignKey, Date, Time, create_engine, func
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from pydantic import BaseModel, EmailStr, validator, model_validator
from config import DATABASE_URL

# ============================================
# DATABASE SETUP
# ============================================

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ============================================
# DATABASE MODELS
# ============================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    father_name = Column(String, nullable=False)  # Changed from last_name to father_name
    grandfather_name = Column(String, nullable=False)  # Ethiopian naming convention - REQUIRED
    # username removed - now stored in role-specific profile tables (tutor_profiles, student_profiles, etc.)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=False)

    # Multi-role support
    roles = Column(JSON, default=["user"])
    active_role = Column(String, default="user")

    # Shared Profile Fields
    gender = Column(String)  # Shared across all roles

    # DEPRECATED - Keep for backward compatibility but don't use in new code
    # Use profile_picture and bio from tutor_profiles/student_profiles instead
    profile_picture = Column(String)  # DEPRECATED - use role-specific tables
    bio = Column(Text)  # DEPRECATED - use role-specific tables

    # Status
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)

    # Relationships
    tutor_profile = relationship("TutorProfile", back_populates="user", uselist=False)
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False)
    parent_profile = relationship("ParentProfile", back_populates="user", uselist=False)
    refresh_tokens = relationship("RefreshToken", back_populates="user")
    playlists = relationship("Playlist", back_populates="user")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="refresh_tokens")

class OTP(Base):
    __tablename__ = "otps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for registration
    contact = Column(String, nullable=True, index=True)  # Email or phone for registration OTPs
    otp_code = Column(String(6), nullable=False)
    purpose = Column(String, nullable=False)  # 'add_role', 'verify_email', 'reset_password', 'registration'
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class TutorProfile(Base):
    __tablename__ = "tutor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Basic Info
    username = Column(String, unique=True, index=True)  # Role-specific username
    bio = Column(Text)  # Tutor-specific bio
    quote = Column(Text)
    # Note: gender is now in users table (shared across roles)

    # Professional Info
    location = Column(String)
    languages = Column(JSON, default=[])

    # Experience & Qualifications
    expertise_badge = Column(String, default='Tutor')  # Expert, Intermediate, Beginner, Tutor

    # Hero Section
    hero_titles = Column(JSON, default=["Excellence in Education, Delivered with Passion"])  # Array of hero titles (cycled through)
    hero_subtitle = Column(Text, default="Empowering students through personalized learning and expert guidance")

    # Status
    is_verified = Column(Boolean, default=False)
    verification_status = Column(String, default="pending")  # pending, verified, rejected, suspended
    rejection_reason = Column(Text)  # Reason for rejection if status is rejected
    verified_at = Column(DateTime)  # Timestamp when verified
    # verified_by = Column(Integer)  # Admin user ID who verified - Column not in DB yet
    is_active = Column(Boolean, default=True)
    is_basic = Column(Boolean, default=False)  # Basic tutor status

    # Suspension fields
    is_suspended = Column(Boolean, default=False)
    suspension_reason = Column(Text)  # Reason for suspension
    suspended_at = Column(DateTime)  # Timestamp when suspended
    suspended_by = Column(Integer)  # Admin ID who suspended

    # Media
    profile_picture = Column(String)
    cover_image = Column(String)

    # Social Media Links
    social_links = Column(JSON, default={})  # {"facebook": "url", "twitter": "url", etc.}

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="tutor_profile")
    videos = relationship("VideoReel", back_populates="tutor")
    # Note: Connections now use universal Connection model with user_id references
    reviews = relationship("TutorReview", back_populates="tutor")
    activities = relationship("TutorActivity", back_populates="tutor")
    # Note: schedules relationship removed - TutorSchedule now references users.id directly
    # Note: sessions relationship removed - use whiteboard_sessions table instead

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Basic Info
    username = Column(String, unique=True, index=True)  # Role-specific username
    location = Column(String)

    # Hero Section (NEW)
    hero_title = Column(ARRAY(String), default=[])  # Multiple hero titles
    hero_subtitle = Column(ARRAY(String), default=[])  # Multiple hero subtitles

    # Media
    profile_picture = Column(String)
    cover_image = Column(String)

    # Academic Info
    grade_level = Column(String)
    studying_at = Column(String)  # Renamed from school_name
    career_aspirations = Column(Text)

    # Subjects & Interests (restructured as arrays)
    interested_in = Column(ARRAY(String), default=[])  # Renamed from subjects
    hobbies = Column(ARRAY(String), default=[])  # Renamed from interests
    languages = Column(ARRAY(String), default=[])  # Renamed from preferred_languages

    # Learning Preferences
    learning_method = Column(ARRAY(String), default=[])  # Renamed from learning_style, now array

    # Personal Info
    quote = Column(ARRAY(String), default=[])  # Now supports multiple quotes
    about = Column(Text)  # Renamed from bio

    # Parent Relationships (NEW)
    parent_id = Column(ARRAY(Integer), default=[])  # Array of parent user IDs who can manage this student

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="student_profile")
    # Note: enrollments and sessions relationships removed - use tutor_students and whiteboard_sessions tables instead

class ParentProfile(Base):
    __tablename__ = "parent_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Basic Info
    username = Column(String, unique=True, index=True)  # Role-specific username
    bio = Column(Text)
    quote = Column(Text)
    relationship_type = Column(String, default="Parent")  # Father, Mother, Guardian, Co-parent, Other

    # Contact & Location
    location = Column(String)

    # Children References (NEW - Array of student profile IDs)
    children_ids = Column(ARRAY(Integer), default=[])  # Array of student_profile.id (not user.id) for better performance

    # Co-Parent References (Array of co-parent user IDs)
    coparent_ids = Column(ARRAY(Integer), default=[])  # Array of co-parent user.id - allows adding co-parents without children

    # Children Statistics
    total_children = Column(Integer, default=0)

    # Engagement Metrics
    total_sessions_booked = Column(Integer, default=0)
    total_amount_spent = Column(Float, default=0.0)

    # Ratings & Reviews
    rating = Column(Float, default=0.0)  # Parent's rating (from tutors)
    rating_count = Column(Integer, default=0)

    # Status & Verification
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    profile_complete = Column(Boolean, default=False)
    profile_completion = Column(Float, default=0.0)

    # Media
    profile_picture = Column(String)
    cover_image = Column(String)

    # Hero Section
    hero_title = Column(ARRAY(String), default=[])  # Array of hero title lines
    hero_subtitle = Column(Text)  # Single hero subtitle

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="parent_profile")
    reviews = relationship("ParentReview", back_populates="parent")

class AdvertiserProfile(Base):
    __tablename__ = "advertiser_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Basic Info
    username = Column(String, unique=True, index=True)  # Role-specific username
    bio = Column(Text)
    quote = Column(Text)

    # Location (array of locations)
    location = Column(ARRAY(String), default=[])

    # Social links (JSONB for flexible social media URLs)
    socials = Column(JSON, default={})  # {"website": "", "facebook": "", "twitter": "", etc.}

    # Media
    profile_picture = Column(String)
    cover_image = Column(String)

    # Hero section content (arrays for multiple lines)
    hero_title = Column(ARRAY(String), default=[])  # ["Title Line 1", "Title Line 2"]
    hero_subtitle = Column(ARRAY(String), default=[])  # ["Subtitle Line 1", "Subtitle Line 2"]

    # Status & Verification
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    # Membership date
    joined_in = Column(Date)

    # Relationships
    user = relationship("User", backref="advertiser_profile")

class VideoReel(Base):
    __tablename__ = "video_reels"

    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("tutor_profiles.id"), nullable=False)

    # Video Info
    title = Column(String, nullable=False)
    description = Column(Text)
    video_url = Column(String, nullable=False)
    thumbnail_url = Column(String)
    duration = Column(String)

    # Categorization
    category = Column(String)
    subject = Column(String)
    grade_level = Column(String)

    # Engagement
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    dislikes = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    saves = Column(Integer, default=0)

    # Status
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tutor = relationship("TutorProfile", back_populates="videos")
    engagements = relationship("VideoEngagement", back_populates="video")
    comments = relationship("VideoComment", back_populates="video")
    chapters = relationship("VideoChapter", back_populates="video")
    playlist_videos = relationship("PlaylistVideo", back_populates="video")

class VideoEngagement(Base):
    __tablename__ = "video_engagements"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("video_reels.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    engagement_type = Column(String, nullable=False)  # like, dislike, save, share, favorite, view
    created_at = Column(DateTime, default=datetime.utcnow)

    video = relationship("VideoReel", back_populates="engagements")

class VideoComment(Base):
    __tablename__ = "video_comments"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("video_reels.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parent_comment_id = Column(Integer, ForeignKey("video_comments.id"))

    text = Column(Text, nullable=False)
    is_edited = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    video = relationship("VideoReel", back_populates="comments")
    replies = relationship("VideoComment")

class VideoChapter(Base):
    __tablename__ = "video_chapters"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("video_reels.id"), nullable=False)
    title = Column(String, nullable=False)
    timestamp = Column(Integer, nullable=False)  # Timestamp in seconds
    description = Column(Text)
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    video = relationship("VideoReel", back_populates="chapters")


# NOTE: SystemMedia table has been moved to astegni_admin_db
# It is created via migrate_system_media_admin_db.py migration script
# Access it through admin database endpoints, not SQLAlchemy models

class Connection(Base):
    """
    Astegni Universal Connections Table - Simplified Structure

    A clean, intuitive connection system for Astegni's social features.
    Tracks connection requests between users in their specific roles.

    Structure:
    - requested_by: User ID who initiated the connection request (references users.id)
    - requester_type: Role of the requester ('tutor', 'student', 'parent', 'advertiser')
    - recipient_id: User ID who received the connection request (references users.id)
    - recipient_type: Role of the recipient ('tutor', 'student', 'parent', 'advertiser')

    Status Values:
    - 'pending': Connection request sent, awaiting response
    - 'accepted': Connection request accepted, users are connected
    - 'rejected': Connection request was rejected/declined
    - 'blocked': User has blocked another user

    Usage Examples:
    - Student (user_id=50) connects with Tutor (user_id=75)
    - Tutor (user_id=85) connects with another Tutor (user_id=90) for professional networking
    - Parent (user_id=5) connects with Student (user_id=12)

    Note: Both requested_by and recipient_id reference the users table (users.id), NOT profile tables.
    """
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True, index=True)

    # Request initiator
    requested_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    requester_type = Column(String(50), nullable=False)  # 'tutor', 'student', 'parent', 'advertiser'

    # Request recipient
    recipient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_type = Column(String(50), nullable=False)  # 'tutor', 'student', 'parent', 'advertiser'

    # Profile IDs (NEW - for direct navigation without conversion)
    requester_profile_id = Column(Integer, nullable=True)  # tutor_profiles.id, student_profiles.id, etc.
    recipient_profile_id = Column(Integer, nullable=True)  # tutor_profiles.id, student_profiles.id, etc.

    # Connection details
    status = Column(String(50), default="pending", nullable=False, index=True)  # 'pending', 'accepted', 'rejected', 'blocked'

    # Timestamps
    requested_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    connected_at = Column(DateTime)  # When status changed to 'accepted'
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    requester = relationship("User", foreign_keys=[requested_by])
    recipient = relationship("User", foreign_keys=[recipient_id])

class FavoriteTutor(Base):
    __tablename__ = "favorite_tutors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tutor_id = Column(Integer, ForeignKey("tutor_profiles.id"), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="playlists")
    videos = relationship("PlaylistVideo", back_populates="playlist")

class PlaylistVideo(Base):
    __tablename__ = "playlist_videos"

    id = Column(Integer, primary_key=True, index=True)
    playlist_id = Column(Integer, ForeignKey("playlists.id"), nullable=False)
    video_id = Column(Integer, ForeignKey("video_reels.id"), nullable=False)
    order = Column(Integer, default=0)
    added_at = Column(DateTime, default=datetime.utcnow)

    playlist = relationship("Playlist", back_populates="videos")
    video = relationship("VideoReel", back_populates="playlist_videos")

class TutorReview(Base):
    __tablename__ = "tutor_reviews"

    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("tutor_profiles.id"), nullable=False)
    reviewer_id = Column(Integer, nullable=False)  # References student_profiles, tutor_profiles, or parent_profiles
    user_role = Column(String(20), nullable=False)  # 'student', 'tutor', or 'parent'

    # Review Details
    rating = Column(Float, nullable=False)
    title = Column(String)
    review_text = Column(Text, nullable=False)

    # Detailed Ratings (4-Factor Rating System)
    subject_understanding_rating = Column(Float, default=0.0)  # Renamed from subject_matter_rating
    communication_rating = Column(Float, default=0.0)
    discipline_rating = Column(Float, default=0.0)
    punctuality_rating = Column(Float, default=0.0)

    # Metadata
    is_verified = Column(Boolean, default=False)
    helpful_count = Column(Integer, default=0)
    is_featured = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tutor = relationship("TutorProfile", back_populates="reviews")

class TutorActivity(Base):
    __tablename__ = "tutor_activities"

    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("tutor_profiles.id"), nullable=False)

    # Activity Details
    activity_type = Column(String, nullable=False)  # enrollment, review, payment, session_request, etc.
    title = Column(String, nullable=False)
    description = Column(Text)
    icon = Column(String)  # emoji or icon class
    color = Column(String)  # for UI display

    # Related Entity (optional)
    related_user_id = Column(Integer, ForeignKey("users.id"))
    related_session_id = Column(Integer, nullable=True)  # Reference to session (no FK constraint - table may not exist)

    # Metadata
    amount = Column(Float)  # for payment activities
    is_read = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    tutor = relationship("TutorProfile", back_populates="activities")
    related_user = relationship("User", foreign_keys=[related_user_id])

class Schedule(Base):
    """
    Universal Schedules Table - Multi-Role Support

    This table stores schedules for all user roles (tutor, student, parent, etc.)

    Changes from tutor_schedules:
    - Renamed table: tutor_schedules → schedules
    - Renamed field: tutor_id → scheduler_id
    - Added field: scheduler_role (tutor, student, parent, etc.)
    - Removed fields: subject, grade_level
    - Added field: priority_level (low, medium, high, urgent)
    """
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    scheduler_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    scheduler_role = Column(String(50), nullable=False, index=True)  # 'tutor', 'student', 'parent', etc.

    # Schedule Details
    title = Column(String(255), nullable=False)
    description = Column(Text)
    year = Column(Integer, nullable=False)

    # Schedule Type: 'recurring' or 'specific'
    schedule_type = Column(String(20), default='recurring')

    # For recurring schedules
    months = Column(ARRAY(String))  # Array of months
    days = Column(ARRAY(String))    # Array of days

    # For specific date schedules
    specific_dates = Column(ARRAY(String))  # Array of specific dates

    # Time
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    notes = Column(Text)

    # Priority Level (NEW - replaces subject/grade_level)
    priority_level = Column(String(20), default='medium')  # 'low', 'medium', 'high', 'urgent'

    # Status
    status = Column(String(20), default='active', index=True)  # active, draft, completed, cancelled

    # Featured Schedule
    is_featured = Column(Boolean, default=False, index=True)  # Mark important schedules

    # Alarm/Notification settings
    alarm_enabled = Column(Boolean, default=False)
    alarm_before_minutes = Column(Integer)
    notification_browser = Column(Boolean, default=False)
    notification_sound = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    # Relationships
    scheduler = relationship("User", foreign_keys=[scheduler_id])

# ============================================
# PYDANTIC MODELS
# ============================================

class UserRegister(BaseModel):
    first_name: str
    father_name: str
    grandfather_name: str  # REQUIRED for Ethiopian naming convention
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str
    role: str = "student"
    department: Optional[str] = None  # For admin role: manage-campaigns, manage-schools, etc.

    @validator('phone', always=True)
    def check_email_or_phone(cls, v, values):
        # Ensure at least one of email or phone is provided
        email = values.get('email')
        if not email and not v:
            raise ValueError('Either email or phone must be provided')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

class UserResponse(BaseModel):
    id: int
    first_name: str
    father_name: str
    grandfather_name: str  # REQUIRED
    username: Optional[str]
    email: str
    phone: Optional[str]
    roles: List[str]
    active_role: str
    profile_picture: Optional[str]
    created_at: datetime
    is_active: bool
    email_verified: bool
    role_ids: Optional[dict] = None  # NEW: Include role-specific profile IDs

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class TutorProfileUpdate(BaseModel):
    bio: Optional[str] = None
    quote: Optional[str] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    languages: Optional[List[str]] = None
    expertise_badge: Optional[str] = None  # Expert, Intermediate, Beginner, Tutor
    price: Optional[float] = None
    availability: Optional[Dict[str, Any]] = None
    is_basic: Optional[bool] = None
    social_links: Optional[Dict[str, str]] = None  # Social media links
    hero_titles: Optional[List[str]] = None  # Array of hero titles
    hero_subtitle: Optional[str] = None

class StudentProfileUpdate(BaseModel):
    # Basic Info
    username: Optional[str] = None
    location: Optional[str] = None

    # Hero Section
    hero_title: Optional[List[str]] = None
    hero_subtitle: Optional[List[str]] = None

    # Media
    profile_picture: Optional[str] = None
    cover_image: Optional[str] = None

    # Academic Info
    grade_level: Optional[str] = None
    studying_at: Optional[str] = None
    career_aspirations: Optional[str] = None

    # Subjects & Interests
    interested_in: Optional[List[str]] = None
    hobbies: Optional[List[str]] = None
    languages: Optional[List[str]] = None

    # Learning Preferences
    learning_method: Optional[List[str]] = None

    # Personal Info
    quote: Optional[List[str]] = None
    about: Optional[str] = None

class SessionCreate(BaseModel):
    tutor_id: int
    subject: str
    topic: Optional[str] = None
    session_date: date
    start_time: str
    duration: int = 60
    mode: str = "online"
    location: Optional[str] = None
    meeting_link: Optional[str] = None

class VideoEngagementRequest(BaseModel):
    engagement_type: str  # like, dislike, save, share, favorite

class CommentCreate(BaseModel):
    text: str
    parent_comment_id: Optional[int] = None

class PlaylistCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = True

class PlaylistVideoAdd(BaseModel):
    video_id: int

class BlogCreate(BaseModel):
    title: str
    description: str
    content: str
    category: str
    thumbnail_url: Optional[str] = None

class CertificationCreate(BaseModel):
    title: str
    institution: str
    date_obtained: str
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None

class ExperienceCreate(BaseModel):
    title: str
    company_institution: str
    start_date: str
    end_date: Optional[str] = None
    description: str
    is_current: bool = False

class AchievementCreate(BaseModel):
    title: str
    description: str
    date_achieved: str
    category: str

class PackageCreate(BaseModel):
    name: str
    description: str
    price: float
    duration_hours: int
    sessions_count: int

class PackageResponse(BaseModel):
    id: int
    name: str
    description: str
    price: float
    duration_hours: int
    sessions_count: int

class VideoUploadCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    subject: Optional[str] = None
    grade_level: Optional[str] = None

class ScheduleCreate(BaseModel):
    day_of_week: str
    start_time: str
    end_time: str
    is_available: bool = True

# ============================================
# CONNECTION PYDANTIC SCHEMAS (SIMPLIFIED)
# ============================================

class ConnectionCreate(BaseModel):
    """
    Create a new connection request - Simplified

    Fields:
    - recipient_id: User ID to send connection request to (references users.id) - DEPRECATED, use recipient_profile_id
    - recipient_profile_id: Profile ID of the recipient (e.g., tutor profile ID) - PREFERRED
    - recipient_type: Role of the recipient ('tutor', 'student', 'parent', 'advertiser')
    - requester_type: Role the requester is connecting as (optional - auto-determined if not provided)

    Note: Either recipient_id OR recipient_profile_id must be provided.
    If recipient_profile_id is provided, the user_id will be looked up from the profile.
    """
    recipient_id: Optional[int] = None  # User ID to connect with (DEPRECATED)
    recipient_profile_id: Optional[int] = None  # Profile ID (tutor_profiles.id, student_profiles.id, etc.) - PREFERRED
    recipient_type: str  # Role: 'tutor', 'student', 'parent', 'advertiser'
    requester_type: Optional[str] = None  # Role requester is connecting as (optional)

    @validator('recipient_type')
    def validate_recipient_type(cls, v):
        allowed_types = ['tutor', 'student', 'parent', 'advertiser']
        if v not in allowed_types:
            raise ValueError(f'recipient_type must be one of {allowed_types}')
        return v

    @validator('requester_type')
    def validate_requester_type(cls, v):
        if v is not None:
            allowed_types = ['tutor', 'student', 'parent', 'advertiser']
            if v not in allowed_types:
                raise ValueError(f'requester_type must be one of {allowed_types}')
        return v

    @model_validator(mode='after')
    def check_recipient(self):
        if not self.recipient_id and not self.recipient_profile_id:
            raise ValueError('Either recipient_id or recipient_profile_id must be provided')
        return self

class ConnectionUpdate(BaseModel):
    """
    Update connection status

    Status options:
    - 'accepted': Accept the connection request
    - 'rejected': Reject the connection request
    - 'blocked': Block the user
    """
    status: str  # 'accepted', 'rejected', 'blocked'

    @validator('status')
    def validate_status(cls, v):
        allowed_statuses = ['accepted', 'rejected', 'blocked']
        if v not in allowed_statuses:
            raise ValueError(f'status must be one of {allowed_statuses}')
        return v

class ConnectionResponse(BaseModel):
    """
    Connection response model - Simplified

    Status meanings:
    - 'pending': Request sent, awaiting response
    - 'accepted': Connection active
    - 'rejected': Request rejected
    - 'blocked': User blocked

    Note: Both requested_by and recipient_id reference users.id (NOT profile tables)
    """
    id: int

    # Request details
    requested_by: int
    requester_type: str  # 'tutor', 'student', 'parent', 'advertiser'
    recipient_id: int
    recipient_type: str  # 'tutor', 'student', 'parent', 'advertiser'

    # Status
    status: str  # 'pending', 'accepted', 'rejected', 'blocked'

    # Timestamps
    requested_at: datetime
    connected_at: Optional[datetime] = None  # When status changed to 'accepted'
    updated_at: datetime

    # Profile IDs (NEW - for direct navigation without conversion)
    requester_profile_id: Optional[int] = None  # tutor_profiles.id, student_profiles.id, etc.
    recipient_profile_id: Optional[int] = None  # tutor_profiles.id, student_profiles.id, etc.

    # Optional user details (populated by endpoints)
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    requester_profile_picture: Optional[str] = None
    requester_roles: Optional[list[str]] = None  # All roles the requester has
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    recipient_profile_picture: Optional[str] = None
    recipient_roles: Optional[list[str]] = None  # All roles the recipient has

    class Config:
        from_attributes = True

class TutorReviewCreate(BaseModel):
    rating: float
    title: Optional[str] = None
    review_text: str
    subject_understanding_rating: Optional[float] = None  # Renamed from subject_matter_rating
    communication_rating: Optional[float] = None
    discipline_rating: Optional[float] = None
    punctuality_rating: Optional[float] = None

class TutorReviewResponse(BaseModel):
    id: int
    tutor_id: int
    student_id: int
    rating: float
    title: Optional[str]
    review_text: str
    subject_understanding_rating: float  # Renamed from subject_matter_rating
    communication_rating: float
    discipline_rating: float
    punctuality_rating: float
    is_verified: bool
    helpful_count: int
    created_at: datetime
    student_name: Optional[str] = None

class TutorActivityResponse(BaseModel):
    id: int
    activity_type: str
    title: str
    description: Optional[str]
    icon: Optional[str]
    color: Optional[str]
    amount: Optional[float]
    created_at: datetime

class ScheduleCreate(BaseModel):
    """
    Create a new schedule (universal for all roles)

    Note: scheduler_role is optional - will be auto-determined from user's active_role if not provided
    """
    title: str
    description: Optional[str] = None
    year: int
    schedule_type: str = 'recurring'  # 'recurring' or 'specific'
    months: Optional[List[str]] = []
    days: Optional[List[str]] = []
    specific_dates: Optional[List[str]] = []
    start_time: str
    end_time: str
    notes: Optional[str] = None
    priority_level: str = 'medium'  # 'low', 'medium', 'high', 'urgent'
    status: str = 'active'  # 'active', 'draft', 'completed', 'cancelled'
    is_featured: bool = False  # Mark as important/featured schedule
    alarm_enabled: bool = False
    alarm_before_minutes: Optional[int] = None
    notification_browser: bool = False
    notification_sound: bool = False
    scheduler_role: Optional[str] = None  # Optional - auto-determined if not provided

    @validator('priority_level')
    def validate_priority_level(cls, v):
        allowed_levels = ['low', 'medium', 'high', 'urgent']
        if v not in allowed_levels:
            raise ValueError(f'priority_level must be one of {allowed_levels}')
        return v

class ScheduleResponse(BaseModel):
    """
    Schedule response (universal for all roles)
    """
    id: int
    scheduler_id: int
    scheduler_role: str
    title: str
    description: Optional[str]
    year: int
    schedule_type: str
    months: Optional[List[str]]
    days: Optional[List[str]]
    specific_dates: Optional[List[str]]
    start_time: str
    end_time: str
    notes: Optional[str]
    priority_level: str
    status: str
    is_featured: bool
    alarm_enabled: bool
    alarm_before_minutes: Optional[int]
    notification_browser: bool
    notification_sound: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# Legacy aliases for backward compatibility
TutorScheduleCreate = ScheduleCreate
TutorScheduleResponse = ScheduleResponse

class TutorProfileUpdateExtended(BaseModel):
    bio: Optional[str] = None
    quote: Optional[str] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    languages: Optional[List[str]] = None
    expertise_badge: Optional[str] = None  # Expert, Intermediate, Beginner, Tutor
    price: Optional[float] = None
    availability: Optional[Dict[str, Any]] = None
    is_basic: Optional[bool] = None
    social_links: Optional[Dict[str, str]] = None
    hero_titles: Optional[List[str]] = None  # Array of hero titles
    hero_subtitle: Optional[str] = None

# ============================================
# PARENT PROFILE PYDANTIC SCHEMAS
# ============================================

class ParentProfileUpdate(BaseModel):
    username: Optional[str] = None
    name: Optional[str] = None
    bio: Optional[str] = None
    quote: Optional[str] = None
    relationship_type: Optional[str] = None
    location: Optional[str] = None
    children_ids: Optional[List[int]] = None  # Array of student_profile.id
    coparent_ids: Optional[List[int]] = None  # Array of co-parent user.id
    email: Optional[str] = None
    phone: Optional[str] = None
    profile_picture: Optional[str] = None
    cover_image: Optional[str] = None
    hero_title: Optional[List[str]] = None  # Array of hero title lines
    hero_subtitle: Optional[str] = None  # Single hero subtitle

class ParentProfileResponse(BaseModel):
    id: int
    user_id: int
    username: Optional[str] = None
    name: Optional[str] = None
    bio: Optional[str] = None
    quote: Optional[str] = None
    relationship_type: Optional[str] = None
    location: Optional[str] = None
    children_ids: List[int] = []  # Array of student_profile.id
    coparent_ids: List[int] = []  # Array of co-parent user.id
    email: Optional[str] = None
    phone: Optional[str] = None
    total_children: Optional[int] = 0
    rating: Optional[float] = 0.0
    rating_count: Optional[int] = 0
    is_verified: Optional[bool] = False
    profile_picture: Optional[str] = None
    cover_image: Optional[str] = None
    hero_title: List[str] = []  # Array of hero title lines
    hero_subtitle: Optional[str] = None  # Single hero subtitle
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ParentReviewCreate(BaseModel):
    """Schema for creating a parent review"""
    rating: float
    title: Optional[str] = None
    review_text: str
    engagement_with_tutor_rating: Optional[float] = None
    engagement_with_child_rating: Optional[float] = None
    responsiveness_rating: Optional[float] = None
    payment_consistency_rating: Optional[float] = None

    @validator('rating', 'engagement_with_tutor_rating', 'engagement_with_child_rating',
               'responsiveness_rating', 'payment_consistency_rating')
    def validate_rating_range(cls, v):
        if v is not None and (v < 0 or v > 5):
            raise ValueError('Rating must be between 0 and 5')
        return v

class ParentReviewUpdate(BaseModel):
    """Schema for updating a parent review"""
    rating: Optional[float] = None
    title: Optional[str] = None
    review_text: Optional[str] = None
    engagement_with_tutor_rating: Optional[float] = None
    engagement_with_child_rating: Optional[float] = None
    responsiveness_rating: Optional[float] = None
    payment_consistency_rating: Optional[float] = None

class ParentReviewResponse(BaseModel):
    """Schema for parent review response"""
    id: int
    parent_id: int
    reviewer_id: int
    user_role: str
    rating: float
    title: Optional[str] = None
    review_text: str
    engagement_with_tutor_rating: float
    engagement_with_child_rating: float
    responsiveness_rating: float
    payment_consistency_rating: float
    is_verified: bool
    helpful_count: int
    is_featured: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ============================================
# ADVERTISER PROFILE PYDANTIC SCHEMAS
# ============================================

class AdvertiserProfileUpdate(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    quote: Optional[str] = None
    location: Optional[List[str]] = None  # Array of locations
    socials: Optional[dict] = None  # {"website": "", "facebook": "", "twitter": "", etc.}
    profile_picture: Optional[str] = None
    cover_image: Optional[str] = None
    hero_title: Optional[List[str]] = None  # Array for multi-line hero title
    hero_subtitle: Optional[List[str]] = None  # Array for multi-line hero subtitle

class AdvertiserProfileResponse(BaseModel):
    id: int
    user_id: int
    username: Optional[str] = None
    bio: Optional[str] = None
    quote: Optional[str] = None
    location: Optional[List[str]] = []  # Array of locations
    socials: Optional[dict] = {}  # Social links JSON
    profile_picture: Optional[str] = None
    cover_image: Optional[str] = None
    hero_title: Optional[List[str]] = []  # Hero section title lines
    hero_subtitle: Optional[List[str]] = []  # Hero section subtitle lines
    is_verified: bool = False
    is_active: bool = True
    joined_in: Optional[date] = None

    class Config:
        from_attributes = True

class AdCampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    objective: Optional[str] = "brand_awareness"
    start_date: date
    end_date: date
    target_audience: Optional[List[str]] = []  # Changed to list of audience types
    locations: Optional[List[str]] = []
    ad_type: Optional[str] = "image"
    ad_copy: Optional[str] = None
    call_to_action: Optional[str] = "Learn More"
    landing_page_url: Optional[str] = None
    creative_urls: Optional[List[str]] = []  # For uploaded media

class AdCampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    objective: Optional[str] = None
    verification_status: Optional[str] = None  # For admin updates: pending, verified, rejected, suspended
    is_verified: Optional[bool] = None
    budget: Optional[float] = None
    daily_budget: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    target_audience: Optional[List[str]] = None
    locations: Optional[List[str]] = None
    ad_type: Optional[str] = None
    ad_copy: Optional[str] = None
    call_to_action: Optional[str] = None
    landing_page_url: Optional[str] = None
    creative_urls: Optional[List[str]] = None
    campaign_socials: Optional[Dict[str, str]] = None

    # Status tracking dates and reasons
    submitted_date: Optional[datetime] = None
    rejected_date: Optional[datetime] = None
    rejected_reason: Optional[str] = None
    suspended_date: Optional[datetime] = None
    suspended_reason: Optional[str] = None

class AdCampaignResponse(BaseModel):
    id: int
    advertiser_id: int
    name: str
    description: Optional[str] = None
    objective: Optional[str] = None
    is_verified: bool = False
    verification_status: str = "pending"
    budget: float = 0.0
    spent: float = 0.0
    daily_budget: Optional[float] = None
    currency: str = "ETB"
    start_date: date
    end_date: date
    target_audience: List[str] = []
    locations: List[str] = []
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    likes: int = 0
    shares: int = 0
    comments: int = 0
    followers: int = 0
    ctr: float = 0.0
    conversion_rate: float = 0.0
    cost_per_click: float = 0.0
    cost_per_conversion: float = 0.0
    engagement_rate: float = 0.0
    ad_type: Optional[str] = None
    creative_urls: List[str] = []
    ad_copy: Optional[str] = None
    call_to_action: Optional[str] = None
    landing_page_url: Optional[str] = None
    campaign_socials: Optional[Dict[str, str]] = {}
    performance: str = "pending"
    platforms: List[str] = []

    # Status tracking dates and reasons
    submitted_date: Optional[datetime] = None
    rejected_date: Optional[datetime] = None
    rejected_reason: Optional[str] = None
    suspended_date: Optional[datetime] = None
    suspended_reason: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CampaignMetricsUpdate(BaseModel):
    """Schema for updating campaign performance metrics"""
    impressions: Optional[int] = None
    clicks: Optional[int] = None
    conversions: Optional[int] = None
    likes: Optional[int] = None
    shares: Optional[int] = None
    comments: Optional[int] = None
    followers: Optional[int] = None
    spent: Optional[float] = None

class AdvertiserAnalyticsResponse(BaseModel):
    """Aggregated analytics for advertiser"""
    total_campaigns: int
    active_campaigns: int
    total_impressions: int
    total_clicks: int
    total_conversions: int
    total_likes: int
    total_followers: int
    total_spent: float
    average_ctr: float
    average_conversion_rate: float
    success_rate: float
    campaigns_by_status: Dict[str, int]
    top_performing_campaigns: List[AdCampaignResponse]

# ============================================
# SCHOOL MANAGEMENT MODELS
# ============================================

class School(Base):
    """Verified/approved schools"""
    __tablename__ = 'schools'

    id = Column(Integer, primary_key=True, index=True)
    school_name = Column(String(255), nullable=False)
    school_type = Column(String(100), nullable=False)
    school_level = Column(String(100), nullable=False)
    location = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    phone = Column(String(50), nullable=False)
    students_count = Column(Integer, default=0)
    rating = Column(Float, default=0.0)
    established_year = Column(Integer)
    principal = Column(String(255))
    documents = Column(JSON)
    approved_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default='Verified')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ============================================
# PYDANTIC SCHEMAS FOR SCHOOLS
# ============================================

class SchoolBase(BaseModel):
    school_name: str
    school_type: str
    school_level: str
    location: str
    email: Optional[str] = None
    phone: Optional[str] = None
    students_count: Optional[int] = 0

class SchoolCreate(SchoolBase):
    rating: Optional[float] = 0.0
    established_year: Optional[int] = None
    principal: Optional[str] = None
    documents: Optional[List[Dict[str, Any]]] = []

class SchoolUpdate(BaseModel):
    school_name: Optional[str] = None
    school_type: Optional[str] = None
    school_level: Optional[str] = None
    location: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    students_count: Optional[int] = None
    rating: Optional[float] = None
    established_year: Optional[int] = None
    principal: Optional[str] = None

class SchoolResponse(SchoolBase):
    id: int
    rating: float
    established_year: Optional[int] = None
    principal: Optional[str] = None
    documents: Optional[List[Dict[str, Any]]] = []
    approved_date: datetime
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class SchoolActionRequest(BaseModel):
    reason: Optional[str] = None

# ============================================
# TUTOR-RELATED TABLES
# ============================================

class EnrolledStudent(Base):
    """
    Track enrolled students - simplified enrollment relationship
    """
    __tablename__ = 'enrolled_students'

    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey('tutor_profiles.id', ondelete='CASCADE'), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey('student_profiles.id', ondelete='CASCADE'), nullable=False, index=True)
    package_name = Column(String(255), nullable=True)  # Name of the package/course
    session_request_id = Column(Integer, nullable=True)  # Reference to original session request
    enrolled_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class TutorAnalysis(Base):
    """
    Track tutor analytics and performance metrics
    """
    __tablename__ = 'tutor_analysis'

    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)

    # Profile visit metrics
    total_profile_visits = Column(Integer, default=0)
    unique_visitors = Column(Integer, default=0)
    visits_this_month = Column(Integer, default=0)
    visits_this_week = Column(Integer, default=0)

    # Performance metrics
    success_rate = Column(Float, default=0.0)  # Percentage (0-100)
    average_response_time = Column(Float, default=0.0)  # In hours
    total_sessions_completed = Column(Integer, default=0)
    total_sessions_cancelled = Column(Integer, default=0)

    # Rating metrics
    average_rating = Column(Float, default=0.0)  # Overall average rating
    total_reviews = Column(Integer, default=0)
    avg_subject_understanding_rating = Column(Float, default=0.0)
    avg_communication_rating = Column(Float, default=0.0)
    avg_discipline_rating = Column(Float, default=0.0)
    avg_punctuality_rating = Column(Float, default=0.0)

    # Engagement metrics
    total_students = Column(Integer, default=0)
    current_students = Column(Integer, default=0)
    alumni_students = Column(Integer, default=0)
    total_requests = Column(Integer, default=0)
    improvement_rate = Column(Float, default=0.0)  # Percentage (0-100)

    # Revenue metrics (optional)
    total_earnings = Column(Float, default=0.0)  # In ETB
    earnings_this_month = Column(Float, default=0.0)

    # Additional analytics data (flexible JSON field)
    analytics_data = Column(JSON, nullable=True)  # For future metrics

    # Timestamps
    last_visit_update = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Document(Base):
    """
    Store teaching/learning documents (PDFs, worksheets, assignments, etc.)
    Connected to Backblaze B2 for file storage.
    Can be uploaded by tutors, students, parents, or other roles.

    Note: For credentials (achievements, experience, certificates), use 'credentials' table.
    """
    __tablename__ = 'documents'

    id = Column(Integer, primary_key=True, index=True)
    uploader_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    uploader_role = Column(String(50), nullable=False, index=True)  # 'tutor', 'student', 'parent', 'admin'

    # Document details
    title = Column(String(255), nullable=False)
    subject = Column(String(100), nullable=True, index=True)  # Related subject
    category = Column(String(100), nullable=True, index=True)  # 'lecture', 'worksheet', 'assignment', 'reference', etc.
    grade_level = Column(String(50), nullable=True)  # Target grade level
    description = Column(Text, nullable=True)

    # File details (Backblaze B2)
    file_url = Column(String(500), nullable=False)  # Full Backblaze B2 URL
    file_name = Column(String(255), nullable=False)  # Original filename
    file_size = Column(Integer, nullable=True)  # File size in bytes
    file_type = Column(String(100), nullable=True)  # MIME type (e.g., 'application/pdf')
    thumbnail = Column(String(500), nullable=True)  # Thumbnail URL for preview

    # Timestamps
    upload_date = Column(DateTime, default=datetime.utcnow)
    modification_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Metadata
    tags = Column(JSON, nullable=True)  # Array of tags for searchability

    # Access control
    visibility = Column(String(20), default='private')  # 'private', 'students_only', 'public'
    download_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)

    # Engagement
    likes = Column(Integer, default=0)
    dislikes = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    saves = Column(Integer, default=0)
    comments = Column(JSON, default=[])  # JSON array for comments

    # Status
    status = Column(String(20), default='active', index=True)  # 'active', 'archived', 'deleted'


class Video(Base):
    """
    Store video content (lectures, tutorials, etc.)
    Connected to Backblaze B2 for file storage.
    """
    __tablename__ = 'videos'

    id = Column(Integer, primary_key=True, index=True)
    uploader_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    uploader_role = Column(String(50), nullable=False, index=True)  # 'tutor', 'student', 'parent', 'admin'

    # Video details
    title = Column(String(255), nullable=False)
    subject = Column(String(100), nullable=True, index=True)
    category = Column(String(100), nullable=True, index=True)  # 'lecture', 'tutorial', 'demo', etc.
    grade_level = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    duration = Column(Integer, nullable=True)  # Duration in seconds

    # File details (Backblaze B2)
    file_url = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=True)
    file_type = Column(String(100), nullable=True)  # e.g., 'video/mp4'
    thumbnail = Column(String(500), nullable=True)

    # Timestamps
    upload_date = Column(DateTime, default=datetime.utcnow)
    modification_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Metadata
    tags = Column(JSON, nullable=True)

    # Access control
    visibility = Column(String(20), default='private')
    download_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)

    # Engagement
    likes = Column(Integer, default=0)
    dislikes = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    saves = Column(Integer, default=0)
    comments = Column(JSON, default=[])  # JSON array for comments

    # Status
    status = Column(String(20), default='active', index=True)


class Image(Base):
    """
    Store image content (diagrams, charts, educational images, etc.)
    Connected to Backblaze B2 for file storage.
    """
    __tablename__ = 'images'

    id = Column(Integer, primary_key=True, index=True)
    uploader_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    uploader_role = Column(String(50), nullable=False, index=True)

    # Image details
    title = Column(String(255), nullable=False)
    subject = Column(String(100), nullable=True, index=True)
    category = Column(String(100), nullable=True, index=True)  # 'diagram', 'chart', 'infographic', etc.
    grade_level = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    width = Column(Integer, nullable=True)  # Image width in pixels
    height = Column(Integer, nullable=True)  # Image height in pixels

    # File details (Backblaze B2)
    file_url = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=True)
    file_type = Column(String(100), nullable=True)  # e.g., 'image/png', 'image/jpeg'
    thumbnail = Column(String(500), nullable=True)

    # Timestamps
    upload_date = Column(DateTime, default=datetime.utcnow)
    modification_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Metadata
    tags = Column(JSON, nullable=True)

    # Access control
    visibility = Column(String(20), default='private')
    download_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)

    # Engagement
    likes = Column(Integer, default=0)
    dislikes = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    saves = Column(Integer, default=0)
    comments = Column(JSON, default=[])  # JSON array for comments

    # Status
    status = Column(String(20), default='active', index=True)


class Audio(Base):
    """
    Store audio content (lectures, podcasts, language lessons, etc.)
    Connected to Backblaze B2 for file storage.
    """
    __tablename__ = 'audios'

    id = Column(Integer, primary_key=True, index=True)
    uploader_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    uploader_role = Column(String(50), nullable=False, index=True)

    # Audio details
    title = Column(String(255), nullable=False)
    subject = Column(String(100), nullable=True, index=True)
    category = Column(String(100), nullable=True, index=True)  # 'lecture', 'podcast', 'language', etc.
    grade_level = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    duration = Column(Integer, nullable=True)  # Duration in seconds

    # File details (Backblaze B2)
    file_url = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=True)
    file_type = Column(String(100), nullable=True)  # e.g., 'audio/mp3', 'audio/wav'
    thumbnail = Column(String(500), nullable=True)  # Cover art

    # Timestamps
    upload_date = Column(DateTime, default=datetime.utcnow)
    modification_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Metadata
    tags = Column(JSON, nullable=True)

    # Access control
    visibility = Column(String(20), default='private')
    download_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)

    # Engagement
    likes = Column(Integer, default=0)
    dislikes = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    saves = Column(Integer, default=0)
    comments = Column(JSON, default=[])  # JSON array for comments

    # Status
    status = Column(String(20), default='active', index=True)


# Legacy aliases for backward compatibility
LearningMaterial = Document
Resource = Document

# ============================================
# PYDANTIC SCHEMAS FOR TUTOR-RELATED TABLES
# ============================================

class TutorStudentBase(BaseModel):
    student_type: str = 'current'  # 'current' or 'alumni'
    courses: Optional[List[str]] = None

class TutorStudentCreate(TutorStudentBase):
    student_id: int

class TutorStudentUpdate(BaseModel):
    student_type: Optional[str] = None
    courses: Optional[List[str]] = None
    status: Optional[str] = None
    completion_date: Optional[datetime] = None

class TutorStudentResponse(TutorStudentBase):
    id: int
    tutor_id: int
    student_id: int
    enrollment_date: datetime
    completion_date: Optional[datetime] = None
    total_sessions: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class StudentTutorBase(BaseModel):
    tutor_type: str = 'current'  # 'current' or 'past'
    courses: Optional[List[str]] = None

class StudentTutorCreate(StudentTutorBase):
    tutor_id: int

class StudentTutorUpdate(BaseModel):
    tutor_type: Optional[str] = None
    courses: Optional[List[str]] = None
    status: Optional[str] = None
    completion_date: Optional[datetime] = None

class StudentTutorResponse(StudentTutorBase):
    id: int
    student_id: int
    tutor_id: int
    enrollment_date: datetime
    completion_date: Optional[datetime] = None
    total_sessions: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TutorAnalysisResponse(BaseModel):
    id: int
    tutor_id: int

    # Profile visit metrics
    total_profile_visits: int
    unique_visitors: int
    visits_this_month: int
    visits_this_week: int

    # Performance metrics
    success_rate: float
    average_response_time: float
    total_sessions_completed: int
    total_sessions_cancelled: int

    # Rating metrics
    average_rating: float
    total_reviews: int
    avg_subject_understanding_rating: float
    avg_communication_rating: float
    avg_discipline_rating: float
    avg_punctuality_rating: float

    # Engagement metrics
    total_students: int
    current_students: int
    alumni_students: int
    total_requests: int
    improvement_rate: float

    # Revenue metrics
    total_earnings: float
    earnings_this_month: float

    # Additional data
    analytics_data: Optional[Dict[str, Any]] = None
    last_visit_update: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ============================================
# DOCUMENT PYDANTIC SCHEMAS (Teaching/Learning Materials)
# ============================================

class DocumentBase(BaseModel):
    title: str
    subject: Optional[str] = None
    category: Optional[str] = None
    grade_level: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    visibility: str = 'private'  # 'private', 'students_only', 'public'

class DocumentCreate(DocumentBase):
    uploader_role: str  # 'tutor', 'student', 'parent', 'admin'
    file_url: str
    file_name: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    thumbnail: Optional[str] = None

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    category: Optional[str] = None
    grade_level: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    visibility: Optional[str] = None
    thumbnail: Optional[str] = None
    status: Optional[str] = None

class DocumentResponse(DocumentBase):
    id: int
    uploader_id: int
    uploader_role: str
    file_url: str
    file_name: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    thumbnail: Optional[str] = None
    upload_date: datetime
    modification_date: datetime
    download_count: int
    view_count: int
    likes: int = 0
    dislikes: int = 0
    shares: int = 0
    saves: int = 0
    comments: Optional[List] = []
    status: str

    class Config:
        from_attributes = True

# Legacy aliases for backward compatibility
LearningMaterialBase = DocumentBase
LearningMaterialCreate = DocumentCreate
LearningMaterialUpdate = DocumentUpdate
LearningMaterialResponse = DocumentResponse
ResourceBase = DocumentBase
ResourceCreate = DocumentCreate
ResourceUpdate = DocumentUpdate
ResourceResponse = DocumentResponse

# ============================================
# VIDEO PYDANTIC SCHEMAS
# ============================================

class VideoBase(BaseModel):
    title: str
    subject: Optional[str] = None
    category: Optional[str] = None
    grade_level: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None  # Duration in seconds
    tags: Optional[List[str]] = None
    visibility: str = 'private'

class VideoCreate(VideoBase):
    uploader_role: str
    file_url: str
    file_name: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    thumbnail: Optional[str] = None

class VideoUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    category: Optional[str] = None
    grade_level: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    tags: Optional[List[str]] = None
    visibility: Optional[str] = None
    thumbnail: Optional[str] = None
    status: Optional[str] = None

class VideoResponse(VideoBase):
    id: int
    uploader_id: int
    uploader_role: str
    file_url: str
    file_name: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    thumbnail: Optional[str] = None
    upload_date: datetime
    modification_date: datetime
    download_count: int
    view_count: int
    likes: int = 0
    dislikes: int = 0
    shares: int = 0
    saves: int = 0
    comments: Optional[List] = []
    status: str

    class Config:
        from_attributes = True

# ============================================
# IMAGE PYDANTIC SCHEMAS
# ============================================

class ImageBase(BaseModel):
    title: str
    subject: Optional[str] = None
    category: Optional[str] = None
    grade_level: Optional[str] = None
    description: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    tags: Optional[List[str]] = None
    visibility: str = 'private'

class ImageCreate(ImageBase):
    uploader_role: str
    file_url: str
    file_name: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    thumbnail: Optional[str] = None

class ImageUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    category: Optional[str] = None
    grade_level: Optional[str] = None
    description: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    tags: Optional[List[str]] = None
    visibility: Optional[str] = None
    thumbnail: Optional[str] = None
    status: Optional[str] = None

class ImageResponse(ImageBase):
    id: int
    uploader_id: int
    uploader_role: str
    file_url: str
    file_name: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    thumbnail: Optional[str] = None
    upload_date: datetime
    modification_date: datetime
    download_count: int
    view_count: int
    likes: int = 0
    dislikes: int = 0
    shares: int = 0
    saves: int = 0
    comments: Optional[List] = []
    status: str

    class Config:
        from_attributes = True

# ============================================
# AUDIO PYDANTIC SCHEMAS
# ============================================

class AudioBase(BaseModel):
    title: str
    subject: Optional[str] = None
    category: Optional[str] = None
    grade_level: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None  # Duration in seconds
    tags: Optional[List[str]] = None
    visibility: str = 'private'

class AudioCreate(AudioBase):
    uploader_role: str
    file_url: str
    file_name: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    thumbnail: Optional[str] = None  # Cover art

class AudioUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    category: Optional[str] = None
    grade_level: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    tags: Optional[List[str]] = None
    visibility: Optional[str] = None
    thumbnail: Optional[str] = None
    status: Optional[str] = None

class AudioResponse(AudioBase):
    id: int
    uploader_id: int
    uploader_role: str
    file_url: str
    file_name: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    thumbnail: Optional[str] = None
    upload_date: datetime
    modification_date: datetime
    download_count: int
    view_count: int
    likes: int = 0
    dislikes: int = 0
    shares: int = 0
    saves: int = 0
    comments: Optional[List] = []
    status: str

    class Config:
        from_attributes = True

# ============================================================================
# BLOG MODEL
# ============================================================================

class Blog(Base):
    __tablename__ = "blogs"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, nullable=False, index=True)
    role = Column(String, nullable=False, index=True)
    blog_picture = Column(Text, nullable=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    blog_text = Column(Text, nullable=False)
    reading_time = Column(Integer, default=5)
    category = Column(String(100), default='tutorial', index=True)

    # Engagement
    likes = Column(Integer, default=0)
    dislikes = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    saves = Column(Integer, default=0)
    comments = Column(Text, default='[]')  # JSON string

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Club(Base):
    __tablename__ = "clubs"

    id = Column(Integer, primary_key=True, index=True)
    created_by = Column(Integer, ForeignKey('users.id'))
    club_picture = Column(Text)
    title = Column(String(200))
    category = Column(String(100))
    description = Column(Text)
    member_limit = Column(Integer)
    member_count = Column(Integer, default=0)
    membership_type = Column(String(50))
    is_paid = Column(Boolean, default=False)
    membership_fee = Column(Float, default=0.0)
    subjects = Column(JSON)
    meeting_schedule = Column(String(200))
    meeting_location = Column(String(200))
    rules = Column(Text)
    status = Column(String(50), default='active')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    joined_status = Column(Boolean, default=False)
    creator_type = Column(String(50))

class ClubMember(Base):
    __tablename__ = "club_members"

    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey('clubs.id', ondelete='CASCADE'))
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    role = Column(String(50), default='member')
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    created_by = Column(Integer, ForeignKey('users.id'))
    event_picture = Column(Text)
    title = Column(String(200))
    type = Column(String(100))
    description = Column(Text)
    location = Column(String(200))
    is_online = Column(Boolean, default=False)
    start_datetime = Column(DateTime(timezone=True))
    end_datetime = Column(DateTime(timezone=True))
    available_seats = Column(Integer)
    registered_count = Column(Integer, default=0)
    price = Column(Float, default=0.0)
    subjects = Column(JSON)
    grade_levels = Column(JSON)
    requirements = Column(Text)
    status = Column(String(50), default='upcoming')
    registration_deadline = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    joined_status = Column(Boolean, default=False)
    creator_type = Column(String(50))

class EventAttendee(Base):
    __tablename__ = "event_attendees"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey('events.id', ondelete='CASCADE'))
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    status = Column(String(50), default='registered')
    registered_at = Column(DateTime(timezone=True), server_default=func.now())

class StudentReview(Base):
    __tablename__ = "student_reviews"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('student_profiles.id'))
    reviewer_id = Column(Integer, ForeignKey('users.id'))
    reviewer_role = Column(String(50))
    subject_understanding = Column(Float)  # Matches DB column name
    communication_skills = Column(Float)
    discipline = Column(Float)
    punctuality = Column(Float)
    class_activity = Column(Float)  # 5th behavioral category
    rating = Column(Float)  # Calculated as average of 5 categories
    review_title = Column(String(200))
    review_text = Column(Text)
    review_type = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_featured = Column(Boolean, default=False)
    helpful_count = Column(Integer, default=0)

class ParentReview(Base):
    """
    Parent Review System - 4-Factor Rating System

    This table stores reviews for parents from tutors, assessing parent engagement
    and professionalism in the educational ecosystem.

    Rating Factors:
    1. Engagement with Tutor - How involved and communicative the parent is with the tutor
    2. Engagement with Child - How involved the parent is with their child's education
    3. Responsiveness - How quickly the parent responds to messages, requests, and updates
    4. Payment Consistency - How consistent and reliable the parent is with payments
    """
    __tablename__ = "parent_reviews"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("parent_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_id = Column(Integer, nullable=False)  # References tutor_profiles or other relevant profile tables
    user_role = Column(String(20), nullable=False)  # 'tutor', 'admin', etc.

    # Review Details
    rating = Column(Float, nullable=False)  # Overall rating (average of 4 factors)
    title = Column(String(255))
    review_text = Column(Text, nullable=False)

    # Detailed Ratings (4-Factor Rating System for Parents)
    engagement_with_tutor_rating = Column(Float, default=0.0)  # How involved the parent is with the tutor
    engagement_with_child_rating = Column(Float, default=0.0)  # How involved the parent is with their child's education
    responsiveness_rating = Column(Float, default=0.0)  # How quickly the parent responds
    payment_consistency_rating = Column(Float, default=0.0)  # How consistent the parent is with payments

    # Metadata
    is_verified = Column(Boolean, default=False)
    helpful_count = Column(Integer, default=0)
    is_featured = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    parent = relationship("ParentProfile", back_populates="reviews")

# Create all tables
Base.metadata.create_all(bind=engine)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()