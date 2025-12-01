"""
Admin Authentication and Authorization Endpoints - UPDATED FOR NEW STRUCTURE
Handles department-based access control with departments array support

NEW STRUCTURE:
- admin_profile has departments array (TEXT[])
- Admin can have multiple departments
- Access control checks if department is in array
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import timedelta
import psycopg
from dotenv import load_dotenv
import os
import jwt
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from utils import verify_password, create_access_token

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
SECRET_KEY = os.getenv('SECRET_KEY', 'your_secret_key_here')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', 30))

router = APIRouter(prefix="/api/admin", tags=["Admin Auth"])

# ============================================
# DEPARTMENT-PAGE MAPPING
# ============================================

DEPARTMENT_ACCESS = {
    "manage-campaigns": ["manage-campaigns.html"],
    "manage-schools": ["manage-schools.html"],
    "manage-courses": ["manage-courses.html"],
    "manage-tutor-documents": ["manage-tutor-documents.html"],
    "manage-customers": ["manage-customers.html"],
    "manage-contents": ["manage-contents.html"],
    "manage-system-settings": [  # Full access
        "manage-campaigns.html",
        "manage-schools.html",
        "manage-courses.html",
        "manage-tutor-documents.html",
        "manage-customers.html",
        "manage-contents.html",
        "manage-system-settings.html"
    ]
}

# ============================================
# PYDANTIC MODELS
# ============================================

class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str

class AccessCheckRequest(BaseModel):
    page: str  # e.g., "manage-campaigns.html"

class AccessCheckResponse(BaseModel):
    has_access: bool
    departments: List[str]  # Changed from single department
    message: Optional[str] = None

# ============================================
# HELPER FUNCTIONS
# ============================================

def get_connection():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL)

def get_admin_id_from_token(authorization: str):
    """Extract admin_id from JWT token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        admin_id = payload.get("admin_id") or payload.get("sub")
        if not admin_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return admin_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_admin(authorization: str = Header(None, alias="Authorization")):
    """
    FastAPI dependency to get current admin from JWT token
    Use this in endpoints that require admin authentication
    """
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])

        # Check if this is an admin token
        if payload.get("type") != "admin":
            raise HTTPException(
                status_code=401,
                detail="Could not validate credentials"
            )

        admin_id = payload.get("admin_id")
        email = payload.get("email")
        departments = payload.get("departments", [])

        if not admin_id or not email:
            raise HTTPException(
                status_code=401,
                detail="Could not validate credentials"
            )

        # Return admin info as a dict (similar to User object structure)
        return {
            "id": admin_id,
            "email": email,
            "departments": departments,
            "roles": ["admin"]  # For compatibility with existing code
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )

# ============================================
# LOGIN ENDPOINT
# ============================================

