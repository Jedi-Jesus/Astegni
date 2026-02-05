"""
Session Request Endpoints
Handles tutor session booking requests from students and parents
"""
from fastapi import APIRouter, HTTPException, Depends, Header
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

# Import 2FA protection helper
try:
    from tfa_protection import require_2fa
    HAS_2FA_PROTECTION = True
except ImportError:
    HAS_2FA_PROTECTION = False
    print("Warning: 2FA protection not available in this module")

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
    # Counter-offer price (student/parent proposes their own price)
    counter_offer_price: Optional[float] = None


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
    # Counter-offer price
    counter_offer_price: Optional[float] = None
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
    course_names: Optional[List[str]] = []  # Course names from courses table via tutor_packages.course_ids
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
        # Get user ID and active role from JWT
        user_id = current_user.get('id')  # This is the requester_id (users.id)
        active_role = current_user.get('active_role')
        role_ids = current_user.get('role_ids', {})

        # Determine requester type from active role
        # Also determine requested_to_id (the student the session is for)
        requested_to_id = request.requested_to_id  # From request body (parent specifies child)

        if active_role == 'student':
            requester_type = 'student'
            student_profile_id = role_ids.get('student')
            if not student_profile_id:
                raise HTTPException(status_code=400, detail="Student profile not found. Please complete your student profile first.")
            # Student requests for themselves - set requested_to_id to their own profile
            student_profile_id = int(student_profile_id) if isinstance(student_profile_id, str) else student_profile_id
            requested_to_id = student_profile_id  # Student is requesting for themselves
        elif active_role == 'parent':
            requester_type = 'parent'
            parent_profile_id = role_ids.get('parent')
            if not parent_profile_id:
                raise HTTPException(status_code=400, detail="Parent profile not found. Please complete your parent profile first.")
            # Parent must specify which child the session is for
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

        # =============================================
        # CHECK FOR DUPLICATE REQUESTS
        # =============================================
        # Check for existing pending or accepted requests for the same tutor + package + requester
        cur.execute("""
            SELECT id, created_at, status FROM requested_sessions
            WHERE tutor_id = %s
            AND requester_id = %s
            AND package_id = %s
            AND status IN ('pending', 'accepted')
            ORDER BY created_at DESC
            LIMIT 1
        """, (request.tutor_id, user_id, request.package_id))

        existing_request = cur.fetchone()

        if existing_request:
            existing_id = existing_request[0]
            existing_created_at = existing_request[1]
            existing_status = existing_request[2]

            if existing_status == 'pending':
                raise HTTPException(
                    status_code=409,
                    detail=f"⚠️PENDING⚠️Request already sent. You have a pending request for this package (Request ID: {existing_id}, sent on {existing_created_at.strftime('%B %d, %Y')}). Please wait for the tutor's response."
                )
            elif existing_status == 'accepted':
                # Use 409 for consistency but mark it as accepted with a prefix
                raise HTTPException(
                    status_code=409,
                    detail=f"✅ACCEPTED✅Request already accepted. You already have an accepted request for this package (Request ID: {existing_id}, accepted on {existing_created_at.strftime('%B %d, %Y')}). Check your profile to view active sessions."
                )

        # Insert session request with USER-BASED requester_id
        # requester_id = users.id (not profile ID)
        # requester_type = role context ('student' or 'parent')
        # requested_to_id = student profile ID (self for students, child for parents)
        cur.execute("""
            INSERT INTO requested_sessions (
                tutor_id, requester_id, requester_type, package_id,
                message, preferred_schedule, status, requested_to_id,
                schedule_type, year_range, months, days, specific_dates,
                start_time, end_time, counter_offer_price
            ) VALUES (
                %s, %s, %s, %s, %s, %s, 'pending', %s,
                %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING id, created_at
        """, (
            request.tutor_id, user_id, requester_type,  # user_id is now users.id
            request.package_id, request.message, request.preferred_schedule,
            requested_to_id,  # Student profile ID
            package_schedule_type, year_range_json, months_json, days_json,
            specific_dates_json, package_start_time, package_end_time,
            request.counter_offer_price
        ))

        session_result = cur.fetchone()
        session_request_id = session_result[0]
        created_at = session_result[1]

        # =============================================
        # CREATE OR GET CHAT CONVERSATION (USER-BASED)
        # =============================================

        # Check if a direct conversation already exists between requester and tutor (user-based)
        cur.execute("""
            SELECT c.id FROM conversations c
            JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
            JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
            WHERE c.type = 'direct'
            AND cp1.user_id = %s
            AND cp2.user_id = %s
            LIMIT 1
        """, (user_id, tutor_user_id))

        existing_conv = cur.fetchone()

        if existing_conv:
            conversation_id = existing_conv[0]
        else:
            # Create new conversation (user-based, no profile tracking)
            cur.execute("""
                INSERT INTO conversations (
                    type, created_by_user_id, created_at, updated_at
                ) VALUES ('direct', %s, NOW(), NOW())
                RETURNING id
            """, (user_id,))
            conversation_id = cur.fetchone()[0]

            # Add requester as participant (user-based)
            cur.execute("""
                INSERT INTO conversation_participants (
                    conversation_id, user_id, role, is_active, joined_at, created_at, updated_at
                ) VALUES (%s, %s, 'member', true, NOW(), NOW(), NOW())
            """, (conversation_id, user_id))

            # Add tutor as participant (user-based)
            cur.execute("""
                INSERT INTO conversation_participants (
                    conversation_id, user_id, role, is_active, joined_at, created_at, updated_at
                ) VALUES (%s, %s, 'member', true, NOW(), NOW(), NOW())
            """, (conversation_id, tutor_user_id))

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
            "end_time": package_end_time,
            "counter_offer_price": request.counter_offer_price
        }

        # The content will be the optional message from the user (or empty)
        message_content = request.message or ""

        # Insert session_request message (user-based)
        cur.execute("""
            INSERT INTO chat_messages (
                conversation_id, sender_user_id,
                message_type, content, media_metadata, created_at, updated_at
            ) VALUES (%s, %s, 'session_request', %s, %s, NOW(), NOW())
            RETURNING id
        """, (
            conversation_id, user_id,
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
    current_user: dict = Depends(get_current_user),
    verification_token: Optional[str] = Header(default=None, alias="X-2FA-Token")
):
    """
    Get session requests for the current tutor (2FA protected if enabled, filtered by status if provided)
    """

    # Check 2FA protection
    if HAS_2FA_PROTECTION:
        require_2fa(current_user['id'], verification_token)

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
                 WHERE sp.id = sr.requested_to_id) as requested_to_name,
                -- Counter-offer price
                sr.counter_offer_price
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
                "requested_to_name": row[28],
                # Counter-offer price
                "counter_offer_price": float(row[29]) if row[29] else None
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

        # Read from enrolled_students table and join with student_profiles, users, tutor_packages
        # Also fetch course names from courses table using tutor_packages.course_ids array
        # es.tutor_id = tutor_profiles.id
        # es.student_id = student_profiles.id
        cur.execute("""
            SELECT
                es.id,
                sp.user_id as student_user_id,
                sp.id as student_profile_id,
                CONCAT(u.first_name, ' ', u.father_name, ' ', u.grandfather_name) as student_name,
                sp.grade_level as student_grade,
                u.profile_picture as profile_picture,  -- NOTE: profile_picture now read from users table
                tp.name as package_name,
                tp.course_ids,
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

        # Collect all course_ids to fetch course names in one query
        all_course_ids = set()
        for row in rows:
            course_ids = row[7] if row[7] else []
            all_course_ids.update(course_ids)

        # Fetch course names for all course_ids
        course_names_map = {}
        if all_course_ids:
            cur.execute("""
                SELECT id, course_name FROM courses WHERE id = ANY(%s)
            """, (list(all_course_ids),))
            for course_row in cur.fetchall():
                course_names_map[course_row[0]] = course_row[1]

        students = []
        for row in rows:
            course_ids = row[7] if row[7] else []
            course_names = [course_names_map.get(cid, "") for cid in course_ids if cid in course_names_map]

            students.append({
                "id": row[0],
                "student_id": row[2],  # student_profiles.id for frontend routing
                "student_user_id": row[1],  # users.id for chat/messaging
                "student_name": row[3] if row[3] else "Unknown Student",
                "student_grade": row[4] if row[4] else "N/A",
                "profile_picture": row[5] if row[5] else "/uploads/system_images/system_profile_pictures/boy-user-image.jpg",
                "package_name": row[6] if row[6] else "N/A",
                "course_names": course_names,
                "contact_phone": row[8],
                "contact_email": row[9],
                "accepted_at": row[10].isoformat() if row[10] else None,
                "requester_type": row[11] if row[11] else "student"
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
                (SELECT tp.hourly_rate FROM tutor_packages tp WHERE tp.id = sr.package_id) as package_price,
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
                 WHERE sp.id = sr.requested_to_id) as requested_to_name,
                -- Counter-offer price
                sr.counter_offer_price
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
            "package_price": float(row[8]) if row[8] else None,
            "status": row[9],
            "message": row[10],
            "student_name": row[11],
            "student_grade": row[12],
            "preferred_schedule": row[13],
            "contact_phone": row[14],
            "contact_email": row[15],
            "created_at": row[16].isoformat() if row[16] else None,
            "updated_at": row[17].isoformat() if row[17] else None,
            "responded_at": row[18].isoformat() if row[18] else None,
            "rejected_reason": row[19],
            "rejected_at": row[20].isoformat() if row[20] else None,
            # Schedule fields
            "schedule_type": row[21],
            "year_range": row[22],
            "months": row[23],
            "days": row[24],
            "specific_dates": row[25],
            "start_time": str(row[26]) if row[26] else None,
            "end_time": str(row[27]) if row[27] else None,
            # Requested to (student when parent requests for child)
            "requested_to_id": row[28],
            "requested_to_name": row[29],
            # Counter-offer price
            "counter_offer_price": float(row[30]) if row[30] else None
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
    current_user: dict = Depends(get_current_user),
    verification_token: Optional[str] = Header(default=None, alias="X-2FA-Token")
):
    """
    Accept or reject a session request (2FA protected if enabled)
    When status is 'accepted', automatically adds student to tutor_students table
    """

    # Check 2FA protection
    if HAS_2FA_PROTECTION:
        require_2fa(current_user['id'], verification_token)

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
            # Keep the request in the table with status='rejected' for the rejected tab
            cur.execute("""
                UPDATE requested_sessions
                SET status = %s, responded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
                    rejected_reason = %s, rejected_at = CURRENT_TIMESTAMP
                WHERE id = %s AND tutor_id = %s AND status = 'pending'
                RETURNING id, status, responded_at, requester_id, requester_type, package_id, requested_to_id
            """, (update.status, update.rejected_reason, request_id, tutor_id))
        else:
            # For acceptance, no rejection fields
            # Keep the request in the table with status='accepted' for history
            # Also return counter_offer_price to save as agreed_price
            cur.execute("""
                UPDATE requested_sessions
                SET status = %s, responded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND tutor_id = %s AND status = 'pending'
                RETURNING id, status, responded_at, requester_id, requester_type, package_id, requested_to_id, counter_offer_price
            """, (update.status, request_id, tutor_id))

        result = cur.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Session request not found or already responded to")

        # If status is accepted, add student to enrolled_students table
        # NOTE: We keep the request in requested_sessions with status='accepted' for history
        if update.status == 'accepted':
            request_data = {
                'id': result[0],
                'status': result[1],
                'responded_at': result[2],
                'requester_id': result[3],
                'requester_type': result[4],
                'package_id': result[5],
                'requested_to_id': result[6],  # This is the student profile ID
                'counter_offer_price': result[7]  # Counter-offer price if any
            }

            # Use requested_to_id as the student to enroll
            # - For student requests: requested_to_id = their own student_profile.id
            # - For parent requests: requested_to_id = the child's student_profile.id
            student_profile_id = request_data['requested_to_id']

            if not student_profile_id:
                # Fallback: if requested_to_id is not set and requester is a student, use requester_id
                if request_data['requester_type'] == 'student':
                    student_profile_id = request_data['requester_id']
                else:
                    # Parent request without requested_to_id - cannot determine which child
                    raise HTTPException(
                        status_code=400,
                        detail="Cannot accept parent request: No student specified. The parent must specify which child the session is for."
                    )

            # Use package_id directly from the request
            package_id = request_data['package_id']
            counter_offer_price = request_data['counter_offer_price']

            # Get the package price to use as agreed_price if no counter-offer
            cur.execute("""
                SELECT hourly_rate FROM tutor_packages WHERE id = %s
            """, (package_id,))
            package_row = cur.fetchone()
            package_price = package_row[0] if package_row else None

            # Determine agreed_price: use counter-offer if provided, otherwise package price
            agreed_price = counter_offer_price if counter_offer_price else package_price

            # Check if student is already enrolled with this tutor
            cur.execute("""
                SELECT id FROM enrolled_students
                WHERE tutor_id = %s AND student_id = %s
            """, (tutor_id, student_profile_id))

            existing = cur.fetchone()
            if not existing:
                # Create new enrollment with payment tracking
                cur.execute("""
                    INSERT INTO enrolled_students (
                        tutor_id, student_id, package_id, enrolled_at, agreed_price,
                        payment_status, payment_due_date, total_sessions
                    ) VALUES (
                        %s, %s, %s, CURRENT_TIMESTAMP, %s,
                        'pending', CURRENT_DATE + INTERVAL '7 days', %s
                    )
                    RETURNING id
                """, (
                    tutor_id,
                    student_profile_id,
                    package_id,
                    agreed_price,
                    1  # Default to 1 session (can be updated later)
                ))
                enrollment_id = cur.fetchone()[0]

                # Create corresponding user_investment record for unified payment tracking
                # Get student's user_id
                cur.execute("SELECT user_id FROM student_profiles WHERE id = %s", (student_profile_id,))
                student_user_id = cur.fetchone()[0]

                cur.execute("""
                    INSERT INTO user_investments (
                        user_id, investment_type, investment_name, student_payment_id,
                        investment_date, due_date, payment_status, created_at
                    ) VALUES (
                        %s, 'booking', %s, %s,
                        CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'pending', CURRENT_TIMESTAMP
                    )
                """, (
                    student_user_id,
                    f'Booking with tutor (Package ID: {package_id})',
                    enrollment_id
                ))
            else:
                # Update existing enrollment with new agreed_price if different package/price
                cur.execute("""
                    UPDATE enrolled_students
                    SET package_id = %s, agreed_price = %s,
                        payment_status = 'pending',
                        payment_due_date = CURRENT_DATE + INTERVAL '7 days',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE tutor_id = %s AND student_id = %s
                """, (package_id, agreed_price, tutor_id, student_profile_id))

            # Also add student to enrolled_courses (for sessions to work)
            # Check if an enrolled_courses entry exists for this tutor + package
            cur.execute("""
                SELECT id, students_id FROM enrolled_courses
                WHERE tutor_id = %s AND package_id = %s
            """, (tutor_id, package_id))

            enrolled_course = cur.fetchone()
            if enrolled_course:
                # Add student to existing enrolled_courses if not already in the array
                enrolled_course_id = enrolled_course[0]
                current_students = enrolled_course[1] or []
                if student_profile_id not in current_students:
                    cur.execute("""
                        UPDATE enrolled_courses
                        SET students_id = array_append(students_id, %s),
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (student_profile_id, enrolled_course_id))
            else:
                # Create new enrolled_courses entry for this tutor + package
                # Get course_ids from the package if available (tutor_packages uses course_ids)
                cur.execute("""
                    SELECT course_ids FROM tutor_packages WHERE id = %s
                """, (package_id,))
                package_course = cur.fetchone()
                course_ids = package_course[0] if package_course and package_course[0] else []

                # Insert into enrolled_courses (uses course_id column name)
                cur.execute("""
                    INSERT INTO enrolled_courses (
                        tutor_id, package_id, students_id, course_id, status
                    ) VALUES (
                        %s, %s, %s, %s, 'active'
                    ) RETURNING id
                """, (
                    tutor_id,
                    package_id,
                    [student_profile_id],
                    course_ids
                ))
                enrolled_course_id = cur.fetchone()[0]

            # AUTO-CREATE SESSIONS based on the request's schedule preferences
            # Fetch schedule data from the original request
            cur.execute("""
                SELECT schedule_type, year_range, months, days, specific_dates,
                       start_time, end_time, message
                FROM requested_sessions
                WHERE id = %s
            """, (request_id,))

            schedule_data = cur.fetchone()
            sessions_created = 0

            if schedule_data:
                schedule_type = schedule_data[0]
                year_range = schedule_data[1]
                months = schedule_data[2]
                days = schedule_data[3]
                specific_dates = schedule_data[4]
                start_time = schedule_data[5]
                end_time = schedule_data[6]
                message = schedule_data[7]

                # Extract topics from message or use default
                topics = [message] if message else []

                # Calculate duration if times are provided
                duration = None
                if start_time and end_time:
                    from datetime import datetime, timedelta
                    start_dt = datetime.combine(datetime.today(), start_time)
                    end_dt = datetime.combine(datetime.today(), end_time)
                    duration = int((end_dt - start_dt).total_seconds() / 60)

                # Create sessions based on schedule type
                if schedule_type == 'specific_dates' and specific_dates:
                    # Create sessions for specific dates
                    for date_str in specific_dates:
                        try:
                            from datetime import datetime
                            session_date = datetime.strptime(date_str, '%Y-%m-%d').date()

                            cur.execute("""
                                INSERT INTO sessions (
                                    enrolled_courses_id, session_date, start_time, end_time,
                                    duration, topics, session_mode, status, priority_level,
                                    created_at, updated_at
                                ) VALUES (
                                    %s, %s, %s, %s, %s, %s, 'online', 'scheduled', 'medium',
                                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                                )
                            """, (
                                enrolled_course_id, session_date, start_time, end_time,
                                duration, json.dumps(topics)
                            ))
                            sessions_created += 1
                        except Exception as e:
                            print(f"Warning: Could not create session for date {date_str}: {e}")
                            continue

                elif schedule_type == 'recurring' and days and start_time and end_time:
                    # For recurring sessions, create sessions for the next 8 weeks
                    from datetime import datetime, timedelta

                    # Get day names mapping
                    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                    selected_day_indices = []

                    for day in days:
                        if day in day_names:
                            selected_day_indices.append(day_names.index(day))

                    if selected_day_indices:
                        # Start from today
                        current_date = datetime.today().date()
                        end_date = current_date + timedelta(weeks=8)  # Create for next 8 weeks

                        while current_date <= end_date:
                            # Check if this day is in the selected days
                            if current_date.weekday() in selected_day_indices:
                                try:
                                    cur.execute("""
                                        INSERT INTO sessions (
                                            enrolled_courses_id, session_date, start_time, end_time,
                                            duration, topics, session_mode, status, priority_level,
                                            created_at, updated_at
                                        ) VALUES (
                                            %s, %s, %s, %s, %s, %s, 'online', 'scheduled', 'medium',
                                            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                                        )
                                    """, (
                                        enrolled_course_id, current_date, start_time, end_time,
                                        duration, json.dumps(topics)
                                    ))
                                    sessions_created += 1
                                except Exception as e:
                                    print(f"Warning: Could not create recurring session for {current_date}: {e}")

                            current_date += timedelta(days=1)

                print(f"Auto-created {sessions_created} sessions for enrolled_course_id {enrolled_course_id}")

            # NOTE: Request is kept in requested_sessions with status='accepted'
            # This allows tutors to see history of accepted requests

        conn.commit()

        response = {
            "success": True,
            "message": f"Session request {update.status}" + (" and student added to your students list" if update.status == 'accepted' else ""),
            "request_id": result[0],
            "status": result[1],
            "responded_at": result[2].isoformat() if result[2] else None
        }

        # Include agreed_price and sessions_created in response for accepted requests
        if update.status == 'accepted':
            response["agreed_price"] = float(agreed_price) if agreed_price else None
            response["sessions_created"] = sessions_created
            response["enrolled_course_id"] = enrolled_course_id

        return response

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
    Get session requests for the current user:
    - SENT: Requests the user sent as student/parent to tutors
    - RECEIVED: Requests the user received as a tutor (if they have tutor role)
    Each request includes a 'direction' field to indicate sent/received
    """
    # Get user ID and role info
    user_id = current_user.get('id')  # This is users.id
    active_role = current_user.get('active_role')
    role_ids = current_user.get('role_ids', {})

    # Verify user has student or parent role
    if active_role not in ['student', 'parent']:
        raise HTTPException(status_code=403, detail="Only students and parents can view session requests")

    # Check if user also has tutor role for RECEIVED requests
    tutor_id = role_ids.get('tutor')
    if tutor_id:
        tutor_id = int(tutor_id) if isinstance(tutor_id, str) else tutor_id

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Query for SENT requests (where user is the requester)
        sent_query = """
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
                 WHERE sp3.id = sr.requested_to_id) as requested_to_name,
                -- Counter-offer price
                sr.counter_offer_price,
                'sent' as direction
            FROM requested_sessions sr
            LEFT JOIN tutor_profiles tp ON sr.tutor_id = tp.id
            LEFT JOIN users u ON tp.user_id = u.id
            WHERE sr.requester_id = %s
        """

        # Query for RECEIVED requests (where user is the tutor receiving the request)
        received_query = """
            SELECT
                sr.id, sr.tutor_id, sr.requester_id, sr.requester_type,
                -- Requester name (person who sent the request)
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
                        (SELECT u.profile_picture FROM student_profiles sp JOIN users u ON sp.user_id = u.id WHERE sp.id = sr.requester_id)
                    WHEN sr.requester_type = 'parent' THEN
                        (SELECT u.profile_picture FROM parent_profiles pp JOIN users u ON pp.user_id = u.id WHERE pp.id = sr.requester_id)
                END as requester_profile_picture,
                sr.package_id,
                (SELECT tp2.name FROM tutor_packages tp2 WHERE tp2.id = sr.package_id) as package_name,
                sr.status, sr.message,
                -- Student name
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT CONCAT(u2.first_name, ' ', u2.father_name)
                         FROM student_profiles sp2
                         JOIN users u2 ON sp2.user_id = u2.id
                         WHERE sp2.id = sr.requester_id)
                    WHEN sr.requested_to_id IS NOT NULL THEN
                        (SELECT CONCAT(u3.first_name, ' ', u3.father_name)
                         FROM student_profiles sp3
                         JOIN users u3 ON sp3.user_id = u3.id
                         WHERE sp3.id = sr.requested_to_id)
                    ELSE NULL
                END as student_name,
                -- Student grade
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT sp2.grade_level FROM student_profiles sp2 WHERE sp2.id = sr.requester_id)
                    WHEN sr.requested_to_id IS NOT NULL THEN
                        (SELECT sp3.grade_level FROM student_profiles sp3 WHERE sp3.id = sr.requested_to_id)
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
                 WHERE sp3.id = sr.requested_to_id) as requested_to_name,
                -- Counter-offer price
                sr.counter_offer_price,
                'received' as direction
            FROM requested_sessions sr
            WHERE sr.tutor_id = %s
        """

        # Execute SENT requests query (now using user_id instead of profile_id)
        cur.execute(sent_query, (user_id,))
        sent_rows = cur.fetchall()

        requests = []

        # Process SENT requests
        for row in sent_rows:
            requests.append({
                "id": row[0],
                "tutor_id": row[1],
                "requester_id": row[2],
                "requester_type": row[3],
                "requester_name": row[4],  # Tutor name for sent requests
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
                "requested_to_name": row[28],
                # Counter-offer price
                "counter_offer_price": float(row[29]) if row[29] else None,
                # Direction
                "direction": row[30]  # 'sent'
            })

        # If user also has tutor role, fetch RECEIVED requests
        if tutor_id:
            cur.execute(received_query, (tutor_id,))
            received_rows = cur.fetchall()

            # Process RECEIVED requests
            for row in received_rows:
                requests.append({
                    "id": row[0],
                    "tutor_id": row[1],
                    "requester_id": row[2],
                    "requester_type": row[3],
                    "requester_name": row[4],  # Actual requester name for received requests
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
                    "requested_to_name": row[28],
                    # Counter-offer price
                    "counter_offer_price": float(row[29]) if row[29] else None,
                    # Direction
                    "direction": row[30]  # 'received'
                })

        # Sort by created_at descending (most recent first)
        requests.sort(key=lambda x: x['created_at'] if x['created_at'] else '', reverse=True)

        return requests

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch session requests: {str(e)}")
    finally:
        cur.close()
        conn.close()


# Helper function to convert percentage to letter grade
def get_grade_letter(percentage):
    """Convert percentage to letter grade"""
    if percentage is None:
        return 'N/A'
    if percentage >= 90:
        return 'A+'
    elif percentage >= 85:
        return 'A'
    elif percentage >= 80:
        return 'A-'
    elif percentage >= 75:
        return 'B+'
    elif percentage >= 70:
        return 'B'
    elif percentage >= 65:
        return 'B-'
    elif percentage >= 60:
        return 'C+'
    elif percentage >= 55:
        return 'C'
    elif percentage >= 50:
        return 'C-'
    elif percentage >= 45:
        return 'D'
    else:
        return 'F'


@router.get("/api/tutor/student-details/{student_profile_id}")
async def get_student_details(
    student_profile_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Get comprehensive student details from users, student_profiles, and enrolled_students tables.

    Returns:
    - Student information (name, email, phone, profile picture)
    - Student profile data (grade level, bio, subjects, languages)
    - Enrollment information (package, courses, enrollment date)
    - Parent information (if linked)
    - Computed progress metrics
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get tutor's profile ID from JWT token
        role_ids = current_user.get('role_ids', {})
        tutor_profile_id = role_ids.get('tutor')

        if not tutor_profile_id:
            raise HTTPException(status_code=400, detail="Tutor profile not found")

        # Convert to integer if needed (JWT stores as string)
        tutor_profile_id = int(tutor_profile_id) if isinstance(tutor_profile_id, str) else tutor_profile_id

        # Fetch student details from users, student_profiles, and enrolled_students
        cur.execute("""
            SELECT
                -- Enrollment info (indices 0-5)
                es.id as enrollment_id,
                es.tutor_id,
                es.student_id as student_profile_id,
                es.package_id,
                es.enrolled_at,
                es.status as enrollment_status,

                -- User info (indices 6-13)
                u.id as user_id,
                u.first_name,
                u.father_name,
                u.grandfather_name,
                u.email,
                u.phone,
                u.profile_picture as user_profile_picture,
                u.gender,
                u.date_of_birth,

                -- Student profile info (indices 15-27)
                sp.id as sp_id,
                sp.username as display_name,
                sp.grade_level,
                sp.career_aspirations,
                u.profile_picture as sp_profile_picture,  -- NOTE: profile_picture now read from users table
                sp.cover_image as sp_cover_image,
                u.location,  -- NOTE: location now read from users table
                sp.hero_title,
                sp.hero_subtitle,
                sp.interested_in,
                u.hobbies,  -- NOTE: hobbies now read from users table
                u.languages,  -- NOTE: languages now read from users table
                sp.learning_method,
                sp.studying_at,
                sp.about,
                sp.quote,
                sp.parent_id,

                -- Package info (indices 32-43)
                tp.name as package_name,
                tp.description as package_description,
                tp.grade_level as package_grade_level,
                tp.hourly_rate,
                tp.days_per_week,
                tp.hours_per_day,
                tp.payment_frequency,
                tp.session_format,
                tp.schedule_type,
                tp.schedule_days,
                tp.start_time,
                tp.end_time,
                tp.session_duration,
                tp.course_ids

            FROM enrolled_students es
            INNER JOIN student_profiles sp ON es.student_id = sp.id
            INNER JOIN users u ON sp.user_id = u.id
            LEFT JOIN tutor_packages tp ON es.package_id = tp.id
            WHERE es.tutor_id = %s AND es.student_id = %s
        """, (tutor_profile_id, student_profile_id))

        row = cur.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail=f"Student not found in your enrolled students (student_id: {student_profile_id})"
            )

        # Build full name (indices 7, 8, 9 for first_name, father_name, grandfather_name)
        first_name = row[7] or ''
        father_name = row[8] or ''
        grandfather_name = row[9] or ''
        full_name = ' '.join(filter(None, [first_name, father_name, grandfather_name])) or 'Unknown Student'

        # Use display name from student_profiles if available (index 16), else full name from users
        display_name = row[16] if row[16] else full_name

        # Use student profile picture (index 19), fall back to user profile picture (index 12)
        profile_picture = row[19] or row[12] or '/uploads/system_images/system_profile_pictures/boy-user-image.jpg'

        # Get course names from course_ids (index 45)
        course_ids = row[45] if row[45] else []
        course_names = []
        if course_ids:
            cur.execute("""
                SELECT id, course_name FROM courses WHERE id = ANY(%s)
            """, (list(course_ids),))
            course_names = [r[1] for r in cur.fetchall()]

        # Get parent information if parent_id is set (index 31)
        parent_ids = row[31] if row[31] else []
        parent_info = None
        if parent_ids and len(parent_ids) > 0:
            # Get first parent's info
            cur.execute("""
                SELECT
                    pp.id,
                    CONCAT(pu.first_name, ' ', pu.father_name) as parent_name,
                    pu.phone as parent_phone,
                    pu.email as parent_email,
                    pp.relationship_type
                FROM parent_profiles pp
                JOIN users pu ON pp.user_id = pu.id
                WHERE pp.id = %s
            """, (parent_ids[0],))
            parent_row = cur.fetchone()
            if parent_row:
                parent_info = {
                    "id": parent_row[0],
                    "name": parent_row[1],
                    "phone": parent_row[2],
                    "email": parent_row[3],
                    "relationship": parent_row[4] or 'Parent'
                }

        # Get tutor's user_id from current_user (needed for courseworks query)
        tutor_user_id = current_user.get('id')

        # Compute session statistics from whiteboard_sessions
        # Note: whiteboard_sessions now uses tutor_profile_id and student_profile_ids (profile-based)
        cur.execute("""
            SELECT
                COUNT(*) as total_sessions,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
                COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_sessions,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_sessions,
                SUM(CASE WHEN status = 'completed' AND actual_start IS NOT NULL AND actual_end IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (actual_end - actual_start)) / 60 ELSE 0 END) as total_minutes
            FROM whiteboard_sessions
            WHERE tutor_profile_id = %s AND %s = ANY(student_profile_ids)
        """, (tutor_profile_id, student_profile_id))
        session_stats = cur.fetchone()

        total_sessions = session_stats[0] if session_stats else 0
        completed_sessions = session_stats[1] if session_stats else 0
        scheduled_sessions = session_stats[2] if session_stats else 0
        cancelled_sessions = session_stats[3] if session_stats else 0
        total_minutes = session_stats[4] if session_stats and session_stats[4] else 0

        # Compute coursework statistics
        # Note: courseworks.student_id and coursework_submissions.student_id reference users.id (not student_profiles.id)
        # We need to get the user_id for the student from student_profiles
        student_user_id = row[6]  # user_id from the main query
        cur.execute("""
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN cs.status = 'submitted' OR cs.status = 'graded' THEN 1 END) as completed,
                COUNT(CASE WHEN cs.status = 'pending' OR cs.status = 'not_started' OR cs.status IS NULL THEN 1 END) as pending,
                AVG(CASE WHEN cs.grade_percentage IS NOT NULL THEN cs.grade_percentage END) as avg_grade
            FROM courseworks c
            LEFT JOIN coursework_submissions cs ON c.id = cs.coursework_id AND cs.student_id = %s
            WHERE c.tutor_id = %s AND c.student_id = %s
        """, (student_user_id, tutor_user_id, student_user_id))
        coursework_stats = cur.fetchone()

        total_coursework = coursework_stats[0] if coursework_stats else 0
        completed_coursework = coursework_stats[1] if coursework_stats else 0
        pending_coursework = coursework_stats[2] if coursework_stats else 0
        avg_grade = float(coursework_stats[3]) if coursework_stats and coursework_stats[3] else None

        # Calculate attendance rate
        attendance_rate = round((completed_sessions / total_sessions * 100), 1) if total_sessions > 0 else 0

        # Calculate overall progress (based on completed sessions and coursework)
        overall_progress = 0
        if total_sessions > 0 or total_coursework > 0:
            session_progress = (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0
            coursework_progress = (completed_coursework / total_coursework * 100) if total_coursework > 0 else 0
            overall_progress = round((session_progress + coursework_progress) / 2, 1)

        # Build response with correct indices based on the query:
        # Enrollment: 0=enrollment_id, 1=tutor_id, 2=student_profile_id, 3=package_id, 4=enrolled_at, 5=enrollment_status
        # User: 6=user_id, 7=first_name, 8=father_name, 9=grandfather_name, 10=email, 11=phone, 12=user_profile_picture, 13=gender, 14=date_of_birth
        # Student Profile: 15=sp_id, 16=username/display_name, 17=grade_level, 18=career_aspirations, 19=sp_profile_picture, 20=sp_cover_image,
        #                  21=location, 22=hero_title, 23=hero_subtitle, 24=interested_in, 25=hobbies, 26=languages, 27=learning_method,
        #                  28=studying_at, 29=about, 30=quote, 31=parent_id
        # Package: 32=package_name, 33=package_description, 34=package_grade_level, 35=hourly_rate, 36=days_per_week, 37=hours_per_day,
        #          38=payment_frequency, 39=session_format, 40=schedule_type, 41=schedule_days, 42=start_time, 43=end_time, 44=session_duration, 45=course_ids
        student_details = {
            "id": row[0],  # enrollment_id
            "tutor_id": row[1],
            "student_profile_id": row[2],
            "user_id": row[6],
            "enrollment_status": row[5] or 'active',

            # Names
            "student_name": display_name,
            "full_name": full_name,
            "first_name": first_name,
            "father_name": father_name,
            "grandfather_name": grandfather_name,

            # Contact info
            "email": row[10],
            "phone": row[11],
            "profile_picture": profile_picture,
            "cover_image": row[20],

            # Student profile
            "student_grade": row[17] or 'N/A',
            "grade_level": row[17],
            "career_aspirations": row[18],
            "location": row[21],
            "hero_title": row[22] if row[22] else [],
            "hero_subtitle": row[23] if row[23] else [],
            "interested_in": row[24] if row[24] else [],
            "hobbies": row[25] if row[25] else [],
            "languages": row[26] if row[26] else [],
            "learning_method": row[27] if row[27] else [],
            "studying_at": row[28],
            "about": row[29],
            "quote": row[30] if row[30] else [],
            "gender": row[13],
            "date_of_birth": row[14].isoformat() if row[14] else None,

            # Package info
            "package_id": row[3],
            "package_name": row[32] or 'No Package',
            "package_description": row[33],
            "package_grade_level": row[34],
            "hourly_rate": float(row[35]) if row[35] else None,
            "days_per_week": row[36],
            "hours_per_day": float(row[37]) if row[37] else None,
            "payment_frequency": row[38] or 'monthly',
            "session_format": row[39],
            "schedule_type": row[40] or 'recurring',
            "schedule_days": row[41],
            "start_time": str(row[42]) if row[42] else None,
            "end_time": str(row[43]) if row[43] else None,
            "session_duration": float(row[44]) if row[44] else None,
            "course_names": course_names,
            "enrolled_at": row[4].isoformat() if row[4] else None,

            # Session stats
            "total_sessions": total_sessions,
            "completed_sessions": completed_sessions,
            "attended_sessions": completed_sessions,  # alias for UI
            "scheduled_sessions": scheduled_sessions,
            "cancelled_sessions": cancelled_sessions,
            "total_session_minutes": total_minutes,
            "total_session_hours": round(total_minutes / 60, 1) if total_minutes else 0,

            # Coursework stats
            "total_assignments": total_coursework,
            "completed_assignments": completed_coursework,
            "pending_assignments": pending_coursework,
            "average_grade": avg_grade,
            "grade_letter": get_grade_letter(avg_grade) if avg_grade else 'N/A',

            # Progress metrics
            "overall_progress": overall_progress,
            "attendance_rate": attendance_rate,
            "improvement_rate": 0,  # Would need historical data to compute

            # Parent info
            "parent_name": parent_info['name'] if parent_info else None,
            "parent_phone": parent_info['phone'] if parent_info else None,
            "parent_email": parent_info['email'] if parent_info else None,
            "parent_relationship": parent_info['relationship'] if parent_info else None,
            "parent_id": parent_ids[0] if parent_ids else None,

            # Financial (placeholder - would need tuition_payments table)
            "monthly_tuition": float(row[35]) if row[35] else None,  # hourly_rate as placeholder
            "outstanding_balance": 0.0,
            "next_payment_due": None,

            # Timestamps
            "last_session_at": None,  # Would need to query last completed session
            "last_updated": None
        }

        return student_details

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch student details: {str(e)}"
        )
    finally:
        cur.close()
        conn.close()


@router.get("/api/tutor/student-sessions/{student_profile_id}")
async def get_student_sessions(
    student_profile_id: int,
    status: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all sessions for a specific student from the sessions table.

    Sessions are linked through: sessions -> enrolled_courses -> students_id array

    Query params:
    - status: Filter by session status (scheduled, in-progress, completed, cancelled)

    Returns:
    - List of sessions with date, time, duration, status, topics, attendance, etc.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get tutor's profile ID from JWT token
        role_ids = current_user.get('role_ids', {})
        tutor_profile_id = role_ids.get('tutor')

        if not tutor_profile_id:
            raise HTTPException(status_code=400, detail="Tutor profile not found")

        tutor_profile_id = int(tutor_profile_id) if isinstance(tutor_profile_id, str) else tutor_profile_id

        # Build the query - sessions linked via enrolled_courses
        # enrolled_courses.students_id is an integer array containing student_profile_ids
        query = """
            SELECT
                s.id,
                s.session_date,
                s.start_time,
                s.end_time,
                s.duration,
                s.session_mode,
                s.location,
                s.status,
                s.topics,
                s.topics_covered,
                s.tutor_attendance_status,
                s.student_attendance_status,
                s.priority_level,
                s.notification_enabled,
                s.alarm_enabled,
                s.is_featured,
                s.whiteboard_id,
                s.created_at,
                ec.id as enrolled_course_id,
                ec.course_id,
                ec.package_id,
                tp.name as package_name
            FROM sessions s
            INNER JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
            LEFT JOIN tutor_packages tp ON ec.package_id = tp.id
            WHERE ec.tutor_id = %s AND %s = ANY(ec.students_id)
        """

        params = [tutor_profile_id, student_profile_id]

        # Add status filter if provided
        if status and status != 'all':
            query += " AND s.status = %s"
            params.append(status)

        query += " ORDER BY s.session_date DESC, s.start_time DESC"

        cur.execute(query, tuple(params))
        rows = cur.fetchall()

        # Get course names for all unique course_ids
        all_course_ids = set()
        for row in rows:
            if row[19]:  # course_id array
                all_course_ids.update(row[19])

        course_names = {}
        if all_course_ids:
            cur.execute("""
                SELECT id, course_name FROM courses WHERE id = ANY(%s)
            """, (list(all_course_ids),))
            course_names = {r[0]: r[1] for r in cur.fetchall()}

        # Build response
        sessions = []
        for row in rows:
            course_ids = row[19] if row[19] else []
            session_course_names = [course_names.get(cid, f'Course {cid}') for cid in course_ids]

            sessions.append({
                "id": row[0],
                "session_date": row[1].isoformat() if row[1] else None,
                "start_time": str(row[2]) if row[2] else None,
                "end_time": str(row[3]) if row[3] else None,
                "duration": row[4],
                "session_mode": row[5] or 'online',
                "location": row[6],
                "status": row[7] or 'scheduled',
                "topics": row[8] if row[8] else [],
                "topics_covered": row[9] if row[9] else [],
                "tutor_attendance": row[10] or 'present',
                "student_attendance": row[11] or 'present',
                "priority_level": row[12] or 'medium',
                "notification_enabled": row[13] or False,
                "alarm_enabled": row[14] or False,
                "is_featured": row[15] or False,
                "whiteboard_id": row[16],
                "created_at": row[17].isoformat() if row[17] else None,
                "enrolled_course_id": row[18],
                "course_names": session_course_names,
                "package_id": row[20],
                "package_name": row[21] or 'No Package'
            })

        # Calculate stats
        total = len(sessions)
        completed = sum(1 for s in sessions if s['status'] == 'completed')
        scheduled = sum(1 for s in sessions if s['status'] == 'scheduled')
        in_progress = sum(1 for s in sessions if s['status'] == 'in-progress')
        cancelled = sum(1 for s in sessions if s['status'] == 'cancelled')
        total_hours = sum((s['duration'] or 0) for s in sessions if s['status'] == 'completed') / 60

        return {
            "sessions": sessions,
            "stats": {
                "total": total,
                "completed": completed,
                "scheduled": scheduled,
                "in_progress": in_progress,
                "cancelled": cancelled,
                "total_hours": round(total_hours, 1)
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch student sessions: {str(e)}"
        )
    finally:
        cur.close()
        conn.close()
