"""
Student Models and Endpoints for Astegni Platform
"""

from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, JSON, ForeignKey, DateTime, Date, Enum
from sqlalchemy.orm import relationship, Session
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status, Query
import enum

# Import base from main app
from app import Base, get_db, get_current_user, User

# ============================================
# ENUMS
# ============================================
class GradeLevel(str, enum.Enum):
    KG1 = "KG-1"
    KG2 = "KG-2"
    KG3 = "KG-3"
    GRADE_1 = "Grade 1"
    GRADE_2 = "Grade 2"
    GRADE_3 = "Grade 3"
    GRADE_4 = "Grade 4"
    GRADE_5 = "Grade 5"
    GRADE_6 = "Grade 6"
    GRADE_7 = "Grade 7"
    GRADE_8 = "Grade 8"
    GRADE_9 = "Grade 9"
    GRADE_10 = "Grade 10"
    GRADE_11 = "Grade 11"
    GRADE_12 = "Grade 12"
    UNIVERSITY = "University"

class SessionStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    PARTIAL = "partial"
    REFUNDED = "refunded"

# ============================================
# DATABASE MODELS
# ============================================

class StudentProfile(Base):
    __tablename__ = "student_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    
    # Basic Information
    date_of_birth = Column(Date)
    grade_level = Column(String)
    school_name = Column(String)
    school_address = Column(String)
    
    # Academic Information
    subjects = Column(JSON, default=[])  # List of subjects
    weak_subjects = Column(JSON, default=[])
    strong_subjects = Column(JSON, default=[])
    learning_style = Column(String)  # Visual, Auditory, Kinesthetic, etc.
    special_needs = Column(Text)
    
    # Parent/Guardian Information
    guardian_name = Column(String)
    guardian_phone = Column(String)
    guardian_email = Column(String)
    guardian_relationship = Column(String)
    
    # Preferences
    preferred_session_time = Column(String)
    preferred_session_days = Column(JSON, default=[])
    preferred_learning_mode = Column(String)  # Online, In-person, Hybrid
    
    # Academic Goals
    academic_goals = Column(Text)
    career_aspirations = Column(Text)
    
    # Medical/Health Information
    medical_conditions = Column(Text)
    allergies = Column(Text)
    medications = Column(Text)
    
    # Additional Information
    hobbies = Column(JSON, default=[])
    achievements = Column(JSON, default=[])
    extra_curricular = Column(JSON, default=[])
    
    # System fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    profile_completion = Column(Float, default=0.0)
    
    # Relationships
    user = relationship("User", backref="student_profile")
    enrollments = relationship("TutorStudentEnrollment", back_populates="student")
    sessions = relationship("TutoringSession", back_populates="student")
    progress_reports = relationship("StudentProgress", back_populates="student")
    payments = relationship("StudentPayment", back_populates="student")

class TutorStudentEnrollment(Base):
    __tablename__ = "tutor_student_enrollments"
    
    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("tutor_profiles.id"))
    student_id = Column(Integer, ForeignKey("student_profiles.id"))
    
    # Enrollment Details
    enrollment_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="active")  # active, paused, completed, cancelled
    subjects = Column(JSON, default=[])
    
    # Session Information
    session_frequency = Column(String)  # Daily, Weekly, Bi-weekly, etc.
    session_duration = Column(Integer)  # in minutes
    total_sessions_planned = Column(Integer)
    sessions_completed = Column(Integer, default=0)
    
    # Pricing
    hourly_rate = Column(Float)
    payment_terms = Column(String)  # Per session, Monthly, Package
    discount_percentage = Column(Float, default=0)
    
    # Notes
    enrollment_notes = Column(Text)
    special_requirements = Column(Text)
    
    # Relationships
    tutor = relationship("TutorProfile", backref="student_enrollments")
    student = relationship("StudentProfile", back_populates="enrollments")

