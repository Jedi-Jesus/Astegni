# Payment Record Deduction/Archiving System

## Overview

Instead of **deleting** old payment records (which causes compliance issues), Astegni uses a **soft-deletion archiving system** that:
- ✅ Maintains historical data for audit/tax compliance
- ✅ Improves query performance by filtering out old records
- ✅ Allows recovery if needed
- ✅ Supports automated archiving via cron jobs

## Quick Start

### 1. Run Migration (One-Time Setup)
```bash
cd astegni-backend
python migrate_add_payment_archive_columns.py
```

This adds to both `enrolled_students` and `user_investments` tables:
- `is_archived` (BOOLEAN, default: FALSE)
- `archived_at` (TIMESTAMP)
- `archived_reason` (VARCHAR)

### 2. Preview What Would Be Archived (Dry Run)
```bash
# Preview archiving records older than 10 years
python archive_old_payment_records.py 10

# Preview archiving records older than 5 years
python archive_old_payment_records.py 5
```

### 3. Archive Records (Live Mode)
```bash
# Archive records older than 10 years
python archive_old_payment_records.py --live 10

# Archive records older than 7 years
python archive_old_payment_records.py --live 7
```

### 4. View Archive Statistics
```bash
python archive_old_payment_records.py --stats
```

### 5. Unarchive Specific Record
```bash
python archive_old_payment_records.py --unarchive 123
```

## How It Works

### Database Schema Changes

**Before:**
```sql
enrolled_students
├── id
├── payment_status
├── agreed_price
└── created_at
```

**After:**
```sql
enrolled_students
├── id
├── payment_status
├── agreed_price
├── created_at
├── is_archived (NEW)
├── archived_at (NEW)
└── archived_reason (NEW)
```

### Archive Process Flow

```
┌─────────────────────────────────────┐
│  Payment Record (10+ years old)    │
│  is_archived: FALSE                 │
│  created_at: 2014-01-15            │
└─────────────────────────────────────┘
              ↓
    ┌─────────────────────┐
    │  Archive Process    │
    └─────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Payment Record (Archived)          │
│  is_archived: TRUE                  │
│  archived_at: 2026-02-02           │
│  archived_reason: "Auto-archived:   │
│                   older than 10yrs" │
└─────────────────────────────────────┘
              ↓
    ┌─────────────────────┐
    │  Hidden from normal │
    │  queries by default │
    └─────────────────────┘
```

## Query Examples

### Get Active (Non-Archived) Records Only
```python
# Default behavior - exclude archived
db.query(EnrolledStudent).filter(
    (EnrolledStudent.is_archived == False) |
    (EnrolledStudent.is_archived == None)
).all()
```

### Include Archived Records
```python
# Get all records including archived
db.query(EnrolledStudent).all()

# Get only archived records
db.query(EnrolledStudent).filter(
    EnrolledStudent.is_archived == True
).all()
```

## Recommended Archive Policies

| Record Type | Archive After | Reason |
|-------------|--------------|---------|
| **Paid/Completed** | 7-10 years | Tax compliance (7 years minimum) |
| **Pending** | 2 years | Unlikely to be paid after 2 years |
| **Cancelled/Rejected** | 1 year | No longer relevant |
| **Disputed** | Never auto-archive | Keep until resolved |

## Automated Archiving (Cron Job)

### Setup Cron Job
```bash
# Edit crontab
crontab -e

# Add this line to run monthly archiving on 1st at 2 AM
0 2 1 * * cd /var/www/astegni/astegni-backend && python archive_old_payment_records.py --live 10 >> /var/log/astegni/archive.log 2>&1
```

### Create Cron Script (Alternative)
```bash
# Create dedicated cron script
cd astegni-backend
```

```python
# cron_archive_payments.py
from archive_old_payment_records import archive_old_payments
import logging

logging.basicConfig(filename='/var/log/astegni/archive.log', level=logging.INFO)

# Archive paid records older than 10 years
archive_old_payments(years=10, dry_run=False)

# Archive cancelled/rejected older than 2 years
# (Add custom logic here)
```

```bash
# Make executable
chmod +x cron_archive_payments.py

# Add to crontab
0 2 1 * * /var/www/astegni/astegni-backend/venv/bin/python /var/www/astegni/astegni-backend/cron_archive_payments.py
```

