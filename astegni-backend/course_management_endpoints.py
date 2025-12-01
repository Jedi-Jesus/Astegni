"""
Course Management API Endpoints
Handles course requests, approvals, rejections, suspensions

Updated to use:
1. 'courses' table for approved/active courses
2. 'requested_courses' table for all request states (pending, approved, rejected, suspended)

Tables:
- courses: id, uploader_id, course_name, course_category, course_description, course_level,
           thumbnail, duration, lessons, lesson_title[], language[],
           approved_by, approved_at, rating, rating_count, created_at, updated_at

- requested_courses: id, requester_id, course_name, course_category, course_description, course_level,
                     thumbnail, duration, lessons, lesson_title[], language[],
                     status (pending/approved/rejected/suspended), status_by, status_reason, status_at,
                     created_at, updated_at
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

class CourseRequestResponse(BaseModel):
    """Response model for requested_courses"""
    id: int
    requester_id: Optional[int] = None
    course_name: str
    course_category: str
    course_level: Optional[str] = None
    course_description: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: int = 0
    lessons: int = 0
    lesson_title: List[str] = []
    language: List[str] = ["English"]
    status: str = "pending"
    status_by: Optional[int] = None
    status_reason: Optional[str] = None
    status_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

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

# ============================================
# DATABASE CONNECTION HELPER
# ============================================

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

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

    conn = psycopg.connect(
        dbname=db_name,
        user=user,
        password=password,
        host=host,
        port=port
    )
    return conn

# ============================================
# REQUESTED COURSES ENDPOINTS
# Status: pending, approved, rejected, suspended
# ============================================

@router.get("/requests")
async def get_pending_requests():
    """Get all pending course requests"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT rc.id, rc.requester_id, rc.course_name, rc.course_category, rc.course_level,
                   rc.course_description, rc.thumbnail, rc.duration, rc.lessons,
                   rc.lesson_title, rc.language, rc.status, rc.status_by, rc.status_reason,
                   rc.status_at, rc.created_at, rc.updated_at,
                   u.username, u.email
            FROM requested_courses rc
            LEFT JOIN users u ON rc.requester_id = u.id
            WHERE rc.status = 'pending'
            ORDER BY rc.created_at DESC
        """)

        courses = []
        for row in cursor.fetchall():
            requester_name = row[17] or row[18] or f"User {row[1]}" if row[1] else "Unknown"
            courses.append({
                "id": row[0],
                "request_id": f"REQ-{row[0]:06d}",
                "requester_id": row[1],
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

@router.get("/rejected")
async def get_rejected_requests():
    """Get all rejected course requests"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT rc.id, rc.requester_id, rc.course_name, rc.course_category, rc.course_level,
                   rc.course_description, rc.thumbnail, rc.duration, rc.lessons,
                   rc.lesson_title, rc.language, rc.status, rc.status_by, rc.status_reason,
                   rc.status_at, rc.created_at, rc.updated_at,
                   u.username, u.email
            FROM requested_courses rc
            LEFT JOIN users u ON rc.requester_id = u.id
            WHERE rc.status = 'rejected'
            ORDER BY rc.status_at DESC
        """)

        courses = []
        for row in cursor.fetchall():
            requester_name = row[17] or row[18] or f"User {row[1]}" if row[1] else "Unknown"
            courses.append({
                "id": row[0],
                "rejected_id": f"REJ-{row[0]:06d}",
                "requester_id": row[1],
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
        raise HTTPException(status_code=500, detail=f"Failed to fetch rejected requests: {str(e)}")

@router.get("/suspended")
async def get_suspended_requests():
    """Get all suspended course requests"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT rc.id, rc.requester_id, rc.course_name, rc.course_category, rc.course_level,
                   rc.course_description, rc.thumbnail, rc.duration, rc.lessons,
                   rc.lesson_title, rc.language, rc.status, rc.status_by, rc.status_reason,
                   rc.status_at, rc.created_at, rc.updated_at,
                   u.username, u.email
            FROM requested_courses rc
            LEFT JOIN users u ON rc.requester_id = u.id
            WHERE rc.status = 'suspended'
            ORDER BY rc.status_at DESC
        """)

        courses = []
        for row in cursor.fetchall():
            requester_name = row[17] or row[18] or f"User {row[1]}" if row[1] else "Unknown"
            courses.append({
                "id": row[0],
                "suspended_id": f"SUS-{row[0]:06d}",
                "requester_id": row[1],
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
        raise HTTPException(status_code=500, detail=f"Failed to fetch suspended requests: {str(e)}")

@router.post("/requests")
async def create_course_request(course: CourseRequestCreate, requester_id: Optional[int] = None):
    """Create a new course request"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        import json
        lesson_title_json = json.dumps(course.lesson_title if course.lesson_title else [])
        language_json = json.dumps(course.language if course.language else ["English"])

        cursor.execute("""
            INSERT INTO requested_courses
            (requester_id, course_name, course_category, course_level, course_description,
             thumbnail, duration, lessons, lesson_title, language,
             status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (requester_id, course.course_name, course.course_category, course.course_level,
              course.course_description, course.thumbnail, course.duration or 0, course.lessons or 0,
              lesson_title_json, language_json, 'pending',
              datetime.now(timezone.utc), datetime.now(timezone.utc)))

        new_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": "Course request created successfully",
            "id": new_id,
            "request_id": f"REQ-{new_id:06d}",
            "status": "pending"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create course request: {str(e)}")

@router.get("/requests/stats/by-status")
async def get_requests_stats():
    """Get count of course requests grouped by status"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT status, COUNT(*) as count
            FROM requested_courses
            GROUP BY status
        """)

        stats = {"pending": 0, "approved": 0, "rejected": 0, "suspended": 0, "total": 0}
        for row in cursor.fetchall():
            status = row[0] or "pending"
            count = row[1]
            stats[status] = count
            stats["total"] += count

        # Get approved courses count from courses table
        cursor.execute("SELECT COUNT(*) FROM courses")
        stats["active_courses"] = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return stats

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch request stats: {str(e)}")

# ============================================
# COURSES ENDPOINTS (Active/Approved Courses)
# ============================================

@router.get("/active")
async def get_active_courses():
    """Get all active/approved courses from courses table"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT c.id, c.uploader_id, c.course_name, c.course_category, c.course_level,
                   c.course_description, c.thumbnail, c.duration, c.lessons,
                   c.lesson_title, c.language, c.approved_by, c.approved_at,
                   c.rating, c.rating_count, c.created_at, c.updated_at,
                   u.username, u.email
            FROM courses c
            LEFT JOIN users u ON c.uploader_id = u.id
            ORDER BY c.approved_at DESC NULLS LAST, c.created_at DESC
        """)

        courses = []
        for row in cursor.fetchall():
            uploader_name = row[17] or row[18] or f"User {row[1]}" if row[1] else "Unknown"
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
                "approved_by": row[11],
                "approved_at": row[12].isoformat() if row[12] else None,
                "rating": float(row[13]) if row[13] else 0.0,
                "rating_count": row[14] or 0,
                "created_at": row[15].isoformat() if row[15] else None,
                "updated_at": row[16].isoformat() if row[16] else None,
                "requested_by": uploader_name,
                "enrolled_students": row[14] or 0,
                "notification_sent": False,
                "status": "active",
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

@router.get("/tutor/{tutor_id}/courses")
async def get_tutor_courses(tutor_id: int):
    """Get all approved courses by a specific tutor (from courses table)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT c.id, c.course_name, c.course_category, c.course_level,
                   c.course_description, c.thumbnail, c.duration, c.lessons,
                   c.lesson_title, c.language, c.rating, c.rating_count,
                   c.approved_at, c.created_at
            FROM courses c
            WHERE c.uploader_id = %s
            ORDER BY c.created_at DESC
        """, (tutor_id,))

        courses = []
        categories = set()
        for row in cursor.fetchall():
            course_category = row[2] or "Uncategorized"
            categories.add(course_category)
            courses.append({
                "id": row[0],
                "course_id": f"CRS-{row[0]:03d}",
                "course_name": row[1],
                "course_category": course_category,
                "course_level": row[3],
                "course_description": row[4],
                "thumbnail": row[5],
                "duration": row[6] or 0,
                "lessons": row[7] or 0,
                "lesson_title": row[8] if row[8] else [],
                "language": row[9] if row[9] else ["English"],
                "rating": float(row[10]) if row[10] else 0.0,
                "rating_count": row[11] or 0,
                "approved_at": row[12].isoformat() if row[12] else None,
                "created_at": row[13].isoformat() if row[13] else None,
                # Aliases for frontend compatibility
                "title": row[1],
                "category": course_category,
                "level": row[3],
                "description": row[4]
            })

        cursor.close()
        conn.close()

        return {
            "courses": courses,
            "count": len(courses),
            "categories": list(categories),
            "tutor_id": tutor_id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tutor courses: {str(e)}")

@router.get("/active/{course_id}")
async def get_active_course(course_id: str):
    """Get specific active course by ID"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Extract numeric ID
        if course_id.startswith("CRS-"):
            numeric_id = int(course_id.replace("CRS-", ""))
        else:
            numeric_id = int(course_id)

        cursor.execute("""
            SELECT c.id, c.uploader_id, c.course_name, c.course_category, c.course_level,
                   c.course_description, c.thumbnail, c.duration, c.lessons,
                   c.lesson_title, c.language, c.approved_by, c.approved_at,
                   c.rating, c.rating_count, c.created_at, c.updated_at,
                   u.username, u.email
            FROM courses c
            LEFT JOIN users u ON c.uploader_id = u.id
            WHERE c.id = %s
        """, (numeric_id,))

        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail="Course not found")

        uploader_name = row[17] or row[18] or f"User {row[1]}" if row[1] else "Unknown"
        return {
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
            "approved_by": row[11],
            "approved_at": row[12].isoformat() if row[12] else None,
            "rating": float(row[13]) if row[13] else 0.0,
            "rating_count": row[14] or 0,
            "created_at": row[15].isoformat() if row[15] else None,
            "updated_at": row[16].isoformat() if row[16] else None,
            "requested_by": uploader_name,
            "title": row[2],
            "category": row[3],
            "level": row[4],
            "description": row[5]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch course: {str(e)}")

# ============================================
# STATUS CHANGE ENDPOINTS
# ============================================

@router.post("/{request_id}/approve")
async def approve_request(request_id: str, admin_id: Optional[int] = None):
    """Approve a pending request and create course in courses table"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Extract numeric ID
        if request_id.startswith("REQ-"):
            numeric_id = int(request_id.replace("REQ-", ""))
        else:
            numeric_id = int(request_id)

        # Get request data
        cursor.execute("""
            SELECT id, requester_id, course_name, course_category, course_level,
                   course_description, thumbnail, duration, lessons, lesson_title, language
            FROM requested_courses
            WHERE id = %s AND status = 'pending'
        """, (numeric_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Pending request not found")

        requester_id = row[1]

        # Insert into courses table
        cursor.execute("""
            INSERT INTO courses
            (uploader_id, course_name, course_category, course_level, course_description,
             thumbnail, duration, lessons, lesson_title, language,
             approved_by, approved_at, rating, rating_count, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (requester_id, row[2], row[3], row[4], row[5],
              row[6], row[7] or 0, row[8] or 0, row[9], row[10],
              admin_id, datetime.now(timezone.utc), 0.0, 0,
              datetime.now(timezone.utc), datetime.now(timezone.utc)))

        new_course_id = cursor.fetchone()[0]

        # Update request status
        cursor.execute("""
            UPDATE requested_courses
            SET status = 'approved', status_by = %s, status_at = %s, updated_at = %s
            WHERE id = %s
        """, (admin_id, datetime.now(timezone.utc), datetime.now(timezone.utc), numeric_id))

        # Update tutor_packages: move from pending_course_ids to course_ids
        # Find packages that have this course in pending_course_ids
        cursor.execute("""
            UPDATE tutor_packages
            SET pending_course_ids = array_remove(pending_course_ids, %s),
                course_ids = array_append(COALESCE(course_ids, '{}'), %s),
                updated_at = CURRENT_TIMESTAMP
            WHERE %s = ANY(pending_course_ids)
        """, (numeric_id, new_course_id, numeric_id))

        conn.commit()

        # Send notification
        if requester_id:
            try:
                cursor.execute("""
                    INSERT INTO notifications (user_id, title, message, type, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, (requester_id, "Course Approved",
                      f"Your course request '{row[2]}' has been approved! Course ID: CRS-{new_course_id:03d}",
                      "course_approved", datetime.now(timezone.utc)))
                conn.commit()
            except:
                pass

        cursor.close()
        conn.close()

        return {
            "message": "Course approved successfully",
            "course_id": f"CRS-{new_course_id:03d}",
            "id": new_course_id,
            "status": "approved"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to approve course: {str(e)}")

@router.post("/{request_id}/reject")
async def reject_request(request_id: str, rejection: StatusUpdateRequest, admin_id: Optional[int] = None):
    """Reject a pending request"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Extract numeric ID
        if request_id.startswith("REQ-"):
            numeric_id = int(request_id.replace("REQ-", ""))
        else:
            numeric_id = int(request_id)

        # Get request data for notification
        cursor.execute("""
            SELECT requester_id, course_name FROM requested_courses
            WHERE id = %s AND status = 'pending'
        """, (numeric_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Pending request not found")

        # Update status
        cursor.execute("""
            UPDATE requested_courses
            SET status = 'rejected', status_by = %s, status_reason = %s, status_at = %s, updated_at = %s
            WHERE id = %s
        """, (admin_id, rejection.reason, datetime.now(timezone.utc), datetime.now(timezone.utc), numeric_id))

        conn.commit()

        # Send notification
        if row[0]:
            try:
                cursor.execute("""
                    INSERT INTO notifications (user_id, title, message, type, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, (row[0], "Course Request Rejected",
                      f"Your course request '{row[1]}' has been rejected. Reason: {rejection.reason}",
                      "course_rejected", datetime.now(timezone.utc)))
                conn.commit()
            except:
                pass

        cursor.close()
        conn.close()

        return {
            "message": "Course request rejected",
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
    """Suspend an active course - moves from courses to requested_courses with suspended status"""
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
            SELECT uploader_id, course_name, course_category, course_level, course_description,
                   thumbnail, duration, lessons, lesson_title, language
            FROM courses
            WHERE id = %s
        """, (numeric_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Course not found")

        # Insert into requested_courses with suspended status
        cursor.execute("""
            INSERT INTO requested_courses
            (requester_id, course_name, course_category, course_level, course_description,
             thumbnail, duration, lessons, lesson_title, language,
             status, status_by, status_reason, status_at, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (row[0], row[1], row[2], row[3], row[4],
              row[5], row[6] or 0, row[7] or 0, row[8], row[9],
              'suspended', admin_id, suspension.reason, datetime.now(timezone.utc),
              datetime.now(timezone.utc), datetime.now(timezone.utc)))

        suspended_id = cursor.fetchone()[0]

        # Delete from courses table
        cursor.execute("DELETE FROM courses WHERE id = %s", (numeric_id,))

        conn.commit()

        # Send notification
        if row[0]:
            try:
                cursor.execute("""
                    INSERT INTO notifications (user_id, title, message, type, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, (row[0], "Course Suspended",
                      f"Your course '{row[1]}' has been suspended. Reason: {suspension.reason}",
                      "course_suspended", datetime.now(timezone.utc)))
                conn.commit()
            except:
                pass

        cursor.close()
        conn.close()

        return {
            "message": "Course suspended successfully",
            "suspended_id": f"SUS-{suspended_id:06d}",
            "reason": suspension.reason,
            "status": "suspended"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to suspend course: {str(e)}")

@router.post("/{suspended_id}/reinstate")
async def reinstate_course(suspended_id: str, admin_id: Optional[int] = None):
    """Reinstate a suspended course - moves back to courses table"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Extract numeric ID
        if suspended_id.startswith("SUS-"):
            numeric_id = int(suspended_id.replace("SUS-", ""))
        else:
            numeric_id = int(suspended_id)

        # Get suspended course data
        cursor.execute("""
            SELECT requester_id, course_name, course_category, course_level, course_description,
                   thumbnail, duration, lessons, lesson_title, language
            FROM requested_courses
            WHERE id = %s AND status = 'suspended'
        """, (numeric_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Suspended course not found")

        # Insert back into courses table
        cursor.execute("""
            INSERT INTO courses
            (uploader_id, course_name, course_category, course_level, course_description,
             thumbnail, duration, lessons, lesson_title, language,
             approved_by, approved_at, rating, rating_count, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (row[0], row[1], row[2], row[3], row[4],
              row[5], row[6] or 0, row[7] or 0, row[8], row[9],
              admin_id, datetime.now(timezone.utc), 0.0, 0,
              datetime.now(timezone.utc), datetime.now(timezone.utc)))

        new_course_id = cursor.fetchone()[0]

        # Delete from requested_courses
        cursor.execute("DELETE FROM requested_courses WHERE id = %s", (numeric_id,))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": "Course reinstated successfully",
            "course_id": f"CRS-{new_course_id:03d}",
            "id": new_course_id,
            "status": "active"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reinstate course: {str(e)}")

@router.post("/{rejected_id}/reconsider")
async def reconsider_request(rejected_id: str, admin_id: Optional[int] = None):
    """Reconsider a rejected request - moves back to pending status"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Extract numeric ID
        if rejected_id.startswith("REJ-"):
            numeric_id = int(rejected_id.replace("REJ-", ""))
        else:
            numeric_id = int(rejected_id)

        # Check if rejected request exists
        cursor.execute("""
            SELECT id FROM requested_courses
            WHERE id = %s AND status = 'rejected'
        """, (numeric_id,))

        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Rejected request not found")

        # Update status back to pending
        cursor.execute("""
            UPDATE requested_courses
            SET status = 'pending', status_by = %s, status_reason = NULL, status_at = %s, updated_at = %s
            WHERE id = %s
        """, (admin_id, datetime.now(timezone.utc), datetime.now(timezone.utc), numeric_id))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": "Course request moved back to pending",
            "request_id": f"REQ-{numeric_id:06d}",
            "status": "pending"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reconsider request: {str(e)}")

@router.post("/{course_id}/reject-active")
async def reject_active_course(course_id: str, rejection: StatusUpdateRequest, admin_id: Optional[int] = None):
    """Reject an active course - moves from courses to requested_courses with rejected status"""
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
            SELECT uploader_id, course_name, course_category, course_level, course_description,
                   thumbnail, duration, lessons, lesson_title, language
            FROM courses
            WHERE id = %s
        """, (numeric_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Course not found")

        # Insert into requested_courses with rejected status
        cursor.execute("""
            INSERT INTO requested_courses
            (requester_id, course_name, course_category, course_level, course_description,
             thumbnail, duration, lessons, lesson_title, language,
             status, status_by, status_reason, status_at, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (row[0], row[1], row[2], row[3], row[4],
              row[5], row[6] or 0, row[7] or 0, row[8], row[9],
              'rejected', admin_id, rejection.reason, datetime.now(timezone.utc),
              datetime.now(timezone.utc), datetime.now(timezone.utc)))

        rejected_id = cursor.fetchone()[0]

        # Delete from courses table
        cursor.execute("DELETE FROM courses WHERE id = %s", (numeric_id,))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": "Course rejected successfully",
            "rejected_id": f"REJ-{rejected_id:06d}",
            "reason": rejection.reason,
            "status": "rejected"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reject course: {str(e)}")

# ============================================
# UPDATE ENDPOINTS
# ============================================

@router.put("/requests/{request_id}")
async def update_request(request_id: str, update_data: CourseUpdateRequest):
    """Update a pending course request"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Extract numeric ID
        if request_id.startswith("REQ-"):
            numeric_id = int(request_id.replace("REQ-", ""))
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

        params.append(numeric_id)

        cursor.execute(f"""
            UPDATE requested_courses
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, course_name, course_category, course_level
        """, params)

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Request not found")

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": "Request updated successfully",
            "request_id": f"REQ-{result[0]:06d}"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update request: {str(e)}")

@router.put("/active/{course_id}")
async def update_active_course(course_id: str, update_data: CourseUpdateRequest):
    """Update an active course"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Extract numeric ID
        if course_id.startswith("CRS-"):
            numeric_id = int(course_id.replace("CRS-", ""))
        else:
            numeric_id = int(course_id)

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

        params.append(numeric_id)

        cursor.execute(f"""
            UPDATE courses
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, course_name, course_category, course_level
        """, params)

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Course not found")

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": "Course updated successfully",
            "course_id": f"CRS-{result[0]:03d}"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update course: {str(e)}")

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

        # Insert notification (could be enhanced to send to multiple users)
        cursor.execute("""
            INSERT INTO course_notifications
            (course_id, message, target_audience, sent_at)
            VALUES (%s, %s, %s, %s)
        """, (course_id, notification.message, notification.target_audience, datetime.now(timezone.utc)))

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
