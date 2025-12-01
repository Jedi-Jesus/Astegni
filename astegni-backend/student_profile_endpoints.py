"""
Student Profile Management Endpoints
Handles CRUD operations for student profiles and related data
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import psycopg
from psycopg.rows import dict_row
import os
from dotenv import load_dotenv
import sys

# Add parent directory and app.py modules to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app.py modules'))
from utils import get_current_user
from models import get_db

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

router = APIRouter()

# ============================================
# PYDANTIC MODELS
# ============================================

class StudentProfileUpdate(BaseModel):
    """Model for updating student profile"""
    hero_title: Optional[List[str]] = Field(default_factory=list)
    hero_subtitle: Optional[List[str]] = Field(default_factory=list)
    username: Optional[str] = None
    location: Optional[str] = None
    studying_at: Optional[str] = None
    grade_level: Optional[str] = None
    interested_in: Optional[List[str]] = Field(default_factory=list)
    learning_method: Optional[List[str]] = Field(default_factory=list)
    languages: Optional[List[str]] = Field(default_factory=list)
    hobbies: Optional[List[str]] = Field(default_factory=list)
    quote: Optional[List[str]] = Field(default_factory=list)
    about: Optional[str] = None
    profile_picture: Optional[str] = None
    cover_image: Optional[str] = None

class StudentProfileResponse(BaseModel):
    """Model for student profile response"""
    id: int
    user_id: int
    hero_title: List[str]
    hero_subtitle: List[str]
    username: Optional[str]
    location: Optional[str]
    studying_at: Optional[str]
    grade_level: Optional[str]
    interested_in: List[str]
    learning_method: List[str]
    languages: List[str]
    hobbies: List[str]
    quote: List[str]
    about: Optional[str]
    profile_picture: Optional[str]
    cover_image: Optional[str]
    created_at: datetime
    updated_at: datetime

class AcademicProgressUpdate(BaseModel):
    """Model for updating academic progress"""
    strong_subjects: Optional[List[str]] = Field(default_factory=list)
    weak_subjects: Optional[List[str]] = Field(default_factory=list)
    academic_goals: Optional[List[str]] = Field(default_factory=list)
    current_gpa: Optional[float] = None
    target_gpa: Optional[float] = None

class GuardianCreate(BaseModel):
    """Model for creating guardian"""
    guardian_name: str
    guardian_phone: Optional[str] = None
    guardian_email: Optional[str] = None
    guardian_relationship: Optional[str] = None
    is_primary: bool = False

class CourseEnroll(BaseModel):
    """Model for enrolling in course"""
    tutor_id: Optional[int] = None
    course_name: str
    course_subject: Optional[str] = None
    session_title: Optional[str] = None
    session_time: Optional[datetime] = None

# ============================================
# HELPER FUNCTIONS
# ============================================

def get_db_psycopg():
    """Get database connection using psycopg"""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

# ============================================
# STUDENT PROFILE ENDPOINTS
# ============================================

@router.get("/api/student/profile/{user_id}", response_model=StudentProfileResponse)
async def get_student_profile(user_id: int):
    """Get student profile by user ID"""
    try:
        with get_db_psycopg() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        id, user_id,
                        COALESCE(hero_title, '{}') as hero_title,
                        COALESCE(hero_subtitle, '{}') as hero_subtitle,
                        username, location,
                        studying_at, grade_level,
                        COALESCE(interested_in, '{}') as interested_in,
                        COALESCE(learning_method, '{}') as learning_method,
                        COALESCE(languages, '{}') as languages,
                        COALESCE(hobbies, '{}') as hobbies,
                        COALESCE(quote, '{}') as quote,
                        about, profile_picture, cover_image,
                        created_at, updated_at
                    FROM student_profiles
                    WHERE user_id = %s
                """, (user_id,))

                profile = cur.fetchone()

                if not profile:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Student profile not found"
                    )

                return profile
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.get("/api/student/profile/me")
async def get_my_profile(current_user = Depends(get_current_user), db = Depends(get_db)):
    """Get current user's student profile"""
    return await get_student_profile(current_user.id)

