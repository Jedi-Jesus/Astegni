"""
Tutor Packages API Endpoints
Manages tutor packages with pricing calculator integration
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header
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

# Import 2FA protection helper
try:
    from tfa_protection import require_2fa
    HAS_2FA_PROTECTION = True
except ImportError:
    HAS_2FA_PROTECTION = False
    print("Warning: 2FA protection not available in this module")

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
    grade_level: Optional[List[str]] = None
    course_ids: Optional[List[int]] = []  # Array of course IDs (status determined from courses table)
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
    yearly_discount: float = Field(default=0, ge=0, le=100)

class PackageUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    grade_level: Optional[List[str]] = None
    course_ids: Optional[List[int]] = None  # Array of course IDs (status determined from courses table)
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
    yearly_discount: Optional[float] = Field(None, ge=0, le=100)
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
    grade_level: Optional[List[str]]
    course_ids: List[int] = []  # Array of course IDs
    courses: Optional[List[CourseInfo]] = []  # Full approved course details (populated on read)
    pending_courses: Optional[List[PendingCourseInfo]] = []  # Full pending course details (filtered by status)
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
    yearly_discount: float
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Helper function to fetch course details (includes status for filtering)
def fetch_course_details(cur, course_ids):
    """Fetch full course details for a list of course IDs, returns approved and pending separately"""
    if not course_ids:
        return [], []

    cur.execute("""
        SELECT id, course_name, course_category, course_level, course_description,
               thumbnail, duration, lessons, lesson_title, language, status
        FROM courses
        WHERE id = ANY(%s)
    """, (course_ids,))

    approved_courses = []
    pending_courses = []
    for row in cur.fetchall():
        course = {
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
            'status': row[10] or 'approved'
        }
        if row[10] == 'pending':
            pending_courses.append(course)
        else:
            approved_courses.append(course)
    return approved_courses, pending_courses


# GET - Get all packages for current tutor
@router.get("/packages", response_model=List[PackageResponse])
async def get_tutor_packages(
    current_user = Depends(get_current_user),
    verification_token: Optional[str] = Header(default=None, alias="X-2FA-Token")
):
    """Get all packages for the authenticated tutor (2FA protected if enabled)"""

    # Check 2FA protection
    if HAS_2FA_PROTECTION:
        require_2fa(current_user['id'], verification_token)

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
            SELECT id, tutor_id, name, grade_level, course_ids, description,
                   session_format, schedule_type, schedule_days,
                   start_time, end_time, start_date, end_date,
                   session_time, session_duration,
                   hourly_rate, days_per_week, hours_per_day, payment_frequency,
                   discount_1_month, discount_3_month, discount_6_month, yearly_discount,
                   is_active, created_at, updated_at
            FROM tutor_packages
            WHERE tutor_id = %s
            ORDER BY created_at DESC
        """, (tutor_profile_id,))  # Use tutor_profiles.id

        packages = []
        for row in cur.fetchall():
            # Get course_ids array
            course_ids = row[4] if row[4] else []

            # Fetch full course details (returns approved and pending separately based on status)
            courses, pending_courses = fetch_course_details(cur, course_ids)

            # Handle None values with proper defaults
            packages.append({
                'id': row[0],
                'tutor_id': row[1],
                'name': row[2] or '',
                'grade_level': row[3],
                'course_ids': course_ids,
                'courses': courses,
                'pending_courses': pending_courses,
                'description': row[5],
                'session_format': row[6],
                'schedule_type': row[7],
                'schedule_days': row[8],
                'start_time': str(row[9]) if row[9] else None,
                'end_time': str(row[10]) if row[10] else None,
                'start_date': str(row[11]) if row[11] else None,
                'end_date': str(row[12]) if row[12] else None,
                'session_time': str(row[13]) if row[13] else None,
                'session_duration': float(row[14]) if row[14] is not None else None,
                'hourly_rate': float(row[15]) if row[15] is not None else 0.0,
                'days_per_week': row[16],
                'hours_per_day': float(row[17]) if row[17] is not None else 0.0,
                'payment_frequency': row[18] or 'monthly',
                'discount_1_month': float(row[19]) if row[19] is not None else 0.0,
                'discount_3_month': float(row[20]) if row[20] is not None else 0.0,
                'discount_6_month': float(row[21]) if row[21] is not None else 0.0,
                'yearly_discount': float(row[22]) if row[22] is not None else 0.0,
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
async def create_package(
    package: PackageCreate,
    current_user = Depends(get_current_user),
    verification_token: Optional[str] = Header(default=None, alias="X-2FA-Token")
):
    """Create a new tutoring package (2FA protected if enabled)"""

    # Check 2FA protection
    if HAS_2FA_PROTECTION:
        require_2fa(current_user['id'], verification_token)

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

        # Handle course_ids array
        course_ids = package.course_ids if package.course_ids else []

        cur.execute("""
            INSERT INTO tutor_packages (
                tutor_id, name, grade_level, course_ids, description,
                session_format, schedule_type, schedule_days,
                start_time, end_time, start_date, end_date,
                session_time, session_duration,
                hourly_rate, days_per_week, hours_per_day, payment_frequency,
                discount_1_month, discount_3_month, discount_6_month, yearly_discount,
                is_active, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id, tutor_id, name, grade_level, course_ids, description,
                      session_format, schedule_type, schedule_days,
                      start_time, end_time, start_date, end_date,
                      session_time, session_duration,
                      hourly_rate, days_per_week, hours_per_day, payment_frequency,
                      discount_1_month, discount_3_month, discount_6_month, yearly_discount,
                      is_active, created_at, updated_at
        """, (
            tutor_profile_id,  # Use tutor_profiles.id, not users.id
            package.name,
            package.grade_level,
            course_ids,
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
            package.yearly_discount,
            True  # is_active = True by default
        ))

        row = cur.fetchone()
        conn.commit()

        # Get course_ids array from returned row
        returned_course_ids = row[4] if row[4] else []

        # Fetch full course details (returns approved and pending separately based on status)
        courses, pending_courses = fetch_course_details(cur, returned_course_ids)

        return {
            'id': row[0],
            'tutor_id': row[1],
            'name': row[2] or '',
            'grade_level': row[3],
            'course_ids': returned_course_ids,
            'courses': courses,
            'pending_courses': pending_courses,
            'description': row[5],
            'session_format': row[6],
            'schedule_type': row[7],
            'schedule_days': row[8],
            'start_time': str(row[9]) if row[9] else None,
            'end_time': str(row[10]) if row[10] else None,
            'start_date': str(row[11]) if row[11] else None,
            'end_date': str(row[12]) if row[12] else None,
            'session_time': str(row[13]) if row[13] else None,
            'session_duration': float(row[14]) if row[14] is not None else None,
            'hourly_rate': float(row[15]) if row[15] is not None else 0.0,
            'days_per_week': row[16],
            'hours_per_day': float(row[17]) if row[17] is not None else 0.0,
            'payment_frequency': row[18] or 'monthly',
            'discount_1_month': float(row[19]) if row[19] is not None else 0.0,
            'discount_3_month': float(row[20]) if row[20] is not None else 0.0,
            'discount_6_month': float(row[21]) if row[21] is not None else 0.0,
            'yearly_discount': float(row[22]) if row[22] is not None else 0.0,
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
    current_user = Depends(get_current_user),
    verification_token: Optional[str] = Header(default=None, alias="X-2FA-Token")
):
    """Update an existing package (2FA protected if enabled)"""

    # Check 2FA protection
    if HAS_2FA_PROTECTION:
        require_2fa(current_user['id'], verification_token)

    print(f"========================================")
    print(f"📝 PUT /packages/{package_id} endpoint called!")
    print(f"📦 Received package data: {package}")
    print(f"📦 Package dict: {package.dict()}")
    print(f"📦 Package dict (exclude_unset): {package.dict(exclude_unset=True)}")
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
            # Allow 0 values to be saved (not just non-None values)
            if value is not None or value == 0:
                update_fields.append(f"{field} = %s")
                update_values.append(value)
                print(f"📝 Adding field: {field} = {value} (type: {type(value).__name__})")

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Add updated_at
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        update_values.append(package_id)

        query = f"""
            UPDATE tutor_packages
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING id, tutor_id, name, grade_level, course_ids, description,
                      session_format, schedule_type, schedule_days,
                      start_time, end_time, start_date, end_date,
                      session_time, session_duration,
                      hourly_rate, days_per_week, hours_per_day, payment_frequency,
                      discount_1_month, discount_3_month, discount_6_month, yearly_discount,
                      is_active, created_at, updated_at
        """

        print(f"📝 SQL Query: {query}")
        print(f"📝 SQL Values: {update_values}")

        cur.execute(query, update_values)
        row = cur.fetchone()
        conn.commit()

        # Get course_ids array from returned row
        returned_course_ids = row[4] if row[4] else []

        # Fetch full course details (returns approved and pending separately based on status)
        courses, pending_courses = fetch_course_details(cur, returned_course_ids)

        return {
            'id': row[0],
            'tutor_id': row[1],
            'name': row[2] or '',
            'grade_level': row[3],
            'course_ids': returned_course_ids,
            'courses': courses,
            'pending_courses': pending_courses,
            'description': row[5],
            'session_format': row[6],
            'schedule_type': row[7],
            'schedule_days': row[8],
            'start_time': str(row[9]) if row[9] else None,
            'end_time': str(row[10]) if row[10] else None,
            'start_date': str(row[11]) if row[11] else None,
            'end_date': str(row[12]) if row[12] else None,
            'session_time': str(row[13]) if row[13] else None,
            'session_duration': float(row[14]) if row[14] is not None else None,
            'hourly_rate': float(row[15]) if row[15] is not None else 0.0,
            'days_per_week': row[16],
            'hours_per_day': float(row[17]) if row[17] is not None else 0.0,
            'payment_frequency': row[18] or 'monthly',
            'discount_1_month': float(row[19]) if row[19] is not None else 0.0,
            'discount_3_month': float(row[20]) if row[20] is not None else 0.0,
            'discount_6_month': float(row[21]) if row[21] is not None else 0.0,
            'yearly_discount': float(row[22]) if row[22] is not None else 0.0,
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
    tags: Optional[List[str]] = []  # Course tags for categorization
    package_id: Optional[int] = None  # Link to package if needed


# POST - Create course request from package modal
@router.post("/packages/course-request")
async def create_package_course_request(
    course: PackageCourseRequest,
    current_user = Depends(get_current_user)
):
    """
    Create a course directly from the package modal.
    The course is saved to the courses table with 'verified' status and is immediately live.
    Students/parents can later report it, which sets status to 'reported' for admin review.
    """
    import json

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Insert into courses table with 'verified' status — live immediately
        # lesson_title, language, and tags are JSONB columns in the courses table
        lesson_title_json = course.lesson_title if course.lesson_title else []
        language_json = course.language if course.language else ["English"]
        tags_json = course.tags if course.tags else []

        cur.execute("""
            INSERT INTO courses
            (uploader_id, course_name, course_category, course_level, course_description,
             thumbnail, duration, lessons, lesson_title, language, tags,
             status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'verified', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id, course_name, course_category, course_level, course_description,
                      thumbnail, duration, lessons, lesson_title, language, tags, status, created_at
        """, (
            current_user['id'],
            course.course_name,
            course.course_category,
            course.course_level,
            course.course_description,
            course.thumbnail,
            course.duration or 0,
            course.lessons or 0,
            json.dumps(lesson_title_json),
            json.dumps(language_json),
            json.dumps(tags_json)
        ))

        row = cur.fetchone()
        course_id = row[0]

        # If package_id is provided, add this course to the package's course_ids
        if course.package_id:
            cur.execute("""
                UPDATE tutor_packages
                SET course_ids = array_append(COALESCE(course_ids, '{}'), %s),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (course_id, course.package_id))

        conn.commit()

        return {
            "message": "Course added successfully",
            "id": course_id,
            "request_id": f"CRS-{course_id:06d}",
            "course_name": row[1],
            "course_category": row[2],
            "course_level": row[3],
            "course_description": row[4],
            "thumbnail": row[5],
            "duration": row[6] or 0,
            "lessons": row[7] or 0,
            "lesson_title": row[8] if row[8] else [],
            "language": row[9] if row[9] else ["English"],
            "tags": row[10] if row[10] else [],
            "status": row[11] or "pending",
            "created_at": row[12].isoformat() if row[12] else None
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating course request: {str(e)}")
    finally:
        cur.close()
        conn.close()


# GET - Get tutor's course requests (courses with pending status)
@router.get("/packages/course-requests")
async def get_tutor_course_requests(current_user = Depends(get_current_user)):
    """Get all course requests (pending courses) for the current tutor"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get courses uploaded by this user that are pending
        cur.execute("""
            SELECT id, course_name, course_category, course_level, course_description,
                   thumbnail, duration, lessons, lesson_title, language, status,
                   status_reason, status_at, created_at, updated_at
            FROM courses
            WHERE uploader_id = %s
            ORDER BY created_at DESC
        """, (current_user['id'],))

        courses = []
        for row in cur.fetchall():
            courses.append({
                "id": row[0],
                "request_id": f"CRS-{row[0]:06d}",
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
    """Delete a pending course (only if still pending)"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Verify ownership and status
        cur.execute("""
            SELECT uploader_id, status FROM courses WHERE id = %s
        """, (request_id,))

        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Course not found")

        if result[0] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized to delete this course")

        if result[1] != 'pending':
            raise HTTPException(status_code=400, detail=f"Cannot delete course with status '{result[1]}'")

        # Remove from any packages' course_ids
        cur.execute("""
            UPDATE tutor_packages
            SET course_ids = array_remove(course_ids, %s),
                updated_at = CURRENT_TIMESTAMP
            WHERE %s = ANY(course_ids)
        """, (request_id, request_id))

        # Delete the course
        cur.execute("DELETE FROM courses WHERE id = %s", (request_id,))

        conn.commit()

        return {"message": "Course deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting course: {str(e)}")
    finally:
        cur.close()
        conn.close()


# DELETE - Delete package
@router.delete("/packages/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_package(
    package_id: int,
    current_user = Depends(get_current_user),
    verification_token: Optional[str] = Header(default=None, alias="X-2FA-Token")
):
    """Delete a package (2FA protected if enabled)"""

    # Check 2FA protection
    if HAS_2FA_PROTECTION:
        require_2fa(current_user['id'], verification_token)

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


# ============================================
# SCHOOLS ENDPOINTS (For Tutor Requests Panel)
# ============================================

@router.get("/schools")
async def get_schools_for_tutor(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get schools list for tutor requests panel (user-based).
    Returns all schools requested by the current user or filtered by status (pending, verified, rejected, suspended).
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Build query based on status filter - FILTER BY USER
        if status and status != 'all':
            cur.execute("""
                SELECT id, name, type, level, location, email, phone,
                       rating, student_count, established_year, principal,
                       status, status_reason, status_at, created_at, updated_at
                FROM schools
                WHERE requester_id = %s AND status = %s
                ORDER BY created_at DESC
            """, (current_user['id'], status))
        else:
            cur.execute("""
                SELECT id, name, type, level, location, email, phone,
                       rating, student_count, established_year, principal,
                       status, status_reason, status_at, created_at, updated_at
                FROM schools
                WHERE requester_id = %s
                ORDER BY created_at DESC
            """, (current_user['id'],))

        rows = cur.fetchall()
        schools = []

        for row in rows:
            # Parse location from JSONB
            location_data = row[4]
            location_str = 'N/A'
            if location_data:
                if isinstance(location_data, dict):
                    parts = []
                    if location_data.get('subcity'):
                        parts.append(location_data['subcity'])
                    if location_data.get('city'):
                        parts.append(location_data['city'])
                    if location_data.get('address'):
                        parts.append(location_data['address'])
                    location_str = ', '.join(parts) if parts else 'N/A'
                elif isinstance(location_data, str):
                    location_str = location_data

            # Parse level from JSONB array
            level_data = row[3]
            level_str = ''
            if level_data:
                if isinstance(level_data, list):
                    level_str = ', '.join(level_data)
                else:
                    level_str = str(level_data)

            # Parse email from JSONB
            email_data = row[5]
            email_str = ''
            if email_data:
                if isinstance(email_data, list) and len(email_data) > 0:
                    email_str = email_data[0]
                elif isinstance(email_data, str):
                    email_str = email_data

            # Parse phone from JSONB
            phone_data = row[6]
            phone_str = ''
            if phone_data:
                if isinstance(phone_data, list) and len(phone_data) > 0:
                    phone_str = phone_data[0]
                elif isinstance(phone_data, str):
                    phone_str = phone_data

            school = {
                'id': row[0],
                'name': row[1],
                'school_name': row[1],  # Frontend expects this
                'type': row[2],
                'school_type': row[2],  # Frontend expects this
                'level': level_str,
                'school_level': level_str,  # Frontend expects this
                'location': location_str,
                'email': email_str,
                'phone': phone_str,
                'rating': float(row[7]) if row[7] else 0,
                'student_count': row[8] or 0,
                'established_year': row[9],
                'principal': row[10],
                'status': row[11] or 'pending',
                'status_reason': row[12],
                'status_at': row[13].isoformat() if row[13] else None,
                'created_at': row[14].isoformat() if row[14] else None,
                'updated_at': row[15].isoformat() if row[15] else None,
                'icon': '🏫'
            }
            schools.append(school)

        return {
            'schools': schools,
            'total': len(schools)
        }

    except Exception as e:
        print(f"❌ Error getting schools: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting schools: {str(e)}")
    finally:
        cur.close()
        conn.close()
