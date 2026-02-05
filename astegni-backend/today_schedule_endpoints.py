"""
Today's Schedule Widget Endpoints
Returns combined data from schedules and sessions tables for the current day
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import List, Optional
from datetime import datetime, date, time as time_type
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
    """Get current authenticated user"""
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
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database error in get_current_user: {e}")
        raise credentials_exception
    finally:
        conn.close()

router = APIRouter()

@router.get("/api/today-schedule")
async def get_today_schedule(current_user = Depends(get_current_user)):
    """
    Get today's schedule combining:
    1. Schedules table - recurring schedules that match today's day, or specific dates that include today
    2. Sessions table - actual sessions scheduled for today

    Returns items sorted by time for easy display in widget
    """
    user_id = current_user['id']
    active_role = current_user.get('active_role', 'user')

    today = datetime.now().date()
    day_name = today.strftime('%A')  # Monday, Tuesday, etc.
    today_str = today.isoformat()

    conn = get_db_connection()
    schedule_items = []

    try:
        with conn.cursor() as cur:
            # 1. Get schedules from schedules table
            # For tutors, get their own schedules
            if active_role == 'tutor':
                cur.execute("""
                    SELECT id, title, description, schedule_type, days, specific_dates,
                           start_time, end_time, priority_level, status, notes
                    FROM schedules
                    WHERE scheduler_id = %s
                      AND scheduler_role = %s
                      AND status = 'active'
                      AND (
                          -- Recurring schedules matching today's day
                          (schedule_type = 'recurring' AND %s = ANY(days))
                          OR
                          -- Specific date schedules including today
                          (schedule_type = 'specific' AND %s = ANY(specific_dates))
                      )
                    ORDER BY start_time;
                """, (user_id, active_role, day_name, today_str))

                for row in cur.fetchall():
                    schedule_items.append({
                        'id': row[0],
                        'type': 'schedule',
                        'title': row[1],
                        'description': row[2],
                        'schedule_type': row[3],
                        'start_time': str(row[6]),
                        'end_time': str(row[7]),
                        'priority_level': row[8],
                        'notes': row[10],
                        'source': 'schedules'
                    })

            # 2. Get actual sessions from sessions table
            # For tutors, get sessions where they are the tutor
            if active_role == 'tutor':
                # Get tutor_profile_id first
                cur.execute("""
                    SELECT id FROM tutor_profiles WHERE user_id = %s LIMIT 1;
                """, (user_id,))
                tutor_profile_row = cur.fetchone()

                if tutor_profile_row:
                    tutor_profile_id = tutor_profile_row[0]

                    # Get today's sessions for this tutor
                    cur.execute("""
                        SELECT s.id, s.session_date, s.start_time, s.end_time,
                               s.session_mode, s.location, s.status,
                               s.tutor_attendance_status, s.student_attendance_status,
                               es.student_id, sp.user_id as student_user_id,
                               u.first_name, u.father_name,
                               tp.subject, tp.grade_level
                        FROM sessions s
                        INNER JOIN enrolled_students es ON s.enrolled_courses_id = es.id
                        LEFT JOIN student_profiles sp ON es.student_id = sp.id
                        LEFT JOIN users u ON sp.user_id = u.id
                        LEFT JOIN tutor_packages tp ON es.package_id = tp.id
                        WHERE es.tutor_id = %s
                          AND s.session_date = %s
                          AND s.status IN ('scheduled', 'in_progress')
                        ORDER BY s.start_time;
                    """, (tutor_profile_id, today))

                    for row in cur.fetchall():
                        student_name = f"{row[11]} {row[12]}" if row[11] else "Student"
                        subject = row[13] or "Session"
                        grade_level = row[14] or ""

                        schedule_items.append({
                            'id': row[0],
                            'type': 'session',
                            'title': subject,
                            'description': f"{student_name}" + (f" - Grade {grade_level}" if grade_level else ""),
                            'start_time': str(row[2]),
                            'end_time': str(row[3]),
                            'session_mode': row[4],
                            'location': row[5],
                            'status': row[6],
                            'tutor_attendance': row[7],
                            'student_attendance': row[8],
                            'source': 'sessions'
                        })

        # Sort all items by start time
        schedule_items.sort(key=lambda x: x['start_time'])

        return {
            'success': True,
            'date': today_str,
            'day': day_name,
            'items': schedule_items,
            'count': len(schedule_items)
        }

    except Exception as e:
        print(f"Error fetching today's schedule: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch today's schedule: {str(e)}"
        )
    finally:
        conn.close()
