from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_  # ADD THIS IMPORT
from typing import List, Optional, Dict
from pydantic import BaseModel
from datetime import datetime
from app import get_db, User
from tutor_models import TutorProfile
from cache import cache_key_wrapper

router = APIRouter()

class TutorResponse(BaseModel):
    id: int
    name: str
    email: str
    profile_picture: Optional[str]
    courses: List[str]
    grades: List[str]
    course_type: Optional[str]
    location: Optional[str]
    teaches_at: Optional[str]
    learning_method: Optional[str]
    experience: int
    bio: Optional[str]
    quote: Optional[str]
    price: float
    currency: str
    rating: float
    rating_count: int
    rating_breakdown: dict
    is_verified: bool
    is_favorite: bool = False
    
class Config:
    from_attributes = True

# SINGLE ENDPOINT WITH PAGINATION
@router.get("/api/tutors")
def get_tutors(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    course_type: Optional[str] = None,
    location: Optional[str] = None,
    learning_method: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get tutors with pagination and filters"""
    
    # Base query with eager loading
    query = db.query(TutorProfile).options(
        joinedload(TutorProfile.user)
    ).join(User).filter(
        TutorProfile.profile_complete == True,
        TutorProfile.is_active == True,
        User.is_active == True
    )
    
    # Apply filters
    if course_type:
        query = query.filter(TutorProfile.course_type == course_type)
    
    if location:
        query = query.filter(TutorProfile.location.ilike(f"%{location}%"))
    
    if learning_method:
        query = query.filter(TutorProfile.learning_method == learning_method)
    
    if min_price is not None:
        query = query.filter(TutorProfile.price >= min_price)
    
    if max_price is not None:
        query = query.filter(TutorProfile.price <= max_price)
    
    if min_rating is not None:
        query = query.filter(TutorProfile.rating >= min_rating)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(  # Use or_ instead of db.or_
                User.first_name.ilike(search_term),
                User.last_name.ilike(search_term),
                TutorProfile.bio.ilike(search_term),
                TutorProfile.location.ilike(search_term),
                TutorProfile.teaches_at.ilike(search_term)
            )
        )
    
    # Get total count before pagination
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit  # Fixed syntax error
    tutors = query.offset(offset).limit(limit).all()
    
    # Format response
    result = []
    for tutor in tutors:
        user = tutor.user
        result.append(TutorResponse(
            id=tutor.id,
            name=f"{user.first_name} {user.last_name}",
            email=user.email,
            profile_picture=user.profile_picture,
            courses=tutor.courses or [],
            grades=tutor.grades or [],
            course_type=tutor.course_type,
            location=tutor.location,
            teaches_at=tutor.teaches_at,
            learning_method=tutor.learning_method,
            experience=tutor.experience,
            bio=tutor.bio,
            quote=tutor.quote,
            price=tutor.price,
            currency=tutor.currency,
            rating=tutor.rating,
            rating_count=tutor.rating_count,
            rating_breakdown=tutor.rating_breakdown or {},
            is_verified=tutor.is_verified,
            is_favorite=False
        ))
    
    # Return paginated response
    return {
        "tutors": result,
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/api/tutors/{tutor_id}", response_model=TutorResponse)
def get_tutor_by_id(tutor_id: int, db: Session = Depends(get_db)):
    """Get a specific tutor by ID"""
    
    tutor = db.query(TutorProfile).options(
        joinedload(TutorProfile.user)
    ).filter(
        TutorProfile.id == tutor_id,
        TutorProfile.is_active == True
    ).first()
    
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    
    user = tutor.user
    return TutorResponse(
        id=tutor.id,
        name=f"{user.first_name} {user.last_name}",
        email=user.email,
        profile_picture=user.profile_picture,
        courses=tutor.courses or [],
        grades=tutor.grades or [],
        course_type=tutor.course_type,
        location=tutor.location,
        teaches_at=tutor.teaches_at,
        learning_method=tutor.learning_method,
        experience=tutor.experience,
        bio=tutor.bio,
        quote=tutor.quote,
        price=tutor.price,
        currency=tutor.currency,
        rating=tutor.rating,
        rating_count=tutor.rating_count,
        rating_breakdown=tutor.rating_breakdown or {},
        is_verified=tutor.is_verified,
        is_favorite=False
    )

