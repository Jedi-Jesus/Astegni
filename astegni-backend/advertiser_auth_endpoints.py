"""
Advertiser Authentication Endpoints (self-contained, Stage 2).

Advertisers authenticate against astegni_advertiser_db ONLY — advertiser_profiles
is the advertiser "users" table (email + password_hash live on the row),
analogous to admin_profile in astegni_admin_db. No link to the shared users table.

Token shape mirrors admin: {"advertiser_id": <advertiser_profiles.id>, "email":
..., "type": "advertiser"}. advertiser_id is exactly the id every existing
campaign/brand/billing/team endpoint already consumes.

Stage 2 ships login + set-password + the OTP send/verify plumbing. Actually
INSERTing a brand-new users-less advertiser on verify-registration-otp is gated
behind ALLOW_NEW_REGISTRATION (flipped on in Stage 3, after the cross-feature
drop + orphan-cleanup fix).
"""

from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import timedelta, datetime, timezone
import psycopg
from dotenv import load_dotenv
import os
import jwt
import random
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from utils import verify_password, hash_password, create_access_token

load_dotenv()

ADVERTISER_DATABASE_URL = os.getenv(
    'ADVERTISER_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_advertiser_db'
)
SECRET_KEY = os.getenv('SECRET_KEY', 'your_secret_key_here')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', 30))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Gate: enable creating brand-new (users-less) advertisers at registration.
# Enabled in Stage 3 now that the prerequisites are in place (cross-features
# dropped, account-deletion re-keyed off user_id, orphan-cleanup no longer sweeps
# users-less advertisers). Can be force-disabled by setting the env var to "false".
ALLOW_NEW_REGISTRATION = os.getenv("ADVERTISER_ALLOW_NEW_REGISTRATION", "true").lower() == "true"

router = APIRouter(prefix="/api/advertiser", tags=["Advertiser Auth"])


def _libpq(url: str) -> str:
    return url.replace("postgresql+psycopg://", "postgresql://")


def get_connection():
    """Connection to astegni_advertiser_db."""
    return psycopg.connect(_libpq(ADVERTISER_DATABASE_URL))


# ============================================
# PYDANTIC MODELS
# ============================================

class AdvertiserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class SendOtpRequest(BaseModel):
    email: EmailStr

class VerifyRegistrationRequest(BaseModel):
    email: EmailStr
    otp_code: str
    password: str
    first_name: Optional[str] = None
    father_name: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None

class SetPasswordRequest(BaseModel):
    email: EmailStr
    otp_code: str
    password: str


# ============================================
# OTP HELPERS (advertiser-DB otps table)
# ============================================

def save_otp(cursor, contact: str, otp_code: str, purpose: str, expires_at):
    cursor.execute(
        "UPDATE otps SET is_used = TRUE WHERE contact = %s AND purpose = %s AND is_used = FALSE",
        (contact, purpose),
    )
    cursor.execute(
        """INSERT INTO otps (user_id, contact, otp_code, purpose, expires_at, is_used, created_at)
           VALUES (NULL, %s, %s, %s, %s, FALSE, %s)""",
        (contact, otp_code, purpose, expires_at, datetime.now(timezone.utc)),
    )

def verify_otp(cursor, contact: str, otp_code: str, purpose: str):
    cursor.execute(
        """SELECT id, expires_at FROM otps
           WHERE contact = %s AND otp_code = %s AND purpose = %s AND is_used = FALSE
           ORDER BY created_at DESC LIMIT 1""",
        (contact, otp_code, purpose),
    )
    rec = cursor.fetchone()
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    otp_id, expires_at = rec
    if expires_at and datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    cursor.execute("UPDATE otps SET is_used = TRUE WHERE id = %s", (otp_id,))
    return True

def _send_otp_email(to_email: str, otp_code: str, purpose: str) -> bool:
    try:
        from email_service import email_service
        return bool(email_service.send_otp_email(to_email=to_email, otp_code=otp_code, purpose=purpose))
    except Exception as e:
        print(f"[advertiser-auth] OTP email send failed: {e}")
        return False


# ============================================
# AUTH DEPENDENCY
# ============================================

