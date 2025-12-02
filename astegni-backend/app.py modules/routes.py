"""
API Routes for Astegni Educational Platform
Fixed version with proper Backblaze integration and all upload endpoints
"""

import os
import jwt
import random
import uuid
from datetime import datetime, timedelta, date, time
from typing import Optional, List, Dict, Any
from fastapi import (
    APIRouter, HTTPException, Depends, status, Request,
    BackgroundTasks, WebSocket, Form, File, UploadFile, Query, Body, Header
)
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, func, text, cast, String

# Import models and utilities
from models import *
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from utils import *
from config import *
from backblaze_service import get_backblaze_service  # Import Backblaze service
from admin_auth_endpoints import get_current_admin  # Import admin authentication

# Create router
router = APIRouter()

# ============================================
# HELPER FUNCTIONS
# ============================================

def get_role_specific_profile_picture(user: User, db: Session) -> Optional[str]:
    """
    Get profile picture from role-specific table based on user's active role.
    Falls back to user.profile_picture if not found in role-specific table.
    """
    active_role = user.active_role

    # Check role-specific tables
    if active_role == "tutor":
        tutor_profile = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
        if tutor_profile and tutor_profile.profile_picture:
            return tutor_profile.profile_picture
    elif active_role == "student":
        student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        if student_profile and student_profile.profile_picture:
            return student_profile.profile_picture
    # Add more role-specific checks as needed (guardian, advertiser, etc.)

    # Fallback to user table profile picture (deprecated but kept for backward compatibility)
    return user.profile_picture

def get_role_specific_username(user: User, db: Session) -> Optional[str]:
    """
    Get username from role-specific table based on user's active role.
    Returns None if not found (username is now only stored in role-specific tables).
    """
    active_role = user.active_role

    # Check role-specific tables
    if active_role == "tutor":
        tutor_profile = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
        if tutor_profile and tutor_profile.username:
            return tutor_profile.username
    elif active_role == "student":
        student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        if student_profile and student_profile.username:
            return student_profile.username
    elif active_role == "parent":
        parent_profile = db.query(ParentProfile).filter(ParentProfile.user_id == user.id).first()
        if parent_profile and parent_profile.username:
            return parent_profile.username
    elif active_role == "advertiser":
        advertiser_profile = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user.id).first()
        if advertiser_profile and advertiser_profile.username:
            return advertiser_profile.username

    # No username found - user needs to set it in their profile
    return None

# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================

@router.post("/api/register", response_model=TokenResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user or add role to existing user"""
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()

    if existing_user:
        # User exists - add new role if not already present
        if user_data.role in existing_user.roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User already has {user_data.role} role"
            )

        # Verify password matches
        if not verify_password(user_data.password, existing_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email exists with different password. Please login instead."
            )

        # Add new role
        existing_user.roles = existing_user.roles + [user_data.role]
        existing_user.active_role = user_data.role
        db.commit()

        # Create profile for new role
        if user_data.role == "tutor" and not existing_user.tutor_profile:
            tutor_profile = TutorProfile(user_id=existing_user.id)
            db.add(tutor_profile)
            db.commit()
        elif user_data.role == "student" and not existing_user.student_profile:
            student_profile = StudentProfile(user_id=existing_user.id)
            db.add(student_profile)
            db.commit()
        elif user_data.role == "admin":
            # Create admin_profile record using raw SQL
            db.execute(text("""
                INSERT INTO admin_profile (admin_id, first_name, father_name, email, department, created_at, updated_at)
                VALUES (:admin_id, :first_name, :father_name, :email, :department, NOW(), NOW())
                ON CONFLICT (admin_id) DO NOTHING
            """), {
                "admin_id": existing_user.id,
                "first_name": existing_user.first_name,
                "father_name": existing_user.father_name,
                "email": existing_user.email,
                "department": user_data.department or "manage-system-settings"
            })
            db.commit()

        # Get role-specific IDs for all roles the user has
        role_ids = get_role_ids_from_user(existing_user, db)

        # Create tokens with role-specific IDs
        token_data = {
            "sub": existing_user.id,
            "role": existing_user.active_role,
            "role_ids": role_ids
        }
        access_token = create_access_token(data=token_data)
        refresh_token = create_refresh_token(data=token_data)

        # Store refresh token
        refresh_token_obj = RefreshToken(
            token=refresh_token,
            user_id=existing_user.id,
            expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        )
        db.add(refresh_token_obj)
        db.commit()

        # Get profile picture from role-specific table
        profile_picture = get_role_specific_profile_picture(existing_user, db)
        # Get username from role-specific table
        username = get_role_specific_username(existing_user, db)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse(
                id=existing_user.id,
                first_name=existing_user.first_name,
                father_name=existing_user.father_name,
                grandfather_name=existing_user.grandfather_name,
                username=username,
                email=existing_user.email,
                phone=existing_user.phone,
                roles=existing_user.roles,
                active_role=existing_user.active_role,
                profile_picture=profile_picture,
                created_at=existing_user.created_at,
                is_active=existing_user.is_active,
                email_verified=existing_user.email_verified
            )
        )

    # Create new user
    new_user = User(
        first_name=user_data.first_name,
        father_name=user_data.father_name,
        grandfather_name=user_data.grandfather_name,
        email=user_data.email,
        phone=user_data.phone,
        password_hash=hash_password(user_data.password),
        roles=[user_data.role],
        active_role=user_data.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create profile based on role
    if user_data.role == "tutor":
        tutor_profile = TutorProfile(user_id=new_user.id)
        db.add(tutor_profile)
    elif user_data.role == "student":
        student_profile = StudentProfile(user_id=new_user.id)
        db.add(student_profile)
    elif user_data.role == "admin":
        # Create admin_profile record using raw SQL
        db.execute(text("""
            INSERT INTO admin_profile (admin_id, first_name, father_name, email, department, created_at, updated_at)
            VALUES (:admin_id, :first_name, :father_name, :email, :department, NOW(), NOW())
        """), {
            "admin_id": new_user.id,
            "first_name": new_user.first_name,
            "father_name": new_user.father_name,
            "email": new_user.email,
            "department": user_data.department or "manage-system-settings"
        })

    db.commit()

    # Get role-specific IDs for all roles the user has
    role_ids = get_role_ids_from_user(new_user, db)

    # Create tokens with role-specific IDs
    token_data = {
        "sub": new_user.id,
        "role": new_user.active_role,
        "role_ids": role_ids
    }
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    # Store refresh token
    refresh_token_obj = RefreshToken(
        token=refresh_token,
        user_id=new_user.id,
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(refresh_token_obj)
    db.commit()

    # Get profile picture from role-specific table
    profile_picture = get_role_specific_profile_picture(new_user, db)
    # Get username from role-specific table
    username = get_role_specific_username(new_user, db)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            id=new_user.id,
            first_name=new_user.first_name,
            father_name=new_user.father_name,
            grandfather_name=new_user.grandfather_name,
            username=username,
            email=new_user.email,
            phone=new_user.phone,
            roles=new_user.roles,
            active_role=new_user.active_role,
            profile_picture=profile_picture,
            created_at=new_user.created_at,
            is_active=new_user.is_active,
            email_verified=new_user.email_verified
        )
    )

@router.post("/api/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    User login endpoint

    IMPORTANT: This endpoint is for regular USERS only (from users table).
    It does NOT work with admin_profile table.
    Admins should use /api/admin/login endpoint.

    NEW: Also handles pending parent invitations (temp password login).
    If email not found in users table, check parent_invitations for new user invitations.
    """
    from sqlalchemy import text

    # Query users table only, NOT admin_profile
    user = db.query(User).filter(User.email == form_data.username).first()

    # If no user found, check for pending parent invitation (new user with temp password)
    invitation = None
    if not user:
        # Check parent_invitations table for pending new user invitation
        # Wrapped in try-except in case the table doesn't exist (optional feature)
        try:
            invitation = db.execute(
                text("""
                SELECT * FROM parent_invitations
                WHERE pending_email = :email
                AND status = 'pending'
                AND is_new_user = TRUE
                AND token_expires_at > :now
                ORDER BY created_at DESC
                LIMIT 1
                """),
                {"email": form_data.username, "now": datetime.utcnow()}
            ).fetchone()
        except Exception as e:
            # Table doesn't exist or other DB error - skip parent invitation check
            print(f"[Login] parent_invitations check skipped: {e}")
            invitation = None

        if invitation and verify_password(form_data.password, invitation.temp_password_hash):
            # Valid temp password login - create user and process invitation
            new_user = User(
                first_name=invitation.pending_first_name,
                father_name=invitation.pending_father_name,
                grandfather_name=invitation.pending_grandfather_name,
                email=invitation.pending_email,
                phone=invitation.pending_phone,
                gender=invitation.pending_gender,
                password_hash=invitation.temp_password_hash,
                roles=["parent"],
                active_role="parent",
                is_active=True
            )
            db.add(new_user)
            db.flush()

            # Create parent profile
            parent_profile = ParentProfile(
                user_id=new_user.id,
                relationship_type=invitation.relationship_type
            )
            db.add(parent_profile)
            db.flush()

            # Get student profile and link
            student_profile = db.query(StudentProfile).filter(
                StudentProfile.user_id == invitation.student_user_id
            ).first()

            if student_profile:
                if not student_profile.parent_id:
                    student_profile.parent_id = []
                if new_user.id not in student_profile.parent_id:
                    student_profile.parent_id = student_profile.parent_id + [new_user.id]

            # Link student to parent
            if not parent_profile.children_ids:
                parent_profile.children_ids = []
            if invitation.student_user_id not in parent_profile.children_ids:
                parent_profile.children_ids = parent_profile.children_ids + [invitation.student_user_id]
                parent_profile.total_children = len(parent_profile.children_ids)

            # Update invitation
            db.execute(
                text("""
                UPDATE parent_invitations
                SET parent_user_id = :parent_id,
                    status = 'accepted',
                    responded_at = :now
                WHERE id = :invitation_id
                """),
                {
                    "parent_id": new_user.id,
                    "invitation_id": invitation.id,
                    "now": datetime.utcnow()
                }
            )

            db.commit()

            # Use new user for login flow
            user = new_user

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Get role-specific IDs for all roles the user has
    role_ids = get_role_ids_from_user(user, db)

    # Create tokens with role-specific IDs
    token_data = {
        "sub": user.id,
        "role": user.active_role,
        "role_ids": role_ids
    }
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    # Check if this exact refresh token already exists (can happen with rapid login attempts)
    existing_token = db.query(RefreshToken).filter(
        RefreshToken.token == refresh_token,
        RefreshToken.user_id == user.id
    ).first()

    if not existing_token:
        # Store new refresh token only if it doesn't exist
        refresh_token_obj = RefreshToken(
            token=refresh_token,
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        )
        db.add(refresh_token_obj)
        db.commit()

    # Get profile picture from role-specific table
    profile_picture = get_role_specific_profile_picture(user, db)

    # Get username from role-specific table
    username = get_role_specific_username(user, db)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            id=user.id,
            first_name=user.first_name,
            father_name=user.father_name,
            grandfather_name=user.grandfather_name,
            username=username,
            email=user.email,
            phone=user.phone,
            roles=user.roles,
            active_role=user.active_role,
            profile_picture=profile_picture,
            created_at=user.created_at,
            is_active=user.is_active,
            email_verified=user.email_verified,
            role_ids=role_ids  # NEW: Include role-specific profile IDs
        )
    )

@router.post("/api/refresh", response_model=TokenResponse)
def refresh_token_endpoint(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token"""
    try:
        # Decode refresh token
        payload = jwt.decode(refresh_data.refresh_token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")

        if user_id_str is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        # Convert string to int (PyJWT requires string subject)
        user_id = int(user_id_str)

        # Check if refresh token exists and is not revoked
        token_obj = db.query(RefreshToken).filter(
            RefreshToken.token == refresh_data.refresh_token,
            RefreshToken.is_revoked == False,
            RefreshToken.expires_at > datetime.utcnow()
        ).first()

        if not token_obj:
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get role-specific IDs for all roles the user has
        role_ids = get_role_ids_from_user(user, db)

        # Create new tokens with role-specific IDs
        token_data = {
            "sub": user.id,
            "role": user.active_role,
            "role_ids": role_ids
        }
        access_token = create_access_token(data=token_data)
        new_refresh_token = create_refresh_token(data=token_data)

        # Revoke old refresh token
        token_obj.is_revoked = True

        # Store new refresh token
        new_refresh_token_obj = RefreshToken(
            token=new_refresh_token,
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        )
        db.add(new_refresh_token_obj)
        db.commit()

        # Get profile picture from role-specific table
        profile_picture = get_role_specific_profile_picture(user, db)
        # Get username from role-specific table
        username = get_role_specific_username(user, db)

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            user=UserResponse(
                id=user.id,
                first_name=user.first_name,
                father_name=user.father_name,
                grandfather_name=user.grandfather_name,
                username=username,
                email=user.email,
                phone=user.phone,
                roles=user.roles,
                active_role=user.active_role,
                profile_picture=profile_picture,
                created_at=user.created_at,
                is_active=user.is_active,
                email_verified=user.email_verified,
                role_ids=role_ids  # FIXED: Include role-specific profile IDs
            )
        )

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@router.get("/api/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user information"""
    # Get profile picture from role-specific table
    profile_picture = get_role_specific_profile_picture(current_user, db)
    # Get username from role-specific table (no longer stored in users table)
    username = get_role_specific_username(current_user, db)

    # Get role-specific IDs for all roles the user has
    role_ids = get_role_ids_from_user(current_user, db)

    return UserResponse(
        id=current_user.id,
        first_name=current_user.first_name,
        father_name=current_user.father_name,
        grandfather_name=current_user.grandfather_name,
        username=username,
        email=current_user.email,
        phone=current_user.phone,
        roles=current_user.roles,
        active_role=current_user.active_role,
        profile_picture=profile_picture,
        created_at=current_user.created_at,
        is_active=current_user.is_active,
        email_verified=current_user.email_verified,
        role_ids=role_ids  # FIXED: Include role-specific profile IDs
    )

@router.get("/api/verify-token")
def verify_token(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Verify if token is valid and return user data"""
    # Get profile picture from role-specific table
    profile_picture = get_role_specific_profile_picture(current_user, db)
    # Get username from role-specific table (no longer stored in users table)
    username = get_role_specific_username(current_user, db)

    # Get role-specific IDs for all roles the user has
    role_ids = get_role_ids_from_user(current_user, db)

    return {
        "valid": True,
        "user": {
            "id": current_user.id,
            "first_name": current_user.first_name,
            "father_name": current_user.father_name,
            "grandfather_name": current_user.grandfather_name,
            "username": username,
            "email": current_user.email,
            "phone": current_user.phone,
            "roles": current_user.roles,
            "active_role": current_user.active_role,
            "role": current_user.active_role,  # For backward compatibility
            "profile_picture": profile_picture,
            "is_active": current_user.is_active,
            "email_verified": current_user.email_verified,
            "role_ids": role_ids  # FIXED: Include role-specific profile IDs
        }
    }

@router.post("/api/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logout user - revoke all refresh tokens"""
    db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id,
        RefreshToken.is_revoked == False
    ).update({"is_revoked": True})
    db.commit()

    return {"message": "Successfully logged out"}

@router.post("/api/verify-password")
def verify_user_password(
    password_data: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify user's password without logging them in.
    Used for sensitive operations like adding roles.
    """
    password = password_data.get("password")

    if not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required"
        )

    if not verify_password(password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )

    return {"valid": True, "message": "Password verified successfully"}

@router.post("/api/change-password")
def change_user_password(
    password_data: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change the current user's password.
    Requires current password verification before setting new password.
    """
    current_password = password_data.get("current_password")
    new_password = password_data.get("new_password")

    if not current_password or not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both current_password and new_password are required"
        )

    # Verify current password
    if not verify_password(current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )

    # Validate new password strength
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long"
        )

    # Hash and update password
    new_password_hash = hash_password(new_password)
    current_user.password_hash = new_password_hash
    db.commit()

    # Revoke all refresh tokens for security
    db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id,
        RefreshToken.is_revoked == False
    ).update({"is_revoked": True})
    db.commit()

    return {"message": "Password changed successfully"}

