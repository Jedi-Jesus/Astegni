"""
Parent Profile and Review Endpoints for Astegni Platform

CORRECTED ARCHITECTURE:
======================

1. ADDING A CHILD:
   - Parent clicks "Add Child" button
   - Fills: first_name, father_name, grandfather_name, email/phone, gender, date_of_birth
   - System creates user account with role="student" and temp password
   - Temp password sent via email/SMS
   - Child's user_id added to parent's children_ids array
   - Parent's user_id added to child's student_profiles.parent_id array
   - Child logs in with temp password and completes their student profile

2. ADDING A CO-PARENT:
   - Parent clicks "Add Co-Parent" button
   - Fills: first_name, father_name, grandfather_name, email/phone, gender, relationship_type
   - System creates user account with role="parent" and temp password
   - Temp password sent via email/SMS
   - ALL children from parent's children_ids added to co-parent's children_ids
   - Co-parent's user_id added to ALL children's student_profiles.parent_id arrays
   - Co-parent logs in with temp password and completes their parent profile

3. MANY-TO-MANY RELATIONSHIP:
   - parent_profiles.children_ids = [child1_user_id, child2_user_id, ...]
   - student_profiles.parent_id = [parent1_user_id, parent2_user_id, ...]
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List, Optional
from datetime import datetime, date
import secrets

# Import models
from models import (
    Base, User, ParentProfile, StudentProfile, ParentReview, ChildProfile,
    get_db, ParentProfileUpdate, ParentProfileResponse,
    ParentReviewCreate, ParentReviewUpdate, ParentReviewResponse,
    ChildProfileCreate, ChildProfileUpdate, ChildProfileResponse
)
from utils import get_current_user, hash_password

router = APIRouter()

# ============================================
# PARENT PROFILE ENDPOINTS
# ============================================

@router.get("/api/parent/profile", response_model=ParentProfileResponse)
async def get_parent_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's parent profile"""
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        # Create new parent profile
        parent_profile = ParentProfile(
            user_id=current_user.id,
            username=None
        )
        db.add(parent_profile)
        db.commit()
        db.refresh(parent_profile)

    return parent_profile


