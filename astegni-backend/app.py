# 1. Standard library imports
import os
import re
import secrets
from datetime import datetime, timedelta
from typing import Optional, List

# 2. Third-party imports
from fastapi import FastAPI, HTTPException, Depends, status, Request, BackgroundTasks, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Boolean, Text, JSON, and_
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship  # Add relationship here

from pydantic import BaseModel, EmailStr, ConfigDict, validator
import bcrypt
import jwt
from dotenv import load_dotenv
from websocket_manager import manager

from fastapi.staticfiles import StaticFiles

# Load environment variables
load_dotenv()


# Configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY must be set in environment")
REFRESH_SECRET_KEY = os.getenv("REFRESH_SECRET_KEY")
if not REFRESH_SECRET_KEY:
    raise ValueError("REFRESH_SECRET_KEY must be set in environment")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
REMEMBER_ME_EXPIRE_DAYS = 30

# Convert DATABASE_URL to work with psycopg3
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://", "postgresql+psycopg://")

# Database setup
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Rate limiting
limiter = Limiter(key_func=get_remote_address)

# FastAPI app
app = FastAPI(title="Astegni API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)




# CORS middleware
# For development
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
# ========================
# Database Models
# ========================


# In app.py, modify the User model:
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    roles = Column(JSON, default=[])
    active_role = Column(String)
    profile_picture = Column(String)  # ADD THIS LINE
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    profile_data = Column(JSON, default={})
    last_login = Column(DateTime)
    email_verified = Column(Boolean, default=False)



# Import additional models
from tutor_models import TutorProfile

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    token = Column(String, unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_revoked = Column(Boolean, default=False)
    device_info = Column(String)  # Store browser/device info
    remember_me = Column(Boolean, default=False)


class Counter(Base):
    __tablename__ = "counters"

    id = Column(Integer, primary_key=True, index=True)
    counter_type = Column(String, unique=True, nullable=False)
    count = Column(Integer, default=0)
    label = Column(String, nullable=False)
    icon = Column(String)
    updated_at = Column(DateTime, default=datetime.utcnow)


class News(Base):
    __tablename__ = "news"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String)
    date = Column(String)
    is_breaking = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    duration = Column(String)
    views = Column(String)
    category = Column(String)
    likes = Column(Integer, default=0)
    dislikes = Column(Integer, default=0)
    thumbnail_url = Column(String)
    video_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class Partner(Base):
    __tablename__ = "partners"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    logo_url = Column(String)
    website = Column(String)
    order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    icon = Column(String)
    category = Column(String)
    level = Column(String)
    students = Column(String)
    rating = Column(Float)
    back_title = Column(String)
    back_icon = Column(String)
    back_level = Column(String)
    back_students = Column(String)
    back_rating = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)


class Testimonial(Base):
    __tablename__ = "testimonials"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    author = Column(String, nullable=False)
    role = Column(String)
    avatar_url = Column(String)
    rating = Column(Integer, default=5)
    is_active = Column(Boolean, default=True)


# Create tables
Base.metadata.create_all(bind=engine)

# ========================
# Pydantic Models
# ========================