class TutoringSession(Base):
    __tablename__ = "tutoring_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    enrollment_id = Column(Integer, ForeignKey("tutor_student_enrollments.id"))
    student_id = Column(Integer, ForeignKey("student_profiles.id"))
    tutor_id = Column(Integer, ForeignKey("tutor_profiles.id"))
    
    # Session Details
    subject = Column(String, nullable=False)
    topic = Column(String)
    session_date = Column(DateTime, nullable=False)
    duration = Column(Integer)  # in minutes
    status = Column(String, default="scheduled")
    mode = Column(String)  # online, in-person, hybrid
    location = Column(String)  # Physical address or online platform
    meeting_link = Column(String)  # For online sessions
    
    # Attendance
    student_attended = Column(Boolean)
    tutor_attended = Column(Boolean)
    attendance_notes = Column(Text)
    
    # Session Content
    objectives = Column(Text)
    topics_covered = Column(JSON, default=[])
    homework_assigned = Column(Text)
    resources_shared = Column(JSON, default=[])
    
    # Feedback
    tutor_notes = Column(Text)
    student_feedback = Column(Text)
    parent_feedback = Column(Text)
    
    # Rating
    student_rating = Column(Float)  # Student rates the session
    tutor_rating = Column(Float)   # Tutor rates student's engagement
    
    # System fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    enrollment = relationship("TutorStudentEnrollment", backref="sessions")
    student = relationship("StudentProfile", back_populates="sessions")
    tutor = relationship("TutorProfile", backref="tutoring_sessions")

class StudentProgress(Base):
    __tablename__ = "student_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"))
    tutor_id = Column(Integer, ForeignKey("tutor_profiles.id"))
    subject = Column(String, nullable=False)
    
    # Assessment
    assessment_date = Column(DateTime, default=datetime.utcnow)
    assessment_type = Column(String)  # Quiz, Test, Assignment, Project
    score = Column(Float)
    max_score = Column(Float)
    percentage = Column(Float)
    grade = Column(String)
    
    # Progress Tracking
    topics_mastered = Column(JSON, default=[])
    topics_need_improvement = Column(JSON, default=[])
    skill_level = Column(String)  # Beginner, Intermediate, Advanced
    improvement_rate = Column(Float)  # Percentage improvement
    
    # Recommendations
    tutor_recommendations = Column(Text)
    next_steps = Column(Text)
    resources_recommended = Column(JSON, default=[])
    
    # Goals
    short_term_goals = Column(JSON, default=[])
    long_term_goals = Column(JSON, default=[])
    goals_achieved = Column(JSON, default=[])
    
    # System fields
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    student = relationship("StudentProfile", back_populates="progress_reports")
    tutor = relationship("TutorProfile", backref="student_progress_reports")

class StudentPayment(Base):
    __tablename__ = "student_payments"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"))
    enrollment_id = Column(Integer, ForeignKey("tutor_student_enrollments.id"))
    
    # Payment Details
    amount = Column(Float, nullable=False)
    currency = Column(String, default="ETB")
    payment_date = Column(DateTime)
    due_date = Column(DateTime)
    status = Column(String, default="pending")
    
    # Payment Method
    payment_method = Column(String)  # Cash, Bank Transfer, Mobile Money, etc.
    transaction_id = Column(String)
    reference_number = Column(String)
    
    # Billing Period
    billing_period_start = Column(DateTime)
    billing_period_end = Column(DateTime)
    sessions_covered = Column(Integer)
    
    # Additional Charges/Discounts
    discount_amount = Column(Float, default=0)
    late_fee = Column(Float, default=0)
    other_charges = Column(Float, default=0)
    total_amount = Column(Float)
    
    # Notes
    payment_notes = Column(Text)
    
    # System fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = relationship("StudentProfile", back_populates="payments")
    enrollment = relationship("TutorStudentEnrollment", backref="payments")

class StudentResource(Base):
    __tablename__ = "student_resources"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"))
    tutor_id = Column(Integer, ForeignKey("tutor_profiles.id"))
    
    # Resource Details
    title = Column(String, nullable=False)
    description = Column(Text)
    subject = Column(String)
    topic = Column(String)
    resource_type = Column(String)  # PDF, Video, Link, Exercise, etc.
    resource_url = Column(String)
    file_path = Column(String)
    
    # Access Control
    is_public = Column(Boolean, default=False)
    access_expires = Column(DateTime)
    download_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String)  # tutor or student
    
    # Relationships
    student = relationship("StudentProfile", backref="resources")
    tutor = relationship("TutorProfile", backref="shared_resources")

