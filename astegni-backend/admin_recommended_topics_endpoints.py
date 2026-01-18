"""
Admin Recommended Topics API Endpoints
Aggregates popular topics from courses and schools for the admin right-widget
"""

import os
from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import psycopg
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create router
router = APIRouter(prefix="/api/admin/recommended-topics", tags=["admin-recommended-topics"])

# Database URLs
USER_DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)

# ============================================
# PYDANTIC MODELS
# ============================================

class TopicItem(BaseModel):
    name: str
    type: str  # 'course' or 'school'
    count: int
    rating: float = 0.0

class RecommendedTopicsResponse(BaseModel):
    topics: List[TopicItem]
    total: int

# ============================================
# DATABASE CONNECTION HELPERS
# ============================================

def parse_database_url(database_url):
    """Parse database URL into connection parameters"""
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

    return {
        "dbname": db_name,
        "user": user,
        "password": password,
        "host": host,
        "port": port
    }

def get_user_db_connection():
    """Get user database connection (astegni_user_db)"""
    params = parse_database_url(USER_DATABASE_URL)
    return psycopg.connect(**params)

# ============================================
# RECOMMENDED TOPICS ENDPOINTS
# ============================================

@router.get("", response_model=RecommendedTopicsResponse)
async def get_recommended_topics(limit: int = 10):
    """
    Get recommended topics from courses and schools

    Aggregates:
    - Popular course categories from verified courses
    - School types/levels from verified schools

    Returns topics sorted by popularity (enrollment/student count)
    """
    try:
        conn = get_user_db_connection()
        cursor = conn.cursor()

        topics = []

        # Get popular course categories
        cursor.execute("""
            SELECT
                course_category as name,
                COUNT(*) as course_count,
                COALESCE(AVG(rating), 0) as avg_rating,
                COALESCE(SUM(rating_count), 0) as total_students
            FROM courses
            WHERE status = 'verified' AND course_category IS NOT NULL AND course_category != ''
            GROUP BY course_category
            ORDER BY total_students DESC, avg_rating DESC
            LIMIT %s
        """, (limit,))

        for row in cursor.fetchall():
            topics.append({
                "name": row[0],
                "type": "course",
                "count": int(row[3]),  # total students
                "rating": round(float(row[2]), 1) if row[2] else 0.0
            })

        # Get popular school types (level is JSONB array, type is simpler)
        cursor.execute("""
            SELECT
                type as name,
                COUNT(*) as school_count,
                COALESCE(AVG(rating), 0) as avg_rating,
                COALESCE(SUM(student_count), 0) as total_students
            FROM schools
            WHERE status = 'verified' AND type IS NOT NULL AND type != ''
            GROUP BY type
            ORDER BY total_students DESC, avg_rating DESC
            LIMIT %s
        """, (limit // 2,))

        for row in cursor.fetchall():
            topics.append({
                "name": row[0],
                "type": "school",
                "count": int(row[3]),  # total students
                "rating": round(float(row[2]), 1) if row[2] else 0.0
            })

        cursor.close()
        conn.close()

        # Sort all topics by count (popularity)
        topics.sort(key=lambda x: x['count'], reverse=True)

        # Limit to requested amount
        topics = topics[:limit]

        return {
            "topics": topics,
            "total": len(topics)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch recommended topics: {str(e)}")


@router.get("/courses", response_model=RecommendedTopicsResponse)
async def get_recommended_course_topics(limit: int = 10):
    """
    Get recommended topics from courses only

    Returns popular course categories sorted by enrollment
    """
    try:
        conn = get_user_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                course_category as name,
                COUNT(*) as course_count,
                COALESCE(AVG(rating), 0) as avg_rating,
                COALESCE(SUM(rating_count), 0) as total_students
            FROM courses
            WHERE status = 'verified' AND course_category IS NOT NULL AND course_category != ''
            GROUP BY course_category
            ORDER BY total_students DESC, avg_rating DESC
            LIMIT %s
        """, (limit,))

        topics = []
        for row in cursor.fetchall():
            topics.append({
                "name": row[0],
                "type": "course",
                "count": int(row[3]),  # total students
                "rating": round(float(row[2]), 1) if row[2] else 0.0
            })

        cursor.close()
        conn.close()

        return {
            "topics": topics,
            "total": len(topics)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch course topics: {str(e)}")


@router.get("/schools", response_model=RecommendedTopicsResponse)
async def get_recommended_school_topics(limit: int = 10):
    """
    Get recommended topics from schools only

    Returns school types sorted by student count
    """
    try:
        conn = get_user_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                type as name,
                COUNT(*) as school_count,
                COALESCE(AVG(rating), 0) as avg_rating,
                COALESCE(SUM(student_count), 0) as total_students
            FROM schools
            WHERE status = 'verified' AND type IS NOT NULL AND type != ''
            GROUP BY type
            ORDER BY total_students DESC, avg_rating DESC
            LIMIT %s
        """, (limit,))

        topics = []
        for row in cursor.fetchall():
            topics.append({
                "name": row[0],
                "type": "school",
                "count": int(row[3]),  # total students
                "rating": round(float(row[2]), 1) if row[2] else 0.0
            })

        cursor.close()
        conn.close()

        return {
            "topics": topics,
            "total": len(topics)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch school topics: {str(e)}")
