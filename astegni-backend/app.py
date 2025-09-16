"""
Astegni Educational Platform - Complete Backend API
Supports all pages in branch/, my-profile-tier-1/, and view-profile-tier-1/ directories
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
    version="2.0.0",
    description="Complete backend API for Astegni Educational Platform"
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
    followers = relationship("TutorFollow", back_populates="tutor")

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
    tags = Column(JSON, default=[])
    
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

class VideoEngagement(Base):
    __tablename__ = "video_engagements"
    
    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("video_reels.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    engagement_type = Column(String, nullable=False)  # like, dislike, save, share
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

class TutorFollow(Base):
    __tablename__ = "tutor_follows"
    
    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tutor_id = Column(Integer, ForeignKey("tutor_profiles.id"), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    tutor = relationship("TutorProfile", back_populates="followers")

class FavoriteTutor(Base):
    __tablename__ = "favorite_tutors"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tutor_id = Column(Integer, ForeignKey("tutor_profiles.id"), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

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

class TutorProfileUpdate(BaseModel):
    bio: Optional[str]
    quote: Optional[str]
    gender: Optional[str]
    courses: Optional[List[str]]
    grades: Optional[List[str]]
    location: Optional[str]
    teaches_at: Optional[str]
    learning_method: Optional[str]
    teaching_methods: Optional[List[str]]
    experience: Optional[int]
    price: Optional[float]
    availability: Optional[Dict[str, Any]]

class StudentProfileUpdate(BaseModel):
    date_of_birth: Optional[str]
    gender: Optional[str]
    grade_level: Optional[str]
    school_name: Optional[str]
    subjects: Optional[List[str]]
    weak_subjects: Optional[List[str]]
    strong_subjects: Optional[List[str]]
    learning_style: Optional[str]
    academic_goals: Optional[str]
    guardian_name: Optional[str]
    guardian_phone: Optional[str]

class SessionCreate(BaseModel):
    tutor_id: int
    subject: str
    topic: Optional[str]
    session_date: date
    start_time: str
    duration: int = 60
    mode: str = "online"
    location: Optional[str]
    meeting_link: Optional[str]

class VideoEngagementRequest(BaseModel):
    engagement_type: str  # like, dislike, save, share

class CommentCreate(BaseModel):
    text: str
    parent_comment_id: Optional[int] = None

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

@app.get("/api/my-roles")
def get_my_roles(current_user: User = Depends(get_current_user)):
    """Get user's roles"""
    return {
        "roles": current_user.roles,
        "active_role": current_user.active_role
    }

