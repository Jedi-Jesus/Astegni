from sqlalchemy import Column, Integer, String, Float, Boolean, Text, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app import Base
from datetime import datetime

class TutorProfile(Base):
    __tablename__ = "tutor_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # Basic Info
    courses = Column(JSON, default=[])  # List of subjects they teach
    grades = Column(JSON, default=[])  # List of grades/levels they teach
    course_type = Column(String)  # academics/certifications/art
    
    # Location & Teaching
    location = Column(String)
    teaches_at = Column(String)  # Institution name
    learning_method = Column(String)  # Online/In-person/Hybrid
    
    # Professional Info
    experience = Column(Integer, default=0)  # Years of experience
    bio = Column(Text)
    quote = Column(Text)
    certifications = Column(JSON, default=[])
    
    # Pricing
    price = Column(Float, default=0)  # Price per hour
    currency = Column(String, default="ETB")
    
    # Ratings
    rating = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    rating_breakdown = Column(JSON, default={
        "engagement": 0,
        "discipline": 0,
        "punctuality": 0,
        "communication": 0,
        "subject_matter": 0
    })
    
    # Status
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    profile_complete = Column(Boolean, default=False)
    
    # Meta
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("User", backref="tutor_profile")