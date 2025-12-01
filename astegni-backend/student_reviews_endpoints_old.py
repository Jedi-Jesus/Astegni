"""
Student Reviews Endpoints
API endpoints for managing student reviews from tutors and parents
"""

from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import psycopg
import os
import jwt
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
DATABASE_URL = os.getenv('DATABASE_URL')
SECRET_KEY = os.getenv('SECRET_KEY')

def get_current_user(authorization: str = Header(None)):
    """Extract user from JWT token"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.replace('Bearer ', '')
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Pydantic Models
class StudentReviewCreate(BaseModel):
    student_id: int
    subject_understanding: Optional[float] = Field(None, ge=1, le=5)
    discipline: Optional[float] = Field(None, ge=1, le=5)
    punctuality: Optional[float] = Field(None, ge=1, le=5)
    participation: Optional[float] = Field(None, ge=1, le=5)
    attendance: Optional[float] = Field(None, ge=1, le=5)
    review_title: str = Field(..., max_length=200)
    review_text: str
    review_type: str = Field(..., pattern="^(positive|neutral|improvement|concern)$")

class StudentReviewResponse(BaseModel):
    id: int
    student_id: int
    reviewer_id: int
    reviewer_profile_id: int
    reviewer_role: str
    reviewer_name: str
    reviewer_profile_picture: Optional[str]
    subject_understanding: Optional[float]
    discipline: Optional[float]
    punctuality: Optional[float]
    participation: Optional[float]
    attendance: Optional[float]
    overall_rating: Optional[float]
    review_title: Optional[str]
    review_text: str
    review_type: Optional[str]
    created_at: datetime
    is_featured: bool
    helpful_count: int

@router.get("/api/student/{student_id}/reviews", response_model=List[StudentReviewResponse])
async def get_student_reviews(
    student_id: int,
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    review_type: Optional[str] = None,
    reviewer_role: Optional[str] = None
):
    """Get all reviews for a specific student"""

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Build query with optional filters
        query = """
            SELECT
                sr.id, sr.student_id, sr.reviewer_id, sr.reviewer_profile_id, sr.reviewer_role,
                sr.subject_understanding, sr.discipline, sr.punctuality, sr.participation, sr.attendance,
                sr.overall_rating, sr.review_title, sr.review_text, sr.review_type,
                sr.created_at, sr.is_featured, sr.helpful_count,
                CASE
                    WHEN sr.reviewer_role = 'tutor' THEN
                        COALESCE(u.first_name || ' ' || u.father_name, u.username, u.email)
                    WHEN sr.reviewer_role = 'parent' THEN
                        COALESCE(u.first_name || ' ' || u.father_name, u.username, u.email)
                    ELSE u.email
                END as reviewer_name,
                CASE
                    WHEN sr.reviewer_role = 'tutor' THEN tp.profile_picture
                    WHEN sr.reviewer_role = 'parent' THEN pp.profile_picture
                    ELSE NULL
                END as reviewer_profile_picture
            FROM student_reviews sr
            JOIN users u ON sr.reviewer_id = u.id
            LEFT JOIN tutor_profiles tp ON sr.reviewer_role = 'tutor' AND tp.id = sr.reviewer_profile_id
            LEFT JOIN parent_profiles pp ON sr.reviewer_role = 'parent' AND pp.id = sr.reviewer_profile_id
            WHERE sr.student_id = %s
        """

        params = [student_id]

        if review_type:
            query += " AND sr.review_type = %s"
            params.append(review_type)

        if reviewer_role:
            query += " AND sr.reviewer_role = %s"
            params.append(reviewer_role)

        query += " ORDER BY sr.is_featured DESC, sr.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cur.execute(query, params)
        reviews = cur.fetchall()

        return [
            StudentReviewResponse(
                id=r[0], student_id=r[1], reviewer_id=r[2], reviewer_profile_id=r[3],
                reviewer_role=r[4], subject_understanding=r[5], discipline=r[6],
                punctuality=r[7], participation=r[8], attendance=r[9],
                overall_rating=r[10], review_title=r[11], review_text=r[12],
                review_type=r[13], created_at=r[14], is_featured=r[15],
                helpful_count=r[16], reviewer_name=r[17], reviewer_profile_picture=r[18]
            )
            for r in reviews
        ]

    finally:
        cur.close()
        conn.close()

@router.post("/api/student/{student_id}/reviews", response_model=dict)
async def create_student_review(
    student_id: int,
    review: StudentReviewCreate,
    authorization: str = Header(None)
):
    """Create a new review for a student (tutors and parents only)"""

    # Verify authentication
    current_user = get_current_user(authorization)

    # Get reviewer role and profile ID
    reviewer_role = None
    reviewer_profile_id = None

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Check if user is a tutor
        cur.execute("SELECT id FROM tutor_profiles WHERE user_id = %s", (current_user['user_id'],))
        tutor_profile = cur.fetchone()

        if tutor_profile:
            reviewer_role = 'tutor'
            reviewer_profile_id = tutor_profile[0]
        else:
            # Check if user is a parent
            cur.execute("SELECT id FROM parent_profiles WHERE user_id = %s", (current_user['user_id'],))
            parent_profile = cur.fetchone()

            if parent_profile:
                reviewer_role = 'parent'
                reviewer_profile_id = parent_profile[0]

        if not reviewer_role:
            raise HTTPException(status_code=403, detail="Only tutors and parents can review students")

        # Calculate overall rating
        ratings = [
            review.subject_understanding,
            review.discipline,
            review.punctuality,
            review.participation,
            review.attendance
        ]
        valid_ratings = [r for r in ratings if r is not None]
        overall_rating = round(sum(valid_ratings) / len(valid_ratings), 1) if valid_ratings else None

        # Insert review
        cur.execute("""
            INSERT INTO student_reviews (
                student_id, reviewer_id, reviewer_profile_id, reviewer_role,
                subject_understanding, discipline, punctuality, participation, attendance,
                overall_rating, review_title, review_text, review_type
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            student_id, current_user['user_id'], reviewer_profile_id, reviewer_role,
            review.subject_understanding, review.discipline, review.punctuality,
            review.participation, review.attendance, overall_rating,
            review.review_title, review.review_text, review.review_type
        ))

        review_id = cur.fetchone()[0]
        conn.commit()

        return {"message": "Review created successfully", "review_id": review_id}

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@router.get("/api/student/{student_id}/reviews/stats", response_model=dict)
async def get_student_review_stats(student_id: int):
    """Get review statistics for a student"""

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                COUNT(*) as total_reviews,
                AVG(overall_rating) as avg_rating,
                AVG(subject_understanding) as avg_subject_understanding,
                AVG(discipline) as avg_discipline,
                AVG(punctuality) as avg_punctuality,
                AVG(participation) as avg_participation,
                AVG(attendance) as avg_attendance,
                COUNT(CASE WHEN reviewer_role = 'tutor' THEN 1 END) as tutor_reviews,
                COUNT(CASE WHEN reviewer_role = 'parent' THEN 1 END) as parent_reviews
            FROM student_reviews
            WHERE student_id = %s
        """, (student_id,))

        row = cur.fetchone()

        return {
            "total_reviews": row[0] or 0,
            "avg_rating": round(float(row[1]), 1) if row[1] else 0.0,
            "avg_subject_understanding": round(float(row[2]), 1) if row[2] else 0.0,
            "avg_discipline": round(float(row[3]), 1) if row[3] else 0.0,
            "avg_punctuality": round(float(row[4]), 1) if row[4] else 0.0,
            "avg_participation": round(float(row[5]), 1) if row[5] else 0.0,
            "avg_attendance": round(float(row[6]), 1) if row[6] else 0.0,
            "tutor_reviews": row[7] or 0,
            "parent_reviews": row[8] or 0
        }

    finally:
        cur.close()
        conn.close()

@router.put("/api/student/reviews/{review_id}/helpful", response_model=dict)
async def mark_review_helpful(review_id: int):
    """Mark a review as helpful (increment helpful count)"""

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute("""
            UPDATE student_reviews
            SET helpful_count = helpful_count + 1
            WHERE id = %s
            RETURNING helpful_count
        """, (review_id,))

        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Review not found")

        conn.commit()
        return {"message": "Marked as helpful", "helpful_count": result[0]}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
