"""
Admin Courses Management API Endpoints
Handles dual database access:
1. astegni_admin_db: admin_profile, manage_courses_profile, admin_reviews
2. astegni_user_db: courses table (with status field: pending, verified, rejected, suspended)
"""

import os
import sys
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, status, Header
from pydantic import BaseModel
import psycopg
from dotenv import load_dotenv
import jwt

# Load environment variables
load_dotenv()

# Create router
router = APIRouter(prefix="/api/admin/courses", tags=["admin-courses"])

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

class NotificationRequest(BaseModel):
    message: str
    target_audience: str

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

# ============================================
# PROFILE ENDPOINTS (from astegni_admin_db)
# ============================================

@router.get("/profile/{admin_id}")
async def get_admin_courses_profile(admin_id: int):
    """
    Get admin profile with courses profile data from astegni_admin_db

    - admin_profile: name, email, phone, departments
    - manage_courses_profile: username, bio, quote, location, images, badges
    - admin_reviews: rating and total_reviews calculated live
    """
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

        # Get manage_courses_profile data (simplified structure)
        cursor.execute("""
            SELECT id, username, bio, quote, location, cover_image, profile_image,
                   languages, hero_title, hero_subtitle, badges, created_at, updated_at,
                   allow_location, display_location
            FROM manage_courses_profile
            WHERE admin_id = %s
        """, (admin_id,))

        courses_profile_row = cursor.fetchone()

        # Get live rating stats from admin_reviews table
        cursor.execute("""
            SELECT COUNT(*) as total_reviews,
                   COALESCE(AVG(rating), 0) as average_rating
            FROM admin_reviews
            WHERE admin_id = %s
        """, (admin_id,))
        reviews_stats = cursor.fetchone()
        total_reviews = reviews_stats[0] or 0
        rating = round(float(reviews_stats[1]), 1) if reviews_stats[1] else 0.0

        cursor.close()
        conn.close()

        # Build response
        profile = {
            "id": admin_row[0],
            "email": admin_row[1] or [],
            "first_name": admin_row[2],
            "father_name": admin_row[3],
            "grandfather_name": admin_row[4],
            "phone_number": admin_row[5] or [],
            "departments": admin_row[6] if admin_row[6] else [],
            "created_at": admin_row[7].isoformat() if admin_row[7] else None,
            # From manage_courses_profile
            "username": courses_profile_row[1] if courses_profile_row else None,
            "bio": courses_profile_row[2] if courses_profile_row else None,
            "quote": courses_profile_row[3] if courses_profile_row else None,
            "location": courses_profile_row[4] if courses_profile_row else None,
            "cover_picture": courses_profile_row[5] if courses_profile_row else None,
            "profile_picture": courses_profile_row[6] if courses_profile_row else None,
            "languages": courses_profile_row[7] if courses_profile_row else [],
            "hero_title": courses_profile_row[8] if courses_profile_row else None,
            "hero_subtitle": courses_profile_row[9] if courses_profile_row else None,
            "badges": courses_profile_row[10] if courses_profile_row else [],
            "allow_location": courses_profile_row[13] if courses_profile_row else False,
            "display_location": courses_profile_row[14] if courses_profile_row and len(courses_profile_row) > 14 else True,
            # From admin_reviews (live calculation)
            "rating": rating,
            "total_reviews": total_reviews
        }

        return profile

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch admin profile: {str(e)}")

