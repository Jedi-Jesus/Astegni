"""
Manage Contents Profile Endpoints
Handles profile data for the manage-contents admin page
Two departments have access: manage-contents and manage-system-settings
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from models import get_db
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Allowed departments for this page
ALLOWED_DEPARTMENTS = ['manage-contents', 'manage-system-settings']

def verify_department_access(email: str, db: Session):
    """
    Verify that the admin has access to manage-contents page
    Access granted to: manage-contents and manage-system-settings departments
    """
    query = text("""
        SELECT departments
        FROM admin_profile
        WHERE email = :email
    """)

    result = db.execute(query, {"email": email}).fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="Admin not found")

    departments = result.departments if result.departments else []

    # Check if admin has any of the allowed departments
    has_access = any(dept in ALLOWED_DEPARTMENTS for dept in departments)

    if not has_access:
        raise HTTPException(
            status_code=403,
            detail=f"Access denied. Required departments: {', '.join(ALLOWED_DEPARTMENTS)}"
        )

    return True

@router.get("/api/admin/manage-contents-profile/by-email/{email}")
async def get_manage_contents_profile_by_email(email: str, db: Session = Depends(get_db)):
    """
    Get manage-contents profile data by admin email
    Fetches data from:
    - admin_profile (personal information)
    - manage_contents_profile (department-specific stats and settings)

    Access Control: manage-contents and manage-system-settings departments only
    """
    try:
        # Verify department access
        verify_department_access(email, db)
        # Query to get combined profile data
        query = text("""
            SELECT
                -- From admin_profile (personal information)
                ap.id as admin_id,
                ap.email,
                ap.username,
                ap.first_name,
                ap.father_name,
                ap.grandfather_name,
                ap.phone_number,
                ap.bio,
                ap.quote,
                ap.profile_picture,
                ap.cover_picture,
                ap.departments,

                -- From manage_contents_profile (department-specific data)
                mcp.position,
                mcp.rating,
                mcp.total_reviews,
                mcp.badges,
                mcp.employee_id,
                mcp.joined_date,
                mcp.last_active,
                mcp.verified_contents,
                mcp.requested_contents,
                mcp.rejected_contents,
                mcp.flagged_contents,
                mcp.total_storage_gb,
                mcp.approval_rate,
                mcp.avg_processing_hours,
                mcp.user_satisfaction
            FROM admin_profile ap
            LEFT JOIN manage_contents_profile mcp ON ap.id = mcp.admin_id
            WHERE ap.email = :email
        """)

        result = db.execute(query, {"email": email}).fetchone()

        if not result:
            raise HTTPException(status_code=404, detail=f"Admin profile not found for email: {email}")

        # Convert row to dictionary
        profile_data = {
            # Basic admin profile
            "admin_id": result.admin_id,
            "email": result.email,
            "username": result.username,
            "first_name": result.first_name,
            "father_name": result.father_name,
            "grandfather_name": result.grandfather_name,
            "phone_number": result.phone_number,
            "bio": result.bio,
            "quote": result.quote,
            "profile_picture": result.profile_picture,
            "cover_picture": result.cover_picture,
            "departments": result.departments,

            # Manage contents profile data
            "contents_profile": {
                "position": result.position or "Content Management",
                "rating": float(result.rating) if result.rating else 4.5,
                "total_reviews": result.total_reviews or 0,
                "badges": result.badges if result.badges else [
                    {"text": "✔ System Administrator", "class": "verified"},
                    {"text": "📁 Content Management", "class": "school"},
                    {"text": "📊 Content Expert", "class": "expert"}
                ],
                "employee_id": result.employee_id or "ADM-2024-001",
                "joined_date": result.joined_date or "January 2020",
                "last_active": result.last_active,

                # Statistics
                "verified_contents": result.verified_contents or 0,
                "requested_contents": result.requested_contents or 0,
                "rejected_contents": result.rejected_contents or 0,
                "flagged_contents": result.flagged_contents or 0,
                "total_storage_gb": float(result.total_storage_gb) if result.total_storage_gb else 0.0,
                "approval_rate": float(result.approval_rate) if result.approval_rate else 93.0,
                "avg_processing_hours": float(result.avg_processing_hours) if result.avg_processing_hours else 2.0,
                "user_satisfaction": float(result.user_satisfaction) if result.user_satisfaction else 96.0
            }
        }

        return profile_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching manage-contents profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")


@router.put("/api/admin/manage-contents-profile")
async def update_manage_contents_profile(
    admin_id: int,
    first_name: Optional[str] = None,
    father_name: Optional[str] = None,
    grandfather_name: Optional[str] = None,
    username: Optional[str] = None,
    phone_number: Optional[str] = None,
    bio: Optional[str] = None,
    quote: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Update manage-contents admin profile
    Only updates admin_profile table (personal information)
    Department-specific stats are updated separately by system
    """
    try:
        # Build update query dynamically based on provided fields
        update_fields = []
        params = {"admin_id": admin_id}

        if first_name is not None:
            update_fields.append("first_name = :first_name")
            params["first_name"] = first_name

        if father_name is not None:
            update_fields.append("father_name = :father_name")
            params["father_name"] = father_name

        if grandfather_name is not None:
            update_fields.append("grandfather_name = :grandfather_name")
            params["grandfather_name"] = grandfather_name

        if username is not None:
            update_fields.append("username = :username")
            params["username"] = username

        if phone_number is not None:
            update_fields.append("phone_number = :phone_number")
            params["phone_number"] = phone_number

        if bio is not None:
            update_fields.append("bio = :bio")
            params["bio"] = bio

        if quote is not None:
            update_fields.append("quote = :quote")
            params["quote"] = quote

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Execute update
        query = text(f"""
            UPDATE admin_profile
            SET {', '.join(update_fields)}
            WHERE id = :admin_id
        """)

        result = db.execute(query, params)
        db.commit()

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        return {"message": "Profile updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")


@router.get("/api/admin/manage-contents-reviews/{admin_id}")
async def get_manage_contents_reviews(admin_id: int, db: Session = Depends(get_db)):
    """
    Get recent reviews for manage-contents admin
    Filters by admin_id and department (manage-contents)
    """
    try:
        query = text("""
            SELECT
                review_id,
                reviewer_name,
                reviewer_role,
                rating,
                comment as review_text,
                created_at as review_date
            FROM admin_reviews
            WHERE admin_id = :admin_id
              AND department = 'manage-contents'
            ORDER BY
                created_at DESC
            LIMIT 10
        """)

        result = db.execute(query, {"admin_id": admin_id}).fetchall()

        reviews = []
        for row in result:
            reviews.append({
                "review_id": row.review_id,
                "reviewer_name": row.reviewer_name,
                "reviewer_role": row.reviewer_role,
                "rating": row.rating,
                "review_text": row.review_text,
                "review_date": row.review_date.isoformat() if row.review_date else None
            })

        return {"reviews": reviews}

    except Exception as e:
        logger.error(f"Error fetching reviews: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch reviews: {str(e)}")
