"""
Account Deletion Endpoints
Handles the complete account deletion flow with 90-day grace period

COMPLETE ACCOUNT DELETION:
- Deletes ENTIRE user account from users table (CASCADE handles all profiles and related data)
- Requires OTP verification + password confirmation
- 90-day grace period before permanent deletion

Flow:
1. POST /api/account/delete/send-otp - Send OTP for account deletion
2. POST /api/account/delete/initiate - Start deletion process (validates OTP + password)
3. GET /api/account/delete/status - Check deletion status
4. POST /api/account/delete/cancel - Cancel pending deletion

On login:
- If account has pending deletion, automatically restore it
- Reset scheduled_deletion_at and mark request as cancelled
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
from dotenv import load_dotenv
import json
import bcrypt
import psycopg
import jwt
import os
import secrets
from email_service import email_service

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")
ALGORITHM = "HS256"

router = APIRouter(prefix="/api/account", tags=["Account Deletion"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ==================== DATABASE CONNECTION ====================

def get_db_connection():
    """Get database connection using psycopg"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=500, detail="Database URL not configured")
    return psycopg.connect(database_url)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")

        if user_id is None:
            raise credentials_exception

        # Convert to integer
        user_id = int(user_id)

        # Get user from database
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            cursor.execute("SELECT id, email, first_name, father_name FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()

            if not user:
                raise credentials_exception

            return {
                "id": user[0],
                "email": user[1],
                "first_name": user[2],
                "father_name": user[3]
            }
        finally:
            cursor.close()
            conn.close()

    except jwt.PyJWTError:
        raise credentials_exception

# Profile table mapping for each role
ROLE_PROFILE_TABLES = {
    "student": "student_profiles",
    "tutor": "tutor_profiles",
    "parent": "parent_profiles",
    "advertiser": "advertiser_profiles"
}

# ==================== SCHEMAS ====================

class DeletionSendOTPRequest(BaseModel):
    """Request body for sending OTP for account deletion"""
    pass  # Uses authenticated user's email

class DeletionInitiateRequest(BaseModel):
    """Request body for initiating account deletion"""
    otp_code: str  # 6-digit OTP code
    password: str  # User's password
    reasons: List[str]  # Array of reason codes: ["not_useful", "too_expensive", etc.]
    other_reason: Optional[str] = None  # Required if "other" is in reasons

class DeletionStatusResponse(BaseModel):
    """Response for deletion status check"""
    has_pending_deletion: bool
    role: Optional[str] = None  # Which role is being deleted
    delete_user: Optional[bool] = None  # Will user account be deleted too?
    status: Optional[str] = None
    requested_at: Optional[datetime] = None
    scheduled_deletion_at: Optional[datetime] = None
    days_remaining: Optional[int] = None
    reasons: Optional[List[str]] = None
    deletion_fee: Optional[float] = None

class DeletionReasonResponse(BaseModel):
    """Response for deletion reasons"""
    reason_code: str
    reason_label: str
    description: str

# ==================== HELPER FUNCTIONS ====================

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])

# ==================== ENDPOINTS ====================

