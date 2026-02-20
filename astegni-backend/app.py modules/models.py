"""
Database and Pydantic models for Astegni Educational Platform
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Column, Integer, String, DateTime, Float, Boolean, Text, JSON,
    ForeignKey, Date, Time, Numeric, create_engine, func
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
    first_name = Column(String, nullable=True)
    father_name = Column(String, nullable=True)  # Ethiopian naming convention - OPTIONAL
    grandfather_name = Column(String, nullable=True)  # Ethiopian naming convention - OPTIONAL
    last_name = Column(String, nullable=True)  # International naming convention - OPTIONAL
    # username removed - now stored in role-specific profile tables (tutor_profiles, student_profiles, etc.)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=False)

    # Multi-role support - NO DEFAULT (users register without roles, add roles later)
    roles = Column(JSON, nullable=True)
    active_role = Column(String, nullable=True)

    # Shared Profile Fields - Required for full platform access
    gender = Column(String)  # Required for full access
    date_of_birth = Column(Date, nullable=True)  # Required for full access
    digital_id_no = Column(String(50), nullable=True)  # Ethiopian Digital ID, required for full access

    # Shared Media & Social Fields (CANONICAL - Use these instead of role-specific tables)
    profile_picture = Column(String, nullable=True)  # User's profile picture URL
    location = Column(String, nullable=True)  # User's location (city, country)
    display_location = Column(Boolean, default=False)  # Show location on public profile (default: hidden for privacy)
    country_code = Column(String(10), nullable=True)  # ISO country code (e.g., 'ET', 'US', 'GB') - auto-detected from GPS
    currency = Column(String(10), nullable=True)  # Currency code (e.g., 'ETB', 'USD', 'EUR') - auto-detected from country
    social_links = Column(JSON, default={}, nullable=True)  # {"facebook": "url", "twitter": "url", etc.}
    languages = Column(JSON, default=[], nullable=True)  # Array of languages spoken ["English", "Amharic", etc.]
    hobbies = Column(JSON, default=[], nullable=True)  # Array of hobbies/interests ["Reading", "Sports", etc.]

    # DEPRECATED - Keep for backward compatibility but don't use in new code
    bio = Column(Text)  # DEPRECATED - use role-specific tables for role-specific bios

    # Status
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)

    # Identity Verification (CANONICAL)
    # This is the single source of truth for user verification status
    is_verified = Column(Boolean, default=False)  # User's identity has been verified
    verified_at = Column(DateTime, nullable=True)  # When user was verified
    verification_method = Column(String(20), nullable=True)  # 'kyc', 'manual', 'admin', 'profile_tutor', etc.
    verification_status = Column(String(20), nullable=True)  # 'pending', 'approved', 'rejected'
    rejected_at = Column(DateTime, nullable=True)  # When verification was rejected

    # Account Suspension (CANONICAL)
    is_suspended = Column(Boolean, default=False)  # Account is suspended
    suspended_at = Column(DateTime, nullable=True)  # When account was suspended
    suspension_reason = Column(Text, nullable=True)  # Reason for suspension
    suspended_by = Column(Integer, nullable=True)  # Admin user ID who suspended

    # KYC (Know Your Customer) Verification - DEPRECATED in favor of is_verified
    # Kept for backward compatibility - use is_verified instead in new code
    kyc_verified = Column(Boolean, default=False)  # DEPRECATED: Use is_verified
    kyc_verified_at = Column(DateTime, nullable=True)  # DEPRECATED: Use verified_at
    kyc_verification_id = Column(Integer, nullable=True)  # FK to kyc_verifications

    # Note: Two-Factor Authentication (2FA) is ROLE-BASED
    # TFA columns are on profile tables (tutor_profiles, student_profiles, parent_profiles, advertiser_profiles)
    # Each role can have independent 2FA settings

    # Account Settings
    has_password = Column(Boolean, default=True)  # False for OAuth-only users
    export_verification_code = Column(String, nullable=True)
    export_verification_expiry = Column(DateTime, nullable=True)

    # OAuth/Social Login Fields
    google_email = Column(String, nullable=True)  # Email used for Google OAuth (can differ from primary email)
    oauth_provider = Column(String(20), nullable=True)  # 'google', 'facebook', 'apple', etc.

    # Account Deletion
    account_status = Column(String, default='active')  # 'active', 'pending_deletion', 'deleted'
    deactivated_at = Column(DateTime, nullable=True)
    scheduled_deletion_at = Column(DateTime, nullable=True)

    # Account Balance (for payments)
    account_balance = Column(Numeric(10, 2), default=0.00)  # User's account balance in ETB

    # Subscription (User-based, not role-based)
    # References subscription_plans.id in admin database
    subscription_plan_id = Column(Integer, nullable=True)  # ID from subscription_plans table in admin_db
    subscription_started_at = Column(DateTime, nullable=True)  # When subscription started
    subscription_expires_at = Column(DateTime, nullable=True)  # When subscription expires

    # Appearance Settings (User preferences for UI customization)
    theme = Column(String(20), default='light')  # light/dark/system
    color_palette = Column(String(50), default='emerald-gold-charcoal')  # Color palette selection
    font_family = Column(String(50), default='patrick-hand')  # system/inter/roboto/open-sans/comic-neue/caveat/patrick-hand/dancing-script
    font_size = Column(Integer, default=16)  # Font size in pixels (12-20)
    display_density = Column(String(20), default='comfortable')  # compact/comfortable/spacious
    accent_color = Column(String(20), default='indigo')  # Accent color selection
    enable_animations = Column(Boolean, default=True)  # Enable UI animations
    reduce_motion = Column(Boolean, default=False)  # Reduce motion for accessibility
    sidebar_position = Column(String(20), default='left')  # left/right

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)

    # Relationships
    tutor_profile = relationship("TutorProfile", back_populates="user", uselist=False)
    user_profile = relationship("UserProfile", back_populates="user", uselist=False)
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False)
    parent_profile = relationship("ParentProfile", back_populates="user", uselist=False)
    refresh_tokens = relationship("RefreshToken", back_populates="user")
    playlists = relationship("Playlist", back_populates="user")

    @property
    def profile_complete(self) -> bool:
        """Check if user has completed required profile fields (DOB, gender, and digital ID)"""
        return (
            self.date_of_birth is not None and
            self.gender is not None and
            self.digital_id_no is not None and
            len(self.digital_id_no.strip()) > 0
        )

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

    # NOTE: Professional Info moved to users table
    # location moved to users.location
    # languages moved to users.languages

    # Experience & Qualifications
    expertise_badge = Column(String, default='Tutor')  # Expert, Intermediate, Beginner, Tutor

    # Hero Section
    hero_titles = Column(JSON, default=["Excellence in Education, Delivered with Passion"])  # Array of hero titles (cycled through)
    hero_subtitle = Column(Text, default="Empowering students through personalized learning and expert guidance")

    # Status
    # NOTE: Verification columns moved to users table (users.is_verified, users.verification_status, etc.)
    # NOTE: Suspension columns moved to users table (users.is_suspended, users.suspension_reason, etc.)
    is_active = Column(Boolean, default=True)
    is_basic = Column(Boolean, default=False)  # Basic tutor status
    scheduled_deletion_at = Column(DateTime, nullable=True)  # Role scheduled for deletion

    # NOTE: Subscription fields moved to users table (users.subscription_plan_id, etc.)
    # Subscriptions are now user-based, not role-based

    # Media
    # NOTE: profile_picture moved to users.profile_picture
    cover_image = Column(String)

    # NOTE: Social Media Links moved to users table (users.social_links)

    # Two-Factor Authentication (2FA) - Role-specific
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_method = Column(String, nullable=True)  # 'email', 'authenticator', 'inapp'
    two_factor_secret = Column(String, nullable=True)  # TOTP secret for authenticator
    two_factor_backup_codes = Column(Text, nullable=True)  # Comma-separated backup codes
    two_factor_temp_code = Column(String, nullable=True)  # Temporary OTP code
    two_factor_temp_expiry = Column(DateTime, nullable=True)  # OTP expiry time
    two_factor_inapp_password = Column(String, nullable=True)  # Separate password hash for in-app 2FA
    two_factor_verification_token = Column(String, nullable=True)  # Temporary token for protected actions
    two_factor_verification_expiry = Column(DateTime, nullable=True)  # Verification token expiry
    two_factor_protected_panels = Column(JSON, nullable=True)  # List of panel IDs that require 2FA

    # Online Status (for whiteboard video calls)
    is_online = Column(Boolean, default=False)  # Whether tutor is currently online
    last_seen = Column(DateTime, nullable=True)  # Last time tutor was seen online

    # Trending/Popularity Tracking
    search_count = Column(Integer, default=0)  # Total number of times searched/viewed
    trending_score = Column(Float, default=0.0)  # Time-weighted trending score
    last_search_increment = Column(DateTime, nullable=True)  # Last search increment timestamp

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

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Profile Display Fields
    # NOTE: profile_picture moved to users.profile_picture
    cover_image = Column(String)
    username = Column(String, unique=True, index=True)
    hero_title = Column(Text)
    hero_subtitle = Column(Text)
    quote = Column(Text)
    about = Column(Text)

    # Personal Information
    interested_in = Column(ARRAY(String), default=[])  # Array of interests
    # NOTE: location moved to users.location
    # NOTE: languages moved to users.languages (JSON)
    # NOTE: social_links moved to users.social_links (JSON)

    # Status Fields
    is_active = Column(Boolean, default=True)
    scheduled_deletion_at = Column(DateTime, nullable=True)  # Role scheduled for deletion
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime, nullable=True)

    # Two-Factor Authentication
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_method = Column(String, nullable=True)  # 'email', 'sms', 'authenticator', 'inapp'
    two_factor_secret = Column(String, nullable=True)  # For authenticator apps
    two_factor_inapp_password = Column(String, nullable=True)  # For in-app password
    two_factor_backup_codes = Column(Text, nullable=True)  # JSON array of backup codes
    two_factor_temp_code = Column(String, nullable=True)  # Temporary code for email/sms
    two_factor_temp_expiry = Column(DateTime, nullable=True)  # Expiry for temp code
    two_factor_verification_token = Column(String, nullable=True)  # Token for verification
    two_factor_verification_expiry = Column(DateTime, nullable=True)  # Token expiry
    two_factor_protected_panels = Column(JSON, nullable=True)  # Which panels require 2FA

    # NOTE: Subscription fields moved to users table (users.subscription_plan_id, etc.)
    # Subscriptions are now user-based, not role-based

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="user_profile")

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Basic Info
    username = Column(String, unique=True, index=True)  # Role-specific username
    # NOTE: location moved to users.location

    # Hero Section (NEW)
    hero_title = Column(ARRAY(String), default=[])  # Multiple hero titles
    hero_subtitle = Column(ARRAY(String), default=[])  # Multiple hero subtitles

    # Media
    # NOTE: profile_picture moved to users.profile_picture
    cover_image = Column(String)

    # Academic Info
    grade_level = Column(String)
    studying_at = Column(String)  # Renamed from school_name
    career_aspirations = Column(Text)

    # Subjects & Interests (restructured as arrays)
    interested_in = Column(ARRAY(String), default=[])  # Renamed from subjects
    # NOTE: hobbies moved to users.hobbies
    # NOTE: languages moved to users.languages

    # Learning Preferences
    learning_method = Column(ARRAY(String), default=[])  # Renamed from learning_style, now array

    # Personal Info
    quote = Column(ARRAY(String), default=[])  # Now supports multiple quotes
    about = Column(Text)  # Renamed from bio

    # Parent Relationships
    parent_id = Column(ARRAY(Integer), default=[])  # Array of parent_profiles.id (NOT user.id) who can manage this student

    # Status
    is_active = Column(Boolean, default=True)
    scheduled_deletion_at = Column(DateTime, nullable=True)  # Role scheduled for deletion

    # Two-Factor Authentication (2FA) - Role-specific
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_method = Column(String, nullable=True)  # 'email', 'authenticator', 'inapp'
    two_factor_secret = Column(String, nullable=True)  # TOTP secret for authenticator
    two_factor_backup_codes = Column(Text, nullable=True)  # Comma-separated backup codes
    two_factor_temp_code = Column(String, nullable=True)  # Temporary OTP code
    two_factor_temp_expiry = Column(DateTime, nullable=True)  # OTP expiry time
    two_factor_inapp_password = Column(String, nullable=True)  # Separate password hash for in-app 2FA
    two_factor_verification_token = Column(String, nullable=True)  # Temporary token for protected actions
    two_factor_verification_expiry = Column(DateTime, nullable=True)  # Verification token expiry
    two_factor_protected_panels = Column(JSON, nullable=True)  # List of panel IDs that require 2FA

    # Online Status (for whiteboard video calls)
    is_online = Column(Boolean, default=False)  # Whether student is currently online
    last_seen = Column(DateTime, nullable=True)  # Last time student was seen online

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

    # NOTE: location moved to users table (users.location)

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
    # NOTE: Verification columns moved to users table (users.is_verified, users.verification_status, etc.)
    is_active = Column(Boolean, default=True)
    scheduled_deletion_at = Column(DateTime, nullable=True)  # Role scheduled for deletion
    profile_complete = Column(Boolean, default=False)
    profile_completion = Column(Float, default=0.0)

    # Media
    # NOTE: profile_picture moved to users table (users.profile_picture)
    cover_image = Column(String)

    # Hero Section
    hero_title = Column(ARRAY(String), default=[])  # Array of hero title lines
    hero_subtitle = Column(Text)  # Single hero subtitle

    # Two-Factor Authentication (2FA) - Role-specific
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_method = Column(String, nullable=True)  # 'email', 'authenticator', 'inapp'
    two_factor_secret = Column(String, nullable=True)  # TOTP secret for authenticator
    two_factor_backup_codes = Column(Text, nullable=True)  # Comma-separated backup codes
    two_factor_temp_code = Column(String, nullable=True)  # Temporary OTP code
    two_factor_temp_expiry = Column(DateTime, nullable=True)  # OTP expiry time
    two_factor_inapp_password = Column(String, nullable=True)  # Separate password hash for in-app 2FA
    two_factor_verification_token = Column(String, nullable=True)  # Temporary token for protected actions
    two_factor_verification_expiry = Column(DateTime, nullable=True)  # Verification token expiry
    two_factor_protected_panels = Column(JSON, nullable=True)  # List of panel IDs that require 2FA

    # Online Status (for whiteboard video calls)
    is_online = Column(Boolean, default=False)  # Whether parent is currently online
    last_seen = Column(DateTime, nullable=True)  # Last time parent was seen online

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

    # NOTE: location moved to users.location (VARCHAR)
    # NOTE: socials moved to users.social_links (JSON)

    # Media
    # NOTE: profile_picture moved to users.profile_picture
    cover_image = Column(String)

    # Hero section content (arrays for multiple lines)
    hero_title = Column(ARRAY(String), default=[])  # ["Title Line 1", "Title Line 2"]
    hero_subtitle = Column(ARRAY(String), default=[])  # ["Subtitle Line 1", "Subtitle Line 2"]

    # Status & Verification
    # NOTE: Verification columns moved to users table (users.is_verified, users.verification_status, etc.)
    is_active = Column(Boolean, default=True)
    scheduled_deletion_at = Column(DateTime, nullable=True)  # Role scheduled for deletion

    # Membership date
    joined_in = Column(Date)

    # Two-Factor Authentication (2FA) - Role-specific
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_method = Column(String, nullable=True)  # 'email', 'authenticator', 'inapp'
    two_factor_secret = Column(String, nullable=True)  # TOTP secret for authenticator
    two_factor_backup_codes = Column(Text, nullable=True)  # Comma-separated backup codes
    two_factor_temp_code = Column(String, nullable=True)  # Temporary OTP code
    two_factor_temp_expiry = Column(DateTime, nullable=True)  # OTP expiry time
    two_factor_inapp_password = Column(String, nullable=True)  # Separate password hash for in-app 2FA
    two_factor_verification_token = Column(String, nullable=True)  # Temporary token for protected actions
    two_factor_verification_expiry = Column(DateTime, nullable=True)  # Verification token expiry
    two_factor_protected_panels = Column(JSON, nullable=True)  # List of panel IDs that require 2FA

    # Company Verification Fields
    company_name = Column(String(255), nullable=True)
    industry = Column(String(100), nullable=True)
    company_size = Column(String(50), nullable=True)
    business_reg_no = Column(String(100), nullable=True)
    tin_number = Column(String(50), nullable=True)
    website = Column(String(500), nullable=True)
    company_email = Column(JSON, default=[])  # JSON array of company emails
    company_phone = Column(JSON, default=[])  # JSON array of company phones
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    company_description = Column(Text, nullable=True)
    company_logo = Column(String(500), nullable=True)
    business_license_url = Column(String(500), nullable=True)
    tin_certificate_url = Column(String(500), nullable=True)
    additional_docs_urls = Column(JSON, default=[])
    # NOTE: verification_status moved to users table (users.verification_status)
    verification_submitted_at = Column(DateTime, nullable=True)
    verification_reviewed_at = Column(DateTime, nullable=True)
    verification_notes = Column(Text, nullable=True)

    # Online Status (for whiteboard video calls)
    is_online = Column(Boolean, default=False)  # Whether advertiser is currently online
    last_seen = Column(DateTime, nullable=True)  # Last time advertiser was seen online

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
# KYC (KNOW YOUR CUSTOMER) VERIFICATION MODELS
# ============================================

class KYCVerification(Base):
    """Main KYC verification record for a user"""
    __tablename__ = "kyc_verifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Verification Status
    status = Column(String(50), nullable=False, default='pending')
    # Status values: pending, in_progress, passed, failed, expired, manual_review

    # Document Information
    document_type = Column(String(50), default='digital_id')
    document_number = Column(String(100))
    document_image_url = Column(Text)
    document_verified = Column(Boolean, default=False)

    # Face Verification
    selfie_image_url = Column(Text)
    face_match_score = Column(Float)
    face_match_passed = Column(Boolean, default=False)
    face_match_threshold = Column(Float, default=0.85)

    # Liveliness Check Results
    liveliness_passed = Column(Boolean, default=False)
    liveliness_score = Column(Float)
    blink_detected = Column(Boolean, default=False)
    smile_detected = Column(Boolean, default=False)
    head_turn_detected = Column(Boolean, default=False)

    # Challenge-Response
    challenge_type = Column(String(50))
    challenge_completed = Column(Boolean, default=False)

    # Verification Details
    verification_method = Column(String(50), default='automated')
    verified_by = Column(Integer)
    rejection_reason = Column(Text)
    notes = Column(Text)

    # Risk Assessment
    risk_score = Column(Float)
    risk_flags = Column(JSON, default=[])

    # Device/Session Info
    device_fingerprint = Column(String(255))
    ip_address = Column(String(45))
    user_agent = Column(Text)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime)
    verified_at = Column(DateTime)

    # Retry tracking
    attempt_count = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    last_attempt_at = Column(DateTime)

    # Relationships
    user = relationship("User", backref="kyc_verifications")
    attempts = relationship("KYCVerificationAttempt", back_populates="verification")


class KYCVerificationAttempt(Base):
    """Individual verification attempt/step"""
    __tablename__ = "kyc_verification_attempts"

    id = Column(Integer, primary_key=True, index=True)
    verification_id = Column(Integer, ForeignKey("kyc_verifications.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Attempt Info
    attempt_number = Column(Integer, nullable=False)
    step = Column(String(50), nullable=False)
    # Steps: document_capture, selfie_capture, liveliness_blink, liveliness_smile, liveliness_turn, face_comparison

    # Captured Data
    image_url = Column(Text)
    image_type = Column(String(50))
    # Types: document_front, document_back, selfie, liveliness_frame

    # Analysis Results
    analysis_result = Column(JSON)

    # Step Status
    status = Column(String(50), nullable=False, default='pending')
    error_message = Column(Text)

    # Timing
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    processing_time_ms = Column(Integer)

    # Device Info
    device_info = Column(JSON)

    # Relationships
    verification = relationship("KYCVerification", back_populates="attempts")


# ============================================
# PYDANTIC MODELS
# ============================================

class UserRegister(BaseModel):
    first_name: Optional[str] = None
    father_name: Optional[str] = None
    grandfather_name: Optional[str] = None  # OPTIONAL for Ethiopian naming convention
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str
    date_of_birth: Optional[date] = None  # Optional at registration, required for full access
    gender: Optional[str] = None  # Optional at registration, required for full access
    role: Optional[str] = None  # NO DEFAULT - users register without roles, add roles later
    department: Optional[str] = None  # For admin role: manage-campaigns, manage-schools, etc.
    referral_code: Optional[str] = None  # Referral code from shared link

    @validator('phone', always=True)
    def check_email_or_phone(cls, v, values):
        # Ensure at least one of email or phone is provided
        email = values.get('email')
        if not email and not v:
            raise ValueError('Either email or phone must be provided')
        return v

    @validator('date_of_birth')
    def validate_dob(cls, v):
        if v is None:
            return v
        # Ensure date is not in the future and user is at least 3 years old
        from datetime import date as date_type
        today = date_type.today()
        if v > today:
            raise ValueError('Date of birth cannot be in the future')
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        if age < 3:
            raise ValueError('User must be at least 3 years old')
        if age > 120:
            raise ValueError('Invalid date of birth')
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
    last_name: Optional[str] = None  # For international naming convention
    name: Optional[str] = None  # Display name (Ethiopian: first+father+grandfather, International: first+last)
    username: Optional[str]
    email: str
    phone: Optional[str]
    date_of_birth: Optional[date] = None  # Required for full access
    gender: Optional[str] = None  # Required for full access
    digital_id_no: Optional[str] = None  # Ethiopian Digital ID, required for full access
    profile_complete: bool = False  # True if DOB, gender, and digital_id_no are set
    kyc_verified: bool = False  # True if identity verified via liveliness check
    roles: List[str]
    active_role: Optional[str] = None
    profile_picture: Optional[str]
    created_at: datetime
    is_active: bool
    email_verified: bool
    role_ids: Optional[dict] = None  # Include role-specific profile IDs
    account_balance: float = 0.0  # User's account balance for payments
    location: Optional[str] = None  # User's location for location-based filtering
    country_code: Optional[str] = None  # ISO country code (e.g., 'ET', 'US', 'GB')
    currency: Optional[str] = None  # Currency code (e.g., 'ETB', 'USD', 'XAF')
    social_links: Optional[dict] = None  # Social media links (TikTok, Instagram, etc.)

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
    location: Optional[str] = None  # Will be saved to users table
    display_location: Optional[bool] = None  # Will be saved to users table
    children_ids: Optional[List[int]] = None  # Array of student_profile.id
    coparent_ids: Optional[List[int]] = None  # Array of co-parent user.id
    email: Optional[str] = None
    phone: Optional[str] = None
    profile_picture: Optional[str] = None  # Will be saved to users table
    cover_image: Optional[str] = None
    hero_title: Optional[List[str]] = None  # Array of hero title lines
    hero_subtitle: Optional[str] = None  # Single hero subtitle
    social_links: Optional[dict] = None  # Will be saved to users table
    languages: Optional[List[str]] = None  # Will be saved to users table

class ParentProfileResponse(BaseModel):
    id: int
    user_id: int
    username: Optional[str] = None
    name: Optional[str] = None
    first_name: Optional[str] = None
    father_name: Optional[str] = None
    grandfather_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    quote: Optional[str] = None
    relationship_type: Optional[str] = None
    location: Optional[str] = None  # From users table
    social_links: Optional[dict] = {}  # From users table
    languages: Optional[List[str]] = []  # From users table
    children_ids: List[int] = []  # Array of student_profile.id
    coparent_ids: List[int] = []  # Array of co-parent user.id
    email: Optional[str] = None
    phone: Optional[str] = None
    total_children: Optional[int] = 0
    rating: Optional[float] = 0.0
    rating_count: Optional[int] = 0
    is_verified: Optional[bool] = False
    profile_picture: Optional[str] = None  # From users table
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
    country_code: Optional[str] = None  # ISO country code (e.g., 'ET', 'US')
    display_location: Optional[bool] = None  # Will be saved to users table
    socials: Optional[dict] = None  # {"website": "", "facebook": "", "twitter": "", etc.}
    profile_picture: Optional[str] = None
    cover_image: Optional[str] = None
    hero_title: Optional[List[str]] = None  # Array for multi-line hero title
    hero_subtitle: Optional[List[str]] = None  # Array for multi-line hero subtitle
    # Company verification fields
    company_name: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    business_reg_no: Optional[str] = None
    tin_number: Optional[str] = None
    website: Optional[str] = None
    company_email: Optional[List[str]] = None  # JSON array of company emails
    company_phone: Optional[List[str]] = None  # JSON array of company phones
    address: Optional[str] = None
    city: Optional[str] = None
    company_description: Optional[str] = None
    company_logo: Optional[str] = None
    business_license_url: Optional[str] = None
    tin_certificate_url: Optional[str] = None
    additional_docs_urls: Optional[List[str]] = None

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
    # Company verification fields
    company_name: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    business_reg_no: Optional[str] = None
    tin_number: Optional[str] = None
    website: Optional[str] = None
    company_email: Optional[List[str]] = []  # JSON array of company emails
    company_phone: Optional[List[str]] = []  # JSON array of company phones
    address: Optional[str] = None
    city: Optional[str] = None
    company_description: Optional[str] = None
    company_logo: Optional[str] = None
    business_license_url: Optional[str] = None
    tin_certificate_url: Optional[str] = None
    additional_docs_urls: Optional[List[str]] = []
    verification_status: Optional[str] = "pending"
    verification_submitted_at: Optional[datetime] = None
    verification_reviewed_at: Optional[datetime] = None
    verification_notes: Optional[str] = None

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
    campaign_budget: Optional[float] = None
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
    campaign_budget: Optional[float] = None
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

    # Trending/Search Tracking
    search_count = Column(Integer, default=0)
    trending_score = Column(Float, default=0.0)
    last_search_increment = Column(DateTime, nullable=True)


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

class Story(Base):
    """
    User stories (Instagram/WhatsApp style)
    Stories expire after 24 hours
    """
    __tablename__ = "stories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    profile_id = Column(Integer, nullable=False, index=True)
    profile_type = Column(String(20), nullable=False, index=True)  # 'tutor', 'student', 'parent', 'advertiser'
    media_url = Column(String(500), nullable=False)
    media_type = Column(String(10), nullable=False)  # 'image', 'video'
    caption = Column(Text, nullable=True)
    views = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    is_active = Column(Boolean, default=True, index=True)

    # Relationship
    user = relationship("User")


class UserStorageUsage(Base):
    """
    Track user's storage consumption across all media types
    Enforces subscription-based storage quotas
    """
    __tablename__ = "user_storage_usage"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)

    # Storage usage by media type (in bytes)
    images_size = Column(Integer, default=0)  # Total size of all images
    videos_size = Column(Integer, default=0)  # Total size of all videos
    documents_size = Column(Integer, default=0)  # Total size of all documents
    audios_size = Column(Integer, default=0)  # Total size of all audio files

    # Total storage used (in bytes)
    total_size = Column(Integer, default=0)  # Sum of all above

    # File counts by type
    images_count = Column(Integer, default=0)
    videos_count = Column(Integer, default=0)
    documents_count = Column(Integer, default=0)
    audios_count = Column(Integer, default=0)

    # Timestamps
    last_calculated_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    user = relationship("User")


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


# ============================================
# USER SETTINGS MODELS (New - Dec 2024)
# ============================================

class UserSession(Base):
    """Tracks active login sessions for security"""
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    token_jti = Column(String(100), unique=True, index=True)  # JWT ID for token tracking
    device_type = Column(String(20))  # desktop, mobile, tablet
    device_name = Column(String(100))
    os = Column(String(50))
    browser = Column(String(50))
    ip_address = Column(String(50))
    location = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)


class LoginHistory(Base):
    """Stores login attempt history for security monitoring"""
    __tablename__ = "login_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    success = Column(Boolean, default=True)
    device = Column(String(100))
    os = Column(String(50))
    browser = Column(String(50))
    ip_address = Column(String(50))
    location = Column(String(100))
    failure_reason = Column(String(200))
    timestamp = Column(DateTime, default=datetime.utcnow)


class UserSettings(Base):
    """Stores user preferences: appearance, language, notifications, privacy"""
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    appearance = Column(Text)  # JSON: theme, fontSize, density, accentColor, etc.
    language = Column(Text)  # JSON: ui_language, auto_translate, etc.
    notifications = Column(Text)  # JSON: email, push, in-app preferences
    privacy = Column(Text)  # JSON: profile visibility, search settings, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PlatformReview(Base):
    """Stores user reviews of the Astegni platform"""
    __tablename__ = "platform_reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    overall_rating = Column(Integer, nullable=False)  # 1-5 stars
    category_ratings = Column(Text)  # JSON: ease, features, support, value
    text = Column(Text)  # Written review
    feature_suggestions = Column(Text)  # JSON array of requested features
    recommends = Column(Boolean)  # Would recommend to others
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime)




# ============================================
# PAYMENT METHODS MODELS (Jan 2026)
# ============================================

class PaymentMethod(Base):
    """
    Stores user payment methods for receiving earnings.
    Supports: Bank Transfer, Mobile Money (TeleBirr, M-Pesa, M-Birr, HelloCash)
    """
    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Payment Method Type
    method_type = Column(String(50), nullable=False)  # 'bank', 'mobile_money'

    # Bank Transfer Fields
    bank_name = Column(String(100))
    bank_code = Column(String(20))  # Bank identifier code (e.g., 'cbe', 'dashen', 'awash')
    account_number = Column(String(50))
    account_holder_name = Column(String(200))
    swift_code = Column(String(20))

    # Mobile Money Fields
    phone_number = Column(String(20))
    provider = Column(String(50))  # 'telebirr', 'm-pesa', 'm-birr', 'hello-cash'
    registered_name = Column(String(200))

    # Status & Verification
    is_primary = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    verification_status = Column(String(20), default='pending')  # 'pending', 'verified', 'rejected'
    verification_date = Column(DateTime)
    verification_notes = Column(Text)

    # Metadata
    nickname = Column(String(100))  # User-friendly name like "My CBE Account"
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ============================================
# PAYMENT METHODS PYDANTIC SCHEMAS
# ============================================

class PaymentMethodCreate(BaseModel):
    """Schema for creating a payment method"""
    method_type: str  # 'bank', 'mobile_money'

    # Bank fields (optional, required if method_type == 'bank')
    bank_name: Optional[str] = None
    bank_code: Optional[str] = None
    account_number: Optional[str] = None
    account_holder_name: Optional[str] = None
    swift_code: Optional[str] = None

    # Mobile Money fields (optional, required for mobile methods)
    phone_number: Optional[str] = None
    provider: Optional[str] = None
    registered_name: Optional[str] = None

    # Optional metadata
    nickname: Optional[str] = None
    is_primary: bool = False

    @validator('method_type')
    def validate_method_type(cls, v):
        allowed = ['bank', 'mobile_money']
        if v not in allowed:
            raise ValueError(f'method_type must be one of: {", ".join(allowed)}')
        return v


class PaymentMethodUpdate(BaseModel):
    """Schema for updating a payment method"""
    # Bank fields
    bank_name: Optional[str] = None
    bank_code: Optional[str] = None
    account_number: Optional[str] = None
    account_holder_name: Optional[str] = None
    swift_code: Optional[str] = None

    # Mobile Money fields
    phone_number: Optional[str] = None
    provider: Optional[str] = None
    registered_name: Optional[str] = None

    # Metadata
    nickname: Optional[str] = None
    is_primary: Optional[bool] = None
    is_active: Optional[bool] = None


class PaymentMethodResponse(BaseModel):
    """Schema for payment method response"""
    id: int
    user_id: int
    method_type: str

    # Bank fields
    bank_name: Optional[str] = None
    bank_code: Optional[str] = None
    account_number: Optional[str] = None
    account_holder_name: Optional[str] = None
    swift_code: Optional[str] = None

    # Mobile Money fields
    phone_number: Optional[str] = None
    provider: Optional[str] = None
    registered_name: Optional[str] = None

    # Status
    is_primary: bool
    is_verified: bool
    verification_status: str
    verification_date: Optional[datetime] = None
    verification_notes: Optional[str] = None

    # Metadata
    nickname: Optional[str] = None
    is_active: bool

    # Timestamps
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ============================================
# NOTES MODELS
# ============================================

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, nullable=False, index=True)
    profile_type = Column(String(20), nullable=False, index=True)  # 'student', 'tutor', 'parent', 'advertiser'

    # Core note fields
    title = Column(String(500), nullable=False)
    content = Column(Text)  # Rich HTML content
    date = Column(DateTime(timezone=True))  # User-specified note date

    # Metadata
    course = Column(String(200), index=True)
    tutor = Column(String(200))
    tags = Column(Text)  # Comma-separated tags

    # Visual customization
    background = Column(String(50))  # Background theme (math, physics, etc) or 'custom'
    background_url = Column(Text)  # Custom background image URL

    # Status
    is_favorite = Column(Boolean, default=False, index=True)
    word_count = Column(Integer, default=0)
    has_media = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    last_modified = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    media = relationship("NoteMedia", back_populates="note", cascade="all, delete-orphan")
    exports = relationship("NoteExport", back_populates="note", cascade="all, delete-orphan")

class NoteMedia(Base):
    __tablename__ = "note_media"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True)

    # Media details
    media_type = Column(String(20), nullable=False)  # 'audio' or 'video'
    file_url = Column(Text, nullable=False)  # URL to media file in storage
    file_size = Column(Integer)  # File size in bytes
    duration = Column(Integer)  # Duration in seconds
    mime_type = Column(String(100))  # e.g., 'audio/webm', 'video/webm'

    # Metadata
    recorded_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Optional transcription
    transcription = Column(Text)
    transcription_language = Column(String(10))  # e.g., 'en-US', 'am-ET'

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    note = relationship("Note", back_populates="media")

class NoteExport(Base):
    __tablename__ = "note_exports"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True)
    profile_id = Column(Integer, nullable=False, index=True)
    profile_type = Column(String(20), nullable=False)  # 'student', 'tutor', 'parent', 'advertiser'

    # Export details
    export_format = Column(String(20), nullable=False)  # 'pdf', 'word', 'markdown', 'html'
    file_url = Column(Text)  # Optional: store exported file

    # Timestamps
    exported_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    note = relationship("Note", back_populates="exports")

# ============================================
# NOTES PYDANTIC MODELS
# ============================================

class NoteMediaBase(BaseModel):
    media_type: str
    file_url: str
    file_size: Optional[int] = None
    duration: Optional[int] = None
    mime_type: Optional[str] = None
    transcription: Optional[str] = None
    transcription_language: Optional[str] = None

class NoteMediaCreate(NoteMediaBase):
    pass

class NoteMediaResponse(NoteMediaBase):
    id: int
    note_id: int
    recorded_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class NoteBase(BaseModel):
    title: str
    content: Optional[str] = None
    date: Optional[datetime] = None
    course: Optional[str] = None
    tutor: Optional[str] = None
    tags: Optional[str] = None
    background: Optional[str] = None
    background_url: Optional[str] = None
    is_favorite: bool = False
    word_count: int = 0

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    date: Optional[datetime] = None
    course: Optional[str] = None
    tutor: Optional[str] = None
    tags: Optional[str] = None
    background: Optional[str] = None
    background_url: Optional[str] = None
    is_favorite: Optional[bool] = None
    word_count: Optional[int] = None

class NoteResponse(NoteBase):
    id: int
    profile_id: int
    profile_type: str
    has_media: bool
    created_at: datetime
    updated_at: datetime
    last_modified: datetime
    media: List[NoteMediaResponse] = []

    class Config:
        from_attributes = True

class NoteListResponse(BaseModel):
    id: int
    profile_id: int
    profile_type: str
    title: str
    date: Optional[datetime] = None
    course: Optional[str] = None
    tutor: Optional[str] = None
    tags: Optional[str] = None
    is_favorite: bool
    word_count: int
    has_media: bool
    created_at: datetime
    last_modified: datetime

    class Config:
        from_attributes = True

class NoteExportBase(BaseModel):
    export_format: str

class NoteExportCreate(NoteExportBase):
    file_url: Optional[str] = None

class NoteExportResponse(NoteExportBase):
    id: int
    note_id: int
    profile_id: int
    profile_type: str
    file_url: Optional[str] = None
    exported_at: datetime

    class Config:
        from_attributes = True

class NotesStatsResponse(BaseModel):
    total_notes: int
    total_words: int
    total_courses: int
    recent_notes: int
    favorite_notes: int
    notes_with_media: int


# ============================================
# CHAT & CALLS MODELS
# ============================================

class Conversation(Base):
    """Conversation model for chat"""
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(20), default="direct")  # 'direct' or 'group'
    name = Column(String(255), nullable=True)  # For group chats
    description = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    created_by_profile_id = Column(Integer, nullable=True)
    created_by_profile_type = Column(String(50), nullable=True)
    is_archived = Column(Boolean, default=False)
    is_muted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    last_message_at = Column(DateTime, nullable=True)


class ConversationParticipant(Base):
    """Conversation participant model"""
    __tablename__ = "conversation_participants"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    profile_id = Column(Integer, nullable=False)
    profile_type = Column(String(50), nullable=False)  # 'tutor', 'student', 'parent', 'advertiser'
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(20), default="member")  # 'admin', 'member'
    is_muted = Column(Boolean, default=False)
    is_pinned = Column(Boolean, default=False)
    last_read_at = Column(DateTime, nullable=True)
    last_read_message_id = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    joined_at = Column(DateTime, default=datetime.utcnow)
    left_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class ChatMessage(Base):
    """Chat message model"""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    sender_profile_id = Column(Integer, nullable=False)
    sender_profile_type = Column(String(50), nullable=False)
    sender_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message_type = Column(String(20), default="text")  # 'text', 'image', 'audio', 'video', 'file', 'system', 'call'
    content = Column(Text, nullable=True)
    media_url = Column(String(500), nullable=True)
    media_metadata = Column(JSON, nullable=True)
    reply_to_id = Column(Integer, ForeignKey("chat_messages.id"), nullable=True)
    forwarded_from_id = Column(Integer, ForeignKey("chat_messages.id"), nullable=True)
    is_edited = Column(Boolean, default=False)
    edited_at = Column(DateTime, nullable=True)
    original_content = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_for_everyone = Column(Boolean, default=False)
    is_pinned = Column(Boolean, default=False)
    pinned_at = Column(DateTime, nullable=True)
    pinned_by_profile_id = Column(Integer, nullable=True)
    pinned_by_profile_type = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class CallLog(Base):
    """Call log model for voice/video calls"""
    __tablename__ = "call_logs"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    caller_profile_id = Column(Integer, nullable=True)   # Legacy: optional, superseded by caller_user_id
    caller_profile_type = Column(String(50), nullable=True)  # Legacy: optional
    caller_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    call_type = Column(String(20), nullable=False)  # 'voice', 'video'
    status = Column(String(20), default="initiated")  # 'initiated', 'ringing', 'answered', 'missed', 'declined', 'cancelled', 'ended', 'failed'
    started_at = Column(DateTime, default=datetime.utcnow)
    answered_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    participants = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class UserReferralCode(Base):
    """User referral codes for tracking shared profile links"""
    __tablename__ = "user_referral_codes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    referral_code = Column(String(20), unique=True, nullable=False, index=True)
    profile_type = Column(String(20), nullable=False)  # 'tutor', 'student', 'parent', 'advertiser'
    total_referrals = Column(Integer, default=0)
    active_referrals = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ReferralRegistration(Base):
    """Track users who registered via referral links"""
    __tablename__ = "referral_registrations"

    id = Column(Integer, primary_key=True, index=True)
    referrer_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    referrer_profile_type = Column(String(20), nullable=False)
    referral_code = Column(String(20), nullable=False)
    referred_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    referred_user_email = Column(String(255), nullable=False)
    referred_user_name = Column(String(255), nullable=True)
    registration_date = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    last_activity = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)


class ReferralClick(Base):
    """Track clicks on referral links for analytics"""
    __tablename__ = "referral_clicks"

    id = Column(Integer, primary_key=True, index=True)
    referral_code = Column(String(20), nullable=False, index=True)
    clicked_at = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    converted = Column(Boolean, default=False)
    converted_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


# Create all tables
Base.metadata.create_all(bind=engine)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================
# PYDANTIC MODELS - REFERRAL SYSTEM
# ============================================

class ReferralCodeResponse(BaseModel):
    """Response model for referral code"""
    referral_code: str
    profile_type: str
    total_referrals: int
    active_referrals: int
    share_url: str
    created_at: datetime

    class Config:
        from_attributes = True


class ReferredUserResponse(BaseModel):
    """Response model for referred user"""
    id: int
    referred_user_id: int
    referred_user_email: str
    referred_user_name: Optional[str]
    registration_date: datetime
    is_active: bool
    last_activity: Optional[datetime]

    class Config:
        from_attributes = True


class ReferralStatsResponse(BaseModel):
    """Response model for referral statistics"""
    total_clicks: int
    total_registrations: int
    active_referrals: int
    conversion_rate: float
    recent_referrals: List[ReferredUserResponse]

    class Config:
        from_attributes = True