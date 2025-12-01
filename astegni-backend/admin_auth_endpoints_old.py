"""
Admin Authentication and Authorization Endpoints
Handles department-based access control for admin users
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import psycopg
from dotenv import load_dotenv
import os
import jwt

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
SECRET_KEY = os.getenv('SECRET_KEY', 'your_secret_key_here')

router = APIRouter(prefix="/api/admin", tags=["Admin Auth"])

# ============================================
# DEPARTMENT-PAGE MAPPING
# ============================================

DEPARTMENT_ACCESS = {
    "manage-campaigns": ["manage-campaigns.html"],
    "manage-schools": ["manage-schools.html"],
    "manage-courses": ["manage-courses.html"],
    "manage-tutors": ["manage-tutors.html"],
    "manage-customers": ["manage-customers.html"],
    "manage-contents": ["manage-contents.html"],
    "manage-system-settings": [  # Full access
        "manage-campaigns.html",
        "manage-schools.html",
        "manage-courses.html",
        "manage-tutors.html",
        "manage-customers.html",
        "manage-contents.html",
        "manage-system-settings.html"
    ]
}

# ============================================
# PYDANTIC MODELS
# ============================================

class AccessCheckRequest(BaseModel):
    page: str  # e.g., "manage-campaigns.html"

class AccessCheckResponse(BaseModel):
    has_access: bool
    department: str
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
        admin_id = payload.get("sub")
        if not admin_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return admin_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============================================
# ENDPOINTS
# ============================================

@router.post("/check-access", response_model=AccessCheckResponse)
async def check_page_access(
    request: AccessCheckRequest,
    authorization: str = Header(None)
):
    """
    Check if admin has access to a specific page based on their department
    """
    # Get admin_id from token
    admin_id = get_admin_id_from_token(authorization)

    # Get admin department from database
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT department FROM admin_profile WHERE admin_id = %s",
            (admin_id,)
        )
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        department = result[0]

        # Check if department has access to the requested page
        allowed_pages = DEPARTMENT_ACCESS.get(department, [])
        has_access = request.page in allowed_pages

        if has_access:
            return AccessCheckResponse(
                has_access=True,
                department=department,
                message=f"Access granted to {request.page}"
            )
        else:
            return AccessCheckResponse(
                has_access=False,
                department=department,
                message=f"Access denied. Your department ({department}) cannot access {request.page}"
            )

    finally:
        cursor.close()
        conn.close()

@router.get("/my-accessible-pages")
async def get_accessible_pages(authorization: str = Header(None)):
    """
    Get list of pages accessible to the current admin based on their department
    """
    # Get admin_id from token
    admin_id = get_admin_id_from_token(authorization)

    # Get admin department from database
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT department FROM admin_profile WHERE admin_id = %s",
            (admin_id,)
        )
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        department = result[0]
        allowed_pages = DEPARTMENT_ACCESS.get(department, [])

        return {
            "department": department,
            "accessible_pages": allowed_pages,
            "is_super_admin": department == "manage-system-settings"
        }

    finally:
        cursor.close()
        conn.close()
