"""
Whiteboard System Endpoints

API endpoints for the collaborative digital whiteboard feature
"""

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Header, UploadFile, File, Form, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import sys
import os
import psycopg
import jwt
from jwt.exceptions import PyJWTError

# JWT Configuration - MUST match config.py SECRET_KEY
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"

router = APIRouter(prefix="/api/whiteboard", tags=["whiteboard"])

# Pydantic models for request bodies
class QuickCreateSessionRequest(BaseModel):
    participant_profile_id: int
    participant_profile_type: str
    session_title: str = "Whiteboard Session"
    host_profile_type: Optional[str] = None  # Optional: specify which role the host is using (tutor/student)

# Database connection helper
def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        database_url = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"
    return psycopg.connect(database_url)


# Authentication helper
async def get_current_user(authorization: Optional[str] = Header(None)):
    """Get current user from JWT token - returns dict"""
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated - No authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # Remove "Bearer " prefix if present
        token = authorization.replace("Bearer ", "").strip()

        # Decode JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token payload - no user ID",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Extract role_ids and active_role from JWT token
        role_ids = payload.get("role_ids", {})
        active_role = payload.get("role")

        # Return user dict with info from JWT
        return {
            "id": int(user_id),
            "sub": user_id,
            "role_ids": role_ids,
            "active_role": active_role,
            "roles": list(role_ids.keys()) if role_ids else []
        }

    except (PyJWTError, ValueError) as e:
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ============================================================================
# Pydantic Models
# ============================================================================

class BookingCreate(BaseModel):
    tutor_id: int
    subject: str
    grade_level: Optional[str] = None
    session_type: str = "online"
    sessions_per_week: int = 1
    session_duration: int = 60
    start_date: str
    price_per_session: float
    notes: Optional[str] = None

class SessionCreate(BaseModel):
    booking_id: int
    session_title: str
    session_description: Optional[str] = None
    scheduled_start: str
    scheduled_end: str

class PermissionsUpdate(BaseModel):
    can_draw: bool = False
    can_write: bool = False
    can_erase: bool = False

class CanvasStroke(BaseModel):
    page_id: int
    stroke_type: str  # pen, eraser, line, rectangle, circle, text, arrow
    stroke_data: Dict[str, Any]

class ChatMessage(BaseModel):
    session_id: int
    message_text: str
    message_type: str = "text"

class RecordingCreate(BaseModel):
    session_id: int
    recording_title: str
    recording_type: str = "video"  # 'video', 'screen', 'board'
    file_url: Optional[str] = None
    duration_seconds: Optional[int] = None
    board_snapshot: Optional[Dict[str, Any]] = None

# ============================================================================
# Booking Endpoints
# ============================================================================

@router.post("/bookings")
async def create_booking(booking: BookingCreate, current_user = Depends(get_current_user)):
    """Create a new tutor-student booking"""


    # Only students can create bookings
    if 'student' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Only students can create bookings")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO tutor_student_bookings (
                tutor_id, student_id, subject, grade_level,
                session_type, sessions_per_week, session_duration,
                start_date, status, price_per_session, currency, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            booking.tutor_id, current_user.get('id'), booking.subject,
            booking.grade_level, booking.session_type, booking.sessions_per_week,
            booking.session_duration, booking.start_date, 'active',
            booking.price_per_session, 'ETB', booking.notes
        ))

        result = cursor.fetchone()
        conn.commit()

        return {
            "success": True,
            "booking_id": result[0],
            "created_at": result[1].isoformat()
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.get("/bookings/my-students")
async def get_tutor_students(current_user = Depends(get_current_user)):
    """Get all students enrolled with this tutor"""


    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Only tutors can access this endpoint")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                b.id, b.student_id, b.subject, b.grade_level,
                b.session_type, b.sessions_per_week, b.session_duration,
                b.start_date, b.end_date, b.status,
                b.price_per_session, b.currency, b.created_at,
                CONCAT(u.first_name, ' ', u.father_name, ' ', u.grandfather_name) as student_name, u.email as student_email,
                s.profile_picture as student_photo
            FROM tutor_student_bookings b
            JOIN users u ON b.student_id = u.id
            LEFT JOIN student_profiles s ON b.student_id = s.user_id
            WHERE b.tutor_id = %s AND b.status = 'active'
            ORDER BY b.created_at DESC
        """, (current_user.get('id'),))

        bookings = []
        for row in cursor.fetchall():
            bookings.append({
                'id': row[0],
                'student_id': row[1],
                'subject': row[2],
                'grade_level': row[3],
                'session_type': row[4],
                'sessions_per_week': row[5],
                'session_duration': row[6],
                'start_date': row[7].isoformat() if row[7] else None,
                'end_date': row[8].isoformat() if row[8] else None,
                'status': row[9],
                'price_per_session': float(row[10]) if row[10] else 0,
                'currency': row[11],
                'created_at': row[12].isoformat(),
                'student_name': row[13],
                'student_email': row[14],
                'student_photo': row[15]
            })

        return {"success": True, "bookings": bookings}

    finally:
        cursor.close()
        conn.close()


@router.get("/bookings/my-tutors")
async def get_student_tutors(current_user = Depends(get_current_user)):
    """Get all tutors this student is enrolled with"""


    if 'student' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                b.id, b.tutor_id, b.subject, b.grade_level,
                b.session_type, b.sessions_per_week, b.session_duration,
                b.start_date, b.end_date, b.status,
                b.price_per_session, b.currency, b.created_at,
                CONCAT(u.first_name, ' ', u.father_name, ' ', u.grandfather_name) as tutor_name, u.email as tutor_email,
                t.profile_picture as tutor_photo,
                t.teaching_experience, t.hourly_rate
            FROM tutor_student_bookings b
            JOIN users u ON b.tutor_id = u.id
            LEFT JOIN tutor_profiles t ON b.tutor_id = t.user_id
            WHERE b.student_id = %s AND b.status = 'active'
            ORDER BY b.created_at DESC
        """, (current_user.get('id'),))

        bookings = []
        for row in cursor.fetchall():
            bookings.append({
                'id': row[0],
                'tutor_id': row[1],
                'subject': row[2],
                'grade_level': row[3],
                'session_type': row[4],
                'sessions_per_week': row[5],
                'session_duration': row[6],
                'start_date': row[7].isoformat() if row[7] else None,
                'end_date': row[8].isoformat() if row[8] else None,
                'status': row[9],
                'price_per_session': float(row[10]) if row[10] else 0,
                'currency': row[11],
                'created_at': row[12].isoformat(),
                'tutor_name': row[13],
                'tutor_email': row[14],
                'tutor_photo': row[15],
                'teaching_experience': row[16],
                'hourly_rate': float(row[17]) if row[17] else 0
            })

        return {"success": True, "bookings": bookings}

    finally:
        cursor.close()
        conn.close()


# ============================================================================
# Session Endpoints
# ============================================================================