@router.put("/api/parent/profile")
async def update_parent_profile(
    profile_data: ParentProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update parent profile"""
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    # Update fields
    update_data = profile_data.dict(exclude_unset=True)

    for key, value in update_data.items():
        if hasattr(parent_profile, key):
            setattr(parent_profile, key, value)

    # Calculate profile completion
    total_fields = 7
    completion = 0
    if parent_profile.username: completion += 1
    if parent_profile.bio: completion += 1
    if parent_profile.quote: completion += 1
    if parent_profile.relationship_type: completion += 1
    if parent_profile.location: completion += 1
    if parent_profile.profile_picture: completion += 1
    if parent_profile.cover_image: completion += 1

    parent_profile.profile_completion = (completion / total_fields) * 100
    parent_profile.profile_complete = parent_profile.profile_completion >= 80

    db.commit()
    db.refresh(parent_profile)

    return {"message": "Profile updated successfully", "profile": parent_profile}


@router.get("/api/parent/{parent_id}")
async def get_parent_by_id(
    parent_id: int,
    by_user_id: bool = False,
    db: Session = Depends(get_db)
):
    """Get specific parent profile (public view)"""
    if by_user_id:
        parent_profile = db.query(ParentProfile).filter(
            ParentProfile.user_id == parent_id
        ).first()
    else:
        parent_profile = db.query(ParentProfile).filter(
            ParentProfile.id == parent_id
        ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    user = db.query(User).filter(User.id == parent_profile.user_id).first()

    # Get children info
    children_info = []
    if parent_profile.children_ids:
        for child_id in parent_profile.children_ids:
            child_user = db.query(User).filter(User.id == child_id).first()
            if child_user:
                child_student = db.query(StudentProfile).filter(
                    StudentProfile.user_id == child_user.id
                ).first()
                children_info.append({
                    "id": child_user.id,
                    "name": f"{child_user.first_name} {child_user.father_name}",
                    "profile_picture": child_student.profile_picture if child_student else None,
                    "grade_level": child_student.grade_level if child_student else None
                })

    return {
        "id": parent_profile.id,
        "user_id": parent_profile.user_id,
        "username": parent_profile.username,
        "name": f"{user.first_name} {user.father_name} {user.grandfather_name}",
        "bio": parent_profile.bio,
        "quote": parent_profile.quote,
        "relationship_type": parent_profile.relationship_type,
        "location": parent_profile.location,
        "children_ids": parent_profile.children_ids or [],
        "children_info": children_info,
        "rating": parent_profile.rating,
        "rating_count": parent_profile.rating_count,
        "is_verified": parent_profile.is_verified,
        "profile_picture": parent_profile.profile_picture,
        "cover_image": parent_profile.cover_image,
        "total_children": parent_profile.total_children,
        "total_sessions_booked": parent_profile.total_sessions_booked,
        "total_amount_spent": parent_profile.total_amount_spent,
        "created_at": parent_profile.created_at
    }


# ============================================
# CHILD MANAGEMENT (NEW ARCHITECTURE)
# ============================================

@router.post("/api/parent/add-child")
async def add_child(
    first_name: str,
    father_name: str,
    grandfather_name: str,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    gender: Optional[str] = None,
    date_of_birth: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a child to parent's profile

    Creates a new user account with STUDENT role and temp password.
    Child will complete their student profile after logging in.
    """
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    # Get parent profile
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    # Validate email or phone
    if not email and not phone:
        raise HTTPException(status_code=400, detail="Email or phone is required")

    # Check if user already exists
    existing_user = None
    if email:
        existing_user = db.query(User).filter(User.email == email).first()
    if not existing_user and phone:
        existing_user = db.query(User).filter(User.phone == phone).first()

    if existing_user:
        if "student" not in existing_user.roles:
            raise HTTPException(status_code=400, detail="User exists but is not a student")

        # Link existing student to parent
        if not parent_profile.children_ids:
            parent_profile.children_ids = []
        if existing_user.id not in parent_profile.children_ids:
            parent_profile.children_ids = parent_profile.children_ids + [existing_user.id]
            parent_profile.total_children = len(parent_profile.children_ids)

        # Update student's parent_id array
        student_profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == existing_user.id
        ).first()
        if student_profile:
            if not student_profile.parent_id:
                student_profile.parent_id = []
            if current_user.id not in student_profile.parent_id:
                student_profile.parent_id = student_profile.parent_id + [current_user.id]

        db.commit()

        return {
            "message": "Child linked successfully",
            "user_id": existing_user.id,
            "existing": True
        }

    # Create new student user with temporary password
    temp_password = secrets.token_urlsafe(12)

    new_user = User(
        first_name=first_name,
        father_name=father_name,
        grandfather_name=grandfather_name,
        email=email,
        phone=phone,
        gender=gender,
        password_hash=hash_password(temp_password),
        roles=["student"],  # STUDENT ROLE
        active_role="student"
    )
    db.add(new_user)
    db.flush()

    # Create basic student profile
    student_profile = StudentProfile(
        user_id=new_user.id,
        parent_id=[current_user.id]  # Add parent to student's parent_id array
    )
    db.add(student_profile)

    # Update parent's children_ids array
    if not parent_profile.children_ids:
        parent_profile.children_ids = []
    parent_profile.children_ids = parent_profile.children_ids + [new_user.id]
    parent_profile.total_children = len(parent_profile.children_ids)

    db.commit()

    # TODO: Send temp password via email/SMS
    # send_email(email, "Your Astegni Account", f"Your temporary password is: {temp_password}")
    # send_sms(phone, f"Your Astegni temporary password is: {temp_password}")

    return {
        "message": "Child created successfully. Temporary password sent via email/SMS.",
        "user_id": new_user.id,
        "temp_password": temp_password,  # Remove in production - only send via email/SMS
        "email": email,
        "phone": phone,
        "existing": False
    }


