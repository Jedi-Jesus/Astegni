"""
Admin Tutor Management Endpoints
Provides comprehensive endpoints for tutor management in the admin dashboard
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import json

# Import necessary models and utilities (these would come from your main app)
# from app import get_db, get_current_user
# from models import User, Tutor
# from utils import verify_admin_role

router = APIRouter(prefix="/api/admin/tutors", tags=["Admin Tutor Management"])

def get_tutor_statistics(db: Session) -> dict:
    """
    Calculate comprehensive tutor statistics for the dashboard
    """
    try:
        # Get counts by status
        total_tutors = db.query(Tutor).count()
        pending_count = db.query(Tutor).filter(
            or_(
                Tutor.verification_status == 'pending',
                Tutor.verification_status == None
            )
        ).count()
        verified_count = db.query(Tutor).filter(
            Tutor.verification_status == 'verified'
        ).count()
        rejected_count = db.query(Tutor).filter(
            Tutor.verification_status == 'rejected'
        ).count()
        suspended_count = db.query(Tutor).filter(
            Tutor.verification_status == 'suspended'
        ).count()

        # Calculate archived (inactive for more than 6 months)
        six_months_ago = datetime.now() - timedelta(days=180)
        archived_count = db.query(Tutor).filter(
            and_(
                Tutor.updated_at < six_months_ago,
                Tutor.verification_status != 'suspended'
            )
        ).count()

        # Calculate approval rate
        total_processed = verified_count + rejected_count
        approval_rate = round((verified_count / total_processed * 100) if total_processed > 0 else 0)

        # Get recent activity metrics
        today = datetime.now().date()
        today_approved = db.query(Tutor).filter(
            and_(
                func.date(Tutor.updated_at) == today,
                Tutor.verification_status == 'verified'
            )
        ).count()

        # Calculate average processing time (mock data for now)
        avg_processing_hours = db.query(
            func.avg(
                func.extract('epoch', Tutor.updated_at - Tutor.created_at) / 3600
            )
        ).filter(
            Tutor.verification_status.in_(['verified', 'rejected'])
        ).scalar() or 0

        # Format processing time
        if avg_processing_hours < 1:
            avg_processing_time = "< 1hr"
        elif avg_processing_hours < 24:
            avg_processing_time = f"{int(avg_processing_hours)}hrs"
        else:
            avg_processing_time = f"{int(avg_processing_hours / 24)} days"

        # Calculate client satisfaction (mock data - would come from reviews)
        client_satisfaction = 96  # This would be calculated from actual review data

        return {
            "pending": pending_count,
            "verified": verified_count,
            "rejected": rejected_count,
            "suspended": suspended_count,
            "archived": archived_count,
            "totalTutors": total_tutors,
            "approvalRate": approval_rate,
            "avgProcessingTime": avg_processing_time,
            "clientSatisfaction": client_satisfaction,
            "todayApproved": today_approved
        }
    except Exception as e:
        print(f"Error calculating statistics: {e}")
        return {
            "pending": 0,
            "verified": 0,
            "rejected": 0,
            "suspended": 0,
            "archived": 0,
            "totalTutors": 0,
            "approvalRate": 0,
            "avgProcessingTime": "-",
            "clientSatisfaction": 0
        }

@router.get("/statistics")
def get_tutor_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive tutor statistics for the admin dashboard
    """
    # Verify admin role
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required")

    return get_tutor_statistics(db)

