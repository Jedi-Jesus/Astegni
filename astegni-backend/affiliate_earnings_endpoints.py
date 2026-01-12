"""
Affiliate Earnings API Endpoints
Comprehensive endpoints for affiliate earnings: Advertisement, Subscription, and Commission
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
import psycopg
from decimal import Decimal
import os

# Import auth utilities
import sys
sys.path.append('.')
from utils import get_current_user

router = APIRouter()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")
ADMIN_DATABASE_URL = os.getenv("ADMIN_DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db")


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class AffiliateTier(BaseModel):
    id: int
    tier_level: int
    tier_name: str
    commission_rate: float
    duration_months: int
    is_active: bool


class AdvertisementEarning(BaseModel):
    id: int
    referred_user_name: Optional[str]
    referred_user_profile_picture: Optional[str]
    advertiser_name: Optional[str]
    campaign_name: Optional[str]
    ad_type: Optional[str]
    impressions: int
    clicks: int
    tier_level: int
    commission_rate: float
    amount: float
    cpm_rate: Optional[float]
    cpc_rate: Optional[float]
    period_start: Optional[date]
    period_end: Optional[date]
    status: str
    description: Optional[str]
    created_at: datetime


class SubscriptionAffiliateEarning(BaseModel):
    id: int
    referred_user_name: Optional[str]
    referred_user_profile_picture: Optional[str]
    subscription_plan: Optional[str]
    subscription_amount: float
    tier_level: int
    commission_rate: float
    commission_amount: float
    status: str
    description: Optional[str]
    earned_date: datetime


class CommissionEarning(BaseModel):
    id: int
    tutor_name: Optional[str]
    tutor_profile_picture: Optional[str]
    student_name: Optional[str]
    session_amount: float
    tier_level: int
    commission_rate: float
    commission_amount: float
    status: str
    description: Optional[str]
    earned_date: datetime


class MonthlyAffiliateSummary(BaseModel):
    year: int
    month: int
    advertisement_earnings: float
    subscription_earnings: float
    commission_earnings: float
    total_affiliate_earnings: float


class AffiliateSummaryResponse(BaseModel):
    total_advertisement: float
    total_subscription: float
    total_commission: float
    total_affiliate: float
    pending_earnings: float
    completed_earnings: float
    monthly_data: List[MonthlyAffiliateSummary]


class TierEarningsSummary(BaseModel):
    tier_level: int
    tier_name: str
    commission_rate: float
    total_earnings: float
    transaction_count: int


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_user_profile(user_id: int, role: str) -> dict:
    """Get user's profile ID and type based on role"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    profile_table_map = {
        'tutor': 'tutor_profiles',
        'student': 'student_profiles',
        'parent': 'parent_profiles',
        'advertiser': 'advertiser_profiles'
    }

    table = profile_table_map.get(role, 'tutor_profiles')

    try:
        cur.execute(f"SELECT id FROM {table} WHERE user_id = %s", (user_id,))
        result = cur.fetchone()
        if result:
            return {'profile_id': result[0], 'profile_type': role}
        return None
    finally:
        cur.close()
        conn.close()


# ============================================================================
# AFFILIATE TIERS ENDPOINTS
# ============================================================================