# ============================================
# PYDANTIC MODELS
# ============================================

class StudentProfileCreate(BaseModel):
    date_of_birth: Optional[str]
    grade_level: str
    school_name: Optional[str]
    subjects: List[str] = []
    guardian_name: Optional[str]
    guardian_phone: Optional[str]
    preferred_learning_mode: str = "online"

class StudentProfileUpdate(BaseModel):
    date_of_birth: Optional[str]
    grade_level: Optional[str]
    school_name: Optional[str]
    subjects: Optional[List[str]]
    weak_subjects: Optional[List[str]]
    strong_subjects: Optional[List[str]]
    learning_style: Optional[str]
    academic_goals: Optional[str]
    guardian_name: Optional[str]
    guardian_phone: Optional[str]

class StudentProfileResponse(BaseModel):
    id: int
    user_id: int
    grade_level: Optional[str]
    school_name: Optional[str]
    subjects: List[str]
    profile_completion: float
    created_at: datetime
    
    class Config:
        from_attributes = True

class EnrollmentCreate(BaseModel):
    tutor_id: int
    subjects: List[str]
    session_frequency: str
    session_duration: int = 60
    hourly_rate: float

class SessionCreate(BaseModel):
    enrollment_id: int
    subject: str
    topic: Optional[str]
    session_date: datetime
    duration: int = 60
    mode: str = "online"
    location: Optional[str]
    objectives: Optional[str]

class SessionUpdate(BaseModel):
    status: Optional[str]
    student_attended: Optional[bool]
    topics_covered: Optional[List[str]]
    homework_assigned: Optional[str]
    tutor_notes: Optional[str]
    student_rating: Optional[float]

class ProgressReport(BaseModel):
    subject: str
    assessment_type: str
    score: float
    max_score: float
    topics_mastered: List[str] = []
    topics_need_improvement: List[str] = []
    tutor_recommendations: Optional[str]

# ============================================
# API ROUTER
# ============================================

router = APIRouter(prefix="/api/students", tags=["students"])

@router.post("/profile", response_model=StudentProfileResponse)
async def create_student_profile(
    profile: StudentProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update student profile"""
    
    # Check if profile already exists
    existing = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    
    if existing:
        # Update existing profile
        for key, value in profile.dict(exclude_unset=True).items():
            setattr(existing, key, value)
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    
    # Create new profile
    student_profile = StudentProfile(
        user_id=current_user.id,
        **profile.dict()
    )
    
    # Calculate profile completion
    student_profile.profile_completion = calculate_profile_completion(student_profile)
    
    db.add(student_profile)
    db.commit()
    db.refresh(student_profile)
    
    return student_profile

@router.get("/profile", response_model=StudentProfileResponse)
async def get_student_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current student's profile"""
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found"
        )
    
    return profile

