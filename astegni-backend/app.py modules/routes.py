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
from tutor_scoring import TutorScoringCalculator  # Import enhanced tutor scoring

# Create router
router = APIRouter()

# ============================================
# HELPER FUNCTIONS
# ============================================

def get_role_specific_profile_picture(user: User, db: Session) -> Optional[str]:
    """
    Get profile picture from users table.
    NOTE: profile_picture has been centralized in the users table.
    All role-specific profile_picture fields have been removed.
    """
    # Profile picture is now always stored in users table
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

def check_and_auto_verify_tutor(user: User, db: Session) -> bool:
    """
    Auto-verify a tutor if all profile requirements are met.
    Requirements: first_name, father_name, grandfather_name, date_of_birth, gender, kyc_verified

    Returns True if tutor was auto-verified, False otherwise.
    """
    # Check if user has tutor role
    if "tutor" not in (user.roles or []):
        return False

    # Check all profile requirements
    profile_complete = (
        user.first_name and user.first_name.strip() != '' and
        user.father_name and user.father_name.strip() != '' and
        user.grandfather_name and user.grandfather_name.strip() != '' and
        user.date_of_birth is not None and
        user.gender and user.gender.strip() != '' and
        user.kyc_verified == True
    )

    if not profile_complete:
        return False

    # Auto-verify user if not already verified
    if not user.is_verified:
        user.is_verified = True
        user.verification_status = "approved"
        user.verified_at = datetime.utcnow()
        user.verification_method = "kyc"
        db.commit()
        return True

    return False

# ============================================
# PLATFORM STATS ENDPOINT (Public - No Auth Required)
# ============================================

@router.get("/api/platform-stats")
def get_platform_stats(db: Session = Depends(get_db)):
    """
    Get platform statistics for the hero section.
    Returns: tutor count, courses count, and average tutor rating.
    Only counts tutors with complete profiles and KYC verification.
    This endpoint is public and does not require authentication.
    """
    try:
        # Get tutor count - only verified tutors
        # is_verified=True means: profile complete + KYC verified (auto-set by system)
        # NOTE: is_verified is in users table, NOT tutor_profiles table
        tutor_count = db.execute(text("""
            SELECT COUNT(*) FROM tutor_profiles tp
            JOIN users u ON tp.user_id = u.id
            WHERE tp.is_active = true
            AND u.is_verified = true
            AND u.is_active = true
        """)).scalar() or 0

        # Get total courses count from courses table (only verified/active courses)
        courses_count = db.execute(text(
            "SELECT COUNT(*) FROM courses WHERE status = 'verified' OR status IS NULL"
        )).scalar() or 0

        # Get average rating from tutor_reviews table (only for verified tutors)
        # NOTE: is_verified is in users table, NOT tutor_profiles table
        avg_rating_result = db.execute(text("""
            SELECT COALESCE(AVG(tr.rating), 0) as avg_rating
            FROM tutor_reviews tr
            JOIN tutor_profiles tp ON tr.tutor_id = tp.id
            JOIN users u ON tp.user_id = u.id
            WHERE tp.is_active = true
            AND u.is_verified = true
            AND u.is_active = true
        """)).fetchone()
        avg_rating = float(avg_rating_result[0]) if avg_rating_result else 0.0

        # Get total verified schools count from schools table
        schools_count = db.execute(text(
            "SELECT COUNT(*) FROM schools WHERE status = 'verified'"
        )).scalar() or 0

        # Get tutor subscription tier breakdown
        # NOTE: is_verified is in users table, NOT tutor_profiles table
        tier_breakdown = db.execute(text("""
            SELECT
                subscription_plan_id,
                COUNT(*) as count
            FROM tutor_profiles tp
            JOIN users u ON tp.user_id = u.id
            WHERE tp.is_active = true
            AND u.is_verified = true
            AND u.is_active = true
            GROUP BY subscription_plan_id
            ORDER BY subscription_plan_id
        """)).fetchall()

        # Map subscription plan IDs to tier names
        tier_names = {9: "premium", 8: "standard_plus", 7: "standard", 6: "basic_plus", 5: "basic", 16: "free"}
        subscription_tiers = {name: 0 for name in tier_names.values()}
        for plan_id, count in tier_breakdown:
            tier_name = tier_names.get(plan_id, "free")
            subscription_tiers[tier_name] = count

        return {
            "tutors_count": tutor_count,
            "courses_count": courses_count,
            "average_rating": round(avg_rating, 1),
            "schools_count": schools_count,
            "subscription_tiers": subscription_tiers
        }
    except Exception as e:
        # Return default values if database error occurs
        return {
            "tutors_count": 0,
            "courses_count": 0,
            "average_rating": 0.0,
            "schools_count": 0,
            "error": str(e)
        }

# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================

