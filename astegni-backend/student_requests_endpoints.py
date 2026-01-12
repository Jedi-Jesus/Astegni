"""
Student Requests Panel Endpoints
Handles course requests, school requests for students' My Requests panel
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os
import jwt
from jwt import PyJWTError

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")
ALGORITHM = "HS256"

router = APIRouter(tags=["student-requests"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# ============================================
# DATABASE CONNECTION
# ============================================

def get_db_connection():
    """Get database connection with dict_row factory"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=500, detail="Database URL not configured")
    return psycopg.connect(database_url, row_factory=dict_row)


# ============================================
# AUTHENTICATION
# ============================================

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")

        if user_id is None:
            raise credentials_exception

        user_id = int(user_id)
        role_ids = payload.get("role_ids", {})

    except (PyJWTError, ValueError):
        raise credentials_exception

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, first_name, father_name, email, phone, roles, active_role
                FROM users WHERE id = %s
            """, (user_id,))
            row = cur.fetchone()

            if not row:
                raise credentials_exception

            return {
                "id": row['id'],
                "first_name": row['first_name'],
                "father_name": row['father_name'],
                "email": row['email'],
                "phone": row['phone'],
                "roles": row['roles'] if isinstance(row['roles'], list) else [],
                "active_role": row['active_role'],
                "role_ids": role_ids
            }


# ============================================
# RESPONSE MODELS
# ============================================

class CourseRequestResponse(BaseModel):
    id: int
    course_name: str
    course_category: str
    course_description: Optional[str] = None
    course_level: Optional[str] = None
    thumbnail: Optional[str] = None
    status: str
    status_reason: Optional[str] = None
    status_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class SchoolRequestResponse(BaseModel):
    id: int
    name: str
    type: Optional[str] = None
    level: Optional[list] = None
    location: Optional[list] = None
    status: str
    status_reason: Optional[str] = None
    status_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class RequestsCountResponse(BaseModel):
    courses: dict
    schools: dict
    tutors: dict
    parenting: dict


# ============================================
# COURSE REQUESTS ENDPOINTS
# ============================================

@router.get("/api/student/my-course-requests", response_model=List[CourseRequestResponse])
async def get_my_course_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get courses requested/uploaded by the current student

    - status: optional filter ('all', 'pending', 'verified', 'rejected')
    - Returns courses from the 'courses' table where uploader_id = current user
    """
    try:
        print(f"[Student Course Requests] GET /api/student/my-course-requests - user_id: {current_user['id']}, status: {status}")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if status and status != 'all':
                    cur.execute("""
                        SELECT id, course_name, course_category, course_description,
                               course_level, thumbnail, status, status_reason,
                               status_at, created_at, updated_at
                        FROM courses
                        WHERE uploader_id = %s AND status = %s
                        ORDER BY created_at DESC
                    """, (current_user['id'], status))
                else:
                    cur.execute("""
                        SELECT id, course_name, course_category, course_description,
                               course_level, thumbnail, status, status_reason,
                               status_at, created_at, updated_at
                        FROM courses
                        WHERE uploader_id = %s
                        ORDER BY created_at DESC
                    """, (current_user['id'],))

                rows = cur.fetchall()
                print(f"[Student Course Requests] Found {len(rows)} course requests")

        requests = []
        for row in rows:
            requests.append(CourseRequestResponse(
                id=row['id'],
                course_name=row['course_name'],
                course_category=row['course_category'],
                course_description=row['course_description'],
                course_level=row['course_level'],
                thumbnail=row['thumbnail'],
                status=row['status'] or 'pending',
                status_reason=row['status_reason'],
                status_at=row['status_at'].isoformat() if row['status_at'] else None,
                created_at=row['created_at'].isoformat() if row['created_at'] else None,
                updated_at=row['updated_at'].isoformat() if row['updated_at'] else None
            ))

        return requests

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Student Course Requests] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch course requests: {str(e)}")


# ============================================
# SCHOOL REQUESTS ENDPOINTS
# ============================================

