"""
Student Reviews Endpoints
API endpoints for managing student reviews from tutors and parents

Table columns:
- id, student_id, reviewer_id, reviewer_role
- subject_understanding, discipline, punctuality, participation
- communication_skills, class_activity
- rating (calculated average)
- review_title, review_text, review_type
- created_at, updated_at, is_featured, helpful_count
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
        # Normalize user_id from 'sub' field
        user_id = payload.get('sub')
        if user_id:
            payload['user_id'] = int(user_id)
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Pydantic Models
class StudentReviewCreate(BaseModel):
    # student_id comes from path parameter, not body
    subject_understanding: Optional[float] = Field(None, ge=1, le=5)
    discipline: Optional[float] = Field(None, ge=1, le=5)
    punctuality: Optional[float] = Field(None, ge=1, le=5)
    participation: Optional[float] = Field(None, ge=1, le=5)
    communication_skills: Optional[float] = Field(None, ge=1, le=5)
    class_activity: Optional[float] = Field(None, ge=1, le=5)
    review_title: str = Field(..., max_length=200)
    review_text: str
    review_type: Optional[str] = Field(None, pattern="^(positive|neutral|improvement|concern)$")

class StudentReviewResponse(BaseModel):
    id: int
    student_id: int  # student_profiles.id
    reviewer_id: int  # tutor_profiles.id or parent_profiles.id
    reviewer_role: str
    reviewer_name: str
    reviewer_profile_picture: Optional[str]
    subject_understanding: Optional[float]
    discipline: Optional[float]
    punctuality: Optional[float]
    participation: Optional[float]
    communication_skills: Optional[float]
    class_activity: Optional[float]
    rating: Optional[float]
    review_title: Optional[str]
    review_text: str
    review_type: Optional[str]
    created_at: datetime
    is_featured: bool
    helpful_count: int

@router.get("/api/student/{student_id}/reviews", response_model=dict)
async def get_student_reviews_for_view(
    student_id: int,  # This is student_profiles.id
    authorization: str = Header(None)
):
    """
    Get all reviews for a specific student with aggregated stats
    Used by view-student.html behavioral notes panel
    student_id: The student_profiles.id (not users.id)

    Returns: {
        reviews: [...],
        total: int,
        avg_rating: float,
        category_averages: {
            subject_understanding: float,
            communication_skills: float,
            discipline: float,
            punctuality: float,
            class_activity: float
        }
    }
    """
    # Verify authentication
    get_current_user(authorization)

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get all reviews with reviewer info
        cur.execute("""
            SELECT
                sr.id, sr.student_id, sr.reviewer_id, sr.reviewer_role,
                sr.subject_understanding, sr.discipline, sr.punctuality, sr.participation,
                sr.communication_skills, sr.class_activity, sr.rating,
                sr.review_title, sr.review_text, sr.review_type,
                sr.created_at, sr.is_featured, sr.helpful_count,
                CASE
                    WHEN sr.reviewer_role = 'tutor' THEN
                        COALESCE(tu.first_name || ' ' || tu.father_name, tu.email)
                    WHEN sr.reviewer_role = 'parent' THEN
                        COALESCE(pu.first_name || ' ' || pu.father_name, pu.email)
                    ELSE 'Unknown'
                END as reviewer_name,
                CASE
                    WHEN sr.reviewer_role = 'tutor' THEN tu.profile_picture  -- NOTE: profile_picture now read from users table
                    WHEN sr.reviewer_role = 'parent' THEN pu.profile_picture  -- NOTE: profile_picture now read from users table
                    ELSE NULL
                END as reviewer_profile_picture
            FROM student_reviews sr
            LEFT JOIN tutor_profiles tp ON sr.reviewer_role = 'tutor' AND sr.reviewer_id = tp.id
            LEFT JOIN users tu ON tp.user_id = tu.id
            LEFT JOIN parent_profiles pp ON sr.reviewer_role = 'parent' AND sr.reviewer_id = pp.id
            LEFT JOIN users pu ON pp.user_id = pu.id
            WHERE sr.student_id = %s
            ORDER BY sr.is_featured DESC, sr.created_at DESC
        """, (student_id,))

        rows = cur.fetchall()

        # Build reviews list
        reviews = []
        for r in rows:
            reviews.append({
                "id": r[0],
                "student_id": r[1],
                "reviewer_id": r[2],
                "reviewer_role": r[3],
                "subject_understanding": float(r[4]) if r[4] else 0.0,
                "discipline": float(r[5]) if r[5] else 0.0,
                "punctuality": float(r[6]) if r[6] else 0.0,
                "participation": float(r[7]) if r[7] else 0.0,
                "communication_skills": float(r[8]) if r[8] else 0.0,
                "class_activity": float(r[9]) if r[9] else 0.0,
                "rating": float(r[10]) if r[10] else 0.0,
                "review_title": r[11],
                "comment": r[12],  # Frontend expects 'comment' not 'review_text'
                "review_type": r[13],
                "created_at": r[14].isoformat() if r[14] else None,
                "is_featured": r[15],
                "helpful_count": r[16],
                "reviewer_name": r[17],
                "reviewer_picture": r[18]  # Frontend expects 'reviewer_picture' not 'reviewer_profile_picture'
            })

        # Calculate aggregates
        total = len(reviews)
        avg_rating = sum(r["rating"] for r in reviews) / total if total > 0 else 0.0

        category_averages = {
            "subject_understanding": sum(r["subject_understanding"] for r in reviews) / total if total > 0 else 0.0,
            "communication_skills": sum(r["communication_skills"] for r in reviews) / total if total > 0 else 0.0,
            "discipline": sum(r["discipline"] for r in reviews) / total if total > 0 else 0.0,
            "punctuality": sum(r["punctuality"] for r in reviews) / total if total > 0 else 0.0,
            "class_activity": sum(r["class_activity"] for r in reviews) / total if total > 0 else 0.0
        }

        return {
            "reviews": reviews,
            "total": total,
            "avg_rating": round(avg_rating, 1),
            "category_averages": category_averages
        }

    finally:
        cur.close()
        conn.close()


@router.get("/api/student/reviews/{student_id}", response_model=List[StudentReviewResponse])
async def get_student_reviews(
    student_id: int,  # This is student_profiles.id
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    review_type: Optional[str] = None,
    reviewer_role: Optional[str] = None
):
    """
    Get all reviews for a specific student (legacy endpoint)
    student_id: The student_profiles.id (not users.id)
    """

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Build query with JOINs to get reviewer info
        query = """
            SELECT
                sr.id, sr.student_id, sr.reviewer_id, sr.reviewer_role,
                sr.subject_understanding, sr.discipline, sr.punctuality, sr.participation,
                sr.communication_skills, sr.class_activity, sr.rating,
                sr.review_title, sr.review_text, sr.review_type,
                sr.created_at, sr.is_featured, sr.helpful_count,
                CASE
                    WHEN sr.reviewer_role = 'tutor' THEN
                        COALESCE(tu.first_name || ' ' || tu.father_name, tu.email)
                    WHEN sr.reviewer_role = 'parent' THEN
                        COALESCE(pu.first_name || ' ' || pu.father_name, pu.email)
                    ELSE 'Unknown'
                END as reviewer_name,
                CASE
                    WHEN sr.reviewer_role = 'tutor' THEN tu.profile_picture  -- NOTE: profile_picture now read from users table
                    WHEN sr.reviewer_role = 'parent' THEN pu.profile_picture  -- NOTE: profile_picture now read from users table
                    ELSE NULL
                END as reviewer_profile_picture
            FROM student_reviews sr
            LEFT JOIN tutor_profiles tp ON sr.reviewer_role = 'tutor' AND sr.reviewer_id = tp.id
            LEFT JOIN users tu ON tp.user_id = tu.id
            LEFT JOIN parent_profiles pp ON sr.reviewer_role = 'parent' AND sr.reviewer_id = pp.id
            LEFT JOIN users pu ON pp.user_id = pu.id
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
                id=r[0], student_id=r[1], reviewer_id=r[2], reviewer_role=r[3],
                subject_understanding=r[4], discipline=r[5], punctuality=r[6],
                participation=r[7], communication_skills=r[8], class_activity=r[9],
                rating=r[10], review_title=r[11], review_text=r[12], review_type=r[13],
                created_at=r[14], is_featured=r[15], helpful_count=r[16],
                reviewer_name=r[17], reviewer_profile_picture=r[18]
            )
            for r in reviews
        ]

    finally:
        cur.close()
        conn.close()

