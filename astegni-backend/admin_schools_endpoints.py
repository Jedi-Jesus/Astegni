"""
Admin Schools Management API Endpoints
Handles dual database access:
1. astegni_admin_db: admin_profile, manage_schools_profile, admin_reviews
2. astegni_user_db: schools table (with status field: pending, verified, rejected, suspended)
"""

import os
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import psycopg
from dotenv import load_dotenv
import jwt

# Load environment variables
load_dotenv()

# Create router
router = APIRouter(prefix="/api/admin/schools", tags=["admin-schools"])

# Database URLs
ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)
USER_DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)
SECRET_KEY = os.getenv('SECRET_KEY', 'your_secret_key_here')

# ============================================
# PYDANTIC MODELS
# ============================================

class StatusUpdateRequest(BaseModel):
    reason: Optional[str] = None

# ============================================
# DATABASE CONNECTION HELPERS
# ============================================

def parse_database_url(database_url):
    """Parse database URL into connection parameters"""
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "")

    auth, host_db = database_url.split("@")
    user, password = auth.split(":")
    host_port, db_part = host_db.split("/")
    db_name = db_part.split("?")[0]

    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"

    return {
        "dbname": db_name,
        "user": user,
        "password": password,
        "host": host,
        "port": port
    }

def get_admin_db_connection():
    """Get admin database connection (astegni_admin_db)"""
    params = parse_database_url(ADMIN_DATABASE_URL)
    return psycopg.connect(**params)

def get_user_db_connection():
    """Get user database connection (astegni_user_db)"""
    params = parse_database_url(USER_DATABASE_URL)
    return psycopg.connect(**params)

def get_admin_id_from_token(authorization: str):
    """Extract admin_id from JWT token"""
    if not authorization or not authorization.startswith('Bearer '):
        return None

    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload.get('admin_id') or payload.get('user_id') or payload.get('sub')
    except:
        return None

def row_to_school_dict(row, cursor):
    """Convert database row to school dictionary with frontend-compatible field names"""
    columns = [desc[0] for desc in cursor.description]
    school = dict(zip(columns, row))

    # Convert datetime objects to ISO format strings
    for key in ['created_at', 'updated_at', 'status_at']:
        if key in school and school[key]:
            school[key] = school[key].isoformat()

    # Map database field names to frontend-expected names
    # Database uses: name, type, level, location, email, phone (JSONB)
    # Frontend expects: school_name, school_type, school_level, location (string), email (string), phone (string)

    if 'name' in school:
        school['school_name'] = school['name']

    if 'type' in school:
        school['school_type'] = school['type']

    # Convert JSONB level array to string (e.g., ["Elementary", "Middle School"] -> "Elementary, Middle School")
    if 'level' in school and school['level']:
        if isinstance(school['level'], list):
            school['school_level'] = ', '.join(school['level'])
        else:
            school['school_level'] = str(school['level'])

    # Convert JSONB location to string (e.g., {"city": "Addis Ababa", "subcity": "Bole"} -> "Bole, Addis Ababa")
    if 'location' in school and school['location']:
        if isinstance(school['location'], dict):
            parts = []
            if school['location'].get('subcity'):
                parts.append(school['location']['subcity'])
            if school['location'].get('city'):
                parts.append(school['location']['city'])
            if school['location'].get('address'):
                parts.append(school['location']['address'])
            school['location'] = ', '.join(parts) if parts else 'N/A'
        elif isinstance(school['location'], str):
            pass  # Already a string
        else:
            school['location'] = str(school['location'])

    # Convert JSONB email array to string (first email or comma-separated)
    if 'email' in school and school['email']:
        if isinstance(school['email'], list):
            school['email'] = school['email'][0] if school['email'] else ''
        elif not isinstance(school['email'], str):
            school['email'] = str(school['email'])

    # Convert JSONB phone array to string (first phone or comma-separated)
    if 'phone' in school and school['phone']:
        if isinstance(school['phone'], list):
            school['phone'] = school['phone'][0] if school['phone'] else ''
        elif not isinstance(school['phone'], str):
            school['phone'] = str(school['phone'])

    # Map student_count to students_count for frontend compatibility
    if 'student_count' in school:
        school['students_count'] = school['student_count']

    # Map status_reason to rejection_reason and suspension_reason for frontend
    if 'status_reason' in school and school['status_reason']:
        if school.get('status') == 'rejected':
            school['rejection_reason'] = school['status_reason']
        elif school.get('status') == 'suspended':
            school['suspension_reason'] = school['status_reason']

    # Map status_at to appropriate date fields for frontend
    if 'status_at' in school and school['status_at']:
        if school.get('status') == 'rejected':
            school['rejected_date'] = school['status_at']
        elif school.get('status') == 'suspended':
            school['suspended_date'] = school['status_at']
        elif school.get('status') == 'verified':
            school['approved_date'] = school['status_at']
        elif school.get('status') == 'pending':
            school['submitted_date'] = school['status_at']

    return school

