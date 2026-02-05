"""
Payment Processing Endpoints
Handles payment processing for subscriptions and bookings
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime, date
import psycopg
from dotenv import load_dotenv
import os
import jwt
from jwt import PyJWTError

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")
ALGORITHM = "HS256"

router = APIRouter(tags=["payments"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ============================================
# AUTHENTICATION
# ============================================

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=500, detail="Database URL not configured")
    return psycopg.connect(database_url)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        user_id = int(user_id)
    except (PyJWTError, ValueError):
        raise credentials_exception

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT id, first_name, father_name, email, roles, active_role
            FROM users
            WHERE id = %s
        """, (user_id,))

        row = cur.fetchone()
        if not row:
            raise credentials_exception

        return {
            "id": row[0],
            "first_name": row[1],
            "father_name": row[2],
            "email": row[3],
            "roles": row[4] if isinstance(row[4], list) else [],
            "active_role": row[5]
        }
    finally:
        cur.close()
        conn.close()

# ============================================
# PYDANTIC MODELS
# ============================================

class ProcessPaymentRequest(BaseModel):
    investment_id: int
    payment_method: Literal["bank_transfer", "mobile_money", "cash", "chapa", "telebirr", "mpesa", "stripe"]
    transaction_id: Optional[str] = None
    payment_gateway: Optional[str] = None

class PaymentResponse(BaseModel):
    success: bool
    message: str
    investment_id: int
    payment_status: str
    paid_date: Optional[datetime] = None

# ============================================
# PAYMENT ENDPOINTS
# ============================================

