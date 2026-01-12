"""
Account Deletion Endpoints
Handles the complete account deletion flow with 90-day grace period

ROLE-BASED DELETION:
- If user has multiple roles: Delete only the specific profile from role table
- If user has only one role: Delete both profile AND user from users table

Flow:
1. POST /api/account/delete/initiate - Start deletion process (validates password)
2. GET /api/account/delete/status - Check deletion status
3. POST /api/account/delete/cancel - Cancel pending deletion
4. POST /api/account/delete/reasons - Get deletion reasons for UI

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

class DeletionInitiateRequest(BaseModel):
    """Request body for initiating account deletion"""
    password: str
    role: str  # The role being deleted: "student", "tutor", "parent", "advertiser"
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

# ==================== ENDPOINTS ====================

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
    Initiate role-based account deletion process

    ROLE-BASED DELETION:
    - If user has multiple roles: Delete only the specific profile from role table
    - If user has only one role: Delete both profile AND user from users table

    - Validates password
    - Creates deletion request with 90-day grace period
    - Deactivates profile immediately (or user if only role)
    - Records reasons for analytics
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 0. Validate role
        role = request_data.role.lower()
        if role not in ROLE_PROFILE_TABLES:
            raise HTTPException(status_code=400, detail=f"Invalid role: {role}. Must be one of: student, tutor, parent, advertiser")

        profile_table = ROLE_PROFILE_TABLES[role]

        # 1. Verify password
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

        # 2. Check if user actually has this role/profile
        cursor.execute(f"""
            SELECT id FROM {profile_table} WHERE user_id = %s
        """, (current_user["id"],))

        profile = cursor.fetchone()
        if not profile:
            raise HTTPException(status_code=404, detail=f"You don't have a {role} profile to delete")

        profile_id = profile[0]

        # 3. Check if there's already a pending deletion request for this role
        cursor.execute("""
            SELECT id FROM account_deletion_requests
            WHERE user_id = %s AND role = %s AND status = 'pending'
        """, (current_user["id"], role))

        existing = cursor.fetchone()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"You already have a pending deletion request for your {role} profile. Please wait or cancel it first."
            )

        # 4. Count how many roles/profiles this user has
        role_count = 0
        for r, table in ROLE_PROFILE_TABLES.items():
            cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE user_id = %s", (current_user["id"],))
            count = cursor.fetchone()[0]
            if count > 0:
                role_count += 1

        # If this is the only role, we'll delete the user too
        delete_user = (role_count == 1)

        # 5. Validate reasons
        if not request_data.reasons or len(request_data.reasons) == 0:
            raise HTTPException(status_code=400, detail="Please select at least one reason")

        if "other" in request_data.reasons and not request_data.other_reason:
            raise HTTPException(status_code=400, detail="Please specify the reason for 'Other'")

        # 6. Calculate scheduled deletion date (90 days from now)
        scheduled_deletion_at = datetime.now() + timedelta(days=90)

        # 7. Get client info
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")

        # 8. Create deletion request with role info
        cursor.execute("""
            INSERT INTO account_deletion_requests (
                user_id, role, profile_id, delete_user, status, reasons, other_reason, deletion_fee,
                requested_at, scheduled_deletion_at, ip_address, user_agent
            )
            VALUES (%s, %s, %s, %s, 'pending', %s, %s, 200.00, CURRENT_TIMESTAMP, %s, %s, %s)
            RETURNING id, requested_at, scheduled_deletion_at
        """, (
            current_user["id"],
            role,
            profile_id,
            delete_user,
            json.dumps(request_data.reasons),
            request_data.other_reason,
            scheduled_deletion_at,
            ip_address,
            user_agent[:500] if user_agent else None
        ))

        new_request = cursor.fetchone()

        # 9. Remove role from users.roles array and update account status
        # First, get current roles
        cursor.execute("SELECT roles, active_role FROM users WHERE id = %s", (current_user["id"],))
        user_data = cursor.fetchone()
        current_roles = user_data[0] if user_data[0] else []
        current_active_role = user_data[1]

        # Remove the deleted role from the roles array
        if role in current_roles:
            updated_roles = [r for r in current_roles if r != role]
        else:
            updated_roles = current_roles

        # Determine new active role if the deleted role was the active one
        new_active_role = current_active_role
        if current_active_role == role:
            # Switch to another available role, or 'user' if none left
            if updated_roles:
                # Prefer these roles in order: student, tutor, parent, advertiser
                for preferred in ['student', 'tutor', 'parent', 'advertiser']:
                    if preferred in updated_roles:
                        new_active_role = preferred
                        break
                else:
                    new_active_role = updated_roles[0]  # Fallback to first available
            else:
                new_active_role = 'user'

        # 9a. Deactivate the profile in the role-specific table
        cursor.execute(f"""
            UPDATE {profile_table}
            SET is_active = FALSE
            WHERE id = %s
        """, (profile_id,))

        if delete_user:
            # Deleting the only role - deactivate entire account
            cursor.execute("""
                UPDATE users
                SET roles = %s,
                    active_role = %s,
                    account_status = 'pending_deletion',
                    deactivated_at = CURRENT_TIMESTAMP,
                    scheduled_deletion_at = %s,
                    is_active = FALSE
                WHERE id = %s
            """, (json.dumps(updated_roles), new_active_role, scheduled_deletion_at, current_user["id"]))
            deletion_message = f"Your {role} profile and user account will be permanently deleted in 90 days"
            restore_message = "You can restore your account by adding the role back within 90 days"
        else:
            # Remove role but keep account active for other roles
            cursor.execute("""
                UPDATE users
                SET roles = %s,
                    active_role = %s
                WHERE id = %s
            """, (json.dumps(updated_roles), new_active_role, current_user["id"]))
            deletion_message = f"Your {role} profile will be permanently deleted in 90 days. Your other profiles remain active."
            restore_message = f"You can restore your {role} profile by adding the role back within 90 days"

        # 10. Update deletion reason stats (for analytics)
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
            "message": deletion_message,
            "deletion_request_id": new_request[0],
            "role": role,
            "profile_id": profile_id,
            "delete_user": delete_user,
            "requested_at": new_request[1].isoformat(),
            "scheduled_deletion_at": new_request[2].isoformat(),
            "days_until_deletion": 90,
            "deletion_fee": 200.00,
            "can_restore": True,
            "restore_message": restore_message
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
    - Restores the role to users.roles array
    - Restores the profile is_active status
    - Marks deletion request as cancelled
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Find pending deletion request with role info
        cursor.execute("""
            SELECT id, role, profile_id, delete_user FROM account_deletion_requests
            WHERE user_id = %s AND status = 'pending'
        """, (current_user["id"],))

        request = cursor.fetchone()
        if not request:
            raise HTTPException(status_code=404, detail="No pending deletion request found")

        request_id, role, profile_id, delete_user = request

        # 2. Cancel the deletion request
        cursor.execute("""
            UPDATE account_deletion_requests
            SET status = 'cancelled',
                cancelled_at = CURRENT_TIMESTAMP,
                cancelled_by_login = FALSE,
                cancellation_reason = 'User manually cancelled'
            WHERE id = %s
        """, (request_id,))

        # 3. Restore the role to users.roles array
        cursor.execute("SELECT roles FROM users WHERE id = %s", (current_user["id"],))
        user_data = cursor.fetchone()
        current_roles = user_data[0] if user_data[0] else []

        # Add back the role if not already present
        if role and role not in current_roles:
            current_roles.append(role)

        # 4. Restore user account
        cursor.execute("""
            UPDATE users
            SET account_status = 'active',
                roles = %s,
                deactivated_at = NULL,
                scheduled_deletion_at = NULL,
                is_active = TRUE
            WHERE id = %s
        """, (json.dumps(current_roles), current_user["id"]))

        # 5. Restore profile is_active status
        if role and role in ROLE_PROFILE_TABLES and profile_id:
            profile_table = ROLE_PROFILE_TABLES[role]
            cursor.execute(f"""
                UPDATE {profile_table}
                SET is_active = TRUE
                WHERE id = %s
            """, (profile_id,))

        conn.commit()

        return {
            "success": True,
            "message": "Account deletion cancelled successfully",
            "account_restored": True,
            "role_restored": role
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
        # Check if user has pending deletion with role info
        cursor.execute("""
            SELECT id, role, profile_id FROM account_deletion_requests
            WHERE user_id = %s AND status = 'pending'
        """, (user_id,))

        request = cursor.fetchone()
        if not request:
            return False

        request_id, role, profile_id = request

        # Cancel the deletion request
        cursor.execute("""
            UPDATE account_deletion_requests
            SET status = 'cancelled',
                cancelled_at = CURRENT_TIMESTAMP,
                cancelled_by_login = TRUE,
                cancellation_reason = 'User logged in during grace period'
            WHERE id = %s
        """, (request_id,))

        # Restore the role to users.roles array
        cursor.execute("SELECT roles FROM users WHERE id = %s", (user_id,))
        user_data = cursor.fetchone()
        current_roles = user_data[0] if user_data[0] else []

        # Add back the role if not already present
        if role and role not in current_roles:
            current_roles.append(role)

        # Restore user account
        cursor.execute("""
            UPDATE users
            SET account_status = 'active',
                roles = %s,
                deactivated_at = NULL,
                scheduled_deletion_at = NULL,
                is_active = TRUE
            WHERE id = %s
        """, (json.dumps(current_roles), user_id,))

        # Restore profile is_active status
        if role and role in ROLE_PROFILE_TABLES and profile_id:
            profile_table = ROLE_PROFILE_TABLES[role]
            cursor.execute(f"""
                UPDATE {profile_table}
                SET is_active = TRUE
                WHERE id = %s
            """, (profile_id,))

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
    Called by cron job to permanently delete profiles/accounts past the 90-day grace period

    ROLE-BASED DELETION:
    - If delete_user=True: Delete from users table (CASCADE handles profiles)
    - If delete_user=False: Delete only the specific profile from role table

    This should be run daily to process expired deletion requests
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Find all pending deletions past their scheduled date
        cursor.execute("""
            SELECT adr.id, adr.user_id, adr.role, adr.profile_id, adr.delete_user, u.email, u.first_name
            FROM account_deletion_requests adr
            JOIN users u ON adr.user_id = u.id
            WHERE adr.status = 'pending'
            AND adr.scheduled_deletion_at <= CURRENT_TIMESTAMP
        """)

        expired_requests = cursor.fetchall()
        deleted_count = 0
        profile_deleted_count = 0

        for req in expired_requests:
            request_id, user_id, role, profile_id, delete_user, email, first_name = req

            try:
                # Mark deletion request as completed
                cursor.execute("""
                    UPDATE account_deletion_requests
                    SET status = 'completed',
                        completed_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (request_id,))

                if delete_user:
                    # Permanently delete user (CASCADE will handle related data)
                    cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
                    deleted_count += 1
                    print(f"Permanently deleted user {user_id} ({email})")
                else:
                    # Delete only the specific profile
                    if role and role in ROLE_PROFILE_TABLES:
                        profile_table = ROLE_PROFILE_TABLES[role]
                        cursor.execute(f"DELETE FROM {profile_table} WHERE id = %s", (profile_id,))
                        profile_deleted_count += 1
                        print(f"Permanently deleted {role} profile {profile_id} for user {user_id} ({email})")

            except Exception as e:
                print(f"Error deleting user/profile {user_id}: {e}")
                continue

        conn.commit()
        print(f"Processed {deleted_count} user deletions and {profile_deleted_count} profile deletions")
        return deleted_count + profile_deleted_count

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
