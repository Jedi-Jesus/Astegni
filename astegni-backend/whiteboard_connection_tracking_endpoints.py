"""
Whiteboard Connection Tracking Endpoints

PURPOSE:
Track real-time participant connections to whiteboard sessions via WebSocket.
Connection = Attendance. Only actual WebSocket connections prove presence.

ENDPOINTS:
1. POST /api/whiteboard/sessions/{session_id}/connect - Mark user as connected
2. POST /api/whiteboard/sessions/{session_id}/disconnect - Mark user as disconnected
3. POST /api/whiteboard/sessions/{session_id}/heartbeat - Update last activity
4. GET /api/whiteboard/sessions/{session_id}/connection-status - Get live connection status

USAGE:
- Called by WebSocket handler when connections establish/terminate
- Heartbeat called every 10-30 seconds to track active engagement
- Connection logs stored in connection_logs JSONB for audit trail
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import psycopg
import os
import jwt
from jwt.exceptions import PyJWTError
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")
ALGORITHM = "HS256"

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL not found in environment variables")
    return psycopg.connect(database_url)

def get_current_user(authorization: str):
    """Extract user from JWT token"""
    try:
        token = authorization.replace("Bearer ", "").strip()
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {
            "id": int(user_id),
            "roles": payload.get("roles", []),
            "active_role": payload.get("role")
        }
    except (PyJWTError, ValueError):
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# ============================================
# PYDANTIC MODELS
# ============================================

class ConnectionEvent(BaseModel):
    session_id: int
    user_id: Optional[int] = None  # If not provided, use from JWT
    user_type: str  # 'tutor' or 'student'

class HeartbeatEvent(BaseModel):
    session_id: int
    user_id: Optional[int] = None
    user_type: str
    activity_type: Optional[str] = "heartbeat"  # heartbeat, draw, type, erase, etc.

class ConnectionStatusResponse(BaseModel):
    session_id: int
    tutor_connected: bool
    student_connected: bool
    tutor_connected_at: Optional[datetime]
    student_connected_at: Optional[datetime]
    tutor_last_activity_at: Optional[datetime]
    student_last_activity_at: Optional[datetime]
    tutor_total_active_seconds: int
    student_total_active_seconds: int
    session_duration_seconds: Optional[int]
    connection_logs: List[Dict[str, Any]]

# ============================================
# HELPER FUNCTIONS
# ============================================

def log_connection_event(cur, session_id: int, user_id: int, user_type: str, event: str):
    """
    Add connection event to connection_logs JSONB array
    Format: {user_id, user_type, event, timestamp}
    """
    log_entry = {
        "user_id": user_id,
        "user_type": user_type,
        "event": event,
        "timestamp": datetime.utcnow().isoformat()
    }

    cur.execute("""
        UPDATE whiteboard_sessions
        SET connection_logs = COALESCE(connection_logs, '[]'::jsonb) || %s::jsonb
        WHERE id = %s
    """, (psycopg.types.json.Jsonb(log_entry), session_id))

def calculate_active_seconds(connected_at: datetime, last_activity_at: datetime) -> int:
    """
    Calculate total active seconds based on connection and last activity.
    Uses last_activity as end time (more accurate than disconnect time)
    """
    if not connected_at or not last_activity_at:
        return 0

    # Active time = from connection to last activity
    active_duration = last_activity_at - connected_at
    return int(active_duration.total_seconds())

# ============================================
# ENDPOINTS
# ============================================

@router.post("/api/whiteboard/sessions/{session_id}/connect")
async def mark_user_connected(
    session_id: int,
    event: ConnectionEvent,
    authorization: str = Depends(lambda auth: auth)
):
    """
    Mark a user as connected to the whiteboard session.
    Called when WebSocket connection is established.

    This is the PRIMARY indicator of attendance - connection = presence.
    """
    current_user = get_current_user(authorization)
    user_id = event.user_id or current_user["id"]
    user_type = event.user_type.lower()

    if user_type not in ['tutor', 'student']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_type must be 'tutor' or 'student'"
        )

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Verify session exists
            cur.execute("""
                SELECT id, tutor_id, student_id
                FROM whiteboard_sessions
                WHERE id = %s
            """, (session_id,))

            session_row = cur.fetchone()
            if not session_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Whiteboard session not found"
                )

            session_tutor_id = session_row[1]
            session_student_id = session_row[2]

            # Verify user is authorized (must be tutor or student of this session)
            if user_type == 'tutor' and user_id != session_tutor_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User is not the tutor for this session"
                )
            if user_type == 'student' and user_id != session_student_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User is not the student for this session"
                )

            now = datetime.utcnow()

            # Update connection timestamp based on user type
            if user_type == 'tutor':
                cur.execute("""
                    UPDATE whiteboard_sessions
                    SET tutor_connected_at = %s,
                        tutor_last_activity_at = %s,
                        updated_at = %s
                    WHERE id = %s
                    RETURNING tutor_connected_at
                """, (now, now, now, session_id))
            else:  # student
                cur.execute("""
                    UPDATE whiteboard_sessions
                    SET student_connected_at = %s,
                        student_last_activity_at = %s,
                        updated_at = %s
                    WHERE id = %s
                    RETURNING student_connected_at
                """, (now, now, now, session_id))

            result = cur.fetchone()

            # Log connection event
            log_connection_event(cur, session_id, user_id, user_type, "connect")

            conn.commit()

            return {
                "success": True,
                "message": f"{user_type.capitalize()} connected to whiteboard session",
                "session_id": session_id,
                "user_id": user_id,
                "user_type": user_type,
                "connected_at": result[0].isoformat()
            }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Connection tracking error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to track connection: {str(e)}"
        )
    finally:
        conn.close()


@router.post("/api/whiteboard/sessions/{session_id}/disconnect")
async def mark_user_disconnected(
    session_id: int,
    event: ConnectionEvent,
    authorization: str = Depends(lambda auth: auth)
):
    """
    Mark a user as disconnected from the whiteboard session.
    Called when WebSocket connection terminates.

    Also calculates total active time based on last_activity timestamp.
    """
    current_user = get_current_user(authorization)
    user_id = event.user_id or current_user["id"]
    user_type = event.user_type.lower()

    if user_type not in ['tutor', 'student']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_type must be 'tutor' or 'student'"
        )

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Get session data
            cur.execute("""
                SELECT id, tutor_connected_at, student_connected_at,
                       tutor_last_activity_at, student_last_activity_at
                FROM whiteboard_sessions
                WHERE id = %s
            """, (session_id,))

            session_row = cur.fetchone()
            if not session_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Whiteboard session not found"
                )

            now = datetime.utcnow()

            # Calculate active seconds
            if user_type == 'tutor':
                connected_at = session_row[1]
                last_activity = session_row[3]
                active_seconds = calculate_active_seconds(connected_at, last_activity or now)

                cur.execute("""
                    UPDATE whiteboard_sessions
                    SET tutor_disconnected_at = %s,
                        tutor_total_active_seconds = %s,
                        updated_at = %s
                    WHERE id = %s
                    RETURNING tutor_disconnected_at, tutor_total_active_seconds
                """, (now, active_seconds, now, session_id))
            else:  # student
                connected_at = session_row[2]
                last_activity = session_row[4]
                active_seconds = calculate_active_seconds(connected_at, last_activity or now)

                cur.execute("""
                    UPDATE whiteboard_sessions
                    SET student_disconnected_at = %s,
                        student_total_active_seconds = %s,
                        updated_at = %s
                    WHERE id = %s
                    RETURNING student_disconnected_at, student_total_active_seconds
                """, (now, active_seconds, now, session_id))

            result = cur.fetchone()

            # Log disconnection event
            log_connection_event(cur, session_id, user_id, user_type, "disconnect")

            conn.commit()

            return {
                "success": True,
                "message": f"{user_type.capitalize()} disconnected from whiteboard session",
                "session_id": session_id,
                "user_id": user_id,
                "user_type": user_type,
                "disconnected_at": result[0].isoformat(),
                "total_active_seconds": result[1],
                "total_active_minutes": round(result[1] / 60, 1)
            }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Disconnection tracking error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to track disconnection: {str(e)}"
        )
    finally:
        conn.close()


@router.post("/api/whiteboard/sessions/{session_id}/heartbeat")
async def update_heartbeat(
    session_id: int,
    event: HeartbeatEvent,
    authorization: str = Depends(lambda auth: auth)
):
    """
    Update user's last activity timestamp.
    Called every 10-30 seconds while user is active (drawing, typing, etc.)

    This tracks active engagement vs. idle connection.
    """
    current_user = get_current_user(authorization)
    user_id = event.user_id or current_user["id"]
    user_type = event.user_type.lower()

    if user_type not in ['tutor', 'student']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_type must be 'tutor' or 'student'"
        )

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            now = datetime.utcnow()

            # Update last activity timestamp
            if user_type == 'tutor':
                cur.execute("""
                    UPDATE whiteboard_sessions
                    SET tutor_last_activity_at = %s,
                        updated_at = %s
                    WHERE id = %s
                    RETURNING tutor_last_activity_at
                """, (now, now, session_id))
            else:  # student
                cur.execute("""
                    UPDATE whiteboard_sessions
                    SET student_last_activity_at = %s,
                        updated_at = %s
                    WHERE id = %s
                    RETURNING student_last_activity_at
                """, (now, now, session_id))

            result = cur.fetchone()
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Whiteboard session not found"
                )

            conn.commit()

            return {
                "success": True,
                "session_id": session_id,
                "user_type": user_type,
                "last_activity_at": result[0].isoformat(),
                "activity_type": event.activity_type
            }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Heartbeat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update heartbeat: {str(e)}"
        )
    finally:
        conn.close()


@router.get("/api/whiteboard/sessions/{session_id}/connection-status", response_model=ConnectionStatusResponse)
async def get_connection_status(
    session_id: int,
    authorization: str = Depends(lambda auth: auth)
):
    """
    Get real-time connection status for a whiteboard session.
    Shows who's connected, when they connected, and activity levels.

    Useful for:
    - Live attendance monitoring
    - Session analytics
    - Attendance suggestion preparation
    """
    current_user = get_current_user(authorization)

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    id, tutor_connected_at, student_connected_at,
                    tutor_disconnected_at, student_disconnected_at,
                    tutor_last_activity_at, student_last_activity_at,
                    tutor_total_active_seconds, student_total_active_seconds,
                    connection_logs, scheduled_start, scheduled_end
                FROM whiteboard_sessions
                WHERE id = %s
            """, (session_id,))

            row = cur.fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Whiteboard session not found"
                )

            # Calculate session duration if both scheduled times exist
            session_duration = None
            if row[10] and row[11]:  # scheduled_start and scheduled_end
                duration = row[11] - row[10]
                session_duration = int(duration.total_seconds())

            # Determine if users are currently connected
            # (connected but not yet disconnected)
            tutor_connected = row[1] is not None and row[3] is None
            student_connected = row[2] is not None and row[4] is None

            return ConnectionStatusResponse(
                session_id=row[0],
                tutor_connected=tutor_connected,
                student_connected=student_connected,
                tutor_connected_at=row[1],
                student_connected_at=row[2],
                tutor_last_activity_at=row[5],
                student_last_activity_at=row[6],
                tutor_total_active_seconds=row[7] or 0,
                student_total_active_seconds=row[8] or 0,
                session_duration_seconds=session_duration,
                connection_logs=row[9] or []
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Connection status error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get connection status: {str(e)}"
        )
    finally:
        conn.close()
