"""
Job Board API Endpoints
Comprehensive REST API for advertiser job posting system
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime, date, timedelta
import json
from sqlalchemy import text

from utils import get_current_user
from models import engine

router = APIRouter()

# ============================================
# PYDANTIC SCHEMAS
# ============================================

class JobPostCreate(BaseModel):
    """Schema for creating a new job post"""
    title: str = Field(..., min_length=10, max_length=200)
    description: str = Field(..., min_length=50)
    requirements: str = Field(..., min_length=20)

    job_type: str = Field(..., pattern="^(full-time|part-time|contract|internship|freelance)$")
    location_type: str = Field(..., pattern="^(remote|on-site|hybrid)$")
    location: str = Field(..., min_length=3, max_length=200)

    salary_min: Optional[int] = Field(None, ge=0)
    salary_max: Optional[int] = Field(None, ge=0)
    salary_currency: str = Field(default="ETB", max_length=10)
    salary_visibility: str = Field(default="public", pattern="^(public|private|negotiable)$")

    skills: List[str] = Field(default_factory=list)
    experience_level: Optional[str] = None
    education_level: Optional[str] = None

    application_deadline: date
    application_email: Optional[str] = None
    application_url: Optional[str] = None
    application_instructions: Optional[str] = None

    status: str = Field(default="draft", pattern="^(draft|active|paused|closed)$")

    @validator('salary_max')
    def validate_salary_range(cls, v, values):
        if v is not None and 'salary_min' in values and values['salary_min'] is not None:
            if v < values['salary_min']:
                raise ValueError('salary_max must be greater than or equal to salary_min')
        return v

    @validator('application_deadline')
    def validate_deadline(cls, v):
        if v < date.today():
            raise ValueError('application_deadline must be in the future')
        return v


class JobPostUpdate(BaseModel):
    """Schema for updating a job post"""
    title: Optional[str] = Field(None, min_length=10, max_length=200)
    description: Optional[str] = Field(None, min_length=50)
    requirements: Optional[str] = Field(None, min_length=20)

    job_type: Optional[str] = None
    location_type: Optional[str] = None
    location: Optional[str] = None

    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_visibility: Optional[str] = None

    skills: Optional[List[str]] = None
    experience_level: Optional[str] = None
    education_level: Optional[str] = None

    application_deadline: Optional[date] = None
    application_email: Optional[str] = None
    application_url: Optional[str] = None
    application_instructions: Optional[str] = None

    status: Optional[str] = None


class JobPostResponse(BaseModel):
    """Schema for job post response"""
    id: int
    advertiser_id: int
    user_id: int
    title: str
    description: str
    requirements: str
    job_type: str
    location_type: str
    location: str
    salary_min: Optional[int]
    salary_max: Optional[int]
    salary_currency: str
    salary_visibility: str
    skills: List[str]
    experience_level: Optional[str]
    education_level: Optional[str]
    application_deadline: date
    status: str
    views: int
    applications_count: int
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime]


class JobApplicationCreate(BaseModel):
    """Schema for job application"""
    job_id: int
    applicant_name: str = Field(..., min_length=2, max_length=200)
    applicant_email: str = Field(..., pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    applicant_phone: Optional[str] = None

    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None

    expected_salary: Optional[int] = None
    available_from: Optional[date] = None
    notice_period: Optional[str] = None


class JobApplicationResponse(BaseModel):
    """Schema for job application response"""
    id: int
    job_id: int
    applicant_user_id: int
    applicant_name: str
    applicant_email: str
    applicant_phone: Optional[str]
    cover_letter: Optional[str]
    status: str
    applied_at: datetime


# ============================================
# JOB POST ENDPOINTS
# ============================================

@router.post("/api/jobs/posts", status_code=status.HTTP_201_CREATED)
async def create_job_post(
    job_data: JobPostCreate,
    current_user = Depends(get_current_user)
):
    """Create a new job posting"""

    # Verify user has advertiser profile
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT id FROM advertiser_profiles WHERE user_id = :user_id"),
            {"user_id": current_user.id}
        ).fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only advertisers can create job posts"
            )

        advertiser_id = result[0]

        # Insert job post
        query = text("""
            INSERT INTO job_posts (
                advertiser_id, user_id, title, description, requirements,
                job_type, location_type, location, salary_min, salary_max,
                salary_currency, salary_visibility, skills, experience_level,
                education_level, application_deadline, application_email,
                application_url, application_instructions, status
            ) VALUES (
                :advertiser_id, :user_id, :title, :description, :requirements,
                :job_type, :location_type, :location, :salary_min, :salary_max,
                :salary_currency, :salary_visibility, :skills, :experience_level,
                :education_level, :application_deadline, :application_email,
                :application_url, :application_instructions, :status
            )
            RETURNING id, created_at, updated_at
        """)

        result = conn.execute(query, {
            "advertiser_id": advertiser_id,
            "user_id": current_user.id,
            "title": job_data.title,
            "description": job_data.description,
            "requirements": job_data.requirements,
            "job_type": job_data.job_type,
            "location_type": job_data.location_type,
            "location": job_data.location,
            "salary_min": job_data.salary_min,
            "salary_max": job_data.salary_max,
            "salary_currency": job_data.salary_currency,
            "salary_visibility": job_data.salary_visibility,
            "skills": json.dumps(job_data.skills),
            "experience_level": job_data.experience_level,
            "education_level": job_data.education_level,
            "application_deadline": job_data.application_deadline,
            "application_email": job_data.application_email,
            "application_url": job_data.application_url,
            "application_instructions": job_data.application_instructions,
            "status": job_data.status
        }).fetchone()

        conn.commit()

        job_id, created_at, updated_at = result

        # If status is 'active', set published_at
        if job_data.status == 'active':
            conn.execute(
                text("UPDATE job_posts SET published_at = CURRENT_TIMESTAMP WHERE id = :job_id"),
                {"job_id": job_id}
            )
            conn.commit()

        return {
            "id": job_id,
            "message": "Job post created successfully",
            "status": job_data.status,
            "created_at": created_at
        }


@router.get("/api/jobs/posts")
async def get_job_posts(
    job_status: Optional[str] = Query(None, pattern="^(draft|active|paused|closed|all)$", alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    current_user = Depends(get_current_user)
):
    """Get all job posts for the current advertiser"""

    with engine.connect() as conn:
        # Get advertiser_id
        advertiser = conn.execute(
            text("SELECT id FROM advertiser_profiles WHERE user_id = :user_id"),
            {"user_id": current_user.id}
        ).fetchone()

        if not advertiser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only advertisers can view job posts"
            )

        advertiser_id = advertiser[0]

        # Build query
        where_clause = "WHERE advertiser_id = :advertiser_id"
        params = {"advertiser_id": advertiser_id}

        if job_status and job_status != 'all':
            where_clause += " AND status = :status"
            params["status"] = job_status

        # Get total count
        count_query = f"SELECT COUNT(*) FROM job_posts {where_clause}"
        total = conn.execute(text(count_query), params).scalar()

        # Get jobs with pagination
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset

        query = f"""
            SELECT
                id, advertiser_id, user_id, title, description, requirements,
                job_type, location_type, location, salary_min, salary_max,
                salary_currency, salary_visibility, skills, experience_level,
                education_level, application_deadline, status, views,
                applications_count, created_at, updated_at, published_at
            FROM job_posts
            {where_clause}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """

        jobs = conn.execute(text(query), params).fetchall()

        return {
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit,
            "jobs": [
                {
                    "id": job[0],
                    "advertiser_id": job[1],
                    "user_id": job[2],
                    "title": job[3],
                    "description": job[4],
                    "requirements": job[5],
                    "job_type": job[6],
                    "location_type": job[7],
                    "location": job[8],
                    "salary_min": job[9],
                    "salary_max": job[10],
                    "salary_currency": job[11],
                    "salary_visibility": job[12],
                    "skills": job[13] if job[13] else [],
                    "experience_level": job[14],
                    "education_level": job[15],
                    "application_deadline": job[16].isoformat() if job[16] else None,
                    "status": job[17],
                    "views": job[18],
                    "applications_count": job[19],
                    "created_at": job[20].isoformat() if job[20] else None,
                    "updated_at": job[21].isoformat() if job[21] else None,
                    "published_at": job[22].isoformat() if job[22] else None
                }
                for job in jobs
            ]
        }


@router.get("/api/jobs/posts/{job_id}")
async def get_job_post(
    job_id: int,
    current_user = Depends(get_current_user)
):
    """Get a specific job post"""

    with engine.connect() as conn:
        job = conn.execute(
            text("""
                SELECT
                    id, advertiser_id, user_id, title, description, requirements,
                    job_type, location_type, location, salary_min, salary_max,
                    salary_currency, salary_visibility, skills, experience_level,
                    education_level, application_deadline, application_email,
                    application_url, application_instructions, status, views,
                    applications_count, created_at, updated_at, published_at
                FROM job_posts
                WHERE id = :job_id
            """),
            {"job_id": job_id}
        ).fetchone()

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job post not found"
            )

        # Verify ownership
        if job[2] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view this job post"
            )

        return {
            "id": job[0],
            "advertiser_id": job[1],
            "user_id": job[2],
            "title": job[3],
            "description": job[4],
            "requirements": job[5],
            "job_type": job[6],
            "location_type": job[7],
            "location": job[8],
            "salary_min": job[9],
            "salary_max": job[10],
            "salary_currency": job[11],
            "salary_visibility": job[12],
            "skills": job[13] if job[13] else [],
            "experience_level": job[14],
            "education_level": job[15],
            "application_deadline": job[16].isoformat() if job[16] else None,
            "application_email": job[17],
            "application_url": job[18],
            "application_instructions": job[19],
            "status": job[20],
            "views": job[21],
            "applications_count": job[22],
            "created_at": job[23].isoformat() if job[23] else None,
            "updated_at": job[24].isoformat() if job[24] else None,
            "published_at": job[25].isoformat() if job[25] else None
        }


@router.put("/api/jobs/posts/{job_id}")
async def update_job_post(
    job_id: int,
    job_data: JobPostUpdate,
    current_user = Depends(get_current_user)
):
    """Update a job post"""

    with engine.connect() as conn:
        # Verify ownership
        job = conn.execute(
            text("SELECT user_id, status FROM job_posts WHERE id = :job_id"),
            {"job_id": job_id}
        ).fetchone()

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job post not found"
            )

        if job[0] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this job post"
            )

        # Build update query dynamically
        update_fields = []
        params = {"job_id": job_id}

        if job_data.title is not None:
            update_fields.append("title = :title")
            params["title"] = job_data.title
        if job_data.description is not None:
            update_fields.append("description = :description")
            params["description"] = job_data.description
        if job_data.requirements is not None:
            update_fields.append("requirements = :requirements")
            params["requirements"] = job_data.requirements
        if job_data.job_type is not None:
            update_fields.append("job_type = :job_type")
            params["job_type"] = job_data.job_type
        if job_data.location_type is not None:
            update_fields.append("location_type = :location_type")
            params["location_type"] = job_data.location_type
        if job_data.location is not None:
            update_fields.append("location = :location")
            params["location"] = job_data.location
        if job_data.salary_min is not None:
            update_fields.append("salary_min = :salary_min")
            params["salary_min"] = job_data.salary_min
        if job_data.salary_max is not None:
            update_fields.append("salary_max = :salary_max")
            params["salary_max"] = job_data.salary_max
        if job_data.salary_visibility is not None:
            update_fields.append("salary_visibility = :salary_visibility")
            params["salary_visibility"] = job_data.salary_visibility
        if job_data.skills is not None:
            update_fields.append("skills = :skills")
            params["skills"] = json.dumps(job_data.skills)
        if job_data.experience_level is not None:
            update_fields.append("experience_level = :experience_level")
            params["experience_level"] = job_data.experience_level
        if job_data.education_level is not None:
            update_fields.append("education_level = :education_level")
            params["education_level"] = job_data.education_level
        if job_data.application_deadline is not None:
            update_fields.append("application_deadline = :application_deadline")
            params["application_deadline"] = job_data.application_deadline
        if job_data.status is not None:
            update_fields.append("status = :status")
            params["status"] = job_data.status
            # If changing to active, set published_at
            if job_data.status == 'active' and job[1] != 'active':
                update_fields.append("published_at = CURRENT_TIMESTAMP")

        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )

        # Always update updated_at
        update_fields.append("updated_at = CURRENT_TIMESTAMP")

        query = f"""
            UPDATE job_posts
            SET {', '.join(update_fields)}
            WHERE id = :job_id
        """

        conn.execute(text(query), params)
        conn.commit()

        return {"message": "Job post updated successfully"}


@router.delete("/api/jobs/posts/{job_id}")
async def delete_job_post(
    job_id: int,
    current_user = Depends(get_current_user)
):
    """Delete a job post"""

    with engine.connect() as conn:
        # Verify ownership
        job = conn.execute(
            text("SELECT user_id FROM job_posts WHERE id = :job_id"),
            {"job_id": job_id}
        ).fetchone()

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job post not found"
            )

        if job[0] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this job post"
            )

        # Delete job post
        conn.execute(
            text("DELETE FROM job_posts WHERE id = :job_id"),
            {"job_id": job_id}
        )
        conn.commit()

        return {"message": "Job post deleted successfully"}


@router.put("/api/jobs/posts/{job_id}/status")
async def update_job_status(
    job_id: int,
    status_data: dict,
    current_user = Depends(get_current_user)
):
    """Update job post status (close, repost, pause, etc.)"""

    new_status = status_data.get("status")
    if new_status not in ["draft", "active", "paused", "closed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be one of: draft, active, paused, closed"
        )

    with engine.connect() as conn:
        # Verify ownership
        job = conn.execute(
            text("SELECT user_id, status FROM job_posts WHERE id = :job_id"),
            {"job_id": job_id}
        ).fetchone()

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job post not found"
            )

        if job[0] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this job post"
            )

        old_status = job[1]

        # Build update query
        update_fields = ["status = :new_status", "updated_at = CURRENT_TIMESTAMP"]
        params = {"job_id": job_id, "new_status": new_status}

        # Handle status-specific updates
        if new_status == "active" and old_status != "active":
            # Setting to active - update published_at
            update_fields.append("published_at = CURRENT_TIMESTAMP")
        elif new_status == "closed":
            # Closing the job - set closed_at
            update_fields.append("closed_at = CURRENT_TIMESTAMP")

        query = f"""
            UPDATE job_posts
            SET {', '.join(update_fields)}
            WHERE id = :job_id
        """

        conn.execute(text(query), params)
        conn.commit()

        return {
            "message": f"Job status updated to {new_status}",
            "job_id": job_id,
            "old_status": old_status,
            "new_status": new_status
        }


# ============================================
# JOB ANALYTICS ENDPOINTS
# ============================================

@router.get("/api/jobs/analytics/overview")
async def get_job_analytics_overview(
    current_user = Depends(get_current_user)
):
    """Get overall job posting analytics for the advertiser"""

    with engine.connect() as conn:
        # Get advertiser_id
        advertiser = conn.execute(
            text("SELECT id FROM advertiser_profiles WHERE user_id = :user_id"),
            {"user_id": current_user.id}
        ).fetchone()

        if not advertiser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only advertisers can view analytics"
            )

        advertiser_id = advertiser[0]

        # Get overview stats
        stats = conn.execute(
            text("""
                SELECT
                    COUNT(*) as total_posts,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_posts,
                    SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_posts,
                    SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_posts,
                    SUM(views) as total_views,
                    SUM(applications_count) as total_applications,
                    COALESCE(AVG(views), 0) as avg_views_per_post,
                    COALESCE(AVG(applications_count), 0) as avg_applications_per_post
                FROM job_posts
                WHERE advertiser_id = :advertiser_id
            """),
            {"advertiser_id": advertiser_id}
        ).fetchone()

        # Get hires count (applications with status 'hired')
        hires = conn.execute(
            text("""
                SELECT COUNT(*)
                FROM job_applications ja
                JOIN job_posts jp ON ja.job_id = jp.id
                WHERE jp.advertiser_id = :advertiser_id AND ja.status = 'hired'
            """),
            {"advertiser_id": advertiser_id}
        ).scalar()

        # Get avg days to hire
        avg_days = conn.execute(
            text("""
                SELECT AVG(EXTRACT(DAY FROM (hire_date - applied_at::date)))
                FROM job_applications ja
                JOIN job_posts jp ON ja.job_id = jp.id
                WHERE jp.advertiser_id = :advertiser_id
                AND ja.status = 'hired'
                AND hire_date IS NOT NULL
            """),
            {"advertiser_id": advertiser_id}
        ).scalar()

        total_posts = stats[0] or 0
        total_applications = stats[5] or 0

        return {
            "total_posts": total_posts,
            "active_posts": stats[1] or 0,
            "draft_posts": stats[2] or 0,
            "closed_posts": stats[3] or 0,
            "total_views": stats[4] or 0,
            "total_applications": total_applications,
            "total_hires": hires or 0,
            "avg_views_per_post": round(stats[6] or 0, 1),
            "avg_applications_per_post": round(stats[7] or 0, 1),
            "avg_days_to_hire": round(avg_days or 18, 1),
            "conversion_rate": round((hires / total_applications * 100) if total_applications > 0 else 0, 1)
        }


# ============================================
# JOB APPLICATIONS ENDPOINTS
# ============================================

@router.get("/api/jobs/applications")
async def get_all_applications(
    job_id: Optional[int] = Query(None),
    application_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user = Depends(get_current_user)
):
    """Get all applications across all jobs owned by the current user"""

    with engine.connect() as conn:
        # Build query to get applications for jobs owned by this user
        where_clauses = ["jp.user_id = :user_id"]
        params = {"user_id": current_user.id}

        if job_id:
            where_clauses.append("ja.job_id = :job_id")
            params["job_id"] = job_id

        if application_status:
            where_clauses.append("ja.status = :status")
            params["status"] = application_status

        where_clause = " AND ".join(where_clauses)

        # Get total count
        total = conn.execute(
            text(f"""
                SELECT COUNT(*)
                FROM job_applications ja
                JOIN job_posts jp ON ja.job_id = jp.id
                WHERE {where_clause}
            """),
            params
        ).scalar()

        # Get applications with pagination
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset

        applications = conn.execute(
            text(f"""
                SELECT
                    ja.id, ja.job_id, ja.applicant_user_id, ja.applicant_name, ja.applicant_email,
                    ja.applicant_phone, ja.cover_letter, ja.resume_url, ja.status, ja.rating,
                    ja.applied_at, ja.reviewed_at, jp.title as job_title, ja.expected_salary
                FROM job_applications ja
                JOIN job_posts jp ON ja.job_id = jp.id
                WHERE {where_clause}
                ORDER BY ja.applied_at DESC
                LIMIT :limit OFFSET :offset
            """),
            params
        ).fetchall()

        return {
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit,
            "applications": [
                {
                    "id": app[0],
                    "job_id": app[1],
                    "applicant_user_id": app[2],
                    "applicant_name": app[3],
                    "applicant_email": app[4],
                    "applicant_phone": app[5],
                    "cover_letter": app[6],
                    "resume_url": app[7],
                    "status": app[8],
                    "rating": app[9],
                    "applied_at": app[10].isoformat() if app[10] else None,
                    "reviewed_at": app[11].isoformat() if app[11] else None,
                    "job_title": app[12],
                    "expected_salary": app[13]
                }
                for app in applications
            ]
        }


@router.get("/api/jobs/posts/{job_id}/applications")
async def get_job_applications(
    job_id: int,
    application_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user = Depends(get_current_user)
):
    """Get all applications for a specific job"""

    with engine.connect() as conn:
        # Verify job ownership
        job = conn.execute(
            text("SELECT user_id FROM job_posts WHERE id = :job_id"),
            {"job_id": job_id}
        ).fetchone()

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job post not found"
            )

        if job[0] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view these applications"
            )

        # Build query
        where_clause = "WHERE job_id = :job_id"
        params = {"job_id": job_id}

        if application_status:
            where_clause += " AND status = :status"
            params["status"] = application_status

        # Get total count
        total = conn.execute(
            text(f"SELECT COUNT(*) FROM job_applications {where_clause}"),
            params
        ).scalar()

        # Get applications with pagination
        offset = (page - 1) * limit
        params["limit"] = limit
        params["offset"] = offset

        applications = conn.execute(
            text(f"""
                SELECT
                    id, job_id, applicant_user_id, applicant_name, applicant_email,
                    applicant_phone, cover_letter, resume_url, status, rating,
                    applied_at, reviewed_at, expected_salary
                FROM job_applications
                {where_clause}
                ORDER BY applied_at DESC
                LIMIT :limit OFFSET :offset
            """),
            params
        ).fetchall()

        return {
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit,
            "applications": [
                {
                    "id": app[0],
                    "job_id": app[1],
                    "applicant_user_id": app[2],
                    "applicant_name": app[3],
                    "applicant_email": app[4],
                    "applicant_phone": app[5],
                    "cover_letter": app[6],
                    "resume_url": app[7],
                    "status": app[8],
                    "rating": app[9],
                    "applied_at": app[10].isoformat() if app[10] else None,
                    "reviewed_at": app[11].isoformat() if app[11] else None,
                    "expected_salary": app[12]
                }
                for app in applications
            ]
        }


class ApplicationStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    rating: Optional[int] = None

@router.put("/api/jobs/applications/{application_id}/status")
async def update_application_status(
    application_id: int,
    status_data: ApplicationStatusUpdate,
    current_user = Depends(get_current_user)
):
    """Update job application status"""

    with engine.connect() as conn:
        # Verify ownership through job post
        application = conn.execute(
            text("""
                SELECT ja.job_id, jp.user_id
                FROM job_applications ja
                JOIN job_posts jp ON ja.job_id = jp.id
                WHERE ja.id = :application_id
            """),
            {"application_id": application_id}
        ).fetchone()

        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )

        if application[1] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this application"
            )

        # Validate status
        valid_statuses = ['new', 'reviewing', 'shortlisted', 'interviewed', 'offered', 'hired', 'rejected']
        if status_data.status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )

        # Update application
        update_fields = ["status = :status", "status_updated_at = CURRENT_TIMESTAMP"]
        params = {"application_id": application_id, "status": status_data.status}

        if status_data.notes:
            update_fields.append("notes = :notes")
            params["notes"] = status_data.notes

        if status_data.rating:
            update_fields.append("rating = :rating")
            params["rating"] = status_data.rating

        if status_data.status in ['reviewing', 'shortlisted', 'interviewed']:
            update_fields.append("reviewed_at = CURRENT_TIMESTAMP")

        if status_data.status == 'hired':
            update_fields.append("hire_date = CURRENT_DATE")

        conn.execute(
            text(f"""
                UPDATE job_applications
                SET {', '.join(update_fields)}
                WHERE id = :application_id
            """),
            params
        )
        conn.commit()

        return {"message": "Application status updated successfully"}


print("[OK] Job Board API endpoints loaded successfully")
