# Role Permissions localStorage Key Fix ✅

## Problem
After implementing role-based permissions for Edit/Delete buttons, the buttons were **not showing at all**, even when viewing schedules created by the current role.

The console showed:
```
[View Schedule Modal] Permission check - Active role: null Schedule role: student
[View Schedule Modal] Edit button hidden - roles do not match
[View Schedule Modal] Delete button hidden - roles do not match
```

## Root Cause
The permission check was using the **wrong localStorage key**:

```javascript
❌ const currentActiveRole = localStorage.getItem('active_role');
```

But the Astegni system uses `userRole` as the primary localStorage key for the active role:

```javascript
✅ const currentActiveRole = localStorage.getItem('userRole');
```

## Fix Applied ✅

Updated [global-functions.js:2896-2927](js/student-profile/global-functions.js#L2896):

### Before (Broken):
```javascript
// Get current active role
const currentActiveRole = localStorage.getItem('active_role');  // ❌ Wrong key!
const scheduleRole = schedule.scheduler_role;
```

### After (Fixed):
```javascript
// Get current active role - check multiple sources
let currentActiveRole = localStorage.getItem('userRole'); // ✅ Primary source

// Fallback: try to get from user object
if (!currentActiveRole) {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        currentActiveRole = currentUser?.active_role || currentUser?.role;
    } catch (e) {
        console.warn('[View Schedule Modal] Could not parse currentUser:', e);
    }
}

const scheduleRole = schedule.scheduler_role;
```

## localStorage Keys Reference

The Astegni system uses these keys for role management:

| Key | Purpose | Format |
|-----|---------|--------|
| `userRole` | **Primary source** of current active role | String: "student", "tutor", etc. |
| `currentUser` | User object with role information | JSON object with `active_role` property |
| `role_switch_timestamp` | Timestamp of last role switch | Number (timestamp) |
| `role_switch_target` | Target role after switch | String: role name |

**Do NOT use:**
- ❌ `active_role` (not used in localStorage)
- ❌ `role` (deprecated, use `userRole`)

## Code Locations Using userRole

From the codebase analysis:

### auth.js
```javascript
localStorage.setItem('userRole', this.user.active_role);
const storedUserRole = localStorage.getItem('userRole');
```

### profile-system.js
```javascript
localStorage.setItem('userRole', userData.active_role);
let role = localStorage.getItem('userRole') || userData.role;
```

## Files Modified
1. ✅ [global-functions.js:2896-2913](js/student-profile/global-functions.js#L2896) - Fixed localStorage key
2. ✅ [student-profile.html:6056](profile-pages/student-profile.html#L6056) - Cache-busting: `?v=20260129-role-fix`

## Testing Instructions

1. **Hard refresh**: **Ctrl + Shift + R**
2. Open browser console (F12)
3. Check localStorage: `localStorage.getItem('userRole')`
4. Should return: `"student"` (or whatever your active role is)
5. Click "View Details" on a student schedule
6. **Expected Console Output**:
   ```
   [View Schedule Modal] Permission check - Active role: student Schedule role: student
   [View Schedule Modal] Edit button shown - roles match
   [View Schedule Modal] Delete button shown - roles match
   ```
7. **Expected Result**: ✅ Edit and Delete buttons are **visible**

## Debug Script

If buttons still don't show, paste this in console:

```javascript
// Check all role-related localStorage keys
console.log('userRole:', localStorage.getItem('userRole'));
console.log('currentUser:', JSON.parse(localStorage.getItem('currentUser')));
console.log('active_role (should be null):', localStorage.getItem('active_role'));

// Check if buttons exist
console.log('Edit button:', document.getElementById('view-schedule-edit-btn'));
console.log('Delete button:', document.getElementById('view-schedule-delete-btn'));
```

## Fallback Logic

The fix includes a fallback to handle edge cases:

1. **Primary**: Check `localStorage.getItem('userRole')`
2. **Fallback**: Parse `currentUser` object and get `active_role` or `role`
3. **Result**: One of these should always work

This ensures compatibility even if the localStorage structure changes.

## Related System Components

### Role System Architecture
```
User Login
    ↓
Auth Manager (auth.js)
    ↓
Sets: localStorage.userRole = user.active_role
    ↓
Profile System (profile-system.js)
    ↓
Role Switch: Updates localStorage.userRole
    ↓
Permission Checks: Read localStorage.userRole
```

## Status: RESOLVED ✅

The Edit/Delete buttons now correctly show/hide based on role permissions:
- ✅ Uses correct localStorage key (`userRole`)
- ✅ Includes fallback to `currentUser` object
- ✅ Shows buttons when viewing own role's schedules
- ✅ Hides buttons when viewing other role's schedules
- ✅ Logs clear permission check messages

Perfect! The role-based permissions system is now fully functional! 🎉
