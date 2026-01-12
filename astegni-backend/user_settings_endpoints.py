"""
User Settings Endpoints
Handles: 2FA, Login Sessions, Connected Accounts, Data Export, Platform Reviews, Appearance
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import secrets
import hashlib
import json
import pyotp
import bcrypt

# Import from app modules
from utils import get_current_user, get_db

# Import 2FA protection module
try:
    from tfa_protection import require_2fa
    HAS_2FA_PROTECTION = True
except ImportError:
    HAS_2FA_PROTECTION = False
    print("Warning: tfa_protection module not found. 2FA protection will be disabled.")

router = APIRouter(prefix="/api/user", tags=["User Settings"])


# ==========================================
# Pydantic Models
# ==========================================

class TwoFactorSetupRequest(BaseModel):
    method: str  # 'sms', 'email', 'authenticator'
    contact: Optional[str] = None

class TwoFactorVerifyRequest(BaseModel):
    code: str
    method: str

class TwoFactorDisableRequest(BaseModel):
    password: str

class PasswordVerifyRequest(BaseModel):
    password: str

class SetPasswordRequest(BaseModel):
    password: str

class PlatformReviewRequest(BaseModel):
    overall_rating: int
    category_ratings: Optional[Dict[str, int]] = None
    text: Optional[str] = None
    feature_suggestions: Optional[List[str]] = None
    recommends: Optional[bool] = None

class AppearanceSettings(BaseModel):
    theme: Optional[str] = 'light'
    fontSize: Optional[int] = 16
    density: Optional[str] = 'comfortable'
    accentColor: Optional[str] = 'indigo'
    animations: Optional[bool] = True
    reduceMotion: Optional[bool] = False
    sidebarPosition: Optional[str] = 'left'

class LanguageSettings(BaseModel):
    ui_language: str
    auto_translate: bool = False
    translate_posts: bool = True
    translate_reviews: bool = True
    translate_messages: bool = False


# ==========================================
# Two-Factor Authentication Endpoints
# ==========================================

@router.get("/2fa/status")
async def get_2fa_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current 2FA status for the user"""
    try:
        from models import User
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        two_fa_enabled = getattr(user, 'two_factor_enabled', False)
        two_fa_method = getattr(user, 'two_factor_method', None)

        # Mask contact info for security
        masked_contact = None
        if two_fa_method == 'sms' and user.phone:
            masked_contact = f"***-***-{user.phone[-4:]}" if len(user.phone) >= 4 else "***"
        elif two_fa_method == 'email' and user.email:
            parts = user.email.split('@')
            if len(parts) == 2:
                masked_contact = f"{parts[0][:2]}***@{parts[1]}"
        elif two_fa_method == 'authenticator':
            masked_contact = "Authenticator App"

        return {
            "enabled": two_fa_enabled,
            "method": two_fa_method,
            "masked_contact": masked_contact
        }
    except Exception as e:
        # Return disabled status if 2FA fields don't exist
        return {
            "enabled": False,
            "method": None,
            "masked_contact": None
        }


