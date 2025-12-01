"""
Migration script to create tutor-related tables:
1. tutor_students - Track tutor's students (current and alumni)
2. tutor_analysis - Track tutor analytics and performance metrics
3. tutor_resources - Store tutor resources with file uploads

Run this script once to create the tables.
"""

import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables")

# Convert postgresql:// to postgresql+psycopg://
if DATABASE_URL.startswith('postgresql://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg://')

Base = declarative_base()

class TutorStudent(Base):
    """
    Track tutor's students - both current and alumni
    """
    __tablename__ = 'tutor_students'

    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    student_type = Column(String(20), nullable=False, default='current')  # 'current' or 'alumni'
    courses = Column(JSON, nullable=True)  # Array of courses student takes/took
    enrollment_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completion_date = Column(DateTime(timezone=True), nullable=True)  # When student became alumni
    total_sessions = Column(Integer, default=0)  # Total sessions completed
    status = Column(String(20), default='active')  # 'active', 'inactive', 'completed'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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
    last_visit_update = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class TutorResource(Base):
    """
    Store tutor resources with file uploads (connected to Backblaze B2)
    """
    __tablename__ = 'tutor_resources'

    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)

    # Resource details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    resource_type = Column(String(50), nullable=False)  # 'document', 'video', 'image', 'audio', 'other'
    category = Column(String(100), nullable=True)  # 'lecture', 'worksheet', 'assignment', 'reference', etc.

    # File details (Backblaze B2)
    file_url = Column(String(500), nullable=False)  # Full Backblaze B2 URL
    file_name = Column(String(255), nullable=False)  # Original filename
    file_size = Column(Integer, nullable=True)  # File size in bytes
    file_type = Column(String(100), nullable=True)  # MIME type (e.g., 'application/pdf')

    # Metadata
    subject = Column(String(100), nullable=True)  # Related subject
    grade_level = Column(String(50), nullable=True)  # Target grade level
    tags = Column(JSON, nullable=True)  # Array of tags for searchability

    # Access control
    visibility = Column(String(20), default='private')  # 'private', 'students_only', 'public'
    download_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)

    # Status
    status = Column(String(20), default='active')  # 'active', 'archived', 'deleted'

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

def create_tables():
    """Create the tutor-related tables"""
    try:
        # Create engine
        engine = create_engine(DATABASE_URL, echo=True)

        print("Creating tutor-related tables...")
        print("=" * 60)

        # Create tables
        Base.metadata.create_all(engine)

        print("\n" + "=" * 60)
        print("Successfully created tables:")
        print("   1. tutor_students - Track tutor's students (current/alumni)")
        print("   2. tutor_analysis - Track tutor analytics and metrics")
        print("   3. tutor_resources - Store tutor resources with file uploads")
        print("=" * 60)

    except Exception as e:
        print(f"Error creating tables: {e}")
        raise

if __name__ == "__main__":
    create_tables()
