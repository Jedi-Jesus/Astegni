# Market Pricing - Column Name Fix

## Issue: 500 Error on Market Tutors Endpoint

### Error Message:
```
Error fetching market tutors: column es.enrollment_date does not exist
LINE 19: AND es.enrollment_date >= $1
POST /api/market-pricing/market-tutors 500 Internal Server Error
```

### Root Cause:
The `enrolled_students` table uses `enrolled_at` as the column name, not `enrollment_date`.

**Actual Schema:**
```sql
CREATE TABLE enrolled_students (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER,
    student_id INTEGER,
    enrolled_at TIMESTAMP,           -- ✅ CORRECT COLUMN NAME
    created_at TIMESTAMP,
    agreed_price NUMERIC(10, 2),
    -- ... other columns
);
```

### Fix Applied:
Changed all references from `enrollment_date` to `enrolled_at` in `market_pricing_endpoints.py`

**Lines Updated:**
- Line 227: `AND es.enrolled_at >= %s`
- Line 255: `AND es.enrolled_at >= %s`
- Line 649: `AND es.enrolled_at >= %s`

**Files Changed:**
- `astegni-backend/market_pricing_endpoints.py` (3 occurrences)
- `AGREED_PRICE_INTEGRATION.md` (documentation updated)

### Testing:
**Before:**
```bash
POST /api/market-pricing/market-tutors
Response: 500 Internal Server Error
```

**After:**
```bash
# Restart backend
cd astegni-backend
python app.py

# Test should now return 200
POST /api/market-pricing/market-tutors
Response: 200 OK with market tutors data
```

### Impact:
- ✅ Graphs will now load correctly with real API data
- ✅ Tables will display actual market prices
- ✅ Price suggestions will work based on enrolled_at timestamps
- ✅ Time period filtering (3, 6, 12 months) will work correctly

---

**Status:** ✅ FIXED
**Date:** 2026-01-20
**Requires:** Backend restart to apply changes
