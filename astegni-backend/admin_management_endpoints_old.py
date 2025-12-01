"""
Admin Management Endpoints
Handles admin user creation, role management, suspension, and access control
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime, timedelta
import secrets
import string
from pydantic import BaseModel, EmailStr

# Import from app.py modules
import sys
import os
import psycopg
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils import hash_password, verify_password, create_access_token

load_dotenv()

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")

    # Parse the URL
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "")

    auth, host_db = database_url.split("@")
    user, password = auth.split(":")
    host_port, db_full = host_db.split("/")

    # Remove query parameters (like ?sslmode=disable)
    if "?" in db_full:
        db_name = db_full.split("?")[0]
    else:
        db_name = db_full

    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"

    # Connect
    return psycopg.connect(
        dbname=db_name,
        user=user,
        password=password,
        host=host,
        port=port
    )

# Pydantic models for admin management
class AdminInviteRequest(BaseModel):
    first_name: str
    father_name: str
    grandfather_name: Optional[str] = ""
    email: EmailStr
    phone_number: Optional[str] = ""
    employee_id: Optional[str] = ""
    department: str
    position: str
    welcome_message: Optional[str] = None

class AdminRoleUpdate(BaseModel):
    department: str
    position: str

class AdminSuspendRequest(BaseModel):
    reason: str
    duration_days: Optional[int] = None  # None for permanent

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

class AdminResponse(BaseModel):
    id: int
    first_name: str
    father_name: str
    grandfather_name: Optional[str]
    email: str
    phone_number: Optional[str]
    employee_id: Optional[str]
    department: str
    position: str
    status: str
    created_at: datetime
    last_login: Optional[datetime]
    suspended_until: Optional[datetime]
    suspension_reason: Optional[str]

# Create router
router = APIRouter()

def generate_temp_password(length: int = 12) -> str:
    """Generate a secure temporary password"""
    alphabet = string.ascii_letters + string.digits + string.punctuation
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    import random
    return str(random.randint(100000, 999999))

@router.post("/api/admin/send-otp")
async def send_admin_otp(request: AdminInviteRequest):
    """Send OTP for admin invitation (7-day expiration)"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if admin with same email AND department already exists
        # Allow same person to have multiple admin roles in different departments
        cursor.execute("""
            SELECT id FROM admin_profile
            WHERE email = %s AND department = %s
        """, (request.email, request.department))

        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Admin with email {request.email} already has a role in {request.department} department"
            )

        # Generate OTP
        otp_code = generate_otp()

        # Set expiration to 7 days from now
        expires_at = datetime.now() + timedelta(days=7)

        # Store invitation data temporarily (we'll use a new table or JSON field)
        # For now, create a pending admin profile with OTP

        # Generate employee_id if not provided
        employee_id = request.employee_id
        if not employee_id:
            dept_code = request.department.replace('manage-', '').replace('-', '')[:4].upper()
            cursor.execute("SELECT COUNT(*) FROM admin_profile")
            count = cursor.fetchone()[0]
            employee_id = f"ASTEG-{dept_code}-{str(count + 1).zfill(4)}"

        # Store admin profile with OTP and expiration
        # Note: password_hash is NULL until OTP is verified and admin sets password
        cursor.execute("""
            INSERT INTO admin_profile (
                first_name, father_name, grandfather_name, email, phone_number,
                department, position, otp_code, otp_expires_at, is_otp_verified, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            request.first_name,
            request.father_name,
            request.grandfather_name or '',
            request.email,
            request.phone_number or '',
            request.department,
            request.position,
            otp_code,  # Store OTP in plain text (temporary, until verified)
            expires_at,  # Expiration timestamp
            False,  # Not verified yet
            datetime.now()
        ))

        admin_id = cursor.fetchone()[0]

        # Import email service to send admin invitation
        try:
            sys.path.append(os.path.dirname(os.path.abspath(__file__)))
            from email_service import email_service

            # Send admin invitation email with welcome message
            email_sent = email_service.send_admin_invitation_email(
                to_email=request.email,
                first_name=request.first_name,
                department=request.department,
                otp_code=otp_code
            )
        except Exception as email_error:
            print(f"Email sending failed: {email_error}")
            email_sent = False

        conn.commit()

        # In development, include OTP in response
        include_otp = not email_sent or os.getenv("ENVIRONMENT", "development") == "development"

        return {
            "success": True,
            "message": f"OTP sent successfully to {request.email}",
            "admin_id": admin_id,
            "employee_id": employee_id,
            "destination": "email",
            "destination_value": f"{request.email[:3]}***{request.email[-5:]}",
            "expires_in": 604800,  # 7 days in seconds
            "expires_at": expires_at.isoformat(),
            "otp": otp_code if include_otp else None  # Include in dev mode
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.post("/api/admin/register")
async def register_admin(request: AdminRegisterRequest):
    """Complete admin registration by verifying OTP and setting password"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Find admin with matching email, department, and OTP
        cursor.execute("""
            SELECT id, first_name, father_name, otp_code, otp_expires_at, is_otp_verified
            FROM admin_profile
            WHERE email = %s AND department = %s
        """, (request.email, request.department))

        admin = cursor.fetchone()
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No pending invitation found for {request.email} in {request.department} department"
            )

        admin_id, first_name, father_name, stored_otp, otp_expires_at, is_verified = admin

        # Check if already verified
        if is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This admin account is already activated. Please login instead."
            )

        # Verify OTP
        if stored_otp != request.otp_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP code"
            )

        # Check expiration
        if otp_expires_at and datetime.now() > otp_expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has expired. Please request a new invitation."
            )

        # Hash the password
        password_hash = hash_password(request.password)

        # Update admin profile: set password, mark as verified, clear OTP
        cursor.execute("""
            UPDATE admin_profile
            SET password_hash = %s,
                is_otp_verified = TRUE,
                otp_code = NULL,
                otp_expires_at = NULL,
                updated_at = %s
            WHERE id = %s
        """, (password_hash, datetime.now(), admin_id))

        conn.commit()

        # Generate access token
        token_data = {
            "admin_id": admin_id,
            "email": request.email,
            "department": request.department,
            "type": "admin"
        }
        access_token = create_access_token(token_data)

        return {
            "success": True,
            "message": "Admin registration completed successfully",
            "admin_id": admin_id,
            "name": f"{first_name} {father_name}",
            "email": request.email,
            "department": request.department,
            "access_token": access_token,
            "token_type": "bearer"
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.post("/api/admin/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send OTP for password reset"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Find admin by email
        cursor.execute("""
            SELECT id, first_name, department FROM admin_profile
            WHERE email = %s AND is_otp_verified = TRUE
        """, (request.email,))

        admin = cursor.fetchone()
        if not admin:
            # Don't reveal if email exists or not (security)
            return {
                "success": True,
                "message": "If this email exists, an OTP has been sent for password reset"
            }

        admin_id, first_name, department = admin

        # Generate OTP for password reset
        otp_code = generate_otp()
        expires_at = datetime.now() + timedelta(minutes=15)  # 15 minutes for password reset

        # Store OTP for password reset
        cursor.execute("""
            UPDATE admin_profile
            SET otp_code = %s, otp_expires_at = %s, updated_at = %s
            WHERE id = %s
        """, (otp_code, expires_at, datetime.now(), admin_id))

        conn.commit()

        # Send OTP via email
        try:
            sys.path.append(os.path.dirname(os.path.abspath(__file__)))
            from email_service import email_service

            email_sent = email_service.send_otp_email(
                to_email=request.email,
                otp_code=otp_code,
                purpose="password_reset"
            )
        except Exception as email_error:
            print(f"Email sending failed: {email_error}")
            email_sent = False

        # In development, include OTP
        include_otp = not email_sent or os.getenv("ENVIRONMENT", "development") == "development"

        return {
            "success": True,
            "message": "OTP sent successfully for password reset",
            "destination": "email",
            "expires_in": 900,  # 15 minutes
            "otp": otp_code if include_otp else None
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.post("/api/admin/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using OTP"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Find admin with matching email and OTP
        cursor.execute("""
            SELECT id, otp_code, otp_expires_at FROM admin_profile
            WHERE email = %s AND is_otp_verified = TRUE
        """, (request.email,))

        admin = cursor.fetchone()
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Admin not found"
            )

        admin_id, stored_otp, otp_expires_at = admin

        # Verify OTP
        if not stored_otp or stored_otp != request.otp_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP code"
            )

        # Check expiration
        if otp_expires_at and datetime.now() > otp_expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP has expired. Please request a new password reset."
            )

        # Hash new password
        password_hash = hash_password(request.new_password)

        # Update password and clear OTP
        cursor.execute("""
            UPDATE admin_profile
            SET password_hash = %s,
                otp_code = NULL,
                otp_expires_at = NULL,
                updated_at = %s
            WHERE id = %s
        """, (password_hash, datetime.now(), admin_id))

        conn.commit()

        return {
            "success": True,
            "message": "Password reset successfully. You can now login with your new password.",
            "email": request.email
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.post("/api/admin/invite")
async def invite_admin(request: AdminInviteRequest):
    """Invite a new admin user"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if admin with this email already exists
        cursor.execute("""
            SELECT id FROM admin_profile WHERE email = %s
        """, (request.email,))

        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin with this email already exists"
            )

        # Generate temporary password
        temp_password = generate_temp_password()
        password_hash = hash_password(temp_password)

        # Build full name from Ethiopian naming convention
        full_name = f"{request.first_name} {request.father_name}"
        if request.grandfather_name:
            full_name += f" {request.grandfather_name}"

        # Generate employee_id if not provided
        employee_id = request.employee_id
        if not employee_id:
            # Generate format: ASTEG-DEPT-XXXX
            dept_code = request.department.replace('manage-', '').replace('-', '')[:4].upper()
            cursor.execute("SELECT COUNT(*) FROM admin_profile")
            count = cursor.fetchone()[0]
            employee_id = f"ASTEG-{dept_code}-{str(count + 1).zfill(4)}"

        # Create admin profile
        cursor.execute("""
            INSERT INTO admin_profile (
                first_name, father_name, grandfather_name, email, phone_number,
                department, position, password_hash, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            request.first_name,
            request.father_name,
            request.grandfather_name or '',
            request.email,
            request.phone_number or '',
            request.department,
            request.position,
            password_hash,
            datetime.now()
        ))

        admin_id = cursor.fetchone()[0]

        # TODO: Send invitation email with temp password and welcome message
        # For now, we'll return it in the response (remove in production)

        conn.commit()

        return {
            "success": True,
            "message": "Admin invited successfully",
            "admin_id": admin_id,
            "employee_id": employee_id,
            "temp_password": temp_password,  # Remove in production
            "email": request.email
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.put("/api/admin/{admin_id}/role")
async def update_admin_role(admin_id: int, request: AdminRoleUpdate):
    """Update an admin's department and position"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if admin exists
        cursor.execute("""
            SELECT id FROM admin_profile WHERE id = %s
        """, (admin_id,))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Admin not found"
            )

        # Update department and position
        cursor.execute("""
            UPDATE admin_profile
            SET department = %s, position = %s, updated_at = %s
            WHERE id = %s
        """, (request.department, request.position, datetime.now(), admin_id))

        conn.commit()

        return {
            "success": True,
            "message": "Admin department and position updated successfully",
            "admin_id": admin_id,
            "new_department": request.department,
            "new_position": request.position
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.post("/api/admin/{admin_id}/suspend")
async def suspend_admin(admin_id: int, request: AdminSuspendRequest):
    """Suspend an admin account"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if admin exists
        cursor.execute("""
            SELECT id FROM admin_profile WHERE id = %s
        """, (admin_id,))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Admin not found"
            )

        # Note: admin_profile table doesn't have status/suspension fields
        # This functionality would need additional columns
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Suspension functionality not implemented for current schema"
        )

        conn.commit()

        return {
            "success": True,
            "message": "Admin suspended successfully",
            "admin_id": admin_id,
            "suspended_until": suspended_until.isoformat() if suspended_until else "Permanent",
            "reason": request.reason
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.post("/api/admin/{admin_id}/reactivate")
async def reactivate_admin(admin_id: int):
    """Reactivate a suspended admin account"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if admin exists
        cursor.execute("""
            SELECT id FROM admin_profile WHERE id = %s
        """, (admin_id,))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Admin not found"
            )

        # Note: admin_profile table doesn't have status/suspension fields
        # This functionality would need additional columns
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Reactivation functionality not implemented for current schema"
        )

        conn.commit()

        return {
            "success": True,
            "message": "Admin reactivated successfully",
            "admin_id": admin_id
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.delete("/api/admin/{admin_id}/revoke")
async def revoke_admin_access(admin_id: int):
    """Permanently revoke an admin's access"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if admin exists
        cursor.execute("""
            SELECT id FROM admin_profile WHERE id = %s
        """, (admin_id,))

        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Admin not found"
            )

        # Delete the admin (or you could add a status field to mark as revoked)
        cursor.execute("""
            DELETE FROM admin_profile WHERE id = %s
        """, (admin_id,))

        conn.commit()

        return {
            "success": True,
            "message": "Admin access revoked successfully",
            "admin_id": admin_id
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.get("/api/admin/list")
async def list_admins(
    status: Optional[str] = None,
    department: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """List all admins with optional filtering"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Build query (note: status field doesn't exist in current schema)
        query = "SELECT * FROM admin_profile WHERE 1=1"
        params = []

        if department:
            query += " AND department = %s"
            params.append(department)

        query += " ORDER BY created_at DESC"
        query += " LIMIT %s OFFSET %s"
        params.extend([limit, (page - 1) * limit])

        cursor.execute(query, params)

        columns = [desc[0] for desc in cursor.description]
        admins = []

        for row in cursor.fetchall():
            admin_dict = dict(zip(columns, row))
            # Remove password hash from response
            admin_dict.pop('password_hash', None)
            admins.append(admin_dict)

        # Get total count
        count_query = "SELECT COUNT(*) FROM admin_profile WHERE 1=1"
        count_params = []

        if department:
            count_query += " AND department = %s"
            count_params.append(department)

        cursor.execute(count_query, count_params)
        total = cursor.fetchone()[0]

        return {
            "admins": admins,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.post("/api/admin/invitation/resend")
async def resend_invitation(email: EmailStr):
    """Resend invitation email to an admin"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if admin exists
        cursor.execute("""
            SELECT id, first_name, father_name FROM admin_profile WHERE email = %s
        """, (email,))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Admin not found"
            )

        # Generate new temp password
        temp_password = generate_temp_password()
        password_hash = hash_password(temp_password)

        # Update password
        cursor.execute("""
            UPDATE admin_profile
            SET password_hash = %s, updated_at = %s
            WHERE email = %s
        """, (password_hash, datetime.now(), email))

        conn.commit()

        # TODO: Send invitation email with new temp password

        return {
            "success": True,
            "message": "Invitation resent successfully",
            "email": email,
            "temp_password": temp_password  # Remove in production
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.post("/api/admin/invitation/cancel")
async def cancel_invitation(email: EmailStr):
    """Cancel a pending admin invitation"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if admin exists
        cursor.execute("""
            SELECT id FROM admin_profile WHERE email = %s
        """, (email,))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Admin not found"
            )

        # Delete the invitation
        cursor.execute("""
            DELETE FROM admin_profile WHERE email = %s
        """, (email,))

        conn.commit()

        return {
            "success": True,
            "message": "Invitation cancelled successfully",
            "email": email
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        if conn:
            cursor.close()
            conn.close()

# Export router
__all__ = ['router']