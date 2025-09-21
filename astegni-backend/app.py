"""
Astegni Educational Platform - Complete Backend API
Fixed version with all endpoints working properly
"""

# 1. Standard library imports
import os
import re
import secrets
import json
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any
import uuid
from enum import Enum
import aiofiles
import random
from sqlalchemy import func

# 2. Third-party imports
from fastapi import (
    FastAPI, HTTPException, Depends, status, Request, 
    BackgroundTasks, WebSocket, Form, File, UploadFile, Query, Body
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy import (
    create_engine, Column, Integer, String, DateTime, Float, 
    Boolean, Text, JSON, ForeignKey, Date, Time, and_, or_, desc
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship, joinedload
from pydantic import BaseModel, EmailStr, ConfigDict, validator, Field
import bcrypt
import jwt
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ============================================
# CONFIGURATION
# ============================================

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"
)
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
REFRESH_SECRET_KEY = os.getenv("REFRESH_SECRET_KEY", "your-refresh-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
REMEMBER_ME_EXPIRE_DAYS = 30

# Convert DATABASE_URL for psycopg3
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://")

# ============================================
# DATABASE SETUP
# ============================================

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ============================================
# FASTAPI APP SETUP
# ============================================

app = FastAPI(
    title="Astegni API", 
    version="2.1.0",
    description="Complete backend API for Astegni Educational Platform - Fixed Version"
)

# OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Static files
if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
if os.path.exists("../videos"):
    app.mount("/videos", StaticFiles(directory="../videos"), name="videos")
if os.path.exists("../Pictures"):
    app.mount("/pictures", StaticFiles(directory="../Pictures"), name="pictures")

# CORS middleware
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "http://localhost",
    "file://",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# ============================================
# DATABASE MODELS
# ============================================

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String)
    password_hash = Column(String, nullable=False)
    
    # Multi-role support
    roles = Column(JSON, default=["user"])
    active_role = Column(String, default="user")
    
    # Profile
    profile_picture = Column(String)
    bio = Column(Text)
    
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

class TutorProfile(Base):
    __tablename__ = "tutor_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # Basic Info
    bio = Column(Text)
    quote = Column(Text)
    gender = Column(String)
    date_of_birth = Column(Date)
    
    # Professional Info
    courses = Column(JSON, default=[])
    grades = Column(JSON, default=[])
    subjects_expertise = Column(JSON, default=[])
    course_type = Column(String)
    location = Column(String)
    teaches_at = Column(String)
    learning_method = Column(String)
    teaching_methods = Column(JSON, default=[])
    
    # Experience & Qualifications
    experience = Column(Integer, default=0)
    education_level = Column(String)
    certifications = Column(JSON, default=[])
    achievements = Column(JSON, default=[])
    
    # Pricing & Availability
    price = Column(Float, default=0.0)
    currency = Column(String, default="ETB")
    availability = Column(JSON, default={})
    
    # Ratings & Stats
    rating = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    rating_breakdown = Column(JSON, default={"5": 0, "4": 0, "3": 0, "2": 0, "1": 0})
    total_students = Column(Integer, default=0)
    total_sessions = Column(Integer, default=0)
    
    # Status
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    profile_complete = Column(Boolean, default=False)
    profile_completion = Column(Float, default=0.0)
    
    # Media
    cover_image = Column(String)
    intro_video_url = Column(String)
    portfolio_urls = Column(JSON, default=[])
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="tutor_profile")
    sessions = relationship("TutoringSession", back_populates="tutor")
    videos = relationship("VideoReel", back_populates="tutor")
    connections = relationship("TutorConnection", back_populates="tutor")

class StudentProfile(Base):
    __tablename__ = "student_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # Basic Info
    date_of_birth = Column(Date)
    gender = Column(String)
    
    # Academic Info
    grade_level = Column(String)
    school_name = Column(String)
    school_address = Column(String)
    
    # Subjects & Interests
    subjects = Column(JSON, default=[])
    weak_subjects = Column(JSON, default=[])
    strong_subjects = Column(JSON, default=[])
    interests = Column(JSON, default=[])
    
    # Learning Preferences
    learning_style = Column(String)
    preferred_session_time = Column(String)
    preferred_learning_mode = Column(String, default="online")
    
    # Goals & Progress
    academic_goals = Column(Text)
    career_aspirations = Column(Text)
    current_gpa = Column(Float)
    target_gpa = Column(Float)
    
    # Guardian Info
    guardian_name = Column(String)
    guardian_phone = Column(String)
    guardian_email = Column(String)
    guardian_relationship = Column(String)
    
    # Stats
    total_sessions = Column(Integer, default=0)
    total_hours = Column(Float, default=0.0)
    courses_enrolled = Column(Integer, default=0)
    
    # Status
    is_active = Column(Boolean, default=True)
    profile_complete = Column(Boolean, default=False)
    profile_completion = Column(Float, default=0.0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="student_profile")
    enrollments = relationship("TutorStudentEnrollment", back_populates="student")
    sessions = relationship("TutoringSession", back_populates="student")

