"""
Session Request Endpoints
Handles tutor session booking requests from students and parents
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime, time
import json
import psycopg
from dotenv import load_dotenv
import os
import jwt
from jwt import PyJWTError

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")
ALGORITHM = "HS256"

router = APIRouter(tags=["session-requests"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ============================================
# AUTHENTICATION
# ============================================

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=500, detail="Database URL not configured")
    return psycopg.connect(database_url)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")

        if user_id is None:
            raise credentials_exception

        # Convert to integer
        user_id = int(user_id)

        # Extract role_ids and active_role from JWT token
        role_ids = payload.get("role_ids", {})
        active_role = payload.get("role")

    except (PyJWTError, ValueError):
        raise credentials_exception

    # Get user from database
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT id, first_name, father_name, email, phone, roles, active_role,
                   grandfather_name, profile_picture
            FROM users
            WHERE id = %s
        """, (user_id,))

        row = cur.fetchone()

        if not row:
            raise credentials_exception

        # Return user dict with role_ids from JWT
        return {
            "id": row[0],
            "first_name": row[1],
            "father_name": row[2],
            "email": row[3],
            "phone": row[4],
            "roles": row[5] if isinstance(row[5], list) else [],
            "active_role": row[6],
            "grandfather_name": row[7],
            "profile_picture": row[8],
            "role_ids": role_ids  # Add role_ids from JWT payload
        }

    finally:
        cur.close()
        conn.close()


# Pydantic Models
class SessionRequestCreate(BaseModel):
    tutor_id: int
    package_id: Optional[int] = None
    message: Optional[str] = None
    preferred_schedule: Optional[str] = None  # Legacy text field
    # Student the request is for (when parent requests on behalf of child)
    requested_to_id: Optional[int] = None  # student_profiles.id when parent requests for child
    # New schedule fields
    schedule_type: Optional[Literal['recurring', 'specific_dates']] = None
    year_range: Optional[List[int]] = None  # e.g. [2024, 2025]
    months: Optional[List[str]] = None  # e.g. ['January', 'March']
    days: Optional[List[str]] = None  # e.g. ['Monday', 'Wednesday', 'Friday']
    specific_dates: Optional[List[str]] = None  # e.g. ['2024-12-25', '2024-12-26']
    start_time: Optional[str] = None  # e.g. '09:00'
    end_time: Optional[str] = None  # e.g. '17:00'


class SessionRequestResponse(BaseModel):
    id: int
    tutor_id: int
    requester_id: int
    requester_type: str
    requester_name: Optional[str] = None
    requester_profile_picture: Optional[str] = None
    requested_to_id: Optional[int] = None  # student_profiles.id when parent requests for child
    requested_to_name: Optional[str] = None  # Student name when parent requests for child
    package_id: Optional[int] = None
    package_name: Optional[str] = None  # Fetched via JOIN from tutor_packages
    status: str
    message: Optional[str] = None
    student_name: Optional[str] = None  # Fetched via JOIN from student_profiles/users
    student_grade: Optional[str] = None  # Fetched via JOIN from student_profiles
    preferred_schedule: Optional[str] = None  # Legacy text field
    contact_phone: Optional[str] = None  # Fetched via JOIN from users
    contact_email: Optional[str] = None  # Fetched via JOIN from users
    # Schedule fields
    schedule_type: Optional[str] = None
    year_range: Optional[List[int]] = None
    months: Optional[List[str]] = None
    days: Optional[List[str]] = None
    specific_dates: Optional[List[str]] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    # Timestamps
    created_at: datetime
    updated_at: datetime
    responded_at: Optional[datetime] = None
    rejected_reason: Optional[str] = None
    rejected_at: Optional[datetime] = None


class SessionRequestUpdate(BaseModel):
    status: Literal['accepted', 'rejected']
    rejected_reason: Optional[str] = None  # Required when status is 'rejected'


class MyStudent(BaseModel):
    id: int
    student_id: int  # student_profiles.id
    student_user_id: int  # users.id for chat/messaging
    student_name: str
    student_grade: str
    profile_picture: Optional[str] = None
    package_name: str
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    accepted_at: datetime
    requester_type: str


# Endpoints

