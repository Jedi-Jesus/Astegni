"""
Course Management API Endpoints
Handles course requests, approvals, rejections, suspensions

Uses SINGLE TABLE approach:
- 'courses' table with 'status' field (pending, verified, rejected, suspended)

Table Structure:
- courses: id, uploader_id, course_name, course_category, course_description, course_level,
           thumbnail, duration, lessons, lesson_title[], language[],
           rating, rating_count, created_at, updated_at,
           status, status_by, status_reason, status_at
"""

import os
import sys
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel
import psycopg
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create router
router = APIRouter(prefix="/api/course-management", tags=["course-management"])

# ============================================
# PYDANTIC MODELS
# ============================================

class CourseRequestCreate(BaseModel):
    """Model for creating a course request"""
    course_name: str
    course_category: str
    course_level: Optional[str] = None
    course_description: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[int] = 0
    lessons: Optional[int] = 0
    lesson_title: Optional[List[str]] = []
    language: Optional[List[str]] = ["English"]
    tags: Optional[List[str]] = []

class StatusUpdateRequest(BaseModel):
    """Model for updating status (approve/reject/suspend)"""
    reason: Optional[str] = None

class NotificationRequest(BaseModel):
    message: str
    target_audience: str

class CourseUpdateRequest(BaseModel):
    """Model for updating course details"""
    course_name: Optional[str] = None
    course_category: Optional[str] = None
    course_level: Optional[str] = None
    course_description: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[int] = None
    lessons: Optional[int] = None
    lesson_title: Optional[List[str]] = None
    language: Optional[List[str]] = None
    tags: Optional[List[str]] = None

# ============================================
# DATABASE CONNECTION HELPERS
# ============================================

# Database URLs - use astegni_user_db for course data, astegni_admin_db for portfolio
USER_DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)
ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

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

def get_db_connection():
    """Get user database connection (astegni_user_db) for course data"""
    params = parse_database_url(USER_DATABASE_URL)
    return psycopg.connect(**params)

def get_admin_db_connection():
    """Get admin database connection (astegni_admin_db) for portfolio tracking"""
    params = parse_database_url(ADMIN_DATABASE_URL)
    return psycopg.connect(**params)

def update_admin_portfolio(admin_id: int, action_type: str, course_id: int = None, course_name: str = None):
    """
    Update admin_portfolio table when an action is taken.

    action_type can be: 'courses_verified', 'courses_rejected', 'courses_suspended', 'courses_reactivated'
    """
    if not admin_id:
        return  # Skip if no admin_id

    try:
        conn = get_admin_db_connection()
        cursor = conn.cursor()

        # Check if portfolio exists for this admin
        cursor.execute("SELECT id FROM admin_portfolio WHERE admin_id = %s", (admin_id,))
        portfolio = cursor.fetchone()

        if not portfolio:
            # Create portfolio entry for this admin
            cursor.execute("""
                INSERT INTO admin_portfolio (admin_id, departments, total_actions, created_at, updated_at)
                VALUES (%s, '["courses"]'::jsonb, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
            """, (admin_id,))
            portfolio_id = cursor.fetchone()[0]
        else:
            portfolio_id = portfolio[0]

        # Update the specific action counter and total_actions
        cursor.execute(f"""
            UPDATE admin_portfolio
            SET {action_type} = COALESCE({action_type}, 0) + 1,
                total_actions = COALESCE(total_actions, 0) + 1,
                updated_at = CURRENT_TIMESTAMP,
                recent_actions = (
                    SELECT jsonb_agg(action)
                    FROM (
                        SELECT * FROM jsonb_array_elements(
                            COALESCE(recent_actions, '[]'::jsonb) ||
                            jsonb_build_object(
                                'action', %s,
                                'course_id', %s,
                                'course_name', %s,
                                'timestamp', to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD HH24:MI:SS')
                            )
                        ) AS action
                        ORDER BY action->>'timestamp' DESC
                        LIMIT 50
                    ) AS recent
                )
            WHERE admin_id = %s
        """, (action_type, course_id, course_name, admin_id))

        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Warning: Failed to update admin_portfolio: {e}")