@router.post("/delete/send-otp")
async def send_deletion_otp(current_user: dict = Depends(get_current_user)):
    """
    Send OTP to user's email for account deletion verification
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Generate 6-digit OTP
        otp_code = generate_otp()
        expires_at = datetime.now() + timedelta(minutes=5)  # 5-minute expiration

        print(f"[ACCOUNT DELETION] Generating OTP for user {current_user['id']}")
        print(f"[ACCOUNT DELETION] OTP Code: {otp_code}")
        print(f"[ACCOUNT DELETION] Expires at: {expires_at}")

        # Delete any existing deletion OTPs for this user
        cursor.execute("""
            DELETE FROM otps
            WHERE user_id = %s AND purpose = 'account_deletion'
        """, (current_user["id"],))
        deleted_count = cursor.rowcount
        print(f"[ACCOUNT DELETION] Deleted {deleted_count} old OTPs")

        # Store OTP in database
        cursor.execute("""
            INSERT INTO otps (user_id, otp_code, purpose, expires_at, is_used, created_at)
            VALUES (%s, %s, 'account_deletion', %s, FALSE, CURRENT_TIMESTAMP)
        """, (current_user["id"], otp_code, expires_at))
        print(f"[ACCOUNT DELETION] OTP inserted into database")

        conn.commit()
        print(f"[ACCOUNT DELETION] Transaction committed")

        # Send email with OTP code
        email_sent = email_service.send_otp_email(
            to_email=current_user["email"],
            otp_code=otp_code,
            purpose="Account Deletion Verification"
        )

        if not email_sent:
            print(f"[ACCOUNT DELETION] Failed to send email, but OTP stored in database")

        return {
            "success": True,
            "message": "OTP sent to your email" if email_sent else "OTP generated (check console in development)",
            "expires_in_minutes": 5,
            "email": current_user["email"],
            # DEVELOPMENT ONLY - Include OTP in response if email failed:
            "otp_code": otp_code if not email_sent else None
        }

    except Exception as e:
        conn.rollback()
        print(f"Error sending deletion OTP: {e}")
        raise HTTPException(status_code=500, detail="Failed to send OTP")
    finally:
        cursor.close()
        conn.close()


@router.post("/restore/send-otp")
async def send_restoration_otp(email: str):
    """
    Send OTP to user's email for account restoration verification
    This endpoint does NOT require authentication (user can't log in yet)
    Email is passed as form parameter
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Find user by email
        cursor.execute("""
            SELECT id, email, account_status
            FROM users
            WHERE email = %s
        """, (email,))

        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user_id, user_email, account_status = user

        if account_status != 'pending_deletion':
            raise HTTPException(status_code=400, detail="Account is not scheduled for deletion")

        # Generate 6-digit OTP
        otp_code = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=5)  # 5-minute expiration (UTC)

        print(f"[ACCOUNT RESTORATION] Generating OTP for user {user_id}")
        print(f"[ACCOUNT RESTORATION] OTP Code: {otp_code}")
        print(f"[ACCOUNT RESTORATION] Expires at (UTC): {expires_at}")

        # Delete any existing restoration OTPs for this user
        cursor.execute("""
            DELETE FROM otps
            WHERE user_id = %s AND purpose = 'account_restoration'
        """, (user_id,))
        deleted_count = cursor.rowcount
        print(f"[ACCOUNT RESTORATION] Deleted {deleted_count} old OTPs")

        # Store OTP in database
        cursor.execute("""
            INSERT INTO otps (user_id, otp_code, purpose, expires_at, is_used, created_at)
            VALUES (%s, %s, 'account_restoration', %s, FALSE, CURRENT_TIMESTAMP)
        """, (user_id, otp_code, expires_at))
        print(f"[ACCOUNT RESTORATION] OTP inserted into database")

        conn.commit()
        print(f"[ACCOUNT RESTORATION] Transaction committed")

        # Send email with OTP code
        email_sent = email_service.send_otp_email(
            to_email=user_email,
            otp_code=otp_code,
            purpose="Account Restoration Verification"
        )

        if not email_sent:
            print(f"[ACCOUNT RESTORATION] Failed to send email, but OTP stored in database")

        return {
            "success": True,
            "message": "OTP sent to your email" if email_sent else "OTP generated (check console in development)",
            "expires_in_minutes": 5,
            "email": user_email,
            # DEVELOPMENT ONLY - Include OTP in response if email failed:
            "otp_code": otp_code if not email_sent else None
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error sending restoration OTP: {e}")
        raise HTTPException(status_code=500, detail="Failed to send OTP")
    finally:
        cursor.close()
        conn.close()


@router.get("/delete/reasons")
async def get_deletion_reasons():
    """
    Get list of available deletion reasons for the UI
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT reason_code, reason_label, description
            FROM deletion_reasons
            WHERE is_active = TRUE
            ORDER BY display_order
        """)
        reasons = cursor.fetchall()

        return {
            "success": True,
            "reasons": [
                {
                    "reason_code": r[0],
                    "reason_label": r[1],
                    "description": r[2]
                }
                for r in reasons
            ]
        }
    finally:
        cursor.close()
        conn.close()