@router.put("/profile", response_model=StudentProfileResponse)
async def update_student_profile(
    updates: StudentProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update student profile"""
    profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found"
        )
    
    for key, value in updates.dict(exclude_unset=True).items():
        setattr(profile, key, value)
    
    profile.updated_at = datetime.utcnow()
    profile.profile_completion = calculate_profile_completion(profile)
    
    db.commit()
    db.refresh(profile)
    
    return profile

@router.post("/enroll")
async def enroll_with_tutor(
    enrollment: EnrollmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enroll with a tutor"""
    
    # Get student profile
    student = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    
    if not student:
        raise HTTPException(
            status_code=400,
            detail="Please create a student profile first"
        )
    
    # Check if already enrolled
    existing = db.query(TutorStudentEnrollment).filter(
        TutorStudentEnrollment.student_id == student.id,
        TutorStudentEnrollment.tutor_id == enrollment.tutor_id,
        TutorStudentEnrollment.status == "active"
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Already enrolled with this tutor"
        )
    
    # Create enrollment
    new_enrollment = TutorStudentEnrollment(
        student_id=student.id,
        **enrollment.dict()
    )
    
    db.add(new_enrollment)
    db.commit()
    db.refresh(new_enrollment)
    
    return {"message": "Successfully enrolled", "enrollment_id": new_enrollment.id}

@router.get("/my-tutors")
async def get_my_tutors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of enrolled tutors"""
    
    # Get student profile
    student = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    
    if not student:
        return []
    
    enrollments = db.query(TutorStudentEnrollment).filter(
        TutorStudentEnrollment.student_id == student.id,
        TutorStudentEnrollment.status == "active"
    ).all()
    
    return enrollments

@router.get("/sessions")
async def get_student_sessions(
    status: Optional[str] = Query(None),
    limit: int = Query(10, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get student's tutoring sessions"""
    
    # Get student profile
    student = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    
    if not student:
        return []
    
    query = db.query(TutoringSession).filter(
        TutoringSession.student_id == student.id
    )
    
    if status:
        query = query.filter(TutoringSession.status == status)
    
    sessions = query.order_by(TutoringSession.session_date.desc()).limit(limit).all()
    
    return sessions

@router.post("/sessions/{session_id}/feedback")
async def submit_session_feedback(
    session_id: int,
    feedback: str,
    rating: float = Query(..., ge=1, le=5),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit feedback for a completed session"""
    
    # Get student profile
    student = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # Get session
    session = db.query(TutoringSession).filter(
        TutoringSession.id == session_id,
        TutoringSession.student_id == student.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.status != "completed":
        raise HTTPException(status_code=400, detail="Can only rate completed sessions")
    
    # Update feedback
    session.student_feedback = feedback
    session.student_rating = rating
    session.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Feedback submitted successfully"}

@router.get("/progress")
async def get_student_progress(
    subject: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get student's progress reports"""
    
    # Get student profile
    student = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    
    if not student:
        return []
    
    query = db.query(StudentProgress).filter(
        StudentProgress.student_id == student.id
    )
    
    if subject:
        query = query.filter(StudentProgress.subject == subject)
    
    progress_reports = query.order_by(StudentProgress.assessment_date.desc()).all()
    
    return progress_reports

@router.get("/payments")
async def get_student_payments(
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get student's payment history"""
    
    # Get student profile
    student = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()
    
    if not student:
        return []
    
    query = db.query(StudentPayment).filter(
        StudentPayment.student_id == student.id
    )
    
    if status:
        query = query.filter(StudentPayment.status == status)
    
    payments = query.order_by(StudentPayment.created_at.desc()).all()
    
    return payments

@router.post("/seed-data")
async def seed_student_data(
    sample_count: int = 10,
    db: Session = Depends(get_db)
):
    """Seed sample student data (admin only)"""
    # Add authentication check here for admin users
    
    from seed_student_data import seed_all
    seed_all()
    
    return {"message": f"Successfully seeded student data"}

@router.delete("/clear-data")
async def clear_student_data(
    db: Session = Depends(get_db)
):
    """Clear all student data (admin only - use with caution!)"""
    # Add authentication check here for admin users
    
    db.query(StudentPayment).delete()
    db.query(StudentResource).delete()
    db.query(StudentProgress).delete()
    db.query(TutoringSession).delete()
    db.query(TutorStudentEnrollment).delete()
    db.query(StudentProfile).delete()
    db.commit()
    
    return {"message": "Student data cleared"}

# ============================================
# HELPER FUNCTIONS
# ============================================

def calculate_profile_completion(profile: StudentProfile) -> float:
    """Calculate profile completion percentage"""
    fields = [
        profile.date_of_birth,
        profile.grade_level,
        profile.school_name,
        profile.subjects,
        profile.guardian_name,
        profile.guardian_phone,
        profile.learning_style,
        profile.academic_goals,
        profile.preferred_session_time,
        profile.preferred_learning_mode
    ]
    
    completed = sum(1 for field in fields if field)
    total = len(fields)
    
    return round((completed / total) * 100, 2)

# Export router to be included in main app
__all__ = ['router', 'StudentProfile', 'TutorStudentEnrollment', 'TutoringSession']