"""
Astegni Reviews Endpoints - Platform review management for admins
Reads from admin_reviews table in astegni_admin_db

Table Structure (admin_reviews):
- id, review_id, admin_id, admin_name, reviewer_name, reviewer_role
- rating, response_time_rating, accuracy_rating
- comment, review_type, related_course_id, metrics
- created_at, updated_at, department
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv()

# Database setup - use astegni_admin_db for admin_reviews table
ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

router = APIRouter()

def get_admin_db():
    """Get admin database connection with dict_row factory"""
    return psycopg.connect(ADMIN_DATABASE_URL, row_factory=dict_row)

# ============================================
# ENDPOINTS
# ============================================

@router.get("/api/admin/reviews/stats")
async def get_review_stats():
    """Get review statistics for admin dashboard from admin_reviews table"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                # Get total reviews and average rating
                cur.execute("""
                    SELECT
                        COUNT(*) as total,
                        COALESCE(AVG(rating), 0) as avg_rating
                    FROM admin_reviews
                """)
                result = cur.fetchone()
                total_reviews = result['total'] if result else 0
                avg_rating = float(result['avg_rating']) if result and result['avg_rating'] else 0.0

                # Get count by rating (rounded to integer)
                cur.execute("""
                    SELECT ROUND(rating)::int as rating_int, COUNT(*) as count
                    FROM admin_reviews
                    GROUP BY ROUND(rating)::int
                    ORDER BY rating_int DESC
                """)
                rating_counts = cur.fetchall()

                # Initialize counts
                counts = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
                for row in rating_counts:
                    rating_val = row['rating_int']
                    if rating_val and 1 <= rating_val <= 5:
                        counts[rating_val] = row['count']

                # Get count by reviewer_role
                cur.execute("""
                    SELECT reviewer_role, COUNT(*) as count
                    FROM admin_reviews
                    WHERE reviewer_role IS NOT NULL
                    GROUP BY reviewer_role
                """)
                role_counts = cur.fetchall()
                by_role = {row['reviewer_role']: row['count'] for row in role_counts}

                # Get count by department
                cur.execute("""
                    SELECT department, COUNT(*) as count
                    FROM admin_reviews
                    WHERE department IS NOT NULL
                    GROUP BY department
                """)
                dept_counts = cur.fetchall()
                by_department = {row['department']: row['count'] for row in dept_counts}

                return {
                    "total_reviews": total_reviews,
                    "average_rating": round(avg_rating, 2),
                    "five_star": counts[5],
                    "four_star": counts[4],
                    "three_star": counts[3],
                    "two_star": counts[2],
                    "one_star": counts[1],
                    "by_role": by_role,
                    "by_department": by_department,
                    "featured_reviews": 0  # admin_reviews doesn't have featured concept
                }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/admin/reviews")
async def get_reviews(
    role: Optional[str] = None,
    rating: Optional[int] = Query(None, ge=1, le=5),
    department: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get reviews from admin_reviews table with optional filters"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                # Build query
                query = """
                    SELECT id, review_id, admin_id, admin_name, reviewer_name, reviewer_role,
                           rating, response_time_rating, accuracy_rating, comment, review_type,
                           related_course_id, metrics, created_at, updated_at, department
                    FROM admin_reviews
                    WHERE 1=1
                """
                params = []

                # Add filters
                if role:
                    query += " AND reviewer_role ILIKE %s"
                    params.append(f'%{role}%')

                if rating is not None:
                    query += " AND ROUND(rating)::int = %s"
                    params.append(rating)

                if department:
                    query += " AND department = %s"
                    params.append(department)

                # Add ordering and pagination
                query += " ORDER BY created_at DESC"
                query += " LIMIT %s OFFSET %s"
                params.extend([limit, (page - 1) * limit])

                # Execute query
                cur.execute(query, params)
                rows = cur.fetchall()

                reviews = []
                for row in rows:
                    reviews.append({
                        "id": row['id'],
                        "review_id": row['review_id'],
                        "admin_id": row['admin_id'],
                        "admin_name": row['admin_name'],
                        "reviewer_name": row['reviewer_name'],
                        "reviewer_role": row['reviewer_role'],
                        "rating": float(row['rating']) if row['rating'] else 0,
                        "response_time_rating": float(row['response_time_rating']) if row['response_time_rating'] else None,
                        "accuracy_rating": float(row['accuracy_rating']) if row['accuracy_rating'] else None,
                        "review": row['comment'],  # Map comment to review for frontend compatibility
                        "comment": row['comment'],
                        "review_type": row['review_type'],
                        "related_course_id": row['related_course_id'],
                        "metrics": row['metrics'],
                        "created_at": row['created_at'].isoformat() if row['created_at'] else None,
                        "updated_at": row['updated_at'].isoformat() if row['updated_at'] else None,
                        "department": row['department'],
                        "featured_locations": []  # For frontend compatibility
                    })

                return reviews

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/admin/reviews/{review_id}")
async def delete_review(review_id: int):
    """Delete a review from admin_reviews table"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM admin_reviews WHERE id = %s RETURNING id",
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
    rating: Optional[int] = Query(None, ge=1, le=5),
    department: Optional[str] = None
):
    """Get total count of reviews with filters"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                query = "SELECT COUNT(*) as count FROM admin_reviews WHERE 1=1"
                params = []

                if role:
                    query += " AND reviewer_role ILIKE %s"
                    params.append(f'%{role}%')

                if rating is not None:
                    query += " AND ROUND(rating)::int = %s"
                    params.append(rating)

                if department:
                    query += " AND department = %s"
                    params.append(department)

                cur.execute(query, params)
                result = cur.fetchone()
                count = result['count'] if result else 0

                return {"count": count}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/admin/reviews/featured")
async def toggle_featured(request: dict):
    """Toggle featured status - placeholder for frontend compatibility"""
    # admin_reviews doesn't have featured concept, return success for compatibility
    return {
        "message": "Featured status updated (no-op for admin_reviews)",
        "review_ids": request.get('review_ids', [])
    }


@router.get("/api/admin/reviews/departments")
async def get_departments():
    """Get list of unique departments from admin_reviews"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT DISTINCT department
                    FROM admin_reviews
                    WHERE department IS NOT NULL
                    ORDER BY department
                """)
                rows = cur.fetchall()
                departments = [row['department'] for row in rows]
                return {"departments": departments}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
