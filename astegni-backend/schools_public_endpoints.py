"""
Public Schools Endpoints

Public endpoints for listing and viewing schools
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, desc
from typing import Optional

# Import from modular structure (path already set up by app.py)
from models import SessionLocal

router = APIRouter()

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/api/schools")
async def get_schools(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get list of schools

    Parameters:
    - limit: Number of schools to return (default: 100, max: 1000)
    - offset: Number of schools to skip (default: 0)
    - status: Filter by status (verified, approved, pending, rejected)
    - search: Search by school name
    """
    try:
        # Build query
        query = """
            SELECT
                id,
                name,
                type,
                level,
                location,
                email,
                phone,
                student_count,
                rating,
                established_year,
                principal,
                status,
                created_at
            FROM schools
            WHERE 1=1
        """
        params = {}

        # Filter by status (default to verified/approved for public endpoint)
        if status:
            query += " AND status = :status"
            params['status'] = status
        else:
            query += " AND status IN ('verified', 'approved')"

        # Search filter
        if search:
            query += " AND LOWER(name) LIKE LOWER(:search)"
            params['search'] = f"%{search}%"

        # Order by rating and student count
        query += " ORDER BY rating DESC NULLS LAST, student_count DESC NULLS LAST"

        # Pagination
        query += " LIMIT :limit OFFSET :offset"
        params['limit'] = limit
        params['offset'] = offset

        # Execute query
        result = db.execute(text(query), params)
        schools = result.fetchall()

        # Format response
        schools_list = []
        for school in schools:
            schools_list.append({
                "id": school.id,
                "name": school.name,
                "type": school.type,
                "level": school.level,
                "location": school.location,
                "email": school.email,
                "phone": school.phone,
                "student_count": school.student_count or 0,
                "rating": float(school.rating) if school.rating else 0.0,
                "established_year": school.established_year,
                "principal": school.principal,
                "status": school.status,
                "created_at": school.created_at.isoformat() if school.created_at else None
            })

        # Get total count
        count_query = "SELECT COUNT(*) FROM schools WHERE 1=1"
        if status:
            count_query += " AND status = :status"
        else:
            count_query += " AND status IN ('verified', 'approved')"

        if search:
            count_query += " AND LOWER(name) LIKE LOWER(:search)"

        count_params = {k: v for k, v in params.items() if k != 'limit' and k != 'offset'}
        total = db.execute(text(count_query), count_params).scalar() or 0

        return {
            "schools": schools_list,
            "total": total,
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get schools: {str(e)}")


@router.get("/api/schools/{school_id}")
async def get_school(
    school_id: int,
    db: Session = Depends(get_db)
):
    """
    Get single school by ID
    """
    try:
        result = db.execute(text("""
            SELECT
                id,
                name,
                type,
                level,
                location,
                email,
                phone,
                student_count,
                rating,
                established_year,
                principal,
                status,
                created_at,
                updated_at
            FROM schools
            WHERE id = :school_id
        """), {"school_id": school_id})

        school = result.fetchone()

        if not school:
            raise HTTPException(status_code=404, detail="School not found")

        return {
            "id": school.id,
            "name": school.name,
            "type": school.type,
            "level": school.level,
            "location": school.location,
            "email": school.email,
            "phone": school.phone,
            "student_count": school.student_count or 0,
            "rating": float(school.rating) if school.rating else 0.0,
            "established_year": school.established_year,
            "principal": school.principal,
            "status": school.status,
            "created_at": school.created_at.isoformat() if school.created_at else None,
            "updated_at": school.updated_at.isoformat() if school.updated_at else None
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get school: {str(e)}")
