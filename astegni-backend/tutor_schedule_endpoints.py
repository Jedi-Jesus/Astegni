"""
Tutor Schedule Management Endpoints
Handles schedule creation, updates, and retrieval for tutors
Uses unified 'schedules' table with scheduler_id and scheduler_role fields
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
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

        # Convert string back to int
        user_id = int(user_id_str)
    except (PyJWTError, ValueError, TypeError) as e:
        print(f"JWT decode error: {e}")
        raise credentials_exception
    except Exception as e:
        print(f"Unexpected error in get_current_user: {e}")
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
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database error in get_current_user: {e}")
        raise credentials_exception
    finally:
        conn.close()

router = APIRouter()

# ============================================
# PYDANTIC MODELS
# ============================================

class ScheduleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    year: int
    schedule_type: str  # recurring or specific
    months: List[str]
    days: List[str]
    specific_dates: Optional[List[str]] = []
    start_time: str
    end_time: str
    notes: Optional[str] = None
    priority_level: str = "medium"  # low, medium, high, urgent
    status: str = "active"  # active or draft
    alarm_enabled: bool = False
    alarm_before_minutes: Optional[int] = None
    notification_browser: bool = False
    notification_sound: bool = False
    is_featured: bool = False

class ScheduleResponse(BaseModel):
    id: int
    scheduler_id: int
    scheduler_role: str
    title: str
    description: Optional[str]
    year: int
    schedule_type: str
    months: List[str]
    days: List[str]
    specific_dates: Optional[List[str]]
    start_time: str
    end_time: str
    notes: Optional[str]
    priority_level: str
    status: str
    alarm_enabled: bool
    alarm_before_minutes: Optional[int]
    notification_browser: bool
    notification_sound: bool
    is_featured: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ============================================
# ENDPOINTS
# ============================================

@router.post("/api/tutor/schedules", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    schedule: ScheduleCreate,
    current_user = Depends(get_current_user)
):
    """
    Create a new teaching schedule for the tutor

    - Requires authentication
    - User must have 'tutor' role
    - Stores schedule in unified 'schedules' table with scheduler_role='tutor'
    """
    # Verify user is a tutor
    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can create schedules"
        )

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # First get the tutor_profile ID
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

            # Insert schedule into unified schedules table
            cur.execute("""
                INSERT INTO schedules (
                    scheduler_id, scheduler_role, title, description, year,
                    schedule_type, months, days, specific_dates, start_time, end_time,
                    notes, priority_level, status, alarm_enabled, alarm_before_minutes,
                    notification_browser, notification_sound, is_featured, created_at
                )
                VALUES (%s, 'tutor', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                RETURNING id, scheduler_id, scheduler_role, title, description, year,
                          schedule_type, months, days, specific_dates, start_time, end_time,
                          notes, priority_level, status, alarm_enabled, alarm_before_minutes,
                          notification_browser, notification_sound, is_featured, created_at, updated_at
            """, (
                tutor_profile_id,
                schedule.title,
                schedule.description,
                schedule.year,
                schedule.schedule_type,
                schedule.months,
                schedule.days,
                schedule.specific_dates or [],
                schedule.start_time,
                schedule.end_time,
                schedule.notes,
                schedule.priority_level,
                schedule.status,
                schedule.alarm_enabled,
                schedule.alarm_before_minutes,
                schedule.notification_browser,
                schedule.notification_sound,
                schedule.is_featured
            ))

            row = cur.fetchone()
            conn.commit()

            if row:
                return ScheduleResponse(
                    id=row[0],
                    scheduler_id=row[1],
                    scheduler_role=row[2],
                    title=row[3],
                    description=row[4],
                    year=row[5],
                    schedule_type=row[6],
                    months=row[7] or [],
                    days=row[8] or [],
                    specific_dates=row[9] or [],
                    start_time=str(row[10]) if row[10] else None,
                    end_time=str(row[11]) if row[11] else None,
                    notes=row[12],
                    priority_level=row[13] or 'medium',
                    status=row[14] or 'active',
                    alarm_enabled=row[15] or False,
                    alarm_before_minutes=row[16],
                    notification_browser=row[17] or False,
                    notification_sound=row[18] or False,
                    is_featured=row[19] or False,
                    created_at=row[20],
                    updated_at=row[21]
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create schedule"
                )

    except psycopg.Error as e:
        conn.rollback()
        print(f"Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        conn.close()


@router.get("/api/tutor/schedules", response_model=List[ScheduleResponse])
async def get_tutor_schedules(
    current_user = Depends(get_current_user)
):
    """
    Get all schedules for the authenticated tutor from unified schedules table

    - Returns schedules ordered by creation date (newest first)
    """
    # Verify user is a tutor
    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can view schedules"
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

            # Get schedules from unified schedules table for this tutor
            cur.execute("""
                SELECT id, scheduler_id, scheduler_role, title, description, year,
                       schedule_type, months, days, specific_dates, start_time, end_time,
                       notes, priority_level, status, alarm_enabled, alarm_before_minutes,
                       notification_browser, notification_sound, is_featured, created_at, updated_at
                FROM schedules
                WHERE scheduler_id = %s AND scheduler_role = 'tutor'
                ORDER BY created_at DESC
            """, (tutor_profile_id,))

            rows = cur.fetchall()

            schedules = []
            for row in rows:
                schedules.append(ScheduleResponse(
                    id=row[0],
                    scheduler_id=row[1],
                    scheduler_role=row[2],
                    title=row[3],
                    description=row[4],
                    year=row[5],
                    schedule_type=row[6],
                    months=row[7] or [],
                    days=row[8] or [],
                    specific_dates=row[9] or [],
                    start_time=str(row[10]) if row[10] else None,
                    end_time=str(row[11]) if row[11] else None,
                    notes=row[12],
                    priority_level=row[13] or 'medium',
                    status=row[14] or 'active',
                    alarm_enabled=row[15] or False,
                    alarm_before_minutes=row[16],
                    notification_browser=row[17] or False,
                    notification_sound=row[18] or False,
                    is_featured=row[19] or False,
                    created_at=row[20],
                    updated_at=row[21]
                ))

            return schedules

    except psycopg.Error as e:
        print(f"Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        conn.close()


@router.get("/api/tutor/schedules/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule(
    schedule_id: int,
    current_user = Depends(get_current_user)
):
    """
    Get a specific schedule by ID from unified schedules table

    - Tutor can only access their own schedules
    """
    # Verify user is a tutor
    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can view schedules"
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

            cur.execute("""
                SELECT id, scheduler_id, scheduler_role, title, description, year,
                       schedule_type, months, days, specific_dates, start_time, end_time,
                       notes, priority_level, status, alarm_enabled, alarm_before_minutes,
                       notification_browser, notification_sound, is_featured, created_at, updated_at
                FROM schedules
                WHERE id = %s AND scheduler_id = %s AND scheduler_role = 'tutor'
            """, (schedule_id, tutor_profile_id))

            row = cur.fetchone()

            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Schedule not found"
                )

            return ScheduleResponse(
                id=row[0],
                scheduler_id=row[1],
                scheduler_role=row[2],
                title=row[3],
                description=row[4],
                year=row[5],
                schedule_type=row[6],
                months=row[7] or [],
                days=row[8] or [],
                specific_dates=row[9] or [],
                start_time=str(row[10]) if row[10] else None,
                end_time=str(row[11]) if row[11] else None,
                notes=row[12],
                priority_level=row[13] or 'medium',
                status=row[14] or 'active',
                alarm_enabled=row[15] or False,
                alarm_before_minutes=row[16],
                notification_browser=row[17] or False,
                notification_sound=row[18] or False,
                is_featured=row[19] or False,
                created_at=row[20],
                updated_at=row[21]
            )

    except psycopg.Error as e:
        print(f"Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        conn.close()


@router.put("/api/tutor/schedules/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: int,
    schedule: ScheduleCreate,
    current_user = Depends(get_current_user)
):
    """
    Update an existing schedule in unified schedules table

    - Tutor can only update their own schedules
    """
    # Verify user is a tutor
    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can update schedules"
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

            # Update schedule in unified schedules table
            cur.execute("""
                UPDATE schedules
                SET title = %s, description = %s, year = %s, schedule_type = %s,
                    months = %s, days = %s, specific_dates = %s, start_time = %s,
                    end_time = %s, notes = %s, priority_level = %s, status = %s,
                    alarm_enabled = %s, alarm_before_minutes = %s,
                    notification_browser = %s, notification_sound = %s,
                    is_featured = %s, updated_at = NOW()
                WHERE id = %s AND scheduler_id = %s AND scheduler_role = 'tutor'
                RETURNING id, scheduler_id, scheduler_role, title, description, year,
                          schedule_type, months, days, specific_dates, start_time, end_time,
                          notes, priority_level, status, alarm_enabled, alarm_before_minutes,
                          notification_browser, notification_sound, is_featured, created_at, updated_at
            """, (
                schedule.title,
                schedule.description,
                schedule.year,
                schedule.schedule_type,
                schedule.months,
                schedule.days,
                schedule.specific_dates or [],
                schedule.start_time,
                schedule.end_time,
                schedule.notes,
                schedule.priority_level,
                schedule.status,
                schedule.alarm_enabled,
                schedule.alarm_before_minutes,
                schedule.notification_browser,
                schedule.notification_sound,
                schedule.is_featured,
                schedule_id,
                tutor_profile_id
            ))

            row = cur.fetchone()
            conn.commit()

            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Schedule not found or you don't have permission to update it"
                )

            return ScheduleResponse(
                id=row[0],
                scheduler_id=row[1],
                scheduler_role=row[2],
                title=row[3],
                description=row[4],
                year=row[5],
                schedule_type=row[6],
                months=row[7] or [],
                days=row[8] or [],
                specific_dates=row[9] or [],
                start_time=str(row[10]) if row[10] else None,
                end_time=str(row[11]) if row[11] else None,
                notes=row[12],
                priority_level=row[13] or 'medium',
                status=row[14] or 'active',
                alarm_enabled=row[15] or False,
                alarm_before_minutes=row[16],
                notification_browser=row[17] or False,
                notification_sound=row[18] or False,
                is_featured=row[19] or False,
                created_at=row[20],
                updated_at=row[21]
            )

    except psycopg.Error as e:
        conn.rollback()
        print(f"Database error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        conn.close()


@router.delete("/api/tutor/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: int,
    current_user = Depends(get_current_user)
):
    """
    Delete a schedule from unified schedules table

    - Tutor can only delete their own schedules
    """
    # Verify user is a tutor
    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can delete schedules"
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

            cur.execute("""
                DELETE FROM schedules
                WHERE id = %s AND scheduler_id = %s AND scheduler_role = 'tutor'
                RETURNING id
            """, (schedule_id, tutor_profile_id))

            row = cur.fetchone()
            conn.commit()

            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Schedule not found or you don't have permission to delete it"
                )

            return None

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
# TOGGLE ENDPOINTS FOR NOTIFICATION, ALARM, AND FEATURED
# ============================================

class ToggleNotificationRequest(BaseModel):
    notification_browser: bool

class ToggleAlarmRequest(BaseModel):
    alarm_enabled: bool

class ToggleFeaturedRequest(BaseModel):
    is_featured: bool


@router.patch("/api/tutor/schedules/{schedule_id}/toggle-notification")
async def toggle_schedule_notification(
    schedule_id: int,
    request: ToggleNotificationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Toggle browser notification for a specific schedule in unified schedules table"""
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

            # Verify the schedule belongs to the tutor
            cur.execute("""
                SELECT id FROM schedules
                WHERE id = %s AND scheduler_id = %s AND scheduler_role = 'tutor'
            """, (schedule_id, tutor_profile_id))

            if not cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Schedule not found or you don't have permission"
                )

            # Update notification setting
            cur.execute("""
                UPDATE schedules
                SET notification_browser = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND scheduler_id = %s AND scheduler_role = 'tutor'
                RETURNING notification_browser
            """, (request.notification_browser, schedule_id, tutor_profile_id))

            result = cur.fetchone()
            conn.commit()

            return {
                "message": f"Notification {'enabled' if request.notification_browser else 'disabled'}",
                "schedule_id": schedule_id,
                "notification_browser": result[0]
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


@router.patch("/api/tutor/schedules/{schedule_id}/toggle-alarm")
async def toggle_schedule_alarm(
    schedule_id: int,
    request: ToggleAlarmRequest,
    current_user: dict = Depends(get_current_user)
):
    """Toggle alarm for a specific schedule in unified schedules table"""
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

            # Verify the schedule belongs to the tutor
            cur.execute("""
                SELECT id FROM schedules
                WHERE id = %s AND scheduler_id = %s AND scheduler_role = 'tutor'
            """, (schedule_id, tutor_profile_id))

            if not cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Schedule not found or you don't have permission"
                )

            # Update alarm setting
            cur.execute("""
                UPDATE schedules
                SET alarm_enabled = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND scheduler_id = %s AND scheduler_role = 'tutor'
                RETURNING alarm_enabled
            """, (request.alarm_enabled, schedule_id, tutor_profile_id))

            result = cur.fetchone()
            conn.commit()

            return {
                "message": f"Alarm {'enabled' if request.alarm_enabled else 'disabled'}",
                "schedule_id": schedule_id,
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


@router.patch("/api/tutor/schedules/{schedule_id}/toggle-featured")
async def toggle_schedule_featured(
    schedule_id: int,
    request: ToggleFeaturedRequest,
    current_user: dict = Depends(get_current_user)
):
    """Toggle featured status for a specific schedule in unified schedules table"""
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

            # Verify the schedule belongs to the tutor
            cur.execute("""
                SELECT id FROM schedules
                WHERE id = %s AND scheduler_id = %s AND scheduler_role = 'tutor'
            """, (schedule_id, tutor_profile_id))

            if not cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Schedule not found or you don't have permission"
                )

            # Update featured status
            cur.execute("""
                UPDATE schedules
                SET is_featured = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND scheduler_id = %s AND scheduler_role = 'tutor'
                RETURNING is_featured
            """, (request.is_featured, schedule_id, tutor_profile_id))

            result = cur.fetchone()
            conn.commit()

            return {
                "message": f"Schedule {'featured' if request.is_featured else 'unfeatured'}",
                "schedule_id": schedule_id,
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
