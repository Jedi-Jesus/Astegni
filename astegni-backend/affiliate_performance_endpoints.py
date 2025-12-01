"""
Affiliate Performance Endpoints
Provides statistics and analytics for the affiliate program
"""

from fastapi import APIRouter, HTTPException
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

router = APIRouter(prefix="/api/admin", tags=["Affiliate Performance"])

@router.get("/affiliate-performance")
async def get_affiliate_performance():
    """Get affiliate performance statistics"""

    conn = None
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        # Get active affiliates count
        cursor.execute("""
            SELECT COUNT(*) FROM affiliates WHERE status = 'active'
        """)
        active_affiliates = cursor.fetchone()[0]

        # Get total referrals count (completed referrals)
        cursor.execute("""
            SELECT COUNT(*) FROM affiliate_referrals WHERE status = 'completed'
        """)
        total_referrals = cursor.fetchone()[0]

        # Get total commissions paid
        cursor.execute("""
            SELECT COALESCE(SUM(amount), 0)
            FROM affiliate_commissions
            WHERE status = 'paid'
        """)
        total_commissions = float(cursor.fetchone()[0])

        # Additional stats
        cursor.execute("""
            SELECT
                COUNT(*) as pending_referrals,
                COALESCE(SUM(commission_earned), 0) as pending_commissions
            FROM affiliate_referrals
            WHERE status = 'pending'
        """)
        row = cursor.fetchone()
        pending_referrals = row[0]
        pending_commissions = float(row[1])

        # Top performing affiliates
        cursor.execute("""
            SELECT
                a.id,
                u.username,
                u.email,
                a.affiliate_code,
                a.total_referrals,
                a.total_earnings,
                a.total_paid
            FROM affiliates a
            JOIN users u ON a.user_id = u.id
            WHERE a.status = 'active'
            ORDER BY a.total_earnings DESC
            LIMIT 5
        """)
        top_affiliates_rows = cursor.fetchall()
        top_affiliates = []
        for row in top_affiliates_rows:
            top_affiliates.append({
                "id": row[0],
                "username": row[1],
                "email": row[2],
                "affiliate_code": row[3],
                "total_referrals": row[4],
                "total_earnings": float(row[5]),
                "total_paid": float(row[6])
            })

        # Recent conversions
        cursor.execute("""
            SELECT
                ar.id,
                ar.conversion_type,
                ar.conversion_value,
                ar.commission_earned,
                ar.converted_at,
                u.username as referred_username,
                a.affiliate_code
            FROM affiliate_referrals ar
            JOIN affiliates a ON ar.affiliate_id = a.id
            LEFT JOIN users u ON ar.referred_user_id = u.id
            WHERE ar.status = 'completed'
            ORDER BY ar.converted_at DESC
            LIMIT 10
        """)
        recent_conversions_rows = cursor.fetchall()
        recent_conversions = []
        for row in recent_conversions_rows:
            recent_conversions.append({
                "id": row[0],
                "conversion_type": row[1],
                "conversion_value": float(row[2]),
                "commission_earned": float(row[3]),
                "converted_at": row[4].isoformat() if row[4] else None,
                "referred_username": row[5],
                "affiliate_code": row[6]
            })

        return {
            "success": True,
            "active_affiliates": active_affiliates,
            "total_referrals": total_referrals,
            "total_commissions": total_commissions,
            "pending_referrals": pending_referrals,
            "pending_commissions": pending_commissions,
            "top_affiliates": top_affiliates,
            "recent_conversions": recent_conversions
        }

    except Exception as e:
        print(f"Error fetching affiliate performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()

@router.get("/affiliate-performance/detailed")
async def get_detailed_affiliate_performance():
    """Get detailed affiliate performance with breakdown by time period"""

    conn = None
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        # Monthly statistics for the last 12 months
        cursor.execute("""
            SELECT
                DATE_TRUNC('month', converted_at) as month,
                COUNT(*) as referrals,
                COALESCE(SUM(commission_earned), 0) as commissions
            FROM affiliate_referrals
            WHERE status = 'completed'
                AND converted_at >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', converted_at)
            ORDER BY month DESC
        """)
        monthly_rows = cursor.fetchall()
        monthly_stats = []
        for row in monthly_rows:
            monthly_stats.append({
                "month": row[0].isoformat() if row[0] else None,
                "referrals": row[1],
                "commissions": float(row[2])
            })

        # Conversion rate by type
        cursor.execute("""
            SELECT
                conversion_type,
                COUNT(*) as count,
                COALESCE(AVG(conversion_value), 0) as avg_value,
                COALESCE(SUM(commission_earned), 0) as total_commission
            FROM affiliate_referrals
            WHERE status = 'completed'
            GROUP BY conversion_type
            ORDER BY count DESC
        """)
        conversion_type_rows = cursor.fetchall()
        conversion_by_type = []
        for row in conversion_type_rows:
            conversion_by_type.append({
                "type": row[0],
                "count": row[1],
                "average_value": float(row[2]),
                "total_commission": float(row[3])
            })

        return {
            "success": True,
            "monthly_stats": monthly_stats,
            "conversion_by_type": conversion_by_type
        }

    except Exception as e:
        print(f"Error fetching detailed affiliate performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()