class UserRegister(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    password: str
    role: str

    @validator('password')
    def validate_password(cls, v):
        """Enhanced password validation with special characters"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r"[A-Z]", v):
            raise ValueError(
                'Password must contain at least one uppercase letter')
        if not re.search(r"[a-z]", v):
            raise ValueError(
                'Password must contain at least one lowercase letter')
        if not re.search(r"\d", v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", v):
            raise ValueError(
                'Password must contain at least one special character')
        return v

    @validator('role')
    def validate_role(cls, v):
        valid_roles = ['user', 'student', 'tutor', 'guardian', 'bookstore',
                       'delivery', 'advertiser', 'author', 'church']
        if v not in valid_roles:
            raise ValueError(
                f'Invalid role. Must be one of: {", ".join(valid_roles)}')
        return v


class UserLogin(BaseModel):
    email: str
    password: str
    remember_me: bool = False  # Add remember me option


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: str
    phone: str
    role: str
    profile_picture: Optional[str]  # ADD THIS LINE
    created_at: datetime
    is_active: bool
    email_verified: bool

class UpdateProfilePicture(BaseModel):
    profile_picture: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class CounterResponse(BaseModel):
    counter_type: str
    count: int
    label: str
    icon: Optional[str]
    source: str = "Real"


class NewsResponse(BaseModel):
    id: int
    title: str
    content: str
    category: Optional[str]
    date: Optional[str]
    is_breaking: bool
    source: str = "Real"


class VideoResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    duration: Optional[str]
    views: Optional[str]
    category: Optional[str]
    likes: int
    dislikes: int
    source: str = "Real"


class PartnerResponse(BaseModel):
    id: int
    name: str
    logo_url: Optional[str]
    website: Optional[str]
    source: str = "Real"


class CourseResponse(BaseModel):
    id: int
    title: str
    icon: Optional[str]
    category: Optional[str]
    level: Optional[str]
    students: Optional[str]
    rating: Optional[float]
    back_title: Optional[str]
    back_icon: Optional[str]
    back_level: Optional[str]
    back_students: Optional[str]
    back_rating: Optional[float]
    source: str = "Real"


class TestimonialResponse(BaseModel):
    id: int
    text: str
    author: str
    role: Optional[str]
    avatar_url: Optional[str]
    rating: int
    source: str = "Real"

# ========================
# Dependency
# ========================


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ========================
# Helper Functions
# ========================


def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict, remember_me: bool = False):
    to_encode = data.copy()
    if remember_me:
        expire = datetime.utcnow() + timedelta(days=REMEMBER_ME_EXPIRE_DAYS)
    else:
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "jti": secrets.token_urlsafe(32)  # JWT ID for tracking
    })
    encoded_jwt = jwt.encode(
        to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt, expire


def verify_refresh_token(token: str, db: Session):
    try:
        payload = jwt.decode(token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            return None

        # Check if token exists and is not revoked
        db_token = db.query(RefreshToken).filter(
            RefreshToken.token == token,
            RefreshToken.is_revoked == False,
            RefreshToken.expires_at > datetime.utcnow()
        ).first()

        if not db_token:
            return None

        return payload.get("sub")  # Return user_id
    except jwt.PyJWTError:
        return None


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise credentials_exception
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

# ========================
# API Endpoints
# ========================


@app.get("/")
def read_root():
    return {"message": "Welcome to Astegni API", "version": "1.0.0", "status": "running"}


@app.post("/api/register", response_model=Token)
@limiter.limit("5/minute")
def register(request: Request, user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(User).filter(User.email == user_data.email).first()

    if db_user:
        # User exists - check password and add new role
        if not verify_password(user_data.password, db_user.password_hash):
            raise HTTPException(
                status_code=400, detail="Email already registered with different password")

        # Add new role if user doesn't have it
        if user_data.role not in db_user.roles:
            db_user.roles = db_user.roles + [user_data.role]
            db_user.active_role = user_data.role
            db.commit()
            db.refresh(db_user)
        else:
            raise HTTPException(
                status_code=400, detail=f"You already have the {user_data.role} role")
    else:
        # Generate default avatar based on role
        default_avatars = {
            'student': 'https://ui-avatars.com/api/?name=Student&background=10b981&color=fff',
            'tutor': 'https://ui-avatars.com/api/?name=Tutor&background=f59e0b&color=fff',
            'guardian': 'https://ui-avatars.com/api/?name=Parent&background=ef4444&color=fff',
            'bookstore': 'https://ui-avatars.com/api/?name=Bookstore&background=8b5cf6&color=fff',
            'delivery': 'https://ui-avatars.com/api/?name=Delivery&background=06b6d4&color=fff',
            'advertiser': 'https://ui-avatars.com/api/?name=Advertiser&background=ec4899&color=fff',
            'author': 'https://ui-avatars.com/api/?name=Author&background=6366f1&color=fff',
            'church': 'https://ui-avatars.com/api/?name=Church&background=a855f7&color=fff',
            'user': 'https://ui-avatars.com/api/?name=User&background=6366f1&color=fff'
        }
        
        # Create new user with initial role and default avatar
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            email=user_data.email,
            phone=user_data.phone,
            password_hash=hashed_password,
            roles=[user_data.role],
            active_role=user_data.role,
            profile_picture=default_avatars.get(user_data.role, default_avatars['user'])  # ADD THIS
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    # Update counters based on role
    counter_mapping = {
        "student": "students",
        "tutor": "tutors",
        "guardian": "parents"
    }

    if user_data.role in counter_mapping and user_data.role not in (db_user.roles[:-1] if len(db_user.roles) > 1 else []):
        counter = db.query(Counter).filter(
            Counter.counter_type == counter_mapping[user_data.role]
        ).first()
        if counter:
            counter.count += 1
            counter.updated_at = datetime.utcnow()
            db.commit()

    # Create tokens
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.id}, expires_delta=access_token_expires
    )

    refresh_token, expires_at = create_refresh_token(
        data={"sub": db_user.id}, remember_me=False
    )

    # Store refresh token in database
    db_refresh_token = RefreshToken(
        user_id=db_user.id,
        token=refresh_token,
        expires_at=expires_at,
        device_info=request.headers.get("User-Agent", "Unknown"),
        remember_me=False
    )
    db.add(db_refresh_token)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=db_user.id,
            first_name=db_user.first_name,
            last_name=db_user.last_name,
            email=db_user.email,
            phone=db_user.phone,
            role=db_user.active_role,
            profile_picture=db_user.profile_picture,  # ADD THIS
            created_at=db_user.created_at,
            is_active=db_user.is_active,
            email_verified=db_user.email_verified
        )
    }

@app.post("/api/switch-role")
def switch_role(
    request_data: dict,  # Accept JSON body
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    new_role = request_data.get('new_role')
    
    if not new_role:
        raise HTTPException(status_code=400, detail="New role not provided")
        
    if new_role not in current_user.roles:
        raise HTTPException(
            status_code=400, 
            detail="You don't have access to this role"
        )
    
    current_user.active_role = new_role
    db.commit()
    
    return {"message": f"Switched to {new_role} role", "active_role": new_role}

# Add endpoint to get user's roles


@app.get("/api/my-roles")
def get_my_roles(current_user: User = Depends(get_current_user)):
    return {
        "roles": current_user.roles,
        "active_role": current_user.active_role
    }

@app.put("/api/update-profile-picture")
def update_profile_picture(
    picture_data: UpdateProfilePicture,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's profile picture"""
    current_user.profile_picture = picture_data.profile_picture
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Profile picture updated successfully",
        "profile_picture": current_user.profile_picture
    }

