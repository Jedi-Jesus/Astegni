"""
Whiteboard System Endpoints

API endpoints for the collaborative digital whiteboard feature
"""

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import sys
import os
import psycopg

# Add modules directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

# Import from existing modules
try:
    from utils import get_current_user
except ImportError:
    # Fallback for when running standalone
    def get_current_user():
        pass

router = APIRouter(prefix="/api/whiteboard", tags=["whiteboard"])

# Database connection helper
def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        database_url = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"
    return psycopg.connect(database_url)

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
    if 'student' not in current_user.roles:
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
            booking.tutor_id, current_user.id, booking.subject,
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


    if 'tutor' not in current_user.roles:
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
                s.profile_picture_url as student_photo
            FROM tutor_student_bookings b
            JOIN users u ON b.student_id = u.id
            LEFT JOIN students s ON b.student_id = s.user_id
            WHERE b.tutor_id = %s AND b.status = 'active'
            ORDER BY b.created_at DESC
        """, (current_user.id,))

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


    if 'student' not in current_user.roles:
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
                t.profile_picture_url as tutor_photo,
                t.teaching_experience, t.hourly_rate
            FROM tutor_student_bookings b
            JOIN users u ON b.tutor_id = u.id
            LEFT JOIN tutors t ON b.tutor_id = t.user_id
            WHERE b.student_id = %s AND b.status = 'active'
            ORDER BY b.created_at DESC
        """, (current_user.id,))

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

