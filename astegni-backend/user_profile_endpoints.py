"""
User Profile Endpoints
Handles user profile CRUD operations for the 'user' role
"""

import sys
import os

# Add app.py modules to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app.py modules'))

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List, Dict
from pydantic import BaseModel
from models import User, UserProfile, get_db
from utils import get_current_user

router = APIRouter()

# Pydantic Models
class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    quote: Optional[str] = None
    about: Optional[str] = None
    location: Optional[str] = None
    languages: Optional[List[str]] = None
    interested_in: Optional[List[str]] = None
    social_links: Optional[Dict[str, str]] = None

class UserProfileResponse(BaseModel):
    id: int
    user_id: int
    username: Optional[str]
    hero_title: Optional[str]
    hero_subtitle: Optional[str]
    quote: Optional[str]
    about: Optional[str]
    location: Optional[str]
    languages: Optional[List[str]]
    interested_in: Optional[List[str]]
    social_links: Optional[Dict[str, str]]
    profile_picture: Optional[str]
    cover_image: Optional[str]
    is_active: bool
    is_online: bool

    class Config:
        from_attributes = True

@router.get("/api/user/profile", response_model=UserProfileResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's profile data from user_profiles table
    Creates profile if it doesn't exist
    """
    # Check if user has 'user' role
    if 'user' not in current_user.roles:
        raise HTTPException(status_code=403, detail="User role required")

    # Get or create user profile
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()

    if not user_profile:
        # Create new profile for user
        user_profile = UserProfile(
            user_id=current_user.id,
            is_active=True,
            is_online=False,
            languages=[],
            interested_in=[],
            social_links={}
        )
        db.add(user_profile)
        db.commit()
        db.refresh(user_profile)

    return user_profile

@router.put("/api/user/profile")
async def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile data in user_profiles table
    """
    # Check if user has 'user' role
    if 'user' not in current_user.roles:
        raise HTTPException(status_code=403, detail="User role required")

    # Get or create user profile
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()

    if not user_profile:
        # Create new profile
        user_profile = UserProfile(
            user_id=current_user.id,
            is_active=True,
            is_online=False
        )
        db.add(user_profile)

    # Update fields
    update_data = profile_data.dict(exclude_unset=True)

    # Check username uniqueness if provided
    if 'username' in update_data and update_data['username']:
        existing = db.query(UserProfile).filter(
            UserProfile.username == update_data['username'],
            UserProfile.id != (user_profile.id if user_profile.id else 0)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")

    for key, value in update_data.items():
        setattr(user_profile, key, value)

    db.commit()
    db.refresh(user_profile)

    return {
        "message": "Profile updated successfully",
        "profile": user_profile
    }

@router.get("/api/user/profile/full")
async def get_full_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get complete user profile data (users + user_profiles tables combined)
    """
    # Get user profile
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()

    # Combine data from both tables
    full_profile = {
        # From users table
        "id": current_user.id,
        "first_name": current_user.first_name,
        "father_name": current_user.father_name,
        "grandfather_name": current_user.grandfather_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "profile_picture": current_user.profile_picture,
        "bio": current_user.bio,
        "created_at": current_user.created_at,

        # From user_profiles table (if exists)
        "username": user_profile.username if user_profile else None,
        "hero_title": user_profile.hero_title if user_profile else None,
        "hero_subtitle": user_profile.hero_subtitle if user_profile else None,
        "quote": user_profile.quote if user_profile else None,
        "about": user_profile.about if user_profile else None,
        "location": user_profile.location if user_profile else None,
        "languages": user_profile.languages if user_profile else [],
        "interested_in": user_profile.interested_in if user_profile else [],
        "social_links": user_profile.social_links if user_profile else {},
        "cover_image": user_profile.cover_image if user_profile else None,
        "is_online": user_profile.is_online if user_profile else False,
    }

    return full_profile
