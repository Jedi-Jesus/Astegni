"""
Admin Profile Endpoints - UPDATED FOR NEW STRUCTURE
Handles CRUD operations for admin profiles with departments array

NEW STRUCTURE:
- admin_profile: shared data + departments array
- Department tables: department-specific data
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
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
    id: int
    first_name: str
    father_name: str
    grandfather_name: Optional[str]
    email: str
    phone_number: Optional[str]
    bio: Optional[str]
    quote: Optional[str]
    profile_picture: Optional[str]
    cover_picture: Optional[str]
    departments: List[str]
    last_login: Optional[str]
    created_at: str

class AdminProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    father_name: Optional[str] = None
    grandfather_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    bio: Optional[str] = None
    quote: Optional[str] = None

class SystemSettingsProfileUpdate(BaseModel):
    # admin_profile fields
    username: Optional[str] = None
    first_name: Optional[str] = None
    father_name: Optional[str] = None
    grandfather_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    bio: Optional[str] = None
    quote: Optional[str] = None
    # manage_system_settings_profile fields
    position: Optional[str] = None

# ============================================
# HELPER FUNCTIONS
# ============================================

def get_connection():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL)

# ============================================
# ENDPOINTS
# ============================================

@router.get("/profile/{admin_id}")
async def get_admin_profile(admin_id: int):
    """Get admin profile with all department information"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get main profile
        cursor.execute("""
            SELECT id, first_name, father_name, grandfather_name, email, phone_number,
                   bio, quote, profile_picture, cover_picture, departments, last_login, created_at
            FROM admin_profile
            WHERE id = %s
        """, (admin_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        profile = {
            "id": row[0],
            "first_name": row[1],
            "father_name": row[2],
            "grandfather_name": row[3],
            "email": row[4],
            "phone_number": row[5],
            "bio": row[6],
            "quote": row[7],
            "profile_picture": row[8],
            "cover_picture": row[9],
            "departments": row[10] or [],
            "last_login": row[11].isoformat() if row[11] else None,
            "created_at": row[12].isoformat() if row[12] else None
        }

        # Get department-specific data
        department_data = []
        for dept in (profile["departments"] or []):
            try:
                dept_table = dept.replace('-', '_') + '_profile'
                cursor.execute(f"""
                    SELECT position, rating, total_reviews, joined_date, created_at
                    FROM {dept_table}
                    WHERE admin_id = %s
                """, (admin_id,))

                dept_row = cursor.fetchone()
                if dept_row:
                    department_data.append({
                        "department": dept,
                        "position": dept_row[0],
                        "rating": float(dept_row[1]) if dept_row[1] else 0.0,
                        "total_reviews": dept_row[2],
                        "joined_date": dept_row[3].isoformat() if dept_row[3] else None,
                        "created_at": dept_row[4].isoformat() if dept_row[4] else None
                    })
            except Exception as e:
                print(f"Error getting {dept} data: {e}")

        profile["department_details"] = department_data

        return profile

    finally:
        cursor.close()
        conn.close()

@router.put("/profile/{admin_id}")
async def update_admin_profile(admin_id: int, profile_data: AdminProfileUpdate):
    """Update admin profile (shared fields only)"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check if profile exists
        cursor.execute("SELECT id FROM admin_profile WHERE id = %s", (admin_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Admin profile not found")

        # Build update query
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

        if profile_data.email is not None:
            update_fields.append("email = %s")
            update_values.append(profile_data.email)

        if profile_data.phone_number is not None:
            update_fields.append("phone_number = %s")
            update_values.append(profile_data.phone_number)

        if profile_data.bio is not None:
            update_fields.append("bio = %s")
            update_values.append(profile_data.bio)

        if profile_data.quote is not None:
            update_fields.append("quote = %s")
            update_values.append(profile_data.quote)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Add updated_at
        update_fields.append("updated_at = %s")
        update_values.append(datetime.now())
        update_values.append(admin_id)

        # Execute update
        query = f"UPDATE admin_profile SET {', '.join(update_fields)} WHERE id = %s"
        cursor.execute(query, tuple(update_values))
        conn.commit()

        # Return updated profile
        return await get_admin_profile(admin_id)

    finally:
        cursor.close()
        conn.close()

@router.get("/system-settings-profile/{admin_id}")
async def get_system_settings_profile(admin_id: int):
    """Get admin profile merged with manage_system_settings_profile data"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get main profile from admin_profile
        cursor.execute("""
            SELECT id, username, first_name, father_name, grandfather_name, email, phone_number,
                   bio, quote, profile_picture, cover_picture, departments, last_login, created_at
            FROM admin_profile
            WHERE id = %s
        """, (admin_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        profile = {
            "id": row[0],
            "username": row[1],
            "first_name": row[2],
            "father_name": row[3],
            "grandfather_name": row[4],
            "email": row[5],
            "phone_number": row[6],
            "bio": row[7],
            "quote": row[8],
            "profile_picture": row[9],
            "cover_picture": row[10],
            "departments": row[11] or [],
            "last_login": row[12].isoformat() if row[12] else None,
            "created_at": row[13].isoformat() if row[13] else None
        }

        # Get manage_system_settings_profile data
        cursor.execute("""
            SELECT position, rating, total_reviews, badges, total_actions,
                   system_changes_made, admins_invited, critical_alerts_resolved,
                   permissions, joined_date, created_at
            FROM manage_system_settings_profile
            WHERE admin_id = %s
        """, (admin_id,))

        settings_row = cursor.fetchone()

        if settings_row:
            profile["system_settings"] = {
                "position": settings_row[0],
                "rating": float(settings_row[1]) if settings_row[1] else 0.0,
                "total_reviews": settings_row[2] or 0,
                "badges": settings_row[3] or [],
                "total_actions": settings_row[4] or 0,
                "system_changes_made": settings_row[5] or 0,
                "admins_invited": settings_row[6] or 0,
                "critical_alerts_resolved": settings_row[7] or 0,
                "permissions": settings_row[8] or {},
                "joined_date": settings_row[9].isoformat() if settings_row[9] else None,
                "created_at": settings_row[10].isoformat() if settings_row[10] else None
            }
        else:
            # Return default system settings if not found
            profile["system_settings"] = {
                "position": "Super Admin",
                "rating": 0.0,
                "total_reviews": 0,
                "badges": [],
                "total_actions": 0,
                "system_changes_made": 0,
                "admins_invited": 0,
                "critical_alerts_resolved": 0,
                "permissions": {
                    "full_access": True,
                    "can_manage_admins": True,
                    "can_change_settings": True,
                    "can_access_all_departments": True
                },
                "joined_date": None,
                "created_at": None
            }

        return profile

    finally:
        cursor.close()
        conn.close()

@router.put("/system-settings-profile/{admin_id}")
async def update_system_settings_profile(admin_id: int, profile_data: SystemSettingsProfileUpdate):
    """Update admin profile and manage_system_settings_profile data"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Check if profile exists
        cursor.execute("SELECT id FROM admin_profile WHERE id = %s", (admin_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Admin profile not found")

        # Update admin_profile fields
        admin_update_fields = []
        admin_update_values = []

        if profile_data.username is not None:
            admin_update_fields.append("username = %s")
            admin_update_values.append(profile_data.username)

        if profile_data.first_name is not None:
            admin_update_fields.append("first_name = %s")
            admin_update_values.append(profile_data.first_name)

        if profile_data.father_name is not None:
            admin_update_fields.append("father_name = %s")
            admin_update_values.append(profile_data.father_name)

        if profile_data.grandfather_name is not None:
            admin_update_fields.append("grandfather_name = %s")
            admin_update_values.append(profile_data.grandfather_name)

        if profile_data.email is not None:
            admin_update_fields.append("email = %s")
            admin_update_values.append(profile_data.email)

        if profile_data.phone_number is not None:
            admin_update_fields.append("phone_number = %s")
            admin_update_values.append(profile_data.phone_number)

        if profile_data.bio is not None:
            admin_update_fields.append("bio = %s")
            admin_update_values.append(profile_data.bio)

        if profile_data.quote is not None:
            admin_update_fields.append("quote = %s")
            admin_update_values.append(profile_data.quote)

        # Update admin_profile if there are fields to update
        if admin_update_fields:
            admin_update_fields.append("updated_at = %s")
            admin_update_values.append(datetime.now())
            admin_update_values.append(admin_id)

            query = f"UPDATE admin_profile SET {', '.join(admin_update_fields)} WHERE id = %s"
            cursor.execute(query, tuple(admin_update_values))

        # Update manage_system_settings_profile fields
        settings_update_fields = []
        settings_update_values = []

        if profile_data.position is not None:
            settings_update_fields.append("position = %s")
            settings_update_values.append(profile_data.position)

        # Update manage_system_settings_profile if there are fields to update
        if settings_update_fields:
            settings_update_fields.append("updated_at = %s")
            settings_update_values.append(datetime.now())
            settings_update_values.append(admin_id)

            query = f"UPDATE manage_system_settings_profile SET {', '.join(settings_update_fields)} WHERE admin_id = %s"
            cursor.execute(query, tuple(settings_update_values))

        conn.commit()

        # Return updated profile
        return await get_system_settings_profile(admin_id)

    finally:
        cursor.close()
        conn.close()

@router.get("/manage-courses-profile/by-email/{email}")
async def get_manage_courses_profile_by_email(email: str):
    """
    Get admin profile by email for Manage Courses page
    Used when admin logs in and we have their email but not ID
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get admin_id from email
        cursor.execute("SELECT id FROM admin_profile WHERE email = %s", (email,))
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail=f"Admin with email {email} not found")

        admin_id = result[0]

        # Call the main endpoint with the admin_id
        return await get_manage_courses_profile(admin_id)

    finally:
        cursor.close()
        conn.close()

@router.get("/manage-courses-profile/{admin_id}")
async def get_manage_courses_profile(admin_id: int):
    """
    Get admin profile merged with manage_courses_profile data for Manage Courses page

    Supports cross-department access:
    - manage-courses department: Full course management profile
    - manage-system-settings department: Viewing access with system admin badge
    - Other departments: View-only access
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get main profile from admin_profile
        cursor.execute("""
            SELECT id, username, first_name, father_name, grandfather_name, email, phone_number,
                   bio, quote, profile_picture, cover_picture, departments, last_login, created_at
            FROM admin_profile
            WHERE id = %s
        """, (admin_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        profile = {
            "id": row[0],
            "username": row[1],
            "first_name": row[2],
            "father_name": row[3],
            "grandfather_name": row[4],
            "email": row[5],
            "phone_number": row[6],
            "bio": row[7],
            "quote": row[8],
            "profile_picture": row[9],
            "cover_picture": row[10],
            "departments": row[11] or [],
            "last_login": row[12].isoformat() if row[12] else None,
            "created_at": row[13].isoformat() if row[13] else None
        }

        # Get manage_courses_profile data
        cursor.execute("""
            SELECT position, rating, total_reviews, badges, courses_created,
                   courses_approved, courses_rejected, courses_archived,
                   students_enrolled, avg_course_rating, permissions,
                   joined_date, created_at
            FROM manage_courses_profile
            WHERE admin_id = %s
        """, (admin_id,))

        courses_row = cursor.fetchone()
        departments = profile["departments"] or []

        if courses_row:
            # Admin has a manage_courses_profile record
            profile["courses_profile"] = {
                "position": courses_row[0],
                "rating": float(courses_row[1]) if courses_row[1] else 0.0,
                "total_reviews": courses_row[2] or 0,
                "badges": courses_row[3] or [],
                "courses_created": courses_row[4] or 0,
                "courses_approved": courses_row[5] or 0,
                "courses_rejected": courses_row[6] or 0,
                "courses_archived": courses_row[7] or 0,
                "students_enrolled": courses_row[8] or 0,
                "avg_course_rating": float(courses_row[9]) if courses_row[9] else 0.0,
                "permissions": courses_row[10] or {},
                "joined_date": courses_row[11].isoformat() if courses_row[11] else None,
                "created_at": courses_row[12].isoformat() if courses_row[12] else None,
                "has_profile": True
            }
        else:
            # Admin doesn't have manage_courses_profile - provide defaults based on their department
            is_system_admin = "manage-system-settings" in departments
            is_courses_admin = "manage-courses" in departments

            # Determine position and badges based on department
            if is_system_admin:
                position = "System Administrator (Viewing)"
                badges = ["System Admin", "Full Access"]
                permissions = {
                    "can_approve_courses": True,
                    "can_reject_courses": True,
                    "can_suspend_courses": True,
                    "can_view_analytics": True,
                    "can_manage_notifications": True,
                    "system_admin": True
                }
            elif is_courses_admin:
                position = "Course Manager"
                badges = []
                permissions = {
                    "can_approve_courses": True,
                    "can_reject_courses": True,
                    "can_suspend_courses": True,
                    "can_view_analytics": True
                }
            else:
                position = "Admin (View Only)"
                badges = []
                permissions = {
                    "can_view_analytics": True
                }

            profile["courses_profile"] = {
                "position": position,
                "rating": 0.0,
                "total_reviews": 0,
                "badges": badges,
                "courses_created": 0,
                "courses_approved": 0,
                "courses_rejected": 0,
                "courses_archived": 0,
                "students_enrolled": 0,
                "avg_course_rating": 0.0,
                "permissions": permissions,
                "joined_date": profile["created_at"],  # Use account creation date
                "created_at": None,
                "has_profile": False
            }

        return profile

    finally:
        cursor.close()
        conn.close()

@router.get("/manage-schools-profile/by-email/{email}")
async def get_manage_schools_profile_by_email(email: str):
    """
    Get admin profile by email for Manage Schools page
    Used when admin logs in and we have their email but not ID
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get admin_id from email
        cursor.execute("SELECT id FROM admin_profile WHERE email = %s", (email,))
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail=f"Admin with email {email} not found")

        admin_id = result[0]

        # Call the main endpoint with the admin_id
        return await get_manage_schools_profile(admin_id)

    finally:
        cursor.close()
        conn.close()

@router.get("/manage-schools-profile/{admin_id}")
async def get_manage_schools_profile(admin_id: int):
    """
    Get admin profile merged with manage_schools_profile data for Manage Schools page

    Supports cross-department access:
    - manage-schools department: Full school management profile
    - manage-system-settings department: Viewing access with system admin badge
    - Other departments: View-only access
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get main profile from admin_profile
        cursor.execute("""
            SELECT id, username, first_name, father_name, grandfather_name, email, phone_number,
                   bio, quote, profile_picture, cover_picture, departments, last_login, created_at
            FROM admin_profile
            WHERE id = %s
        """, (admin_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        profile = {
            "id": row[0],
            "username": row[1],
            "first_name": row[2],
            "father_name": row[3],
            "grandfather_name": row[4],
            "email": row[5],
            "phone_number": row[6],
            "bio": row[7],
            "quote": row[8],
            "profile_picture": row[9],
            "cover_picture": row[10],
            "departments": row[11] or [],
            "last_login": row[12].isoformat() if row[12] else None,
            "created_at": row[13].isoformat() if row[13] else None
        }

        # Get manage_schools_profile data
        cursor.execute("""
            SELECT position, rating, total_reviews, badges, schools_verified,
                   schools_rejected, schools_suspended, total_students_managed,
                   accreditation_reviews, permissions, joined_date, created_at
            FROM manage_schools_profile
            WHERE admin_id = %s
        """, (admin_id,))

        schools_row = cursor.fetchone()
        departments = profile["departments"] or []

        if schools_row:
            # Admin has a manage_schools_profile record
            profile["schools_profile"] = {
                "position": schools_row[0],
                "rating": float(schools_row[1]) if schools_row[1] else 0.0,
                "total_reviews": schools_row[2] or 0,
                "badges": schools_row[3] or [],
                "schools_verified": schools_row[4] or 0,
                "schools_rejected": schools_row[5] or 0,
                "schools_suspended": schools_row[6] or 0,
                "total_students_managed": schools_row[7] or 0,
                "accreditation_reviews": schools_row[8] or 0,
                "permissions": schools_row[9] or {},
                "joined_date": schools_row[10].isoformat() if schools_row[10] else None,
                "created_at": schools_row[11].isoformat() if schools_row[11] else None,
                "has_profile": True
            }
        else:
            # Admin doesn't have manage_schools_profile - provide defaults based on their department
            is_system_admin = "manage-system-settings" in departments
            is_schools_admin = "manage-schools" in departments

            # Determine position and badges based on department
            if is_system_admin:
                position = "System Administrator (Viewing)"
                badges = [
                    {"text": "✔ System Administrator", "class": "verified"},
                    {"text": "Full Access", "class": "expert"}
                ]
                permissions = {
                    "can_verify_schools": True,
                    "can_reject_schools": True,
                    "can_suspend_schools": True,
                    "can_view_analytics": True,
                    "can_manage_notifications": True,
                    "system_admin": True
                }
            elif is_schools_admin:
                position = "School Registration Manager"
                badges = [
                    {"text": "🏫 School Management", "class": "school"}
                ]
                permissions = {
                    "can_verify_schools": True,
                    "can_reject_schools": True,
                    "can_suspend_schools": True,
                    "can_view_analytics": True
                }
            else:
                position = "Admin (View Only)"
                badges = []
                permissions = {
                    "can_view_analytics": True
                }

            profile["schools_profile"] = {
                "position": position,
                "rating": 0.0,
                "total_reviews": 0,
                "badges": badges,
                "schools_verified": 0,
                "schools_rejected": 0,
                "schools_suspended": 0,
                "total_students_managed": 0,
                "accreditation_reviews": 0,
                "permissions": permissions,
                "joined_date": profile["created_at"],  # Use account creation date
                "created_at": None,
                "has_profile": False
            }

        return profile

    finally:
        cursor.close()
        conn.close()

@router.get("/manage-tutor-documents-profile/by-email/{email}")
async def get_manage_tutor_documents_profile_by_email(email: str):
    """
    Get admin profile by email for Manage Tutor Documents page
    Used when admin logs in and we have their email but not ID
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get admin_id from email
        cursor.execute("SELECT id FROM admin_profile WHERE email = %s", (email,))
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail=f"Admin with email {email} not found")

        admin_id = result[0]

        # Call the main endpoint with the admin_id
        return await get_manage_tutor_documents_profile(admin_id)

    finally:
        cursor.close()
        conn.close()

@router.get("/manage-tutor-documents-profile/{admin_id}")
async def get_manage_tutor_documents_profile(admin_id: int):
    """
    Get admin profile merged with manage_tutors_profile data for Manage Tutor Documents page

    RESTRICTED ACCESS:
    - manage-tutor-documents department: Full tutor management profile
    - manage-system-settings department: Full access (system admin)
    - Other departments: Access denied (403)
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get main profile from admin_profile
        cursor.execute("""
            SELECT id, username, first_name, father_name, grandfather_name, email, phone_number,
                   bio, quote, profile_picture, cover_picture, departments, last_login, created_at
            FROM admin_profile
            WHERE id = %s
        """, (admin_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        profile = {
            "id": row[0],
            "username": row[1],
            "first_name": row[2],
            "father_name": row[3],
            "grandfather_name": row[4],
            "email": row[5],
            "phone_number": row[6],
            "bio": row[7],
            "quote": row[8],
            "profile_picture": row[9],
            "cover_picture": row[10],
            "departments": row[11] or [],
            "last_login": row[12].isoformat() if row[12] else None,
            "created_at": row[13].isoformat() if row[13] else None
        }

        departments = profile["departments"] or []

        # Check if admin has access to manage-tutor-documents
        is_system_admin = "manage-system-settings" in departments
        is_tutors_admin = "manage-tutor-documents" in departments

        if not is_system_admin and not is_tutors_admin:
            raise HTTPException(
                status_code=403,
                detail="Access denied. Only manage-tutor-documents and manage-system-settings departments can access this page."
            )

        # Get manage_tutors_profile data
        cursor.execute("""
            SELECT position, rating, total_reviews, badges, tutors_verified,
                   tutors_rejected, tutors_suspended, verification_requests_pending,
                   avg_verification_time_hours, permissions, joined_date, created_at
            FROM manage_tutors_profile
            WHERE admin_id = %s
        """, (admin_id,))

        tutors_row = cursor.fetchone()

        if tutors_row:
            # Admin has a manage_tutors_profile record
            # Calculate total applications processed from individual counts
            total_verified = tutors_row[4] or 0
            total_rejected = tutors_row[5] or 0
            total_suspended = tutors_row[6] or 0
            total_applications_processed = total_verified + total_rejected + total_suspended

            # Calculate verification rate (approved / total processed)
            verification_rate = (total_verified / total_applications_processed * 100) if total_applications_processed > 0 else 0.0

            profile["tutors_profile"] = {
                "position": tutors_row[0],
                "rating": float(tutors_row[1]) if tutors_row[1] else 0.0,
                "total_reviews": tutors_row[2] or 0,
                "badges": tutors_row[3] or [],
                "tutors_verified": total_verified,
                "tutors_rejected": total_rejected,
                "tutors_suspended": total_suspended,
                "total_applications_processed": total_applications_processed,
                "verification_requests_pending": tutors_row[7] or 0,
                "avg_verification_time_hours": tutors_row[8] or 24,
                "verification_rate": round(verification_rate, 1),
                "permissions": tutors_row[9] or {},
                "joined_date": tutors_row[10].isoformat() if tutors_row[10] else None,
                "created_at": tutors_row[11].isoformat() if tutors_row[11] else None,
                "has_profile": True
            }
        else:
            # Admin doesn't have manage_tutors_profile - provide defaults based on their department
            if is_system_admin:
                position = "System Administrator (Viewing)"
                badges = [
                    {"text": "✔ System Administrator", "class": "verified"},
                    {"text": "Full Access", "class": "expert"}
                ]
                permissions = {
                    "can_verify_tutors": True,
                    "can_reject_tutors": True,
                    "can_suspend_tutors": True,
                    "can_view_analytics": True,
                    "can_manage_notifications": True,
                    "system_admin": True
                }
            else:  # is_tutors_admin
                position = "Tutor Management Specialist"
                badges = [
                    {"text": "👨‍🏫 Tutor Management", "class": "school"}
                ]
                permissions = {
                    "can_verify_tutors": True,
                    "can_reject_tutors": True,
                    "can_suspend_tutors": True,
                    "can_view_analytics": True
                }

            profile["tutors_profile"] = {
                "position": position,
                "rating": 0.0,
                "total_reviews": 0,
                "badges": badges,
                "tutors_verified": 0,
                "tutors_rejected": 0,
                "tutors_suspended": 0,
                "total_applications_processed": 0,
                "verification_rate": 0.0,
                "permissions": permissions,
                "joined_date": profile["created_at"],  # Use account creation date
                "created_at": None,
                "has_profile": False
            }

        return profile

    finally:
        cursor.close()
        conn.close()
