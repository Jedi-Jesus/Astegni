"""
Two-Factor Authentication (2FA) Endpoints for Astegni
ROLE-BASED: Each role (student, tutor, parent, advertiser) has its own 2FA settings
Supports: Email OTP, TOTP Authenticator App, In-App Password Verification
"""

import secrets
import pyotp
import bcrypt
import qrcode
import io
import base64
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from models import User, StudentProfile, TutorProfile, ParentProfile, AdvertiserProfile, get_db
from utils import get_current_user
from email_service import email_service

router = APIRouter(prefix="/api/2fa", tags=["Two-Factor Authentication"])

# Role to Profile table mapping
ROLE_PROFILE_MAP = {
    'student': StudentProfile,
    'tutor': TutorProfile,
    'parent': ParentProfile,
    'advertiser': AdvertiserProfile
}


# ============================================
# PYDANTIC SCHEMAS
# ============================================

class TFAStatusResponse(BaseModel):
    """Response for 2FA status check"""
    enabled: bool
    method: Optional[str] = None  # 'email', 'authenticator', 'inapp'
    email: Optional[str] = None  # Masked email for display
    has_backup_codes: bool = False
    role: str  # Current role this status applies to


class TFAEnableRequest(BaseModel):
    """Request to enable 2FA with a specific method"""
    method: str  # 'email', 'authenticator', 'inapp'


class TFADisableRequest(BaseModel):
    """Request to disable 2FA"""
    password: str | None = None  # Required for in-app 2FA
    otp: str | None = None  # Required for email 2FA
    code: str | None = None  # Required for authenticator 2FA


class TFAEmailSendOTPRequest(BaseModel):
    """Request to send OTP to email for 2FA setup"""
    pass  # Uses user's registered email


class TFAEmailVerifyRequest(BaseModel):
    """Request to verify email OTP and enable 2FA"""
    otp: str


class TFAAuthenticatorSetupResponse(BaseModel):
    """Response for authenticator setup"""
    secret: str
    qr_code: str  # Base64 encoded QR code image
    manual_entry_key: str  # For manual entry


class TFAAuthenticatorVerifyRequest(BaseModel):
    """Request to verify authenticator code and enable 2FA"""
    code: str


class TFAInAppSetupRequest(BaseModel):
    """Request to set up In-App 2FA"""
    use_login_password: bool  # True = use login password, False = set separate password
    password: str  # If use_login_password=True, verify login password; else, new 2FA password
    current_password: str | None = None  # Required when use_login_password=False for security verification


class TFAInAppVerifyRequest(BaseModel):
    """Request to verify password for In-App 2FA"""
    password: str


class TFABackupCodesResponse(BaseModel):
    """Response with backup codes"""
    backup_codes: list[str]


class TFAVerifyForActionRequest(BaseModel):
    """Request to verify 2FA for sensitive actions"""
    method: str  # 'email', 'authenticator', 'inapp'
    code: Optional[str] = None  # OTP or TOTP code
    password: Optional[str] = None  # For in-app verification


# ============================================
# HELPER FUNCTIONS
# ============================================

def mask_email(email: str) -> str:
    """Mask email for display (e.g., j***@gmail.com)"""
    if not email or '@' not in email:
        return email
    local, domain = email.split('@')
    if len(local) <= 2:
        masked = local[0] + '***'
    else:
        masked = local[0] + '***' + local[-1]
    return f"{masked}@{domain}"


def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])


def generate_backup_codes(count: int = 8) -> list[str]:
    """Generate backup codes for 2FA recovery"""
    return [secrets.token_hex(4).upper() for _ in range(count)]


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


def generate_totp_secret() -> str:
    """Generate a TOTP secret for authenticator apps"""
    return pyotp.random_base32()


def get_totp_uri(secret: str, email: str, role: str) -> str:
    """Generate TOTP URI for QR code - includes role for clarity"""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=f"{email} ({role})", issuer_name="Astegni")


def generate_qr_code(uri: str) -> str:
    """Generate QR code as base64 encoded PNG"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode()


def verify_totp(secret: str, code: str) -> bool:
    """Verify a TOTP code"""
    try:
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)  # Allow 30 second window
    except Exception:
        return False


def get_current_role(current_user) -> str:
    """Get the user's current active role from token"""
    return getattr(current_user, 'current_role', None) or current_user.active_role or 'user'