@router.get("/api/student/my-school-requests", response_model=List[SchoolRequestResponse])
async def get_my_school_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get schools requested/registered by the current student

    - status: optional filter ('all', 'pending', 'verified', 'rejected', 'suspended')
    - Returns schools from the 'schools' table where requester_id = current user
    """
    try:
        print(f"[Student School Requests] GET /api/student/my-school-requests - user_id: {current_user['id']}, status: {status}")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if status and status != 'all':
                    cur.execute("""
                        SELECT id, name, type, level, location, status,
                               status_reason, status_at, created_at, updated_at
                        FROM schools
                        WHERE requester_id = %s AND status = %s
                        ORDER BY created_at DESC
                    """, (current_user['id'], status))
                else:
                    cur.execute("""
                        SELECT id, name, type, level, location, status,
                               status_reason, status_at, created_at, updated_at
                        FROM schools
                        WHERE requester_id = %s
                        ORDER BY created_at DESC
                    """, (current_user['id'],))

                rows = cur.fetchall()
                print(f"[Student School Requests] Found {len(rows)} school requests")

        requests = []
        for row in rows:
            requests.append(SchoolRequestResponse(
                id=row['id'],
                name=row['name'],
                type=row['type'],
                level=row['level'] if isinstance(row['level'], list) else [],
                location=row['location'] if isinstance(row['location'], list) else [],
                status=row['status'] or 'pending',
                status_reason=row['status_reason'],
                status_at=row['status_at'].isoformat() if row['status_at'] else None,
                created_at=row['created_at'].isoformat() if row['created_at'] else None,
                updated_at=row['updated_at'].isoformat() if row['updated_at'] else None
            ))

        return requests

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Student School Requests] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch school requests: {str(e)}")


# ============================================
# REQUEST COUNTS ENDPOINT (for badges)
# ============================================

@router.get("/api/student/my-requests/counts", response_model=RequestsCountResponse)
async def get_my_requests_counts(
    current_user: dict = Depends(get_current_user)
):
    """
    Get counts of all request types for the current student
    Used for displaying badge counts on the My Requests panel cards
    """
    try:
        print(f"[Student Request Counts] GET /api/student/my-requests/counts - user_id: {current_user['id']}")

        role_ids = current_user.get('role_ids', {})
        student_profile_id = role_ids.get('student')

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Course requests counts
                cur.execute("""
                    SELECT status, COUNT(*) as count
                    FROM courses
                    WHERE uploader_id = %s
                    GROUP BY status
                """, (current_user['id'],))
                course_rows = cur.fetchall()
                courses_counts = {'total': 0, 'pending': 0, 'verified': 0, 'rejected': 0}
                for row in course_rows:
                    status = row['status'] or 'pending'
                    courses_counts[status] = row['count']
                    courses_counts['total'] += row['count']

                # School requests counts
                cur.execute("""
                    SELECT status, COUNT(*) as count
                    FROM schools
                    WHERE requester_id = %s
                    GROUP BY status
                """, (current_user['id'],))
                school_rows = cur.fetchall()
                schools_counts = {'total': 0, 'pending': 0, 'verified': 0, 'rejected': 0, 'suspended': 0}
                for row in school_rows:
                    status = row['status'] or 'pending'
                    schools_counts[status] = row['count']
                    schools_counts['total'] += row['count']

                # Tutor session requests counts (if student has profile)
                tutors_counts = {'total': 0, 'pending': 0, 'accepted': 0, 'rejected': 0}
                if student_profile_id:
                    cur.execute("""
                        SELECT status, COUNT(*) as count
                        FROM requested_sessions
                        WHERE requester_id = %s AND requester_type = 'student'
                        GROUP BY status
                    """, (int(student_profile_id),))
                    tutor_rows = cur.fetchall()
                    for row in tutor_rows:
                        status = row['status'] or 'pending'
                        tutors_counts[status] = row['count']
                        tutors_counts['total'] += row['count']

                # Parent invitation counts (sent by student)
                cur.execute("""
                    SELECT status, COUNT(*) as count
                    FROM parent_invitations
                    WHERE inviter_user_id = %s
                    GROUP BY status
                """, (current_user['id'],))
                parenting_rows = cur.fetchall()
                parenting_counts = {'total': 0, 'pending': 0, 'accepted': 0, 'rejected': 0}
                for row in parenting_rows:
                    status = row['status'] or 'pending'
                    parenting_counts[status] = row['count']
                    parenting_counts['total'] += row['count']

        print(f"[Student Request Counts] courses={courses_counts}, schools={schools_counts}, tutors={tutors_counts}, parenting={parenting_counts}")

        return RequestsCountResponse(
            courses=courses_counts,
            schools=schools_counts,
            tutors=tutors_counts,
            parenting=parenting_counts
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Student Request Counts] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch request counts: {str(e)}")


# ============================================
# SCHEDULE ENDPOINTS
# ============================================

class ScheduleResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    schedule_type: Optional[str] = None
    year: Optional[int] = None
    months: Optional[list] = None
    days: Optional[list] = None
    specific_dates: Optional[list] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    notes: Optional[str] = None
    priority_level: Optional[str] = None
    status: Optional[str] = None
    alarm_enabled: Optional[bool] = None
    alarm_before_minutes: Optional[int] = None
    notification_browser: Optional[bool] = None
    notification_sound: Optional[bool] = None
    is_featured: Optional[bool] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ScheduleCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    schedule_type: Optional[str] = "one-time"  # one-time, recurring, class
    year: Optional[int] = None
    months: Optional[list] = None  # For recurring schedules
    days: Optional[list] = None  # For recurring schedules (e.g., ["Monday", "Wednesday"])
    specific_dates: Optional[list] = None  # For specific dates
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    notes: Optional[str] = None
    priority_level: Optional[str] = "normal"  # low, normal, high, urgent
    alarm_enabled: Optional[bool] = False
    alarm_before_minutes: Optional[int] = 15
    notification_browser: Optional[bool] = True
    notification_sound: Optional[bool] = True


@router.get("/api/student/my-schedules", response_model=List[ScheduleResponse])
async def get_my_schedules(
    status: Optional[str] = None,
    schedule_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get schedules for the current student

    - status: optional filter ('all', 'active', 'completed', 'cancelled')
    - schedule_type: optional filter ('one-time', 'recurring', 'class')
    - Returns schedules where scheduler_id = current user and scheduler_role = 'student'
    """
    try:
        print(f"[Student Schedules] GET /api/student/my-schedules - user_id: {current_user['id']}, status: {status}, type: {schedule_type}")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Build query with optional filters
                query = """
                    SELECT id, title, description, schedule_type, year,
                           months, days, specific_dates, start_time, end_time,
                           notes, priority_level, status, alarm_enabled,
                           alarm_before_minutes, notification_browser, notification_sound,
                           is_featured, created_at, updated_at
                    FROM schedules
                    WHERE scheduler_id = %s AND scheduler_role = 'student'
                """
                params = [current_user['id']]

                if status and status != 'all':
                    query += " AND status = %s"
                    params.append(status)

                if schedule_type and schedule_type != 'all':
                    query += " AND schedule_type = %s"
                    params.append(schedule_type)

                query += " ORDER BY created_at DESC"

                cur.execute(query, params)
                rows = cur.fetchall()
                print(f"[Student Schedules] Found {len(rows)} schedules")

        schedules = []
        for row in rows:
            schedules.append(ScheduleResponse(
                id=row['id'],
                title=row['title'],
                description=row['description'],
                schedule_type=row['schedule_type'],
                year=row['year'],
                months=row['months'] if isinstance(row['months'], list) else [],
                days=row['days'] if isinstance(row['days'], list) else [],
                specific_dates=row['specific_dates'] if isinstance(row['specific_dates'], list) else [],
                start_time=str(row['start_time']) if row['start_time'] else None,
                end_time=str(row['end_time']) if row['end_time'] else None,
                notes=row['notes'],
                priority_level=row['priority_level'],
                status=row['status'] or 'active',
                alarm_enabled=row['alarm_enabled'],
                alarm_before_minutes=row['alarm_before_minutes'],
                notification_browser=row['notification_browser'],
                notification_sound=row['notification_sound'],
                is_featured=row['is_featured'],
                created_at=row['created_at'].isoformat() if row['created_at'] else None,
                updated_at=row['updated_at'].isoformat() if row['updated_at'] else None
            ))

        return schedules

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Student Schedules] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch schedules: {str(e)}")


