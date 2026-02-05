"""
Google OAuth 2.0 Authentication Endpoints
Handles Google Sign-In for login and registration
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
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
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

# Environment detection
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

def get_redirect_uri(request: Request = None) -> str:
    """
    Dynamically determine the redirect URI based on environment or request origin

    Priority:
    1. GOOGLE_REDIRECT_URI from .env (if set)
    2. Request origin (if available)
    3. Environment-based default
    """
    # Check if explicitly set in .env
    env_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    if env_redirect_uri:
        return env_redirect_uri

    # Try to detect from request origin
    if request:
        origin = request.headers.get("origin", "")
        referer = request.headers.get("referer", "")

        # Extract base URL from origin or referer
        if origin:
            return origin
        elif referer:
            # Extract protocol and domain from referer
            from urllib.parse import urlparse
            parsed = urlparse(referer)
            return f"{parsed.scheme}://{parsed.netloc}"

    # Default based on environment
    if ENVIRONMENT == "production":
        return "https://astegni.com"
    else:
        return "http://localhost:8081"

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
        # NO ACCOUNT FOUND - CREATE NEW USER (REGISTRATION)
        # ============================================
        print(f"[GoogleOAuth] Creating new user for email: {email}")

        # Parse name into Ethiopian naming convention
        parsed_name = parse_ethiopian_name(
            google_user.get("name"),
            google_user.get("given_name"),
            google_user.get("family_name")
        )

        # Create new user with role-optional registration
        new_user = User(
            first_name=parsed_name["first_name"],
            father_name=parsed_name["father_name"],
            grandfather_name=parsed_name["grandfather_name"],
            email=email,
            password_hash=hash_password(secrets.token_urlsafe(32)),  # Random secure password
            profile_picture=google_user.get("picture"),
            email_verified=True,  # Google already verified the email
            has_password=False,  # OAuth user - no password login
            roles=None,  # NO ROLE - role-optional registration
            active_role=None,  # NO ROLE - user will add roles later
            google_email=email,  # Save Google email for connected accounts
            oauth_provider="google"  # Mark as Google OAuth user
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        print(f"[GoogleOAuth] New user created: ID={new_user.id}, Email={email}")
        user = new_user

    else:
        # ============================================
        # EXISTING USER - LOGIN
        # ============================================
        print(f"[GoogleOAuth] Existing user logged in: {existing_user.email}")
        user = existing_user

        # Check if account is scheduled for deletion (same as regular login)
        if user.account_status == 'pending_deletion':
            from sqlalchemy import text

            # Get deletion details
            deletion_request = db.execute(
                text("""
                SELECT scheduled_deletion_at, reasons, deletion_fee
                FROM account_deletion_requests
                WHERE user_id = :user_id AND status = 'pending'
                ORDER BY requested_at DESC
                LIMIT 1
                """),
                {"user_id": user.id}
            ).fetchone()

            if deletion_request:
                scheduled_at = deletion_request[0]
                days_remaining = (scheduled_at - datetime.utcnow()).days if scheduled_at else 0

                # Return special response indicating pending deletion
                # Frontend will show restoration confirmation modal
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error_code": "ACCOUNT_PENDING_DELETION",
                        "message": "Your account is scheduled for deletion",
                        "days_remaining": days_remaining,
                        "scheduled_deletion_at": scheduled_at.isoformat() if scheduled_at else None,
                        "reasons": deletion_request[1] if deletion_request[1] else [],
                        "deletion_fee": float(deletion_request[2]) if deletion_request[2] else 200.00,
                        "email": user.email
                    }
                )

    # Update profile picture if changed
    if google_user.get("picture") and not user.profile_picture:
        user.profile_picture = google_user["picture"]

    # Mark email as verified if Google says it's verified
    if google_user.get("email_verified") and not user.email_verified:
        user.email_verified = True

    # Save Google OAuth connection info (for connected accounts modal)
    if not user.google_email:
        user.google_email = email
    if not user.oauth_provider:
        user.oauth_provider = "google"

    db.commit()

    # Step 3: Get role-specific IDs (handle NULL roles)
    role_ids = {}
    user_roles = user.roles or []  # Handle NULL roles

    if "student" in user_roles:
        student = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        role_ids["student"] = student.id if student else None

    if "tutor" in user_roles:
        tutor = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
        role_ids["tutor"] = tutor.id if tutor else None

    if "parent" in user_roles:
        parent = db.query(ParentProfile).filter(ParentProfile.user_id == user.id).first()
        role_ids["parent"] = parent.id if parent else None

    if "advertiser" in user_roles:
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
async def get_google_oauth_config(request: Request):
    """
    Get Google OAuth configuration for frontend

    Returns client ID and redirect URI needed for Google Sign-In button
    Dynamically determines redirect URI based on request origin
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth not configured on server"
        )

    redirect_uri = get_redirect_uri(request)

    return {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri
    }


# ============================================
# HEALTH CHECK
# ============================================

@router.get("/google/status")
async def google_oauth_status(request: Request):
    """Check if Google OAuth is properly configured"""
    redirect_uri = get_redirect_uri(request)

    return {
        "configured": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET),
        "client_id_set": bool(GOOGLE_CLIENT_ID),
        "client_secret_set": bool(GOOGLE_CLIENT_SECRET),
        "redirect_uri": redirect_uri,
        "environment": ENVIRONMENT
    }
