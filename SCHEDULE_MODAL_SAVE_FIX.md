# Schedule Modal Save Fix

## Problem
The schedule modal wasn't saving to the `schedules` table in the database because:

1. **Wrong API endpoint**: Using `/api/tutor/schedules` or `/api/student/schedules` instead of `/api/schedules`
2. **Wrong field names**: Using `grade_level` instead of `priority_level`
3. **Wrong priority values**: Using "Low Priority", "Normal", etc. instead of "low", "medium", "high", "urgent"
4. **Missing required field**: Not sending `status` field

## Root Cause

The `saveSchedule()` function in both tutor and student profiles was written for the **old** teaching_schedules table, not the new universal `schedules` table.

### Old vs New Schema

**Old (teaching_schedules):**
```javascript
{
  grade_level: "Low Priority" | "Normal" | "Important" | "Very Important" | "Highly Critical",
  // ... other fields
}
```

**New (schedules):**
```javascript
{
  priority_level: "low" | "medium" | "high" | "urgent",
  status: "active" | "draft",
  scheduler_role: "tutor" | "student" | "parent",  // Auto-set by backend
  // ... other fields
}
```

## Solution

### Files Fixed

1. **`js/tutor-profile/global-functions.js`** - Lines 5243-5297
2. **`js/student-profile/global-functions.js`** - Lines 2089-2155

### Changes Made

#### 1. Updated Priority Mapping

**Before (Tutor):**
```javascript
const priorityMap = {
    '1': 'Low Priority',
    '2': 'Normal',
    '3': 'Important',
    '4': 'Very Important',
    '5': 'Highly Critical'
};
```

**After (Both):**
```javascript
const priorityMap = {
    '1': 'low',
    '2': 'medium',
    '3': 'high',
    '4': 'urgent',
    '5': 'urgent'
};
```

#### 2. Updated Field Names

**Before:**
```javascript
const scheduleData = {
    grade_level: priorityMap[priority] || 'Normal',
    // ... no status field
    created_at: new Date().toISOString()  // Not needed
};
```

**After:**
```javascript
const scheduleData = {
    priority_level: priorityMap[priority] || 'medium',
    status: 'active',
    // ... removed created_at (auto-set by backend)
};
```

#### 3. Updated API Endpoints

**Before:**
```javascript
// Tutor
const url = isEdit
    ? `${API_BASE_URL}/api/tutor/schedules/${scheduleId}`
    : `${API_BASE_URL}/api/tutor/schedules`;

// Student
const url = isEdit
    ? `${API_BASE_URL}/api/student/schedules/${editingId}`
    : `${API_BASE_URL}/api/student/schedules`;
```

**After (Both):**
```javascript
const url = isEdit
    ? `${API_BASE_URL}/api/schedules/${scheduleId}`
    : `${API_BASE_URL}/api/schedules`;
```

## How It Works Now

### Save Flow:
```
User fills schedule form
    ↓
Clicks "Create Schedule" button
    ↓
saveSchedule() called
    ↓
Validates form data
    ↓
Maps priority: 1-5 → low/medium/high/urgent
    ↓
POST /api/schedules with JWT token
    ↓
Backend:
  - Extracts user.id from token
  - Gets user.active_role (tutor/student/parent)
  - Inserts into schedules table with scheduler_role = active_role
    ↓
Returns created schedule
    ↓
Frontend:
  - Shows success notification
  - Closes modal
  - Reloads schedule panel
```

### Database Insert:
```sql
INSERT INTO schedules (
    scheduler_id,          -- From JWT token (user.id)
    scheduler_role,        -- From user.active_role
    title,
    description,
    priority_level,        -- 'low', 'medium', 'high', 'urgent'
    year,
    schedule_type,         -- 'recurring' or 'specific'
    months,                -- Array: ['January', 'March']
    days,                  -- Array: ['Monday', 'Friday']
    specific_dates,        -- Array: ['2025-02-15']
    start_time,
    end_time,
    notes,
    status,                -- 'active' or 'draft'
    alarm_enabled,
    alarm_before_minutes,
    notification_browser,
    notification_sound,
    created_at             -- Auto-set by database
) VALUES (...);
```

## Testing Checklist

- [ ] Restart backend server (to ensure `/api/schedules` endpoint is active)
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Login as tutor
- [ ] Navigate to Schedule panel
- [ ] Click "Create Schedule" button
- [ ] Fill in all required fields:
  - [ ] Title
  - [ ] Priority slider (1-5)
  - [ ] Year From
  - [ ] Schedule Type (Recurring or Specific)
  - [ ] If Recurring: Select months and days
  - [ ] If Specific: Add specific dates
  - [ ] Start Time
  - [ ] End Time
- [ ] Click "Create Schedule"
- [ ] Verify success message appears
- [ ] Verify modal closes
- [ ] Verify schedule appears in table
- [ ] Check browser console for errors (should be none)
- [ ] Verify schedule has correct `scheduler_role = 'tutor'`

### Database Verification:
```sql
-- Check if schedule was saved
SELECT * FROM schedules
ORDER BY created_at DESC
LIMIT 5;

-- Verify scheduler_role is set correctly
SELECT id, title, scheduler_role, priority_level, status
FROM schedules
WHERE scheduler_id = 1  -- Your user ID
ORDER BY created_at DESC;
```

## Expected Results

✅ Schedule saves to `schedules` table
✅ `scheduler_role` automatically set to 'tutor' (or 'student'/'parent' based on active role)
✅ `priority_level` contains 'low', 'medium', 'high', or 'urgent'
✅ `status` set to 'active'
✅ All other fields populated correctly
✅ `created_at` auto-generated by database
✅ Success notification shows
✅ Modal closes automatically
✅ Schedule appears in schedule panel immediately

## Common Issues & Solutions

### Issue 1: Still getting 404 error
**Solution:** Restart backend server to load the `/api/schedules` endpoint

### Issue 2: "Please select at least one day" error for recurring schedules
**Solution:** Make sure to select at least one checkbox in the days section

### Issue 3: Schedule created but doesn't appear in table
**Solution:** The schedule panel loads schedules when opened. Switch panels or refresh to see new schedule.

### Issue 4: `scheduler_role` is wrong
**Solution:** Backend uses `user.active_role`. Make sure you're logged in with the correct role active.

## Backward Compatibility

**Note:** This changes the save behavior to use the new `schedules` table. If you have existing schedules in old tables (`teaching_schedules`, `student_schedules`), they won't appear in the new schedule panel unless migrated.

**Migration:** If needed, create a migration script to copy data from old tables to new `schedules` table.

## Files Modified

1. `js/tutor-profile/global-functions.js` - saveSchedule() function
2. `js/student-profile/global-functions.js` - saveSchedule() function

## Related Documentation

- [API_SCHEDULE_ENDPOINT_FIX.md](API_SCHEDULE_ENDPOINT_FIX.md) - Backend endpoint registration
- [SCHEDULE_PANEL_ROLE_FILTER_IMPLEMENTATION.md](SCHEDULE_PANEL_ROLE_FILTER_IMPLEMENTATION.md) - Frontend role filtering
- [SCHEDULE_AND_SESSIONS_COMPLETE_FIX.md](SCHEDULE_AND_SESSIONS_COMPLETE_FIX.md) - Overall implementation summary

---

**Fix Date:** 2026-01-29
**Status:** ✅ Complete and syntax-validated
**Testing Required:** Yes - Create test schedule after backend restart