@router.post("/api/student/schedules", response_model=ScheduleResponse)
async def create_schedule(
    schedule_data: ScheduleCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new schedule for the current student
    """
    try:
        print(f"[Student Schedules] POST /api/student/schedules - user_id: {current_user['id']}, title: {schedule_data.title}")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO schedules (
                        scheduler_id, scheduler_role, title, description, schedule_type,
                        year, months, days, specific_dates, start_time, end_time,
                        notes, priority_level, status, alarm_enabled, alarm_before_minutes,
                        notification_browser, notification_sound, created_at, updated_at
                    ) VALUES (
                        %s, 'student', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'active',
                        %s, %s, %s, %s, NOW(), NOW()
                    )
                    RETURNING id, title, description, schedule_type, year, months, days,
                              specific_dates, start_time, end_time, notes, priority_level,
                              status, alarm_enabled, alarm_before_minutes, notification_browser,
                              notification_sound, is_featured, created_at, updated_at
                """, (
                    current_user['id'],
                    schedule_data.title,
                    schedule_data.description,
                    schedule_data.schedule_type,
                    schedule_data.year,
                    schedule_data.months,
                    schedule_data.days,
                    schedule_data.specific_dates,
                    schedule_data.start_time,
                    schedule_data.end_time,
                    schedule_data.notes,
                    schedule_data.priority_level,
                    schedule_data.alarm_enabled,
                    schedule_data.alarm_before_minutes,
                    schedule_data.notification_browser,
                    schedule_data.notification_sound
                ))

                row = cur.fetchone()
                conn.commit()

                print(f"[Student Schedules] Created schedule with id: {row['id']}")

                return ScheduleResponse(
                    id=row['id'],
                    title=row['title'],
                    description=row['description'],
                    schedule_type=row['schedule_type'],
                    year=row['year'],
                    months=row['months'] if isinstance(row['months'], list) else [],
                    days=row['days'] if isinstance(row['days'], list) else [],
                    specific_dates=row['specific_dates'] if isinstance(row['specific_dates'], list) else [],
                    start_time=str(row['start_time']) if row['start_time'] else None,
                    end_time=str(row['end_time']) if row['end_time'] else None,
                    notes=row['notes'],
                    priority_level=row['priority_level'],
                    status=row['status'] or 'active',
                    alarm_enabled=row['alarm_enabled'],
                    alarm_before_minutes=row['alarm_before_minutes'],
                    notification_browser=row['notification_browser'],
                    notification_sound=row['notification_sound'],
                    is_featured=row['is_featured'],
                    created_at=row['created_at'].isoformat() if row['created_at'] else None,
                    updated_at=row['updated_at'].isoformat() if row['updated_at'] else None
                )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Student Schedules] Error creating schedule: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create schedule: {str(e)}")


