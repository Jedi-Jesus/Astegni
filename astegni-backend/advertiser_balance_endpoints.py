"""
Advertiser Balance & CPM Billing Endpoints
Handles balance management, deposits, and CPM (Cost Per Mille) billing

Key Features:
- Advertiser balance management (deposit, withdraw, view)
- Transaction history tracking
- CPM billing (charge per 1,000 impressions)
- Real-time impression tracking
- Automatic campaign pause on low balance
- Fair cancellation (only charge for delivered impressions)

Author: Astegni Platform
Date: 2026-01-02
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import psycopg
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

router = APIRouter(prefix="/api/advertiser", tags=["Advertiser Balance"])

# Pydantic models
class DepositRequest(BaseModel):
    amount: float
    payment_method: str  # "card", "bank_transfer", "mobile_money"
    payment_reference: Optional[str] = None

class BalanceResponse(BaseModel):
    balance: float
    currency: str
    total_deposits: float
    total_spent: float
    last_transaction_at: Optional[str] = None

class TransactionResponse(BaseModel):
    id: int
    transaction_type: str
    amount: float
    balance_before: float
    balance_after: float
    description: str
    campaign_id: Optional[int] = None
    campaign_name: Optional[str] = None
    impressions_count: Optional[int] = None
    created_at: str


def get_db():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL)


# ============================================
# BALANCE MANAGEMENT ENDPOINTS
# ============================================

@router.get("/balance")
async def get_advertiser_balance(advertiser_id: int):
    """
    Get advertiser's current balance and spending summary.

    Returns:
        - balance: Current available balance
        - currency: ETB
        - total_deposits: All-time deposits
        - total_spent: All-time spending on campaigns
        - last_transaction_at: Timestamp of last transaction
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                balance,
                currency,
                total_deposits,
                total_spent,
                last_transaction_at
            FROM advertiser_profiles
            WHERE id = %s
        """, (advertiser_id,))

        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Advertiser not found")

        return {
            "success": True,
            "balance": float(row[0]) if row[0] else 0.00,
            "currency": row[1] or "ETB",
            "total_deposits": float(row[2]) if row[2] else 0.00,
            "total_spent": float(row[3]) if row[3] else 0.00,
            "last_transaction_at": row[4].isoformat() if row[4] else None
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching balance: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()


@router.post("/balance/deposit")
async def deposit_balance(advertiser_id: int, request: DepositRequest):
    """
    Deposit funds to advertiser balance.

    Args:
        advertiser_id: Advertiser profile ID
        amount: Amount to deposit (min: 100 ETB)
        payment_method: card, bank_transfer, mobile_money
        payment_reference: Payment gateway reference

    Returns:
        Updated balance and transaction details
    """
    conn = None
    try:
        if request.amount < 100:
            raise HTTPException(status_code=400, detail="Minimum deposit is 100 ETB")

        conn = get_db()
        cursor = conn.cursor()

        # Get current balance
        cursor.execute("""
            SELECT balance, total_deposits
            FROM advertiser_profiles
            WHERE id = %s
        """, (advertiser_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Advertiser not found")

        balance_before = float(row[0]) if row[0] else 0.00
        total_deposits = float(row[1]) if row[1] else 0.00

        # Calculate new balance
        balance_after = balance_before + request.amount
        new_total_deposits = total_deposits + request.amount

        # Update advertiser balance
        cursor.execute("""
            UPDATE advertiser_profiles
            SET
                balance = %s,
                total_deposits = %s,
                last_transaction_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (balance_after, new_total_deposits, advertiser_id))

        # Record transaction
        cursor.execute("""
            INSERT INTO advertiser_transactions (
                advertiser_id,
                transaction_type,
                amount,
                balance_before,
                balance_after,
                payment_method,
                payment_reference,
                description,
                status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            advertiser_id,
            'deposit',
            request.amount,
            balance_before,
            balance_after,
            request.payment_method,
            request.payment_reference,
            f'Deposit of {request.amount} ETB via {request.payment_method}',
            'completed'
        ))

        transaction = cursor.fetchone()
        conn.commit()

        return {
            "success": True,
            "message": f"Deposited {request.amount} ETB successfully",
            "transaction_id": transaction[0],
            "balance_before": balance_before,
            "balance_after": balance_after,
            "created_at": transaction[1].isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing deposit: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()


@router.get("/transactions")
async def get_transactions(
    advertiser_id: int,
    limit: int = 50,
    offset: int = 0,
    transaction_type: Optional[str] = None
):
    """
    Get advertiser's transaction history.

    Args:
        advertiser_id: Advertiser profile ID
        limit: Number of transactions to return (default: 50)
        offset: Pagination offset (default: 0)
        transaction_type: Filter by type (deposit, deduction, refund, adjustment)

    Returns:
        List of transactions with details
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Build query
        query = """
            SELECT
                t.id,
                t.transaction_type,
                t.amount,
                t.balance_before,
                t.balance_after,
                t.description,
                t.campaign_id,
                c.name as campaign_name,
                t.impressions_count,
                t.created_at
            FROM advertiser_transactions t
            LEFT JOIN campaign_profile c ON t.campaign_id = c.id
            WHERE t.advertiser_id = %s
        """
        params = [advertiser_id]

        if transaction_type:
            query += " AND t.transaction_type = %s"
            params.append(transaction_type)

        query += " ORDER BY t.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cursor.execute(query, params)
        rows = cursor.fetchall()

        # Get total count
        count_query = """
            SELECT COUNT(*)
            FROM advertiser_transactions
            WHERE advertiser_id = %s
        """
        count_params = [advertiser_id]

        if transaction_type:
            count_query += " AND transaction_type = %s"
            count_params.append(transaction_type)

        cursor.execute(count_query, count_params)
        total = cursor.fetchone()[0]

        transactions = []
        for row in rows:
            transactions.append({
                "id": row[0],
                "transaction_type": row[1],
                "amount": float(row[2]),
                "balance_before": float(row[3]) if row[3] else 0,
                "balance_after": float(row[4]) if row[4] else 0,
                "description": row[5],
                "campaign_id": row[6],
                "campaign_name": row[7],
                "impressions_count": row[8],
                "created_at": row[9].isoformat() if row[9] else None
            })

        return {
            "success": True,
            "transactions": transactions,
            "total": total,
            "limit": limit,
            "offset": offset
        }

    except Exception as e:
        print(f"Error fetching transactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()


# ============================================
# CPM BILLING INTERNAL FUNCTIONS
# ============================================

def deduct_from_balance(
    advertiser_id: int,
    campaign_id: int,
    amount: float,
    impressions_count: int,
    description: str,
    conn=None
):
    """
    Internal function to deduct from advertiser balance.
    Used by impression tracking system.

    Args:
        advertiser_id: Advertiser profile ID
        campaign_id: Campaign ID
        amount: Amount to deduct
        impressions_count: Number of impressions being charged
        description: Transaction description
        conn: Database connection (optional, will create if not provided)

    Returns:
        Transaction ID or None if insufficient balance
    """
    should_close_conn = False
    if not conn:
        conn = get_db()
        should_close_conn = True

    try:
        cursor = conn.cursor()

        # Get current balance
        cursor.execute("""
            SELECT balance, total_spent
            FROM advertiser_profiles
            WHERE id = %s
        """, (advertiser_id,))

        row = cursor.fetchone()
        if not row:
            return None

        balance_before = float(row[0]) if row[0] else 0.00
        total_spent = float(row[1]) if row[1] else 0.00

        # Check sufficient balance
        if balance_before < amount:
            return None

        # Calculate new balance
        balance_after = balance_before - amount
        new_total_spent = total_spent + amount

        # Update advertiser balance
        cursor.execute("""
            UPDATE advertiser_profiles
            SET
                balance = %s,
                total_spent = %s,
                last_transaction_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (balance_after, new_total_spent, advertiser_id))

        # Record transaction
        cursor.execute("""
            INSERT INTO advertiser_transactions (
                advertiser_id,
                campaign_id,
                transaction_type,
                amount,
                balance_before,
                balance_after,
                description,
                impressions_count,
                status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            advertiser_id,
            campaign_id,
            'deduction',
            amount,
            balance_before,
            balance_after,
            description,
            impressions_count,
            'completed'
        ))

        transaction_id = cursor.fetchone()[0]

        if should_close_conn:
            conn.commit()

        return transaction_id

    except Exception as e:
        print(f"Error deducting from balance: {e}")
        if should_close_conn and conn:
            conn.rollback()
        return None
    finally:
        if should_close_conn and conn:
            cursor.close()
            conn.close()


def check_and_pause_campaign(campaign_id: int, advertiser_id: int, conn=None):
    """
    Check if campaign should be paused due to low balance.

    Args:
        campaign_id: Campaign ID
        advertiser_id: Advertiser profile ID
        conn: Database connection (optional)

    Returns:
        True if paused, False otherwise
    """
    should_close_conn = False
    if not conn:
        conn = get_db()
        should_close_conn = True

    try:
        cursor = conn.cursor()

        # Get campaign CPI rate and minimum balance threshold
        cursor.execute("""
            SELECT cpi_rate, minimum_balance_threshold, billing_frequency
            FROM campaign_profile
            WHERE id = %s
        """, (campaign_id,))

        campaign_row = cursor.fetchone()
        if not campaign_row:
            return False

        cpi_rate = float(campaign_row[0]) if campaign_row[0] else 0.10
        min_threshold = float(campaign_row[1]) if campaign_row[1] else 100.00
        billing_frequency = campaign_row[2] if campaign_row[2] else 1000

        # Get advertiser balance
        cursor.execute("""
            SELECT balance FROM advertiser_profiles WHERE id = %s
        """, (advertiser_id,))

        balance_row = cursor.fetchone()
        if not balance_row:
            return False

        balance = float(balance_row[0]) if balance_row[0] else 0.00

        # Calculate cost for next billing cycle
        next_cycle_cost = cpi_rate * billing_frequency

        # Pause if balance is below threshold or can't afford next cycle
        if balance < min_threshold or balance < next_cycle_cost:
            cursor.execute("""
                UPDATE campaign_profile
                SET
                    verification_status = 'paused',
                    pause_reason = 'insufficient_balance',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (campaign_id,))

            if should_close_conn:
                conn.commit()

            return True

        return False

    except Exception as e:
        print(f"Error checking campaign balance: {e}")
        return False
    finally:
        if should_close_conn and conn:
            cursor.close()
            conn.close()


# Export internal functions for use by impression tracking
__all__ = ['router', 'deduct_from_balance', 'check_and_pause_campaign']