@router.post("/login")
async def admin_login(request: AdminLoginRequest):
    """
    Admin login - returns access token with ALL departments
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Find admin by email
        cursor.execute("""
            SELECT id, first_name, father_name, email, password_hash, departments, is_otp_verified
            FROM admin_profile
            WHERE email = %s
        """, (request.email,))

        admin = cursor.fetchone()
        if not admin:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        admin_id, first_name, father_name, email, password_hash, departments, is_verified = admin

        # Check if verified
        if not is_verified:
            raise HTTPException(status_code=403, detail="Account not verified. Please complete registration first.")

        # Verify password
        if not password_hash or not verify_password(request.password, password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Update last_login
        from datetime import datetime
        cursor.execute("""
            UPDATE admin_profile SET last_login = %s WHERE id = %s
        """, (datetime.now(), admin_id))
        conn.commit()

        # Generate access token with ALL departments (30 minutes expiration)
        token_data = {
            "admin_id": admin_id,
            "email": email,
            "departments": departments or [],  # All departments in token
            "type": "admin"
        }
        access_token = create_access_token(
            token_data,
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        return {
            "success": True,
            "message": "Login successful",
            "admin_id": admin_id,
            "name": f"{first_name} {father_name}",
            "email": email,
            "departments": departments or [],  # Return all departments
            "access_token": access_token,
            "token_type": "bearer"
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            cursor.close()
            conn.close()

# ============================================
# ACCESS CHECK
# ============================================

@router.post("/check-access", response_model=AccessCheckResponse)
async def check_page_access(
    request: AccessCheckRequest,
    authorization: str = Header(None)
):
    """
    Check if admin has access to a specific page based on ANY of their departments
    """
    # Get admin_id from token
    admin_id = get_admin_id_from_token(authorization)

    # Get admin departments from database
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT departments FROM admin_profile WHERE id = %s",
            (admin_id,)
        )
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        departments = result[0] or []

        if not departments:
            return AccessCheckResponse(
                has_access=False,
                departments=[],
                message="No departments assigned to this admin"
            )

        # Check if ANY department has access to the requested page
        has_access = False
        for dept in departments:
            allowed_pages = DEPARTMENT_ACCESS.get(dept, [])
            if request.page in allowed_pages:
                has_access = True
                break

        if has_access:
            return AccessCheckResponse(
                has_access=True,
                departments=departments,
                message=f"Access granted to {request.page}"
            )
        else:
            return AccessCheckResponse(
                has_access=False,
                departments=departments,
                message=f"Access denied. None of your departments ({', '.join(departments)}) can access {request.page}"
            )

    finally:
        cursor.close()
        conn.close()

# ============================================
# GET ACCESSIBLE PAGES
# ============================================

@router.get("/my-accessible-pages")
async def get_accessible_pages(authorization: str = Header(None)):
    """
    Get list of ALL pages accessible to the current admin based on ALL their departments
    """
    # Get admin_id from token
    admin_id = get_admin_id_from_token(authorization)

    # Get admin departments from database
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT departments FROM admin_profile WHERE id = %s",
            (admin_id,)
        )
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        departments = result[0] or []

        # Collect all accessible pages from all departments
        all_pages = set()
        for dept in departments:
            allowed_pages = DEPARTMENT_ACCESS.get(dept, [])
            all_pages.update(allowed_pages)

        return {
            "departments": departments,
            "accessible_pages": list(all_pages),
            "is_super_admin": "manage-system-settings" in departments,
            "department_count": len(departments)
        }

    finally:
        cursor.close()
        conn.close()

# ============================================
# GET DEPARTMENT-SPECIFIC ACCESS
# ============================================

@router.get("/my-departments")
async def get_my_departments(authorization: str = Header(None)):
    """
    Get detailed information about all departments admin has access to
    """
    admin_id = get_admin_id_from_token(authorization)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT departments, first_name, father_name, email
            FROM admin_profile WHERE id = %s
        """, (admin_id,))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Admin not found")

        departments, first_name, father_name, email = result

        # Get detailed info for each department
        department_details = []
        for dept in (departments or []):
            dept_info = {
                "department": dept,
                "pages": DEPARTMENT_ACCESS.get(dept, []),
                "is_super_admin": dept == "manage-system-settings"
            }

            # Try to get position from department table
            try:
                dept_table = dept.replace('-', '_') + '_profile'
                cursor.execute(f"""
                    SELECT position FROM {dept_table} WHERE admin_id = %s
                """, (admin_id,))

                pos_result = cursor.fetchone()
                if pos_result:
                    dept_info["position"] = pos_result[0]
            except:
                pass

            department_details.append(dept_info)

        return {
            "admin_id": admin_id,
            "name": f"{first_name} {father_name}",
            "email": email,
            "departments": department_details,
            "total_departments": len(departments or [])
        }

    finally:
        cursor.close()
        conn.close()

# ============================================
# ADMIN EMAIL CHANGE OTP ENDPOINTS
# ============================================

@router.post("/send-otp-current-email")
async def send_otp_current_email(
    request: dict,
    authorization: str = Header(None)
):
    """
    Send OTP to current email for verification before allowing email change
    Step 1 of email change process
    """
    import random
    from datetime import datetime, timedelta

    current_email = request.get("current_email")

    if not current_email:
        raise HTTPException(status_code=400, detail="Current email is required")

    # Get admin_id from token
    admin_id = get_admin_id_from_token(authorization)

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Verify that current_email matches admin's actual email
        cursor.execute("""
            SELECT email FROM admin_profile WHERE id = %s
        """, (admin_id,))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Admin not found")

        actual_email = result[0]
        if actual_email != current_email:
            raise HTTPException(
                status_code=400,
                detail="Current email does not match your account email"
            )

        # Generate 6-digit OTP
        otp_code = str(random.randint(100000, 999999))

        # Set expiration (5 minutes from now)
        expires_at = datetime.now() + timedelta(minutes=5)

        # Store OTP in admin_profile table
        cursor.execute("""
            UPDATE admin_profile
            SET otp_code = %s, otp_expires_at = %s, updated_at = %s
            WHERE id = %s
        """, (otp_code, expires_at, datetime.now(), admin_id))

        conn.commit()

        # Send OTP email
        try:
            from email_service import email_service
            sent_successfully = email_service.send_otp_email(
                to_email=current_email,
                otp_code=otp_code,
                purpose="email_verification"
            )
        except Exception as e:
            print(f"Email send failed: {e}")
            sent_successfully = False

        # Include OTP in development mode or if sending failed
        include_otp = not sent_successfully or os.getenv("ENVIRONMENT", "development") == "development"

        return {
            "message": f"OTP sent successfully to {current_email}",
            "destination": "email",
            "destination_value": f"{current_email[:3]}***{current_email[-10:]}" if len(current_email) > 13 else "***",
            "expires_in": 300,  # 5 minutes in seconds
            "otp": otp_code if include_otp else None
        }

    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.post("/verify-otp-current-email")
