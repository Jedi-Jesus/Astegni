"""
Admin Reviews and Ratings API Endpoints
Handles admin performance reviews, ratings, and statistics
"""

import os
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import psycopg
from dotenv import load_dotenv

load_dotenv()

# Use ADMIN_DATABASE_URL for admin tables (astegni_admin_db)
ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

# Create router
router = APIRouter(prefix="/api/admin-reviews", tags=["admin-reviews"])

# ============================================
# PYDANTIC MODELS
# ============================================

class ReviewCreate(BaseModel):
    admin_name: str
    reviewer_name: str
    reviewer_role: Optional[str] = None
    rating: float = Field(ge=1.0, le=5.0)
    response_time_rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    accuracy_rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    comment: Optional[str] = None
    review_type: Optional[str] = "general"
    related_course_id: Optional[str] = None

class ReviewResponse(BaseModel):
    id: int
    review_id: str
    admin_name: str
    reviewer_name: str
    reviewer_role: Optional[str]
    rating: float
    response_time_rating: Optional[float]
    accuracy_rating: Optional[float]
    comment: Optional[str]
    review_type: str
    related_course_id: Optional[str]
    metrics: Optional[dict]
    created_at: str

class AdminStatsResponse(BaseModel):
    total_reviews: int
    average_rating: float
    average_response_time_rating: float
    average_accuracy_rating: float
    rating_distribution: dict
    recent_trend: str

# ============================================
# DATABASE CONNECTION
# ============================================

def get_db_connection():
    """Get admin database connection (astegni_admin_db)"""
    database_url = ADMIN_DATABASE_URL

    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "")

    auth, host_db = database_url.split("@")
    user, password = auth.split(":")
    host_port, db_part = host_db.split("/")
    db_name = db_part.split("?")[0]

    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"

    conn = psycopg.connect(
        dbname=db_name,
        user=user,
        password=password,
        host=host,
        port=port
    )
    return conn

# ============================================
# REVIEW ENDPOINTS
# ============================================