@router.get("/api/parent/children")
async def get_parent_children(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all children of current parent"""
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    children = []
    if parent_profile.children_ids:
        for child_id in parent_profile.children_ids:
            child_user = db.query(User).filter(User.id == child_id).first()
            if child_user:
                student_profile = db.query(StudentProfile).filter(
                    StudentProfile.user_id == child_user.id
                ).first()

                children.append({
                    "user_id": child_user.id,
                    "name": f"{child_user.first_name} {child_user.father_name} {child_user.grandfather_name}",
                    "email": child_user.email,
                    "phone": child_user.phone,
                    "gender": child_user.gender,
                    "profile_picture": student_profile.profile_picture if student_profile else None,
                    "grade_level": student_profile.grade_level if student_profile else None,
                    "studying_at": student_profile.studying_at if student_profile else None,
                    "created_at": child_user.created_at
                })

    return {"children": children, "total": len(children)}


# ============================================
# CO-PARENT MANAGEMENT
# ============================================

@router.post("/api/parent/add-coparent")
async def add_coparent(
    first_name: str,
    father_name: str,
    grandfather_name: str,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    gender: Optional[str] = None,
    relationship_type: str = "Co-parent",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a co-parent (mother/father/guardian)

    Creates a new user account with PARENT role and temp password.
    Co-parent inherits ALL children from current parent.
    All children's parent_id arrays updated to include co-parent.
    """
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    # Get parent profile
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    # Check if parent has children
    if not parent_profile.children_ids or len(parent_profile.children_ids) == 0:
        raise HTTPException(status_code=400, detail="Please add at least one child before adding a co-parent")

    # Validate email or phone
    if not email and not phone:
        raise HTTPException(status_code=400, detail="Email or phone is required")

    # Check if user already exists
    existing_user = None
    if email:
        existing_user = db.query(User).filter(User.email == email).first()
    if not existing_user and phone:
        existing_user = db.query(User).filter(User.phone == phone).first()

    if existing_user:
        if "parent" not in existing_user.roles:
            raise HTTPException(status_code=400, detail="User exists but is not a parent")

        # Get co-parent's profile
        coparent_profile = db.query(ParentProfile).filter(
            ParentProfile.user_id == existing_user.id
        ).first()

        if coparent_profile:
            # Link all children to co-parent
            if not coparent_profile.children_ids:
                coparent_profile.children_ids = []
            coparent_profile.children_ids = list(set(coparent_profile.children_ids + parent_profile.children_ids))
            coparent_profile.total_children = len(coparent_profile.children_ids)

            # Update all children's parent_id arrays to link co-parent
            for child_id in parent_profile.children_ids:
                student_profile = db.query(StudentProfile).filter(
                    StudentProfile.user_id == child_id
                ).first()
                if student_profile:
                    if not student_profile.parent_id:
                        student_profile.parent_id = []
                    if existing_user.id not in student_profile.parent_id:
                        student_profile.parent_id = student_profile.parent_id + [existing_user.id]

            db.commit()

            return {
                "message": "Co-parent linked successfully",
                "user_id": existing_user.id,
                "existing": True
            }

    # Create new parent user with temporary password
    temp_password = secrets.token_urlsafe(12)

    new_user = User(
        first_name=first_name,
        father_name=father_name,
        grandfather_name=grandfather_name,
        email=email,
        phone=phone,
        gender=gender,
        password_hash=hash_password(temp_password),
        roles=["parent"],  # PARENT ROLE
        active_role="parent"
    )
    db.add(new_user)
    db.flush()

    # Create parent profile for co-parent with all children
    coparent_profile = ParentProfile(
        user_id=new_user.id,
        relationship_type=relationship_type,
        children_ids=parent_profile.children_ids.copy(),  # Inherit all children
        total_children=len(parent_profile.children_ids)
    )
    db.add(coparent_profile)

    # Update all children's parent_id arrays to include co-parent
    # This is the SINGLE SOURCE OF TRUTH for co-parent relationships
    for child_id in parent_profile.children_ids:
        student_profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == child_id
        ).first()
        if student_profile:
            if not student_profile.parent_id:
                student_profile.parent_id = []
            student_profile.parent_id = student_profile.parent_id + [new_user.id]

    db.commit()

    # TODO: Send temp password via email/SMS
    # send_email(email, "Your Astegni Account", f"Your temporary password is: {temp_password}")
    # send_sms(phone, f"Your Astegni temporary password is: {temp_password}")

    return {
        "message": "Co-parent created successfully. Temporary password sent via email/SMS.",
        "user_id": new_user.id,
        "temp_password": temp_password,  # Remove in production - only send via email/SMS
        "email": email,
        "phone": phone,
        "children_linked": len(parent_profile.children_ids),
        "existing": False
    }