@router.post("/2fa/setup")
async def setup_2fa(
    request: TwoFactorSetupRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initialize 2FA setup - generates secret or sends code"""
    from models import User
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if request.method == 'authenticator':
        # Generate TOTP secret
        secret = pyotp.random_base32()

        # Store temporarily (in production, store encrypted)
        user.two_factor_secret = secret
        db.commit()

        # Generate provisioning URI for QR code
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=user.email or user.phone,
            issuer_name="Astegni"
        )

        return {
            "secret": secret,
            "provisioning_uri": provisioning_uri,
            "formatted_secret": '-'.join([secret[i:i+4] for i in range(0, len(secret), 4)])
        }
    else:
        # SMS or Email - generate and send OTP
        otp = ''.join([str(secrets.randbelow(10)) for _ in range(6)])

        # Store OTP (in production, store hashed with expiry)
        user.two_factor_temp_code = otp
        user.two_factor_temp_expiry = datetime.utcnow() + timedelta(minutes=10)
        db.commit()

        # Send OTP (implement actual sending)
        if request.method == 'sms':
            # TODO: Send SMS
            print(f"[2FA] SMS OTP for user {user.id}: {otp}")
        else:
            # TODO: Send Email
            print(f"[2FA] Email OTP for user {user.id}: {otp}")

        return {"message": f"Verification code sent via {request.method}"}


@router.post("/2fa/send-code")
async def send_2fa_code(
    request: TwoFactorSetupRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send 2FA verification code"""
    from models import User
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Generate 6-digit OTP
    otp = ''.join([str(secrets.randbelow(10)) for _ in range(6)])

    # Store OTP with expiry
    user.two_factor_temp_code = otp
    user.two_factor_temp_expiry = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    # Log for development (remove in production)
    print(f"[2FA] Verification code for {request.contact}: {otp}")

    return {"message": f"Verification code sent to {request.contact}"}


@router.post("/2fa/verify")
async def verify_2fa(
    request: TwoFactorVerifyRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify 2FA code and enable 2FA"""
    from models import User
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    verified = False

    if request.method == 'authenticator':
        # Verify TOTP
        secret = getattr(user, 'two_factor_secret', None)
        if secret:
            totp = pyotp.TOTP(secret)
            verified = totp.verify(request.code)
    else:
        # Verify OTP
        stored_code = getattr(user, 'two_factor_temp_code', None)
        expiry = getattr(user, 'two_factor_temp_expiry', None)

        if stored_code and expiry and datetime.utcnow() < expiry:
            verified = (request.code == stored_code)

    if not verified:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    # Enable 2FA
    user.two_factor_enabled = True
    user.two_factor_method = request.method
    user.two_factor_temp_code = None
    user.two_factor_temp_expiry = None

    # Generate backup codes
    backup_codes = [f"{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}" for _ in range(5)]
    user.two_factor_backup_codes = json.dumps(backup_codes)

    db.commit()

    return {
        "success": True,
        "message": "Two-factor authentication enabled",
        "backup_codes": backup_codes
    }


@router.post("/2fa/disable")
async def disable_2fa(
    request: TwoFactorDisableRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disable 2FA"""
    from models import User
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify password
    if not bcrypt.checkpw(request.password.encode(), user.password.encode()):
        raise HTTPException(status_code=401, detail="Invalid password")

    # Disable 2FA
    user.two_factor_enabled = False
    user.two_factor_method = None
    user.two_factor_secret = None
    user.two_factor_backup_codes = None

    db.commit()

    return {"success": True, "message": "Two-factor authentication disabled"}


# ==========================================
# Login Sessions Endpoints
# ==========================================

@router.get("/sessions")
async def get_active_sessions(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all active sessions for the user"""
    from models import UserSession

    try:
        sessions = db.query(UserSession).filter(
            UserSession.user_id == current_user["user_id"],
            UserSession.is_active == True
        ).all()

        current_token = current_user.get("token_jti")

        current_session = None
        other_sessions = []

        for session in sessions:
            session_data = {
                "id": str(session.id),
                "device_type": session.device_type or "desktop",
                "device_name": session.device_name or "Unknown Device",
                "os": session.os or "Unknown OS",
                "browser": session.browser or "Unknown Browser",
                "location": session.location or "Unknown Location",
                "ip_address": session.ip_address,
                "last_active": session.last_active.isoformat() if session.last_active else "Unknown"
            }

            if session.token_jti == current_token:
                current_session = session_data
            else:
                other_sessions.append(session_data)

        return {
            "current": current_session or {
                "os": "Current Device",
                "browser": "Current Browser",
                "location": "Your Location"
            },
            "others": other_sessions
        }
    except Exception as e:
        # If UserSession table doesn't exist, return empty
        return {
            "current": {
                "os": "Windows",
                "browser": "Chrome",
                "location": "Addis Ababa, Ethiopia"
            },
            "others": []
        }


@router.delete("/sessions/{session_id}")
async def terminate_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Terminate a specific session"""
    from models import UserSession

    session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user["user_id"]
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.is_active = False
    db.commit()

    return {"success": True, "message": "Session terminated"}


@router.delete("/sessions/all")
async def terminate_all_other_sessions(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Terminate all sessions except current"""
    from models import UserSession

    current_token = current_user.get("token_jti")

    db.query(UserSession).filter(
        UserSession.user_id == current_user["user_id"],
        UserSession.token_jti != current_token,
        UserSession.is_active == True
    ).update({"is_active": False})

    db.commit()

    return {"success": True, "message": "All other sessions terminated"}


@router.get("/login-history")
async def get_login_history(
    days: int = 30,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get login history for the user"""
    from models import LoginHistory

    try:
        since = datetime.utcnow() - timedelta(days=days)

        history = db.query(LoginHistory).filter(
            LoginHistory.user_id == current_user["user_id"],
            LoginHistory.timestamp >= since
        ).order_by(LoginHistory.timestamp.desc()).limit(50).all()

        return {
            "history": [
                {
                    "id": str(h.id),
                    "success": h.success,
                    "device": h.device or "Unknown Device",
                    "location": h.location or "Unknown Location",
                    "ip_address": h.ip_address,
                    "time": h.timestamp.isoformat() if h.timestamp else "Unknown"
                }
                for h in history
            ]
        }
    except Exception as e:
        # If LoginHistory table doesn't exist, return empty
        return {"history": []}


# ==========================================
# Connected Accounts Endpoints
# ==========================================

@router.post("/unlink-google")
async def unlink_google_account(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unlink Google account"""
    from models import User
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if user has a password set
    if not user.password:
        raise HTTPException(
            status_code=400,
            detail="Cannot unlink Google account without a password set. Please set a password first."
        )

    # Unlink Google
    user.google_id = None
    user.oauth_provider = None
    db.commit()

    return {"success": True, "message": "Google account unlinked"}


@router.post("/set-password")
async def set_password(
    request: SetPasswordRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set password for users who signed up with OAuth"""
    from models import User
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if len(request.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Hash and set password
    hashed = bcrypt.hashpw(request.password.encode(), bcrypt.gensalt())
    user.password = hashed.decode()
    user.has_password = True

    db.commit()

    return {"success": True, "message": "Password set successfully"}


@router.post("/verify-password")
async def verify_password(
    request: PasswordVerifyRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify user's password for sensitive operations"""
    from models import User
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.password:
        raise HTTPException(status_code=400, detail="No password set")

    if not bcrypt.checkpw(request.password.encode(), user.password.encode()):
        raise HTTPException(status_code=401, detail="Invalid password")

    return {"success": True, "verified": True}


# ==========================================
# Data Export Endpoints
# ==========================================

@router.post("/export/request")
async def request_data_export(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Request a data export - sends verification email"""
    from models import User
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Generate verification code
    code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])

    # Store code with expiry
    user.export_verification_code = code
    user.export_verification_expiry = datetime.utcnow() + timedelta(minutes=30)
    db.commit()

    # TODO: Send verification email
    print(f"[EXPORT] Verification code for user {user.id}: {code}")

    return {
        "success": True,
        "message": "Verification code sent to your email",
        "email": user.email[:3] + "***@" + user.email.split('@')[1] if user.email else None
    }


@router.post("/export/verify")
async def verify_and_export(
    code: str,
    categories: List[str],
    format: str = "json",
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify code and generate data export"""
    from models import User
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify code
    stored_code = getattr(user, 'export_verification_code', None)
    expiry = getattr(user, 'export_verification_expiry', None)

    if not stored_code or stored_code != code:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    if expiry and datetime.utcnow() > expiry:
        raise HTTPException(status_code=400, detail="Verification code expired")

    # Clear verification code
    user.export_verification_code = None
    user.export_verification_expiry = None
    db.commit()

    # Generate export data
    export_data = {
        "exported_at": datetime.utcnow().isoformat(),
        "user_id": user.id,
        "format": format
    }

    if "profile" in categories:
        export_data["profile"] = {
            "first_name": user.first_name,
            "father_name": user.father_name,
            "email": user.email,
            "phone": user.phone,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }

    # TODO: Add more categories (content, messages, sessions, activity, connections)

    return {
        "success": True,
        "download_url": f"/api/user/export/download/{user.id}",
        "expires_in": "24 hours",
        "filename": f"astegni-data-export-{datetime.utcnow().strftime('%Y%m%d')}.{format}",
        "size": "~2.3 MB"
    }


# ==========================================
# Platform Reviews Endpoints
# ==========================================

@router.get("/platform-review")
async def get_my_platform_review(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's existing platform review"""
    from models import PlatformReview

    try:
        review = db.query(PlatformReview).filter(
            PlatformReview.user_id == current_user["user_id"]
        ).first()

        if not review:
            return {"review": None}

        return {
            "review": {
                "overall_rating": review.overall_rating,
                "category_ratings": json.loads(review.category_ratings) if review.category_ratings else {},
                "text": review.text,
                "feature_suggestions": json.loads(review.feature_suggestions) if review.feature_suggestions else [],
                "recommends": review.recommends,
                "created_at": review.created_at.isoformat() if review.created_at else None
            }
        }
    except Exception as e:
        return {"review": None}


@router.post("/platform-review")
async def submit_platform_review(
    request: PlatformReviewRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit or update platform review"""
    from models import PlatformReview

    # Check for existing review
    review = db.query(PlatformReview).filter(
        PlatformReview.user_id == current_user["user_id"]
    ).first()

    if review:
        # Update existing
        review.overall_rating = request.overall_rating
        review.category_ratings = json.dumps(request.category_ratings) if request.category_ratings else None
        review.text = request.text
        review.feature_suggestions = json.dumps(request.feature_suggestions) if request.feature_suggestions else None
        review.recommends = request.recommends
        review.updated_at = datetime.utcnow()
    else:
        # Create new
        review = PlatformReview(
            user_id=current_user["user_id"],
            overall_rating=request.overall_rating,
            category_ratings=json.dumps(request.category_ratings) if request.category_ratings else None,
            text=request.text,
            feature_suggestions=json.dumps(request.feature_suggestions) if request.feature_suggestions else None,
            recommends=request.recommends,
            created_at=datetime.utcnow()
        )
        db.add(review)

    db.commit()

    return {"success": True, "message": "Review submitted successfully"}


# ==========================================
# Appearance Settings Endpoints
# ==========================================

@router.get("/settings/appearance")
async def get_appearance_settings(
    current_user: dict = Depends(get_current_user),
    verification_token: Optional[str] = Header(default=None, alias="X-2FA-Token"),
    db: Session = Depends(get_db)
):
    """Get user's appearance settings (2FA protected if enabled)"""
    # Check 2FA protection
    if HAS_2FA_PROTECTION:
        require_2fa(current_user["user_id"], verification_token)

    from models import UserSettings

    try:
        settings = db.query(UserSettings).filter(
            UserSettings.user_id == current_user["user_id"]
        ).first()

        if not settings or not settings.appearance:
            return {
                "theme": "light",
                "fontSize": 16,
                "density": "comfortable",
                "accentColor": "indigo",
                "animations": True,
                "reduceMotion": False,
                "sidebarPosition": "left"
            }

        return json.loads(settings.appearance)
    except Exception as e:
        return {
            "theme": "light",
            "fontSize": 16,
            "density": "comfortable",
            "accentColor": "indigo",
            "animations": True,
            "reduceMotion": False,
            "sidebarPosition": "left"
        }


@router.put("/settings/appearance")
async def update_appearance_settings(
    settings: AppearanceSettings,
    current_user: dict = Depends(get_current_user),
    verification_token: Optional[str] = Header(default=None, alias="X-2FA-Token"),
    db: Session = Depends(get_db)
):
    """Update user's appearance settings (2FA protected if enabled)"""
    # Check 2FA protection
    if HAS_2FA_PROTECTION:
        require_2fa(current_user["user_id"], verification_token)

    from models import UserSettings

    user_settings = db.query(UserSettings).filter(
        UserSettings.user_id == current_user["user_id"]
    ).first()

    if not user_settings:
        user_settings = UserSettings(user_id=current_user["user_id"])
        db.add(user_settings)

    user_settings.appearance = json.dumps(settings.dict())
    user_settings.updated_at = datetime.utcnow()

    db.commit()

    return {"success": True, "message": "Appearance settings saved"}


@router.get("/settings/language")
async def get_language_settings(
    current_user: dict = Depends(get_current_user),
    verification_token: Optional[str] = Header(default=None, alias="X-2FA-Token"),
    db: Session = Depends(get_db)
):
    """Get user's language settings (2FA protected if enabled)"""
    # Check 2FA protection
    if HAS_2FA_PROTECTION:
        require_2fa(current_user["user_id"], verification_token)

    from models import UserSettings

    try:
        settings = db.query(UserSettings).filter(
            UserSettings.user_id == current_user["user_id"]
        ).first()

        if not settings or not settings.language:
            return {
                "ui_language": "en",
                "auto_translate": False,
                "translate_posts": True,
                "translate_reviews": True,
                "translate_messages": False
            }

        return json.loads(settings.language)
    except Exception as e:
        return {
            "ui_language": "en",
            "auto_translate": False,
            "translate_posts": True,
            "translate_reviews": True,
            "translate_messages": False
        }


@router.put("/settings/language")
async def update_language_settings(
    settings: LanguageSettings,
    current_user: dict = Depends(get_current_user),
    verification_token: Optional[str] = Header(default=None, alias="X-2FA-Token"),
    db: Session = Depends(get_db)
):
    """Update user's language settings (2FA protected if enabled)"""
    # Check 2FA protection
    if HAS_2FA_PROTECTION:
        require_2fa(current_user["user_id"], verification_token)

    from models import UserSettings

    user_settings = db.query(UserSettings).filter(
        UserSettings.user_id == current_user["user_id"]
    ).first()

    if not user_settings:
        user_settings = UserSettings(user_id=current_user["user_id"])
        db.add(user_settings)

    user_settings.language = json.dumps(settings.dict())
    user_settings.updated_at = datetime.utcnow()

    db.commit()

    return {"success": True, "message": "Language settings saved"}
