# API Schedule Endpoint Fix

## Problem
The frontend was calling `/api/schedules` but this endpoint wasn't registered in the backend, causing a 404 error:

```
❌ GET http://localhost:8000/api/schedules 404 (Not Found)
```

## Root Cause
The universal `schedule_endpoints.py` file exists in the backend with the `/api/schedules` endpoint, but it wasn't imported and registered in `app.py`.

## Solution

### Backend Fix: Added Universal Schedule Router

**File:** `astegni-backend/app.py` (Line ~152)

**Added:**
```python
# Include universal schedule routes (works for all roles)
from schedule_endpoints import router as schedule_router
app.include_router(schedule_router)
```

This registers the universal schedule endpoints that work across all roles (tutor, student, parent).

### Frontend Confirmation

**File:** `js/tutor-profile/schedule-tab-manager.js` (Line 886)

**Using:**
```javascript
const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/schedules`, {
    headers: { 'Authorization': `Bearer ${token}` }
});
```

This is correct because:
1. `/api/schedules` returns all schedules for the authenticated user
2. Frontend filters by `scheduler_role` on the client-side
3. Allows showing schedules created in different roles (tutor/student/parent)

## Endpoints Now Available

### Universal Endpoints (from `schedule_endpoints.py`):
- `GET /api/schedules` - Get all user schedules (supports optional `role_filter` param)
- `GET /api/schedules/{id}` - Get specific schedule
- `POST /api/schedules` - Create schedule (auto-detects active_role)
- `PUT /api/schedules/{id}` - Update schedule
- `DELETE /api/schedules/{id}` - Delete schedule
- `PATCH /api/schedules/{id}/toggle-notification` - Toggle notifications
- `PATCH /api/schedules/{id}/toggle-alarm` - Toggle alarms
- `PATCH /api/schedules/{id}/toggle-featured` - Toggle featured status

### Tutor-Specific Endpoints (from `tutor_schedule_endpoints.py`):
Still available but now redundant for most operations:
- `GET /api/tutor/schedules` - Get tutor schedules only
- (Same operations as universal endpoints)

## How It Works

### Backend Data Flow:
```
GET /api/schedules
    ↓
Authenticates user via JWT token
    ↓
Gets user.id from token
    ↓
SELECT * FROM schedules WHERE scheduler_id = user.id
    ↓
Returns all schedules regardless of scheduler_role
```

### Frontend Filtering:
```javascript
// Get all schedules
const allSchedules = await fetch('/api/schedules');

// Filter client-side by role
if (role === 'tutor') {
    schedules = allSchedules.filter(s => s.scheduler_role === 'tutor');
}
```

## Why Universal Endpoint is Better

1. **Multi-role users**: Users can have tutor + student + parent roles simultaneously
2. **Single API call**: Fetch all schedules once, filter on client
3. **Consistent data**: No need to merge results from multiple endpoints
4. **Role-based views**: Can show "As Tutor", "As Student", "As Parent" tabs

## Testing

After restarting the backend:

```bash
cd astegni-backend
python app.py
```

The schedule panel should now:
- ✅ Load without 404 errors
- ✅ Display schedules in the table
- ✅ Role filters work (All/Tutor/Student/Parent)
- ✅ Priority filters work
- ✅ Search works
- ✅ No console errors

## Files Modified

1. `astegni-backend/app.py` - Added schedule_router import and registration
2. `js/tutor-profile/schedule-tab-manager.js` - Confirmed using `/api/schedules` endpoint

## Restart Required

⚠️ **IMPORTANT:** You must restart the backend server for this change to take effect:

```bash
# Stop current backend (Ctrl+C)
# Start again
cd astegni-backend
python app.py
```

Then refresh the frontend and test the schedule panel.

---

**Fix Date:** 2026-01-29
**Status:** ✅ Complete - Restart backend required
