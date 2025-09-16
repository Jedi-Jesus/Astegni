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

# Add these endpoints to your tutor_endpoints.py file

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

# ============================================
# PYDANTIC MODELS FOR REQUEST/RESPONSE
# ============================================

class CertificationCreate(BaseModel):
    institution: str
    title: str
    field: str
    type: str
    date: str
    image_url: Optional[str] = None

class ExperienceCreate(BaseModel):
    title: str
    organization: str
    start_date: str
    end_date: Optional[str] = None
    is_current: bool = False
    description: Optional[str] = None

class AchievementCreate(BaseModel):
    title: str
    issuer: str
    date: str
    description: Optional[str] = None
    image_url: Optional[str] = None

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    price: Optional[float] = None
    experience: Optional[int] = None
    courses: Optional[List[str]] = None
    grades: Optional[List[str]] = None
    bio: Optional[str] = None
    quote: Optional[str] = None
    teaching_methods: Optional[List[str]] = None

# ============================================
# CERTIFICATION ENDPOINTS
# ============================================

@router.post("/api/tutor/certifications")
async def add_certification(
    institution: str = Form(...),
    title: str = Form(...),
    field: str = Form(...),
    type: str = Form(...),
    date: str = Form(...),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new certification for the tutor"""
    
    # Verify user is a tutor
    tutor_profile = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor_profile:
        raise HTTPException(status_code=403, detail="Only tutors can add certifications")
    
    # Handle image upload if provided
    image_url = None
    if image:
        # Save the image file
        file_extension = image.filename.split('.')[-1]
        file_name = f"cert_{current_user.id}_{datetime.now().timestamp()}.{file_extension}"
        file_path = f"uploads/certifications/{file_name}"
        
        os.makedirs("uploads/certifications", exist_ok=True)
        
        with open(file_path, "wb") as buffer:
            content = await image.read()
            buffer.write(content)
        
        image_url = f"/uploads/certifications/{file_name}"
    
    # Create certification record
    new_cert = TutorCertification(
        tutor_id=tutor_profile.id,
        institution=institution,
        title=title,
        field=field,
        type=type,
        date=datetime.strptime(date, "%Y-%m-%d"),
        image_url=image_url,
        verified=False  # Admin needs to verify
    )
    
    db.add(new_cert)
    db.commit()
    db.refresh(new_cert)
    
    return {"message": "Certification added successfully", "id": new_cert.id}

@router.get("/api/tutor/certifications")
def get_certifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all certifications for the current tutor"""
    
    tutor_profile = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor_profile:
        return []
    
    certifications = db.query(TutorCertification).filter(
        TutorCertification.tutor_id == tutor_profile.id
    ).order_by(TutorCertification.date.desc()).all()
    
    return [
        {
            "id": cert.id,
            "institution": cert.institution,
            "title": cert.title,
            "field": cert.field,
            "type": cert.type,
            "date": cert.date.isoformat(),
            "image_url": cert.image_url,
            "verified": cert.verified
        }
        for cert in certifications
    ]

@router.delete("/api/tutor/certifications/{cert_id}")
def delete_certification(
    cert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a certification"""
    
    tutor_profile = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor_profile:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    cert = db.query(TutorCertification).filter(
        TutorCertification.id == cert_id,
        TutorCertification.tutor_id == tutor_profile.id
    ).first()
    
    if not cert:
        raise HTTPException(status_code=404, detail="Certification not found")
    
    db.delete(cert)
    db.commit()
    
    return {"message": "Certification deleted successfully"}

# ============================================
# EXPERIENCE ENDPOINTS
# ============================================

@router.post("/api/tutor/experiences")
def add_experience(
    experience: ExperienceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add work experience for the tutor"""
    
    tutor_profile = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor_profile:
        raise HTTPException(status_code=403, detail="Only tutors can add experiences")
    
    new_exp = TutorExperience(
        tutor_id=tutor_profile.id,
        title=experience.title,
        organization=experience.organization,
        start_date=datetime.strptime(experience.start_date, "%Y-%m-%d"),
        end_date=datetime.strptime(experience.end_date, "%Y-%m-%d") if experience.end_date else None,
        is_current=experience.is_current,
        description=experience.description
    )
    
    db.add(new_exp)
    db.commit()
    db.refresh(new_exp)
    
    return {"message": "Experience added successfully", "id": new_exp.id}

@router.get("/api/tutor/experiences")
def get_experiences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all experiences for the current tutor"""
    
    tutor_profile = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor_profile:
        return []
    
    experiences = db.query(TutorExperience).filter(
        TutorExperience.tutor_id == tutor_profile.id
    ).order_by(TutorExperience.start_date.desc()).all()
    
    return [
        {
            "id": exp.id,
            "title": exp.title,
            "organization": exp.organization,
            "start_date": exp.start_date.isoformat(),
            "end_date": exp.end_date.isoformat() if exp.end_date else None,
            "is_current": exp.is_current,
            "description": exp.description
        }
        for exp in experiences
    ]

@router.delete("/api/tutor/experiences/{exp_id}")
def delete_experience(
    exp_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an experience"""
    
    tutor_profile = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor_profile:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    exp = db.query(TutorExperience).filter(
        TutorExperience.id == exp_id,
        TutorExperience.tutor_id == tutor_profile.id
    ).first()
    
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
    
    db.delete(exp)
    db.commit()
    
    return {"message": "Experience deleted successfully"}

# ============================================
# ACHIEVEMENT ENDPOINTS
# ============================================

@router.post("/api/tutor/achievements")
async def add_achievement(
    title: str = Form(...),
    issuer: str = Form(...),
    date: str = Form(...),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add an achievement for the tutor"""
    
    tutor_profile = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor_profile:
        raise HTTPException(status_code=403, detail="Only tutors can add achievements")
    
    # Handle image upload if provided
    image_url = None
    if image:
        file_extension = image.filename.split('.')[-1]
        file_name = f"achievement_{current_user.id}_{datetime.now().timestamp()}.{file_extension}"
        file_path = f"uploads/achievements/{file_name}"
        
        os.makedirs("uploads/achievements", exist_ok=True)
        
        with open(file_path, "wb") as buffer:
            content = await image.read()
            buffer.write(content)
        
        image_url = f"/uploads/achievements/{file_name}"
    
    new_achievement = TutorAchievement(
        tutor_id=tutor_profile.id,
        title=title,
        issuer=issuer,
        date=datetime.strptime(date, "%Y-%m-%d"),
        description=description,
        image_url=image_url
    )
    
    db.add(new_achievement)
    db.commit()
    db.refresh(new_achievement)
    
    return {"message": "Achievement added successfully", "id": new_achievement.id}

@router.get("/api/tutor/achievements")
def get_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all achievements for the current tutor"""
    
    tutor_profile = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor_profile:
        return []
    
    achievements = db.query(TutorAchievement).filter(
        TutorAchievement.tutor_id == tutor_profile.id
    ).order_by(TutorAchievement.date.desc()).all()
    
    return [
        {
            "id": ach.id,
            "title": ach.title,
            "issuer": ach.issuer,
            "date": ach.date.isoformat(),
            "description": ach.description,
            "image_url": ach.image_url
        }
        for ach in achievements
    ]

@router.delete("/api/tutor/achievements/{ach_id}")
def delete_achievement(
    ach_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an achievement"""
    
    tutor_profile = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor_profile:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    achievement = db.query(TutorAchievement).filter(
        TutorAchievement.id == ach_id,
        TutorAchievement.tutor_id == tutor_profile.id
    ).first()
    
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")
    
    db.delete(achievement)
    db.commit()
    
    return {"message": "Achievement deleted successfully"}

# ============================================
# PROFILE UPDATE ENDPOINT
# ============================================

@router.put("/api/tutor/profile")
def update_tutor_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update tutor profile information"""
    
    tutor_profile = db.query(TutorProfile).filter(
        TutorProfile.user_id == current_user.id
    ).first()
    
    if not tutor_profile:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    # Update user name if provided
    if profile_data.name:
        name_parts = profile_data.name.split(' ', 1)
        current_user.first_name = name_parts[0]
        current_user.last_name = name_parts[1] if len(name_parts) > 1 else ""
    
    # Update tutor profile fields
    update_fields = profile_data.dict(exclude_unset=True, exclude={'name'})
    for field, value in update_fields.items():
        if hasattr(tutor_profile, field):
            setattr(tutor_profile, field, value)
    
    db.commit()
    db.refresh(tutor_profile)
    db.refresh(current_user)
    
    return {
        "message": "Profile updated successfully",
        "profile": {
            "name": f"{current_user.first_name} {current_user.last_name}",
            "location": tutor_profile.location,
            "price": tutor_profile.price,
            "experience": tutor_profile.experience,
            "courses": tutor_profile.courses,
            "grades": tutor_profile.grades,
            "bio": tutor_profile.bio,
            "quote": tutor_profile.quote
        }
    }