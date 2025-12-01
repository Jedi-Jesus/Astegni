"""
Tutor Packages API Endpoints
Manages tutor packages with pricing calculator integration
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
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
    print(f"🔐 get_current_user called! Token: {token[:20]}..." if token else "🔐 get_current_user called! Token: None")
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
                SELECT id, email, phone, roles, active_role,
                       first_name, father_name, grandfather_name, profile_picture
                FROM users WHERE id = %s
            """, (user_id,))
            row = cur.fetchone()

            if not row:
                raise credentials_exception

            return {
                'id': row[0],
                'email': row[1],
                'phone': row[2],
                'roles': row[3] or [],
                'active_role': row[4],
                'first_name': row[5],
                'father_name': row[6],
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

router = APIRouter(prefix="/api/tutor", tags=["tutor-packages"])

# Pydantic Models
class PackageCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    grade_level: Optional[str] = None
    course_ids: Optional[List[int]] = []  # Array of approved course IDs from courses table
    pending_course_ids: Optional[List[int]] = []  # Array of pending course IDs from requested_courses table
    description: Optional[str] = None
    session_format: Optional[str] = None
    schedule_type: str = Field(default="recurring")
    schedule_days: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    session_time: Optional[str] = None
    session_duration: Optional[float] = None
    hourly_rate: float = Field(..., ge=0)
    days_per_week: Optional[int] = Field(None, ge=0, le=7)
    hours_per_day: Optional[float] = Field(None, ge=0, le=24)
    payment_frequency: str = Field(default="monthly")
    discount_1_month: float = Field(default=0, ge=0, le=100)
    discount_3_month: float = Field(default=0, ge=0, le=100)
    discount_6_month: float = Field(default=0, ge=0, le=100)

class PackageUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    grade_level: Optional[str] = None
    course_ids: Optional[List[int]] = None  # Array of approved course IDs
    pending_course_ids: Optional[List[int]] = None  # Array of pending course IDs
    description: Optional[str] = None
    session_format: Optional[str] = None
    schedule_type: Optional[str] = None
    schedule_days: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    session_time: Optional[str] = None
    session_duration: Optional[float] = None
    hourly_rate: Optional[float] = Field(None, ge=0)
    days_per_week: Optional[int] = Field(None, ge=0, le=7)
    hours_per_day: Optional[float] = Field(None, ge=0, le=24)
    payment_frequency: Optional[str] = None
    discount_1_month: Optional[float] = Field(None, ge=0, le=100)
    discount_3_month: Optional[float] = Field(None, ge=0, le=100)
    discount_6_month: Optional[float] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None

class CourseInfo(BaseModel):
    """Course information from courses table"""
    id: int
    course_name: str
    course_category: str
    course_level: Optional[str] = None
    course_description: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: int = 0
    lessons: int = 0
    lesson_title: List[str] = []
    language: List[str] = ["English"]

class PendingCourseInfo(BaseModel):
    """Pending course information from requested_courses table"""
    id: int
    course_name: str
    course_category: str
    course_level: Optional[str] = None
    course_description: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: int = 0
    lessons: int = 0
    lesson_title: List[str] = []
    language: List[str] = ["English"]
    status: str = "pending"

class PackageResponse(BaseModel):
    id: int
    tutor_id: int
    name: str
    grade_level: Optional[str]
    course_ids: List[int] = []  # Array of approved course IDs
    pending_course_ids: List[int] = []  # Array of pending course IDs
    courses: Optional[List[CourseInfo]] = []  # Full course details (populated on read)
    pending_courses: Optional[List[PendingCourseInfo]] = []  # Full pending course details
    description: Optional[str]
    session_format: Optional[str]
    schedule_type: Optional[str]
    schedule_days: Optional[str]
    start_time: Optional[str]
    end_time: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]
    session_time: Optional[str]
    session_duration: Optional[float]
    hourly_rate: float
    days_per_week: Optional[int]
    hours_per_day: Optional[float]
    payment_frequency: str
    discount_1_month: float
    discount_3_month: float
    discount_6_month: float
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Helper function to fetch course details
def fetch_course_details(cur, course_ids):
    """Fetch full course details for a list of course IDs"""
    if not course_ids:
        return []

    cur.execute("""
        SELECT id, course_name, course_category, course_level, course_description,
               thumbnail, duration, lessons, lesson_title, language
        FROM courses
        WHERE id = ANY(%s)
    """, (course_ids,))

    courses = []
    for row in cur.fetchall():
        courses.append({
            'id': row[0],
            'course_name': row[1],
            'course_category': row[2],
            'course_level': row[3],
            'course_description': row[4],
            'thumbnail': row[5],
            'duration': row[6] or 0,
            'lessons': row[7] or 0,
            'lesson_title': row[8] if row[8] else [],
            'language': row[9] if row[9] else ["English"]
        })
    return courses