@router.post("/api/student/reviews/{student_id}", response_model=dict)
async def create_student_review(
    student_id: int,  # This is student_profiles.id
    review: StudentReviewCreate,
    authorization: str = Header(None)
):
    """
    Create a new review for a student (tutors and parents only)
    student_id: The student_profiles.id (not users.id)
    """

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
            reviewer_profile_id = tutor_profile[0]  # tutor_profiles.id
        else:
            # Check if user is a parent
            cur.execute("SELECT id FROM parent_profiles WHERE user_id = %s", (current_user['user_id'],))
            parent_profile = cur.fetchone()

            if parent_profile:
                reviewer_role = 'parent'
                reviewer_profile_id = parent_profile[0]  # parent_profiles.id

        if not reviewer_role:
            raise HTTPException(status_code=403, detail="Only tutors and parents can review students")

        # Calculate rating from all provided scores
        ratings = [
            review.subject_understanding,
            review.discipline,
            review.punctuality,
            review.participation,
            review.communication_skills,
            review.class_activity
        ]
        valid_ratings = [r for r in ratings if r is not None]
        rating = round(sum(valid_ratings) / len(valid_ratings), 1) if valid_ratings else None

        # Insert review
        cur.execute("""
            INSERT INTO student_reviews (
                student_id, reviewer_id, reviewer_role,
                subject_understanding, discipline, punctuality, participation,
                communication_skills, class_activity, rating,
                review_title, review_text, review_type
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            student_id, reviewer_profile_id, reviewer_role,
            review.subject_understanding, review.discipline, review.punctuality,
            review.participation, review.communication_skills, review.class_activity,
            rating, review.review_title, review.review_text, review.review_type
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

@router.get("/api/student/reviews/{student_id}/stats", response_model=dict)
async def get_student_review_stats(student_id: int):
    """
    Get review statistics for a student
    student_id: The student_profiles.id (not users.id)
    """

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                COUNT(*) as total_reviews,
                AVG(rating) as avg_rating,
                AVG(subject_understanding) as avg_subject_understanding,
                AVG(discipline) as avg_discipline,
                AVG(punctuality) as avg_punctuality,
                AVG(participation) as avg_participation,
                AVG(communication_skills) as avg_communication_skills,
                AVG(class_activity) as avg_class_activity,
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
            "avg_communication_skills": round(float(row[6]), 1) if row[6] else 0.0,
            "avg_class_activity": round(float(row[7]), 1) if row[7] else 0.0,
            "tutor_reviews": row[8] or 0,
            "parent_reviews": row[9] or 0
        }

    finally:
        cur.close()
        conn.close()

@router.get("/api/student/user/{user_id}/profile-id", response_model=dict)
async def get_student_profile_id(user_id: int):
    """
    Convert user_id to student_profile_id
    This helper endpoint is needed because URLs use user_id but reviews table uses student_profile_id
    """

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute("SELECT id FROM student_profiles WHERE user_id = %s", (user_id,))
        result = cur.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Student profile not found")

        return {"student_profile_id": result[0], "user_id": user_id}

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

@router.get("/api/student/reviews/single/{review_id}", response_model=dict)
async def get_single_review(review_id: int):
    """Get a single review by ID"""

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT id, student_id, reviewer_id, reviewer_role,
                   subject_understanding, discipline, punctuality, participation,
                   communication_skills, class_activity, rating,
                   review_title, review_text, review_type
            FROM student_reviews WHERE id = %s
        """, (review_id,))

        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Review not found")

        return {
            "id": row[0],
            "student_id": row[1],
            "reviewer_id": row[2],
            "reviewer_role": row[3],
            "subject_understanding": row[4],
            "discipline": row[5],
            "punctuality": row[6],
            "participation": row[7],
            "communication_skills": row[8],
            "class_activity": row[9],
            "rating": row[10],
            "review_title": row[11],
            "review_text": row[12],
            "review_type": row[13]
        }

    finally:
        cur.close()
        conn.close()

