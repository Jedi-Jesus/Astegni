"""
Referral System API Endpoints
Handles user referral codes, tracking, and analytics
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import secrets
import string
from datetime import datetime

from models import (
    get_db, User, UserReferralCode, ReferralRegistration, ReferralClick,
    ReferralCodeResponse, ReferredUserResponse, ReferralStatsResponse
)
from utils import get_current_user

router = APIRouter(prefix="/api/referrals", tags=["Referrals"])


def generate_referral_code(user_id: int, profile_type: str, db: Session) -> str:
    """Generate a unique referral code"""
    while True:
        # Format: {profile_type_prefix}{user_id}{random_suffix}
        profile_prefix = profile_type[0].upper()  # T, S, P, A
        random_suffix = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
        code = f"{profile_prefix}{user_id}{random_suffix}"

        # Check if code already exists
        existing = db.query(UserReferralCode).filter(UserReferralCode.referral_code == code).first()
        if not existing:
            return code


@router.get("/my-code", response_model=ReferralCodeResponse)
async def get_my_referral_code(
    profile_type: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get or create referral code for current user's profile
    """
    # Validate profile type
    valid_types = ['tutor', 'student', 'parent', 'advertiser']
    if profile_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid profile type. Must be one of: {valid_types}")

    # Check if user has this role
    if not current_user.roles or profile_type not in current_user.roles:
        raise HTTPException(status_code=403, detail=f"You don't have the {profile_type} role")

    # Get or create referral code
    referral_code_obj = db.query(UserReferralCode).filter(
        UserReferralCode.user_id == current_user.id,
        UserReferralCode.profile_type == profile_type
    ).first()

    if not referral_code_obj:
        # Create new referral code
        code = generate_referral_code(current_user.id, profile_type, db)
        referral_code_obj = UserReferralCode(
            user_id=current_user.id,
            referral_code=code,
            profile_type=profile_type
        )
        db.add(referral_code_obj)
        db.commit()
        db.refresh(referral_code_obj)

    # Determine frontend base URL from the API request host.
    # The API runs on api.astegni.com (or localhost:8000) — we need the *frontend* URL.
    host = request.headers.get('host', '') or str(request.base_url)
    if 'localhost' in host or '127.0.0.1' in host:
        base_url = 'http://localhost:8081'
    else:
        # Strip any 'api.' subdomain prefix to get the frontend domain
        frontend_host = host.replace('api.', '', 1).split(':')[0]
        base_url = f'https://{frontend_host}'

    share_url = f"{base_url}?ref={referral_code_obj.referral_code}"

    return ReferralCodeResponse(
        referral_code=referral_code_obj.referral_code,
        profile_type=referral_code_obj.profile_type,
        total_referrals=referral_code_obj.total_referrals,
        active_referrals=referral_code_obj.active_referrals,
        share_url=share_url,
        created_at=referral_code_obj.created_at
    )


