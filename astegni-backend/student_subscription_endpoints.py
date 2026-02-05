"""
Student subscription endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from utils import get_current_user

router = APIRouter(prefix="/api/student", tags=["student-subscriptions"])

# Pydantic models
class StudentSubscriptionResponse(BaseModel):
    id: int
    student_profile_id: int
    plan_id: Optional[int] = None
    plan_name: str
    description: str
    amount: float
    current_value: float
    roi_percentage: float
    status: str
    start_date: datetime
    end_date: Optional[datetime] = None
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


def get_db():
    """Database dependency"""
    from app import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/subscriptions", response_model=List[StudentSubscriptionResponse])
async def get_student_subscriptions(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all subscription history for the authenticated user
    Note: Subscriptions are user-based, not role-based, so this returns
    the same data regardless of which role the user is currently using
    """
    # Get student profile ID from user_id (for response compatibility)
    profile_query = text("""
        SELECT id FROM student_profiles WHERE user_id = :user_id
    """)
    profile_result = db.execute(profile_query, {'user_id': current_user.id})
    profile = profile_result.fetchone()

    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    student_profile_id = profile.id

    # Get all subscription investments from user_investments
    # Subscriptions are user-based, stored in user_investments regardless of role
    query = text("""
        SELECT
            ui.id,
            :student_profile_id as student_profile_id,
            u.subscription_plan_id as plan_id,
            ui.investment_name as plan_name,
            ui.description,
            ui.amount,
            ui.current_value,
            ui.roi_percentage,
            ui.status,
            ui.investment_date as start_date,
            ui.maturity_date as end_date,
            NULL as payment_method,
            NULL as transaction_id,
            ui.created_at
        FROM user_investments ui
        JOIN users u ON ui.user_id = u.id
        WHERE ui.user_id = :user_id
          AND ui.investment_type = 'subscription'
        ORDER BY ui.investment_date DESC
    """)

    result = db.execute(query, {
        'user_id': current_user.id,
        'student_profile_id': student_profile_id
    })
    rows = result.fetchall()

    subscriptions = []
    for row in rows:
        subscriptions.append(StudentSubscriptionResponse(
            id=row.id,
            student_profile_id=row.student_profile_id,
            plan_id=row.plan_id,
            plan_name=row.plan_name,
            description=row.description or '',
            amount=float(row.amount),
            current_value=float(row.current_value),
            roi_percentage=float(row.roi_percentage),
            status=row.status,
            start_date=row.start_date,
            end_date=row.end_date,
            payment_method=row.payment_method,
            transaction_id=row.transaction_id,
            created_at=row.created_at
        ))

    return subscriptions


@router.get("/subscriptions/current")
async def get_current_subscription(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the current active subscription for the authenticated user
    """
    # Get student profile ID
    profile_query = text("SELECT id FROM student_profiles WHERE user_id = :user_id")
    profile_result = db.execute(profile_query, {'user_id': current_user.id})
    profile = profile_result.fetchone()

    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Get subscription from users table
    user_query = text("""
        SELECT subscription_plan_id, subscription_started_at, subscription_expires_at
        FROM users
        WHERE id = :user_id
    """)
    user_result = db.execute(user_query, {'user_id': current_user.id})
    user = user_result.fetchone()

    if not user or not user.subscription_plan_id:
        return None

    # Check if subscription is still active
    is_active = user.subscription_expires_at and user.subscription_expires_at > datetime.now()

    return {
        "student_profile_id": profile.id,
        "plan_id": user.subscription_plan_id,
        "started_at": user.subscription_started_at,
        "expires_at": user.subscription_expires_at,
        "is_active": is_active
    }


@router.get("/subscriptions/{subscription_id}")
async def get_subscription_details(
    subscription_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific subscription
    """
    # Get student profile ID
    profile_query = text("SELECT id FROM student_profiles WHERE user_id = :user_id")
    profile_result = db.execute(profile_query, {'user_id': current_user.id})
    profile = profile_result.fetchone()

    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Get subscription details
    query = text("""
        SELECT
            si.id,
            si.student_profile_id,
            si.investment_name as plan_name,
            si.description,
            si.amount,
            si.current_value,
            si.roi_percentage,
            si.status,
            si.investment_date as start_date,
            si.maturity_date as end_date,
            si.payment_method,
            si.transaction_id,
            si.created_at
        FROM student_investments si
        WHERE si.id = :subscription_id
          AND si.student_profile_id = :student_id
          AND si.investment_type = 'subscription'
    """)

    result = db.execute(query, {
        'subscription_id': subscription_id,
        'student_id': profile.id
    })
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Subscription not found")

    return {
        "id": row.id,
        "student_profile_id": row.student_profile_id,
        "plan_name": row.plan_name,
        "description": row.description,
        "amount": float(row.amount),
        "current_value": float(row.current_value),
        "roi_percentage": float(row.roi_percentage),
        "status": row.status,
        "start_date": row.start_date,
        "end_date": row.end_date,
        "payment_method": row.payment_method,
        "transaction_id": row.transaction_id,
        "created_at": row.created_at
    }