async def verify_otp_current_email(
    request: dict,
    authorization: str = Header(None)
):
    """
    Verify OTP for current email
    Step 1 verification - must succeed before allowing new email entry
    """
    from datetime import datetime

    otp_code = request.get("otp_code")
    current_email = request.get("current_email")

    if not otp_code:
        raise HTTPException(status_code=400, detail="OTP code is required")
    if not current_email:
        raise HTTPException(status_code=400, detail="Current email is required")

    # Get admin_id from token
    admin_id = get_admin_id_from_token(authorization)

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Get stored OTP and check validity
        cursor.execute("""
            SELECT otp_code, otp_expires_at, email
            FROM admin_profile
            WHERE id = %s
        """, (admin_id,))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Admin not found")

        stored_otp, expires_at, email = result

        # Verify current email matches
        if email != current_email:
            raise HTTPException(status_code=400, detail="Email mismatch")

        # Check if OTP matches
        if stored_otp != otp_code:
            raise HTTPException(status_code=400, detail="Invalid OTP code")

        # Check if OTP has expired
        if expires_at and datetime.now() > expires_at:
            raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

        # OTP is valid - clear it so it can't be reused
        cursor.execute("""
            UPDATE admin_profile
            SET otp_code = NULL, otp_expires_at = NULL, updated_at = %s
            WHERE id = %s
        """, (datetime.now(), admin_id))

        conn.commit()

        return {
            "message": "Current email verified successfully",
            "verified": True,
            "current_email": current_email
        }

    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.post("/send-otp-email-change")
async def send_admin_email_change_otp(
    request: dict,
    authorization: str = Header(None)
):
    """
    Send OTP to new email address for admin email change verification
    """
    import random
    from datetime import datetime, timedelta

    new_email = request.get("new_email")

    if not new_email:
        raise HTTPException(status_code=400, detail="New email is required")

    # Get admin_id from token
    admin_id = get_admin_id_from_token(authorization)

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Check if email is already in use by another admin
        cursor.execute("""
            SELECT id FROM admin_profile
            WHERE email = %s AND id != %s
        """, (new_email, admin_id))

        existing_admin = cursor.fetchone()
        if existing_admin:
            raise HTTPException(
                status_code=400,
                detail="This email is already in use by another admin account"
            )

        # Generate 6-digit OTP
        otp_code = str(random.randint(100000, 999999))

        # Set expiration (5 minutes from now)
        expires_at = datetime.now() + timedelta(minutes=5)

        # Store OTP in admin_profile table
        cursor.execute("""
            UPDATE admin_profile
            SET otp_code = %s, otp_expires_at = %s, updated_at = %s
            WHERE id = %s
        """, (otp_code, expires_at, datetime.now(), admin_id))

        conn.commit()

        # Send OTP email
        try:
            from email_service import email_service
            sent_successfully = email_service.send_otp_email(
                to_email=new_email,
                otp_code=otp_code,
                purpose="email_change"
            )
        except Exception as e:
            print(f"Email send failed: {e}")
            sent_successfully = False

        # Include OTP in development mode or if sending failed
        include_otp = not sent_successfully or os.getenv("ENVIRONMENT", "development") == "development"

        return {
            "message": f"OTP sent successfully to {new_email}",
            "destination": "email",
            "destination_value": f"{new_email[:3]}***{new_email[-10:]}" if len(new_email) > 13 else "***",
            "expires_in": 300,  # 5 minutes in seconds
            "otp": otp_code if include_otp else None
        }

    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.post("/verify-otp-email-change")
async def verify_admin_email_change_otp(
    request: dict,
    authorization: str = Header(None)
):
    """
    Verify OTP for admin email change (doesn't update email yet, just verifies)
    """
    from datetime import datetime

    otp_code = request.get("otp_code")
    new_email = request.get("new_email")

    if not otp_code:
        raise HTTPException(status_code=400, detail="OTP code is required")
    if not new_email:
        raise HTTPException(status_code=400, detail="New email is required")

    # Get admin_id from token
    admin_id = get_admin_id_from_token(authorization)

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Get stored OTP and check validity
        cursor.execute("""
            SELECT otp_code, otp_expires_at
            FROM admin_profile
            WHERE id = %s
        """, (admin_id,))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Admin not found")

        stored_otp, expires_at = result

        # Check if OTP matches
        if stored_otp != otp_code:
            raise HTTPException(status_code=400, detail="Invalid OTP code")

        # Check if OTP has expired
        if expires_at and datetime.now() > expires_at:
            raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

        # OTP is valid - clear it so it can't be reused
        cursor.execute("""
            UPDATE admin_profile
            SET otp_code = NULL, otp_expires_at = NULL, updated_at = %s
            WHERE id = %s
        """, (datetime.now(), admin_id))

        conn.commit()

        return {
            "message": "OTP verified successfully",
            "verified": True,
            "new_email": new_email
        }

    except HTTPException:
        if conn:
            conn.rollback()
        raise
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()
