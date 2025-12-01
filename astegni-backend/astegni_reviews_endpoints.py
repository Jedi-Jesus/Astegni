"""
Astegni Reviews Endpoints - Platform review management for admins
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

# Database setup
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

router = APIRouter()

# ============================================
# PYDANTIC MODELS
# ============================================

class ReviewResponse(BaseModel):
    id: int
    reviewer_id: int
    reviewer_name: str
    reviewer_profile_picture: Optional[str]
    reviewer_role: str
    review: str
    rating: int
    review_type: str
    created_at: datetime

class ReviewStats(BaseModel):
    total_reviews: int
    average_rating: float
    five_star: int
    four_star: int
    three_star: int
    two_star: int
    one_star: int
    by_role: dict

class FeatureReviewRequest(BaseModel):
    review_ids: List[int]
    display_location: str = 'all'

class FeaturedReviewResponse(ReviewResponse):
    is_featured: bool
    display_location: Optional[str]
    display_order: int

# ============================================
# ENDPOINTS
# ============================================

@router.get("/api/admin/reviews/stats")
async def get_review_stats():
    """Get review statistics for admin dashboard"""
    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Get total reviews and average rating
                cur.execute("""
                    SELECT
                        COUNT(*) as total,
                        COALESCE(AVG(rating), 0) as avg_rating
                    FROM astegni_reviews;
                """)
                result = cur.fetchone()
                total_reviews = result[0] if result else 0
                avg_rating = float(result[1]) if result and result[1] else 0.0

                # Get count by rating
                cur.execute("""
                    SELECT rating, COUNT(*) as count
                    FROM astegni_reviews
                    GROUP BY rating
                    ORDER BY rating DESC;
                """)
                rating_counts = cur.fetchall()

                # Initialize counts
                counts = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
                for rating, count in rating_counts:
                    counts[rating] = count

                # Get count by role
                cur.execute("""
                    SELECT
                        CASE
                            WHEN u.roles::text LIKE '%student%' THEN 'student'
                            WHEN u.roles::text LIKE '%tutor%' THEN 'tutor'
                            WHEN u.roles::text LIKE '%parent%' THEN 'parent'
                            WHEN u.roles::text LIKE '%advertiser%' THEN 'advertiser'
                            ELSE 'other'
                        END as role,
                        COUNT(*) as count
                    FROM astegni_reviews ar
                    JOIN users u ON ar.reviewer_id = u.id
                    GROUP BY role;
                """)
                role_counts = cur.fetchall()

                by_role = {role: count for role, count in role_counts}

                # Get count of featured reviews
                cur.execute("""
                    SELECT COUNT(DISTINCT review_id)
                    FROM featured_reviews;
                """)
                result = cur.fetchone()
                featured_count = result[0] if result else 0

                return {
                    "total_reviews": total_reviews,
                    "average_rating": round(avg_rating, 2),
                    "five_star": counts[5],
                    "four_star": counts[4],
                    "three_star": counts[3],
                    "two_star": counts[2],
                    "one_star": counts[1],
                    "by_role": by_role,
                    "featured_reviews": featured_count
                }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/admin/reviews")
async def get_reviews(
    role: Optional[str] = None,
    rating: Optional[int] = Query(None, ge=1, le=5),
    featured: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get reviews with optional filters"""
    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Build base query with featured locations
                query = """
                    SELECT
                        ar.id,
                        ar.reviewer_id,
                        COALESCE(
                            NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.father_name, ''))), ''),
                            u.username,
                            'Anonymous'
                        ) as reviewer_name,
                        u.profile_picture,
                        CASE
                            WHEN u.roles::text LIKE '%%student%%' THEN 'student'
                            WHEN u.roles::text LIKE '%%tutor%%' THEN 'tutor'
                            WHEN u.roles::text LIKE '%%parent%%' THEN 'parent'
                            WHEN u.roles::text LIKE '%%advertiser%%' THEN 'advertiser'
                            ELSE 'user'
                        END as reviewer_role,
                        ar.review,
                        ar.rating,
                        ar.review_type,
                        ar.created_at,
                        COALESCE(
                            array_agg(fr.display_location) FILTER (WHERE fr.display_location IS NOT NULL),
                            ARRAY[]::text[]
                        ) as featured_locations
                    FROM astegni_reviews ar
                    JOIN users u ON ar.reviewer_id = u.id
                    LEFT JOIN featured_reviews fr ON ar.id = fr.review_id
                    WHERE 1=1
                """

                params = {}

                # Add filters
                if role:
                    query += " AND u.roles::text LIKE %(role)s"
                    params['role'] = f'%{role}%'

                if rating is not None:
                    query += " AND ar.rating = %(rating)s"
                    params['rating'] = rating

                # Add GROUP BY for aggregation (cast JSON to text for u.roles)
                query += """
                    GROUP BY ar.id, ar.reviewer_id, u.first_name, u.father_name,
                             u.username, u.profile_picture, u.roles::text, ar.review,
                             ar.rating, ar.review_type, ar.created_at
                """

                # Add featured filter using HAVING
                if featured is not None:
                    if featured:
                        # Show only featured reviews (have at least one location)
                        query += " HAVING COUNT(fr.review_id) > 0"
                    else:
                        # Show only non-featured reviews
                        query += " HAVING COUNT(fr.review_id) = 0"

                # Add ordering and pagination
                query += " ORDER BY ar.created_at DESC"
                query += " LIMIT %(limit)s OFFSET %(offset)s"
                params['limit'] = limit
                params['offset'] = (page - 1) * limit

                # Execute query
                cur.execute(query, params)
                result = cur.fetchall()

                reviews = []
                for row in result:
                    reviews.append({
                        "id": row[0],
                        "reviewer_id": row[1],
                        "reviewer_name": row[2],
                        "reviewer_profile_picture": row[3],
                        "reviewer_role": row[4],
                        "review": row[5],
                        "rating": row[6],
                        "review_type": row[7],
                        "created_at": row[8],
                        "featured_locations": row[9] if row[9] else []
                    })

                return reviews

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/admin/reviews/{review_id}")
async def delete_review(review_id: int):
    """Delete a review (admin only)"""
    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM astegni_reviews WHERE id = %s RETURNING id",
                    (review_id,)
                )
                deleted = cur.fetchone()

                if not deleted:
                    raise HTTPException(status_code=404, detail="Review not found")

                conn.commit()
                return {"message": "Review deleted successfully", "id": review_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/admin/reviews/count")
async def get_reviews_count(
    role: Optional[str] = None,
    rating: Optional[int] = Query(None, ge=1, le=5)
):
    """Get total count of reviews with filters"""
    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                query = """
                    SELECT COUNT(*)
                    FROM astegni_reviews ar
                    JOIN users u ON ar.reviewer_id = u.id
                    WHERE 1=1
                """

                params = {}

                if role:
                    query += " AND u.roles::text LIKE %(role)s"
                    params['role'] = f'%{role}%'

                if rating is not None:
                    query += " AND ar.rating = %(rating)s"
                    params['rating'] = rating

                cur.execute(query, params)
                result = cur.fetchone()
                count = result[0] if result else 0

                return {"count": count}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/admin/reviews/feature")
async def feature_reviews(request: FeatureReviewRequest):
    """Feature selected reviews for display on pages"""
    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                featured_count = 0

                for review_id in request.review_ids:
                    # Check if review exists
                    cur.execute("SELECT id FROM astegni_reviews WHERE id = %s", (review_id,))
                    review_check = cur.fetchone()

                    if not review_check:
                        continue

                    # Insert or update featured review
                    cur.execute("""
                        INSERT INTO featured_reviews (review_id, display_location, display_order, is_active)
                        VALUES (%s, %s, %s, true)
                        ON CONFLICT (review_id, display_location)
                        DO UPDATE SET
                            is_active = true,
                            display_order = %s,
                            featured_at = CURRENT_TIMESTAMP
                    """, (review_id, request.display_location, featured_count, featured_count))
                    featured_count += 1

                conn.commit()
                return {
                    "message": f"Successfully featured {featured_count} reviews",
                    "count": featured_count,
                    "location": request.display_location
                }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/admin/reviews/feature/{review_id}")
async def unfeature_review(
    review_id: int,
    location: Optional[str] = Query('all')
):
    """Remove a review from featured list"""
    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    DELETE FROM featured_reviews
                    WHERE review_id = %s AND display_location = %s
                    RETURNING id
                """, (review_id, location))
                deleted = cur.fetchone()

                if not deleted:
                    raise HTTPException(status_code=404, detail="Featured review not found")

                conn.commit()
                return {"message": "Review unfeatured successfully", "review_id": review_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/featured-reviews")
async def get_featured_reviews(
    location: str = Query('all'),
    limit: int = Query(6, ge=1, le=20)
):
    """Get featured reviews for display on pages (public endpoint)"""
    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                query = """
                    SELECT
                        ar.id,
                        ar.reviewer_id,
                        COALESCE(
                            NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.father_name, ''))), ''),
                            u.username,
                            'Anonymous'
                        ) as reviewer_name,
                        u.profile_picture,
                        CASE
                            WHEN u.roles::text LIKE '%%student%%' THEN 'student'
                            WHEN u.roles::text LIKE '%%tutor%%' THEN 'tutor'
                            WHEN u.roles::text LIKE '%%parent%%' THEN 'parent'
                            WHEN u.roles::text LIKE '%%advertiser%%' THEN 'advertiser'
                            ELSE 'user'
                        END as reviewer_role,
                        ar.review,
                        ar.rating,
                        ar.review_type,
                        ar.created_at,
                        fr.display_location,
                        fr.display_order
                    FROM featured_reviews fr
                    JOIN astegni_reviews ar ON fr.review_id = ar.id
                    JOIN users u ON ar.reviewer_id = u.id
                    WHERE fr.is_active = true
                    AND (fr.display_location = %s OR fr.display_location = %s)
                    ORDER BY fr.display_order ASC, fr.featured_at DESC
                    LIMIT %s
                """

                cur.execute(query, (location, 'all', limit))
                result = cur.fetchall()

                reviews = []
                for row in result:
                    reviews.append({
                        "id": row[0],
                        "reviewer_id": row[1],
                        "reviewer_name": row[2],
                        "reviewer_profile_picture": row[3],
                        "reviewer_role": row[4],
                        "review": row[5],
                        "rating": row[6],
                        "review_type": row[7],
                        "created_at": row[8],
                        "display_location": row[9],
                        "display_order": row[10]
                    })

                return reviews

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