# ============================================
# COURSE ENDPOINTS - SINGLE TABLE (courses with status field)
# Status values: pending, verified, rejected, suspended
# ============================================

@router.get("/requests")
async def get_pending_requests():
    """Get all pending course requests from courses table"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT c.id, c.uploader_id, c.course_name, c.course_category, c.course_level,
                   c.course_description, c.thumbnail, c.duration, c.lessons,
                   c.lesson_title, c.language, c.status, c.status_by, c.status_reason,
                   c.status_at, c.created_at, c.updated_at, c.rating, c.rating_count,
                   u.first_name, u.email
            FROM courses c
            LEFT JOIN users u ON c.uploader_id = u.id
            WHERE c.status = 'pending' OR c.status IS NULL
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
                "status": row[11] or "pending",
                "status_by": row[12],
                "status_reason": row[13],
                "status_at": row[14].isoformat() if row[14] else None,
                "created_at": row[15].isoformat() if row[15] else None,
                "updated_at": row[16].isoformat() if row[16] else None,
                "rating": float(row[17]) if row[17] else 0.0,
                "rating_count": row[18] or 0,
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
        raise HTTPException(status_code=500, detail=f"Failed to fetch pending requests: {str(e)}")

@router.get("/active")
async def get_active_courses():
    """Get all verified/active courses from courses table"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT c.id, c.uploader_id, c.course_name, c.course_category, c.course_level,
                   c.course_description, c.thumbnail, c.duration, c.lessons,
                   c.lesson_title, c.language, c.status, c.status_by, c.status_reason,
                   c.status_at, c.created_at, c.updated_at, c.rating, c.rating_count,
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
                "status": row[11],
                "status_by": row[12],
                "status_at": row[14].isoformat() if row[14] else None,
                "created_at": row[15].isoformat() if row[15] else None,
                "updated_at": row[16].isoformat() if row[16] else None,
                "rating": float(row[17]) if row[17] else 0.0,
                "rating_count": row[18] or 0,
                "requested_by": uploader_name,
                "enrolled_students": row[18] or 0,
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
        raise HTTPException(status_code=500, detail=f"Failed to fetch active courses: {str(e)}")


