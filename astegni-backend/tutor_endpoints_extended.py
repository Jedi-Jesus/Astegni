"""
Extended API endpoints for tutor profile with comprehensive data retrieval
Includes hero section, reviews, activities, schedules, and dashboard stats
"""

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_
from typing import List, Optional
from datetime import datetime, date, timedelta
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from models import (
    get_db, TutorProfile, TutorReview, TutorActivity, TutorSchedule,
    User, TutorReviewCreate, TutorReviewResponse, TutorActivityResponse,
    TutorScheduleCreate, TutorScheduleResponse, TutorProfileUpdateExtended
)
from utils import get_current_user

# Create router
router = APIRouter()

# ============================================
# TUTOR PROFILE ENDPOINTS
# ============================================

@router.get("/api/tutor/{tutor_id}/profile-complete")
def get_complete_tutor_profile(tutor_id: int, db: Session = Depends(get_db)):
    """
    Get complete tutor profile with all data needed for tutor-profile.html
    Includes hero section, stats, metrics, and profile details
    """
    tutor = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    user = db.query(User).filter(User.id == tutor.user_id).first()

    # Calculate average rating metrics
    avg_metrics = db.query(
        func.avg(TutorReview.retention_rating).label('retention'),
        func.avg(TutorReview.discipline_rating).label('discipline'),
        func.avg(TutorReview.punctuality_rating).label('punctuality'),
        func.avg(TutorReview.subject_matter_rating).label('subject_matter'),
        func.avg(TutorReview.communication_rating).label('communication')
    ).filter(TutorReview.tutor_id == tutor_id).first()

    return {
        "id": tutor.id,
        "user_id": tutor.user_id,
        "name": f"{user.first_name} {user.father_name}" if user else "Unknown",
        "username": user.username if user else None,
        "email": user.email if user else None,
        "profile_picture": user.profile_picture if user else None,

        # Hero Section
        "hero_title": tutor.hero_title,
        "hero_subtitle": tutor.hero_subtitle,
        "students_taught": tutor.students_taught,
        "courses_created": 0,  # Column removed

        # Basic Info
        "bio": tutor.bio,
        "quote": tutor.quote,
        "location": tutor.location,
        "teaches_at": None,  # Column removed
        "session_format": None,  # Column removed
        "languages": tutor.languages,
        "courses": [],  # Column removed
        "grades": [],  # Column removed
        "gender": tutor.gender,

        # Experience & Pricing
        "experience": None,  # Column removed
        "price": tutor.price,
        "currency": tutor.currency,

        # Overall Stats
        "rating": round(tutor.rating, 1),
        "rating_count": tutor.rating_count,
        "total_students": tutor.total_students,
        "current_students": tutor.current_students,
        "total_sessions": tutor.total_sessions,

        # Detailed Rating Metrics (from database or calculated)
        "rating_metrics": {
            "retention": round(avg_metrics.retention or tutor.retention_score, 1),
            "discipline": round(avg_metrics.discipline or tutor.discipline_score, 1),
            "punctuality": round(avg_metrics.punctuality or tutor.punctuality_score, 1),
            "subject_matter": round(avg_metrics.subject_matter or tutor.subject_matter_score, 1),
            "communication": round(avg_metrics.communication or tutor.communication_score, 1)
        },

        # Dashboard Stats
        "dashboard_stats": {
            "total_students": tutor.total_students,
            "current_students": tutor.current_students,
            "success_rate": tutor.success_rate,
            "courses_taught": 0,  # Column removed
            "sessions_completed": tutor.total_sessions,
            "average_rating": round(tutor.rating, 1),
            "review_count": tutor.rating_count,
            "monthly_earnings": tutor.monthly_earnings,
            "experience_years": None  # Column removed
        },

        # Weekly Stats
        "weekly_stats": {
            "sessions_this_week": tutor.sessions_this_week,
            "hours_this_week": tutor.hours_this_week,
            "attendance_rate": tutor.attendance_rate,
            "weekly_goal_progress": tutor.weekly_goal_progress
        },

        # Streak & Engagement
        "teaching_streak_days": tutor.teaching_streak_days,

        # Connection Stats
        "connections": {
            "total_connections": tutor.total_connections,
            "students": tutor.current_students,
            "colleagues": tutor.total_colleagues
        },

        # Status & Verification
        "is_verified": tutor.is_verified,
        "is_premium": tutor.is_premium,
        "is_active": tutor.is_active,

        # Media
        "cover_image": tutor.cover_image,
        "intro_video_url": tutor.intro_video_url,

        # Social Links
        "social_links": tutor.social_links,

        # Timestamps
        "joined": tutor.created_at.strftime("%B %Y") if tutor.created_at else None,
        "created_at": tutor.created_at,
        "updated_at": tutor.updated_at
    }

