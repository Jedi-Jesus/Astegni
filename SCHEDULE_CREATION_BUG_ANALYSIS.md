# Schedule Creation Bug - Deep Analysis

## Problem Summary
Creating schedules in tutor-profile.html appears to fail silently. The form submits, but schedules don't appear in the list.

## Root Cause Analysis

### Critical Issue Found: Tutor Profile ID Lookup Failure

**Location:** `astegni-backend/tutor_schedule_endpoints.py` lines 168-177

```python
# First get the tutor_profile ID
cur.execute("""
    SELECT id FROM tutor_profiles WHERE user_id = %s
""", (current_user['id'],))
tutor_row = cur.fetchone()
if not tutor_row:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Tutor profile not found"
    )
tutor_profile_id = tutor_row[0]
```

**The Problem:**
1. The endpoint `/api/tutor/schedules` requires a `tutor_profiles` entry to exist
2. If the tutor profile doesn't exist, it raises a 404 error: **"Tutor profile not found"**
3. The frontend code at line 5363-5365 in `global-functions.js` catches this error but may not display it properly

### Frontend Error Handling

**Location:** `js/tutor-profile/global-functions.js` lines 5363-5365

```javascript
if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || `Failed to ${isEdit ? 'update' : 'create'} schedule`);
}
```

The error IS being caught, but the user may not see it clearly.

### Why Schedules Don't Show Up

There are **THREE possible scenarios:**

#### Scenario 1: Tutor Profile Missing (MOST LIKELY)
- The user has role 'tutor' in their `roles` array
- BUT no corresponding row in `tutor_profiles` table
- The API returns **404 "Tutor profile not found"**
- The frontend shows error but doesn't reload, so the schedule panel stays empty

#### Scenario 2: Silent Validation Failure
- Frontend validation passes
- Backend receives request
- But the schedule fails to save due to database constraints
- Error is shown but user might miss it

#### Scenario 3: Successful Save But UI Not Refreshing
- Schedule saves successfully
- But `loadSchedules()` is not called after modal closes
- Or there's a timing issue where the modal closes before the schedule is fully saved

## The Flow Analysis

### Current Flow:
1. User fills form → clicks "Create Schedule"
2. Frontend calls `saveSchedule()` → validates → sends POST to `/api/tutor/schedules`
3. Backend checks if user has 'tutor' role ✓
4. **Backend tries to find tutor_profile entry** ← **FAILS HERE IF NO PROFILE**
5. Returns 404 error
6. Frontend catches error and shows notification
7. Modal closes anyway (line 5391: `closeScheduleModal()`)
8. Panel remains empty because no successful save occurred

### Expected Flow:
1. User fills form → clicks "Create Schedule"
2. Frontend validates → sends POST
3. Backend saves to `schedules` table
4. Returns success with schedule data
5. Frontend closes modal
6. Frontend calls `loadSchedules()` to refresh the list
7. New schedule appears

## Issues Identified

### Issue #1: Missing Tutor Profile Check
**File:** `tutor_schedule_endpoints.py:168-177`
**Problem:** The endpoint requires a tutor profile to exist, but there's no guarantee the user has one.

**Why this happens:**
- User registration creates a `users` entry with role 'tutor'
- BUT the `tutor_profiles` table might not have a corresponding entry
- This could happen if:
  - User registered but never completed tutor profile setup
  - Tutor profile was deleted but user role wasn't removed
  - Database migration issue left orphaned user records

### Issue #2: Frontend Doesn't Reload After Error
**File:** `js/tutor-profile/global-functions.js:5384-5420`
**Problem:** After ANY error or success, the modal closes and form resets, but the schedule list doesn't reload.

Looking at lines 5384-5420:
```javascript
// Close modal first
closeScheduleModal();

// Reset form
const scheduleForm = document.getElementById('scheduleForm');
if (scheduleForm) {
    scheduleForm.reset();
}
```

**MISSING:** There's no call to `loadSchedules()` after modal closes!

### Issue #3: Error Notification Might Be Missed
**File:** `js/tutor-profile/global-functions.js:5196-5201`
**Problem:** Error is shown via notification, but if the notification auto-dismisses or user doesn't notice, they won't know what went wrong.

```javascript
if (typeof TutorProfileUI !== 'undefined') {
    TutorProfileUI.showNotification(message, 'error');
} else {
    alert(message);
}
```

## How to Debug

### Step 1: Check if Tutor Profile Exists
Run this query in the database:
```sql
SELECT u.id, u.email, u.roles, t.id as tutor_profile_id
FROM users u
LEFT JOIN tutor_profiles t ON u.id = t.user_id
WHERE 'tutor' = ANY(u.roles);
```

Look for rows where `tutor_profile_id` is NULL - these users will fail to create schedules.

