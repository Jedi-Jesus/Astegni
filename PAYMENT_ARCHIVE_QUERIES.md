# Payment Archive Query Examples

## Overview
Instead of deleting old payment records, we use **soft deletion** with archive flags. This maintains historical data for:
- Audit compliance
- Tax records
- Dispute resolution
- Analytics

## Common Queries

### 1. Get Active (Non-Archived) Payment Records
```sql
-- Active enrollments only
SELECT * FROM enrolled_students
WHERE is_archived = FALSE OR is_archived IS NULL
ORDER BY created_at DESC;

-- Active payments only
SELECT * FROM user_investments
WHERE student_payment_id IS NOT NULL
AND (is_archived = FALSE OR is_archived IS NULL)
ORDER BY created_at DESC;
```

### 2. Get Archived Payment Records
```sql
-- All archived enrollments
SELECT * FROM enrolled_students
WHERE is_archived = TRUE
ORDER BY archived_at DESC;

-- Archived payments with reasons
SELECT
    id,
    tutor_id,
    student_id,
    payment_status,
    agreed_price,
    archived_at,
    archived_reason
FROM enrolled_students
WHERE is_archived = TRUE;
```

### 3. Archive Records Older Than X Years
```sql
-- Preview what would be archived (10 years)
SELECT
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM enrolled_students
WHERE created_at < NOW() - INTERVAL '10 years'
AND (is_archived = FALSE OR is_archived IS NULL);

-- Actually archive them
UPDATE enrolled_students
SET
    is_archived = TRUE,
    archived_at = NOW(),
    archived_reason = 'Auto-archived: older than 10 years'
WHERE created_at < NOW() - INTERVAL '10 years'
AND (is_archived = FALSE OR is_archived IS NULL);
```

### 4. Archive Completed/Paid Records Only
```sql
-- Archive only paid enrollments older than 5 years
UPDATE enrolled_students
SET
    is_archived = TRUE,
    archived_at = NOW(),
    archived_reason = 'Auto-archived: completed payment over 5 years ago'
WHERE payment_status = 'paid'
AND payment_received_date < NOW() - INTERVAL '5 years'
AND (is_archived = FALSE OR is_archived IS NULL);
```

### 5. Get Archive Statistics
```sql
-- Enrollment archive stats
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN is_archived = TRUE THEN 1 END) as archived,
    COUNT(CASE WHEN is_archived = FALSE OR is_archived IS NULL THEN 1 END) as active,
    ROUND(COUNT(CASE WHEN is_archived = TRUE THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as archive_percent
FROM enrolled_students;

-- Payment archive stats by year
SELECT
    EXTRACT(YEAR FROM created_at) as year,
    COUNT(*) as total,
    COUNT(CASE WHEN is_archived = TRUE THEN 1 END) as archived,
    COUNT(CASE WHEN is_archived = FALSE OR is_archived IS NULL THEN 1 END) as active
FROM enrolled_students
GROUP BY EXTRACT(YEAR FROM created_at)
ORDER BY year DESC;
```

### 6. Unarchive Specific Record
```sql
-- Unarchive an enrollment
UPDATE enrolled_students
SET
    is_archived = FALSE,
    archived_at = NULL,
    archived_reason = NULL
WHERE id = 123;

-- Unarchive related payment
UPDATE user_investments
SET
    is_archived = FALSE,
    archived_at = NULL,
    archived_reason = NULL
WHERE student_payment_id = 123;
```

### 7. Parent Payment History (Include Archived)
```sql
-- Get all payment history for a parent's children (including archived)
SELECT
    es.id,
    es.created_at,
    es.payment_status,
    es.agreed_price,
    es.payment_received_date,
    es.is_archived,
    es.archived_reason,
    sp.username as student_name,
    tp.username as tutor_name
FROM enrolled_students es
JOIN student_profiles sp ON sp.id = es.student_id
JOIN tutor_profiles tp ON tp.id = es.tutor_id
JOIN parent_profiles pp ON pp.id = :parent_id
WHERE es.student_id = ANY(pp.children_ids)
ORDER BY es.created_at DESC;
```

### 8. Financial Reports (Active Only)
```sql
-- Total revenue from active (non-archived) payments
SELECT
    SUM(agreed_price) as total_revenue,
    COUNT(*) as total_enrollments,
    COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_count,
    COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_count
FROM enrolled_students
WHERE (is_archived = FALSE OR is_archived IS NULL);
```

### 9. Archive by Payment Status
```sql
-- Archive only cancelled/rejected enrollments older than 2 years
UPDATE enrolled_students
SET
    is_archived = TRUE,
    archived_at = NOW(),
    archived_reason = 'Auto-archived: cancelled/rejected over 2 years ago'
WHERE status IN ('cancelled', 'rejected')
AND created_at < NOW() - INTERVAL '2 years'
AND (is_archived = FALSE OR is_archived IS NULL);
```

### 10. Bulk Archive with Conditions
```sql
-- Archive paid enrollments older than 7 years with completed sessions
UPDATE enrolled_students
SET
    is_archived = TRUE,
    archived_at = NOW(),
    archived_reason = 'Auto-archived: completed over 7 years ago'
WHERE payment_status = 'paid'
AND status = 'completed'
AND total_sessions = completed_sessions
AND created_at < NOW() - INTERVAL '7 years'
AND (is_archived = FALSE OR is_archived IS NULL);
```

## API Integration

### Python Example (FastAPI Endpoint)
```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

router = APIRouter()

@router.post("/api/admin/archive-old-payments")
async def archive_old_payments(
    years: int = 10,
    payment_status_filter: str = None,
    db: Session = Depends(get_db)
):
    """Archive payment records older than X years"""

    cutoff_date = datetime.now() - timedelta(days=365 * years)

    query = db.query(EnrolledStudent).filter(
        EnrolledStudent.created_at < cutoff_date,
        (EnrolledStudent.is_archived == False) | (EnrolledStudent.is_archived == None)
    )

    if payment_status_filter:
        query = query.filter(EnrolledStudent.payment_status == payment_status_filter)

    count = query.count()

    query.update({
        "is_archived": True,
        "archived_at": datetime.now(),
        "archived_reason": f"Auto-archived: older than {years} years"
    })

    db.commit()

    return {"archived_count": count, "cutoff_date": cutoff_date}
```

## Cron Job Setup (Automated Archiving)

```bash
# Add to crontab for monthly archiving
# Run on 1st of every month at 2 AM
0 2 1 * * cd /var/www/astegni/astegni-backend && python archive_old_payment_records.py --live 10 >> /var/log/astegni/archive.log 2>&1
```

## Best Practices

1. **Never Hard Delete Financial Records** - Always use soft deletion (archiving)
2. **Retention Periods:**
   - Paid/Completed: Keep active for 7 years minimum (tax compliance)
   - Pending: Keep active for 2 years
   - Cancelled/Rejected: Can archive after 1 year
3. **Always Keep Archive Reason** - For audit trails
4. **Test with Dry Run First** - Use `--dry-run` flag before live archiving
5. **Backup Before Archiving** - Always backup database before bulk operations
6. **Index Archived Columns** - For better query performance

## Recovery

To recover archived records:
```sql
-- Unarchive specific record
UPDATE enrolled_students
SET is_archived = FALSE, archived_at = NULL, archived_reason = NULL
WHERE id = ?;

-- Bulk unarchive by date range
UPDATE enrolled_students
SET is_archived = FALSE, archived_at = NULL, archived_reason = NULL
WHERE archived_at BETWEEN '2020-01-01' AND '2020-12-31';
```
