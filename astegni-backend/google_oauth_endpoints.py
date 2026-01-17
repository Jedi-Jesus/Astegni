"""
Google OAuth 2.0 Authentication Endpoints
Handles Google Sign-In for login and registration
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import Optional
import requests
import secrets
from datetime import datetime, timedelta

# Import existing models and utilities
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from models import SessionLocal, User, StudentProfile, TutorProfile, ParentProfile, AdvertiserProfile
from utils import create_access_token, create_refresh_token, hash_password

router = APIRouter(prefix="/api/oauth", tags=["Google OAuth"])

# ============================================
# GOOGLE OAUTH CONFIGURATION
# ============================================

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8081")
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

# ============================================
# REQUEST/RESPONSE MODELS
# ============================================

class GoogleAuthRequest(BaseModel):
    """Google ID token from frontend"""
    id_token: str
    role: Optional[str] = "student"  # Default role for new registrations

class GoogleAuthResponse(BaseModel):
    """Standard auth response (same as regular login)"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict

# ============================================
# DATABASE DEPENDENCY
# ============================================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============================================
# HELPER FUNCTIONS
# ============================================

def verify_google_token(id_token: str) -> dict:
    """
    Verify Google ID token and extract user information

    Args:
        id_token: JWT token from Google Sign-In

    Returns:
        dict with user info (email, name, picture, etc.)

    Raises:
        HTTPException if token is invalid
    """
    try:
        # Google's token verification endpoint
        response = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
            timeout=5
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token"
            )

        token_info = response.json()

        # Verify the token is for our app
        if GOOGLE_CLIENT_ID and token_info.get("aud") != GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token not issued for this application"
            )

        # Note: Google's tokeninfo endpoint already validates expiration
        # No need to check again - if we got here, token is valid

        return {
            "email": token_info.get("email"),
            "email_verified": token_info.get("email_verified") == "true",
            "name": token_info.get("name"),
            "picture": token_info.get("picture"),
            "given_name": token_info.get("given_name"),
            "family_name": token_info.get("family_name"),
            "locale": token_info.get("locale")
        }

    except requests.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to verify Google token"
        )

def parse_ethiopian_name(google_name: str, given_name: str = None, family_name: str = None):
    """
    Parse Google name into Ethiopian naming convention (First, Father, Grandfather)

    Ethiopian naming: Given Name + Father's Name + Grandfather's Name
    Google usually provides: Given Name + Family Name

    Strategy:
    - given_name → first_name
    - family_name → father_name
    - Generate grandfather_name from family_name or use default
    """
    first_name = given_name or google_name.split()[0] if google_name else "User"

    # Handle Ethiopian-style names that may already have 3 parts
    name_parts = google_name.split() if google_name else []

    if len(name_parts) >= 3:
        # Likely already Ethiopian format: "Abebe Kebede Tadesse"
        return {
            "first_name": name_parts[0],
            "father_name": name_parts[1],
            "grandfather_name": name_parts[2]
        }
    elif len(name_parts) == 2:
        # Western format: "John Doe" → assume Doe is father's name
        return {
            "first_name": name_parts[0],
            "father_name": name_parts[1],
            "grandfather_name": name_parts[1]  # Use same as father (user can update)
        }
    else:
        # Only one name provided
        return {
            "first_name": first_name,
            "father_name": family_name or first_name,
            "grandfather_name": family_name or first_name
        }

def create_profile_for_role(db: Session, user_id: int, role: str) -> Optional[int]:
    """
    Create role-specific profile for user

    Returns:
        profile_id for the created profile
    """
    try:
        if role == "student":
            profile = StudentProfile(user_id=user_id)
            db.add(profile)
            db.flush()
            return profile.id
        elif role == "tutor":
            profile = TutorProfile(user_id=user_id)
            db.add(profile)
            db.flush()
            return profile.id
        elif role == "parent":
            profile = ParentProfile(user_id=user_id)
            db.add(profile)
            db.flush()
            return profile.id
        elif role == "advertiser":
            profile = AdvertiserProfile(user_id=user_id)
            db.add(profile)
            db.flush()
            return profile.id
        return None
    except Exception as e:
        print(f"Error creating profile for role {role}: {e}")
        return None

def format_user_response(user: User, role_ids: dict) -> dict:
    """Format user object for API response"""
    return {
        "id": user.id,
        "first_name": user.first_name,
        "father_name": user.father_name,
        "grandfather_name": user.grandfather_name,
        "email": user.email,
        "phone": user.phone,
        "roles": user.roles or [],
        "active_role": user.active_role,
        "profile_picture": user.profile_picture,
        "email_verified": user.email_verified,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "role_ids": role_ids
    }

# ============================================
# ENDPOINTS
# ============================================

@router.post("/google", response_model=GoogleAuthResponse)
async def google_oauth_login(
    auth_request: GoogleAuthRequest,
    db: Session = Depends(get_db)
):
    """
    Google OAuth 2.0 Sign-In

    Flow:
    1. Verify Google ID token
    2. Check if user exists by email
    3. If exists: Login
    4. If not exists: Register new user
    5. Return access + refresh tokens

    Args:
        auth_request: Contains Google ID token and optional role

    Returns:
        Access token, refresh token, and user data
    """

    # Step 1: Verify Google token and extract user info
    google_user = verify_google_token(auth_request.id_token)

    if not google_user.get("email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided by Google"
        )

    email = google_user["email"]

    # Step 2: Check if user already exists
    existing_user = db.query(User).filter(User.email == email).first()

    if not existing_user:
        # ============================================
        # NO ACCOUNT FOUND - RETURN ERROR
        # ============================================
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email. Please register first."
        )

    # ============================================
    # EXISTING USER - LOGIN
    # ============================================

    user = existing_user

    # Update profile picture if changed
    if google_user.get("picture") and not user.profile_picture:
        user.profile_picture = google_user["picture"]

    # Mark email as verified if Google says it's verified
    if google_user.get("email_verified") and not user.email_verified:
        user.email_verified = True

    db.commit()

    print(f"[GoogleOAuth] Existing user logged in: {user.email}")

    # Step 3: Get role-specific IDs
    role_ids = {}

    if "student" in user.roles:
        student = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        role_ids["student"] = student.id if student else None

    if "tutor" in user.roles:
        tutor = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
        role_ids["tutor"] = tutor.id if tutor else None

    if "parent" in user.roles:
        parent = db.query(ParentProfile).filter(ParentProfile.user_id == user.id).first()
        role_ids["parent"] = parent.id if parent else None

    if "advertiser" in user.roles:
        advertiser = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user.id).first()
        role_ids["advertiser"] = advertiser.id if advertiser else None

    # Step 4: Generate tokens
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.active_role,
            "role_ids": role_ids
        }
    )

    refresh_token = create_refresh_token(
        data={
            "sub": str(user.id),
            "role": user.active_role,
            "role_ids": role_ids
        }
    )

    # Step 5: Return response (same format as regular login)
    return GoogleAuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=format_user_response(user, role_ids)
    )


@router.get("/google/config")
async def get_google_oauth_config():
    """
    Get Google OAuth configuration for frontend

    Returns client ID and redirect URI needed for Google Sign-In button
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth not configured on server"
        )

    return {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI
    }


# ============================================
# HEALTH CHECK
# ============================================

@router.get("/google/status")
async def google_oauth_status():
    """Check if Google OAuth is properly configured"""
    return {
        "configured": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET),
        "client_id_set": bool(GOOGLE_CLIENT_ID),
        "client_secret_set": bool(GOOGLE_CLIENT_SECRET),
        "redirect_uri": GOOGLE_REDIRECT_URI
    }
