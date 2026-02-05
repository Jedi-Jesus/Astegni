# Schedule Creation Bug - FIXED

## Root Cause Identified

The schedule creation was failing because of **mixed endpoint usage**:

- **CREATE/EDIT**: Used `/api/tutor/schedules` (stores `scheduler_id = tutor_profiles.id`)
- **LOAD**: Used `/api/schedules` (queries `scheduler_id = users.id`)

Since `tutor_profiles.id` ≠ `users.id`, schedules were being saved but never loaded!

## Solution Applied

Simplified to use **only** the universal `/api/schedules` endpoint everywhere, which uses `users.id` directly (no role-specific profile IDs needed).

## Files Changed

### 1. `js/tutor-profile/global-functions.js`

**Changed all endpoints from `/api/tutor/schedules` to `/api/schedules`:**

- ✅ Create schedule (line ~5340)
- ✅ Edit schedule (line ~5340)
- ✅ Load schedules (multiple locations)
- ✅ View schedule details (line ~6642)
- ✅ Toggle notification (line ~7094)
- ✅ Toggle alarm (line ~7128)
- ✅ Toggle featured (line ~7162)

**Added automatic refresh after save (line ~5399):**
```javascript
// Reload schedules to show the new/updated schedule
setTimeout(() => {
    if (typeof loadSchedules === 'function') {
        loadSchedules();
    }
}, 300);
```

### 2. `js/tutor-profile/schedule-panel-manager.js`

Already using `/api/schedules` - no changes needed ✓

## What This Fixes

1. **Schedules now save correctly** - Using consistent user_id across all operations
2. **Schedules appear immediately after creation** - Auto-refresh added
3. **No more role-specific complexity** - Universal endpoint works for all roles
4. **Edit/delete/toggle all work** - All operations use the same ID system

## Backend Endpoints Used

### Universal Schedule Endpoints (`/api/schedules`)
- `POST /api/schedules` - Create new schedule
- `GET /api/schedules` - Get all user's schedules
- `GET /api/schedules/{id}` - Get specific schedule
- `PUT /api/schedules/{id}` - Update schedule
- `DELETE /api/schedules/{id}` - Delete schedule
- `PATCH /api/schedules/{id}/toggle-notification` - Toggle notification
- `PATCH /api/schedules/{id}/toggle-alarm` - Toggle alarm
- `PATCH /api/schedules/{id}/toggle-featured` - Toggle featured

All these endpoints:
- Use `scheduler_id = users.id` (not profile IDs)
- Use `scheduler_role = active_role` from user
- Work for ALL roles (tutor, student, parent, advertiser)

## Testing Steps

1. **Create a new schedule:**
   - Go to tutor profile → Schedule panel
   - Click "Create Schedule"
   - Fill in the form (recurring or specific dates)
   - Click "Create Schedule"
   - **Expected:** Schedule appears in the list immediately

2. **Edit a schedule:**
   - Click "View" on an existing schedule
   - Click "Edit" button
   - Make changes
   - Click "Update Schedule"
   - **Expected:** Changes appear immediately in the list

3. **Delete a schedule:**
   - Click "View" on a schedule
   - Click "Delete" button
   - Confirm deletion
   - **Expected:** Schedule removed from list immediately

4. **Toggle features:**
   - Click notification/alarm/featured icons
   - **Expected:** Icons update immediately

## Database Schema

The `schedules` table structure:
```sql
CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    scheduler_id INTEGER NOT NULL,  -- users.id (not profile_id!)
    scheduler_role VARCHAR(50),      -- 'tutor', 'student', 'parent', etc.
    title VARCHAR(255),
    description TEXT,
    year INTEGER,
    schedule_type VARCHAR(20),       -- 'recurring' or 'specific'
    months TEXT[],
    days TEXT[],
    specific_dates TEXT[],
    start_time TIME,
    end_time TIME,
    notes TEXT,
    priority_level VARCHAR(20),      -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(20),              -- 'active' or 'draft'
    is_featured BOOLEAN,
    alarm_enabled BOOLEAN,
    alarm_before_minutes INTEGER,
    notification_browser BOOLEAN,
    notification_sound BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## Cleanup Recommendation

The role-specific endpoints in `tutor_schedule_endpoints.py` are no longer needed and can be removed to avoid confusion:

- `/api/tutor/schedules` - DELETE (use universal endpoint)
- `/api/student/schedules` - DELETE (if exists)
- `/api/parent/schedules` - DELETE (if exists)

Keep only the universal `/api/schedules` endpoints in `schedule_endpoints.py`.

## Cache Busting

The fix includes cache-busting query parameter in tutor-profile.html:
```html
<script src="../js/tutor-profile/global-functions.js?v=20260201fix"></script>
```

Update this version number when deploying to production to ensure users get the new code.

## Summary

✅ **Problem:** Mixed endpoint usage causing ID mismatch
✅ **Solution:** Use universal `/api/schedules` endpoint everywhere
✅ **Result:** Schedules now create, load, edit, and delete correctly
✅ **Bonus:** Auto-refresh after save for better UX

The fix is minimal, clean, and removes unnecessary complexity. No database changes needed - just frontend endpoint updates!