@router.get("/api/affiliate/tiers", response_model=List[AffiliateTier])
async def get_affiliate_tiers(
    current_user: dict = Depends(get_current_user)
):
    """Get all active affiliate tier levels from admin database"""
    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT id, tier_level, tier_name, commission_rate, duration_months, is_active
            FROM affiliate_tiers
            WHERE is_active = true
            ORDER BY tier_level ASC
        """)
        rows = cur.fetchall()

        return [
            AffiliateTier(
                id=row[0],
                tier_level=row[1],
                tier_name=row[2],
                commission_rate=float(row[3]),
                duration_months=row[4],
                is_active=row[5]
            ) for row in rows
        ]
    finally:
        cur.close()
        conn.close()


# ============================================================================
# AFFILIATE SUMMARY ENDPOINT
# ============================================================================

@router.get("/api/affiliate/summary")
async def get_affiliate_summary(
    months: int = Query(6, ge=1, le=12),
    role: str = Query("tutor", description="User role: tutor, student, parent, advertiser"),
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive affiliate earnings summary"""
    profile_info = get_user_profile(current_user.id, role)

    if not profile_info:
        raise HTTPException(status_code=404, detail=f"{role.capitalize()} profile not found")

    profile_id = profile_info['profile_id']
    profile_type = profile_info['profile_type']

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get total advertisement earnings
        cur.execute("""
            SELECT
                COALESCE(SUM(amount), 0) as total,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending
            FROM advertisement_earnings
            WHERE user_id = %s AND profile_id = %s AND profile_type = %s
        """, (current_user.id, profile_id, profile_type))
        ad_data = cur.fetchone()
        total_advertisement = float(ad_data[0])
        pending_advertisement = float(ad_data[1])

        # Get total subscription affiliate earnings
        cur.execute("""
            SELECT
                COALESCE(SUM(commission_amount), 0) as total,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending
            FROM subscription_affiliate_earnings
            WHERE affiliate_user_id = %s AND affiliate_profile_id = %s AND affiliate_profile_type = %s
        """, (current_user.id, profile_id, profile_type))
        sub_data = cur.fetchone()
        total_subscription = float(sub_data[0])
        pending_subscription = float(sub_data[1])

        # Get total commission earnings
        cur.execute("""
            SELECT
                COALESCE(SUM(commission_amount), 0) as total,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending
            FROM connection_commission_earnings
            WHERE facilitator_user_id = %s AND facilitator_profile_id = %s AND facilitator_profile_type = %s
        """, (current_user.id, profile_id, profile_type))
        comm_data = cur.fetchone()
        total_commission = float(comm_data[0])
        pending_commission = float(comm_data[1])

        # Get monthly summary data
        cur.execute("""
            SELECT year, month, advertisement_earnings, subscription_earnings,
                   commission_earnings, total_affiliate_earnings
            FROM monthly_affiliate_summary
            WHERE user_id = %s AND profile_id = %s AND profile_type = %s
            ORDER BY year DESC, month DESC
            LIMIT %s
        """, (current_user.id, profile_id, profile_type, months))
        monthly_rows = cur.fetchall()

        monthly_data = [
            MonthlyAffiliateSummary(
                year=row[0],
                month=row[1],
                advertisement_earnings=float(row[2]),
                subscription_earnings=float(row[3]),
                commission_earnings=float(row[4]),
                total_affiliate_earnings=float(row[5])
            ) for row in monthly_rows
        ]

        total_pending = pending_advertisement + pending_subscription + pending_commission
        total_affiliate = total_advertisement + total_subscription + total_commission

        return AffiliateSummaryResponse(
            total_advertisement=total_advertisement,
            total_subscription=total_subscription,
            total_commission=total_commission,
            total_affiliate=total_affiliate,
            pending_earnings=total_pending,
            completed_earnings=total_affiliate - total_pending,
            monthly_data=monthly_data
        )

    finally:
        cur.close()
        conn.close()


# ============================================================================
# ADVERTISEMENT EARNINGS ENDPOINTS
# ============================================================================