@router.get("/sessions")
async def get_sessions_by_student(
    student_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """
    Get whiteboard sessions where current user is host or participant.

    Query params:
    - student_id: Filter by student profile ID (optional)
    - status: Filter by session status (scheduled, in-progress, completed, cancelled)

    Returns list of sessions with stats.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get current user's profile ID for their active role
        current_profile_id = current_user.get('role_ids', {}).get(current_user.get('active_role'))
        current_role = current_user.get('active_role')

        if not current_profile_id:
            raise HTTPException(status_code=403, detail="No valid profile found for current role")

        # Build query - sessions where user is host OR participant
        query = """
            SELECT
                ws.id,
                ws.session_title,
                ws.session_description,
                ws.scheduled_start,
                ws.scheduled_end,
                ws.actual_start,
                ws.actual_end,
                ws.status,
                ws.student_permissions,
                ws.is_recording,
                ws.has_recordings,
                ws.created_at,
                ws.booking_id,
                ws.participant_profile_ids as participant_ids
            FROM whiteboard_sessions ws
            WHERE (ws.host_profile_id = %s AND ws.host_profile_type = %s)
               OR (%s = ANY(ws.participant_profile_ids))
        """
        params = [current_profile_id, current_role, current_profile_id]

        # Filter by student_id if provided (check if student is in participants)
        if student_id:
            query += " AND %s = ANY(ws.participant_profile_ids)"
            params.append(student_id)

        # Filter by status if provided
        if status and status != 'all':
            query += " AND ws.status = %s"
            params.append(status)

        query += " ORDER BY ws.scheduled_start DESC"

        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()

        sessions = []
        for row in rows:
            # Calculate duration in minutes
            duration_minutes = None
            if row[5] and row[6]:  # actual_start and actual_end
                duration = row[6] - row[5]
                duration_minutes = int(duration.total_seconds() / 60)
            elif row[3] and row[4]:  # scheduled_start and scheduled_end
                duration = row[4] - row[3]
                duration_minutes = int(duration.total_seconds() / 60)

            sessions.append({
                "id": row[0],
                "session_title": row[1] or "Untitled Session",
                "session_description": row[2],
                "scheduled_start": row[3].isoformat() if row[3] else None,
                "scheduled_end": row[4].isoformat() if row[4] else None,
                "actual_start": row[5].isoformat() if row[5] else None,
                "actual_end": row[6].isoformat() if row[6] else None,
                "status": row[7] or "scheduled",
                "student_permissions": row[8] if row[8] else {"can_draw": False, "can_write": False, "can_erase": False},
                "is_recording": row[9] or False,
                "has_recordings": row[10] or False,
                "created_at": row[11].isoformat() if row[11] else None,
                "booking_id": row[12],
                "participant_ids": row[13] or [],
                "duration_minutes": duration_minutes
            })

        # Calculate stats
        total = len(sessions)
        completed = len([s for s in sessions if s["status"] == "completed"])
        scheduled = len([s for s in sessions if s["status"] == "scheduled"])
        in_progress = len([s for s in sessions if s["status"] == "in-progress"])

        total_minutes = sum(s["duration_minutes"] or 0 for s in sessions)
        total_hours = round(total_minutes / 60, 1)

        return {
            "sessions": sessions,
            "stats": {
                "total": total,
                "completed": completed,
                "scheduled": scheduled,
                "in_progress": in_progress,
                "total_hours": total_hours
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.post("/sessions")
async def create_session(session: SessionCreate, current_user = Depends(get_current_user)):
    """Create a new whiteboard session"""


    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Only tutors can create sessions")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get tutor profile ID from JWT
        role_ids = current_user.get('role_ids', {})
        tutor_profile_id = role_ids.get('tutor')

        if not tutor_profile_id:
            raise HTTPException(status_code=403, detail="Tutor profile not found")

        # Verify booking belongs to this tutor
        cursor.execute("""
            SELECT student_id FROM tutor_student_bookings
            WHERE id = %s AND tutor_id = %s
        """, (session.booking_id, current_user.get('id')))

        booking = cursor.fetchone()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        student_user_id = booking[0]

        # Get student profile ID from user ID
        cursor.execute("""
            SELECT id FROM student_profiles WHERE user_id = %s
        """, (student_user_id,))

        student_profile = cursor.fetchone()
        if not student_profile:
            raise HTTPException(status_code=404, detail="Student profile not found")

        student_profile_id = student_profile[0]

        # Create session with profile IDs (tutor as host, student as participant)
        cursor.execute("""
            INSERT INTO whiteboard_sessions (
                booking_id,
                host_profile_id, host_profile_type,
                participant_profile_ids, participant_profile_types,
                session_title, session_description,
                scheduled_start, scheduled_end, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            session.booking_id,
            tutor_profile_id, 'tutor',
            [student_profile_id], ['student'],
            session.session_title, session.session_description,
            session.scheduled_start, session.scheduled_end, 'scheduled'
        ))

        session_id = cursor.fetchone()[0]

        # Create first page
        cursor.execute("""
            INSERT INTO whiteboard_pages (
                session_id, page_number, page_title, is_active
            ) VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (session_id, 1, f"Page 1 - {session.session_title}", True))

        page_id = cursor.fetchone()[0]

        conn.commit()

        return {
            "success": True,
            "session_id": session_id,
            "page_id": page_id
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.post("/sessions/quick-create")
async def quick_create_session(
    request: QuickCreateSessionRequest,
    current_user = Depends(get_current_user)
):
    """
    Create a whiteboard session directly with profile IDs (for video call sessions)
    The current user is the host, participant is provided.

    IMPORTANT: Always creates a fresh session. History should be loaded explicitly
    by clicking on a history card, not automatically when starting a new call.
    """
    participant_profile_id = request.participant_profile_id
    participant_profile_type = request.participant_profile_type
    session_title = request.session_title
    requested_host_type = request.host_profile_type  # The role the user is currently operating as

    # Get current user's role and profile ID
    role_ids = current_user.get('role_ids', {})
    roles = current_user.get('roles', [])

    # Determine host profile ID and type
    # IMPORTANT: If host_profile_type is provided, use that role (user may have multiple roles)
    # This ensures a student opening whiteboard doesn't accidentally become host as their tutor profile
    if requested_host_type and requested_host_type in ['tutor', 'student']:
        # Use the explicitly requested role
        host_profile_id = role_ids.get(requested_host_type)
        host_profile_type = requested_host_type
        if not host_profile_id:
            raise HTTPException(status_code=403, detail=f"No {requested_host_type} profile found for user")
    elif 'tutor' in roles and role_ids.get('tutor'):
        # Fallback: prefer tutor if no specific role requested
        host_profile_id = role_ids['tutor']
        host_profile_type = 'tutor'
    elif 'student' in roles and role_ids.get('student'):
        host_profile_id = role_ids['student']
        host_profile_type = 'student'
    else:
        raise HTTPException(status_code=403, detail="No valid profile found")

    print(f"🎨 Quick-create session: host={host_profile_type}_{host_profile_id}, participant={participant_profile_type}_{participant_profile_id}")

    if participant_profile_type not in ['tutor', 'student']:
        raise HTTPException(status_code=400, detail="Invalid participant_profile_type")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Always create a fresh session for new calls
        # Users can load history explicitly by clicking on history cards
        cursor.execute("""
            INSERT INTO whiteboard_sessions (
                host_profile_id, host_profile_type,
                participant_profile_ids, participant_profile_types,
                session_title, session_description,
                scheduled_start, scheduled_end, status
            ) VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW() + INTERVAL '2 hours', %s)
            RETURNING id
        """, (
            host_profile_id, host_profile_type,
            [participant_profile_id], [participant_profile_type],
            session_title, f"Quick session between {host_profile_type} and {participant_profile_type}",
            'in-progress'  # Start as in-progress since created from active call
        ))

        session_id = cursor.fetchone()[0]

        # Create first page
        cursor.execute("""
            INSERT INTO whiteboard_pages (
                session_id, page_number, page_title, is_active
            ) VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (session_id, 1, f"Page 1 - {session_title}", True))

        page_id = cursor.fetchone()[0]

        conn.commit()

        return {
            "success": True,
            "session_id": session_id,
            "page_id": page_id,
            "existing": False
        }

    except Exception as e:
        conn.rollback()
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        print(f"❌ Error creating session: {error_detail}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.get("/sessions/{session_id}")
async def get_session(session_id: int, current_user = Depends(get_current_user)):
    """Get session details with pages and canvas data"""


    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get session details using profile-based columns only
        cursor.execute("""
            SELECT
                s.id, s.booking_id,
                s.host_profile_id,
                s.host_profile_type,
                s.participant_profile_ids,
                s.participant_profile_types,
                s.session_title, s.session_description,
                s.scheduled_start, s.scheduled_end,
                s.actual_start, s.actual_end, s.status,
                s.student_permissions, s.session_notes
            FROM whiteboard_sessions s
            WHERE s.id = %s
        """, (session_id,))

        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Extract session data
        host_profile_id = session[2]
        host_profile_type = session[3]
        participant_profile_ids = session[4] or []
        participant_profile_types = session[5] or []

        # Verify user is part of this session (host or participant)
        role_ids = current_user.get('role_ids', {})
        current_role = current_user.get('active_role')
        current_profile_id = role_ids.get(current_role)

        if not current_profile_id:
            raise HTTPException(status_code=403, detail="No valid profile found for current role")

        # Check if user is host or participant
        has_access = False

        # Check if user is the host
        if host_profile_id == current_profile_id and host_profile_type == current_role:
            has_access = True
            print(f"✅ Access granted: User is host ({host_profile_type} profile_id {host_profile_id})")

        # Check if user is a participant
        if not has_access and current_profile_id in participant_profile_ids:
            has_access = True
            print(f"✅ Access granted: User is participant (profile_id {current_profile_id})")

        if not has_access:
            print(f"❌ Access denied: User is not part of this session")
            raise HTTPException(status_code=403, detail="Access denied")

        # Get user names for host and first participant
        host_name = None
        participant_name = None

        # Get host name based on profile type
        if host_profile_type == 'tutor':
            cursor.execute("""
                SELECT CONCAT(u.first_name, ' ', u.father_name, ' ', u.grandfather_name)
                FROM tutor_profiles tp
                JOIN users u ON tp.user_id = u.id
                WHERE tp.id = %s
            """, (host_profile_id,))
        else:  # student
            cursor.execute("""
                SELECT CONCAT(u.first_name, ' ', u.father_name, ' ', u.grandfather_name)
                FROM student_profiles sp
                JOIN users u ON sp.user_id = u.id
                WHERE sp.id = %s
            """, (host_profile_id,))

        host_result = cursor.fetchone()
        if host_result:
            host_name = host_result[0]

        # Get first participant name
        if participant_profile_ids and participant_profile_types:
            first_participant_id = participant_profile_ids[0]
            first_participant_type = participant_profile_types[0]

            if first_participant_type == 'tutor':
                cursor.execute("""
                    SELECT CONCAT(u.first_name, ' ', u.father_name, ' ', u.grandfather_name)
                    FROM tutor_profiles tp
                    JOIN users u ON tp.user_id = u.id
                    WHERE tp.id = %s
                """, (first_participant_id,))
            else:  # student
                cursor.execute("""
                    SELECT CONCAT(u.first_name, ' ', u.father_name, ' ', u.grandfather_name)
                    FROM student_profiles sp
                    JOIN users u ON sp.user_id = u.id
                    WHERE sp.id = %s
                """, (first_participant_id,))

            participant_result = cursor.fetchone()
            if participant_result:
                participant_name = participant_result[0]

        # Get pages
        cursor.execute("""
            SELECT id, page_number, page_title, background_color, is_active
            FROM whiteboard_pages
            WHERE session_id = %s
            ORDER BY page_number
        """, (session_id,))

        pages = []
        for page_row in cursor.fetchall():
            page_id = page_row[0]

            # Get canvas data for this page
            cursor.execute("""
                SELECT id, user_id, stroke_type, stroke_data, stroke_order
                FROM whiteboard_canvas_data
                WHERE page_id = %s AND is_deleted = false
                ORDER BY stroke_order
            """, (page_id,))

            strokes = []
            for stroke_row in cursor.fetchall():
                strokes.append({
                    'id': stroke_row[0],
                    'user_id': stroke_row[1],
                    'stroke_type': stroke_row[2],
                    'stroke_data': stroke_row[3],
                    'stroke_order': stroke_row[4]
                })

            pages.append({
                'id': page_id,
                'page_number': page_row[1],
                'page_title': page_row[2],
                'background_color': page_row[3],
                'is_active': page_row[4],
                'strokes': strokes
            })

        # Return session with profile-based data
        return {
            "success": True,
            "session": {
                'id': session[0],
                'booking_id': session[1],
                'host_profile_id': host_profile_id,
                'host_profile_type': host_profile_type,
                'participant_profile_ids': participant_profile_ids,
                'participant_profile_types': participant_profile_types,
                'session_title': session[6],
                'session_description': session[7],
                'scheduled_start': session[8].isoformat() if session[8] else None,
                'scheduled_end': session[9].isoformat() if session[9] else None,
                'actual_start': session[10].isoformat() if session[10] else None,
                'actual_end': session[11].isoformat() if session[11] else None,
                'status': session[12],
                'student_permissions': session[13],
                'session_notes': session[14],
                'host_name': host_name,
                'participant_name': participant_name,
                # Legacy fields for backward compatibility with frontend
                'tutor_id': host_profile_id if host_profile_type == 'tutor' else (participant_profile_ids[0] if participant_profile_ids and participant_profile_types[0] == 'tutor' else None),
                'student_id': participant_profile_ids[0] if participant_profile_ids and participant_profile_types[0] == 'student' else (host_profile_id if host_profile_type == 'student' else None),
                'tutor_name': host_name if host_profile_type == 'tutor' else participant_name,
                'student_name': participant_name if participant_profile_types and participant_profile_types[0] == 'student' else (host_name if host_profile_type == 'student' else None),
                'pages': pages
            }
        }

    finally:
        cursor.close()
        conn.close()


@router.get("/sessions/history/{user_type}/{user_id}")
async def get_session_history(user_type: str, user_id: int, current_user = Depends(get_current_user)):
    """Get session history for current user (as host or participant)"""


    # Get current user's profile ID for the specified role type
    role_ids = current_user.get('role_ids', {})
    profile_id = role_ids.get(user_type)

    if not profile_id or profile_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if whiteboard tables exist
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'whiteboard_sessions'
            )
        """)
        whiteboard_table_exists = cursor.fetchone()[0]

        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'tutor_student_bookings'
            )
        """)
        bookings_table_exists = cursor.fetchone()[0]

        if not whiteboard_table_exists or not bookings_table_exists:
            # Tables don't exist yet - return empty list gracefully
            return {"success": True, "sessions": [], "message": "Whiteboard tables not yet created"}

        # Get sessions where user is host OR participant
        cursor.execute("""
            SELECT
                s.id, s.session_title, s.session_description,
                s.scheduled_start, s.scheduled_end,
                s.actual_start, s.actual_end, s.status,
                s.session_notes, s.attendance_status,
                b.subject, b.grade_level,
                s.host_profile_id, s.host_profile_type,
                s.participant_profile_ids, s.participant_profile_types
            FROM whiteboard_sessions s
            LEFT JOIN tutor_student_bookings b ON s.booking_id = b.id
            WHERE (s.host_profile_id = %s AND s.host_profile_type = %s)
               OR (%s = ANY(s.participant_profile_ids))
            ORDER BY s.scheduled_start DESC
            LIMIT 50
        """, (profile_id, user_type, profile_id))

        sessions = []
        for row in cursor.fetchall():
            # Determine other user based on whether current user is host or participant
            host_profile_id = row[12]
            host_profile_type = row[13]
            participant_profile_ids = row[14] or []
            participant_profile_types = row[15] or []

            # Get other user name (if I'm host, get first participant; if I'm participant, get host)
            other_user_name = None
            if host_profile_id == profile_id:
                # I'm the host, get first participant name
                if participant_profile_ids and participant_profile_types:
                    first_part_id = participant_profile_ids[0]
                    first_part_type = participant_profile_types[0]
                    # Fetch name based on type
                    if first_part_type == 'tutor':
                        cursor.execute("SELECT CONCAT(u.first_name, ' ', u.father_name, ' ', u.grandfather_name) FROM tutor_profiles tp JOIN users u ON tp.user_id = u.id WHERE tp.id = %s", (first_part_id,))
                    else:
                        cursor.execute("SELECT CONCAT(u.first_name, ' ', u.father_name, ' ', u.grandfather_name) FROM student_profiles sp JOIN users u ON sp.user_id = u.id WHERE sp.id = %s", (first_part_id,))
                    name_result = cursor.fetchone()
                    if name_result:
                        other_user_name = name_result[0]
            else:
                # I'm a participant, get host name
                if host_profile_type == 'tutor':
                    cursor.execute("SELECT CONCAT(u.first_name, ' ', u.father_name, ' ', u.grandfather_name) FROM tutor_profiles tp JOIN users u ON tp.user_id = u.id WHERE tp.id = %s", (host_profile_id,))
                else:
                    cursor.execute("SELECT CONCAT(u.first_name, ' ', u.father_name, ' ', u.grandfather_name) FROM student_profiles sp JOIN users u ON sp.user_id = u.id WHERE sp.id = %s", (host_profile_id,))
                name_result = cursor.fetchone()
                if name_result:
                    other_user_name = name_result[0]

            sessions.append({
                'id': row[0],
                'session_title': row[1],
                'session_description': row[2],
                'scheduled_start': row[3].isoformat() if row[3] else None,
                'scheduled_end': row[4].isoformat() if row[4] else None,
                'actual_start': row[5].isoformat() if row[5] else None,
                'actual_end': row[6].isoformat() if row[6] else None,
                'status': row[7],
                'session_notes': row[8],
                'attendance_status': row[9],
                'subject': row[10],
                'grade_level': row[11],
                'other_user_name': other_user_name
            })

        return {"success": True, "sessions": sessions}

    except Exception as e:
        # Handle any database errors gracefully
        print(f"⚠️ Whiteboard session history error: {e}")
        return {"success": True, "sessions": [], "message": f"Could not load sessions: {str(e)}"}

    finally:
        cursor.close()
        conn.close()