@router.get("/api/parent/coparents")
async def get_coparents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all co-parents by deriving from children's parent_id arrays

    SINGLE SOURCE OF TRUTH: Co-parent relationships stored in student_profiles.parent_id
    This eliminates redundant coparent_ids field and prevents data inconsistency.
    """
    if "parent" not in current_user.roles:
        raise HTTPException(status_code=403, detail="User does not have parent role")

    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == current_user.id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    # Derive co-parents from children's parent_id arrays
    coparent_user_ids = set()

    if parent_profile.children_ids:
        for child_id in parent_profile.children_ids:
            student_profile = db.query(StudentProfile).filter(
                StudentProfile.user_id == child_id
            ).first()

            if student_profile and student_profile.parent_id:
                # Add all parent IDs except current user
                for parent_user_id in student_profile.parent_id:
                    if parent_user_id != current_user.id:
                        coparent_user_ids.add(parent_user_id)

    # Fetch co-parent details
    coparents = []
    for coparent_user_id in coparent_user_ids:
        parent_user = db.query(User).filter(User.id == coparent_user_id).first()
        if parent_user:
            coparent_profile = db.query(ParentProfile).filter(
                ParentProfile.user_id == coparent_user_id
            ).first()

            coparents.append({
                "user_id": parent_user.id,
                "name": f"{parent_user.first_name} {parent_user.father_name} {parent_user.grandfather_name}",
                "email": parent_user.email,
                "phone": parent_user.phone,
                "gender": parent_user.gender,
                "relationship_type": coparent_profile.relationship_type if coparent_profile else None,
                "profile_picture": coparent_profile.profile_picture if coparent_profile else None,
                "created_at": parent_user.created_at
            })

    return {"coparents": coparents, "total": len(coparents)}


# ============================================
# PARENT REVIEW ENDPOINTS
# ============================================

@router.post("/api/parent/{parent_id}/review", response_model=ParentReviewResponse)
async def create_parent_review(
    parent_id: int,
    review_data: ParentReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a review for a parent (by tutors) - 4-Factor Rating System"""
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.id == parent_id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    if "tutor" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Only tutors can review parents")

    # Check for existing review
    existing_review = db.query(ParentReview).filter(
        ParentReview.parent_id == parent_id,
        ParentReview.reviewer_id == current_user.id
    ).first()

    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this parent")

    review = ParentReview(
        parent_id=parent_id,
        reviewer_id=current_user.id,
        user_role="tutor",
        **review_data.dict()
    )
    db.add(review)

    # Update parent's average rating
    reviews = db.query(ParentReview).filter(ParentReview.parent_id == parent_id).all()
    total_rating = sum(r.rating for r in reviews) + review_data.rating
    parent_profile.rating = total_rating / (len(reviews) + 1)
    parent_profile.rating_count = len(reviews) + 1

    db.commit()
    db.refresh(review)

    return review


@router.get("/api/parent/{parent_id}/reviews", response_model=List[ParentReviewResponse])
async def get_parent_reviews(
    parent_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get all reviews for a parent"""
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.id == parent_id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    reviews = db.query(ParentReview).filter(
        ParentReview.parent_id == parent_id
    ).order_by(ParentReview.created_at.desc()).offset(skip).limit(limit).all()

    return reviews


@router.get("/api/parent/reviews/stats/{parent_id}")
async def get_parent_review_stats(
    parent_id: int,
    db: Session = Depends(get_db)
):
    """Get aggregated review statistics for a parent"""
    parent_profile = db.query(ParentProfile).filter(
        ParentProfile.id == parent_id
    ).first()

    if not parent_profile:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    reviews = db.query(ParentReview).filter(
        ParentReview.parent_id == parent_id
    ).all()

    if not reviews:
        return {
            "total_reviews": 0,
            "average_rating": 0.0,
            "engagement_with_tutor_avg": 0.0,
            "engagement_with_child_avg": 0.0,
            "responsiveness_avg": 0.0,
            "payment_consistency_avg": 0.0
        }

    return {
        "total_reviews": len(reviews),
        "average_rating": parent_profile.rating,
        "engagement_with_tutor_avg": sum(r.engagement_with_tutor_rating for r in reviews) / len(reviews),
        "engagement_with_child_avg": sum(r.engagement_with_child_rating for r in reviews) / len(reviews),
        "responsiveness_avg": sum(r.responsiveness_rating for r in reviews) / len(reviews),
        "payment_consistency_avg": sum(r.payment_consistency_rating for r in reviews) / len(reviews)
    }
