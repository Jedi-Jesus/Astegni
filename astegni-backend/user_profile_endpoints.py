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
from currency_utils import get_currency_from_country

router = APIRouter()

# Pydantic Models
class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    quote: Optional[str] = None
    about: Optional[str] = None
    location: Optional[str] = None
    display_location: Optional[bool] = None
    country_code: Optional[str] = None  # ISO country code from GPS
    languages: Optional[List[str]] = None
    hobbies: Optional[List[str]] = None
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
    hobbies: Optional[List[str]]
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
    NOTE: profile_picture, location, languages, social_links now read from users table
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
            interested_in=[]
        )
        db.add(user_profile)
        db.commit()
        db.refresh(user_profile)

    # Build name based on naming convention
    user = current_user
    if user.last_name:
        # International naming convention
        display_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    else:
        # Ethiopian naming convention
        name_parts = [user.first_name, user.father_name, user.grandfather_name]
        display_name = " ".join(part for part in name_parts if part)

    # Return profile data - read deprecated fields from users table
    return {
        "id": user_profile.id,
        "user_id": user_profile.user_id,
        "name": display_name or "User",
        "first_name": user.first_name,
        "father_name": user.father_name,
        "grandfather_name": user.grandfather_name,
        "last_name": user.last_name,
        "username": user_profile.username,
        "hero_title": user_profile.hero_title,
        "hero_subtitle": user_profile.hero_subtitle,
        "quote": user_profile.quote,
        "about": user_profile.about,
        "location": user.location,  # Read from users table
        "languages": user.languages or [],  # Read from users table
        "hobbies": user.hobbies or [],  # Read from users table
        "interested_in": user_profile.interested_in or [],
        "social_links": user.social_links or {},  # Read from users table
        "profile_picture": user.profile_picture,  # Read from users table
        "cover_image": user_profile.cover_image,
        "is_active": user_profile.is_active,
        "is_online": user_profile.is_online
    }

@router.put("/api/user/profile")
async def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile data in user_profiles table
    NOTE: profile_picture, location, languages, social_links are updated in users table
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

    # Fields that belong to users table
    user_fields = ['location', 'languages', 'hobbies', 'social_links', 'country_code']

    # Auto-detect currency from country_code if provided
    if 'country_code' in update_data and update_data['country_code']:
        country_code = update_data['country_code']
        currency = get_currency_from_country(country_code)
        current_user.currency = currency
        print(f"[Currency Auto-Detection] Country: {country_code} -> Currency: {currency}")

    for key, value in update_data.items():
        if key in user_fields:
            # Update user table
            if hasattr(current_user, key):
                setattr(current_user, key, value)
        elif hasattr(user_profile, key):
            # Update user_profile table
            setattr(user_profile, key, value)

    db.commit()
    db.refresh(user_profile)
    db.refresh(current_user)

    return {
        "message": "Profile updated successfully",
        "profile": {
            "id": user_profile.id,
            "user_id": user_profile.user_id,
            "username": user_profile.username,
            "hero_title": user_profile.hero_title,
            "hero_subtitle": user_profile.hero_subtitle,
            "quote": user_profile.quote,
            "about": user_profile.about,
            "location": current_user.location,  # From users table
            "country_code": current_user.country_code,  # From users table
            "currency": current_user.currency,  # Auto-detected from country_code
            "languages": current_user.languages or [],  # From users table
            "hobbies": current_user.hobbies or [],  # From users table
            "interested_in": user_profile.interested_in or [],
            "social_links": current_user.social_links or {},  # From users table
            "profile_picture": current_user.profile_picture,  # From users table
            "cover_image": user_profile.cover_image
        }
    }

@router.get("/api/user/profile/full")
async def get_full_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get complete user profile data (users + user_profiles tables combined)
    NOTE: profile_picture, location, languages, social_links now read from users table
    """
    # Get user profile
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()

    # Build name based on naming convention
    if current_user.last_name:
        # International naming convention
        display_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip()
    else:
        # Ethiopian naming convention
        name_parts = [current_user.first_name, current_user.father_name, current_user.grandfather_name]
        display_name = " ".join(part for part in name_parts if part)

    # Combine data from both tables
    full_profile = {
        # From users table
        "id": current_user.id,
        "name": display_name or "User",
        "first_name": current_user.first_name,
        "father_name": current_user.father_name,
        "grandfather_name": current_user.grandfather_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "profile_picture": current_user.profile_picture,  # From users table
        "location": current_user.location,  # From users table
        "languages": current_user.languages or [],  # From users table
        "hobbies": current_user.hobbies or [],  # From users table
        "social_links": current_user.social_links or {},  # From users table
        "bio": current_user.bio,
        "active_role": current_user.current_role if hasattr(current_user, 'current_role') else 'user',
        "roles": current_user.roles if hasattr(current_user, 'roles') else ['user'],
        "user_created_at": current_user.created_at,  # When user account was created

        # From user_profiles table (if exists)
        "user_profile_username": user_profile.username if user_profile else None,
        "user_profile_hero_title": user_profile.hero_title if user_profile else None,
        "user_profile_hero_subtitle": user_profile.hero_subtitle if user_profile else None,
        "user_profile_quote": user_profile.quote if user_profile else None,
        "user_profile_about": user_profile.about if user_profile else None,
        "user_profile_interested_in": user_profile.interested_in if user_profile else [],
        "user_profile_cover_image": user_profile.cover_image if user_profile else None,
        "user_profile_is_online": user_profile.is_online if user_profile else False,
        "user_profile_created_at": user_profile.created_at if user_profile else None,  # When profile role was added
    }

    return full_profile

@router.put("/api/user/profile/full")
async def update_full_user_profile(
    profile_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update profile data in both users and user_profiles tables
    NOTE: profile_picture, location, languages, social_links are updated in users table
    """
    # Check if user has 'user' role
    if 'user' not in current_user.roles:
        raise HTTPException(status_code=403, detail="User role required")

    # Fields that belong to users table
    users_table_fields = ['location', 'display_location', 'languages', 'social_links', 'profile_picture']

    # Update fields in users table
    for field in users_table_fields:
        if field in profile_data and profile_data[field] is not None:
            setattr(current_user, field, profile_data[field])

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

    # Update user_profiles table fields
    user_profile_fields = {
        'username': 'username',
        'hero_title': 'hero_title',
        'hero_subtitle': 'hero_subtitle',
        'quote': 'quote',
        'about': 'about',
        'interested_in': 'interested_in'
    }

    # Check username uniqueness if provided
    if 'username' in profile_data and profile_data['username']:
        existing = db.query(UserProfile).filter(
            UserProfile.username == profile_data['username'],
            UserProfile.id != (user_profile.id if user_profile.id else 0)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")

    # Update user_profile fields
    for key, field in user_profile_fields.items():
        if key in profile_data:
            setattr(user_profile, field, profile_data[key])

    db.commit()
    db.refresh(current_user)
    db.refresh(user_profile)

    return {
        "message": "Profile updated successfully",
        "profile": {
            "user_id": current_user.id,
            "location": current_user.location,  # From users table
            "languages": current_user.languages or [],  # From users table
            "social_links": current_user.social_links or {},  # From users table
            "profile_picture": current_user.profile_picture,  # From users table
            "username": user_profile.username,
            "hero_title": user_profile.hero_title,
            "quote": user_profile.quote,
            "about": user_profile.about
        }
    }
