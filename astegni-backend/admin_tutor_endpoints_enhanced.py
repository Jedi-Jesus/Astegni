"""
Enhanced Admin Tutor Management Endpoints
Provides comprehensive endpoints for tutor management using tutor_profiles table
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import json

# These imports would come from your main app
from app import get_db, get_current_user
from app.models import User, TutorProfile

router = APIRouter(prefix="/api/admin/tutors", tags=["Admin Tutor Management"])

# ============================================
# SUSPEND/REINSTATE ENDPOINTS
# ============================================

@router.post("/api/admin/tutor/{tutor_id}/suspend")
def suspend_tutor(
    tutor_id: int,
    suspension_data: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Suspend a verified tutor (admin only)"""
    # Check if user has admin role
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required")

    tutor_profile = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor_profile:
        raise HTTPException(status_code=404, detail="Tutor not found")

    suspension_reason = suspension_data.get("reason", "").strip()
    if not suspension_reason:
        raise HTTPException(status_code=400, detail="Suspension reason is required")

    # Get user to update suspension status
    user = db.query(User).filter(User.id == tutor_profile.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update suspension status in users table
    user.verification_status = "suspended"
    user.suspension_reason = suspension_reason
    user.suspended_at = datetime.utcnow()
    user.suspended_by = current_user.id
    user.is_suspended = True
    tutor_profile.is_active = False

    db.commit()

    return {
        "success": True,
        "message": "Tutor suspended successfully",
        "tutor_id": tutor_id,
        "verification_status": "suspended",
        "suspension_reason": suspension_reason
    }

@router.post("/api/admin/tutor/{tutor_id}/reinstate")
def reinstate_tutor(
    tutor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reinstate a suspended tutor (admin only)"""
    # Check if user has admin role
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required")

    tutor_profile = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor_profile:
        raise HTTPException(status_code=404, detail="Tutor not found")

    # Get user to update suspension status
    user = db.query(User).filter(User.id == tutor_profile.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.verification_status != "suspended":
        raise HTTPException(status_code=400, detail="Tutor is not suspended")

    # Reinstate user in users table
    user.verification_status = "approved"
    user.suspension_reason = None
    user.suspended_at = None
    user.suspended_by = None
    user.is_suspended = False
    user.is_verified = True
    tutor_profile.is_active = True

    db.commit()

    return {
        "success": True,
        "message": "Tutor reinstated successfully",
        "tutor_id": tutor_id,
        "verification_status": "verified"
    }

@router.post("/api/admin/tutor/{tutor_id}/reconsider")
def reconsider_tutor(
    tutor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reconsider a rejected tutor application (admin only)"""
    # Check if user has admin role
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required")

    tutor_profile = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor_profile:
        raise HTTPException(status_code=404, detail="Tutor not found")

    # Get user to update verification status
    user = db.query(User).filter(User.id == tutor_profile.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.verification_status != "rejected":
        raise HTTPException(status_code=400, detail="Tutor is not rejected")

    # Move back to pending for review in users table
    user.verification_status = "pending"
    user.rejected_at = None
    tutor_profile.rejection_reason = None
    tutor_profile.verified_by = None

    db.commit()

    return {
        "success": True,
        "message": "Tutor application moved back to pending for review",
        "tutor_id": tutor_id,
        "verification_status": "pending"
    }

# ============================================
# CORRECTED SUSPENDED TUTORS ENDPOINT
# ============================================

@router.get("/api/admin/tutors/suspended")
def get_suspended_tutors_corrected(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100)
):
    """Get all suspended tutors - properly querying by verification_status"""
    # Check if user has admin role
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Query suspended tutors from users table
    query = db.query(TutorProfile).join(User).filter(
        User.verification_status == "suspended"
    ).order_by(TutorProfile.updated_at.desc())

    total_count = query.count()
    skip = (page - 1) * limit
    tutors = query.offset(skip).limit(limit).all()

    # Build response
    tutor_list = []
    for tutor_profile in tutors:
        user = db.query(User).filter(User.id == tutor_profile.user_id).first()
        tutor_list.append({
            "id": tutor_profile.id,
            "user_id": tutor_profile.user_id,
            "name": f"{user.first_name} {user.father_name}" if user else "Unknown",
            "profile_picture": tutor_profile.profile_picture,
            "teaches_at": None,  # Column removed
            "location": tutor_profile.location,
            "courses": [],  # Column removed
            "suspension_reason": user.suspension_reason if user else tutor_profile.rejection_reason,  # From users table
            "suspended_at": user.suspended_at.isoformat() if user and user.suspended_at else tutor_profile.updated_at.isoformat() if tutor_profile.updated_at else None,  # From users table
            "updated_at": tutor_profile.updated_at.isoformat() if tutor_profile.updated_at else None
        })

    return {
        "tutors": tutor_list,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit
    }

# ============================================
# ENHANCED STATISTICS ENDPOINT
# ============================================

@router.get("/api/admin/tutors/statistics")
def get_enhanced_tutor_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive tutor statistics based on verification_status"""
    # Verify admin role
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        # Get counts by verification_status
        pending_count = db.query(TutorProfile).filter(
            TutorProfile.verification_status == 'pending'
        ).count()

        verified_count = db.query(TutorProfile).filter(
            TutorProfile.verification_status == 'verified'
        ).count()

        rejected_count = db.query(TutorProfile).filter(
            TutorProfile.verification_status == 'rejected'
        ).count()

        suspended_count = db.query(TutorProfile).filter(
            TutorProfile.verification_status == 'suspended'
        ).count()

        # Not verified (users who haven't applied)
        not_verified_count = db.query(TutorProfile).filter(
            or_(
                TutorProfile.verification_status == 'not_verified',
                TutorProfile.verification_status == None
            )
        ).count()

        # Total tutors (excluding not_verified)
        total_tutors = pending_count + verified_count + rejected_count + suspended_count

        # Calculate archived (old records with no recent activity)
        six_months_ago = datetime.utcnow() - timedelta(days=180)
        archived_count = db.query(TutorProfile).filter(
            and_(
                TutorProfile.updated_at < six_months_ago,
                TutorProfile.verification_status.in_(['verified', 'rejected'])
            )
        ).count()

        # Calculate approval rate
        total_processed = verified_count + rejected_count
        approval_rate = round((verified_count / total_processed * 100) if total_processed > 0 else 0)

        # Get today's activity
        today = datetime.utcnow().date()
        today_approved = db.query(TutorProfile).filter(
            and_(
                func.date(TutorProfile.updated_at) == today,
                TutorProfile.verification_status == 'verified'
            )
        ).count()

        today_rejected = db.query(TutorProfile).filter(
            and_(
                func.date(TutorProfile.updated_at) == today,
                TutorProfile.verification_status == 'rejected'
            )
        ).count()

        today_pending = db.query(TutorProfile).filter(
            and_(
                func.date(TutorProfile.created_at) == today,
                TutorProfile.verification_status == 'pending'
            )
        ).count()

        # Calculate average processing time (for demo, using mock data)
        avg_processing_time = "< 1hr"

        # Calculate client satisfaction (would come from reviews/ratings)
        avg_rating = db.query(func.avg(TutorProfile.rating)).filter(
            TutorProfile.verification_status == 'verified'
        ).scalar() or 0
        client_satisfaction = round(avg_rating * 20) if avg_rating > 0 else 96  # Convert 5-star to percentage

        return {
            "pending": pending_count,
            "verified": verified_count,
            "rejected": rejected_count,
            "suspended": suspended_count,
            "archived": archived_count,
            "not_verified": not_verified_count,
            "totalTutors": total_tutors,
            "approvalRate": approval_rate,
            "avgProcessingTime": avg_processing_time,
            "clientSatisfaction": client_satisfaction,
            "todayApproved": today_approved,
            "todayRejected": today_rejected,
            "todayPending": today_pending,
            "avgRating": round(avg_rating, 2) if avg_rating else 0
        }
    except Exception as e:
        print(f"Error calculating statistics: {e}")
        return {
            "pending": 0,
            "verified": 0,
            "rejected": 0,
            "suspended": 0,
            "archived": 0,
            "not_verified": 0,
            "totalTutors": 0,
            "approvalRate": 0,
            "avgProcessingTime": "-",
            "clientSatisfaction": 0,
            "todayApproved": 0,
            "todayRejected": 0,
            "todayPending": 0,
            "avgRating": 0
        }