@router.put("/api/student/schedules/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: int,
    schedule_data: ScheduleCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update an existing schedule for the current student
    """
    try:
        print(f"[Student Schedules] PUT /api/student/schedules/{schedule_id} - user_id: {current_user['id']}")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Verify ownership
                cur.execute("""
                    SELECT id FROM schedules
                    WHERE id = %s AND scheduler_id = %s AND scheduler_role = 'student'
                """, (schedule_id, current_user['id']))

                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Schedule not found or access denied")

                # Update schedule
                cur.execute("""
                    UPDATE schedules SET
                        title = %s, description = %s, schedule_type = %s, year = %s,
                        months = %s, days = %s, specific_dates = %s, start_time = %s,
                        end_time = %s, notes = %s, priority_level = %s, alarm_enabled = %s,
                        alarm_before_minutes = %s, notification_browser = %s,
                        notification_sound = %s, updated_at = NOW()
                    WHERE id = %s AND scheduler_id = %s AND scheduler_role = 'student'
                    RETURNING id, title, description, schedule_type, year, months, days,
                              specific_dates, start_time, end_time, notes, priority_level,
                              status, alarm_enabled, alarm_before_minutes, notification_browser,
                              notification_sound, is_featured, created_at, updated_at
                """, (
                    schedule_data.title,
                    schedule_data.description,
                    schedule_data.schedule_type,
                    schedule_data.year,
                    schedule_data.months,
                    schedule_data.days,
                    schedule_data.specific_dates,
                    schedule_data.start_time,
                    schedule_data.end_time,
                    schedule_data.notes,
                    schedule_data.priority_level,
                    schedule_data.alarm_enabled,
                    schedule_data.alarm_before_minutes,
                    schedule_data.notification_browser,
                    schedule_data.notification_sound,
                    schedule_id,
                    current_user['id']
                ))

                row = cur.fetchone()
                conn.commit()

                return ScheduleResponse(
                    id=row['id'],
                    title=row['title'],
                    description=row['description'],
                    schedule_type=row['schedule_type'],
                    year=row['year'],
                    months=row['months'] if isinstance(row['months'], list) else [],
                    days=row['days'] if isinstance(row['days'], list) else [],
                    specific_dates=row['specific_dates'] if isinstance(row['specific_dates'], list) else [],
                    start_time=str(row['start_time']) if row['start_time'] else None,
                    end_time=str(row['end_time']) if row['end_time'] else None,
                    notes=row['notes'],
                    priority_level=row['priority_level'],
                    status=row['status'] or 'active',
                    alarm_enabled=row['alarm_enabled'],
                    alarm_before_minutes=row['alarm_before_minutes'],
                    notification_browser=row['notification_browser'],
                    notification_sound=row['notification_sound'],
                    is_featured=row['is_featured'],
                    created_at=row['created_at'].isoformat() if row['created_at'] else None,
                    updated_at=row['updated_at'].isoformat() if row['updated_at'] else None
                )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Student Schedules] Error updating schedule: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to update schedule: {str(e)}")


@router.delete("/api/student/schedules/{schedule_id}")
async def delete_schedule(
    schedule_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a schedule for the current student
    """
    try:
        print(f"[Student Schedules] DELETE /api/student/schedules/{schedule_id} - user_id: {current_user['id']}")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    DELETE FROM schedules
                    WHERE id = %s AND scheduler_id = %s AND scheduler_role = 'student'
                    RETURNING id
                """, (schedule_id, current_user['id']))

                deleted = cur.fetchone()
                conn.commit()

                if not deleted:
                    raise HTTPException(status_code=404, detail="Schedule not found or access denied")

                return {"success": True, "message": "Schedule deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Student Schedules] Error deleting schedule: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to delete schedule: {str(e)}")


@router.patch("/api/student/schedules/{schedule_id}/status")
async def update_schedule_status(
    schedule_id: int,
    status: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Update the status of a schedule (active, completed, cancelled)
    """
    try:
        valid_statuses = ['active', 'completed', 'cancelled']
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

        print(f"[Student Schedules] PATCH /api/student/schedules/{schedule_id}/status - status: {status}")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE schedules SET status = %s, updated_at = NOW()
                    WHERE id = %s AND scheduler_id = %s AND scheduler_role = 'student'
                    RETURNING id
                """, (status, schedule_id, current_user['id']))

                updated = cur.fetchone()
                conn.commit()

                if not updated:
                    raise HTTPException(status_code=404, detail="Schedule not found or access denied")

                return {"success": True, "message": f"Schedule status updated to {status}"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Student Schedules] Error updating schedule status: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to update schedule status: {str(e)}")


# ============================================
# SESSION ENDPOINTS (Tutoring Sessions)
# ============================================

class SessionResponse(BaseModel):
    id: int
    enrolled_courses_id: Optional[int] = None
    tutor_id: Optional[int] = None
    tutor_name: Optional[str] = None
    tutor_profile_picture: Optional[str] = None
    course_names: Optional[list] = None
    package_name: Optional[str] = None
    topics: Optional[list] = None
    topics_covered: Optional[list] = None
    session_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration: Optional[int] = None
    session_mode: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    priority_level: Optional[str] = None
    tutor_attendance_status: Optional[str] = None
    student_attendance_status: Optional[str] = None
    whiteboard_id: Optional[int] = None
    notification_enabled: Optional[bool] = None
    alarm_enabled: Optional[bool] = None
    alarm_before_minutes: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class SessionCountsResponse(BaseModel):
    total: int
    scheduled: int
    in_progress: int
    completed: int
    cancelled: int


@router.get("/api/student/my-sessions", response_model=List[SessionResponse])
async def get_my_sessions(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get tutoring sessions for the current student

    - status: optional filter ('all', 'scheduled', 'in_progress', 'completed', 'cancelled')
    - Returns sessions where the student is enrolled (via enrolled_courses.students_id array)
    """
    try:
        role_ids = current_user.get('role_ids', {})
        student_profile_id = role_ids.get('student')

        print(f"[Student Sessions] GET /api/student/my-sessions - user_id: {current_user['id']}, student_profile_id: {student_profile_id}, status: {status}")

        if not student_profile_id:
            print(f"[Student Sessions] No student profile found for user {current_user['id']}")
            return []

        student_profile_id = int(student_profile_id)

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Build query to get sessions where student is enrolled
                query = """
                    SELECT
                        s.id, s.enrolled_courses_id, s.topics, s.topics_covered,
                        s.session_date, s.start_time, s.end_time, s.duration,
                        s.session_mode, s.location, s.status, s.priority_level,
                        s.tutor_attendance_status, s.student_attendance_status,
                        s.whiteboard_id, s.notification_enabled, s.alarm_enabled,
                        s.alarm_before_minutes, s.created_at, s.updated_at,
                        ec.tutor_id, ec.course_id, ec.package_id,
                        tp.user_id as tutor_user_id,
                        u.first_name as tutor_first_name, u.father_name as tutor_father_name,
                        u.profile_picture as tutor_profile_picture,
                        pkg.name as package_name
                    FROM sessions s
                    JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
                    JOIN tutor_profiles tp ON ec.tutor_id = tp.id
                    JOIN users u ON tp.user_id = u.id
                    LEFT JOIN tutor_packages pkg ON ec.package_id = pkg.id
                    WHERE %s = ANY(ec.students_id)
                """
                params = [student_profile_id]

                if status and status != 'all':
                    query += " AND s.status = %s"
                    params.append(status)

                query += " ORDER BY s.session_date DESC, s.start_time DESC"

                cur.execute(query, params)
                rows = cur.fetchall()
                print(f"[Student Sessions] Found {len(rows)} sessions")

                # Get course names for each session
                sessions = []
                for row in rows:
                    # Get course names from course_id array
                    course_names = []
                    if row['course_id']:
                        course_ids = row['course_id'] if isinstance(row['course_id'], list) else []
                        if course_ids:
                            cur.execute("""
                                SELECT course_name FROM courses WHERE id = ANY(%s)
                            """, (course_ids,))
                            course_rows = cur.fetchall()
                            course_names = [c['course_name'] for c in course_rows]

                    tutor_name = f"{row['tutor_first_name']} {row['tutor_father_name']}" if row['tutor_first_name'] else "Unknown Tutor"

                    sessions.append(SessionResponse(
                        id=row['id'],
                        enrolled_courses_id=row['enrolled_courses_id'],
                        tutor_id=row['tutor_id'],
                        tutor_name=tutor_name,
                        tutor_profile_picture=row['tutor_profile_picture'],
                        course_names=course_names,
                        package_name=row['package_name'],
                        topics=row['topics'] if isinstance(row['topics'], list) else [],
                        topics_covered=row['topics_covered'] if isinstance(row['topics_covered'], list) else [],
                        session_date=row['session_date'].isoformat() if row['session_date'] else None,
                        start_time=str(row['start_time']) if row['start_time'] else None,
                        end_time=str(row['end_time']) if row['end_time'] else None,
                        duration=row['duration'],
                        session_mode=row['session_mode'],
                        location=row['location'],
                        status=row['status'] or 'scheduled',
                        priority_level=row['priority_level'],
                        tutor_attendance_status=row['tutor_attendance_status'],
                        student_attendance_status=row['student_attendance_status'],
                        whiteboard_id=row['whiteboard_id'],
                        notification_enabled=row['notification_enabled'],
                        alarm_enabled=row['alarm_enabled'],
                        alarm_before_minutes=row['alarm_before_minutes'],
                        created_at=row['created_at'].isoformat() if row['created_at'] else None,
                        updated_at=row['updated_at'].isoformat() if row['updated_at'] else None
                    ))

        return sessions

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Student Sessions] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch sessions: {str(e)}")