@router.patch("/sessions/{session_id}/permissions")
async def update_permissions(
    session_id: int,
    permissions: PermissionsUpdate,
    current_user = Depends(get_current_user)
):
    """Update participant permissions for a session (host only)"""


    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verify host ownership using new profile-based system
        cursor.execute("""
            SELECT host_profile_id, host_profile_type FROM whiteboard_sessions
            WHERE id = %s
        """, (session_id,))

        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        host_profile_id = session[0]
        host_profile_type = session[1]

        # Get current user's profile ID for their active role
        current_profile_id = current_user.get('role_ids', {}).get(current_user.get('active_role'))

        if not current_profile_id or host_profile_id != current_profile_id:
            raise HTTPException(status_code=403, detail="Only session host can update permissions")

        # Update permissions
        cursor.execute("""
            UPDATE whiteboard_sessions
            SET student_permissions = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id
        """, (
            json.dumps(permissions.dict()),
            session_id
        ))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Session not found")

        conn.commit()

        return {"success": True, "permissions": permissions.dict()}

    finally:
        cursor.close()
        conn.close()


@router.patch("/sessions/{session_id}/start")
async def start_session(session_id: int, current_user = Depends(get_current_user)):
    """Start a session (host only)"""


    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verify host ownership using new profile-based system
        cursor.execute("""
            SELECT host_profile_id, host_profile_type FROM whiteboard_sessions
            WHERE id = %s
        """, (session_id,))

        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        host_profile_id = session[0]
        host_profile_type = session[1]

        # Get current user's profile ID for their active role
        current_profile_id = current_user.get('role_ids', {}).get(current_user.get('active_role'))

        if not current_profile_id or host_profile_id != current_profile_id:
            raise HTTPException(status_code=403, detail="Only session host can start sessions")

        cursor.execute("""
            UPDATE whiteboard_sessions
            SET status = 'in-progress',
                actual_start = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id
        """, (session_id,))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Session not found")

        conn.commit()

        return {"success": True, "status": "in-progress"}

    finally:
        cursor.close()
        conn.close()


@router.patch("/sessions/{session_id}/end")
async def end_session(session_id: int, notes: Optional[str] = None, current_user = Depends(get_current_user)):
    """End a session (host only)"""


    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verify host ownership using new profile-based system
        cursor.execute("""
            SELECT host_profile_id, host_profile_type FROM whiteboard_sessions
            WHERE id = %s
        """, (session_id,))

        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        host_profile_id = session[0]
        host_profile_type = session[1]

        # Get current user's profile ID for their active role
        current_profile_id = current_user.get('role_ids', {}).get(current_user.get('active_role'))

        if not current_profile_id or host_profile_id != current_profile_id:
            raise HTTPException(status_code=403, detail="Only session host can end sessions")

        cursor.execute("""
            UPDATE whiteboard_sessions
            SET status = 'completed',
                actual_end = CURRENT_TIMESTAMP,
                session_notes = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id
        """, (notes, session_id))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Session not found")

        conn.commit()

        return {"success": True, "status": "completed"}

    finally:
        cursor.close()
        conn.close()


# ============================================================================
# Canvas Drawing Endpoints
# ============================================================================

@router.post("/canvas/stroke")
async def add_canvas_stroke(stroke: CanvasStroke, current_user = Depends(get_current_user)):
    """Add a drawing/text stroke to canvas"""

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get session_id from page_id and verify permissions
        cursor.execute("""
            SELECT p.session_id, s.host_profile_id, s.host_profile_type,
                   s.participant_profile_ids, s.participant_profile_types, s.student_permissions
            FROM whiteboard_pages p
            JOIN whiteboard_sessions s ON p.session_id = s.id
            WHERE p.id = %s
        """, (stroke.page_id,))

        page = cursor.fetchone()
        if not page:
            raise HTTPException(status_code=404, detail="Page not found")

        session_id, host_profile_id, host_profile_type, participant_profile_ids, participant_profile_types, permissions = page

        # Get current user's profile IDs from JWT role_ids
        role_ids = current_user.get('role_ids', {})
        current_tutor_profile_id = role_ids.get('tutor')
        current_student_profile_id = role_ids.get('student')

        # Convert string profile IDs to integers (JWT stores as strings)
        if current_tutor_profile_id:
            current_tutor_profile_id = int(current_tutor_profile_id)
        if current_student_profile_id:
            current_student_profile_id = int(current_student_profile_id)

        # Determine profile_id and profile_type for this user
        profile_id = None
        profile_type = None
        is_host = False

        # Check if user is the host
        if host_profile_type == 'tutor' and current_tutor_profile_id == host_profile_id:
            profile_id = host_profile_id
            profile_type = 'tutor'
            is_host = True
        elif host_profile_type == 'student' and current_student_profile_id == host_profile_id:
            profile_id = host_profile_id
            profile_type = 'student'
            is_host = True

        # If not host, check if user is a participant
        if not is_host:
            participant_ids = participant_profile_ids or []
            participant_types = participant_profile_types or []

            for part_id, part_type in zip(participant_ids, participant_types):
                if part_type == 'tutor' and current_tutor_profile_id == part_id:
                    profile_id = part_id
                    profile_type = 'tutor'
                    # Participants need to check permissions
                    perms = permissions or {}
                    if stroke.stroke_type in ['pen', 'line', 'rectangle', 'circle', 'arrow'] and not perms.get('can_draw'):
                        raise HTTPException(status_code=403, detail="No drawing permission")
                    if stroke.stroke_type == 'text' and not perms.get('can_write'):
                        raise HTTPException(status_code=403, detail="No text writing permission")
                    if stroke.stroke_type == 'eraser' and not perms.get('can_erase'):
                        raise HTTPException(status_code=403, detail="No erase permission")
                    break
                elif part_type == 'student' and current_student_profile_id == part_id:
                    profile_id = part_id
                    profile_type = 'student'
                    # Participants need to check permissions
                    perms = permissions or {}
                    if stroke.stroke_type in ['pen', 'line', 'rectangle', 'circle', 'arrow'] and not perms.get('can_draw'):
                        raise HTTPException(status_code=403, detail="No drawing permission")
                    if stroke.stroke_type == 'text' and not perms.get('can_write'):
                        raise HTTPException(status_code=403, detail="No text writing permission")
                    if stroke.stroke_type == 'eraser' and not perms.get('can_erase'):
                        raise HTTPException(status_code=403, detail="No erase permission")
                    break

        if profile_id is None:
            raise HTTPException(status_code=403, detail="Access denied - you are not part of this session")

        # Get next stroke order
        cursor.execute("""
            SELECT COALESCE(MAX(stroke_order), 0) + 1
            FROM whiteboard_canvas_data
            WHERE page_id = %s
        """, (stroke.page_id,))

        stroke_order = cursor.fetchone()[0]

        # Insert stroke with profile_id and profile_type
        cursor.execute("""
            INSERT INTO whiteboard_canvas_data (
                page_id, session_id, user_id, profile_id, profile_type,
                stroke_type, stroke_data, stroke_order
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            stroke.page_id, session_id, current_user.get('id'), profile_id, profile_type,
            stroke.stroke_type, json.dumps(stroke.stroke_data), stroke_order
        ))

        stroke_id = cursor.fetchone()[0]
        conn.commit()

        return {
            "success": True,
            "stroke_id": stroke_id,
            "stroke_order": stroke_order
        }

    finally:
        cursor.close()
        conn.close()


# ============================================================================
# Chat Endpoints
# ============================================================================

@router.post("/chat/send")
async def send_chat_message(message: ChatMessage, current_user = Depends(get_current_user)):
    """Send a chat message in a session"""


    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verify user is part of session (host or participant)
        cursor.execute("""
            SELECT host_profile_id, host_profile_type, participant_profile_ids
            FROM whiteboard_sessions
            WHERE id = %s
        """, (message.session_id,))

        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        host_profile_id = session[0]
        host_profile_type = session[1]
        participant_profile_ids = session[2] or []

        # Check if current user is host or participant
        role_ids = current_user.get('role_ids', {})
        current_role = current_user.get('active_role')
        current_profile_id = role_ids.get(current_role)

        if not current_profile_id:
            raise HTTPException(status_code=403, detail="No valid profile found")

        is_host = (host_profile_id == current_profile_id and host_profile_type == current_role)
        is_participant = current_profile_id in participant_profile_ids

        if not (is_host or is_participant):
            raise HTTPException(status_code=403, detail="Access denied")

        # Insert message
        cursor.execute("""
            INSERT INTO whiteboard_chat_messages (
                session_id, sender_id, message_text, message_type
            ) VALUES (%s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            message.session_id, current_user.get('id'),
            message.message_text, message.message_type
        ))

        result = cursor.fetchone()
        conn.commit()

        return {
            "success": True,
            "message_id": result[0],
            "created_at": result[1].isoformat()
        }

    finally:
        cursor.close()
        conn.close()


