# Database Column Mismatch - Fixed

## Error
```
500 Internal Server Error
psycopg.errors.UndefinedColumn: column "total_applications_processed" does not exist
LINE 3: ...tutors_rejected, tutors_suspended, total_appl...
```

## Root Cause
The SQL query in `admin_profile_endpoints.py` was trying to select columns that don't exist in the `manage_tutors_profile` table:

**Query was looking for:**
- `total_applications_processed` ❌ (doesn't exist)
- `verification_rate` ❌ (doesn't exist)

**Table actually has:**
- `verification_requests_pending` ✅
- `avg_verification_time_hours` ✅

## Actual Table Schema

```sql
CREATE TABLE manage_tutors_profile (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER UNIQUE REFERENCES admin_profile(id) ON DELETE CASCADE,
    position VARCHAR(100) DEFAULT 'Staff',
    joined_date DATE DEFAULT CURRENT_DATE,
    rating NUMERIC(3,2) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    badges JSONB DEFAULT '[]',
    tutors_verified INTEGER DEFAULT 0,
    tutors_rejected INTEGER DEFAULT 0,
    tutors_suspended INTEGER DEFAULT 0,
    verification_requests_pending INTEGER DEFAULT 0,       -- ✅ Exists
    avg_verification_time_hours INTEGER DEFAULT 24,        -- ✅ Exists
    permissions JSONB DEFAULT '{"can_verify": false, "can_reject": false, "can_suspend": false}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    username VARCHAR(100)
);
```

## Fix Applied

**File:** `astegni-backend/admin_profile_endpoints.py`
**Lines:** 773-811

### Before (Incorrect):
```python
cursor.execute("""
    SELECT position, rating, total_reviews, badges, tutors_verified,
           tutors_rejected, tutors_suspended, total_applications_processed,  -- ❌ Doesn't exist
           verification_rate, permissions, joined_date, created_at            -- ❌ Doesn't exist
    FROM manage_tutors_profile
    WHERE admin_id = %s
""", (admin_id,))

profile["tutors_profile"] = {
    "total_applications_processed": tutors_row[7] or 0,  -- ❌ Wrong column
    "verification_rate": float(tutors_row[8]) if tutors_row[8] else 0.0,  -- ❌ Wrong column
}
```

### After (Fixed):
```python
cursor.execute("""
    SELECT position, rating, total_reviews, badges, tutors_verified,
           tutors_rejected, tutors_suspended, verification_requests_pending,  -- ✅ Correct
           avg_verification_time_hours, permissions, joined_date, created_at  -- ✅ Correct
    FROM manage_tutors_profile
    WHERE admin_id = %s
""", (admin_id,))

# Calculate derived values from existing columns
total_verified = tutors_row[4] or 0
total_rejected = tutors_row[5] or 0
total_suspended = tutors_row[6] or 0
total_applications_processed = total_verified + total_rejected + total_suspended  -- ✅ Calculated

verification_rate = (total_verified / total_applications_processed * 100) if total_applications_processed > 0 else 0.0  -- ✅ Calculated

profile["tutors_profile"] = {
    "total_applications_processed": total_applications_processed,  -- ✅ Calculated value
    "verification_requests_pending": tutors_row[7] or 0,           -- ✅ Real column
    "avg_verification_time_hours": tutors_row[8] or 24,            -- ✅ Real column
    "verification_rate": round(verification_rate, 1),              -- ✅ Calculated value
}
```

## Solution Strategy

Instead of storing `total_applications_processed` and `verification_rate` as separate columns, we **calculate them on-the-fly** from existing data:

### Calculated Fields:

**1. total_applications_processed:**
```python
total_applications_processed = tutors_verified + tutors_rejected + tutors_suspended
```

**2. verification_rate (approval rate):**
```python
verification_rate = (tutors_verified / total_applications_processed * 100) if total_applications_processed > 0 else 0.0
```

## Benefits of This Approach

✅ **No database migration needed** - Uses existing columns
✅ **Always accurate** - Calculated from source data, can't go out of sync
✅ **Maintains API compatibility** - Frontend still receives the same fields
✅ **Better data integrity** - No redundant stored values that could become inconsistent

## Response Structure

The endpoint now returns:

```json
{
  "id": 4,
  "email": "admin@example.com",
  "first_name": "Admin",
  "tutors_profile": {
    "position": "Senior Tutor Reviewer",
    "rating": 4.8,
    "total_reviews": 125,
    "badges": ["Top Reviewer", "Fast Responder"],
    "tutors_verified": 450,
    "tutors_rejected": 50,
    "tutors_suspended": 10,
    "total_applications_processed": 510,      // ✅ Calculated: 450 + 50 + 10
    "verification_requests_pending": 15,      // ✅ From database
    "avg_verification_time_hours": 18,        // ✅ From database
    "verification_rate": 88.2,                // ✅ Calculated: (450/510)*100
    "permissions": {
      "can_verify": true,
      "can_reject": true,
      "can_suspend": true
    },
    "joined_date": "2024-01-15",
    "created_at": "2024-01-15T10:30:00",
    "has_profile": true
  }
}
```

## Testing

### Before Fix:
```bash
curl http://localhost:8000/api/admin/manage-tutor-documents-profile/by-email/admin@example.com
# ❌ 500 Internal Server Error
# psycopg.errors.UndefinedColumn: column "total_applications_processed" does not exist
```

### After Fix:
```bash
curl http://localhost:8000/api/admin/manage-tutor-documents-profile/by-email/admin@example.com
# ✅ 200 OK
# Returns complete profile with calculated fields
```

## Additional Notes

### Why This Happened

The code was likely written before the final database schema was settled. The column names in the code didn't match the actual table structure.

### Alternative Approach (Not Chosen)

We could have added the missing columns to the database:

```sql
ALTER TABLE manage_tutors_profile
ADD COLUMN total_applications_processed INTEGER DEFAULT 0;

ALTER TABLE manage_tutors_profile
ADD COLUMN verification_rate NUMERIC(5,2) DEFAULT 0.0;
```

**Why we didn't do this:**
- Would require database migration
- Creates redundant data (can be calculated)
- Risk of data inconsistency over time
- More complex to maintain

### Files Modified

- `astegni-backend/admin_profile_endpoints.py` (Lines 773-811)

## Verification

✅ Query matches actual table schema
✅ All columns exist in database
✅ Calculated fields maintain API compatibility
✅ No breaking changes for frontend
✅ Backend auto-reloads changes (uvicorn --reload)

---

**Status:** ✅ Fixed
**Date:** 2025-10-19
**Error:** 500 Internal Server Error → 200 OK
**Testing:** Ready for immediate use
