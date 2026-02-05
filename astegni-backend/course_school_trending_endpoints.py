"""
Course & School Trending/Search Tracking Endpoints

Endpoints to track and retrieve course/school search/view popularity
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel

# Import from modular structure (path already set up by app.py)
from models import SessionLocal
from utils import get_current_user

router = APIRouter()

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================
# REQUEST/RESPONSE MODELS
# ============================================

class CourseSchoolViewRequest(BaseModel):
    course_ids: Optional[List[int]] = []
    school_ids: Optional[List[int]] = []


# ============================================
# TRENDING CALCULATION FUNCTIONS
# ============================================

def calculate_trending_score_generic(search_count: int, last_search: Optional[datetime]) -> float:
    """
    Calculate time-weighted trending score

    Formula:
    - Recent searches (last 24h): weight = 1.0
    - Searches 1-7 days ago: weight = 0.7
    - Searches 7-30 days ago: weight = 0.3
    - Searches older than 30 days: weight = 0.1

    trending_score = search_count * time_weight
    """
    if not last_search:
        return search_count * 0.1  # Old or never searched

    # Calculate time since last search
    time_since_search = datetime.utcnow() - last_search
    hours_since = time_since_search.total_seconds() / 3600
    days_since = hours_since / 24

    # Apply time-based weight
    if days_since < 1:
        weight = 1.0  # Very recent (last 24 hours)
    elif days_since < 7:
        weight = 0.7  # Recent (last week)
    elif days_since < 30:
        weight = 0.3  # Somewhat recent (last month)
    else:
        weight = 0.1  # Old searches

    return search_count * weight


# ============================================
# ENDPOINTS
# ============================================

@router.post("/api/courses-schools/track-views")
async def track_course_school_views(
    request: CourseSchoolViewRequest,
    db: Session = Depends(get_db)
):
    """
    Track when courses and schools are viewed/searched

    This endpoint increments search_count and updates trending_score
    for courses/schools that appear in search results or are viewed.

    Call this endpoint when:
    - Search results are displayed
    - A course/school page is opened
    - Cards are rendered on screen
    """
    updated_count = 0
    now = datetime.utcnow()

    try:
        # Track courses
        if request.course_ids:
            result = db.execute(text("""
                UPDATE courses
                SET search_count = search_count + 1,
                    last_search_increment = :now
                WHERE id = ANY(:course_ids)
            """), {"now": now, "course_ids": request.course_ids})

            # Recalculate trending scores
            courses = db.execute(text("""
                SELECT id, search_count, last_search_increment
                FROM courses
                WHERE id = ANY(:course_ids)
            """), {"course_ids": request.course_ids}).fetchall()

            for course in courses:
                trending_score = calculate_trending_score_generic(
                    course.search_count,
                    course.last_search_increment
                )
                db.execute(text("""
                    UPDATE courses
                    SET trending_score = :score
                    WHERE id = :id
                """), {"score": trending_score, "id": course.id})

            updated_count += len(request.course_ids)

        # Track schools
        if request.school_ids:
            result = db.execute(text("""
                UPDATE schools
                SET search_count = search_count + 1,
                    last_search_increment = :now
                WHERE id = ANY(:school_ids)
            """), {"now": now, "school_ids": request.school_ids})

            # Recalculate trending scores
            schools = db.execute(text("""
                SELECT id, search_count, last_search_increment
                FROM schools
                WHERE id = ANY(:school_ids)
            """), {"school_ids": request.school_ids}).fetchall()

            for school in schools:
                trending_score = calculate_trending_score_generic(
                    school.search_count,
                    school.last_search_increment
                )
                db.execute(text("""
                    UPDATE schools
                    SET trending_score = :score
                    WHERE id = :id
                """), {"score": trending_score, "id": school.id})

            updated_count += len(request.school_ids)

        db.commit()

        return {
            "message": f"Updated search tracking for {updated_count} items",
            "courses_updated": len(request.course_ids) if request.course_ids else 0,
            "schools_updated": len(request.school_ids) if request.school_ids else 0,
            "timestamp": now.isoformat()
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to track views: {str(e)}")


@router.get("/api/trending/courses")
async def get_trending_courses(
    limit: int = 20,
    min_searches: int = 1,
    db: Session = Depends(get_db)
):
    """
    Get trending courses based on recent search activity

    Parameters:
    - limit: Maximum number of courses to return (default: 20)
    - min_searches: Minimum search count to be included (default: 1)
    """
    try:
        # Recalculate trending scores first
        courses = db.execute(text("""
            SELECT id, search_count, last_search_increment
            FROM courses
        """)).fetchall()

        for course in courses:
            trending_score = calculate_trending_score_generic(
                course.search_count or 0,
                course.last_search_increment
            )
            db.execute(text("""
                UPDATE courses
                SET trending_score = :score
                WHERE id = :id
            """), {"score": trending_score, "id": course.id})

        db.commit()

        # Get trending courses
        trending_courses = db.execute(text("""
            SELECT
                id,
                course_name,
                course_category,
                course_description,
                thumbnail,
                rating,
                rating_count,
                search_count,
                trending_score,
                last_search_increment,
                status
            FROM courses
            WHERE search_count >= :min_searches
              AND status = 'approved'
            ORDER BY trending_score DESC
            LIMIT :limit
        """), {"min_searches": min_searches, "limit": limit}).fetchall()

        results = []
        for course in trending_courses:
            results.append({
                "id": course.id,
                "course_name": course.course_name,
                "course_category": course.course_category,
                "course_description": course.course_description,
                "thumbnail": course.thumbnail,
                "rating": float(course.rating) if course.rating else 0.0,
                "rating_count": course.rating_count or 0,
                "search_count": course.search_count,
                "trending_score": course.trending_score,
                "last_searched": course.last_search_increment.isoformat() if course.last_search_increment else None
            })

        return {
            "trending_courses": results,
            "total": len(results)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get trending courses: {str(e)}")


@router.get("/api/trending/schools")
async def get_trending_schools(
    limit: int = 20,
    min_searches: int = 1,
    db: Session = Depends(get_db)
):
    """
    Get trending schools based on recent search activity

    Parameters:
    - limit: Maximum number of schools to return (default: 20)
    - min_searches: Minimum search count to be included (default: 1)
    """
    try:
        # Recalculate trending scores first
        schools = db.execute(text("""
            SELECT id, search_count, last_search_increment
            FROM schools
        """)).fetchall()

        for school in schools:
            trending_score = calculate_trending_score_generic(
                school.search_count or 0,
                school.last_search_increment
            )
            db.execute(text("""
                UPDATE schools
                SET trending_score = :score
                WHERE id = :id
            """), {"score": trending_score, "id": school.id})

        db.commit()

        # Get trending schools
        trending_schools = db.execute(text("""
            SELECT
                id,
                name,
                type,
                location,
                rating,
                student_count,
                search_count,
                trending_score,
                last_search_increment,
                status
            FROM schools
            WHERE search_count >= :min_searches
              AND status IN ('verified', 'approved')
            ORDER BY trending_score DESC
            LIMIT :limit
        """), {"min_searches": min_searches, "limit": limit}).fetchall()

        results = []
        for school in trending_schools:
            results.append({
                "id": school.id,
                "name": school.name,
                "type": school.type,
                "location": school.location,
                "rating": float(school.rating) if school.rating else 0.0,
                "student_count": school.student_count or 0,
                "search_count": school.search_count,
                "trending_score": school.trending_score,
                "last_searched": school.last_search_increment.isoformat() if school.last_search_increment else None
            })

        return {
            "trending_schools": results,
            "total": len(results)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get trending schools: {str(e)}")


@router.get("/api/courses-schools/search-stats")
async def get_search_statistics(
    db: Session = Depends(get_db)
):
    """
    Get overall search statistics for courses and schools
    """
    try:
        # Course stats
        course_stats = db.execute(text("""
            SELECT
                COUNT(*) as total_courses,
                SUM(search_count) as total_searches,
                AVG(search_count) as avg_searches,
                MAX(search_count) as max_searches
            FROM courses
        """)).fetchone()

        # School stats
        school_stats = db.execute(text("""
            SELECT
                COUNT(*) as total_schools,
                SUM(search_count) as total_searches,
                AVG(search_count) as avg_searches,
                MAX(search_count) as max_searches
            FROM schools
        """)).fetchone()

        # Top courses
        top_courses = db.execute(text("""
            SELECT id, course_name, search_count, trending_score
            FROM courses
            ORDER BY search_count DESC
            LIMIT 10
        """)).fetchall()

        # Top schools
        top_schools = db.execute(text("""
            SELECT id, name, search_count, trending_score
            FROM schools
            ORDER BY search_count DESC
            LIMIT 10
        """)).fetchall()

        return {
            "courses": {
                "total_courses": course_stats.total_courses,
                "total_searches": int(course_stats.total_searches or 0),
                "average_searches": float(course_stats.avg_searches or 0),
                "max_searches": course_stats.max_searches or 0,
                "top_10": [
                    {
                        "id": c.id,
                        "name": c.course_name,
                        "search_count": c.search_count,
                        "trending_score": c.trending_score
                    } for c in top_courses
                ]
            },
            "schools": {
                "total_schools": school_stats.total_schools,
                "total_searches": int(school_stats.total_searches or 0),
                "average_searches": float(school_stats.avg_searches or 0),
                "max_searches": school_stats.max_searches or 0,
                "top_10": [
                    {
                        "id": s.id,
                        "name": s.name,
                        "search_count": s.search_count,
                        "trending_score": s.trending_score
                    } for s in top_schools
                ]
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")