@router.get("/api/student/my-sessions/counts", response_model=SessionCountsResponse)
async def get_my_sessions_counts(
    current_user: dict = Depends(get_current_user)
):
    """
    Get session counts by status for the current student
    """
    try:
        role_ids = current_user.get('role_ids', {})
        student_profile_id = role_ids.get('student')

        print(f"[Student Sessions Counts] GET /api/student/my-sessions/counts - user_id: {current_user['id']}, student_profile_id: {student_profile_id}")

        if not student_profile_id:
            return SessionCountsResponse(total=0, scheduled=0, in_progress=0, completed=0, cancelled=0)

        student_profile_id = int(student_profile_id)

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT s.status, COUNT(*) as count
                    FROM sessions s
                    JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
                    WHERE %s = ANY(ec.students_id)
                    GROUP BY s.status
                """, (student_profile_id,))

                rows = cur.fetchall()

                counts = {'total': 0, 'scheduled': 0, 'in_progress': 0, 'completed': 0, 'cancelled': 0}
                for row in rows:
                    status = row['status'] or 'scheduled'
                    if status in counts:
                        counts[status] = row['count']
                    counts['total'] += row['count']

        print(f"[Student Sessions Counts] counts={counts}")
        return SessionCountsResponse(**counts)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Student Sessions Counts] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch session counts: {str(e)}")


@router.get("/api/student/schedule-panel/counts")
async def get_schedule_panel_counts(
    current_user: dict = Depends(get_current_user)
):
    """
    Get combined counts for schedule panel cards (schedules + sessions)
    """
    try:
        role_ids = current_user.get('role_ids', {})
        student_profile_id = role_ids.get('student')

        print(f"[Schedule Panel Counts] GET /api/student/schedule-panel/counts - user_id: {current_user['id']}")

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get schedules count
                cur.execute("""
                    SELECT COUNT(*) as count FROM schedules
                    WHERE scheduler_id = %s AND scheduler_role = 'student'
                """, (current_user['id'],))
                schedules_count = cur.fetchone()['count']

                # Get sessions count (if student profile exists)
                sessions_count = 0
                if student_profile_id:
                    cur.execute("""
                        SELECT COUNT(*) as count
                        FROM sessions s
                        JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
                        WHERE %s = ANY(ec.students_id)
                    """, (int(student_profile_id),))
                    sessions_count = cur.fetchone()['count']

        print(f"[Schedule Panel Counts] schedules={schedules_count}, sessions={sessions_count}")

        return {
            "schedules": schedules_count,
            "sessions": sessions_count
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Schedule Panel Counts] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch counts: {str(e)}")
