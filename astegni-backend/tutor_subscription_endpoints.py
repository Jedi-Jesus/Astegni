"""
Tutor subscription endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from utils import get_current_user

router = APIRouter(prefix="/api/tutor", tags=["tutor-subscriptions"])

# Pydantic models
class SubscriptionMetrics(BaseModel):
    total_impressions: int
    profile_views: int
    clicks: int
    click_through_rate: float
    student_connections: int
    connection_rate: float
    cost_per_impression: float
    cost_per_click: float
    cost_per_connection: float

class TutorSubscriptionResponse(BaseModel):
    id: int
    tutor_profile_id: int
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
    # Metrics from subscription_metrics table
    total_impressions: Optional[int] = 0
    profile_views: Optional[int] = 0
    clicks: Optional[int] = 0
    click_through_rate: Optional[float] = 0.0
    student_connections: Optional[int] = 0
    connection_rate: Optional[float] = 0.0
    cost_per_impression: Optional[float] = 0.0
    cost_per_click: Optional[float] = 0.0
    cost_per_connection: Optional[float] = 0.0
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


@router.get("/subscriptions", response_model=List[TutorSubscriptionResponse])
async def get_tutor_subscriptions(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all subscription history for the authenticated tutor with performance metrics
    """
    # Get tutor profile ID from current user
    profile_query = text("""
        SELECT id FROM tutor_profiles WHERE user_id = :user_id
    """)
    profile_result = db.execute(profile_query, {'user_id': current_user.id})
    profile = profile_result.fetchone()

    if not profile:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    tutor_profile_id = profile.id

    # Get all subscription investments with metrics
    # Note: plan_id is from users table (current subscription), not historical
    # user_investments table is user-based, not role-based
    query = text("""
        SELECT
            ui.id,
            :tutor_profile_id as tutor_profile_id,
            u.subscription_plan_id as plan_id,
            ui.investment_name as plan_name,
            ui.description,
            ui.amount,
            ui.current_value,
            ui.roi_percentage,
            ui.status,
            ui.investment_date as start_date,
            ui.maturity_date as end_date,
            ui.created_at,
            sm.total_impressions,
            sm.profile_views,
            sm.clicks,
            sm.click_through_rate,
            sm.student_connections,
            sm.connection_rate,
            sm.cost_per_impression,
            sm.cost_per_click,
            sm.cost_per_connection
        FROM user_investments ui
        JOIN users u ON ui.user_id = u.id
        LEFT JOIN subscription_metrics sm ON ui.id = sm.investment_id
        WHERE ui.user_id = :user_id
          AND ui.investment_type = 'subscription'
        ORDER BY ui.investment_date DESC
    """)

    result = db.execute(query, {
        'user_id': current_user.id,
        'tutor_profile_id': tutor_profile_id
    })
    rows = result.fetchall()

    subscriptions = []
    for row in rows:
        subscriptions.append(TutorSubscriptionResponse(
            id=row.id,
            tutor_profile_id=row.tutor_profile_id,
            plan_id=row.plan_id,
            plan_name=row.plan_name,
            description=row.description or '',
            amount=float(row.amount),
            current_value=float(row.current_value),
            roi_percentage=float(row.roi_percentage),
            status=row.status,
            start_date=row.start_date,
            end_date=row.end_date,
            payment_method=None,  # Tutors don't have payment_method in tutor_investments
            transaction_id=None,  # Tutors don't have transaction_id
            total_impressions=row.total_impressions or 0,
            profile_views=row.profile_views or 0,
            clicks=row.clicks or 0,
            click_through_rate=float(row.click_through_rate or 0),
            student_connections=row.student_connections or 0,
            connection_rate=float(row.connection_rate or 0),
            cost_per_impression=float(row.cost_per_impression or 0),
            cost_per_click=float(row.cost_per_click or 0),
            cost_per_connection=float(row.cost_per_connection or 0),
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
    # Get tutor profile ID
    profile_query = text("SELECT id FROM tutor_profiles WHERE user_id = :user_id")
    profile_result = db.execute(profile_query, {'user_id': current_user.id})
    profile = profile_result.fetchone()

    if not profile:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

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
        "tutor_profile_id": profile.id,
        "plan_id": user.subscription_plan_id,
        "started_at": user.subscription_started_at,
        "expires_at": user.subscription_expires_at,
        "is_active": is_active
    }


@router.get("/subscriptions/{subscription_id}/metrics")
async def get_subscription_metrics(
    subscription_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed performance metrics for a specific subscription
    """
    # Get tutor profile ID
    profile_query = text("SELECT id FROM tutor_profiles WHERE user_id = :user_id")
    profile_result = db.execute(profile_query, {'user_id': current_user.id})
    profile = profile_result.fetchone()

    if not profile:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    # Get subscription with metrics
    query = text("""
        SELECT
            ti.investment_name,
            ti.amount,
            ti.status,
            ti.investment_date,
            ti.maturity_date,
            sm.total_impressions,
            sm.profile_views,
            sm.clicks,
            sm.click_through_rate,
            sm.student_connections,
            sm.connection_rate,
            sm.cost_per_impression,
            sm.cost_per_click,
            sm.cost_per_connection,
            sm.period_start,
            sm.period_end
        FROM tutor_investments ti
        LEFT JOIN subscription_metrics sm ON ti.id = sm.investment_id
        WHERE ti.id = :subscription_id
          AND ti.tutor_profile_id = :tutor_id
          AND ti.investment_type = 'subscription'
    """)

    result = db.execute(query, {
        'subscription_id': subscription_id,
        'tutor_id': profile.id
    })
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Subscription not found")

    return {
        "investment_name": row.investment_name,
        "amount": float(row.amount),
        "status": row.status,
        "investment_date": row.investment_date,
        "maturity_date": row.maturity_date,
        "metrics": {
            "total_impressions": row.total_impressions or 0,
            "profile_views": row.profile_views or 0,
            "clicks": row.clicks or 0,
            "click_through_rate": float(row.click_through_rate or 0),
            "student_connections": row.student_connections or 0,
            "connection_rate": float(row.connection_rate or 0),
            "cost_per_impression": float(row.cost_per_impression or 0),
            "cost_per_click": float(row.cost_per_click or 0),
            "cost_per_connection": float(row.cost_per_connection or 0)
        },
        "period_start": row.period_start,
        "period_end": row.period_end
    }