@router.get("/profile/by-email/{email}")
async def get_admin_courses_profile_by_email(email: str):
    """
    Get admin profile with courses profile data by email from astegni_admin_db
    """
    try:
        conn = get_admin_db_connection()
        cursor = conn.cursor()

        # Get admin_profile data by email (email is an array)
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

        # Get manage_courses_profile data (simplified structure)
        cursor.execute("""
            SELECT id, username, bio, quote, location, cover_image, profile_image,
                   languages, hero_title, hero_subtitle, badges, created_at, updated_at,
                   allow_location, display_location
            FROM manage_courses_profile
            WHERE admin_id = %s
        """, (admin_id,))

        courses_profile_row = cursor.fetchone()

        # Get live rating stats from admin_reviews table
        cursor.execute("""
            SELECT COUNT(*) as total_reviews,
                   COALESCE(AVG(rating), 0) as average_rating
            FROM admin_reviews
            WHERE admin_id = %s
        """, (admin_id,))
        reviews_stats = cursor.fetchone()
        total_reviews = reviews_stats[0] or 0
        rating = round(float(reviews_stats[1]), 1) if reviews_stats[1] else 0.0

        cursor.close()
        conn.close()

        # Build response
        profile = {
            "id": admin_row[0],
            "email": admin_row[1] or [],
            "first_name": admin_row[2],
            "father_name": admin_row[3],
            "grandfather_name": admin_row[4],
            "phone_number": admin_row[5] or [],
            "departments": admin_row[6] if admin_row[6] else [],
            "created_at": admin_row[7].isoformat() if admin_row[7] else None,
            # From manage_courses_profile
            "username": courses_profile_row[1] if courses_profile_row else None,
            "bio": courses_profile_row[2] if courses_profile_row else None,
            "quote": courses_profile_row[3] if courses_profile_row else None,
            "location": courses_profile_row[4] if courses_profile_row else None,
            "cover_picture": courses_profile_row[5] if courses_profile_row else None,
            "profile_picture": courses_profile_row[6] if courses_profile_row else None,
            "languages": courses_profile_row[7] if courses_profile_row else [],
            "hero_title": courses_profile_row[8] if courses_profile_row else None,
            "hero_subtitle": courses_profile_row[9] if courses_profile_row else None,
            "badges": courses_profile_row[10] if courses_profile_row else [],
            "allow_location": courses_profile_row[13] if courses_profile_row else False,
            "display_location": courses_profile_row[14] if courses_profile_row and len(courses_profile_row) > 14 else True,
            # From admin_reviews (live calculation)
            "rating": rating,
            "total_reviews": total_reviews
        }

        return profile

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch admin profile: {str(e)}")

# ============================================
# REVIEWS ENDPOINTS (from astegni_admin_db)
# ============================================

