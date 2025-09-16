"""
Tutor Models and Extended Endpoints for Astegni Platform
"""

from datetime import datetime, date, time
from typing import Optional, List, Dict
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, JSON, ForeignKey, DateTime, Date, Time
from sqlalchemy.orm import relationship, Session
from pydantic import BaseModel, Field, validator
from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile, Form
from app import Base, get_db, get_current_user, User, TutorProfile

# ============================================
# ADDITIONAL TUTOR MODELS
# ============================================

class TutorCertification(Base):
    __tablename__ = "tutor_certifications"
    
    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("tutor_profiles.id"), nullable=False)
    
    title = Column(String, nullable=False)
    issuing_organization = Column(String)
    issue_date = Column(Date)
    expiry_date = Column(Date)
    credential_id = Column(String)
    credential_url = Column(String)
    document_url = Column(String)
    is_verified = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    tutor = relationship("TutorProfile", backref="certifications_list")

class TutorExperience(Base):
    __tablename__ = "tutor_experiences"
    
    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("tutor_profiles.id"), nullable=False)
    
    position = Column(String, nullable=False)
    organization = Column(String, nullable=False)
    location = Column(String)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    is_current = Column(Boolean, default=False)
    description = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    tutor = relationship("TutorProfile", backref="experiences")

class TutorAchievement(Base):
    __tablename__ = "tutor_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("tutor_profiles.id"), nullable=False)
    
    title = Column(String, nullable=False)
    description = Column(Text)
    date_achieved = Column(Date)
    category = Column(String)  # Award, Publication, Project, etc.
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    tutor = relationship("TutorProfile", backref="achievements_list")

class TutorSchedule(Base):
    __tablename__ = "tutor_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("tutor_profiles.id"), nullable=False)
    
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_available = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    tutor = relationship("TutorProfile", backref="schedules")

class TutorReview(Base):
    __tablename__ = "tutor_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("tutor_profiles.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("tutoring_sessions.id"))
    
    rating = Column(Float, nullable=False)
    title = Column(String)
    comment = Column(Text)
    
    # Rating breakdown
    teaching_quality = Column(Float)
    communication = Column(Float)
    punctuality = Column(Float)
    knowledge = Column(Float)
    
    is_verified = Column(Boolean, default=False)
    is_visible = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    tutor = relationship("TutorProfile", backref="reviews")

# ============================================
# PYDANTIC MODELS
# ============================================

class CertificationCreate(BaseModel):
    title: str
    issuing_organization: str
    issue_date: date
    expiry_date: Optional[date] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None

class ExperienceCreate(BaseModel):
    position: str
    organization: str
    location: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    is_current: bool = False
    description: Optional[str] = None

class AchievementCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date_achieved: Optional[date] = None
    category: str

