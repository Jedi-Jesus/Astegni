"""
Tutor Sessions Management Endpoints
Handles tutoring sessions (actual conducted sessions) vs schedules (planned teaching times)

Uses unified 'sessions' table with enrolled_courses_id referencing enrolled_students table.

Two distinct concepts:
1. schedules - When the tutor is AVAILABLE to teach (recurring patterns, time slots)
2. sessions - ACTUAL tutoring sessions with specific students (booked, completed, etc.)

This endpoint manages the unified sessions table linked to enrolled_students.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date, time
import psycopg
import os
import jwt
from jwt import PyJWTError
from dotenv import load_dotenv

load_dotenv()

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Get config from environment
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")
ALGORITHM = "HS256"

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL not found in environment variables")
    return psycopg.connect(database_url)

def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current authenticated user - returns dict with user data"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception

        user_id = int(user_id_str)
    except (PyJWTError, ValueError, TypeError) as e:
        print(f"JWT decode error: {e}")
        raise credentials_exception

    # Fetch user from database
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, first_name, father_name, email, phone, roles, active_role,
                       grandfather_name, profile_picture
                FROM users WHERE id = %s
            """, (user_id,))
            row = cur.fetchone()

            if not row:
                raise credentials_exception

            return {
                'id': row[0],
                'first_name': row[1],
                'father_name': row[2],
                'email': row[3],
                'phone': row[4],
                'roles': row[5] or [],
                'active_role': row[6],
                'grandfather_name': row[7],
                'profile_picture': row[8]
            }
    finally:
        conn.close()

router = APIRouter()

# ============================================
# PYDANTIC MODELS
# ============================================

class TutoringSessionResponse(BaseModel):
    """Response model for unified sessions table"""
    id: int
    enrolled_courses_id: Optional[int]  # Reference to enrolled_students table
    # Derived fields from enrollment (for display purposes)
    student_name: Optional[str] = None
    tutor_name: Optional[str] = None
    course_name: Optional[str] = None
    # Session planning
    topics: Optional[list] = []  # Topics planned for this session
    topics_covered: Optional[list] = []  # Topics actually covered
    # Date and time
    session_date: date
    start_time: time
    end_time: time
    duration: Optional[int]  # Duration in minutes
    # Session logistics
    session_mode: Optional[str] = "online"  # online, in-person, hybrid
    location: Optional[str] = None  # Physical location if in-person
    whiteboard_id: Optional[int] = None  # Reference to whiteboard_sessions
    # Review system integration
    student_review_id: Optional[int] = None
    tutor_review_id: Optional[int] = None
    parent_review_id: Optional[int] = None
    # Attendance tracking
    tutor_attendance_status: Optional[str] = "present"  # present, absent, late
    student_attendance_status: Optional[str] = "present"  # present, absent, late
    # Priority and scheduling
    priority_level: Optional[str] = "medium"  # low, medium, high, urgent
    # Notifications and alarms
    notification_enabled: Optional[bool] = False
    alarm_enabled: Optional[bool] = False
    alarm_before_minutes: Optional[int] = 15
    is_featured: Optional[bool] = False
    # Status tracking
    status: str = "scheduled"  # scheduled, in-progress, completed, cancelled
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ============================================
# ENDPOINTS
# ============================================

