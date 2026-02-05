"""
Role Management Endpoints
Handles role deactivation and deletion
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Literal
import bcrypt
import sys
import os

# Add path to models directory
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from models import SessionLocal, User, StudentProfile, TutorProfile, ParentProfile, AdvertiserProfile, UserProfile, OTP
from utils import get_current_user
from datetime import datetime

router = APIRouter()

# Add explicit OPTIONS handler for CORS preflight
@router.options("/api/role/deactivate")
@router.options("/api/role/remove")
@router.options("/api/role/deletion-status")
@router.options("/api/role/restore")
async def role_options():
    """Handle CORS preflight requests for role management endpoints"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Pydantic Models
class RoleActionRequest(BaseModel):
    role: Literal['student', 'tutor', 'parent', 'advertiser', 'user']
    password: str

class RoleRemovalRequest(BaseModel):
    role: Literal['student', 'tutor', 'parent', 'advertiser', 'user']
    password: str
    otp: str  # OTP required for permanent deletion


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/api/role/deactivate")
async def deactivate_role(
    request: RoleActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deactivate a user's role
    - Requires password verification for security
    - Sets the role's is_active flag to False
    - Profile is hidden but data is preserved
    - User can reactivate by adding the role again
    - Always sets active_role to None (user chooses next role from frontend)
    """

    # Fetch password hash from database
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password verification failed"
        )

    # Verify password
    if not bcrypt.checkpw(
        request.password.encode('utf-8'),
        user.password_hash.encode('utf-8')
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )

    # Check if user has this role
    if request.role not in user.roles:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"You don't have a {request.role} role"
        )

    # Get the role profile
    role_model = None
    if request.role == 'student':
        role_model = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    elif request.role == 'tutor':
        role_model = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
    elif request.role == 'parent':
        role_model = db.query(ParentProfile).filter(ParentProfile.user_id == user.id).first()
    elif request.role == 'advertiser':
        role_model = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user.id).first()
    elif request.role == 'user':
        role_model = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()

    if not role_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{request.role.capitalize()} profile not found"
        )

    # Deactivate the role
    role_model.is_active = False

    # If this was the active role, clear it (don't auto-assign another role)
    # Let the user choose their next role from the frontend
    # CRITICAL: Use 'user' (database object) not 'current_user' (JWT object)
    if user.active_role == request.role:
        user.active_role = None

    db.commit()

    # Get list of remaining active roles
    all_remaining_active_roles = []
    for role in user.roles:
        if role == request.role:
            continue

        # Check if role is active
        is_active = True
        if role == 'student':
            profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
            if profile and hasattr(profile, 'is_active'):
                is_active = profile.is_active
        elif role == 'tutor':
            profile = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
            if profile and hasattr(profile, 'is_active'):
                is_active = profile.is_active
        elif role == 'parent':
            profile = db.query(ParentProfile).filter(ParentProfile.user_id == user.id).first()
            if profile and hasattr(profile, 'is_active'):
                is_active = profile.is_active
        elif role == 'advertiser':
            profile = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user.id).first()
            if profile and hasattr(profile, 'is_active'):
                is_active = profile.is_active
        elif role == 'user':
            profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
            if profile and hasattr(profile, 'is_active'):
                is_active = profile.is_active

        if is_active:
            all_remaining_active_roles.append(role)

    return {
        "message": f"{request.role.capitalize()} role deactivated successfully",
        "deactivated_role": request.role,
        "new_active_role": None,  # Always None - let user choose their next role
        "remaining_active_roles": all_remaining_active_roles
    }


@router.delete("/api/role/remove")
async def remove_role(
    request: RoleRemovalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Schedule role deletion with 90-day grace period
    - Requires password AND OTP verification for security
    - Schedules role deletion for 90 days from now
    - Role profile is deactivated immediately but data preserved
    - User can restore role by re-adding it within 90 days
    - Automatic permanent deletion after 90 days
    """
    from datetime import timedelta

    # Fetch password hash from database
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password verification failed"
        )

    # Verify password
    if not bcrypt.checkpw(
        request.password.encode('utf-8'),
        user.password_hash.encode('utf-8')
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )

    # Verify OTP (required for permanent deletion)
    otp_record = db.query(OTP).filter(
        OTP.user_id == current_user.id,
        OTP.otp_code == request.otp,
        OTP.purpose == "role_remove",
        OTP.is_used == False,
        OTP.expires_at > datetime.utcnow()
    ).first()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )

    # Mark OTP as used
    otp_record.is_used = True
    db.commit()

    # Check if user has this role
    if request.role not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"You don't have a {request.role} role"
        )

    # Prevent removing the last role (use Leave Astegni for that)
    if len(current_user.roles) == 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove your only role. Use 'Leave Astegni' to delete your entire account."
        )

    # Calculate scheduled deletion time (90 days from now)
    scheduled_deletion_at = datetime.utcnow() + timedelta(days=90)

    # Get and deactivate the role profile (don't delete yet)
    role_found = False
    if request.role == 'student':
        student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if student:
            student.is_active = False
            student.scheduled_deletion_at = scheduled_deletion_at
            role_found = True

    elif request.role == 'tutor':
        tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
        if tutor:
            tutor.is_active = False
            tutor.scheduled_deletion_at = scheduled_deletion_at
            role_found = True

    elif request.role == 'parent':
        parent = db.query(ParentProfile).filter(ParentProfile.user_id == current_user.id).first()
        if parent:
            parent.is_active = False
            parent.scheduled_deletion_at = scheduled_deletion_at
            role_found = True

    elif request.role == 'advertiser':
        advertiser = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == current_user.id).first()
        if advertiser:
            advertiser.is_active = False
            advertiser.scheduled_deletion_at = scheduled_deletion_at
            role_found = True

    elif request.role == 'user':
        user_profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
        if user_profile:
            user_profile.is_active = False
            user_profile.scheduled_deletion_at = scheduled_deletion_at
            role_found = True

    if not role_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{request.role.capitalize()} profile not found"
        )

    # If the removed role was the current role, set to None (don't auto-assign)
    # Let the user choose their next role from the frontend
    new_active_role = user.active_role
    if user.active_role == request.role:
        user.active_role = None
        new_active_role = None

    db.commit()

    # Get list of all remaining ACTIVE roles
    all_remaining_active_roles = []
    for role in user.roles:
        if role == request.role:
            continue  # Skip the role being deleted

        # Check if role is active
        is_active = True
        if role == 'student':
            profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
            if profile and hasattr(profile, 'is_active'):
                is_active = profile.is_active
        elif role == 'tutor':
            profile = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
            if profile and hasattr(profile, 'is_active'):
                is_active = profile.is_active
        elif role == 'parent':
            profile = db.query(ParentProfile).filter(ParentProfile.user_id == user.id).first()
            if profile and hasattr(profile, 'is_active'):
                is_active = profile.is_active
        elif role == 'advertiser':
            profile = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user.id).first()
            if profile and hasattr(profile, 'is_active'):
                is_active = profile.is_active
        elif role == 'user':
            profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
            if profile and hasattr(profile, 'is_active'):
                is_active = profile.is_active

        if is_active:
            all_remaining_active_roles.append(role)

    # Calculate days until deletion
    days_remaining = 90

    return {
        "success": True,
        "message": f"{request.role.capitalize()} role scheduled for deletion in 90 days. You can restore it anytime before then by re-adding your role.",
        "deleted_role": request.role,
        "new_active_role": new_active_role,
        "remaining_active_roles": all_remaining_active_roles,
        "scheduled_deletion_at": scheduled_deletion_at.isoformat(),
        "days_remaining": days_remaining,
        "can_restore": True
    }