@router.get("/delete/status")
async def get_deletion_status(current_user: dict = Depends(get_current_user)):
    """
    Check if user has a pending account deletion request
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id, status, requested_at, scheduled_deletion_at, reasons, deletion_fee, role, delete_user
            FROM account_deletion_requests
            WHERE user_id = %s AND status = 'pending'
            ORDER BY requested_at DESC
            LIMIT 1
        """, (current_user["id"],))

        request = cursor.fetchone()

        if not request:
            return {
                "success": True,
                "has_pending_deletion": False
            }

        # Calculate days remaining
        scheduled_at = request[3]
        days_remaining = None
        if scheduled_at:
            days_remaining = (scheduled_at - datetime.now()).days
            if days_remaining < 0:
                days_remaining = 0

        return {
            "success": True,
            "has_pending_deletion": True,
            "status": request[1],
            "requested_at": request[2].isoformat() if request[2] else None,
            "scheduled_deletion_at": scheduled_at.isoformat() if scheduled_at else None,
            "days_remaining": days_remaining,
            "reasons": request[4] if request[4] else [],
            "deletion_fee": float(request[5]) if request[5] else 200.00,
            "role": request[6],
            "delete_user": request[7]
        }
    finally:
        cursor.close()
        conn.close()


@router.post("/delete/initiate")
async def initiate_account_deletion(
    request_data: DeletionInitiateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Initiate complete account deletion process

    COMPLETE ACCOUNT DELETION:
    - Deletes entire user account from users table
    - CASCADE handles deletion of all profiles and related data
    - Requires OTP verification + password confirmation
    - Creates deletion request with 90-day grace period
    - Records reasons for analytics
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Verify OTP
        print(f"[ACCOUNT DELETION] Verifying OTP for user {current_user['id']}")
        print(f"[ACCOUNT DELETION] Provided OTP: {request_data.otp_code}")

        cursor.execute("""
            SELECT otp_code, expires_at FROM otps
            WHERE user_id = %s AND purpose = 'account_deletion' AND (is_used = FALSE OR is_used IS NULL)
            ORDER BY created_at DESC
            LIMIT 1
        """, (current_user["id"],))

        otp_record = cursor.fetchone()

        if not otp_record:
            # Debug: Check all OTPs for this user
            cursor.execute("""
                SELECT purpose, otp_code, is_used, created_at FROM otps
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 5
            """, (current_user["id"],))
            all_otps = cursor.fetchall()
            print(f"[ACCOUNT DELETION] No account_deletion OTP found for user {current_user['id']}")
            print(f"[ACCOUNT DELETION] Recent OTPs for this user: {all_otps}")
            raise HTTPException(status_code=400, detail="No OTP found. Please request a new OTP.")

        stored_otp, expires_at = otp_record

        # Check if OTP is expired
        if datetime.now() > expires_at:
            raise HTTPException(status_code=400, detail="OTP has expired. Please request a new OTP.")

        # Verify OTP code
        if stored_otp != request_data.otp_code:
            raise HTTPException(status_code=401, detail="Invalid OTP code")

        # Mark OTP as used
        cursor.execute("""
            UPDATE otps
            SET is_used = TRUE
            WHERE user_id = %s AND purpose = 'account_deletion' AND otp_code = %s
        """, (current_user["id"], request_data.otp_code))

        # 2. Verify password
        cursor.execute("""
            SELECT password_hash FROM users WHERE id = %s
        """, (current_user["id"],))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="User not found")

        password_hash = result[0]

        # Check password
        if not bcrypt.checkpw(request_data.password.encode('utf-8'), password_hash.encode('utf-8')):
            raise HTTPException(status_code=401, detail="Incorrect password")

        # 3. Check if there's already a pending deletion request
        cursor.execute("""
            SELECT id FROM account_deletion_requests
            WHERE user_id = %s AND status = 'pending'
        """, (current_user["id"],))

        existing = cursor.fetchone()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="You already have a pending deletion request. Please wait or cancel it first."
            )

        # 4. Validate reasons
        if not request_data.reasons or len(request_data.reasons) == 0:
            raise HTTPException(status_code=400, detail="Please select at least one reason")

        if "other" in request_data.reasons and not request_data.other_reason:
            raise HTTPException(status_code=400, detail="Please specify the reason for 'Other'")

        # 5. Calculate scheduled deletion date (90 days from now)
        scheduled_deletion_at = datetime.now() + timedelta(days=90)

        # 6. Get client info
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")

        # 7. Create deletion request (COMPLETE ACCOUNT DELETION)
        cursor.execute("""
            INSERT INTO account_deletion_requests (
                user_id, status, reasons, other_reason, deletion_fee,
                requested_at, scheduled_deletion_at, ip_address, user_agent
            )
            VALUES (%s, 'pending', %s, %s, 200.00, CURRENT_TIMESTAMP, %s, %s, %s)
            RETURNING id, requested_at, scheduled_deletion_at
        """, (
            current_user["id"],
            json.dumps(request_data.reasons),
            request_data.other_reason,
            scheduled_deletion_at,
            ip_address,
            user_agent[:500] if user_agent else None
        ))

        new_request = cursor.fetchone()

        # 8. Deactivate entire user account
        cursor.execute("""
            UPDATE users
            SET account_status = 'pending_deletion',
                deactivated_at = CURRENT_TIMESTAMP,
                scheduled_deletion_at = %s,
                is_active = FALSE
            WHERE id = %s
        """, (scheduled_deletion_at, current_user["id"]))

        # 9. Update deletion reason stats (for analytics)
        current_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        for reason in request_data.reasons:
            cursor.execute("""
                INSERT INTO deletion_reason_stats (reason_code, month, count)
                VALUES (%s, %s, 1)
                ON CONFLICT (reason_code, month)
                DO UPDATE SET count = deletion_reason_stats.count + 1
            """, (reason, current_month))

        conn.commit()

        return {
            "success": True,
            "message": "Your account will be permanently deleted in 90 days",
            "deletion_request_id": new_request[0],
            "requested_at": new_request[1].isoformat(),
            "scheduled_deletion_at": new_request[2].isoformat(),
            "days_until_deletion": 90,
            "deletion_fee": 200.00,
            "can_restore": True,
            "restore_message": "You can restore your account by logging in within 90 days"
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error initiating account deletion: {e}")
        raise HTTPException(status_code=500, detail="Failed to initiate account deletion")
    finally:
        cursor.close()
        conn.close()


@router.post("/delete/cancel")
async def cancel_account_deletion(current_user: dict = Depends(get_current_user)):
    """
    Cancel a pending account deletion request

    - Restores account to active status
    - Marks deletion request as cancelled
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Find pending deletion request
        cursor.execute("""
            SELECT id FROM account_deletion_requests
            WHERE user_id = %s AND status = 'pending'
        """, (current_user["id"],))

        request = cursor.fetchone()
        if not request:
            raise HTTPException(status_code=404, detail="No pending deletion request found")

        request_id = request[0]

        # 2. Cancel the deletion request
        cursor.execute("""
            UPDATE account_deletion_requests
            SET status = 'cancelled',
                cancelled_at = CURRENT_TIMESTAMP,
                cancelled_by_login = FALSE,
                cancellation_reason = 'User manually cancelled'
            WHERE id = %s
        """, (request_id,))

        # 3. Restore user account
        cursor.execute("""
            UPDATE users
            SET account_status = 'active',
                deactivated_at = NULL,
                scheduled_deletion_at = NULL,
                is_active = TRUE
            WHERE id = %s
        """, (current_user["id"],))

        conn.commit()

        return {
            "success": True,
            "message": "Account deletion cancelled successfully",
            "account_restored": True
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error cancelling account deletion: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel account deletion")
    finally:
        cursor.close()
        conn.close()


# ==================== HELPER FUNCTION FOR LOGIN ====================

def restore_account_on_login(user_id: int, conn=None):
    """
    Called during login to check and restore accounts with pending deletion

    Returns: True if account was restored, False otherwise
    """
    should_close = False
    if conn is None:
        conn = get_db_connection()
        should_close = True

    cursor = conn.cursor()

    try:
        # Check if user has pending deletion
        cursor.execute("""
            SELECT id FROM account_deletion_requests
            WHERE user_id = %s AND status = 'pending'
        """, (user_id,))

        request = cursor.fetchone()
        if not request:
            return False

        request_id = request[0]

        # Cancel the deletion request
        cursor.execute("""
            UPDATE account_deletion_requests
            SET status = 'cancelled',
                cancelled_at = CURRENT_TIMESTAMP,
                cancelled_by_login = TRUE,
                cancellation_reason = 'User logged in during grace period'
            WHERE id = %s
        """, (request_id,))

        # Restore user account
        cursor.execute("""
            UPDATE users
            SET account_status = 'active',
                deactivated_at = NULL,
                scheduled_deletion_at = NULL,
                is_active = TRUE
            WHERE id = %s
        """, (user_id,))

        conn.commit()
        return True

    except Exception as e:
        conn.rollback()
        print(f"Error restoring account on login: {e}")
        return False
    finally:
        cursor.close()
        if should_close:
            conn.close()


# ==================== ADMIN/CRON FUNCTION ====================

def process_expired_deletions():
    """
    Called by cron job to permanently delete accounts past the 90-day grace period

    COMPLETE ACCOUNT DELETION:
    - Deletes entire user account from users table
    - CASCADE handles deletion of all profiles and related data

    This should be run daily to process expired deletion requests
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Find all pending deletions past their scheduled date
        cursor.execute("""
            SELECT adr.id, adr.user_id, u.email, u.first_name
            FROM account_deletion_requests adr
            JOIN users u ON adr.user_id = u.id
            WHERE adr.status = 'pending'
            AND adr.scheduled_deletion_at <= CURRENT_TIMESTAMP
        """)

        expired_requests = cursor.fetchall()
        deleted_count = 0

        for req in expired_requests:
            request_id, user_id, email, first_name = req

            try:
                # Mark deletion request as completed
                cursor.execute("""
                    UPDATE account_deletion_requests
                    SET status = 'completed',
                        completed_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (request_id,))

                # Permanently delete user (CASCADE will handle all related data)
                cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
                deleted_count += 1
                print(f"Permanently deleted user {user_id} ({email})")

            except Exception as e:
                print(f"Error deleting user {user_id}: {e}")
                continue

        conn.commit()
        print(f"Processed {deleted_count} account deletions")
        return deleted_count

    except Exception as e:
        conn.rollback()
        print(f"Error processing expired deletions: {e}")
        return 0
    finally:
        cursor.close()
        conn.close()


# ==================== ANALYTICS ENDPOINTS ====================

@router.get("/delete/stats")
async def get_deletion_stats(current_user: dict = Depends(get_current_user)):
    """
    Get deletion statistics (admin only)
    """
    # Check if user is admin
    if "admin" not in current_user.get("roles", []):
        raise HTTPException(status_code=403, detail="Admin access required")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get total counts by status
        cursor.execute("""
            SELECT status, COUNT(*) as count
            FROM account_deletion_requests
            GROUP BY status
        """)
        status_counts = {row[0]: row[1] for row in cursor.fetchall()}

        # Get reason breakdown
        cursor.execute("""
            SELECT reason_code, SUM(count) as total
            FROM deletion_reason_stats
            GROUP BY reason_code
            ORDER BY total DESC
        """)
        reason_stats = [{"reason": row[0], "count": row[1]} for row in cursor.fetchall()]

        # Get monthly trend
        cursor.execute("""
            SELECT month, SUM(count) as total
            FROM deletion_reason_stats
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        """)
        monthly_trend = [{"month": row[0].isoformat(), "count": row[1]} for row in cursor.fetchall()]

        return {
            "success": True,
            "status_counts": status_counts,
            "reason_breakdown": reason_stats,
            "monthly_trend": monthly_trend
        }
    finally:
        cursor.close()
        conn.close()