@router.get("/search")
async def search_verified_courses(q: str = "", limit: int = 10):
    """
    Search verified courses by name, category, or level.
    Used by tutors to find and add courses to their packages.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        search_term = f"%{q.lower()}%"

        cursor.execute("""
            SELECT id, course_name, course_category, course_level,
                   course_description, thumbnail, duration, lessons,
                   lesson_title, language, rating, rating_count
            FROM courses
            WHERE status = 'verified'
            AND (
                LOWER(course_name) LIKE %s
                OR LOWER(course_category) LIKE %s
                OR LOWER(course_level) LIKE %s
            )
            ORDER BY
                CASE WHEN LOWER(course_name) LIKE %s THEN 0 ELSE 1 END,
                rating DESC NULLS LAST,
                course_name ASC
            LIMIT %s
        """, (search_term, search_term, search_term, search_term, limit))

        courses = []
        for row in cursor.fetchall():
            courses.append({
                "id": row[0],
                "course_name": row[1],
                "course_category": row[2],
                "course_level": row[3],
                "course_description": row[4],
                "thumbnail": row[5],
                "duration": row[6] or 0,
                "lessons": row[7] or 0,
                "lesson_title": row[8] if row[8] else [],
                "language": row[9] if row[9] else ["English"],
                "rating": float(row[10]) if row[10] else 0.0,
                "rating_count": row[11] or 0,
                # Aliases for frontend compatibility
                "name": row[1],
                "category": row[2],
                "level": row[3],
                "description": row[4]
            })

        cursor.close()
        conn.close()

        return {"courses": courses, "count": len(courses)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search courses: {str(e)}")


@router.get("/rejected")
async def get_rejected_courses():
    """Get all rejected courses from courses table"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT c.id, c.uploader_id, c.course_name, c.course_category, c.course_level,
                   c.course_description, c.thumbnail, c.duration, c.lessons,
                   c.lesson_title, c.language, c.status, c.status_by, c.status_reason,
                   c.status_at, c.created_at, c.updated_at, c.rating, c.rating_count,
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
                "status": row[11],
                "status_by": row[12],
                "rejection_reason": row[13],
                "rejected_at": row[14].isoformat() if row[14] else None,
                "created_at": row[15].isoformat() if row[15] else None,
                "updated_at": row[16].isoformat() if row[16] else None,
                "rating": float(row[17]) if row[17] else 0.0,
                "rating_count": row[18] or 0,
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
    """Get all suspended courses from courses table"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT c.id, c.uploader_id, c.course_name, c.course_category, c.course_level,
                   c.course_description, c.thumbnail, c.duration, c.lessons,
                   c.lesson_title, c.language, c.status, c.status_by, c.status_reason,
                   c.status_at, c.created_at, c.updated_at, c.rating, c.rating_count,
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
                "status": row[11],
                "status_by": row[12],
                "suspension_reason": row[13],
                "suspended_at": row[14].isoformat() if row[14] else None,
                "created_at": row[15].isoformat() if row[15] else None,
                "updated_at": row[16].isoformat() if row[16] else None,
                "rating": float(row[17]) if row[17] else 0.0,
                "rating_count": row[18] or 0,
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

@router.get("/stats")
async def get_course_statistics():
    """Get course statistics grouped by status"""
    try:
        conn = get_db_connection()
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
            if status_val in stats:
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

# ============================================
# STATUS CHANGE ENDPOINTS
# ============================================

@router.post("/{request_id}/approve")
async def approve_course(request_id: str, admin_id: Optional[int] = None):
    """Approve a pending course - change status from pending to verified"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Extract numeric ID
        if request_id.startswith("REQ-"):
            numeric_id = int(request_id.replace("REQ-", ""))
        else:
            numeric_id = int(request_id)

        # Get course data and verify it's pending
        cursor.execute("""
            SELECT id, uploader_id, course_name, status FROM courses
            WHERE id = %s
        """, (numeric_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Course not found")

        if row[3] not in ('pending', None):
            raise HTTPException(status_code=400, detail=f"Course is not pending (current status: {row[3]})")

        # Update status to verified
        cursor.execute("""
            UPDATE courses
            SET status = 'verified', status_by = %s, status_at = %s, updated_at = %s
            WHERE id = %s
        """, (admin_id, datetime.now(timezone.utc), datetime.now(timezone.utc), numeric_id))

        conn.commit()

        # Send notification
        if row[1]:
            try:
                cursor.execute("""
                    INSERT INTO notifications (user_id, title, message, type, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, (row[1], "Course Approved",
                      f"Your course '{row[2]}' has been approved!",
                      "course_approved", datetime.now(timezone.utc)))
                conn.commit()
            except:
                pass

        cursor.close()
        conn.close()

        # Update admin portfolio
        update_admin_portfolio(admin_id, 'courses_verified', numeric_id, row[2])

        return {
            "message": "Course approved successfully",
            "course_id": f"CRS-{numeric_id:03d}",
            "id": numeric_id,
            "status": "verified"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to approve course: {str(e)}")

@router.post("/{request_id}/reject")
async def reject_course(request_id: str, rejection: StatusUpdateRequest, admin_id: Optional[int] = None):
    """Reject a pending course - change status from pending to rejected"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Extract numeric ID
        if request_id.startswith("REQ-"):
            numeric_id = int(request_id.replace("REQ-", ""))
        else:
            numeric_id = int(request_id)

        # Get course data
        cursor.execute("""
            SELECT id, uploader_id, course_name, status FROM courses
            WHERE id = %s
        """, (numeric_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Course not found")

        if row[3] not in ('pending', None):
            raise HTTPException(status_code=400, detail=f"Course is not pending (current status: {row[3]})")

        # Update status to rejected
        cursor.execute("""
            UPDATE courses
            SET status = 'rejected', status_by = %s, status_reason = %s, status_at = %s, updated_at = %s
            WHERE id = %s
        """, (admin_id, rejection.reason, datetime.now(timezone.utc), datetime.now(timezone.utc), numeric_id))

        conn.commit()

        # Send notification
        if row[1]:
            try:
                cursor.execute("""
                    INSERT INTO notifications (user_id, title, message, type, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, (row[1], "Course Rejected",
                      f"Your course '{row[2]}' has been rejected. Reason: {rejection.reason}",
                      "course_rejected", datetime.now(timezone.utc)))
                conn.commit()
            except:
                pass

        cursor.close()
        conn.close()

        # Update admin portfolio
        update_admin_portfolio(admin_id, 'courses_rejected', numeric_id, row[2])

        return {
            "message": "Course rejected successfully",
            "rejected_id": f"REJ-{numeric_id:06d}",
            "reason": rejection.reason,
            "status": "rejected"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reject course: {str(e)}")

@router.post("/{course_id}/suspend")
async def suspend_course(course_id: str, suspension: StatusUpdateRequest, admin_id: Optional[int] = None):
    """Suspend a verified course - change status from verified to suspended"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Extract numeric ID
        if course_id.startswith("CRS-"):
            numeric_id = int(course_id.replace("CRS-", ""))
        else:
            numeric_id = int(course_id)

        # Get course data
        cursor.execute("""
            SELECT id, uploader_id, course_name, status FROM courses
            WHERE id = %s
        """, (numeric_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Course not found")

        if row[3] != 'verified':
            raise HTTPException(status_code=400, detail=f"Course is not verified (current status: {row[3]})")

        # Update status to suspended
        cursor.execute("""
            UPDATE courses
            SET status = 'suspended', status_by = %s, status_reason = %s, status_at = %s, updated_at = %s
            WHERE id = %s
        """, (admin_id, suspension.reason, datetime.now(timezone.utc), datetime.now(timezone.utc), numeric_id))

        conn.commit()

        # Send notification
        if row[1]:
            try:
                cursor.execute("""
                    INSERT INTO notifications (user_id, title, message, type, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, (row[1], "Course Suspended",
                      f"Your course '{row[2]}' has been suspended. Reason: {suspension.reason}",
                      "course_suspended", datetime.now(timezone.utc)))
                conn.commit()
            except:
                pass

        cursor.close()
        conn.close()

        # Update admin portfolio
        update_admin_portfolio(admin_id, 'courses_suspended', numeric_id, row[2])

        return {
            "message": "Course suspended successfully",
            "suspended_id": f"SUS-{numeric_id:06d}",
            "reason": suspension.reason,
            "status": "suspended"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to suspend course: {str(e)}")

@router.post("/{suspended_id}/reinstate")
async def reinstate_course(suspended_id: str, admin_id: Optional[int] = None):
    """Reinstate a suspended course - change status from suspended to verified"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Extract numeric ID
        if suspended_id.startswith("SUS-"):
            numeric_id = int(suspended_id.replace("SUS-", ""))
        else:
            numeric_id = int(suspended_id)

        # Get course data
        cursor.execute("""
            SELECT id, uploader_id, course_name, status FROM courses
            WHERE id = %s
        """, (numeric_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Course not found")

        if row[3] not in ('suspended', 'reported'):
            raise HTTPException(status_code=400, detail=f"Course cannot be reinstated (current status: {row[3]})")

        # Update status to verified
        cursor.execute("""
            UPDATE courses
            SET status = 'verified', status_by = %s, status_reason = NULL, status_at = %s, updated_at = %s
            WHERE id = %s
        """, (admin_id, datetime.now(timezone.utc), datetime.now(timezone.utc), numeric_id))

        conn.commit()
        cursor.close()
        conn.close()

        # Update admin portfolio
        update_admin_portfolio(admin_id, 'courses_reactivated', numeric_id, row[2])

        return {
            "message": "Course reinstated successfully",
            "course_id": f"CRS-{numeric_id:03d}",
            "id": numeric_id,
            "status": "verified"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reinstate course: {str(e)}")

@router.post("/{rejected_id}/reconsider")
async def reconsider_course(rejected_id: str, admin_id: Optional[int] = None):
    """Reconsider a rejected course - change status from rejected to pending"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Extract numeric ID
        if rejected_id.startswith("REJ-"):
            numeric_id = int(rejected_id.replace("REJ-", ""))
        else:
            numeric_id = int(rejected_id)

        # Get course data
        cursor.execute("""
            SELECT id, uploader_id, course_name, status FROM courses
            WHERE id = %s
        """, (numeric_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Course not found")

        if row[3] != 'rejected':
            raise HTTPException(status_code=400, detail=f"Course is not rejected (current status: {row[3]})")

        # Update status to pending
        cursor.execute("""
            UPDATE courses
            SET status = 'pending', status_by = %s, status_reason = NULL, status_at = %s, updated_at = %s
            WHERE id = %s
        """, (admin_id, datetime.now(timezone.utc), datetime.now(timezone.utc), numeric_id))

        conn.commit()
        cursor.close()
        conn.close()

        # Update admin portfolio
        update_admin_portfolio(admin_id, 'courses_reactivated', numeric_id, row[2])

        return {
            "message": "Course moved back to pending for review",
            "request_id": f"REQ-{numeric_id:06d}",
            "id": numeric_id,
            "status": "pending"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reconsider course: {str(e)}")

@router.post("/{course_id}/reject-active")
async def reject_active_course(course_id: str, rejection: StatusUpdateRequest, admin_id: Optional[int] = None):
    """Reject a verified course - change status from verified to rejected"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Extract numeric ID
        if course_id.startswith("CRS-"):
            numeric_id = int(course_id.replace("CRS-", ""))
        else:
            numeric_id = int(course_id)

        # Get course data
        cursor.execute("""
            SELECT id, uploader_id, course_name, status FROM courses
            WHERE id = %s
        """, (numeric_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Course not found")

        if row[3] not in ('verified', 'reported'):
            raise HTTPException(status_code=400, detail=f"Course cannot be rejected (current status: {row[3]})")

        # Update status to rejected
        cursor.execute("""
            UPDATE courses
            SET status = 'rejected', status_by = %s, status_reason = %s, status_at = %s, updated_at = %s
            WHERE id = %s
        """, (admin_id, rejection.reason, datetime.now(timezone.utc), datetime.now(timezone.utc), numeric_id))

        conn.commit()

        # Send notification
        if row[1]:
            try:
                cursor.execute("""
                    INSERT INTO notifications (user_id, title, message, type, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, (row[1], "Course Rejected",
                      f"Your course '{row[2]}' has been rejected. Reason: {rejection.reason}",
                      "course_rejected", datetime.now(timezone.utc)))
                conn.commit()
            except:
                pass

        cursor.close()
        conn.close()

        # Update admin portfolio
        update_admin_portfolio(admin_id, 'courses_rejected', numeric_id, row[2])

        return {
            "message": "Course rejected successfully",
            "rejected_id": f"REJ-{numeric_id:06d}",
            "reason": rejection.reason,
            "status": "rejected"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reject course: {str(e)}")

@router.post("/{suspended_id}/reject-suspended")
async def reject_suspended_course(suspended_id: str, rejection: StatusUpdateRequest, admin_id: Optional[int] = None):
    """Reject a suspended course - change status from suspended to rejected"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Extract numeric ID
        if suspended_id.startswith("SUS-"):
            numeric_id = int(suspended_id.replace("SUS-", ""))
        else:
            numeric_id = int(suspended_id)

        # Get course data
        cursor.execute("""
            SELECT id, uploader_id, course_name, status FROM courses
            WHERE id = %s
        """, (numeric_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Course not found")

        if row[3] != 'suspended':
            raise HTTPException(status_code=400, detail=f"Course is not suspended (current status: {row[3]})")

        # Update status to rejected
        cursor.execute("""
            UPDATE courses
            SET status = 'rejected', status_by = %s, status_reason = %s, status_at = %s, updated_at = %s
            WHERE id = %s
        """, (admin_id, rejection.reason, datetime.now(timezone.utc), datetime.now(timezone.utc), numeric_id))

        conn.commit()

        # Send notification
        if row[1]:
            try:
                cursor.execute("""
                    INSERT INTO notifications (user_id, title, message, type, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, (row[1], "Course Rejected",
                      f"Your suspended course '{row[2]}' has been rejected. Reason: {rejection.reason}",
                      "course_rejected", datetime.now(timezone.utc)))
                conn.commit()
            except:
                pass

        cursor.close()
        conn.close()

        # Update admin portfolio
        update_admin_portfolio(admin_id, 'courses_rejected', numeric_id, row[2])

        return {
            "message": "Suspended course rejected successfully",
            "rejected_id": f"REJ-{numeric_id:06d}",
            "reason": rejection.reason,
            "status": "rejected"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reject suspended course: {str(e)}")

@router.post("/{course_id}/report")
async def report_course(course_id: str, report: StatusUpdateRequest, current_user = None):
    """
    Report a verified course — called by students or parents.
    Changes status from 'verified' to 'reported' so admin can review.
    The course remains visible until admin acts on the report.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        if course_id.startswith("CRS-"):
            numeric_id = int(course_id.replace("CRS-", ""))
        else:
            numeric_id = int(course_id)

        cursor.execute("""
            SELECT id, uploader_id, course_name, status FROM courses
            WHERE id = %s
        """, (numeric_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Course not found")

        if row[3] != 'verified':
            raise HTTPException(status_code=400, detail=f"Only verified courses can be reported (current status: {row[3]})")

        cursor.execute("""
            UPDATE courses
            SET status = 'reported', status_reason = %s, status_at = %s, updated_at = %s
            WHERE id = %s
        """, (report.reason, datetime.now(timezone.utc), datetime.now(timezone.utc), numeric_id))

        conn.commit()

        # Notify tutor that their course has been reported
        if row[1]:
            try:
                cursor.execute("""
                    INSERT INTO notifications (user_id, title, message, type, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, (row[1], "Course Reported",
                      f"Your course '{row[2]}' has been reported and is under admin review. Reason: {report.reason}",
                      "course_reported", datetime.now(timezone.utc)))
                conn.commit()
            except:
                pass

        cursor.close()
        conn.close()

        return {
            "message": "Course reported successfully. Admin will review it.",
            "course_id": f"CRS-{numeric_id:06d}",
            "id": numeric_id,
            "status": "reported"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to report course: {str(e)}")

# ============================================
# UPDATE ENDPOINTS
# ============================================

@router.put("/requests/{request_id}")
async def update_course_request(request_id: str, update_data: CourseUpdateRequest):
    """Update a course (any status)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Extract numeric ID
        if request_id.startswith("REQ-"):
            numeric_id = int(request_id.replace("REQ-", ""))
        elif request_id.startswith("REJ-"):
            numeric_id = int(request_id.replace("REJ-", ""))
        elif request_id.startswith("CRS-"):
            numeric_id = int(request_id.replace("CRS-", ""))
        elif request_id.startswith("SUS-"):
            numeric_id = int(request_id.replace("SUS-", ""))
        else:
            numeric_id = int(request_id)

        # Build dynamic update query
        update_fields = ["updated_at = %s"]
        params = [datetime.now(timezone.utc)]

        if update_data.course_name is not None:
            update_fields.append("course_name = %s")
            params.append(update_data.course_name)
        if update_data.course_category is not None:
            update_fields.append("course_category = %s")
            params.append(update_data.course_category)
        if update_data.course_level is not None:
            update_fields.append("course_level = %s")
            params.append(update_data.course_level)
        if update_data.course_description is not None:
            update_fields.append("course_description = %s")
            params.append(update_data.course_description)
        if update_data.thumbnail is not None:
            update_fields.append("thumbnail = %s")
            params.append(update_data.thumbnail)
        if update_data.duration is not None:
            update_fields.append("duration = %s")
            params.append(update_data.duration)
        if update_data.lessons is not None:
            update_fields.append("lessons = %s")
            params.append(update_data.lessons)
        if update_data.lesson_title is not None:
            import json
            update_fields.append("lesson_title = %s")
            params.append(json.dumps(update_data.lesson_title))
        if update_data.language is not None:
            import json
            update_fields.append("language = %s")
            params.append(json.dumps(update_data.language))
        if update_data.tags is not None:
            import json
            update_fields.append("tags = %s")
            params.append(json.dumps(update_data.tags))

        params.append(numeric_id)

        cursor.execute(f"""
            UPDATE courses
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, course_name, status
        """, params)

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Course not found")

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": "Course updated successfully",
            "id": result[0],
            "course_name": result[1],
            "status": result[2]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update course: {str(e)}")

# Alias for updating by different ID prefixes
@router.put("/rejected/{course_id}")
async def update_rejected_course(course_id: str, update_data: CourseUpdateRequest):
    """Update a rejected course"""
    return await update_course_request(course_id, update_data)

@router.put("/active/{course_id}")
async def update_active_course(course_id: str, update_data: CourseUpdateRequest):
    """Update an active/verified course"""
    return await update_course_request(course_id, update_data)

@router.put("/suspended/{course_id}")
async def update_suspended_course(course_id: str, update_data: CourseUpdateRequest):
    """Update a suspended course"""
    return await update_course_request(course_id, update_data)

# ============================================
# NOTIFICATION ENDPOINT
# ============================================

@router.post("/{course_id}/notify")
async def send_course_notification(course_id: str, notification: NotificationRequest):
    """Send notification about a course"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Extract numeric ID
        if course_id.startswith("CRS-"):
            numeric_id = int(course_id.replace("CRS-", ""))
        else:
            numeric_id = int(course_id)

        # Verify course exists
        cursor.execute("SELECT id FROM courses WHERE id = %s", (numeric_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Course not found")

        # Insert notification
        cursor.execute("""
            INSERT INTO course_notifications
            (course_id, message, target_audience, sent_at)
            VALUES (%s, %s, %s, %s)
        """, (numeric_id, notification.message, notification.target_audience, datetime.now(timezone.utc)))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": "Notification sent successfully",
            "course_id": course_id,
            "target_audience": notification.target_audience
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send notification: {str(e)}")


# ============================================
# TUTOR COURSES ENDPOINT (used by tutor profile page)
# ============================================

@router.get("/tutor/{tutor_id}/courses")
async def get_tutor_courses(tutor_id: int):
    """Get all verified courses uploaded by a specific tutor"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, course_name, course_category, course_level, status
            FROM courses
            WHERE uploader_id = %s AND status = 'verified'
            ORDER BY created_at DESC
        """, (tutor_id,))

        rows = cursor.fetchall()
        courses = [
            {
                "id": row[0],
                "course_name": row[1],
                "course_category": row[2],
                "course_level": row[3],
                "status": row[4],
            }
            for row in rows
        ]

        categories = list({c["course_category"] for c in courses if c["course_category"]})

        cursor.close()
        conn.close()

        return {"courses": courses, "categories": categories}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tutor courses: {str(e)}")
