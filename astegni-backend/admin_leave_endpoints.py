"""
Admin Leave Request Endpoints
Handles CRUD operations for admin leave requests
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import psycopg
from psycopg.types.json import Json
from dotenv import load_dotenv
import os
from datetime import datetime, date

load_dotenv()

# Use ADMIN_DATABASE_URL for admin tables (astegni_admin_db)
ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

router = APIRouter(prefix="/api/admin/leave", tags=["Admin Leave Requests"])


# ============================================
# PYDANTIC MODELS
# ============================================

class LeaveRequestCreate(BaseModel):
    leave_type: str  # annual, sick, personal, unpaid, maternity, paternity, bereavement
    start_date: str  # YYYY-MM-DD format
    end_date: str  # YYYY-MM-DD format
    reason: str
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    handover_notes: Optional[str] = None


class LeaveRequestResponse(BaseModel):
    id: int
    admin_id: int
    leave_type: str
    start_date: str
    end_date: str
    reason: str
    status: str
    approved_by: Optional[int]
    approved_at: Optional[str]
    rejection_reason: Optional[str]
    emergency_contact_name: Optional[str]
    emergency_contact_phone: Optional[str]
    handover_notes: Optional[str]
    attachments: List[str]
    created_at: str


class LeaveBalanceResponse(BaseModel):
    annual_leave_balance: int
    sick_leave_balance: int
    personal_leave_balance: int
    total_used_this_year: int


class LeaveRequestApproval(BaseModel):
    approved: bool
    rejection_reason: Optional[str] = None


# ============================================
# HELPER FUNCTIONS
# ============================================

def get_connection():
    """Get admin database connection (astegni_admin_db)"""
    return psycopg.connect(ADMIN_DATABASE_URL)


def calculate_days(start_date: str, end_date: str) -> int:
    """Calculate number of days between two dates"""
    start = datetime.strptime(start_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_date, "%Y-%m-%d").date()
    return (end - start).days + 1


# ============================================
# ENDPOINTS
# ============================================

@router.get("/balance/{admin_id}")
async def get_leave_balance(admin_id: int):
    """Get leave balance for an admin"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get leave balance from admin_profile
        cursor.execute("""
            SELECT annual_leave_balance, sick_leave_balance, personal_leave_balance
            FROM admin_profile
            WHERE id = %s
        """, (admin_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Admin profile not found")

        # Calculate total used this year
        current_year = datetime.now().year
        cursor.execute("""
            SELECT COALESCE(SUM(end_date - start_date + 1), 0) as total_days
            FROM admin_leave_requests
            WHERE admin_id = %s
            AND status = 'approved'
            AND EXTRACT(YEAR FROM start_date) = %s
        """, (admin_id, current_year))

        total_used = cursor.fetchone()[0] or 0

        return {
            "annual_leave_balance": row[0] or 20,
            "sick_leave_balance": row[1] or 10,
            "personal_leave_balance": row[2] or 5,
            "total_used_this_year": int(total_used)
        }

    finally:
        cursor.close()
        conn.close()


@router.get("/requests/{admin_id}")
async def get_leave_requests(admin_id: int, status: Optional[str] = None):
    """Get all leave requests for an admin"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        query = """
            SELECT id, admin_id, leave_type, start_date, end_date, reason, status,
                   approved_by, approved_at, rejection_reason, emergency_contact_name,
                   emergency_contact_phone, handover_notes, attachments, created_at
            FROM admin_leave_requests
            WHERE admin_id = %s
        """
        params = [admin_id]

        if status:
            query += " AND status = %s"
            params.append(status)

        query += " ORDER BY created_at DESC"

        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()

        requests = []
        for row in rows:
            requests.append({
                "id": row[0],
                "admin_id": row[1],
                "leave_type": row[2],
                "start_date": row[3].isoformat() if row[3] else None,
                "end_date": row[4].isoformat() if row[4] else None,
                "reason": row[5],
                "status": row[6],
                "approved_by": row[7],
                "approved_at": row[8].isoformat() if row[8] else None,
                "rejection_reason": row[9],
                "emergency_contact_name": row[10],
                "emergency_contact_phone": row[11],
                "handover_notes": row[12],
                "attachments": row[13] or [],
                "created_at": row[14].isoformat() if row[14] else None,
                "days": calculate_days(row[3].isoformat(), row[4].isoformat()) if row[3] and row[4] else 0
            })

        return {"requests": requests, "total": len(requests)}

    finally:
        cursor.close()
        conn.close()


@router.post("/requests/{admin_id}")
async def create_leave_request(admin_id: int, request_data: LeaveRequestCreate):
    """Create a new leave request"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Validate admin exists
        cursor.execute("SELECT id FROM admin_profile WHERE id = %s", (admin_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Admin profile not found")

        # Validate dates
        start_date = datetime.strptime(request_data.start_date, "%Y-%m-%d").date()
        end_date = datetime.strptime(request_data.end_date, "%Y-%m-%d").date()

        if end_date < start_date:
            raise HTTPException(status_code=400, detail="End date cannot be before start date")

        if start_date < date.today():
            raise HTTPException(status_code=400, detail="Start date cannot be in the past")

        # Check for overlapping requests
        cursor.execute("""
            SELECT id FROM admin_leave_requests
            WHERE admin_id = %s
            AND status != 'rejected'
            AND (
                (start_date <= %s AND end_date >= %s) OR
                (start_date <= %s AND end_date >= %s) OR
                (start_date >= %s AND end_date <= %s)
            )
        """, (admin_id, start_date, start_date, end_date, end_date, start_date, end_date))

        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="You already have a leave request for this period")

        # Check leave balance for the type
        leave_type = request_data.leave_type.lower()
        days_requested = (end_date - start_date).days + 1

        if leave_type in ['annual', 'sick', 'personal']:
            balance_column = f"{leave_type}_leave_balance"
            cursor.execute(f"SELECT {balance_column} FROM admin_profile WHERE id = %s", (admin_id,))
            balance = cursor.fetchone()[0] or 0

            if days_requested > balance:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient {leave_type} leave balance. Available: {balance} days, Requested: {days_requested} days"
                )

        # Create leave request
        cursor.execute("""
            INSERT INTO admin_leave_requests (
                admin_id, leave_type, start_date, end_date, reason,
                emergency_contact_name, emergency_contact_phone, handover_notes,
                status, created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'pending', %s, %s)
            RETURNING id
        """, (
            admin_id,
            request_data.leave_type,
            start_date,
            end_date,
            request_data.reason,
            request_data.emergency_contact_name,
            request_data.emergency_contact_phone,
            request_data.handover_notes,
            datetime.now(),
            datetime.now()
        ))

        request_id = cursor.fetchone()[0]
        conn.commit()

        return {
            "id": request_id,
            "message": "Leave request submitted successfully",
            "status": "pending",
            "days_requested": days_requested
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error creating leave request: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create leave request: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.get("/request/{request_id}")
async def get_leave_request(request_id: int):
    """Get a specific leave request"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT lr.id, lr.admin_id, lr.leave_type, lr.start_date, lr.end_date, lr.reason,
                   lr.status, lr.approved_by, lr.approved_at, lr.rejection_reason,
                   lr.emergency_contact_name, lr.emergency_contact_phone, lr.handover_notes,
                   lr.attachments, lr.created_at,
                   ap.first_name, ap.father_name
            FROM admin_leave_requests lr
            JOIN admin_profile ap ON lr.admin_id = ap.id
            WHERE lr.id = %s
        """, (request_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Leave request not found")

        return {
            "id": row[0],
            "admin_id": row[1],
            "admin_name": f"{row[15]} {row[16]}",
            "leave_type": row[2],
            "start_date": row[3].isoformat() if row[3] else None,
            "end_date": row[4].isoformat() if row[4] else None,
            "reason": row[5],
            "status": row[6],
            "approved_by": row[7],
            "approved_at": row[8].isoformat() if row[8] else None,
            "rejection_reason": row[9],
            "emergency_contact_name": row[10],
            "emergency_contact_phone": row[11],
            "handover_notes": row[12],
            "attachments": row[13] or [],
            "created_at": row[14].isoformat() if row[14] else None,
            "days": calculate_days(row[3].isoformat(), row[4].isoformat()) if row[3] and row[4] else 0
        }

    finally:
        cursor.close()
        conn.close()


@router.put("/request/{request_id}/approve")
async def approve_leave_request(request_id: int, approver_id: int, approval: LeaveRequestApproval):
    """Approve or reject a leave request"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get the leave request
        cursor.execute("""
            SELECT admin_id, leave_type, start_date, end_date, status
            FROM admin_leave_requests
            WHERE id = %s
        """, (request_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Leave request not found")

        if row[4] != 'pending':
            raise HTTPException(status_code=400, detail=f"Leave request is already {row[4]}")

        admin_id = row[0]
        leave_type = row[1].lower()
        start_date = row[2]
        end_date = row[3]
        days = (end_date - start_date).days + 1

        if approval.approved:
            # Deduct from leave balance
            if leave_type in ['annual', 'sick', 'personal']:
                balance_column = f"{leave_type}_leave_balance"
                cursor.execute(f"""
                    UPDATE admin_profile
                    SET {balance_column} = {balance_column} - %s
                    WHERE id = %s AND {balance_column} >= %s
                """, (days, admin_id, days))

                if cursor.rowcount == 0:
                    raise HTTPException(status_code=400, detail="Insufficient leave balance")

            # Update request status
            cursor.execute("""
                UPDATE admin_leave_requests
                SET status = 'approved', approved_by = %s, approved_at = %s, updated_at = %s
                WHERE id = %s
            """, (approver_id, datetime.now(), datetime.now(), request_id))

            conn.commit()
            return {"message": "Leave request approved", "status": "approved"}

        else:
            # Reject the request
            cursor.execute("""
                UPDATE admin_leave_requests
                SET status = 'rejected', approved_by = %s, approved_at = %s,
                    rejection_reason = %s, updated_at = %s
                WHERE id = %s
            """, (approver_id, datetime.now(), approval.rejection_reason, datetime.now(), request_id))

            conn.commit()
            return {"message": "Leave request rejected", "status": "rejected"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error processing leave approval: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process approval: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.delete("/request/{request_id}")
async def cancel_leave_request(request_id: int, admin_id: int):
    """Cancel a pending leave request"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Verify request exists and belongs to admin
        cursor.execute("""
            SELECT admin_id, status
            FROM admin_leave_requests
            WHERE id = %s
        """, (request_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Leave request not found")

        if row[0] != admin_id:
            raise HTTPException(status_code=403, detail="You can only cancel your own leave requests")

        if row[1] != 'pending':
            raise HTTPException(status_code=400, detail=f"Cannot cancel a {row[1]} leave request")

        # Delete the request
        cursor.execute("DELETE FROM admin_leave_requests WHERE id = %s", (request_id,))
        conn.commit()

        return {"message": "Leave request cancelled successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        print(f"Error cancelling leave request: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cancel request: {str(e)}")
    finally:
        cursor.close()
        conn.close()


@router.get("/all-pending")
async def get_all_pending_requests():
    """Get all pending leave requests (for managers/admins to approve)"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT lr.id, lr.admin_id, lr.leave_type, lr.start_date, lr.end_date, lr.reason,
                   lr.status, lr.created_at, ap.first_name, ap.father_name,
                   lr.emergency_contact_name, lr.emergency_contact_phone
            FROM admin_leave_requests lr
            JOIN admin_profile ap ON lr.admin_id = ap.id
            WHERE lr.status = 'pending'
            ORDER BY lr.created_at ASC
        """)

        rows = cursor.fetchall()
        requests = []
        for row in rows:
            requests.append({
                "id": row[0],
                "admin_id": row[1],
                "admin_name": f"{row[8]} {row[9]}",
                "leave_type": row[2],
                "start_date": row[3].isoformat() if row[3] else None,
                "end_date": row[4].isoformat() if row[4] else None,
                "reason": row[5],
                "status": row[6],
                "created_at": row[7].isoformat() if row[7] else None,
                "emergency_contact_name": row[10],
                "emergency_contact_phone": row[11],
                "days": calculate_days(row[3].isoformat(), row[4].isoformat()) if row[3] and row[4] else 0
            })

        return {"requests": requests, "total": len(requests)}

    finally:
        cursor.close()
        conn.close()