@app.post("/api/login", response_model=Token)
@limiter.limit("10/minute")  # Max 10 login attempts per minute
def login(request: Request, user_data: UserLogin, db: Session = Depends(get_db)):
    # Find all users with this email
    users = db.query(User).filter(User.email == user_data.email).all()

    if not users:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Try to authenticate with any of the accounts
    authenticated_user = None
    for user in users:
        if verify_password(user_data.password, user.password_hash):
            authenticated_user = user
            break

    if not authenticated_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last login
    authenticated_user.last_login = datetime.utcnow()
    db.commit()

    # Create tokens
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": authenticated_user.id},
        expires_delta=access_token_expires
    )

    refresh_token, expires_at = create_refresh_token(
        data={"sub": authenticated_user.id},
        remember_me=user_data.remember_me
    )

    # Store refresh token in database
    db_refresh_token = RefreshToken(
        user_id=authenticated_user.id,
        token=refresh_token,
        expires_at=expires_at,
        device_info=request.headers.get("User-Agent", "Unknown"),
        remember_me=user_data.remember_me
    )
    db.add(db_refresh_token)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=authenticated_user.id,
            first_name=authenticated_user.first_name,
            last_name=authenticated_user.last_name,
            email=authenticated_user.email,
            phone=authenticated_user.phone,
            role=authenticated_user.active_role,
            profile_picture=authenticated_user.profile_picture,  # ADD THIS
            created_at=authenticated_user.created_at,
            is_active=authenticated_user.is_active,
            email_verified=authenticated_user.email_verified
        )
    }


@app.post("/api/refresh", response_model=dict)
def refresh_access_token(token_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token using refresh token"""
    user_id = verify_refresh_token(token_data.refresh_token, db)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Create new access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@app.post("/api/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logout user by revoking all their refresh tokens"""
    # Revoke all user's refresh tokens
    db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id,
        RefreshToken.is_revoked == False
    ).update({"is_revoked": True})
    db.commit()

    return {"message": "Successfully logged out"}


@app.get("/api/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email=current_user.email,
        phone=current_user.phone,
        role=current_user.active_role,
        profile_picture=current_user.profile_picture,  # ADD THIS
        created_at=current_user.created_at,
        is_active=current_user.is_active,
        email_verified=current_user.email_verified
    )

# List all accounts for an email


@app.get("/api/my-accounts")
def get_my_accounts(email: str, password: str, db: Session = Depends(get_db)):
    """Get all accounts associated with an email after password verification"""
    users = db.query(User).filter(User.email == email).all()

    if not users:
        raise HTTPException(
            status_code=404,
            detail="No accounts found with this email"
        )

    # Since we now have one user with multiple roles, return just that user
    user = users[0]  # Should only be one user per email now

    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )

    # Return the user with all their roles
    return {
        "id": user.id,
        "roles": user.roles,  # All roles
        "active_role": user.active_role,  # Current role
        "first_name": user.first_name,
        "last_name": user.last_name,
        "created_at": user.created_at,
        "is_active": user.is_active
    }


