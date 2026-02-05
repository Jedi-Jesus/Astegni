"""
Platform Reviews Endpoints
Handles user reviews of the Astegni platform
Saves to astegni_admin_db.astegni_reviews table
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import psycopg
from psycopg.rows import dict_row
from utils import get_current_user
import os
from dotenv import load_dotenv

load_dotenv()

# Admin Database URL
ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

router = APIRouter()


def get_admin_db():
    """Get admin database connection"""
    return psycopg.connect(ADMIN_DATABASE_URL, row_factory=dict_row)


# ============================================
# PYDANTIC SCHEMAS
# ============================================

class PlatformReviewCreate(BaseModel):
    ease_of_use: int  # Ease of use rating (1-5), required
    features_quality: int  # Features rating (1-5), required
    support_quality: int  # Support/Customer service rating (1-5), required
    pricing: int  # Pricing rating (1-5), required
    review_text: Optional[str] = None
    would_recommend: Optional[bool] = None


# ============================================
# API ENDPOINTS
# ============================================

@router.post("/api/platform-reviews/submit")
async def submit_platform_review(
    review: PlatformReviewCreate,
    current_user = Depends(get_current_user)
):
    """
    Submit or update a review for the Astegni platform
    Saves to astegni_admin_db.astegni_reviews table
    """

    # Validate all ratings (all required)
    if not all([
        1 <= review.ease_of_use <= 5,
        1 <= review.features_quality <= 5,
        1 <= review.support_quality <= 5,
        1 <= review.pricing <= 5
    ]):
        raise HTTPException(status_code=400, detail="All ratings must be between 1 and 5")

    # Calculate overall rating as average of all category ratings
    overall_rating = (review.ease_of_use + review.features_quality + review.support_quality + review.pricing) / 4.0

    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                # Check if user already submitted a review
                cur.execute("""
                    SELECT id FROM astegni_reviews
                    WHERE reviewer_id = %s
                """, (current_user.id,))

                existing_review = cur.fetchone()

                if existing_review:
                    # Update existing review
                    cur.execute("""
                        UPDATE astegni_reviews
                        SET rating = %s,
                            ease_of_use = %s,
                            features_quality = %s,
                            support_quality = %s,
                            pricing = %s,
                            review_text = %s,
                            would_recommend = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE reviewer_id = %s
                        RETURNING id, rating, ease_of_use, features_quality, support_quality,
                                  pricing, review_text, would_recommend, created_at, updated_at
                    """, (
                        overall_rating,
                        review.ease_of_use,
                        review.features_quality,
                        review.support_quality,
                        review.pricing,
                        review.review_text,
                        review.would_recommend,
                        current_user.id
                    ))
                else:
                    # Create new review
                    cur.execute("""
                        INSERT INTO astegni_reviews (
                            reviewer_id,
                            rating,
                            ease_of_use,
                            features_quality,
                            support_quality,
                            pricing,
                            review_text,
                            would_recommend,
                            is_featured,
                            count,
                            created_at,
                            updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        RETURNING id, rating, ease_of_use, features_quality, support_quality,
                                  pricing, review_text, would_recommend, created_at, updated_at
                    """, (
                        current_user.id,
                        overall_rating,
                        review.ease_of_use,
                        review.features_quality,
                        review.support_quality,
                        review.pricing,
                        review.review_text,
                        review.would_recommend,
                        False,  # is_featured
                        0  # count
                    ))

                result = cur.fetchone()
                conn.commit()

                return {
                    "message": "Review submitted successfully" if not existing_review else "Review updated successfully",
                    "review": {
                        "id": result['id'],
                        "rating": round(float(result['rating']), 2) if result['rating'] else 0,
                        "ease_of_use": result['ease_of_use'],
                        "features_quality": result['features_quality'],
                        "support_quality": result['support_quality'],
                        "pricing": result['pricing'],
                        "review_text": result['review_text'],
                        "would_recommend": result['would_recommend'],
                        "created_at": result['created_at'].isoformat() if result['created_at'] else None,
                        "updated_at": result['updated_at'].isoformat() if result['updated_at'] else None
                    }
                }

    except Exception as e:
        print(f"Error submitting platform review: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/platform-reviews/my-review")
async def get_my_platform_review(
    current_user = Depends(get_current_user)
):
    """
    Get current user's review for Astegni (if exists)
    """
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, reviewer_id, rating,
                           ease_of_use, features_quality, support_quality, pricing,
                           review_text, would_recommend, is_featured, created_at, updated_at
                    FROM astegni_reviews
                    WHERE reviewer_id = %s
                """, (current_user.id,))

                review = cur.fetchone()

                if not review:
                    return None

                return {
                    "id": review['id'],
                    "reviewer_id": review['reviewer_id'],
                    "rating": round(float(review['rating']), 2) if review['rating'] else 0,
                    "ease_of_use": review['ease_of_use'],
                    "features_quality": review['features_quality'],
                    "support_quality": review['support_quality'],
                    "pricing": review['pricing'],
                    "review_text": review['review_text'],
                    "would_recommend": review['would_recommend'],
                    "is_featured": review['is_featured'],
                    "created_at": review['created_at'].isoformat() if review['created_at'] else None,
                    "updated_at": review['updated_at'].isoformat() if review['updated_at'] else None
                }

    except Exception as e:
        print(f"Error fetching user review: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/platform-reviews/stats")
async def get_platform_review_stats():
    """
    Get aggregated statistics for Astegni platform reviews
    """
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                # Get total reviews and averages
                cur.execute("""
                    SELECT
                        COUNT(*) as total_reviews,
                        COALESCE(AVG(rating), 0) as avg_overall,
                        COALESCE(AVG(support_quality), 0) as avg_support,
                        COALESCE(AVG(ease_of_use), 0) as avg_ease,
                        COALESCE(AVG(features_quality), 0) as avg_features,
                        COALESCE(AVG(pricing), 0) as avg_pricing
                    FROM astegni_reviews
                """)

                stats = cur.fetchone()

                # Get rating distribution
                cur.execute("""
                    SELECT ROUND(rating)::int as rating_int, COUNT(*) as count
                    FROM astegni_reviews
                    GROUP BY ROUND(rating)::int
                    ORDER BY rating_int DESC
                """)
                rating_counts = cur.fetchall()

                counts = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
                for row in rating_counts:
                    rating_val = row['rating_int']
                    if rating_val and 1 <= rating_val <= 5:
                        counts[rating_val] = row['count']

                return {
                    "total_reviews": stats['total_reviews'],
                    "average_ratings": {
                        "overall": round(float(stats['avg_overall']), 2) if stats['avg_overall'] else 0,
                        "ease_of_use": round(float(stats['avg_ease']), 2) if stats['avg_ease'] else 0,
                        "features_quality": round(float(stats['avg_features']), 2) if stats['avg_features'] else 0,
                        "support_quality": round(float(stats['avg_support']), 2) if stats['avg_support'] else 0,
                        "pricing": round(float(stats['avg_pricing']), 2) if stats['avg_pricing'] else 0
                    },
                    "rating_distribution": counts
                }

    except Exception as e:
        print(f"Error fetching platform review stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


print("[OK] Platform Reviews Endpoints: Loaded")
