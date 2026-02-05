"""
Payment Punctuality API Endpoints
Provides endpoints to calculate and retrieve parent payment punctuality
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

router = APIRouter()

# Pydantic models
class PaymentPunctualityResponse(BaseModel):
    parent_id: int
    total_payments: int
    paid_on_time: int
    paid_late: int
    still_pending: int
    overdue: int
    punctuality_score: float  # 0-5 scale
    punctuality_percentage: int  # 0-100%
    avg_days_late: float
    total_late_fees: float
    on_time_rate: float
    include_archived: bool

class WidgetPunctualityResponse(BaseModel):
    punctuality_percentage: int
    paid_on_time: int
    total_payments: int
    late_payments: int
    overdue_payments: int

# Dependency
def get_db():
    from app import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/api/parent/{parent_id}/payment-punctuality", response_model=PaymentPunctualityResponse)
async def get_parent_payment_punctuality(
    parent_id: int,
    include_archived: bool = True,
    db: Session = Depends(get_db)
):
    """
    Calculate payment punctuality for a parent based on all their children's enrollments

    Args:
        parent_id: Parent profile ID
        include_archived: Include archived payment records in calculation (default: True)

    Returns:
        PaymentPunctualityResponse with detailed punctuality metrics
    """
    # Build query to get all payment records for parent's children
    query = """
        SELECT
            es.id,
            es.payment_status,
            es.payment_due_date,
            es.payment_received_date,
            es.agreed_price,
            es.created_at,
            es.is_archived,
            ui.days_overdue,
            ui.late_fee
        FROM enrolled_students es
        LEFT JOIN user_investments ui ON ui.student_payment_id = es.id
        JOIN student_profiles sp ON sp.id = es.student_id
        JOIN parent_profiles pp ON pp.id = :parent_id
        WHERE es.student_id = ANY(pp.children_ids)
    """

    if not include_archived:
        query += " AND (es.is_archived = FALSE OR es.is_archived IS NULL)"

    result = db.execute(text(query), {"parent_id": parent_id})
    records = result.fetchall()

    if not records:
        return PaymentPunctualityResponse(
            parent_id=parent_id,
            total_payments=0,
            paid_on_time=0,
            paid_late=0,
            still_pending=0,
            overdue=0,
            punctuality_score=0.0,
            punctuality_percentage=0,
            avg_days_late=0.0,
            total_late_fees=0.0,
            on_time_rate=0.0,
            include_archived=include_archived
        )

    # Calculate metrics
    total_payments = len(records)
    paid_on_time = 0
    paid_late = 0
    still_pending = 0
    overdue = 0
    total_days_late = 0
    total_late_fees = 0.0

    for record in records:
        payment_status = record[1]
        due_date = record[2]
        received_date = record[3]
        days_overdue_val = record[7] or 0
        late_fee = record[8] or 0.0

        if payment_status == 'paid':
            if received_date and due_date:
                # Calculate if paid on time
                if received_date <= due_date:
                    paid_on_time += 1
                else:
                    paid_late += 1
                    days_late = (received_date - due_date).days
                    total_days_late += days_late
            else:
                # No dates to compare, assume on time if paid
                paid_on_time += 1

            total_late_fees += late_fee

        elif payment_status == 'pending':
            if due_date and datetime.now().date() > due_date:
                overdue += 1
                total_days_late += days_overdue_val
            else:
                still_pending += 1

    # Calculate punctuality score (0-5 scale like parent reviews)
    if total_payments == 0:
        punctuality_score = 0.0
    else:
        # Weight: on-time = 5.0, late = 3.0, overdue = 1.0
        on_time_score = paid_on_time * 5.0
        late_score = paid_late * 3.0
        overdue_score = overdue * 1.0

        total_score = on_time_score + late_score + overdue_score
        counted_payments = paid_on_time + paid_late + overdue

        punctuality_score = total_score / counted_payments if counted_payments > 0 else 0.0

    # Calculate percentage (0-100%)
    punctuality_percentage = round((punctuality_score / 5.0) * 100)

    # Calculate average days late
    avg_days_late = total_days_late / (paid_late + overdue) if (paid_late + overdue) > 0 else 0

    return PaymentPunctualityResponse(
        parent_id=parent_id,
        total_payments=total_payments,
        paid_on_time=paid_on_time,
        paid_late=paid_late,
        still_pending=still_pending,
        overdue=overdue,
        punctuality_score=round(punctuality_score, 2),
        punctuality_percentage=punctuality_percentage,
        avg_days_late=round(avg_days_late, 1),
        total_late_fees=round(total_late_fees, 2),
        on_time_rate=round((paid_on_time / total_payments * 100), 1) if total_payments > 0 else 0,
        include_archived=include_archived
    )


@router.get("/api/parent/{parent_id}/payment-punctuality/widget", response_model=WidgetPunctualityResponse)
async def get_parent_punctuality_for_widget(
    parent_id: int,
    db: Session = Depends(get_db)
):
    """
    Get payment punctuality data formatted for the parent overview widget
    Only includes active (non-archived) records

    Args:
        parent_id: Parent profile ID

    Returns:
        Simplified widget-ready punctuality data
    """
    # Get full punctuality (active only)
    punctuality = await get_parent_payment_punctuality(
        parent_id=parent_id,
        include_archived=False,
        db=db
    )

    return WidgetPunctualityResponse(
        punctuality_percentage=punctuality.punctuality_percentage,
        paid_on_time=punctuality.paid_on_time,
        total_payments=punctuality.total_payments,
        late_payments=punctuality.paid_late,
        overdue_payments=punctuality.overdue
    )


@router.get("/api/parent/payment-punctuality/stats")
async def get_all_parents_punctuality_stats(
    db: Session = Depends(get_db)
):
    """
    Get payment punctuality statistics for all parents
    Useful for admin dashboard

    Returns:
        Statistics about payment punctuality across all parents
    """
    # Get all parents with children
    result = db.execute(text("""
        SELECT id
        FROM parent_profiles
        WHERE total_children > 0
    """))

    parent_ids = [row[0] for row in result.fetchall()]

    if not parent_ids:
        return {
            "total_parents": 0,
            "average_punctuality_score": 0.0,
            "average_punctuality_percentage": 0,
            "parents_with_perfect_score": 0,
            "parents_with_late_payments": 0
        }

    scores = []
    perfect_score_count = 0
    late_payment_count = 0

    for parent_id in parent_ids:
        punctuality = await get_parent_payment_punctuality(
            parent_id=parent_id,
            include_archived=True,
            db=db
        )

        if punctuality.total_payments > 0:
            scores.append(punctuality.punctuality_score)

            if punctuality.punctuality_score == 5.0:
                perfect_score_count += 1

            if punctuality.paid_late > 0 or punctuality.overdue > 0:
                late_payment_count += 1

    avg_score = sum(scores) / len(scores) if scores else 0.0

    return {
        "total_parents": len(parent_ids),
        "parents_with_payments": len(scores),
        "average_punctuality_score": round(avg_score, 2),
        "average_punctuality_percentage": round((avg_score / 5.0) * 100),
        "parents_with_perfect_score": perfect_score_count,
        "parents_with_late_payments": late_payment_count,
        "highest_score": max(scores) if scores else 0.0,
        "lowest_score": min(scores) if scores else 0.0
    }


# Export router
__all__ = ['router']
