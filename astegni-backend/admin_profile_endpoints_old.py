"""
Admin Profile Endpoints
Handles CRUD operations for admin_profile table
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import psycopg
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

router = APIRouter(prefix="/api/admin", tags=["Admin Profile"])

# ============================================
# PYDANTIC MODELS
# ============================================

class AdminProfileResponse(BaseModel):
    # Fields from admin_profile table
    id: int
    admin_id: int
    first_name: Optional[str]
    father_name: Optional[str]
    grandfather_name: Optional[str]
    admin_username: Optional[str]
    quote: Optional[str]
    bio: Optional[str]
    phone_number: Optional[str]
    email: Optional[str]
    department: Optional[str]
    profile_picture_url: Optional[str]
    cover_picture_url: Optional[str]
    # Fields from admin_profile_stats table
    employee_id: Optional[str]
    access_level: Optional[str]
    last_login: Optional[str]
    responsibilities: Optional[str]

class AdminProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    father_name: Optional[str] = None
    grandfather_name: Optional[str] = None
    admin_username: Optional[str] = None
    quote: Optional[str] = None
    bio: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None

# ============================================
# HELPER FUNCTIONS
# ============================================

def get_connection():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL)

# ============================================
# ENDPOINTS
# ============================================

@router.get("/profile")
async def get_admin_profile(admin_id: int = 1):
    """Get admin profile from admin_profile AND admin_profile_stats tables (JOINED)"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Join admin_profile with admin_profile_stats to get ALL fields
        # NOTE: location field doesn't exist - use department from admin_profile instead
        cursor.execute("""
            SELECT
                ap.id, ap.admin_id, ap.first_name, ap.father_name, ap.grandfather_name,
                ap.admin_username, ap.quote, ap.bio, ap.phone_number, ap.email,
                ap.department, ap.profile_picture_url, ap.cover_picture_url,
                aps.employee_id, aps.access_level, aps.last_login, aps.responsibilities
            FROM admin_profile ap
            LEFT JOIN admin_profile_stats aps ON ap.admin_id = aps.admin_id
            WHERE ap.admin_id = %s
        """, (admin_id,))

        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        return {
            # Fields from admin_profile table
            "id": row[0],
            "admin_id": row[1],
            "first_name": row[2],
            "father_name": row[3],
            "grandfather_name": row[4],
            "admin_username": row[5],
            "quote": row[6],
            "bio": row[7],
            "phone_number": row[8],
            "email": row[9],
            "department": row[10],
            "profile_picture_url": row[11],
            "cover_picture_url": row[12],
            # Fields from admin_profile_stats table
            "employee_id": row[13],
            "access_level": row[14],
            "last_login": row[15].isoformat() if row[15] else None,
            "responsibilities": row[16]
        }

    finally:
        cursor.close()
        conn.close()


@router.put("/profile")
async def update_admin_profile(admin_id: int = 1, profile_data: AdminProfileUpdate = None):
    """Update admin profile in admin_profile table"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check if profile exists
        cursor.execute("SELECT id FROM admin_profile WHERE admin_id = %s", (admin_id,))
        exists = cursor.fetchone()

        if not exists:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        # Build update query dynamically
        update_fields = []
        update_values = []

        if profile_data.first_name is not None:
            update_fields.append("first_name = %s")
            update_values.append(profile_data.first_name)

        if profile_data.father_name is not None:
            update_fields.append("father_name = %s")
            update_values.append(profile_data.father_name)

        if profile_data.grandfather_name is not None:
            update_fields.append("grandfather_name = %s")
            update_values.append(profile_data.grandfather_name)

        if profile_data.admin_username is not None:
            update_fields.append("admin_username = %s")
            update_values.append(profile_data.admin_username)

        if profile_data.quote is not None:
            update_fields.append("quote = %s")
            update_values.append(profile_data.quote)

        if profile_data.bio is not None:
            update_fields.append("bio = %s")
            update_values.append(profile_data.bio)

        if profile_data.phone_number is not None:
            update_fields.append("phone_number = %s")
            update_values.append(profile_data.phone_number)

        if profile_data.email is not None:
            update_fields.append("email = %s")
            update_values.append(profile_data.email)

        if profile_data.department is not None:
            update_fields.append("department = %s")
            update_values.append(profile_data.department)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Add updated_at timestamp
        update_fields.append("updated_at = %s")
        update_values.append(datetime.now())

        # Add admin_id to values for WHERE clause
        update_values.append(admin_id)

        # Execute update
        query = f"UPDATE admin_profile SET {', '.join(update_fields)} WHERE admin_id = %s"
        cursor.execute(query, tuple(update_values))
        conn.commit()

        # Fetch and return updated profile
        cursor.execute("""
            SELECT id, admin_id, first_name, father_name, grandfather_name,
                   admin_username, quote, bio, phone_number, email, department,
                   profile_picture_url, cover_picture_url
            FROM admin_profile
            WHERE admin_id = %s
        """, (admin_id,))

        row = cursor.fetchone()

        return {
            "success": True,
            "profile": {
                "id": row[0],
                "admin_id": row[1],
                "first_name": row[2],
                "father_name": row[3],
                "grandfather_name": row[4],
                "admin_username": row[5],
                "quote": row[6],
                "bio": row[7],
                "phone_number": row[8],
                "email": row[9],
                "department": row[10],
                "profile_picture_url": row[11],
                "cover_picture_url": row[12]
            }
        }

    finally:
        cursor.close()
        conn.close()