class ScheduleCreate(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: str
    end_time: str
    is_available: bool = True

class ReviewCreate(BaseModel):
    rating: float = Field(..., ge=1, le=5)
    title: Optional[str] = None
    comment: Optional[str] = None
    teaching_quality: Optional[float] = Field(None, ge=1, le=5)
    communication: Optional[float] = Field(None, ge=1, le=5)
    punctuality: Optional[float] = Field(None, ge=1, le=5)
    knowledge: Optional[float] = Field(None, ge=1, le=5)

class TutorStatsResponse(BaseModel):
    total_students: int
    total_sessions: int
    completed_sessions: int
    average_rating: float
    total_reviews: int
    total_earnings: float
    subjects_taught: List[str]
    profile_views: int

# ============================================
# EXTENDED TUTOR ROUTER
# ============================================

tutor_router = APIRouter(prefix="/api/tutor", tags=["tutor-extended"])

@tutor_router.post("/certifications")
def add_certification(
    cert: CertificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a certification to tutor profile"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as tutor")
    
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    certification = TutorCertification(
        tutor_id=tutor.id,
        **cert.dict()
    )
    
    db.add(certification)
    db.commit()
    db.refresh(certification)
    
    return {"message": "Certification added", "id": certification.id}

@tutor_router.get("/certifications")
def get_certifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tutor's certifications"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as tutor")
    
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    certifications = db.query(TutorCertification).filter(
        TutorCertification.tutor_id == tutor.id
    ).order_by(TutorCertification.issue_date.desc()).all()
    
    return {
        "certifications": [
            {
                "id": cert.id,
                "title": cert.title,
                "issuing_organization": cert.issuing_organization,
                "issue_date": cert.issue_date.isoformat() if cert.issue_date else None,
                "expiry_date": cert.expiry_date.isoformat() if cert.expiry_date else None,
                "credential_id": cert.credential_id,
                "credential_url": cert.credential_url,
                "is_verified": cert.is_verified
            }
            for cert in certifications
        ]
    }

@tutor_router.delete("/certifications/{cert_id}")
def delete_certification(
    cert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a certification"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as tutor")
    
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    certification = db.query(TutorCertification).filter(
        TutorCertification.id == cert_id,
        TutorCertification.tutor_id == tutor.id
    ).first()
    
    if not certification:
        raise HTTPException(status_code=404, detail="Certification not found")
    
    db.delete(certification)
    db.commit()
    
    return {"message": "Certification deleted"}

@tutor_router.post("/experiences")
def add_experience(
    exp: ExperienceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add work experience"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as tutor")
    
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    experience = TutorExperience(
        tutor_id=tutor.id,
        **exp.dict()
    )
    
    db.add(experience)
    db.commit()
    db.refresh(experience)
    
    return {"message": "Experience added", "id": experience.id}

@tutor_router.get("/experiences")
def get_experiences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tutor's work experiences"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as tutor")
    
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    experiences = db.query(TutorExperience).filter(
        TutorExperience.tutor_id == tutor.id
    ).order_by(TutorExperience.start_date.desc()).all()
    
    return {
        "experiences": [
            {
                "id": exp.id,
                "position": exp.position,
                "organization": exp.organization,
                "location": exp.location,
                "start_date": exp.start_date.isoformat(),
                "end_date": exp.end_date.isoformat() if exp.end_date else None,
                "is_current": exp.is_current,
                "description": exp.description
            }
            for exp in experiences
        ]
    }

@tutor_router.post("/achievements")
def add_achievement(
    achievement: AchievementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add an achievement"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as tutor")
    
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    new_achievement = TutorAchievement(
        tutor_id=tutor.id,
        **achievement.dict()
    )
    
    db.add(new_achievement)
    db.commit()
    db.refresh(new_achievement)
    
    return {"message": "Achievement added", "id": new_achievement.id}

@tutor_router.get("/achievements")
def get_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tutor's achievements"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as tutor")
    
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    achievements = db.query(TutorAchievement).filter(
        TutorAchievement.tutor_id == tutor.id
    ).order_by(TutorAchievement.date_achieved.desc()).all()
    
    return {
        "achievements": [
            {
                "id": ach.id,
                "title": ach.title,
                "description": ach.description,
                "date_achieved": ach.date_achieved.isoformat() if ach.date_achieved else None,
                "category": ach.category
            }
            for ach in achievements
        ]
    }

@tutor_router.post("/schedule")
def set_schedule(
    schedules: List[ScheduleCreate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set tutor's availability schedule"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as tutor")
    
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    # Clear existing schedule
    db.query(TutorSchedule).filter(TutorSchedule.tutor_id == tutor.id).delete()
    
    # Add new schedule
    for schedule in schedules:
        new_schedule = TutorSchedule(
            tutor_id=tutor.id,
            day_of_week=schedule.day_of_week,
            start_time=datetime.strptime(schedule.start_time, "%H:%M").time(),
            end_time=datetime.strptime(schedule.end_time, "%H:%M").time(),
            is_available=schedule.is_available
        )
        db.add(new_schedule)
    
    db.commit()
    
    return {"message": "Schedule updated successfully"}

@tutor_router.get("/schedule")
def get_schedule(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tutor's availability schedule"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as tutor")
    
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    schedules = db.query(TutorSchedule).filter(
        TutorSchedule.tutor_id == tutor.id
    ).order_by(TutorSchedule.day_of_week).all()
    
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    return {
        "schedule": [
            {
                "id": sch.id,
                "day": days[sch.day_of_week],
                "day_of_week": sch.day_of_week,
                "start_time": sch.start_time.isoformat(),
                "end_time": sch.end_time.isoformat(),
                "is_available": sch.is_available
            }
            for sch in schedules
        ]
    }

@tutor_router.get("/reviews")
def get_tutor_reviews(
    tutor_id: Optional[int] = None,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get reviews for a tutor"""
    if tutor_id:
        tutor = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    elif current_user and "tutor" in current_user.roles:
        tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    else:
        raise HTTPException(status_code=400, detail="Tutor ID required")
    
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    
    reviews = db.query(TutorReview).filter(
        TutorReview.tutor_id == tutor.id,
        TutorReview.is_visible == True
    ).order_by(TutorReview.created_at.desc()).all()
    
    return {
        "reviews": [
            {
                "id": review.id,
                "student_name": f"{review.student.user.first_name} {review.student.user.last_name[0]}.",
                "rating": review.rating,
                "title": review.title,
                "comment": review.comment,
                "teaching_quality": review.teaching_quality,
                "communication": review.communication,
                "punctuality": review.punctuality,
                "knowledge": review.knowledge,
                "created_at": review.created_at.isoformat(),
                "is_verified": review.is_verified
            }
            for review in reviews
        ],
        "total": len(reviews),
        "average_rating": tutor.rating,
        "rating_breakdown": tutor.rating_breakdown
    }

@tutor_router.post("/reviews/{session_id}")
def add_review(
    session_id: int,
    review: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a review for a completed session"""
    if "student" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only students can review tutors")
    
    # Get the session
    from app import TutoringSession, StudentProfile
    session = db.query(TutoringSession).filter(
        TutoringSession.id == session_id,
        TutoringSession.status == "completed"
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or not completed")
    
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    
    if session.student_id != student.id:
        raise HTTPException(status_code=403, detail="You can only review your own sessions")
    
    # Check if already reviewed
    existing = db.query(TutorReview).filter(
        TutorReview.session_id == session_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Session already reviewed")
    
    # Create review
    new_review = TutorReview(
        tutor_id=session.tutor_id,
        student_id=student.id,
        session_id=session_id,
        **review.dict()
    )
    
    db.add(new_review)
    
    # Update tutor rating
    tutor = db.query(TutorProfile).filter(TutorProfile.id == session.tutor_id).first()
    
    # Recalculate average rating
    all_reviews = db.query(TutorReview).filter(
        TutorReview.tutor_id == tutor.id,
        TutorReview.is_visible == True
    ).all()
    
    total_rating = sum(r.rating for r in all_reviews) + review.rating
    tutor.rating = total_rating / (len(all_reviews) + 1)
    tutor.rating_count = len(all_reviews) + 1
    
    # Update rating breakdown
    rating_key = str(int(review.rating))
    if tutor.rating_breakdown:
        tutor.rating_breakdown[rating_key] = tutor.rating_breakdown.get(rating_key, 0) + 1
    else:
        tutor.rating_breakdown = {rating_key: 1}
    
    db.commit()
    
    return {"message": "Review submitted successfully"}

@tutor_router.get("/stats")
def get_tutor_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed tutor statistics"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as tutor")
    
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    from app import TutorStudentEnrollment, TutoringSession
    from sqlalchemy import func
    
    # Calculate stats
    total_students = db.query(TutorStudentEnrollment).filter(
        TutorStudentEnrollment.tutor_id == tutor.id
    ).count()
    
    active_students = db.query(TutorStudentEnrollment).filter(
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
    
    total_earnings = db.query(func.sum(TutoringSession.amount)).filter(
        TutoringSession.tutor_id == tutor.id,
        TutoringSession.payment_status == "paid"
    ).scalar() or 0.0
    
    # Get unique subjects taught
    sessions = db.query(TutoringSession.subject).filter(
        TutoringSession.tutor_id == tutor.id
    ).distinct().all()
    subjects_taught = [s[0] for s in sessions if s[0]]
    
    return TutorStatsResponse(
        total_students=total_students,
        total_sessions=total_sessions,
        completed_sessions=completed_sessions,
        average_rating=tutor.rating,
        total_reviews=tutor.rating_count,
        total_earnings=total_earnings,
        subjects_taught=subjects_taught,
        profile_views=0  # You can implement view tracking
    )