### Step 2: Check Browser Console
When trying to create a schedule:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors like:
   - **"Tutor profile not found"** (404 error)
   - **"Failed to create schedule"**
   - Any red error messages

### Step 3: Check Network Tab
1. Open DevTools → Network tab
2. Try to create a schedule
3. Look for the POST request to `/api/tutor/schedules`
4. Check:
   - Status Code (should be 201, probably getting 404 or 500)
   - Response body (will show the error message)
   - Request payload (verify all data is being sent)

### Step 4: Check Backend Logs
If running backend locally:
```bash
cd astegni-backend
python app.py
```
Watch for error messages when creating a schedule.

## Solutions

### Solution 1: Auto-Create Tutor Profile (RECOMMENDED)
**File:** `astegni-backend/tutor_schedule_endpoints.py`

Modify the endpoint to create a tutor profile if it doesn't exist:

```python
# First get or create the tutor_profile ID
cur.execute("""
    SELECT id FROM tutor_profiles WHERE user_id = %s
""", (current_user['id'],))
tutor_row = cur.fetchone()

if not tutor_row:
    # Auto-create basic tutor profile
    cur.execute("""
        INSERT INTO tutor_profiles (user_id, created_at)
        VALUES (%s, NOW())
        RETURNING id
    """, (current_user['id'],))
    tutor_row = cur.fetchone()
    conn.commit()

tutor_profile_id = tutor_row[0]
```

### Solution 2: Add Schedule Reload After Modal Close
**File:** `js/tutor-profile/global-functions.js`

Add this after line 5391 (`closeScheduleModal()`):

```javascript
// Close modal first
closeScheduleModal();

// Reload schedules to show new/updated schedule
setTimeout(() => {
    if (typeof loadSchedules === 'function') {
        loadSchedules();
    }
}, 300); // Small delay to ensure modal is fully closed
```

### Solution 3: Better Error Display
**File:** `js/tutor-profile/global-functions.js`

Modify the error handler to be more visible:

```javascript
if (!response.ok) {
    const errorData = await response.json();
    const errorMsg = errorData.detail || `Failed to ${isEdit ? 'update' : 'create'} schedule`;

    // Show error in console for debugging
    console.error('❌ Schedule save failed:', errorMsg);
    console.error('Full error:', errorData);

    // Show persistent error message
    if (typeof TutorProfileUI !== 'undefined') {
        TutorProfileUI.showNotification(errorMsg, 'error');
    } else {
        alert(`Error: ${errorMsg}\n\nPlease check the console for more details.`);
    }

    throw new Error(errorMsg);
}
```

## Testing Steps After Fix

1. **Test with existing tutor profile:**
   - Create a schedule
   - Verify it appears in the list immediately
   - Edit the schedule
   - Verify changes are reflected

2. **Test with missing tutor profile:**
   - Delete tutor_profile entry (keep user with 'tutor' role)
   - Try to create schedule
   - Verify it auto-creates profile and saves schedule
   - Verify schedule appears in list

3. **Test error cases:**
   - Try to create schedule without auth token
   - Try to create schedule with invalid data
   - Verify error messages are clear and visible

## Additional Notes

### Other Endpoints Available
There's also a universal `/api/schedules` endpoint in `schedule_endpoints.py` that works for ALL roles (not just tutors). This endpoint uses `user_id` directly instead of `tutor_profile_id`, which might be simpler.

Consider migrating to this endpoint by changing the frontend to call `/api/schedules` instead of `/api/tutor/schedules`.

### Database Schema Note
The `schedules` table uses:
- `scheduler_id` (could be user_id OR profile_id depending on endpoint)
- `scheduler_role` (tutor, student, parent, etc.)

The dual endpoints are causing confusion about whether to use `user_id` or `profile_id`.

## Recommended Fix Priority

1. **HIGH PRIORITY:** Add schedule reload after modal close (Solution 2)
2. **HIGH PRIORITY:** Improve error display (Solution 3)
3. **MEDIUM PRIORITY:** Auto-create tutor profile (Solution 1) OR migrate to universal endpoint
4. **LOW PRIORITY:** Add better validation messages in the modal

## Files That Need Changes

1. `astegni-backend/tutor_schedule_endpoints.py` - Auto-create profile or remove profile requirement
2. `js/tutor-profile/global-functions.js` - Add loadSchedules() after modal close
3. `js/tutor-profile/global-functions.js` - Improve error handling

## Conclusion

The most likely reason schedules aren't being created is **missing tutor profile entries**. The endpoint fails with a 404 error that users might not notice, and even if they do, the panel doesn't reload to show any existing schedules.

The fix is simple: either auto-create tutor profiles when needed, or use the universal `/api/schedules` endpoint instead. Additionally, always reload the schedule list after closing the modal, whether the save succeeded or failed.
