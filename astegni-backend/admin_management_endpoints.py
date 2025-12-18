"""
Admin Management Endpoints - UPDATED FOR NEW STRUCTURE
Handles admin user creation, role management with department-based architecture

NEW STRUCTURE:
- admin_profile: ONE row per admin (unique email)
- departments array: Tracks which departments admin belongs to
- manage_*_profile tables: Department-specific data and stats
"""

from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from datetime import datetime, timedelta
import secrets
import string
from pydantic import BaseModel, EmailStr
import psycopg
from dotenv import load_dotenv
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from utils import hash_password, create_access_token

load_dotenv()
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', 30))

# Use ADMIN_DATABASE_URL for admin tables (astegni_admin_db)
ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

def get_db_connection():
    """Get admin database connection (astegni_admin_db)"""
    database_url = ADMIN_DATABASE_URL
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "")

    auth, host_db = database_url.split("@")
    user, password = auth.split(":")
    host_port, db_full = host_db.split("/")
    db_name = db_full.split("?")[0] if "?" in db_full else db_full
    host, port = host_port.split(":") if ":" in host_port else (host_port, "5432")

    return psycopg.connect(dbname=db_name, user=user, password=password, host=host, port=port)

# ============================================
# PYDANTIC MODELS
# ============================================

class AdminInviteRequest(BaseModel):
    first_name: str
    father_name: str
    grandfather_name: Optional[str] = ""
    email: EmailStr
    phone_number: Optional[str] = ""
    employee_id: Optional[str] = ""
    department: str  # e.g., "manage-admins"
    position: str  # e.g., "Manager", "Staff"
    welcome_message: Optional[str] = None

class AdminRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    otp_code: str
    department: str
    first_name: Optional[str] = None
    father_name: Optional[str] = None
    grandfather_name: Optional[str] = ""

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str

class AddDepartmentRequest(BaseModel):
    department: str
    position: str = "Staff"

# ============================================
# ROUTER
# ============================================

router = APIRouter()

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    import random
    return str(random.randint(100000, 999999))

def save_otp_to_table(cursor, admin_id: int, contact: str, otp_code: str, purpose: str, expires_at: datetime):
    """Save OTP to otps table in admin database"""
    # First, mark any existing unused OTPs for this contact and purpose as used
    cursor.execute("""
        UPDATE otps SET is_used = TRUE
        WHERE contact = %s AND purpose = %s AND is_used = FALSE
    """, (contact, purpose))

    # Insert new OTP with is_otp_verified = FALSE
    cursor.execute("""
        INSERT INTO otps (user_id, contact, otp_code, purpose, expires_at, is_used, is_otp_verified, created_at)
        VALUES (%s, %s, %s, %s, %s, FALSE, FALSE, %s)
    """, (admin_id, contact, otp_code, purpose, expires_at, datetime.now()))

def verify_otp_from_table(cursor, contact: str, otp_code: str, purpose: str):
    """Verify OTP from otps table. Returns OTP id if valid, raises HTTPException if invalid."""
    cursor.execute("""
        SELECT id, expires_at FROM otps
        WHERE contact = %s AND otp_code = %s AND purpose = %s AND is_used = FALSE
        ORDER BY created_at DESC LIMIT 1
    """, (contact, otp_code, purpose))

    otp_record = cursor.fetchone()
    if not otp_record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP code")

    otp_id, expires_at = otp_record

    if expires_at and datetime.now() > expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP has expired")

    # Mark OTP as used and verified
    cursor.execute("UPDATE otps SET is_used = TRUE, is_otp_verified = TRUE WHERE id = %s", (otp_id,))

    return otp_id

def get_latest_otp_time(cursor, contact: str, purpose: str):
    """Get the creation time of the latest OTP for rate limiting"""
    cursor.execute("""
        SELECT created_at FROM otps
        WHERE contact = %s AND purpose = %s
        ORDER BY created_at DESC LIMIT 1
    """, (contact, purpose))
    result = cursor.fetchone()
    return result[0] if result else None

def get_department_table(department: str) -> str:
    """Map department name to table name"""
    return department.replace('-', '_') + '_profile'

# ============================================
# SEND OTP FOR ADMIN INVITATION
# ============================================