@router.put("/api/student/profile")
async def update_student_profile(
    profile_data: StudentProfileUpdate,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Update student profile"""
    try:
        current_user_id = current_user.id

        # DEBUG: Print incoming data
        print("\n" + "="*80)
        print("🔍 INCOMING PROFILE DATA:")
        print(f"hero_title: {profile_data.hero_title}")
        print(f"hero_subtitle: {profile_data.hero_subtitle}")
        print(f"username: '{profile_data.username}'")
        print(f"location: '{profile_data.location}'")
        print(f"studying_at: '{profile_data.studying_at}'")
        print(f"grade_level: '{profile_data.grade_level}'")
        print(f"interested_in: {profile_data.interested_in}")
        print(f"learning_method: {profile_data.learning_method}")
        print(f"languages: {profile_data.languages}")
        print(f"hobbies: {profile_data.hobbies}")
        print(f"quote: {profile_data.quote}")
        print(f"about: '{profile_data.about}'")
        print("="*80 + "\n")

        with get_db_psycopg() as conn:
            with conn.cursor() as cur:
                # Check if profile exists
                cur.execute("""
                    SELECT id FROM student_profiles WHERE user_id = %s
                """, (current_user_id,))

                profile_exists = cur.fetchone()

                if profile_exists:
                    # Update existing profile
                    # NOTE: Don't use COALESCE for array fields - allow empty arrays to overwrite
                    # For string fields, convert empty strings to None, then use COALESCE
                    username_val = profile_data.username if profile_data.username else None
                    location_val = profile_data.location if profile_data.location else None
                    studying_at_val = profile_data.studying_at if profile_data.studying_at else None
                    grade_level_val = profile_data.grade_level if profile_data.grade_level else None
                    about_val = profile_data.about if profile_data.about else None
                    profile_picture_val = profile_data.profile_picture if profile_data.profile_picture else None
                    cover_image_val = profile_data.cover_image if profile_data.cover_image else None

                    # DEBUG: Print converted values
                    print("🔧 CONVERTED VALUES:")
                    print(f"username_val: {username_val}")
                    print(f"location_val: {location_val}")
                    print(f"studying_at_val: {studying_at_val}")
                    print(f"grade_level_val: {grade_level_val}")
                    print(f"about_val: {about_val}")
                    print("="*80 + "\n")

                    cur.execute("""
                        UPDATE student_profiles
                        SET
                            hero_title = %s,
                            hero_subtitle = %s,
                            username = COALESCE(%s, username),
                            location = COALESCE(%s, location),
                            studying_at = COALESCE(%s, studying_at),
                            grade_level = COALESCE(%s, grade_level),
                            interested_in = %s,
                            learning_method = %s,
                            languages = %s,
                            hobbies = %s,
                            quote = %s,
                            about = COALESCE(%s, about),
                            profile_picture = COALESCE(%s, profile_picture),
                            cover_image = COALESCE(%s, cover_image),
                            updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = %s
                        RETURNING *
                    """, (
                        profile_data.hero_title or [],
                        profile_data.hero_subtitle or [],
                        username_val,
                        location_val,
                        studying_at_val,
                        grade_level_val,
                        profile_data.interested_in or [],
                        profile_data.learning_method or [],
                        profile_data.languages or [],
                        profile_data.hobbies or [],
                        profile_data.quote or [],
                        about_val,
                        profile_picture_val,
                        cover_image_val,
                        current_user_id
                    ))
                else:
                    # Create new profile
                    cur.execute("""
                        INSERT INTO student_profiles (
                            user_id, hero_title, hero_subtitle, username, location,
                            studying_at, grade_level, interested_in,
                            learning_method, languages, hobbies, quote, about,
                            profile_picture, cover_image
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                        RETURNING *
                    """, (
                        current_user_id,
                        profile_data.hero_title or [],
                        profile_data.hero_subtitle or [],
                        profile_data.username,
                        profile_data.location,
                        profile_data.studying_at,
                        profile_data.grade_level,
                        profile_data.interested_in or [],
                        profile_data.learning_method or [],
                        profile_data.languages or [],
                        profile_data.hobbies or [],
                        profile_data.quote or [],
                        profile_data.about,
                        profile_data.profile_picture,
                        profile_data.cover_image
                    ))

                updated_profile = cur.fetchone()
                conn.commit()

                return {
                    "success": True,
                    "message": "Profile updated successfully",
                    "profile": updated_profile
                }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )

# ============================================
# ACADEMIC PROGRESS ENDPOINTS
# ============================================

@router.get("/api/student/progress/{user_id}")
async def get_academic_progress(user_id: int):
    """Get student academic progress"""
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT * FROM student_overall_progress
                    WHERE student_id = %s
                """, (user_id,))

                progress = cur.fetchone()

                if not progress:
                    # Return empty progress if not found
                    return {
                        "student_id": user_id,
                        "strong_subjects": [],
                        "weak_subjects": [],
                        "academic_goals": [],
                        "current_gpa": None,
                        "target_gpa": None,
                        "attendance_rate": 0.0
                    }

                return progress
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.put("/api/student/progress")
async def update_academic_progress(
    progress_data: AcademicProgressUpdate,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Update student academic progress"""
    try:
        current_user_id = current_user.id
        with get_db_psycopg() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO student_overall_progress (
                        student_id, strong_subjects, weak_subjects, academic_goals,
                        current_gpa, target_gpa
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (student_id)
                    DO UPDATE SET
                        strong_subjects = COALESCE(EXCLUDED.strong_subjects, student_overall_progress.strong_subjects),
                        weak_subjects = COALESCE(EXCLUDED.weak_subjects, student_overall_progress.weak_subjects),
                        academic_goals = COALESCE(EXCLUDED.academic_goals, student_overall_progress.academic_goals),
                        current_gpa = COALESCE(EXCLUDED.current_gpa, student_overall_progress.current_gpa),
                        target_gpa = COALESCE(EXCLUDED.target_gpa, student_overall_progress.target_gpa),
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                """, (
                    current_user_id,
                    progress_data.strong_subjects or [],
                    progress_data.weak_subjects or [],
                    progress_data.academic_goals or [],
                    progress_data.current_gpa,
                    progress_data.target_gpa
                ))

                updated_progress = cur.fetchone()
                conn.commit()

                return {
                    "success": True,
                    "message": "Academic progress updated successfully",
                    "progress": updated_progress
                }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update progress: {str(e)}"
        )