@router.get("/api/affiliate/earnings/advertisement")
async def get_advertisement_earnings(
    months: int = Query(6, ge=1, le=12),
    limit: int = Query(20, ge=1, le=100),
    role: str = Query("tutor", description="User role"),
    tier_level: int = Query(None, description="Filter by tier level"),
    current_user: dict = Depends(get_current_user)
):
    """Get advertisement earnings list with summary"""
    profile_info = get_user_profile(current_user.id, role)

    if not profile_info:
        raise HTTPException(status_code=404, detail=f"{role.capitalize()} profile not found")

    profile_id = profile_info['profile_id']
    profile_type = profile_info['profile_type']

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get advertisement earnings list with optional tier filter
        if tier_level is not None:
            cur.execute("""
                SELECT id, referred_user_name, referred_user_profile_picture,
                       advertiser_name, campaign_name, ad_type, impressions, clicks,
                       tier_level, commission_rate, amount, cpm_rate, cpc_rate,
                       period_start, period_end, status, description, created_at
                FROM advertisement_earnings
                WHERE user_id = %s AND profile_id = %s AND profile_type = %s AND tier_level = %s
                ORDER BY created_at DESC
                LIMIT %s
            """, (current_user.id, profile_id, profile_type, tier_level, limit))
        else:
            cur.execute("""
                SELECT id, referred_user_name, referred_user_profile_picture,
                       advertiser_name, campaign_name, ad_type, impressions, clicks,
                       tier_level, commission_rate, amount, cpm_rate, cpc_rate,
                       period_start, period_end, status, description, created_at
                FROM advertisement_earnings
                WHERE user_id = %s AND profile_id = %s AND profile_type = %s
                ORDER BY created_at DESC
                LIMIT %s
            """, (current_user.id, profile_id, profile_type, limit))
        rows = cur.fetchall()

        earnings = [
            AdvertisementEarning(
                id=row[0],
                referred_user_name=row[1],
                referred_user_profile_picture=row[2],
                advertiser_name=row[3],
                campaign_name=row[4],
                ad_type=row[5],
                impressions=row[6] or 0,
                clicks=row[7] or 0,
                tier_level=row[8] or 1,
                commission_rate=float(row[9]) if row[9] else 0,
                amount=float(row[10]),
                cpm_rate=float(row[11]) if row[11] else None,
                cpc_rate=float(row[12]) if row[12] else None,
                period_start=row[13],
                period_end=row[14],
                status=row[15],
                description=row[16],
                created_at=row[17]
            ) for row in rows
        ]

        # Get tier breakdown summary (only when not filtering by tier)
        tier_summary = []
        if tier_level is None:
            cur.execute("""
                SELECT
                    tier_level,
                    COALESCE(SUM(amount), 0) as total,
                    COUNT(*) as count
                FROM advertisement_earnings
                WHERE user_id = %s AND profile_id = %s AND profile_type = %s
                AND created_at >= NOW() - INTERVAL '%s months'
                GROUP BY tier_level
                ORDER BY tier_level
            """, (current_user.id, profile_id, profile_type, months))
            tier_rows = cur.fetchall()

            # Get affiliate tiers from admin DB for names
            admin_conn = psycopg.connect(ADMIN_DATABASE_URL)
            admin_cur = admin_conn.cursor()
            admin_cur.execute("SELECT tier_level, tier_name, commission_rate FROM affiliate_tiers WHERE is_active = true")
            tier_info = {row[0]: {"name": row[1], "rate": float(row[2])} for row in admin_cur.fetchall()}
            admin_cur.close()
            admin_conn.close()

            tier_summary = [
                TierEarningsSummary(
                    tier_level=row[0],
                    tier_name=tier_info.get(row[0], {}).get("name", f"Level {row[0]}"),
                    commission_rate=tier_info.get(row[0], {}).get("rate", 0),
                    total_earnings=float(row[1]),
                    transaction_count=int(row[2])
                ) for row in tier_rows
            ]

        # Get total summary with optional tier filter
        if tier_level is not None:
            cur.execute("""
                SELECT
                    COALESCE(SUM(amount), 0) as total,
                    COALESCE(SUM(impressions), 0) as total_impressions,
                    COALESCE(SUM(clicks), 0) as total_clicks,
                    COUNT(*) as transaction_count
                FROM advertisement_earnings
                WHERE user_id = %s AND profile_id = %s AND profile_type = %s AND tier_level = %s
                AND created_at >= NOW() - INTERVAL '%s months'
            """, (current_user.id, profile_id, profile_type, tier_level, months))
        else:
            cur.execute("""
                SELECT
                    COALESCE(SUM(amount), 0) as total,
                    COALESCE(SUM(impressions), 0) as total_impressions,
                    COALESCE(SUM(clicks), 0) as total_clicks,
                    COUNT(*) as transaction_count
                FROM advertisement_earnings
                WHERE user_id = %s AND profile_id = %s AND profile_type = %s
                AND created_at >= NOW() - INTERVAL '%s months'
            """, (current_user.id, profile_id, profile_type, months))
        summary = cur.fetchone()

        # Get monthly data for chart with optional tier filter
        if tier_level is not None:
            cur.execute("""
                SELECT
                    EXTRACT(YEAR FROM created_at)::INTEGER as year,
                    EXTRACT(MONTH FROM created_at)::INTEGER as month,
                    COALESCE(SUM(amount), 0) as total
                FROM advertisement_earnings
                WHERE user_id = %s AND profile_id = %s AND profile_type = %s AND tier_level = %s
                AND created_at >= NOW() - INTERVAL '%s months'
                GROUP BY year, month
                ORDER BY year DESC, month DESC
            """, (current_user.id, profile_id, profile_type, tier_level, months))
        else:
            cur.execute("""
                SELECT
                    EXTRACT(YEAR FROM created_at)::INTEGER as year,
                    EXTRACT(MONTH FROM created_at)::INTEGER as month,
                    COALESCE(SUM(amount), 0) as total
                FROM advertisement_earnings
                WHERE user_id = %s AND profile_id = %s AND profile_type = %s
                AND created_at >= NOW() - INTERVAL '%s months'
                GROUP BY year, month
                ORDER BY year DESC, month DESC
            """, (current_user.id, profile_id, profile_type, months))
        monthly_rows = cur.fetchall()

        return {
            "earnings": earnings,
            "tier_summary": tier_summary,
            "summary": {
                "total_amount": float(summary[0]),
                "total_impressions": int(summary[1]),
                "total_clicks": int(summary[2]),
                "transaction_count": int(summary[3])
            },
            "monthly_data": [
                {"year": row[0], "month": row[1], "amount": float(row[2])}
                for row in monthly_rows
            ]
        }

    finally:
        cur.close()
        conn.close()