@router.put("/api/user/profile")
def update_user_profile(
    profile_data: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user's basic profile information from users table.
    Fields: first_name, father_name, grandfather_name, gender
    """
    allowed_fields = ['first_name', 'father_name', 'grandfather_name', 'gender']

    for field, value in profile_data.items():
        if field in allowed_fields and value is not None:
            setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)

    return {
        "message": "Profile updated successfully",
        "user": {
            "id": current_user.id,
            "first_name": current_user.first_name,
            "father_name": current_user.father_name,
            "grandfather_name": current_user.grandfather_name,
            "gender": current_user.gender,
            "email": current_user.email,
            "phone": current_user.phone
        }
    }

# ============================================
# TUTOR ENDPOINTS
# ============================================

@router.get("/api/tutors")
def get_tutors(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    gender: Optional[str] = Query(None),
    courseType: Optional[str] = Query(None),
    gradeLevel: Optional[str] = Query(None),
    sessionFormat: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    min_rating: Optional[float] = Query(None),
    max_rating: Optional[float] = Query(None),
    sort_by: Optional[str] = Query("smart"),  # Default to smart ranking
    search_history_ids: Optional[str] = Query(None),  # Comma-separated tutor IDs from search history
    db: Session = Depends(get_db)
):
    """
    Get tutors with comprehensive filtering and smart ranking

    Smart Ranking Priority:
    1. New tutors + Basic + Search History Match → Highest priority
    2. Basic + Search History Match → Very High priority
    3. New tutors + Search History Match → Higher priority
    4. Search History Match → High priority
    5. Basic tutors → Medium-High priority
    6. New tutors → Medium priority
    7. Regular tutors → Standard sorting (by rating/price/etc)

    With 80% chance of shuffling on initial page load for variety
    """
    query = db.query(TutorProfile).join(User).filter(
        TutorProfile.is_active == True,
        User.is_active == True
    )

    # Apply filters
    if search:
        search_lower = search.lower()
        search_filter = or_(
            func.lower(User.first_name).contains(search_lower),
            func.lower(User.father_name).contains(search_lower),
            func.lower(TutorProfile.location).contains(search_lower),
            # Search in JSON arrays - languages
            cast(TutorProfile.languages, String).ilike(f'%{search_lower}%')
        )
        query = query.filter(search_filter)

    if gender:
        genders = [g.strip() for g in gender.split(',')]
        query = query.filter(User.gender.in_(genders))

    # courseType, gradeLevel, sessionFormat filters removed - columns no longer exist

    # Price filter disabled - price column doesn't exist in tutor_profiles
    # TODO: Implement price filter using packages/sessions table
    # if min_price is not None:
    #     query = query.filter(TutorProfile.price >= min_price)
    # if max_price is not None:
    #     query = query.filter(TutorProfile.price <= max_price)

    # Rating filter disabled - rating column doesn't exist in tutor_profiles
    # TODO: Implement rating filter using subquery to tutor_reviews table
    # if min_rating is not None:
    #     query = query.filter(TutorProfile.rating >= min_rating)
    # if max_rating is not None:
    #     query = query.filter(TutorProfile.rating <= max_rating)

    # Get total count for pagination (before sorting/limiting)
    total = query.count()

    # Get all tutors for smart ranking (we'll do pagination after sorting)
    all_tutors = query.all()

    # Parse search history IDs
    search_history_tutor_ids = []
    if search_history_ids:
        try:
            search_history_tutor_ids = [int(id.strip()) for id in search_history_ids.split(',') if id.strip()]
        except:
            search_history_tutor_ids = []

    # Apply smart ranking or traditional sorting
    if sort_by == "smart":
        # SMART RANKING ALGORITHM
        import random
        from datetime import datetime, timedelta

        def calculate_tutor_score(tutor):
            """
            Calculate ranking score for each tutor based on multiple factors
            Higher score = Higher priority in results
            """
            score = 0

            # Base rating score (0-50 points based on 0-5 rating)
            # Rating column doesn't exist - skip rating score
            # score += (tutor.rating or 0) * 10

            # Check if tutor is in search history (50 points)
            in_search_history = tutor.id in search_history_tutor_ids
            if in_search_history:
                score += 50

            # Check if tutor is basic (100 points)
            is_basic = tutor.is_basic or False
            if is_basic:
                score += 100

            # Check if tutor is new (created within last 30 days) (30 points)
            is_new = False
            if tutor.created_at:
                days_old = (datetime.utcnow() - tutor.created_at).days
                if days_old <= 30:
                    is_new = True
                    score += 30
                    # Bonus for very new tutors (created within 7 days)
                    if days_old <= 7:
                        score += 20

            # COMBO BONUSES (exponential benefits for matching multiple criteria)
            if is_new and is_basic and in_search_history:
                score += 150  # Triple combo bonus
            elif is_basic and in_search_history:
                score += 80   # Basic + History combo
            elif is_new and in_search_history:
                score += 60   # New + History combo
            elif is_new and is_basic:
                score += 50   # New + Basic combo

            # Experience bonus removed - column no longer exists

            # Student count bonus (0-15 points) - field doesn't exist yet, skip for now
            # TODO: Add total_students field or calculate from bookings table
            # total_students = getattr(tutor, 'total_students', 0) or 0
            # score += min(total_students / 10, 15)

            # Verification bonus (25 points)
            if tutor.is_verified:
                score += 25

            return score

        # Calculate scores for all tutors
        tutors_with_scores = [(tutor, calculate_tutor_score(tutor)) for tutor in all_tutors]

        # Sort by score (descending)
        tutors_with_scores.sort(key=lambda x: x[1], reverse=True)

        # Log top 5 tutors with scores for debugging
        print(f"\n📊 Smart Ranking Results (Total: {len(tutors_with_scores)} tutors)")
        print("   Top 5 tutors:")
        for i, (tutor, score) in enumerate(tutors_with_scores[:5], 1):
            basic_label = "BASIC" if (tutor.is_basic or False) else "REG"
            new_label = "NEW" if tutor.created_at and (datetime.utcnow() - tutor.created_at).days <= 30 else ""
            history_label = "HIST" if tutor.id in search_history_tutor_ids else ""
            labels = f"[{basic_label}] {new_label} {history_label}".strip()
            # Note: rating field doesn't exist in tutor_profiles table yet
            print(f"   {i}. {labels} Score: {score:.0f} - {tutor.user.first_name} {tutor.user.father_name}")

        # Apply shuffling with 80% probability on first page
        # This provides variety while maintaining general quality ranking
        shuffle_roll = random.random()
        should_shuffle = page == 1 and shuffle_roll < 0.8

        if should_shuffle:
            print(f"🔀 SHUFFLING (roll: {shuffle_roll:.2f} < 0.80)")

            # Shuffle within tier groups to provide variety
            # Tier 1: Top 20% (basic + search history matches)
            # Tier 2: Next 30% (basic or search history)
            # Tier 3: Remaining 50% (regular tutors)

            tier1_end = max(1, int(len(tutors_with_scores) * 0.2))
            tier2_end = max(tier1_end + 1, int(len(tutors_with_scores) * 0.5))

            tier1 = tutors_with_scores[:tier1_end]
            tier2 = tutors_with_scores[tier1_end:tier2_end]
            tier3 = tutors_with_scores[tier2_end:]

            print(f"   Tier 1: {len(tier1)} tutors (top 20%)")
            print(f"   Tier 2: {len(tier2)} tutors (next 30%)")
            print(f"   Tier 3: {len(tier3)} tutors (bottom 50%)")

            # Shuffle within each tier
            random.shuffle(tier1)
            random.shuffle(tier2)
            random.shuffle(tier3)

            # Recombine
            tutors_with_scores = tier1 + tier2 + tier3
            print(f"   ✓ Shuffled within tiers")
        else:
            if page == 1:
                print(f"⏭️  NO SHUFFLE (roll: {shuffle_roll:.2f} >= 0.80)")
            else:
                print(f"📄 Page {page} - no shuffle (only page 1 shuffles)")

        # Extract just the tutors (without scores)
        tutors = [tutor for tutor, score in tutors_with_scores]

    else:
        # Traditional sorting for explicit sort requests
        tutors = all_tutors
        if sort_by == "rating" or sort_by == "rating_desc":
            # Rating column doesn't exist - sort by created_at instead
            tutors.sort(key=lambda t: t.created_at or datetime.min, reverse=True)
        elif sort_by == "rating_asc":
            # Rating column doesn't exist - sort by created_at instead
            tutors.sort(key=lambda t: t.created_at or datetime.min)
        elif sort_by == "price" or sort_by == "price_asc":
            # Price and experience columns don't exist - sort by created_at
            tutors.sort(key=lambda t: t.created_at or datetime.min)
        elif sort_by == "price_desc":
            # Price and experience columns don't exist - sort by created_at
            tutors.sort(key=lambda t: t.created_at or datetime.min, reverse=True)
        elif sort_by == "experience":
            # Experience column doesn't exist - sort by created_at
            tutors.sort(key=lambda t: t.created_at or datetime.min, reverse=True)
        elif sort_by == "experience_asc":
            # Experience column doesn't exist - sort by created_at
            tutors.sort(key=lambda t: t.created_at or datetime.min)
        elif sort_by == "newest":
            tutors.sort(key=lambda t: t.created_at or datetime.min, reverse=True)
        elif sort_by == "oldest":
            tutors.sort(key=lambda t: t.created_at or datetime.min)

    # Apply pagination AFTER sorting
    offset = (page - 1) * limit
    tutors = tutors[offset:offset + limit]

    # Format response
    tutor_list = []
    for tutor in tutors:
        tutor_data = {
            "id": tutor.id,
            "user_id": tutor.user_id,
            "first_name": tutor.user.first_name,
            "father_name": tutor.user.father_name,
            "email": tutor.user.email,
            "profile_picture": tutor.user.profile_picture,
            "bio": tutor.bio,
            "quote": tutor.quote,
            "gender": tutor.user.gender,
            "courses": [],
            "grades": [],
            "course_type": None,
            "location": tutor.location,
            "teaches_at": None,
            "sessionFormat": None,
            "languages": tutor.languages or [],
            "experience": None,
            # Removed fields that don't exist in DB:
            # "education_level", "certifications", "achievements", "experiences",
            # "price", "currency", "availability", "rating", "rating_count",
            # "total_students", "total_sessions"
            "is_verified": tutor.is_verified,
            "is_active": tutor.is_active,
            "is_basic": getattr(tutor, 'is_basic', False),
            "cover_image": tutor.cover_image,
            "intro_video_url": getattr(tutor, 'intro_video_url', None),
        }
        tutor_list.append(tutor_data)

    return {
        "tutors": tutor_list,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

# ============================================
# COURSE TYPES ENDPOINT
# ============================================

@router.get("/api/course-types")
def get_course_types(db: Session = Depends(get_db)):
    """Get default course types (column removed from database)"""
    # course_type column was removed from tutor_profiles table
    return {
        "course_types": ["Academic", "Professional", "Both Academic & Professional"]
    }

# ============================================
# TUTOR SPECIFIC PROFILE ENDPOINT
# Note: Must come BEFORE /api/tutor/{tutor_id} to avoid route conflicts
# ============================================

@router.get("/api/tutor/profile")
def get_current_tutor_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current logged-in tutor's complete profile"""
    if "tutor" not in current_user.roles:
        raise HTTPException(
            status_code=403,
            detail="User does not have tutor role. Please register as a tutor first."
        )

    tutor_profile = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor_profile:
        # Auto-create tutor profile with defaults
        tutor_profile = TutorProfile(
            user_id=current_user.id,
            hero_titles=["Excellence in Education, Delivered with Passion"],
            hero_subtitle="Empowering students through personalized learning and expert guidance",
            bio="",
            courses=[],
            grades=[],
            languages=[],
            availability={}
        )
        db.add(tutor_profile)
        db.commit()
        db.refresh(tutor_profile)

    # Get average ratings from reviews (4-Factor Rating System)
    # Calculate overall rating and count dynamically from tutor_reviews table
    avg_metrics = db.query(
        func.count(TutorReview.id).label('review_count'),
        func.avg(TutorReview.subject_understanding_rating).label('subject_understanding'),
        func.avg(TutorReview.communication_rating).label('communication'),
        func.avg(TutorReview.discipline_rating).label('discipline'),
        func.avg(TutorReview.punctuality_rating).label('punctuality')
    ).filter(TutorReview.tutor_id == tutor_profile.id).first()

    # Extract dynamic rating values (calculated from reviews, not stored in tutor_profiles)
    # Calculate overall rating as the average of the 4 factor ratings
    if avg_metrics and avg_metrics.review_count > 0:
        factor_ratings = [
            avg_metrics.subject_understanding or 0,
            avg_metrics.communication or 0,
            avg_metrics.discipline or 0,
            avg_metrics.punctuality or 0
        ]
        overall_rating = round(sum(factor_ratings) / 4, 1)
    else:
        overall_rating = 0.0
    rating_count = avg_metrics.review_count if avg_metrics else 0

    # Count pending session requests for this tutor from requested_sessions table
    # (Accepted requests are moved to enrolled_students and deleted from requested_sessions)
    total_requests = db.execute(
        text("SELECT COUNT(*) FROM requested_sessions WHERE tutor_id = :tutor_id AND status = 'pending'"),
        {"tutor_id": tutor_profile.id}
    ).scalar() or 0

    # Count current students from enrolled_students table (students enrolled with this tutor)
    current_students = db.execute(
        text("SELECT COUNT(DISTINCT student_id) FROM enrolled_students WHERE tutor_id = :tutor_id"),
        {"tutor_id": tutor_profile.id}
    ).scalar() or 0

    # Generate monthly earnings history (last 12 months)
    from datetime import datetime, timedelta
    import calendar

    monthly_earnings_history = []
    current_date = datetime.now()

    for i in range(11, -1, -1):  # Last 12 months
        month_date = current_date - timedelta(days=30 * i)
        month_name = calendar.month_abbr[month_date.month]

        # For now, generate sample data based on a base value with some variance
        # In production, this should query actual earnings from a transactions table
        base_earnings = 10000  # Default base earnings
        variance = (i - 6) * 500  # Trend upward over time
        random_factor = (hash(f"{current_user.id}{i}") % 3000) - 1500  # Deterministic "random"
        earnings = max(0, int(base_earnings + variance + random_factor))

        monthly_earnings_history.append({
            "month": month_name,
            "earnings": earnings
        })

    return {
        "id": tutor_profile.id,
        "user_id": tutor_profile.user_id,
        "name": " ".join(filter(None, [current_user.first_name, current_user.father_name, current_user.grandfather_name])),
        # Individual name fields for edit modal population
        "first_name": current_user.first_name,
        "father_name": current_user.father_name,
        "grandfather_name": current_user.grandfather_name,
        "username": tutor_profile.username,  # Read from tutor_profiles table
        # Contact info
        "email": current_user.email,
        "phone": current_user.phone,
        # Profile images
        "profile_picture": tutor_profile.profile_picture,
        "cover_photo": tutor_profile.cover_image,
        "cover_image": tutor_profile.cover_image,
        # Hero section
        "hero_titles": tutor_profile.hero_titles or ["Excellence in Education, Delivered with Passion"],
        "hero_subtitle": tutor_profile.hero_subtitle,
        # Bio and personal
        "about": tutor_profile.bio,
        "bio": tutor_profile.bio,
        "quote": tutor_profile.quote,
        "gender": current_user.gender,
        # Teaching info (display-only fields - not editable by tutor)
        "specialization": None,
        "subjects": [],
        "courses": [],
        "grade_levels": [],
        "grades": [],
        "grade_level": "",
        "languages": tutor_profile.languages,
        "location": tutor_profile.location,
        "teaches_at": None,
        "years_experience": None,
        "experience": None,
        "session_formats": None,
        "sessionFormat": None,
        "courses_created": 0,
        "rating": overall_rating,  # Dynamic from tutor_reviews table
        "rating_count": rating_count,  # Dynamic from tutor_reviews table
        "rating_breakdown": {
            "subject_understanding": round(avg_metrics.subject_understanding, 1) if avg_metrics and avg_metrics.subject_understanding else 0.0,
            "communication": round(avg_metrics.communication, 1) if avg_metrics and avg_metrics.communication else 0.0,
            "discipline": round(avg_metrics.discipline, 1) if avg_metrics and avg_metrics.discipline else 0.0,
            "punctuality": round(avg_metrics.punctuality, 1) if avg_metrics and avg_metrics.punctuality else 0.0
        },
        "rating_metrics": {
            "subject_understanding": round(avg_metrics.subject_understanding, 1) if avg_metrics and avg_metrics.subject_understanding else 0.0,
            "communication": round(avg_metrics.communication, 1) if avg_metrics and avg_metrics.communication else 0.0,
            "discipline": round(avg_metrics.discipline, 1) if avg_metrics and avg_metrics.discipline else 0.0,
            "punctuality": round(avg_metrics.punctuality, 1) if avg_metrics and avg_metrics.punctuality else 0.0
        },
        "expertise_badge": tutor_profile.expertise_badge or "Tutor",  # REQUIRED: Expertise badge from tutor_profiles
        "verification_status": tutor_profile.verification_status or "pending",  # REQUIRED: Verification status from tutor_profiles
        "is_verified": tutor_profile.is_verified,
        "is_active": tutor_profile.is_active,
        "is_basic": tutor_profile.is_basic,
        "social_links": tutor_profile.social_links,
        # Dashboard stats - REQUIRED: current_students from enrolled_students, total_requests from requested_sessions
        "dashboard_stats": {
            "current_students": current_students,  # From enrolled_students table
            "total_requests": total_requests,  # From requested_sessions table (pending only)
            "success_rate": getattr(tutor_profile, 'success_rate', None) or 85,  # Default success rate
            "response_time_hours": getattr(tutor_profile, 'response_time_hours', None) or 24,  # Default response time
            "monthly_earnings_history": monthly_earnings_history
        },
        "created_at": tutor_profile.created_at,
        "updated_at": tutor_profile.updated_at
    }

@router.get("/api/tutor/{tutor_id}")
def get_tutor_public_profile(tutor_id: int, db: Session = Depends(get_db)):
    """Get public tutor profile"""
    tutor = db.query(TutorProfile).options(joinedload(TutorProfile.user)).filter(
        TutorProfile.id == tutor_id,
        TutorProfile.is_active == True
    ).first()

    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    return {
        "id": tutor.id,
        "user_id": tutor.user_id,
        "first_name": tutor.user.first_name,
        "father_name": tutor.user.father_name,
        "grandfather_name": tutor.user.grandfather_name,
        "username": tutor.user.username,
        "email": tutor.user.email,
        "phone": tutor.user.phone,
        "profile_picture": tutor.user.profile_picture,
        "bio": tutor.bio,
        "quote": tutor.quote,
        "gender": tutor.gender if hasattr(tutor, 'gender') else tutor.user.gender,
        "courses": [],
        "grades": [],
        "location": tutor.location,
        "teaches_at": None,
        "sessionFormat": None,
        "course_type": None,
        "languages": tutor.languages if hasattr(tutor, 'languages') else None,
        "experience": None,
        "is_verified": tutor.is_verified,
        "cover_image": tutor.cover_image,
    }

# ============================================
# TUTOR PROFILE UPDATE ENDPOINT
# ============================================

@router.put("/api/tutor/profile")
def update_tutor_profile(
    profile_data: dict,  # Changed from TutorProfileUpdateExtended to accept user fields too
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update tutor profile (supports extended fields including hero_titles and hero_subtitle, plus user fields)"""
    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized as tutor")

    tutor_profile = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor_profile:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    # Log incoming data for debugging
    print(f"📥 Received profile_data: {profile_data}")
    print(f"🔍 languages in data: {profile_data.get('languages')}")
    print(f"🔍 gender in data: {profile_data.get('gender')}")

    # Separate user fields from tutor profile fields
    # username removed - now saved to tutor_profiles.username instead of users.username
    user_fields = {'first_name', 'father_name', 'grandfather_name', 'gender'}

    # Update user fields if provided
    for field in user_fields:
        if field in profile_data and profile_data[field] is not None:
            value = profile_data[field]
            if isinstance(value, str):
                value = value.strip()
                if value:  # Only update if non-empty
                    setattr(current_user, field, value)

    # Update tutor profile fields - only update non-None, non-empty values to prevent overwriting with blanks
    for field, value in profile_data.items():
        # Skip user fields (already handled above)
        if field in user_fields:
            continue
        # Skip None values and empty strings for text fields
        if value is None:
            continue
        if isinstance(value, str) and value.strip() == "" and field not in ['bio', 'quote']:
            continue

        # Map frontend field names to database column names
        db_field = field
        if field == 'grade_level':
            # Convert single grade_level string to grades array for database
            db_field = 'grades'
            if isinstance(value, str) and value.strip():
                value = [value.strip()]  # Store as array in database
                print(f"✅ Mapped grade_level '{profile_data.get('grade_level')}' → grades {value}")

        # Only set if field exists in TutorProfile model
        if hasattr(tutor_profile, db_field):
            print(f"💾 Setting {db_field} = {value}")
            setattr(tutor_profile, db_field, value)
        else:
            print(f"⚠️ Field {db_field} does not exist in TutorProfile model")

    # Log final state before commit
    print(f"📊 Before commit - languages: {tutor_profile.languages}, gender: {current_user.gender}")

    tutor_profile.profile_completion = calculate_tutor_profile_completion(tutor_profile)
    tutor_profile.profile_complete = tutor_profile.profile_completion >= 80

    db.commit()

    print(f"✅ Committed to database - languages: {tutor_profile.languages}")

    return {"message": "Profile updated successfully", "completion": tutor_profile.profile_completion}

# ============================================
# BACKBLAZE FILE UPLOAD ENDPOINTS
# ============================================

@router.post("/api/upload/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload profile picture to Backblaze B2"""
    try:
        # Validate file size (5MB max)
        contents = await file.read()
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")

        # Get role-specific profile first to use profile_id
        profile_id = None
        profile = None

        if current_user.active_role == "tutor":
            profile = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
            if not profile:
                raise HTTPException(status_code=404, detail="Tutor profile not found")
            profile_id = profile.id
        elif current_user.active_role == "student":
            profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
            if not profile:
                raise HTTPException(status_code=404, detail="Student profile not found")
            profile_id = profile.id
        elif current_user.active_role == "advertiser":
            from models import AdvertiserProfile
            profile = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == current_user.id).first()
            if not profile:
                raise HTTPException(status_code=404, detail="Advertiser profile not found")
            profile_id = profile.id
        elif current_user.active_role == "parent":
            from models import ParentProfile
            profile = db.query(ParentProfile).filter(ParentProfile.user_id == current_user.id).first()
            if not profile:
                raise HTTPException(status_code=404, detail="Parent profile not found")
            profile_id = profile.id
        else:
            raise HTTPException(status_code=400, detail="Invalid role")

        b2_service = get_backblaze_service()

        # Upload using profile_id instead of user_id: images/profile/profile_{id}/
        result = b2_service.upload_file(
            file_data=contents,
            file_name=file.filename,
            file_type='profile',
            user_id=f"profile_{profile_id}"  # Using profile_id with 'profile_' prefix
        )

        if not result:
            raise HTTPException(status_code=500, detail="Upload failed")

        # Update profile with URL
        profile.profile_picture = result['url']

        # Keep users.profile_picture for backward compatibility (deprecated)
        current_user.profile_picture = result['url']

        db.commit()

        return {
            "success": True,
            "message": "Profile picture uploaded successfully",
            "url": result['url'],
            "details": result
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/upload/cover-image")
async def upload_cover_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload cover image for profile (tutor or student)"""
    try:

        # Validate file size (10MB max)
        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

        # Get role-specific profile first to use profile_id
        profile_id = None
        profile = None

        if current_user.active_role == "tutor":
            profile = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
            if not profile:
                raise HTTPException(status_code=404, detail="Tutor profile not found")
            profile_id = profile.id
        elif current_user.active_role == "student":
            profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
            if not profile:
                raise HTTPException(status_code=404, detail="Student profile not found")
            profile_id = profile.id
        elif current_user.active_role == "advertiser":
            from models import AdvertiserProfile
            profile = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == current_user.id).first()
            if not profile:
                raise HTTPException(status_code=404, detail="Advertiser profile not found")
            profile_id = profile.id
        elif current_user.active_role == "parent":
            from models import ParentProfile
            profile = db.query(ParentProfile).filter(ParentProfile.user_id == current_user.id).first()
            if not profile:
                raise HTTPException(status_code=404, detail="Parent profile not found")
            profile_id = profile.id
        else:
            raise HTTPException(status_code=400, detail="Invalid role")

        b2_service = get_backblaze_service()

        # Upload using profile_id instead of user_id: images/cover/profile_{id}/
        result = b2_service.upload_file(
            file_data=contents,
            file_name=file.filename,
            file_type='cover',
            user_id=f"profile_{profile_id}"  # Using profile_id with 'profile_' prefix
        )

        if not result:
            raise HTTPException(status_code=500, detail="Upload failed")

        # Update profile with cover image URL
        profile.cover_image = result['url']

        db.commit()

        return {
            "success": True,
            "message": "Cover image uploaded successfully",
            "url": result['url'],
            "details": result
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/upload/story")
async def upload_story(
    file: UploadFile = File(...),
    caption: str = Form(default=""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload story (image or video) - all roles can upload stories"""
    try:
        # Validate file size (50MB max for stories)
        contents = await file.read()
        if len(contents) > 50 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")

        # Determine file type (image or video)
        file_ext = file.filename.split('.')[-1].lower()
        is_video = file_ext in ['mp4', 'webm', 'avi', 'mov', 'wmv', 'flv', 'mkv']
        is_image = file_ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']

        if not is_video and not is_image:
            raise HTTPException(status_code=400, detail="Only images and videos are allowed for stories")

        # Get role-specific profile_id
        profile_id = None
        if current_user.active_role == "tutor":
            profile = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
            if not profile:
                raise HTTPException(status_code=404, detail="Tutor profile not found")
            profile_id = profile.id
        elif current_user.active_role == "student":
            profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
            if not profile:
                raise HTTPException(status_code=404, detail="Student profile not found")
            profile_id = profile.id
        elif current_user.active_role == "parent":
            profile = db.query(ParentProfile).filter(ParentProfile.user_id == current_user.id).first()
            if not profile:
                raise HTTPException(status_code=404, detail="Parent profile not found")
            profile_id = profile.id
        elif current_user.active_role == "advertiser":
            profile = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == current_user.id).first()
            if not profile:
                raise HTTPException(status_code=404, detail="Advertiser profile not found")
            profile_id = profile.id
        else:
            raise HTTPException(status_code=400, detail="Invalid role")

        b2_service = get_backblaze_service()

        # Upload using story type - videos go to videos/stories/, images go to images/stories/
        # Using profile_id for organization (one user can have multiple roles with separate stories)
        result = b2_service.upload_file(
            file_data=contents,
            file_name=file.filename,
            file_type='story_video' if is_video else 'story_image',
            user_id=f"profile_{profile_id}"  # Using profile_id with 'profile_' prefix
        )

        if not result:
            raise HTTPException(status_code=500, detail="Upload failed")

        # In a production app, you would save story metadata to a 'stories' table
        # For now, we just return the upload result
        # TODO: Create a stories table with fields:
        # - id, user_id, media_url, media_type (image/video), caption, created_at, expires_at (24h)

        return {
            "success": True,
            "message": "Story uploaded successfully",
            "url": result['url'],
            "media_type": "video" if is_video else "image",
            "caption": caption,
            "details": result
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/upload/video")
async def upload_video(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    subject: Optional[str] = Form(None),
    grade_level: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload video to Backblaze B2 and create video reel entry"""
    try:
        if "tutor" not in current_user.roles:
            raise HTTPException(status_code=403, detail="Only tutors can upload videos")
        
        b2_service = get_backblaze_service()
        
        tutor_profile = db.query(TutorProfile).filter(
            TutorProfile.user_id == current_user.id
        ).first()
        
        if not tutor_profile:
            raise HTTPException(status_code=404, detail="Tutor profile not found")
        
        result = await b2_service.upload_video(
            file=file,
            folder=f"videos/tutor-{current_user.id}",
            max_size_mb=500
        )
        
        video_reel = VideoReel(
            tutor_id=tutor_profile.id,
            title=title,
            description=description,
            video_url=result['public_url'],
            category=category,
            subject=subject,
            grade_level=grade_level,
            is_active=False
        )
        
        db.add(video_reel)
        db.commit()
        db.refresh(video_reel)
        
        return {
            "success": True,
            "message": "Video uploaded successfully and submitted for review",
            "video_id": video_reel.id,
            "url": result['public_url'],
            "status": "under_review",
            "details": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/upload/certification")
async def upload_certification(
    file: UploadFile = File(...),
    title: str = Form(...),
    issuing_organization: str = Form(...),
    issue_date: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload certification document to Backblaze"""
    try:
        if "tutor" not in current_user.roles:
            raise HTTPException(status_code=403, detail="Only tutors can upload certifications")
        
        b2_service = get_backblaze_service()
        
        result = await b2_service.upload_document(
            file=file,
            folder=f"certifications/tutor-{current_user.id}",
            max_size_mb=10
        )
        
        tutor = db.query(TutorProfile).filter(
            TutorProfile.user_id == current_user.id
        ).first()
        
        if not tutor:
            raise HTTPException(status_code=404, detail="Tutor profile not found")
        
        if not tutor.certifications:
            tutor.certifications = []
        
        cert_data = {
            "id": str(uuid.uuid4()),
            "title": title,
            "issuing_organization": issuing_organization,
            "issue_date": issue_date,
            "file_url": result['public_url'],
            "file_name": file.filename,
            "status": "pending_verification",
            "created_at": datetime.utcnow().isoformat()
        }
        
        tutor.certifications.append(cert_data)
        db.commit()
        
        return {
            "success": True,
            "message": "Certification uploaded successfully",
            "certification_id": cert_data["id"],
            "url": result['public_url'],
            "status": "pending_verification",
            "details": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/upload/experience")
async def upload_experience(
    file: Optional[UploadFile] = File(None),
    position: str = Form(...),
    organization: str = Form(...),
    start_date: str = Form(...),
    end_date: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload experience with optional supporting document"""
    try:
        if "tutor" not in current_user.roles:
            raise HTTPException(status_code=403, detail="Only tutors can add experiences")
        
        file_url = None
        if file:
            b2_service = get_backblaze_service()
            result = await b2_service.upload_document(
                file=file,
                folder=f"experiences/tutor-{current_user.id}",
                max_size_mb=10
            )
            file_url = result['public_url']
        
        tutor = db.query(TutorProfile).filter(
            TutorProfile.user_id == current_user.id
        ).first()
        
        if not tutor:
            raise HTTPException(status_code=404, detail="Tutor profile not found")
        
        if not hasattr(tutor, 'experiences') or tutor.experiences is None:
            tutor.experiences = []
        
        exp_data = {
            "id": str(uuid.uuid4()),
            "position": position,
            "organization": organization,
            "start_date": start_date,
            "end_date": end_date,
            "description": description,
            "file_url": file_url,
            "file_name": file.filename if file else None,
            "status": "pending_verification",
            "created_at": datetime.utcnow().isoformat()
        }
        
        tutor.experiences.append(exp_data)
        db.commit()
        
        return {
            "success": True,
            "message": "Experience added successfully",
            "experience_id": exp_data["id"],
            "url": file_url,
            "status": "pending_verification"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/upload/achievement")
async def upload_achievement(
    file: Optional[UploadFile] = File(None),
    title: str = Form(...),
    institution: str = Form(...),
    date_achieved: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload achievement with optional supporting document"""
    try:
        if "tutor" not in current_user.roles:
            raise HTTPException(status_code=403, detail="Only tutors can add achievements")
        
        file_url = None
        if file:
            b2_service = get_backblaze_service()
            result = await b2_service.upload_document(
                file=file,
                folder=f"achievements/tutor-{current_user.id}",
                max_size_mb=10
            )
            file_url = result['public_url']
        
        tutor = db.query(TutorProfile).filter(
            TutorProfile.user_id == current_user.id
        ).first()
        
        if not tutor:
            raise HTTPException(status_code=404, detail="Tutor profile not found")
        
        if not hasattr(tutor, 'achievements') or tutor.achievements is None:
            tutor.achievements = []
        
        ach_data = {
            "id": str(uuid.uuid4()),
            "title": title,
            "institution": institution,
            "date_achieved": date_achieved,
            "description": description,
            "file_url": file_url,
            "file_name": file.filename if file else None,
            "status": "pending_verification",
            "created_at": datetime.utcnow().isoformat()
        }
        
        tutor.achievements.append(ach_data)
        db.commit()
        
        return {
            "success": True,
            "message": "Achievement added successfully",
            "achievement_id": ach_data["id"],
            "url": file_url,
            "status": "pending_verification"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/upload/blog-image")
async def upload_blog_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload image for blog post"""
    try:
        b2_service = get_backblaze_service()
        
        result = await b2_service.upload_image(
            file=file,
            folder=f"blog-images/user-{current_user.id}",
            max_size_mb=5
        )
        
        return {
            "success": True,
            "message": "Blog image uploaded successfully",
            "url": result['public_url'],
            "details": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/upload/multiple-images")
async def upload_multiple_images(
    files: List[UploadFile] = File(...),
    folder: str = Form("general"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload multiple images at once"""
    try:
        b2_service = get_backblaze_service()
        uploaded_files = []
        
        for file in files:
            result = await b2_service.upload_image(
                file=file,
                folder=f"{folder}/user-{current_user.id}",
                max_size_mb=5
            )
            uploaded_files.append({
                "original_name": file.filename,
                "url": result['public_url'],
                "size": result['size']
            })
        
        return {
            "success": True,
            "message": f"{len(uploaded_files)} images uploaded successfully",
            "files": uploaded_files
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/upload/delete-file")
async def delete_file_from_b2(
    file_url: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete file from Backblaze B2"""
    try:
        b2_service = get_backblaze_service()

        file_name = file_url.split('/')[-1]

        if f"user-{current_user.id}" not in file_url and f"tutor-{current_user.id}" not in file_url:
            raise HTTPException(status_code=403, detail="Not authorized to delete this file")

        success = b2_service.delete_file(file_name)

        if success:
            return {
                "success": True,
                "message": "File deleted successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to delete file")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# SYSTEM MEDIA UPLOAD ENDPOINTS
# ============================================

@router.post("/api/upload/system-image")
async def upload_system_image(
    file: UploadFile = File(...),
    image_type: str = Form(...),  # 'profile', 'cover', 'logo', 'favicon', 'system'
    target: str = Form(...),  # Target entity (tutor, student, campaign, etc.)
    title: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload system image to Backblaze B2 with system user_id"""
    try:
        # Only admins can upload system images
        if "admin" not in current_user.roles and "super_admin" not in current_user.roles:
            raise HTTPException(status_code=403, detail="Only admins can upload system images")

        # Validate file size based on image type
        contents = await file.read()
        max_size = 10 * 1024 * 1024  # 10MB default
        if image_type == 'favicon':
            max_size = 1 * 1024 * 1024  # 1MB for favicon
        elif image_type == 'logo':
            max_size = 5 * 1024 * 1024  # 5MB for logo

        if len(contents) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds {max_size / (1024*1024)}MB limit"
            )

        # Validate image type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")

        b2_service = get_backblaze_service()

        # Get admin profile ID for system file organization
        admin_profile = None
        if "admin" in current_user.roles:
            admin_profile = db.query(AdminProfile).filter(AdminProfile.user_id == current_user.id).first()

        # Use admin profile_id or fallback to 'admin_system' for platform-wide assets
        admin_identifier = f"profile_{admin_profile.id}" if admin_profile else "admin_system"

        # Upload with admin profile_id for system-wide files
        result = b2_service.upload_file(
            file_data=contents,
            file_name=file.filename,
            file_type=image_type,
            user_id=admin_identifier  # Admin profile ID for platform-wide assets
        )

        if not result:
            raise HTTPException(status_code=500, detail="Upload failed")

        # Create SystemMedia record
        system_media = SystemMedia(
            media_type='image',
            file_type=image_type,
            targets=[target],  # Single target from form
            file_url=result['url'],
            title=title or f"{image_type.capitalize()} for {target}",
            file_name=result['fileName'],
            file_size=len(contents),
            uploaded_by=current_user.id
        )

        db.add(system_media)
        db.commit()
        db.refresh(system_media)

        return {
            "success": True,
            "message": "System image uploaded successfully",
            "media_id": system_media.id,
            "url": result['url'],
            "details": result
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/upload/system-video")
async def upload_system_video(
    file: UploadFile = File(...),
    thumbnail: UploadFile = File(...),
    video_type: str = Form(...),  # 'ad' or 'alert'
    targets: str = Form(...),  # JSON string array
    title: str = Form(...),
    description: Optional[str] = Form(None),
    classification: Optional[str] = Form(None),  # Only for ads
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload system video with thumbnail to Backblaze B2"""
    try:
        # Only admins can upload system videos
        if "admin" not in current_user.roles and "super_admin" not in current_user.roles:
            raise HTTPException(status_code=403, detail="Only admins can upload system videos")

        # Parse targets JSON
        import json
        try:
            target_list = json.loads(targets)
            if not isinstance(target_list, list) or len(target_list) == 0:
                raise ValueError("Targets must be a non-empty array")
        except:
            raise HTTPException(status_code=400, detail="Invalid targets format - must be JSON array")

        # Validate video type
        if video_type not in ['ad', 'alert']:
            raise HTTPException(status_code=400, detail="Video type must be 'ad' or 'alert'")

        # Validate classification for ads
        if video_type == 'ad' and not classification:
            raise HTTPException(status_code=400, detail="Ad classification is required for advertisements")

        # Validate file sizes
        video_contents = await file.read()
        thumbnail_contents = await thumbnail.read()

        if len(video_contents) > 200 * 1024 * 1024:  # 200MB
            raise HTTPException(status_code=400, detail="Video size exceeds 200MB limit")

        if len(thumbnail_contents) > 5 * 1024 * 1024:  # 5MB
            raise HTTPException(status_code=400, detail="Thumbnail size exceeds 5MB limit")

        # Validate file types
        if not file.content_type or not file.content_type.startswith('video/'):
            raise HTTPException(status_code=400, detail="File must be a video")

        if not thumbnail.content_type or not thumbnail.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Thumbnail must be an image")

        b2_service = get_backblaze_service()

        # Get admin profile ID for system file organization
        admin_profile = None
        if "admin" in current_user.roles:
            admin_profile = db.query(AdminProfile).filter(AdminProfile.user_id == current_user.id).first()

        # Use admin profile_id or fallback to 'admin_system' for platform-wide assets
        admin_identifier = f"profile_{admin_profile.id}" if admin_profile else "admin_system"

        # Upload video with admin profile_id
        video_result = b2_service.upload_file(
            file_data=video_contents,
            file_name=file.filename,
            file_type='ad_video' if video_type == 'ad' else 'video',
            user_id=admin_identifier  # Admin profile ID for platform-wide assets
        )

        if not video_result:
            raise HTTPException(status_code=500, detail="Video upload failed")

        # Upload thumbnail with admin profile_id
        thumbnail_result = b2_service.upload_file(
            file_data=thumbnail_contents,
            file_name=thumbnail.filename,
            file_type='thumbnail',
            user_id=admin_identifier  # Admin profile ID for platform-wide assets
        )

        if not thumbnail_result:
            # Clean up video if thumbnail fails
            b2_service.delete_file(video_result['fileName'], video_result.get('fileId'))
            raise HTTPException(status_code=500, detail="Thumbnail upload failed")

        # Create SystemMedia record
        system_media = SystemMedia(
            media_type='video',
            file_type=video_type,
            classification=classification,
            targets=target_list,
            file_url=video_result['url'],
            thumbnail_url=thumbnail_result['url'],
            title=title,
            description=description,
            file_name=video_result['fileName'],
            file_size=len(video_contents),
            uploaded_by=current_user.id
        )

        db.add(system_media)
        db.commit()
        db.refresh(system_media)

        return {
            "success": True,
            "message": "System video uploaded successfully",
            "media_id": system_media.id,
            "video_url": video_result['url'],
            "thumbnail_url": thumbnail_result['url'],
            "targets": target_list,
            "details": {
                "video": video_result,
                "thumbnail": thumbnail_result
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/system-media")
async def get_system_media(
    media_type: Optional[str] = Query(None),  # 'image' or 'video'
    file_type: Optional[str] = Query(None),
    target: Optional[str] = Query(None),
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Get system media with optional filters - works with both user and admin auth"""
    # Check authentication (accept both user and admin tokens)
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.replace('Bearer ', '')
    try:
        # Try to decode token (accept both user and admin token formats)
        from utils import SECRET_KEY, ALGORITHM
        import jwt
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # Accept if either 'sub' (user token) or 'admin_id' (admin token) exists
        if not payload.get("sub") and not payload.get("admin_id"):
            raise HTTPException(status_code=401, detail="Invalid token format")

    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        query = db.query(SystemMedia).filter(SystemMedia.is_active == True)

        if media_type:
            query = query.filter(SystemMedia.media_type == media_type)

        if file_type:
            query = query.filter(SystemMedia.file_type == file_type)

        if target:
            # Filter by target in JSON array
            query = query.filter(SystemMedia.targets.contains([target]))

        media_list = query.order_by(SystemMedia.created_at.desc()).all()

        return {
            "success": True,
            "count": len(media_list),
            "media": [
                {
                    "id": media.id,
                    "media_type": media.media_type,
                    "file_type": media.file_type,
                    "classification": media.classification,
                    "targets": media.targets,
                    "file_url": media.file_url,
                    "thumbnail_url": media.thumbnail_url,
                    "title": media.title,
                    "description": media.description,
                    "created_at": media.created_at.isoformat()
                }
                for media in media_list
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/system-media/{media_id}")
async def delete_system_media(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete system media by ID"""
    try:
        # Get the media record
        media = db.query(SystemMedia).filter(SystemMedia.id == media_id).first()

        if not media:
            raise HTTPException(status_code=404, detail="Media not found")

        # Optional: Check if user is admin (you can add role checking here)
        # For now, we'll allow any authenticated user to delete

        # Delete from Backblaze if needed
        try:
            b2_service = get_backblaze_service()
            b2_service.delete_file(media.file_name)

            # Delete thumbnail if it's a video
            if media.media_type == 'video' and media.thumbnail_url:
                # Extract thumbnail filename from URL
                thumbnail_parts = media.thumbnail_url.split('/')
                if thumbnail_parts:
                    thumbnail_filename = thumbnail_parts[-1]
                    b2_service.delete_file(thumbnail_filename)
        except Exception as e:
            print(f"Warning: Failed to delete file from B2: {e}")
            # Continue with database deletion even if B2 deletion fails

        # Delete from database
        db.delete(media)
        db.commit()

        return {
            "success": True,
            "message": "Media deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/my-uploads")
async def get_my_uploads(
    folder: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's uploaded files"""
    try:
        b2_service = get_backblaze_service()
        
        if folder:
            folder_path = f"{folder}/user-{current_user.id}"
        else:
            folder_path = None
        
        files = b2_service.list_files(folder=folder_path, limit=100)
        
        return {
            "success": True,
            "files": files,
            "total": len(files)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# USER ROLE MANAGEMENT ENDPOINTS
# ============================================

@router.get("/api/my-roles")
def get_user_roles(current_user: User = Depends(get_current_user)):
    """Get current user's roles and active role"""
    return {
        "user_roles": current_user.roles,
        "active_role": current_user.active_role
    }

@router.post("/api/switch-role")
def switch_user_role(
    role_data: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Switch user's active role and return new JWT token with updated role_ids

    IMPORTANT: This generates a new access token with the updated active role
    so that role-specific IDs in the token reflect the new active role.
    """
    new_role = role_data.get("role")

    if not new_role:
        raise HTTPException(status_code=400, detail="Role is required")

    # Force refresh from database to get latest roles (handles race condition with add-role)
    # Query fresh user object from database to bypass SQLAlchemy session cache
    fresh_user = db.query(User).filter(User.id == current_user.id).first()
    if not fresh_user:
        raise HTTPException(status_code=404, detail="User not found")

    if new_role not in fresh_user.roles:
        raise HTTPException(
            status_code=400,
            detail=f"User does not have {new_role} role"
        )

    # Update active role in database
    fresh_user.active_role = new_role
    db.commit()

    # Generate new JWT token with updated role information
    role_ids = get_role_ids_from_user(fresh_user, db)

    token_data = {
        "sub": fresh_user.id,
        "role": new_role,  # Updated active role
        "role_ids": role_ids
    }

    new_access_token = create_access_token(data=token_data)
    new_refresh_token = create_refresh_token(data=token_data)

    # Store new refresh token
    refresh_token_obj = RefreshToken(
        token=new_refresh_token,
        user_id=fresh_user.id,
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(refresh_token_obj)
    db.commit()

    return {
        "message": f"Successfully switched to {new_role} role",
        "active_role": new_role,
        "user_roles": fresh_user.roles,
        "access_token": new_access_token,  # NEW: Return updated token
        "refresh_token": new_refresh_token,  # NEW: Return updated refresh token
        "token_type": "bearer"
    }

# ============================================
# OTP ENDPOINTS
# ============================================

@router.post("/api/send-otp")
def send_otp(
    otp_data: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send OTP to user's registered contact method (email or phone)"""
    import random
    from datetime import timedelta

    purpose = otp_data.get("purpose", "add_role")

    # Automatically determine contact method - prioritize email, fallback to phone
    send_to = None
    if current_user.email:
        send_to = "email"
    elif current_user.phone:
        send_to = "phone"
    else:
        raise HTTPException(status_code=400, detail="User has no email or phone registered")

    # Allow manual override if provided (for backward compatibility)
    if "send_to" in otp_data and otp_data["send_to"]:
        requested = otp_data["send_to"]
        if requested not in ["email", "phone"]:
            raise HTTPException(status_code=400, detail="send_to must be 'email' or 'phone'")

        # Validate user has the requested method
        if requested == "email" and not current_user.email:
            raise HTTPException(status_code=400, detail="User has no email address registered")
        if requested == "phone" and not current_user.phone:
            raise HTTPException(status_code=400, detail="User has no phone number registered")

        send_to = requested

    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))

    # Set expiration (5 minutes from now)
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    # Invalidate any existing unused OTPs for this user and purpose
    db.query(OTP).filter(
        OTP.user_id == current_user.id,
        OTP.purpose == purpose,
        OTP.is_used == False
    ).update({"is_used": True})
    db.commit()

    # Create new OTP
    new_otp = OTP(
        user_id=current_user.id,
        otp_code=otp_code,
        purpose=purpose,
        expires_at=expires_at
    )
    db.add(new_otp)
    db.commit()

    # Send OTP based on user preference
    destination_value = current_user.email if send_to == "email" else current_user.phone

    # Import email and SMS services
    from email_service import email_service
    from sms_service import sms_service

    sent_successfully = False

    if send_to == "email":
        # Send email using email service
        sent_successfully = email_service.send_otp_email(
            to_email=current_user.email,
            otp_code=otp_code,
            purpose=purpose
        )
    else:  # phone
        # Send SMS using SMS service
        sent_successfully = sms_service.send_otp_sms(
            to_phone=current_user.phone,
            otp_code=otp_code,
            purpose=purpose
        )

    # Determine if we should include OTP in response (only if service failed or in dev mode)
    include_otp = not sent_successfully or os.getenv("ENVIRONMENT", "development") == "development"

    return {
        "message": f"OTP sent successfully to your {send_to}",
        "destination": send_to,
        "destination_value": f"{destination_value[:3]}***{destination_value[-2:]}" if len(destination_value) > 5 else "***",
        "expires_in": 300,  # 5 minutes in seconds
        # Include OTP in development or if sending failed (for debugging)
        "otp": otp_code if include_otp else None
    }

@router.post("/api/forgot-password")
def forgot_password(
    email_data: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Send OTP to user's email for password reset (no authentication required)

    IMPORTANT: This endpoint is for regular USERS only (from users table).
    It does NOT work with admin_profile table.
    Admins should use the separate admin password reset flow.
    """
    import random
    from datetime import timedelta

    email = email_data.get("email")

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    # Find user by email - ONLY queries users table, NOT admin_profile
    user = db.query(User).filter(User.email == email).first()

    if not user:
        # Security: Don't reveal if email exists or not
        # Return success message anyway to prevent email enumeration
        return {
            "message": "If this email is registered, you will receive an OTP shortly",
            "destination": "email"
        }

    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))

    # Set expiration (5 minutes from now)
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    # Invalidate any existing unused password reset OTPs for this user
    db.query(OTP).filter(
        OTP.user_id == user.id,
        OTP.purpose == "password_reset",
        OTP.is_used == False
    ).update({"is_used": True})
    db.commit()

    # Create new OTP
    new_otp = OTP(
        user_id=user.id,
        otp_code=otp_code,
        purpose="password_reset",
        expires_at=expires_at
    )
    db.add(new_otp)
    db.commit()

    # Send OTP via email
    from email_service import email_service

    sent_successfully = email_service.send_otp_email(
        to_email=user.email,
        otp_code=otp_code,
        purpose="password_reset"
    )

    # Determine if we should include OTP in response (only if service failed or in dev mode)
    include_otp = not sent_successfully or os.getenv("ENVIRONMENT", "development") == "development"

    return {
        "message": "If this email is registered, you will receive an OTP shortly",
        "destination": "email",
        "expires_in": 300,  # 5 minutes in seconds
        # Include OTP in development or if sending failed (for debugging)
        "otp": otp_code if include_otp else None
    }

@router.post("/api/reset-password")
def reset_password(
    reset_data: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Reset user password with OTP verification and auto-login

    IMPORTANT: This endpoint is for regular USERS only (from users table).
    It does NOT work with admin_profile table.
    Admins should use the separate admin password reset flow.
    """
    import bcrypt

    email = reset_data.get("email")
    otp_code = reset_data.get("otp")
    new_password = reset_data.get("new_password")

    # Validate input
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if not otp_code:
        raise HTTPException(status_code=400, detail="OTP is required")
    if not new_password:
        raise HTTPException(status_code=400, detail="New password is required")

    # Validate password strength
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")

    # Find user by email - ONLY queries users table, NOT admin_profile
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or OTP")

    # Verify OTP
    otp_record = db.query(OTP).filter(
        OTP.user_id == user.id,
        OTP.otp_code == otp_code,
        OTP.purpose == "password_reset",
        OTP.is_used == False,
        OTP.expires_at > datetime.utcnow()
    ).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # Mark OTP as used
    otp_record.is_used = True

    # Hash new password
    hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
    user.password_hash = hashed_password.decode('utf-8')

    db.commit()

    # Generate tokens for auto-login
    from utils import create_access_token, create_refresh_token

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Get role-specific profile picture
    profile_picture = get_role_specific_profile_picture(user, db)

    # Prepare user data for response
    user_data = {
        "id": user.id,
        "first_name": user.first_name,
        "father_name": user.father_name,
        "grandfather_name": user.grandfather_name,
        "name": f"{user.first_name} {user.father_name}",
        "email": user.email,
        "phone": user.phone,
        "roles": user.roles,
        "active_role": user.active_role,
        "role": user.active_role,  # For backward compatibility
        "profile_picture": profile_picture or user.profile_picture
    }

    return {
        "message": "Password reset successful! You are now logged in.",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_data
    }

@router.post("/api/add-role")
def add_user_role(
    role_data: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new role to user's account with OTP verification"""
    import bcrypt

    otp_code = role_data.get("otp")
    new_role = role_data.get("new_role")
    password = role_data.get("password")

    # Validate input
    if not otp_code:
        raise HTTPException(status_code=400, detail="OTP is required")
    if not new_role:
        raise HTTPException(status_code=400, detail="Role is required")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    # Check if user already has this role BEFORE verifying OTP/password
    # This prevents burning the OTP if the role already exists
    if new_role in current_user.roles:
        raise HTTPException(status_code=400, detail=f"You already have the {new_role} role")

    # Verify password
    if not bcrypt.checkpw(password.encode('utf-8'), current_user.password_hash.encode('utf-8')):
        raise HTTPException(status_code=400, detail="Invalid password")

    # Verify OTP
    otp_record = db.query(OTP).filter(
        OTP.user_id == current_user.id,
        OTP.otp_code == otp_code,
        OTP.purpose == "add_role",
        OTP.is_used == False,
        OTP.expires_at > datetime.utcnow()
    ).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # Mark OTP as used ONLY after all validations pass
    otp_record.is_used = True
    db.commit()

    # Add new role - MUST create a NEW list for SQLAlchemy to detect the change
    # If you modify the existing list, SQLAlchemy won't track it as changed
    current_roles = current_user.roles if isinstance(current_user.roles, list) else []
    current_user.roles = current_roles + [new_role]  # Create NEW list instead of append

    # Create corresponding profile based on role
    if new_role == "tutor" and not current_user.tutor_profile:
        tutor_profile = TutorProfile(user_id=current_user.id)
        db.add(tutor_profile)
    elif new_role == "student" and not current_user.student_profile:
        student_profile = StudentProfile(user_id=current_user.id)
        db.add(student_profile)

    # Commit and ensure changes are flushed to database
    db.commit()
    db.flush()  # Force write to database
    db.refresh(current_user)

    # Close the session to ensure no stale data remains
    db.close()

    return {
        "message": f"{new_role.capitalize()} role added successfully",
        "user_roles": current_user.roles,
        "active_role": current_user.active_role
    }

# ============================================
# EMAIL CHANGE WITH OTP VERIFICATION
# ============================================

@router.post("/api/send-otp-email-change")
def send_otp_for_email_change(
    email_data: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send OTP to new email address for verification"""
    import random
    from datetime import timedelta
    from email_service import email_service

    new_email = email_data.get("new_email")

    if not new_email:
        raise HTTPException(status_code=400, detail="New email is required")

    # Check if email is already in use by another user
    existing_user = db.query(User).filter(
        User.email == new_email,
        User.id != current_user.id
    ).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="This email is already in use by another account")

    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))

    # Set expiration (5 minutes from now)
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    # Invalidate any existing unused OTPs for email change
    db.query(OTP).filter(
        OTP.user_id == current_user.id,
        OTP.purpose == "email_change",
        OTP.is_used == False
    ).update({"is_used": True})
    db.commit()

    # Create new OTP
    new_otp = OTP(
        user_id=current_user.id,
        otp_code=otp_code,
        purpose="email_change",
        expires_at=expires_at
    )
    db.add(new_otp)
    db.commit()

    # Send OTP to NEW email address
    sent_successfully = email_service.send_otp_email(
        to_email=new_email,
        otp_code=otp_code,
        purpose="email_change"
    )

    # Include OTP in development mode or if sending failed
    include_otp = not sent_successfully or os.getenv("ENVIRONMENT", "development") == "development"

    return {
        "message": f"OTP sent successfully to {new_email}",
        "destination": "email",
        "destination_value": f"{new_email[:3]}***{new_email[-10:]}" if len(new_email) > 13 else "***",
        "expires_in": 300,  # 5 minutes in seconds
        "otp": otp_code if include_otp else None
    }

@router.post("/api/verify-otp-email-change")
def verify_otp_for_email_change(
    verification_data: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify OTP for email change (doesn't update email yet, just verifies)"""
    otp_code = verification_data.get("otp_code")
    new_email = verification_data.get("new_email")

    if not otp_code:
        raise HTTPException(status_code=400, detail="OTP code is required")
    if not new_email:
        raise HTTPException(status_code=400, detail="New email is required")

    # Verify OTP
    otp_record = db.query(OTP).filter(
        OTP.user_id == current_user.id,
        OTP.otp_code == otp_code,
        OTP.purpose == "email_change",
        OTP.is_used == False,
        OTP.expires_at > datetime.utcnow()
    ).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # Mark OTP as used
    otp_record.is_used = True
    db.commit()

    return {
        "message": "Email verified successfully",
        "verified": True,
        "new_email": new_email
    }

# ============================================
# REGISTRATION OTP ENDPOINTS (Public - No Auth Required)
# ============================================

@router.post("/api/send-registration-otp")
def send_registration_otp(
    registration_data: dict = Body(...),
    db: Session = Depends(get_db)
):
    """Send OTP for new user registration (Public endpoint - no authentication required)"""
    import random
    from datetime import timedelta
    from email_service import email_service
    from sms_service import sms_service

    email = registration_data.get("email", "").strip()
    phone = registration_data.get("phone", "").strip()

    # Validate: at least one contact method
    if not email and not phone:
        raise HTTPException(status_code=400, detail="Either email or phone number is required")

    # Check if user already exists
    if email:
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="An account with this email already exists")

    if phone:
        existing_user = db.query(User).filter(User.phone == phone).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="An account with this phone number already exists")

    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))

    # Set expiration (5 minutes)
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    # Delete any existing unused OTPs for this contact
    if email:
        db.query(OTP).filter(OTP.contact == email, OTP.is_used == False).delete()
    if phone:
        db.query(OTP).filter(OTP.contact == phone, OTP.is_used == False).delete()

    # Store OTP with contact info (no user_id since user doesn't exist yet)
    new_otp = OTP(
        user_id=None,  # No user yet
        contact=email or phone,  # Store the contact method
        otp_code=otp_code,
        purpose="registration",
        expires_at=expires_at
    )
    db.add(new_otp)
    db.commit()

    # Send OTP
    sent_successfully = False
    destination_type = None
    destination_value = None

    if email:
        try:
            sent_successfully = email_service.send_otp_email(
                to_email=email,
                otp_code=otp_code,
                purpose="registration"
            )
            destination_type = "email"
            destination_value = f"{email[:3]}***{email[-10:]}" if len(email) > 13 else "***"
        except Exception as e:
            print(f"Email sending failed: {e}")
    elif phone:
        try:
            sent_successfully = sms_service.send_otp_sms(
                to_phone=phone,
                otp_code=otp_code,
                purpose="registration"
            )
            destination_type = "phone"
            destination_value = f"***{phone[-4:]}"
        except Exception as e:
            print(f"SMS sending failed: {e}")

    # Include OTP in development mode or if sending failed
    include_otp = not sent_successfully or os.getenv("ENVIRONMENT", "development") == "development"

    return {
        "message": f"OTP sent successfully to your {destination_type}",
        "destination": destination_type,
        "destination_value": destination_value,
        "expires_in": 300,  # 5 minutes in seconds
        "otp": otp_code if include_otp else None
    }

@router.post("/api/verify-registration-otp")
def verify_registration_otp(
    verification_data: dict = Body(...),
    db: Session = Depends(get_db)
):
    """Verify OTP for registration and create user account"""
    otp_code = verification_data.get("otp_code", "").strip()
    email = verification_data.get("email", "").strip()
    phone = verification_data.get("phone", "").strip()
    first_name = verification_data.get("first_name", "").strip()
    father_name = verification_data.get("father_name", "").strip()
    grandfather_name = verification_data.get("grandfather_name", "").strip()
    password = verification_data.get("password", "").strip()
    role = verification_data.get("role", "student").strip()

    if not otp_code:
        raise HTTPException(status_code=400, detail="OTP code is required")

    if not first_name or not father_name or not grandfather_name:
        raise HTTPException(status_code=400, detail="All name fields are required")

    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    # Verify OTP
    contact = email or phone
    otp_record = db.query(OTP).filter(
        OTP.contact == contact,
        OTP.otp_code == otp_code,
        OTP.purpose == "registration",
        OTP.is_used == False,
        OTP.expires_at > datetime.utcnow()
    ).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # Check if user was created in the meantime
    if email:
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="An account with this email already exists")

    if phone:
        existing_user = db.query(User).filter(User.phone == phone).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="An account with this phone number already exists")

    # Mark OTP as used
    otp_record.is_used = True
    db.commit()

    # Create new user
    new_user = User(
        first_name=first_name,
        father_name=father_name,
        grandfather_name=grandfather_name,
        email=email if email else None,
        phone=phone if phone else None,
        password_hash=hash_password(password),
        roles=[role],
        active_role=role,
        email_verified=True if email else False  # Auto-verify if OTP was sent to email
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create profile based on role
    if role == "tutor":
        tutor_profile = TutorProfile(user_id=new_user.id)
        db.add(tutor_profile)
    elif role == "student":
        student_profile = StudentProfile(user_id=new_user.id)
        db.add(student_profile)
    elif role == "admin":
        # Create admin_profile record using raw SQL
        db.execute(text("""
            INSERT INTO admin_profile (admin_id, first_name, father_name, email, department, created_at, updated_at)
            VALUES (:admin_id, :first_name, :father_name, :email, :department, NOW(), NOW())
        """), {
            "admin_id": new_user.id,
            "first_name": new_user.first_name,
            "father_name": new_user.father_name,
            "email": new_user.email,
            "department": verification_data.get("department", "manage-system-settings")
        })

    db.commit()

    # Get role-specific IDs
    role_ids = get_role_ids_from_user(new_user, db)

    # Create tokens
    token_data = {
        "sub": new_user.id,
        "role": new_user.active_role,
        "role_ids": role_ids
    }
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)

    # Store refresh token
    refresh_token_obj = RefreshToken(
        token=refresh_token,
        user_id=new_user.id,
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(refresh_token_obj)
    db.commit()

    # Get profile picture from role-specific table
    profile_picture = get_role_specific_profile_picture(new_user, db)
    # Get username from role-specific table
    username = get_role_specific_username(new_user, db)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            id=new_user.id,
            first_name=new_user.first_name,
            father_name=new_user.father_name,
            grandfather_name=new_user.grandfather_name,
            username=username,
            email=new_user.email,
            phone=new_user.phone,
            roles=new_user.roles,
            active_role=new_user.active_role,
            profile_picture=profile_picture,
            created_at=new_user.created_at,
            is_active=new_user.is_active,
            email_verified=new_user.email_verified
        )
    )

# ============================================
# PROFILE UPDATE ENDPOINT
# ============================================

@router.put("/api/update-profile")
def update_user_profile(
    profile_data: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile with validation for required fields"""

    # Extract name fields (REQUIRED)
    first_name = profile_data.get("first_name", "").strip()
    father_name = profile_data.get("father_name", "").strip()
    grandfather_name = profile_data.get("grandfather_name", "").strip()

    # Validate required fields
    if not first_name or not father_name or not grandfather_name:
        raise HTTPException(
            status_code=400,
            detail="First name, father name, and grandfather name are required"
        )

    # Update name fields
    current_user.first_name = first_name
    current_user.father_name = father_name
    current_user.grandfather_name = grandfather_name

    # Handle email change (optional)
    new_email = profile_data.get("email", "").strip()
    if new_email and new_email != current_user.email:
        # Check if email is already in use
        existing_user = db.query(User).filter(
            User.email == new_email,
            User.id != current_user.id
        ).first()

        if existing_user:
            raise HTTPException(status_code=400, detail="This email is already in use")

        # Note: In frontend, we already verified OTP before calling this
        # But we can add an extra check here if needed
        current_user.email = new_email
        current_user.email_verified = True  # Email was verified via OTP

    # Handle phone change (optional)
    new_phone = profile_data.get("phone", "").strip()
    if new_phone:
        current_user.phone = new_phone

    # Update other optional fields (not stored in users table, but can be passed through)
    # These would typically be stored in role-specific profile tables

    # Commit changes
    db.commit()
    db.refresh(current_user)

    return {
        "id": current_user.id,
        "first_name": current_user.first_name,
        "father_name": current_user.father_name,
        "grandfather_name": current_user.grandfather_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "email_verified": current_user.email_verified,
        "phone_verified": current_user.phone_verified
    }

# ============================================
# BLOG ENDPOINTS
# ============================================

@router.post("/api/blog/posts")
def create_blog_post(
    post_data: BlogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new blog post"""
    new_post = BlogPost(
        author_id=current_user.id,
        title=post_data.title,
        description=post_data.description,
        content=post_data.content,
        category=post_data.category,
        thumbnail_url=post_data.thumbnail_url
    )

    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    return {"message": "Blog post created successfully", "post_id": new_post.id}

@router.get("/api/blog/posts")
def get_blog_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    status: str = Query("published"),
    db: Session = Depends(get_db)
):
    """Get blog posts with pagination and filtering"""
    query = db.query(BlogPost).join(User)

    query = query.filter(BlogPost.status == status)

    if category:
        query = query.filter(func.lower(BlogPost.category) == category.lower())

    if search:
        search_filter = or_(
            func.lower(BlogPost.title).contains(search.lower()),
            func.lower(BlogPost.description).contains(search.lower()),
            func.lower(BlogPost.content).contains(search.lower())
        )
        query = query.filter(search_filter)

    query = query.order_by(desc(BlogPost.created_at))

    total = query.count()
    offset = (page - 1) * limit
    posts = query.offset(offset).limit(limit).all()

    post_list = []
    for post in posts:
        post_data = {
            "id": post.id,
            "title": post.title,
            "description": post.description,
            "content": post.content,
            "thumbnail_url": post.thumbnail_url,
            "category": post.category,
            "status": post.status,
            "views": post.views,
            "likes": post.likes,
            "author": {
                "id": post.author.id,
                "first_name": post.author.first_name,
                "father_name": post.author.father_name,
                "profile_picture": post.author.profile_picture
            },
            "created_at": post.created_at,
            "published_at": post.published_at
        }
        post_list.append(post_data)

    return {
        "posts": post_list,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.get("/api/blog/posts/author/{author_id}")
def get_blog_posts_by_author(
    author_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    status: str = Query("published"),
    db: Session = Depends(get_db)
):
    """Get blog posts by a specific author"""
    query = db.query(BlogPost).join(User).filter(BlogPost.author_id == author_id)

    query = query.filter(BlogPost.status == status)
    query = query.order_by(desc(BlogPost.created_at))

    total = query.count()
    offset = (page - 1) * limit
    posts = query.offset(offset).limit(limit).all()

    post_list = []
    for post in posts:
        post_data = {
            "id": post.id,
            "title": post.title,
            "description": post.description,
            "content": post.content,
            "thumbnail_url": post.thumbnail_url,
            "category": post.category,
            "status": post.status,
            "views": post.views,
            "likes": post.likes,
            "author": {
                "id": post.author.id,
                "first_name": post.author.first_name,
                "father_name": post.author.father_name,
                "profile_picture": post.author.profile_picture
            },
            "created_at": post.created_at,
            "published_at": post.published_at
        }
        post_list.append(post_data)

    return {
        "posts": post_list,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

# ============================================
# VIDEO ENDPOINTS
# ============================================

@router.get("/api/videos")
def get_videos(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    category: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    grade_level: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("newest", regex="^(newest|popular|trending)$"),
    db: Session = Depends(get_db)
):
    """Get videos with filtering and pagination"""
    query = db.query(VideoReel).join(TutorProfile).join(User).filter(
        VideoReel.is_active == True,
        TutorProfile.is_active == True,
        User.is_active == True
    )

    if category:
        query = query.filter(func.lower(VideoReel.category) == category.lower())

    if subject:
        query = query.filter(func.lower(VideoReel.subject) == subject.lower())

    if grade_level:
        query = query.filter(func.lower(VideoReel.grade_level) == grade_level.lower())

    if search:
        search_filter = or_(
            func.lower(VideoReel.title).contains(search.lower()),
            func.lower(VideoReel.description).contains(search.lower())
        )
        query = query.filter(search_filter)

    if sort_by == "newest":
        query = query.order_by(desc(VideoReel.created_at))
    elif sort_by == "popular":
        query = query.order_by(desc(VideoReel.views))
    elif sort_by == "trending":
        query = query.order_by(desc(VideoReel.likes))

    total = query.count()
    offset = (page - 1) * limit
    videos = query.offset(offset).limit(limit).all()

    video_list = []
    for video in videos:
        video_data = {
            "id": video.id,
            "title": video.title,
            "description": video.description,
            "video_url": video.video_url,
            "thumbnail_url": video.thumbnail_url,
            "duration": video.duration,
            "category": video.category,
            "subject": video.subject,
            "grade_level": video.grade_level,
            "views": video.views,
            "likes": video.likes,
            "dislikes": video.dislikes,
            "is_featured": video.is_featured,
            "tutor": {
                "id": video.tutor.id,
                "name": f"{video.tutor.user.first_name} {video.tutor.user.father_name}",
                "profile_picture": video.tutor.user.profile_picture,
                "rating": 0.0  # Rating removed from tutor_profiles - calculate from tutor_reviews if needed
            },
            "created_at": video.created_at
        }
        video_list.append(video_data)

    return {
        "videos": video_list,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

# ============================================
# COURSES ENDPOINTS
# ============================================

@router.get("/api/courses")
def get_courses(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    category: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("popular", regex="^(popular|rating|newest)$"),
    db: Session = Depends(get_db)
):
    """Get courses with filtering and pagination

    Updated to use new courses table schema:
    - course_name, course_category, course_level, course_description
    - thumbnail, duration, lessons, lesson_title[], language[]
    - rating, rating_count, created_at, updated_at
    """
    # Check if courses table exists
    try:
        db.execute(text("SELECT 1 FROM courses LIMIT 1"))
    except:
        # If table doesn't exist, return empty response
        return {
            "courses": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "pages": 0
        }

    # Build query with new column names
    query = "SELECT * FROM courses WHERE 1=1"
    params = {}

    if category:
        query += " AND LOWER(course_category) = LOWER(:category)"
        params['category'] = category

    if level:
        query += " AND LOWER(course_level) = LOWER(:level)"
        params['level'] = level

    if search:
        query += " AND (LOWER(course_name) LIKE LOWER(:search) OR LOWER(course_description) LIKE LOWER(:search))"
        params['search'] = f"%{search}%"

    # Add sorting
    if sort_by == "popular":
        query += " ORDER BY rating_count DESC, rating DESC"
    elif sort_by == "rating":
        query += " ORDER BY rating DESC"
    elif sort_by == "newest":
        query += " ORDER BY created_at DESC"

    # Get total count
    count_query = f"SELECT COUNT(*) FROM ({query}) AS count_query"
    total = db.execute(text(count_query), params).scalar()

    # Add pagination
    offset = (page - 1) * limit
    query += f" LIMIT {limit} OFFSET {offset}"

    # Execute query
    result = db.execute(text(query), params)
    courses = result.fetchall()

    # Convert to dict with both new and legacy field names for compatibility
    course_list = []
    for course in courses:
        # Get category icon
        category_icons = {
            'mathematics': '📐', 'math': '📐',
            'physics': '⚛️', 'science': '🔬',
            'chemistry': '🧪', 'biology': '🧬',
            'english': '🇬🇧', 'language': '🗣️', 'languages': '🗣️',
            'amharic': '🇪🇹', 'oromo': '🇪🇹',
            'music': '🎵', 'arts': '🎨', 'art': '🎨',
            'business': '📊', 'technology': '💻', 'tech': '💻',
            'programming': '💻', 'special needs': '♿',
            'photography': '📸', 'cooking': '👨‍🍳', 'dance': '💃'
        }
        cat_lower = (course.course_category or '').lower()
        icon = category_icons.get(cat_lower, '📚')

        course_dict = {
            "id": course.id,
            # New field names
            "course_name": course.course_name,
            "course_category": course.course_category,
            "course_level": course.course_level,
            "course_description": course.course_description,
            # Legacy field names for frontend compatibility
            "title": course.course_name,
            "category": course.course_category,
            "level": course.course_level,
            "description": course.course_description,
            # Other fields
            "icon": icon,
            "thumbnail": course.thumbnail,
            "duration": course.duration or 0,
            "lessons": course.lessons or 0,
            "lesson_title": course.lesson_title if course.lesson_title else [],
            "language": course.language if course.language else ["English"],
            "rating": float(course.rating) if course.rating else 0.0,
            "rating_count": course.rating_count or 0,
            "students": course.rating_count or 0,  # Use rating_count as student proxy
            "uploader_id": course.uploader_id,
            "approved_at": course.approved_at.isoformat() if course.approved_at else None,
            "created_at": course.created_at.isoformat() if course.created_at else None,
            "updated_at": course.updated_at.isoformat() if course.updated_at else None
        }
        course_list.append(course_dict)

    return {
        "courses": course_list,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0
    }

@router.get("/api/courses/{course_id}")
def get_course_details(
    course_id: int,
    db: Session = Depends(get_db)
):
    """Get single course details

    Updated to use new courses table schema
    """
    try:
        result = db.execute(
            text("SELECT * FROM courses WHERE id = :id"),
            {"id": course_id}
        )
        course = result.fetchone()

        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        # Get category icon
        category_icons = {
            'mathematics': '📐', 'math': '📐',
            'physics': '⚛️', 'science': '🔬',
            'chemistry': '🧪', 'biology': '🧬',
            'english': '🇬🇧', 'language': '🗣️', 'languages': '🗣️',
            'amharic': '🇪🇹', 'oromo': '🇪🇹',
            'music': '🎵', 'arts': '🎨', 'art': '🎨',
            'business': '📊', 'technology': '💻', 'tech': '💻',
            'programming': '💻', 'special needs': '♿',
            'photography': '📸', 'cooking': '👨‍🍳', 'dance': '💃'
        }
        cat_lower = (course.course_category or '').lower()
        icon = category_icons.get(cat_lower, '📚')

        return {
            "id": course.id,
            # New field names
            "course_name": course.course_name,
            "course_category": course.course_category,
            "course_level": course.course_level,
            "course_description": course.course_description,
            # Legacy field names for frontend compatibility
            "title": course.course_name,
            "category": course.course_category,
            "level": course.course_level,
            "description": course.course_description,
            # Other fields
            "icon": icon,
            "thumbnail": course.thumbnail,
            "duration": course.duration or 0,
            "lessons": course.lessons or 0,
            "lesson_title": course.lesson_title if course.lesson_title else [],
            "language": course.language if course.language else ["English"],
            "rating": float(course.rating) if course.rating else 0.0,
            "rating_count": course.rating_count or 0,
            "students": course.rating_count or 0,
            "uploader_id": course.uploader_id,
            "approved_by": course.approved_by,
            "approved_at": course.approved_at.isoformat() if course.approved_at else None,
            "created_at": course.created_at.isoformat() if course.created_at else None,
            "updated_at": course.updated_at.isoformat() if course.updated_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/upload/video-thumbnail")
async def upload_video_thumbnail(
    video_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload thumbnail for a video"""
    try:
        video = db.query(VideoReel).join(TutorProfile).filter(
            VideoReel.id == video_id,
            TutorProfile.user_id == current_user.id
        ).first()
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found or not authorized")
        
        b2_service = get_backblaze_service()
        
        result = await b2_service.upload_image(
            file=file,
            folder=f"video-thumbnails/video-{video_id}",
            max_size_mb=2
        )
        
        video.thumbnail_url = result['public_url']
        db.commit()
        
        return {
            "success": True,
            "message": "Thumbnail uploaded successfully",
            "url": result['public_url'],
            "details": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# PLAYLIST ENDPOINTS
# ============================================

@router.post("/api/playlists")
def create_playlist(
    playlist_data: PlaylistCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new playlist"""
    new_playlist = Playlist(
        user_id=current_user.id,
        name=playlist_data.name,
        description=playlist_data.description,
        is_public=playlist_data.is_public
    )

    db.add(new_playlist)
    db.commit()
    db.refresh(new_playlist)

    return {"message": "Playlist created successfully", "playlist_id": new_playlist.id}

@router.get("/api/playlists")
def get_user_playlists(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's playlists"""
    playlists = db.query(Playlist).filter(Playlist.user_id == current_user.id).all()

    playlist_list = []
    for playlist in playlists:
        video_count = db.query(PlaylistVideo).filter(PlaylistVideo.playlist_id == playlist.id).count()

        playlist_data = {
            "id": playlist.id,
            "name": playlist.name,
            "description": playlist.description,
            "is_public": playlist.is_public,
            "video_count": video_count,
            "created_at": playlist.created_at,
            "updated_at": playlist.updated_at
        }
        playlist_list.append(playlist_data)

    return {"playlists": playlist_list}

# ============================================
# REVIEWS ENDPOINTS
# ============================================

@router.get("/api/reviews")
def get_reviews(
    type: str = Query("all", regex="^(all|professional|student|parent|tutor)$"),
    limit: int = Query(10, ge=1, le=50),
    featured: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Get reviews and testimonials"""
    professional_reviews = [
        {
            "id": 1,
            "type": "professional",
            "reviewer": {
                "name": "Dr. Abebe Kebede",
                "title": "Dean of Education",
                "organization": "Addis Ababa University",
                "avatar": "https://picsum.photos/100?random=1"
            },
            "rating": 5,
            "review": "Astegni has revolutionized educational technology in Ethiopia.",
            "date": "2024-01-15",
            "verified": True,
            "featured": True
        }
    ]

    user_testimonials = [
        {
            "id": 4,
            "type": "student",
            "reviewer": {
                "name": "Sara Tadesse",
                "title": "Grade 12 Student",
                "organization": "Addis Ababa",
                "avatar": "https://picsum.photos/100?random=4"
            },
            "rating": 5,
            "review": "My grades improved from C to A in just 3 months!",
            "date": "2024-01-20",
            "verified": True,
            "featured": False
        }
    ]

    all_reviews = professional_reviews + user_testimonials

    if type != "all":
        all_reviews = [r for r in all_reviews if r["type"] == type]

    if featured:
        all_reviews = [r for r in all_reviews if r.get("featured", False)]

    all_reviews.sort(key=lambda x: x["date"], reverse=True)

    return {
        "reviews": all_reviews[:limit],
        "total": len(all_reviews),
        "stats": {
            "average_rating": 4.9,
            "total_reviews": 1250,
            "professional_endorsements": 15,
            "verified_reviews": 1180
        }
    }

# ============================================
# OTHER ENDPOINTS (NEWS, STATISTICS, ETC.)
# ============================================

@router.get("/api/news")
def get_news(limit: int = Query(10, ge=1, le=50)):
    """Get latest news and announcements"""
    news_data = [
        {
            "id": 1,
            "title": "New AI-Powered Learning Tools Available",
            "content": "Revolutionary AI tutoring features integrated.",
            "date": "Today",
            "category": "Education",
            "featured": True
        },
        {
            "id": 2,
            "title": "Partnership with Ethiopian Universities",
            "content": "Expanding course offerings significantly.",
            "date": "Yesterday",
            "category": "Partnership",
            "featured": False
        }
    ]
    return {"news": news_data[:limit], "total": len(news_data)}

@router.get("/api/statistics")
def get_statistics(db: Session = Depends(get_db)):
    """Get platform statistics - counts from profile tables"""
    try:
        # Count from actual profile tables (not users table)
        result_parents = db.execute(text("SELECT COUNT(*) FROM parent_profiles"))
        total_parents = result_parents.scalar() or 0

        result_students = db.execute(text("SELECT COUNT(*) FROM student_profiles"))
        total_students = result_students.scalar() or 0

        result_tutors = db.execute(text("SELECT COUNT(*) FROM tutor_profiles"))
        total_tutors = result_tutors.scalar() or 0

        # Try to count videos (fallback to 0 if table doesn't exist)
        try:
            result_videos = db.execute(text("SELECT COUNT(*) FROM video_reels WHERE is_active = true"))
            total_videos = result_videos.scalar() or 0
        except:
            total_videos = 0
    except Exception as e:
        print(f"Error fetching statistics: {e}")
        total_parents = 0
        total_students = 0
        total_tutors = 0
        total_videos = 0

    return {
        "registered_parents": total_parents,
        "students": total_students,
        "expert_tutors": total_tutors,
        "total_videos": total_videos,
        "training_centers": 0,  # Hidden in frontend
        "books_available": 0,   # Hidden in frontend
        "job_opportunities": 0, # Hidden in frontend
        "success_rate": 95,
        "active_users": total_parents + total_students + total_tutors,
        "monthly_growth": 12.5
    }

@router.get("/api/partners")
async def get_partners(db: Session = Depends(get_db)):
    """Get partner organizations"""
    try:
        partners = [
            {
                "id": 1,
                "name": "Addis Ababa University",
                "logo": "https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/Addis_Ababa_University_logo.png/150px-Addis_Ababa_University_logo.png",
                "description": "Ethiopia's oldest and largest university",
                "website": "http://www.aau.edu.et"
            },
            {
                "id": 2,
                "name": "Ministry of Education",
                "logo": "https://ui-avatars.com/api/?name=MoE&background=f59e0b&color=fff&size=150",
                "description": "Federal Ministry of Education of Ethiopia",
                "website": "http://www.moe.gov.et"
            }
        ]
        return {"partners": partners, "total": len(partners)}
    except Exception as e:
        return {"partners": [], "total": 0}

# ============================================
# EXTENDED TUTOR PROFILE ENDPOINTS  
# Added for comprehensive tutor-profile.html data support
# ============================================

@router.get("/api/tutor/{tutor_id}/profile-complete")
def get_complete_tutor_profile(tutor_id: int, db: Session = Depends(get_db)):
    """Get complete tutor profile with all data for tutor-profile.html - includes calculated ratings from tutor_reviews"""
    from models import TutorProfile, TutorReview
    tutor = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    user = db.query(User).filter(User.id == tutor.user_id).first()

    # Calculate rating metrics from tutor_reviews table (REQUIRED - calculates from actual reviews)
    avg_metrics = db.query(
        func.avg(TutorReview.rating).label('overall_rating'),  # Overall rating average
        func.avg(TutorReview.subject_understanding_rating).label('subject_understanding'),
        func.avg(TutorReview.communication_rating).label('communication'),
        func.avg(TutorReview.discipline_rating).label('discipline'),
        func.avg(TutorReview.punctuality_rating).label('punctuality'),
        func.count(TutorReview.id).label('total_reviews')  # Count of reviews
    ).filter(TutorReview.tutor_id == tutor_id).first()

    # Calculate rating and rating_count from tutor_reviews table
    calculated_rating = round(avg_metrics.overall_rating, 1) if avg_metrics and avg_metrics.overall_rating else 0.0
    calculated_rating_count = avg_metrics.total_reviews if avg_metrics else 0

    # Count pending session requests for this tutor from requested_sessions table
    # (Accepted requests are moved to enrolled_students and deleted from requested_sessions)
    total_requests = db.execute(
        text("SELECT COUNT(*) FROM requested_sessions WHERE tutor_id = :tutor_id AND status = 'pending'"),
        {"tutor_id": tutor_id}
    ).scalar() or 0

    # Count current students from enrolled_students table (students enrolled with this tutor)
    current_students_count = db.execute(
        text("SELECT COUNT(DISTINCT student_id) FROM enrolled_students WHERE tutor_id = :tutor_id"),
        {"tutor_id": tutor_id}
    ).scalar() or 0

    # Generate monthly earnings history (last 12 months)
    from datetime import datetime, timedelta
    import calendar

    monthly_earnings_history = []
    current_date = datetime.now()

    for i in range(11, -1, -1):  # Last 12 months
        month_date = current_date - timedelta(days=30 * i)
        month_name = calendar.month_abbr[month_date.month]

        # For now, generate sample data based on current earnings with some variance
        base_earnings = tutor.monthly_earnings or 10000
        variance = (i - 6) * 500
        random_factor = (hash(f"{tutor.user_id}{i}") % 3000) - 1500
        earnings = max(0, int(base_earnings + variance + random_factor))

        monthly_earnings_history.append({
            "month": month_name,
            "earnings": earnings
        })

    return {
        "id": tutor.id, "user_id": tutor.user_id,
        "name": f"{user.first_name} {user.father_name}" if user else "Unknown",
        "username": tutor.username,  # REQUIRED: Username from tutor_profiles table
        "gender": user.gender if user else None,  # REQUIRED: Gender from users table
        "bio": tutor.bio,
        "quote": tutor.quote,
        "location": tutor.location,  # REQUIRED: Location from tutor_profiles
        "teaches_at": None,  # Column removed
        "sessionFormat": None,  # Column removed
        "courses": [],  # Column removed
        "grades": [],  # Column removed
        "course_type": None,  # Column removed
        "languages": tutor.languages,
        "experience": None,  # Column removed
        "expertise_badge": tutor.expertise_badge or "Tutor",  # REQUIRED: Expertise badge from tutor_profiles
        "profile_picture": tutor.profile_picture,
        "cover_image": tutor.cover_image,
        "social_links": tutor.social_links or {},
        "hero_titles": tutor.hero_titles or ["Excellence in Education, Delivered with Passion"], "hero_subtitle": tutor.hero_subtitle,
        "students_taught": getattr(tutor, 'students_taught', 0), "courses_created": 0,
        "rating": calculated_rating,  # REQUIRED: Calculated from tutor_reviews.rating average
        "rating_count": calculated_rating_count,  # REQUIRED: Counted from tutor_reviews table
        "rating_metrics": {
            # REQUIRED: All metrics calculated from tutor_reviews table
            "subject_understanding": round(avg_metrics.subject_understanding, 1) if avg_metrics and avg_metrics.subject_understanding else 0.0,
            "communication": round(avg_metrics.communication, 1) if avg_metrics and avg_metrics.communication else 0.0,
            "discipline": round(avg_metrics.discipline, 1) if avg_metrics and avg_metrics.discipline else 0.0,
            "punctuality": round(avg_metrics.punctuality, 1) if avg_metrics and avg_metrics.punctuality else 0.0
        },
        "dashboard_stats": {
            "total_students": tutor.total_students,
            "current_students": current_students_count,  # From enrolled_students table
            "total_requests": total_requests,  # From requested_sessions table
            "success_rate": tutor.success_rate, "monthly_earnings": tutor.monthly_earnings,
            "monthly_earnings_history": monthly_earnings_history,
            "response_time_hours": tutor.response_time_hours
        },
        "weekly_stats": {
            "sessions_this_week": tutor.sessions_this_week, "hours_this_week": tutor.hours_this_week,
            "attendance_rate": tutor.attendance_rate
        },
        "teaching_streak_days": tutor.teaching_streak_days,
        "connections": {"total_connections": tutor.total_connections, "students": current_students_count, "colleagues": tutor.total_colleagues}
    }

@router.get("/api/tutor/{tutor_id}/reviews")
def get_tutor_reviews(tutor_id: int, limit: int = 100, db: Session = Depends(get_db)):
    """Get reviews for a tutor with full details including 4-factor ratings and reviewer info"""
    from models import TutorReview, StudentProfile, ParentProfile, TutorProfile
    reviews = db.query(TutorReview).filter(TutorReview.tutor_id == tutor_id).order_by(desc(TutorReview.created_at)).limit(limit).all()
    result = []
    for r in reviews:
        # Get reviewer info based on user_role
        reviewer_name = "Anonymous"
        reviewer_description = ""
        reviewer_profile_picture = "/uploads/system_images/system_profile_pictures/boy-user-image.jpg"
        reviewer_user_id = None

        if r.user_role == "student":
            student_profile = db.query(StudentProfile).filter(StudentProfile.id == r.reviewer_id).first()
            if student_profile:
                user = db.query(User).filter(User.id == student_profile.user_id).first()
                if user:
                    reviewer_name = f"{user.first_name} {user.father_name}"
                    reviewer_user_id = user.id
                reviewer_description = f"{student_profile.grade_level or 'Student'}"
                reviewer_profile_picture = student_profile.profile_picture or "/uploads/system_images/system_profile_pictures/boy-user-image.jpg"

        elif r.user_role == "parent":
            parent_profile = db.query(ParentProfile).filter(ParentProfile.id == r.reviewer_id).first()
            if parent_profile:
                user = db.query(User).filter(User.id == parent_profile.user_id).first()
                if user:
                    reviewer_name = f"{user.first_name} {user.father_name}"
                    reviewer_user_id = user.id
                reviewer_description = "Parent"
                reviewer_profile_picture = parent_profile.profile_picture or "/uploads/system_images/system_profile_pictures/Dad-profile.jpg"

        elif r.user_role == "tutor":
            tutor_profile = db.query(TutorProfile).filter(TutorProfile.id == r.reviewer_id).first()
            if tutor_profile:
                user = db.query(User).filter(User.id == tutor_profile.user_id).first()
                if user:
                    reviewer_name = f"{user.first_name} {user.father_name}"
                    reviewer_user_id = user.id
                reviewer_description = "Tutor"
                reviewer_profile_picture = tutor_profile.profile_picture or "/uploads/system_images/system_profile_pictures/tutor-.jpg"

        result.append({
            "id": r.id,
            "rating": r.rating or 0,
            "title": r.title,
            "review_text": r.review_text,
            "subject_understanding_rating": r.subject_understanding_rating or r.rating or 0,
            "communication_rating": r.communication_rating or r.rating or 0,
            "discipline_rating": r.discipline_rating or r.rating or 0,
            "punctuality_rating": r.punctuality_rating or r.rating or 0,
            "reviewer_name": reviewer_name,
            "reviewer_role": r.user_role,
            "reviewer_id": r.reviewer_id,
            "reviewer_user_id": reviewer_user_id,
            "reviewer_description": reviewer_description,
            "reviewer_profile_picture": reviewer_profile_picture,
            "is_verified": r.is_verified or False,
            "is_featured": r.is_featured or False,
            "helpful_count": r.helpful_count or 0,
            "created_at": r.created_at
        })
    return result

@router.get("/api/tutor/{tutor_id}/activities")
def get_tutor_activities(tutor_id: int, limit: int = 20, db: Session = Depends(get_db)):
    """Get tutor activities"""
    from models import TutorActivity
    activities = db.query(TutorActivity).filter(TutorActivity.tutor_id == tutor_id).order_by(desc(TutorActivity.created_at)).limit(limit).all()
    return [{"id": a.id, "activity_type": a.activity_type, "title": a.title, "icon": a.icon, "color": a.color, "created_at": a.created_at} for a in activities]

@router.get("/api/tutor/{tutor_id}/schedule")
def get_tutor_schedule(tutor_id: int, db: Session = Depends(get_db)):
    """Get tutor schedule - returns all active schedules for the tutor"""
    from models import Schedule

    # Get the tutor's user_id from tutor_profiles
    tutor_profile = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor_profile:
        return []

    # Query schedules using user_id and scheduler_role='tutor'
    schedules = db.query(Schedule).filter(
        and_(
            Schedule.scheduler_id == tutor_profile.user_id,
            Schedule.scheduler_role == 'tutor',
            Schedule.status == 'active'
        )
    ).order_by(Schedule.start_time).all()

    return [{
        "id": s.id,
        "title": s.title,
        "description": s.description,
        "start_time": str(s.start_time),
        "end_time": str(s.end_time),
        "priority_level": s.priority_level,
        "schedule_type": s.schedule_type,
        "months": s.months or [],
        "days": s.days or [],
        "specific_dates": s.specific_dates or [],
        "status": s.status,
        "is_featured": s.is_featured
    } for s in schedules]

# ============================================
# SESSION REQUESTS ENDPOINTS
# ============================================

@router.get("/api/sessions/requests")
def get_session_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get session requests for current tutor"""
    # Get tutor profile
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    # Return empty list for now (implement session request model later)
    return []

# ============================================
# STUDENTS ENDPOINTS
# ============================================

@router.get("/api/students/confirmed")
def get_confirmed_students(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get confirmed students for current tutor"""
    # Get tutor profile
    tutor = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    # Return empty list for now (implement student-tutor connection model later)
    return []

@router.get("/api/student/profile")
def get_student_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current student's profile"""
    # Get student profile
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Dashboard Stats - Read from correct tables
    # Total courses from enrolled_courses table (uses students_id array column)
    total_courses = db.execute(
        text("SELECT COUNT(*) FROM enrolled_courses WHERE :student_id = ANY(students_id)"),
        {"student_id": student.id}
    ).scalar() or 0

    # Active courses from enrolled_courses table (not completed)
    active_courses = db.execute(
        text("""
            SELECT COUNT(*) FROM enrolled_courses
            WHERE :student_id = ANY(students_id)
            AND (status IS NULL OR status != 'completed')
        """),
        {"student_id": student.id}
    ).scalar() or 0

    # My tutors count from enrolled_students table (distinct tutors)
    my_tutors = db.execute(
        text("SELECT COUNT(DISTINCT tutor_id) FROM enrolled_students WHERE student_id = :student_id"),
        {"student_id": student.id}
    ).scalar() or 0

    # Rating - average rating from student_reviews table
    avg_rating_result = db.execute(
        text("SELECT AVG(rating) FROM student_reviews WHERE student_id = :student_id"),
        {"student_id": student.id}
    ).scalar()
    student_rating = round(float(avg_rating_result), 1) if avg_rating_result else 0.0

    # Improvement rate (stored in student profile or calculated)
    improvement_rate = getattr(student, 'improvement_rate', 0) or 0

    return {
        "id": student.id,
        "user_id": student.user_id,
        "username": student.username,  # Role-specific username from student_profiles
        "first_name": current_user.first_name,
        "father_name": current_user.father_name,
        "grandfather_name": current_user.grandfather_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "gender": current_user.gender,  # Shared from users table
        "profile_picture": student.profile_picture,  # Student-specific
        "cover_image": student.cover_image,  # Student-specific
        "about": student.about,  # Renamed from bio
        "quote": student.quote if student.quote else [],  # Now array
        "location": student.location,
        "grade_level": student.grade_level,
        "studying_at": student.studying_at,  # Renamed from school_name
        "interested_in": student.interested_in if student.interested_in else [],  # Renamed from subjects
        "languages": student.languages if student.languages else [],  # Renamed from preferred_languages
        "learning_method": student.learning_method if student.learning_method else [],  # Renamed from learning_style
        "hobbies": student.hobbies if student.hobbies else [],  # Array of hobbies
        "career_aspirations": student.career_aspirations,  # Replaces academic_goals
        "hero_title": student.hero_title if student.hero_title else [],  # Hero titles array
        "hero_subtitle": student.hero_subtitle if student.hero_subtitle else [],  # Hero subtitles array
        "joined": current_user.created_at.strftime("%B %Y") if current_user.created_at else None,
        # Dashboard stats - from correct tables
        "dashboard_stats": {
            "total_courses": total_courses,  # From enrolled_courses table
            "active_courses": active_courses,  # From enrolled_courses table (not completed)
            "my_tutors": my_tutors,  # From enrolled_students table (distinct tutors)
            "improvement_rate": improvement_rate,  # From student profile
            "rating": student_rating  # From student_reviews table (average)
        }
    }

# ============================================
# STUDENT TUTORS ENDPOINTS
# (Must be before /api/student/{student_id} to avoid route conflict)
# ============================================

@router.get("/api/student/tutors")
def get_student_tutors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of tutors for the current student from enrolled_students table.
    Returns complete tutor data matching find-tutors card format."""
    # Check if user has student role
    if "student" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have student role")

    # Get student profile
    student_profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()

    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Get enrolled tutors from enrolled_students table
    enrolled_tutors = db.execute(
        text("""
            SELECT DISTINCT es.tutor_id, es.package_id, es.enrolled_at, es.created_at as enrollment_created
            FROM enrolled_students es
            WHERE es.student_id = :student_id
            ORDER BY es.enrolled_at DESC
        """),
        {"student_id": student_profile.id}
    ).fetchall()

    # Enrich with complete tutor details for find-tutors card format
    result = []
    for enrollment in enrolled_tutors:
        tutor_id = enrollment.tutor_id

        # Get tutor profile
        tutor_profile = db.query(TutorProfile).filter(
            TutorProfile.id == tutor_id
        ).first()

        if not tutor_profile:
            continue

        # Get tutor user data
        tutor_user = db.query(User).filter(User.id == tutor_profile.user_id).first()

        if not tutor_user:
            continue

        # Get package name if package_id exists
        package_name = None
        if enrollment.package_id:
            package_result = db.execute(
                text("SELECT name FROM tutor_packages WHERE id = :package_id"),
                {"package_id": enrollment.package_id}
            ).first()
            if package_result:
                package_name = package_result.name

        # Get tutor rating from tutor_reviews
        # Actual column names: rating, subject_understanding_rating, communication_rating, discipline_rating, punctuality_rating
        avg_metrics = db.execute(
            text("""
                SELECT
                    AVG(rating) as overall_rating,
                    COUNT(*) as total_reviews,
                    AVG(subject_understanding_rating) as subject_matter_expertise,
                    AVG(communication_rating) as communication_skills,
                    AVG(discipline_rating) as discipline,
                    AVG(punctuality_rating) as punctuality
                FROM tutor_reviews
                WHERE tutor_id = :tutor_id
            """),
            {"tutor_id": tutor_id}
        ).first()

        calculated_rating = round(avg_metrics.overall_rating, 1) if avg_metrics and avg_metrics.overall_rating else 0.0
        rating_count = avg_metrics.total_reviews if avg_metrics else 0

        # Build complete tutor data matching find-tutors card format
        # Note: Using getattr with defaults to handle missing columns gracefully
        result.append({
            "id": tutor_profile.id,
            "tutor_id": tutor_profile.id,
            "user_id": tutor_user.id,
            "first_name": tutor_user.first_name,
            "father_name": tutor_user.father_name,
            "full_name": f"{tutor_user.first_name} {tutor_user.father_name}",
            "username": getattr(tutor_profile, 'username', None),
            "profile_picture": getattr(tutor_profile, 'profile_picture', None) or tutor_user.profile_picture,
            "bio": tutor_profile.bio,
            "quote": getattr(tutor_profile, 'quote', None),
            "gender": tutor_user.gender,
            "location": tutor_profile.location,
            "rating": calculated_rating,
            "rating_count": rating_count,
            "rating_breakdown": {
                "subject_understanding": round(avg_metrics.subject_matter_expertise, 1) if avg_metrics and avg_metrics.subject_matter_expertise else 0.0,
                "communication": round(avg_metrics.communication_skills, 1) if avg_metrics and avg_metrics.communication_skills else 0.0,
                "discipline": round(avg_metrics.discipline, 1) if avg_metrics and avg_metrics.discipline else 0.0,
                "punctuality": round(avg_metrics.punctuality, 1) if avg_metrics and avg_metrics.punctuality else 0.0
            },
            "price": 0,  # hourly_rate column doesn't exist
            "hourly_rate": None,
            "currency": "ETB",
            "courses": [],  # Column removed
            "subjects": [],  # Column removed
            "languages": tutor_profile.languages or [],
            "grades": [],  # Column removed
            "education_level": None,  # Column doesn't exist
            "experience": None,  # Column removed
            "teaches_at": None,  # Column removed
            "specialization": None,  # Column doesn't exist
            "course_type": None,  # Column removed
            "teaching_type": None,  # Column doesn't exist
            "sessionFormat": None,  # Column removed
            "session_format": None,  # Column removed
            "availability_status": "Available",  # Column doesn't exist, default to Available
            "is_verified": tutor_profile.is_verified,
            "is_premium": False,  # Column doesn't exist
            # Enrollment info
            "package_name": package_name,
            "package_id": enrollment.package_id,
            "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
            "enrollment_date": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None
        })

    return {
        "tutors": result,
        "total": len(result)
    }

@router.get("/api/student/tutors/{tutor_id}")
def get_student_tutor_detail(
    tutor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific tutor from enrolled_students"""
    # Check if user has student role
    if "student" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have student role")

    # Get student profile
    student_profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()

    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Check if student is enrolled with this tutor
    enrollment = db.execute(
        text("""
            SELECT es.id, es.tutor_id, es.package_id, es.enrolled_at, es.created_at
            FROM enrolled_students es
            WHERE es.student_id = :student_id AND es.tutor_id = :tutor_id
            LIMIT 1
        """),
        {"student_id": student_profile.id, "tutor_id": tutor_id}
    ).first()

    if not enrollment:
        raise HTTPException(status_code=404, detail="Tutor relationship not found")

    # Get tutor profile
    tutor_profile = db.query(TutorProfile).filter(
        TutorProfile.id == tutor_id
    ).first()

    if not tutor_profile:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    # Get tutor user data
    tutor_user = db.query(User).filter(User.id == tutor_profile.user_id).first()

    if not tutor_user:
        raise HTTPException(status_code=404, detail="Tutor user not found")

    # Get package name if package_id exists
    package_name = None
    if enrollment.package_id:
        package_result = db.execute(
            text("SELECT name FROM tutor_packages WHERE id = :package_id"),
            {"package_id": enrollment.package_id}
        ).first()
        if package_result:
            package_name = package_result.name

    # Get tutor rating from tutor_reviews
    avg_metrics = db.execute(
        text("""
            SELECT
                AVG(overall_rating) as overall_rating,
                COUNT(*) as total_reviews,
                AVG(subject_matter_expertise) as subject_matter_expertise,
                AVG(communication_skills) as communication_skills,
                AVG(discipline) as discipline,
                AVG(punctuality) as punctuality
            FROM tutor_reviews
            WHERE tutor_id = :tutor_id
        """),
        {"tutor_id": tutor_id}
    ).first()

    calculated_rating = round(avg_metrics.overall_rating, 1) if avg_metrics and avg_metrics.overall_rating else 0.0
    rating_count = avg_metrics.total_reviews if avg_metrics else 0

    return {
        "id": tutor_profile.id,
        "tutor_id": tutor_profile.id,
        "user_id": tutor_user.id,
        "first_name": tutor_user.first_name,
        "father_name": tutor_user.father_name,
        "full_name": f"{tutor_user.first_name} {tutor_user.father_name}",
        "username": tutor_profile.username,
        "profile_picture": tutor_profile.profile_picture or tutor_user.profile_picture,
        "bio": tutor_profile.bio,
        "quote": tutor_profile.quote,
        "gender": tutor_user.gender,
        "location": tutor_profile.location,
        "rating": calculated_rating,
        "rating_count": rating_count,
        "rating_breakdown": {
            "subject_matter_expertise": round(avg_metrics.subject_matter_expertise, 1) if avg_metrics and avg_metrics.subject_matter_expertise else 0.0,
            "communication_skills": round(avg_metrics.communication_skills, 1) if avg_metrics and avg_metrics.communication_skills else 0.0,
            "discipline": round(avg_metrics.discipline, 1) if avg_metrics and avg_metrics.discipline else 0.0,
            "punctuality": round(avg_metrics.punctuality, 1) if avg_metrics and avg_metrics.punctuality else 0.0
        },
        "price": getattr(tutor_profile, 'hourly_rate', 0) or 0,
        "hourly_rate": getattr(tutor_profile, 'hourly_rate', None),
        "currency": "ETB",
        "courses": [],  # Column removed
        "subjects": [],  # Column removed
        "languages": tutor_profile.languages or [],
        "grades": [],  # Column removed
        "education_level": getattr(tutor_profile, 'education_level', None),
        "experience": None,  # Column removed
        "teaches_at": None,  # Column removed
        "specialization": getattr(tutor_profile, 'specialization', None),
        "course_type": None,  # Column removed
        "teaching_type": getattr(tutor_profile, 'teaching_type', None),
        "sessionFormat": None,  # Column removed
        "session_format": None,  # Column removed
        "availability_status": tutor_profile.availability_status or "Available",
        "is_verified": tutor_profile.is_verified,
        "is_premium": tutor_profile.is_premium,
        # Enrollment info
        "package_name": package_name,
        "package_id": enrollment.package_id,
        "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
        "enrollment_date": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None
    }

# ============================================
# STUDENT COURSES ENDPOINTS
# Fetch enrolled courses with full data for My Courses panel
# ============================================

@router.get("/api/student/courses")
def get_student_courses(
    status: Optional[str] = Query(default=None, description="Filter by status: all, active, completed, upcoming"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get enrolled courses for the current student from enrolled_courses table.
    Returns complete course data with tutor info for the courses grid."""
    # Check if user has student role
    if "student" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have student role")

    # Get student profile
    student_profile = db.query(StudentProfile).filter(
        StudentProfile.user_id == current_user.id
    ).first()

    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Build status filter
    status_filter = ""
    if status and status.lower() != "all":
        if status.lower() == "active":
            status_filter = "AND (ec.status = 'active' OR ec.status IS NULL)"
        elif status.lower() == "completed":
            status_filter = "AND ec.status = 'completed'"
        elif status.lower() == "upcoming":
            status_filter = "AND ec.status = 'upcoming'"

    # Get enrolled courses where student is in the students_id array
    query = f"""
        SELECT
            ec.id as enrollment_id,
            ec.tutor_id,
            ec.course_id,
            ec.package_id,
            ec.status,
            ec.enrolled_at,
            ec.schedule_type,
            ec.start_time,
            ec.end_time,
            ec.is_recurring,
            c.title as course_title,
            c.icon as course_icon,
            c.category as course_category,
            c.level as course_level,
            c.description as course_description,
            c.thumbnail as course_thumbnail,
            c.duration as course_duration,
            c.lessons as course_lessons,
            tp.id as tutor_profile_id,
            tp.username as tutor_username,
            tp.profile_picture as tutor_profile_picture,
            u.first_name as tutor_first_name,
            u.father_name as tutor_father_name
        FROM enrolled_courses ec
        LEFT JOIN courses c ON ec.course_id = c.id
        LEFT JOIN tutor_profiles tp ON ec.tutor_id = tp.id
        LEFT JOIN users u ON tp.user_id = u.id
        WHERE :student_id = ANY(ec.students_id)
        {status_filter}
        ORDER BY ec.enrolled_at DESC
    """

    enrolled_courses = db.execute(
        text(query),
        {"student_id": student_profile.id}
    ).fetchall()

    # Build response with complete course data
    result = []
    for course in enrolled_courses:
        # Get package info if exists
        package_name = None
        package_price = None
        if course.package_id:
            package_result = db.execute(
                text("SELECT name, hourly_rate FROM tutor_packages WHERE id = :package_id"),
                {"package_id": course.package_id}
            ).first()
            if package_result:
                package_name = package_result.name
                package_price = package_result.hourly_rate

        # Get tutor rating
        tutor_rating = db.execute(
            text("""
                SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
                FROM tutor_reviews
                WHERE tutor_id = :tutor_id
            """),
            {"tutor_id": course.tutor_id}
        ).first()

        # Calculate progress (placeholder - can be enhanced with actual session tracking)
        progress = 0
        if course.status == 'completed':
            progress = 100
        elif course.status == 'active':
            progress = 50  # Can be calculated from completed sessions vs total

        result.append({
            "id": course.enrollment_id,
            "enrollment_id": course.enrollment_id,
            "course_id": course.course_id,
            "course_title": course.course_title or "Untitled Course",
            "course_icon": course.course_icon or "📚",
            "course_category": course.course_category,
            "course_level": course.course_level,
            "course_description": course.course_description,
            "course_thumbnail": course.course_thumbnail,
            "course_duration": course.course_duration,
            "course_lessons": course.course_lessons or 0,
            "status": course.status or "active",
            "progress": progress,
            "enrolled_at": course.enrolled_at.isoformat() if course.enrolled_at else None,
            "schedule_type": course.schedule_type,
            "start_time": str(course.start_time) if course.start_time else None,
            "end_time": str(course.end_time) if course.end_time else None,
            "is_recurring": course.is_recurring,
            # Tutor info
            "tutor_id": course.tutor_id,
            "tutor_name": f"{course.tutor_first_name or ''} {course.tutor_father_name or ''}".strip() or "Unknown Tutor",
            "tutor_username": course.tutor_username,
            "tutor_profile_picture": course.tutor_profile_picture,
            "tutor_rating": round(tutor_rating.avg_rating, 1) if tutor_rating and tutor_rating.avg_rating else 0.0,
            "tutor_review_count": tutor_rating.review_count if tutor_rating else 0,
            # Package info
            "package_id": course.package_id,
            "package_name": package_name,
            "package_price": package_price
        })

    return {
        "courses": result,
        "total": len(result),
        "student_id": student_profile.id
    }

@router.get("/api/student/{student_id}")
def get_student_by_id(student_id: int, by_user_id: bool = Query(False), db: Session = Depends(get_db)):
    """
    Get specific student profile by ID (public view)

    Args:
        student_id: Can be either student_profile.id or user.id (depending on by_user_id parameter)
        by_user_id: If True, treats student_id as user.id instead of student_profile.id
    """
    if by_user_id:
        # Lookup by user.id
        student = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
    else:
        # Lookup by student_profile.id
        student = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    user = db.query(User).filter(User.id == student.user_id).first()

    return {
        "id": student.id,
        "user_id": student.user_id,
        "username": student.username,  # Role-specific username from student_profiles
        "first_name": user.first_name if user else None,
        "father_name": user.father_name if user else None,
        "grandfather_name": user.grandfather_name if user else None,
        "email": user.email if user else None,
        "phone": user.phone if user else None,
        "gender": user.gender if user else None,
        "profile_picture": student.profile_picture,
        "cover_image": student.cover_image,
        "about": student.about,  # Fixed: was 'bio', now 'about'
        "quote": student.quote if student.quote else [],  # Array field
        "location": student.location,
        "grade_level": student.grade_level,
        "studying_at": student.studying_at,
        "career_aspirations": student.career_aspirations,
        "interested_in": student.interested_in if student.interested_in else [],  # Fixed: was 'subjects'
        "hobbies": student.hobbies if student.hobbies else [],
        "languages": student.languages if student.languages else [],  # Fixed: was 'preferred_languages'
        "learning_method": student.learning_method if student.learning_method else [],
        "hero_title": student.hero_title if student.hero_title else [],
        "hero_subtitle": student.hero_subtitle if student.hero_subtitle else [],
        "joined": user.created_at.strftime("%B %Y") if user and user.created_at else None
    }

@router.put("/api/student/profile")
def update_student_profile(
    profile_data: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update student profile"""
    # DEBUG: Print incoming data
    print("\n" + "="*80)
    print("🔍 ROUTES.PY - INCOMING PROFILE DATA:")
    print(f"Data keys: {list(profile_data.keys())}")
    print(f"Full data: {profile_data}")
    print("="*80 + "\n")

    # Get student profile
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Update user fields (name, email, phone - shared across all roles)
    if "first_name" in profile_data:
        current_user.first_name = profile_data["first_name"]
    if "father_name" in profile_data:
        current_user.father_name = profile_data["father_name"]
    if "grandfather_name" in profile_data:
        current_user.grandfather_name = profile_data["grandfather_name"]
    if "email" in profile_data:
        current_user.email = profile_data["email"]
    if "phone" in profile_data:
        current_user.phone = profile_data["phone"]
    if "gender" in profile_data:
        current_user.gender = profile_data["gender"]

    # Update student profile fields (NEW SCHEMA - matching current database)
    if "username" in profile_data:
        student.username = profile_data["username"]
    if "location" in profile_data:
        student.location = profile_data["location"]
    if "grade_level" in profile_data:
        student.grade_level = profile_data["grade_level"]

    # NEW FIELDS - matching student_profiles table structure
    if "studying_at" in profile_data:
        student.studying_at = profile_data["studying_at"]
    if "about" in profile_data:
        student.about = profile_data["about"]
    if "quote" in profile_data:
        student.quote = profile_data["quote"]
    if "hero_title" in profile_data:
        student.hero_title = profile_data["hero_title"]
    if "hero_subtitle" in profile_data:
        student.hero_subtitle = profile_data["hero_subtitle"]
    if "interested_in" in profile_data:
        student.interested_in = profile_data["interested_in"]
    if "hobbies" in profile_data:
        student.hobbies = profile_data["hobbies"]
    if "languages" in profile_data:
        student.languages = profile_data["languages"]
    if "learning_method" in profile_data:
        student.learning_method = profile_data["learning_method"]

    # Commit changes
    db.commit()
    db.refresh(student)

    print("✅ ROUTES.PY - Profile updated successfully!")
    print(f"   - studying_at: {student.studying_at}")
    print(f"   - about: {student.about}")
    print(f"   - interested_in: {student.interested_in}")
    print("="*80 + "\n")

    return {
        "message": "Profile updated successfully",
        "id": student.id
    }

@router.get("/api/student/{student_id}/reviews")
async def get_student_reviews(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all reviews for a specific student with calculated rating
    Rating = average of (subject_matter_expertise + communication_skills + discipline + punctuality + class_activity) / 5
    """
    try:
        # Query to get all reviews for the student with reviewer information
        reviews_query = db.query(
            StudentReview.id,
            StudentReview.student_id,
            StudentReview.reviewer_id,
            User.first_name.label('reviewer_first_name'),
            User.father_name.label('reviewer_father_name'),
            User.profile_picture.label('reviewer_picture'),
            StudentReview.subject_matter_expertise,
            StudentReview.communication_skills,
            StudentReview.discipline,
            StudentReview.punctuality,
            StudentReview.class_activity,
            StudentReview.rating,
            StudentReview.review_text,
            StudentReview.created_at
        ).join(
            User, StudentReview.reviewer_id == User.id
        ).filter(
            StudentReview.student_id == student_id
        ).order_by(
            desc(StudentReview.created_at)
        )

        reviews_data = reviews_query.all()

        # Build reviews list
        reviews = []
        total_rating = 0
        category_sums = {
            'subject_matter_expertise': 0,
            'communication_skills': 0,
            'discipline': 0,
            'punctuality': 0,
            'class_activity': 0
        }

        for review in reviews_data:
            reviewer_name = f"{review.reviewer_first_name} {review.reviewer_father_name}"

            review_dict = {
                "id": review.id,
                "student_id": review.student_id,
                "reviewer_id": review.reviewer_id,
                "reviewer_name": reviewer_name,
                "reviewer_picture": review.reviewer_picture or '../uploads/system_images/system_profile_pictures/default-avatar.png',
                "subject_matter_expertise": float(review.subject_matter_expertise) if review.subject_matter_expertise else 0.0,
                "communication_skills": float(review.communication_skills) if review.communication_skills else 0.0,
                "discipline": float(review.discipline) if review.discipline else 0.0,
                "punctuality": float(review.punctuality) if review.punctuality else 0.0,
                "class_activity": float(review.class_activity) if review.class_activity else 0.0,
                "comment": review.review_text or "",
                "created_at": review.created_at.isoformat() if review.created_at else None,
                "rating": float(review.rating) if review.rating else 0.0
            }
            reviews.append(review_dict)

            # Accumulate for averages
            total_rating += review_dict["rating"]
            category_sums['subject_matter_expertise'] += review_dict['subject_matter_expertise']
            category_sums['communication_skills'] += review_dict['communication_skills']
            category_sums['discipline'] += review_dict['discipline']
            category_sums['punctuality'] += review_dict['punctuality']
            category_sums['class_activity'] += review_dict['class_activity']

        review_count = len(reviews)

        # Calculate averages
        overall_rating = round(total_rating / review_count, 1) if review_count > 0 else 0.0
        category_averages = {
            key: round(value / review_count, 1) if review_count > 0 else 0.0
            for key, value in category_sums.items()
        }

        return {
            "success": True,
            "reviews": reviews,
            "total": review_count,
            "overall_rating": overall_rating,
            "category_averages": category_averages
        }

    except Exception as e:
        print(f"Error fetching student reviews: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch student reviews: {str(e)}"
        )

# ============================================
# CONNECTIONS ENDPOINTS
# ============================================

# DEPRECATED - This endpoint has been moved to connection_endpoints.py
# Using the new universal Connection model instead of TutorConnection
# @router.get("/api/connections")
# def get_connections(filter: str = Query("all"), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
#     """Get connections for current user"""
#     # This old endpoint used deprecated TutorConnection model
#     # New endpoint in connection_endpoints.py uses Connection model with Astegni terminology
#     pass

# ============================================
# PARENT PROFILE ENDPOINTS
# ============================================

@router.get("/api/parent/profile")
async def get_parent_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's parent profile"""
    # Check if user has parent role
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    # Get or create parent profile
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        # Create new parent profile (username will be set later by user)
        parent_profile = ParentProfile(
            user_id=current_user.id,
            username=None,  # Username no longer in users table, will be set in parent_profiles
            relationship_type="Parent"
        )
        db.add(parent_profile)
        db.commit()
        db.refresh(parent_profile)

    # Build response with user data
    response = {
        "id": parent_profile.id,
        "user_id": parent_profile.user_id,
        "username": parent_profile.username,  # Username from parent_profiles table only
        "name": f"{current_user.first_name} {current_user.father_name}",
        "bio": parent_profile.bio,
        "quote": parent_profile.quote,
        "relationship_type": parent_profile.relationship_type,
        "location": parent_profile.location,
        "education_focus": parent_profile.education_focus,
        "email": current_user.email,
        "phone": current_user.phone,
        "total_children": parent_profile.total_children,
        "active_children": parent_profile.active_children,
        "rating": parent_profile.rating,
        "rating_count": parent_profile.rating_count,
        "is_verified": parent_profile.is_verified,
        "profile_picture": parent_profile.profile_picture,
        "cover_image": parent_profile.cover_image,
        "created_at": parent_profile.created_at,
        "updated_at": parent_profile.updated_at
    }

    return response

@router.put("/api/parent/profile")
async def update_parent_profile(
    profile_data: ParentProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update parent profile"""
    # Check if user has parent role
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    # Get parent profile
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    # Update parent profile fields
    update_data = profile_data.dict(exclude_unset=True)

    # Handle user fields separately
    user_fields = ['name', 'email', 'phone']
    user_update_data = {}

    for field in user_fields:
        if field in update_data:
            user_update_data[field] = update_data.pop(field)

    # Update user fields if provided
    if 'name' in user_update_data:
        name_parts = user_update_data['name'].split(' ', 1)
        current_user.first_name = name_parts[0]
        if len(name_parts) > 1:
            current_user.father_name = name_parts[1]

    if 'email' in user_update_data:
        # Check if email is already taken
        existing_user = db.query(User).filter(
            User.email == user_update_data['email'],
            User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = user_update_data['email']

    if 'phone' in user_update_data:
        # Check if phone is already taken
        existing_user = db.query(User).filter(
            User.phone == user_update_data['phone'],
            User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Phone number already in use")
        current_user.phone = user_update_data['phone']

    # Update parent profile fields
    for key, value in update_data.items():
        if hasattr(parent_profile, key):
            setattr(parent_profile, key, value)

    # Calculate profile completion
    completion = 0
    total_fields = 10
    if parent_profile.bio: completion += 1
    if parent_profile.quote: completion += 1
    if parent_profile.relationship_type: completion += 1
    if parent_profile.location: completion += 1
    if parent_profile.education_focus: completion += 1
    if parent_profile.profile_picture: completion += 1
    if parent_profile.cover_image: completion += 1
    if current_user.email: completion += 1
    if current_user.phone: completion += 1
    if parent_profile.username: completion += 1

    parent_profile.profile_completion = (completion / total_fields) * 100
    parent_profile.profile_complete = parent_profile.profile_completion >= 80

    db.commit()
    db.refresh(parent_profile)

    return {"message": "Profile updated successfully", "id": parent_profile.id}

@router.get("/api/parent/{parent_id}")
async def get_parent_by_id(
    parent_id: int,
    by_user_id: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Get specific parent profile (public view)

    Args:
        parent_id: Can be either parent_profile.id or user.id (depending on by_user_id parameter)
        by_user_id: If True, treats parent_id as user.id instead of parent_profile.id
    """
    if by_user_id:
        # Lookup by user.id
        parent_profile = db.query(ParentProfile).filter(
            ParentProfile.user_id == parent_id
        ).first()
    else:
        # Lookup by parent_profile.id
        parent_profile = db.query(ParentProfile).filter(
            ParentProfile.id == parent_id
        ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    user = db.query(User).filter(User.id == parent_profile.user_id).first()

    response = {
        "id": parent_profile.id,
        "username": parent_profile.username,
        "name": f"{user.first_name} {user.father_name}" if user else None,
        "bio": parent_profile.bio,
        "quote": parent_profile.quote,
        "relationship_type": parent_profile.relationship_type,
        "location": parent_profile.location,
        "rating": parent_profile.rating,
        "rating_count": parent_profile.rating_count,
        "is_verified": parent_profile.is_verified,
        "profile_picture": parent_profile.profile_picture,
        "cover_image": parent_profile.cover_image,
        "total_children": parent_profile.total_children,
        # Include user contact info
        "email": user.email if user else None,
        "phone": user.phone if user else None,
        # Occupation not in schema - will always be None unless added to ParentProfile table
        "occupation": None
    }

    return response

# ============================================
# CHILD MANAGEMENT ENDPOINTS
# ============================================

@router.post("/api/parent/children")
async def register_child(
    child_data: ChildProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register a new child"""
    # Check if user has parent role
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    # Get parent profile
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    # Create new child profile
    new_child = ChildProfile(
        parent_id=parent_profile.id,
        name=child_data.name,
        date_of_birth=child_data.date_of_birth,
        gender=child_data.gender,
        grade=child_data.grade,
        school_name=child_data.school_name,
        courses=child_data.courses or [],
        profile_picture=child_data.profile_picture
    )

    db.add(new_child)

    # Update parent statistics
    parent_profile.total_children += 1
    parent_profile.active_children += 1

    db.commit()
    db.refresh(new_child)

    return {
        "message": "Child registered successfully",
        "child": ChildProfileResponse.from_orm(new_child)
    }

@router.get("/api/parent/children")
async def get_children(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all children for current parent"""
    # Check if user has parent role
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    # Get parent profile
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    # Get all active children
    children = db.query(ChildProfile).filter(
        ChildProfile.parent_id == parent_profile.id,
        ChildProfile.is_active == True
    ).all()

    return [ChildProfileResponse.from_orm(child) for child in children]

@router.get("/api/parent/children/{child_id}")
async def get_child_by_id(
    child_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific child details"""
    # Check if user has parent role
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    # Get parent profile
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    # Get child
    child = db.query(ChildProfile).filter(
        ChildProfile.id == child_id,
        ChildProfile.parent_id == parent_profile.id
    ).first()

    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    return ChildProfileResponse.from_orm(child)

@router.put("/api/parent/children/{child_id}")
async def update_child(
    child_id: int,
    child_data: ChildProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update child information"""
    # Check if user has parent role
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    # Get parent profile
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    # Get child
    child = db.query(ChildProfile).filter(
        ChildProfile.id == child_id,
        ChildProfile.parent_id == parent_profile.id
    ).first()

    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    # Update child fields
    update_data = child_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(child, key):
            setattr(child, key, value)

    db.commit()
    db.refresh(child)

    return {"message": "Child updated successfully", "child": ChildProfileResponse.from_orm(child)}

@router.delete("/api/parent/children/{child_id}")
async def delete_child(
    child_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove/unregister a child"""
    # Check if user has parent role
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    # Get parent profile
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    # Get child
    child = db.query(ChildProfile).filter(
        ChildProfile.id == child_id,
        ChildProfile.parent_id == parent_profile.id
    ).first()

    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    # Soft delete - just mark as inactive
    child.is_active = False

    # Update parent statistics
    if parent_profile.active_children > 0:
        parent_profile.active_children -= 1

    db.commit()

    return {"message": "Child removed successfully"}

# ============================================
# ADVERTISER PROFILE ENDPOINTS
# ============================================

@router.get("/api/advertiser/profile")
async def get_advertiser_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's advertiser profile"""
    from models import AdvertiserProfile

    # Check if user has advertiser role
    if "advertiser" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have advertiser role")

    # Get or create advertiser profile
    advertiser_profile = db.query(AdvertiserProfile).filter(
        AdvertiserProfile.user_id == current_user.id
    ).first()

    if not advertiser_profile:
        # Create new advertiser profile (username will be set later by user)
        advertiser_profile = AdvertiserProfile(
            user_id=current_user.id,
            username=None,  # Username no longer in users table, will be set in advertiser_profiles
            company_name=f"{current_user.first_name} {current_user.father_name} Inc."
        )
        db.add(advertiser_profile)
        db.commit()
        db.refresh(advertiser_profile)

    # Build response
    response = AdvertiserProfileResponse.from_orm(advertiser_profile)
    return response

@router.put("/api/advertiser/profile")
async def update_advertiser_profile(
    profile_data: AdvertiserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update advertiser profile"""
    from models import AdvertiserProfile

    # Check if user has advertiser role
    if "advertiser" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have advertiser role")

    # Get advertiser profile
    advertiser_profile = db.query(AdvertiserProfile).filter(
        AdvertiserProfile.user_id == current_user.id
    ).first()

    if not advertiser_profile:
        raise HTTPException(status_code=404, detail="Advertiser profile not found")

    # Update profile fields
    update_data = profile_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(advertiser_profile, key):
            setattr(advertiser_profile, key, value)

    db.commit()
    db.refresh(advertiser_profile)

    return {"message": "Profile updated successfully", "id": advertiser_profile.id}

@router.get("/api/advertiser/{advertiser_id}")
async def get_advertiser_by_id(
    advertiser_id: int,
    db: Session = Depends(get_db)
):
    """Get specific advertiser profile (public view)"""
    from models import AdvertiserProfile

    advertiser_profile = db.query(AdvertiserProfile).filter(
        AdvertiserProfile.id == advertiser_id
    ).first()

    if not advertiser_profile:
        raise HTTPException(status_code=404, detail="Advertiser profile not found")

    return AdvertiserProfileResponse.from_orm(advertiser_profile)

# ============================================
# AD CAMPAIGN ENDPOINTS
# ============================================

@router.post("/api/upload/campaign-media")
async def upload_campaign_media(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload campaign media (image or video) to Backblaze B2"""
    try:
        # Check if user has advertiser role
        if "advertiser" not in current_user.roles:
            raise HTTPException(status_code=403, detail="User does not have advertiser role")

        # Validate file
        if not file.content_type:
            raise HTTPException(status_code=400, detail="Invalid file type")

        # Check if it's image or video
        is_image = file.content_type.startswith('image/')
        is_video = file.content_type.startswith('video/')

        if not is_image and not is_video:
            raise HTTPException(status_code=400, detail="File must be an image or video")

        # Read file contents
        file_contents = await file.read()

        # Validate file size
        if is_image and len(file_contents) > 5 * 1024 * 1024:  # 5MB for images
            raise HTTPException(status_code=400, detail="Image size exceeds 5MB limit")

        if is_video and len(file_contents) > 200 * 1024 * 1024:  # 200MB for videos
            raise HTTPException(status_code=400, detail="Video size exceeds 200MB limit")

        # Get Backblaze service
        b2_service = get_backblaze_service()

        # Determine file type for B2 organization
        file_type = 'campaign_image' if is_image else 'campaign_video'

        # Upload to Backblaze with user separation
        result = b2_service.upload_file(
            file_data=file_contents,
            file_name=file.filename,
            file_type=file_type,
            user_id=current_user.id
        )

        if not result:
            raise HTTPException(status_code=500, detail="File upload failed")

        return {
            "success": True,
            "message": f"Campaign {'image' if is_image else 'video'} uploaded successfully",
            "url": result['url'],
            "file_name": result['fileName'],
            "file_type": 'image' if is_image else 'video',
            "details": result
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")


@router.post("/api/advertiser/campaigns")
async def create_campaign(
    campaign_data: AdCampaignCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new ad campaign"""
    from models import AdvertiserProfile, AdCampaign

    # Check if user has advertiser role
    if "advertiser" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have advertiser role")

    # Get advertiser profile
    advertiser_profile = db.query(AdvertiserProfile).filter(
        AdvertiserProfile.user_id == current_user.id
    ).first()

    if not advertiser_profile:
        raise HTTPException(status_code=404, detail="Advertiser profile not found")

    # Create new campaign with pending verification status
    new_campaign = AdCampaign(
        advertiser_id=advertiser_profile.id,
        name=campaign_data.name,
        description=campaign_data.description,
        objective=campaign_data.objective,
        start_date=campaign_data.start_date,
        end_date=campaign_data.end_date,
        target_audience=campaign_data.target_audience,
        locations=campaign_data.locations,
        ad_type=campaign_data.ad_type,
        ad_copy=campaign_data.ad_copy,
        call_to_action=campaign_data.call_to_action,
        landing_page_url=campaign_data.landing_page_url,
        creative_urls=campaign_data.creative_urls,
        is_verified=False,
        verification_status="pending"
    )

    db.add(new_campaign)

    # Update advertiser statistics
    advertiser_profile.total_campaigns += 1

    db.commit()
    db.refresh(new_campaign)

    return {
        "message": "Campaign submitted for verification successfully",
        "campaign": AdCampaignResponse.from_orm(new_campaign)
    }

@router.get("/api/advertiser/campaigns")
async def get_campaigns(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all campaigns for current advertiser"""
    from models import AdvertiserProfile, AdCampaign

    # Check if user has advertiser role
    if "advertiser" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have advertiser role")

    # Get advertiser profile
    advertiser_profile = db.query(AdvertiserProfile).filter(
        AdvertiserProfile.user_id == current_user.id
    ).first()

    if not advertiser_profile:
        raise HTTPException(status_code=404, detail="Advertiser profile not found")

    # Build query
    query = db.query(AdCampaign).filter(AdCampaign.advertiser_id == advertiser_profile.id)

    # Filter by status if provided
    if status:
        query = query.filter(AdCampaign.status == status)

    # Order by created_at descending
    query = query.order_by(desc(AdCampaign.created_at))

    # Get total count
    total = query.count()

    # Apply pagination
    offset = (page - 1) * limit
    campaigns = query.offset(offset).limit(limit).all()

    return {
        "campaigns": [AdCampaignResponse.from_orm(c) for c in campaigns],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0
    }

@router.get("/api/advertiser/campaigns/{campaign_id}")
async def get_campaign_by_id(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific campaign details"""
    from models import AdvertiserProfile, AdCampaign

    # Get advertiser profile
    advertiser_profile = db.query(AdvertiserProfile).filter(
        AdvertiserProfile.user_id == current_user.id
    ).first()

    if not advertiser_profile:
        raise HTTPException(status_code=404, detail="Advertiser profile not found")

    # Get campaign
    campaign = db.query(AdCampaign).filter(
        AdCampaign.id == campaign_id,
        AdCampaign.advertiser_id == advertiser_profile.id
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    return AdCampaignResponse.from_orm(campaign)

@router.put("/api/advertiser/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: int,
    campaign_data: AdCampaignUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update campaign details"""
    from models import AdvertiserProfile, AdCampaign

    # Get advertiser profile
    advertiser_profile = db.query(AdvertiserProfile).filter(
        AdvertiserProfile.user_id == current_user.id
    ).first()

    if not advertiser_profile:
        raise HTTPException(status_code=404, detail="Advertiser profile not found")

    # Get campaign
    campaign = db.query(AdCampaign).filter(
        AdCampaign.id == campaign_id,
        AdCampaign.advertiser_id == advertiser_profile.id
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Don't allow editing active campaigns
    if campaign.status == "active" and campaign_data.status != "paused":
        raise HTTPException(status_code=400, detail="Cannot edit active campaign. Pause it first.")

    # Update campaign fields
    update_data = campaign_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(campaign, key):
            setattr(campaign, key, value)

    db.commit()
    db.refresh(campaign)

    return {"message": "Campaign updated successfully", "campaign": AdCampaignResponse.from_orm(campaign)}

@router.delete("/api/advertiser/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a campaign"""
    from models import AdvertiserProfile, AdCampaign

    # Get advertiser profile
    advertiser_profile = db.query(AdvertiserProfile).filter(
        AdvertiserProfile.user_id == current_user.id
    ).first()

    if not advertiser_profile:
        raise HTTPException(status_code=404, detail="Advertiser profile not found")

    # Get campaign
    campaign = db.query(AdCampaign).filter(
        AdCampaign.id == campaign_id,
        AdCampaign.advertiser_id == advertiser_profile.id
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Don't allow deleting active campaigns
    if campaign.status == "active":
        raise HTTPException(status_code=400, detail="Cannot delete active campaign. Pause it first.")

    # Refund budget if campaign hasn't started
    if campaign.status == "draft" or campaign.status == "scheduled":
        unspent = campaign.budget - campaign.spent
        advertiser_profile.available_budget += unspent

    # Delete campaign
    db.delete(campaign)
    advertiser_profile.total_campaigns -= 1

    db.commit()

    return {"message": "Campaign deleted successfully"}

@router.put("/api/advertiser/campaigns/{campaign_id}/metrics")
async def update_campaign_metrics(
    campaign_id: int,
    metrics_data: CampaignMetricsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update campaign performance metrics"""
    from models import AdvertiserProfile, AdCampaign

    # Get advertiser profile
    advertiser_profile = db.query(AdvertiserProfile).filter(
        AdvertiserProfile.user_id == current_user.id
    ).first()

    if not advertiser_profile:
        raise HTTPException(status_code=404, detail="Advertiser profile not found")

    # Get campaign
    campaign = db.query(AdCampaign).filter(
        AdCampaign.id == campaign_id,
        AdCampaign.advertiser_id == advertiser_profile.id
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Update metrics
    update_data = metrics_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(campaign, key):
            setattr(campaign, key, value)

    # Recalculate derived metrics
    if campaign.impressions > 0:
        campaign.ctr = round((campaign.clicks / campaign.impressions) * 100, 2)
        campaign.engagement_rate = round((campaign.likes / campaign.impressions) * 100, 2)

    if campaign.clicks > 0:
        campaign.conversion_rate = round((campaign.conversions / campaign.clicks) * 100, 2)
        campaign.cost_per_click = round(campaign.spent / campaign.clicks, 2)

    if campaign.conversions > 0:
        campaign.cost_per_conversion = round(campaign.spent / campaign.conversions, 2)

    # Determine performance grade
    if campaign.ctr >= 5 and campaign.conversion_rate >= 10:
        campaign.performance = "excellent"
    elif campaign.ctr >= 3 and campaign.conversion_rate >= 5:
        campaign.performance = "good"
    elif campaign.ctr >= 1:
        campaign.performance = "average"
    else:
        campaign.performance = "poor"

    # Update advertiser aggregated stats
    _update_advertiser_stats(db, advertiser_profile)

    db.commit()
    db.refresh(campaign)

    return {"message": "Metrics updated successfully", "campaign": AdCampaignResponse.from_orm(campaign)}

@router.get("/api/advertiser/analytics")
async def get_advertiser_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get aggregated analytics for advertiser"""
    from models import AdvertiserProfile, AdCampaign

    # Check if user has advertiser role
    if "advertiser" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have advertiser role")

    # Get advertiser profile
    advertiser_profile = db.query(AdvertiserProfile).filter(
        AdvertiserProfile.user_id == current_user.id
    ).first()

    if not advertiser_profile:
        raise HTTPException(status_code=404, detail="Advertiser profile not found")

    # Get all campaigns
    campaigns = db.query(AdCampaign).filter(
        AdCampaign.advertiser_id == advertiser_profile.id
    ).all()

    # Calculate campaigns by status
    campaigns_by_status = {}
    for campaign in campaigns:
        status = campaign.status
        campaigns_by_status[status] = campaigns_by_status.get(status, 0) + 1

    # Get top performing campaigns
    top_campaigns = db.query(AdCampaign).filter(
        AdCampaign.advertiser_id == advertiser_profile.id,
        AdCampaign.status.in_(["active", "completed"])
    ).order_by(desc(AdCampaign.conversions)).limit(5).all()

    return AdvertiserAnalyticsResponse(
        total_campaigns=advertiser_profile.total_campaigns,
        active_campaigns=advertiser_profile.active_campaigns,
        total_impressions=advertiser_profile.total_impressions,
        total_clicks=advertiser_profile.total_clicks,
        total_conversions=advertiser_profile.total_conversions,
        total_likes=advertiser_profile.total_likes,
        total_followers=advertiser_profile.total_followers,
        total_spent=advertiser_profile.total_spent,
        average_ctr=advertiser_profile.average_ctr,
        average_conversion_rate=advertiser_profile.average_conversion_rate,
        success_rate=advertiser_profile.success_rate,
        campaigns_by_status=campaigns_by_status,
        top_performing_campaigns=[AdCampaignResponse.from_orm(c) for c in top_campaigns]
    )

# Helper function to update advertiser aggregated statistics
def _update_advertiser_stats(db: Session, advertiser_profile):
    """Helper function to recalculate and update advertiser aggregated stats"""
    from models import AdCampaign

    # Get all campaigns
    campaigns = db.query(AdCampaign).filter(
        AdCampaign.advertiser_id == advertiser_profile.id
    ).all()

    # Reset stats
    advertiser_profile.total_impressions = 0
    advertiser_profile.total_clicks = 0
    advertiser_profile.total_conversions = 0
    advertiser_profile.total_likes = 0
    advertiser_profile.total_followers = 0
    advertiser_profile.total_spent = 0
    advertiser_profile.active_campaigns = 0

    # Aggregate
    total_ctr = 0
    total_conversion_rate = 0
    successful_campaigns = 0

    for campaign in campaigns:
        advertiser_profile.total_impressions += campaign.impressions
        advertiser_profile.total_clicks += campaign.clicks
        advertiser_profile.total_conversions += campaign.conversions
        advertiser_profile.total_likes += campaign.likes
        advertiser_profile.total_followers += campaign.followers
        advertiser_profile.total_spent += campaign.spent

        if campaign.status == "active":
            advertiser_profile.active_campaigns += 1

        if campaign.ctr > 0:
            total_ctr += campaign.ctr

        if campaign.conversion_rate > 0:
            total_conversion_rate += campaign.conversion_rate

        if campaign.performance in ["excellent", "good"]:
            successful_campaigns += 1

    # Calculate averages
    campaign_count = len(campaigns) if campaigns else 1
    advertiser_profile.average_ctr = round(total_ctr / campaign_count, 2)
    advertiser_profile.average_conversion_rate = round(total_conversion_rate / campaign_count, 2)
    advertiser_profile.success_rate = round((successful_campaigns / campaign_count) * 100, 2) if campaign_count > 0 else 0

# ============================================
# TUTOR VERIFICATION ENDPOINTS (ADMIN)
# ============================================

@router.get("/api/admin/tutors/pending")
def get_pending_tutors(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100)
):
    """Get all pending tutor registration requests (admin only)"""
    # Admin authentication already handled by get_current_admin dependency

    # Query tutors with pending verification
    query = db.query(TutorProfile).join(User).filter(
        TutorProfile.verification_status == "pending"
    ).order_by(TutorProfile.created_at.desc())

    total_count = query.count()
    skip = (page - 1) * limit
    tutors = query.offset(skip).limit(limit).all()

    # Build response with tutor details
    tutor_list = []
    for tutor_profile in tutors:
        user = db.query(User).filter(User.id == tutor_profile.user_id).first()
        tutor_list.append({
            "id": tutor_profile.id,
            "user_id": tutor_profile.user_id,
            "name": f"{user.first_name} {user.father_name}" if user else "Unknown",
            "profile_picture": tutor_profile.profile_picture,
            "id_document_url": None,  # Column removed
            "teaches_at": None,  # Column removed
            "location": tutor_profile.location,
            "courses": [],  # Column removed
            "experience": None,  # Column removed
            "education_level": getattr(tutor_profile, 'education_level', None),
            "created_at": tutor_profile.created_at.isoformat() if tutor_profile.created_at else None,
            "verification_status": tutor_profile.verification_status
        })

    return {
        "tutors": tutor_list,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit
    }

@router.get("/api/admin/tutor/{tutor_id}/review")
def get_tutor_review_details(
    tutor_id: int,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get detailed tutor information for review (admin only)"""
    # Admin authentication is already verified by get_current_admin dependency

    tutor_profile = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor_profile:
        raise HTTPException(status_code=404, detail="Tutor not found")

    user = db.query(User).filter(User.id == tutor_profile.user_id).first()

    return {
        "id": tutor_profile.id,
        "user_id": tutor_profile.user_id,
        "name": f"{user.first_name} {user.father_name} {user.grandfather_name or ''}".strip() if user else "Unknown",
        "email": user.email if user else None,
        "phone": user.phone if user else None,
        "profile_picture": tutor_profile.profile_picture,
        "id_document_url": None,  # Column removed
        "teaches_at": None,  # Column removed
        "location": tutor_profile.location,
        "bio": tutor_profile.bio,
        "courses": [],  # Column removed
        "grades": [],  # Column removed
        "languages": tutor_profile.languages,
        "experience": None,  # Column removed
        "education_level": tutor_profile.education_level,
        "certifications": tutor_profile.certifications,
        "sessionFormat": None,  # Column removed
        "price": tutor_profile.price,
        "currency": tutor_profile.currency,
        "verification_status": tutor_profile.verification_status,
        "rejection_reason": tutor_profile.rejection_reason,
        "created_at": tutor_profile.created_at.isoformat() if tutor_profile.created_at else None
    }

@router.post("/api/admin/tutor/{tutor_id}/verify")
def verify_tutor(
    tutor_id: int,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Approve/verify a tutor (admin only)"""
    # Admin authentication is already verified by get_current_admin dependency

    tutor_profile = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor_profile:
        raise HTTPException(status_code=404, detail="Tutor not found")

    # Update verification status
    tutor_profile.is_verified = True
    tutor_profile.verification_status = "verified"
    tutor_profile.verified_at = datetime.utcnow()
    tutor_profile.verified_by = current_admin["id"]  # Use admin_id from token
    tutor_profile.rejection_reason = None  # Clear any previous rejection reason

    db.commit()

    return {
        "success": True,
        "message": "Tutor verified successfully",
        "tutor_id": tutor_id,
        "verification_status": "verified"
    }

@router.post("/api/admin/tutor/{tutor_id}/reject")
def reject_tutor(
    tutor_id: int,
    rejection_data: dict = Body(...),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Reject a tutor application with reason (admin only)"""
    # Admin authentication is already verified by get_current_admin dependency

    tutor_profile = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor_profile:
        raise HTTPException(status_code=404, detail="Tutor not found")

    rejection_reason = rejection_data.get("reason", "").strip()
    if not rejection_reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required")

    # Update verification status
    tutor_profile.is_verified = False
    tutor_profile.verification_status = "rejected"
    tutor_profile.rejection_reason = rejection_reason
    tutor_profile.verified_at = None
    tutor_profile.verified_by = current_admin["id"]  # Use admin_id from token

    db.commit()

    return {
        "success": True,
        "message": "Tutor rejected",
        "tutor_id": tutor_id,
        "verification_status": "rejected",
        "rejection_reason": rejection_reason
    }

@router.post("/api/admin/tutor/{tutor_id}/suspend")
def suspend_tutor(
    tutor_id: int,
    suspension_data: dict = Body(...),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Suspend a tutor (admin only)"""
    # Admin authentication is already verified by get_current_admin dependency

    tutor_profile = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor_profile:
        raise HTTPException(status_code=404, detail="Tutor not found")

    suspension_reason = suspension_data.get("reason", "").strip()
    if not suspension_reason:
        raise HTTPException(status_code=400, detail="Suspension reason is required")

    # Update suspension status
    tutor_profile.is_suspended = True
    tutor_profile.verification_status = "suspended"  # CRITICAL: Update verification_status
    tutor_profile.suspension_reason = suspension_reason
    tutor_profile.suspended_at = datetime.utcnow()
    tutor_profile.suspended_by = current_admin["id"]  # Use admin_id from token

    db.commit()

    return {
        "success": True,
        "message": "Tutor suspended",
        "tutor_id": tutor_id,
        "suspension_reason": suspension_reason
    }

@router.post("/api/admin/tutor/{tutor_id}/reinstate")
def reinstate_tutor(
    tutor_id: int,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Reinstate a suspended tutor (admin only)"""
    # Admin authentication is already verified by get_current_admin dependency

    tutor_profile = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor_profile:
        raise HTTPException(status_code=404, detail="Tutor not found")

    # Check if tutor is suspended (check both fields for robustness)
    if not tutor_profile.is_suspended and tutor_profile.verification_status != "suspended":
        raise HTTPException(status_code=400, detail="Tutor is not suspended")

    # Clear suspension and restore to verified status
    tutor_profile.is_suspended = False
    tutor_profile.is_verified = True
    tutor_profile.verification_status = "verified"  # CRITICAL: Restore verification_status
    tutor_profile.suspension_reason = None
    tutor_profile.suspended_at = None
    tutor_profile.suspended_by = None

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
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Reconsider a rejected tutor application and move back to pending (admin only)"""
    # Admin authentication is already verified by get_current_admin dependency

    tutor_profile = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor_profile:
        raise HTTPException(status_code=404, detail="Tutor not found")

    if tutor_profile.verification_status != "rejected":
        raise HTTPException(status_code=400, detail="Tutor is not in rejected status")

    # Clear rejection and move back to pending status
    tutor_profile.is_verified = False
    tutor_profile.verification_status = "pending"
    tutor_profile.rejection_reason = None
    tutor_profile.verified_at = None
    tutor_profile.verified_by = None

    db.commit()

    return {
        "success": True,
        "message": "Tutor application reconsidered successfully",
        "tutor_id": tutor_id,
        "verification_status": "pending"
    }

@router.get("/api/admin/tutors/verified")
def get_verified_tutors(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    search: str = Query(None)
):
    """Get all verified tutors (admin only)"""
    # Admin authentication already handled by get_current_admin dependency

    # Query verified tutors
    query = db.query(TutorProfile).join(User).filter(
        TutorProfile.verification_status == "verified",
        TutorProfile.is_active == True
    )

    # Add search if provided
    if search:
        search_filter = or_(
            User.first_name.ilike(f"%{search}%"),
            User.father_name.ilike(f"%{search}%"),
            TutorProfile.location.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)

    query = query.order_by(TutorProfile.rating.desc())

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
            "rating": tutor_profile.rating,
            "total_students": tutor_profile.total_students,
            "total_sessions": tutor_profile.total_sessions,
            "verified_at": tutor_profile.verified_at.isoformat() if tutor_profile.verified_at else None
        })

    return {
        "tutors": tutor_list,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit
    }

@router.get("/api/admin/tutors/rejected")
def get_rejected_tutors(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100)
):
    """Get all rejected tutors (admin only)"""
    # Admin authentication already handled by get_current_admin dependency

    # Query rejected tutors
    query = db.query(TutorProfile).join(User).filter(
        TutorProfile.verification_status == "rejected"
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
            "rejection_reason": tutor_profile.rejection_reason,
            "updated_at": tutor_profile.updated_at.isoformat() if tutor_profile.updated_at else None
        })

    return {
        "tutors": tutor_list,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit
    }

@router.get("/api/admin/tutors/suspended")
def get_suspended_tutors(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100)
):
    """Get all suspended tutors (admin only)"""
    # Admin authentication already handled by get_current_admin dependency

    # Query suspended tutors
    query = db.query(TutorProfile).join(User).filter(
        TutorProfile.verification_status == "suspended"
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
            "suspension_reason": tutor_profile.suspension_reason,
            "suspended_at": tutor_profile.suspended_at.isoformat() if tutor_profile.suspended_at else None,
            "verified_at": tutor_profile.verified_at.isoformat() if tutor_profile.verified_at else None,
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
# ADMIN TUTOR STATISTICS ENDPOINTS
# ============================================

@router.get("/api/admin/tutors/statistics")
def get_tutor_statistics(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get comprehensive tutor statistics for admin dashboard"""
    # Admin authentication already handled by get_current_admin dependency

    try:
        # Get counts by status (excluding not_verified)
        total_tutors = db.query(TutorProfile).filter(
            and_(
                TutorProfile.verification_status != 'not_verified',
                TutorProfile.verification_status != None
            )
        ).count()

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

        # Calculate archived (inactive for more than 6 months, excluding not_verified)
        six_months_ago = datetime.utcnow() - timedelta(days=180)
        archived_count = db.query(TutorProfile).filter(
            and_(
                TutorProfile.updated_at < six_months_ago,
                TutorProfile.verification_status != 'suspended',
                TutorProfile.verification_status != 'not_verified'
            )
        ).count()

        # Calculate approval rate
        total_processed = verified_count + rejected_count
        approval_rate = round((verified_count / total_processed * 100) if total_processed > 0 else 0)

        # Get today's approvals
        today = datetime.utcnow().date()
        today_approved = db.query(TutorProfile).filter(
            and_(
                func.date(TutorProfile.updated_at) == today,
                TutorProfile.verification_status == 'verified'
            )
        ).count()

        return {
            "pending": pending_count,
            "verified": verified_count,
            "rejected": rejected_count,
            "suspended": suspended_count,
            "archived": archived_count,
            "totalTutors": total_tutors,
            "approvalRate": approval_rate,
            "avgProcessingTime": "< 1hr",  # Mock data for now
            "clientSatisfaction": 96,  # Mock data for now
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

@router.get("/api/admin/tutors/recent-activity")
def get_recent_tutor_activity(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=50)
):
    """Get recent tutor registration activity for live updates widget"""
    # Admin authentication already handled by get_current_admin dependency

    try:
        # Get recent tutors ordered by creation/update time (excluding not_verified)
        recent_tutors = db.query(TutorProfile).filter(
            and_(
                TutorProfile.verification_status != 'not_verified',
                TutorProfile.verification_status != None
            )
        ).order_by(
            desc(TutorProfile.updated_at)
        ).limit(limit).all()

        activities = []
        for tutor in recent_tutors:
            # Get associated user if exists
            user = db.query(User).filter(User.id == tutor.user_id).first() if tutor.user_id else None

            # Courses column removed - return empty array
            courses = []

            # Build full name from user data
            tutor_name = None
            if user:
                if user.first_name and user.father_name:
                    tutor_name = f"{user.first_name} {user.father_name}"
                elif user.username:
                    tutor_name = user.username

            if not tutor_name:
                tutor_name = f"Tutor #{tutor.id}"

            activity = {
                "id": tutor.id,
                "name": tutor_name,
                "email": user.email if user else None,
                "phone": user.phone if user else None,
                "courses": courses,
                "location": tutor.location,
                "verification_status": tutor.verification_status or 'pending',
                "created_at": tutor.created_at.isoformat() if tutor.created_at else None,
                "updated_at": tutor.updated_at.isoformat() if tutor.updated_at else None,
                "profile_picture": tutor.profile_picture
            }
            activities.append(activity)

        return {
            "activities": activities,
            "tutors": activities,  # Also provide as tutors for compatibility
            "total": len(activities)
        }

    except Exception as e:
        print(f"Error fetching recent activity: {e}")
        return {
            "activities": [],
            "tutors": [],
            "total": 0
        }

# ============================================
# SCHOOL MANAGEMENT ENDPOINTS
# ============================================

@router.post("/api/schools/request", response_model=RequestedSchoolResponse)
async def create_school_request(
    school: RequestedSchoolCreate,
    db: Session = Depends(get_db)
):
    """Create a new school registration request"""

    # Check if email already exists
    existing = db.query(RequestedSchool).filter(RequestedSchool.email == school.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="School with this email already exists")

    # Check if email exists in other school tables
    if db.query(School).filter(School.email == school.email).first():
        raise HTTPException(status_code=400, detail="School with this email is already verified")

    # Create new request
    new_request = RequestedSchool(**school.model_dump())
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    return new_request

@router.get("/api/schools/requested", response_model=List[RequestedSchoolResponse])
async def get_requested_schools(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all school requests"""
    schools = db.query(RequestedSchool).offset(skip).limit(limit).all()
    return schools

@router.get("/api/schools/requested/{school_id}", response_model=RequestedSchoolResponse)
async def get_requested_school(
    school_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific school request"""
    school = db.query(RequestedSchool).filter(RequestedSchool.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School request not found")
    return school

@router.post("/api/schools/approve/{request_id}")
async def approve_school_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """Approve a school request and move to schools table"""

    # Check if admin has permission (manage-schools or manage-system-settings)
    allowed_departments = {"manage-schools", "manage-system-settings"}
    admin_departments = set(current_admin.get("departments", []))
    if not admin_departments.intersection(allowed_departments):
        raise HTTPException(status_code=403, detail="You don't have permission to approve schools")

    # Get the request
    request_school = db.query(RequestedSchool).filter(RequestedSchool.id == request_id).first()
    if not request_school:
        raise HTTPException(status_code=404, detail="School request not found")

    # Create approved school
    approved_school = School(
        school_name=request_school.school_name,
        school_type=request_school.school_type,
        school_level=request_school.school_level,
        location=request_school.location,
        email=request_school.email,
        phone=request_school.phone,
        students_count=request_school.students_count,
        documents=request_school.documents,
        approved_date=datetime.utcnow(),
        status="Verified"
    )

    db.add(approved_school)
    db.delete(request_school)
    db.commit()
    db.refresh(approved_school)

    return {
        "success": True,
        "message": "School approved successfully",
        "school_id": approved_school.id
    }

@router.post("/api/schools/reject/{request_id}")
async def reject_school_request(
    request_id: int,
    action: SchoolActionRequest,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """Reject a school request and move to rejected table"""

    # Check if admin has permission (manage-schools or manage-system-settings)
    allowed_departments = {"manage-schools", "manage-system-settings"}
    admin_departments = set(current_admin.get("departments", []))
    if not admin_departments.intersection(allowed_departments):
        raise HTTPException(status_code=403, detail="You don't have permission to reject schools")

    if not action.reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required")

    # Get the request
    request_school = db.query(RequestedSchool).filter(RequestedSchool.id == request_id).first()
    if not request_school:
        raise HTTPException(status_code=404, detail="School request not found")

    # Create rejected school
    rejected_school = RejectedSchool(
        school_name=request_school.school_name,
        school_type=request_school.school_type,
        school_level=request_school.school_level,
        location=request_school.location,
        email=request_school.email,
        phone=request_school.phone,
        students_count=request_school.students_count,
        documents=request_school.documents,
        rejection_reason=action.reason,
        rejected_date=datetime.utcnow(),
        original_request_id=request_school.id,
        status="Rejected"
    )

    db.add(rejected_school)
    db.delete(request_school)
    db.commit()
    db.refresh(rejected_school)

    return {
        "success": True,
        "message": "School rejected",
        "rejected_id": rejected_school.id
    }

@router.get("/api/schools/verified", response_model=List[SchoolResponse])
async def get_verified_schools(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all verified schools"""
    schools = db.query(School).offset(skip).limit(limit).all()
    return schools

@router.get("/api/schools/verified/{school_id}", response_model=SchoolResponse)
async def get_verified_school(
    school_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific verified school"""
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return school

@router.put("/api/schools/verified/{school_id}", response_model=SchoolResponse)
async def update_verified_school(
    school_id: int,
    school_update: SchoolUpdate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """Update a verified school"""

    # Check if admin has permission (manage-schools or manage-system-settings)
    allowed_departments = {"manage-schools", "manage-system-settings"}
    admin_departments = set(current_admin.get("departments", []))
    if not admin_departments.intersection(allowed_departments):
        raise HTTPException(status_code=403, detail="You don't have permission to update schools")

    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    # Update fields
    update_data = school_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(school, key, value)

    db.commit()
    db.refresh(school)

    return school

@router.post("/api/schools/reject-verified/{school_id}")
async def reject_verified_school(
    school_id: int,
    action: SchoolActionRequest,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """Reject a verified school and move to rejected table"""

    # Check if admin has permission (manage-schools or manage-system-settings)
    allowed_departments = {"manage-schools", "manage-system-settings"}
    admin_departments = set(current_admin.get("departments", []))
    if not admin_departments.intersection(allowed_departments):
        raise HTTPException(status_code=403, detail="You don't have permission to reject schools")

    if not action.reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required")

    # Get the verified school
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="Verified school not found")

    # Create rejected school
    rejected_school = RejectedSchool(
        school_name=school.school_name,
        school_type=school.school_type,
        school_level=school.school_level,
        location=school.location,
        email=school.email,
        phone=school.phone,
        students_count=school.students_count,
        documents=school.documents,
        rejection_reason=action.reason,
        rejected_date=datetime.utcnow(),
        original_request_id=school.id,
        status="Rejected"
    )

    db.add(rejected_school)
    db.delete(school)
    db.commit()
    db.refresh(rejected_school)

    return {
        "success": True,
        "message": "Verified school rejected",
        "rejected_id": rejected_school.id
    }

@router.post("/api/schools/reconsider-verified/{school_id}")
async def reconsider_verified_school(
    school_id: int,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """Reconsider a verified school and move back to requested (downgrade)"""

    # Check if admin has permission (manage-schools or manage-system-settings)
    allowed_departments = {"manage-schools", "manage-system-settings"}
    admin_departments = set(current_admin.get("departments", []))
    if not admin_departments.intersection(allowed_departments):
        raise HTTPException(status_code=403, detail="You don't have permission to reconsider schools")

    # Get the verified school
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="Verified school not found")

    # Move back to requested
    requested_school = RequestedSchool(
        school_name=school.school_name,
        school_type=school.school_type,
        school_level=school.school_level,
        location=school.location,
        email=school.email,
        phone=school.phone,
        students_count=school.students_count,
        documents=school.documents,
        submitted_date=datetime.utcnow(),
        status="Pending"
    )

    db.add(requested_school)
    db.delete(school)
    db.commit()
    db.refresh(requested_school)

    return {
        "success": True,
        "message": "Verified school moved to pending for reconsideration",
        "request_id": requested_school.id
    }

@router.post("/api/schools/suspend/{school_id}")
async def suspend_school(
    school_id: int,
    action: SchoolActionRequest,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """Suspend a verified school and move to suspended table"""

    # Check if admin has permission (manage-schools or manage-system-settings)
    allowed_departments = {"manage-schools", "manage-system-settings"}
    admin_departments = set(current_admin.get("departments", []))
    if not admin_departments.intersection(allowed_departments):
        raise HTTPException(status_code=403, detail="You don't have permission to suspend schools")

    if not action.reason:
        raise HTTPException(status_code=400, detail="Suspension reason is required")

    # Get the school
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    # Create suspended school
    suspended_school = SuspendedSchool(
        school_name=school.school_name,
        school_type=school.school_type,
        school_level=school.school_level,
        location=school.location,
        email=school.email,
        phone=school.phone,
        students_count=school.students_count,
        rating=school.rating,
        established_year=school.established_year,
        principal=school.principal,
        documents=school.documents,
        suspension_reason=action.reason,
        suspended_date=datetime.utcnow(),
        original_school_id=school.id,
        status="Suspended"
    )

    db.add(suspended_school)
    db.delete(school)
    db.commit()
    db.refresh(suspended_school)

    return {
        "success": True,
        "message": "School suspended",
        "suspended_id": suspended_school.id
    }

@router.get("/api/schools/rejected", response_model=List[RejectedSchoolResponse])
async def get_rejected_schools(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all rejected schools"""
    schools = db.query(RejectedSchool).offset(skip).limit(limit).all()
    return schools

@router.get("/api/schools/rejected/{school_id}", response_model=RejectedSchoolResponse)
async def get_rejected_school(
    school_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific rejected school"""
    school = db.query(RejectedSchool).filter(RejectedSchool.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="Rejected school not found")
    return school

@router.post("/api/schools/reconsider/{rejected_id}")
async def reconsider_rejected_school(
    rejected_id: int,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """Reconsider a rejected school and move back to requested"""

    # Check if admin has permission (manage-schools or manage-system-settings)
    allowed_departments = {"manage-schools", "manage-system-settings"}
    admin_departments = set(current_admin.get("departments", []))
    if not admin_departments.intersection(allowed_departments):
        raise HTTPException(status_code=403, detail="You don't have permission to reconsider schools")

    # Get the rejected school
    rejected_school = db.query(RejectedSchool).filter(RejectedSchool.id == rejected_id).first()
    if not rejected_school:
        raise HTTPException(status_code=404, detail="Rejected school not found")

    # Move back to requested
    requested_school = RequestedSchool(
        school_name=rejected_school.school_name,
        school_type=rejected_school.school_type,
        school_level=rejected_school.school_level,
        location=rejected_school.location,
        email=rejected_school.email,
        phone=rejected_school.phone,
        students_count=rejected_school.students_count,
        documents=rejected_school.documents,
        submitted_date=datetime.utcnow(),
        status="Pending"
    )

    db.add(requested_school)
    db.delete(rejected_school)
    db.commit()
    db.refresh(requested_school)

    return {
        "success": True,
        "message": "School reconsidered and moved to pending",
        "request_id": requested_school.id
    }

@router.get("/api/schools/suspended", response_model=List[SuspendedSchoolResponse])
async def get_suspended_schools(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all suspended schools"""
    schools = db.query(SuspendedSchool).offset(skip).limit(limit).all()
    return schools

@router.get("/api/schools/suspended/{school_id}", response_model=SuspendedSchoolResponse)
async def get_suspended_school(
    school_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific suspended school"""
    school = db.query(SuspendedSchool).filter(SuspendedSchool.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="Suspended school not found")
    return school

@router.post("/api/schools/reinstate/{suspended_id}")
async def reinstate_suspended_school(
    suspended_id: int,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """Reinstate a suspended school and move back to verified"""

    # Check if admin has permission (manage-schools or manage-system-settings)
    allowed_departments = {"manage-schools", "manage-system-settings"}
    admin_departments = set(current_admin.get("departments", []))
    if not admin_departments.intersection(allowed_departments):
        raise HTTPException(status_code=403, detail="You don't have permission to reinstate schools")

    # Get the suspended school
    suspended_school = db.query(SuspendedSchool).filter(SuspendedSchool.id == suspended_id).first()
    if not suspended_school:
        raise HTTPException(status_code=404, detail="Suspended school not found")

    # Move back to verified schools
    reinstated_school = School(
        school_name=suspended_school.school_name,
        school_type=suspended_school.school_type,
        school_level=suspended_school.school_level,
        location=suspended_school.location,
        email=suspended_school.email,
        phone=suspended_school.phone,
        students_count=suspended_school.students_count,
        rating=suspended_school.rating,
        established_year=suspended_school.established_year,
        principal=suspended_school.principal,
        documents=suspended_school.documents,
        approved_date=datetime.utcnow(),
        status="Verified"
    )

    db.add(reinstated_school)
    db.delete(suspended_school)
    db.commit()
    db.refresh(reinstated_school)

    return {
        "success": True,
        "message": "School reinstated",
        "school_id": reinstated_school.id
    }

@router.delete("/api/schools/{school_id}")
async def delete_school(
    school_id: int,
    table: str,  # "requested", "verified", "rejected", or "suspended"
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """Permanently delete a school from any table"""

    # Check if admin has permission (manage-schools or manage-system-settings)
    allowed_departments = {"manage-schools", "manage-system-settings"}
    admin_departments = set(current_admin.get("departments", []))
    if not admin_departments.intersection(allowed_departments):
        raise HTTPException(status_code=403, detail="You don't have permission to delete schools")

    # Determine which table to delete from
    if table == "requested":
        school = db.query(RequestedSchool).filter(RequestedSchool.id == school_id).first()
    elif table == "verified":
        school = db.query(School).filter(School.id == school_id).first()
    elif table == "rejected":
        school = db.query(RejectedSchool).filter(RejectedSchool.id == school_id).first()
    elif table == "suspended":
        school = db.query(SuspendedSchool).filter(SuspendedSchool.id == school_id).first()
    else:
        raise HTTPException(status_code=400, detail="Invalid table name")

    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    school_name = school.school_name
    db.delete(school)
    db.commit()

    return {
        "success": True,
        "message": f"School '{school_name}' permanently deleted"
    }