@router.get("/recent-activity")
def get_recent_tutor_activity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Get recent tutor registration activity for live updates widget
    """
    # Verify admin role
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        # Get recent tutors ordered by creation/update time
        recent_tutors = db.query(Tutor).order_by(
            desc(Tutor.updated_at)
        ).limit(limit).all()

        activities = []
        for tutor in recent_tutors:
            # Get associated user if exists
            user = db.query(User).filter(User.id == tutor.user_id).first() if tutor.user_id else None

            activity = {
                "id": tutor.id,
                "name": tutor.name or (user.username if user else f"Tutor #{tutor.id}"),
                "email": tutor.email or (user.email if user else None),
                "phone": tutor.phone or (user.phone if user else None),
                "courses": [],  # Column removed
                "location": tutor.location,
                "verification_status": tutor.verification_status or 'pending',
                "created_at": tutor.created_at.isoformat() if tutor.created_at else None,
                "updated_at": tutor.updated_at.isoformat() if tutor.updated_at else None,
                "profile_picture": tutor.profile_picture,
                "action_type": determine_action_type(tutor)
            }
            activities.append(activity)

        return {
            "activities": activities,
            "total": len(activities)
        }

    except Exception as e:
        print(f"Error fetching recent activity: {e}")
        return {
            "activities": [],
            "total": 0
        }

@router.get("/{tutor_id}/review")
def get_tutor_for_review(
    tutor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed tutor information for review modal
    """
    # Verify admin role
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required")

    tutor = db.query(Tutor).filter(Tutor.id == tutor_id).first()

    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    # Get associated user if exists
    user = db.query(User).filter(User.id == tutor.user_id).first() if tutor.user_id else None

    # Parse JSON fields if they're strings
    languages = json.loads(tutor.languages) if tutor.languages and isinstance(tutor.languages, str) else tutor.languages or []

    return {
        "id": tutor.id,
        "name": tutor.name or (user.username if user else f"Tutor #{tutor.id}"),
        "email": tutor.email or (user.email if user else None),
        "phone": tutor.phone or (user.phone if user else None),
        "location": tutor.location,
        "teaches_at": None,  # Column removed
        "courses": [],  # Column removed
        "languages": languages,
        "experience": None,  # Column removed
        "education_level": tutor.education_level,
        "bio": tutor.bio,
        "profile_picture": tutor.profile_picture,
        "id_document_url": None,  # Column removed
        "verification_status": tutor.verification_status or 'pending',
        "hourly_rate": tutor.hourly_rate,
        "rating": tutor.rating,
        "total_reviews": tutor.total_reviews,
        "total_students": tutor.total_students,
        "created_at": tutor.created_at.isoformat() if tutor.created_at else None,
        "updated_at": tutor.updated_at.isoformat() if tutor.updated_at else None
    }

@router.post("/{tutor_id}/verify")
def verify_tutor(
    tutor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify/approve a tutor application
    """
    # Verify admin role
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required")

    tutor = db.query(Tutor).filter(Tutor.id == tutor_id).first()

    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    # Update verification status
    tutor.verification_status = 'verified'
    tutor.verified_at = datetime.now()
    tutor.verified_by = current_user.id
    tutor.updated_at = datetime.now()

    db.commit()

    return {
        "message": "Tutor verified successfully",
        "tutor_id": tutor_id,
        "status": "verified"
    }

@router.post("/{tutor_id}/reject")
def reject_tutor(
    tutor_id: int,
    rejection_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reject a tutor application with reason
    """
    # Verify admin role
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required")

    tutor = db.query(Tutor).filter(Tutor.id == tutor_id).first()

    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    # Update verification status
    tutor.verification_status = 'rejected'
    tutor.rejection_reason = rejection_data.get('reason', 'No reason provided')
    tutor.rejected_at = datetime.now()
    tutor.rejected_by = current_user.id
    tutor.updated_at = datetime.now()

    db.commit()

    return {
        "message": "Tutor application rejected",
        "tutor_id": tutor_id,
        "status": "rejected"
    }

@router.post("/{tutor_id}/suspend")
def suspend_tutor(
    tutor_id: int,
    suspension_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Suspend a tutor account
    """
    # Verify admin role
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required")

    tutor = db.query(Tutor).filter(Tutor.id == tutor_id).first()

    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    # Update verification status
    tutor.verification_status = 'suspended'
    tutor.suspension_reason = suspension_data.get('reason', 'Policy violation')
    tutor.suspended_at = datetime.now()
    tutor.suspended_by = current_user.id
    tutor.updated_at = datetime.now()

    db.commit()

    return {
        "message": "Tutor suspended successfully",
        "tutor_id": tutor_id,
        "status": "suspended"
    }

@router.post("/{tutor_id}/reinstate")
def reinstate_tutor(
    tutor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reinstate a suspended tutor
    """
    # Verify admin role
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required")

    tutor = db.query(Tutor).filter(Tutor.id == tutor_id).first()

    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    if tutor.verification_status != 'suspended':
        raise HTTPException(status_code=400, detail="Tutor is not suspended")

    # Update verification status back to verified
    tutor.verification_status = 'verified'
    tutor.suspension_reason = None
    tutor.suspended_at = None
    tutor.suspended_by = None
    tutor.reinstated_at = datetime.now()
    tutor.reinstated_by = current_user.id
    tutor.updated_at = datetime.now()

    db.commit()

    return {
        "message": "Tutor reinstated successfully",
        "tutor_id": tutor_id,
        "status": "verified"
    }

def determine_action_type(tutor) -> str:
    """
    Determine the action type based on tutor status and timestamps
    """
    if not tutor.verification_status or tutor.verification_status == 'pending':
        return 'registration'

    # Check if recently updated (within last 24 hours)
    if tutor.updated_at:
        time_diff = datetime.now() - tutor.updated_at
        if time_diff.days < 1:
            if tutor.verification_status == 'verified':
                return 'approved'
            elif tutor.verification_status == 'rejected':
                return 'rejected'
            elif tutor.verification_status == 'suspended':
                return 'suspended'

    return 'update'

# Add this router to your main app
# app.include_router(router)