# ============================================================================
# SUBSCRIPTION AFFILIATE EARNINGS ENDPOINTS
# ============================================================================

@router.get("/api/affiliate/earnings/subscription")
async def get_subscription_affiliate_earnings(
    months: int = Query(6, ge=1, le=12),
    limit: int = Query(20, ge=1, le=100),
    tier_level: Optional[int] = Query(None, description="Filter by tier level"),
    role: str = Query("tutor", description="User role"),
    current_user: dict = Depends(get_current_user)
):
    """Get subscription affiliate earnings list with tier breakdown"""
    profile_info = get_user_profile(current_user.id, role)

    if not profile_info:
        raise HTTPException(status_code=404, detail=f"{role.capitalize()} profile not found")

    profile_id = profile_info['profile_id']
    profile_type = profile_info['profile_type']

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Build query with optional tier filter
        query = """
            SELECT id, referred_user_name, referred_user_profile_picture, subscription_plan,
                   subscription_amount, tier_level, commission_rate, commission_amount,
                   status, description, earned_date
            FROM subscription_affiliate_earnings
            WHERE affiliate_user_id = %s AND affiliate_profile_id = %s AND affiliate_profile_type = %s
        """
        params = [current_user.id, profile_id, profile_type]

        if tier_level is not None:
            query += " AND tier_level = %s"
            params.append(tier_level)

        query += " ORDER BY earned_date DESC LIMIT %s"
        params.append(limit)

        cur.execute(query, params)
        rows = cur.fetchall()

        earnings = [
            SubscriptionAffiliateEarning(
                id=row[0],
                referred_user_name=row[1],
                referred_user_profile_picture=row[2],
                subscription_plan=row[3],
                subscription_amount=float(row[4]),
                tier_level=row[5],
                commission_rate=float(row[6]),
                commission_amount=float(row[7]),
                status=row[8],
                description=row[9],
                earned_date=row[10]
            ) for row in rows
        ]

        # Get tier breakdown summary (only when not filtering by tier)
        tier_summary = []
        if tier_level is None:
            cur.execute("""
                SELECT
                    tier_level,
                    COALESCE(SUM(commission_amount), 0) as total,
                    COUNT(*) as count
                FROM subscription_affiliate_earnings
                WHERE affiliate_user_id = %s AND affiliate_profile_id = %s AND affiliate_profile_type = %s
                AND earned_date >= NOW() - INTERVAL '%s months'
                GROUP BY tier_level
                ORDER BY tier_level
            """, (current_user.id, profile_id, profile_type, months))
            tier_rows = cur.fetchall()

            # Get affiliate tiers from admin DB for names
            admin_conn = psycopg.connect(ADMIN_DATABASE_URL)
            admin_cur = admin_conn.cursor()
            admin_cur.execute("SELECT tier_level, tier_name, commission_rate FROM affiliate_tiers WHERE is_active = true")
            tier_info = {row[0]: {"name": row[1], "rate": float(row[2])} for row in admin_cur.fetchall()}
            admin_cur.close()
            admin_conn.close()

            tier_summary = [
                TierEarningsSummary(
                    tier_level=row[0],
                    tier_name=tier_info.get(row[0], {}).get("name", f"Level {row[0]}"),
                    commission_rate=tier_info.get(row[0], {}).get("rate", 0),
                    total_earnings=float(row[1]),
                    transaction_count=int(row[2])
                ) for row in tier_rows
            ]

        # Get monthly data for chart with optional tier filter
        monthly_query = """
            SELECT
                EXTRACT(YEAR FROM earned_date)::INTEGER as year,
                EXTRACT(MONTH FROM earned_date)::INTEGER as month,
                COALESCE(SUM(commission_amount), 0) as total
            FROM subscription_affiliate_earnings
            WHERE affiliate_user_id = %s AND affiliate_profile_id = %s AND affiliate_profile_type = %s
        """
        monthly_params = [current_user.id, profile_id, profile_type]
        if tier_level is not None:
            monthly_query += " AND tier_level = %s"
            monthly_params.append(tier_level)
        monthly_query += " AND earned_date >= NOW() - INTERVAL '%s months' GROUP BY year, month ORDER BY year DESC, month DESC"
        monthly_params.append(months)
        cur.execute(monthly_query, monthly_params)
        monthly_rows = cur.fetchall()

        # Get total summary with optional tier filter
        total_query = """
            SELECT
                COALESCE(SUM(commission_amount), 0) as total,
                COUNT(*) as count
            FROM subscription_affiliate_earnings
            WHERE affiliate_user_id = %s AND affiliate_profile_id = %s AND affiliate_profile_type = %s
        """
        total_params = [current_user.id, profile_id, profile_type]
        if tier_level is not None:
            total_query += " AND tier_level = %s"
            total_params.append(tier_level)
        total_query += " AND earned_date >= NOW() - INTERVAL '%s months'"
        total_params.append(months)
        cur.execute(total_query, total_params)
        total = cur.fetchone()

        return {
            "earnings": earnings,
            "tier_summary": tier_summary,
            "summary": {
                "total_amount": float(total[0]),
                "transaction_count": int(total[1])
            },
            "monthly_data": [
                {"year": row[0], "month": row[1], "amount": float(row[2])}
                for row in monthly_rows
            ]
        }

    finally:
        cur.close()
        conn.close()