@router.get("/api/tutor/sessions", response_model=List[TutoringSessionResponse])
async def get_tutor_sessions(
    status_filter: Optional[str] = None,  # scheduled, in-progress, completed, cancelled
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """
    Get all tutoring sessions for the authenticated tutor from unified sessions table

    Query parameters:
    - status_filter: Filter by session status (scheduled, in-progress, completed, cancelled)
    - date_from: Filter sessions from this date (YYYY-MM-DD)
    - date_to: Filter sessions to this date (YYYY-MM-DD)

    Returns sessions ordered by session_date DESC (newest first)
    Sessions are linked via enrolled_students table to get tutor's sessions
    """
    # Verify user is a tutor
    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can view sessions"
        )

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # First, get the tutor_profile ID for this user
            cur.execute("""
                SELECT id FROM tutor_profiles WHERE user_id = %s
            """, (current_user['id'],))

            tutor_row = cur.fetchone()
            if not tutor_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tutor profile not found for this user"
                )

            tutor_profile_id = tutor_row[0]

            # Build query with optional filters
            # Join sessions -> enrolled_students -> student_profiles/users to get student name
            # Join enrolled_students -> tutor_profiles -> users to get tutor name
            # Join with enrolled_courses table (not enrolled_students)
            # enrolled_courses has: tutor_id, package_id, students_id (array)
            query = """
                SELECT s.id, s.enrolled_courses_id,
                       'Student' as student_name,
                       COALESCE(tu.first_name || ' ' || COALESCE(tu.father_name, ''), 'Unknown') as tutor_name,
                       COALESCE(pkg.name, 'Unknown Course') as course_name,
                       s.topics, s.topics_covered,
                       s.session_date, s.start_time, s.end_time, s.duration,
                       s.session_mode, s.location, s.whiteboard_id,
                       s.student_review_id, s.tutor_review_id, s.parent_review_id,
                       s.tutor_attendance_status, s.student_attendance_status,
                       s.priority_level,
                       s.notification_enabled, s.alarm_enabled, s.alarm_before_minutes, s.is_featured,
                       s.status, s.created_at, s.updated_at
                FROM sessions s
                LEFT JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
                LEFT JOIN tutor_packages pkg ON ec.package_id = pkg.id
                LEFT JOIN tutor_profiles tp ON ec.tutor_id = tp.id
                LEFT JOIN users tu ON tp.user_id = tu.id
                WHERE ec.tutor_id = %s
            """
            params = [tutor_profile_id]

            # Add status filter
            if status_filter:
                query += " AND s.status = %s"
                params.append(status_filter)

            # Add date range filters
            if date_from:
                query += " AND s.session_date >= %s"
                params.append(date_from)

            if date_to:
                query += " AND s.session_date <= %s"
                params.append(date_to)

            query += " ORDER BY s.created_at DESC"

            cur.execute(query, params)
            rows = cur.fetchall()

            sessions = []
            for row in rows:
                sessions.append(TutoringSessionResponse(
                    id=row[0],
                    enrolled_courses_id=row[1],
                    student_name=row[2],
                    tutor_name=row[3],
                    course_name=row[4],
                    topics=row[5] or [],
                    topics_covered=row[6] or [],
                    session_date=row[7],
                    start_time=row[8],
                    end_time=row[9],
                    duration=row[10],
                    session_mode=row[11] or 'online',
                    location=row[12],
                    whiteboard_id=row[13],
                    student_review_id=row[14],
                    tutor_review_id=row[15],
                    parent_review_id=row[16],
                    tutor_attendance_status=row[17] or 'present',
                    student_attendance_status=row[18] or 'present',
                    priority_level=row[19] or 'medium',
                    notification_enabled=row[20] or False,
                    alarm_enabled=row[21] or False,
                    alarm_before_minutes=row[22] or 15,
                    is_featured=row[23] or False,
                    status=row[24] or 'scheduled',
                    created_at=row[25],
                    updated_at=row[26]
                ))

            return sessions

    except psycopg.Error as e:
        print(f"Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        conn.close()


@router.get("/api/tutor/sessions/{session_id}", response_model=TutoringSessionResponse)
async def get_session(
    session_id: int,
    current_user = Depends(get_current_user)
):
    """
    Get a specific tutoring session by ID from unified sessions table

    - Tutor can only access sessions from their enrollments
    """
    # Verify user is a tutor
    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can view sessions"
        )

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # First get tutor profile ID
            cur.execute("""
                SELECT id FROM tutor_profiles WHERE user_id = %s
            """, (current_user['id'],))
            tutor_row = cur.fetchone()
            if not tutor_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tutor profile not found"
                )
            tutor_profile_id = tutor_row[0]

            # Get session with joined data via enrolled_courses
            cur.execute("""
                SELECT s.id, s.enrolled_courses_id,
                       'Student' as student_name,
                       COALESCE(tu.first_name || ' ' || COALESCE(tu.father_name, ''), 'Unknown') as tutor_name,
                       COALESCE(pkg.name, 'Unknown Course') as course_name,
                       s.topics, s.topics_covered,
                       s.session_date, s.start_time, s.end_time, s.duration,
                       s.session_mode, s.location, s.whiteboard_id,
                       s.student_review_id, s.tutor_review_id, s.parent_review_id,
                       s.tutor_attendance_status, s.student_attendance_status,
                       s.priority_level,
                       s.notification_enabled, s.alarm_enabled, s.alarm_before_minutes, s.is_featured,
                       s.status, s.created_at, s.updated_at
                FROM sessions s
                LEFT JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
                LEFT JOIN tutor_packages pkg ON ec.package_id = pkg.id
                LEFT JOIN tutor_profiles tp ON ec.tutor_id = tp.id
                LEFT JOIN users tu ON tp.user_id = tu.id
                WHERE s.id = %s AND ec.tutor_id = %s
            """, (session_id, tutor_profile_id))

            row = cur.fetchone()

            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found"
                )

            return TutoringSessionResponse(
                id=row[0],
                enrolled_courses_id=row[1],
                student_name=row[2],
                tutor_name=row[3],
                course_name=row[4],
                topics=row[5] or [],
                topics_covered=row[6] or [],
                session_date=row[7],
                start_time=row[8],
                end_time=row[9],
                duration=row[10],
                session_mode=row[11] or 'online',
                location=row[12],
                whiteboard_id=row[13],
                student_review_id=row[14],
                tutor_review_id=row[15],
                parent_review_id=row[16],
                tutor_attendance_status=row[17] or 'present',
                student_attendance_status=row[18] or 'present',
                priority_level=row[19] or 'medium',
                notification_enabled=row[20] or False,
                alarm_enabled=row[21] or False,
                alarm_before_minutes=row[22] or 15,
                is_featured=row[23] or False,
                status=row[24] or 'scheduled',
                created_at=row[25],
                updated_at=row[26]
            )

    except psycopg.Error as e:
        print(f"Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        conn.close()


@router.get("/api/tutor/sessions/stats/summary")
async def get_sessions_stats(
    current_user = Depends(get_current_user)
):
    """
    Get summary statistics for tutor's sessions from unified sessions table

    Returns:
    - total_sessions: Total number of sessions
    - completed_sessions: Number of completed sessions
    - scheduled_sessions: Number of upcoming scheduled sessions
    - cancelled_sessions: Number of cancelled sessions
    - total_hours: Total hours taught
    - in_progress_sessions: Number of sessions currently in progress
    """
    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can view session statistics"
        )

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # First, get the tutor_profile ID for this user
            cur.execute("""
                SELECT id FROM tutor_profiles WHERE user_id = %s
            """, (current_user['id'],))

            tutor_row = cur.fetchone()
            if not tutor_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tutor profile not found for this user"
                )

            tutor_profile_id = tutor_row[0]

            # Query unified sessions table via enrolled_courses join
            cur.execute("""
                SELECT
                    COUNT(*) as total_sessions,
                    COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed_sessions,
                    COUNT(CASE WHEN s.status = 'scheduled' THEN 1 END) as scheduled_sessions,
                    COUNT(CASE WHEN s.status = 'cancelled' THEN 1 END) as cancelled_sessions,
                    COUNT(CASE WHEN s.status = 'in-progress' THEN 1 END) as in_progress_sessions,
                    COALESCE(SUM(s.duration), 0) as total_minutes
                FROM sessions s
                LEFT JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
                WHERE ec.tutor_id = %s
            """, (tutor_profile_id,))

            row = cur.fetchone()

            return {
                "total_sessions": row[0] or 0,
                "completed_sessions": row[1] or 0,
                "scheduled_sessions": row[2] or 0,
                "cancelled_sessions": row[3] or 0,
                "in_progress_sessions": row[4] or 0,
                "total_hours": round((row[5] or 0) / 60, 2)
            }

    except psycopg.Error as e:
        print(f"Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        conn.close()


# ============================================
# TOGGLE ENDPOINTS FOR NOTIFICATION, ALARM, AND FEATURED
# ============================================

class ToggleNotificationRequest(BaseModel):
    notification_enabled: bool

class ToggleAlarmRequest(BaseModel):
    alarm_enabled: bool

class ToggleFeaturedRequest(BaseModel):
    is_featured: bool


@router.patch("/api/tutor/sessions/{session_id}/toggle-notification")
async def toggle_session_notification(
    session_id: int,
    request: ToggleNotificationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Toggle notification for a specific session in unified sessions table"""
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            # Get tutor profile ID
            cur.execute("""
                SELECT id FROM tutor_profiles WHERE user_id = %s
            """, (current_user['id'],))

            tutor_row = cur.fetchone()
            if not tutor_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tutor profile not found"
                )

            tutor_profile_id = tutor_row[0]

            # Verify the session belongs to the tutor via enrolled_courses
            cur.execute("""
                SELECT s.id FROM sessions s
                JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
                WHERE s.id = %s AND ec.tutor_id = %s
            """, (session_id, tutor_profile_id))

            if not cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found or you don't have permission"
                )

            # Update notification setting in unified sessions table
            cur.execute("""
                UPDATE sessions
                SET notification_enabled = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING notification_enabled
            """, (request.notification_enabled, session_id))

            result = cur.fetchone()
            conn.commit()

            return {
                "message": f"Notification {'enabled' if request.notification_enabled else 'disabled'}",
                "session_id": session_id,
                "notification_enabled": result[0]
            }

    except psycopg.Error as e:
        conn.rollback()
        print(f"Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        conn.close()


@router.patch("/api/tutor/sessions/{session_id}/toggle-alarm")
async def toggle_session_alarm(
    session_id: int,
    request: ToggleAlarmRequest,
    current_user: dict = Depends(get_current_user)
):
    """Toggle alarm for a specific session in unified sessions table"""
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            # Get tutor profile ID
            cur.execute("""
                SELECT id FROM tutor_profiles WHERE user_id = %s
            """, (current_user['id'],))

            tutor_row = cur.fetchone()
            if not tutor_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tutor profile not found"
                )

            tutor_profile_id = tutor_row[0]

            # Verify the session belongs to the tutor via enrolled_courses
            cur.execute("""
                SELECT s.id FROM sessions s
                JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
                WHERE s.id = %s AND ec.tutor_id = %s
            """, (session_id, tutor_profile_id))

            if not cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found or you don't have permission"
                )

            # Update alarm setting in unified sessions table
            cur.execute("""
                UPDATE sessions
                SET alarm_enabled = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING alarm_enabled
            """, (request.alarm_enabled, session_id))

            result = cur.fetchone()
            conn.commit()

            return {
                "message": f"Alarm {'enabled' if request.alarm_enabled else 'disabled'}",
                "session_id": session_id,
                "alarm_enabled": result[0]
            }

    except psycopg.Error as e:
        conn.rollback()
        print(f"Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        conn.close()


@router.patch("/api/tutor/sessions/{session_id}/toggle-featured")
async def toggle_session_featured(
    session_id: int,
    request: ToggleFeaturedRequest,
    current_user: dict = Depends(get_current_user)
):
    """Toggle featured status for a specific session in unified sessions table"""
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            # Get tutor profile ID
            cur.execute("""
                SELECT id FROM tutor_profiles WHERE user_id = %s
            """, (current_user['id'],))

            tutor_row = cur.fetchone()
            if not tutor_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tutor profile not found"
                )

            tutor_profile_id = tutor_row[0]

            # Verify the session belongs to the tutor via enrolled_courses
            cur.execute("""
                SELECT s.id FROM sessions s
                JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
                WHERE s.id = %s AND ec.tutor_id = %s
            """, (session_id, tutor_profile_id))

            if not cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found or you don't have permission"
                )

            # Update featured status in unified sessions table
            cur.execute("""
                UPDATE sessions
                SET is_featured = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING is_featured
            """, (request.is_featured, session_id))

            result = cur.fetchone()
            conn.commit()

            return {
                "message": f"Session {'featured' if request.is_featured else 'unfeatured'}",
                "session_id": session_id,
                "is_featured": result[0]
            }

    except psycopg.Error as e:
        conn.rollback()
        print(f"Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        conn.close()


# ============================================
# ENROLLED COURSES STATUS MANAGEMENT
# ============================================

class UpdateCourseStatusRequest(BaseModel):
    status: str  # 'active', 'completed', 'paused', 'cancelled'


@router.patch("/api/tutor/enrolled-courses/{course_id}/status")
async def update_enrolled_course_status(
    course_id: int,
    request: UpdateCourseStatusRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update the status of an enrolled course.
    Tutors can mark courses as completed, paused, or cancelled.

    Status options:
    - 'active': Course is ongoing
    - 'completed': Course has been finished
    - 'paused': Course is temporarily on hold
    - 'cancelled': Course has been cancelled
    """
    valid_statuses = ['active', 'completed', 'paused', 'cancelled']
    if request.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            # Get tutor profile ID
            cur.execute("""
                SELECT id FROM tutor_profiles WHERE user_id = %s
            """, (current_user['id'],))

            tutor_row = cur.fetchone()
            if not tutor_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tutor profile not found"
                )

            tutor_profile_id = tutor_row[0]

            # Verify the enrolled course belongs to the tutor
            cur.execute("""
                SELECT id, status FROM enrolled_courses
                WHERE id = %s AND tutor_id = %s
            """, (course_id, tutor_profile_id))

            course_row = cur.fetchone()
            if not course_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Enrolled course not found or you don't have permission"
                )

            old_status = course_row[1]

            # Update the status
            cur.execute("""
                UPDATE enrolled_courses
                SET status = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, status
            """, (request.status, course_id))

            result = cur.fetchone()
            conn.commit()

            return {
                "message": f"Course status updated from '{old_status}' to '{request.status}'",
                "course_id": result[0],
                "status": result[1]
            }

    except psycopg.Error as e:
        conn.rollback()
        print(f"Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        conn.close()


@router.post("/api/tutor/enrolled-courses/auto-complete")
async def auto_complete_expired_courses(
    current_user: dict = Depends(get_current_user)
):
    """
    Automatically mark courses as completed if their year_range has ended.
    This checks if the maximum year in year_range is less than current year.

    Can be called manually or via a scheduled job.
    """
    conn = get_db_connection()
    current_year = datetime.now().year

    try:
        with conn.cursor() as cur:
            # Get tutor profile ID
            cur.execute("""
                SELECT id FROM tutor_profiles WHERE user_id = %s
            """, (current_user['id'],))

            tutor_row = cur.fetchone()
            if not tutor_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tutor profile not found"
                )

            tutor_profile_id = tutor_row[0]

            # Find and update courses where max(year_range) < current_year
            # and status is still 'active'
            cur.execute("""
                UPDATE enrolled_courses
                SET status = 'completed', updated_at = CURRENT_TIMESTAMP
                WHERE tutor_id = %s
                AND status = 'active'
                AND year_range IS NOT NULL
                AND array_length(year_range, 1) > 0
                AND (SELECT MAX(yr) FROM unnest(year_range) AS yr) < %s
                RETURNING id
            """, (tutor_profile_id, current_year))

            updated_ids = [row[0] for row in cur.fetchall()]
            conn.commit()

            return {
                "message": f"Auto-completed {len(updated_ids)} expired courses",
                "completed_course_ids": updated_ids,
                "current_year": current_year
            }

    except psycopg.Error as e:
        conn.rollback()
        print(f"Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        conn.close()
