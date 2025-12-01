"""
Helper Functions for Profile-Based Connections

These functions help resolve profile IDs from user IDs and vice versa.
"""

from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException

# Import models from refactored location
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app.py modules'))
from models import TutorProfile, StudentProfile, ParentProfile, AdvertiserProfile, User


def get_profile_from_user_id(db: Session, user_id: int, preferred_profile_type: str = None):
    """
    Get a profile for a given user_id.

    Args:
        db: Database session
        user_id: The user's ID
        preferred_profile_type: Optional preferred type ('tutor', 'student', 'parent', 'advertiser')

    Returns:
        dict: {'profile_id': int, 'profile_type': str} or None

    Priority (if no preferred type):
        1. Tutor (most common for connections)
        2. Student
        3. Parent
        4. Advertiser
    """

    # If preferred type is specified, try that first
    if preferred_profile_type:
        profile = _get_specific_profile(db, user_id, preferred_profile_type)
        if profile:
            return profile

    # Otherwise, try in priority order
    profile_types = ['tutor', 'student', 'parent', 'advertiser']
    for profile_type in profile_types:
        profile = _get_specific_profile(db, user_id, profile_type)
        if profile:
            return profile

    return None


def _get_specific_profile(db: Session, user_id: int, profile_type: str):
    """Get a specific profile type for a user"""

    if profile_type == 'tutor':
        profile = db.query(TutorProfile).filter(TutorProfile.user_id == user_id).first()
        if profile:
            return {'profile_id': profile.id, 'profile_type': 'tutor'}

    elif profile_type == 'student':
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        if profile:
            return {'profile_id': profile.id, 'profile_type': 'student'}

    elif profile_type == 'parent':
        profile = db.query(ParentProfile).filter(ParentProfile.user_id == user_id).first()
        if profile:
            return {'profile_id': profile.id, 'profile_type': 'parent'}

    elif profile_type == 'advertiser':
        profile = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user_id).first()
        if profile:
            return {'profile_id': profile.id, 'profile_type': 'advertiser'}

    return None


def get_user_id_from_profile(db: Session, profile_id: int, profile_type: str):
    """
    Get user_id from a profile.

    Args:
        db: Database session
        profile_id: The profile's ID
        profile_type: The profile type ('tutor', 'student', 'parent', 'advertiser')

    Returns:
        int: user_id or None
    """

    if profile_type == 'tutor':
        profile = db.query(TutorProfile).filter(TutorProfile.id == profile_id).first()
        return profile.user_id if profile else None

    elif profile_type == 'student':
        profile = db.query(StudentProfile).filter(StudentProfile.id == profile_id).first()
        return profile.user_id if profile else None

    elif profile_type == 'parent':
        profile = db.query(ParentProfile).filter(ParentProfile.id == profile_id).first()
        return profile.user_id if profile else None

    elif profile_type == 'advertiser':
        profile = db.query(AdvertiserProfile).filter(AdvertiserProfile.id == profile_id).first()
        return profile.user_id if profile else None

    return None


def validate_profile_exists(db: Session, profile_id: int, profile_type: str):
    """
    Validate that a profile exists.

    Args:
        db: Database session
        profile_id: The profile's ID
        profile_type: The profile type

    Returns:
        bool: True if exists, False otherwise

    Raises:
        HTTPException: If profile doesn't exist
    """

    user_id = get_user_id_from_profile(db, profile_id, profile_type)

    if not user_id:
        raise HTTPException(
            status_code=404,
            detail=f"{profile_type.capitalize()} profile #{profile_id} not found"
        )

    return True


def get_profile_table_name(profile_type: str):
    """Get the database table name for a profile type"""

    mapping = {
        'tutor': 'tutor_profiles',
        'student': 'student_profiles',
        'parent': 'parent_profiles',
        'advertiser': 'advertiser_profiles'
    }

    return mapping.get(profile_type)