# ============================================================================
# COMMISSION EARNINGS ENDPOINTS
# ============================================================================

@router.get("/api/affiliate/earnings/commission")
async def get_commission_earnings(
    months: int = Query(6, ge=1, le=12),
    limit: int = Query(20, ge=1, le=100),
    tier_level: Optional[int] = Query(None, description="Filter by tier level"),
    role: str = Query("tutor", description="User role"),
    current_user: dict = Depends(get_current_user)
):
    """Get connection commission earnings list with tier breakdown"""
    profile_info = get_user_profile(current_user.id, role)

    if not profile_info:
        raise HTTPException(status_code=404, detail=f"{role.capitalize()} profile not found")

    profile_id = profile_info['profile_id']
    profile_type = profile_info['profile_type']

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Build query with optional tier filter
        query = """
            SELECT id, tutor_name, tutor_profile_picture, student_name, session_amount,
                   tier_level, commission_rate, commission_amount, status, description, earned_date
            FROM connection_commission_earnings
            WHERE facilitator_user_id = %s AND facilitator_profile_id = %s AND facilitator_profile_type = %s
        """
        params = [current_user.id, profile_id, profile_type]

        if tier_level is not None:
            query += " AND tier_level = %s"
            params.append(tier_level)

        query += " ORDER BY earned_date DESC LIMIT %s"
        params.append(limit)

        cur.execute(query, params)
        rows = cur.fetchall()

        earnings = [
            CommissionEarning(
                id=row[0],
                tutor_name=row[1],
                tutor_profile_picture=row[2],
                student_name=row[3],
                session_amount=float(row[4]),
                tier_level=row[5],
                commission_rate=float(row[6]),
                commission_amount=float(row[7]),
                status=row[8],
                description=row[9],
                earned_date=row[10]
            ) for row in rows
        ]

        # Get tier breakdown summary (only when not filtering by tier)
        tier_summary = []
        if tier_level is None:
            cur.execute("""
                SELECT
                    tier_level,
                    COALESCE(SUM(commission_amount), 0) as total,
                    COUNT(*) as count
                FROM connection_commission_earnings
                WHERE facilitator_user_id = %s AND facilitator_profile_id = %s AND facilitator_profile_type = %s
                AND earned_date >= NOW() - INTERVAL '%s months'
                GROUP BY tier_level
                ORDER BY tier_level
            """, (current_user.id, profile_id, profile_type, months))
            tier_rows = cur.fetchall()

            # Get affiliate tiers from admin DB for names
            admin_conn = psycopg.connect(ADMIN_DATABASE_URL)
            admin_cur = admin_conn.cursor()
            admin_cur.execute("SELECT tier_level, tier_name, commission_rate FROM affiliate_tiers WHERE is_active = true")
            tier_info = {row[0]: {"name": row[1], "rate": float(row[2])} for row in admin_cur.fetchall()}
            admin_cur.close()
            admin_conn.close()

            tier_summary = [
                TierEarningsSummary(
                    tier_level=row[0],
                    tier_name=tier_info.get(row[0], {}).get("name", f"Level {row[0]}"),
                    commission_rate=tier_info.get(row[0], {}).get("rate", 0),
                    total_earnings=float(row[1]),
                    transaction_count=int(row[2])
                ) for row in tier_rows
            ]

        # Get monthly data for chart with optional tier filter
        monthly_query = """
            SELECT
                EXTRACT(YEAR FROM earned_date)::INTEGER as year,
                EXTRACT(MONTH FROM earned_date)::INTEGER as month,
                COALESCE(SUM(commission_amount), 0) as total
            FROM connection_commission_earnings
            WHERE facilitator_user_id = %s AND facilitator_profile_id = %s AND facilitator_profile_type = %s
        """
        monthly_params = [current_user.id, profile_id, profile_type]
        if tier_level is not None:
            monthly_query += " AND tier_level = %s"
            monthly_params.append(tier_level)
        monthly_query += " AND earned_date >= NOW() - INTERVAL '%s months' GROUP BY year, month ORDER BY year DESC, month DESC"
        monthly_params.append(months)
        cur.execute(monthly_query, monthly_params)
        monthly_rows = cur.fetchall()

        # Get total summary with optional tier filter
        total_query = """
            SELECT
                COALESCE(SUM(commission_amount), 0) as total,
                COUNT(*) as count
            FROM connection_commission_earnings
            WHERE facilitator_user_id = %s AND facilitator_profile_id = %s AND facilitator_profile_type = %s
        """
        total_params = [current_user.id, profile_id, profile_type]
        if tier_level is not None:
            total_query += " AND tier_level = %s"
            total_params.append(tier_level)
        total_query += " AND earned_date >= NOW() - INTERVAL '%s months'"
        total_params.append(months)
        cur.execute(total_query, total_params)
        total = cur.fetchone()

        return {
            "earnings": earnings,
            "tier_summary": tier_summary,
            "summary": {
                "total_amount": float(total[0]),
                "transaction_count": int(total[1])
            },
            "monthly_data": [
                {"year": row[0], "month": row[1], "amount": float(row[2])}
                for row in monthly_rows
            ]
        }

    finally:
        cur.close()
        conn.close()


