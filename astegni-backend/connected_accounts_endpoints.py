"""
Connected Accounts Endpoints
Handles linking/unlinking of OAuth accounts (Google, Facebook, etc.)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from models import SessionLocal, User
from utils import get_current_user

router = APIRouter(prefix="/api/user", tags=["Connected Accounts"])

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
# REQUEST/RESPONSE MODELS
# ============================================

class ConnectedAccountsResponse(BaseModel):
    google_connected: bool
    google_email: Optional[str] = None
    has_password: bool
    can_unlink_google: bool  # True only if has password

class UnlinkGoogleRequest(BaseModel):
    password: Optional[str] = None  # Required if account has password

# ============================================
# ENDPOINTS
# ============================================

@router.get("/connected-accounts", response_model=ConnectedAccountsResponse)
async def get_connected_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's connected accounts status

    Returns information about which OAuth accounts are linked
    """
    google_connected = bool(current_user.google_email)
    has_password = current_user.has_password if current_user.has_password is not None else True

    return ConnectedAccountsResponse(
        google_connected=google_connected,
        google_email=current_user.google_email,
        has_password=has_password,
        can_unlink_google=has_password  # Can only unlink if has password
    )

@router.post("/unlink-google")
async def unlink_google_account(
    request: UnlinkGoogleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Unlink Google account from user profile

    Requires password verification if user has a password set
    """
    # Check if Google is connected
    if not current_user.google_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account is not connected"
        )

    # Check if user has password (can't unlink if no password)
    has_password = current_user.has_password if current_user.has_password is not None else True
    if not has_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot unlink Google account. You must set a password first."
        )

    # Verify password if provided
    if request.password:
        from utils import verify_password
        if not verify_password(request.password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password"
            )

    # Unlink Google account
    current_user.google_email = None
    current_user.oauth_provider = None

    db.commit()

    return {"message": "Google account unlinked successfully"}

@router.post("/set-password")
async def set_password_for_oauth_user(
    password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Set a password for OAuth-only users

    Allows users who signed up with Google to add password login
    """
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )

    # Set password
    from utils import hash_password
    current_user.password_hash = hash_password(password)
    current_user.has_password = True

    db.commit()

    return {"message": "Password set successfully"}