@router.get("/")
async def get_all_reviews(
    limit: int = 50,
    offset: int = 0,
    min_rating: Optional[float] = None,
    review_type: Optional[str] = None,
    admin_id: Optional[int] = None,
    department: Optional[str] = None
):
    """Get all admin reviews with optional filters including department"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Build query with filters
        query = """
            SELECT id, review_id, admin_name, reviewer_name, reviewer_role,
                   rating, response_time_rating, accuracy_rating, comment,
                   review_type, related_course_id, metrics, created_at
            FROM admin_reviews
            WHERE 1=1
        """
        params = []

        if admin_id is not None:
            query += " AND admin_id = %s"
            params.append(admin_id)

        if department:
            query += " AND department = %s"
            params.append(department)

        if min_rating is not None:
            query += " AND rating >= %s"
            params.append(min_rating)

        if review_type:
            query += " AND review_type = %s"
            params.append(review_type)

        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cursor.execute(query, params)

        reviews = []
        for row in cursor.fetchall():
            reviews.append({
                "id": row[0],
                "review_id": row[1],
                "admin_name": row[2],
                "reviewer_name": row[3],
                "reviewer_role": row[4],
                "rating": float(row[5]) if row[5] else 0.0,
                "response_time_rating": float(row[6]) if row[6] else None,
                "accuracy_rating": float(row[7]) if row[7] else None,
                "comment": row[8],
                "review_type": row[9],
                "related_course_id": row[10],
                "metrics": row[11],
                "created_at": row[12].isoformat() if row[12] else None
            })

        # Get total count
        count_query = "SELECT COUNT(*) FROM admin_reviews WHERE 1=1"
        count_params = []

        if admin_id is not None:
            count_query += " AND admin_id = %s"
            count_params.append(admin_id)

        if department:
            count_query += " AND department = %s"
            count_params.append(department)

        if min_rating is not None:
            count_query += " AND rating >= %s"
            count_params.append(min_rating)
        if review_type:
            count_query += " AND review_type = %s"
            count_params.append(review_type)

        cursor.execute(count_query, count_params)
        total_count = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return {
            "reviews": reviews,
            "total_count": total_count,
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch reviews: {str(e)}")

@router.get("/stats")
async def get_admin_stats(admin_id: Optional[int] = None, department: Optional[str] = None):
    """Get admin performance statistics for a specific admin and department"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Build query with optional admin_id and department filters
        query = """
            SELECT
                COUNT(*) as total_reviews,
                AVG(rating) as avg_rating,
                AVG(response_time_rating) as avg_response_time,
                AVG(accuracy_rating) as avg_accuracy
            FROM admin_reviews
            WHERE 1=1
        """
        params = []

        if admin_id is not None:
            query += " AND admin_id = %s"
            params.append(admin_id)

        if department:
            query += " AND department = %s"
            params.append(department)

        cursor.execute(query, params)

        stats = cursor.fetchone()
        total_reviews = stats[0] or 0
        avg_rating = float(stats[1]) if stats[1] else 0.0
        avg_response_time = float(stats[2]) if stats[2] else 0.0
        avg_accuracy = float(stats[3]) if stats[3] else 0.0

        # Get rating distribution
        dist_query = """
            SELECT
                FLOOR(rating) as rating_floor,
                COUNT(*) as count
            FROM admin_reviews
            WHERE 1=1
        """
        dist_params = []

        if admin_id is not None:
            dist_query += " AND admin_id = %s"
            dist_params.append(admin_id)

        if department:
            dist_query += " AND department = %s"
            dist_params.append(department)

        dist_query += " GROUP BY FLOOR(rating) ORDER BY rating_floor"

        cursor.execute(dist_query, dist_params)

        rating_dist = {}
        for row in cursor.fetchall():
            rating_dist[f"{int(row[0])}_stars"] = row[1]

        # Get recent trend (last 7 days vs previous 7 days)
        trend_query_recent = """
            SELECT AVG(rating)
            FROM admin_reviews
            WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        """
        trend_query_previous = """
            SELECT AVG(rating)
            FROM admin_reviews
            WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '14 days'
              AND created_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
        """

        trend_params = []

        if admin_id is not None:
            trend_query_recent += " AND admin_id = %s"
            trend_query_previous += " AND admin_id = %s"
            trend_params.append(admin_id)

        if department:
            trend_query_recent += " AND department = %s"
            trend_query_previous += " AND department = %s"
            if admin_id is None:
                trend_params.append(department)
            else:
                # Add department param for both queries
                trend_params = [admin_id, department]

        if trend_params:
            cursor.execute(trend_query_recent, trend_params)
            recent_avg_raw = cursor.fetchone()[0]
            cursor.execute(trend_query_previous, trend_params)
            previous_avg_raw = cursor.fetchone()[0]
        else:
            cursor.execute(trend_query_recent)
            recent_avg_raw = cursor.fetchone()[0]
            cursor.execute(trend_query_previous)
            previous_avg_raw = cursor.fetchone()[0]

        recent_avg = float(recent_avg_raw) if recent_avg_raw else None
        previous_avg = float(previous_avg_raw) if previous_avg_raw else None

        trend = "stable"
        if recent_avg and previous_avg:
            if recent_avg > previous_avg + 0.2:
                trend = "improving"
            elif recent_avg < previous_avg - 0.2:
                trend = "declining"

        cursor.close()
        conn.close()

        return {
            "total_reviews": total_reviews,
            "average_rating": round(avg_rating, 2),
            "average_response_time_rating": round(avg_response_time, 2),
            "average_accuracy_rating": round(avg_accuracy, 2),
            "rating_distribution": rating_dist,
            "recent_trend": trend
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")

@router.get("/recent")
async def get_recent_reviews(limit: int = 10, admin_id: Optional[int] = None, department: Optional[str] = None):
    """Get most recent reviews for a specific admin and department"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
            SELECT id, review_id, admin_name, reviewer_name, reviewer_role,
                   rating, response_time_rating, accuracy_rating, comment,
                   review_type, related_course_id, metrics, created_at
            FROM admin_reviews
            WHERE 1=1
        """
        params = []

        if admin_id is not None:
            query += " AND admin_id = %s"
            params.append(admin_id)

        if department:
            query += " AND department = %s"
            params.append(department)

        query += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)

        cursor.execute(query, params)

        reviews = []
        for row in cursor.fetchall():
            reviews.append({
                "id": row[0],
                "review_id": row[1],
                "admin_name": row[2],
                "reviewer_name": row[3],
                "reviewer_role": row[4],
                "rating": float(row[5]) if row[5] else 0.0,
                "response_time_rating": float(row[6]) if row[6] else None,
                "accuracy_rating": float(row[7]) if row[7] else None,
                "comment": row[8],
                "review_type": row[9],
                "related_course_id": row[10],
                "metrics": row[11],
                "created_at": row[12].isoformat() if row[12] else None
            })

        cursor.close()
        conn.close()

        return {"reviews": reviews, "count": len(reviews)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch recent reviews: {str(e)}")

@router.post("/")
async def create_review(review: ReviewCreate):
    """Create a new admin review"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Generate review ID
        cursor.execute("SELECT COUNT(*) FROM admin_reviews")
        count = cursor.fetchone()[0]
        review_id = f"REV-ADM-{str(count + 1).zfill(3)}"

        # Insert review
        cursor.execute("""
            INSERT INTO admin_reviews
            (review_id, admin_name, reviewer_name, reviewer_role, rating,
             response_time_rating, accuracy_rating, comment, review_type,
             related_course_id, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            review_id,
            review.admin_name,
            review.reviewer_name,
            review.reviewer_role,
            review.rating,
            review.response_time_rating,
            review.accuracy_rating,
            review.comment,
            review.review_type,
            review.related_course_id,
            datetime.now(timezone.utc)
        ))

        new_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()
        conn.close()

        return {
            "message": "Review created successfully",
            "review_id": review_id,
            "id": new_id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create review: {str(e)}")

@router.get("/{review_id}")
async def get_review(review_id: str):
    """Get specific review by ID"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, review_id, admin_name, reviewer_name, reviewer_role,
                   rating, response_time_rating, accuracy_rating, comment,
                   review_type, related_course_id, metrics, created_at
            FROM admin_reviews
            WHERE review_id = %s
        """, (review_id,))

        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail="Review not found")

        return {
            "id": row[0],
            "review_id": row[1],
            "admin_name": row[2],
            "reviewer_name": row[3],
            "reviewer_role": row[4],
            "rating": float(row[5]) if row[5] else 0.0,
            "response_time_rating": float(row[6]) if row[6] else None,
            "accuracy_rating": float(row[7]) if row[7] else None,
            "comment": row[8],
            "review_type": row[9],
            "related_course_id": row[10],
            "metrics": row[11],
            "created_at": row[12].isoformat() if row[12] else None
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch review: {str(e)}")