@router.get("/chat/{session_id}")
async def get_chat_messages(session_id: int, limit: int = 50, current_user = Depends(get_current_user)):
    """Get chat messages for a session"""


    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verify access (host or participant)
        cursor.execute("""
            SELECT host_profile_id, host_profile_type, participant_profile_ids
            FROM whiteboard_sessions
            WHERE id = %s
        """, (session_id,))

        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        host_profile_id = session[0]
        host_profile_type = session[1]
        participant_profile_ids = session[2] or []

        # Check if current user is host or participant
        role_ids = current_user.get('role_ids', {})
        current_role = current_user.get('active_role')
        current_profile_id = role_ids.get(current_role)

        if not current_profile_id:
            raise HTTPException(status_code=403, detail="No valid profile found")

        is_host = (host_profile_id == current_profile_id and host_profile_type == current_role)
        is_participant = current_profile_id in participant_profile_ids

        if not (is_host or is_participant):
            raise HTTPException(status_code=403, detail="Access denied")

        # Get messages
        cursor.execute("""
            SELECT
                m.id, m.sender_id, m.message_text, m.message_type,
                m.created_at, CONCAT(u.first_name, ' ', u.father_name, ' ', u.grandfather_name) as sender_name
            FROM whiteboard_chat_messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.session_id = %s
            ORDER BY m.created_at ASC
            LIMIT %s
        """, (session_id, limit))

        messages = []
        for row in cursor.fetchall():
            messages.append({
                'id': row[0],
                'sender_id': row[1],
                'message_text': row[2],
                'message_type': row[3],
                'created_at': row[4].isoformat(),
                'sender_name': row[5]
            })

        return {"success": True, "messages": messages}

    finally:
        cursor.close()
        conn.close()


# ============================================================================
# Page Management Endpoints
# ============================================================================