def fetch_pending_course_details(cur, pending_course_ids):
    """Fetch pending course details for a list of requested_courses IDs"""
    if not pending_course_ids:
        return []

    cur.execute("""
        SELECT id, course_name, course_category, course_level, course_description,
               thumbnail, duration, lessons, lesson_title, language, status
        FROM requested_courses
        WHERE id = ANY(%s) AND status = 'pending'
    """, (pending_course_ids,))

    courses = []
    for row in cur.fetchall():
        courses.append({
            'id': row[0],
            'course_name': row[1],
            'course_category': row[2],
            'course_level': row[3],
            'course_description': row[4],
            'thumbnail': row[5],
            'duration': row[6] or 0,
            'lessons': row[7] or 0,
            'lesson_title': row[8] if row[8] else [],
            'language': row[9] if row[9] else ["English"],
            'status': row[10] or 'pending'
        })
    return courses


# GET - Get all packages for current tutor
@router.get("/packages", response_model=List[PackageResponse])
async def get_tutor_packages(current_user = Depends(get_current_user)):
    """Get all packages for the authenticated tutor"""
    print(f"========================================")
    print(f"✅ GET /packages endpoint called!")
    print(f"Current user type: {type(current_user)}")
    print(f"Current user: {current_user}")
    print(f"========================================")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get tutor_profiles.id for this user
        cur.execute("""
            SELECT id FROM tutor_profiles WHERE user_id = %s
        """, (current_user['id'],))

        tutor_profile = cur.fetchone()
        if not tutor_profile:
            # Return empty list if no tutor profile exists
            print(f"⚠️ No tutor profile found for user {current_user['id']}")
            return []

        tutor_profile_id = tutor_profile[0]
        print(f"✅ Found tutor_profile.id = {tutor_profile_id} for user.id = {current_user['id']}")

        cur.execute("""
            SELECT id, tutor_id, name, grade_level, course_ids, pending_course_ids, description,
                   session_format, schedule_type, schedule_days,
                   start_time, end_time, start_date, end_date,
                   session_time, session_duration,
                   hourly_rate, days_per_week, hours_per_day, payment_frequency,
                   discount_1_month, discount_3_month, discount_6_month,
                   is_active, created_at, updated_at
            FROM tutor_packages
            WHERE tutor_id = %s
            ORDER BY created_at DESC
        """, (tutor_profile_id,))  # Use tutor_profiles.id

        packages = []
        for row in cur.fetchall():
            # Get course_ids and pending_course_ids arrays
            course_ids = row[4] if row[4] else []
            pending_course_ids = row[5] if row[5] else []

            # Fetch full course details
            courses = fetch_course_details(cur, course_ids)
            pending_courses = fetch_pending_course_details(cur, pending_course_ids)

            # Handle None values with proper defaults
            packages.append({
                'id': row[0],
                'tutor_id': row[1],
                'name': row[2] or '',
                'grade_level': row[3],
                'course_ids': course_ids,
                'pending_course_ids': pending_course_ids,
                'courses': courses,
                'pending_courses': pending_courses,
                'description': row[6],
                'session_format': row[7],
                'schedule_type': row[8],
                'schedule_days': row[9],
                'start_time': str(row[10]) if row[10] else None,
                'end_time': str(row[11]) if row[11] else None,
                'start_date': str(row[12]) if row[12] else None,
                'end_date': str(row[13]) if row[13] else None,
                'session_time': str(row[14]) if row[14] else None,
                'session_duration': float(row[15]) if row[15] is not None else None,
                'hourly_rate': float(row[16]) if row[16] is not None else 0.0,
                'days_per_week': row[17],
                'hours_per_day': float(row[18]) if row[18] is not None else 0.0,
                'payment_frequency': row[19] or 'monthly',
                'discount_1_month': float(row[20]) if row[20] is not None else 0.0,
                'discount_3_month': float(row[21]) if row[21] is not None else 0.0,
                'discount_6_month': float(row[22]) if row[22] is not None else 0.0,
                'is_active': row[23] if row[23] is not None else True,
                'created_at': row[24] or datetime.now(),
                'updated_at': row[25] or datetime.now()
            })

        return packages

    finally:
        cur.close()
        conn.close()