# ============================================
# PROFILE ENDPOINTS (from astegni_admin_db)
# ============================================

@router.get("/profile/{admin_id}")
async def get_admin_schools_profile(admin_id: int):
    """Get admin profile with schools profile data from astegni_admin_db"""
    try:
        conn = get_admin_db_connection()
        cursor = conn.cursor()

        # Get admin_profile data
        cursor.execute("""
            SELECT id, email, first_name, father_name, grandfather_name,
                   phone_number, departments, created_at
            FROM admin_profile
            WHERE id = %s
        """, (admin_id,))

        admin_row = cursor.fetchone()
        if not admin_row:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Admin profile not found")

        # Get manage_schools_profile data
        cursor.execute("""
            SELECT *
            FROM manage_schools_profile
            WHERE admin_id = %s
        """, (admin_id,))

        schools_profile_row = cursor.fetchone()
        schools_profile_columns = [desc[0] for desc in cursor.description] if schools_profile_row else []

        # Get live rating stats from admin_reviews table
        cursor.execute("""
            SELECT COUNT(*) as total_reviews,
                   COALESCE(AVG(rating), 0) as average_rating
            FROM admin_reviews
            WHERE admin_id = %s
        """, (admin_id,))
        reviews_stats = cursor.fetchone()
        live_total_reviews = reviews_stats[0] or 0
        live_average_rating = float(reviews_stats[1]) if reviews_stats[1] else 0.0

        cursor.close()
        conn.close()

        # Build response
        result = {
            "id": admin_row[0],
            "email": admin_row[1],
            "first_name": admin_row[2],
            "father_name": admin_row[3],
            "grandfather_name": admin_row[4],
            "phone_number": admin_row[5],
            "departments": admin_row[6],
            "created_at": admin_row[7].isoformat() if admin_row[7] else None,
            "rating": live_average_rating,
            "total_reviews": live_total_reviews
        }

        # Add schools profile data if exists
        if schools_profile_row:
            schools_profile_dict = dict(zip(schools_profile_columns, schools_profile_row))
            result.update(schools_profile_dict)

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profile/by-email/{email}")
async def get_admin_schools_profile_by_email(email: str):
    """Get admin profile by email with schools profile data"""
    try:
        conn = get_admin_db_connection()
        cursor = conn.cursor()

        # Get admin_profile data by email
        cursor.execute("""
            SELECT id, email, first_name, father_name, grandfather_name,
                   phone_number, departments, created_at
            FROM admin_profile
            WHERE %s = ANY(email)
        """, (email,))

        admin_row = cursor.fetchone()
        if not admin_row:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Admin profile not found")

        admin_id = admin_row[0]

        # Get manage_schools_profile data
        cursor.execute("""
            SELECT *
            FROM manage_schools_profile
            WHERE admin_id = %s
        """, (admin_id,))

        schools_profile_row = cursor.fetchone()
        schools_profile_columns = [desc[0] for desc in cursor.description] if schools_profile_row else []

        # Get live rating stats from admin_reviews table
        cursor.execute("""
            SELECT COUNT(*) as total_reviews,
                   COALESCE(AVG(rating), 0) as average_rating
            FROM admin_reviews
            WHERE admin_id = %s
        """, (admin_id,))
        reviews_stats = cursor.fetchone()
        live_total_reviews = reviews_stats[0] or 0
        live_average_rating = float(reviews_stats[1]) if reviews_stats[1] else 0.0

        cursor.close()
        conn.close()

        # Build response
        result = {
            "id": admin_row[0],
            "email": admin_row[1],
            "first_name": admin_row[2],
            "father_name": admin_row[3],
            "grandfather_name": admin_row[4],
            "phone_number": admin_row[5],
            "departments": admin_row[6],
            "created_at": admin_row[7].isoformat() if admin_row[7] else None,
            "rating": live_average_rating,
            "total_reviews": live_total_reviews
        }

        # Add schools profile data if exists
        if schools_profile_row:
            schools_profile_dict = dict(zip(schools_profile_columns, schools_profile_row))
            result.update(schools_profile_dict)

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# REVIEWS ENDPOINTS (from astegni_admin_db)
# ============================================