@router.post("/pages/create")
async def create_page(session_id: int, page_title: str, current_user = Depends(get_current_user)):
    """Create a new page in a session"""


    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verify host ownership using new profile-based system
        cursor.execute("""
            SELECT host_profile_id, host_profile_type FROM whiteboard_sessions
            WHERE id = %s
        """, (session_id,))

        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        host_profile_id = session[0]
        host_profile_type = session[1]

        # Get current user's profile ID for their active role
        current_profile_id = current_user.get('role_ids', {}).get(current_user.get('active_role'))

        if not current_profile_id or host_profile_id != current_profile_id:
            raise HTTPException(status_code=403, detail="Only session host can create pages")

        # Get next page number
        cursor.execute("""
            SELECT COALESCE(MAX(page_number), 0) + 1
            FROM whiteboard_pages
            WHERE session_id = %s
        """, (session_id,))

        page_number = cursor.fetchone()[0]

        # Create page
        cursor.execute("""
            INSERT INTO whiteboard_pages (
                session_id, page_number, page_title, is_active
            ) VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (session_id, page_number, page_title, False))

        page_id = cursor.fetchone()[0]
        conn.commit()

        return {
            "success": True,
            "page_id": page_id,
            "page_number": page_number
        }

    finally:
        cursor.close()
        conn.close()


@router.patch("/pages/{page_id}/activate")
async def activate_page(page_id: int, current_user = Depends(get_current_user)):
    """Set a page as active (current page)"""


    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get session_id
        cursor.execute("""
            SELECT session_id FROM whiteboard_pages
            WHERE id = %s
        """, (page_id,))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Page not found")

        session_id = result[0]

        # Deactivate all pages in session
        cursor.execute("""
            UPDATE whiteboard_pages
            SET is_active = false
            WHERE session_id = %s
        """, (session_id,))

        # Activate this page
        cursor.execute("""
            UPDATE whiteboard_pages
            SET is_active = true
            WHERE id = %s
        """, (page_id,))

        conn.commit()

        return {"success": True}

    finally:
        cursor.close()
        conn.close()


# ============================================================================
# Recording Endpoints
# ============================================================================

@router.post("/recordings/start")
async def start_recording(session_id: int, current_user = Depends(get_current_user)):
    """Start recording a session (host only)"""

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verify host ownership using new profile-based system
        cursor.execute("""
            SELECT host_profile_id, host_profile_type FROM whiteboard_sessions
            WHERE id = %s
        """, (session_id,))

        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        host_profile_id = session[0]
        host_profile_type = session[1]

        # Get current user's profile ID for their active role
        current_profile_id = current_user.get('role_ids', {}).get(current_user.get('active_role'))

        if not current_profile_id or host_profile_id != current_profile_id:
            raise HTTPException(status_code=403, detail="Only session host can start recordings")

        cursor.execute("""
            UPDATE whiteboard_sessions
            SET is_recording = true,
                recording_started_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id
        """, (session_id,))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Session not found")

        conn.commit()

        return {
            "success": True,
            "is_recording": True,
            "started_at": datetime.now().isoformat()
        }

    finally:
        cursor.close()
        conn.close()


@router.post("/recordings/stop")
async def stop_recording(session_id: int, current_user = Depends(get_current_user)):
    """Stop recording a session (host only)"""

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verify host ownership using new profile-based system
        cursor.execute("""
            SELECT host_profile_id, host_profile_type FROM whiteboard_sessions
            WHERE id = %s
        """, (session_id,))

        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        host_profile_id = session[0]
        host_profile_type = session[1]

        # Get current user's profile ID for their active role
        current_profile_id = current_user.get('role_ids', {}).get(current_user.get('active_role'))

        if not current_profile_id or host_profile_id != current_profile_id:
            raise HTTPException(status_code=403, detail="Only session host can stop recordings")

        cursor.execute("""
            UPDATE whiteboard_sessions
            SET is_recording = false,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id
        """, (session_id,))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Session not found")

        conn.commit()

        return {
            "success": True,
            "is_recording": False
        }

    finally:
        cursor.close()
        conn.close()


@router.post("/recordings")
async def create_recording(recording: RecordingCreate, current_user = Depends(get_current_user)):
    """Save a completed recording"""

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verify user is host or participant of this session
        cursor.execute("""
            SELECT host_profile_id, host_profile_type, participant_profile_ids, participant_profile_types
            FROM whiteboard_sessions
            WHERE id = %s
        """, (recording.session_id,))

        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        host_profile_id = session[0]
        host_profile_type = session[1]
        participant_profile_ids = session[2] or []
        participant_profile_types = session[3] or []

        # Check if current user is host or participant
        role_ids = current_user.get('role_ids', {})
        current_role = current_user.get('active_role')
        current_profile_id = role_ids.get(current_role)

        if not current_profile_id:
            raise HTTPException(status_code=403, detail="No valid profile found")

        is_host = (host_profile_id == current_profile_id and host_profile_type == current_role)
        is_participant = current_profile_id in participant_profile_ids

        if not (is_host or is_participant):
            raise HTTPException(status_code=403, detail="Access denied")

        # Capture current board snapshot if not provided
        board_snapshot = recording.board_snapshot
        if not board_snapshot:
            # Get all pages and canvas data for this session
            cursor.execute("""
                SELECT
                    p.id, p.page_number, p.page_title, p.background_color,
                    json_agg(
                        json_build_object(
                            'stroke_type', c.stroke_type,
                            'stroke_data', c.stroke_data,
                            'stroke_order', c.stroke_order
                        ) ORDER BY c.stroke_order
                    ) as strokes
                FROM whiteboard_pages p
                LEFT JOIN whiteboard_canvas_data c ON p.id = c.page_id AND c.is_deleted = false
                WHERE p.session_id = %s
                GROUP BY p.id, p.page_number, p.page_title, p.background_color
                ORDER BY p.page_number
            """, (recording.session_id,))

            pages = []
            for row in cursor.fetchall():
                pages.append({
                    'page_id': row[0],
                    'page_number': row[1],
                    'page_title': row[2],
                    'background_color': row[3],
                    'strokes': row[4] if row[4] else []
                })

            board_snapshot = {'pages': pages}

        # Create recording with participant profile IDs
        cursor.execute("""
            INSERT INTO whiteboard_session_recordings (
                session_id, student_id, recording_title, recording_type,
                file_url, duration_seconds, board_snapshot,
                recording_metadata
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, recording_date
        """, (
            recording.session_id, participant_profile_ids, recording.recording_title, recording.recording_type,
            recording.file_url, recording.duration_seconds,
            json.dumps(board_snapshot),
            json.dumps({'recorded_by': current_user.get('id')})
        ))

        result = cursor.fetchone()
        recording_id = result[0]
        recording_date = result[1]

        # Update session to indicate it has recordings
        cursor.execute("""
            UPDATE whiteboard_sessions
            SET has_recordings = true
            WHERE id = %s
        """, (recording.session_id,))

        conn.commit()

        return {
            "success": True,
            "recording_id": recording_id,
            "recording_date": recording_date.isoformat()
        }

    finally:
        cursor.close()
        conn.close()


@router.get("/recordings/session/{session_id}")
async def get_session_recordings(session_id: int, current_user = Depends(get_current_user)):
    """Get all recordings for a session"""

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verify access (host or participant)
        cursor.execute("""
            SELECT host_profile_id, host_profile_type, participant_profile_ids
            FROM whiteboard_sessions
            WHERE id = %s
        """, (session_id,))

        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        host_profile_id = session[0]
        host_profile_type = session[1]
        participant_profile_ids = session[2] or []

        # Check if current user is host or participant
        role_ids = current_user.get('role_ids', {})
        current_role = current_user.get('active_role')
        current_profile_id = role_ids.get(current_role)

        if not current_profile_id:
            raise HTTPException(status_code=403, detail="No valid profile found")

        is_host = (host_profile_id == current_profile_id and host_profile_type == current_role)
        is_participant = current_profile_id in participant_profile_ids

        if not (is_host or is_participant):
            raise HTTPException(status_code=403, detail="Access denied")

        # Get recordings with student names
        cursor.execute("""
            SELECT
                r.id, r.student_id, r.recording_title, r.recording_type, r.file_url,
                r.file_size_bytes, r.duration_seconds, r.thumbnail_url,
                r.board_snapshot, r.recording_date, r.is_processing, r.is_available
            FROM whiteboard_session_recordings r
            WHERE r.session_id = %s
            ORDER BY r.recording_date DESC
        """, (session_id,))

        recordings = []
        for row in cursor.fetchall():
            student_ids = row[1] if row[1] else []

            # Get student names for all student IDs
            student_names = []
            if student_ids:
                cursor.execute("""
                    SELECT CONCAT(first_name, ' ', father_name, ' ', grandfather_name) as full_name
                    FROM users
                    WHERE id = ANY(%s)
                    ORDER BY id
                """, (student_ids,))
                student_names = [name[0] for name in cursor.fetchall()]

            recordings.append({
                'id': row[0],
                'student_id': student_ids,  # Array of student IDs
                'student_names': student_names,  # Array of student names
                'recording_title': row[2],
                'recording_type': row[3],
                'file_url': row[4],
                'file_size_bytes': row[5],
                'duration_seconds': row[6],
                'thumbnail_url': row[7],
                'board_snapshot': row[8],
                'recording_date': row[9].isoformat() if row[9] else None,
                'is_processing': row[10],
                'is_available': row[11]
            })

        return {"success": True, "recordings": recordings}

    finally:
        cursor.close()
        conn.close()


@router.delete("/recordings/{recording_id}")
async def delete_recording(recording_id: int, current_user = Depends(get_current_user)):
    """Delete a recording (host only)"""

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verify host owns this session
        cursor.execute("""
            SELECT r.session_id, s.host_profile_id, s.host_profile_type
            FROM whiteboard_session_recordings r
            JOIN whiteboard_sessions s ON r.session_id = s.id
            WHERE r.id = %s
        """, (recording_id,))

        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Recording not found")

        session_id = result[0]
        host_profile_id = result[1]
        host_profile_type = result[2]

        # Check if current user is the host
        role_ids = current_user.get('role_ids', {})
        current_role = current_user.get('active_role')
        current_profile_id = role_ids.get(current_role)

        if not current_profile_id or host_profile_id != current_profile_id or host_profile_type != current_role:
            raise HTTPException(status_code=403, detail="Only session host can delete recordings")

        # Delete recording
        cursor.execute("""
            DELETE FROM whiteboard_session_recordings
            WHERE id = %s
            RETURNING id
        """, (recording_id,))

        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Recording not found")

        conn.commit()

        return {"success": True, "message": "Recording deleted"}

    finally:
        cursor.close()
        conn.close()


# ============================================================================
# Context-Aware Loading Endpoints (Enhanced for Whiteboard Modal)
# ============================================================================

@router.get("/context/enrolled-students")
async def get_enrolled_students_for_whiteboard(
    student_id: Optional[int] = None,
    current_user = Depends(get_current_user)
):
    """
    Get enrolled students for whiteboard modal.

    Context-aware loading:
    - From Teaching Tools: Returns ALL enrolled students for this tutor
    - From Student Details Modal: Returns only the specific student (pass student_id)

    Query params:
    - student_id: Optional. If provided, returns only that student's data
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get tutor profile ID from user ID
        user_id = current_user.get('id')
        role_ids = current_user.get('role_ids', {})
        tutor_profile_id = role_ids.get('tutor')

        if not tutor_profile_id:
            # Try to get tutor profile ID from database
            cursor.execute("""
                SELECT id FROM tutor_profiles WHERE user_id = %s
            """, (user_id,))
            result = cursor.fetchone()
            if result:
                tutor_profile_id = result[0]
            else:
                return {"success": True, "students": [], "message": "No tutor profile found"}

        # Build query based on context
        if student_id:
            # Single student context (from Student Details Modal)
            query = """
                SELECT
                    es.id as enrollment_id,
                    es.student_id as student_profile_id,
                    sp.user_id as student_user_id,
                    CONCAT(u.first_name, ' ', COALESCE(u.father_name, ''), ' ', COALESCE(u.grandfather_name, '')) as student_name,
                    u.email as student_email,
                    u.profile_picture as profile_picture,  -- NOTE: profile_picture now read from users table
                    sp.grade_level,
                    u.location,  -- NOTE: location now read from users table
                    sp.studying_at as school,
                    es.status as enrollment_status,
                    es.enrolled_at,
                    tp.name as package_name,
                    tp.grade_level as package_grade,
                    tp.course_ids,
                    es.agreed_price
                FROM enrolled_students es
                JOIN student_profiles sp ON es.student_id = sp.id
                JOIN users u ON sp.user_id = u.id
                JOIN tutor_packages tp ON es.package_id = tp.id
                WHERE es.tutor_id = %s
                  AND es.student_id = %s
                  AND es.status = 'active'
                ORDER BY es.enrolled_at DESC
            """
            cursor.execute(query, (tutor_profile_id, student_id))
        else:
            # All students context (from Teaching Tools)
            query = """
                SELECT
                    es.id as enrollment_id,
                    es.student_id as student_profile_id,
                    sp.user_id as student_user_id,
                    CONCAT(u.first_name, ' ', COALESCE(u.father_name, ''), ' ', COALESCE(u.grandfather_name, '')) as student_name,
                    u.email as student_email,
                    u.profile_picture as profile_picture,  -- NOTE: profile_picture now read from users table
                    sp.grade_level,
                    u.location,  -- NOTE: location now read from users table
                    sp.studying_at as school,
                    es.status as enrollment_status,
                    es.enrolled_at,
                    tp.name as package_name,
                    tp.grade_level as package_grade,
                    tp.course_ids,
                    es.agreed_price
                FROM enrolled_students es
                JOIN student_profiles sp ON es.student_id = sp.id
                JOIN users u ON sp.user_id = u.id
                JOIN tutor_packages tp ON es.package_id = tp.id
                WHERE es.tutor_id = %s
                  AND es.status = 'active'
                ORDER BY es.enrolled_at DESC
            """
            cursor.execute(query, (tutor_profile_id,))

        students = []
        for row in cursor.fetchall():
            # Get course names from course_ids
            course_ids = row[13] if row[13] else []
            course_names = []
            if course_ids:
                cursor.execute("""
                    SELECT course_name FROM courses WHERE id = ANY(%s)
                """, (course_ids,))
                course_names = [c[0] for c in cursor.fetchall()]

            students.append({
                'enrollment_id': row[0],
                'student_profile_id': row[1],
                'student_user_id': row[2],
                'name': row[3].strip() if row[3] else 'Unknown Student',
                'email': row[4],
                'profile_picture': row[5],  # Frontend handles null with initials
                'grade_level': row[6],
                'location': row[7],
                'school': row[8],
                'enrollment_status': row[9],
                'enrolled_at': row[10].isoformat() if row[10] else None,
                'package_name': row[11],
                'package_grade': row[12],
                'courses': course_names,
                'agreed_price': float(row[14]) if row[14] else None
            })

        return {
            "success": True,
            "students": students,
            "count": len(students),
            "context": "single_student" if student_id else "all_students"
        }

    except Exception as e:
        print(f"Error fetching enrolled students: {e}")
        return {"success": False, "students": [], "error": str(e)}

    finally:
        cursor.close()
        conn.close()


@router.get("/context/coursework")
async def get_coursework_for_whiteboard(
    student_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """
    Get coursework for whiteboard modal.

    Context-aware loading:
    - From Teaching Tools: Returns ALL coursework created by this tutor
    - From Student Details Modal: Returns only coursework for that specific student

    Query params:
    - student_id: Optional. If provided, returns only that student's coursework
    - status: Optional. Filter by status (draft, posted, in_progress, submitted, graded)
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        user_id = current_user.get('id')
        role_ids = current_user.get('role_ids', {})
        tutor_profile_id = role_ids.get('tutor')

        # Build query based on context
        query = """
            SELECT
                cw.id,
                cw.title,
                cw.course_name,
                cw.coursework_type,
                cw.time_limit,
                cw.days_to_complete,
                cw.due_date,
                cw.status,
                cw.total_points,
                cw.scored_points,
                cw.created_at,
                cw.posted_at,
                cw.completed_at,
                cw.graded_at,
                cw.student_id,
                sp.user_id as student_user_id,
                CONCAT(u.first_name, ' ', COALESCE(u.father_name, ''), ' ', COALESCE(u.grandfather_name, '')) as student_name,
                u.profile_picture as student_profile_picture,  -- NOTE: profile_picture now read from users table
                (SELECT COUNT(*) FROM coursework_questions WHERE coursework_id = cw.id) as question_count,
                (SELECT COUNT(*) FROM coursework_submissions WHERE coursework_id = cw.id) as submission_count
            FROM courseworks cw
            LEFT JOIN student_profiles sp ON cw.student_id = sp.id
            LEFT JOIN users u ON sp.user_id = u.id
            WHERE cw.tutor_id = %s
        """
        params = [user_id]

        # Filter by student if provided
        if student_id:
            query += " AND cw.student_id = %s"
            params.append(student_id)

        # Filter by status if provided
        if status and status != 'all':
            query += " AND cw.status = %s"
            params.append(status)

        query += " ORDER BY cw.created_at DESC"

        cursor.execute(query, tuple(params))

        coursework_list = []
        for row in cursor.fetchall():
            coursework_list.append({
                'id': str(row[0]),  # UUID as string
                'title': row[1] or row[2],  # Use title or course_name
                'course_name': row[2],
                'coursework_type': row[3],
                'time_limit': row[4],
                'days_to_complete': row[5],
                'due_date': row[6].isoformat() if row[6] else None,
                'status': row[7] or 'draft',
                'total_points': row[8] or 0,
                'scored_points': row[9] or 0,
                'created_at': row[10].isoformat() if row[10] else None,
                'posted_at': row[11].isoformat() if row[11] else None,
                'completed_at': row[12].isoformat() if row[12] else None,
                'graded_at': row[13].isoformat() if row[13] else None,
                'student_profile_id': row[14],
                'student_user_id': row[15],
                'student_name': row[16].strip() if row[16] else None,
                'student_profile_picture': row[17],  # Frontend handles null with initials
                'question_count': row[18] or 0,
                'submission_count': row[19] or 0
            })

        # Calculate stats
        total = len(coursework_list)
        draft_count = len([c for c in coursework_list if c['status'] == 'draft'])
        posted_count = len([c for c in coursework_list if c['status'] == 'posted'])
        submitted_count = len([c for c in coursework_list if c['status'] == 'submitted'])
        graded_count = len([c for c in coursework_list if c['status'] == 'graded'])

        return {
            "success": True,
            "coursework": coursework_list,
            "stats": {
                "total": total,
                "draft": draft_count,
                "posted": posted_count,
                "submitted": submitted_count,
                "graded": graded_count
            },
            "context": "single_student" if student_id else "all_students"
        }

    except Exception as e:
        print(f"Error fetching coursework: {e}")
        return {"success": False, "coursework": [], "error": str(e)}

    finally:
        cursor.close()
        conn.close()


@router.get("/context/tutor-info")
async def get_tutor_info_for_whiteboard(current_user = Depends(get_current_user)):
    """
    Get tutor information for whiteboard modal header and video panel.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        user_id = current_user.get('id')

        cursor.execute("""
            SELECT
                tp.id as tutor_profile_id,
                u.id as user_id,
                CONCAT(u.first_name, ' ', COALESCE(u.father_name, ''), ' ', COALESCE(u.grandfather_name, '')) as full_name,
                u.email,
                u.profile_picture,
                tp.bio,
                u.location,
                tp.expertise_badge,
                u.is_verified,
                tp.hero_subtitle
            FROM users u
            LEFT JOIN tutor_profiles tp ON u.id = tp.user_id
            WHERE u.id = %s
        """, (user_id,))

        row = cursor.fetchone()
        if not row:
            return {"success": False, "error": "User not found"}

        return {
            "success": True,
            "tutor": {
                'tutor_profile_id': row[0],
                'user_id': row[1],
                'name': row[2].strip() if row[2] else 'Unknown',
                'email': row[3],
                'profile_picture': row[4],  # Frontend handles null with initials
                'bio': row[5],
                'location': row[6],
                'expertise_badge': row[7] or 'Tutor',
                'is_verified': row[8] or False,
                'hero_subtitle': row[9]
            }
        }

    except Exception as e:
        print(f"Error fetching tutor info: {e}")
        return {"success": False, "error": str(e)}

    finally:
        cursor.close()
        conn.close()


@router.get("/context/files")
async def get_files_for_whiteboard(
    student_id: Optional[int] = None,
    current_user = Depends(get_current_user)
):
    """
    Get files/documents for whiteboard modal.

    Context-aware loading:
    - Returns documents uploaded by tutor
    - If student_id provided, also includes student's shared documents

    Note: This is a placeholder - files will be loaded from Backblaze B2 in the future
    """
    # For now, return empty list since files feature is not yet implemented
    return {
        "success": True,
        "files": [],
        "message": "Files feature coming soon",
        "context": "single_student" if student_id else "all_students"
    }


@router.get("/context/enrolled-tutors")
async def get_enrolled_tutors_for_whiteboard(
    tutor_id: Optional[int] = None,
    current_user = Depends(get_current_user)
):
    """
    Get enrolled tutors for whiteboard modal (STUDENT'S PERSPECTIVE).

    This is the student-side counterpart to /context/enrolled-students.
    When a student opens the whiteboard from learning-tools, they see their tutors
    instead of students.

    Context-aware loading:
    - From Learning Tools: Returns ALL tutors this student is enrolled with
    - From Tutor Details: Returns only the specific tutor (pass tutor_id)

    Query params:
    - tutor_id: Optional. If provided, returns only that tutor's data
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get student profile ID from user ID
        user_id = current_user.get('id')
        role_ids = current_user.get('role_ids', {})
        student_profile_id = role_ids.get('student')

        if not student_profile_id:
            # Try to get student profile ID from database
            cursor.execute("""
                SELECT id FROM student_profiles WHERE user_id = %s
            """, (user_id,))
            result = cursor.fetchone()
            if result:
                student_profile_id = result[0]
            else:
                return {"success": True, "tutors": [], "message": "No student profile found"}

        # Build query based on context
        if tutor_id:
            # Single tutor context (from Tutor Details)
            query = """
                SELECT
                    es.id as enrollment_id,
                    es.tutor_id as tutor_profile_id,
                    tp.user_id as tutor_user_id,
                    CONCAT(u.first_name, ' ', COALESCE(u.father_name, ''), ' ', COALESCE(u.grandfather_name, '')) as tutor_name,
                    u.email as tutor_email,
                    u.profile_picture as profile_picture,  -- NOTE: profile_picture now read from users table
                    tp.hero_subtitle,
                    u.location,
                    tp.expertise_badge,
                    u.is_verified,
                    es.status as enrollment_status,
                    es.enrolled_at,
                    pkg.name as package_name,
                    pkg.grade_level as package_grade,
                    pkg.course_ids,
                    es.agreed_price
                FROM enrolled_students es
                JOIN tutor_profiles tp ON es.tutor_id = tp.id
                JOIN users u ON tp.user_id = u.id
                JOIN tutor_packages pkg ON es.package_id = pkg.id
                WHERE es.student_id = %s
                  AND es.tutor_id = %s
                  AND es.status = 'active'
                ORDER BY es.enrolled_at DESC
            """
            cursor.execute(query, (student_profile_id, tutor_id))
        else:
            # All tutors context (from Learning Tools)
            query = """
                SELECT
                    es.id as enrollment_id,
                    es.tutor_id as tutor_profile_id,
                    tp.user_id as tutor_user_id,
                    CONCAT(u.first_name, ' ', COALESCE(u.father_name, ''), ' ', COALESCE(u.grandfather_name, '')) as tutor_name,
                    u.email as tutor_email,
                    u.profile_picture as profile_picture,  -- NOTE: profile_picture now read from users table
                    tp.hero_subtitle,
                    u.location,
                    tp.expertise_badge,
                    u.is_verified,
                    es.status as enrollment_status,
                    es.enrolled_at,
                    pkg.name as package_name,
                    pkg.grade_level as package_grade,
                    pkg.course_ids,
                    es.agreed_price
                FROM enrolled_students es
                JOIN tutor_profiles tp ON es.tutor_id = tp.id
                JOIN users u ON tp.user_id = u.id
                JOIN tutor_packages pkg ON es.package_id = pkg.id
                WHERE es.student_id = %s
                  AND es.status = 'active'
                ORDER BY es.enrolled_at DESC
            """
            cursor.execute(query, (student_profile_id,))

        tutors = []
        for row in cursor.fetchall():
            # Get course names from course_ids
            course_ids = row[14] if row[14] else []
            course_names = []
            if course_ids:
                cursor.execute("""
                    SELECT course_name FROM courses WHERE id = ANY(%s)
                """, (course_ids,))
                course_names = [c[0] for c in cursor.fetchall()]

            tutors.append({
                'enrollment_id': row[0],
                'tutor_profile_id': row[1],
                'tutor_user_id': row[2],
                'name': row[3].strip() if row[3] else 'Unknown Tutor',
                'email': row[4],
                'profile_picture': row[5],  # Frontend handles null with initials
                'hero_subtitle': row[6],
                'location': row[7],
                'expertise_badge': row[8] or 'Tutor',
                'is_verified': row[9] or False,
                'enrollment_status': row[10],
                'enrolled_at': row[11].isoformat() if row[11] else None,
                'package_name': row[12],
                'package_grade': row[13],
                'courses': course_names,
                'agreed_price': float(row[15]) if row[15] else None
            })

        return {
            "success": True,
            "tutors": tutors,
            "count": len(tutors),
            "context": "single_tutor" if tutor_id else "all_tutors"
        }

    except Exception as e:
        print(f"Error fetching enrolled tutors: {e}")
        return {"success": False, "tutors": [], "error": str(e)}

    finally:
        cursor.close()
        conn.close()


@router.get("/context/student-coursework")
async def get_student_coursework_for_whiteboard(
    tutor_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """
    Get coursework for whiteboard modal (STUDENT'S PERSPECTIVE).

    This is the student-side counterpart to /context/coursework.
    Returns coursework assigned TO this student.

    Query params:
    - tutor_id: Optional. If provided, returns only coursework from that tutor
    - status: Optional. Filter by status (draft, posted, in_progress, submitted, graded)
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        user_id = current_user.get('id')
        role_ids = current_user.get('role_ids', {})
        student_profile_id = role_ids.get('student')

        if not student_profile_id:
            # Try to get student profile ID from database
            cursor.execute("""
                SELECT id FROM student_profiles WHERE user_id = %s
            """, (user_id,))
            result = cursor.fetchone()
            if result:
                student_profile_id = result[0]
            else:
                return {"success": True, "coursework": [], "message": "No student profile found"}

        # Build query - coursework assigned to this student
        query = """
            SELECT
                cw.id,
                cw.title,
                cw.course_name,
                cw.coursework_type,
                cw.time_limit,
                cw.days_to_complete,
                cw.due_date,
                cw.status,
                cw.total_points,
                cw.scored_points,
                cw.created_at,
                cw.posted_at,
                cw.completed_at,
                cw.graded_at,
                cw.tutor_id,
                tp.user_id as tutor_user_id,
                CONCAT(u.first_name, ' ', COALESCE(u.father_name, ''), ' ', COALESCE(u.grandfather_name, '')) as tutor_name,
                u.profile_picture as tutor_profile_picture,  -- NOTE: profile_picture now read from users table
                (SELECT COUNT(*) FROM coursework_questions WHERE coursework_id = cw.id) as question_count,
                (SELECT COUNT(*) FROM coursework_submissions WHERE coursework_id = cw.id AND student_id = %s) as my_submission_count
            FROM courseworks cw
            LEFT JOIN tutor_profiles tp ON cw.tutor_id = tp.user_id
            LEFT JOIN users u ON tp.user_id = u.id
            WHERE cw.student_id = %s
        """
        params = [student_profile_id, student_profile_id]

        # Filter by tutor if provided
        if tutor_id:
            query += " AND tp.id = %s"
            params.append(tutor_id)

        # Filter by status if provided
        if status and status != 'all':
            query += " AND cw.status = %s"
            params.append(status)

        query += " ORDER BY cw.created_at DESC"

        cursor.execute(query, tuple(params))

        coursework_list = []
        for row in cursor.fetchall():
            coursework_list.append({
                'id': str(row[0]),  # UUID as string
                'title': row[1] or row[2],  # Use title or course_name
                'course_name': row[2],
                'coursework_type': row[3],
                'time_limit': row[4],
                'days_to_complete': row[5],
                'due_date': row[6].isoformat() if row[6] else None,
                'status': row[7] or 'draft',
                'total_points': row[8] or 0,
                'scored_points': row[9] or 0,
                'created_at': row[10].isoformat() if row[10] else None,
                'posted_at': row[11].isoformat() if row[11] else None,
                'completed_at': row[12].isoformat() if row[12] else None,
                'graded_at': row[13].isoformat() if row[13] else None,
                'tutor_user_id': row[14],
                'tutor_profile_user_id': row[15],
                'tutor_name': row[16].strip() if row[16] else None,
                'tutor_profile_picture': row[17],  # Frontend handles null with initials
                'question_count': row[18] or 0,
                'my_submission_count': row[19] or 0
            })

        # Calculate stats
        total = len(coursework_list)
        pending_count = len([c for c in coursework_list if c['status'] in ['posted', 'in_progress']])
        submitted_count = len([c for c in coursework_list if c['status'] == 'submitted'])
        graded_count = len([c for c in coursework_list if c['status'] == 'graded'])

        return {
            "success": True,
            "coursework": coursework_list,
            "stats": {
                "total": total,
                "pending": pending_count,
                "submitted": submitted_count,
                "graded": graded_count
            },
            "context": "single_tutor" if tutor_id else "all_tutors"
        }

    except Exception as e:
        print(f"Error fetching student coursework: {e}")
        return {"success": False, "coursework": [], "error": str(e)}

    finally:
        cursor.close()
        conn.close()


@router.get("/context/student-info")
async def get_student_info_for_whiteboard(current_user = Depends(get_current_user)):
    """
    Get student information for whiteboard modal header and video panel.
    This is the student-side counterpart to /context/tutor-info.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        user_id = current_user.get('id')

        cursor.execute("""
            SELECT
                sp.id as student_profile_id,
                u.id as user_id,
                CONCAT(u.first_name, ' ', COALESCE(u.father_name, ''), ' ', COALESCE(u.grandfather_name, '')) as full_name,
                u.email,
                u.profile_picture,
                sp.about,
                u.location,
                sp.grade_level,
                sp.studying_at
            FROM users u
            LEFT JOIN student_profiles sp ON u.id = sp.user_id
            WHERE u.id = %s
        """, (user_id,))

        row = cursor.fetchone()
        if not row:
            return {"success": False, "error": "User not found"}

        return {
            "success": True,
            "student": {
                'student_profile_id': row[0],
                'user_id': row[1],
                'name': row[2].strip() if row[2] else 'Unknown',
                'email': row[3],
                'profile_picture': row[4],  # Frontend handles null with initials
                'about': row[5],
                'location': row[6],
                'grade_level': row[7] or 'Student',
                'studying_at': row[8]
            }
        }

    except Exception as e:
        print(f"Error fetching student info: {e}")
        return {"success": False, "error": str(e)}

    finally:
        cursor.close()
        conn.close()


@router.get("/context/session-participants/{session_id}")
async def get_session_participants(
    session_id: int,
    current_user = Depends(get_current_user)
):
    """
    Get all participants for a whiteboard session (for video grid).
    Returns tutor and all students in the session.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get session details using profile-based columns
        cursor.execute("""
            SELECT
                ws.host_profile_id,
                ws.host_profile_type,
                ws.participant_profile_ids,
                ws.participant_profile_types,
                ws.status
            FROM whiteboard_sessions ws
            WHERE ws.id = %s
        """, (session_id,))

        session = cursor.fetchone()
        if not session:
            return {"success": False, "error": "Session not found"}

        host_profile_id = session[0]
        host_profile_type = session[1]
        participant_profile_ids = session[2] or []
        participant_profile_types = session[3] or []
        status = session[4]

        # Get host info based on profile type
        if host_profile_type == 'tutor':
            cursor.execute("""
                SELECT
                    tp.id,
                    CONCAT(u.first_name, ' ', COALESCE(u.father_name, ''), ' ', COALESCE(u.grandfather_name, '')) as full_name,
                    u.profile_picture  -- NOTE: profile_picture now read from users table
                FROM tutor_profiles tp
                JOIN users u ON tp.user_id = u.id
                WHERE tp.id = %s
            """, (host_profile_id,))
        else:  # student
            cursor.execute("""
                SELECT
                    sp.id,
                    CONCAT(u.first_name, ' ', COALESCE(u.father_name, ''), ' ', COALESCE(u.grandfather_name, '')) as full_name,
                    u.profile_picture  -- NOTE: profile_picture now read from users table
                FROM student_profiles sp
                JOIN users u ON sp.user_id = u.id
                WHERE sp.id = %s
            """, (host_profile_id,))

        host_row = cursor.fetchone()
        host = {
            'profile_id': host_row[0],
            'name': host_row[1].strip() if host_row[1] else 'Host',
            'profile_picture': host_row[2],
            'role': host_profile_type,
            'is_host': True,
            'is_online': True
        }

        # Get participants info
        participants = []
        for part_id, part_type in zip(participant_profile_ids, participant_profile_types):
            if part_type == 'tutor':
                cursor.execute("""
                    SELECT
                        tp.id as profile_id,
                        CONCAT(u.first_name, ' ', COALESCE(u.father_name, ''), ' ', COALESCE(u.grandfather_name, '')) as full_name,
                        u.profile_picture  -- NOTE: profile_picture now read from users table
                    FROM tutor_profiles tp
                    JOIN users u ON tp.user_id = u.id
                    WHERE tp.id = %s
                """, (part_id,))
            else:  # student
                cursor.execute("""
                    SELECT
                        sp.id as profile_id,
                        CONCAT(u.first_name, ' ', COALESCE(u.father_name, ''), ' ', COALESCE(u.grandfather_name, '')) as full_name,
                        u.profile_picture  -- NOTE: profile_picture now read from users table
                    FROM student_profiles sp
                    JOIN users u ON sp.user_id = u.id
                    WHERE sp.id = %s
                """, (part_id,))

            row = cursor.fetchone()
            if row:
                participants.append({
                    'profile_id': row[0],
                    'name': row[1].strip() if row[1] else 'Participant',
                    'profile_picture': row[2],
                    'role': part_type,
                    'is_host': False,
                    'is_online': False  # Placeholder - would need WebSocket to track
                })

        return {
            "success": True,
            "session_id": session_id,
            "session_status": status,
            "host": host,
            "participants": participants,
            "participant_count": 1 + len(participants)
        }

    except Exception as e:
        print(f"Error fetching session participants: {e}")
        return {"success": False, "error": str(e)}

    finally:
        cursor.close()
        conn.close()


# ============================================
# ONLINE STATUS ENDPOINTS
# ============================================

@router.get("/online-users")
async def get_online_users(
    profile_types: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of online users from profile tables.

    Query Parameters:
        profile_types: Comma-separated list of profile types to filter
                      (e.g., "tutor,student" or "tutor" or "student,parent")
                      If not provided, returns all profile types.

    Returns:
        List of online user objects with profile_type, profile_id, name, and avatar
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Parse profile types filter
        if profile_types:
            types_list = [t.strip() for t in profile_types.split(',')]
        else:
            types_list = ['tutor', 'student', 'parent', 'advertiser']

        # Table configuration for each profile type
        table_configs = {
            'tutor': {
                'table': 'tutor_profiles',
                'name_column': 'full_name',
                'extra_column': 'profile_picture'
            },
            'student': {
                'table': 'student_profiles',
                'name_column': 'full_name',
                'extra_column': 'profile_picture'
            },
            'parent': {
                'table': 'parent_profiles',
                'name_column': 'full_name',
                'extra_column': 'profile_picture'
            },
            'advertiser': {
                'table': 'advertiser_profiles',
                'name_column': 'brand_name',
                'extra_column': 'brand_logo'
            }
        }

        online_users = []

        for profile_type in types_list:
            config = table_configs.get(profile_type)
            if not config:
                continue

            try:
                cursor.execute(f"""
                    SELECT id, {config['name_column']}, {config['extra_column']}, last_seen
                    FROM {config['table']}
                    WHERE is_online = TRUE
                """)

                for row in cursor.fetchall():
                    online_users.append({
                        'profile_type': profile_type,
                        'profile_id': row[0],
                        f'{profile_type}_profile_id': row[0],
                        'name': row[1] or f'{profile_type.title()} {row[0]}',
                        'avatar': row[2],
                        'last_seen': row[3].isoformat() if row[3] else None,
                        'is_online': True
                    })
            except Exception as e:
                print(f"Error querying online {profile_type}s: {e}")
                continue

        return {
            "success": True,
            "users": online_users,
            "count": len(online_users),
            "filtered_types": types_list
        }

    except Exception as e:
        print(f"Error fetching online users: {e}")
        return {"success": False, "error": str(e), "users": [], "count": 0}

    finally:
        cursor.close()
        conn.close()


@router.get("/online-status/{profile_type}/{profile_id}")
async def get_profile_online_status(
    profile_type: str,
    profile_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Get online status for a specific profile.

    Path Parameters:
        profile_type: 'tutor', 'student', 'parent', or 'advertiser'
        profile_id: The profile ID to check

    Returns:
        Object with is_online status and last_seen timestamp
    """
    table_map = {
        'tutor': 'tutor_profiles',
        'student': 'student_profiles',
        'parent': 'parent_profiles',
        'advertiser': 'advertiser_profiles'
    }

    table_name = table_map.get(profile_type)
    if not table_name:
        raise HTTPException(status_code=400, detail=f"Invalid profile type: {profile_type}")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(f"""
            SELECT is_online, last_seen
            FROM {table_name}
            WHERE id = %s
        """, (profile_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Profile not found: {profile_type} {profile_id}")

        return {
            "success": True,
            "profile_type": profile_type,
            "profile_id": profile_id,
            "is_online": row[0] or False,
            "last_seen": row[1].isoformat() if row[1] else None
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error checking online status: {e}")
        return {"success": False, "error": str(e), "is_online": False}

    finally:
        cursor.close()
        conn.close()


# ============================================
# CALL HISTORY ENDPOINTS
# ============================================

@router.get("/call-history")
async def get_call_history(
    current_user: dict = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0,
    include_seen: bool = True
):
    """
    Get call history for the current user (as caller or callee).
    Shows both outgoing and incoming calls, including missed calls.

    Query Parameters:
        limit: Max number of records to return (default 50)
        offset: Pagination offset
        include_seen: Include calls that have been marked as seen (default True)

    Returns:
        List of call history records with caller/callee info
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get current user's profile info
        current_role = current_user.get('current_role', 'student')
        role_ids = current_user.get('role_ids', {})
        profile_id = role_ids.get(current_role)

        if not profile_id:
            raise HTTPException(status_code=400, detail="Could not determine user profile")

        # Build query - get calls where user is caller OR callee
        query = """
            SELECT
                id, caller_profile_id, caller_profile_type, caller_name, caller_avatar,
                callee_profile_id, callee_profile_type, callee_name, callee_avatar,
                call_type, status, whiteboard_session_id, tutor_package_name,
                initiated_at, answered_at, ended_at, duration_seconds,
                is_multi_party, caller_seen, callee_seen,
                CASE
                    WHEN caller_profile_id = %s AND caller_profile_type = %s THEN 'outgoing'
                    ELSE 'incoming'
                END as direction
            FROM whiteboard_call_history
            WHERE (caller_profile_id = %s AND caller_profile_type = %s)
               OR (callee_profile_id = %s AND callee_profile_type = %s)
            ORDER BY initiated_at DESC
            LIMIT %s OFFSET %s
        """

        params = [profile_id, current_role, profile_id, current_role, profile_id, current_role, limit, offset]
        cursor.execute(query, params)

        calls = []
        for row in cursor.fetchall():
            call = {
                'id': row[0],
                'caller': {
                    'profile_id': row[1],
                    'profile_type': row[2],
                    'name': row[3],
                    'avatar': row[4]
                },
                'callee': {
                    'profile_id': row[5],
                    'profile_type': row[6],
                    'name': row[7],
                    'avatar': row[8]
                },
                'call_type': row[9],
                'status': row[10],
                'whiteboard_session_id': row[11],
                'tutor_package_name': row[12],
                'initiated_at': row[13].isoformat() if row[13] else None,
                'answered_at': row[14].isoformat() if row[14] else None,
                'ended_at': row[15].isoformat() if row[15] else None,
                'duration_seconds': row[16],
                'is_multi_party': row[17],
                'caller_seen': row[18],
                'callee_seen': row[19],
                'direction': row[20]
            }
            calls.append(call)

        # Get total count
        count_query = """
            SELECT COUNT(*)
            FROM whiteboard_call_history
            WHERE (caller_profile_id = %s AND caller_profile_type = %s)
               OR (callee_profile_id = %s AND callee_profile_type = %s)
        """
        cursor.execute(count_query, [profile_id, current_role, profile_id, current_role])
        total = cursor.fetchone()[0]

        return {
            "success": True,
            "calls": calls,
            "total": total,
            "limit": limit,
            "offset": offset
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting call history: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.get("/call-history/missed")
async def get_missed_calls(
    current_user: dict = Depends(get_current_user),
    limit: int = 20
):
    """
    Get unseen missed calls for the current user.
    Only returns calls where the user was the callee and hasn't seen them yet.

    Returns:
        List of missed calls with caller info
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        current_role = current_user.get('current_role', 'student')
        role_ids = current_user.get('role_ids', {})
        profile_id = role_ids.get(current_role)

        if not profile_id:
            raise HTTPException(status_code=400, detail="Could not determine user profile")

        cursor.execute("""
            SELECT
                id, caller_profile_id, caller_profile_type, caller_name, caller_avatar,
                call_type, status, whiteboard_session_id, tutor_package_name,
                initiated_at, is_multi_party
            FROM whiteboard_call_history
            WHERE callee_profile_id = %s
              AND callee_profile_type = %s
              AND callee_seen = FALSE
              AND status IN ('offline', 'missed', 'no_answer')
            ORDER BY initiated_at DESC
            LIMIT %s
        """, (profile_id, current_role, limit))

        missed_calls = []
        for row in cursor.fetchall():
            missed_calls.append({
                'id': row[0],
                'caller': {
                    'profile_id': row[1],
                    'profile_type': row[2],
                    'name': row[3],
                    'avatar': row[4]
                },
                'call_type': row[5],
                'status': row[6],
                'whiteboard_session_id': row[7],
                'tutor_package_name': row[8],
                'initiated_at': row[9].isoformat() if row[9] else None,
                'is_multi_party': row[10]
            })

        return {
            "success": True,
            "missed_calls": missed_calls,
            "count": len(missed_calls)
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting missed calls: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.patch("/call-history/{call_id}/mark-seen")
async def mark_call_as_seen(
    call_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark a call as seen by the current user.
    Updates caller_seen or callee_seen depending on who the user is.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        current_role = current_user.get('current_role', 'student')
        role_ids = current_user.get('role_ids', {})
        profile_id = role_ids.get(current_role)

        if not profile_id:
            raise HTTPException(status_code=400, detail="Could not determine user profile")

        # Check if user is caller or callee
        cursor.execute("""
            SELECT caller_profile_id, caller_profile_type, callee_profile_id, callee_profile_type
            FROM whiteboard_call_history
            WHERE id = %s
        """, (call_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Call not found")

        caller_pid, caller_ptype, callee_pid, callee_ptype = row

        # Determine which field to update
        if caller_pid == profile_id and caller_ptype == current_role:
            cursor.execute("""
                UPDATE whiteboard_call_history
                SET caller_seen = TRUE, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (call_id,))
        elif callee_pid == profile_id and callee_ptype == current_role:
            cursor.execute("""
                UPDATE whiteboard_call_history
                SET callee_seen = TRUE, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (call_id,))
        else:
            raise HTTPException(status_code=403, detail="You are not part of this call")

        conn.commit()

        return {"success": True, "call_id": call_id, "marked_seen": True}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error marking call as seen: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.patch("/call-history/mark-all-seen")
async def mark_all_calls_as_seen(
    current_user: dict = Depends(get_current_user)
):
    """
    Mark all missed calls as seen for the current user.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        current_role = current_user.get('current_role', 'student')
        role_ids = current_user.get('role_ids', {})
        profile_id = role_ids.get(current_role)

        if not profile_id:
            raise HTTPException(status_code=400, detail="Could not determine user profile")

        # Mark all callee calls as seen
        cursor.execute("""
            UPDATE whiteboard_call_history
            SET callee_seen = TRUE, updated_at = CURRENT_TIMESTAMP
            WHERE callee_profile_id = %s
              AND callee_profile_type = %s
              AND callee_seen = FALSE
        """, (profile_id, current_role))

        updated_count = cursor.rowcount
        conn.commit()

        return {"success": True, "marked_seen_count": updated_count}

    except Exception as e:
        print(f"Error marking all calls as seen: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.patch("/call-history/{call_id}/status")
async def update_call_status(
    call_id: int,
    status: str,
    duration_seconds: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Update the status of a call record.
    Valid statuses: 'initiated', 'ringing', 'answered', 'missed', 'declined', 'ended', 'failed', 'offline', 'no_answer'
    """
    valid_statuses = ['initiated', 'ringing', 'answered', 'missed', 'declined', 'ended', 'failed', 'offline', 'no_answer']
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Build update query
        updates = ["status = %s", "updated_at = CURRENT_TIMESTAMP"]
        params = [status]

        if status == "answered":
            updates.append("answered_at = CURRENT_TIMESTAMP")
        elif status in ["ended", "missed", "declined", "failed", "no_answer"]:
            updates.append("ended_at = CURRENT_TIMESTAMP")

        if duration_seconds is not None:
            updates.append("duration_seconds = %s")
            params.append(duration_seconds)

        params.append(call_id)

        cursor.execute(f"""
            UPDATE whiteboard_call_history
            SET {', '.join(updates)}
            WHERE id = %s
            RETURNING id, status, answered_at, ended_at, duration_seconds
        """, params)

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Call not found")

        conn.commit()

        return {
            "success": True,
            "call_id": row[0],
            "status": row[1],
            "answered_at": row[2].isoformat() if row[2] else None,
            "ended_at": row[3].isoformat() if row[3] else None,
            "duration_seconds": row[4]
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error updating call status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


# ============================================
# ENHANCED CALL HISTORY ENDPOINTS
# ============================================

class CallHistoryCreate(BaseModel):
    """Model for creating a new call history record"""
    callee_profile_id: int
    callee_profile_type: str  # 'tutor', 'student', 'parent', 'advertiser'
    callee_name: Optional[str] = None
    callee_avatar: Optional[str] = None
    call_type: str = "video"  # 'video' or 'audio'
    whiteboard_session_id: Optional[int] = None
    tutor_package_name: Optional[str] = None
    tutor_package_id: Optional[int] = None
    is_multi_party: bool = False


class CallHistoryEnd(BaseModel):
    """Model for ending a call with canvas snapshot"""
    duration_seconds: int = 0
    canvas_snapshot: Optional[Dict[str, Any]] = None  # {imageData: base64, pageCount: int}


@router.post("/call-history")
async def create_call_history(
    call_data: CallHistoryCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new call history record when a call starts/is answered.
    This should be called when a call is successfully connected.

    Returns the call_id which should be stored to update the record when call ends.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get caller info from current user
        current_role = current_user.get('active_role', 'student')
        role_ids = current_user.get('role_ids', {})
        caller_profile_id = role_ids.get(current_role)
        caller_user_id = current_user.get('id')

        if not caller_profile_id:
            raise HTTPException(status_code=400, detail="Could not determine caller profile")

        # Get caller name and avatar from database
        caller_name = None
        caller_avatar = None

        if current_role == 'tutor':
            cursor.execute("""
                SELECT CONCAT(u.first_name, ' ', u.father_name), t.profile_picture
                FROM users u
                LEFT JOIN tutor_profiles t ON u.id = t.user_id
                WHERE u.id = %s
            """, (caller_user_id,))
        elif current_role == 'student':
            cursor.execute("""
                SELECT CONCAT(u.first_name, ' ', u.father_name), s.profile_picture
                FROM users u
                LEFT JOIN student_profiles s ON u.id = s.user_id
                WHERE u.id = %s
            """, (caller_user_id,))
        else:
            cursor.execute("""
                SELECT CONCAT(first_name, ' ', father_name), NULL
                FROM users WHERE id = %s
            """, (caller_user_id,))

        row = cursor.fetchone()
        if row:
            caller_name = row[0]
            caller_avatar = row[1]

        # Get callee user_id from profile
        callee_user_id = None
        if call_data.callee_profile_type == 'tutor':
            cursor.execute("SELECT user_id FROM tutor_profiles WHERE id = %s", (call_data.callee_profile_id,))
        elif call_data.callee_profile_type == 'student':
            cursor.execute("SELECT user_id FROM student_profiles WHERE id = %s", (call_data.callee_profile_id,))
        elif call_data.callee_profile_type == 'parent':
            cursor.execute("SELECT user_id FROM parent_profiles WHERE id = %s", (call_data.callee_profile_id,))
        elif call_data.callee_profile_type == 'advertiser':
            cursor.execute("SELECT user_id FROM advertiser_profiles WHERE id = %s", (call_data.callee_profile_id,))

        callee_row = cursor.fetchone()
        if callee_row:
            callee_user_id = callee_row[0]

        # Create call history record with status 'answered'
        cursor.execute("""
            INSERT INTO whiteboard_call_history (
                caller_profile_id, caller_profile_type, caller_user_id, caller_name, caller_avatar,
                callee_profile_id, callee_profile_type, callee_user_id, callee_name, callee_avatar,
                call_type, status, whiteboard_session_id, tutor_package_name, tutor_package_id,
                is_multi_party, caller_seen, callee_seen, answered_at
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, 'answered', %s, %s, %s,
                %s, TRUE, TRUE, CURRENT_TIMESTAMP
            ) RETURNING id, initiated_at
        """, (
            caller_profile_id, current_role, caller_user_id, caller_name, caller_avatar,
            call_data.callee_profile_id, call_data.callee_profile_type, callee_user_id,
            call_data.callee_name, call_data.callee_avatar,
            call_data.call_type, call_data.whiteboard_session_id,
            call_data.tutor_package_name, call_data.tutor_package_id,
            call_data.is_multi_party
        ))

        result = cursor.fetchone()
        conn.commit()

        return {
            "success": True,
            "call_id": result[0],
            "initiated_at": result[1].isoformat() if result[1] else None
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error creating call history: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.put("/call-history/{call_id}/end")
async def end_call_history(
    call_id: int,
    end_data: CallHistoryEnd,
    current_user: dict = Depends(get_current_user)
):
    """
    Update call history when call ends.
    Saves the canvas snapshot and duration.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Build update query
        canvas_json = json.dumps(end_data.canvas_snapshot) if end_data.canvas_snapshot else None

        cursor.execute("""
            UPDATE whiteboard_call_history
            SET status = 'ended',
                ended_at = CURRENT_TIMESTAMP,
                duration_seconds = %s,
                canvas_snapshot = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id, status, ended_at, duration_seconds
        """, (end_data.duration_seconds, canvas_json, call_id))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Call not found")

        conn.commit()

        return {
            "success": True,
            "call_id": row[0],
            "status": row[1],
            "ended_at": row[2].isoformat() if row[2] else None,
            "duration_seconds": row[3],
            "canvas_saved": end_data.canvas_snapshot is not None
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error ending call: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.get("/call-history/{call_id}")
async def get_single_call_history(
    call_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a single call history record with full details including canvas snapshot and recording URL.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                id, caller_profile_id, caller_profile_type, caller_name, caller_avatar,
                callee_profile_id, callee_profile_type, callee_name, callee_avatar,
                call_type, status, whiteboard_session_id, tutor_package_name,
                initiated_at, answered_at, ended_at, duration_seconds,
                is_multi_party, canvas_snapshot, recording_url
            FROM whiteboard_call_history
            WHERE id = %s
        """, (call_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Call not found")

        # Parse canvas_snapshot JSON if exists
        canvas_snapshot = None
        if row[18]:
            if isinstance(row[18], str):
                canvas_snapshot = json.loads(row[18])
            else:
                canvas_snapshot = row[18]

        return {
            "success": True,
            "call": {
                "id": row[0],
                "caller": {
                    "profile_id": row[1],
                    "profile_type": row[2],
                    "name": row[3],
                    "avatar": row[4]
                },
                "callee": {
                    "profile_id": row[5],
                    "profile_type": row[6],
                    "name": row[7],
                    "avatar": row[8]
                },
                "call_type": row[9],
                "status": row[10],
                "whiteboard_session_id": row[11],
                "tutor_package_name": row[12],
                "initiated_at": row[13].isoformat() if row[13] else None,
                "answered_at": row[14].isoformat() if row[14] else None,
                "ended_at": row[15].isoformat() if row[15] else None,
                "duration_seconds": row[16],
                "is_multi_party": row[17],
                "canvas_snapshot": canvas_snapshot,
                "recording_url": row[19]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting call history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


@router.put("/call-history/{call_id}/recording")
async def update_call_recording(
    call_id: int,
    recording_url: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Update call history with a recording URL after video is uploaded.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE whiteboard_call_history
            SET recording_url = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id, recording_url
        """, (recording_url, call_id))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Call not found")

        conn.commit()

        return {
            "success": True,
            "call_id": row[0],
            "recording_url": row[1]
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error updating recording URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cursor.close()
        conn.close()


# ============================================
# RECORDING UPLOAD ENDPOINT
# ============================================

@router.post("/recordings/upload")
async def upload_whiteboard_recording(
    video: UploadFile = File(...),
    call_id: int = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a whiteboard session recording video to Backblaze B2.
    Updates the call history record with the recording URL.
    """
    try:
        # Import backblaze service
        try:
            from backblaze_service import upload_file
        except ImportError:
            # Fallback - save locally if Backblaze not available
            import os
            upload_dir = "uploads/whiteboard_recordings"
            os.makedirs(upload_dir, exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"recording_{call_id}_{timestamp}.webm"
            filepath = os.path.join(upload_dir, filename)

            content = await video.read()
            with open(filepath, "wb") as f:
                f.write(content)

            file_url = f"/uploads/whiteboard_recordings/{filename}"

            # Update call history with local URL
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE whiteboard_call_history
                SET recording_url = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (file_url, call_id))
            conn.commit()
            cursor.close()
            conn.close()

            return {
                "success": True,
                "file_url": file_url,
                "storage": "local"
            }

        # Upload to Backblaze B2
        content = await video.read()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"whiteboard_recording_{call_id}_{timestamp}.webm"

        file_url = upload_file(
            content,
            filename,
            "videos/whiteboard",
            current_user.get('id')
        )

        # Update call history with recording URL
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE whiteboard_call_history
            SET recording_url = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (file_url, call_id))
        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "file_url": file_url,
            "storage": "backblaze"
        }

    except Exception as e:
        print(f"Error uploading recording: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
