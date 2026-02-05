"""
Attendance Suggestion Endpoints

PURPOSE:
Analyze whiteboard connection data and suggest attendance status automatically.
This is the "smart" part - converting raw connection metrics into attendance suggestions.

LOGIC:
- Connection timing: Did they join on time, late, or not at all?
- Active engagement: What % of session were they actively engaged?
- Disconnect patterns: Did they leave early?

ENDPOINTS:
1. GET /api/tutor/sessions/{session_id}/attendance-suggestion - Get auto-suggested attendance
2. PUT /api/tutor/sessions/{session_id}/attendance - Mark/override attendance (with suggestion support)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
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
# ATTENDANCE LOGIC - THE SMART ALGORITHM
# ============================================

def calculate_lateness(scheduled_time: datetime, actual_time: Optional[datetime]) -> Optional[int]:
    """
    Calculate how many minutes late someone was.
    Returns None if they never connected.
    Returns 0 if on time or early.
    """
    if not actual_time:
        return None  # Never connected

    if not scheduled_time:
        return 0  # No scheduled time, assume on time

    diff = (actual_time - scheduled_time).total_seconds() / 60
    return max(0, int(diff))  # Return 0 if early, otherwise minutes late


def suggest_attendance_status(
    connected_at: Optional[datetime],
    scheduled_start: Optional[datetime],
    active_seconds: int,
    session_duration_seconds: int,
    disconnected_at: Optional[datetime],
    scheduled_end: Optional[datetime]
) -> tuple[str, str, Dict[str, Any]]:
    """
    Suggest attendance status based on connection metrics.

    Returns: (status, confidence, metrics)
    - status: 'present', 'absent', 'late'
    - confidence: 'high', 'medium', 'low'
    - metrics: Supporting data for the suggestion
    """

    # RULE 1: Never connected = ABSENT
    if not connected_at:
        return ('absent', 'high', {
            'reason': 'Never connected to whiteboard',
            'connected': False
        })

    # Calculate metrics
    lateness_minutes = calculate_lateness(scheduled_start, connected_at)
    engagement_percentage = (active_seconds / session_duration_seconds * 100) if session_duration_seconds > 0 else 0
    engagement_percentage = min(100, engagement_percentage)  # Cap at 100%

    # Calculate if they left early
    left_early = False
    early_departure_minutes = 0
    if disconnected_at and scheduled_end:
        time_diff = (scheduled_end - disconnected_at).total_seconds() / 60
        if time_diff > 5:  # Left more than 5 minutes early
            left_early = True
            early_departure_minutes = int(time_diff)

    metrics = {
        'connected': True,
        'lateness_minutes': lateness_minutes,
        'engagement_percentage': round(engagement_percentage, 1),
        'active_seconds': active_seconds,
        'active_minutes': round(active_seconds / 60, 1),
        'session_duration_seconds': session_duration_seconds,
        'left_early': left_early,
        'early_departure_minutes': early_departure_minutes if left_early else 0
    }

    # RULE 2: Joined very late (>15 min) OR very low engagement (<30%)
    if (lateness_minutes and lateness_minutes > 15) or engagement_percentage < 30:
        confidence = 'high' if engagement_percentage < 20 else 'medium'
        return ('absent', confidence, {
            **metrics,
            'reason': f'Too late ({lateness_minutes}min) or low engagement ({engagement_percentage}%)'
        })

    # RULE 3: Joined late (5-15 min) = LATE
    if lateness_minutes and lateness_minutes >= 5:
        confidence = 'high'
        return ('late', confidence, {
            **metrics,
            'reason': f'Joined {lateness_minutes} minutes after scheduled start'
        })

    # RULE 4: Good engagement (>70%) = PRESENT
    if engagement_percentage >= 70:
        confidence = 'high'
        return ('present', confidence, {
            **metrics,
            'reason': f'Joined on time with {engagement_percentage}% engagement'
        })

    # RULE 5: Moderate engagement (40-70%) = PRESENT (but lower confidence)
    if engagement_percentage >= 40:
        confidence = 'medium'
        return ('present', confidence, {
            **metrics,
            'reason': f'Joined on time with moderate engagement ({engagement_percentage}%)'
        })

    # RULE 6: Low engagement (30-40%) = PRESENT (but low confidence)
    confidence = 'low'
    return ('present', confidence, {
        **metrics,
        'reason': f'Connected but low engagement ({engagement_percentage}%)'
    })


# ============================================
# PYDANTIC MODELS
# ============================================

class AttendanceSuggestionResponse(BaseModel):
    session_id: int
    has_whiteboard: bool
    tutor_status_suggestion: str
    tutor_confidence: str
    tutor_metrics: Dict[str, Any]
    student_status_suggestion: str
    student_confidence: str
    student_metrics: Dict[str, Any]
    overall_recommendation: str

class ManualAttendanceUpdate(BaseModel):
    tutor_attendance_status: Optional[str] = None  # present, absent, late
    student_attendance_status: Optional[str] = None  # present, absent, late
    attendance_notes: Optional[str] = None
    use_suggestion: Optional[bool] = False  # If true, use auto-suggestion

# ============================================
# ENDPOINTS
# ============================================

@router.get("/api/tutor/sessions/{session_id}/attendance-suggestion", response_model=AttendanceSuggestionResponse)
async def get_attendance_suggestion(
    session_id: int,
    authorization: str = Depends(lambda auth: auth)
):
    """
    Get AI-powered attendance suggestion based on whiteboard connection data.

    Returns auto-suggested attendance status for both tutor and student with:
    - Suggested status (present/absent/late)
    - Confidence level (high/medium/low)
    - Supporting metrics (lateness, engagement %, active time)
    - Recommendation text

    If session has no whiteboard, returns default 'present' with low confidence.
    """
    current_user = get_current_user(authorization)

    # Verify user is tutor
    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can view attendance suggestions"
        )

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Get session with whiteboard data
            cur.execute("""
                SELECT
                    s.id, s.session_date, s.start_time, s.end_time, s.duration,
                    s.whiteboard_id,
                    ws.tutor_connected_at, ws.student_connected_at,
                    ws.tutor_disconnected_at, ws.student_disconnected_at,
                    ws.tutor_total_active_seconds, ws.student_total_active_seconds,
                    ws.scheduled_start, ws.scheduled_end
                FROM sessions s
                LEFT JOIN whiteboard_sessions ws ON s.whiteboard_id = ws.id
                WHERE s.id = %s
            """, (session_id,))

            row = cur.fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found"
                )

            session_id = row[0]
            whiteboard_id = row[5]
            has_whiteboard = whiteboard_id is not None

            # If no whiteboard, return default suggestion
            if not has_whiteboard:
                return AttendanceSuggestionResponse(
                    session_id=session_id,
                    has_whiteboard=False,
                    tutor_status_suggestion='present',
                    tutor_confidence='low',
                    tutor_metrics={'reason': 'No whiteboard data available', 'connected': False},
                    student_status_suggestion='present',
                    student_confidence='low',
                    student_metrics={'reason': 'No whiteboard data available', 'connected': False},
                    overall_recommendation='No whiteboard data. Please mark attendance manually.'
                )

            # Extract whiteboard metrics
            tutor_connected_at = row[6]
            student_connected_at = row[7]
            tutor_disconnected_at = row[8]
            student_disconnected_at = row[9]
            tutor_active_seconds = row[10] or 0
            student_active_seconds = row[11] or 0
            scheduled_start = row[12]
            scheduled_end = row[13]

            # Calculate session duration
            if scheduled_start and scheduled_end:
                session_duration = int((scheduled_end - scheduled_start).total_seconds())
            elif row[4]:  # duration field
                session_duration = row[4] * 60  # Convert minutes to seconds
            else:
                session_duration = 3600  # Default 1 hour

            # Get suggestions for both tutor and student
            tutor_status, tutor_conf, tutor_metrics = suggest_attendance_status(
                tutor_connected_at, scheduled_start, tutor_active_seconds,
                session_duration, tutor_disconnected_at, scheduled_end
            )

            student_status, student_conf, student_metrics = suggest_attendance_status(
                student_connected_at, scheduled_start, student_active_seconds,
                session_duration, student_disconnected_at, scheduled_end
            )

            # Generate overall recommendation
            if tutor_conf == 'high' and student_conf == 'high':
                recommendation = f"High confidence: Tutor {tutor_status}, Student {student_status}. Ready to auto-apply."
            elif tutor_conf == 'low' or student_conf == 'low':
                recommendation = "Low confidence. Please review metrics and confirm manually."
            else:
                recommendation = f"Moderate confidence: Tutor {tutor_status}, Student {student_status}. Please review."

            return AttendanceSuggestionResponse(
                session_id=session_id,
                has_whiteboard=True,
                tutor_status_suggestion=tutor_status,
                tutor_confidence=tutor_conf,
                tutor_metrics=tutor_metrics,
                student_status_suggestion=student_status,
                student_confidence=student_conf,
                student_metrics=student_metrics,
                overall_recommendation=recommendation
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Attendance suggestion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate attendance suggestion: {str(e)}"
        )
    finally:
        conn.close()


@router.put("/api/tutor/sessions/{session_id}/attendance")
async def update_session_attendance(
    session_id: int,
    data: ManualAttendanceUpdate,
    authorization: str = Depends(lambda auth: auth)
):
    """
    Mark or override attendance for a session.

    Two modes:
    1. Manual: Provide tutor_attendance_status and/or student_attendance_status
    2. Auto-apply suggestion: Set use_suggestion=true to apply AI suggestion

    This endpoint updates the sessions table (source of truth for attendance).
    """
    current_user = get_current_user(authorization)

    # Verify user is tutor
    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tutors can mark attendance"
        )

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Verify tutor owns this session
            cur.execute("""
                SELECT s.id, ec.tutor_id, tp.id
                FROM sessions s
                JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
                JOIN tutor_profiles tp ON ec.tutor_id = tp.id
                WHERE s.id = %s
            """, (session_id,))

            session_row = cur.fetchone()
            if not session_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found"
                )

            # Get tutor's profile id
            cur.execute("""
                SELECT id FROM tutor_profiles WHERE user_id = %s
            """, (current_user['id'],))
            tutor_profile_row = cur.fetchone()
            if not tutor_profile_row or tutor_profile_row[0] != session_row[2]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only mark attendance for your own sessions"
                )

            # If use_suggestion=true, fetch AI suggestion
            if data.use_suggestion:
                # Call suggestion logic (reuse code from above)
                cur.execute("""
                    SELECT
                        s.whiteboard_id, s.duration,
                        ws.tutor_connected_at, ws.student_connected_at,
                        ws.tutor_disconnected_at, ws.student_disconnected_at,
                        ws.tutor_total_active_seconds, ws.student_total_active_seconds,
                        ws.scheduled_start, ws.scheduled_end
                    FROM sessions s
                    LEFT JOIN whiteboard_sessions ws ON s.whiteboard_id = ws.id
                    WHERE s.id = %s
                """, (session_id,))

                wb_row = cur.fetchone()
                if wb_row and wb_row[0]:  # Has whiteboard
                    session_duration = int((wb_row[9] - wb_row[8]).total_seconds()) if wb_row[8] and wb_row[9] else (wb_row[1] * 60 if wb_row[1] else 3600)

                    tutor_status, _, _ = suggest_attendance_status(
                        wb_row[2], wb_row[8], wb_row[6] or 0,
                        session_duration, wb_row[4], wb_row[9]
                    )
                    student_status, _, _ = suggest_attendance_status(
                        wb_row[3], wb_row[8], wb_row[7] or 0,
                        session_duration, wb_row[5], wb_row[9]
                    )

                    data.tutor_attendance_status = tutor_status
                    data.student_attendance_status = student_status

            # Build update query
            update_fields = []
            update_values = []

            if data.tutor_attendance_status:
                if data.tutor_attendance_status not in ['present', 'absent', 'late']:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="tutor_attendance_status must be: present, absent, or late"
                    )
                update_fields.append("tutor_attendance_status = %s")
                update_values.append(data.tutor_attendance_status)

            if data.student_attendance_status:
                if data.student_attendance_status not in ['present', 'absent', 'late']:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="student_attendance_status must be: present, absent, or late"
                    )
                update_fields.append("student_attendance_status = %s")
                update_values.append(data.student_attendance_status)

            if data.attendance_notes:
                update_fields.append("attendance_notes = %s")
                update_values.append(data.attendance_notes)

            if not update_fields:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No attendance data provided"
                )

            # Add metadata fields
            update_fields.extend([
                "attendance_marked_by = %s",
                "attendance_marked_at = %s",
                "attendance_source = %s",
                "updated_at = %s"
            ])

            source = 'whiteboard_auto' if data.use_suggestion else 'manual'
            now = datetime.utcnow()

            update_values.extend([
                current_user['id'],
                now,
                source,
                now
            ])

            update_values.append(session_id)

            # Execute update
            query = f"""
                UPDATE sessions
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING id, tutor_attendance_status, student_attendance_status,
                          attendance_source, attendance_marked_at
            """

            cur.execute(query, update_values)
            result = cur.fetchone()
            conn.commit()

            return {
                "success": True,
                "message": "Attendance updated successfully",
                "session_id": result[0],
                "tutor_attendance_status": result[1],
                "student_attendance_status": result[2],
                "attendance_source": result[3],
                "attendance_marked_at": result[4].isoformat(),
                "marked_by_user_id": current_user['id']
            }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Attendance update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update attendance: {str(e)}"
        )
    finally:
        conn.close()
