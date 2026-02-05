"""
Base Price Endpoints
Handles CRUD operations for new tutor starting price rules
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

# Import from admin_models (admin database)
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))
from admin_models import AdminSessionLocal as SessionLocal, BasePriceRule

router = APIRouter(prefix="/api/admin/base-price-rules", tags=["Admin - Base Price"])


# Pydantic Models
class BasePriceRuleCreate(BaseModel):
    rule_name: str = Field(..., min_length=1, max_length=200)
    country: str = Field(default='all', min_length=1, max_length=100)  # Country code (ET, CM, KE, MX) or 'all'
    subject_category: str  # all, mathematics, science, languages, etc.
    session_format: str  # all, Online, In-Person, Hybrid
    min_grade_level: int = Field(default=1, ge=1, le=14)  # Minimum grade level (1-14: 1-12, 13=university, 14=certification)
    max_grade_level: int = Field(default=14, ge=1, le=14)  # Maximum grade level (1-14: 1-12, 13=university, 14=certification)
    base_price_per_hour: float = Field(..., gt=0)
    credential_bonus: float = Field(default=0, ge=0)
    experience_bonus_per_year: float = Field(default=0, ge=0)  # Bonus per year of experience
    priority: int = Field(default=2, ge=1, le=3)  # 1=high, 2=medium, 3=low
    is_active: bool = Field(default=True)


class BasePriceRuleUpdate(BaseModel):
    rule_name: Optional[str] = Field(None, min_length=1, max_length=200)
    country: Optional[str] = Field(None, min_length=1, max_length=100)
    subject_category: Optional[str] = None
    session_format: Optional[str] = None
    min_grade_level: Optional[int] = Field(None, ge=1, le=14)
    max_grade_level: Optional[int] = Field(None, ge=1, le=14)
    base_price_per_hour: Optional[float] = Field(None, gt=0)
    credential_bonus: Optional[float] = Field(None, ge=0)
    experience_bonus_per_year: Optional[float] = Field(None, ge=0)
    priority: Optional[int] = Field(None, ge=1, le=3)
    is_active: Optional[bool] = None


class BasePriceRuleResponse(BaseModel):
    id: int
    rule_name: str
    country: str
    subject_category: str
    session_format: str
    min_grade_level: int
    max_grade_level: int
    base_price_per_hour: float
    credential_bonus: float
    experience_bonus_per_year: float
    priority: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=List[BasePriceRuleResponse])
async def get_all_base_price_rules(
    db: Session = Depends(get_db)
):
    """Get all base price rules, ordered by priority and creation date"""
    rules = db.query(BasePriceRule).order_by(
        BasePriceRule.priority.asc(),
        BasePriceRule.created_at.desc()
    ).all()

    return rules


@router.get("/{rule_id}", response_model=BasePriceRuleResponse)
async def get_base_price_rule(
    rule_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific base price rule by ID"""
    rule = db.query(BasePriceRule).filter(BasePriceRule.id == rule_id).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Base price rule with ID {rule_id} not found"
        )

    return rule


@router.post("", response_model=BasePriceRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_base_price_rule(
    rule_data: BasePriceRuleCreate,
    db: Session = Depends(get_db)
):
    """Create a new base price rule"""
    # Validate grade level range
    if rule_data.min_grade_level > rule_data.max_grade_level:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum grade level ({rule_data.min_grade_level}) cannot be greater than maximum grade level ({rule_data.max_grade_level})"
        )

    # Check for duplicate rule (same country + subject + format combination)
    existing_rule = db.query(BasePriceRule).filter(
        and_(
            BasePriceRule.country == rule_data.country,
            BasePriceRule.subject_category == rule_data.subject_category,
            BasePriceRule.session_format == rule_data.session_format,
            BasePriceRule.is_active == True
        )
    ).first()

    if existing_rule:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An active rule already exists for {rule_data.country} + {rule_data.subject_category} + {rule_data.session_format}. Please deactivate it first or edit the existing rule."
        )

    # Create new rule
    new_rule = BasePriceRule(
        rule_name=rule_data.rule_name,
        country=rule_data.country,
        subject_category=rule_data.subject_category,
        session_format=rule_data.session_format,
        min_grade_level=rule_data.min_grade_level,
        max_grade_level=rule_data.max_grade_level,
        base_price_per_hour=rule_data.base_price_per_hour,
        credential_bonus=rule_data.credential_bonus,
        experience_bonus_per_year=rule_data.experience_bonus_per_year,
        priority=rule_data.priority,
        is_active=rule_data.is_active
    )

    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)

    return new_rule


