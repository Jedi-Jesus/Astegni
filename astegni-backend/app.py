from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Boolean, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, timedelta
import bcrypt
import jwt
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Convert DATABASE_URL to work with psycopg3
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://")

# Database setup
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# FastAPI app
app = FastAPI(title="Astegni API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================
# Database Models
# ========================

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # tutor, student, guardian, bookstore, delivery, advertiser, author, church
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    profile_data = Column(JSON, default={})

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

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    first_name: str
    last_name: str
    email: str
    phone: str
    role: str
    created_at: datetime
    is_active: bool

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

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
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# ========================
# API Endpoints
# ========================

@app.get("/")
def read_root():
    return {"message": "Welcome to Astegni API", "version": "1.0.0", "status": "running"}

# Authentication Endpoints
@app.post("/api/register", response_model=Token)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(User).filter(User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        phone=user_data.phone,
        password_hash=hashed_password,
        role=user_data.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Update counters based on role
    if user_data.role == "student":
        counter = db.query(Counter).filter(Counter.counter_type == "students").first()
        if counter:
            counter.count += 1
            counter.updated_at = datetime.utcnow()
    elif user_data.role == "tutor":
        counter = db.query(Counter).filter(Counter.counter_type == "tutors").first()
        if counter:
            counter.count += 1
            counter.updated_at = datetime.utcnow()
    elif user_data.role == "guardian":
        counter = db.query(Counter).filter(Counter.counter_type == "parents").first()
        if counter:
            counter.count += 1
            counter.updated_at = datetime.utcnow()
    
    db.commit()
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=db_user.id,
            first_name=db_user.first_name,
            last_name=db_user.last_name,
            email=db_user.email,
            phone=db_user.phone,
            role=db_user.role,
            created_at=db_user.created_at,
            is_active=db_user.is_active
        )
    }

@app.post("/api/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            phone=user.phone,
            role=user.role,
            created_at=user.created_at,
            is_active=user.is_active
        )
    }

@app.get("/api/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email=current_user.email,
        phone=current_user.phone,
        role=current_user.role,
        created_at=current_user.created_at,
        is_active=current_user.is_active
    )

# Data Endpoints
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
            "role": current_user.role,
            "created_at": current_user.created_at.isoformat(),
            "is_active": current_user.is_active
        }
    }

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
    news_items = db.query(News).order_by(News.created_at.desc()).limit(limit).all()
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
    partners = db.query(Partner).filter(Partner.is_active == True).order_by(Partner.order).all()
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
    testimonials = db.query(Testimonial).filter(Testimonial.is_active == True).all()
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)