@router.post("/track-click")
async def track_referral_click(
    referral_code: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Track a click on a referral link
    """
    # Verify referral code exists
    code_obj = db.query(UserReferralCode).filter(
        UserReferralCode.referral_code == referral_code
    ).first()

    if not code_obj:
        raise HTTPException(status_code=404, detail="Invalid referral code")

    # Get client info
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")

    # Create click record
    click = ReferralClick(
        referral_code=referral_code,
        ip_address=client_ip,
        user_agent=user_agent
    )
    db.add(click)
    db.commit()

    return {"message": "Click tracked successfully", "referral_code": referral_code}


@router.post("/register-referral")
async def register_referral(
    referral_code: str,
    referred_user_id: int,
    db: Session = Depends(get_db)
):
    """
    Register a new user as referred by referral code
    Called internally after successful registration
    """
    # Get referral code info
    code_obj = db.query(UserReferralCode).filter(
        UserReferralCode.referral_code == referral_code
    ).first()

    if not code_obj:
        raise HTTPException(status_code=404, detail="Invalid referral code")

    # Check if user already registered via a referral
    existing = db.query(ReferralRegistration).filter(
        ReferralRegistration.referred_user_id == referred_user_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="User already registered via referral")

    # Get referred user info
    referred_user = db.query(User).filter(User.id == referred_user_id).first()
    if not referred_user:
        raise HTTPException(status_code=404, detail="Referred user not found")

    # Create referral registration
    registration = ReferralRegistration(
        referrer_user_id=code_obj.user_id,
        referrer_profile_type=code_obj.profile_type,
        referral_code=referral_code,
        referred_user_id=referred_user_id,
        referred_user_email=referred_user.email or "",
        referred_user_name=f"{referred_user.first_name or ''} {referred_user.last_name or ''}".strip(),
        last_activity=datetime.utcnow()
    )
    db.add(registration)

    # Update referral code stats
    code_obj.total_referrals += 1
    code_obj.active_referrals += 1
    code_obj.updated_at = datetime.utcnow()

    # Update click conversion if exists
    db.query(ReferralClick).filter(
        ReferralClick.referral_code == referral_code,
        ReferralClick.converted == False
    ).order_by(ReferralClick.clicked_at.desc()).limit(1).update({
        "converted": True,
        "converted_user_id": referred_user_id
    })

    db.commit()

    return {
        "message": "Referral registered successfully",
        "referrer_user_id": code_obj.user_id,
        "referred_user_id": referred_user_id
    }


@router.get("/my-referrals", response_model=List[ReferredUserResponse])
async def get_my_referrals(
    profile_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of users referred by current user
    """
    # Validate profile type
    valid_types = ['tutor', 'student', 'parent', 'advertiser']
    if profile_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid profile type. Must be one of: {valid_types}")

    # Get referrals
    referrals = db.query(ReferralRegistration).filter(
        ReferralRegistration.referrer_user_id == current_user.id,
        ReferralRegistration.referrer_profile_type == profile_type
    ).order_by(ReferralRegistration.registration_date.desc()).all()

    return [ReferredUserResponse(
        id=r.id,
        referred_user_id=r.referred_user_id,
        referred_user_email=r.referred_user_email,
        referred_user_name=r.referred_user_name,
        registration_date=r.registration_date,
        is_active=r.is_active,
        last_activity=r.last_activity
    ) for r in referrals]


@router.get("/stats", response_model=ReferralStatsResponse)
async def get_referral_stats(
    profile_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get referral statistics for current user
    """
    # Validate profile type
    valid_types = ['tutor', 'student', 'parent', 'advertiser']
    if profile_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid profile type. Must be one of: {valid_types}")

    # Get referral code
    code_obj = db.query(UserReferralCode).filter(
        UserReferralCode.user_id == current_user.id,
        UserReferralCode.profile_type == profile_type
    ).first()

    if not code_obj:
        # No referral code yet, return zeros
        return ReferralStatsResponse(
            total_clicks=0,
            total_registrations=0,
            active_referrals=0,
            conversion_rate=0.0,
            recent_referrals=[]
        )

    # Get click count
    total_clicks = db.query(func.count(ReferralClick.id)).filter(
        ReferralClick.referral_code == code_obj.referral_code
    ).scalar()

    # Get registrations
    registrations = db.query(ReferralRegistration).filter(
        ReferralRegistration.referrer_user_id == current_user.id,
        ReferralRegistration.referrer_profile_type == profile_type
    ).order_by(ReferralRegistration.registration_date.desc()).limit(10).all()

    total_registrations = len(registrations)
    active_referrals = code_obj.active_referrals

    # Calculate conversion rate
    conversion_rate = (total_registrations / total_clicks * 100) if total_clicks > 0 else 0.0

    recent_referrals = [ReferredUserResponse(
        id=r.id,
        referred_user_id=r.referred_user_id,
        referred_user_email=r.referred_user_email,
        referred_user_name=r.referred_user_name,
        registration_date=r.registration_date,
        is_active=r.is_active,
        last_activity=r.last_activity
    ) for r in registrations]

    return ReferralStatsResponse(
        total_clicks=total_clicks,
        total_registrations=code_obj.total_referrals,
        active_referrals=active_referrals,
        conversion_rate=round(conversion_rate, 2),
        recent_referrals=recent_referrals
    )


@router.delete("/referral/{referral_id}")
async def remove_referral(
    referral_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark a referral as inactive (soft delete)
    """
    referral = db.query(ReferralRegistration).filter(
        ReferralRegistration.id == referral_id,
        ReferralRegistration.referrer_user_id == current_user.id
    ).first()

    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    # Mark as inactive
    referral.is_active = False

    # Update referral code stats
    code_obj = db.query(UserReferralCode).filter(
        UserReferralCode.user_id == current_user.id,
        UserReferralCode.profile_type == referral.referrer_profile_type
    ).first()

    if code_obj and code_obj.active_referrals > 0:
        code_obj.active_referrals -= 1
        code_obj.updated_at = datetime.utcnow()

    db.commit()

    return {"message": "Referral marked as inactive"}
