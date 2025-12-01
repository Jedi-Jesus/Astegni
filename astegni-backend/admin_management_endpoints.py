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

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")
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
    department: str  # e.g., "manage-campaigns"
    position: str  # e.g., "Manager", "Staff"
    welcome_message: Optional[str] = None

class AdminRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    otp_code: str
    department: str

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

    NEW BEHAVIOR:
    - If email doesn't exist: Create new admin + add to department + create department profile
    - If email exists: Check if they already have this department
    - Department profile is created IMMEDIATELY with employee_id and joined_in timestamp
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if admin already exists
        cursor.execute("SELECT id, departments FROM admin_profile WHERE email = %s", (request.email,))
        existing_admin = cursor.fetchone()

        if existing_admin:
            admin_id, current_departments = existing_admin

            # Check if already has this department
            if request.department in (current_departments or []):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Admin {request.email} already has access to {request.department} department"
                )

            # Admin exists but doesn't have this department
            # Add department to array and create department profile
            updated_departments = (current_departments or []) + [request.department]

            otp_code = generate_otp()
            expires_at = datetime.now() + timedelta(days=7)
            joined_in = datetime.now()

            # Update admin profile with new department
            cursor.execute("""
                UPDATE admin_profile
                SET departments = %s, otp_code = %s, otp_expires_at = %s, updated_at = %s
                WHERE id = %s
            """, (updated_departments, otp_code, expires_at, datetime.now(), admin_id))

            # Create department profile entry immediately
            dept_table = get_department_table(request.department)
            try:
                cursor.execute(f"""
                    INSERT INTO {dept_table} (admin_id, employee_id, position, joined_in, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (admin_id) DO UPDATE SET
                        employee_id = EXCLUDED.employee_id,
                        position = EXCLUDED.position,
                        joined_in = EXCLUDED.joined_in
                """, (admin_id, request.employee_id or '', request.position, joined_in, datetime.now()))
            except Exception as e:
                print(f"Department profile creation error: {e}")
                # Continue anyway - profile can be created later

            conn.commit()

            return {
                "success": True,
                "message": f"OTP sent to add {request.department} department to existing admin",
                "admin_id": admin_id,
                "employee_id": request.employee_id or '',
                "destination": "email",
                "expires_in": 604800,
                "otp": otp_code if os.getenv("ENVIRONMENT") == "development" else None
            }

        # New admin - create profile
        otp_code = generate_otp()
        expires_at = datetime.now() + timedelta(days=7)
        joined_in = datetime.now()

        cursor.execute("""
            INSERT INTO admin_profile (
                first_name, father_name, grandfather_name, email, phone_number,
                departments, otp_code, otp_expires_at, is_otp_verified, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            request.first_name,
            request.father_name,
            request.grandfather_name or '',
            request.email,
            request.phone_number or '',
            [request.department],  # Initial department array
            otp_code,
            expires_at,
            False,
            datetime.now()
        ))

        admin_id = cursor.fetchone()[0]

        # Create department profile entry immediately
        dept_table = get_department_table(request.department)
        try:
            cursor.execute(f"""
                INSERT INTO {dept_table} (admin_id, employee_id, position, joined_in, created_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (admin_id) DO UPDATE SET
                    employee_id = EXCLUDED.employee_id,
                    position = EXCLUDED.position,
                    joined_in = EXCLUDED.joined_in
            """, (admin_id, request.employee_id or '', request.position, joined_in, datetime.now()))
        except Exception as e:
            print(f"Department profile creation error: {e}")
            # Continue anyway - profile can be created later

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
            "admin_id": admin_id,
            "employee_id": request.employee_id or '',
            "destination": "email",
            "expires_in": 604800,
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
# REGISTER ADMIN (VERIFY OTP & SET PASSWORD)
# ============================================

@router.post("/api/admin/register")
async def register_admin(request: AdminRegisterRequest):
    """
    Complete admin registration by verifying OTP and setting password
    Also creates the department profile entry
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Find admin
        cursor.execute("""
            SELECT id, first_name, father_name, departments, otp_code, otp_expires_at, is_otp_verified, password_hash
            FROM admin_profile
            WHERE email = %s
        """, (request.email,))

        admin = cursor.fetchone()
        if not admin:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No invitation found")

        admin_id, first_name, father_name, departments, stored_otp, otp_expires_at, is_verified, password_hash = admin

        # Verify OTP
        if stored_otp != request.otp_code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP code")

        if otp_expires_at and datetime.now() > otp_expires_at:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP has expired")

        # Hash password (only if new admin)
        new_password_hash = hash_password(request.password) if not is_verified else password_hash

        # Check if department is already in departments array
        if request.department not in (departments or []):
            # Add department to array
            updated_departments = (departments or []) + [request.department]

            cursor.execute("""
                UPDATE admin_profile
                SET password_hash = %s,
                    is_otp_verified = TRUE,
                    departments = %s,
                    otp_code = NULL,
                    otp_expires_at = NULL,
                    updated_at = %s
                WHERE id = %s
            """, (new_password_hash, updated_departments, datetime.now(), admin_id))
        else:
            # Just clear OTP
            cursor.execute("""
                UPDATE admin_profile
                SET password_hash = %s,
                    is_otp_verified = TRUE,
                    otp_code = NULL,
                    otp_expires_at = NULL,
                    updated_at = %s
                WHERE id = %s
            """, (new_password_hash, datetime.now(), admin_id))

        # Create department profile entry
        dept_table = get_department_table(request.department)
        try:
            # Get position from original invite (stored somewhere or default to 'Staff')
            position = 'Staff'  # TODO: Retrieve from invite data

            cursor.execute(f"""
                INSERT INTO {dept_table} (admin_id, position, created_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (admin_id) DO NOTHING
            """, (admin_id, position, datetime.now()))
        except Exception as e:
            print(f"Department profile creation warning: {e}")

        conn.commit()

        # Generate access token (30 minutes expiration)
        token_data = {
            "admin_id": admin_id,
            "email": request.email,
            "departments": departments or [request.department],
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
            "name": f"{first_name} {father_name}",
            "email": request.email,
            "departments": departments or [request.department],
            "access_token": access_token,
            "token_type": "bearer"
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

        cursor.execute("""
            SELECT id, otp_expires_at FROM admin_profile
            WHERE email = %s AND is_otp_verified = TRUE
        """, (request.email,))

        admin = cursor.fetchone()
        if not admin:
            return {"success": True, "message": "If email exists, OTP has been sent"}

        admin_id, last_otp_expires_at = admin

        # RATE LIMITING: Check if OTP was requested in the last 2 minutes
        if last_otp_expires_at:
            # OTP expires in 15 minutes, so if it's still valid and was created recently, block
            time_since_last_request = datetime.now() - (last_otp_expires_at - timedelta(minutes=15))
            if time_since_last_request < timedelta(minutes=2):
                remaining_seconds = int((timedelta(minutes=2) - time_since_last_request).total_seconds())
                return {
                    "success": False,
                    "message": f"Please wait {remaining_seconds} seconds before requesting another OTP",
                    "retry_after": remaining_seconds
                }

        otp_code = generate_otp()
        expires_at = datetime.now() + timedelta(minutes=15)

        cursor.execute("""
            UPDATE admin_profile
            SET otp_code = %s, otp_expires_at = %s, updated_at = %s
            WHERE id = %s
        """, (otp_code, expires_at, datetime.now(), admin_id))

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

        cursor.execute("""
            SELECT id, otp_code, otp_expires_at FROM admin_profile
            WHERE email = %s AND is_otp_verified = TRUE
        """, (request.email,))

        admin = cursor.fetchone()
        if not admin:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")

        admin_id, stored_otp, otp_expires_at = admin

        if stored_otp != request.otp_code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")

        if otp_expires_at and datetime.now() > otp_expires_at:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired")

        password_hash = hash_password(request.new_password)

        cursor.execute("""
            UPDATE admin_profile
            SET password_hash = %s, otp_code = NULL, otp_expires_at = NULL, updated_at = %s
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
            ON CONFLICT (admin_id) DO NOTHING
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

        query = "SELECT * FROM admin_profile WHERE is_otp_verified = TRUE"
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
            admin_dict.pop('otp_code', None)
            admins.append(admin_dict)

        # Count
        count_query = "SELECT COUNT(*) FROM admin_profile WHERE is_otp_verified = TRUE"
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

# Export router
__all__ = ['router']