@router.put("/api/student/reviews/{review_id}", response_model=dict)
async def update_student_review(
    review_id: int,
    review: StudentReviewCreate,
    authorization: str = Header(None)
):
    """Update a review (only by the original reviewer)"""

    current_user = get_current_user(authorization)

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get the review and check ownership
        cur.execute("""
            SELECT reviewer_id, reviewer_role FROM student_reviews WHERE id = %s
        """, (review_id,))
        existing = cur.fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Review not found")

        reviewer_id, reviewer_role = existing

        # Get current user's profile ID based on role
        if reviewer_role == 'tutor':
            cur.execute("SELECT id FROM tutor_profiles WHERE user_id = %s", (current_user['user_id'],))
        else:
            cur.execute("SELECT id FROM parent_profiles WHERE user_id = %s", (current_user['user_id'],))

        profile = cur.fetchone()
        if not profile or profile[0] != reviewer_id:
            raise HTTPException(status_code=403, detail="You can only edit your own reviews")

        # Calculate new rating
        ratings = [
            review.subject_understanding,
            review.discipline,
            review.punctuality,
            review.participation,
            review.communication_skills,
            review.class_activity
        ]
        valid_ratings = [r for r in ratings if r is not None]
        rating = round(sum(valid_ratings) / len(valid_ratings), 1) if valid_ratings else None

        # Update the review
        cur.execute("""
            UPDATE student_reviews SET
                subject_understanding = %s,
                discipline = %s,
                punctuality = %s,
                participation = %s,
                communication_skills = %s,
                class_activity = %s,
                rating = %s,
                review_title = %s,
                review_text = %s,
                review_type = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (
            review.subject_understanding, review.discipline, review.punctuality,
            review.participation, review.communication_skills, review.class_activity,
            rating, review.review_title, review.review_text, review.review_type,
            review_id
        ))

        conn.commit()
        return {"message": "Review updated successfully", "review_id": review_id}

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@router.delete("/api/student/reviews/{review_id}", response_model=dict)
async def delete_student_review(
    review_id: int,
    authorization: str = Header(None)
):
    """Delete a review (only by the original reviewer)"""

    current_user = get_current_user(authorization)

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get the review and check ownership
        cur.execute("""
            SELECT reviewer_id, reviewer_role, student_id FROM student_reviews WHERE id = %s
        """, (review_id,))
        existing = cur.fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Review not found")

        reviewer_id, reviewer_role, student_id = existing

        # Get current user's profile ID based on role
        if reviewer_role == 'tutor':
            cur.execute("SELECT id FROM tutor_profiles WHERE user_id = %s", (current_user['user_id'],))
        else:
            cur.execute("SELECT id FROM parent_profiles WHERE user_id = %s", (current_user['user_id'],))

        profile = cur.fetchone()
        if not profile or profile[0] != reviewer_id:
            raise HTTPException(status_code=403, detail="You can only delete your own reviews")

        # Delete the review
        cur.execute("DELETE FROM student_reviews WHERE id = %s", (review_id,))
        conn.commit()

        return {"message": "Review deleted successfully", "student_id": student_id}

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@router.get("/api/student/reviews/{student_id}/my-review", response_model=dict)
async def get_my_review_for_student(
    student_id: int,
    authorization: str = Header(None)
):
    """Check if current user has already reviewed this student and return that review"""

    current_user = get_current_user(authorization)

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get current user's tutor profile ID
        cur.execute("SELECT id FROM tutor_profiles WHERE user_id = %s", (current_user['user_id'],))
        tutor_profile = cur.fetchone()

        # Get current user's parent profile ID
        cur.execute("SELECT id FROM parent_profiles WHERE user_id = %s", (current_user['user_id'],))
        parent_profile = cur.fetchone()

        # Check for existing review by this user (as tutor or parent)
        review = None

        if tutor_profile:
            cur.execute("""
                SELECT id, student_id, reviewer_id, reviewer_role,
                       subject_understanding, discipline, punctuality, participation,
                       communication_skills, class_activity, rating,
                       review_title, review_text, review_type
                FROM student_reviews
                WHERE student_id = %s AND reviewer_id = %s AND reviewer_role = 'tutor'
            """, (student_id, tutor_profile[0]))
            review = cur.fetchone()

        if not review and parent_profile:
            cur.execute("""
                SELECT id, student_id, reviewer_id, reviewer_role,
                       subject_understanding, discipline, punctuality, participation,
                       communication_skills, class_activity, rating,
                       review_title, review_text, review_type
                FROM student_reviews
                WHERE student_id = %s AND reviewer_id = %s AND reviewer_role = 'parent'
            """, (student_id, parent_profile[0]))
            review = cur.fetchone()

        if review:
            return {
                "has_review": True,
                "review": {
                    "id": review[0],
                    "student_id": review[1],
                    "reviewer_id": review[2],
                    "reviewer_role": review[3],
                    "subject_understanding": review[4],
                    "discipline": review[5],
                    "punctuality": review[6],
                    "participation": review[7],
                    "communication_skills": review[8],
                    "class_activity": review[9],
                    "rating": review[10],
                    "review_title": review[11],
                    "review_text": review[12],
                    "review_type": review[13]
                }
            }
        else:
            return {"has_review": False, "review": None}

    finally:
        cur.close()
        conn.close()