## API Integration

### Add Archive Endpoint
```python
# In admin_endpoints.py or new file: payment_archive_endpoints.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

router = APIRouter()

@router.post("/api/admin/payments/archive")
async def archive_payments(
    years: int = 10,
    payment_status: str = None,
    dry_run: bool = True,
    db: Session = Depends(get_db),
    current_user = Depends(get_admin_user)  # Admin only
):
    """
    Archive payment records older than X years

    Args:
        years: Archive records older than this many years
        payment_status: Optional filter by payment status
        dry_run: If True, only return count without archiving
    """
    cutoff_date = datetime.now() - timedelta(days=365 * years)

    query = db.query(EnrolledStudent).filter(
        EnrolledStudent.created_at < cutoff_date,
        (EnrolledStudent.is_archived == False) | (EnrolledStudent.is_archived == None)
    )

    if payment_status:
        query = query.filter(EnrolledStudent.payment_status == payment_status)

    count = query.count()

    if not dry_run:
        query.update({
            "is_archived": True,
            "archived_at": datetime.now(),
            "archived_reason": f"Auto-archived: older than {years} years"
        })
        db.commit()

    return {
        "archived_count": count,
        "cutoff_date": cutoff_date,
        "dry_run": dry_run
    }

@router.get("/api/admin/payments/archive/stats")
async def get_archive_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    """Get statistics about archived records"""

    total = db.query(EnrolledStudent).count()
    archived = db.query(EnrolledStudent).filter(EnrolledStudent.is_archived == True).count()
    active = total - archived

    return {
        "total": total,
        "active": active,
        "archived": archived,
        "archive_percentage": round((archived / total * 100) if total > 0 else 0, 2)
    }

@router.post("/api/admin/payments/unarchive/{enrollment_id}")
async def unarchive_payment(
    enrollment_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    """Unarchive a specific payment record"""

    enrollment = db.query(EnrolledStudent).filter(EnrolledStudent.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    enrollment.is_archived = False
    enrollment.archived_at = None
    enrollment.archived_reason = None

    # Unarchive related user_investment
    db.query(UserInvestment).filter(
        UserInvestment.student_payment_id == enrollment_id
    ).update({
        "is_archived": False,
        "archived_at": None,
        "archived_reason": None
    })

    db.commit()

    return {"message": "Payment record unarchived successfully"}
```

## Frontend Updates

### Update Queries to Exclude Archived by Default
```javascript
// Before
const response = await fetch(`${API_BASE_URL}/api/parent/payments`);

// After - exclude archived by default
const response = await fetch(`${API_BASE_URL}/api/parent/payments?include_archived=false`);

// Or include archived for full history
const response = await fetch(`${API_BASE_URL}/api/parent/payments?include_archived=true`);
```

### Update Backend Endpoint
```python
@router.get("/api/parent/payments")
async def get_parent_payments(
    parent_id: int,
    include_archived: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(EnrolledStudent).join(
        StudentProfile, StudentProfile.id == EnrolledStudent.student_id
    ).join(
        ParentProfile, ParentProfile.children_ids.contains([StudentProfile.id])
    ).filter(ParentProfile.id == parent_id)

    # Exclude archived by default
    if not include_archived:
        query = query.filter(
            (EnrolledStudent.is_archived == False) | (EnrolledStudent.is_archived == None)
        )

    return query.all()
```

## Safety Features

1. **Dry Run by Default** - Preview before archiving
2. **Detailed Logging** - Track all archive operations
3. **Recovery Capability** - Unarchive if needed
4. **Archive Reason** - Audit trail for compliance
5. **No Hard Deletes** - Data never permanently removed

## Benefits

✅ **Compliance**: Maintain records for tax/legal requirements
✅ **Performance**: Faster queries by filtering archived records
✅ **Flexibility**: Easy to recover if needed
✅ **Audit Trail**: Complete history with archive reasons
✅ **Automation**: Set-and-forget with cron jobs

## Summary

Instead of **deleting** payment records after 10 years:
1. Run migration to add archive columns
2. Use `archive_old_payment_records.py` to mark old records as archived
3. Update queries to filter `is_archived = FALSE` by default
4. Set up automated archiving via cron job
5. Records remain in database but are hidden from normal operations

This approach maintains **data integrity** while improving **query performance**! 🎉
