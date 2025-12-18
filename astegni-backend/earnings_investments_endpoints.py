"""
Earnings and Investments API Endpoints
Comprehensive endpoints for tutor earnings and investment tracking
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
import psycopg
from decimal import Decimal

# Import auth utilities
import sys
sys.path.append('.')
from utils import get_current_user

router = APIRouter()

import os
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class DirectAffiliateEarning(BaseModel):
    id: int
    referred_user_name: str
    referred_user_profile_picture: Optional[str]
    amount: float
    commission_percentage: float
    source: Optional[str]
    description: Optional[str]
    status: str
    earned_date: datetime

class IndirectAffiliateEarning(BaseModel):
    id: int
    referred_by_name: str
    end_user_name: str
    amount: float
    commission_percentage: float
    levels_deep: int
    source: Optional[str]
    description: Optional[str]
    status: str
    earned_date: datetime

class TutoringEarning(BaseModel):
    id: int
    student_name: str
    student_profile_picture: Optional[str]
    amount: float
    session_duration: Optional[int]
    session_type: Optional[str]
    subject: Optional[str]
    payment_method: Optional[str]
    status: str
    earned_date: datetime

class Investment(BaseModel):
    id: int
    investment_type: str
    investment_name: str
    amount: float
    current_value: Optional[float]
    roi_percentage: Optional[float]
    investment_date: date
    maturity_date: Optional[date]
    status: str
    description: Optional[str]
    risk_level: Optional[str]

class MonthlyEarningsSummary(BaseModel):
    year: int
    month: int
    direct_affiliate_earnings: float
    indirect_affiliate_earnings: float
    tutoring_earnings: float
    total_earnings: float

class EarningsSummaryResponse(BaseModel):
    total_direct_affiliate: float
    total_indirect_affiliate: float
    total_tutoring: float
    total_earnings: float
    pending_earnings: float
    completed_earnings: float
    monthly_data: List[MonthlyEarningsSummary]

class InvestmentsSummaryResponse(BaseModel):
    total_invested: float
    current_total_value: float
    total_roi: float
    total_gain_loss: float
    active_investments: int
    investments: List[Investment]

# ============================================================================
# EARNINGS ENDPOINTS
# ============================================================================

@router.get("/api/tutor/earnings/summary")
async def get_earnings_summary(
    months: int = Query(6, ge=1, le=12),
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive earnings summary for tutor"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get tutor profile
        cur.execute("""
            SELECT id FROM tutor_profiles WHERE user_id = %s
        """, (current_user.id,))
        tutor_profile = cur.fetchone()

        if not tutor_profile:
            raise HTTPException(status_code=404, detail="Tutor profile not found")

        tutor_profile_id = tutor_profile[0]

        # Get total direct affiliate earnings
        cur.execute("""
            SELECT
                COALESCE(SUM(amount), 0) as total,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending
            FROM direct_affiliate_earnings
            WHERE tutor_profile_id = %s
        """, (tutor_profile_id,))
        direct_data = cur.fetchone()
        total_direct = float(direct_data[0])
        pending_direct = float(direct_data[1])

        # Get total indirect affiliate earnings
        cur.execute("""
            SELECT
                COALESCE(SUM(amount), 0) as total,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending
            FROM indirect_affiliate_earnings
            WHERE tutor_profile_id = %s
        """, (tutor_profile_id,))
        indirect_data = cur.fetchone()
        total_indirect = float(indirect_data[0])
        pending_indirect = float(indirect_data[1])

        # Get total tutoring earnings
        cur.execute("""
            SELECT
                COALESCE(SUM(amount), 0) as total,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending
            FROM tutoring_earnings
            WHERE tutor_profile_id = %s
        """, (tutor_profile_id,))
        tutoring_data = cur.fetchone()
        total_tutoring = float(tutoring_data[0])
        pending_tutoring = float(tutoring_data[1])

        # Get monthly summary data
        cur.execute("""
            SELECT year, month, direct_affiliate_earnings, indirect_affiliate_earnings,
                   tutoring_earnings, total_earnings
            FROM monthly_earnings_summary
            WHERE tutor_profile_id = %s
            ORDER BY year DESC, month DESC
            LIMIT %s
        """, (tutor_profile_id, months))
        monthly_rows = cur.fetchall()

        monthly_data = [
            MonthlyEarningsSummary(
                year=row[0],
                month=row[1],
                direct_affiliate_earnings=float(row[2]),
                indirect_affiliate_earnings=float(row[3]),
                tutoring_earnings=float(row[4]),
                total_earnings=float(row[5])
            ) for row in monthly_rows
        ]

        return EarningsSummaryResponse(
            total_direct_affiliate=total_direct,
            total_indirect_affiliate=total_indirect,
            total_tutoring=total_tutoring,
            total_earnings=total_direct + total_indirect + total_tutoring,
            pending_earnings=pending_direct + pending_indirect + pending_tutoring,
            completed_earnings=(total_direct - pending_direct) + (total_indirect - pending_indirect) + (total_tutoring - pending_tutoring),
            monthly_data=monthly_data
        )

    finally:
        cur.close()
        conn.close()

@router.get("/api/tutor/earnings/direct-affiliate")
async def get_direct_affiliate_earnings(
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get direct affiliate earnings list"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT id FROM tutor_profiles WHERE user_id = %s
        """, (current_user.id,))
        tutor_profile = cur.fetchone()

        if not tutor_profile:
            raise HTTPException(status_code=404, detail="Tutor profile not found")

        cur.execute("""
            SELECT id, referred_user_name, referred_user_profile_picture, amount,
                   commission_percentage, source, description, status, earned_date
            FROM direct_affiliate_earnings
            WHERE tutor_profile_id = %s
            ORDER BY earned_date DESC
            LIMIT %s
        """, (tutor_profile[0], limit))
        rows = cur.fetchall()

        return [
            DirectAffiliateEarning(
                id=row[0],
                referred_user_name=row[1],
                referred_user_profile_picture=row[2],
                amount=float(row[3]),
                commission_percentage=float(row[4]),
                source=row[5],
                description=row[6],
                status=row[7],
                earned_date=row[8]
            ) for row in rows
        ]

    finally:
        cur.close()
        conn.close()