@router.get("/reviews")
async def get_admin_reviews(
    admin_id: Optional[int] = None,
    department: Optional[str] = None,
    limit: int = 50
):
    """Get admin reviews from astegni_admin_db"""
    try:
        conn = get_admin_db_connection()
        cursor = conn.cursor()

        query = "SELECT * FROM admin_reviews WHERE 1=1"
        params = []

        if admin_id:
            query += " AND admin_id = %s"
            params.append(admin_id)

        if department:
            query += " AND department = %s"
            params.append(department)

        query += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]

        reviews = []
        for row in rows:
            review = dict(zip(columns, row))
            # Convert datetime to ISO format
            for key in ['created_at', 'updated_at']:
                if key in review and review[key]:
                    review[key] = review[key].isoformat()
            reviews.append(review)

        cursor.close()
        conn.close()

        return reviews

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reviews/recent")
async def get_recent_reviews(
    admin_id: Optional[int] = None,
    limit: int = 5
):
    """Get recent admin reviews"""
    return await get_admin_reviews(admin_id=admin_id, limit=limit)


# ============================================
# SCHOOL ENDPOINTS (from astegni_user_db - schools table)
# ============================================

@router.get("/pending")
async def get_pending_schools():
    """Get all pending schools from astegni_user_db schools table"""
    try:
        conn = get_user_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM schools
            WHERE status = 'pending'
            ORDER BY created_at DESC
        """)

        rows = cursor.fetchall()
        schools = [row_to_school_dict(row, cursor) for row in rows]

        cursor.close()
        conn.close()

        return schools

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/verified")
async def get_verified_schools():
    """Get all verified schools from astegni_user_db schools table"""
    try:
        conn = get_user_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM schools
            WHERE status = 'verified'
            ORDER BY created_at DESC
        """)

        rows = cursor.fetchall()
        schools = [row_to_school_dict(row, cursor) for row in rows]

        cursor.close()
        conn.close()

        return schools

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rejected")
async def get_rejected_schools():
    """Get all rejected schools from astegni_user_db schools table"""
    try:
        conn = get_user_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM schools
            WHERE status = 'rejected'
            ORDER BY status_at DESC
        """)

        rows = cursor.fetchall()
        schools = [row_to_school_dict(row, cursor) for row in rows]

        cursor.close()
        conn.close()

        return schools

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suspended")
async def get_suspended_schools():
    """Get all suspended schools from astegni_user_db schools table"""
    try:
        conn = get_user_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM schools
            WHERE status = 'suspended'
            ORDER BY status_at DESC
        """)

        rows = cursor.fetchall()
        schools = [row_to_school_dict(row, cursor) for row in rows]

        cursor.close()
        conn.close()

        return schools

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_school_statistics():
    """Get school statistics grouped by status"""
    try:
        conn = get_user_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                status,
                COUNT(*) as count
            FROM schools
            GROUP BY status
        """)

        rows = cursor.fetchall()
        stats = {row[0]: row[1] for row in rows}

        # Ensure all statuses are present
        result = {
            "pending": stats.get("pending", 0),
            "verified": stats.get("verified", 0),
            "rejected": stats.get("rejected", 0),
            "suspended": stats.get("suspended", 0),
            "total": sum(stats.values())
        }

        cursor.close()
        conn.close()

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{school_id}")
async def get_school(school_id: int):
    """Get a specific school by ID"""
    try:
        conn = get_user_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM schools WHERE id = %s", (school_id,))
        row = cursor.fetchone()

        if not row:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="School not found")

        school = row_to_school_dict(row, cursor)

        cursor.close()
        conn.close()

        return school

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{school_id}/approve")
async def approve_school(
    school_id: int,
    authorization: Optional[str] = Header(None)
):
    """Approve a pending school (change status to verified)"""
    try:
        admin_id = get_admin_id_from_token(authorization)

        conn = get_user_db_connection()
        cursor = conn.cursor()

        # Check if school exists and is pending
        cursor.execute("SELECT status FROM schools WHERE id = %s", (school_id,))
        row = cursor.fetchone()

        if not row:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="School not found")

        if row[0] != 'pending':
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail=f"School is not pending (current status: {row[0]})")

        # Update status to verified
        cursor.execute("""
            UPDATE schools
            SET status = 'verified',
                status_by = %s,
                status_at = %s,
                status_reason = NULL,
                updated_at = %s
            WHERE id = %s
        """, (admin_id, datetime.now(timezone.utc), datetime.now(timezone.utc), school_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {"message": "School approved successfully", "school_id": school_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{school_id}/reject")
async def reject_school(
    school_id: int,
    request: StatusUpdateRequest,
    authorization: Optional[str] = Header(None)
):
    """Reject a school (change status to rejected)"""
    try:
        admin_id = get_admin_id_from_token(authorization)

        conn = get_user_db_connection()
        cursor = conn.cursor()

        # Check if school exists
        cursor.execute("SELECT status FROM schools WHERE id = %s", (school_id,))
        row = cursor.fetchone()

        if not row:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="School not found")

        # Update status to rejected
        cursor.execute("""
            UPDATE schools
            SET status = 'rejected',
                status_by = %s,
                status_at = %s,
                status_reason = %s,
                updated_at = %s
            WHERE id = %s
        """, (admin_id, datetime.now(timezone.utc), request.reason, datetime.now(timezone.utc), school_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {"message": "School rejected successfully", "school_id": school_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{school_id}/suspend")
async def suspend_school(
    school_id: int,
    request: StatusUpdateRequest,
    authorization: Optional[str] = Header(None)
):
    """Suspend a verified school"""
    try:
        admin_id = get_admin_id_from_token(authorization)

        conn = get_user_db_connection()
        cursor = conn.cursor()

        # Check if school exists and is verified
        cursor.execute("SELECT status FROM schools WHERE id = %s", (school_id,))
        row = cursor.fetchone()

        if not row:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="School not found")

        if row[0] != 'verified':
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail=f"Only verified schools can be suspended (current status: {row[0]})")

        # Update status to suspended
        cursor.execute("""
            UPDATE schools
            SET status = 'suspended',
                status_by = %s,
                status_at = %s,
                status_reason = %s,
                updated_at = %s
            WHERE id = %s
        """, (admin_id, datetime.now(timezone.utc), request.reason, datetime.now(timezone.utc), school_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {"message": "School suspended successfully", "school_id": school_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{school_id}/reinstate")
async def reinstate_school(
    school_id: int,
    authorization: Optional[str] = Header(None)
):
    """Reinstate a suspended school back to verified"""
    try:
        admin_id = get_admin_id_from_token(authorization)

        conn = get_user_db_connection()
        cursor = conn.cursor()

        # Check if school exists and is suspended
        cursor.execute("SELECT status FROM schools WHERE id = %s", (school_id,))
        row = cursor.fetchone()

        if not row:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="School not found")

        if row[0] != 'suspended':
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail=f"Only suspended schools can be reinstated (current status: {row[0]})")

        # Update status back to verified
        cursor.execute("""
            UPDATE schools
            SET status = 'verified',
                status_by = %s,
                status_at = %s,
                status_reason = NULL,
                updated_at = %s
            WHERE id = %s
        """, (admin_id, datetime.now(timezone.utc), datetime.now(timezone.utc), school_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {"message": "School reinstated successfully", "school_id": school_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{school_id}/reconsider")
async def reconsider_school(
    school_id: int,
    authorization: Optional[str] = Header(None)
):
    """Move a rejected school back to pending for reconsideration"""
    try:
        admin_id = get_admin_id_from_token(authorization)

        conn = get_user_db_connection()
        cursor = conn.cursor()

        # Check if school exists and is rejected
        cursor.execute("SELECT status FROM schools WHERE id = %s", (school_id,))
        row = cursor.fetchone()

        if not row:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="School not found")

        if row[0] != 'rejected':
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail=f"Only rejected schools can be reconsidered (current status: {row[0]})")

        # Update status back to pending
        cursor.execute("""
            UPDATE schools
            SET status = 'pending',
                status_by = %s,
                status_at = %s,
                status_reason = NULL,
                updated_at = %s
            WHERE id = %s
        """, (admin_id, datetime.now(timezone.utc), datetime.now(timezone.utc), school_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {"message": "School moved to pending for reconsideration", "school_id": school_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{school_id}")
async def delete_school(
    school_id: int,
    authorization: Optional[str] = Header(None)
):
    """Permanently delete a school"""
    try:
        conn = get_user_db_connection()
        cursor = conn.cursor()

        # Check if school exists
        cursor.execute("SELECT id FROM schools WHERE id = %s", (school_id,))
        row = cursor.fetchone()

        if not row:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="School not found")

        # Delete the school
        cursor.execute("DELETE FROM schools WHERE id = %s", (school_id,))

        conn.commit()
        cursor.close()
        conn.close()

        return {"message": "School deleted successfully", "school_id": school_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
