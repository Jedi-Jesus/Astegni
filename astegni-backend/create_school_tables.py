"""
Create school management tables
- requested_schools: Schools awaiting approval
- schools: Verified/approved schools
- rejected_schools: Schools that were rejected
- suspended_schools: Schools that are suspended
"""

import os
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, JSON, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

Base = declarative_base()

class RequestedSchool(Base):
    __tablename__ = 'requested_schools'

    id = Column(Integer, primary_key=True, index=True)
    school_name = Column(String(255), nullable=False)
    school_type = Column(String(100), nullable=False)  # Private, Government, International, Religious
    school_level = Column(String(100), nullable=False)  # Elementary, High School, College, University
    location = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    phone = Column(String(50), nullable=False)
    students_count = Column(Integer, default=0)
    documents = Column(JSON)  # Array of document objects {name, size, uploadDate, url}
    submitted_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default='Pending')  # Pending, Under Review
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class School(Base):
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

class RejectedSchool(Base):
    __tablename__ = 'rejected_schools'

    id = Column(Integer, primary_key=True, index=True)
    school_name = Column(String(255), nullable=False)
    school_type = Column(String(100), nullable=False)
    school_level = Column(String(100), nullable=False)
    location = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    students_count = Column(Integer, default=0)
    documents = Column(JSON)
    rejection_reason = Column(Text, nullable=False)
    rejected_date = Column(DateTime, default=datetime.utcnow)
    original_request_id = Column(Integer)  # Reference to original request
    status = Column(String(50), default='Rejected')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SuspendedSchool(Base):
    __tablename__ = 'suspended_schools'

    id = Column(Integer, primary_key=True, index=True)
    school_name = Column(String(255), nullable=False)
    school_type = Column(String(100), nullable=False)
    school_level = Column(String(100), nullable=False)
    location = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    students_count = Column(Integer, default=0)
    rating = Column(Float, default=0.0)
    established_year = Column(Integer)
    principal = Column(String(255))
    documents = Column(JSON)
    suspension_reason = Column(Text, nullable=False)
    suspended_date = Column(DateTime, default=datetime.utcnow)
    original_school_id = Column(Integer)  # Reference to original school
    status = Column(String(50), default='Suspended')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def create_tables():
    """Create all school management tables"""
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

    # Convert postgresql:// to postgresql+psycopg://
    if database_url.startswith('postgresql://'):
        database_url = database_url.replace('postgresql://', 'postgresql+psycopg://')

    # Create engine
    engine = create_engine(database_url)

    print("Creating school management tables...")

    # Create all tables
    Base.metadata.create_all(engine)

    print("- requested_schools table created")
    print("- schools table created")
    print("- rejected_schools table created")
    print("- suspended_schools table created")
    print("\nAll school management tables created successfully!")

if __name__ == "__main__":
    create_tables()
