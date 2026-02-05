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
import json
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
    parent_id: Optional[int] = None  # Parent ID from student_profiles.parent_id array (first element)
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


class SessionCreate(BaseModel):
    """Request model for creating a new session"""
    enrolled_courses_id: int  # Required - links to enrolled_courses
    session_date: date
    start_time: time
    end_time: time
    topics: Optional[List[str]] = []
    session_mode: Optional[str] = "online"  # online, in-person, hybrid
    location: Optional[str] = None
    priority_level: Optional[str] = "medium"
    notification_enabled: Optional[bool] = False
    alarm_enabled: Optional[bool] = False
    alarm_before_minutes: Optional[int] = 15


class SessionUpdate(BaseModel):
    """Request model for updating a session"""
    session_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    topics: Optional[List[str]] = None
    topics_covered: Optional[List[str]] = None
    session_mode: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None  # scheduled, in-progress, completed, cancelled
    tutor_attendance_status: Optional[str] = None
    student_attendance_status: Optional[str] = None
    priority_level: Optional[str] = None


# ============================================
# ENDPOINTS
# ============================================

@router.post("/api/tutor/sessions")
async def create_session(
    session_data: SessionCreate,
    current_user = Depends(get_current_user)
):
    """
    Create a new tutoring session.

    Requires enrolled_courses_id to link the session to a tutor-student enrollment.
    Sessions are the actual teaching events (whiteboard, coursework review, etc.)
    """
    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can create sessions"
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

            # Verify the enrolled_courses belongs to this tutor
            cur.execute("""
                SELECT id, tutor_id FROM enrolled_courses WHERE id = %s
            """, (session_data.enrolled_courses_id,))
            enrolled_row = cur.fetchone()

            if not enrolled_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Enrolled course not found"
                )

            if enrolled_row[1] != tutor_profile_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only create sessions for your own enrolled courses"
                )

            # Calculate duration in minutes
            start_dt = datetime.combine(session_data.session_date, session_data.start_time)
            end_dt = datetime.combine(session_data.session_date, session_data.end_time)
            duration = int((end_dt - start_dt).total_seconds() / 60)

            # Insert the session
            cur.execute("""
                INSERT INTO sessions (
                    enrolled_courses_id, session_date, start_time, end_time, duration,
                    topics, session_mode, location, priority_level,
                    notification_enabled, alarm_enabled, alarm_before_minutes,
                    status, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'scheduled', NOW(), NOW())
                RETURNING id
            """, (
                session_data.enrolled_courses_id,
                session_data.session_date,
                session_data.start_time,
                session_data.end_time,
                duration,
                json.dumps(session_data.topics) if session_data.topics else '[]',
                session_data.session_mode,
                session_data.location,
                session_data.priority_level,
                session_data.notification_enabled,
                session_data.alarm_enabled,
                session_data.alarm_before_minutes
            ))

            session_id = cur.fetchone()[0]
            conn.commit()

            return {
                "success": True,
                "message": "Session created successfully",
                "session_id": session_id,
                "enrolled_courses_id": session_data.enrolled_courses_id,
                "session_date": session_data.session_date.isoformat(),
                "duration": duration
            }

    except HTTPException:
        raise
    except psycopg.Error as e:
        conn.rollback()
        print(f"Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        conn.close()


@router.put("/api/tutor/sessions/{session_id}")
async def update_session(
    session_id: int,
    session_data: SessionUpdate,
    current_user = Depends(get_current_user)
):
    """
    Update an existing session.
    Can update date/time, topics, status, attendance, etc.
    """
    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can update sessions"
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

            # Verify the session belongs to this tutor via enrolled_courses
            cur.execute("""
                SELECT s.id, ec.tutor_id
                FROM sessions s
                JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
                WHERE s.id = %s
            """, (session_id,))
            session_row = cur.fetchone()

            if not session_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found"
                )

            if session_row[1] != tutor_profile_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only update your own sessions"
                )

            # Build dynamic update query
            update_fields = []
            update_values = []

            if session_data.session_date is not None:
                update_fields.append("session_date = %s")
                update_values.append(session_data.session_date)

            if session_data.start_time is not None:
                update_fields.append("start_time = %s")
                update_values.append(session_data.start_time)

            if session_data.end_time is not None:
                update_fields.append("end_time = %s")
                update_values.append(session_data.end_time)

            if session_data.topics is not None:
                update_fields.append("topics = %s")
                update_values.append(json.dumps(session_data.topics))

            if session_data.topics_covered is not None:
                update_fields.append("topics_covered = %s")
                update_values.append(json.dumps(session_data.topics_covered))

            if session_data.session_mode is not None:
                update_fields.append("session_mode = %s")
                update_values.append(session_data.session_mode)

            if session_data.location is not None:
                update_fields.append("location = %s")
                update_values.append(session_data.location)

            if session_data.status is not None:
                update_fields.append("status = %s")
                update_values.append(session_data.status)

            if session_data.tutor_attendance_status is not None:
                update_fields.append("tutor_attendance_status = %s")
                update_values.append(session_data.tutor_attendance_status)

            if session_data.student_attendance_status is not None:
                update_fields.append("student_attendance_status = %s")
                update_values.append(session_data.student_attendance_status)

            if session_data.priority_level is not None:
                update_fields.append("priority_level = %s")
                update_values.append(session_data.priority_level)

            if not update_fields:
                return {"success": True, "message": "No fields to update"}

            update_fields.append("updated_at = NOW()")
            update_values.append(session_id)

            query = f"""
                UPDATE sessions SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING id, status
            """

            cur.execute(query, update_values)
            result = cur.fetchone()
            conn.commit()

            return {
                "success": True,
                "message": "Session updated successfully",
                "session_id": result[0],
                "status": result[1]
            }

    except HTTPException:
        raise
    except psycopg.Error as e:
        conn.rollback()
        print(f"Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        conn.close()


@router.delete("/api/tutor/sessions/{session_id}")
async def delete_session(
    session_id: int,
    current_user = Depends(get_current_user)
):
    """
    Delete a session. Only allows deleting scheduled sessions (not completed ones).
    """
    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can delete sessions"
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

            # Verify the session belongs to this tutor and is not completed
            cur.execute("""
                SELECT s.id, s.status, ec.tutor_id
                FROM sessions s
                JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
                WHERE s.id = %s
            """, (session_id,))
            session_row = cur.fetchone()

            if not session_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found"
                )

            if session_row[2] != tutor_profile_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only delete your own sessions"
                )

            if session_row[1] == 'completed':
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete completed sessions"
                )

            # Delete the session
            cur.execute("DELETE FROM sessions WHERE id = %s", (session_id,))
            conn.commit()

            return {
                "success": True,
                "message": "Session deleted successfully",
                "session_id": session_id
            }

    except HTTPException:
        raise
    except psycopg.Error as e:
        conn.rollback()
        print(f"Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        conn.close()


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
            # Chain: sessions -> enrolled_courses -> students_id (array) -> unnest -> student_profiles -> parent_id
            # Use DISTINCT ON to get one row per session (handles multiple students in students_id array)
            query = """
                SELECT DISTINCT ON (s.id)
                       s.id, s.enrolled_courses_id,
                       COALESCE(su.first_name || ' ' || COALESCE(su.father_name, ''), 'Unknown Student') as student_name,
                       COALESCE(tu.first_name || ' ' || COALESCE(tu.father_name, ''), 'Unknown Tutor') as tutor_name,
                       COALESCE(pkg.name, 'Unknown Course') as course_name,
                       (CASE WHEN sp.parent_id IS NOT NULL AND array_length(sp.parent_id, 1) > 0
                             THEN sp.parent_id[1]
                             ELSE NULL
                        END) as parent_id,
                       s.topics, s.topics_covered,
                       s.session_date, s.start_time, s.end_time, s.duration,
                       s.session_mode, s.location, s.whiteboard_id,
                       s.student_review_id, s.tutor_review_id, s.parent_review_id,
                       s.tutor_attendance_status, s.student_attendance_status,
                       s.priority_level,
                       s.notification_enabled, s.alarm_enabled, s.alarm_before_minutes, s.is_featured,
                       s.status, s.created_at, s.updated_at
                FROM sessions s
                INNER JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
                LEFT JOIN tutor_packages pkg ON ec.package_id = pkg.id
                LEFT JOIN tutor_profiles tp ON ec.tutor_id = tp.id
                LEFT JOIN users tu ON tp.user_id = tu.id
                LEFT JOIN LATERAL unnest(ec.students_id) AS student_id_val ON true
                LEFT JOIN student_profiles sp ON sp.id = student_id_val
                LEFT JOIN users su ON sp.user_id = su.id
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

            query += " ORDER BY s.id, s.created_at DESC"

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
                    parent_id=row[5],  # parent_id from student_profiles
                    topics=row[6] or [],
                    topics_covered=row[7] or [],
                    session_date=row[8],
                    start_time=row[9],
                    end_time=row[10],
                    duration=row[11],
                    session_mode=row[12] or 'online',
                    location=row[13],
                    whiteboard_id=row[14],
                    student_review_id=row[15],
                    tutor_review_id=row[16],
                    parent_review_id=row[17],
                    tutor_attendance_status=row[18] or 'present',
                    student_attendance_status=row[19] or 'present',
                    priority_level=row[20] or 'medium',
                    notification_enabled=row[21] or False,
                    alarm_enabled=row[22] or False,
                    alarm_before_minutes=row[23] or 15,
                    is_featured=row[24] or False,
                    status=row[25] or 'scheduled',
                    created_at=row[26],
                    updated_at=row[27]
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
                SELECT DISTINCT ON (s.id)
                       s.id, s.enrolled_courses_id,
                       COALESCE(su.first_name || ' ' || COALESCE(su.father_name, ''), 'Unknown Student') as student_name,
                       COALESCE(tu.first_name || ' ' || COALESCE(tu.father_name, ''), 'Unknown Tutor') as tutor_name,
                       COALESCE(pkg.name, 'Unknown Course') as course_name,
                       (CASE WHEN sp.parent_id IS NOT NULL AND array_length(sp.parent_id, 1) > 0
                             THEN sp.parent_id[1]
                             ELSE NULL
                        END) as parent_id,
                       s.topics, s.topics_covered,
                       s.session_date, s.start_time, s.end_time, s.duration,
                       s.session_mode, s.location, s.whiteboard_id,
                       s.student_review_id, s.tutor_review_id, s.parent_review_id,
                       s.tutor_attendance_status, s.student_attendance_status,
                       s.priority_level,
                       s.notification_enabled, s.alarm_enabled, s.alarm_before_minutes, s.is_featured,
                       s.status, s.created_at, s.updated_at
                FROM sessions s
                INNER JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
                LEFT JOIN tutor_packages pkg ON ec.package_id = pkg.id
                LEFT JOIN tutor_profiles tp ON ec.tutor_id = tp.id
                LEFT JOIN users tu ON tp.user_id = tu.id
                LEFT JOIN LATERAL unnest(ec.students_id) AS student_id_val ON true
                LEFT JOIN student_profiles sp ON sp.id = student_id_val
                LEFT JOIN users su ON sp.user_id = su.id
                WHERE s.id = %s AND ec.tutor_id = %s
                ORDER BY s.id
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
                parent_id=row[5],
                topics=row[6] or [],
                topics_covered=row[7] or [],
                session_date=row[8],
                start_time=row[9],
                end_time=row[10],
                duration=row[11],
                session_mode=row[12] or 'online',
                location=row[13],
                whiteboard_id=row[14],
                student_review_id=row[15],
                tutor_review_id=row[16],
                parent_review_id=row[17],
                tutor_attendance_status=row[18] or 'present',
                student_attendance_status=row[19] or 'present',
                priority_level=row[20] or 'medium',
                notification_enabled=row[21] or False,
                alarm_enabled=row[22] or False,
                alarm_before_minutes=row[23] or 15,
                is_featured=row[24] or False,
                status=row[25] or 'scheduled',
                created_at=row[26],
                updated_at=row[27]
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