@router.put("/{rule_id}", response_model=BasePriceRuleResponse)
async def update_base_price_rule(
    rule_id: int,
    rule_data: BasePriceRuleUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing base price rule"""
    rule = db.query(BasePriceRule).filter(BasePriceRule.id == rule_id).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Base price rule with ID {rule_id} not found"
        )

    # Update only provided fields
    update_data = rule_data.dict(exclude_unset=True)

    # Validate grade level range if being updated
    if 'min_grade_level' in update_data or 'max_grade_level' in update_data:
        new_min = update_data.get('min_grade_level', rule.min_grade_level)
        new_max = update_data.get('max_grade_level', rule.max_grade_level)

        if new_min > new_max:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Minimum grade level ({new_min}) cannot be greater than maximum grade level ({new_max})"
            )

    # If updating subject/format, check for duplicates
    if 'subject_category' in update_data or 'session_format' in update_data:
        new_subject = update_data.get('subject_category', rule.subject_category)
        new_format = update_data.get('session_format', rule.session_format)

        existing_rule = db.query(BasePriceRule).filter(
            and_(
                BasePriceRule.id != rule_id,
                BasePriceRule.subject_category == new_subject,
                BasePriceRule.session_format == new_format,
                BasePriceRule.is_active == True
            )
        ).first()

        if existing_rule:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An active rule already exists for {new_subject} + {new_format}"
            )

    for field, value in update_data.items():
        setattr(rule, field, value)

    rule.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(rule)

    return rule


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_base_price_rule(
    rule_id: int,
    db: Session = Depends(get_db)
):
    """Delete a base price rule"""
    rule = db.query(BasePriceRule).filter(BasePriceRule.id == rule_id).first()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Base price rule with ID {rule_id} not found"
        )

    db.delete(rule)
    db.commit()

    return None


@router.get("/match/tutor", response_model=Optional[BasePriceRuleResponse])
async def get_matching_base_price(
    subject_category: str,
    session_format: str,
    db: Session = Depends(get_db)
):
    """
    Get the best matching base price rule for a tutor
    Priority matching order:
    1. Exact match (subject + format)
    2. Subject match + all formats
    3. All subjects + format match
    4. All subjects + all formats (default)
    """

    # Try exact match first
    rule = db.query(BasePriceRule).filter(
        and_(
            BasePriceRule.subject_category == subject_category,
            BasePriceRule.session_format == session_format,
            BasePriceRule.is_active == True
        )
    ).order_by(BasePriceRule.priority.asc()).first()

    if rule:
        return rule

    # Try subject match + all formats
    rule = db.query(BasePriceRule).filter(
        and_(
            BasePriceRule.subject_category == subject_category,
            BasePriceRule.session_format == 'all',
            BasePriceRule.is_active == True
        )
    ).order_by(BasePriceRule.priority.asc()).first()

    if rule:
        return rule

    # Try all subjects + format match
    rule = db.query(BasePriceRule).filter(
        and_(
            BasePriceRule.subject_category == 'all',
            BasePriceRule.session_format == session_format,
            BasePriceRule.is_active == True
        )
    ).order_by(BasePriceRule.priority.asc()).first()

    if rule:
        return rule

    # Try default (all + all)
    rule = db.query(BasePriceRule).filter(
        and_(
            BasePriceRule.subject_category == 'all',
            BasePriceRule.session_format == 'all',
            BasePriceRule.is_active == True
        )
    ).order_by(BasePriceRule.priority.asc()).first()

    return rule
