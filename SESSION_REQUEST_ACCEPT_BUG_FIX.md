# Session Request Accept Bug Fix

## Error Summary

### Bug #1: Undefined Variable
```
❌ Error: Failed to update session request: name 'session_request' is not defined
```

### Bug #2: Missing Required Column
```
❌ Error: null value in column "investment_date" of relation "user_investments" violates not-null constraint
```

## Root Cause

### Bug #1
**File:** `astegni-backend/session_request_endpoints.py`
**Line:** 971
**Issue:** Variable name mismatch - code referenced `session_request.get('num_sessions', 1)` but the variable is named `request_data`

### Bug #2
**File:** `astegni-backend/session_request_endpoints.py`
**Line:** 980-992
**Issue:** INSERT into `user_investments` table was missing the required `investment_date` column (NOT NULL constraint)

## The Fixes

### Fix #1 - Line 971
Changed from:
```python
session_request.get('num_sessions', 1)
```

To:
```python
1  # Default to 1 session (can be updated later)
```

### Fix #2 - Lines 981-986
Added `investment_date` column to INSERT:
```python
INSERT INTO user_investments (
    user_id, investment_type, investment_name, student_payment_id,
    investment_date, due_date, payment_status, created_at
) VALUES (
    %s, 'booking', %s, %s,
    CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'pending', CURRENT_TIMESTAMP
)
```

### Why These Fixes Work
1. **Fix #1:** Default to 1 session is appropriate since each request represents one booking
2. **Fix #2:** `investment_date` is set to `CURRENT_DATE` to track when the booking/investment was made

## Files Modified
- [session_request_endpoints.py:971](astegni-backend/session_request_endpoints.py#L971) - Fixed undefined variable reference
- [session_request_endpoints.py:983](astegni-backend/session_request_endpoints.py#L983) - Added `investment_date` column

## How to Apply the Fix

### Option 1: Manual Restart
1. Stop your backend server (Ctrl+C in the terminal running `python app.py`)
2. Restart: `cd astegni-backend && python app.py`

### Option 2: Use Batch Script
```bash
cd astegni-backend
restart-backend-after-fix.bat
```

## Testing the Fix
1. Go to tutor profile session requests panel
2. Try to accept a session request
3. The request should now be accepted successfully
4. The student should be added to your "My Students" list
5. No more 500 error should occur

## Related Endpoints
This fix affects:
- `PATCH /api/session-requests/tutor/{request_id}` - Accept/Reject session requests
- Session request acceptance workflow for tutors

## Additional Context
The bug was introduced during the session request system implementation. The `request_data` dictionary (lines 907-916) contains the data returned from the UPDATE query, and it doesn't include a `num_sessions` field. The default value of 1 is now used for initial enrollment.

## Status
✅ **FIXED** - Ready to test after backend restart