@app.get("/api/verify-token")
def verify_token(current_user: User = Depends(get_current_user)):
    """Verify if token is still valid and return user info"""
    return {
        "valid": True,
        "user": {
            "id": current_user.id,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "email": current_user.email,
            "phone": current_user.phone,
            "role": current_user.active_role or current_user.roles[0] if current_user.roles else 'user',
            "profile_picture": current_user.profile_picture,
            "created_at": current_user.created_at.isoformat(),
            "is_active": current_user.is_active,
            "email_verified": current_user.email_verified
        }
    }
# Data Endpoints (keeping your existing ones)


@app.get("/api/counters", response_model=List[CounterResponse])
def get_counters(db: Session = Depends(get_db)):
    counters = db.query(Counter).all()
    return [
        CounterResponse(
            counter_type=c.counter_type,
            count=c.count,
            label=c.label,
            icon=c.icon,
            source="Real"
        ) for c in counters
    ]


@app.get("/api/news", response_model=List[NewsResponse])
def get_news(limit: int = 10, db: Session = Depends(get_db)):
    news_items = db.query(News).order_by(
        News.created_at.desc()).limit(limit).all()
    return [
        NewsResponse(
            id=n.id,
            title=n.title,
            content=n.content,
            category=n.category,
            date=n.date,
            is_breaking=n.is_breaking,
            source="Real"
        ) for n in news_items
    ]


@app.get("/api/videos", response_model=List[VideoResponse])
def get_videos(category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Video)
    if category and category != "all":
        query = query.filter(Video.category == category)
    videos = query.all()
    return [
        VideoResponse(
            id=v.id,
            title=v.title,
            description=v.description,
            duration=v.duration,
            views=v.views,
            category=v.category,
            likes=v.likes,
            dislikes=v.dislikes,
            source="Real"
        ) for v in videos
    ]


@app.get("/api/partners", response_model=List[PartnerResponse])
def get_partners(db: Session = Depends(get_db)):
    partners = db.query(Partner).filter(
        Partner.is_active == True).order_by(Partner.order).all()
    return [
        PartnerResponse(
            id=p.id,
            name=p.name,
            logo_url=p.logo_url,
            website=p.website,
            source="Real"
        ) for p in partners
    ]


@app.get("/api/courses", response_model=List[CourseResponse])
def get_courses(category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Course)
    if category and category != "all":
        query = query.filter(Course.category == category)
    courses = query.all()
    return [
        CourseResponse(
            id=c.id,
            title=c.title,
            icon=c.icon,
            category=c.category,
            level=c.level,
            students=c.students,
            rating=c.rating,
            back_title=c.back_title,
            back_icon=c.back_icon,
            back_level=c.back_level,
            back_students=c.back_students,
            back_rating=c.back_rating,
            source="Real"
        ) for c in courses
    ]


@app.get("/api/testimonials", response_model=List[TestimonialResponse])
def get_testimonials(db: Session = Depends(get_db)):
    testimonials = db.query(Testimonial).filter(
        Testimonial.is_active == True).all()
    return [
        TestimonialResponse(
            id=t.id,
            text=t.text,
            author=t.author,
            role=t.role,
            avatar_url=t.avatar_url,
            rating=t.rating,
            source="Real"
        ) for t in testimonials
    ]




@app.post("/api/tutors/notify")
async def notify_new_tutor(
    tutor_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # Add task to background
    background_tasks.add_task(send_notifications, tutor_id)
    return {"message": "Notification queued"}

def send_notifications(tutor_id: int):
    # Send emails, push notifications, etc.
    pass

      # Import and include routers AFTER everything is defined
from tutor_endpoints import router as tutor_router
app.include_router(tutor_router)

from video_models import VideoReel, VideoEngagement, VideoComment, Playlist, PlaylistItem, TutorFollow
from video_endpoints import router as video_router

# Add the router (near the bottom where you include tutor_router)
app.include_router(video_router)

# Mount static files for videos (add this after app initialization)
app.mount("/videos", StaticFiles(directory="../videos"), name="videos")

@app.websocket("/ws/tutors/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, "tutors")
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            
            # When a new tutor registers or updates profile
            # Broadcast to all connected clients
            await manager.broadcast({
                "type": "tutor_update",
                "message": "New tutor available"
            }, "tutors")
    except:
        manager.disconnect(websocket, "tutors")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