@router.put("/api/tutor/profile/extended")
def update_tutor_profile_extended(
    profile_data: TutorProfileUpdateExtended,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update tutor profile with extended fields including hero section"""
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    # Update fields
    for field, value in profile_data.dict(exclude_unset=True).items():
        setattr(tutor, field, value)

    tutor.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(tutor)

    return {"message": "Profile updated successfully", "tutor_id": tutor.id}

# ============================================
# TUTOR REVIEWS ENDPOINTS
# ============================================

@router.get("/api/tutor/{tutor_id}/reviews", response_model=List[TutorReviewResponse])
def get_tutor_reviews(
    tutor_id: int,
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get reviews for a specific tutor with student names"""
    reviews = db.query(TutorReview).filter(
        TutorReview.tutor_id == tutor_id
    ).order_by(desc(TutorReview.created_at)).offset(offset).limit(limit).all()

    result = []
    for review in reviews:
        student = db.query(User).filter(User.id == review.student_id).first()
        review_dict = {
            "id": review.id,
            "tutor_id": review.tutor_id,
            "student_id": review.student_id,
            "rating": review.rating,
            "title": review.title,
            "review_text": review.review_text,
            "retention_rating": review.retention_rating,
            "discipline_rating": review.discipline_rating,
            "punctuality_rating": review.punctuality_rating,
            "subject_matter_rating": review.subject_matter_rating,
            "communication_rating": review.communication_rating,
            "is_verified": review.is_verified,
            "helpful_count": review.helpful_count,
            "created_at": review.created_at,
            "student_name": f"{student.first_name} {student.father_name}" if student else "Anonymous"
        }
        result.append(review_dict)

    return result

@router.post("/api/tutor/{tutor_id}/review")
def create_tutor_review(
    tutor_id: int,
    review_data: TutorReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new review for a tutor"""
    # Check if tutor exists
    tutor = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    # Check if user already reviewed this tutor
    existing_review = db.query(TutorReview).filter(
        and_(TutorReview.tutor_id == tutor_id, TutorReview.student_id == current_user.id)
    ).first()

    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this tutor")

    # Create review
    new_review = TutorReview(
        tutor_id=tutor_id,
        student_id=current_user.id,
        **review_data.dict()
    )
    db.add(new_review)

    # Update tutor's rating statistics
    tutor.rating_count += 1
    total_rating = (tutor.rating * (tutor.rating_count - 1) + review_data.rating) / tutor.rating_count
    tutor.rating = round(total_rating, 2)

    # Update detailed metrics
    if review_data.retention_rating:
        tutor.retention_score = round((tutor.retention_score * (tutor.rating_count - 1) + review_data.retention_rating) / tutor.rating_count, 2)
    if review_data.discipline_rating:
        tutor.discipline_score = round((tutor.discipline_score * (tutor.rating_count - 1) + review_data.discipline_rating) / tutor.rating_count, 2)
    if review_data.punctuality_rating:
        tutor.punctuality_score = round((tutor.punctuality_score * (tutor.rating_count - 1) + review_data.punctuality_rating) / tutor.rating_count, 2)
    if review_data.subject_matter_rating:
        tutor.subject_matter_score = round((tutor.subject_matter_score * (tutor.rating_count - 1) + review_data.subject_matter_rating) / tutor.rating_count, 2)
    if review_data.communication_rating:
        tutor.communication_score = round((tutor.communication_score * (tutor.rating_count - 1) + review_data.communication_rating) / tutor.rating_count, 2)

    db.commit()

    return {"message": "Review created successfully", "review_id": new_review.id}

# ============================================
# TUTOR ACTIVITIES ENDPOINTS
# ============================================

@router.get("/api/tutor/{tutor_id}/activities", response_model=List[TutorActivityResponse])
def get_tutor_activities(
    tutor_id: int,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get recent activities for a tutor"""
    activities = db.query(TutorActivity).filter(
        TutorActivity.tutor_id == tutor_id
    ).order_by(desc(TutorActivity.created_at)).offset(offset).limit(limit).all()

    return activities

@router.post("/api/tutor/activity")
def create_tutor_activity(
    activity_type: str,
    title: str,
    description: Optional[str] = None,
    icon: Optional[str] = None,
    color: Optional[str] = None,
    amount: Optional[float] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new activity for the tutor"""
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    activity = TutorActivity(
        tutor_id=tutor.id,
        activity_type=activity_type,
        title=title,
        description=description,
        icon=icon,
        color=color,
        amount=amount
    )
    db.add(activity)
    db.commit()

    return {"message": "Activity created successfully", "activity_id": activity.id}

# ============================================
# TUTOR SCHEDULE ENDPOINTS
# ============================================

@router.get("/api/tutor/{tutor_id}/schedule", response_model=List[TutorScheduleResponse])
def get_tutor_schedule(
    tutor_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Get tutor's schedule within a date range"""
    query = db.query(TutorSchedule).filter(TutorSchedule.tutor_id == tutor_id)

    if start_date:
        query = query.filter(TutorSchedule.schedule_date >= start_date)
    if end_date:
        query = query.filter(TutorSchedule.schedule_date <= end_date)

    schedules = query.order_by(TutorSchedule.schedule_date, TutorSchedule.start_time).all()

    return [
        {
            "id": s.id,
            "schedule_date": s.schedule_date,
            "start_time": str(s.start_time),
            "end_time": str(s.end_time),
            "subject": s.subject,
            "grade_level": s.grade_level,
            "session_format": s.session_format,
            "student_name": s.student_name,
            "status": s.status,
            "created_at": s.created_at
        }
        for s in schedules
    ]

@router.get("/api/tutor/schedule/today")
def get_today_schedule(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get today's schedule for the current tutor"""
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    today = date.today()
    schedules = db.query(TutorSchedule).filter(
        and_(
            TutorSchedule.tutor_id == tutor.id,
            TutorSchedule.schedule_date == today,
            TutorSchedule.status.in_(["scheduled", "in_progress"])
        )
    ).order_by(TutorSchedule.start_time).all()

    return [
        {
            "id": s.id,
            "start_time": str(s.start_time),
            "end_time": str(s.end_time),
            "subject": s.subject,
            "grade_level": s.grade_level,
            "session_format": s.session_format,
            "student_name": s.student_name,
            "meeting_link": s.meeting_link,
            "location": s.location
        }
        for s in schedules
    ]

@router.post("/api/tutor/schedule")
def create_schedule_entry(
    schedule_data: TutorScheduleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new schedule entry for the tutor"""
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    schedule = TutorSchedule(
        tutor_id=tutor.id,
        **schedule_data.dict()
    )
    db.add(schedule)
    db.commit()

    return {"message": "Schedule created successfully", "schedule_id": schedule.id}

# ============================================
# DASHBOARD STATS ENDPOINTS
# ============================================

@router.get("/api/tutor/dashboard/stats")
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive dashboard statistics for the tutor"""
    from sqlalchemy import text

    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    # Get this week's date range
    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    # Get weekly session count
    weekly_sessions = db.query(func.count(TutorSchedule.id)).filter(
        and_(
            TutorSchedule.tutor_id == tutor.id,
            TutorSchedule.schedule_date >= week_start,
            TutorSchedule.status == "completed"
        )
    ).scalar()

    # Count current students from enrolled_students table (students enrolled with this tutor)
    current_students_count = db.execute(
        text("SELECT COUNT(DISTINCT student_id) FROM enrolled_students WHERE tutor_id = :tutor_id"),
        {"tutor_id": tutor.id}
    ).scalar() or 0

    # Count pending session requests from requested_sessions table
    # (Accepted requests are moved to enrolled_students and deleted from requested_sessions)
    total_requests = db.execute(
        text("SELECT COUNT(*) FROM requested_sessions WHERE tutor_id = :tutor_id AND status = 'pending'"),
        {"tutor_id": tutor.id}
    ).scalar() or 0

    return {
        "hero_stats": {
            "students_taught": tutor.students_taught,
            "courses_created": 0,  # Column removed
            "average_rating": round(tutor.rating, 1) if tutor.rating else 0.0
        },
        "dashboard_cards": {
            "total_students": tutor.total_students,
            "current_students": current_students_count,  # From enrolled_students table
            "total_requests": total_requests,  # From requested_sessions table
            "success_rate": tutor.success_rate,
            "courses": 0,  # Column removed
            "sessions_completed": tutor.total_sessions,
            "average_rating": round(tutor.rating, 1) if tutor.rating else 0.0,
            "review_count": tutor.rating_count,
            "monthly_earnings": tutor.monthly_earnings,
            "experience_years": None,  # Column removed
            "response_time_hours": tutor.response_time_hours or 24
        },
        "weekly_stats": {
            "sessions_completed": weekly_sessions or tutor.sessions_this_week,
            "target_sessions": 20,
            "hours_taught": tutor.hours_this_week,
            "target_hours": 32,
            "attendance_rate": tutor.attendance_rate,
            "weekly_goal": tutor.weekly_goal_progress
        },
        "teaching_streak": tutor.teaching_streak_days,
        "connections": {
            "total": tutor.total_connections,
            "students": current_students_count,  # From enrolled_students table
            "colleagues": tutor.total_colleagues
        }
    }