@router.get("/api/tutor/earnings/indirect-affiliate")
async def get_indirect_affiliate_earnings(
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get indirect affiliate earnings list"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT id FROM tutor_profiles WHERE user_id = %s
        """, (current_user.id,))
        tutor_profile = cur.fetchone()

        if not tutor_profile:
            raise HTTPException(status_code=404, detail="Tutor profile not found")

        cur.execute("""
            SELECT id, referred_by_name, end_user_name, amount, commission_percentage,
                   levels_deep, source, description, status, earned_date
            FROM indirect_affiliate_earnings
            WHERE tutor_profile_id = %s
            ORDER BY earned_date DESC
            LIMIT %s
        """, (tutor_profile[0], limit))
        rows = cur.fetchall()

        return [
            IndirectAffiliateEarning(
                id=row[0],
                referred_by_name=row[1],
                end_user_name=row[2],
                amount=float(row[3]),
                commission_percentage=float(row[4]),
                levels_deep=row[5],
                source=row[6],
                description=row[7],
                status=row[8],
                earned_date=row[9]
            ) for row in rows
        ]

    finally:
        cur.close()
        conn.close()

@router.get("/api/tutor/earnings/tutoring")
async def get_tutoring_earnings(
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get tutoring earnings list"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT id FROM tutor_profiles WHERE user_id = %s
        """, (current_user.id,))
        tutor_profile = cur.fetchone()

        if not tutor_profile:
            raise HTTPException(status_code=404, detail="Tutor profile not found")

        cur.execute("""
            SELECT id, student_name, student_profile_picture, amount, session_duration,
                   session_type, subject, payment_method, status, earned_date
            FROM tutoring_earnings
            WHERE tutor_profile_id = %s
            ORDER BY earned_date DESC
            LIMIT %s
        """, (tutor_profile[0], limit))
        rows = cur.fetchall()

        return [
            TutoringEarning(
                id=row[0],
                student_name=row[1],
                student_profile_picture=row[2],
                amount=float(row[3]),
                session_duration=row[4],
                session_type=row[5],
                subject=row[6],
                payment_method=row[7],
                status=row[8],
                earned_date=row[9]
            ) for row in rows
        ]

    finally:
        cur.close()
        conn.close()

# ============================================================================
# INVESTMENTS ENDPOINTS
# ============================================================================

@router.get("/api/tutor/investments/summary")
async def get_investments_summary(
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive investments summary for tutor"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT id FROM tutor_profiles WHERE user_id = %s
        """, (current_user.id,))
        tutor_profile = cur.fetchone()

        if not tutor_profile:
            raise HTTPException(status_code=404, detail="Tutor profile not found")

        tutor_profile_id = tutor_profile[0]

        # Get investments
        cur.execute("""
            SELECT id, investment_type, investment_name, amount, current_value,
                   roi_percentage, investment_date, maturity_date, status,
                   description, risk_level
            FROM tutor_investments
            WHERE tutor_profile_id = %s
            ORDER BY investment_date DESC
        """, (tutor_profile_id,))
        rows = cur.fetchall()

        investments = [
            Investment(
                id=row[0],
                investment_type=row[1],
                investment_name=row[2],
                amount=float(row[3]),
                current_value=float(row[4]) if row[4] else None,
                roi_percentage=float(row[5]) if row[5] else None,
                investment_date=row[6],
                maturity_date=row[7],
                status=row[8],
                description=row[9],
                risk_level=row[10]
            ) for row in rows
        ]

        # Calculate totals
        total_invested = sum(inv.amount for inv in investments)
        current_total_value = sum(inv.current_value or inv.amount for inv in investments)
        total_gain_loss = current_total_value - total_invested
        total_roi = (total_gain_loss / total_invested * 100) if total_invested > 0 else 0
        active_investments = len([inv for inv in investments if inv.status == 'active'])

        return InvestmentsSummaryResponse(
            total_invested=total_invested,
            current_total_value=current_total_value,
            total_roi=total_roi,
            total_gain_loss=total_gain_loss,
            active_investments=active_investments,
            investments=investments
        )

    finally:
        cur.close()
        conn.close()

@router.get("/api/tutor/investments")
async def get_investments(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get investments list with optional status filter"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT id FROM tutor_profiles WHERE user_id = %s
        """, (current_user.id,))
        tutor_profile = cur.fetchone()

        if not tutor_profile:
            raise HTTPException(status_code=404, detail="Tutor profile not found")

        query = """
            SELECT id, investment_type, investment_name, amount, current_value,
                   roi_percentage, investment_date, maturity_date, status,
                   description, risk_level
            FROM tutor_investments
            WHERE tutor_profile_id = %s
        """
        params = [tutor_profile[0]]

        if status:
            query += " AND status = %s"
            params.append(status)

        query += " ORDER BY investment_date DESC"

        cur.execute(query, params)
        rows = cur.fetchall()

        return [
            Investment(
                id=row[0],
                investment_type=row[1],
                investment_name=row[2],
                amount=float(row[3]),
                current_value=float(row[4]) if row[4] else None,
                roi_percentage=float(row[5]) if row[5] else None,
                investment_date=row[6],
                maturity_date=row[7],
                status=row[8],
                description=row[9],
                risk_level=row[10]
            ) for row in rows
        ]

    finally:
        cur.close()
        conn.close()