@router.post("/sessions")
async def create_session(session: SessionCreate, current_user = Depends(get_current_user)):
    """Create a new whiteboard session"""


    if 'tutor' not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only tutors can create sessions")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verify booking belongs to this tutor
        cursor.execute("""
            SELECT student_id FROM tutor_student_bookings
            WHERE id = %s AND tutor_id = %s
        """, (session.booking_id, current_user.id))

        booking = cursor.fetchone()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        student_id = booking[0]

        # Create session
        cursor.execute("""
            INSERT INTO whiteboard_sessions (
                booking_id, tutor_id, student_id,
                session_title, session_description,
                scheduled_start, scheduled_end, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            session.booking_id, current_user.id, student_id,
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


@router.get("/sessions/{session_id}")
async def get_session(session_id: int, current_user = Depends(get_current_user)):
    """Get session details with pages and canvas data"""


    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get session details
        cursor.execute("""
            SELECT
                s.id, s.booking_id, s.tutor_id, s.student_id,
                s.session_title, s.session_description,
                s.scheduled_start, s.scheduled_end,
                s.actual_start, s.actual_end, s.status,
                s.student_permissions, s.session_notes,
                CONCAT(u1.first_name, ' ', u1.father_name, ' ', u1.grandfather_name) as tutor_name, CONCAT(u2.first_name, ' ', u2.father_name, ' ', u2.grandfather_name) as student_name
            FROM whiteboard_sessions s
            JOIN users u1 ON s.tutor_id = u1.id
            JOIN users u2 ON s.student_id = u2.id
            WHERE s.id = %s
        """, (session_id,))

        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Verify user is part of this session
        if current_user.id not in [session[2], session[3]]:
            raise HTTPException(status_code=403, detail="Access denied")

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

        return {
            "success": True,
            "session": {
                'id': session[0],
                'booking_id': session[1],
                'tutor_id': session[2],
                'student_id': session[3],
                'session_title': session[4],
                'session_description': session[5],
                'scheduled_start': session[6].isoformat() if session[6] else None,
                'scheduled_end': session[7].isoformat() if session[7] else None,
                'actual_start': session[8].isoformat() if session[8] else None,
                'actual_end': session[9].isoformat() if session[9] else None,
                'status': session[10],
                'student_permissions': session[11],
                'session_notes': session[12],
                'tutor_name': session[13],
                'student_name': session[14],
                'pages': pages
            }
        }

    finally:
        cursor.close()
        conn.close()


@router.get("/sessions/history/{user_type}/{user_id}")
async def get_session_history(user_type: str, user_id: int, current_user = Depends(get_current_user)):
    """Get session history for tutor or student"""


    # Verify user can access this data
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        field = 'tutor_id' if user_type == 'tutor' else 'student_id'

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

        cursor.execute(f"""
            SELECT
                s.id, s.session_title, s.session_description,
                s.scheduled_start, s.scheduled_end,
                s.actual_start, s.actual_end, s.status,
                s.session_notes, s.attendance_status,
                b.subject, b.grade_level,
                CONCAT(u.first_name, ' ', u.father_name, ' ', u.grandfather_name) as other_user_name
            FROM whiteboard_sessions s
            JOIN tutor_student_bookings b ON s.booking_id = b.id
            JOIN users u ON s.{('student_id' if user_type == 'tutor' else 'tutor_id')} = u.id
            WHERE s.{field} = %s
            ORDER BY s.scheduled_start DESC
            LIMIT 50
        """, (user_id,))

        sessions = []
        for row in cursor.fetchall():
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
                'other_user_name': row[12]
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
    """Update student permissions for a session (tutor only)"""


    if 'tutor' not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only tutors can update permissions")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE whiteboard_sessions
            SET student_permissions = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND tutor_id = %s
            RETURNING id
        """, (
            json.dumps(permissions.dict()),
            session_id,
            current_user.id
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
    """Start a session (tutor only)"""


    if 'tutor' not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only tutors can start sessions")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE whiteboard_sessions
            SET status = 'in-progress',
                actual_start = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND tutor_id = %s
            RETURNING id
        """, (session_id, current_user.id))

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
    """End a session (tutor only)"""


    if 'tutor' not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only tutors can end sessions")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE whiteboard_sessions
            SET status = 'completed',
                actual_end = CURRENT_TIMESTAMP,
                session_notes = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND tutor_id = %s
            RETURNING id
        """, (notes, session_id, current_user.id))

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
            SELECT p.session_id, s.tutor_id, s.student_id, s.student_permissions
            FROM whiteboard_pages p
            JOIN whiteboard_sessions s ON p.session_id = s.id
            WHERE p.id = %s
        """, (stroke.page_id,))

        page = cursor.fetchone()
        if not page:
            raise HTTPException(status_code=404, detail="Page not found")

        session_id, tutor_id, student_id, permissions = page

        # Check if user has permission to draw
        if current_user.id == tutor_id:
            # Tutor can always draw
            pass
        elif current_user.id == student_id:
            # Check student permissions
            perms = permissions or {}
            if stroke.stroke_type in ['pen', 'line', 'rectangle', 'circle', 'arrow'] and not perms.get('can_draw'):
                raise HTTPException(status_code=403, detail="No drawing permission")
            if stroke.stroke_type == 'text' and not perms.get('can_write'):
                raise HTTPException(status_code=403, detail="No text writing permission")
            if stroke.stroke_type == 'eraser' and not perms.get('can_erase'):
                raise HTTPException(status_code=403, detail="No erase permission")
        else:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get next stroke order
        cursor.execute("""
            SELECT COALESCE(MAX(stroke_order), 0) + 1
            FROM whiteboard_canvas_data
            WHERE page_id = %s
        """, (stroke.page_id,))

        stroke_order = cursor.fetchone()[0]

        # Insert stroke
        cursor.execute("""
            INSERT INTO whiteboard_canvas_data (
                page_id, session_id, user_id,
                stroke_type, stroke_data, stroke_order
            ) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            stroke.page_id, session_id, current_user.id,
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
        # Verify user is part of session
        cursor.execute("""
            SELECT tutor_id, student_id
            FROM whiteboard_sessions
            WHERE id = %s
        """, (message.session_id,))

        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        if current_user.id not in session:
            raise HTTPException(status_code=403, detail="Access denied")

        # Insert message
        cursor.execute("""
            INSERT INTO whiteboard_chat_messages (
                session_id, sender_id, message_text, message_type
            ) VALUES (%s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            message.session_id, current_user.id,
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
        # Verify access
        cursor.execute("""
            SELECT tutor_id, student_id
            FROM whiteboard_sessions
            WHERE id = %s
        """, (session_id,))

        session = cursor.fetchone()
        if not session or current_user.id not in session:
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
        # Verify tutor ownership
        cursor.execute("""
            SELECT tutor_id FROM whiteboard_sessions
            WHERE id = %s
        """, (session_id,))

        session = cursor.fetchone()
        if not session or session[0] != current_user.id:
            raise HTTPException(status_code=403, detail="Only session tutor can create pages")

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
    """Start recording a session (tutor only)"""

    if 'tutor' not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only tutors can start recordings")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE whiteboard_sessions
            SET is_recording = true,
                recording_started_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND tutor_id = %s
            RETURNING id
        """, (session_id, current_user.id))

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
    """Stop recording a session (tutor only)"""

    if 'tutor' not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only tutors can stop recordings")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE whiteboard_sessions
            SET is_recording = false,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND tutor_id = %s
            RETURNING id
        """, (session_id, current_user.id))

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
        # Verify user is tutor or student of this session
        cursor.execute("""
            SELECT tutor_id, student_id FROM whiteboard_sessions
            WHERE id = %s
        """, (recording.session_id,))

        session = cursor.fetchone()
        if not session or current_user.id not in session:
            raise HTTPException(status_code=403, detail="Access denied")

        tutor_id, student_id = session

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

        # Create recording with student_id as array
        # Note: student_id is wrapped in array for consistency (supports single or multiple students)
        student_ids = [student_id] if student_id else []

        cursor.execute("""
            INSERT INTO whiteboard_session_recordings (
                session_id, student_id, recording_title, recording_type,
                file_url, duration_seconds, board_snapshot,
                recording_metadata
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, recording_date
        """, (
            recording.session_id, student_ids, recording.recording_title, recording.recording_type,
            recording.file_url, recording.duration_seconds,
            json.dumps(board_snapshot),
            json.dumps({'recorded_by': current_user.id})
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
        # Verify access
        cursor.execute("""
            SELECT tutor_id, student_id FROM whiteboard_sessions
            WHERE id = %s
        """, (session_id,))

        session = cursor.fetchone()
        if not session or current_user.id not in session:
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
    """Delete a recording (tutor only)"""

    if 'tutor' not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only tutors can delete recordings")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verify tutor owns this session
        cursor.execute("""
            SELECT r.session_id, s.tutor_id
            FROM whiteboard_session_recordings r
            JOIN whiteboard_sessions s ON r.session_id = s.id
            WHERE r.id = %s
        """, (recording_id,))

        result = cursor.fetchone()
        if not result or result[1] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

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