@router.post("/api/register", response_model=TokenResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user or add role to existing user.

    NEW BEHAVIOR: If no role is provided, user is created without any roles.
    Users can add roles later through the role management system.
    """
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()

    if existing_user:
        # User exists - add new role if provided
        if user_data.role:
            # Verify password matches FIRST (before any role checks)
            if not verify_password(user_data.password, existing_user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email exists with different password. Please login instead."
                )

            # Check if user already has this role
            if existing_user.roles and user_data.role in existing_user.roles:
                # REACTIVATION LOGIC: Check if the role is deactivated
                role_profile = None
                if user_data.role == "tutor":
                    role_profile = db.query(TutorProfile).filter(TutorProfile.user_id == existing_user.id).first()
                elif user_data.role == "student":
                    role_profile = db.query(StudentProfile).filter(StudentProfile.user_id == existing_user.id).first()
                elif user_data.role == "parent":
                    role_profile = db.query(ParentProfile).filter(ParentProfile.user_id == existing_user.id).first()
                elif user_data.role == "advertiser":
                    role_profile = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == existing_user.id).first()

                # If profile exists and is deactivated, reactivate it
                if role_profile and not role_profile.is_active:
                    print(f"[REACTIVATION] Reactivating {user_data.role} role for user {existing_user.id}")
                    role_profile.is_active = True
                    existing_user.active_role = user_data.role
                    db.commit()

                    # Continue to token generation below (don't raise exception)
                else:
                    # Role is already active - cannot add again
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"User already has active {user_data.role} role"
                    )
            else:
                # Add new role (doesn't exist in roles array)
                current_roles = existing_user.roles or []
                existing_user.roles = current_roles + [user_data.role]
                existing_user.active_role = user_data.role
                db.commit()

                # Create profile for new role
                if user_data.role == "tutor":
                    tutor_profile = TutorProfile(user_id=existing_user.id)
                    db.add(tutor_profile)
                    db.commit()
                    db.refresh(tutor_profile)

                    # Create tutor_analysis with default 2.0 rating
                    tutor_analysis = TutorAnalysis(
                        tutor_id=tutor_profile.id,
                        average_rating=2.0,
                        total_reviews=0,
                        avg_subject_understanding_rating=2.0,
                        avg_communication_rating=2.0,
                        avg_discipline_rating=2.0,
                        avg_punctuality_rating=2.0,
                        total_students=0,
                        current_students=0,
                        alumni_students=0,
                        success_rate=0.0,
                        total_sessions_completed=0,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(tutor_analysis)
                    db.commit()

                elif user_data.role == "student":
                    student_profile = StudentProfile(user_id=existing_user.id)
                    db.add(student_profile)
                    db.commit()

                elif user_data.role == "parent":
                    parent_profile = ParentProfile(
                        user_id=existing_user.id,
                        rating=2.0,  # Set default 2.0 rating
                        rating_count=0
                    )
                    db.add(parent_profile)
                    db.commit()
                elif user_data.role == "advertiser":
                    advertiser_profile = AdvertiserProfile(user_id=existing_user.id)
                    db.add(advertiser_profile)
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
        else:
            # No role provided for existing user - just verify password
            if not verify_password(user_data.password, existing_user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email exists with different password. Please login instead."
                )

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
                date_of_birth=existing_user.date_of_birth,
                gender=existing_user.gender,
                profile_complete=existing_user.profile_complete,
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
        date_of_birth=user_data.date_of_birth,
        gender=user_data.gender,
        roles=[user_data.role] if user_data.role else None,  # No roles if not provided
        active_role=user_data.role  # None if not provided
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create profile based on role (only if role provided)
    if user_data.role:
        if user_data.role == "tutor":
            tutor_profile = TutorProfile(user_id=new_user.id)
            db.add(tutor_profile)
            db.commit()
            db.refresh(tutor_profile)

            # Create tutor_analysis with default 2.0 rating
            tutor_analysis = TutorAnalysis(
                tutor_id=tutor_profile.id,
                average_rating=2.0,
                total_reviews=0,
                avg_subject_understanding_rating=2.0,
                avg_communication_rating=2.0,
                avg_discipline_rating=2.0,
                avg_punctuality_rating=2.0,
                total_students=0,
                current_students=0,
                alumni_students=0,
                success_rate=0.0,
                total_sessions_completed=0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(tutor_analysis)

        elif user_data.role == "student":
            student_profile = StudentProfile(user_id=new_user.id)
            db.add(student_profile)

        elif user_data.role == "parent":
            parent_profile = ParentProfile(
                user_id=new_user.id,
                rating=2.0,  # Set default 2.0 rating
                rating_count=0
            )
            db.add(parent_profile)
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

    # Handle referral code if provided
    if user_data.referral_code:
        try:
            # Import referral models
            from models import UserReferralCode, ReferralRegistration, ReferralClick

            # Verify referral code exists
            referral_code_obj = db.query(UserReferralCode).filter(
                UserReferralCode.referral_code == user_data.referral_code
            ).first()

            if referral_code_obj:
                # Check if this user hasn't already been registered via a referral
                existing_referral = db.query(ReferralRegistration).filter(
                    ReferralRegistration.referred_user_id == new_user.id
                ).first()

                if not existing_referral:
                    # Create referral registration
                    referral_registration = ReferralRegistration(
                        referrer_user_id=referral_code_obj.user_id,
                        referrer_profile_type=referral_code_obj.profile_type,
                        referral_code=user_data.referral_code,
                        referred_user_id=new_user.id,
                        referred_user_email=new_user.email or "",
                        referred_user_name=f"{new_user.first_name or ''} {new_user.last_name or ''}".strip(),
                        last_activity=datetime.utcnow()
                    )
                    db.add(referral_registration)

                    # Update referral code stats
                    referral_code_obj.total_referrals += 1
                    referral_code_obj.active_referrals += 1
                    referral_code_obj.updated_at = datetime.utcnow()

                    # Mark most recent click as converted
                    recent_click = db.query(ReferralClick).filter(
                        ReferralClick.referral_code == user_data.referral_code,
                        ReferralClick.converted == False
                    ).order_by(ReferralClick.clicked_at.desc()).first()

                    if recent_click:
                        recent_click.converted = True
                        recent_click.converted_user_id = new_user.id

                    db.commit()
                    print(f"[REFERRAL] User {new_user.id} registered via referral code {user_data.referral_code}")
        except Exception as e:
            # Don't fail registration if referral tracking fails
            print(f"[REFERRAL ERROR] Failed to track referral: {e}")
            db.rollback()
            # Continue with registration

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
            date_of_birth=new_user.date_of_birth,
            gender=new_user.gender,
            profile_complete=new_user.profile_complete,
            roles=new_user.roles,
            active_role=new_user.active_role,
            profile_picture=profile_picture,
            created_at=new_user.created_at,
            is_active=new_user.is_active,
            email_verified=new_user.email_verified
        )
    )

@router.post("/api/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db), restore_account: bool = False, otp_code: str = None):
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
                # Use parent_profile.id (NOT user.id) - student_profiles.parent_id stores parent_profile IDs
                if parent_profile.id not in student_profile.parent_id:
                    student_profile.parent_id = student_profile.parent_id + [parent_profile.id]

            # Link student to parent (use student_profile.id, NOT user_id)
            if not parent_profile.children_ids:
                parent_profile.children_ids = []
            if student_profile.id not in parent_profile.children_ids:
                parent_profile.children_ids = parent_profile.children_ids + [student_profile.id]
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

    # Check if account is scheduled for deletion
    if user.account_status == 'pending_deletion':
        # Get deletion details
        deletion_request = db.execute(
            text("""
            SELECT id, scheduled_deletion_at, reasons, deletion_fee
            FROM account_deletion_requests
            WHERE user_id = :user_id AND status = 'pending'
            ORDER BY requested_at DESC
            LIMIT 1
            """),
            {"user_id": user.id}
        ).fetchone()

        if deletion_request:
            scheduled_at = deletion_request[1]
            days_remaining = (scheduled_at - datetime.utcnow()).days if scheduled_at else 0

            # Check if user wants to restore account
            if restore_account:
                # VERIFY OTP FIRST
                if not otp_code:
                    raise HTTPException(
                        status_code=400,
                        detail="OTP code is required for account restoration"
                    )

                print(f"[Login] Verifying OTP for account restoration - user {user.id}")
                print(f"[Login] Provided OTP: {otp_code}")

                # Verify OTP from database
                otp_record = db.execute(
                    text("""
                    SELECT otp_code, expires_at FROM otps
                    WHERE user_id = :user_id AND purpose = 'account_restoration'
                    AND (is_used = FALSE OR is_used IS NULL)
                    ORDER BY created_at DESC
                    LIMIT 1
                    """),
                    {"user_id": user.id}
                ).fetchone()

                if not otp_record:
                    print(f"[Login] No account_restoration OTP found for user {user.id}")
                    raise HTTPException(
                        status_code=400,
                        detail="No OTP found. Please request a new OTP."
                    )

                stored_otp, expires_at = otp_record

                # Check if OTP is expired
                if datetime.utcnow() > expires_at:
                    raise HTTPException(
                        status_code=400,
                        detail="OTP has expired. Please request a new OTP."
                    )

                # Verify OTP code
                if stored_otp != otp_code:
                    raise HTTPException(
                        status_code=401,
                        detail="Invalid OTP code"
                    )

                # Mark OTP as used
                db.execute(
                    text("""
                    UPDATE otps
                    SET is_used = TRUE
                    WHERE user_id = :user_id AND purpose = 'account_restoration' AND otp_code = :otp_code
                    """),
                    {"user_id": user.id, "otp_code": otp_code}
                )

                # OTP verified - Restore account by cancelling deletion
                print(f"[Login] OTP verified - Restoring account for user {user.id}")

                # Cancel the deletion request
                db.execute(
                    text("""
                    UPDATE account_deletion_requests
                    SET status = 'cancelled',
                        cancelled_at = CURRENT_TIMESTAMP,
                        cancelled_by_login = TRUE,
                        cancellation_reason = 'User logged in and confirmed restoration with OTP'
                    WHERE id = :request_id
                    """),
                    {"request_id": deletion_request[0]}
                )

                # Restore user account
                db.execute(
                    text("""
                    UPDATE users
                    SET account_status = 'active',
                        deactivated_at = NULL,
                        scheduled_deletion_at = NULL,
                        is_active = TRUE
                    WHERE id = :user_id
                    """),
                    {"user_id": user.id}
                )

                db.commit()

                # Refresh user object
                db.refresh(user)

                print(f"[Login] Account restored successfully for user {user.id}")

                # Continue with normal login flow
            else:
                # Return special response indicating pending deletion
                # Frontend will show restoration confirmation modal
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error_code": "ACCOUNT_PENDING_DELETION",
                        "message": "Your account is scheduled for deletion",
                        "days_remaining": days_remaining,
                        "scheduled_deletion_at": scheduled_at.isoformat() if scheduled_at else None,
                        "reasons": deletion_request[2] if deletion_request[2] else [],
                        "deletion_fee": float(deletion_request[3]) if deletion_request[3] else 200.00,
                        "email": user.email
                    }
                )

    # Update last login
    user.last_login = datetime.utcnow()

    # CRITICAL FIX: Get first ACTIVE role instead of using user.active_role directly
    # This ensures deactivated roles are not used for login
    active_role = get_first_active_role(user, db)

    # Update user's active_role in database to match first active role
    if active_role != user.active_role:
        user.active_role = active_role

    db.commit()

    # Get role-specific IDs for all roles the user has
    role_ids = get_role_ids_from_user(user, db)

    # Create tokens with role-specific IDs
    token_data = {
        "sub": user.id,
        "role": active_role,  # Use active_role from database check, not user.active_role
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
            date_of_birth=user.date_of_birth,
            gender=user.gender,
            profile_complete=user.profile_complete,
            roles=user.roles,
            active_role=user.active_role,
            profile_picture=profile_picture,
            created_at=user.created_at,
            is_active=user.is_active,
            email_verified=user.email_verified,
            role_ids=role_ids  # Include role-specific profile IDs
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
                date_of_birth=user.date_of_birth,
                gender=user.gender,
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
    # CRITICAL: The current_user from get_current_user() is already refreshed with db.expire() + db.refresh()
    # so current_user.active_role and current_user.roles are fresh from the database
    print(f"[/api/me] Called for user {current_user.id}, current active_role in DB: {current_user.active_role}")
    print(f"[/api/me] User roles: {current_user.roles}")

    # CRITICAL FIX: Only set active_role for NEW users who don't have one
    # DO NOT overwrite existing active_role - that should only change via /api/switch-role
    # The previous code was using get_first_active_role() which returns the FIRST role
    # in priority order, not the user's chosen role, causing role switches to revert!

    print(f"[/api/me] Checking if active_role needs initialization...")
    print(f"[/api/me]   current_user.active_role: {current_user.active_role}")
    print(f"[/api/me]   Condition: not active_role = {not current_user.active_role}")
    print(f"[/api/me]   Condition: active_role not in roles = {current_user.active_role not in current_user.roles}")

    # CRITICAL FIX: NEVER overwrite active_role!
    # The ONLY endpoint that should change active_role is /api/switch-role
    #
    # Note: Deactivated roles stay in the roles array - they just have is_active=False
    # So we can't detect deactivation by checking "not in roles array"
    #
    # If active_role is NULL, just return NULL - frontend will redirect to index.html
    # If active_role is set, return it as-is - even if the role was deactivated
    # The frontend/user is responsible for switching to another role if needed

    if not current_user.active_role:
        # User has no active_role - they need to select/add a role
        print(f"[/api/me] active_role is NULL - user needs to add/select a role")
        print(f"[/api/me] ⚠️ Returning NULL - frontend should redirect to index.html")
    else:
        # User has an active_role - return it unchanged
        # Even if it's deactivated, only the user (via /api/switch-role) should change it
        print(f"[/api/me] ✅ active_role is '{current_user.active_role}' - returning unchanged")
        print(f"[/api/me] (Only /api/switch-role can change active_role)")

    print(f"[/api/me] Final active_role to return: {current_user.active_role}")

    # Get profile picture from role-specific table
    profile_picture = get_role_specific_profile_picture(current_user, db)
    # Get username from role-specific table (no longer stored in users table)
    username = get_role_specific_username(current_user, db)

    # Get role-specific IDs for all roles the user has
    role_ids = get_role_ids_from_user(current_user, db)

    # Calculate profile_complete status
    profile_complete = bool(current_user.date_of_birth and current_user.gender and current_user.digital_id_no)

    # Build name based on naming convention
    # Ethiopian: first_name + father_name + grandfather_name
    # International: first_name + last_name
    if current_user.last_name:
        # International naming convention
        display_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip()
    else:
        # Ethiopian naming convention
        name_parts = [current_user.first_name, current_user.father_name, current_user.grandfather_name]
        display_name = " ".join(part for part in name_parts if part)

    return UserResponse(
        id=current_user.id,
        first_name=current_user.first_name,
        father_name=current_user.father_name,
        grandfather_name=current_user.grandfather_name,
        last_name=current_user.last_name,
        name=display_name or "User",
        username=username,
        email=current_user.email,
        phone=current_user.phone,
        date_of_birth=current_user.date_of_birth,
        gender=current_user.gender,
        digital_id_no=current_user.digital_id_no,
        profile_complete=profile_complete,
        kyc_verified=current_user.kyc_verified if hasattr(current_user, 'kyc_verified') else False,
        roles=current_user.roles,
        active_role=current_user.active_role,
        profile_picture=profile_picture,
        created_at=current_user.created_at,
        is_active=current_user.is_active,
        email_verified=current_user.email_verified,
        role_ids=role_ids,  # FIXED: Include role-specific profile IDs
        account_balance=float(current_user.account_balance) if hasattr(current_user, 'account_balance') and current_user.account_balance is not None else 0.0,
        location=current_user.location,  # Add location field for location filter
        country_code=current_user.country_code,  # Add country code for regional targeting
        currency=current_user.currency,  # Add currency for price display
        social_links=current_user.social_links  # Add social media links
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

    # Calculate profile_complete status
    profile_complete = bool(current_user.date_of_birth and current_user.gender and current_user.digital_id_no)

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
            "date_of_birth": str(current_user.date_of_birth) if current_user.date_of_birth else None,
            "gender": current_user.gender,
            "digital_id_no": current_user.digital_id_no,
            "profile_complete": profile_complete,
            "kyc_verified": current_user.kyc_verified if hasattr(current_user, 'kyc_verified') else False,
            "roles": current_user.roles,
            "active_role": current_user.active_role,
            "role": current_user.active_role,  # For backward compatibility
            "profile_picture": profile_picture,
            "is_active": current_user.is_active,
            "email_verified": current_user.email_verified,
            "role_ids": role_ids,  # FIXED: Include role-specific profile IDs
            "social_links": current_user.social_links  # Add social media links
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
    Fields: first_name, father_name, grandfather_name, last_name, gender, date_of_birth, digital_id_no
    """
    from datetime import datetime as dt

    allowed_fields = ['first_name', 'father_name', 'grandfather_name', 'last_name', 'gender', 'date_of_birth', 'digital_id_no']

    for field, value in profile_data.items():
        if field in allowed_fields and value is not None:
            # Handle date_of_birth conversion from string to date
            if field == 'date_of_birth' and isinstance(value, str):
                try:
                    value = dt.strptime(value, '%Y-%m-%d').date()
                except ValueError:
                    continue  # Skip invalid date format
            # Handle digital_id_no - strip whitespace
            if field == 'digital_id_no' and isinstance(value, str):
                value = value.strip()
            setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)

    # Auto-verify all profiles (tutor, student, parent, advertiser) if all requirements are met
    from kyc_endpoints import check_and_auto_verify_profiles
    verification_results = check_and_auto_verify_profiles(current_user, db)

    return {
        "message": "Profile updated successfully",
        "verification_results": verification_results,
        "user": {
            "id": current_user.id,
            "first_name": current_user.first_name,
            "father_name": current_user.father_name,
            "grandfather_name": current_user.grandfather_name,
            "last_name": current_user.last_name,
            "gender": current_user.gender,
            "date_of_birth": current_user.date_of_birth.isoformat() if current_user.date_of_birth else None,
            "digital_id_no": current_user.digital_id_no,
            "profile_complete": current_user.profile_complete,
            "kyc_verified": current_user.kyc_verified,
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
    sessionFormatExclusive: Optional[str] = Query(None),  # "true" = only show tutors with ONLY this format
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    min_rating: Optional[float] = Query(None),
    max_rating: Optional[float] = Query(None),
    sort_by: Optional[str] = Query("smart"),  # Default to smart ranking
    search_history_ids: Optional[str] = Query(None),  # Comma-separated tutor IDs from search history
    user_location: Optional[str] = Query(None),  # Filter tutors by location matching user's location
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
    # Only show verified tutors (is_verified=True means profile complete + KYC verified)
    # NOTE: is_verified is in users table, NOT tutor_profiles table
    query = db.query(TutorProfile).join(User).filter(
        TutorProfile.is_active == True,
        User.is_verified == True,  # Fixed: is_verified is in users table
        User.is_active == True
    )

    # Apply filters
    if search:
        search_lower = search.lower()

        # Build subquery to find tutor IDs that have courses with matching tags/names
        # tutor_packages.tutor_id -> tutor_packages.course_ids -> courses.tags/course_name
        course_search_subquery = text("""
            SELECT DISTINCT tp.tutor_id
            FROM tutor_packages tp
            JOIN courses c ON c.id = ANY(tp.course_ids)
            WHERE c.status = 'verified'
            AND (
                c.tags::text ILIKE :search_pattern
                OR c.course_name ILIKE :search_pattern
                OR c.course_category ILIKE :search_pattern
            )
        """)

        # Build subquery to find tutor IDs teaching at schools with matching names
        # credentials.uploader_id (tutor profile ID) -> credentials.title (school name)
        school_search_subquery = text("""
            SELECT DISTINCT cr.uploader_id as tutor_id
            FROM credentials cr
            WHERE cr.uploader_role = 'tutor'
            AND cr.document_type = 'experience'
            AND cr.is_current = true
            AND cr.title ILIKE :search_pattern
        """)

        # Additionally search schools table for verified schools
        verified_school_search_subquery = text("""
            SELECT DISTINCT cr.uploader_id as tutor_id
            FROM credentials cr
            JOIN schools s ON LOWER(cr.title) = LOWER(s.name)
            WHERE cr.uploader_role = 'tutor'
            AND cr.document_type = 'experience'
            AND s.status = 'verified'
            AND s.name ILIKE :search_pattern
        """)

        # Get tutor IDs that match course search
        course_matching_tutor_ids = db.execute(
            course_search_subquery,
            {"search_pattern": f'%{search_lower}%'}
        ).scalars().all()

        # Get tutor IDs that match school search (from credentials)
        school_matching_tutor_ids = db.execute(
            school_search_subquery,
            {"search_pattern": f'%{search_lower}%'}
        ).scalars().all()

        # Get tutor IDs that match verified school search
        verified_school_matching_tutor_ids = db.execute(
            verified_school_search_subquery,
            {"search_pattern": f'%{search_lower}%'}
        ).scalars().all()

        # Combine all school matches
        all_school_matching_tutor_ids = list(set(school_matching_tutor_ids) | set(verified_school_matching_tutor_ids))

        search_filter = or_(
            func.lower(User.first_name).contains(search_lower),
            func.lower(User.father_name).contains(search_lower),
            func.lower(User.location).contains(search_lower),  # From users table (migrated from tutor_profiles)
            # Search in JSON arrays - languages (from users table)
            cast(User.languages, String).ilike(f'%{search_lower}%'),
            # Include tutors who have courses with matching tags/names
            TutorProfile.id.in_(course_matching_tutor_ids) if course_matching_tutor_ids else False,
            # Include tutors teaching at schools with matching names
            TutorProfile.id.in_(all_school_matching_tutor_ids) if all_school_matching_tutor_ids else False
        )
        query = query.filter(search_filter)

    if gender:
        genders = [g.strip() for g in gender.split(',')]
        print(f"[Gender Filter] Filtering by genders: {genders}")
        query = query.filter(User.gender.in_(genders))

    # Location filter - filter tutors by matching user's location
    if user_location:
        print(f"[Location Filter] Filtering tutors near: {user_location}")
        # Case-insensitive partial match on location field in users table
        # Also exclude tutors with NULL, empty, or "Not specified" locations
        query = query.filter(
            and_(
                User.location.isnot(None),  # Not NULL
                User.location != '',  # Not empty
                func.lower(User.location) != 'not specified',  # Not "Not specified"
                func.lower(User.location).contains(user_location.lower())  # Contains selected location
            )
        )

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

    # Apply exclusive session format filtering (v2.2)
    # Filter tutors who have ONLY the specified format (excluding hybrid tutors)
    if sessionFormat and sessionFormatExclusive == "true":
        print(f"[Exclusive Filter] Filtering for tutors with ONLY {sessionFormat} packages")
        filtered_tutors = []

        for tutor in all_tutors:
            # Get all package formats for this tutor
            packages = db.query(TutorPackage).filter(
                TutorPackage.tutor_id == tutor.id,
                TutorPackage.is_active == True
            ).all()

            if not packages:
                continue

            # Get unique session formats this tutor offers
            tutor_formats = set(pkg.session_format for pkg in packages if pkg.session_format)

            # For Online-only: should have 'Online' but NOT 'In-person'
            # For In-person-only: should have 'In-person' but NOT 'Online'
            if sessionFormat == 'Online':
                if 'Online' in tutor_formats and 'In-person' not in tutor_formats:
                    filtered_tutors.append(tutor)
            elif sessionFormat == 'In-person':
                if 'In-person' in tutor_formats and 'Online' not in tutor_formats:
                    filtered_tutors.append(tutor)

        all_tutors = filtered_tutors
        total = len(all_tutors)
        print(f"[Exclusive Filter] Filtered to {total} tutors with ONLY {sessionFormat} packages")

    # For Hybrid filter: get tutors who have BOTH formats
    elif sessionFormat == 'Hybrid':
        print(f"[Hybrid Filter] Filtering for tutors with BOTH Online and In-person packages")
        hybrid_tutors = []

        for tutor in all_tutors:
            # Get all package formats for this tutor
            packages = db.query(TutorPackage).filter(
                TutorPackage.tutor_id == tutor.id,
                TutorPackage.is_active == True
            ).all()

            if not packages:
                continue

            # Get unique session formats this tutor offers
            tutor_formats = set(pkg.session_format for pkg in packages if pkg.session_format)

            # Must have BOTH Online and In-person
            if 'Online' in tutor_formats and 'In-person' in tutor_formats:
                hybrid_tutors.append(tutor)

        all_tutors = hybrid_tutors
        total = len(all_tutors)
        print(f"[Hybrid Filter] Filtered to {total} hybrid tutors")

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

        # Subscription Plan Visibility Tiers (higher = more visibility)
        # Based on subscription_plans in admin_db:
        # - Premium (id=9): 5000 ETB - "Premium visibility" → 500 points
        # - Standard+ (id=8): 2800 ETB - "Standard plus visibility" → 400 points
        # - Standard (id=7): 1500 ETB - "Boosted visibility" → 300 points
        # - Basic+ (id=6): 700 ETB - "Better visibility" → 200 points
        # - Basic (id=5): 500 ETB - "Better visibility" → 200 points
        # - Free (id=16): 0 ETB - "visibility" → 0 points (baseline)
        SUBSCRIPTION_VISIBILITY_SCORES = {
            9: 500,   # Premium - highest visibility
            8: 400,   # Standard+
            7: 300,   # Standard - boosted visibility
            6: 200,   # Basic+ - better visibility
            5: 200,   # Basic - better visibility
            16: 0,    # Free - baseline visibility
            None: 0   # No plan - baseline
        }

        def calculate_tutor_score(tutor):
            """
            Calculate ranking score for each tutor based on multiple factors
            Higher score = Higher priority in results

            NEW SCORING SYSTEM:
            - Subscription Plan: 0-500 points
            - Trending Score: 0-200+ points
            - Interest/Hobby Match: 0-150 points (NEW)
            - Total Students: 0-100 points (NEW)
            - Completion Rate: 0-80 points (NEW)
            - Response Time: 0-60 points (NEW)
            - Experience: 0-50 points (NEW - RESTORED)
            - Search History: 0-50 points
            - Legacy Basic Flag: 0-100 points
            - New Tutor Bonus: 0-50 points
            - Verification: 0-25 points
            - Combo Bonuses: 0-150 points

            MAX POSSIBLE: ~1,615 points (was ~1,175)
            """
            score = 0

            # SUBSCRIPTION PLAN VISIBILITY SCORE (0-500 points) - PRIMARY FACTOR
            subscription_plan_id = tutor.user.subscription_plan_id
            subscription_score = SUBSCRIPTION_VISIBILITY_SCORES.get(subscription_plan_id, 0)
            score += subscription_score

            # Check if subscription is expired (reduce score if expired)
            if tutor.user.subscription_expires_at and tutor.user.subscription_expires_at < datetime.utcnow():
                # Expired subscription - treat as Free tier
                score -= subscription_score  # Remove the subscription bonus

            # TRENDING SCORE (0-200+ points) - POPULARITY BOOST
            trending_score = getattr(tutor, 'trending_score', 0) or 0
            search_count = getattr(tutor, 'search_count', 0) or 0

            if trending_score > 0:
                if trending_score >= 100:
                    score += 200  # Maximum trending bonus
                elif trending_score >= 50:
                    score += 100 + (trending_score - 50) * 2  # 100-200 points
                else:
                    score += trending_score * 2  # 0-100 points

                # Additional boost for very high search counts (viral tutors)
                if search_count >= 1000:
                    score += 100  # Viral tutor bonus
                elif search_count >= 500:
                    score += 50  # Very popular tutor bonus
                elif search_count >= 100:
                    score += 25  # Popular tutor bonus

            # NEW: Calculate all new scoring factors using TutorScoringCalculator
            try:
                scoring_calculator = TutorScoringCalculator(db)

                # Get student interests/hobbies if available (for interest matching)
                student_interests = []
                student_hobbies = []
                # Note: student data passed from outer scope if available

                new_scores, score_breakdown = scoring_calculator.calculate_all_new_scores(
                    tutor_id=tutor.id,
                    tutor_user_id=tutor.user_id,
                    tutor_profile_created_at=tutor.created_at,
                    student_interests=student_interests,
                    student_hobbies=student_hobbies
                )

                score += new_scores

                # Store breakdown for debugging
                tutor._score_breakdown = score_breakdown

            except Exception as e:
                print(f"⚠️ Error calculating new scores for tutor {tutor.id}: {e}")
                # Continue with base scoring if new scoring fails

            # Check if tutor is in search history (50 points)
            in_search_history = tutor.id in search_history_tutor_ids
            if in_search_history:
                score += 50

            # Check if tutor is basic (100 points) - legacy field, may be deprecated
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

            # Verification bonus (25 points)
            if tutor.user.is_verified:
                score += 25

            return score

        # Calculate scores for all tutors
        tutors_with_scores = [(tutor, calculate_tutor_score(tutor)) for tutor in all_tutors]

        # Sort by score (descending)
        tutors_with_scores.sort(key=lambda x: x[1], reverse=True)

        # Subscription tier names for logging
        SUBSCRIPTION_TIER_NAMES = {
            9: "PREMIUM", 8: "STD+", 7: "STD", 6: "BASIC+", 5: "BASIC", 16: "FREE", None: "NONE"
        }

        # Log top 5 tutors with scores for debugging
        print(f"\n📊 Smart Ranking Results (Total: {len(tutors_with_scores)} tutors)")
        print("   Top 5 tutors:")
        for i, (tutor, score) in enumerate(tutors_with_scores[:5], 1):
            tier_label = SUBSCRIPTION_TIER_NAMES.get(tutor.user.subscription_plan_id, "NONE")
            basic_label = "BASIC" if (tutor.is_basic or False) else ""
            new_label = "NEW" if tutor.created_at and (datetime.utcnow() - tutor.created_at).days <= 30 else ""
            history_label = "HIST" if tutor.id in search_history_tutor_ids else ""
            trending_count = getattr(tutor, 'search_count', 0) or 0
            trending_label = f"TREND({trending_count})" if trending_count > 0 else ""
            labels = f"[{tier_label}] {basic_label} {new_label} {history_label} {trending_label}".strip()
            print(f"   {i}. {labels} Score: {score:.0f} - {tutor.user.first_name} {tutor.user.father_name}")

        # Apply shuffling with 80% probability on first page
        # This provides variety while maintaining general quality ranking
        shuffle_roll = random.random()
        should_shuffle = page == 1 and shuffle_roll < 0.8

        if should_shuffle:
            print(f"🔀 SHUFFLING (roll: {shuffle_roll:.2f} < 0.80)")

            # Shuffle within tier groups to provide variety
            # Tier 1: Top 20% (Premium + Trending + Search History)
            # Tier 2: Next 30% (Standard + Some Trending)
            # Tier 3: Remaining 50% (Basic/Free tutors)

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

    # Get tutor IDs for batch fetching package data
    tutor_ids = [tutor.id for tutor in tutors]
    user_ids = [tutor.user_id for tutor in tutors]

    # Fetch package data for all tutors in one query (courses, grade_level, session_format, price)
    package_data_query = text("""
        SELECT
            tp.tutor_id,
            ARRAY_AGG(DISTINCT c.course_name) FILTER (WHERE c.course_name IS NOT NULL) as courses,
            ARRAY_AGG(DISTINCT grade_elem) FILTER (WHERE grade_elem IS NOT NULL) as grade_levels,
            ARRAY_AGG(DISTINCT tp.session_format) FILTER (WHERE tp.session_format IS NOT NULL AND tp.session_format != '') as session_formats,
            MIN(tp.hourly_rate) as min_price,
            MAX(tp.hourly_rate) as max_price
        FROM tutor_packages tp
        LEFT JOIN courses c ON c.id = ANY(tp.course_ids)
        LEFT JOIN LATERAL unnest(tp.grade_level) as grade_elem ON true
        WHERE tp.tutor_id = ANY(:tutor_ids)
        AND tp.is_active = true
        GROUP BY tp.tutor_id
    """)

    # Fetch ratings from tutor_reviews table (4-factor rating system)
    ratings_query = text("""
        SELECT
            tutor_id,
            COUNT(*) as review_count,
            ROUND(AVG(rating)::numeric, 1) as avg_rating,
            ROUND(AVG(subject_understanding_rating)::numeric, 1) as subject_matter,
            ROUND(AVG(communication_rating)::numeric, 1) as communication,
            ROUND(AVG(discipline_rating)::numeric, 1) as discipline,
            ROUND(AVG(punctuality_rating)::numeric, 1) as punctuality
        FROM tutor_reviews
        WHERE tutor_id = ANY(:tutor_ids)
        GROUP BY tutor_id
    """)

    # Fetch experience credentials count from credentials table
    # Note: uploader_id in credentials table stores the tutor profile ID (not user_id)
    experience_query = text("""
        SELECT
            uploader_id,
            COUNT(*) as experience_count
        FROM credentials
        WHERE uploader_id = ANY(:tutor_ids)
        AND uploader_role = 'tutor'
        AND document_type = 'experience'
        GROUP BY uploader_id
    """)

    # Fetch current workplace (teaches_at) from credentials where is_current=true
    # Note: uploader_id in credentials table stores the tutor profile ID (not user_id)
    current_workplace_query = text("""
        SELECT DISTINCT ON (uploader_id)
            uploader_id,
            title as current_workplace
        FROM credentials
        WHERE uploader_id = ANY(:tutor_ids)
        AND uploader_role = 'tutor'
        AND document_type = 'experience'
        AND is_current = true
        ORDER BY uploader_id, created_at DESC
    """)

    package_results = db.execute(package_data_query, {"tutor_ids": tutor_ids}).fetchall()
    ratings_results = db.execute(ratings_query, {"tutor_ids": tutor_ids}).fetchall()
    experience_results = db.execute(experience_query, {"tutor_ids": tutor_ids}).fetchall()
    current_workplace_results = db.execute(current_workplace_query, {"tutor_ids": tutor_ids}).fetchall()

    # Create a mapping of tutor_id to package data
    package_data_map = {}
    for row in package_results:
        package_data_map[row.tutor_id] = {
            "courses": row.courses or [],
            "grade_levels": row.grade_levels or [],
            "session_formats": row.session_formats or [],
            "min_price": float(row.min_price) if row.min_price else 0,
            "max_price": float(row.max_price) if row.max_price else 0
        }

    # Create a mapping of tutor_id to ratings data
    ratings_data_map = {}
    for row in ratings_results:
        ratings_data_map[row.tutor_id] = {
            "rating": float(row.avg_rating) if row.avg_rating else 0,
            "rating_count": row.review_count or 0,
            "subject_matter": float(row.subject_matter) if row.subject_matter else 0,
            "communication": float(row.communication) if row.communication else 0,
            "discipline": float(row.discipline) if row.discipline else 0,
            "punctuality": float(row.punctuality) if row.punctuality else 0
        }

    # Create a mapping of tutor_id (profile ID) to experience count
    experience_data_map = {}
    for row in experience_results:
        experience_data_map[row.uploader_id] = row.experience_count or 0

    # Create a mapping of tutor_id (profile ID) to current workplace (teaches_at)
    current_workplace_map = {}
    for row in current_workplace_results:
        current_workplace_map[row.uploader_id] = row.current_workplace

    # Format response
    tutor_list = []
    for tutor in tutors:
        # Get package data for this tutor
        pkg_data = package_data_map.get(tutor.id, {
            "courses": [],
            "grade_levels": [],
            "session_formats": [],
            "min_price": 0,
            "max_price": 0
        })

        # Get ratings data for this tutor
        rating_data = ratings_data_map.get(tutor.id, {
            "rating": 0,
            "rating_count": 0,
            "subject_matter": 0,
            "communication": 0,
            "discipline": 0,
            "punctuality": 0
        })

        # Get experience count for this tutor (from credentials table)
        # Note: credentials.uploader_id stores the tutor profile ID
        experience_count = experience_data_map.get(tutor.id, 0)

        # Get current workplace (from credentials where is_current=true)
        # Note: credentials.uploader_id stores the tutor profile ID
        current_workplace = current_workplace_map.get(tutor.id, None)

        # Format session formats (combine unique values)
        session_formats = pkg_data["session_formats"]
        session_format_display = ", ".join(session_formats) if session_formats else "Not specified"

        # Format price (show range if different min/max, otherwise single value)
        min_price = pkg_data["min_price"]
        max_price = pkg_data["max_price"]
        if min_price > 0 and max_price > 0:
            if min_price == max_price:
                price = min_price
            else:
                price = min_price  # Use min price for display, max available in price_max
        else:
            price = 0

        tutor_data = {
            "id": tutor.id,
            "user_id": tutor.user_id,
            "first_name": tutor.user.first_name,
            "father_name": tutor.user.father_name,
            "grandfather_name": tutor.user.grandfather_name,
            "last_name": tutor.user.last_name,  # International naming convention
            "email": tutor.user.email,
            "profile_picture": tutor.user.profile_picture,
            "bio": tutor.bio,
            "quote": tutor.quote,
            "gender": tutor.user.gender,
            "courses": pkg_data["courses"],  # From tutor_packages -> course_ids -> courses
            "grades": pkg_data["grade_levels"],  # From tutor_packages.grade_level
            "course_type": None,
            "location": tutor.user.location,  # From users table (migrated from tutor_profiles)
            "teaches_at": current_workplace,  # From credentials.title where is_current=true (no fallback - frontend shows "Not provided")
            "sessionFormat": session_format_display,  # From tutor_packages.session_format
            "languages": tutor.user.languages or [],  # From users table (migrated from tutor_profiles)
            "experience": experience_count,  # Count of experience credentials
            "price": price,  # From tutor_packages.hourly_rate (min)
            "price_max": max_price,  # From tutor_packages.hourly_rate (max)
            "currency": tutor.user.currency or "ETB",
            # Ratings from tutor_reviews table
            "rating": rating_data["rating"],
            "rating_count": rating_data["rating_count"],
            "subject_matter": rating_data["subject_matter"],
            "communication_skills": rating_data["communication"],
            "discipline": rating_data["discipline"],
            "punctuality": rating_data["punctuality"],
            "is_verified": tutor.user.is_verified,  # Fixed: is_verified is in users table
            "is_active": tutor.is_active,
            "is_basic": getattr(tutor, 'is_basic', False),
            "cover_image": tutor.cover_image,
            "intro_video_url": getattr(tutor, 'intro_video_url', None),
            # Subscription plan info
            "subscription_plan_id": tutor.user.subscription_plan_id,
            "subscription_tier": {
                9: "Premium", 8: "Standard+", 7: "Standard",
                6: "Basic+", 5: "Basic", 16: "Free"
            }.get(tutor.user.subscription_plan_id, "Free"),
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
# TIERED TUTOR FETCHING (STUDENT INTERESTS & HOBBIES)
# ============================================

@router.get("/api/tutors/tiered")
def get_tutors_tiered(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    gender: Optional[str] = Query(None),
    min_grade_level: Optional[float] = Query(None),
    max_grade_level: Optional[float] = Query(None),
    sessionFormat: Optional[str] = Query(None),
    sessionFormatExclusive: Optional[str] = Query(None),  # "true" = only show tutors with ONLY this format
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    min_rating: Optional[float] = Query(None),
    max_rating: Optional[float] = Query(None),
    sort_by: Optional[str] = Query(None),
    user_location: Optional[str] = Query(None),  # Filter tutors by location matching user's location
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Get tutors with tier-based ranking prioritizing student's learning interests and hobbies

    Tier Priority:
    1. Tutors matching student's learning interests (interested_in from student_profiles)
    2. Tutors matching student's hobbies (hobbies from users table)
    3. All other tutors (sorted by smart ranking or specified sort)

    Supports all filters and sorting from standard endpoint:
    - search: Search tutors, courses, schools, languages
    - subject: Filter by specific subject/course
    - gender: Filter by gender (comma-separated for multiple)
    - min/max_grade_level: Filter by grade level range
    - sessionFormat: Filter by session format (Online, In-person, Hybrid)
    - sessionFormatExclusive: Set to "true" to filter tutors with ONLY the specified format (excludes hybrid)
    - min/max_price: Filter by price range
    - min/max_rating: Filter by rating range
    - sort_by: Sort results (smart, rating, price, experience, newest, name, etc.)

    NOTE: Filters are applied AFTER tiering to maintain tier priority
    """

    # Log incoming filter parameters
    print(f"\n[Tiered Tutors] === REQUEST PARAMETERS ===")
    print(f"  search: {search}")
    print(f"  subject: {subject}")
    print(f"  gender: {gender}")
    print(f"  min_grade_level: {min_grade_level}")
    print(f"  max_grade_level: {max_grade_level}")
    print(f"  sessionFormat: {sessionFormat}")
    print(f"  sessionFormatExclusive: {sessionFormatExclusive}")
    print(f"  min_price: {min_price}")
    print(f"  max_price: {max_price}")
    print(f"  min_rating: {min_rating}")
    print(f"  max_rating: {max_rating}")
    print(f"  sort_by: {sort_by}")
    print(f"  page: {page}, limit: {limit}")

    # Get student profile data if user is logged in and has student role
    student_interests = []
    student_hobbies = []

    if current_user and "student" in current_user.roles:
        # Get student profile to fetch interested_in
        student_profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == current_user.id
        ).first()

        if student_profile and student_profile.interested_in:
            # interested_in is an ARRAY type in PostgreSQL
            student_interests = student_profile.interested_in or []
            print(f"[Tiered Tutors] Student interests: {student_interests}")

        # Get user hobbies from users table
        if current_user.hobbies:
            # hobbies is an ARRAY type in PostgreSQL
            student_hobbies = current_user.hobbies or []
            print(f"[Tiered Tutors] Student hobbies: {student_hobbies}")

    # Base query - only verified, active tutors
    query = db.query(TutorProfile).join(User).filter(
        TutorProfile.is_active == True,
        User.is_verified == True,
        User.is_active == True
    )

    # Apply search filter
    if search:
        search_lower = search.lower()
        print(f"[Tiered - Search Filter] Searching for: {search}")

        # Build subquery to find tutor IDs that have courses with matching tags/names
        course_search_subquery = text("""
            SELECT DISTINCT tp.tutor_id
            FROM tutor_packages tp
            JOIN courses c ON c.id = ANY(tp.course_ids)
            WHERE c.status = 'verified'
            AND (
                c.tags::text ILIKE :search_pattern
                OR c.course_name ILIKE :search_pattern
                OR c.course_category ILIKE :search_pattern
            )
        """)

        # Build subquery to find tutor IDs teaching at schools with matching names
        school_search_subquery = text("""
            SELECT DISTINCT cr.uploader_id as tutor_id
            FROM credentials cr
            WHERE cr.uploader_role = 'tutor'
            AND cr.document_type = 'experience'
            AND cr.is_current = true
            AND cr.title ILIKE :search_pattern
        """)

        # Additionally search schools table for verified schools
        verified_school_search_subquery = text("""
            SELECT DISTINCT cr.uploader_id as tutor_id
            FROM credentials cr
            JOIN schools s ON LOWER(cr.title) = LOWER(s.name)
            WHERE cr.uploader_role = 'tutor'
            AND cr.document_type = 'experience'
            AND s.status = 'verified'
            AND s.name ILIKE :search_pattern
        """)

        # Get tutor IDs that match course search
        course_matching_tutor_ids = db.execute(
            course_search_subquery,
            {"search_pattern": f'%{search_lower}%'}
        ).scalars().all()

        # Get tutor IDs that match school search (from credentials)
        school_matching_tutor_ids = db.execute(
            school_search_subquery,
            {"search_pattern": f'%{search_lower}%'}
        ).scalars().all()

        # Get tutor IDs that match verified school search
        verified_school_matching_tutor_ids = db.execute(
            verified_school_search_subquery,
            {"search_pattern": f'%{search_lower}%'}
        ).scalars().all()

        # Combine all school matches
        all_school_matching_tutor_ids = list(set(school_matching_tutor_ids) | set(verified_school_matching_tutor_ids))

        search_filter = or_(
            func.lower(User.first_name).contains(search_lower),
            func.lower(User.father_name).contains(search_lower),
            func.lower(User.location).contains(search_lower),
            # Search in JSON arrays - languages (from users table)
            cast(User.languages, String).ilike(f'%{search_lower}%'),
            # Include tutors who have courses with matching tags/names
            TutorProfile.id.in_(course_matching_tutor_ids) if course_matching_tutor_ids else False,
            # Include tutors teaching at schools with matching names
            TutorProfile.id.in_(all_school_matching_tutor_ids) if all_school_matching_tutor_ids else False
        )
        query = query.filter(search_filter)

    # Apply gender filter
    if gender:
        genders = [g.strip() for g in gender.split(',')]
        print(f"[Tiered - Gender Filter] Filtering by genders: {genders}")
        query = query.filter(User.gender.in_(genders))

    # Location filter - filter tutors by matching user's location
    if user_location:
        print(f"[Tiered - Location Filter] Filtering tutors near: {user_location}")
        # Case-insensitive partial match on location field in users table
        # Also exclude tutors with NULL, empty, or "Not specified" locations
        query = query.filter(
            and_(
                User.location.isnot(None),  # Not NULL
                User.location != '',  # Not empty
                func.lower(User.location) != 'not specified',  # Not "Not specified"
                func.lower(User.location).contains(user_location.lower())  # Contains selected location
            )
        )

    # Get all tutors for tiered ranking
    all_tutors = query.all()
    total = len(all_tutors)

    # Tier 1: Tutors matching student's learning interests
    tier1_tutors = []
    # Tier 2: Tutors matching student's hobbies
    tier2_tutors = []
    # Tier 3: All other tutors
    tier3_tutors = []

    if student_interests or student_hobbies:
        print(f"[Tiered Tutors] Applying interest/hobby matching for {len(all_tutors)} tutors")

        for tutor in all_tutors:
            matched_tier = None

            # Check Tier 1: Learning interests match
            # Match against courses taught by tutor
            if student_interests:
                # Get tutor's courses from packages
                tutor_courses_query = text("""
                    SELECT DISTINCT c.course_name, c.tags, c.course_category
                    FROM tutor_packages tp
                    JOIN courses c ON c.id = ANY(tp.course_ids)
                    WHERE tp.tutor_id = :tutor_id AND c.status = 'verified'
                """)
                tutor_courses = db.execute(tutor_courses_query, {"tutor_id": tutor.id}).fetchall()

                # Check if any student interest matches tutor's courses
                for interest in student_interests:
                    interest_lower = interest.lower()
                    for course in tutor_courses:
                        course_name = (course.course_name or "").lower()
                        course_category = (course.course_category or "").lower()
                        tags_str = str(course.tags or "").lower()

                        if (interest_lower in course_name or
                            interest_lower in course_category or
                            interest_lower in tags_str):
                            matched_tier = 1
                            print(f"   [Tier 1] Tutor {tutor.id} matches interest '{interest}' via course '{course.course_name}'")
                            break

                    if matched_tier:
                        break

            # Check Tier 2: Hobbies match (only if not already in Tier 1)
            if not matched_tier and student_hobbies:
                # Match against tutor's hobbies
                tutor_hobbies = tutor.user.hobbies or []

                for hobby in student_hobbies:
                    hobby_lower = hobby.lower()
                    for tutor_hobby in tutor_hobbies:
                        if hobby_lower == tutor_hobby.lower():
                            matched_tier = 2
                            print(f"   [Tier 2] Tutor {tutor.id} matches hobby '{hobby}'")
                            break

                    if matched_tier:
                        break

            # Assign to appropriate tier
            if matched_tier == 1:
                tier1_tutors.append(tutor)
            elif matched_tier == 2:
                tier2_tutors.append(tutor)
            else:
                tier3_tutors.append(tutor)

        print(f"[Tiered Tutors] Tier 1: {len(tier1_tutors)} tutors (interests)")
        print(f"[Tiered Tutors] Tier 2: {len(tier2_tutors)} tutors (hobbies)")
        print(f"[Tiered Tutors] Tier 3: {len(tier3_tutors)} tutors (others)")
    else:
        # No student interests/hobbies - all tutors go to Tier 3
        tier3_tutors = all_tutors
        print(f"[Tiered Tutors] No interests/hobbies - all {len(tier3_tutors)} tutors in Tier 3")

    # Apply smart ranking within each tier
    import random
    from datetime import datetime

    def calculate_tier_score(tutor):
        """Calculate smart ranking score for tutors within their tier"""
        score = 0

        # Subscription visibility score
        SUBSCRIPTION_SCORES = {
            9: 500, 8: 400, 7: 300, 6: 200, 5: 200, 16: 0, None: 0
        }
        score += SUBSCRIPTION_SCORES.get(tutor.user.subscription_plan_id, 0)

        # Check if subscription is expired
        if tutor.user.subscription_expires_at and tutor.user.subscription_expires_at < datetime.utcnow():
            score -= SUBSCRIPTION_SCORES.get(tutor.user.subscription_plan_id, 0)

        # Trending score
        trending_score = getattr(tutor, 'trending_score', 0) or 0
        if trending_score >= 100:
            score += 200
        elif trending_score >= 50:
            score += 100 + (trending_score - 50) * 2
        else:
            score += trending_score * 2

        # New tutor bonus
        if tutor.created_at:
            days_old = (datetime.utcnow() - tutor.created_at).days
            if days_old <= 30:
                score += 30
                if days_old <= 7:
                    score += 20

        return score

    # Sort each tier by smart ranking
    tier1_tutors.sort(key=calculate_tier_score, reverse=True)
    tier2_tutors.sort(key=calculate_tier_score, reverse=True)
    tier3_tutors.sort(key=calculate_tier_score, reverse=True)

    # Shuffle within tiers for variety (80% chance)
    if page == 1 and random.random() < 0.8:
        random.shuffle(tier1_tutors)
        random.shuffle(tier2_tutors)
        random.shuffle(tier3_tutors)
        print("[Tiered Tutors] Shuffled within tiers")

    # Combine tiers: Tier 1 → Tier 2 → Tier 3
    all_ranked_tutors = tier1_tutors + tier2_tutors + tier3_tutors

    # ============================================
    # EXCLUSIVE SESSION FORMAT FILTERING (v2.2)
    # Apply exclusive session format filtering BEFORE pagination
    # ============================================

    # Apply exclusive session format filtering (v2.2)
    # Filter tutors who have ONLY the specified format (excluding hybrid tutors)
    if sessionFormat and sessionFormatExclusive == "true":
        print(f"[Tiered - Exclusive Filter] Filtering for tutors with ONLY {sessionFormat} packages")
        filtered_tutors = []

        for tutor in all_ranked_tutors:
            # Get all package formats for this tutor using raw SQL
            format_query = text("""
                SELECT DISTINCT session_format
                FROM tutor_packages
                WHERE tutor_id = :tutor_id AND is_active = true AND session_format IS NOT NULL
            """)
            tutor_formats = set(row[0] for row in db.execute(format_query, {"tutor_id": tutor.id}).fetchall())

            if not tutor_formats:
                continue

            # For Online-only: should have 'Online' but NOT 'In-person'
            # For In-person-only: should have 'In-person' but NOT 'Online'
            if sessionFormat == 'Online':
                if 'Online' in tutor_formats and 'In-person' not in tutor_formats:
                    filtered_tutors.append(tutor)
            elif sessionFormat == 'In-person':
                if 'In-person' in tutor_formats and 'Online' not in tutor_formats:
                    filtered_tutors.append(tutor)

        all_ranked_tutors = filtered_tutors
        total = len(all_ranked_tutors)
        print(f"[Tiered - Exclusive Filter] Filtered to {total} tutors with ONLY {sessionFormat} packages")

    # For Hybrid filter: get tutors who have BOTH formats
    elif sessionFormat == 'Hybrid':
        print(f"[Tiered - Hybrid Filter] Filtering for tutors with BOTH Online and In-person packages")
        hybrid_tutors = []

        for tutor in all_ranked_tutors:
            # Get all package formats for this tutor using raw SQL
            format_query = text("""
                SELECT DISTINCT session_format
                FROM tutor_packages
                WHERE tutor_id = :tutor_id AND is_active = true AND session_format IS NOT NULL
            """)
            tutor_formats = set(row[0] for row in db.execute(format_query, {"tutor_id": tutor.id}).fetchall())

            if not tutor_formats:
                continue

            # Must have BOTH Online and In-person
            if 'Online' in tutor_formats and 'In-person' in tutor_formats:
                hybrid_tutors.append(tutor)

        all_ranked_tutors = hybrid_tutors
        total = len(all_ranked_tutors)
        print(f"[Tiered - Hybrid Filter] Filtered to {total} hybrid tutors")

    # ============================================
    # POST-TIERING FILTERS
    # Apply additional filters AFTER tiering to maintain tier priority
    # ============================================

    # OPTIMIZATION: Fetch all package and rating data in batched queries
    all_tutor_ids = [t.id for t in all_ranked_tutors]

    # Batch fetch package data for all tutors
    pkg_batch_query = text("""
        SELECT
            tp.tutor_id,
            ARRAY_AGG(DISTINCT c.course_name) FILTER (WHERE c.course_name IS NOT NULL) as courses,
            ARRAY_AGG(DISTINCT grade_elem) FILTER (WHERE grade_elem IS NOT NULL) as grade_levels,
            ARRAY_AGG(DISTINCT tp.session_format) FILTER (WHERE tp.session_format IS NOT NULL AND tp.session_format != '') as session_formats,
            MIN(tp.hourly_rate) as min_price,
            MAX(tp.hourly_rate) as max_price
        FROM tutor_packages tp
        LEFT JOIN courses c ON c.id = ANY(tp.course_ids)
        LEFT JOIN LATERAL unnest(tp.grade_level) as grade_elem ON true
        WHERE tp.tutor_id = ANY(:tutor_ids)
        GROUP BY tp.tutor_id
    """)
    pkg_batch_results = db.execute(pkg_batch_query, {"tutor_ids": all_tutor_ids}).fetchall()
    pkg_data_map = {row.tutor_id: row for row in pkg_batch_results}

    # Batch fetch rating data for all tutors
    rating_batch_query = text("""
        SELECT
            tr.tutor_id,
            AVG((tr.subject_understanding_rating + tr.communication_rating + tr.discipline_rating + tr.punctuality_rating) / 4.0) as rating
        FROM tutor_reviews tr
        WHERE tr.tutor_id = ANY(:tutor_ids)
        GROUP BY tr.tutor_id
    """)
    rating_batch_results = db.execute(rating_batch_query, {"tutor_ids": all_tutor_ids}).fetchall()
    rating_data_map = {row.tutor_id: float(row.rating) if row.rating else 0.0 for row in rating_batch_results}

    print(f"[Post-Tiering Filters] Fetched data for {len(all_tutor_ids)} tutors")
    print(f"[Post-Tiering Filters] Package data: {len(pkg_data_map)} tutors")
    print(f"[Post-Tiering Filters] Rating data: {len(rating_data_map)} tutors")

    filtered_tutors = []
    for tutor in all_ranked_tutors:
        # Get pre-fetched data
        pkg_data = pkg_data_map.get(tutor.id)
        tutor_rating = rating_data_map.get(tutor.id, 0.0)

        # Apply subject filter
        if subject:
            if not pkg_data or not pkg_data.courses:
                continue
            subject_lower = subject.lower()
            if not any(subject_lower in (course or "").lower() for course in pkg_data.courses):
                continue

        # Apply grade level filter
        if min_grade_level is not None or max_grade_level is not None:
            if not pkg_data or not pkg_data.grade_levels:
                continue
            grade_match = False
            for grade in pkg_data.grade_levels:
                try:
                    # Extract numeric grade from strings like "Grade 10", "University" etc.
                    if grade.lower().startswith("grade"):
                        grade_num = float(grade.lower().replace("grade", "").strip())
                    elif grade.lower() == "university":
                        grade_num = 13.0
                    elif grade.lower() == "kg" or grade.lower() == "kindergarten":
                        grade_num = 0.5
                    elif grade.lower() == "nursery":
                        grade_num = 0.0
                    else:
                        continue

                    if min_grade_level is not None and grade_num < min_grade_level:
                        continue
                    if max_grade_level is not None and grade_num > max_grade_level:
                        continue
                    grade_match = True
                    break
                except:
                    continue
            if not grade_match:
                continue

        # Apply session format filter (ONLY if not already applied with exclusive filter)
        # The exclusive filter (lines 1841-1895) already filtered tutors, so skip this
        if sessionFormat and sessionFormatExclusive != "true":
            if not pkg_data or not pkg_data.session_formats:
                continue

            # For non-exclusive filtering, "Hybrid" means tutor offers BOTH online AND in-person
            if sessionFormat == "Hybrid":
                if not ('Online' in pkg_data.session_formats and 'In-person' in pkg_data.session_formats):
                    continue
            else:
                # Non-exclusive: check if format exists in tutor's formats (WILL include hybrid tutors)
                # This allows users to see hybrid tutors when filtering by Online or In-person (non-exclusively)
                if sessionFormat not in pkg_data.session_formats:
                    continue

        # Apply price filter
        if min_price is not None or max_price is not None:
            if not pkg_data:
                continue
            tutor_min_price = pkg_data.min_price or 0
            tutor_max_price = pkg_data.max_price or 0
            if min_price is not None and tutor_max_price < min_price:
                continue
            if max_price is not None and tutor_min_price > max_price:
                continue

        # Apply rating filter
        if min_rating is not None and tutor_rating < min_rating:
            print(f"   [Rating Filter] Tutor {tutor.id} filtered out: rating {tutor_rating:.2f} < min {min_rating}")
            continue
        if max_rating is not None and tutor_rating > max_rating:
            print(f"   [Rating Filter] Tutor {tutor.id} filtered out: rating {tutor_rating:.2f} > max {max_rating}")
            continue

        # Tutor passed all filters
        filtered_tutors.append(tutor)

    # Update total to reflect filtered count
    total = len(filtered_tutors)

    print(f"\n[Post-Tiering Filters] === FILTER RESULTS ===")
    print(f"  Initial tutors (after tiering): {len(all_ranked_tutors)}")
    print(f"  After all filters: {len(filtered_tutors)}")
    print(f"  Filtered out: {len(all_ranked_tutors) - len(filtered_tutors)}")
    if min_rating is not None or max_rating is not None:
        rating_filtered = len([t for t in all_ranked_tutors if rating_data_map.get(t.id, 0.0) < (min_rating or 0) or rating_data_map.get(t.id, 0.0) > (max_rating or 5)])
        print(f"  Rating filter removed: {rating_filtered} tutors")

    # ============================================
    # SORTING (OPTIONAL - OVERRIDES TIER RANKING)
    # ============================================

    if sort_by and sort_by != 'smart':
        print(f"[Tiered Tutors] Applying sort: {sort_by}")

        # Fetch all data needed for sorting
        tutor_ids_for_sort = [t.id for t in filtered_tutors]

        # Get package and rating data for sorting
        sort_data_query = text("""
            SELECT
                tp.tutor_id,
                MIN(tp.hourly_rate) as min_price,
                AVG((tr.subject_understanding_rating + tr.communication_rating + tr.discipline_rating + tr.punctuality_rating) / 4.0) as avg_rating
            FROM tutor_packages tp
            LEFT JOIN tutor_reviews tr ON tr.tutor_id = tp.tutor_id
            WHERE tp.tutor_id = ANY(:tutor_ids)
            GROUP BY tp.tutor_id
        """)
        sort_data = db.execute(sort_data_query, {"tutor_ids": tutor_ids_for_sort}).fetchall()
        sort_map = {row.tutor_id: row for row in sort_data}

        # Apply sorting
        if sort_by in ['rating', 'rating_desc']:
            filtered_tutors.sort(key=lambda t: float(sort_map.get(t.id).avg_rating) if sort_map.get(t.id) and sort_map.get(t.id).avg_rating else 0.0, reverse=True)
        elif sort_by == 'rating_asc':
            filtered_tutors.sort(key=lambda t: float(sort_map.get(t.id).avg_rating) if sort_map.get(t.id) and sort_map.get(t.id).avg_rating else 0.0)
        elif sort_by in ['price', 'price_asc']:
            filtered_tutors.sort(key=lambda t: float(sort_map.get(t.id).min_price) if sort_map.get(t.id) and sort_map.get(t.id).min_price else 999999)
        elif sort_by == 'price_desc':
            filtered_tutors.sort(key=lambda t: float(sort_map.get(t.id).min_price) if sort_map.get(t.id) and sort_map.get(t.id).min_price else 0, reverse=True)
        elif sort_by == 'experience' or sort_by == 'experience_desc':
            filtered_tutors.sort(key=lambda t: int(t.experience_years) if t.experience_years else 0, reverse=True)
        elif sort_by == 'experience_asc':
            filtered_tutors.sort(key=lambda t: int(t.experience_years) if t.experience_years else 0)
        elif sort_by in ['name', 'name_asc']:
            filtered_tutors.sort(key=lambda t: f"{t.user.first_name or ''} {t.user.father_name or ''}".strip().lower())
        elif sort_by == 'name_desc':
            filtered_tutors.sort(key=lambda t: f"{t.user.first_name or ''} {t.user.father_name or ''}".strip().lower(), reverse=True)
        elif sort_by == 'newest':
            filtered_tutors.sort(key=lambda t: t.created_at if t.created_at else datetime.min, reverse=True)
        elif sort_by == 'oldest':
            filtered_tutors.sort(key=lambda t: t.created_at if t.created_at else datetime.max)
        # If sort_by is 'smart' or unknown, keep tier ranking

    # Apply pagination
    offset = (page - 1) * limit
    tutors = filtered_tutors[offset:offset + limit]

    # Build tutor data (same format as get_tutors)
    tutor_ids = [tutor.id for tutor in tutors]

    # Fetch package data
    package_data_query = text("""
        SELECT
            tp.tutor_id,
            ARRAY_AGG(DISTINCT c.course_name) FILTER (WHERE c.course_name IS NOT NULL) as courses,
            ARRAY_AGG(DISTINCT grade_elem) FILTER (WHERE grade_elem IS NOT NULL) as grade_levels,
            ARRAY_AGG(DISTINCT tp.session_format) FILTER (WHERE tp.session_format IS NOT NULL AND tp.session_format != '') as session_formats,
            MIN(tp.hourly_rate) as min_price,
            MAX(tp.hourly_rate) as max_price
        FROM tutor_packages tp
        LEFT JOIN courses c ON c.id = ANY(tp.course_ids)
        LEFT JOIN LATERAL unnest(tp.grade_level) as grade_elem ON true
        WHERE tp.tutor_id = ANY(:tutor_ids)
        GROUP BY tp.tutor_id
    """)
    package_results = db.execute(package_data_query, {"tutor_ids": tutor_ids}).fetchall()
    package_data_map = {row.tutor_id: row for row in package_results}

    # Fetch rating data
    rating_query = text("""
        SELECT
            tr.tutor_id,
            AVG((tr.subject_understanding_rating + tr.communication_rating + tr.discipline_rating + tr.punctuality_rating) / 4.0) as rating,
            COUNT(*) as rating_count,
            AVG(tr.subject_understanding_rating) as subject_matter,
            AVG(tr.communication_rating) as communication,
            AVG(tr.discipline_rating) as discipline,
            AVG(tr.punctuality_rating) as punctuality
        FROM tutor_reviews tr
        WHERE tr.tutor_id = ANY(:tutor_ids)
        GROUP BY tr.tutor_id
    """)
    rating_results = db.execute(rating_query, {"tutor_ids": tutor_ids}).fetchall()
    rating_data_map = {row.tutor_id: row for row in rating_results}

    # Fetch workplace data
    workplace_query = text("""
        SELECT DISTINCT ON (cr.uploader_id)
            cr.uploader_id as tutor_id,
            cr.title as workplace
        FROM credentials cr
        WHERE cr.uploader_id = ANY(:tutor_ids)
        AND cr.uploader_role = 'tutor'
        AND cr.document_type = 'experience'
        AND cr.is_current = true
        ORDER BY cr.uploader_id, cr.created_at DESC
    """)
    workplace_results = db.execute(workplace_query, {"tutor_ids": tutor_ids}).fetchall()
    workplace_map = {row.tutor_id: row.workplace for row in workplace_results}

    # Build response
    tutor_list = []
    for tutor in tutors:
        pkg_data = package_data_map.get(tutor.id)
        rating_data = rating_data_map.get(tutor.id)

        courses = pkg_data.courses if pkg_data and pkg_data.courses else []
        grade_levels = pkg_data.grade_levels if pkg_data and pkg_data.grade_levels else []
        session_formats = pkg_data.session_formats if pkg_data and pkg_data.session_formats else []
        min_price = pkg_data.min_price if pkg_data else 0
        max_price = pkg_data.max_price if pkg_data else 0

        session_format_display = None
        if session_formats:
            if len(session_formats) == 1:
                session_format_display = session_formats[0]
            elif 'Online' in session_formats and 'In-person' in session_formats:
                # Tutor offers both online and in-person = Hybrid
                session_format_display = "Hybrid"
            else:
                session_format_display = "multiple"

        current_workplace = workplace_map.get(tutor.id)

        # Determine tier for this tutor
        tier_label = "Tier 3"
        if tutor in tier1_tutors:
            tier_label = "Tier 1 (Interests)"
        elif tutor in tier2_tutors:
            tier_label = "Tier 2 (Hobbies)"

        tutor_data = {
            "id": tutor.id,
            "user_id": tutor.user_id,
            "first_name": tutor.user.first_name,
            "father_name": tutor.user.father_name,
            "grandfather_name": tutor.user.grandfather_name,
            "last_name": tutor.user.last_name,
            "email": tutor.user.email,
            "profile_picture": tutor.user.profile_picture,
            "bio": tutor.bio,
            "quote": tutor.quote,
            "gender": tutor.user.gender,
            "courses": courses,
            "grades": grade_levels,
            "location": tutor.user.location,  # From users table (migrated from tutor_profiles)
            "teaches_at": current_workplace,
            "sessionFormat": session_format_display,
            "languages": tutor.user.languages or [],  # From users table (migrated from tutor_profiles)
            "price": min_price if min_price > 0 else 0,
            "price_max": max_price if max_price > 0 else 0,
            "currency": tutor.user.currency or "ETB",
            "rating": float(rating_data.rating) if rating_data else 0.0,
            "rating_count": int(rating_data.rating_count) if rating_data else 0,
            "subject_matter": float(rating_data.subject_matter) if rating_data else 0.0,
            "communication_skills": float(rating_data.communication) if rating_data else 0.0,
            "discipline": float(rating_data.discipline) if rating_data else 0.0,
            "punctuality": float(rating_data.punctuality) if rating_data else 0.0,
            "is_verified": tutor.user.is_verified,
            "is_active": tutor.is_active,
            "cover_image": tutor.cover_image,
            "subscription_plan_id": tutor.user.subscription_plan_id,
            "tier": tier_label  # NEW: Tier information for debugging
        }
        tutor_list.append(tutor_data)

    return {
        "tutors": tutor_list,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
        "tier_counts": {
            "tier1": len(tier1_tutors),
            "tier2": len(tier2_tutors),
            "tier3": len(tier3_tutors)
        }
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

    # Build name based on naming convention
    # Ethiopian: first_name + father_name + grandfather_name
    # International: first_name + last_name
    if current_user.last_name:
        # International naming convention
        display_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip()
    else:
        # Ethiopian naming convention
        name_parts = [current_user.first_name, current_user.father_name, current_user.grandfather_name]
        display_name = " ".join(part for part in name_parts if part)

    return {
        "id": tutor_profile.id,
        "user_id": tutor_profile.user_id,
        "name": display_name or "Tutor",
        # Individual name fields for edit modal population
        "first_name": current_user.first_name,
        "father_name": current_user.father_name,
        "grandfather_name": current_user.grandfather_name,
        "last_name": current_user.last_name,
        "username": tutor_profile.username,  # Read from tutor_profiles table
        # Contact info
        "email": current_user.email,
        "phone": current_user.phone,
        # Profile images - Read from users table
        "profile_picture": current_user.profile_picture,
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
        "languages": current_user.languages or [],  # Read from users table
        "hobbies": current_user.hobbies or [],  # Read from users table
        "location": current_user.location,  # Read from users table
        "display_location": current_user.display_location,  # Read from users table
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
        "verification_status": current_user.verification_status or "pending",  # From users table
        "is_verified": current_user.is_verified,  # From users table
        "is_active": tutor_profile.is_active,
        "is_basic": tutor_profile.is_basic,
        "social_links": current_user.social_links or {},  # Read from users table
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

    # Build name based on naming convention
    # Ethiopian: first_name + father_name + grandfather_name
    # International: first_name + last_name
    user = tutor.user
    if user.last_name:
        # International naming convention
        display_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    else:
        # Ethiopian naming convention
        name_parts = [user.first_name, user.father_name, user.grandfather_name]
        display_name = " ".join(part for part in name_parts if part)

    return {
        "id": tutor.id,
        "user_id": tutor.user_id,
        "first_name": tutor.user.first_name,
        "father_name": tutor.user.father_name,
        "grandfather_name": tutor.user.grandfather_name,
        "last_name": tutor.user.last_name,
        "name": display_name or "Tutor",
        "username": tutor.username,
        "email": tutor.user.email,
        "phone": tutor.user.phone,
        "profile_picture": tutor.user.profile_picture,
        "bio": tutor.bio,
        "quote": tutor.quote,
        "gender": tutor.user.gender,
        "courses": [],
        "grades": [],
        "location": tutor.user.location,
        "teaches_at": None,
        "sessionFormat": None,
        "course_type": None,
        "languages": tutor.user.languages,
        "experience": None,
        "is_verified": tutor.user.is_verified if tutor.user else False,
        "cover_image": tutor.cover_image,
        "social_links": tutor.user.social_links,
        "hobbies": tutor.user.hobbies,
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
    # Fields that belong to users table
    user_fields = {'first_name', 'father_name', 'grandfather_name', 'last_name', 'gender',
                   'location', 'country_code', 'display_location', 'profile_picture', 'social_links', 'languages', 'hobbies'}

    # Update user fields if provided
    for field in user_fields:
        if field in profile_data and profile_data[field] is not None:
            value = profile_data[field]
            if isinstance(value, str):
                value = value.strip()
                if value:  # Only update if non-empty
                    setattr(current_user, field, value)
            else:
                # For non-string fields (JSON, arrays, etc.)
                setattr(current_user, field, value)

    # Auto-deduce country_code from location if not explicitly provided
    if 'location' in profile_data and profile_data['location'] and not profile_data.get('country_code'):
        from currency_utils import get_country_code_from_location, get_currency_from_country
        deduced_code = get_country_code_from_location(profile_data['location'])
        if deduced_code:
            current_user.country_code = deduced_code
            current_user.currency = get_currency_from_country(deduced_code)
            print(f"[Tutor] Auto-deduced country: {deduced_code}, currency: {current_user.currency}")
    elif profile_data.get('country_code'):
        from currency_utils import get_currency_from_country
        current_user.currency = get_currency_from_country(profile_data['country_code'])

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
    print(f"📊 Before commit - languages: {current_user.languages}, gender: {current_user.gender}, display_location: {current_user.display_location}")

    tutor_profile.profile_completion = calculate_tutor_profile_completion(tutor_profile)
    tutor_profile.profile_complete = tutor_profile.profile_completion >= 80

    db.commit()

    print(f"✅ Committed to database - languages: {current_user.languages}, display_location: {current_user.display_location}")

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
        from storage_service import StorageService

        # Read file contents
        contents = await file.read()
        file_size_bytes = len(contents)

        # Validate storage limits based on subscription
        is_allowed, error_message = StorageService.validate_file_upload(
            db=db,
            user_id=current_user.id,
            file_size_bytes=file_size_bytes,
            file_type='image'
        )

        if not is_allowed:
            raise HTTPException(status_code=400, detail=error_message)

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

        # Update user with profile picture URL (centralized in users table)
        current_user.profile_picture = result['url']  # From users table (centralized)

        db.commit()

        # Update user's storage usage
        StorageService.update_storage_usage(
            db=db,
            user_id=current_user.id,
            file_size_bytes=file_size_bytes,
            file_type='image',
            operation='add'
        )

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
    """Upload cover image for profile (tutor, student, parent, advertiser, or user)"""
    try:
        from storage_service import StorageService

        # Read file contents
        contents = await file.read()
        file_size_bytes = len(contents)

        # Validate storage limits based on subscription
        is_allowed, error_message = StorageService.validate_file_upload(
            db=db,
            user_id=current_user.id,
            file_size_bytes=file_size_bytes,
            file_type='image'
        )

        if not is_allowed:
            raise HTTPException(status_code=400, detail=error_message)

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
        elif current_user.active_role == "user":
            # For "user" role, use the user_profiles table
            profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
            if not profile:
                # Create user profile if it doesn't exist
                profile = UserProfile(user_id=current_user.id)
                db.add(profile)
                db.commit()
                db.refresh(profile)
            profile_id = profile.id
        else:
            raise HTTPException(status_code=400, detail=f"Invalid role: {current_user.active_role}")

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

        # Update user's storage usage
        StorageService.update_storage_usage(
            db=db,
            user_id=current_user.id,
            file_size_bytes=file_size_bytes,
            file_type='image',
            operation='add'
        )

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
        from storage_service import StorageService

        # Debug: Log received caption
        print(f"📝 Backend received caption: '{caption}'")
        print(f"📝 Caption type: {type(caption)}")
        print(f"📝 Caption length: {len(caption) if caption else 0}")

        # Read file contents
        contents = await file.read()
        file_size_bytes = len(contents)

        # Determine file type (image or video)
        file_ext = file.filename.split('.')[-1].lower()
        is_video = file_ext in ['mp4', 'webm', 'avi', 'mov', 'wmv', 'flv', 'mkv']
        is_image = file_ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']

        if not is_video and not is_image:
            raise HTTPException(status_code=400, detail="Only images and videos are allowed for stories")

        media_type = 'video' if is_video else 'image'

        # Validate storage limits based on subscription
        is_allowed, error_message = StorageService.validate_file_upload(
            db=db,
            user_id=current_user.id,
            file_size_bytes=file_size_bytes,
            file_type=media_type
        )

        if not is_allowed:
            raise HTTPException(status_code=400, detail=error_message)

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

        # Save story to database
        from datetime import timedelta
        expires_at = datetime.utcnow() + timedelta(hours=24)  # Stories expire after 24 hours

        story = Story(
            user_id=current_user.id,
            profile_id=profile_id,
            profile_type=current_user.active_role,
            media_url=result['url'],
            media_type='video' if is_video else 'image',
            caption=caption,
            views=0,
            expires_at=expires_at,
            is_active=True
        )

        db.add(story)
        db.commit()
        db.refresh(story)

        # Update user's storage usage
        StorageService.update_storage_usage(
            db=db,
            user_id=current_user.id,
            file_size_bytes=file_size_bytes,
            file_type=media_type,
            operation='add'
        )

        return {
            "success": True,
            "message": "Story uploaded successfully",
            "story_id": story.id,
            "url": result['url'],
            "media_type": "video" if is_video else "image",
            "caption": caption,
            "expires_at": expires_at.isoformat(),
            "details": result
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/stories")
def get_stories(
    profile_id: Optional[int] = None,
    profile_type: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get active stories (not expired)
    If profile_id and profile_type are provided, get stories for that profile
    Otherwise, get all active stories
    """
    try:
        from datetime import datetime

        # Base query - only active and non-expired stories
        query = db.query(Story).filter(
            Story.is_active == True,
            Story.expires_at > datetime.utcnow()
        )

        # Filter by profile if provided
        if profile_id and profile_type:
            query = query.filter(
                Story.profile_id == profile_id,
                Story.profile_type == profile_type
            )

        # Order by creation date (newest first) and limit
        stories = query.order_by(Story.created_at.desc()).limit(limit).all()

        # Format response with user info
        result = []
        for story in stories:
            user = db.query(User).filter(User.id == story.user_id).first()
            result.append({
                "id": story.id,
                "user_id": story.user_id,
                "profile_id": story.profile_id,
                "profile_type": story.profile_type,
                "media_url": story.media_url,
                "media_type": story.media_type,
                "caption": story.caption,
                "views": story.views,
                "created_at": story.created_at.isoformat() if story.created_at else None,
                "expires_at": story.expires_at.isoformat() if story.expires_at else None,
                "user_name": f"{user.first_name} {user.father_name}" if user else "Unknown",
                "profile_picture": user.profile_picture if user else None
            })

        return {
            "stories": result,
            "total": len(result)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/stories/{story_id}/view")
def increment_story_view(
    story_id: int,
    db: Session = Depends(get_db)
):
    """Increment story view count"""
    try:
        story = db.query(Story).filter(Story.id == story_id).first()
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")

        # Increment views
        story.views += 1
        db.commit()

        return {
            "success": True,
            "views": story.views
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/stories/{story_id}")
async def delete_story(
    story_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a story - only the owner can delete"""
    try:
        # Get the story
        story = db.query(Story).filter(Story.id == story_id).first()
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")

        # Check if the current user owns this story
        if story.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="You don't have permission to delete this story")

        # Delete the story
        db.delete(story)
        db.commit()

        return {
            "success": True,
            "message": "Story deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/my-stories")
def get_my_stories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's active stories"""
    try:
        from datetime import datetime

        # Get profile_id based on active role
        profile_id = None
        if current_user.active_role == "tutor":
            profile = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
            profile_id = profile.id if profile else None
        elif current_user.active_role == "student":
            profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
            profile_id = profile.id if profile else None
        elif current_user.active_role == "parent":
            profile = db.query(ParentProfile).filter(ParentProfile.user_id == current_user.id).first()
            profile_id = profile.id if profile else None
        elif current_user.active_role == "advertiser":
            profile = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == current_user.id).first()
            profile_id = profile.id if profile else None

        if not profile_id:
            return {"stories": [], "total": 0}

        # Get active stories for this profile
        stories = db.query(Story).filter(
            Story.profile_id == profile_id,
            Story.profile_type == current_user.active_role,
            Story.is_active == True,
            Story.expires_at > datetime.utcnow()
        ).order_by(Story.created_at.desc()).all()

        result = []
        for story in stories:
            result.append({
                "id": story.id,
                "media_url": story.media_url,
                "media_type": story.media_type,
                "caption": story.caption,
                "views": story.views,
                "created_at": story.created_at.isoformat() if story.created_at else None,
                "expires_at": story.expires_at.isoformat() if story.expires_at else None
            })

        return {
            "stories": result,
            "total": len(result)
        }

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
def get_user_roles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's roles and active role (only returns active roles)"""
    # FIX: DO NOT overwrite user's chosen active_role!
    # Just use the current active_role - user chooses via /api/switch-role
    active_role = current_user.active_role

    # Filter out deactivated roles
    active_roles = []

    for role in current_user.roles:
        # Check if role is active
        is_active = True

        if role == 'student':
            profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
            if profile and hasattr(profile, 'is_active'):
                is_active = profile.is_active
        elif role == 'tutor':
            profile = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
            if profile and hasattr(profile, 'is_active'):
                is_active = profile.is_active
        elif role == 'parent':
            profile = db.query(ParentProfile).filter(ParentProfile.user_id == current_user.id).first()
            if profile and hasattr(profile, 'is_active'):
                is_active = profile.is_active
        elif role == 'advertiser':
            profile = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == current_user.id).first()
            if profile and hasattr(profile, 'is_active'):
                is_active = profile.is_active
        elif role == 'user':
            profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
            if profile and hasattr(profile, 'is_active'):
                is_active = profile.is_active

        # Only include active roles
        if is_active:
            active_roles.append(role)

    return {
        "user_roles": active_roles,
        "active_role": active_role  # Return user's chosen active_role
    }

@router.get("/api/check-role-status")
def check_role_status(
    role: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if user has a role and whether it's active or deactivated"""
    if role not in current_user.roles:
        return {
            "has_role": False,
            "is_active": False,
            "is_deactivated": False
        }

    # Check if role is deactivated
    role_model = None
    if role == 'student':
        role_model = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    elif role == 'tutor':
        role_model = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    elif role == 'parent':
        role_model = db.query(ParentProfile).filter(ParentProfile.user_id == current_user.id).first()
    elif role == 'advertiser':
        role_model = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == current_user.id).first()
    elif role == 'user':
        role_model = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()

    is_active = True
    if role_model and hasattr(role_model, 'is_active'):
        is_active = role_model.is_active

    return {
        "has_role": True,
        "is_active": is_active,
        "is_deactivated": not is_active
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
    print(f"[switch-role] BEFORE update: user {fresh_user.id} active_role = {fresh_user.active_role}")
    fresh_user.active_role = new_role
    print(f"[switch-role] AFTER update (before commit): user {fresh_user.id} active_role = {fresh_user.active_role}")

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

    # CRITICAL FIX: Commit both changes together in a single transaction
    # This ensures active_role update and refresh token are both committed
    try:
        db.commit()
        print(f"[switch-role] ✅ COMMIT SUCCESSFUL")
    except Exception as commit_error:
        print(f"[switch-role] ❌ COMMIT FAILED: {commit_error}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update role: {str(commit_error)}")

    print(f"[switch-role] AFTER commit: user {fresh_user.id} active_role = {fresh_user.active_role}")

    # Verify the database was actually updated by querying in a NEW session
    db.expire_all()  # Clear the session cache
    verification_user = db.query(User).filter(User.id == fresh_user.id).first()
    print(f"[switch-role] VERIFIED from DB (fresh query): user {verification_user.id} active_role = {verification_user.active_role}")

    if verification_user.active_role != new_role:
        print(f"[switch-role] ⚠️ WARNING: Database verification failed!")
        print(f"[switch-role]   Expected: {new_role}, Got: {verification_user.active_role}")
        # Try to fix it by updating again
        verification_user.active_role = new_role
        db.commit()
        print(f"[switch-role] Attempted second commit")

        # Verify again after second commit
        db.expire(verification_user)
        db.refresh(verification_user)
        print(f"[switch-role] After second commit, active_role: {verification_user.active_role}")

    # CRITICAL FIX: Return the ACTUAL database value, not the request parameter
    # This ensures the frontend gets the truth about what's in the database
    actual_active_role = verification_user.active_role

    print(f"[switch-role] Returning active_role: {actual_active_role}")

    from fastapi.responses import JSONResponse

    return JSONResponse(
        content={
            "message": f"Successfully switched to {actual_active_role} role",
            "active_role": actual_active_role,  # FIXED: Return database value, not request param
            "user_roles": fresh_user.roles,
            "access_token": new_access_token,  # NEW: Return updated token
            "refresh_token": new_refresh_token,  # NEW: Return updated refresh token
            "token_type": "bearer"
        },
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

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

    # Set expiration (10 minutes from now)
    expires_at = datetime.utcnow() + timedelta(minutes=10)

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

@router.post("/api/send-otp-to-email")
def send_otp_to_custom_email(
    otp_data: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send OTP to a custom email address (e.g., for company email verification).
    This allows sending OTP to an email different from the user's registered email.
    """
    import random
    from datetime import timedelta

    email = otp_data.get("email")
    purpose = otp_data.get("purpose", "company_verification")

    if not email:
        raise HTTPException(status_code=400, detail="Email address is required")

    # Validate email format
    import re
    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    if not re.match(email_regex, email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))

    # Set expiration (10 minutes from now)
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Invalidate any existing unused OTPs for this user and purpose
    db.query(OTP).filter(
        OTP.user_id == current_user.id,
        OTP.purpose == purpose,
        OTP.is_used == False
    ).update({"is_used": True})
    db.commit()

    # Create new OTP - store the target email in the OTP record
    new_otp = OTP(
        user_id=current_user.id,
        otp_code=otp_code,
        purpose=purpose,
        expires_at=expires_at
    )
    db.add(new_otp)
    db.commit()

    # Send OTP to the custom email
    from email_service import email_service

    sent_successfully = email_service.send_otp_email(
        to_email=email,
        otp_code=otp_code,
        purpose=purpose
    )

    # In development mode, include OTP for testing
    include_otp = not sent_successfully or os.getenv("ENVIRONMENT", "development") == "development"

    return {
        "message": f"OTP sent successfully to {email[:3]}***{email.split('@')[1] if '@' in email else ''}",
        "destination": "email",
        "destination_value": f"{email[:3]}***@{email.split('@')[1]}" if '@' in email else "***",
        "expires_in": 300,  # 5 minutes in seconds
        "otp": otp_code if include_otp else None,
        "target_email": email  # Store the email we sent to for verification
    }

@router.post("/api/verify-otp-email")
def verify_otp_for_custom_email(
    otp_data: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify OTP for custom email verification (e.g., company email).
    """
    otp_code = otp_data.get("otp")
    purpose = otp_data.get("purpose", "company_verification")
    email = otp_data.get("email")  # The email that was verified

    if not otp_code:
        raise HTTPException(status_code=400, detail="OTP code is required")

    # Find valid OTP
    otp_record = db.query(OTP).filter(
        OTP.user_id == current_user.id,
        OTP.otp_code == otp_code,
        OTP.purpose == purpose,
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
        "email": email
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

    # Set expiration (10 minutes from now)
    expires_at = datetime.utcnow() + timedelta(minutes=10)

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
    """Add a new role to user's account with OTP verification

    RESTORATION LOGIC:
    - If user previously deleted this role and it's pending deletion, restore it
    - If user never had this role or it was fully deleted, create new profile
    """
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

    # Check if user already has this role (active) BEFORE verifying OTP/password
    # This prevents burning the OTP if the role already exists AND is active
    if new_role in current_user.roles:
        # Check if role is deactivated
        role_model = None
        is_deactivated = False

        if new_role == 'student':
            role_model = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        elif new_role == 'tutor':
            role_model = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
        elif new_role == 'parent':
            role_model = db.query(ParentProfile).filter(ParentProfile.user_id == current_user.id).first()
        elif new_role == 'advertiser':
            role_model = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == current_user.id).first()
        elif new_role == 'user':
            role_model = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()

        if role_model and hasattr(role_model, 'is_active'):
            is_deactivated = not role_model.is_active

        if not is_deactivated:
            raise HTTPException(status_code=400, detail=f"You already have the {new_role} role")
        # If deactivated, continue to reactivate it

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

    # Check if role is deactivated and reactivate it
    role_reactivated = False
    if new_role in current_user.roles:
        role_model = None
        if new_role == 'student':
            role_model = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        elif new_role == 'tutor':
            role_model = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
        elif new_role == 'parent':
            role_model = db.query(ParentProfile).filter(ParentProfile.user_id == current_user.id).first()
        elif new_role == 'advertiser':
            role_model = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == current_user.id).first()
        elif new_role == 'user':
            role_model = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()

        if role_model and hasattr(role_model, 'is_active') and not role_model.is_active:
            # Reactivate the role
            role_model.is_active = True
            # CRITICAL FIX: Clear scheduled_deletion_at when reactivating
            if hasattr(role_model, 'scheduled_deletion_at'):
                role_model.scheduled_deletion_at = None
            role_reactivated = True

            # DO NOT automatically set as active role - let user choose
            # current_user.active_role = new_role  # REMOVED: User should choose via "Switch to Account" button

            db.commit()
            db.refresh(current_user)

            # Generate new JWT tokens with CURRENT active role (not the newly reactivated one)
            role_ids = get_role_ids_from_user(current_user, db)

            token_data = {
                "sub": current_user.id,
                "role": current_user.active_role,  # Keep current active role, not the newly reactivated one
                "role_ids": role_ids
            }

            new_access_token = create_access_token(data=token_data)
            new_refresh_token = create_refresh_token(data=token_data)

            # Store new refresh token
            refresh_token_obj = RefreshToken(
                token=new_refresh_token,
                user_id=current_user.id,
                expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
            )
            db.add(refresh_token_obj)
            db.commit()

            # Capture values BEFORE returning to avoid DetachedInstanceError
            user_roles = current_user.roles
            active_role = current_user.active_role

            return {
                "message": f"{new_role.capitalize()} role reactivated successfully",
                "user_roles": user_roles,
                "active_role": active_role,
                "role_reactivated": True,
                "access_token": new_access_token,  # NEW: Return updated token
                "refresh_token": new_refresh_token,  # NEW: Return updated refresh token
                "token_type": "bearer"
            }

    # Check if user has a pending deletion request for this role
    # If so, restore the role instead of creating a new profile
    pending_deletion = db.execute(
        text("""
            SELECT id, profile_id, delete_user
            FROM account_deletion_requests
            WHERE user_id = :user_id AND role = :role AND status = 'pending'
            ORDER BY requested_at DESC LIMIT 1
        """),
        {"user_id": current_user.id, "role": new_role}
    ).fetchone()

    role_restored = False
    if pending_deletion:
        # User is restoring a previously deleted role
        deletion_id, profile_id, delete_user = pending_deletion

        # Cancel the deletion request
        db.execute(
            text("""
                UPDATE account_deletion_requests
                SET status = 'cancelled',
                    cancelled_at = :now,
                    cancelled_by_login = FALSE,
                    cancellation_reason = 'User restored role by adding it back'
                WHERE id = :deletion_id
            """),
            {"deletion_id": deletion_id, "now": datetime.utcnow()}
        )

        # If the entire user account was pending deletion, restore it too
        if delete_user:
            current_user.account_status = 'active'
            current_user.deactivated_at = None
            current_user.scheduled_deletion_at = None
            current_user.is_active = True

        role_restored = True
        print(f"[Add Role] Restored {new_role} role for user {current_user.id} (cancelled deletion request {deletion_id})")

    # Add new role - MUST create a NEW list for SQLAlchemy to detect the change
    # If you modify the existing list, SQLAlchemy won't track it as changed
    current_roles = current_user.roles if isinstance(current_user.roles, list) else []
    current_user.roles = current_roles + [new_role]  # Create NEW list instead of append

    # Create corresponding profile based on role (only if not restoring or profile doesn't exist)
    new_tutor_created = False
    new_parent_created = False

    if new_role == "tutor" and not current_user.tutor_profile:
        tutor_profile = TutorProfile(user_id=current_user.id)
        db.add(tutor_profile)
        db.flush()  # Flush to get the profile ID
        new_tutor_created = True

        # Create tutor_analysis record with default 2.0 rating
        tutor_analysis = TutorAnalysis(
            tutor_id=tutor_profile.id,
            average_rating=2.0,
            total_reviews=0,
            avg_subject_understanding_rating=2.0,
            avg_communication_rating=2.0,
            avg_discipline_rating=2.0,
            avg_punctuality_rating=2.0,
            total_students=0,
            current_students=0,
            alumni_students=0,
            success_rate=0.0,
            total_sessions_completed=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(tutor_analysis)

    elif new_role == "student" and not current_user.student_profile:
        student_profile = StudentProfile(user_id=current_user.id)
        db.add(student_profile)

    elif new_role == "parent" and not current_user.parent_profile:
        parent_profile = ParentProfile(
            user_id=current_user.id,
            rating=2.0,  # Set default 2.0 rating
            rating_count=0
        )
        db.add(parent_profile)
        new_parent_created = True

    elif new_role == "advertiser" and not hasattr(current_user, 'advertiser_profile'):
        advertiser_profile = AdvertiserProfile(user_id=current_user.id)
        db.add(advertiser_profile)

    elif new_role == "user" and not current_user.user_profile:
        user_profile = UserProfile(user_id=current_user.id)
        db.add(user_profile)

    # DO NOT automatically set newly added role as active role - let user choose
    # current_user.active_role = new_role  # REMOVED: User should choose via "Switch to Account" button

    # Commit and ensure changes are flushed to database
    db.commit()
    db.flush()  # Force write to database
    db.refresh(current_user)

    # Generate new JWT tokens with CURRENT active role (not the newly added one)
    role_ids = get_role_ids_from_user(current_user, db)

    token_data = {
        "sub": current_user.id,
        "role": current_user.active_role,  # Keep current active role, not the newly added one
        "role_ids": role_ids
    }

    new_access_token = create_access_token(data=token_data)
    new_refresh_token = create_refresh_token(data=token_data)

    # Store new refresh token
    refresh_token_obj = RefreshToken(
        token=new_refresh_token,
        user_id=current_user.id,
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(refresh_token_obj)
    db.commit()

    # Capture values BEFORE closing session to avoid DetachedInstanceError
    user_roles = current_user.roles
    active_role = current_user.active_role

    # Close the session to ensure no stale data remains
    db.close()

    message = f"{new_role.capitalize()} role restored successfully" if role_restored else f"{new_role.capitalize()} role added successfully"

    return {
        "message": message,
        "user_roles": user_roles,
        "active_role": active_role,
        "role_restored": role_restored,
        "access_token": new_access_token,  # NEW: Return updated token
        "refresh_token": new_refresh_token,  # NEW: Return updated refresh token
        "token_type": "bearer"
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

    # Set expiration (10 minutes from now)
    expires_at = datetime.utcnow() + timedelta(minutes=10)

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

    # Set expiration (10 minutes)
    expires_at = datetime.utcnow() + timedelta(minutes=10)

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
    first_name = verification_data.get("first_name", "").strip() or None
    father_name = verification_data.get("father_name", "").strip() or None
    grandfather_name = verification_data.get("grandfather_name", "").strip() or None
    password = verification_data.get("password", "").strip()
    role = verification_data.get("role") or None  # None means no role yet — user picks later
    if role:
        role = role.strip() or None
    referral_code = verification_data.get("referral_code", "").strip() or None

    if not otp_code:
        raise HTTPException(status_code=400, detail="OTP code is required")

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

    # Create new user — no role by default, user picks via add-role flow
    new_user = User(
        first_name=first_name,
        father_name=father_name,
        grandfather_name=grandfather_name,
        email=email if email else None,
        phone=phone if phone else None,
        password_hash=hash_password(password),
        roles=[role] if role else [],
        active_role=role,  # None if no role provided
        email_verified=True if email else False  # Auto-verify if OTP was sent to email
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create profile based on role (only if a role was explicitly provided)
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

    # Handle referral code if provided
    if referral_code:
        try:
            from models import UserReferralCode, ReferralRegistration, ReferralClick

            referral_code_obj = db.query(UserReferralCode).filter(
                UserReferralCode.referral_code == referral_code
            ).first()

            if referral_code_obj:
                existing_referral = db.query(ReferralRegistration).filter(
                    ReferralRegistration.referred_user_id == new_user.id
                ).first()

                if not existing_referral:
                    referral_registration = ReferralRegistration(
                        referrer_user_id=referral_code_obj.user_id,
                        referrer_profile_type=referral_code_obj.profile_type,
                        referral_code=referral_code,
                        referred_user_id=new_user.id,
                        referred_user_email=new_user.email or "",
                        referred_user_name=f"{new_user.first_name or ''} {new_user.father_name or ''}".strip(),
                    )
                    db.add(referral_registration)

                    referral_code_obj.total_referrals += 1
                    referral_code_obj.active_referrals += 1
                    referral_code_obj.updated_at = datetime.utcnow()

                    # Mark the most recent click from this code as converted
                    recent_click = db.query(ReferralClick).filter(
                        ReferralClick.referral_code == referral_code,
                        ReferralClick.converted == False
                    ).order_by(ReferralClick.clicked_at.desc()).first()

                    if recent_click:
                        recent_click.converted = True
                        recent_click.converted_user_id = new_user.id

                    db.commit()
                    print(f"[REFERRAL] User {new_user.id} registered via referral code {referral_code}")
        except Exception as e:
            print(f"[REFERRAL ERROR] Failed to track referral: {e}")

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
            date_of_birth=new_user.date_of_birth,
            gender=new_user.gender,
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
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new blog post"""
    # Get the profile_id based on active_role
    user_id = current_user["id"]
    active_role = current_user.get("active_role", "student")

    # Get the appropriate profile_id
    profile_id = user_id  # Default to user_id
    if active_role == "tutor":
        tutor = db.query(TutorProfile).filter(TutorProfile.user_id == user_id).first()
        if tutor:
            profile_id = tutor.id
    elif active_role == "student":
        student = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        if student:
            profile_id = student.id

    new_blog = Blog(
        profile_id=profile_id,
        role=active_role,
        title=post_data.title,
        description=post_data.description,
        blog_text=post_data.content,
        category=post_data.category,
        blog_picture=post_data.thumbnail_url
    )

    db.add(new_blog)
    db.commit()
    db.refresh(new_blog)

    return {"message": "Blog post created successfully", "post_id": new_blog.id}

@router.get("/api/blog/posts")
def get_blog_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    author: Optional[str] = Query(None),
    filter: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get blog posts with pagination and filtering"""
    query = db.query(Blog)

    # Filter by author if specified
    if author == "me" and current_user:
        user_id = current_user["id"]
        active_role = current_user.get("active_role", "student")

        # Get the profile_id based on active_role
        profile_id = user_id
        if active_role == "tutor":
            tutor = db.query(TutorProfile).filter(TutorProfile.user_id == user_id).first()
            if tutor:
                profile_id = tutor.id
        elif active_role == "student":
            student = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
            if student:
                profile_id = student.id

        query = query.filter(Blog.profile_id == profile_id, Blog.role == active_role)

    if category:
        query = query.filter(func.lower(Blog.category) == category.lower())

    if search:
        search_filter = or_(
            func.lower(Blog.title).contains(search.lower()),
            func.lower(Blog.description).contains(search.lower()),
            func.lower(Blog.blog_text).contains(search.lower())
        )
        query = query.filter(search_filter)

    query = query.order_by(desc(Blog.created_at))

    total = query.count()
    offset = (page - 1) * limit
    blogs = query.offset(offset).limit(limit).all()

    blog_list = []
    for blog in blogs:
        # Get author info based on role and profile_id
        author_info = {"id": blog.profile_id, "first_name": "Unknown", "father_name": "", "profile_picture": None}

        if blog.role == "tutor":
            tutor = db.query(TutorProfile).filter(TutorProfile.id == blog.profile_id).first()
            if tutor:
                user = db.query(User).filter(User.id == tutor.user_id).first()
                if user:
                    author_info = {
                        "id": user.id,
                        "first_name": user.first_name,
                        "father_name": user.father_name,
                        "profile_picture": user.profile_picture
                    }
        elif blog.role == "student":
            student = db.query(StudentProfile).filter(StudentProfile.id == blog.profile_id).first()
            if student:
                user = db.query(User).filter(User.id == student.user_id).first()
                if user:
                    author_info = {
                        "id": user.id,
                        "first_name": user.first_name,
                        "father_name": user.father_name,
                        "profile_picture": user.profile_picture
                    }

        blog_data = {
            "id": blog.id,
            "title": blog.title,
            "description": blog.description,
            "content": blog.blog_text,
            "thumbnail_url": blog.blog_picture,
            "category": blog.category,
            "reading_time": blog.reading_time,
            "likes": blog.likes,
            "dislikes": blog.dislikes,
            "shares": blog.shares,
            "saves": blog.saves,
            "author": author_info,
            "created_at": blog.created_at,
            "updated_at": blog.updated_at
        }
        blog_list.append(blog_data)

    return {
        "posts": blog_list,
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
    role: str = Query("tutor"),
    db: Session = Depends(get_db)
):
    """Get blog posts by a specific author (profile_id and role)"""
    query = db.query(Blog).filter(Blog.profile_id == author_id, Blog.role == role)
    query = query.order_by(desc(Blog.created_at))

    total = query.count()
    offset = (page - 1) * limit
    blogs = query.offset(offset).limit(limit).all()

    blog_list = []
    for blog in blogs:
        # Get author info based on role and profile_id
        author_info = {"id": blog.profile_id, "first_name": "Unknown", "father_name": "", "profile_picture": None}

        if blog.role == "tutor":
            tutor = db.query(TutorProfile).filter(TutorProfile.id == blog.profile_id).first()
            if tutor:
                user = db.query(User).filter(User.id == tutor.user_id).first()
                if user:
                    author_info = {
                        "id": user.id,
                        "first_name": user.first_name,
                        "father_name": user.father_name,
                        "profile_picture": user.profile_picture
                    }
        elif blog.role == "student":
            student = db.query(StudentProfile).filter(StudentProfile.id == blog.profile_id).first()
            if student:
                user = db.query(User).filter(User.id == student.user_id).first()
                if user:
                    author_info = {
                        "id": user.id,
                        "first_name": user.first_name,
                        "father_name": user.father_name,
                        "profile_picture": user.profile_picture
                    }

        blog_data = {
            "id": blog.id,
            "title": blog.title,
            "description": blog.description,
            "content": blog.blog_text,
            "thumbnail_url": blog.blog_picture,
            "category": blog.category,
            "reading_time": blog.reading_time,
            "likes": blog.likes,
            "dislikes": blog.dislikes,
            "shares": blog.shares,
            "saves": blog.saves,
            "author": author_info,
            "created_at": blog.created_at,
            "updated_at": blog.updated_at
        }
        blog_list.append(blog_data)

    return {
        "posts": blog_list,
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
    sort_by: str = Query("popular", regex="^(popular|rating|newest|trending)$"),
    db: Session = Depends(get_db)
):
    """Get courses with filtering and pagination

    Updated to use new courses table schema:
    - course_name, course_category, course_level, course_description
    - thumbnail, duration, lessons, lesson_title[], language[]
    - rating, rating_count, created_at, updated_at
    - search_count, trending_score (for trending sort)
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
    elif sort_by == "trending":
        # Sort by trending_score (time-weighted search popularity), then rating
        query += " ORDER BY trending_score DESC NULLS LAST, search_count DESC NULLS LAST, rating DESC"

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
            "status": course.status or "pending",
            "status_at": course.status_at.isoformat() if course.status_at else None,
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
            "status": course.status or "pending",
            "status_by": course.status_by,
            "status_at": course.status_at.isoformat() if course.status_at else None,
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
    """Get platform statistics - counts verified users from users.is_verified and total users"""
    try:
        # Count total users (all registered users regardless of verification)
        result_total_users = db.execute(text("SELECT COUNT(*) FROM users"))
        total_users = result_total_users.scalar() or 0

        # Count verified parents (uses users.is_verified from consolidated verification)
        result_parents = db.execute(text("""
            SELECT COUNT(*) FROM parent_profiles pp
            JOIN users u ON pp.user_id = u.id
            WHERE u.is_verified = true
        """))
        verified_parents = result_parents.scalar() or 0

        # Count verified students (uses users.is_verified)
        result_students = db.execute(text("""
            SELECT COUNT(*) FROM student_profiles sp
            JOIN users u ON sp.user_id = u.id
            WHERE u.is_verified = true
        """))
        verified_students = result_students.scalar() or 0

        # Count verified tutors (uses users.is_verified)
        result_tutors = db.execute(text("""
            SELECT COUNT(*) FROM tutor_profiles tp
            JOIN users u ON tp.user_id = u.id
            WHERE u.is_verified = true
        """))
        verified_tutors = result_tutors.scalar() or 0

        # Try to count videos (fallback to 0 if table doesn't exist)
        try:
            result_videos = db.execute(text("SELECT COUNT(*) FROM video_reels WHERE is_active = true"))
            total_videos = result_videos.scalar() or 0
        except:
            total_videos = 0

        # Count verified schools
        try:
            result_schools = db.execute(text("SELECT COUNT(*) FROM schools WHERE status = 'verified'"))
            total_schools = result_schools.scalar() or 0
        except:
            total_schools = 0

        # Count verified courses
        try:
            result_courses = db.execute(text("SELECT COUNT(*) FROM courses WHERE status = 'verified'"))
            total_courses = result_courses.scalar() or 0
        except:
            total_courses = 0

        # Count distinct countries from users table
        try:
            result_countries = db.execute(text(
                "SELECT COUNT(DISTINCT country_code) FROM users WHERE country_code IS NOT NULL AND country_code != ''"
            ))
            unique_countries = result_countries.scalar() or 0
        except:
            unique_countries = 0
    except Exception as e:
        print(f"Error fetching statistics: {e}")
        total_users = 0
        verified_parents = 0
        verified_students = 0
        verified_tutors = 0
        total_videos = 0
        total_schools = 0
        total_courses = 0
        unique_countries = 0

    return {
        "total_users": total_users,
        "registered_parents": verified_parents,
        "students": verified_students,
        "expert_tutors": verified_tutors,
        "schools": total_schools,
        "courses": total_courses,
        "total_videos": total_videos,
        "unique_countries": unique_countries,
        "training_centers": 0,  # Hidden in frontend
        "books_available": 0,   # Hidden in frontend
        "job_opportunities": 0, # Hidden in frontend
        "success_rate": 95,
        "active_users": verified_parents + verified_students + verified_tutors,
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
        base_earnings = getattr(tutor, 'monthly_earnings', None) or 10000
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
        "location": user.location if user else None,  # REQUIRED: Location from users table (migrated from tutor_profiles)
        "teaches_at": None,  # Column removed
        "sessionFormat": None,  # Column removed
        "courses": [],  # Column removed
        "grades": [],  # Column removed
        "course_type": None,  # Column removed
        "languages": user.languages if user else [],  # From users table (migrated from tutor_profiles)
        "experience": None,  # Column removed
        "expertise_badge": tutor.expertise_badge or "Tutor",  # REQUIRED: Expertise badge from tutor_profiles
        "profile_picture": user.profile_picture if user else None,  # From users table (migrated from tutor_profiles)
        "cover_image": tutor.cover_image,
        "social_links": user.social_links if user else {},  # From users table (migrated from tutor_profiles)
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
                    reviewer_profile_picture = user.profile_picture or "/uploads/system_images/system_profile_pictures/boy-user-image.jpg"  # From users table (centralized)
                reviewer_description = f"{student_profile.grade_level or 'Student'}"

        elif r.user_role == "parent":
            parent_profile = db.query(ParentProfile).filter(ParentProfile.id == r.reviewer_id).first()
            if parent_profile:
                user = db.query(User).filter(User.id == parent_profile.user_id).first()
                if user:
                    reviewer_name = f"{user.first_name} {user.father_name}"
                    reviewer_user_id = user.id
                    reviewer_profile_picture = user.profile_picture or "/uploads/system_images/system_profile_pictures/Dad-profile.jpg"  # From users table (centralized)
                reviewer_description = "Parent"

        elif r.user_role == "tutor":
            tutor_profile = db.query(TutorProfile).filter(TutorProfile.id == r.reviewer_id).first()
            if tutor_profile:
                user = db.query(User).filter(User.id == tutor_profile.user_id).first()
                if user:
                    reviewer_name = f"{user.first_name} {user.father_name}"
                    reviewer_user_id = user.id
                    reviewer_profile_picture = user.profile_picture or "/uploads/system_images/system_profile_pictures/tutor-.jpg"  # From users table (centralized)
                reviewer_description = "Tutor"

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

    # Build name based on naming convention
    # Ethiopian: first_name + father_name + grandfather_name
    # International: first_name + last_name
    if current_user.last_name:
        # International naming convention
        display_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip()
    else:
        # Ethiopian naming convention
        name_parts = [current_user.first_name, current_user.father_name, current_user.grandfather_name]
        display_name = " ".join(part for part in name_parts if part)

    return {
        "id": student.id,
        "user_id": student.user_id,
        "username": student.username,  # Role-specific username from student_profiles
        "name": display_name or "Student",
        "first_name": current_user.first_name,
        "father_name": current_user.father_name,
        "grandfather_name": current_user.grandfather_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "gender": current_user.gender,  # Shared from users table
        "profile_picture": current_user.profile_picture,  # Read from users table
        "cover_image": student.cover_image,  # Student-specific
        "about": student.about,  # Renamed from bio
        "quote": student.quote if student.quote else [],  # Now array
        "location": current_user.location,  # Read from users table
        "social_links": current_user.social_links or {},  # Read from users table
        "grade_level": student.grade_level,
        "studying_at": student.studying_at,  # Renamed from school_name
        "interested_in": student.interested_in if student.interested_in else [],  # Renamed from subjects
        "languages": current_user.languages or [],  # Read from users table
        "learning_method": student.learning_method if student.learning_method else [],  # Renamed from learning_style
        "hobbies": current_user.hobbies or [],  # Read from users table
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
                    AVG(subject_understanding_rating) as subject_understanding,
                    AVG(communication_rating) as communication,
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
            "tutor_user_id": tutor_user.id,  # For chat/messaging
            "first_name": tutor_user.first_name,
            "father_name": tutor_user.father_name,
            "full_name": f"{tutor_user.first_name} {tutor_user.father_name}",
            "username": getattr(tutor_profile, 'username', None),
            "profile_picture": getattr(tutor_profile, 'profile_picture', None) or tutor_user.profile_picture,
            "bio": tutor_profile.bio,
            "quote": getattr(tutor_profile, 'quote', None),
            "gender": tutor_user.gender,
            "location": tutor_user.location,
            "rating": calculated_rating,
            "rating_count": rating_count,
            "rating_breakdown": {
                "subject_understanding": round(avg_metrics.subject_understanding, 1) if avg_metrics and avg_metrics.subject_understanding else 0.0,
                "communication": round(avg_metrics.communication, 1) if avg_metrics and avg_metrics.communication else 0.0,
                "discipline": round(avg_metrics.discipline, 1) if avg_metrics and avg_metrics.discipline else 0.0,
                "punctuality": round(avg_metrics.punctuality, 1) if avg_metrics and avg_metrics.punctuality else 0.0
            },
            "price": 0,  # hourly_rate column doesn't exist
            "hourly_rate": None,
            "currency": tutor_user.currency or "ETB",
            "courses": [],  # Column removed
            "subjects": [],  # Column removed
            "languages": tutor_user.languages or [],
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
            "is_verified": tutor_user.is_verified,  # From users table
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
                AVG(rating) as overall_rating,
                COUNT(*) as total_reviews,
                AVG(subject_understanding_rating) as subject_understanding,
                AVG(communication_rating) as communication,
                AVG(discipline_rating) as discipline,
                AVG(punctuality_rating) as punctuality
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
        "profile_picture": tutor_user.profile_picture,  # From users table (centralized)
        "bio": tutor_profile.bio,
        "quote": tutor_profile.quote,
        "gender": tutor_user.gender,
        "location": tutor_user.location,
        "rating": calculated_rating,
        "rating_count": rating_count,
        "rating_breakdown": {
            "subject_understanding": round(avg_metrics.subject_understanding, 1) if avg_metrics and avg_metrics.subject_understanding else 0.0,
            "communication": round(avg_metrics.communication, 1) if avg_metrics and avg_metrics.communication else 0.0,
            "discipline": round(avg_metrics.discipline, 1) if avg_metrics and avg_metrics.discipline else 0.0,
            "punctuality": round(avg_metrics.punctuality, 1) if avg_metrics and avg_metrics.punctuality else 0.0
        },
        "price": getattr(tutor_profile, 'hourly_rate', 0) or 0,
        "hourly_rate": getattr(tutor_profile, 'hourly_rate', None),
        "currency": "ETB",
        "courses": [],  # Column removed
        "subjects": [],  # Column removed
        "languages": tutor_user.languages or [],
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
        "is_verified": tutor_user.is_verified,  # From users table
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
    # Note: course_id is an integer array, so we don't join courses directly
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
            tp.id as tutor_profile_id,
            tp.username as tutor_username,
            u.profile_picture as tutor_profile_picture,  -- NOTE: profile_picture now read from users table
            u.first_name as tutor_first_name,
            u.father_name as tutor_father_name
        FROM enrolled_courses ec
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
    for enrollment in enrolled_courses:
        # Get course info from course_id array
        course_ids = enrollment.course_id if enrollment.course_id else []
        course_titles = []
        course_icon = "📚"
        course_category = None
        course_level = None
        course_description = None
        course_thumbnail = None
        course_duration = None
        course_lessons = 0

        if course_ids:
            # Fetch course details for all courses in the array
            courses_result = db.execute(
                text("""
                    SELECT id, course_name, course_category, course_level, course_description,
                           thumbnail, duration, lessons
                    FROM courses WHERE id = ANY(:course_ids)
                """),
                {"course_ids": course_ids}
            ).fetchall()

            for c in courses_result:
                course_titles.append(c.course_name)
                if c.course_category:
                    course_category = c.course_category
                if c.course_level:
                    course_level = c.course_level
                if c.course_description:
                    course_description = c.course_description
                if c.thumbnail:
                    course_thumbnail = c.thumbnail
                if c.duration:
                    course_duration = c.duration
                if c.lessons:
                    course_lessons += c.lessons

        # Get package info if exists
        package_name = None
        package_price = None
        if enrollment.package_id:
            package_result = db.execute(
                text("SELECT name, hourly_rate FROM tutor_packages WHERE id = :package_id"),
                {"package_id": enrollment.package_id}
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
            {"tutor_id": enrollment.tutor_id}
        ).first()

        # Calculate progress (placeholder - can be enhanced with actual session tracking)
        progress = 0
        if enrollment.status == 'completed':
            progress = 100
        elif enrollment.status == 'active':
            progress = 50  # Can be calculated from completed sessions vs total

        result.append({
            "id": enrollment.enrollment_id,
            "enrollment_id": enrollment.enrollment_id,
            "course_id": course_ids,
            "course_ids": course_ids,
            "course_title": ", ".join(course_titles) if course_titles else "Untitled Course",
            "course_titles": course_titles,
            "course_icon": course_icon,
            "course_category": course_category,
            "course_level": course_level,
            "course_description": course_description,
            "course_thumbnail": course_thumbnail,
            "course_duration": course_duration,
            "course_lessons": course_lessons,
            "status": enrollment.status or "active",
            "progress": progress,
            "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
            "schedule_type": enrollment.schedule_type,
            "start_time": str(enrollment.start_time) if enrollment.start_time else None,
            "end_time": str(enrollment.end_time) if enrollment.end_time else None,
            "is_recurring": enrollment.is_recurring,
            # Tutor info
            "tutor_id": enrollment.tutor_id,
            "tutor_name": f"{enrollment.tutor_first_name or ''} {enrollment.tutor_father_name or ''}".strip() or "Unknown Tutor",
            "tutor_username": enrollment.tutor_username,
            "tutor_profile_picture": enrollment.tutor_profile_picture,
            "tutor_rating": round(tutor_rating.avg_rating, 1) if tutor_rating and tutor_rating.avg_rating else 0.0,
            "tutor_review_count": tutor_rating.review_count if tutor_rating else 0,
            # Package info
            "package_id": enrollment.package_id,
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

    # Build name based on naming convention
    # Ethiopian: first_name + father_name + grandfather_name
    # International: first_name + last_name
    if user and user.last_name:
        # International naming convention
        display_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    elif user:
        # Ethiopian naming convention
        name_parts = [user.first_name, user.father_name, user.grandfather_name]
        display_name = " ".join(part for part in name_parts if part)
    else:
        display_name = "Student"

    return {
        "id": student.id,
        "user_id": student.user_id,
        "username": student.username,  # Role-specific username from student_profiles
        "name": display_name,  # Built from naming convention
        "first_name": user.first_name if user else None,
        "father_name": user.father_name if user else None,
        "grandfather_name": user.grandfather_name if user else None,
        "last_name": user.last_name if user else None,
        "email": user.email if user else None,
        "phone": user.phone if user else None,
        "gender": user.gender if user else None,
        "profile_picture": user.profile_picture if user else None,
        "cover_image": student.cover_image,
        "about": student.about,  # Fixed: was 'bio', now 'about'
        "quote": student.quote if student.quote else [],  # Array field
        "location": user.location if user else None,
        "grade_level": student.grade_level,
        "studying_at": student.studying_at,
        "career_aspirations": student.career_aspirations,
        "interested_in": student.interested_in if student.interested_in else [],  # Fixed: was 'subjects'
        "hobbies": user.hobbies if user else [],
        "languages": user.languages if user else [],
        "social_links": user.social_links if user else {},
        "learning_method": student.learning_method if student.learning_method else [],
        "hero_title": student.hero_title if student.hero_title else [],
        "hero_subtitle": student.hero_subtitle if student.hero_subtitle else [],
        "parent_id": student.parent_id if student.parent_id else [],  # Array of parent user IDs
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

    # Fields that belong to users table
    user_fields = {'first_name', 'father_name', 'grandfather_name', 'last_name',
                   'email', 'phone', 'gender', 'location', 'profile_picture',
                   'social_links', 'languages'}

    # Update user fields (shared across all roles)
    for field in user_fields:
        if field in profile_data and profile_data[field] is not None:
            value = profile_data[field]
            if isinstance(value, str):
                value = value.strip()
                if value:  # Only update if non-empty
                    setattr(current_user, field, value)
            else:
                # For non-string fields (JSON, arrays, etc.)
                setattr(current_user, field, value)

    # Auto-deduce country_code and currency from location
    if profile_data.get('location'):
        from currency_utils import get_country_code_from_location, get_currency_from_country
        deduced_code = get_country_code_from_location(profile_data['location'])
        if deduced_code:
            current_user.country_code = deduced_code
            current_user.currency = get_currency_from_country(deduced_code)
            print(f"[Student] Auto-deduced country: {deduced_code}, currency: {current_user.currency}")

    # Update student profile fields (NEW SCHEMA - matching current database)
    if "username" in profile_data:
        student.username = profile_data["username"]
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
    Rating = average of (subject_understanding + communication_skills + discipline + punctuality + class_activity) / 5

    IMPORTANT: reviewer_id references profile tables (tutor_profiles.id or parent_profiles.id),
    NOT users.id directly. We need to join through the profile table to get user info.
    """
    try:
        # Use raw SQL to properly join through profile tables
        # reviewer_id = tutor_profiles.id (when reviewer_role='tutor')
        # reviewer_id = parent_profiles.id (when reviewer_role='parent')
        result = db.execute(text("""
            SELECT
                sr.id,
                sr.student_id,
                sr.reviewer_id,
                sr.reviewer_role,
                sr.subject_understanding,
                sr.communication_skills,
                sr.discipline,
                sr.punctuality,
                sr.class_activity,
                sr.rating,
                sr.review_text,
                sr.created_at,
                CASE
                    WHEN sr.reviewer_role = 'tutor' THEN
                        COALESCE(tu.first_name || ' ' || tu.father_name, tu.email)
                    WHEN sr.reviewer_role = 'parent' THEN
                        COALESCE(pu.first_name || ' ' || pu.father_name, pu.email)
                    ELSE 'Unknown'
                END as reviewer_name,
                CASE
                    WHEN sr.reviewer_role = 'tutor' THEN tu.profile_picture  -- NOTE: profile_picture now read from users table
                    WHEN sr.reviewer_role = 'parent' THEN pu.profile_picture  -- NOTE: profile_picture now read from users table
                    ELSE NULL
                END as reviewer_picture
            FROM student_reviews sr
            LEFT JOIN tutor_profiles tp ON sr.reviewer_role = 'tutor' AND sr.reviewer_id = tp.id
            LEFT JOIN users tu ON tp.user_id = tu.id
            LEFT JOIN parent_profiles pp ON sr.reviewer_role = 'parent' AND sr.reviewer_id = pp.id
            LEFT JOIN users pu ON pp.user_id = pu.id
            WHERE sr.student_id = :student_id
            ORDER BY sr.created_at DESC
        """), {"student_id": student_id})

        reviews_data = result.fetchall()

        # Build reviews list
        reviews = []
        total_rating = 0
        category_sums = {
            'subject_understanding': 0,
            'communication_skills': 0,
            'discipline': 0,
            'punctuality': 0,
            'class_activity': 0
        }

        for row in reviews_data:
            review_dict = {
                "id": row[0],
                "student_id": row[1],
                "reviewer_id": row[2],
                "reviewer_role": row[3],
                "subject_understanding": float(row[4]) if row[4] else 0.0,
                "communication_skills": float(row[5]) if row[5] else 0.0,
                "discipline": float(row[6]) if row[6] else 0.0,
                "punctuality": float(row[7]) if row[7] else 0.0,
                "class_activity": float(row[8]) if row[8] else 0.0,
                "rating": float(row[9]) if row[9] else 0.0,
                "comment": row[10] or "",
                "created_at": row[11].isoformat() if row[11] else None,
                "reviewer_name": row[12] or "Unknown",
                "reviewer_picture": row[13] or '../uploads/system_images/system_profile_pictures/default-avatar.png'
            }
            reviews.append(review_dict)

            # Accumulate for averages
            total_rating += review_dict["rating"]
            category_sums['subject_understanding'] += review_dict['subject_understanding']
            category_sums['communication_skills'] += review_dict['communication_skills']
            category_sums['discipline'] += review_dict['discipline']
            category_sums['punctuality'] += review_dict['punctuality']
            category_sums['class_activity'] += review_dict['class_activity']

        review_count = len(reviews)

        # Calculate averages
        avg_rating = round(total_rating / review_count, 1) if review_count > 0 else 0.0
        category_averages = {
            key: round(value / review_count, 1) if review_count > 0 else 0.0
            for key, value in category_sums.items()
        }

        return {
            "success": True,
            "reviews": reviews,
            "total": review_count,
            "avg_rating": avg_rating,
            "category_averages": category_averages
        }

    except Exception as e:
        print(f"Error fetching student reviews: {str(e)}")
        import traceback
        traceback.print_exc()
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
        "first_name": current_user.first_name,
        "father_name": current_user.father_name,
        "grandfather_name": current_user.grandfather_name,
        "bio": parent_profile.bio,
        "quote": parent_profile.quote,
        "relationship_type": parent_profile.relationship_type,
        "location": current_user.location,
        "email": current_user.email,
        "phone": current_user.phone,
        "gender": current_user.gender,
        "total_children": parent_profile.total_children,
        # Note: active_children field removed - doesn't exist in model (use total_children)
        # Note: education_focus field removed - doesn't exist in model
        "rating": parent_profile.rating,
        "rating_count": parent_profile.rating_count,
        "is_verified": parent_profile.is_verified,
        "is_active": parent_profile.is_active,
        "profile_picture": current_user.profile_picture,  # From users table (centralized)
        "cover_image": parent_profile.cover_image,
        "hero_title": parent_profile.hero_title,
        "hero_subtitle": parent_profile.hero_subtitle,
        "children_ids": parent_profile.children_ids,
        "coparent_ids": parent_profile.coparent_ids,
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

    # Fields that belong to users table (not parent_profile table)
    parent_user_fields = {'location', 'display_location', 'languages', 'social_links', 'profile_picture'}

    # Update parent profile fields
    for key, value in update_data.items():
        if key in parent_user_fields:
            if hasattr(current_user, key):
                setattr(current_user, key, value)
        elif hasattr(parent_profile, key):
            setattr(parent_profile, key, value)

    # Auto-deduce country_code and currency from location
    if 'location' in update_data and update_data['location']:
        from currency_utils import get_country_code_from_location, get_currency_from_country
        deduced_code = get_country_code_from_location(update_data['location'])
        if deduced_code:
            current_user.country_code = deduced_code
            current_user.currency = get_currency_from_country(deduced_code)
            print(f"[Parent] Auto-deduced country: {deduced_code}, currency: {current_user.currency}")

    # Calculate profile completion
    completion = 0
    total_fields = 10
    if parent_profile.bio: completion += 1
    if parent_profile.quote: completion += 1
    if parent_profile.relationship_type: completion += 1
    if current_user.location: completion += 1
    if parent_profile.education_focus: completion += 1
    if current_user.profile_picture: completion += 1  # From users table (centralized)
    if parent_profile.cover_image: completion += 1
    if current_user.email: completion += 1
    if current_user.phone: completion += 1
    if parent_profile.username: completion += 1

    parent_profile.profile_completion = (completion / total_fields) * 100
    parent_profile.profile_complete = parent_profile.profile_completion >= 80

    db.commit()
    db.refresh(parent_profile)

    return {"message": "Profile updated successfully", "id": parent_profile.id}

# ============================================
# NOTE: /api/parent/{parent_id} wildcard route moved to parent_endpoints.py
# to avoid route ordering conflicts with /api/parent/my-courses, /api/parent/my-schools
# ============================================

# ============================================
# CHILD MANAGEMENT ENDPOINTS - REMOVED
# ============================================
# NOTE: Child management now uses student_profiles table directly.
# Parents link to children via:
# - parent_profiles.children_ids = [student_profile_id1, student_profile_id2, ...]
# - student_profiles.parent_id = [parent_user_id1, parent_user_id2, ...]
# See parent_endpoints.py for the new child management endpoints.

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
        # Create new advertiser profile with defaults
        from datetime import date
        advertiser_profile = AdvertiserProfile(
            user_id=current_user.id,
            username=None,  # Will be set later by user
            joined_in=date.today(),
            hero_title=[],
            hero_subtitle=[]
        )
        db.add(advertiser_profile)
        db.commit()
        db.refresh(advertiser_profile)

    # Build name based on naming convention
    # Ethiopian: first_name + father_name + grandfather_name
    # International: first_name + last_name
    if current_user.last_name:
        # International naming convention
        display_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip()
    else:
        # Ethiopian naming convention
        name_parts = [current_user.first_name, current_user.father_name, current_user.grandfather_name]
        display_name = " ".join(part for part in name_parts if part)

    full_name = display_name or (current_user.email.split('@')[0] if current_user.email else 'Advertiser')

    # Build response with user data
    response = AdvertiserProfileResponse.from_orm(advertiser_profile)
    response_dict = response.dict()

    # Add user data (email, phone, full_name, and centralized fields)
    response_dict['email'] = current_user.email
    response_dict['phone'] = getattr(current_user, 'phone', None)
    response_dict['full_name'] = full_name
    response_dict['first_name'] = current_user.first_name
    response_dict['father_name'] = current_user.father_name
    response_dict['grandfather_name'] = current_user.grandfather_name
    response_dict['last_name'] = current_user.last_name
    response_dict['profile_picture'] = current_user.profile_picture  # Read from users table
    response_dict['location'] = current_user.location  # Read from users table
    response_dict['social_links'] = current_user.social_links or {}  # Read from users table
    response_dict['languages'] = current_user.languages or []  # Read from users table

    # Use joined_in instead of created_at (AdvertiserProfile model has joined_in, not created_at)
    if hasattr(advertiser_profile, 'joined_in') and advertiser_profile.joined_in:
        response_dict['created_at'] = advertiser_profile.joined_in.isoformat()
    else:
        response_dict['created_at'] = None

    return response_dict

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

    # Fields that belong to users table
    user_fields = {'first_name', 'father_name', 'grandfather_name', 'last_name',
                   'email', 'phone', 'gender', 'location', 'country_code', 'display_location', 'profile_picture',
                   'social_links', 'languages'}

    # Update profile fields
    update_data = profile_data.dict(exclude_unset=True)

    for key, value in update_data.items():
        if key in user_fields:
            # Update user table
            if hasattr(current_user, key):
                if isinstance(value, str):
                    value = value.strip()
                    if value:  # Only update if non-empty
                        setattr(current_user, key, value)
                else:
                    # For non-string fields (JSON, arrays, etc.)
                    setattr(current_user, key, value)
        elif hasattr(advertiser_profile, key):
            # Update advertiser_profile table
            setattr(advertiser_profile, key, value)

    # Auto-deduce country_code and currency from location if not explicitly provided
    if update_data.get('location') and not update_data.get('country_code'):
        from currency_utils import get_country_code_from_location, get_currency_from_country
        deduced_code = get_country_code_from_location(update_data['location'])
        if deduced_code:
            current_user.country_code = deduced_code
            current_user.currency = get_currency_from_country(deduced_code)
            print(f"[Advertiser] Auto-deduced country: {deduced_code}, currency: {current_user.currency}")
    elif update_data.get('country_code'):
        from currency_utils import get_currency_from_country
        current_user.currency = get_currency_from_country(update_data['country_code'])

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
    brand_name: str = Form(...),
    campaign_name: str = Form(...),
    ad_placement: str = Form(...),
    campaign_id: Optional[int] = Form(None),
    brand_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload campaign media (image or video) to Backblaze B2 with organized folder structure and save to database"""
    import psycopg

    try:
        # Check if user has advertiser role
        if "advertiser" not in current_user.roles:
            raise HTTPException(status_code=403, detail="User does not have advertiser role")

        # Get advertiser profile to use profile_id instead of user_id
        advertiser_profile = db.query(AdvertiserProfile).filter(
            AdvertiserProfile.user_id == current_user.id
        ).first()

        if not advertiser_profile:
            raise HTTPException(status_code=404, detail="Advertiser profile not found")

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
        file_size = len(file_contents)

        # Validate file size
        if is_image and file_size > 5 * 1024 * 1024:  # 5MB for images
            raise HTTPException(status_code=400, detail="Image size exceeds 5MB limit")

        if is_video and file_size > 200 * 1024 * 1024:  # 200MB for videos
            raise HTTPException(status_code=400, detail="Video size exceeds 200MB limit")

        # Get Backblaze service
        b2_service = get_backblaze_service()

        # Clean folder names (remove special characters, replace spaces with underscores)
        import re
        clean_brand = re.sub(r'[^\w\s-]', '', brand_name).strip().replace(' ', '_')
        clean_campaign = re.sub(r'[^\w\s-]', '', campaign_name).strip().replace(' ', '_')
        clean_placement = re.sub(r'[^\w\s-]', '', ad_placement).strip().replace(' ', '_')

        # NORMALIZE PLACEMENT: Always use underscores (not dashes) for consistency
        # This ensures database queries work correctly
        normalized_placement = ad_placement.replace('-', '_')

        # Build organized folder path: images/profile_{id}/{brand}/{campaign}/{placement}/ or videos/profile_{id}/{brand}/{campaign}/{placement}/
        media_type = 'image' if is_image else 'video'
        custom_folder = f"{'images' if is_image else 'videos'}/profile_{advertiser_profile.id}/{clean_brand}/{clean_campaign}/{clean_placement}/"

        # Upload to Backblaze with custom folder path
        result = b2_service.upload_file_to_folder(
            file_data=file_contents,
            file_name=file.filename,
            folder_path=custom_folder,
            content_type=file.content_type
        )

        if not result:
            raise HTTPException(status_code=500, detail="File upload failed")

        # Save media metadata to database if campaign_id and brand_id are provided
        media_id = None
        if campaign_id and brand_id:
            try:
                # Get database connection (using psycopg directly)
                conn = psycopg.connect(os.getenv('DATABASE_URL'))
                cursor = conn.cursor()

                cursor.execute("""
                    INSERT INTO campaign_media (
                        campaign_id, brand_id, advertiser_id, media_type,
                        file_url, file_name, file_size, placement,
                        content_type, folder_path
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    campaign_id,
                    brand_id,
                    advertiser_profile.id,
                    media_type,
                    result['url'],
                    result['fileName'],
                    file_size,
                    normalized_placement,  # Use normalized placement (underscores, not dashes)
                    file.content_type,
                    custom_folder
                ))

                media_id = cursor.fetchone()[0]
                conn.commit()
                cursor.close()
                conn.close()

            except Exception as db_error:
                print(f"Warning: Failed to save media to database: {db_error}")
                # Don't fail the upload if database save fails - file is already in Backblaze

        return {
            "success": True,
            "message": f"Campaign {media_type} uploaded successfully",
            "url": result['url'],
            "file_name": result['fileName'],
            "file_type": media_type,
            "folder": custom_folder,
            "media_id": media_id,
            "file_size": file_size,
            "placement": ad_placement,
            "details": result
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")


@router.get("/api/campaign/{campaign_id}/media")
async def get_campaign_media(
    campaign_id: int,
    media_type: Optional[str] = Query(None, description="Filter by media type: 'image' or 'video'"),
    placement: Optional[str] = Query(None, description="Filter by placement: 'placeholder', 'widget', 'popup', 'insession'"),
    current_user: User = Depends(get_current_user)
):
    """Get all media files for a campaign"""
    import psycopg
    from psycopg.rows import dict_row

    try:
        # Get database connection
        conn = psycopg.connect(os.getenv('DATABASE_URL'), row_factory=dict_row)
        cursor = conn.cursor()

        # Build query with optional filters
        query = """
            SELECT
                id, campaign_id, brand_id, advertiser_id,
                media_type, file_url, file_name, file_size,
                placement, content_type, folder_path,
                created_at, updated_at
            FROM campaign_media
            WHERE campaign_id = %s
        """
        params = [campaign_id]

        if media_type:
            query += " AND media_type = %s"
            params.append(media_type)

        if placement:
            query += " AND placement = %s"
            params.append(placement)

        query += " ORDER BY created_at DESC"

        cursor.execute(query, params)
        media_items = cursor.fetchall()

        cursor.close()
        conn.close()

        return {
            "success": True,
            "campaign_id": campaign_id,
            "total": len(media_items),
            "media": media_items
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching campaign media: {str(e)}")


@router.delete("/api/campaign/media/{media_id}")
async def delete_campaign_media(
    media_id: int,
    current_user: User = Depends(get_current_user)
):
    """Delete a campaign media file"""
    import psycopg

    try:
        # Check if user has advertiser role
        if "advertiser" not in current_user.roles:
            raise HTTPException(status_code=403, detail="User does not have advertiser role")

        # Get database connection
        conn = psycopg.connect(os.getenv('DATABASE_URL'))
        cursor = conn.cursor()

        # Get media info to verify ownership
        cursor.execute("""
            SELECT cm.*, ap.user_id
            FROM campaign_media cm
            JOIN advertiser_profiles ap ON cm.advertiser_id = ap.id
            WHERE cm.id = %s
        """, (media_id,))

        media = cursor.fetchone()

        if not media:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Media not found")

        # Verify ownership
        if media[13] != current_user.id:  # user_id is at index 13
            cursor.close()
            conn.close()
            raise HTTPException(status_code=403, detail="You don't have permission to delete this media")

        # Get file info for Backblaze deletion (folder_path is at index 10)
        folder_path = media[10] if len(media) > 10 else None
        file_name = media[6] if len(media) > 6 else None  # file_name is at index 6

        # Delete from database first
        cursor.execute("DELETE FROM campaign_media WHERE id = %s", (media_id,))
        conn.commit()

        cursor.close()
        conn.close()

        # Try to delete from Backblaze (don't fail if this errors)
        if folder_path and file_name:
            try:
                from backblaze_service import BackblazeService
                backblaze_service = BackblazeService()
                file_path = f"{folder_path}{file_name}"
                backblaze_service.delete_file(file_path)
                print(f"✅ Deleted file from Backblaze: {file_path}")
            except Exception as e:
                print(f"⚠️ Could not delete file from Backblaze: {str(e)}")
                # Continue anyway - database deletion succeeded

        return {
            "success": True,
            "message": "Media deleted successfully",
            "media_id": media_id
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting media: {str(e)}")


# ============================================
# COMPANY VERIFICATION DOCUMENT UPLOADS
# ============================================

@router.post("/api/upload/company-document")
async def upload_company_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),  # business_license, tin_certificate, company_logo, additional_doc
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload company verification document to Backblaze B2.

    Document types:
    - business_license: Business license/registration document
    - tin_certificate: TIN (Tax Identification Number) certificate
    - company_logo: Company logo image
    - additional_doc: Additional supporting documents
    """
    try:
        # Check if user has advertiser role
        if "advertiser" not in current_user.roles:
            raise HTTPException(status_code=403, detail="User does not have advertiser role")

        # Get advertiser profile
        advertiser_profile = db.query(AdvertiserProfile).filter(
            AdvertiserProfile.user_id == current_user.id
        ).first()

        if not advertiser_profile:
            raise HTTPException(status_code=404, detail="Advertiser profile not found")

        # Validate document type
        valid_types = ['business_license', 'tin_certificate', 'company_logo', 'additional_doc']
        if document_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid document type. Must be one of: {', '.join(valid_types)}"
            )

        # Read file contents
        contents = await file.read()

        # Validate file size based on type
        if document_type == 'company_logo':
            # Logo: 5MB max, images only
            if len(contents) > 5 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="Logo file size exceeds 5MB limit")
            if not file.content_type or not file.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail="Logo must be an image file (PNG, JPG)")
        else:
            # Documents: 10MB max, PDF or images
            if len(contents) > 10 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="Document file size exceeds 10MB limit")
            allowed_types = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
            if file.content_type not in allowed_types:
                raise HTTPException(status_code=400, detail="Document must be PDF, JPG, or PNG")

        # Get Backblaze service
        b2_service = get_backblaze_service()

        # Upload file using the document type mapping
        result = b2_service.upload_file(
            file_data=contents,
            file_name=file.filename,
            file_type=document_type,
            user_id=f"advertiser_{advertiser_profile.id}"
        )

        if not result:
            raise HTTPException(status_code=500, detail="File upload failed")

        # Update the corresponding field in advertiser_profile
        if document_type == 'business_license':
            advertiser_profile.business_license_url = result['url']
        elif document_type == 'tin_certificate':
            advertiser_profile.tin_certificate_url = result['url']
        elif document_type == 'company_logo':
            advertiser_profile.company_logo = result['url']
        elif document_type == 'additional_doc':
            # Add to additional_docs_urls JSON array
            if not advertiser_profile.additional_docs_urls:
                advertiser_profile.additional_docs_urls = []
            advertiser_profile.additional_docs_urls = advertiser_profile.additional_docs_urls + [result['url']]

        db.commit()

        return {
            "success": True,
            "message": f"{document_type.replace('_', ' ').title()} uploaded successfully",
            "url": result['url'],
            "document_type": document_type,
            "file_name": result.get('fileName', file.filename),
            "details": result
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")


@router.post("/api/advertiser/submit-verification")
async def submit_company_verification(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit company for verification after all required documents are uploaded.
    Changes verification_status from 'pending' to 'in_review'.
    """
    try:
        # Check if user has advertiser role
        if "advertiser" not in current_user.roles:
            raise HTTPException(status_code=403, detail="User does not have advertiser role")

        # Get advertiser profile
        advertiser_profile = db.query(AdvertiserProfile).filter(
            AdvertiserProfile.user_id == current_user.id
        ).first()

        if not advertiser_profile:
            raise HTTPException(status_code=404, detail="Advertiser profile not found")

        # Check required fields
        missing_fields = []

        if not advertiser_profile.company_name:
            missing_fields.append("Company Name")
        if not advertiser_profile.business_reg_no:
            missing_fields.append("Business Registration Number")
        if not advertiser_profile.tin_number:
            missing_fields.append("TIN Number")
        if not advertiser_profile.company_email or len(advertiser_profile.company_email) == 0:
            missing_fields.append("Business Email")
        if not advertiser_profile.tin_certificate_url:
            missing_fields.append("TIN Certificate Document")
        if not advertiser_profile.company_logo:
            missing_fields.append("Company Logo")

        if missing_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )

        # Update verification status
        advertiser_profile.verification_status = 'in_review'
        advertiser_profile.verification_submitted_at = datetime.utcnow()

        db.commit()

        return {
            "success": True,
            "message": "Company verification submitted successfully. You will be notified once the review is complete.",
            "verification_status": "in_review",
            "submitted_at": advertiser_profile.verification_submitted_at.isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Submission error: {str(e)}")


@router.get("/api/advertiser/verification-status")
async def get_company_verification_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current company verification status and uploaded documents."""
    try:
        # Check if user has advertiser role
        if "advertiser" not in current_user.roles:
            raise HTTPException(status_code=403, detail="User does not have advertiser role")

        # Get advertiser profile
        advertiser_profile = db.query(AdvertiserProfile).filter(
            AdvertiserProfile.user_id == current_user.id
        ).first()

        if not advertiser_profile:
            raise HTTPException(status_code=404, detail="Advertiser profile not found")

        return {
            "verification_status": advertiser_profile.verification_status or "pending",
            "verification_submitted_at": advertiser_profile.verification_submitted_at.isoformat() if advertiser_profile.verification_submitted_at else None,
            "verification_reviewed_at": advertiser_profile.verification_reviewed_at.isoformat() if advertiser_profile.verification_reviewed_at else None,
            "verification_notes": advertiser_profile.verification_notes,
            "documents": {
                "business_license": {
                    "uploaded": bool(advertiser_profile.business_license_url),
                    "url": advertiser_profile.business_license_url
                },
                "tin_certificate": {
                    "uploaded": bool(advertiser_profile.tin_certificate_url),
                    "url": advertiser_profile.tin_certificate_url
                },
                "company_logo": {
                    "uploaded": bool(advertiser_profile.company_logo),
                    "url": advertiser_profile.company_logo
                },
                "additional_docs": {
                    "uploaded": bool(advertiser_profile.additional_docs_urls),
                    "urls": advertiser_profile.additional_docs_urls or []
                }
            },
            "company_info": {
                "company_name": advertiser_profile.company_name,
                "industry": advertiser_profile.industry,
                "business_reg_no": advertiser_profile.business_reg_no,
                "tin_number": advertiser_profile.tin_number,
                "company_email": advertiser_profile.company_email or [],
                "company_phone": advertiser_profile.company_phone or [],
                "website": advertiser_profile.website,
                "address": advertiser_profile.address,
                "company_description": advertiser_profile.company_description
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


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

    # Query tutors with pending verification (from users table)
    query = db.query(TutorProfile).join(User).filter(
        User.verification_status == "pending"
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
            "profile_picture": user.profile_picture if user else None,  # From users table (centralized)
            "id_document_url": None,  # Column removed
            "teaches_at": None,  # Column removed
            "location": user.location if user else None,
            "courses": [],  # Column removed
            "experience": None,  # Column removed
            "education_level": getattr(tutor_profile, 'education_level', None),
            "created_at": tutor_profile.created_at.isoformat() if tutor_profile.created_at else None,
            "verification_status": user.verification_status  # From users table
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
        "profile_picture": user.profile_picture if user else None,  # From users table (centralized)
        "id_document_url": None,  # Column removed
        "teaches_at": None,  # Column removed
        "location": user.location if user else None,
        "bio": tutor_profile.bio,
        "courses": [],  # Column removed
        "grades": [],  # Column removed
        "languages": user.languages if user else None,
        "experience": None,  # Column removed
        "education_level": tutor_profile.education_level,
        "certifications": tutor_profile.certifications,
        "sessionFormat": None,  # Column removed
        "price": tutor_profile.price,
        "currency": tutor_profile.currency,
        "verification_status": user.verification_status,  # From users table
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

    # Get user to update verification status
    user = db.query(User).filter(User.id == tutor_profile.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update verification status in users table
    user.is_verified = True
    user.verification_status = "approved"
    user.verified_at = datetime.utcnow()
    user.verification_method = "admin"
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

    # Get user to update verification status
    user = db.query(User).filter(User.id == tutor_profile.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    rejection_reason = rejection_data.get("reason", "").strip()
    if not rejection_reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required")

    # Update verification status in users table
    user.is_verified = False
    user.verification_status = "rejected"
    user.rejected_at = datetime.utcnow()
    tutor_profile.rejection_reason = rejection_reason

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

    # Get user to update suspension status
    user = db.query(User).filter(User.id == tutor_profile.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    suspension_reason = suspension_data.get("reason", "").strip()
    if not suspension_reason:
        raise HTTPException(status_code=400, detail="Suspension reason is required")

    # Update suspension status in users table
    user.is_suspended = True
    user.verification_status = "suspended"
    user.suspension_reason = suspension_reason
    user.suspended_at = datetime.utcnow()
    user.suspended_by = current_admin["id"]  # Admin ID from token

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

    # Get user to update suspension status
    user = db.query(User).filter(User.id == tutor_profile.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if user is suspended
    if not user.is_suspended and user.verification_status != "suspended":
        raise HTTPException(status_code=400, detail="Tutor is not suspended")

    # Clear suspension and restore to verified status in users table
    user.is_suspended = False
    user.is_verified = True
    user.verification_status = "approved"
    user.suspension_reason = None
    user.suspended_at = None
    user.suspended_by = None

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

    # Get user to update verification status
    user = db.query(User).filter(User.id == tutor_profile.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.verification_status != "rejected":
        raise HTTPException(status_code=400, detail="Tutor is not in rejected status")

    # Clear rejection and move back to pending status in users table
    user.is_verified = False
    user.verification_status = "pending"
    user.rejected_at = None
    tutor_profile.rejection_reason = None

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
        User.verification_status == "verified",
        TutorProfile.is_active == True
    )

    # Add search if provided
    if search:
        search_filter = or_(
            User.first_name.ilike(f"%{search}%"),
            User.father_name.ilike(f"%{search}%"),
            User.location.ilike(f"%{search}%")  # From users table (migrated from tutor_profiles)
        )
        query = query.filter(search_filter)

    # TODO: Implement rating order using subquery to tutor_reviews table
    # For now, order by created_at descending (most recent first)
    query = query.order_by(TutorProfile.created_at.desc())

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
            "profile_picture": user.profile_picture if user else None,  # From users table (centralized)
            "teaches_at": None,  # Column removed
            "location": user.location if user else None,
            "courses": [],  # Column removed
            "rating": tutor_profile.rating,
            "total_students": tutor_profile.total_students,
            "total_sessions": tutor_profile.total_sessions,
            "verified_at": user.verified_at.isoformat() if user and user.verified_at else None  # From users table
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
        User.verification_status == "rejected"
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
            "profile_picture": user.profile_picture if user else None,  # From users table (centralized)
            "teaches_at": None,  # Column removed
            "location": user.location if user else None,
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

    # Query suspended tutors (from users table)
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
            "profile_picture": user.profile_picture if user else None,  # From users table (centralized)
            "teaches_at": None,  # Column removed
            "location": user.location if user else None,
            "courses": [],  # Column removed
            "suspension_reason": user.suspension_reason if user else None,  # From users table
            "suspended_at": user.suspended_at.isoformat() if user and user.suspended_at else None,  # From users table
            "verified_at": user.verified_at.isoformat() if user and user.verified_at else None,  # From users table
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
                User.verification_status != 'not_verified',
                User.verification_status != None
            )
        ).count()

        pending_count = db.query(TutorProfile).filter(
            User.verification_status == 'pending'
        ).count()

        verified_count = db.query(TutorProfile).filter(
            User.verification_status == 'verified'
        ).count()

        rejected_count = db.query(TutorProfile).filter(
            User.verification_status == 'rejected'
        ).count()

        suspended_count = db.query(TutorProfile).filter(
            User.verification_status == 'suspended'
        ).count()

        # Calculate archived (inactive for more than 6 months, excluding not_verified)
        six_months_ago = datetime.utcnow() - timedelta(days=180)
        archived_count = db.query(TutorProfile).filter(
            and_(
                TutorProfile.updated_at < six_months_ago,
                User.verification_status != 'suspended',
                User.verification_status != 'not_verified'
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
                User.verification_status == 'verified'
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
                User.verification_status != 'not_verified',
                User.verification_status != None
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
                "location": user.location if user else None,  # From users table (migrated from tutor_profiles)
                "verification_status": user.verification_status if user else 'pending',  # From users table (migrated from tutor_profiles)
                "created_at": tutor.created_at.isoformat() if tutor.created_at else None,
                "updated_at": tutor.updated_at.isoformat() if tutor.updated_at else None,
                "profile_picture": user.profile_picture if user else None  # From users table (migrated from tutor_profiles)
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
# NOTE: School management has been migrated to use a single 'schools' table
# with a 'status' field (pending, verified, rejected, suspended).
# All school endpoints are now in admin_schools_endpoints.py under /api/admin/schools/*