# ============================================================================
# COMBINED EARNINGS SUMMARY ENDPOINT (for dashboard cards)
# ============================================================================

@router.get("/api/earnings/combined-summary")
async def get_combined_earnings_summary(
    months: int = Query(6, ge=1, le=12),
    role: str = Query("tutor", description="User role"),
    current_user: dict = Depends(get_current_user)
):
    """Get combined earnings summary for all categories (Total, Affiliate, Tutoring)"""
    profile_info = get_user_profile(current_user.id, role)

    if not profile_info:
        raise HTTPException(status_code=404, detail=f"{role.capitalize()} profile not found")

    profile_id = profile_info['profile_id']
    profile_type = profile_info['profile_type']

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get affiliate earnings (Advertisement + Subscription + Commission)
        cur.execute("""
            SELECT COALESCE(SUM(amount), 0) FROM advertisement_earnings
            WHERE user_id = %s AND profile_id = %s AND profile_type = %s
        """, (current_user.id, profile_id, profile_type))
        ad_total = float(cur.fetchone()[0])

        cur.execute("""
            SELECT COALESCE(SUM(commission_amount), 0) FROM subscription_affiliate_earnings
            WHERE affiliate_user_id = %s AND affiliate_profile_id = %s AND affiliate_profile_type = %s
        """, (current_user.id, profile_id, profile_type))
        sub_total = float(cur.fetchone()[0])

        cur.execute("""
            SELECT COALESCE(SUM(commission_amount), 0) FROM connection_commission_earnings
            WHERE facilitator_user_id = %s AND facilitator_profile_id = %s AND facilitator_profile_type = %s
        """, (current_user.id, profile_id, profile_type))
        comm_total = float(cur.fetchone()[0])

        affiliate_total = ad_total + sub_total + comm_total

        # Get tutoring earnings (only for tutors)
        tutoring_total = 0
        if role == 'tutor':
            cur.execute("""
                SELECT COALESCE(SUM(amount), 0) FROM tutoring_earnings
                WHERE tutor_profile_id = %s
            """, (profile_id,))
            tutoring_total = float(cur.fetchone()[0])

        total_earnings = affiliate_total + tutoring_total

        # Get monthly breakdown for charts
        cur.execute("""
            SELECT
                year, month,
                advertisement_earnings, subscription_earnings, commission_earnings,
                total_affiliate_earnings
            FROM monthly_affiliate_summary
            WHERE user_id = %s AND profile_id = %s AND profile_type = %s
            ORDER BY year DESC, month DESC
            LIMIT %s
        """, (current_user.id, profile_id, profile_type, months))
        monthly_affiliate = cur.fetchall()

        # Get monthly tutoring for tutors
        monthly_tutoring = []
        if role == 'tutor':
            cur.execute("""
                SELECT year, month, tutoring_earnings
                FROM monthly_earnings_summary
                WHERE tutor_profile_id = %s
                ORDER BY year DESC, month DESC
                LIMIT %s
            """, (profile_id, months))
            monthly_tutoring = cur.fetchall()

        return {
            "summary": {
                "total_earnings": total_earnings,
                "affiliate_earnings": affiliate_total,
                "tutoring_earnings": tutoring_total,
                "advertisement_earnings": ad_total,
                "subscription_earnings": sub_total,
                "commission_earnings": comm_total
            },
            "monthly_affiliate": [
                {
                    "year": row[0],
                    "month": row[1],
                    "advertisement": float(row[2]),
                    "subscription": float(row[3]),
                    "commission": float(row[4]),
                    "total": float(row[5])
                } for row in monthly_affiliate
            ],
            "monthly_tutoring": [
                {
                    "year": row[0],
                    "month": row[1],
                    "amount": float(row[2])
                } for row in monthly_tutoring
            ]
        }

    finally:
        cur.close()
        conn.close()