@router.get("/api/role/deletion-status")
async def get_role_deletion_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if user has any roles scheduled for deletion
    Returns the role with the nearest scheduled deletion
    """
    from datetime import datetime, timedelta

    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check all profile types for scheduled deletions
    pending_deletions = []

    # Check student profile
    if 'student' in user.roles:
        student = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        if student and student.scheduled_deletion_at and student.scheduled_deletion_at > datetime.utcnow():
            days_remaining = (student.scheduled_deletion_at - datetime.utcnow()).days
            pending_deletions.append({
                'role': 'student',
                'scheduled_deletion_at': student.scheduled_deletion_at,
                'days_remaining': days_remaining
            })

    # Check tutor profile
    if 'tutor' in user.roles:
        tutor = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
        if tutor and tutor.scheduled_deletion_at and tutor.scheduled_deletion_at > datetime.utcnow():
            days_remaining = (tutor.scheduled_deletion_at - datetime.utcnow()).days
            pending_deletions.append({
                'role': 'tutor',
                'scheduled_deletion_at': tutor.scheduled_deletion_at,
                'days_remaining': days_remaining
            })

    # Check parent profile
    if 'parent' in user.roles:
        parent = db.query(ParentProfile).filter(ParentProfile.user_id == user.id).first()
        if parent and parent.scheduled_deletion_at and parent.scheduled_deletion_at > datetime.utcnow():
            days_remaining = (parent.scheduled_deletion_at - datetime.utcnow()).days
            pending_deletions.append({
                'role': 'parent',
                'scheduled_deletion_at': parent.scheduled_deletion_at,
                'days_remaining': days_remaining
            })

    # Check advertiser profile
    if 'advertiser' in user.roles:
        advertiser = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user.id).first()
        if advertiser and advertiser.scheduled_deletion_at and advertiser.scheduled_deletion_at > datetime.utcnow():
            days_remaining = (advertiser.scheduled_deletion_at - datetime.utcnow()).days
            pending_deletions.append({
                'role': 'advertiser',
                'scheduled_deletion_at': advertiser.scheduled_deletion_at,
                'days_remaining': days_remaining
            })

    # Check user profile
    if 'user' in user.roles:
        user_profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
        if user_profile and user_profile.scheduled_deletion_at and user_profile.scheduled_deletion_at > datetime.utcnow():
            days_remaining = (user_profile.scheduled_deletion_at - datetime.utcnow()).days
            pending_deletions.append({
                'role': 'user',
                'scheduled_deletion_at': user_profile.scheduled_deletion_at,
                'days_remaining': days_remaining
            })

    if not pending_deletions:
        return {
            "success": True,
            "has_pending_deletion": False
        }

    # Return the deletion with the nearest date
    nearest_deletion = min(pending_deletions, key=lambda x: x['scheduled_deletion_at'])

    return {
        "success": True,
        "has_pending_deletion": True,
        "role": nearest_deletion['role'],
        "scheduled_deletion_at": nearest_deletion['scheduled_deletion_at'].isoformat(),
        "days_remaining": nearest_deletion['days_remaining']
    }


class RoleRestoreRequest(BaseModel):
    role: Literal['student', 'tutor', 'parent', 'advertiser', 'user']


@router.post("/api/role/restore")
async def restore_role(
    request: RoleRestoreRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Restore a role that was scheduled for deletion
    Clears the scheduled_deletion_at timestamp and reactivates the role
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if user has this role
    if request.role not in user.roles:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"You don't have a {request.role} role"
        )

    # Find and restore the role profile
    role_restored = False
    if request.role == 'student':
        student = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        if student and student.scheduled_deletion_at:
            student.scheduled_deletion_at = None
            student.is_active = True
            role_restored = True

    elif request.role == 'tutor':
        tutor = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
        if tutor and tutor.scheduled_deletion_at:
            tutor.scheduled_deletion_at = None
            tutor.is_active = True
            role_restored = True

    elif request.role == 'parent':
        parent = db.query(ParentProfile).filter(ParentProfile.user_id == user.id).first()
        if parent and parent.scheduled_deletion_at:
            parent.scheduled_deletion_at = None
            parent.is_active = True
            role_restored = True

    elif request.role == 'advertiser':
        advertiser = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user.id).first()
        if advertiser and advertiser.scheduled_deletion_at:
            advertiser.scheduled_deletion_at = None
            advertiser.is_active = True
            role_restored = True

    elif request.role == 'user':
        user_profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
        if user_profile and user_profile.scheduled_deletion_at:
            user_profile.scheduled_deletion_at = None
            user_profile.is_active = True
            role_restored = True

    if not role_restored:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No pending deletion found for {request.role} role"
        )

    db.commit()

    return {
        "success": True,
        "message": f"{request.role.capitalize()} role has been restored successfully",
        "role_restored": request.role
    }