def get_role_profile(db: Session, current_user, role: str):
    """Get the profile for the user's current role"""
    if role not in ROLE_PROFILE_MAP:
        return None

    ProfileModel = ROLE_PROFILE_MAP[role]
    return db.query(ProfileModel).filter(ProfileModel.user_id == current_user.id).first()


# ============================================
# ENDPOINTS
# ============================================

@router.get("/status", response_model=TFAStatusResponse)
async def get_2fa_status(
    role: Optional[str] = None,  # Optional role override (for profile pages)
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current 2FA status for a specific role or the user's current role.

    The optional 'role' query parameter allows profile pages to check TFA status
    for their specific role, regardless of what role is in the JWT token.
    Example: GET /api/2fa/status?role=student
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Use provided role if valid, otherwise fall back to token role
    if role and role in ROLE_PROFILE_MAP:
        # Verify user has this role
        if role not in (user.roles or []):
            raise HTTPException(status_code=403, detail=f"User does not have {role} role")
        target_role = role
    else:
        target_role = get_current_role(current_user)

    profile = get_role_profile(db, current_user, target_role)

    if not profile:
        # No profile for this role, return disabled status
        return TFAStatusResponse(
            enabled=False,
            method=None,
            email=mask_email(user.email) if user.email else None,
            has_backup_codes=False,
            role=target_role
        )

    return TFAStatusResponse(
        enabled=getattr(profile, 'two_factor_enabled', False) or False,
        method=getattr(profile, 'two_factor_method', None),
        email=mask_email(user.email) if user.email else None,
        has_backup_codes=bool(getattr(profile, 'two_factor_backup_codes', None)),
        role=target_role
    )


@router.post("/enable")
async def enable_2fa(
    request: TFAEnableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enable 2FA with a specific method for the CURRENT ROLE.
    This is the first step - actual verification happens in method-specific endpoints.
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = get_current_role(current_user)
    profile = get_role_profile(db, current_user, role)

    if not profile:
        raise HTTPException(
            status_code=400,
            detail=f"No {role} profile found. Please complete your {role} profile first."
        )

    valid_methods = ['email', 'authenticator', 'inapp']
    if request.method not in valid_methods:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid method. Must be one of: {', '.join(valid_methods)}"
        )

    # For email method, check if user has email
    if request.method == 'email' and not user.email:
        raise HTTPException(
            status_code=400,
            detail="No email address associated with account. Please add an email first."
        )

    # Store the intended method temporarily on the profile
    profile.two_factor_method = request.method
    db.commit()

    return {
        "success": True,
        "message": f"2FA setup initiated with {request.method} method for {role} role",
        "method": request.method,
        "role": role,
        "next_step": f"Complete verification using /api/2fa/{request.method}/verify"
    }


@router.post("/disable/send-otp")
async def send_disable_otp(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send OTP to email for disabling Email 2FA on current role
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = get_current_role(current_user)
    profile = get_role_profile(db, current_user, role)

    if not profile:
        raise HTTPException(status_code=400, detail=f"No {role} profile found")

    if not getattr(profile, 'two_factor_enabled', False):
        raise HTTPException(status_code=400, detail=f"2FA is not enabled for {role} role")

    if profile.two_factor_method != 'email':
        raise HTTPException(
            status_code=400,
            detail=f"This endpoint is only for Email 2FA. Your current method is '{profile.two_factor_method}'"
        )

    if not user.email:
        raise HTTPException(status_code=400, detail="No email address associated with account")

    # Generate OTP
    otp = generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=5)

    # Store OTP temporarily on profile
    profile.two_factor_temp_code = otp
    profile.two_factor_temp_expiry = expiry
    db.commit()

    # Send email
    email_sent = email_service.send_otp_email(
        to_email=user.email,
        otp_code=otp,
        purpose=f"Disable Two-Factor Authentication ({role.title()} Profile)"
    )

    if not email_sent:
        print(f"[2FA DISABLE] OTP for {user.email} ({role}): {otp}")

    return {
        "success": True,
        "message": f"OTP sent to {mask_email(user.email)}",
        "email": mask_email(user.email),
        "role": role,
        "expires_in": 300
    }


@router.post("/disable")
async def disable_2fa(
    request: TFADisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Disable 2FA for current role - verification method depends on 2FA type
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = get_current_role(current_user)
    profile = get_role_profile(db, current_user, role)

    if not profile:
        raise HTTPException(status_code=400, detail=f"No {role} profile found")

    if not getattr(profile, 'two_factor_enabled', False):
        raise HTTPException(status_code=400, detail=f"2FA is not enabled for {role} role")

    # Verify based on 2FA method
    if profile.two_factor_method == 'email':
        if not request.otp:
            raise HTTPException(status_code=400, detail="OTP is required to disable Email 2FA")

        if not profile.two_factor_temp_code:
            raise HTTPException(status_code=400, detail="No OTP sent. Use /disable/send-otp first.")

        if profile.two_factor_temp_expiry and profile.two_factor_temp_expiry < datetime.utcnow():
            profile.two_factor_temp_code = None
            profile.two_factor_temp_expiry = None
            db.commit()
            raise HTTPException(status_code=400, detail="OTP expired. Request a new one.")

        if profile.two_factor_temp_code != request.otp:
            raise HTTPException(status_code=401, detail="Invalid OTP")

    elif profile.two_factor_method == 'authenticator':
        if not request.code:
            raise HTTPException(status_code=400, detail="Authenticator code is required")

        if not profile.two_factor_secret:
            raise HTTPException(status_code=400, detail="No authenticator secret found")

        if not verify_totp(profile.two_factor_secret, request.code):
            raise HTTPException(status_code=401, detail="Invalid authenticator code")

    elif profile.two_factor_method == 'inapp':
        if not request.password:
            raise HTTPException(status_code=400, detail="Password is required")

        if not user.password_hash:
            raise HTTPException(status_code=400, detail="Password verification not available for OAuth accounts")

        if profile.two_factor_inapp_password:
            if not verify_password(request.password, profile.two_factor_inapp_password):
                raise HTTPException(status_code=401, detail="Invalid 2FA password")
        else:
            if not verify_password(request.password, user.password_hash):
                raise HTTPException(status_code=401, detail="Invalid login password")

    else:
        raise HTTPException(status_code=400, detail=f"Unknown 2FA method: {profile.two_factor_method}")

    # Disable 2FA on profile
    profile.two_factor_enabled = False
    profile.two_factor_method = None
    profile.two_factor_secret = None
    profile.two_factor_backup_codes = None
    profile.two_factor_temp_code = None
    profile.two_factor_temp_expiry = None
    profile.two_factor_inapp_password = None
    db.commit()

    return {
        "success": True,
        "message": f"Two-factor authentication has been disabled for {role} role",
        "role": role
    }


# ============================================
# EMAIL 2FA ENDPOINTS
# ============================================

@router.post("/email/send-otp")
async def send_email_otp(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send OTP to user's email for 2FA setup/verification on current role
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = get_current_role(current_user)
    profile = get_role_profile(db, current_user, role)

    if not profile:
        raise HTTPException(status_code=400, detail=f"No {role} profile found")

    if not user.email:
        raise HTTPException(status_code=400, detail="No email address associated with account")

    # Generate OTP
    otp = generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=5)

    # Store OTP temporarily on profile
    profile.two_factor_temp_code = otp
    profile.two_factor_temp_expiry = expiry
    db.commit()

    # Send email
    email_sent = email_service.send_otp_email(
        to_email=user.email,
        otp_code=otp,
        purpose=f"Two-Factor Authentication Setup ({role.title()} Profile)"
    )

    if not email_sent:
        print(f"[2FA] OTP for {user.email} ({role}): {otp}")

    return {
        "success": True,
        "message": f"OTP sent to {mask_email(user.email)}",
        "email": mask_email(user.email),
        "role": role,
        "expires_in": 300
    }


@router.post("/email/verify")
async def verify_email_otp(
    request: TFAEmailVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify email OTP and enable 2FA for current role
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = get_current_role(current_user)
    profile = get_role_profile(db, current_user, role)

    if not profile:
        raise HTTPException(status_code=400, detail=f"No {role} profile found")

    if not profile.two_factor_temp_code:
        raise HTTPException(status_code=400, detail="No OTP sent. Please request a new one.")

    if profile.two_factor_temp_expiry and profile.two_factor_temp_expiry < datetime.utcnow():
        profile.two_factor_temp_code = None
        profile.two_factor_temp_expiry = None
        db.commit()
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")

    if profile.two_factor_temp_code != request.otp:
        raise HTTPException(status_code=401, detail="Invalid OTP")

    # Generate backup codes
    backup_codes = generate_backup_codes()

    # Enable 2FA on profile
    profile.two_factor_enabled = True
    profile.two_factor_method = 'email'
    profile.two_factor_backup_codes = ','.join(backup_codes)
    profile.two_factor_temp_code = None
    profile.two_factor_temp_expiry = None
    db.commit()

    return {
        "success": True,
        "message": f"Two-factor authentication enabled with Email for {role} role",
        "method": "email",
        "role": role,
        "backup_codes": backup_codes
    }


# ============================================
# AUTHENTICATOR 2FA ENDPOINTS
# ============================================

@router.post("/authenticator/setup", response_model=TFAAuthenticatorSetupResponse)
async def setup_authenticator(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate TOTP secret and QR code for authenticator app setup on current role
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = get_current_role(current_user)
    profile = get_role_profile(db, current_user, role)

    if not profile:
        raise HTTPException(status_code=400, detail=f"No {role} profile found")

    # Generate new TOTP secret
    secret = generate_totp_secret()

    # Generate QR code URI (includes role for clarity)
    email = user.email or f"user_{user.id}@astegni.com"
    uri = get_totp_uri(secret, email, role)

    # Generate QR code image
    qr_code = generate_qr_code(uri)

    # Store secret temporarily on profile
    profile.two_factor_secret = secret
    profile.two_factor_method = 'authenticator'
    db.commit()

    return TFAAuthenticatorSetupResponse(
        secret=secret,
        qr_code=f"data:image/png;base64,{qr_code}",
        manual_entry_key=secret
    )


@router.post("/authenticator/verify")
async def verify_authenticator(
    request: TFAAuthenticatorVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify authenticator code and enable 2FA for current role
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = get_current_role(current_user)
    profile = get_role_profile(db, current_user, role)

    if not profile:
        raise HTTPException(status_code=400, detail=f"No {role} profile found")

    if not profile.two_factor_secret:
        raise HTTPException(status_code=400, detail="Authenticator not set up. Call /authenticator/setup first.")

    if not verify_totp(profile.two_factor_secret, request.code):
        raise HTTPException(status_code=401, detail="Invalid verification code")

    # Generate backup codes
    backup_codes = generate_backup_codes()

    # Enable 2FA on profile
    profile.two_factor_enabled = True
    profile.two_factor_method = 'authenticator'
    profile.two_factor_backup_codes = ','.join(backup_codes)
    db.commit()

    return {
        "success": True,
        "message": f"Two-factor authentication enabled with Authenticator App for {role} role",
        "method": "authenticator",
        "role": role,
        "backup_codes": backup_codes
    }


# ============================================
# IN-APP 2FA ENDPOINTS (Password Verification)
# ============================================

@router.post("/inapp/setup")
async def setup_inapp_verification(
    request: TFAInAppSetupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Set up In-App 2FA for current role with two options:
    1. Use login password (use_login_password=True)
    2. Set a different password (use_login_password=False)
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = get_current_role(current_user)
    profile = get_role_profile(db, current_user, role)

    if not profile:
        raise HTTPException(status_code=400, detail=f"No {role} profile found")

    if request.use_login_password:
        if not verify_password(request.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid login password")

        profile.two_factor_inapp_password = None
        message = f"Two-factor authentication enabled with Login Password for {role} role"
    else:
        if not request.current_password:
            raise HTTPException(status_code=400, detail="Current password is required for security verification")

        if not verify_password(request.current_password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid current password")

        if len(request.password) < 8:
            raise HTTPException(status_code=400, detail="2FA password must be at least 8 characters long")

        if verify_password(request.password, user.password_hash):
            raise HTTPException(status_code=400, detail="2FA password must be different from your login password")

        profile.two_factor_inapp_password = hash_password(request.password)
        message = f"Two-factor authentication enabled with Separate Password for {role} role"

    # Generate backup codes
    backup_codes = generate_backup_codes()

    # Enable 2FA on profile
    profile.two_factor_enabled = True
    profile.two_factor_method = 'inapp'
    profile.two_factor_backup_codes = ','.join(backup_codes)
    db.commit()

    return {
        "success": True,
        "message": message,
        "method": "inapp",
        "role": role,
        "uses_login_password": request.use_login_password,
        "backup_codes": backup_codes
    }


@router.post("/inapp/verify")
async def verify_inapp_password(
    request: TFAInAppVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify In-App 2FA password for current role
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = get_current_role(current_user)
    profile = get_role_profile(db, current_user, role)

    if not profile:
        raise HTTPException(status_code=400, detail=f"No {role} profile found")

    if not getattr(profile, 'two_factor_enabled', False) or profile.two_factor_method != 'inapp':
        raise HTTPException(status_code=400, detail=f"In-App 2FA is not enabled for {role} role")

    if profile.two_factor_inapp_password:
        if not verify_password(request.password, profile.two_factor_inapp_password):
            raise HTTPException(status_code=401, detail="Invalid 2FA password")
    else:
        if not verify_password(request.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid login password")

    return {
        "success": True,
        "verified": True,
        "message": f"In-App verification successful for {role} role",
        "role": role
    }


# ============================================
# BACKUP CODES ENDPOINTS
# ============================================

@router.get("/backup-codes")
async def get_backup_codes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get backup codes for current role
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = get_current_role(current_user)
    profile = get_role_profile(db, current_user, role)

    if not profile:
        raise HTTPException(status_code=400, detail=f"No {role} profile found")

    if not getattr(profile, 'two_factor_enabled', False):
        raise HTTPException(status_code=400, detail=f"2FA is not enabled for {role} role")

    if not profile.two_factor_backup_codes:
        raise HTTPException(status_code=404, detail="No backup codes found")

    codes = profile.two_factor_backup_codes.split(',')

    return {
        "success": True,
        "backup_codes": codes,
        "count": len(codes),
        "role": role
    }


@router.post("/backup-codes/regenerate")
async def regenerate_backup_codes(
    request: TFADisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Regenerate backup codes for current role - requires password verification
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = get_current_role(current_user)
    profile = get_role_profile(db, current_user, role)

    if not profile:
        raise HTTPException(status_code=400, detail=f"No {role} profile found")

    if not getattr(profile, 'two_factor_enabled', False):
        raise HTTPException(status_code=400, detail=f"2FA is not enabled for {role} role")

    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")

    backup_codes = generate_backup_codes()
    profile.two_factor_backup_codes = ','.join(backup_codes)
    db.commit()

    return {
        "success": True,
        "message": f"Backup codes regenerated for {role} role",
        "backup_codes": backup_codes,
        "role": role
    }


# ============================================
# VERIFY 2FA FOR SENSITIVE ACTIONS
# ============================================

@router.post("/send-action-otp")
async def send_action_otp(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send OTP to email for protected actions on current role
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = get_current_role(current_user)
    profile = get_role_profile(db, current_user, role)

    if not profile:
        raise HTTPException(status_code=400, detail=f"No {role} profile found")

    if not getattr(profile, 'two_factor_enabled', False):
        raise HTTPException(status_code=400, detail=f"2FA is not enabled for {role} role")

    if profile.two_factor_method != 'email':
        raise HTTPException(
            status_code=400,
            detail=f"This endpoint is only for Email 2FA. Your current method is '{profile.two_factor_method}'"
        )

    if not user.email:
        raise HTTPException(status_code=400, detail="No email address associated with account")

    otp = generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=5)

    profile.two_factor_temp_code = otp
    profile.two_factor_temp_expiry = expiry
    db.commit()

    email_sent = email_service.send_otp_email(
        to_email=user.email,
        otp_code=otp,
        purpose=f"Verify Protected Action ({role.title()} Profile)"
    )

    if not email_sent:
        print(f"[2FA ACTION] OTP for {user.email} ({role}): {otp}")

    return {
        "success": True,
        "message": f"OTP sent to {mask_email(user.email)}",
        "email": mask_email(user.email),
        "role": role,
        "expires_in": 300
    }


@router.post("/verify")
async def verify_2fa_for_action(
    request: TFAVerifyForActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify 2FA code for sensitive actions on current role.
    Returns a temporary verification token valid for 10 minutes.
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = get_current_role(current_user)
    profile = get_role_profile(db, current_user, role)

    if not profile:
        raise HTTPException(status_code=400, detail=f"No {role} profile found")

    if not getattr(profile, 'two_factor_enabled', False):
        raise HTTPException(status_code=400, detail=f"2FA is not enabled for {role} role")

    verified = False

    if request.method == 'email':
        if not request.code:
            raise HTTPException(status_code=400, detail="OTP code required")

        if not profile.two_factor_temp_code:
            raise HTTPException(status_code=400, detail="No OTP sent. Please request a new one.")

        if profile.two_factor_temp_expiry and profile.two_factor_temp_expiry < datetime.utcnow():
            raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")

        verified = profile.two_factor_temp_code == request.code
        if verified:
            profile.two_factor_temp_code = None
            profile.two_factor_temp_expiry = None

    elif request.method == 'authenticator':
        if not request.code:
            raise HTTPException(status_code=400, detail="Authenticator code required")

        if not profile.two_factor_secret:
            raise HTTPException(status_code=400, detail="Authenticator not configured")

        verified = verify_totp(profile.two_factor_secret, request.code)

    elif request.method == 'inapp':
        if not request.password:
            raise HTTPException(status_code=400, detail="Password required")

        if profile.two_factor_inapp_password:
            verified = verify_password(request.password, profile.two_factor_inapp_password)
        else:
            verified = verify_password(request.password, user.password_hash)

    elif request.method == 'backup':
        if not request.code:
            raise HTTPException(status_code=400, detail="Backup code required")

        if not profile.two_factor_backup_codes:
            raise HTTPException(status_code=400, detail="No backup codes available")

        codes = profile.two_factor_backup_codes.split(',')
        if request.code.upper() in codes:
            codes.remove(request.code.upper())
            profile.two_factor_backup_codes = ','.join(codes) if codes else None
            verified = True

    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid method. Must be 'email', 'authenticator', 'inapp', or 'backup'"
        )

    if not verified:
        raise HTTPException(status_code=401, detail="Verification failed")

    # Generate temporary verification token
    verification_token = secrets.token_urlsafe(32)
    verification_expiry = datetime.utcnow() + timedelta(minutes=10)

    profile.two_factor_verification_token = verification_token
    profile.two_factor_verification_expiry = verification_expiry
    db.commit()

    return {
        "success": True,
        "verified": True,
        "message": f"2FA verification successful for {role} role",
        "role": role,
        "verification_token": verification_token,
        "expires_in": 600
    }


# ============================================
# PROTECTED PANELS CONFIGURATION
# ============================================

# Available panels for each role (matching sidebar items)
AVAILABLE_PANELS = {
    'tutor': [
        {'id': 'dashboard', 'name': 'Dashboard', 'recommended': False},
        {'id': 'credentials', 'name': 'Credentials', 'recommended': False},
        {'id': 'analysis', 'name': 'Analysis', 'recommended': False},
        {'id': 'notes', 'name': 'Notes', 'recommended': False},
        {'id': 'schedule', 'name': 'My Schedule', 'recommended': False},
        {'id': 'packages', 'name': 'Packages', 'recommended': True},
        {'id': 'requests', 'name': 'Requests', 'recommended': True},
        {'id': 'my-students', 'name': 'My Students', 'recommended': False},
        {'id': 'teaching-tools', 'name': 'Teaching Tools', 'recommended': False},
        {'id': 'tutor-community', 'name': 'Community', 'recommended': False},
        {'id': 'documents', 'name': 'Documents', 'recommended': False},
        {'id': 'blog', 'name': 'Blog Posts', 'recommended': False},
        {'id': 'stories', 'name': 'Stories', 'recommended': False},
        {'id': 'images', 'name': 'Images', 'recommended': False},
        {'id': 'videos', 'name': 'My Videos', 'recommended': False},
        {'id': 'podcasts', 'name': 'Podcasts', 'recommended': False},
        {'id': 'earnings-investments', 'name': 'Earnings & Investments', 'recommended': True},
        {'id': 'reviews', 'name': 'Reviews & Ratings', 'recommended': False},
        {'id': 'settings', 'name': 'Settings', 'recommended': True},
    ],
    'student': [
        {'id': 'dashboard', 'name': 'Dashboard', 'recommended': False},
        {'id': 'analysis', 'name': 'Analysis', 'recommended': False},
        {'id': 'credentials', 'name': 'Credentials', 'recommended': True},
        {'id': 'notes', 'name': 'Notes', 'recommended': False},
        {'id': 'my-requests', 'name': 'My Requests', 'recommended': False},
        {'id': 'schedule', 'name': 'Schedule', 'recommended': False},
        {'id': 'my-tutors', 'name': 'My Tutors', 'recommended': False},
        {'id': 'my-courses', 'name': 'My Courses', 'recommended': False},
        {'id': 'learning-tools', 'name': 'Learning Tools', 'recommended': False},
        {'id': 'community', 'name': 'Community', 'recommended': False},
        {'id': 'parent-portal', 'name': 'Parent Portal', 'recommended': False},
        {'id': 'documents', 'name': 'Documents', 'recommended': False},
        {'id': 'blog', 'name': 'Blog', 'recommended': False},
        {'id': 'ratings-and-reviews', 'name': 'Ratings & Reviews', 'recommended': False},
        {'id': 'earnings-investments', 'name': 'Earnings & Investments', 'recommended': True},
        {'id': 'become-tutor', 'name': 'Become a Tutor', 'recommended': False},
        {'id': 'settings', 'name': 'Settings', 'recommended': True},
    ],
    'parent': [
        {'id': 'dashboard', 'name': 'Dashboard', 'recommended': False},
        {'id': 'my-children', 'name': 'My Children', 'recommended': True},
        {'id': 'co-parents', 'name': 'Co-Parents', 'recommended': True},
        {'id': 'my-requests', 'name': 'My Requests', 'recommended': False},
        {'id': 'family-schedule', 'name': 'Family Schedule', 'recommended': False},
        {'id': 'tutors', 'name': 'Tutors', 'recommended': False},
        {'id': 'notes', 'name': 'Notes', 'recommended': False},
        {'id': 'tutor-child', 'name': 'Tutor-Child', 'recommended': False},
        {'id': 'blog', 'name': 'Blog', 'recommended': False},
        {'id': 'parent-community', 'name': 'Community', 'recommended': False},
        {'id': 'ratings-and-reviews', 'name': 'Ratings & Reviews', 'recommended': False},
        {'id': 'earnings-investments', 'name': 'Earnings & Investments', 'recommended': False},
        {'id': 'settings', 'name': 'Settings', 'recommended': True},
    ],
    'advertiser': [
        {'id': 'dashboard', 'name': 'Dashboard', 'recommended': False},
        {'id': 'notes', 'name': 'Notes', 'recommended': False},
        {'id': 'team', 'name': 'Team', 'recommended': True},
        {'id': 'brands', 'name': 'Brands', 'recommended': True},
        {'id': 'jobs', 'name': 'Jobs', 'recommended': False},
        {'id': 'settings', 'name': 'Settings', 'recommended': True},
    ],
}

# Default protected panels for each role
DEFAULT_PROTECTED_PANELS = {
    'tutor': ['settings', 'packages', 'requests', 'earnings-investments'],
    'student': ['settings', 'credentials', 'earnings-investments'],
    'parent': ['settings', 'my-children', 'co-parents'],
    'advertiser': ['settings', 'team', 'brands'],
}


class ProtectedPanelsUpdateRequest(BaseModel):
    """Request to update protected panels"""
    panels: list[str]


@router.get("/protected-panels")
async def get_protected_panels(
    role: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get protected panels configuration for a role.
    Returns available panels with their protection status.
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Use provided role if valid, otherwise fall back to token role
    if role and role in ROLE_PROFILE_MAP:
        if role not in (user.roles or []):
            raise HTTPException(status_code=403, detail=f"User does not have {role} role")
        target_role = role
    else:
        target_role = get_current_role(current_user)

    if target_role not in AVAILABLE_PANELS:
        raise HTTPException(status_code=400, detail=f"Invalid role: {target_role}")

    profile = get_role_profile(db, current_user, target_role)

    # Get currently protected panels from profile or use defaults
    if profile and hasattr(profile, 'two_factor_protected_panels') and profile.two_factor_protected_panels:
        protected_panels = profile.two_factor_protected_panels
    else:
        protected_panels = DEFAULT_PROTECTED_PANELS.get(target_role, [])

    # Build response with protection status for each panel
    panels_with_status = []
    for panel in AVAILABLE_PANELS[target_role]:
        panels_with_status.append({
            'id': panel['id'],
            'name': panel['name'],
            'recommended': panel['recommended'],
            'protected': panel['id'] in protected_panels
        })

    return {
        "success": True,
        "role": target_role,
        "two_factor_enabled": getattr(profile, 'two_factor_enabled', False) if profile else False,
        "panels": panels_with_status,
        "protected_panels": protected_panels
    }


@router.put("/protected-panels")
async def update_protected_panels(
    request: ProtectedPanelsUpdateRequest,
    role: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update which panels are protected by 2FA for a role.
    Only valid panel IDs for the role will be accepted.
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Use provided role if valid, otherwise fall back to token role
    if role and role in ROLE_PROFILE_MAP:
        if role not in (user.roles or []):
            raise HTTPException(status_code=403, detail=f"User does not have {role} role")
        target_role = role
    else:
        target_role = get_current_role(current_user)

    if target_role not in AVAILABLE_PANELS:
        raise HTTPException(status_code=400, detail=f"Invalid role: {target_role}")

    profile = get_role_profile(db, current_user, target_role)

    if not profile:
        raise HTTPException(
            status_code=400,
            detail=f"No {target_role} profile found. Please complete your profile first."
        )

    # Validate panel IDs
    valid_panel_ids = [p['id'] for p in AVAILABLE_PANELS[target_role]]
    invalid_panels = [p for p in request.panels if p not in valid_panel_ids]

    if invalid_panels:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid panel IDs for {target_role} role: {', '.join(invalid_panels)}"
        )

    # Update protected panels
    profile.two_factor_protected_panels = request.panels
    db.commit()

    return {
        "success": True,
        "message": f"Protected panels updated for {target_role} role",
        "role": target_role,
        "protected_panels": request.panels
    }


@router.post("/protected-panels/reset")
async def reset_protected_panels(
    role: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reset protected panels to default recommended panels for a role.
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Use provided role if valid, otherwise fall back to token role
    if role and role in ROLE_PROFILE_MAP:
        if role not in (user.roles or []):
            raise HTTPException(status_code=403, detail=f"User does not have {role} role")
        target_role = role
    else:
        target_role = get_current_role(current_user)

    if target_role not in DEFAULT_PROTECTED_PANELS:
        raise HTTPException(status_code=400, detail=f"Invalid role: {target_role}")

    profile = get_role_profile(db, current_user, target_role)

    if not profile:
        raise HTTPException(
            status_code=400,
            detail=f"No {target_role} profile found. Please complete your profile first."
        )

    # Reset to defaults
    default_panels = DEFAULT_PROTECTED_PANELS[target_role]
    profile.two_factor_protected_panels = default_panels
    db.commit()

    return {
        "success": True,
        "message": f"Protected panels reset to defaults for {target_role} role",
        "role": target_role,
        "protected_panels": default_panels
    }


class PasswordVerifyRequest(BaseModel):
    """Request to verify password"""
    password: str


@router.post("/verify-password")
async def verify_password_endpoint(
    request: PasswordVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verify user's password. Used for accessing protected settings like panel configuration.
    Works with either login password or 2FA in-app password (if set).
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # First try 2FA in-app password if enabled
    role = get_current_role(current_user)
    profile = get_role_profile(db, current_user, role)

    if profile and getattr(profile, 'two_factor_enabled', False) and profile.two_factor_method == 'inapp':
        if profile.two_factor_inapp_password:
            # User has separate 2FA password
            if verify_password(request.password, profile.two_factor_inapp_password):
                return {"success": True, "verified": True}
            # Also accept login password
            if user.password_hash and verify_password(request.password, user.password_hash):
                return {"success": True, "verified": True}
            raise HTTPException(status_code=401, detail="Invalid password")

    # Verify against login password
    if not user.password_hash:
        raise HTTPException(
            status_code=400,
            detail="Password verification not available for OAuth accounts without password"
        )

    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")

    return {"success": True, "verified": True}


@router.get("/is-panel-protected/{panel_id}")
async def is_panel_protected(
    panel_id: str,
    role: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if a specific panel is protected by 2FA for the current role.
    Used by frontend to determine if verification is needed before accessing a panel.
    """
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Use provided role if valid, otherwise fall back to token role
    if role and role in ROLE_PROFILE_MAP:
        if role not in (user.roles or []):
            raise HTTPException(status_code=403, detail=f"User does not have {role} role")
        target_role = role
    else:
        target_role = get_current_role(current_user)

    profile = get_role_profile(db, current_user, target_role)

    # If 2FA is not enabled, panel is not protected
    if not profile or not getattr(profile, 'two_factor_enabled', False):
        return {
            "panel_id": panel_id,
            "role": target_role,
            "is_protected": False,
            "two_factor_enabled": False,
            "requires_verification": False
        }

    # Get protected panels (use getattr for safety since column may not be in model yet)
    protected_panels = getattr(profile, 'two_factor_protected_panels', None) or DEFAULT_PROTECTED_PANELS.get(target_role, [])
    is_protected = panel_id in protected_panels

    return {
        "panel_id": panel_id,
        "role": target_role,
        "is_protected": is_protected,
        "two_factor_enabled": True,
        "requires_verification": is_protected
    }


print("[OK] TFA Endpoints (Role-Based): Loaded")
