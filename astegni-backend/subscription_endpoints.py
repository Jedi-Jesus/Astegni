"""
Subscription endpoints for tutor subscription management
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])

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

class SubscriptionResponse(BaseModel):
    id: int
    tutor_profile_id: int
    plan_id: int
    plan_name: str
    amount: float
    current_value: float
    roi_percentage: float
    status: str
    start_date: datetime
    end_date: datetime
    description: str
    metrics: Optional[SubscriptionMetrics] = None

    class Config:
        from_attributes = True


def get_db():
    """Database dependency - import from main app"""
    from modules.models import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user_id():
    """Get current user ID from token - simplified for now"""
    # TODO: Implement proper JWT token validation
    return 1


@router.get("/tutor/{tutor_profile_id}", response_model=List[SubscriptionResponse])
async def get_tutor_subscriptions(
    tutor_profile_id: int,
    db: Session = Depends(get_db),
    include_metrics: bool = True
):
    """
    Get all subscription history for a tutor profile
    """
    query = text("""
        SELECT
            ti.id,
            ti.tutor_profile_id,
            tp.subscription_plan_id as plan_id,
            ti.investment_name as plan_name,
            ti.amount,
            ti.current_value,
            ti.roi_percentage,
            ti.status,
            ti.investment_date as start_date,
            ti.maturity_date as end_date,
            ti.description,
            sm.total_impressions,
            sm.profile_views,
            sm.clicks,
            sm.click_through_rate,
            sm.student_connections,
            sm.connection_rate,
            sm.cost_per_impression,
            sm.cost_per_click,
            sm.cost_per_connection
        FROM tutor_investments ti
        JOIN tutor_profiles tp ON ti.tutor_profile_id = tp.id
        LEFT JOIN subscription_metrics sm ON ti.id = sm.investment_id
        WHERE ti.tutor_profile_id = :tutor_id
          AND ti.investment_type = 'subscription'
        ORDER BY ti.investment_date DESC
    """)

    result = db.execute(query, {'tutor_id': tutor_profile_id})
    rows = result.fetchall()

    subscriptions = []
    for row in rows:
        metrics = None
        if include_metrics and row.total_impressions is not None:
            metrics = SubscriptionMetrics(
                total_impressions=row.total_impressions or 0,
                profile_views=row.profile_views or 0,
                clicks=row.clicks or 0,
                click_through_rate=float(row.click_through_rate or 0),
                student_connections=row.student_connections or 0,
                connection_rate=float(row.connection_rate or 0),
                cost_per_impression=float(row.cost_per_impression or 0),
                cost_per_click=float(row.cost_per_click or 0),
                cost_per_connection=float(row.cost_per_connection or 0)
            )

        subscriptions.append(SubscriptionResponse(
            id=row.id,
            tutor_profile_id=row.tutor_profile_id,
            plan_id=row.plan_id or 0,
            plan_name=row.plan_name,
            amount=float(row.amount),
            current_value=float(row.current_value),
            roi_percentage=float(row.roi_percentage),
            status=row.status,
            start_date=row.start_date,
            end_date=row.end_date,
            description=row.description,
            metrics=metrics
        ))

    return subscriptions


@router.get("/current", response_model=Optional[SubscriptionResponse])
async def get_current_subscription(
    tutor_profile_id: int,
    db: Session = Depends(get_db)
):
    """
    Get the current active subscription for a tutor profile
    """
    query = text("""
        SELECT
            ti.id,
            ti.tutor_profile_id,
            tp.subscription_plan_id as plan_id,
            ti.investment_name as plan_name,
            ti.amount,
            ti.current_value,
            ti.roi_percentage,
            ti.status,
            ti.investment_date as start_date,
            ti.maturity_date as end_date,
            ti.description,
            sm.total_impressions,
            sm.profile_views,
            sm.clicks,
            sm.click_through_rate,
            sm.student_connections,
            sm.connection_rate,
            sm.cost_per_impression,
            sm.cost_per_click,
            sm.cost_per_connection
        FROM tutor_investments ti
        JOIN tutor_profiles tp ON ti.tutor_profile_id = tp.id
        LEFT JOIN subscription_metrics sm ON ti.id = sm.investment_id
        WHERE ti.tutor_profile_id = :tutor_id
          AND ti.investment_type = 'subscription'
          AND ti.status = 'active'
        ORDER BY ti.investment_date DESC
        LIMIT 1
    """)

    result = db.execute(query, {'tutor_id': tutor_profile_id})
    row = result.fetchone()

    if not row:
        return None

    metrics = None
    if row.total_impressions is not None:
        metrics = SubscriptionMetrics(
            total_impressions=row.total_impressions or 0,
            profile_views=row.profile_views or 0,
            clicks=row.clicks or 0,
            click_through_rate=float(row.click_through_rate or 0),
            student_connections=row.student_connections or 0,
            connection_rate=float(row.connection_rate or 0),
            cost_per_impression=float(row.cost_per_impression or 0),
            cost_per_click=float(row.cost_per_click or 0),
            cost_per_connection=float(row.cost_per_connection or 0)
        )

    return SubscriptionResponse(
        id=row.id,
        tutor_profile_id=row.tutor_profile_id,
        plan_id=row.plan_id or 0,
        plan_name=row.plan_name,
        amount=float(row.amount),
        current_value=float(row.current_value),
        roi_percentage=float(row.roi_percentage),
        status=row.status,
        start_date=row.start_date,
        end_date=row.end_date,
        description=row.description,
        metrics=metrics
    )


@router.get("/metrics/{investment_id}")
async def get_subscription_metrics(
    investment_id: int,
    db: Session = Depends(get_db)
):
    """
    Get detailed metrics for a specific subscription investment
    """
    query = text("""
        SELECT
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
            sm.period_end,
            sm.recorded_at,
            ti.investment_name,
            ti.amount,
            ti.status
        FROM subscription_metrics sm
        JOIN tutor_investments ti ON sm.investment_id = ti.id
        WHERE sm.investment_id = :investment_id
    """)

    result = db.execute(query, {'investment_id': investment_id})
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Metrics not found")

    return {
        "investment_name": row.investment_name,
        "amount": float(row.amount),
        "status": row.status,
        "period_start": row.period_start,
        "period_end": row.period_end,
        "metrics": {
            "total_impressions": row.total_impressions,
            "profile_views": row.profile_views,
            "clicks": row.clicks,
            "click_through_rate": float(row.click_through_rate),
            "student_connections": row.student_connections,
            "connection_rate": float(row.connection_rate),
            "cost_per_impression": float(row.cost_per_impression),
            "cost_per_click": float(row.cost_per_click),
            "cost_per_connection": float(row.cost_per_connection)
        },
        "recorded_at": row.recorded_at
    }