class TutorStudentEnrollment(Base):
    __tablename__ = "tutor_student_enrollments"
    
    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("tutor_profiles.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False)
    
    # Enrollment Details
    subjects = Column(JSON, default=[])
    start_date = Column(Date, default=date.today)
    end_date = Column(Date)
    
    # Session Info
    session_frequency = Column(String)
    session_duration = Column(Integer, default=60)
    total_sessions_planned = Column(Integer)
    sessions_completed = Column(Integer, default=0)
    
    # Payment
    hourly_rate = Column(Float)
    payment_status = Column(String, default="pending")
    total_paid = Column(Float, default=0.0)
    
    # Status
    status = Column(String, default="active")
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = relationship("StudentProfile", back_populates="enrollments")

class TutoringSession(Base):
    __tablename__ = "tutoring_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    enrollment_id = Column(Integer, ForeignKey("tutor_student_enrollments.id"))
    tutor_id = Column(Integer, ForeignKey("tutor_profiles.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False)
    
    # Session Details
    subject = Column(String, nullable=False)
    topic = Column(String)
    session_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time)
    duration = Column(Integer, default=60)
    
    # Mode & Location
    mode = Column(String, default="online")
    location = Column(String)
    meeting_link = Column(String)
    
    # Content
    objectives = Column(Text)
    topics_covered = Column(JSON, default=[])
    materials_used = Column(JSON, default=[])
    homework_assigned = Column(Text)
    
    # Status & Attendance
    status = Column(String, default="scheduled")
    student_attended = Column(Boolean)
    tutor_attended = Column(Boolean)
    
    # Feedback
    tutor_notes = Column(Text)
    student_feedback = Column(Text)
    student_rating = Column(Float)
    
    # Payment
    amount = Column(Float)
    payment_status = Column(String, default="pending")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tutor = relationship("TutorProfile", back_populates="sessions")
    student = relationship("StudentProfile", back_populates="sessions")


class BlogPost(Base):
    __tablename__ = "blog_posts"
    
    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    title = Column(String, nullable=False)
    description = Column(Text)
    content = Column(Text, nullable=False)
    thumbnail_url = Column(String)
    category = Column(String)
    
    status = Column(String, default="draft")  # draft, published, under_review
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    
    published_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    author = relationship("User")

class BlogCreate(BaseModel):
    title: str
    description: str
    content: str
    category: str
    thumbnail_url: Optional[str] = None


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

class TutorConnection(Base):
    __tablename__ = "tutor_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tutor_id = Column(Integer, ForeignKey("tutor_profiles.id"), nullable=False)
    
    # Connection status: pending, accepted, rejected, blocked
    status = Column(String, default="pending")
    
    # Who initiated the connection
    initiated_by = Column(Integer, ForeignKey("users.id"))
    
    # Messages
    connection_message = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    accepted_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = relationship("User", foreign_keys=[student_id])
    tutor = relationship("TutorProfile", back_populates="connections")
    initiator = relationship("User", foreign_keys=[initiated_by])

class FavoriteTutor(Base):
    __tablename__ = "favorite_tutors"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tutor_id = Column(Integer, ForeignKey("tutor_profiles.id"), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

# Add Playlist models
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

# Create all tables
Base.metadata.create_all(bind=engine)

# ============================================
# PYDANTIC MODELS
# ============================================

class UserRegister(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    password: str
    role: str = "student"

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    roles: List[str]
    active_role: str
    profile_picture: Optional[str]
    created_at: datetime
    is_active: bool
    email_verified: bool

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
    courses: Optional[List[str]] = None
    grades: Optional[List[str]] = None
    location: Optional[str] = None
    teaches_at: Optional[str] = None
    learning_method: Optional[str] = None
    teaching_methods: Optional[List[str]] = None
    experience: Optional[int] = None
    price: Optional[float] = None
    availability: Optional[Dict[str, Any]] = None

class StudentProfileUpdate(BaseModel):
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    grade_level: Optional[str] = None
    school_name: Optional[str] = None
    subjects: Optional[List[str]] = None
    weak_subjects: Optional[List[str]] = None
    strong_subjects: Optional[List[str]] = None
    learning_style: Optional[str] = None
    academic_goals: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None

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

# ============================================
# DEPENDENCY FUNCTIONS
# ============================================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_user_optional(
    authorization: Optional[str] = None,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    token = authorization.replace("Bearer ", "")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            return None
            
        user = db.query(User).filter(User.id == user_id).first()
        return user
    except jwt.PyJWTError:
        return None

async def save_uploaded_file(file: UploadFile, folder: str) -> str:
    """Save uploaded file and return URL"""
    os.makedirs(f"uploads/{folder}", exist_ok=True)
    
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = f"uploads/{folder}/{unique_filename}"
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    return f"/{file_path}"

def calculate_profile_completion(profile) -> float:
    """Calculate profile completion percentage"""
    fields = ['bio', 'gender', 'date_of_birth', 'school_name', 'grade_level', 
              'subjects', 'learning_style', 'guardian_name']
    completed = sum(1 for field in fields if getattr(profile, field, None))
    return (completed / len(fields)) * 100

# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================

@app.post("/api/register", response_model=TokenResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user or add role to existing user"""
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    
    if existing_user:
        # User exists - add new role if not already present
        if user_data.role in existing_user.roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User already has {user_data.role} role"
            )
        
        # Verify password matches
        if not verify_password(user_data.password, existing_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email exists with different password. Please login instead."
            )
        
        # Add new role
        existing_user.roles = existing_user.roles + [user_data.role]
        existing_user.active_role = user_data.role  # Switch to new role
        db.commit()
        
        # Create profile for new role
        if user_data.role == "tutor" and not existing_user.tutor_profile:
            tutor_profile = TutorProfile(user_id=existing_user.id)
            db.add(tutor_profile)
            db.commit()
        elif user_data.role == "student" and not existing_user.student_profile:
            student_profile = StudentProfile(user_id=existing_user.id)
            db.add(student_profile)
            db.commit()
        
        # Create tokens
        access_token = create_access_token(data={"sub": existing_user.id})
        refresh_token = create_refresh_token(data={"sub": existing_user.id})
        
        # Store refresh token
        refresh_token_obj = RefreshToken(
            token=refresh_token,
            user_id=existing_user.id,
            expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        )
        db.add(refresh_token_obj)
        db.commit()
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse(
                id=existing_user.id,
                first_name=existing_user.first_name,
                last_name=existing_user.last_name,
                email=existing_user.email,
                phone=existing_user.phone,
                roles=existing_user.roles,
                active_role=existing_user.active_role,
                profile_picture=existing_user.profile_picture,
                created_at=existing_user.created_at,
                is_active=existing_user.is_active,
                email_verified=existing_user.email_verified
            )
        )
    
    # Create new user
    new_user = User(
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        phone=user_data.phone,
        password_hash=hash_password(user_data.password),
        roles=[user_data.role],
        active_role=user_data.role
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create profile based on role
    if user_data.role == "tutor":
        tutor_profile = TutorProfile(user_id=new_user.id)
        db.add(tutor_profile)
    elif user_data.role == "student":
        student_profile = StudentProfile(user_id=new_user.id)
        db.add(student_profile)
    
    db.commit()
    
    # Create tokens
    access_token = create_access_token(data={"sub": new_user.id})
    refresh_token = create_refresh_token(data={"sub": new_user.id})
    
    # Store refresh token
    refresh_token_obj = RefreshToken(
        token=refresh_token,
        user_id=new_user.id,
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(refresh_token_obj)
    db.commit()
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            id=new_user.id,
            first_name=new_user.first_name,
            last_name=new_user.last_name,
            email=new_user.email,
            phone=new_user.phone,
            roles=new_user.roles,
            active_role=new_user.active_role,
            profile_picture=new_user.profile_picture,
            created_at=new_user.created_at,
            is_active=new_user.is_active,
            email_verified=new_user.email_verified
        )
    )

@app.post("/api/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """User login"""
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create tokens
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    # Store refresh token
    refresh_token_obj = RefreshToken(
        token=refresh_token,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(refresh_token_obj)
    db.commit()
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            phone=user.phone,
            roles=user.roles,
            active_role=user.active_role,
            profile_picture=user.profile_picture,
            created_at=user.created_at,
            is_active=user.is_active,
            email_verified=user.email_verified
        )
    )

@app.post("/api/refresh", response_model=TokenResponse)
def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token"""
    try:
        # Decode refresh token
        payload = jwt.decode(refresh_data.refresh_token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        # Check if refresh token exists and is not revoked
        token_obj = db.query(RefreshToken).filter(
            RefreshToken.token == refresh_data.refresh_token,
            RefreshToken.is_revoked == False,
            RefreshToken.expires_at > datetime.utcnow()
        ).first()
        
        if not token_obj:
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
        
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Create new access token
        access_token = create_access_token(data={"sub": user.id})
        
        # Create new refresh token
        new_refresh_token = create_refresh_token(data={"sub": user.id})
        
        # Revoke old refresh token
        token_obj.is_revoked = True
        
        # Store new refresh token
        new_token_obj = RefreshToken(
            token=new_refresh_token,
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        )
        db.add(new_token_obj)
        db.commit()
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            user=UserResponse(
                id=user.id,
                first_name=user.first_name,
                last_name=user.last_name,
                email=user.email,
                phone=user.phone,
                roles=user.roles,
                active_role=user.active_role,
                profile_picture=user.profile_picture,
                created_at=user.created_at,
                is_active=user.is_active,
                email_verified=user.email_verified
            )
        )
        
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@app.get("/api/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse(
        id=current_user.id,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email=current_user.email,
        phone=current_user.phone,
        roles=current_user.roles,
        active_role=current_user.active_role,
        profile_picture=current_user.profile_picture,
        created_at=current_user.created_at,
        is_active=current_user.is_active,
        email_verified=current_user.email_verified
    )

@app.get("/api/verify-token")
def verify_token(current_user: User = Depends(get_current_user)):
    """Verify if token is valid and return user data"""
    return {
        "valid": True,
        "user": {
            "id": current_user.id,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "email": current_user.email,
            "phone": current_user.phone,
            "role": current_user.active_role,
            "roles": current_user.roles,
            "created_at": current_user.created_at.isoformat(),
            "is_active": current_user.is_active
        }
    }

@app.post("/api/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logout user"""
    # Revoke all user's refresh tokens
    db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id,
        RefreshToken.is_revoked == False
    ).update({"is_revoked": True})
    db.commit()
    
    return {"message": "Successfully logged out"}

# ============================================
# TUTOR ENDPOINTS
# ============================================

@app.get("/api/tutors")
def get_tutors(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    search: Optional[str] = Query(None),
    course_type: Optional[str] = Query(None),
    grade: Optional[str] = Query(None),
    gender: Optional[str] = Query(None),
    learning_method: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    min_rating: Optional[float] = Query(None),
    max_rating: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all tutors with filters"""
    try:
        from sqlalchemy import text, and_, or_, func
        
        # Calculate offset
        offset = (page - 1) * limit
        
        # Base query
        query = db.query(User, TutorProfile).join(
            TutorProfile, User.id == TutorProfile.user_id
        ).filter(
            text("users.roles::jsonb @> '[\"tutor\"]'::jsonb"),
            User.is_active == True
        )
        
        # Apply search filter
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    func.concat(User.first_name, ' ', User.last_name).ilike(search_term),
                    TutorProfile.bio.ilike(search_term),
                    TutorProfile.location.ilike(search_term),
                    func.cast(TutorProfile.courses, String).ilike(search_term),
                    TutorProfile.teaches_at.ilike(search_term)
                )
            )

        if gender:
            if ',' in gender:
                gender_list = gender.split(',')
                query = query.filter(TutorProfile.gender.in_(gender_list))
            else:
                query = query.filter(TutorProfile.gender == gender)
        
        if course_type:
            query = query.filter(TutorProfile.course_type == course_type)
        
        if grade:
            query = query.filter(func.cast(TutorProfile.grades, String).ilike(f"%{grade}%"))
        
        if learning_method:
            query = query.filter(func.lower(TutorProfile.learning_method) == learning_method.lower())
        
        if min_price is not None:
            query = query.filter(TutorProfile.price >= min_price)
        if max_price is not None:
            query = query.filter(TutorProfile.price <= max_price)
        
        if min_rating is not None:
            query = query.filter(TutorProfile.rating >= min_rating)
        if max_rating is not None:
            query = query.filter(TutorProfile.rating <= max_rating)
        
        # Get total count before pagination
        total = query.count()
        
        # Apply pagination
        results = query.offset(offset).limit(limit).all()
        
        tutors = []
        for user, profile in results:
            learning_method = profile.learning_method
            if not learning_method or learning_method == 'null':
                learning_method = "Online"
            
            teaches_at = profile.teaches_at if profile.teaches_at else "Independent"
            
            bio = profile.bio or ""
            if "Currently teaching at" in bio:
                bio = bio.split("Currently teaching at")[0].strip()
            
            courses = profile.courses if profile.courses else []
            if isinstance(courses, str):
                try:
                    import json
                    courses = json.loads(courses)
                except:
                    courses = [courses]
            
            grades = profile.grades if profile.grades else []
            if isinstance(grades, str):
                try:
                    import json
                    grades = json.loads(grades)
                except:
                    grades = [grades]
            
            rating_breakdown = None
            if hasattr(profile, 'rating_breakdown') and profile.rating_breakdown:
                if isinstance(profile.rating_breakdown, str):
                    try:
                        import json
                        rating_breakdown = json.loads(profile.rating_breakdown)
                    except:
                        rating_breakdown = None
                else:
                    rating_breakdown = profile.rating_breakdown
            
            if not rating_breakdown:
                rating = profile.rating if profile.rating else 2.0
                rating_breakdown = {
                    "discipline": rating,
                    "punctuality": rating,
                    "communication_skills": rating,
                    "knowledge_level": rating,
                    "retention": rating
                }
            
            tutor_data = {
                "id": profile.id,
                "user_id": user.id,
                "name": f"{user.first_name} {user.last_name}",
                "email": user.email,
                "profile_picture": user.profile_picture,
                "bio": bio,
                "quote": profile.quote,
                "gender": profile.gender or "Not specified",
                "courses": courses,
                "grades": grades,
                "course_type": profile.course_type or "academic",
                "location": profile.location,
                "teaches_at": teaches_at,
                "learning_method": learning_method,
                "teaching_methods": [learning_method],
                "experience": profile.experience or 0,
                "experience_years": profile.experience or 0,
                "education_level": profile.education_level,
                "price": profile.price or 100,
                "currency": profile.currency or "ETB",
                "availability": profile.availability,
                "rating": profile.rating or 4.0,
                "rating_count": profile.rating_count or 0,
                "rating_breakdown": rating_breakdown,
                "total_students": profile.total_students or 0,
                "students_taught": getattr(profile, 'students_taught', profile.total_students or 0),
                "total_sessions": profile.total_sessions or 0,
                "is_verified": profile.is_verified,
                "is_active": profile.is_active,
                "is_favorite": False,
                "response_time": getattr(profile, 'response_time', "Within 24 hours"),
                "completion_rate": getattr(profile, 'completion_rate', 85)
            }
            tutors.append(tutor_data)
        
        # Calculate pagination info
        total_pages = (total + limit - 1) // limit
        
        return {
            "tutors": tutors,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages
        }
        
    except Exception as e:
        print(f"Error fetching tutors: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tutor/{tutor_id}")
def get_tutor_public_profile(tutor_id: int, db: Session = Depends(get_db)):
    """Get public tutor profile"""
    profile = db.query(TutorProfile).filter(
        TutorProfile.id == tutor_id,
        TutorProfile.is_active == True
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Tutor not found")
    
    return {
        "id": profile.id,
        "name": f"{profile.user.first_name} {profile.user.last_name}",
        "profile_picture": profile.user.profile_picture,
        "bio": profile.bio,
        "quote": profile.quote,
        "courses": profile.courses or [],
        "grades": profile.grades or [],
        "location": profile.location,
        "teaches_at": profile.teaches_at,
        "learning_method": profile.learning_method,
        "teaching_methods": profile.teaching_methods or [],
        "experience": profile.experience,
        "education_level": profile.education_level,
        "certifications": profile.certifications or [],
        "achievements": profile.achievements or [],
        "price": profile.price,
        "currency": profile.currency,
        "rating": profile.rating,
        "rating_count": profile.rating_count,
        "rating_breakdown": profile.rating_breakdown,
        "total_students": profile.total_students,
        "total_sessions": profile.total_sessions,
        "is_verified": profile.is_verified,
        "intro_video_url": profile.intro_video_url,
        "availability": profile.availability
    }


@app.post("/api/blog/posts")
async def create_blog_post(
    blog_data: BlogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new blog post"""
    
    blog = BlogPost(
        author_id=current_user.id,
        **blog_data.dict(),
        status="draft"
    )
    
    db.add(blog)
    db.commit()
    db.refresh(blog)
    
    return {"id": blog.id, "message": "Blog post created", "status": blog.status}

@app.post("/api/blog/posts/{post_id}/publish")
async def publish_blog_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Publish a blog post (triggers review)"""
    
    post = db.query(BlogPost).filter(
        BlogPost.id == post_id,
        BlogPost.author_id == current_user.id
    ).first()
    
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    
    post.status = "under_review"
    db.commit()
    
    return {"message": "Blog post submitted for review", "status": post.status}

@app.get("/api/blog/posts")
async def get_blog_posts(
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's blog posts"""
    
    query = db.query(BlogPost).filter(BlogPost.author_id == current_user.id)
    
    if status:
        query = query.filter(BlogPost.status == status)
    
    posts = query.order_by(desc(BlogPost.created_at)).all()
    
    return {
        "posts": [
            {
                "id": post.id,
                "title": post.title,
                "description": post.description,
                "category": post.category,
                "status": post.status,
                "views": post.views,
                "likes": post.likes,
                "created_at": post.created_at.isoformat()
            }
            for post in posts
        ]
    }


@app.put("/api/tutor/profile")
async def update_tutor_profile(
    profile_data: TutorProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update tutor profile with verification for certain fields"""
    
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not a tutor")
    
    tutor = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    # Track if verification needed
    needs_verification = False
    old_teaches_at = tutor.teaches_at
    
    # Update fields
    for field, value in profile_data.dict(exclude_unset=True).items():
        if hasattr(tutor, field):
            # Check if teaches_at changed
            if field == "teaches_at" and value != old_teaches_at:
                needs_verification = True
            setattr(tutor, field, value)
    
    tutor.updated_at = datetime.utcnow()
    
    # If verification needed, mark profile
    if needs_verification:
        tutor.profile_verification_status = "pending"
    
    db.commit()
    
    return {
        "message": "Profile updated",
        "needs_verification": needs_verification
    }
# Add these endpoints to your app.py file


# ============================================
# CERTIFICATION VERIFICATION ENDPOINTS
# ============================================

class CertificationCreate(BaseModel):
    title: str
    issuing_organization: str
    issue_date: Optional[date] = None
    credential_id: Optional[str] = None
    file_url: Optional[str] = None

@app.post("/api/tutor/certifications")
async def add_certification(
    cert_data: CertificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add certification with verification"""
    
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not a tutor")
    
    tutor = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    # Add to certifications JSON
    if not tutor.certifications:
        tutor.certifications = []
    
    cert_dict = cert_data.dict()
    cert_dict["id"] = str(uuid.uuid4())
    cert_dict["status"] = "pending_verification"
    cert_dict["created_at"] = datetime.utcnow().isoformat()
    
    tutor.certifications.append(cert_dict)
    db.commit()
    
    return {
        "message": "Certification submitted for verification",
        "id": cert_dict["id"],
        "status": "pending_verification"
    }

# Similar for experiences and achievements
class ExperienceCreate(BaseModel):
    position: str
    organization: str
    start_date: date
    end_date: Optional[date] = None
    description: Optional[str] = None

@app.post("/api/tutor/experiences")
async def add_experience(
    exp_data: ExperienceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add experience with verification"""
    
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not a tutor")
    
    tutor = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    # Add to experiences JSON (similar to certifications)
    if not hasattr(tutor, 'experiences') or tutor.experiences is None:
        tutor.experiences = []
    
    exp_dict = exp_data.dict()
    exp_dict["id"] = str(uuid.uuid4())
    exp_dict["status"] = "pending_verification"
    exp_dict["created_at"] = datetime.utcnow().isoformat()
    
    tutor.experiences.append(exp_dict)
    db.commit()
    
    return {
        "message": "Experience submitted for verification",
        "id": exp_dict["id"],
        "status": "pending_verification"
    }

class AchievementCreate(BaseModel):
    title: str
    institution: str
    date: Optional[date] = None
    description: Optional[str] = None

@app.post("/api/tutor/achievements")
async def add_achievement(
    ach_data: AchievementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add achievement with verification"""
    
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not a tutor")
    
    tutor = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    if not hasattr(tutor, 'achievements') or tutor.achievements is None:
        tutor.achievements = []
    
    ach_dict = ach_data.dict()
    ach_dict["id"] = str(uuid.uuid4())
    ach_dict["status"] = "pending_verification"
    ach_dict["created_at"] = datetime.utcnow().isoformat()
    
    tutor.achievements.append(ach_dict)
    db.commit()
    
    return {
        "message": "Achievement submitted for verification",
        "id": ach_dict["id"],
        "status": "pending_verification"
    }



# ============================================
# PACKAGE MANAGEMENT ENDPOINTS
# ============================================

class PackageCreate(BaseModel):
    courses: List[str]
    payment_frequency: str
    hourly_rate: float
    discounts: Dict[str, float]
    bank_name: Optional[str] = None
    account_number: Optional[str] = None

class PackageResponse(BaseModel):
    id: int
    courses: List[str]
    payment_frequency: str
    hourly_rate: float
    discounts: Dict[str, float]
    created_at: datetime

@app.post("/api/tutor/packages", response_model=PackageResponse)
async def create_package(
    package: PackageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update tutor packages"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only tutors can create packages")
    
    tutor = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    # Store packages in JSON column
    if not tutor.packages:
        tutor.packages = []
    
    package_data = {
        "id": len(tutor.packages) + 1,
        "courses": package.courses,
        "payment_frequency": package.payment_frequency,
        "hourly_rate": package.hourly_rate,
        "discounts": package.discounts,
        "bank_name": package.bank_name,
        "account_number": package.account_number,
        "created_at": datetime.utcnow().isoformat()
    }
    
    tutor.packages.append(package_data)
    db.commit()
    
    return PackageResponse(**package_data)

@app.get("/api/tutor/packages")
async def get_packages(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tutor's packages"""
    tutor = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor:
        return {"packages": []}
    
    return {"packages": tutor.packages or []}

# ============================================
# SESSION REQUEST ENDPOINTS
# ============================================

@app.get("/api/tutor/session-requests")
async def get_session_requests(
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get pending session requests for tutor"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only tutors can view session requests")
    
    tutor = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor:
        return {"requests": []}
    
    query = db.query(TutoringSession).filter(
        TutoringSession.tutor_id == tutor.id
    )
    
    if status:
        query = query.filter(TutoringSession.status == status)
    else:
        query = query.filter(TutoringSession.status == "pending")
    
    sessions = query.order_by(desc(TutoringSession.created_at)).all()
    
    requests = []
    for session in sessions:
        student = db.query(User).filter(User.id == session.student_id).first()
        requests.append({
            "id": session.id,
            "student_id": session.student_id,
            "student_name": f"{student.first_name} {student.last_name}" if student else "Unknown",
            "subject": session.subject,
            "session_date": session.session_date.isoformat(),
            "start_time": session.start_time.isoformat(),
            "duration": session.duration,
            "mode": session.mode,
            "status": session.status,
            "created_at": session.created_at.isoformat()
        })
    
    return {"requests": requests, "total": len(requests)}

@app.post("/api/tutor/session-requests/{request_id}/accept")
async def accept_session_request(
    request_id: int,
    meeting_link: Optional[str] = Body(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a session request"""
    session = db.query(TutoringSession).filter(
        TutoringSession.id == request_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session request not found")
    
    # Verify ownership
    tutor = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id,
        TutorProfile.id == session.tutor_id
    ).first()
    
    if not tutor:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    session.status = "accepted"
    if meeting_link:
        session.meeting_link = meeting_link
    
    db.commit()
    
    return {"message": "Session accepted", "session_id": session.id}

@app.post("/api/tutor/session-requests/{request_id}/reject")
async def reject_session_request(
    request_id: int,
    reason: Optional[str] = Body(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject a session request"""
    session = db.query(TutoringSession).filter(
        TutoringSession.id == request_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session request not found")
    
    # Verify ownership
    tutor = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id,
        TutorProfile.id == session.tutor_id
    ).first()
    
    if not tutor:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    session.status = "rejected"
    if reason:
        session.tutor_notes = reason
    
    db.commit()
    
    return {"message": "Session rejected"}

# ============================================
# STUDENT MANAGEMENT ENDPOINTS
# ============================================

@app.get("/api/tutor/students")
async def get_tutor_students(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of tutor's students"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only tutors can view students")
    
    tutor = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor:
        return {"students": [], "total": 0}
    
    # Get unique students from sessions
    student_ids = db.query(TutoringSession.student_id).filter(
        TutoringSession.tutor_id == tutor.id,
        TutoringSession.status.in_(["accepted", "completed"])
    ).distinct().all()
    
    students = []
    for (student_id,) in student_ids:
        student_profile = db.query(StudentProfile).filter(
            StudentProfile.id == student_id
        ).first()
        
        if student_profile:
            user = student_profile.user
            session_count = db.query(TutoringSession).filter(
                TutoringSession.tutor_id == tutor.id,
                TutoringSession.student_id == student_id
            ).count()
            
            students.append({
                "id": student_profile.id,
                "name": f"{user.first_name} {user.last_name}",
                "email": user.email,
                "grade_level": student_profile.grade_level,
                "school_name": student_profile.school_name,
                "total_sessions": session_count,
                "subjects": student_profile.subjects
            })
    
    return {"students": students, "total": len(students)}

# ============================================
# VIDEO ENDPOINTS - FIXED
# ============================================

@app.get("/api/videos/reels")
def get_video_reels(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    filter: str = Query("all"),
    subject: Optional[str] = None,
    category: Optional[str] = Query(None),
    grade: Optional[str] = None,
    search: Optional[str] = None,
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Get video reels with filtering support"""
    
    # Get current user if authenticated
    current_user = None
    auth_header = request.headers.get("authorization", "") if request else ""
    
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                current_user = db.query(User).filter(User.id == user_id).first()
        except:
            pass
    
    # Base query
    query = db.query(VideoReel).join(TutorProfile).filter(VideoReel.is_active == True)
    
    # Filter by category if specified (for Ad videos) - FIXED
    if category:
        if category == 'Ad':
            # For reels page, filter to only Ad category videos
            query = query.filter(VideoReel.category == 'Ad')
    else:
        # If no category specified, exclude Ad videos from general queries
        query = query.filter(or_(VideoReel.category != 'Ad', VideoReel.category == None))
    
    # Apply filter based on type
    if filter == "all":
        query = query.order_by(desc(VideoReel.created_at))
    elif filter == "favorites" and current_user:  # Fixed: "favorites" to match frontend
        favorited = db.query(VideoEngagement.video_id).filter(
            VideoEngagement.user_id == current_user.id,
            VideoEngagement.engagement_type == "favorite"  # Fixed: singular form
        ).subquery()
        query = query.filter(VideoReel.id.in_(favorited))
    elif filter == "saved" and current_user:
        saved = db.query(VideoEngagement.video_id).filter(
            VideoEngagement.user_id == current_user.id,
            VideoEngagement.engagement_type == "save"
        ).subquery()
        query = query.filter(VideoReel.id.in_(saved))
    elif filter == "liked" and current_user:
        liked = db.query(VideoEngagement.video_id).filter(
            VideoEngagement.user_id == current_user.id,
            VideoEngagement.engagement_type == "like"
        ).subquery()
        query = query.filter(VideoReel.id.in_(liked))
    elif filter == "history" and current_user:
        viewed = db.query(
            VideoEngagement.video_id,
            VideoEngagement.created_at
        ).filter(
            VideoEngagement.user_id == current_user.id,
            VideoEngagement.engagement_type == "view"
        ).subquery()
        
        query = query.join(viewed, VideoReel.id == viewed.c.video_id)
        query = query.order_by(desc(viewed.c.created_at))
    elif filter and filter != "all" and not current_user:
        # Return empty for user-specific filters when not authenticated
        return {
            "videos": [], 
            "total": 0, 
            "page": page, 
            "pages": 0, 
            "error": "Authentication required for this filter"
        }
    
    # Apply other filters
    if subject:
        query = query.filter(VideoReel.subject == subject)
    if grade:
        query = query.filter(VideoReel.grade_level == grade)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                VideoReel.title.ilike(search_term),
                VideoReel.description.ilike(search_term),
            )
        )
    
    # Get total before pagination
    total = query.count()
    
    # Apply pagination
    videos = query.offset((page - 1) * limit).limit(limit).all()
    
    # Format response
    results = []
    for video in videos:
        if isinstance(video, tuple):
            video = video[0]
            
        # Get user engagement status for this video
        user_engagement = {}
        if current_user:
            engagements = db.query(VideoEngagement).filter(
                VideoEngagement.video_id == video.id,
                VideoEngagement.user_id == current_user.id
            ).all()
            for eng in engagements:
                user_engagement[eng.engagement_type] = True
        
        # Count favorites - Fixed to use correct engagement type
        favorites_count = db.query(VideoEngagement).filter(
            VideoEngagement.video_id == video.id,
            VideoEngagement.engagement_type == "favorite"  # Fixed: singular form
        ).count()
        
        results.append({
            "id": video.id,
            "tutor_id": video.tutor_id,
            "tutor_name": f"{video.tutor.user.first_name} {video.tutor.user.last_name}",
            "tutor_picture": video.tutor.user.profile_picture,
            "tutor_verified": video.tutor.is_verified,
            "tutor_subject": video.subject,
            "title": video.title,
            "description": video.description,
            "video_url": video.video_url,
            "thumbnail_url": video.thumbnail_url,
            "duration": video.duration,
            "category": video.category,
            "subject": video.subject,
            "grade_level": video.grade_level,
            "views": video.views or 0,
            "likes": video.likes or 0,
            "dislikes": video.dislikes or 0,
            "favorites": favorites_count,  # Use actual count
            "shares": video.shares or 0,
            "saves": video.saves or 0,
            "user_engagement": user_engagement,
            "created_at": video.created_at.isoformat(),
            "upload_date": video.created_at.isoformat(),
            "is_featured": video.is_featured
        })
    
    return {
        "videos": results,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "filter_applied": filter
    }


@app.get("/api/videos/reels/{video_id}")
def get_video_details(
    video_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get complete video details including engagement stats"""
    
    # Try to get current user from token if available
    current_user = None
    auth_header = request.headers.get("authorization", "")
    
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                current_user = db.query(User).filter(User.id == user_id).first()
        except:
            pass
    
    video = db.query(VideoReel).filter(
        VideoReel.id == video_id,
        VideoReel.is_active == True
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Get user engagement if authenticated
    user_engagement = {}
    if current_user:
        engagements = db.query(VideoEngagement).filter(
            VideoEngagement.video_id == video_id,
            VideoEngagement.user_id == current_user.id
        ).all()
        
        for eng in engagements:
            user_engagement[eng.engagement_type] = True
    
    # Get creator info
    tutor = video.tutor
    
    # Count engagements
    favorites_count = db.query(VideoEngagement).filter(
        VideoEngagement.video_id == video_id,
        VideoEngagement.engagement_type == "favorite"
    ).count()
    
    # Get chapters count
    chapters_count = db.query(VideoChapter).filter(
        VideoChapter.video_id == video_id
    ).count()
    
    # Get comments count
    comments_count = db.query(VideoComment).filter(
        VideoComment.video_id == video_id,
        VideoComment.is_deleted == False
    ).count()
    
    return {
        "id": video.id,
        "tutor_id": video.tutor_id,
        "tutor_name": f"{tutor.user.first_name} {tutor.user.last_name}",
        "tutor_picture": tutor.user.profile_picture,
        "tutor_verified": tutor.is_verified,
        "title": video.title,
        "description": video.description,
        "video_url": video.video_url,
        "thumbnail_url": video.thumbnail_url,
        "duration": video.duration,
        "category": video.category,
        "subject": video.subject,
        "grade_level": video.grade_level,
        "views": video.views,
        "likes": video.likes,
        "dislikes": video.dislikes,
        "favorites": favorites_count,
        "saves": video.saves,
        "shares": video.shares,
        "comments_count": comments_count,
        "chapters_count": chapters_count,
        "user_engagement": user_engagement,
        "created_at": video.created_at.isoformat(),
        "updated_at": video.updated_at.isoformat() if video.updated_at else None,
        "is_featured": video.is_featured
    }

@app.post("/api/videos/{video_id}/view")
def record_video_view(
    video_id: int, 
    request: Request,
    db: Session = Depends(get_db)
):
    """Record a video view and add to history if user is logged in"""
    
    # Try to get current user from token
    current_user = None
    auth_header = request.headers.get("authorization", "")
    
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                current_user = db.query(User).filter(User.id == user_id).first()
        except:
            pass
    
    # Get the video
    video = db.query(VideoReel).filter(VideoReel.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Increment view count
    video.views = (video.views or 0) + 1
    
    # Add to user's history if logged in
    if current_user:
        # Check if already viewed
        existing = db.query(VideoEngagement).filter(
            VideoEngagement.video_id == video_id,
            VideoEngagement.user_id == current_user.id,
            VideoEngagement.engagement_type == "view"
        ).first()
        
        if existing:
            # Update timestamp to track most recent view
            existing.created_at = datetime.utcnow()
        else:
            # Add new view record
            view_record = VideoEngagement(
                video_id=video_id,
                user_id=current_user.id,
                engagement_type="view"
            )
            db.add(view_record)
    
    db.commit()
    
    return {"views": video.views, "tracked": bool(current_user)}

@app.post("/api/videos/{video_id}/engage")
def engage_with_video(
    video_id: int,
    engagement: VideoEngagementRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Like, dislike, save, share, or favorite a video"""
    video = db.query(VideoReel).filter(VideoReel.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Check if user already has this engagement
    existing = db.query(VideoEngagement).filter(
        VideoEngagement.video_id == video_id,
        VideoEngagement.user_id == current_user.id,
        VideoEngagement.engagement_type == engagement.engagement_type
    ).first()
    
    if existing:
        # Remove engagement (toggle off)
        db.delete(existing)
        
        # Update video stats
        if engagement.engagement_type == "like":
            video.likes = max(0, video.likes - 1)
        elif engagement.engagement_type == "dislike":
            video.dislikes = max(0, video.dislikes - 1)
        elif engagement.engagement_type == "save":
            video.saves = max(0, video.saves - 1)
        elif engagement.engagement_type == "share":
            video.shares = max(0, video.shares - 1)
        
        db.commit()
        return {"message": f"Removed {engagement.engagement_type}"}
    else:
        # Add engagement
        new_engagement = VideoEngagement(
            video_id=video_id,
            user_id=current_user.id,
            engagement_type=engagement.engagement_type
        )
        db.add(new_engagement)
        
        # Update video stats
        if engagement.engagement_type == "like":
            video.likes += 1
            # Remove dislike if exists
            dislike = db.query(VideoEngagement).filter(
                VideoEngagement.video_id == video_id,
                VideoEngagement.user_id == current_user.id,
                VideoEngagement.engagement_type == "dislike"
            ).first()
            if dislike:
                db.delete(dislike)
                video.dislikes = max(0, video.dislikes - 1)
        elif engagement.engagement_type == "dislike":
            video.dislikes += 1
            # Remove like if exists
            like = db.query(VideoEngagement).filter(
                VideoEngagement.video_id == video_id,
                VideoEngagement.user_id == current_user.id,
                VideoEngagement.engagement_type == "like"
            ).first()
            if like:
                db.delete(like)
                video.likes = max(0, video.likes - 1)
        elif engagement.engagement_type == "save":
            video.saves += 1
        elif engagement.engagement_type == "share":
            video.shares += 1
        
        db.commit()
        return {"message": f"Added {engagement.engagement_type}"}

# ============================================
# VIDEO UPLOAD ENDPOINT
# ============================================

class VideoUploadCreate(BaseModel):
    title: str
    description: str
    category: str
    target_audience: str
    video_url: str
    thumbnail_url: Optional[str] = None

@app.post("/api/videos/upload")
async def upload_video(
    video_data: VideoUploadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a video for review"""
    
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only tutors can upload videos")
    
    tutor = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    # Create video reel
    video = VideoReel(
        tutor_id=tutor.id,
        title=video_data.title,
        description=video_data.description,
        video_url=video_data.video_url,
        thumbnail_url=video_data.thumbnail_url,
        category=video_data.category,
        grade_level=video_data.target_audience,
        is_active=False  # Not active until reviewed
    )
    
    db.add(video)
    db.commit()
    db.refresh(video)
    
    return {
        "id": video.id,
        "message": "Video submitted for review",
        "status": "under_review"
    }

# ============================================
# SCHEDULE/SESSION ENDPOINTS
# ============================================

class ScheduleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date: date
    time: str
    duration: int = 60
    type: str = "online"
    notes: Optional[str] = None

@app.post("/api/tutor/schedules")
async def create_schedule(
    schedule_data: ScheduleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a schedule/session"""
    
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only tutors can create schedules")
    
    tutor = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    # Store schedule in availability JSON
    if not tutor.availability:
        tutor.availability = []
    
    schedule_dict = schedule_data.dict()
    schedule_dict["id"] = str(uuid.uuid4())
    schedule_dict["created_at"] = datetime.utcnow().isoformat()
    
    tutor.availability.append(schedule_dict)
    db.commit()
    
    return {
        "message": "Schedule created successfully",
        "id": schedule_dict["id"]
    }

# 2. Fix the /api/videos/filter-counts endpoint (around line 1344)
@app.get("/api/videos/filter-counts")
def get_filter_counts(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get counts for each filter type - FIXED"""
    
    # Get current user
    current_user = None
    auth_header = request.headers.get("authorization", "")
    
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                current_user = db.query(User).filter(User.id == user_id).first()
        except:
            pass
    
    if not current_user:
        # Count all videos excluding Ads for non-authenticated users
        all_count = db.query(VideoReel).filter(
            VideoReel.is_active == True,
            or_(VideoReel.category != 'Ad', VideoReel.category == None)
        ).count()
        
        return {
            "all": all_count,
            "favorites": 0,
            "saved": 0,
            "liked": 0,
            "history": 0
        }
    
    # Get all active videos count (excluding Ads)
    all_count = db.query(VideoReel).filter(
        VideoReel.is_active == True,
        or_(VideoReel.category != 'Ad', VideoReel.category == None)
    ).count()
    
    # Get user-specific counts with correct engagement type
    favorites = db.query(VideoEngagement).filter(
        VideoEngagement.user_id == current_user.id,
        VideoEngagement.engagement_type == "favorite"  # Fixed: singular form
    ).count()
    
    saved = db.query(VideoEngagement).filter(
        VideoEngagement.user_id == current_user.id,
        VideoEngagement.engagement_type == "save"
    ).count()
    
    liked = db.query(VideoEngagement).filter(
        VideoEngagement.user_id == current_user.id,
        VideoEngagement.engagement_type == "like"
    ).count()
    
    history = db.query(VideoEngagement).filter(
        VideoEngagement.user_id == current_user.id,
        VideoEngagement.engagement_type == "view"
    ).count()
    
    return {
        "all": all_count,
        "favorites": favorites,  # Changed from "favorite" to match frontend
        "saved": saved,
        "liked": liked,
        "history": history
    }
# ============================================
# COMMENTS ENDPOINTS
# ============================================

@app.get("/api/videos/reels/{video_id}/comments")
def get_video_comments(
    video_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get comments for a video with proper reply structure"""
    
    # Get parent comments only
    parent_comments = db.query(VideoComment).filter(
        VideoComment.video_id == video_id,
        VideoComment.parent_comment_id == None,
        VideoComment.is_deleted == False
    ).order_by(desc(VideoComment.created_at)).offset((page - 1) * limit).limit(limit).all()
    
    comments_data = []
    for comment in parent_comments:
        user = db.query(User).filter(User.id == comment.user_id).first()
        
        # Get all replies for this comment
        replies = db.query(VideoComment).filter(
            VideoComment.parent_comment_id == comment.id,
            VideoComment.is_deleted == False
        ).order_by(VideoComment.created_at).all()
        
        replies_data = []
        for reply in replies:
            reply_user = db.query(User).filter(User.id == reply.user_id).first()
            replies_data.append({
                "id": reply.id,
                "user_id": reply.user_id,
                "user_name": f"{reply_user.first_name} {reply_user.last_name}" if reply_user else "Unknown",
                "user_picture": reply_user.profile_picture if reply_user else None,
                "text": reply.text,
                "created_at": reply.created_at.isoformat(),
                "is_edited": reply.is_edited,
                "can_edit": False
            })
        
        comments_data.append({
            "id": comment.id,
            "user_id": comment.user_id,
            "user_name": f"{user.first_name} {user.last_name}" if user else "Unknown",
            "user_picture": user.profile_picture if user else None,
            "text": comment.text,
            "created_at": comment.created_at.isoformat(),
            "is_edited": comment.is_edited,
            "replies": replies_data,
            "can_edit": False
        })
    
    # Get total count
    total = db.query(VideoComment).filter(
        VideoComment.video_id == video_id,
        VideoComment.parent_comment_id == None,
        VideoComment.is_deleted == False
    ).count()
    
    return {
        "comments": comments_data,
        "total": total,
        "page": page,
        "has_more": total > (page * limit)
    }

@app.post("/api/videos/reels/{video_id}/comments")
def add_video_comment(
    video_id: int,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment to a video"""
    
    # Check if video exists
    video = db.query(VideoReel).filter(VideoReel.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Create comment
    new_comment = VideoComment(
        video_id=video_id,
        user_id=current_user.id,
        parent_comment_id=comment_data.parent_comment_id,
        text=comment_data.text
    )
    
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    # Return comment with user info
    return {
        "id": new_comment.id,
        "user_id": new_comment.user_id,
        "user_name": f"{current_user.first_name} {current_user.last_name}",
        "user_picture": current_user.profile_picture,
        "text": new_comment.text,
        "created_at": new_comment.created_at.isoformat(),
        "is_edited": False,
        "replies": []
    }

# 3. Fix comment reply endpoint body handling (around line 1540)
@app.post("/api/videos/reels/{video_id}/comments/{comment_id}/reply")
def reply_to_comment(
    video_id: int,
    comment_id: int,
    body: Dict[str, str] = Body(...),  # Changed to accept full body object
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reply to a comment - FIXED"""
    
    # Extract text from body
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Reply text is required")
    
    # Verify parent comment exists
    parent = db.query(VideoComment).filter(
        VideoComment.id == comment_id,
        VideoComment.video_id == video_id,
        VideoComment.is_deleted == False
    ).first()
    
    if not parent:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    reply = VideoComment(
        video_id=video_id,
        user_id=current_user.id,
        parent_comment_id=comment_id,
        text=text
    )
    
    db.add(reply)
    db.commit()
    db.refresh(reply)
    
    return {
        "id": reply.id,
        "user_id": reply.user_id,
        "user_name": f"{current_user.first_name} {current_user.last_name}",
        "user_picture": current_user.profile_picture,
        "text": reply.text,
        "created_at": reply.created_at.isoformat(),
        "is_edited": False
    }


@app.put("/api/comments/{comment_id}")
def edit_comment(
    comment_id: int,
    text: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Edit a comment"""
    
    comment = db.query(VideoComment).filter(
        VideoComment.id == comment_id,
        VideoComment.user_id == current_user.id,
        VideoComment.is_deleted == False
    ).first()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found or not authorized")
    
    comment.text = text
    comment.is_edited = True
    comment.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": "Comment updated successfully",
        "text": comment.text,
        "is_edited": True
    }

@app.delete("/api/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a comment (soft delete)"""
    
    comment = db.query(VideoComment).filter(
        VideoComment.id == comment_id,
        VideoComment.user_id == current_user.id,
        VideoComment.is_deleted == False
    ).first()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found or not authorized")
    
    # Soft delete
    comment.is_deleted = True
    comment.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Comment deleted successfully"}

# ============================================
# CHAPTERS ENDPOINTS
# ============================================

@app.get("/api/videos/reels/{video_id}/chapters")
def get_video_chapters(
    video_id: int,
    db: Session = Depends(get_db)
):
    """Get chapters for a video"""
    
    chapters = db.query(VideoChapter).filter(
        VideoChapter.video_id == video_id
    ).order_by(VideoChapter.order, VideoChapter.timestamp).all()
    
    return [
        {
            "id": chapter.id,
            "title": chapter.title,
            "timestamp": chapter.timestamp,
            "description": chapter.description,
            "order": chapter.order
        }
        for chapter in chapters
    ]

@app.post("/api/videos/reels/{video_id}/chapters")
def add_video_chapter(
    video_id: int,
    title: str = Body(...),
    timestamp: int = Body(...),
    description: Optional[str] = Body(None),
    order: int = Body(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a chapter to a video (tutor only)"""
    
    # Check if user is a tutor and owns the video
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only tutors can add chapters")
    
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    video = db.query(VideoReel).filter(
        VideoReel.id == video_id,
        VideoReel.tutor_id == tutor.id if tutor else None
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found or not authorized")
    
    # Create chapter
    new_chapter = VideoChapter(
        video_id=video_id,
        title=title,
        timestamp=timestamp,
        description=description,
        order=order
    )
    
    db.add(new_chapter)
    db.commit()
    db.refresh(new_chapter)
    
    return {
        "id": new_chapter.id,
        "title": new_chapter.title,
        "timestamp": new_chapter.timestamp,
        "description": new_chapter.description,
        "order": new_chapter.order
    }

# ============================================
# CONNECTION ENDPOINTS
# ============================================

@app.post("/api/tutor/{tutor_id}/connect")
def send_connection_request(
    tutor_id: int,
    message: Optional[str] = Body(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send connection request to tutor"""
    tutor = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    
    # Check if connection already exists
    existing = db.query(TutorConnection).filter(
        TutorConnection.student_id == current_user.id,
        TutorConnection.tutor_id == tutor_id
    ).first()
    
    if existing:
        if existing.status == "pending":
            return {"message": "Connection request already sent", "status": "pending"}
        elif existing.status == "accepted":
            return {"message": "Already connected", "status": "connected"}
        elif existing.status == "rejected":
            # Allow re-sending after rejection
            existing.status = "pending"
            existing.created_at = datetime.utcnow()
            existing.connection_message = message
            db.commit()
            return {"message": "Connection request resent", "status": "pending"}
    
    # Create new connection request
    connection = TutorConnection(
        student_id=current_user.id,
        tutor_id=tutor_id,
        initiated_by=current_user.id,
        connection_message=message,
        status="pending"
    )
    
    db.add(connection)
    db.commit()
    
    return {"message": "Connection request sent", "status": "pending"}

@app.post("/api/tutor/{tutor_id}/disconnect")
def disconnect_from_tutor(
    tutor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect from tutor"""
    connection = db.query(TutorConnection).filter(
        TutorConnection.student_id == current_user.id,
        TutorConnection.tutor_id == tutor_id
    ).first()
    
    if not connection:
        raise HTTPException(status_code=404, detail="No connection found")
    
    db.delete(connection)
    db.commit()
    
    return {"message": "Disconnected successfully"}

@app.get("/api/tutor/{tutor_id}/connections")
def get_tutor_connections(
    tutor_id: int,
    db: Session = Depends(get_db)
):
    """Get tutor connection count and stats"""
    
    # Count accepted connections
    connection_count = db.query(TutorConnection).filter(
        TutorConnection.tutor_id == tutor_id,
        TutorConnection.status == "accepted"
    ).count()
    
    # Get video count
    video_count = db.query(VideoReel).filter(
        VideoReel.tutor_id == tutor_id,
        VideoReel.is_active == True
    ).count()
    
    # Get tutor profile for additional stats
    tutor = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    
    return {
        "total": connection_count,
        "videos": video_count,
        "students": tutor.total_students if tutor else 0,
        "sessions": tutor.total_sessions if tutor else 0
    }

@app.get("/api/tutor/{tutor_id}/connection-status")
def get_connection_status(
    tutor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get connection status with tutor"""
    connection = db.query(TutorConnection).filter(
        TutorConnection.student_id == current_user.id,
        TutorConnection.tutor_id == tutor_id
    ).first()
    
    if not connection:
        return {"status": "not_connected"}
    
    return {
        "status": connection.status,
        "created_at": connection.created_at.isoformat(),
        "accepted_at": connection.accepted_at.isoformat() if connection.accepted_at else None
    }

# ============================================
# PLAYLIST ENDPOINTS (NEW)
# ============================================

@app.get("/api/videos/playlists")
def get_playlists(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's playlists"""
    playlists = db.query(Playlist).filter(
        Playlist.user_id == current_user.id
    ).order_by(desc(Playlist.created_at)).all()
    
    result = []
    for playlist in playlists:
        video_count = db.query(PlaylistVideo).filter(
            PlaylistVideo.playlist_id == playlist.id
        ).count()
        
        result.append({
            "id": playlist.id,
            "name": playlist.name,
            "description": playlist.description,
            "is_public": playlist.is_public,
            "video_count": video_count,
            "created_at": playlist.created_at.isoformat(),
            "updated_at": playlist.updated_at.isoformat() if playlist.updated_at else None
        })
    
    return result

@app.post("/api/videos/playlists")
def create_playlist(
    playlist_data: PlaylistCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new playlist"""
    
    # Check if playlist name already exists for this user
    existing = db.query(Playlist).filter(
        Playlist.user_id == current_user.id,
        Playlist.name == playlist_data.name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Playlist with this name already exists"
        )
    
    # Create playlist
    playlist = Playlist(
        user_id=current_user.id,
        name=playlist_data.name,
        description=playlist_data.description,
        is_public=playlist_data.is_public
    )
    
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    
    return {
        "id": playlist.id,
        "message": "Playlist created successfully",
        "name": playlist.name
    }

@app.post("/api/videos/playlists/{playlist_id}/videos")
def add_video_to_playlist(
    playlist_id: int,
    video_data: PlaylistVideoAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add video to playlist"""
    
    # Check if playlist exists and belongs to user
    playlist = db.query(Playlist).filter(
        Playlist.id == playlist_id,
        Playlist.user_id == current_user.id
    ).first()
    
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Check if video exists
    video = db.query(VideoReel).filter(
        VideoReel.id == video_data.video_id,
        VideoReel.is_active == True
    ).first()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Check if video already in playlist
    existing = db.query(PlaylistVideo).filter(
        PlaylistVideo.playlist_id == playlist_id,
        PlaylistVideo.video_id == video_data.video_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Video already in playlist"
        )
    
    # Get the highest order number in the playlist
    max_order = db.query(func.max(PlaylistVideo.order)).filter(
        PlaylistVideo.playlist_id == playlist_id
    ).scalar() or 0
    
    # Add video to playlist
    playlist_video = PlaylistVideo(
        playlist_id=playlist_id,
        video_id=video_data.video_id,
        order=max_order + 1
    )
    
    db.add(playlist_video)
    db.commit()
    
    return {"message": "Video added to playlist"}

# ============================================
# SEED DATA ENDPOINTS
# ============================================

@app.post("/api/seed-ad-videos")
def seed_ad_videos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Seed Ad videos with descriptions and comments"""
    
    # Get all tutors
    tutors = db.query(TutorProfile).limit(5).all()
    if not tutors:
        return {"message": "No tutors found. Please create tutors first."}
    
    videos_created = 0
    
    # Sample ad content
    ad_contents = [
        {
            "title": "Master Mathematics in 30 Days",
            "description": """Transform your math skills with our comprehensive program!
            
            🎯 What you'll learn:
            - Advanced problem-solving techniques
            - Quick mental math strategies
            - Exam preparation tips
            - Real-world applications
            
            ✅ Perfect for students preparing for national exams
            ✅ Personalized learning approach
            ✅ Daily practice exercises included
            
            Join hundreds of successful students who improved their grades!""",
            "subject": "Mathematics",
            "grade_level": "Grade 12"
        },
        {
            "title": "Physics Excellence Program",
            "description": """Unlock the mysteries of physics with expert guidance!
            
            🔬 Course highlights:
            - Interactive experiments
            - Visual demonstrations
            - Problem-solving workshops
            - Exam-focused preparation
            
            ⚡ Topics covered:
            - Mechanics and Motion
            - Electricity and Magnetism
            - Waves and Optics
            - Modern Physics
            
            Get ready to ace your physics exams!""",
            "subject": "Physics",
            "grade_level": "Grade 11"
        },
        {
            "title": "English Mastery Course",
            "description": """Become fluent and confident in English!
            
            📚 What's included:
            - Grammar fundamentals
            - Vocabulary building
            - Speaking practice
            - Writing skills
            
            🌟 Special features:
            - Native speaker sessions
            - Interactive discussions
            - Essay writing workshops
            - TOEFL/IELTS preparation
            
            Start your journey to English fluency today!""",
            "subject": "English",
            "grade_level": "Grade 10"
        }
    ]
    
    # Create videos for each tutor
    for tutor in tutors:
        for content in ad_contents:
            # Create video with Ad category
            video = VideoReel(
                tutor_id=tutor.id,
                title=content["title"],
                description=content["description"],
                video_url="/videos/sample_ad_video.mp4",
                thumbnail_url="/Pictures/ad_thumbnail.jpg",
                duration="15:30",
                category="Ad",
                subject=content["subject"],
                grade_level=content["grade_level"],
                is_featured=True,
                views=random.randint(1000, 10000),
                likes=random.randint(100, 500),
                saves=random.randint(50, 200)
            )
            
            db.add(video)
            db.flush()
            
            # Add sample comments
            users = db.query(User).limit(3).all()
            for user in users:
                comment = VideoComment(
                    video_id=video.id,
                    user_id=user.id,
                    text=random.choice([
                        "This course really helped me improve my grades!",
                        "Excellent teaching method, highly recommended!",
                        "The best tutorial I've found so far!",
                        "Clear explanations and great examples.",
                        "Worth every minute of watching!"
                    ])
                )
                db.add(comment)
            
            # Add video chapters
            chapters = [
                {"title": "Introduction", "timestamp": 0, "order": 1},
                {"title": "Core Concepts", "timestamp": 180, "order": 2},
                {"title": "Practice Problems", "timestamp": 480, "order": 3},
                {"title": "Advanced Topics", "timestamp": 720, "order": 4},
                {"title": "Summary & Next Steps", "timestamp": 900, "order": 5}
            ]
            
            for chapter_data in chapters:
                chapter = VideoChapter(
                    video_id=video.id,
                    title=chapter_data["title"],
                    timestamp=chapter_data["timestamp"],
                    order=chapter_data["order"]
                )
                db.add(chapter)
            
            videos_created += 1
    
    # Update tutor stats
    for tutor in tutors:
        tutor.total_sessions = random.randint(50, 200)
        tutor.total_students = random.randint(20, 100)
        
    db.commit()
    
    return {
        "message": f"Created {videos_created} Ad videos with comments and chapters",
        "videos": videos_created
    }

# ============================================
# ROOT ENDPOINT
# ============================================

@app.get("/")
def root():
    return {
        "message": "Astegni Educational Platform API",
        "version": "2.1.0",
        "documentation": "/docs",
        "status": "operational",
        "fixed_issues": [
            "Added refresh token endpoint",
            "Fixed playlist endpoints",
            "Fixed video engagement counts",
            "Fixed connection button updates",
            "Fixed filter counts",
            "Fixed description and chapters loading"
        ]
    }

# ============================================
# STUB ENDPOINTS FOR FRONTEND COMPATIBILITY
# ============================================

@app.get("/api/counters")
def get_counters(db: Session = Depends(get_db)):
    """Get platform statistics counters"""
    student_count = db.query(User).filter(
        text("users.roles::jsonb @> '[\"student\"]'::jsonb")
    ).count()
    
    tutor_count = db.query(User).filter(
        text("users.roles::jsonb @> '[\"tutor\"]'::jsonb")
    ).count()
    
    video_count = db.query(VideoReel).filter(VideoReel.is_active == True).count()
    session_count = db.query(TutoringSession).count()
    
    return {
        "students": student_count,
        "tutors": tutor_count,
        "videos": video_count,
        "sessions": session_count
    }

@app.get("/api/news")
def get_news():
    """Get platform news/updates"""
    return {
        "news": [
            {
                "id": 1,
                "title": "Welcome to Astegni",
                "content": "Your educational journey starts here",
                "date": datetime.utcnow().isoformat(),
                "category": "announcement"
            }
        ],
        "total": 1
    }

@app.get("/api/my-roles")
def get_my_roles(current_user: User = Depends(get_current_user)):
    """Get current user's roles"""
    return {
        "roles": current_user.roles,
        "active_role": current_user.active_role,
        "available_roles": ["student", "tutor", "parent", "institute"]
    }

@app.get("/api/videos")
def get_videos_redirect():
    """Redirect message for old video endpoint"""
    return {"message": "Please use /api/videos/reels instead"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)