@app.post("/api/switch-role")
def switch_role(
    role_data: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Switch user's active role"""
    new_role = role_data.get("role")
    
    if new_role not in current_user.roles:
        raise HTTPException(
            status_code=400,
            detail=f"User does not have {new_role} role"
        )
    
    current_user.active_role = new_role
    db.commit()
    
    return {"message": "Role switched successfully", "active_role": new_role}

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
# TUTOR ENDPOINTS - For find-tutors.html & tutor-profile.html
# ============================================

@app.get("/api/tutors")
def get_tutors(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    verified_only: bool = Query(True),  # ADD THIS PARAMETER
    search: Optional[str] = None,
    subject: Optional[str] = None,
    grade: Optional[str] = None,
    location: Optional[str] = None,
    learning_method: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    sort_by: str = Query("rating", regex="^(rating|price|experience|name)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    """Get list of tutors with filters - For find-tutors.html"""
    query = db.query(TutorProfile).join(User).filter(
        TutorProfile.is_active == True,
        User.is_active == True
    )

     # Apply verified filter based on parameter
    if verified_only:
        query = query.filter(TutorProfile.is_verified == True)
    
    # Apply filters
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.first_name.ilike(search_term),
                User.last_name.ilike(search_term),
                TutorProfile.bio.ilike(search_term),
                TutorProfile.courses.cast(String).ilike(search_term)
            )
        )
    
    if subject:
        query = query.filter(TutorProfile.courses.cast(String).contains(subject))
    
    if grade:
        query = query.filter(TutorProfile.grades.cast(String).contains(grade))
    
    if location:
        query = query.filter(TutorProfile.location == location)
    
    if learning_method:
        query = query.filter(TutorProfile.learning_method == learning_method)
    
    if min_price is not None:
        query = query.filter(TutorProfile.price >= min_price)
    
    if max_price is not None:
        query = query.filter(TutorProfile.price <= max_price)
    
    if min_rating is not None:
        query = query.filter(TutorProfile.rating >= min_rating)
    
    # Sorting
    if sort_by == "rating":
        query = query.order_by(desc(TutorProfile.rating) if order == "desc" else TutorProfile.rating)
    elif sort_by == "price":
        query = query.order_by(desc(TutorProfile.price) if order == "desc" else TutorProfile.price)
    elif sort_by == "experience":
        query = query.order_by(desc(TutorProfile.experience) if order == "desc" else TutorProfile.experience)
    elif sort_by == "name":
        query = query.order_by(desc(User.first_name) if order == "desc" else User.first_name)
    
    # Pagination
    total = query.count()
    tutors = query.offset((page - 1) * limit).limit(limit).all()
    
    # Format response
    results = []
    for tutor in tutors:
        results.append({
            "id": tutor.id,
            "user_id": tutor.user_id,
            "name": f"{tutor.user.first_name} {tutor.user.last_name}",
            "profile_picture": tutor.user.profile_picture,
            "bio": tutor.bio,
            "courses": tutor.courses or [],
            "grades": tutor.grades or [],
            "location": tutor.location,
            "learning_method": tutor.learning_method,
            "price": tutor.price,
            "currency": tutor.currency,
            "rating": tutor.rating,
            "rating_count": tutor.rating_count,
            "experience": tutor.experience,
            "is_verified": tutor.is_verified,
            "total_students": tutor.total_students,
            "total_sessions": tutor.total_sessions
        })
    
    return {
        "tutors": results,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@app.get("/api/tutor/profile")
def get_my_tutor_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current tutor's profile - For tutor-profile.html"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as tutor")
    
    profile = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    
    if not profile:
        # Create profile if it doesn't exist
        profile = TutorProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    return {
        "id": profile.id,
        "user": {
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "email": current_user.email,
            "phone": current_user.phone,
            "profile_picture": current_user.profile_picture
        },
        "bio": profile.bio,
        "quote": profile.quote,
        "gender": profile.gender,
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
        "availability": profile.availability or {},
        "rating": profile.rating,
        "rating_count": profile.rating_count,
        "rating_breakdown": profile.rating_breakdown,
        "total_students": profile.total_students,
        "total_sessions": profile.total_sessions,
        "is_verified": profile.is_verified,
        "profile_completion": profile.profile_completion,
        "cover_image": profile.cover_image,
        "intro_video_url": profile.intro_video_url
    }

@app.put("/api/tutor/profile")
def update_tutor_profile(
    updates: TutorProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update tutor profile"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as tutor")
    
    profile = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    
    if not profile:
        profile = TutorProfile(user_id=current_user.id)
        db.add(profile)
    
    # Update fields
    for field, value in updates.dict(exclude_unset=True).items():
        setattr(profile, field, value)
    
    # Calculate profile completion
    required_fields = ['bio', 'courses', 'grades', 'location', 'price', 'experience']
    completed = sum(1 for field in required_fields if getattr(profile, field))
    profile.profile_completion = (completed / len(required_fields)) * 100
    profile.profile_complete = profile.profile_completion >= 80
    
    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)
    
    return {"message": "Profile updated successfully", "completion": profile.profile_completion}

@app.get("/api/tutor/{tutor_id}")
def get_tutor_public_profile(tutor_id: int, db: Session = Depends(get_db)):
    """Get public tutor profile - For view-tutor.html"""
    profile = db.query(TutorProfile).filter(
        TutorProfile.id == tutor_id,
        TutorProfile.is_active == True
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Tutor not found")
    
    # Increment view count or similar analytics here
    
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

# ============================================
# STUDENT ENDPOINTS - For student-profile.html
# ============================================

@app.get("/api/student/profile")
def get_my_student_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current student's profile - For student-profile.html"""
    if "student" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as student")
    
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    
    if not profile:
        # Create profile if it doesn't exist
        profile = StudentProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    return {
        "id": profile.id,
        "user": {
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "email": current_user.email,
            "phone": current_user.phone,
            "profile_picture": current_user.profile_picture
        },
        "date_of_birth": profile.date_of_birth.isoformat() if profile.date_of_birth else None,
        "gender": profile.gender,
        "grade_level": profile.grade_level,
        "school_name": profile.school_name,
        "school_address": profile.school_address,
        "subjects": profile.subjects or [],
        "weak_subjects": profile.weak_subjects or [],
        "strong_subjects": profile.strong_subjects or [],
        "interests": profile.interests or [],
        "learning_style": profile.learning_style,
        "preferred_session_time": profile.preferred_session_time,
        "preferred_learning_mode": profile.preferred_learning_mode,
        "academic_goals": profile.academic_goals,
        "career_aspirations": profile.career_aspirations,
        "current_gpa": profile.current_gpa,
        "target_gpa": profile.target_gpa,
        "guardian_name": profile.guardian_name,
        "guardian_phone": profile.guardian_phone,
        "guardian_email": profile.guardian_email,
        "guardian_relationship": profile.guardian_relationship,
        "total_sessions": profile.total_sessions,
        "total_hours": profile.total_hours,
        "courses_enrolled": profile.courses_enrolled,
        "profile_completion": profile.profile_completion
    }

@app.put("/api/student/profile")
def update_student_profile(
    updates: StudentProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update student profile"""
    if "student" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as student")
    
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    
    if not profile:
        profile = StudentProfile(user_id=current_user.id)
        db.add(profile)
    
    # Update fields
    for field, value in updates.dict(exclude_unset=True).items():
        if field == "date_of_birth" and value:
            value = datetime.strptime(value, "%Y-%m-%d").date()
        setattr(profile, field, value)
    
    # Calculate profile completion
    profile.profile_completion = calculate_profile_completion(profile)
    profile.profile_complete = profile.profile_completion >= 80
    
    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)
    
    return {"message": "Profile updated successfully", "completion": profile.profile_completion}

@app.get("/api/student/{student_id}")
def get_student_public_profile(student_id: int, db: Session = Depends(get_db)):
    """Get public student profile - For view-student.html"""
    profile = db.query(StudentProfile).filter(
        StudentProfile.id == student_id,
        StudentProfile.is_active == True
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return {
        "id": profile.id,
        "name": f"{profile.user.first_name} {profile.user.last_name}",
        "profile_picture": profile.user.profile_picture,
        "grade_level": profile.grade_level,
        "school_name": profile.school_name,
        "subjects": profile.subjects or [],
        "interests": profile.interests or [],
        "learning_style": profile.learning_style,
        "academic_goals": profile.academic_goals,
        "total_sessions": profile.total_sessions,
        "total_hours": profile.total_hours,
        "courses_enrolled": profile.courses_enrolled
    }

# ============================================
# VIDEO/REELS ENDPOINTS - For reels.html
# ============================================

@app.get("/api/videos/reels")
def get_video_reels(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    filter: str = Query("all", regex="^(all|trending|recent|following|saved)$"),
    subject: Optional[str] = None,
    grade: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get video reels - For reels.html"""
    query = db.query(VideoReel).join(TutorProfile).filter(VideoReel.is_active == True)
    
    # Apply filters
    if filter == "trending":
        # Get videos with most engagement in last 7 days
        query = query.order_by(desc(VideoReel.views + VideoReel.likes))
    elif filter == "recent":
        query = query.order_by(desc(VideoReel.created_at))
    elif filter == "following" and current_user:
        # Get videos from followed tutors
        followed_tutors = db.query(TutorFollow.tutor_id).filter(
            TutorFollow.follower_id == current_user.id
        ).subquery()
        query = query.filter(VideoReel.tutor_id.in_(followed_tutors))
    elif filter == "saved" and current_user:
        # Get saved videos
        saved_videos = db.query(VideoEngagement.video_id).filter(
            VideoEngagement.user_id == current_user.id,
            VideoEngagement.engagement_type == "save"
        ).subquery()
        query = query.filter(VideoReel.id.in_(saved_videos))
    
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
                VideoReel.tags.cast(String).ilike(search_term)
            )
        )
    
    # Pagination
    total = query.count()
    videos = query.offset((page - 1) * limit).limit(limit).all()
    
    # Format response
    results = []
    for video in videos:
        # Check if user has engaged with this video
        user_engagement = {}
        if current_user:
            engagements = db.query(VideoEngagement).filter(
                VideoEngagement.video_id == video.id,
                VideoEngagement.user_id == current_user.id
            ).all()
            for eng in engagements:
                user_engagement[eng.engagement_type] = True
        
        results.append({
            "id": video.id,
            "tutor_id": video.tutor_id,
            "tutor_name": f"{video.tutor.user.first_name} {video.tutor.user.last_name}",
            "tutor_picture": video.tutor.user.profile_picture,
            "tutor_verified": video.tutor.is_verified,
            "title": video.title,
            "description": video.description,
            "video_url": video.video_url,
            "thumbnail_url": video.thumbnail_url,
            "duration": video.duration,
            "category": video.category,
            "subject": video.subject,
            "grade_level": video.grade_level,
            "tags": video.tags or [],
            "views": video.views,
            "likes": video.likes,
            "dislikes": video.dislikes,
            "shares": video.shares,
            "saves": video.saves,
            "user_engagement": user_engagement,
            "created_at": video.created_at.isoformat(),
            "is_featured": video.is_featured
        })
    
    return {
        "videos": results,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@app.post("/api/videos/{video_id}/engage")
def engage_with_video(
    video_id: int,
    engagement: VideoEngagementRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Like, dislike, save, or share a video"""
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

@app.post("/api/videos/{video_id}/view")
def record_video_view(video_id: int, db: Session = Depends(get_db)):
    """Record a video view"""
    video = db.query(VideoReel).filter(VideoReel.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    video.views += 1
    db.commit()
    
    return {"views": video.views}

# ============================================
# SESSION/ENROLLMENT ENDPOINTS
# ============================================

@app.post("/api/student/enroll/{tutor_id}")
def enroll_with_tutor(
    tutor_id: int,
    subjects: List[str] = Body(...),
    session_frequency: str = Body(...),
    session_duration: int = Body(60),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enroll student with a tutor"""
    if "student" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as student")
    
    # Get student profile
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Please complete your profile first")
    
    # Get tutor
    tutor = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    
    # Check if already enrolled
    existing = db.query(TutorStudentEnrollment).filter(
        TutorStudentEnrollment.student_id == student.id,
        TutorStudentEnrollment.tutor_id == tutor_id,
        TutorStudentEnrollment.status == "active"
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled with this tutor")
    
    # Create enrollment
    enrollment = TutorStudentEnrollment(
        tutor_id=tutor_id,
        student_id=student.id,
        subjects=subjects,
        session_frequency=session_frequency,
        session_duration=session_duration,
        hourly_rate=tutor.price
    )
    
    db.add(enrollment)
    
    # Update student stats
    student.courses_enrolled += 1
    
    # Update tutor stats
    tutor.total_students += 1
    
    db.commit()
    db.refresh(enrollment)
    
    return {
        "message": "Successfully enrolled",
        "enrollment_id": enrollment.id,
        "tutor_name": f"{tutor.user.first_name} {tutor.user.last_name}"
    }

@app.post("/api/student/book-session")
def book_tutoring_session(
    session_data: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Book a tutoring session"""
    if "student" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as student")
    
    # Get student profile
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Please complete your profile first")
    
    # Get tutor
    tutor = db.query(TutorProfile).filter(TutorProfile.id == session_data.tutor_id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    
    # Create session
    session = TutoringSession(
        tutor_id=session_data.tutor_id,
        student_id=student.id,
        subject=session_data.subject,
        topic=session_data.topic,
        session_date=session_data.session_date,
        start_time=datetime.strptime(session_data.start_time, "%H:%M").time(),
        duration=session_data.duration,
        mode=session_data.mode,
        location=session_data.location,
        meeting_link=session_data.meeting_link,
        amount=tutor.price * (session_data.duration / 60)
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return {
        "message": "Session booked successfully",
        "session_id": session.id,
        "session_date": session.session_date.isoformat(),
        "start_time": session.start_time.isoformat(),
        "tutor_name": f"{tutor.user.first_name} {tutor.user.last_name}"
    }

@app.get("/api/student/sessions")
def get_student_sessions(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get student's tutoring sessions"""
    if "student" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as student")
    
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Profile not found")
    
    query = db.query(TutoringSession).filter(TutoringSession.student_id == student.id)
    
    if status:
        query = query.filter(TutoringSession.status == status)
    
    sessions = query.order_by(desc(TutoringSession.session_date)).all()
    
    results = []
    for session in sessions:
        results.append({
            "id": session.id,
            "tutor_name": f"{session.tutor.user.first_name} {session.tutor.user.last_name}",
            "tutor_picture": session.tutor.user.profile_picture,
            "subject": session.subject,
            "topic": session.topic,
            "session_date": session.session_date.isoformat(),
            "start_time": session.start_time.isoformat() if session.start_time else None,
            "duration": session.duration,
            "mode": session.mode,
            "location": session.location,
            "meeting_link": session.meeting_link,
            "status": session.status,
            "amount": session.amount,
            "payment_status": session.payment_status
        })
    
    return {"sessions": results, "total": len(results)}

@app.get("/api/tutor/sessions")
def get_tutor_sessions(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tutor's sessions"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as tutor")
    
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=400, detail="Profile not found")
    
    query = db.query(TutoringSession).filter(TutoringSession.tutor_id == tutor.id)
    
    if status:
        query = query.filter(TutoringSession.status == status)
    
    sessions = query.order_by(desc(TutoringSession.session_date)).all()
    
    results = []
    for session in sessions:
        results.append({
            "id": session.id,
            "student_name": f"{session.student.user.first_name} {session.student.user.last_name}",
            "student_picture": session.student.user.profile_picture,
            "subject": session.subject,
            "topic": session.topic,
            "session_date": session.session_date.isoformat(),
            "start_time": session.start_time.isoformat() if session.start_time else None,
            "duration": session.duration,
            "mode": session.mode,
            "location": session.location,
            "meeting_link": session.meeting_link,
            "status": session.status,
            "amount": session.amount,
            "payment_status": session.payment_status
        })
    
    return {"sessions": results, "total": len(results)}

# ============================================
# FAVORITE/FOLLOW ENDPOINTS
# ============================================

@app.post("/api/tutor/{tutor_id}/follow")
def follow_tutor(
    tutor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Follow/unfollow a tutor"""
    tutor = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    
    existing = db.query(TutorFollow).filter(
        TutorFollow.follower_id == current_user.id,
        TutorFollow.tutor_id == tutor_id
    ).first()
    
    if existing:
        db.delete(existing)
        db.commit()
        return {"message": "Unfollowed tutor", "following": False}
    else:
        follow = TutorFollow(
            follower_id=current_user.id,
            tutor_id=tutor_id
        )
        db.add(follow)
        db.commit()
        return {"message": "Following tutor", "following": True}

@app.post("/api/tutor/{tutor_id}/favorite")
def favorite_tutor(
    tutor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add/remove tutor from favorites"""
    tutor = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    
    existing = db.query(FavoriteTutor).filter(
        FavoriteTutor.user_id == current_user.id,
        FavoriteTutor.tutor_id == tutor_id
    ).first()
    
    if existing:
        db.delete(existing)
        db.commit()
        return {"message": "Removed from favorites", "favorited": False}
    else:
        favorite = FavoriteTutor(
            user_id=current_user.id,
            tutor_id=tutor_id
        )
        db.add(favorite)
        db.commit()
        return {"message": "Added to favorites", "favorited": True}

@app.get("/api/my-favorite-tutors")
def get_favorite_tutors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's favorite tutors"""
    favorites = db.query(FavoriteTutor).filter(
        FavoriteTutor.user_id == current_user.id
    ).join(TutorProfile).all()
    
    results = []
    for fav in favorites:
        tutor = db.query(TutorProfile).filter(TutorProfile.id == fav.tutor_id).first()
        if tutor:
            results.append({
                "id": tutor.id,
                "name": f"{tutor.user.first_name} {tutor.user.last_name}",
                "profile_picture": tutor.user.profile_picture,
                "subjects": tutor.courses or [],
                "rating": tutor.rating,
                "price": tutor.price,
                "location": tutor.location,
                "favorited_at": fav.created_at.isoformat()
            })
    
    return {"favorites": results, "total": len(results)}

# ============================================
# UPLOAD ENDPOINTS
# ============================================

@app.post("/api/upload/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload profile picture"""
    if file.content_type not in ["image/jpeg", "image/png", "image/gif"]:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    # Save file
    file_url = await save_uploaded_file(file, "profile-pictures")
    
    # Update user profile
    current_user.profile_picture = file_url
    db.commit()
    
    return {"message": "Profile picture uploaded", "url": file_url}

@app.post("/api/tutor/upload-video")
async def upload_tutor_video(
    title: str = Form(...),
    description: str = Form(...),
    subject: str = Form(...),
    grade_level: str = Form(...),
    video: UploadFile = File(...),
    thumbnail: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload educational video"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as tutor")
    
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=400, detail="Tutor profile not found")
    
    # Save video
    video_url = await save_uploaded_file(video, "videos")
    
    # Save thumbnail if provided
    thumbnail_url = None
    if thumbnail:
        thumbnail_url = await save_uploaded_file(thumbnail, "thumbnails")
    
    # Create video record
    video_reel = VideoReel(
        tutor_id=tutor.id,
        title=title,
        description=description,
        video_url=video_url,
        thumbnail_url=thumbnail_url,
        subject=subject,
        grade_level=grade_level
    )
    
    db.add(video_reel)
    db.commit()
    db.refresh(video_reel)
    
    return {
        "message": "Video uploaded successfully",
        "video_id": video_reel.id,
        "video_url": video_url
    }

# ============================================
# DASHBOARD/STATS ENDPOINTS
# ============================================

@app.get("/api/tutor/dashboard")
def get_tutor_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tutor dashboard data"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as tutor")
    
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=400, detail="Profile not found")
    
    # Get stats
    total_students = db.query(TutorStudentEnrollment).filter(
        TutorStudentEnrollment.tutor_id == tutor.id,
        TutorStudentEnrollment.status == "active"
    ).count()
    
    total_sessions = db.query(TutoringSession).filter(
        TutoringSession.tutor_id == tutor.id
    ).count()
    
    completed_sessions = db.query(TutoringSession).filter(
        TutoringSession.tutor_id == tutor.id,
        TutoringSession.status == "completed"
    ).count()
    
    upcoming_sessions = db.query(TutoringSession).filter(
        TutoringSession.tutor_id == tutor.id,
        TutoringSession.status == "scheduled",
        TutoringSession.session_date >= date.today()
    ).count()
    
    total_earnings = db.query(TutoringSession).filter(
        TutoringSession.tutor_id == tutor.id,
        TutoringSession.payment_status == "paid"
    ).with_entities(func.sum(TutoringSession.amount)).scalar() or 0
    
    total_videos = db.query(VideoReel).filter(
        VideoReel.tutor_id == tutor.id
    ).count()
    
    total_video_views = db.query(VideoReel).filter(
        VideoReel.tutor_id == tutor.id
    ).with_entities(func.sum(VideoReel.views)).scalar() or 0
    
    return {
        "stats": {
            "total_students": total_students,
            "total_sessions": total_sessions,
            "completed_sessions": completed_sessions,
            "upcoming_sessions": upcoming_sessions,
            "total_earnings": total_earnings,
            "total_videos": total_videos,
            "total_video_views": total_video_views,
            "rating": tutor.rating,
            "rating_count": tutor.rating_count,
            "profile_completion": tutor.profile_completion
        }
    }

@app.get("/api/student/dashboard")
def get_student_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get student dashboard data"""
    if "student" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as student")
    
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Profile not found")
    
    # Get stats
    active_enrollments = db.query(TutorStudentEnrollment).filter(
        TutorStudentEnrollment.student_id == student.id,
        TutorStudentEnrollment.status == "active"
    ).count()
    
    total_sessions = db.query(TutoringSession).filter(
        TutoringSession.student_id == student.id
    ).count()
    
    completed_sessions = db.query(TutoringSession).filter(
        TutoringSession.student_id == student.id,
        TutoringSession.status == "completed"
    ).count()
    
    upcoming_sessions = db.query(TutoringSession).filter(
        TutoringSession.student_id == student.id,
        TutoringSession.status == "scheduled",
        TutoringSession.session_date >= date.today()
    ).count()
    
    total_hours = db.query(TutoringSession).filter(
        TutoringSession.student_id == student.id,
        TutoringSession.status == "completed"
    ).with_entities(func.sum(TutoringSession.duration)).scalar() or 0
    
    saved_videos = db.query(VideoEngagement).filter(
        VideoEngagement.user_id == current_user.id,
        VideoEngagement.engagement_type == "save"
    ).count()
    
    return {
        "stats": {
            "active_enrollments": active_enrollments,
            "total_sessions": total_sessions,
            "completed_sessions": completed_sessions,
            "upcoming_sessions": upcoming_sessions,
            "total_hours": total_hours / 60,  # Convert to hours
            "saved_videos": saved_videos,
            "profile_completion": student.profile_completion
        }
    }

# ============================================
# ROOT ENDPOINT
# ============================================

@app.get("/")
def root():
    return {
        "message": "Astegni Educational Platform API",
        "version": "2.0.0",
        "documentation": "/docs",
        "status": "operational"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)