@router.get("/reviews/{admin_id}")
async def get_admin_reviews(admin_id: int, limit: int = 10):
    """Get admin reviews from astegni_admin_db"""
    try:
        conn = get_admin_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, review_id, admin_id, admin_name, reviewer_name, reviewer_role,
                   rating, response_time_rating, accuracy_rating, comment, review_type,
                   related_course_id, metrics, created_at, department
            FROM admin_reviews
            WHERE admin_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """, (admin_id, limit))

        reviews = []
        for row in cursor.fetchall():
            reviews.append({
                "id": row[0],
                "review_id": row[1],
                "admin_id": row[2],
                "admin_name": row[3],
                "reviewer_name": row[4],
                "reviewer_role": row[5],
                "rating": float(row[6]) if row[6] else 0.0,
                "response_time_rating": float(row[7]) if row[7] else None,
                "accuracy_rating": float(row[8]) if row[8] else None,
                "comment": row[9],
                "review_type": row[10],
                "related_course_id": row[11],
                "metrics": row[12] if row[12] else {},
                "created_at": row[13].isoformat() if row[13] else None,
                "department": row[14]
            })

        cursor.close()
        conn.close()

        return {"reviews": reviews, "count": len(reviews)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch admin reviews: {str(e)}")

@router.get("/reviews/stats/{admin_id}")
async def get_admin_review_stats(admin_id: int):
    """Get admin review statistics from astegni_admin_db"""
    try:
        conn = get_admin_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                COUNT(*) as total_reviews,
                COALESCE(AVG(rating), 0) as average_rating,
                COALESCE(AVG(response_time_rating), 0) as avg_response_time,
                COALESCE(AVG(accuracy_rating), 0) as avg_accuracy
            FROM admin_reviews
            WHERE admin_id = %s
        """, (admin_id,))

        row = cursor.fetchone()
        cursor.close()
        conn.close()

        return {
            "total_reviews": row[0] or 0,
            "average_rating": float(row[1]) if row[1] else 0.0,
            "avg_response_time": float(row[2]) if row[2] else 0.0,
            "avg_accuracy": float(row[3]) if row[3] else 0.0
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch review stats: {str(e)}")

# ============================================
# COURSE ENDPOINTS (from astegni_user_db - courses table)
# Uses status field: pending, verified, rejected, suspended
# ============================================

@router.get("/pending")
async def get_pending_courses():
    """Get all pending courses from astegni_user_db courses table"""
    try:
        conn = get_user_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT c.id, c.uploader_id, c.course_name, c.course_category, c.course_level,
                   c.course_description, c.thumbnail, c.duration, c.lessons,
                   c.lesson_title, c.language, c.rating, c.rating_count,
                   c.created_at, c.updated_at, c.status, c.status_by, c.status_reason, c.status_at,
                   u.first_name, u.email
            FROM courses c
            LEFT JOIN users u ON c.uploader_id = u.id
            WHERE c.status = 'pending'
            ORDER BY c.created_at DESC
        """)

        courses = []
        for row in cursor.fetchall():
            requester_name = row[19] or row[20] or f"User {row[1]}" if row[1] else "Unknown"
            courses.append({
                "id": row[0],
                "request_id": f"REQ-{row[0]:06d}",
                "uploader_id": row[1],
                "course_name": row[2],
                "course_category": row[3],
                "course_level": row[4],
                "course_description": row[5],
                "thumbnail": row[6],
                "duration": row[7] or 0,
                "lessons": row[8] or 0,
                "lesson_title": row[9] if row[9] else [],
                "language": row[10] if row[10] else ["English"],
                "rating": float(row[11]) if row[11] else 0.0,
                "rating_count": row[12] or 0,
                "created_at": row[13].isoformat() if row[13] else None,
                "updated_at": row[14].isoformat() if row[14] else None,
                "status": row[15] or "pending",
                "status_by": row[16],
                "status_reason": row[17],
                "status_at": row[18].isoformat() if row[18] else None,
                "requested_by": requester_name,
                # Aliases for frontend compatibility
                "title": row[2],
                "category": row[3],
                "level": row[4],
                "description": row[5]
            })

        cursor.close()
        conn.close()

        return {"courses": courses, "count": len(courses)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch pending courses: {str(e)}")

@router.get("/verified")
async def get_verified_courses():
    """Get all verified/active courses from astegni_user_db courses table"""
    try:
        conn = get_user_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT c.id, c.uploader_id, c.course_name, c.course_category, c.course_level,
                   c.course_description, c.thumbnail, c.duration, c.lessons,
                   c.lesson_title, c.language, c.rating, c.rating_count,
                   c.created_at, c.updated_at, c.status, c.status_by, c.status_reason, c.status_at,
                   u.first_name, u.email
            FROM courses c
            LEFT JOIN users u ON c.uploader_id = u.id
            WHERE c.status = 'verified'
            ORDER BY c.status_at DESC NULLS LAST, c.created_at DESC
        """)

        courses = []
        for row in cursor.fetchall():
            uploader_name = row[19] or row[20] or f"User {row[1]}" if row[1] else "Unknown"
            courses.append({
                "id": row[0],
                "course_id": f"CRS-{row[0]:03d}",
                "uploader_id": row[1],
                "course_name": row[2],
                "course_category": row[3],
                "course_level": row[4],
                "course_description": row[5],
                "thumbnail": row[6],
                "duration": row[7] or 0,
                "lessons": row[8] or 0,
                "lesson_title": row[9] if row[9] else [],
                "language": row[10] if row[10] else ["English"],
                "rating": float(row[11]) if row[11] else 0.0,
                "rating_count": row[12] or 0,
                "created_at": row[13].isoformat() if row[13] else None,
                "updated_at": row[14].isoformat() if row[14] else None,
                "status": row[15],
                "status_by": row[16],
                "status_at": row[18].isoformat() if row[18] else None,
                "requested_by": uploader_name,
                "enrolled_students": row[12] or 0,
                "notification_sent": False,
                # Aliases for frontend compatibility
                "title": row[2],
                "category": row[3],
                "level": row[4],
                "description": row[5]
            })

        cursor.close()
        conn.close()

        return {"courses": courses, "count": len(courses)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch verified courses: {str(e)}")

@router.get("/rejected")
async def get_rejected_courses():
    """Get all rejected courses from astegni_user_db courses table"""
    try:
        conn = get_user_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT c.id, c.uploader_id, c.course_name, c.course_category, c.course_level,
                   c.course_description, c.thumbnail, c.duration, c.lessons,
                   c.lesson_title, c.language, c.rating, c.rating_count,
                   c.created_at, c.updated_at, c.status, c.status_by, c.status_reason, c.status_at,
                   u.first_name, u.email
            FROM courses c
            LEFT JOIN users u ON c.uploader_id = u.id
            WHERE c.status = 'rejected'
            ORDER BY c.status_at DESC
        """)

        courses = []
        for row in cursor.fetchall():
            requester_name = row[19] or row[20] or f"User {row[1]}" if row[1] else "Unknown"
            courses.append({
                "id": row[0],
                "rejected_id": f"REJ-{row[0]:06d}",
                "uploader_id": row[1],
                "course_name": row[2],
                "course_category": row[3],
                "course_level": row[4],
                "course_description": row[5],
                "thumbnail": row[6],
                "duration": row[7] or 0,
                "lessons": row[8] or 0,
                "lesson_title": row[9] if row[9] else [],
                "language": row[10] if row[10] else ["English"],
                "rating": float(row[11]) if row[11] else 0.0,
                "rating_count": row[12] or 0,
                "created_at": row[13].isoformat() if row[13] else None,
                "updated_at": row[14].isoformat() if row[14] else None,
                "status": row[15],
                "status_by": row[16],
                "rejection_reason": row[17],
                "rejected_at": row[18].isoformat() if row[18] else None,
                "requested_by": requester_name,
                # Aliases for frontend compatibility
                "title": row[2],
                "category": row[3],
                "level": row[4],
                "description": row[5]
            })

        cursor.close()
        conn.close()

        return {"courses": courses, "count": len(courses)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch rejected courses: {str(e)}")

@router.get("/suspended")
async def get_suspended_courses():
    """Get all suspended courses from astegni_user_db courses table"""
    try:
        conn = get_user_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT c.id, c.uploader_id, c.course_name, c.course_category, c.course_level,
                   c.course_description, c.thumbnail, c.duration, c.lessons,
                   c.lesson_title, c.language, c.rating, c.rating_count,
                   c.created_at, c.updated_at, c.status, c.status_by, c.status_reason, c.status_at,
                   u.first_name, u.email
            FROM courses c
            LEFT JOIN users u ON c.uploader_id = u.id
            WHERE c.status = 'suspended'
            ORDER BY c.status_at DESC
        """)

        courses = []
        for row in cursor.fetchall():
            requester_name = row[19] or row[20] or f"User {row[1]}" if row[1] else "Unknown"
            courses.append({
                "id": row[0],
                "suspended_id": f"SUS-{row[0]:06d}",
                "uploader_id": row[1],
                "course_name": row[2],
                "course_category": row[3],
                "course_level": row[4],
                "course_description": row[5],
                "thumbnail": row[6],
                "duration": row[7] or 0,
                "lessons": row[8] or 0,
                "lesson_title": row[9] if row[9] else [],
                "language": row[10] if row[10] else ["English"],
                "rating": float(row[11]) if row[11] else 0.0,
                "rating_count": row[12] or 0,
                "created_at": row[13].isoformat() if row[13] else None,
                "updated_at": row[14].isoformat() if row[14] else None,
                "status": row[15],
                "status_by": row[16],
                "suspension_reason": row[17],
                "suspended_at": row[18].isoformat() if row[18] else None,
                "requested_by": requester_name,
                # Aliases for frontend compatibility
                "title": row[2],
                "category": row[3],
                "level": row[4],
                "description": row[5]
            })

        cursor.close()
        conn.close()

        return {"courses": courses, "count": len(courses)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch suspended courses: {str(e)}")

# ============================================
# STATISTICS ENDPOINTS
# ============================================

@router.get("/stats")
async def get_course_statistics():
    """Get course statistics grouped by status from astegni_user_db"""
    try:
        conn = get_user_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT status, COUNT(*) as count
            FROM courses
            GROUP BY status
        """)

        stats = {"pending": 0, "verified": 0, "rejected": 0, "suspended": 0, "total": 0}
        for row in cursor.fetchall():
            status_val = row[0] or "pending"
            count = row[1]
            stats[status_val] = count
            stats["total"] += count

        # Get additional statistics
        cursor.execute("""
            SELECT
                COALESCE(AVG(rating), 0) as avg_rating,
                COALESCE(SUM(rating_count), 0) as total_students
            FROM courses
            WHERE status = 'verified'
        """)

        extra_stats = cursor.fetchone()
        stats["avg_rating"] = float(extra_stats[0]) if extra_stats[0] else 0.0
        stats["total_students"] = int(extra_stats[1]) if extra_stats[1] else 0

        cursor.close()
        conn.close()

        return stats

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch course stats: {str(e)}")

@router.get("/stats/by-status")
async def get_courses_stats_by_status():
    """Get detailed course statistics by status for dashboard"""
    try:
        conn = get_user_db_connection()
        cursor = conn.cursor()

        # Get counts by status
        cursor.execute("""
            SELECT status, COUNT(*) as count
            FROM courses
            GROUP BY status
        """)

        status_counts = {"pending": 0, "verified": 0, "rejected": 0, "suspended": 0}
        for row in cursor.fetchall():
            status_val = row[0] or "pending"
            if status_val in status_counts:
                status_counts[status_val] = row[1]

        # Get today's approved courses
        cursor.execute("""
            SELECT COUNT(*) FROM courses
            WHERE status = 'verified' AND DATE(status_at) = CURRENT_DATE
        """)
        approved_today = cursor.fetchone()[0] or 0

        # Get under review count (courses being actively reviewed - for now same as pending)
        under_review = status_counts["pending"]

        cursor.close()
        conn.close()

        return {
            "new": status_counts["pending"],
            "under_review": under_review,
            "approved_today": approved_today,
            "rejected_total": status_counts["rejected"],
            "verified": status_counts["verified"],
            "suspended": status_counts["suspended"],
            "pending": status_counts["pending"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch request stats: {str(e)}")

# ============================================
# STATUS CHANGE ENDPOINTS
# ============================================

@router.post("/{course_id}/verify")
async def verify_course(course_id: int, authorization: str = Header(None)):
    """Verify/approve a pending course"""
    try:
        admin_id = get_admin_id_from_token(authorization)

        conn = get_user_db_connection()
        cursor = conn.cursor()

        # Verify course exists and is pending
        cursor.execute("""
            SELECT id, status FROM courses WHERE id = %s
        """, (course_id,))

        row = cursor.fetchone()
        if not row:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Course not found")

        if row[1] != 'pending':
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail=f"Course is not pending (current status: {row[1]})")

        # Update status to verified
        cursor.execute("""
            UPDATE courses
            SET status = 'verified', status_by = %s, status_at = %s, updated_at = %s
            WHERE id = %s
        """, (admin_id, datetime.now(timezone.utc), datetime.now(timezone.utc), course_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": "Course verified successfully",
            "course_id": f"CRS-{course_id:03d}",
            "id": course_id,
            "status": "verified"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to verify course: {str(e)}")

@router.post("/{course_id}/reject")
async def reject_course(course_id: int, rejection: StatusUpdateRequest, authorization: str = Header(None)):
    """Reject a course"""
    try:
        admin_id = get_admin_id_from_token(authorization)

        conn = get_user_db_connection()
        cursor = conn.cursor()

        # Verify course exists
        cursor.execute("SELECT id FROM courses WHERE id = %s", (course_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Course not found")

        # Update status to rejected
        cursor.execute("""
            UPDATE courses
            SET status = 'rejected', status_by = %s, status_reason = %s,
                status_at = %s, updated_at = %s
            WHERE id = %s
        """, (admin_id, rejection.reason, datetime.now(timezone.utc),
              datetime.now(timezone.utc), course_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": "Course rejected",
            "rejected_id": f"REJ-{course_id:06d}",
            "reason": rejection.reason,
            "status": "rejected"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reject course: {str(e)}")

@router.post("/{course_id}/suspend")
async def suspend_course(course_id: int, suspension: StatusUpdateRequest, authorization: str = Header(None)):
    """Suspend a verified course"""
    try:
        admin_id = get_admin_id_from_token(authorization)

        conn = get_user_db_connection()
        cursor = conn.cursor()

        # Verify course exists
        cursor.execute("SELECT id FROM courses WHERE id = %s", (course_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Course not found")

        # Update status to suspended
        cursor.execute("""
            UPDATE courses
            SET status = 'suspended', status_by = %s, status_reason = %s,
                status_at = %s, updated_at = %s
            WHERE id = %s
        """, (admin_id, suspension.reason, datetime.now(timezone.utc),
              datetime.now(timezone.utc), course_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": "Course suspended successfully",
            "suspended_id": f"SUS-{course_id:06d}",
            "reason": suspension.reason,
            "status": "suspended"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to suspend course: {str(e)}")

@router.post("/{course_id}/reinstate")
async def reinstate_course(course_id: int, authorization: str = Header(None)):
    """Reinstate a suspended course back to verified"""
    try:
        admin_id = get_admin_id_from_token(authorization)

        conn = get_user_db_connection()
        cursor = conn.cursor()

        # Verify course exists and is suspended
        cursor.execute("""
            SELECT id, status FROM courses WHERE id = %s
        """, (course_id,))

        row = cursor.fetchone()
        if not row:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Course not found")

        if row[1] != 'suspended':
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail=f"Course is not suspended (current status: {row[1]})")

        # Update status back to verified
        cursor.execute("""
            UPDATE courses
            SET status = 'verified', status_by = %s, status_reason = NULL,
                status_at = %s, updated_at = %s
            WHERE id = %s
        """, (admin_id, datetime.now(timezone.utc), datetime.now(timezone.utc), course_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": "Course reinstated successfully",
            "course_id": f"CRS-{course_id:03d}",
            "id": course_id,
            "status": "verified"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reinstate course: {str(e)}")

@router.post("/{course_id}/reconsider")
async def reconsider_course(course_id: int, authorization: str = Header(None)):
    """Reconsider a rejected course - move back to pending"""
    try:
        admin_id = get_admin_id_from_token(authorization)

        conn = get_user_db_connection()
        cursor = conn.cursor()

        # Verify course exists and is rejected
        cursor.execute("""
            SELECT id, status FROM courses WHERE id = %s
        """, (course_id,))

        row = cursor.fetchone()
        if not row:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Course not found")

        if row[1] != 'rejected':
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail=f"Course is not rejected (current status: {row[1]})")

        # Update status back to pending
        cursor.execute("""
            UPDATE courses
            SET status = 'pending', status_by = %s, status_reason = NULL,
                status_at = %s, updated_at = %s
            WHERE id = %s
        """, (admin_id, datetime.now(timezone.utc), datetime.now(timezone.utc), course_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": "Course moved back to pending",
            "request_id": f"REQ-{course_id:06d}",
            "status": "pending"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reconsider course: {str(e)}")