def get_current_advertiser(authorization: str = Header(None, alias="Authorization")):
    """FastAPI dependency: resolve the current advertiser from an advertiser JWT."""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(
            status_code=401, detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if payload.get("type") != "advertiser":
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    advertiser_id = payload.get("advertiser_id")
    if not advertiser_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return {"id": advertiser_id, "email": payload.get("email"), "type": "advertiser"}


class _AdvertiserActor:
    """Drop-in stand-in for the user object the legacy advertiser-portal handlers
    expect. They read `current_user.role_ids['advertiser']` (advertiser_profiles.id)
    and occasionally `.id` / `.email`. Exposing the same attributes lets those
    handlers switch to advertiser-token auth with no body changes."""
    def __init__(self, advertiser_id: int, email=None, user_id=None):
        self.role_ids = {'advertiser': advertiser_id}
        self.id = user_id            # None for users-less advertisers
        self.email = email
        self.current_role = 'advertiser'
        self.profile_type = 'advertiser'
        self.profile_id = advertiser_id


def resolve_advertiser(authorization: str = Header(None, alias="Authorization")):
    """Dual-accept dependency for advertiser-portal endpoints.

    Accepts EITHER a new advertiser token (type='advertiser' -> advertiser_id is
    advertiser_profiles.id) OR a legacy user token (sub -> users.id, resolve the
    advertiser_profiles row by user_id). Returns an object exposing
    `.role_ids['advertiser']`, so existing handlers need no body changes.

    The legacy user-token branch is a transition fallback; it is removed in Stage 3.
    """
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(
            status_code=401, detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    # New advertiser token.
    if payload.get("type") == "advertiser":
        adv_id = payload.get("advertiser_id")
        if not adv_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return _AdvertiserActor(adv_id, email=payload.get("email"))

    # Legacy user token: resolve advertiser_profiles by user_id (transition only).
    if payload.get("type") in ("admin",):
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    try:
        user_id = int(sub)
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token payload")
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, email FROM advertiser_profiles WHERE user_id = %s AND is_active = TRUE",
            (user_id,),
        )
        row = cur.fetchone()
    finally:
        if conn:
            conn.close()
    if not row:
        raise HTTPException(status_code=403, detail="This account has no advertiser profile")
    return _AdvertiserActor(row[0], email=row[1], user_id=user_id)


def _issue_token(advertiser_id: int, email: str) -> str:
    return create_access_token(
        {"advertiser_id": advertiser_id, "email": email, "type": "advertiser"},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )


# ============================================
# ENDPOINTS
# ============================================

@router.post("/login")
async def advertiser_login(request: AdvertiserLoginRequest):
    """Authenticate an advertiser against advertiser_profiles."""
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """SELECT id, email, password_hash, has_password, first_name, father_name, company_name
               FROM advertiser_profiles
               WHERE LOWER(email) = LOWER(%s) AND is_active = TRUE""",
            (request.email,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        adv_id, email, password_hash, has_password, first_name, father_name, company_name = row

        if not has_password or not password_hash:
            raise HTTPException(
                status_code=403,
                detail="This advertiser account has no password set. Use 'set a password' to continue.",
            )
        if not verify_password(request.password, password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        cur.execute("UPDATE advertiser_profiles SET last_login = NOW() WHERE id = %s", (adv_id,))
        conn.commit()

        name = " ".join(p for p in [first_name, father_name] if p).strip() or (company_name or email)
        return {
            "success": True,
            "message": "Login successful",
            "advertiser_id": adv_id,
            "email": email,
            "name": name,
            "company_name": company_name,
            "access_token": _issue_token(adv_id, email),
            "token_type": "bearer",
        }
    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")
    finally:
        if conn:
            conn.close()


@router.post("/send-registration-otp")
async def send_registration_otp(request: SendOtpRequest):
    """Send an OTP to verify a NEW advertiser email before registration."""
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT id FROM advertiser_profiles WHERE LOWER(email) = LOWER(%s)",
            (request.email,),
        )
        if cur.fetchone():
            raise HTTPException(
                status_code=400,
                detail="An advertiser account with this email already exists. Please log in.",
            )

        otp_code = str(random.randint(100000, 999999))
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        save_otp(cur, request.email, otp_code, 'advertiser_registration', expires_at)
        conn.commit()

        sent = _send_otp_email(request.email, otp_code, "advertiser_registration")
        resp = {"success": True, "message": f"OTP sent to {request.email}", "email_sent": sent}
        if not sent or ENVIRONMENT == "development":
            resp["otp_code"] = otp_code  # dev convenience / fallback
        return resp
    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")
    finally:
        if conn:
            conn.close()


@router.post("/verify-registration-otp")
async def verify_registration_otp(request: VerifyRegistrationRequest):
    """Verify the OTP and create a new (users-less) advertiser account.

    Gated by ALLOW_NEW_REGISTRATION until Stage 3 (cross-feature drop +
    orphan-cleanup fix) is live."""
    if not ALLOW_NEW_REGISTRATION:
        raise HTTPException(
            status_code=403,
            detail="New advertiser registration is not enabled yet.",
        )
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        verify_otp(cur, request.email, request.otp_code, 'advertiser_registration')

        # Guard against a race: email must still be free.
        cur.execute("SELECT id FROM advertiser_profiles WHERE LOWER(email) = LOWER(%s)", (request.email,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered.")

        cur.execute(
            """INSERT INTO advertiser_profiles
                   (user_id, email, password_hash, has_password, email_verified,
                    first_name, father_name, phone, company_name, is_active, joined_in)
               VALUES (NULL, %s, %s, TRUE, TRUE, %s, %s, %s, %s, TRUE, CURRENT_DATE)
               RETURNING id""",
            (request.email, hash_password(request.password), request.first_name,
             request.father_name, request.phone, request.company_name),
        )
        adv_id = cur.fetchone()[0]
        conn.commit()

        name = " ".join(p for p in [request.first_name, request.father_name] if p).strip() \
            or (request.company_name or request.email)
        return {
            "success": True,
            "message": "Advertiser account created",
            "advertiser_id": adv_id,
            "email": request.email,
            "name": name,
            "company_name": request.company_name,
            "access_token": _issue_token(adv_id, request.email),
            "token_type": "bearer",
        }
    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
    finally:
        if conn:
            conn.close()


@router.post("/send-password-otp")
async def send_password_otp(request: SendOtpRequest):
    """Send an OTP to an EXISTING advertiser email (for set/reset password)."""
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id FROM advertiser_profiles WHERE LOWER(email) = LOWER(%s)", (request.email,))
        if not cur.fetchone():
            # Don't reveal whether the email exists.
            return {"success": True, "message": f"If that account exists, an OTP was sent to {request.email}."}

        otp_code = str(random.randint(100000, 999999))
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        save_otp(cur, request.email, otp_code, 'advertiser_set_password', expires_at)
        conn.commit()

        sent = _send_otp_email(request.email, otp_code, "advertiser_set_password")
        resp = {"success": True, "message": f"OTP sent to {request.email}", "email_sent": sent}
        if not sent or ENVIRONMENT == "development":
            resp["otp_code"] = otp_code
        return resp
    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")
    finally:
        if conn:
            conn.close()


@router.post("/set-password")
async def set_password(request: SetPasswordRequest):
    """Set/reset an advertiser password after OTP verification (e.g. OAuth-only accounts)."""
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        verify_otp(cur, request.email, request.otp_code, 'advertiser_set_password')

        cur.execute(
            """UPDATE advertiser_profiles
               SET password_hash = %s, has_password = TRUE, email_verified = TRUE
               WHERE LOWER(email) = LOWER(%s)
               RETURNING id, email""",
            (hash_password(request.password), request.email),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Advertiser account not found")
        adv_id, email = row
        conn.commit()
        return {
            "success": True,
            "message": "Password set successfully",
            "advertiser_id": adv_id,
            "email": email,
            "access_token": _issue_token(adv_id, email),
            "token_type": "bearer",
        }
    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to set password: {str(e)}")
    finally:
        if conn:
            conn.close()


@router.get("/auth/me")
async def advertiser_me(adv=Depends(get_current_advertiser)):
    """Return the current advertiser's basic profile (validates the advertiser token).

    Path is /auth/me (not /me) to avoid being shadowed by the legacy
    GET /api/advertiser/{advertiser_id} route in routes.py, which is registered
    first and would capture 'me' as an id."""
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """SELECT id, email, first_name, father_name, company_name, last_login
               FROM advertiser_profiles WHERE id = %s""",
            (adv["id"],),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Advertiser not found")
        adv_id, email, first_name, father_name, company_name, last_login = row
        name = " ".join(p for p in [first_name, father_name] if p).strip() or (company_name or email)
        return {
            "advertiser_id": adv_id, "email": email, "name": name,
            "company_name": company_name,
            "last_login": str(last_login) if last_login else None,
        }
    finally:
        if conn:
            conn.close()