@router.post("/api/admin/send-otp")
async def send_admin_otp(request: AdminInviteRequest):
    """
    Send OTP for admin invitation (7-day expiration)

    NEW FLOW:
    1. Check if admin already exists with this email AND department
    2. Check if there's already a pending invitation for this email+department
    3. Save invitation to admin_invitations table (NOT admin_profile)
    4. Save OTP to otps table
    5. Send email with OTP

    Admin profile is only created when user verifies OTP and sets password.
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if admin already exists with this email (email is an array in admin_profile)
        cursor.execute("SELECT id, departments FROM admin_profile WHERE %s = ANY(email)", (request.email,))
        existing_admin = cursor.fetchone()

        if existing_admin:
            admin_id, current_departments = existing_admin

            # Check if already has this department
            if request.department in (current_departments or []):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Admin {request.email} already has access to {request.department} department"
                )

            # Admin exists but doesn't have this department - create invitation for new department
            # Don't modify admin_profile yet - wait for OTP verification

        # Check if there's already a pending invitation for this email+department
        cursor.execute("""
            SELECT id, position FROM admin_invitations
            WHERE email = %s AND department = %s AND status = 'pending'
        """, (request.email, request.department))

        existing_invitation = cursor.fetchone()
        if existing_invitation:
            invitation_id, existing_position = existing_invitation

            # Reject if exact same email + department + position
            if existing_position == request.position:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"An invitation already exists for {request.email} to {request.department} as {request.position}"
                )

            # Different position - update existing invitation with new position
            otp_code = generate_otp()
            expires_at = datetime.now() + timedelta(days=7)

            cursor.execute("""
                UPDATE admin_invitations SET
                    first_name = %s,
                    father_name = %s,
                    grandfather_name = %s,
                    phone_number = %s,
                    position = %s,
                    employee_id = %s,
                    welcome_message = %s,
                    expires_at = %s,
                    updated_at = %s,
                    status = 'pending'
                WHERE id = %s
            """, (
                request.first_name,
                request.father_name,
                request.grandfather_name or '',
                request.phone_number or '',
                request.position,
                request.employee_id or '',
                request.welcome_message or '',
                expires_at,
                datetime.now(),
                invitation_id
            ))

            # Save new OTP to otps table
            save_otp_to_table(cursor, invitation_id, request.email, otp_code, 'admin_invitation', expires_at)

            # Send OTP email
            try:
                from email_service import email_service
                email_service.send_admin_invitation_email(
                    to_email=request.email,
                    first_name=request.first_name,
                    department=request.department,
                    otp_code=otp_code
                )
            except Exception as e:
                print(f"Email failed: {e}")

            conn.commit()

            return {
                "success": True,
                "message": f"Invitation updated with new position ({request.position}). OTP sent to {request.email}",
                "invitation_id": invitation_id,
                "destination": "email",
                "expires_in": 604800,
                "otp": otp_code if os.getenv("ENVIRONMENT") == "development" else None
            }

        # Create new invitation
        otp_code = generate_otp()
        expires_at = datetime.now() + timedelta(days=7)

        cursor.execute("""
            INSERT INTO admin_invitations (
                first_name, father_name, grandfather_name,
                email, phone_number,
                department, position, employee_id,
                welcome_message,
                status,
                expires_at, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            request.first_name,
            request.father_name,
            request.grandfather_name or '',
            request.email,
            request.phone_number or '',
            request.department,
            request.position,
            request.employee_id or '',
            request.welcome_message or '',
            'pending',
            expires_at,
            datetime.now(),
            datetime.now()
        ))

        invitation_id = cursor.fetchone()[0]

        # Save OTP to otps table (use invitation_id as user_id for reference)
        save_otp_to_table(cursor, invitation_id, request.email, otp_code, 'admin_invitation', expires_at)

        # Send OTP email
        try:
            from email_service import email_service
            email_service.send_admin_invitation_email(
                to_email=request.email,
                first_name=request.first_name,
                department=request.department,
                otp_code=otp_code
            )
        except Exception as e:
            print(f"Email failed: {e}")

        conn.commit()

        return {
            "success": True,
            "message": f"OTP sent successfully to {request.email}",
            "invitation_id": invitation_id,
            "destination": "email",
            "expires_in": 604800,
            "otp": otp_code if os.getenv("ENVIRONMENT") == "development" else None
        }

    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Send OTP error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# ============================================
# REGISTER ADMIN (VERIFY OTP & SET PASSWORD)
# ============================================