# POST - Create new package
@router.post("/packages", response_model=PackageResponse, status_code=status.HTTP_201_CREATED)
async def create_package(package: PackageCreate, current_user = Depends(get_current_user)):
    """Create a new tutoring package"""

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # First, get the tutor_profiles.id for this user
        cur.execute("""
            SELECT id FROM tutor_profiles WHERE user_id = %s
        """, (current_user['id'],))

        tutor_profile = cur.fetchone()
        if not tutor_profile:
            raise HTTPException(
                status_code=404,
                detail=f"Tutor profile not found for user {current_user['id']}. Please complete your tutor profile first."
            )

        tutor_profile_id = tutor_profile[0]
        print(f"✅ Found tutor_profile.id = {tutor_profile_id} for user.id = {current_user['id']}")

        # Handle course_ids arrays
        course_ids = package.course_ids if package.course_ids else []
        pending_course_ids = package.pending_course_ids if package.pending_course_ids else []

        cur.execute("""
            INSERT INTO tutor_packages (
                tutor_id, name, grade_level, course_ids, pending_course_ids, description,
                session_format, schedule_type, schedule_days,
                start_time, end_time, start_date, end_date,
                session_time, session_duration,
                hourly_rate, days_per_week, hours_per_day, payment_frequency,
                discount_1_month, discount_3_month, discount_6_month,
                is_active, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id, tutor_id, name, grade_level, course_ids, pending_course_ids, description,
                      session_format, schedule_type, schedule_days,
                      start_time, end_time, start_date, end_date,
                      session_time, session_duration,
                      hourly_rate, days_per_week, hours_per_day, payment_frequency,
                      discount_1_month, discount_3_month, discount_6_month,
                      is_active, created_at, updated_at
        """, (
            tutor_profile_id,  # Use tutor_profiles.id, not users.id
            package.name,
            package.grade_level,
            course_ids,
            pending_course_ids,
            package.description,
            package.session_format,
            package.schedule_type,
            package.schedule_days,
            package.start_time,
            package.end_time,
            package.start_date,
            package.end_date,
            package.session_time,
            package.session_duration,
            package.hourly_rate,
            package.days_per_week,
            package.hours_per_day,
            package.payment_frequency,
            package.discount_1_month,
            package.discount_3_month,
            package.discount_6_month,
            True  # is_active = True by default
        ))

        row = cur.fetchone()
        conn.commit()

        # Get course_ids and pending_course_ids arrays from returned row
        returned_course_ids = row[4] if row[4] else []
        returned_pending_course_ids = row[5] if row[5] else []

        # Fetch full course details
        courses = fetch_course_details(cur, returned_course_ids)
        pending_courses = fetch_pending_course_details(cur, returned_pending_course_ids)

        return {
            'id': row[0],
            'tutor_id': row[1],
            'name': row[2] or '',
            'grade_level': row[3],
            'course_ids': returned_course_ids,
            'pending_course_ids': returned_pending_course_ids,
            'courses': courses,
            'pending_courses': pending_courses,
            'description': row[6],
            'session_format': row[7],
            'schedule_type': row[8],
            'schedule_days': row[9],
            'start_time': str(row[10]) if row[10] else None,
            'end_time': str(row[11]) if row[11] else None,
            'start_date': str(row[12]) if row[12] else None,
            'end_date': str(row[13]) if row[13] else None,
            'session_time': str(row[14]) if row[14] else None,
            'session_duration': float(row[15]) if row[15] is not None else None,
            'hourly_rate': float(row[16]) if row[16] is not None else 0.0,
            'days_per_week': row[17],
            'hours_per_day': float(row[18]) if row[18] is not None else 0.0,
            'payment_frequency': row[19] or 'monthly',
            'discount_1_month': float(row[20]) if row[20] is not None else 0.0,
            'discount_3_month': float(row[21]) if row[21] is not None else 0.0,
            'discount_6_month': float(row[22]) if row[22] is not None else 0.0,
            'is_active': row[23] if row[23] is not None else True,
            'created_at': row[24] or datetime.now(),
            'updated_at': row[25] or datetime.now()
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating package: {str(e)}")
    finally:
        cur.close()
        conn.close()


# PUT - Update package
@router.put("/packages/{package_id}", response_model=PackageResponse)
async def update_package(
    package_id: int,
    package: PackageUpdate,
    current_user = Depends(get_current_user)
):
    """Update an existing package"""

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get tutor_profiles.id for this user
        cur.execute("""
            SELECT id FROM tutor_profiles WHERE user_id = %s
        """, (current_user['id'],))

        tutor_profile = cur.fetchone()
        if not tutor_profile:
            raise HTTPException(
                status_code=404,
                detail=f"Tutor profile not found for user {current_user['id']}"
            )

        tutor_profile_id = tutor_profile[0]

        # Verify ownership
        cur.execute("""
            SELECT tutor_id FROM tutor_packages WHERE id = %s
        """, (package_id,))

        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Package not found")

        if result[0] != tutor_profile_id:  # Compare with tutor_profiles.id
            raise HTTPException(status_code=403, detail="Not authorized to update this package")

        # Build update query dynamically
        update_fields = []
        update_values = []

        for field, value in package.dict(exclude_unset=True).items():
            if value is not None:
                update_fields.append(f"{field} = %s")
                update_values.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Add updated_at
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        update_values.append(package_id)

        query = f"""
            UPDATE tutor_packages
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, tutor_id, name, grade_level, course_ids, pending_course_ids, description,
                      session_format, schedule_type, schedule_days,
                      start_time, end_time, start_date, end_date,
                      session_time, session_duration,
                      hourly_rate, days_per_week, hours_per_day, payment_frequency,
                      discount_1_month, discount_3_month, discount_6_month,
                      is_active, created_at, updated_at
        """

        cur.execute(query, update_values)
        row = cur.fetchone()
        conn.commit()

        # Get course_ids and pending_course_ids arrays from returned row
        returned_course_ids = row[4] if row[4] else []
        returned_pending_course_ids = row[5] if row[5] else []

        # Fetch full course details
        courses = fetch_course_details(cur, returned_course_ids)
        pending_courses = fetch_pending_course_details(cur, returned_pending_course_ids)

        return {
            'id': row[0],
            'tutor_id': row[1],
            'name': row[2] or '',
            'grade_level': row[3],
            'course_ids': returned_course_ids,
            'pending_course_ids': returned_pending_course_ids,
            'courses': courses,
            'pending_courses': pending_courses,
            'description': row[6],
            'session_format': row[7],
            'schedule_type': row[8],
            'schedule_days': row[9],
            'start_time': str(row[10]) if row[10] else None,
            'end_time': str(row[11]) if row[11] else None,
            'start_date': str(row[12]) if row[12] else None,
            'end_date': str(row[13]) if row[13] else None,
            'session_time': str(row[14]) if row[14] else None,
            'session_duration': float(row[15]) if row[15] is not None else None,
            'hourly_rate': float(row[16]) if row[16] is not None else 0.0,
            'days_per_week': row[17],
            'hours_per_day': float(row[18]) if row[18] is not None else 0.0,
            'payment_frequency': row[19] or 'monthly',
            'discount_1_month': float(row[20]) if row[20] is not None else 0.0,
            'discount_3_month': float(row[21]) if row[21] is not None else 0.0,
            'discount_6_month': float(row[22]) if row[22] is not None else 0.0,
            'is_active': row[23] if row[23] is not None else True,
            'created_at': row[24] or datetime.now(),
            'updated_at': row[25] or datetime.now()
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating package: {str(e)}")
    finally:
        cur.close()
        conn.close()


# Pydantic model for course request from package modal
class PackageCourseRequest(BaseModel):
    """Model for creating a course request from package modal"""
    course_name: str
    course_category: str
    course_level: Optional[str] = None
    course_description: Optional[str] = None
    thumbnail: Optional[str] = None  # Base64 or URL
    duration: Optional[int] = 0
    lessons: Optional[int] = 0
    lesson_title: Optional[List[str]] = []
    language: Optional[List[str]] = ["English"]
    package_id: Optional[int] = None  # Link to package if needed


# POST - Create course request from package modal
@router.post("/packages/course-request")
async def create_package_course_request(
    course: PackageCourseRequest,
    current_user = Depends(get_current_user)
):
    """
    Create a course request from the package modal.
    The course goes to requested_courses with 'pending' status.
    When approved by admin, it moves to courses table and the package's
    pending_course_ids gets updated to course_ids.
    """
    import json

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Insert into requested_courses
        lesson_title_json = json.dumps(course.lesson_title if course.lesson_title else [])
        language_json = json.dumps(course.language if course.language else ["English"])

        cur.execute("""
            INSERT INTO requested_courses
            (requester_id, course_name, course_category, course_level, course_description,
             thumbnail, duration, lessons, lesson_title, language,
             status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id, course_name, course_category, course_level, course_description,
                      thumbnail, duration, lessons, lesson_title, language, status, created_at
        """, (
            current_user['id'],
            course.course_name,
            course.course_category,
            course.course_level,
            course.course_description,
            course.thumbnail,
            course.duration or 0,
            course.lessons or 0,
            lesson_title_json,
            language_json
        ))

        row = cur.fetchone()
        course_request_id = row[0]

        # If package_id is provided, add this course to the package's pending_course_ids
        if course.package_id:
            cur.execute("""
                UPDATE tutor_packages
                SET pending_course_ids = array_append(COALESCE(pending_course_ids, '{}'), %s),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (course_request_id, course.package_id))

        conn.commit()

        return {
            "message": "Course request created successfully",
            "id": course_request_id,
            "request_id": f"REQ-{course_request_id:06d}",
            "course_name": row[1],
            "course_category": row[2],
            "course_level": row[3],
            "course_description": row[4],
            "thumbnail": row[5],
            "duration": row[6] or 0,
            "lessons": row[7] or 0,
            "lesson_title": row[8] if row[8] else [],
            "language": row[9] if row[9] else ["English"],
            "status": row[10] or "pending",
            "created_at": row[11].isoformat() if row[11] else None
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating course request: {str(e)}")
    finally:
        cur.close()
        conn.close()


# GET - Get tutor's pending course requests
@router.get("/packages/course-requests")
async def get_tutor_course_requests(current_user = Depends(get_current_user)):
    """Get all pending course requests for the current tutor"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT id, course_name, course_category, course_level, course_description,
                   thumbnail, duration, lessons, lesson_title, language, status,
                   status_reason, status_at, created_at, updated_at
            FROM requested_courses
            WHERE requester_id = %s
            ORDER BY created_at DESC
        """, (current_user['id'],))

        courses = []
        for row in cur.fetchall():
            courses.append({
                "id": row[0],
                "request_id": f"REQ-{row[0]:06d}",
                "course_name": row[1],
                "course_category": row[2],
                "course_level": row[3],
                "course_description": row[4],
                "thumbnail": row[5],
                "duration": row[6] or 0,
                "lessons": row[7] or 0,
                "lesson_title": row[8] if row[8] else [],
                "language": row[9] if row[9] else ["English"],
                "status": row[10] or "pending",
                "status_reason": row[11],
                "status_at": row[12].isoformat() if row[12] else None,
                "created_at": row[13].isoformat() if row[13] else None,
                "updated_at": row[14].isoformat() if row[14] else None
            })

        return {"courses": courses, "count": len(courses)}

    finally:
        cur.close()
        conn.close()


# DELETE - Delete a pending course request
@router.delete("/packages/course-request/{request_id}")
async def delete_course_request(request_id: int, current_user = Depends(get_current_user)):
    """Delete a pending course request (only if still pending)"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify ownership and status
        cur.execute("""
            SELECT requester_id, status FROM requested_courses WHERE id = %s
        """, (request_id,))

        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Course request not found")

        if result[0] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized to delete this course request")

        if result[1] != 'pending':
            raise HTTPException(status_code=400, detail=f"Cannot delete course request with status '{result[1]}'")

        # Remove from any packages' pending_course_ids
        cur.execute("""
            UPDATE tutor_packages
            SET pending_course_ids = array_remove(pending_course_ids, %s),
                updated_at = CURRENT_TIMESTAMP
            WHERE %s = ANY(pending_course_ids)
        """, (request_id, request_id))

        # Delete the request
        cur.execute("DELETE FROM requested_courses WHERE id = %s", (request_id,))

        conn.commit()

        return {"message": "Course request deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting course request: {str(e)}")
    finally:
        cur.close()
        conn.close()


# DELETE - Delete package
@router.delete("/packages/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_package(package_id: int, current_user = Depends(get_current_user)):
    """Delete a package"""

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get tutor_profiles.id for this user
        cur.execute("""
            SELECT id FROM tutor_profiles WHERE user_id = %s
        """, (current_user['id'],))

        tutor_profile = cur.fetchone()
        if not tutor_profile:
            raise HTTPException(
                status_code=404,
                detail=f"Tutor profile not found for user {current_user['id']}"
            )

        tutor_profile_id = tutor_profile[0]

        # Verify ownership
        cur.execute("""
            SELECT tutor_id FROM tutor_packages WHERE id = %s
        """, (package_id,))

        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Package not found")

        if result[0] != tutor_profile_id:  # Compare with tutor_profiles.id
            raise HTTPException(status_code=403, detail="Not authorized to delete this package")

        # Delete the package
        cur.execute("""
            DELETE FROM tutor_packages WHERE id = %s
        """, (package_id,))

        conn.commit()

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting package: {str(e)}")
    finally:
        cur.close()
        conn.close()


# GET - Get tutor's teaching methods and grade levels for profile header
@router.get("/profile-summary/{tutor_id}")
async def get_tutor_profile_summary(tutor_id: int):
    """
    Get a tutor's profile summary data for profile header display.
    Returns:
    - teaching_methods: Unique session formats from all of the tutor's packages
    - grade_levels: Unique grade levels from courses in the tutor's packages

    This endpoint is public (no auth required) for view-tutor.html
    """
    print(f"========================================")
    print(f"✅ GET /profile-summary/{tutor_id} endpoint called!")
    print(f"========================================")

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get unique session_format values from all packages for this tutor
        cur.execute("""
            SELECT DISTINCT session_format
            FROM tutor_packages
            WHERE tutor_id = %s AND session_format IS NOT NULL AND session_format != ''
            ORDER BY session_format
        """, (tutor_id,))

        teaching_methods = [row[0] for row in cur.fetchall()]
        print(f"📚 Teaching methods from packages: {teaching_methods}")

        # Get all course_ids from all packages for this tutor
        cur.execute("""
            SELECT course_ids
            FROM tutor_packages
            WHERE tutor_id = %s
        """, (tutor_id,))

        all_course_ids = []
        for row in cur.fetchall():
            if row[0]:  # course_ids is an INTEGER[] array
                all_course_ids.extend(row[0])

        # Remove duplicates
        unique_course_ids = list(set(all_course_ids))
        print(f"📚 Unique course IDs from packages: {unique_course_ids}")

        # Get unique grade levels from courses table
        grade_levels = []
        if unique_course_ids:
            cur.execute("""
                SELECT DISTINCT course_level
                FROM courses
                WHERE id = ANY(%s) AND course_level IS NOT NULL AND course_level != ''
                ORDER BY course_level
            """, (unique_course_ids,))

            grade_levels = [row[0] for row in cur.fetchall()]

        print(f"📚 Grade levels from courses: {grade_levels}")

        return {
            "tutor_id": tutor_id,
            "teaching_methods": teaching_methods,
            "grade_levels": grade_levels
        }

    except Exception as e:
        print(f"❌ Error getting profile summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting profile summary: {str(e)}")
    finally:
        cur.close()
        conn.close()
