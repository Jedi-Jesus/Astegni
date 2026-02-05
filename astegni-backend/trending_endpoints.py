"""
Trending/Popularity Tracking Endpoints

Endpoints to track and retrieve tutor search/view popularity
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel

# Import from modular structure (path already set up by app.py)
from models import SessionLocal, TutorProfile, User
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

class TutorViewRequest(BaseModel):
    tutor_ids: List[int]  # List of tutor IDs that were viewed/searched


class TrendingTutorResponse(BaseModel):
    id: int
    user_id: int
    first_name: str
    father_name: str
    search_count: int
    trending_score: float

    class Config:
        from_attributes = True


# ============================================
# TRENDING CALCULATION FUNCTIONS
# ============================================

def calculate_trending_score(tutor: TutorProfile) -> float:
    """
    Calculate time-weighted trending score for a tutor

    Formula:
    - Recent searches (last 24h): weight = 1.0
    - Searches 1-7 days ago: weight = 0.7
    - Searches 7-30 days ago: weight = 0.3
    - Searches older than 30 days: weight = 0.1

    trending_score = search_count * time_weight
    """
    if not tutor.last_search_increment:
        return tutor.search_count * 0.1  # Old or never searched

    # Calculate time since last search
    time_since_search = datetime.utcnow() - tutor.last_search_increment
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

    return tutor.search_count * weight


def update_trending_scores(db: Session):
    """
    Recalculate trending scores for all tutors
    This should be run periodically (e.g., every hour)
    """
    tutors = db.query(TutorProfile).all()

    for tutor in tutors:
        tutor.trending_score = calculate_trending_score(tutor)

    db.commit()
    return len(tutors)


# ============================================
# ENDPOINTS
# ============================================

@router.post("/api/tutors/track-views")
async def track_tutor_views(
    request: TutorViewRequest,
    db: Session = Depends(get_db)
):
    """
    Track when tutors are viewed/searched

    This endpoint increments search_count and updates trending_score
    for tutors that appear in search results or are viewed.

    Call this endpoint when:
    - Search results are displayed (all tutors in results)
    - A tutor profile is opened
    - Tutor cards are rendered on screen
    """
    if not request.tutor_ids:
        return {"message": "No tutor IDs provided", "updated": 0}

    try:
        # Update search count and timestamp for all tutors
        tutors = db.query(TutorProfile).filter(
            TutorProfile.id.in_(request.tutor_ids)
        ).all()

        now = datetime.utcnow()

        for tutor in tutors:
            tutor.search_count += 1
            tutor.last_search_increment = now
            tutor.trending_score = calculate_trending_score(tutor)

        db.commit()

        return {
            "message": f"Updated search tracking for {len(tutors)} tutors",
            "updated": len(tutors),
            "timestamp": now.isoformat()
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to track views: {str(e)}")


@router.get("/api/tutors/trending")
async def get_trending_tutors(
    limit: int = 20,
    min_searches: int = 5,  # Minimum searches to be considered trending
    db: Session = Depends(get_db)
):
    """
    Get trending tutors based on recent search activity

    Parameters:
    - limit: Maximum number of tutors to return (default: 20)
    - min_searches: Minimum search count to be included (default: 5)

    Returns tutors sorted by trending_score (time-weighted popularity)
    Includes enriched data: rating, subjects, teaches_at, profile_picture, location
    """
    try:
        # Update trending scores before querying
        update_trending_scores(db)

        # Get trending tutors
        trending_tutors = db.query(
            TutorProfile
        ).filter(
            TutorProfile.search_count >= min_searches,
            TutorProfile.is_active == True
        ).order_by(
            desc(TutorProfile.trending_score)
        ).limit(limit).all()

        if not trending_tutors:
            return {
                "trending_tutors": [],
                "total": 0
            }

        # Get tutor IDs for batch fetching
        tutor_ids = [tutor.id for tutor in trending_tutors]

        # Fetch subjects/courses from tutor_packages
        subjects_query = text("""
            SELECT
                tp.tutor_id,
                ARRAY_AGG(DISTINCT c.course_name) FILTER (WHERE c.course_name IS NOT NULL) as subjects
            FROM tutor_packages tp
            LEFT JOIN courses c ON c.id = ANY(tp.course_ids)
            WHERE tp.tutor_id = ANY(:tutor_ids)
            AND tp.is_active = true
            GROUP BY tp.tutor_id
        """)

        # Fetch ratings from tutor_reviews table
        ratings_query = text("""
            SELECT
                tutor_id,
                COUNT(*) as review_count,
                ROUND(AVG(rating)::numeric, 1) as avg_rating
            FROM tutor_reviews
            WHERE tutor_id = ANY(:tutor_ids)
            GROUP BY tutor_id
        """)

        # Fetch current workplace from schools via credentials
        # First get school names from credentials (title field)
        teaches_at_query = text("""
            SELECT DISTINCT ON (uploader_id)
                uploader_id,
                title as teaches_at
            FROM credentials
            WHERE uploader_id = ANY(:tutor_ids)
            AND uploader_role = 'tutor'
            AND document_type = 'experience'
            AND is_current = true
            ORDER BY uploader_id, created_at DESC
        """)

        subjects_results = db.execute(subjects_query, {"tutor_ids": tutor_ids}).fetchall()
        ratings_results = db.execute(ratings_query, {"tutor_ids": tutor_ids}).fetchall()
        teaches_at_results = db.execute(teaches_at_query, {"tutor_ids": tutor_ids}).fetchall()

        # Create mappings
        subjects_map = {row.tutor_id: row.subjects or [] for row in subjects_results}
        ratings_map = {
            row.tutor_id: {
                "rating": float(row.avg_rating) if row.avg_rating else None,
                "rating_count": row.review_count or 0
            } for row in ratings_results
        }
        teaches_at_map = {row.uploader_id: row.teaches_at for row in teaches_at_results}

        # Format response with enriched data
        results = []
        for tutor in trending_tutors:
            rating_data = ratings_map.get(tutor.id, {"rating": None, "rating_count": 0})

            results.append({
                "id": tutor.id,
                "user_id": tutor.user_id,
                "first_name": tutor.user.first_name if tutor.user else None,
                "father_name": tutor.user.father_name if tutor.user else None,
                "last_name": tutor.user.last_name if tutor.user else None,
                "profile_picture": tutor.user.profile_picture if tutor.user else None,
                "location": tutor.location,
                "subjects": subjects_map.get(tutor.id, []),
                "teaches_at": teaches_at_map.get(tutor.id, None),
                "rating": rating_data["rating"],
                "rating_count": rating_data["rating_count"],
                "search_count": tutor.search_count,
                "trending_score": tutor.trending_score,
                "last_searched": tutor.last_search_increment.isoformat() if tutor.last_search_increment else None
            })

        return {
            "trending_tutors": results,
            "total": len(results)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get trending tutors: {str(e)}")


@router.post("/api/tutors/recalculate-trending")
async def recalculate_trending_scores(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Admin endpoint to manually recalculate all trending scores

    This should be called:
    - Periodically (e.g., via cron job every hour)
    - After bulk updates
    - For maintenance
    """
    try:
        updated_count = update_trending_scores(db)

        return {
            "message": f"Successfully recalculated trending scores for {updated_count} tutors",
            "updated": updated_count,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to recalculate scores: {str(e)}")


@router.get("/api/tutors/search-stats")
async def get_search_statistics(
    db: Session = Depends(get_db)
):
    """
    Get overall search statistics

    Returns:
    - Total searches across all tutors
    - Average searches per tutor
    - Top 10 most searched tutors
    """
    try:
        # Total searches
        total_searches = db.query(
            func.sum(TutorProfile.search_count)
        ).scalar() or 0

        # Average searches
        avg_searches = db.query(
            func.avg(TutorProfile.search_count)
        ).scalar() or 0

        # Tutor count
        tutor_count = db.query(func.count(TutorProfile.id)).scalar()

        # Top 10 most searched
        top_tutors = db.query(
            TutorProfile
        ).order_by(
            desc(TutorProfile.search_count)
        ).limit(10).all()

        top_list = []
        for tutor in top_tutors:
            top_list.append({
                "id": tutor.id,
                "first_name": tutor.user.first_name if tutor.user else None,
                "father_name": tutor.user.father_name if tutor.user else None,
                "search_count": tutor.search_count,
                "trending_score": tutor.trending_score
            })

        return {
            "total_searches": int(total_searches),
            "average_searches": float(avg_searches),
            "total_tutors": tutor_count,
            "top_10_most_searched": top_list
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")