@router.post("/api/admin/register")
async def register_admin(request: AdminRegisterRequest):
    """
    Complete admin registration by verifying OTP and setting password.

    NEW FLOW:
    1. Check if there's a pending invitation in admin_invitations
    2. Verify OTP from otps table
    3. Create admin_profile if doesn't exist, or update if exists
    4. Create department profile entry
    5. Update invitation status to 'accepted'
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Step 1: Find pending invitation for this email and department
        cursor.execute("""
            SELECT id, first_name, father_name, grandfather_name, phone_number,
                   department, position, employee_id, welcome_message
            FROM admin_invitations
            WHERE email = %s AND department = %s AND status = 'pending'
            ORDER BY created_at DESC LIMIT 1
        """, (request.email, request.department))

        invitation = cursor.fetchone()
        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No pending invitation found for this email and department"
            )

        (inv_id, inv_first_name, inv_father_name, inv_grandfather_name, inv_phone,
         inv_department, inv_position, inv_employee_id, inv_welcome_msg) = invitation

        # Step 2: Verify OTP from otps table
        verify_otp_from_table(cursor, request.email, request.otp_code, 'admin_invitation')

        # Use provided names or fall back to invitation names
        final_first_name = request.first_name if request.first_name else inv_first_name
        final_father_name = request.father_name if request.father_name else inv_father_name
        final_grandfather_name = request.grandfather_name if request.grandfather_name else (inv_grandfather_name or '')

        # Step 3: Check if admin_profile exists for this email
        cursor.execute("""
            SELECT id, departments, password_hash
            FROM admin_profile
            WHERE %s = ANY(email)
        """, (request.email,))

        existing_admin = cursor.fetchone()

        if existing_admin:
            # Admin exists - update with new department
            admin_id, current_departments, existing_password_hash = existing_admin

            # Use existing password if already set, otherwise hash new one
            new_password_hash = existing_password_hash if existing_password_hash else hash_password(request.password)

            # Add department if not already present
            updated_departments = current_departments or []
            if request.department not in updated_departments:
                updated_departments.append(request.department)

            cursor.execute("""
                UPDATE admin_profile
                SET password_hash = %s,
                    departments = %s,
                    first_name = %s,
                    father_name = %s,
                    grandfather_name = %s,
                    updated_at = %s
                WHERE id = %s
            """, (new_password_hash, updated_departments, final_first_name, final_father_name,
                  final_grandfather_name, datetime.now(), admin_id))
        else:
            # Create new admin_profile
            new_password_hash = hash_password(request.password)

            cursor.execute("""
                INSERT INTO admin_profile (
                    email, phone_number, password_hash,
                    first_name, father_name, grandfather_name,
                    departments, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                [request.email],  # email is an array
                [inv_phone] if inv_phone else [],  # phone_number is an array
                new_password_hash,
                final_first_name,
                final_father_name,
                final_grandfather_name,
                [request.department],  # departments array
                datetime.now(),
                datetime.now()
            ))
            admin_id = cursor.fetchone()[0]
            updated_departments = [request.department]

        # Step 4: Create department profile entry with position and joined_in
        dept_table = get_department_table(request.department)
        try:
            cursor.execute(f"""
                INSERT INTO {dept_table} (admin_id, position, joined_in, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (admin_id) DO UPDATE SET
                    position = EXCLUDED.position,
                    updated_at = EXCLUDED.updated_at
            """, (admin_id, inv_position or 'Staff', datetime.now(), datetime.now(), datetime.now()))
        except Exception as e:
            print(f"Department profile creation warning: {e}")

        # Step 5: Update invitation status to 'accepted'
        cursor.execute("""
            UPDATE admin_invitations
            SET status = 'accepted',
                admin_id = %s,
                accepted_at = %s,
                updated_at = %s
            WHERE id = %s
        """, (admin_id, datetime.now(), datetime.now(), inv_id))

        conn.commit()

        # Generate access token (30 minutes expiration)
        token_data = {
            "admin_id": admin_id,
            "email": request.email,
            "departments": updated_departments,
            "type": "admin"
        }
        access_token = create_access_token(
            token_data,
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        return {
            "success": True,
            "message": "Admin registration completed successfully",
            "admin_id": admin_id,
            "name": f"{final_first_name} {final_father_name}",
            "email": request.email,
            "departments": updated_departments,
            "access_token": access_token,
            "token_type": "bearer"
        }

    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# ============================================
# FORGOT PASSWORD
# ============================================

@router.post("/api/admin/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """
    Send OTP for password reset

    RATE LIMITING:
    - Only allows 1 OTP request per 2 minutes per email
    - Prevents email spam and abuse
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # email is now an array - check if admin exists with password set (meaning they've completed registration)
        cursor.execute("""
            SELECT id FROM admin_profile
            WHERE %s = ANY(email) AND password_hash IS NOT NULL
        """, (request.email,))

        admin = cursor.fetchone()
        if not admin:
            return {"success": True, "message": "If email exists, OTP has been sent"}

        admin_id = admin[0]

        # RATE LIMITING: Check if OTP was requested in the last 2 minutes
        last_otp_time = get_latest_otp_time(cursor, request.email, 'password_reset')
        if last_otp_time:
            time_since_last_request = datetime.now() - last_otp_time
            if time_since_last_request < timedelta(minutes=2):
                remaining_seconds = int((timedelta(minutes=2) - time_since_last_request).total_seconds())
                return {
                    "success": False,
                    "message": f"Please wait {remaining_seconds} seconds before requesting another OTP",
                    "retry_after": remaining_seconds
                }

        otp_code = generate_otp()
        expires_at = datetime.now() + timedelta(minutes=15)

        # Save OTP to otps table
        save_otp_to_table(cursor, admin_id, request.email, otp_code, 'password_reset', expires_at)

        conn.commit()

        # Send OTP email for password reset
        try:
            from email_service import email_service
            email_sent = email_service.send_otp_email(
                to_email=request.email,
                otp_code=otp_code,
                purpose="Admin Password Reset"
            )
            if email_sent:
                print(f"[FORGOT PASSWORD] OTP email sent successfully to {request.email}")
            else:
                print(f"[FORGOT PASSWORD] Email failed, but OTP stored in database")
        except Exception as e:
            print(f"[FORGOT PASSWORD] Email error: {e}")
            # Continue even if email fails - OTP is still in database

        return {
            "success": True,
            "message": "OTP sent successfully",
            "expires_in": 900,
            "otp": otp_code if os.getenv("ENVIRONMENT") == "development" else None
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# ============================================
# RESET PASSWORD
# ============================================

@router.post("/api/admin/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using OTP"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # email is now an array - check if admin exists with password set
        cursor.execute("""
            SELECT id FROM admin_profile
            WHERE %s = ANY(email) AND password_hash IS NOT NULL
        """, (request.email,))

        admin = cursor.fetchone()
        if not admin:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")

        admin_id = admin[0]

        # Verify OTP from otps table
        verify_otp_from_table(cursor, request.email, request.otp_code, 'password_reset')

        password_hash = hash_password(request.new_password)

        cursor.execute("""
            UPDATE admin_profile
            SET password_hash = %s, updated_at = %s
            WHERE id = %s
        """, (password_hash, datetime.now(), admin_id))

        conn.commit()

        return {
            "success": True,
            "message": "Password reset successfully",
            "email": request.email
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# ============================================
# ADD DEPARTMENT TO EXISTING ADMIN
# ============================================

@router.post("/api/admin/{admin_id}/add-department")
async def add_department(admin_id: int, request: AddDepartmentRequest):
    """Add a new department to an existing admin"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get current departments
        cursor.execute("SELECT departments FROM admin_profile WHERE id = %s", (admin_id,))
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")

        current_departments = result[0] or []

        if request.department in current_departments:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department already exists")

        # Add to departments array
        updated_departments = current_departments + [request.department]

        cursor.execute("""
            UPDATE admin_profile
            SET departments = %s, updated_at = %s
            WHERE id = %s
        """, (updated_departments, datetime.now(), admin_id))

        # Create department profile
        dept_table = get_department_table(request.department)
        cursor.execute(f"""
            INSERT INTO {dept_table} (admin_id, position, created_at)
            VALUES (%s, %s, %s)
            ON CONFLICT (admin_id) DO UPDATE SET position = EXCLUDED.position
        """, (admin_id, request.position, datetime.now()))

        conn.commit()

        return {
            "success": True,
            "message": f"Department {request.department} added successfully",
            "departments": updated_departments
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# ============================================
# REMOVE DEPARTMENT FROM ADMIN
# ============================================

@router.delete("/api/admin/{admin_id}/remove-department/{department}")
async def remove_department(admin_id: int, department: str):
    """Remove a department from an admin"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get current departments
        cursor.execute("SELECT departments FROM admin_profile WHERE id = %s", (admin_id,))
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")

        current_departments = result[0] or []

        if department not in current_departments:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department not found")

        # Remove from array
        updated_departments = [d for d in current_departments if d != department]

        cursor.execute("""
            UPDATE admin_profile
            SET departments = %s, updated_at = %s
            WHERE id = %s
        """, (updated_departments, datetime.now(), admin_id))

        # Delete department profile
        dept_table = get_department_table(department)
        cursor.execute(f"DELETE FROM {dept_table} WHERE admin_id = %s", (admin_id,))

        conn.commit()

        return {
            "success": True,
            "message": f"Department {department} removed successfully",
            "departments": updated_departments
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# ============================================
# LIST ADMINS
# ============================================

@router.get("/api/admin/list")
async def list_admins(department: Optional[str] = None, page: int = 1, limit: int = 20):
    """List all admins with optional department filtering"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # List admins who have completed registration (have password set)
        query = "SELECT * FROM admin_profile WHERE password_hash IS NOT NULL"
        params = []

        if department:
            query += " AND %s = ANY(departments)"
            params.append(department)

        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, (page - 1) * limit])

        cursor.execute(query, tuple(params))

        columns = [desc[0] for desc in cursor.description]
        admins = []

        for row in cursor.fetchall():
            admin_dict = dict(zip(columns, row))
            admin_dict.pop('password_hash', None)
            admins.append(admin_dict)

        # Count
        count_query = "SELECT COUNT(*) FROM admin_profile WHERE password_hash IS NOT NULL"
        count_params = []
        if department:
            count_query += " AND %s = ANY(departments)"
            count_params.append(department)

        cursor.execute(count_query, tuple(count_params))
        total = cursor.fetchone()[0]

        return {
            "admins": admins,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# ============================================
# REQUEST DEPARTMENT OTP (For add-department-modal)
# ============================================

class RequestDepartmentOTPRequest(BaseModel):
    email: EmailStr
    department: str
    phone_number: Optional[str] = None
    position: Optional[str] = "Staff"

@router.post("/api/admin/request-department-otp")
async def request_department_otp(request: RequestDepartmentOTPRequest):
    """
    Request OTP for adding a new department to an existing admin.

    REQUIRES a pending invitation in admin_invitations table.

    Checks:
    1. Admin exists with this email (logged in user)
    2. Pending invitation exists in admin_invitations matching email + department
    3. Admin doesn't already have this department
    4. Rate limiting (1 OTP per 2 minutes)
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Step 1: Check if admin exists with this email (the logged-in user)
        cursor.execute("""
            SELECT id, departments, first_name, father_name, phone_number
            FROM admin_profile
            WHERE %s = ANY(email) AND password_hash IS NOT NULL
        """, (request.email,))

        admin = cursor.fetchone()
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Admin not found. Please login again."
            )

        admin_id, current_departments, first_name, father_name, phone_numbers = admin

        # Step 2: Check if already has this department
        if request.department in (current_departments or []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You already have access to {request.department} department"
            )

        # Step 3: Check for pending invitation in admin_invitations
        # Must match: email + department (and optionally phone if provided in invitation)
        cursor.execute("""
            SELECT id, first_name, phone_number, position
            FROM admin_invitations
            WHERE email = %s AND department = %s AND status = 'pending'
            ORDER BY created_at DESC LIMIT 1
        """, (request.email, request.department))

        invitation = cursor.fetchone()
        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No pending invitation found for {request.department}. Please contact your administrator to invite you first."
            )

        inv_id, inv_first_name, inv_phone, inv_position = invitation

        # Optional: If invitation has phone number, verify it matches (if user provided one)
        if inv_phone and request.phone_number:
            # Normalize phone numbers for comparison (remove spaces, dashes)
            inv_phone_normalized = inv_phone.replace(" ", "").replace("-", "")
            req_phone_normalized = request.phone_number.replace(" ", "").replace("-", "")
            if inv_phone_normalized != req_phone_normalized:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number does not match the invitation"
                )

        # Step 4: RATE LIMITING - Check if OTP was requested in the last 2 minutes
        last_otp_time = get_latest_otp_time(cursor, request.email, 'add_department')
        if last_otp_time:
            time_since_last_request = datetime.now() - last_otp_time
            if time_since_last_request < timedelta(minutes=2):
                remaining_seconds = int((timedelta(minutes=2) - time_since_last_request).total_seconds())
                return {
                    "success": False,
                    "message": f"Please wait {remaining_seconds} seconds before requesting another OTP",
                    "retry_after": remaining_seconds
                }

        # Step 5: Generate OTP
        otp_code = generate_otp()
        expires_at = datetime.now() + timedelta(minutes=15)

        # Save OTP to otps table
        save_otp_to_table(cursor, admin_id, request.email, otp_code, 'add_department', expires_at)

        conn.commit()

        # Send OTP email
        try:
            from email_service import email_service
            email_service.send_otp_email(
                to_email=request.email,
                otp_code=otp_code,
                purpose=f"Add Department: {request.department}"
            )
        except Exception as e:
            print(f"Email failed: {e}")

        return {
            "success": True,
            "message": f"OTP sent to {request.email}",
            "expires_in": 900,
            "invitation_position": inv_position,  # Return position from invitation
            "otp": otp_code if os.getenv("ENVIRONMENT") == "development" else None
        }

    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# ============================================
# ADD DEPARTMENT WITH OTP VERIFICATION (For add-department-modal)
# ============================================

class AddDepartmentWithOTPRequest(BaseModel):
    email: EmailStr
    department: str
    position: str = "Staff"
    otp_code: str
    password: str

@router.post("/api/admin/add-department")
async def add_department_with_otp(request: AddDepartmentWithOTPRequest):
    """
    Add a new department to an existing admin after OTP verification.

    REQUIRES a pending invitation in admin_invitations table.

    Steps:
    1. Verify admin exists and password is correct
    2. Find pending invitation in admin_invitations
    3. Verify OTP
    4. Add department to admin_profile
    5. Create department profile entry (using position from invitation)
    6. DELETE the invitation from admin_invitations
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Step 1: Check if admin exists with this email
        cursor.execute("""
            SELECT id, departments, password_hash, first_name, father_name
            FROM admin_profile
            WHERE %s = ANY(email) AND password_hash IS NOT NULL
        """, (request.email,))

        admin = cursor.fetchone()
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Admin not found"
            )

        admin_id, current_departments, password_hash, first_name, father_name = admin

        # Verify password
        from utils import verify_password
        if not verify_password(request.password, password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password"
            )

        # Step 2: Check if already has this department
        if request.department in (current_departments or []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You already have access to {request.department} department"
            )

        # Step 3: Find pending invitation in admin_invitations
        cursor.execute("""
            SELECT id, position, employee_id
            FROM admin_invitations
            WHERE email = %s AND department = %s AND status = 'pending'
            ORDER BY created_at DESC LIMIT 1
        """, (request.email, request.department))

        invitation = cursor.fetchone()
        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No pending invitation found for {request.department}. Please contact your administrator."
            )

        inv_id, inv_position, inv_employee_id = invitation

        # Step 4: Verify OTP
        verify_otp_from_table(cursor, request.email, request.otp_code, 'add_department')

        # Step 5: Add department to admin_profile
        updated_departments = (current_departments or []) + [request.department]
        cursor.execute("""
            UPDATE admin_profile
            SET departments = %s, updated_at = %s
            WHERE id = %s
        """, (updated_departments, datetime.now(), admin_id))

        # Step 6: Create or update department profile entry (use position from invitation)
        dept_table = get_department_table(request.department)
        final_position = inv_position or request.position or 'Staff'
        try:
            # Check if profile already exists for this admin
            cursor.execute(f"SELECT id FROM {dept_table} WHERE admin_id = %s", (admin_id,))
            existing_profile = cursor.fetchone()

            if existing_profile:
                # Update existing profile
                cursor.execute(f"""
                    UPDATE {dept_table}
                    SET position = %s, employee_id = %s, updated_at = %s
                    WHERE admin_id = %s
                """, (final_position, inv_employee_id or '', datetime.now(), admin_id))
            else:
                # Insert new profile
                cursor.execute(f"""
                    INSERT INTO {dept_table} (admin_id, position, employee_id, joined_in, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (admin_id, final_position, inv_employee_id or '', datetime.now(), datetime.now(), datetime.now()))
        except Exception as e:
            print(f"Department profile creation warning: {e}")

        # Step 7: DELETE the invitation from admin_invitations (not just update status)
        cursor.execute("""
            DELETE FROM admin_invitations WHERE id = %s
        """, (inv_id,))

        conn.commit()

        return {
            "success": True,
            "message": f"Department {request.department} added successfully",
            "admin_id": admin_id,
            "departments": updated_departments,
            "position": final_position
        }

    except HTTPException:
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

# Export router
__all__ = ['router']