@router.post("/api/payments/process", response_model=PaymentResponse)
async def process_payment(
    payment_request: ProcessPaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Process payment for a subscription or booking

    Updates both user_investments and enrolled_students (for bookings)
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get investment details
        cur.execute("""
            SELECT id, user_id, investment_type, student_payment_id, payment_status
            FROM user_investments
            WHERE id = %s
        """, (payment_request.investment_id,))

        investment = cur.fetchone()
        if not investment:
            raise HTTPException(status_code=404, detail="Investment not found")

        investment_id, user_id, investment_type, student_payment_id, current_status = investment

        # Check if user owns this investment
        if user_id != current_user["id"]:
            raise HTTPException(status_code=403, detail="You don't have permission to pay for this investment")

        # Check if already paid
        if current_status == 'paid':
            return PaymentResponse(
                success=False,
                message="Payment already processed",
                investment_id=investment_id,
                payment_status="paid"
            )

        # Update user_investments
        cur.execute("""
            UPDATE user_investments
            SET payment_status = 'paid',
                paid_date = CURRENT_TIMESTAMP,
                payment_method = %s,
                transaction_id = %s,
                payment_gateway = %s,
                days_overdue = 0,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (
            payment_request.payment_method,
            payment_request.transaction_id,
            payment_request.payment_gateway,
            investment_id
        ))

        # If this is a booking payment, also update enrolled_students
        if investment_type == 'booking' and student_payment_id:
            cur.execute("""
                UPDATE enrolled_students
                SET payment_status = 'paid',
                    payment_received_date = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (student_payment_id,))

        conn.commit()

        return PaymentResponse(
            success=True,
            message="Payment processed successfully",
            investment_id=investment_id,
            payment_status="paid",
            paid_date=datetime.now()
        )

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing payment: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.get("/api/payments/history")
async def get_payment_history(
    current_user: dict = Depends(get_current_user)
):
    """
    Get payment history for current user

    Returns all user_investments with calculated amounts
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get all investments with amounts calculated
        cur.execute("""
            SELECT
                ui.id,
                ui.investment_type,
                ui.investment_name,
                ui.subscription_plan_id,
                ui.student_payment_id,
                CASE
                    WHEN ui.investment_type = 'booking' THEN es.agreed_price
                    ELSE ui.amount
                END as amount,
                ui.due_date,
                ui.paid_date,
                ui.payment_status,
                ui.days_overdue,
                ui.late_fee,
                ui.payment_method,
                ui.transaction_id,
                ui.created_at,
                -- Enrollment details for bookings
                es.tutor_id,
                es.package_id,
                es.total_sessions,
                es.completed_sessions
            FROM user_investments ui
            LEFT JOIN enrolled_students es ON es.id = ui.student_payment_id
            WHERE ui.user_id = %s
            AND ui.investment_type IN ('subscription', 'booking')
            ORDER BY ui.created_at DESC
        """, (current_user["id"],))

        investments = []
        for row in cur.fetchall():
            investments.append({
                "id": row[0],
                "investment_type": row[1],
                "investment_name": row[2],
                "subscription_plan_id": row[3],
                "student_payment_id": row[4],
                "amount": float(row[5]) if row[5] else None,
                "due_date": row[6].isoformat() if row[6] else None,
                "paid_date": row[7].isoformat() if row[7] else None,
                "payment_status": row[8],
                "days_overdue": row[9],
                "late_fee": float(row[10]) if row[10] else 0.0,
                "payment_method": row[11],
                "transaction_id": row[12],
                "created_at": row[13].isoformat() if row[13] else None,
                # Booking-specific details
                "enrollment": {
                    "tutor_id": row[14],
                    "package_id": row[15],
                    "total_sessions": row[16],
                    "completed_sessions": row[17]
                } if row[1] == 'booking' else None
            })

        return {
            "success": True,
            "count": len(investments),
            "payments": investments
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching payment history: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.get("/api/payments/overdue")
async def get_overdue_payments(
    current_user: dict = Depends(get_current_user)
):
    """
    Get overdue payments for current user

    Uses the overdue_payments view
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                id, investment_type, subscription_plan_id, student_payment_id,
                amount, due_date, payment_status, days_overdue, late_fee,
                actual_days_overdue
            FROM overdue_payments
            WHERE user_id = %s
            ORDER BY due_date ASC
        """, (current_user["id"],))

        overdue = []
        for row in cur.fetchall():
            # For bookings, get amount from enrolled_students
            amount = row[4]
            if row[1] == 'booking' and row[3]:
                cur.execute("SELECT agreed_price FROM enrolled_students WHERE id = %s", (row[3],))
                agreed_price_row = cur.fetchone()
                if agreed_price_row:
                    amount = agreed_price_row[0]

            overdue.append({
                "id": row[0],
                "investment_type": row[1],
                "subscription_plan_id": row[2],
                "student_payment_id": row[3],
                "amount": float(amount) if amount else None,
                "due_date": row[5].isoformat() if row[5] else None,
                "payment_status": row[6],
                "days_overdue": row[7],
                "late_fee": float(row[8]) if row[8] else 0.0,
                "actual_days_overdue": row[9]
            })

        return {
            "success": True,
            "count": len(overdue),
            "overdue_payments": overdue,
            "total_debt": sum(p["amount"] for p in overdue if p["amount"]),
            "total_late_fees": sum(p["late_fee"] for p in overdue)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching overdue payments: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.get("/api/payments/enrollment/{enrollment_id}")
async def get_enrollment_payment(
    enrollment_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Get payment details for a specific enrollment

    Uses the enrollment_payments view
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                enrollment_id, tutor_id, tutor_user_id, student_id, student_user_id,
                package_id, package_name, package_hourly_rate, agreed_price,
                payment_status, payment_due_date, payment_received_date,
                total_sessions, completed_sessions, cancelled_sessions,
                enrolled_at, is_overdue, days_overdue
            FROM enrollment_payments
            WHERE enrollment_id = %s
        """, (enrollment_id,))

        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Enrollment not found")

        # Check if user has access (student or tutor)
        if current_user["id"] != row[2] and current_user["id"] != row[4]:
            raise HTTPException(status_code=403, detail="You don't have permission to view this enrollment")

        return {
            "success": True,
            "enrollment": {
                "enrollment_id": row[0],
                "tutor_id": row[1],
                "tutor_user_id": row[2],
                "student_id": row[3],
                "student_user_id": row[4],
                "package_id": row[5],
                "package_name": row[6],
                "package_hourly_rate": float(row[7]) if row[7] else None,
                "agreed_price": float(row[8]) if row[8] else None,
                "payment_status": row[9],
                "payment_due_date": row[10].isoformat() if row[10] else None,
                "payment_received_date": row[11].isoformat() if row[11] else None,
                "total_sessions": row[12],
                "completed_sessions": row[13],
                "cancelled_sessions": row[14],
                "enrolled_at": row[15].isoformat() if row[15] else None,
                "is_overdue": row[16],
                "days_overdue": row[17]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching enrollment payment: {str(e)}")
    finally:
        cur.close()
        conn.close()