@router.post("/api/session-requests", response_model=dict)
async def create_session_request(
    request: SessionRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new session request (for students/parents requesting tutoring)
    Also creates a chat conversation and sends a session_request message with package card
    """
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get active role and role-specific IDs from JWT
        active_role = current_user.get('active_role')
        role_ids = current_user.get('role_ids', {})
        user_id = current_user.get('id')

        # Determine requester type and get role-specific ID
        # Also determine requested_to_id (the student the session is for)
        requested_to_id = request.requested_to_id  # From request body (parent specifies child)

        if active_role == 'student':
            requester_type = 'student'
            requester_id = role_ids.get('student')
            if not requester_id:
                raise HTTPException(status_code=400, detail="Student profile not found. Please complete your student profile first.")
            # Student requests for themselves - set requested_to_id to their own profile
            requester_id = int(requester_id) if isinstance(requester_id, str) else requester_id
            requested_to_id = requester_id  # Student is requesting for themselves
        elif active_role == 'parent':
            requester_type = 'parent'
            requester_id = role_ids.get('parent')
            if not requester_id:
                raise HTTPException(status_code=400, detail="Parent profile not found. Please complete your parent profile first.")
            # Parent must specify which child the session is for
            requester_id = int(requester_id) if isinstance(requester_id, str) else requester_id
            if requested_to_id:
                requested_to_id = int(requested_to_id) if isinstance(requested_to_id, str) else requested_to_id
        else:
            raise HTTPException(status_code=403, detail="Only students and parents can request tutoring sessions")

        # Get tutor's user_id for chat conversation
        cur.execute("""
            SELECT user_id FROM tutor_profiles WHERE id = %s
        """, (request.tutor_id,))
        tutor_row = cur.fetchone()
        if not tutor_row:
            raise HTTPException(status_code=404, detail="Tutor not found")
        tutor_user_id = tutor_row[0]

        # If package_id is provided and schedule fields are not filled, use package defaults
        package_schedule_type = request.schedule_type
        package_days = request.days
        package_start_time = request.start_time
        package_end_time = request.end_time

        if request.package_id:
            # Fetch package schedule details
            cur.execute("""
                SELECT schedule_type, schedule_days, start_time, end_time
                FROM tutor_packages WHERE id = %s
            """, (request.package_id,))
            pkg_row = cur.fetchone()

            if pkg_row:
                # Use package defaults if user didn't provide schedule preferences
                if not package_schedule_type and pkg_row[0]:
                    package_schedule_type = pkg_row[0]

                if not package_days and pkg_row[1]:
                    # schedule_days could be JSON string, comma-separated, or array
                    pkg_days = pkg_row[1]
                    if isinstance(pkg_days, str):
                        try:
                            package_days = json.loads(pkg_days) if pkg_days.startswith('[') else pkg_days.split(',')
                        except:
                            package_days = [pkg_days] if pkg_days else None
                    elif isinstance(pkg_days, list):
                        package_days = pkg_days

                if not package_start_time and pkg_row[2]:
                    package_start_time = str(pkg_row[2])[:5] if pkg_row[2] else None

                if not package_end_time and pkg_row[3]:
                    package_end_time = str(pkg_row[3])[:5] if pkg_row[3] else None

        # Convert JSON fields for PostgreSQL
        year_range_json = json.dumps(request.year_range) if request.year_range else None
        months_json = json.dumps(request.months) if request.months else None
        days_json = json.dumps(package_days) if package_days else None
        specific_dates_json = json.dumps(request.specific_dates) if request.specific_dates else None

        # Insert session request with role-specific ID and schedule fields
        # Uses package defaults if user didn't provide schedule preferences
        # requested_to_id is the student profile ID (self for students, child for parents)
        cur.execute("""
            INSERT INTO requested_sessions (
                tutor_id, requester_id, requester_type, package_id,
                message, preferred_schedule, status, requested_to_id,
                schedule_type, year_range, months, days, specific_dates,
                start_time, end_time
            ) VALUES (
                %s, %s, %s, %s, %s, %s, 'pending', %s,
                %s, %s, %s, %s, %s, %s, %s
            ) RETURNING id, created_at
        """, (
            request.tutor_id, requester_id, requester_type,
            request.package_id, request.message, request.preferred_schedule,
            requested_to_id,  # Use local variable (auto-set for students, from request for parents)
            package_schedule_type, year_range_json, months_json, days_json,
            specific_dates_json, package_start_time, package_end_time
        ))

        session_result = cur.fetchone()
        session_request_id = session_result[0]
        created_at = session_result[1]

        # =============================================
        # CREATE OR GET CHAT CONVERSATION
        # =============================================

        # Check if a direct conversation already exists between requester and tutor
        cur.execute("""
            SELECT c.id FROM conversations c
            JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
            JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
            WHERE c.type = 'direct'
            AND cp1.profile_id = %s AND cp1.profile_type = %s
            AND cp2.profile_id = %s AND cp2.profile_type = 'tutor'
            LIMIT 1
        """, (requester_id, requester_type, request.tutor_id))

        existing_conv = cur.fetchone()

        if existing_conv:
            conversation_id = existing_conv[0]
        else:
            # Create new conversation
            cur.execute("""
                INSERT INTO conversations (
                    type, created_by_profile_id, created_by_profile_type, created_at, updated_at
                ) VALUES ('direct', %s, %s, NOW(), NOW())
                RETURNING id
            """, (requester_id, requester_type))
            conversation_id = cur.fetchone()[0]

            # Add requester as participant
            cur.execute("""
                INSERT INTO conversation_participants (
                    conversation_id, profile_id, profile_type, user_id, role, is_active, joined_at, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, 'member', true, NOW(), NOW(), NOW())
            """, (conversation_id, requester_id, requester_type, user_id))

            # Add tutor as participant
            cur.execute("""
                INSERT INTO conversation_participants (
                    conversation_id, profile_id, profile_type, user_id, role, is_active, joined_at, created_at, updated_at
                ) VALUES (%s, %s, 'tutor', %s, 'member', true, NOW(), NOW(), NOW())
            """, (conversation_id, request.tutor_id, tutor_user_id))

        # =============================================
        # CREATE SESSION REQUEST MESSAGE WITH PACKAGE CARD
        # =============================================

        # Build message metadata with session request and package info
        # Uses package defaults if user didn't provide schedule preferences
        message_metadata = {
            "session_request_id": session_request_id,
            "package_id": request.package_id,
            "tutor_id": request.tutor_id,
            "requester_type": requester_type,
            "status": "pending",
            "schedule_type": package_schedule_type,
            "year_range": request.year_range,
            "months": request.months,
            "days": package_days,
            "specific_dates": request.specific_dates,
            "start_time": package_start_time,
            "end_time": package_end_time
        }

        # The content will be the optional message from the user (or empty)
        message_content = request.message or ""

        # Insert session_request message
        cur.execute("""
            INSERT INTO chat_messages (
                conversation_id, sender_profile_id, sender_profile_type, sender_user_id,
                message_type, content, media_metadata, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, 'session_request', %s, %s, NOW(), NOW())
            RETURNING id
        """, (
            conversation_id, requester_id, requester_type, user_id,
            message_content, json.dumps(message_metadata)
        ))

        message_id = cur.fetchone()[0]

        # Update conversation's last_message_at
        cur.execute("""
            UPDATE conversations SET last_message_at = NOW(), updated_at = NOW()
            WHERE id = %s
        """, (conversation_id,))

        conn.commit()

        return {
            "success": True,
            "message": "Session request sent successfully",
            "request_id": session_request_id,
            "conversation_id": conversation_id,
            "message_id": message_id,
            "created_at": created_at.isoformat()
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create session request: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.get("/api/session-requests/tutor", response_model=List[SessionRequestResponse])
async def get_tutor_session_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get session requests for the current tutor (filtered by status if provided)
    """
    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Only tutors can access this endpoint")

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get tutor's role-specific ID
        role_ids = current_user.get('role_ids', {})
        tutor_id = role_ids.get('tutor')

        if not tutor_id:
            raise HTTPException(status_code=400, detail="Tutor profile not found")

        # Convert to integer if needed (JWT stores as string)
        tutor_id = int(tutor_id) if isinstance(tutor_id, str) else tutor_id

        # Build query that JOINs to fetch all needed data
        # student_name, student_grade, contact info now fetched via JOINs
        query = """
            SELECT
                sr.id, sr.tutor_id, sr.requester_id, sr.requester_type,
                -- Requester name (from student_profiles or parent_profiles)
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT CONCAT(u.first_name, ' ', u.father_name)
                         FROM student_profiles sp
                         JOIN users u ON sp.user_id = u.id
                         WHERE sp.id = sr.requester_id)
                    WHEN sr.requester_type = 'parent' THEN
                        (SELECT CONCAT(u.first_name, ' ', u.father_name)
                         FROM parent_profiles pp
                         JOIN users u ON pp.user_id = u.id
                         WHERE pp.id = sr.requester_id)
                END as requester_name,
                -- Requester profile picture
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT u.profile_picture
                         FROM student_profiles sp
                         JOIN users u ON sp.user_id = u.id
                         WHERE sp.id = sr.requester_id)
                    WHEN sr.requester_type = 'parent' THEN
                        (SELECT u.profile_picture
                         FROM parent_profiles pp
                         JOIN users u ON pp.user_id = u.id
                         WHERE pp.id = sr.requester_id)
                END as requester_profile_picture,
                sr.package_id,
                -- Package name from tutor_packages
                (SELECT tp.name FROM tutor_packages tp WHERE tp.id = sr.package_id) as package_name,
                sr.status, sr.message,
                -- Student name (for students, use their name; for parents, same as requester)
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT CONCAT(u.first_name, ' ', u.father_name)
                         FROM student_profiles sp
                         JOIN users u ON sp.user_id = u.id
                         WHERE sp.id = sr.requester_id)
                    WHEN sr.requester_type = 'parent' THEN
                        (SELECT CONCAT(u.first_name, ' ', u.father_name)
                         FROM parent_profiles pp
                         JOIN users u ON pp.user_id = u.id
                         WHERE pp.id = sr.requester_id)
                END as student_name,
                -- Student grade (from student_profiles)
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT sp.grade_level FROM student_profiles sp WHERE sp.id = sr.requester_id)
                    ELSE NULL
                END as student_grade,
                sr.preferred_schedule,
                -- Contact phone (from users)
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT u.phone FROM student_profiles sp JOIN users u ON sp.user_id = u.id WHERE sp.id = sr.requester_id)
                    WHEN sr.requester_type = 'parent' THEN
                        (SELECT u.phone FROM parent_profiles pp JOIN users u ON pp.user_id = u.id WHERE pp.id = sr.requester_id)
                END as contact_phone,
                -- Contact email (from users)
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT u.email FROM student_profiles sp JOIN users u ON sp.user_id = u.id WHERE sp.id = sr.requester_id)
                    WHEN sr.requester_type = 'parent' THEN
                        (SELECT u.email FROM parent_profiles pp JOIN users u ON pp.user_id = u.id WHERE pp.id = sr.requester_id)
                END as contact_email,
                sr.created_at, sr.updated_at, sr.responded_at,
                sr.rejected_reason, sr.rejected_at,
                -- Schedule fields
                sr.schedule_type, sr.year_range, sr.months, sr.days,
                sr.specific_dates, sr.start_time, sr.end_time,
                -- Requested to (student) when parent requests for child
                sr.requested_to_id,
                (SELECT CONCAT(u.first_name, ' ', u.father_name)
                 FROM student_profiles sp
                 JOIN users u ON sp.user_id = u.id
                 WHERE sp.id = sr.requested_to_id) as requested_to_name
            FROM requested_sessions sr
            WHERE sr.tutor_id = %s
        """

        params = [tutor_id]

        if status:
            query += " AND sr.status = %s"
            params.append(status)

        query += " ORDER BY sr.created_at DESC"

        cur.execute(query, params)
        rows = cur.fetchall()

        requests = []
        for row in rows:
            requests.append({
                "id": row[0],
                "tutor_id": row[1],
                "requester_id": row[2],
                "requester_type": row[3],
                "requester_name": row[4],
                "requester_profile_picture": row[5],
                "package_id": row[6],
                "package_name": row[7],
                "status": row[8],
                "message": row[9],
                "student_name": row[10],
                "student_grade": row[11],
                "preferred_schedule": row[12],
                "contact_phone": row[13],
                "contact_email": row[14],
                "created_at": row[15].isoformat() if row[15] else None,
                "updated_at": row[16].isoformat() if row[16] else None,
                "responded_at": row[17].isoformat() if row[17] else None,
                "rejected_reason": row[18],
                "rejected_at": row[19].isoformat() if row[19] else None,
                # Schedule fields
                "schedule_type": row[20],
                "year_range": row[21],
                "months": row[22],
                "days": row[23],
                "specific_dates": row[24],
                "start_time": str(row[25]) if row[25] else None,
                "end_time": str(row[26]) if row[26] else None,
                # Requested to (student when parent requests for child)
                "requested_to_id": row[27],
                "requested_to_name": row[28]
            })

        return requests

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch session requests: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.get("/api/session-requests/tutor/my-students", response_model=List[MyStudent])
async def get_my_students(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all accepted students for the current tutor from tutor_students table
    """
    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Only tutors can access this endpoint")

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get tutor's profile ID from JWT token (enrolled_students.tutor_id references tutor_profiles.id)
        role_ids = current_user.get('role_ids', {})
        tutor_profile_id = role_ids.get('tutor')

        if not tutor_profile_id:
            raise HTTPException(status_code=400, detail="Tutor profile not found")

        # Convert to integer if needed (JWT stores as string)
        tutor_profile_id = int(tutor_profile_id) if isinstance(tutor_profile_id, str) else tutor_profile_id

        # Read from enrolled_students table and join with student_profiles and users to get display data
        # es.tutor_id = tutor_profiles.id
        # es.student_id = student_profiles.id
        cur.execute("""
            SELECT
                es.id,
                sp.user_id as student_user_id,
                sp.id as student_profile_id,
                CONCAT(u.first_name, ' ', u.father_name, ' ', u.grandfather_name) as student_name,
                sp.grade_level as student_grade,
                sp.profile_picture,
                tp.name as package_name,
                u.phone as contact_phone,
                u.email as contact_email,
                es.enrolled_at,
                'student' as requester_type
            FROM enrolled_students es
            INNER JOIN student_profiles sp ON es.student_id = sp.id
            INNER JOIN users u ON sp.user_id = u.id
            LEFT JOIN tutor_packages tp ON es.package_id = tp.id
            WHERE es.tutor_id = %s
            ORDER BY es.enrolled_at DESC
        """, (tutor_profile_id,))

        rows = cur.fetchall()

        students = []
        for row in rows:
            students.append({
                "id": row[0],
                "student_id": row[2],  # student_profiles.id for frontend routing
                "student_user_id": row[1],  # users.id for chat/messaging
                "student_name": row[3] if row[3] else "Unknown Student",
                "student_grade": row[4] if row[4] else "N/A",
                "profile_picture": row[5] if row[5] else "/uploads/system_images/system_profile_pictures/boy-user-image.jpg",
                "package_name": row[6] if row[6] else "N/A",
                "contact_phone": row[7],
                "contact_email": row[8],
                "accepted_at": row[9].isoformat() if row[9] else None,
                "requester_type": row[10] if row[10] else "student"
            })

        return students

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch students: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.get("/api/session-requests/tutor/{request_id}", response_model=SessionRequestResponse)
async def get_session_request_detail(
    request_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Get details of a specific session request
    """
    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Only tutors can access this endpoint")

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get tutor's role-specific ID
        role_ids = current_user.get('role_ids', {})
        tutor_id = role_ids.get('tutor')

        if not tutor_id:
            raise HTTPException(status_code=400, detail="Tutor profile not found")

        # Convert to integer if needed (JWT stores as string)
        tutor_id = int(tutor_id) if isinstance(tutor_id, str) else tutor_id

        cur.execute("""
            SELECT
                sr.id, sr.tutor_id, sr.requester_id, sr.requester_type,
                -- Requester name
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT CONCAT(u.first_name, ' ', u.father_name)
                         FROM student_profiles sp
                         JOIN users u ON sp.user_id = u.id
                         WHERE sp.id = sr.requester_id)
                    WHEN sr.requester_type = 'parent' THEN
                        (SELECT CONCAT(u.first_name, ' ', u.father_name)
                         FROM parent_profiles pp
                         JOIN users u ON pp.user_id = u.id
                         WHERE pp.id = sr.requester_id)
                END as requester_name,
                -- Requester profile picture
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT u.profile_picture
                         FROM student_profiles sp
                         JOIN users u ON sp.user_id = u.id
                         WHERE sp.id = sr.requester_id)
                    WHEN sr.requester_type = 'parent' THEN
                        (SELECT u.profile_picture
                         FROM parent_profiles pp
                         JOIN users u ON pp.user_id = u.id
                         WHERE pp.id = sr.requester_id)
                END as requester_profile_picture,
                sr.package_id,
                (SELECT tp.name FROM tutor_packages tp WHERE tp.id = sr.package_id) as package_name,
                sr.status, sr.message,
                -- Student name
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT CONCAT(u.first_name, ' ', u.father_name)
                         FROM student_profiles sp
                         JOIN users u ON sp.user_id = u.id
                         WHERE sp.id = sr.requester_id)
                    WHEN sr.requester_type = 'parent' THEN
                        (SELECT CONCAT(u.first_name, ' ', u.father_name)
                         FROM parent_profiles pp
                         JOIN users u ON pp.user_id = u.id
                         WHERE pp.id = sr.requester_id)
                END as student_name,
                -- Student grade
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT sp.grade_level FROM student_profiles sp WHERE sp.id = sr.requester_id)
                    ELSE NULL
                END as student_grade,
                sr.preferred_schedule,
                -- Contact phone
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT u.phone FROM student_profiles sp JOIN users u ON sp.user_id = u.id WHERE sp.id = sr.requester_id)
                    WHEN sr.requester_type = 'parent' THEN
                        (SELECT u.phone FROM parent_profiles pp JOIN users u ON pp.user_id = u.id WHERE pp.id = sr.requester_id)
                END as contact_phone,
                -- Contact email
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT u.email FROM student_profiles sp JOIN users u ON sp.user_id = u.id WHERE sp.id = sr.requester_id)
                    WHEN sr.requester_type = 'parent' THEN
                        (SELECT u.email FROM parent_profiles pp JOIN users u ON pp.user_id = u.id WHERE pp.id = sr.requester_id)
                END as contact_email,
                sr.created_at, sr.updated_at, sr.responded_at,
                sr.rejected_reason, sr.rejected_at,
                -- Schedule fields
                sr.schedule_type, sr.year_range, sr.months, sr.days,
                sr.specific_dates, sr.start_time, sr.end_time,
                -- Requested to (student) when parent requests for child
                sr.requested_to_id,
                (SELECT CONCAT(u.first_name, ' ', u.father_name)
                 FROM student_profiles sp
                 JOIN users u ON sp.user_id = u.id
                 WHERE sp.id = sr.requested_to_id) as requested_to_name
            FROM requested_sessions sr
            WHERE sr.id = %s AND sr.tutor_id = %s
        """, (request_id, tutor_id))

        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Session request not found")

        return {
            "id": row[0],
            "tutor_id": row[1],
            "requester_id": row[2],
            "requester_type": row[3],
            "requester_name": row[4],
            "requester_profile_picture": row[5],
            "package_id": row[6],
            "package_name": row[7],
            "status": row[8],
            "message": row[9],
            "student_name": row[10],
            "student_grade": row[11],
            "preferred_schedule": row[12],
            "contact_phone": row[13],
            "contact_email": row[14],
            "created_at": row[15].isoformat() if row[15] else None,
            "updated_at": row[16].isoformat() if row[16] else None,
            "responded_at": row[17].isoformat() if row[17] else None,
            "rejected_reason": row[18],
            "rejected_at": row[19].isoformat() if row[19] else None,
            # Schedule fields
            "schedule_type": row[20],
            "year_range": row[21],
            "months": row[22],
            "days": row[23],
            "specific_dates": row[24],
            "start_time": str(row[25]) if row[25] else None,
            "end_time": str(row[26]) if row[26] else None,
            # Requested to (student when parent requests for child)
            "requested_to_id": row[27],
            "requested_to_name": row[28]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch session request: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.patch("/api/session-requests/tutor/{request_id}", response_model=dict)
async def update_session_request_status(
    request_id: int,
    update: SessionRequestUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Accept or reject a session request
    When status is 'accepted', automatically adds student to tutor_students table
    """
    if 'tutor' not in current_user.get('roles', []):
        raise HTTPException(status_code=403, detail="Only tutors can accept/reject session requests")

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get tutor's role-specific ID
        role_ids = current_user.get('role_ids', {})
        tutor_id = role_ids.get('tutor')

        if not tutor_id:
            raise HTTPException(status_code=400, detail="Tutor profile not found")

        # Convert to integer if needed (JWT stores as string)
        tutor_id = int(tutor_id) if isinstance(tutor_id, str) else tutor_id

        # Update the session request status
        if update.status == 'rejected':
            # For rejection, also set rejected_reason and rejected_at
            cur.execute("""
                UPDATE requested_sessions
                SET status = %s, responded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
                    rejected_reason = %s, rejected_at = CURRENT_TIMESTAMP
                WHERE id = %s AND tutor_id = %s AND status = 'pending'
                RETURNING id, status, responded_at, requester_id, requester_type, package_id
            """, (update.status, update.rejected_reason, request_id, tutor_id))
        else:
            # For acceptance, no rejection fields
            cur.execute("""
                UPDATE requested_sessions
                SET status = %s, responded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND tutor_id = %s AND status = 'pending'
                RETURNING id, status, responded_at, requester_id, requester_type, package_id
            """, (update.status, request_id, tutor_id))

        result = cur.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Session request not found or already responded to")

        # If status is accepted, add student to enrolled_students table and remove from requested_sessions
        if update.status == 'accepted':
            request_data = {
                'id': result[0],
                'status': result[1],
                'responded_at': result[2],
                'requester_id': result[3],
                'requester_type': result[4],
                'package_id': result[5]
            }

            # Insert into enrolled_students table
            # For students, requester_id is their student_profile.id
            # For parents, requester_id is parent_profile.id - we need to handle this differently
            student_profile_id = request_data['requester_id']

            if request_data['requester_type'] == 'parent':
                # For parent requests, we need to get the student profile ID from their children
                # For now, skip enrollment if it's a parent (they should select which child)
                # TODO: Handle parent-child enrollment flow
                pass

            # Use package_id directly from the request
            package_id = request_data['package_id']

            # Check if student is already enrolled with this tutor
            cur.execute("""
                SELECT id FROM enrolled_students
                WHERE tutor_id = %s AND student_id = %s
            """, (tutor_id, student_profile_id))

            existing = cur.fetchone()
            if not existing:
                cur.execute("""
                    INSERT INTO enrolled_students (
                        tutor_id, student_id, package_id, enrolled_at
                    ) VALUES (
                        %s, %s, %s, CURRENT_TIMESTAMP
                    )
                """, (
                    tutor_id,
                    student_profile_id,
                    package_id
                ))

            # Delete the accepted request from requested_sessions table
            # (Student is now enrolled, no need to keep the request)
            cur.execute("""
                DELETE FROM requested_sessions
                WHERE id = %s
            """, (request_data['id'],))

        conn.commit()

        return {
            "success": True,
            "message": f"Session request {update.status}" + (" and student added to your students list" if update.status == 'accepted' else ""),
            "request_id": result[0],
            "status": result[1],
            "responded_at": result[2].isoformat() if result[2] else None
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update session request: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.get("/api/session-requests/my-requests", response_model=List[SessionRequestResponse])
async def get_my_session_requests(
    current_user: dict = Depends(get_current_user)
):
    """
    Get session requests made by the current user (student/parent)
    Uses role-specific ID to filter requests
    """
    # Get active role and role-specific IDs
    active_role = current_user.get('active_role')
    role_ids = current_user.get('role_ids', {})

    # Determine requester type and get role-specific ID
    if active_role == 'student':
        requester_type = 'student'
        requester_id = role_ids.get('student')
        if not requester_id:
            raise HTTPException(status_code=400, detail="Student profile not found")
    elif active_role == 'parent':
        requester_type = 'parent'
        requester_id = role_ids.get('parent')
        if not requester_id:
            raise HTTPException(status_code=400, detail="Parent profile not found")
    else:
        raise HTTPException(status_code=403, detail="Only students and parents can view session requests")

    # Convert requester_id to integer (JWT stores as string)
    requester_id = int(requester_id) if isinstance(requester_id, str) else requester_id

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                sr.id, sr.tutor_id, sr.requester_id, sr.requester_type,
                CONCAT(u.first_name, ' ', u.father_name) as tutor_name,
                u.profile_picture as tutor_profile_picture,
                sr.package_id,
                (SELECT tp2.name FROM tutor_packages tp2 WHERE tp2.id = sr.package_id) as package_name,
                sr.status, sr.message,
                -- Student name (self for students)
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT CONCAT(u2.first_name, ' ', u2.father_name)
                         FROM student_profiles sp2
                         JOIN users u2 ON sp2.user_id = u2.id
                         WHERE sp2.id = sr.requester_id)
                    ELSE NULL
                END as student_name,
                -- Student grade
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT sp2.grade_level FROM student_profiles sp2 WHERE sp2.id = sr.requester_id)
                    ELSE NULL
                END as student_grade,
                sr.preferred_schedule,
                -- Contact phone
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT u2.phone FROM student_profiles sp2 JOIN users u2 ON sp2.user_id = u2.id WHERE sp2.id = sr.requester_id)
                    WHEN sr.requester_type = 'parent' THEN
                        (SELECT u2.phone FROM parent_profiles pp2 JOIN users u2 ON pp2.user_id = u2.id WHERE pp2.id = sr.requester_id)
                END as contact_phone,
                -- Contact email
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT u2.email FROM student_profiles sp2 JOIN users u2 ON sp2.user_id = u2.id WHERE sp2.id = sr.requester_id)
                    WHEN sr.requester_type = 'parent' THEN
                        (SELECT u2.email FROM parent_profiles pp2 JOIN users u2 ON pp2.user_id = u2.id WHERE pp2.id = sr.requester_id)
                END as contact_email,
                sr.created_at, sr.updated_at, sr.responded_at,
                sr.rejected_reason, sr.rejected_at,
                -- Schedule fields
                sr.schedule_type, sr.year_range, sr.months, sr.days,
                sr.specific_dates, sr.start_time, sr.end_time,
                -- Requested to (student) when parent requests for child
                sr.requested_to_id,
                (SELECT CONCAT(u3.first_name, ' ', u3.father_name)
                 FROM student_profiles sp3
                 JOIN users u3 ON sp3.user_id = u3.id
                 WHERE sp3.id = sr.requested_to_id) as requested_to_name
            FROM requested_sessions sr
            LEFT JOIN tutor_profiles tp ON sr.tutor_id = tp.id
            LEFT JOIN users u ON tp.user_id = u.id
            WHERE sr.requester_id = %s AND sr.requester_type = %s
            ORDER BY sr.created_at DESC
        """, (requester_id, requester_type))

        rows = cur.fetchall()

        requests = []
        for row in rows:
            requests.append({
                "id": row[0],
                "tutor_id": row[1],
                "requester_id": row[2],
                "requester_type": row[3],
                "requester_name": row[4],  # Actually tutor name in this context
                "requester_profile_picture": row[5],
                "package_id": row[6],
                "package_name": row[7],
                "status": row[8],
                "message": row[9],
                "student_name": row[10],
                "student_grade": row[11],
                "preferred_schedule": row[12],
                "contact_phone": row[13],
                "contact_email": row[14],
                "created_at": row[15].isoformat() if row[15] else None,
                "updated_at": row[16].isoformat() if row[16] else None,
                "responded_at": row[17].isoformat() if row[17] else None,
                "rejected_reason": row[18],
                "rejected_at": row[19].isoformat() if row[19] else None,
                # Schedule fields
                "schedule_type": row[20],
                "year_range": row[21],
                "months": row[22],
                "days": row[23],
                "specific_dates": row[24],
                "start_time": str(row[25]) if row[25] else None,
                "end_time": str(row[26]) if row[26] else None,
                # Requested to (student when parent requests for child)
                "requested_to_id": row[27],
                "requested_to_name": row[28]
            })

        return requests

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch session requests: {str(e)}")
    finally:
        cur.close()
        conn.close()

@router.get("/tutor/student-details/{student_profile_id}")
async def get_student_details(
    student_profile_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Get comprehensive student details from student_details table

    Returns:
    - Student information with progress metrics
    - Attendance data
    - Assignment tracking
    - Package information
    - Parent information
    - Tuition details
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get tutor_id from current user
        tutor_id = current_user['id']

        # Fetch student details
        cur.execute("""
            SELECT
                sd.id,
                sd.tutor_id,
                sd.student_profile_id,
                sd.student_name,
                sd.student_grade,
                sd.profile_picture,
                sd.package_id,
                sd.package_name,
                sd.overall_progress,
                sd.attendance_rate,
                sd.improvement_rate,
                sd.total_assignments,
                sd.completed_assignments,
                sd.pending_assignments,
                sd.overdue_assignments,
                sd.total_sessions,
                sd.attended_sessions,
                sd.absent_sessions,
                sd.late_sessions,
                sd.average_grade,
                sd.grade_letter,
                sd.monthly_tuition,
                sd.outstanding_balance,
                sd.next_payment_due,
                sd.parent_name,
                sd.parent_phone,
                sd.parent_email,
                sd.parent_relationship,
                sd.enrolled_at,
                sd.last_session_at,
                sd.last_updated
            FROM student_details sd
            WHERE sd.tutor_id = %s AND sd.student_profile_id = %s
        """, (tutor_id, student_profile_id))

        row = cur.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail=f"Student details not found for student {student_profile_id}"
            )

        # Build response
        student_details = {
            "id": row[0],
            "tutor_id": row[1],
            "student_profile_id": row[2],
            "student_name": row[3],
            "student_grade": row[4],
            "profile_picture": row[5],
            "package_id": row[6],
            "package_name": row[7],
            "overall_progress": row[8],
            "attendance_rate": row[9],
            "improvement_rate": row[10],
            "total_assignments": row[11],
            "completed_assignments": row[12],
            "pending_assignments": row[13],
            "overdue_assignments": row[14],
            "total_sessions": row[15],
            "attended_sessions": row[16],
            "absent_sessions": row[17],
            "late_sessions": row[18],
            "average_grade": float(row[19]) if row[19] else None,
            "grade_letter": row[20],
            "monthly_tuition": float(row[21]) if row[21] else None,
            "outstanding_balance": float(row[22]) if row[22] else 0.0,
            "next_payment_due": row[23].isoformat() if row[23] else None,
            "parent_name": row[24],
            "parent_phone": row[25],
            "parent_email": row[26],
            "parent_relationship": row[27],
            "enrolled_at": row[28].isoformat() if row[28] else None,
            "last_session_at": row[29].isoformat() if row[29] else None,
            "last_updated": row[30].isoformat() if row[30] else None
        }

        return student_details

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch student details: {str(e)}"
        )
    finally:
        cur.close()
        conn.close()
