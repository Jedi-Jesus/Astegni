"""
Course and School Request Endpoints
Handles user requests for new courses and schools
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import psycopg
from psycopg.rows import dict_row
import os
import jwt
from dotenv import load_dotenv

load_dotenv()

# Import SECRET_KEY and ALGORITHM from config
try:
    from config import SECRET_KEY, ALGORITHM
except ImportError:
    # Fallback to environment variables if config not available
    SECRET_KEY = os.getenv('SECRET_KEY')
    ALGORITHM = "HS256"

router = APIRouter()

# Pydantic Models
class CourseRequestCreate(BaseModel):
    course_title: str = Field(..., min_length=3, max_length=255)
    category: str = Field(..., min_length=2, max_length=100)
    level: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None

class CourseRequestResponse(BaseModel):
    id: int
    user_id: int
    course_title: str
    category: str
    level: str
    description: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

class SchoolRequestCreate(BaseModel):
    school_name: str = Field(..., min_length=3, max_length=255)
    school_type: str = Field(..., min_length=2, max_length=100)
    level: str = Field(..., min_length=2, max_length=100)
    location: Optional[str] = None
    school_email: Optional[str] = None
    school_phone: Optional[str] = None

class SchoolRequestResponse(BaseModel):
    id: int
    user_id: int
    school_name: str
    school_type: str
    level: str
    location: Optional[str]
    school_email: Optional[str]
    school_phone: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

# Database helper
def get_db_connection():
    """Get database connection"""
    database_url = os.getenv('DATABASE_URL')
    if database_url.startswith('postgresql://'):
        database_url = database_url.replace('postgresql://', 'postgresql://', 1)
    return psycopg.connect(database_url, row_factory=dict_row)

# Dependency to get current user from token
async def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Extract user from JWT token
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - No authorization header"
        )

    try:
        # Remove "Bearer " prefix if present
        token = authorization.replace("Bearer ", "").strip()

        # Decode JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # Extract user_id from payload
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload - no user ID"
            )

        # Convert to int (PyJWT requires string, but our DB uses int)
        user_id = int(user_id_str)

        # Return a dictionary with user info
        return {
            "user_id": user_id,
            "email": payload.get("email"),
            "role": payload.get("role")
        }

    except jwt.ExpiredSignatureError:
        print(f"[course_school_request_endpoints] Token expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        print(f"[course_school_request_endpoints] Invalid token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    except (ValueError, TypeError) as e:
        print(f"[course_school_request_endpoints] Token validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

# Course Request Endpoints
@router.post("/api/course-requests", response_model=CourseRequestResponse)
async def create_course_request(
    request: CourseRequestCreate,
    user = Depends(get_current_user)
):
    """Create a new course request"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO course_requests
                    (user_id, course_title, category, level, description, status, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING *
                """, (
                    user['user_id'],
                    request.course_title,
                    request.category,
                    request.level,
                    request.description
                ))

                result = cur.fetchone()
                conn.commit()
                return result

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create course request: {str(e)}"
        )

@router.get("/api/course-requests", response_model=List[CourseRequestResponse])
async def get_user_course_requests(user = Depends(get_current_user)):
    """Get all course requests for the current user"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT * FROM course_requests
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                """, (user['user_id'],))

                results = cur.fetchall()
                return results

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch course requests: {str(e)}"
        )

@router.get("/api/course-requests/{request_id}", response_model=CourseRequestResponse)
async def get_course_request(request_id: int, user = Depends(get_current_user)):
    """Get a specific course request"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT * FROM course_requests
                    WHERE id = %s AND user_id = %s
                """, (request_id, user['user_id']))

                result = cur.fetchone()
                if not result:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Course request not found"
                    )
                return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch course request: {str(e)}"
        )

# School Request Endpoints
@router.post("/api/school-requests", response_model=SchoolRequestResponse)
async def create_school_request(
    request: SchoolRequestCreate,
    user = Depends(get_current_user)
):
    """Create a new school request"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO requested_schools
                    (user_id, school_name, school_type, level, location, school_email, school_phone, status, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING *
                """, (
                    user['user_id'],
                    request.school_name,
                    request.school_type,
                    request.level,
                    request.location,
                    request.school_email,
                    request.school_phone
                ))

                result = cur.fetchone()
                conn.commit()
                return result

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create school request: {str(e)}"
        )

@router.get("/api/school-requests", response_model=List[SchoolRequestResponse])
async def get_user_school_requests(user = Depends(get_current_user)):
    """Get all school requests for the current user"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT * FROM requested_schools
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                """, (user['user_id'],))

                results = cur.fetchall()
                return results

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch school requests: {str(e)}"
        )

@router.get("/api/school-requests/{request_id}", response_model=SchoolRequestResponse)
async def get_school_request(request_id: int, user = Depends(get_current_user)):
    """Get a specific school request"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT * FROM requested_schools
                    WHERE id = %s AND user_id = %s
                """, (request_id, user['user_id']))

                result = cur.fetchone()
                if not result:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="School request not found"
                    )
                return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch school request: {str(e)}"
        )