# ============================================
# GUARDIAN ENDPOINTS
# ============================================

@router.get("/api/student/guardians/{user_id}")
async def get_guardians(user_id: int):
    """Get student guardians"""
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT * FROM student_guardian
                    WHERE student_id = %s
                    ORDER BY is_primary DESC, created_at ASC
                """, (user_id,))

                guardians = cur.fetchall()
                return {"guardians": guardians}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.post("/api/student/guardians")
async def add_guardian(
    guardian_data: GuardianCreate,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Add guardian to student profile"""
    try:
        current_user_id = current_user.id
        with get_db_psycopg() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO student_guardian (
                        student_id, guardian_name, guardian_phone,
                        guardian_email, guardian_relationship, is_primary
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING *
                """, (
                    current_user_id,
                    guardian_data.guardian_name,
                    guardian_data.guardian_phone,
                    guardian_data.guardian_email,
                    guardian_data.guardian_relationship,
                    guardian_data.is_primary
                ))

                guardian = cur.fetchone()
                conn.commit()

                return {
                    "success": True,
                    "message": "Guardian added successfully",
                    "guardian": guardian
                }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add guardian: {str(e)}"
        )

# ============================================
# COURSE ENROLLMENT ENDPOINTS
# ============================================

@router.get("/api/student/courses/{user_id}")
async def get_enrolled_courses(user_id: int):
    """Get student enrolled courses"""
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        sc.*,
                        u.full_name as tutor_name,
                        u.profile_picture as tutor_picture
                    FROM student_courses sc
                    LEFT JOIN users u ON sc.tutor_id = u.id
                    WHERE sc.student_id = %s
                    ORDER BY sc.enrolled_at DESC
                """, (user_id,))

                courses = cur.fetchall()

                # Calculate total sessions
                cur.execute("""
                    SELECT COUNT(*) as total_sessions
                    FROM student_courses
                    WHERE student_id = %s
                """, (user_id,))

                stats = cur.fetchone()

                return {
                    "courses": courses,
                    "total_sessions": stats['total_sessions'] if stats else 0
                }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@router.post("/api/student/courses/enroll")
async def enroll_course(
    course_data: CourseEnroll,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Enroll in a course"""
    try:
        current_user_id = current_user.id
        with get_db_psycopg() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO student_courses (
                        student_id, tutor_id, course_name, course_subject,
                        session_title, session_time
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING *
                """, (
                    current_user_id,
                    course_data.tutor_id,
                    course_data.course_name,
                    course_data.course_subject,
                    course_data.session_title,
                    course_data.session_time
                ))

                course = cur.fetchone()
                conn.commit()

                return {
                    "success": True,
                    "message": "Enrolled in course successfully",
                    "course": course
                }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enroll: {str(e)}"
        )

# ============================================
# STATISTICS ENDPOINT
# ============================================

@router.get("/api/student/stats/{user_id}")
async def get_student_stats(user_id: int):
    """Get comprehensive student statistics"""
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                # Get connections count
                cur.execute("""
                    SELECT COUNT(*) as total_connections
                    FROM connections
                    WHERE (user_id = %s OR connected_user_id = %s)
                    AND status = 'accepted'
                """, (user_id, user_id))
                connections = cur.fetchone()

                # Get courses count
                cur.execute("""
                    SELECT
                        COUNT(*) as total_courses,
                        SUM(total_sessions) as total_sessions,
                        SUM(completed_sessions) as completed_sessions
                    FROM student_courses
                    WHERE student_id = %s
                """, (user_id,))
                courses = cur.fetchone()

                # Get academic progress
                cur.execute("""
                    SELECT attendance_rate, current_gpa
                    FROM student_overall_progress
                    WHERE student_id = %s
                """, (user_id,))
                progress = cur.fetchone()

                return {
                    "total_connections": connections['total_connections'] if connections else 0,
                    "total_courses": courses['total_courses'] if courses else 0,
                    "total_sessions": courses['total_sessions'] if courses else 0,
                    "completed_sessions": courses['completed_sessions'] if courses else 0,
                    "attendance_rate": progress['attendance_rate'] if progress else 0.0,
                    "current_gpa": progress['current_gpa'] if progress else None
                }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
