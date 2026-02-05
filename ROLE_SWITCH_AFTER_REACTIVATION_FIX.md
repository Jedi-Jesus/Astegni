# Role Switch After Reactivation - Access Denied Bug Fix

## Problem Description

When a user reactivates a deactivated role and immediately switches to it, they get an "Access Restricted" modal on pages with role guards (like find-tutors.html), even though they just switched to the correct role.

## Root Cause

**Race condition** between role switching and page role guard checks:

1. User reactivates role (e.g., "student") → Updates database `roles` array
2. User clicks "Switch to student role" → Calls `switchToRole()`
3. `switchToRole()` updates localStorage and sets sessionStorage flags:
   - `role_switch_in_progress = 'true'`
   - `target_role = 'student'`
4. Page navigates to student-accessible page (e.g., find-tutors.html)
5. **PROBLEM:** Role guard in `js/find-tutors/role-guard.js` runs **IMMEDIATELY** on page load
6. Role guard checks localStorage for `currentUser.active_role` **BEFORE** profile-system.js has initialized
7. localStorage may still have old/stale role data
8. Role guard shows "Access Restricted" modal incorrectly

## The Solution

### Profile Pages (Already Fixed)
Profile pages (`tutor-profile.js`, `student-profile.js`, `parent-profile.js`) already check for `role_switch_in_progress` flag:

```javascript
// FIX: Check if role switch is in progress FIRST
const switchInProgress = sessionStorage.getItem('role_switch_in_progress');
const targetRole = sessionStorage.getItem('target_role');

if (switchInProgress === 'true' && targetRole === 'student') {
    // Clear the flags
    sessionStorage.removeItem('role_switch_in_progress');
    sessionStorage.removeItem('target_role');
    console.log('✅ Role switch in progress - allowing page load');
    // Skip role validation
} else {
    // Normal role validation
}
```

### Find Tutors Page (FIXED)
Updated `js/find-tutors/role-guard.js` to check for role switch flags:

**Before:**
```javascript
function performAccessCheck() {
    setTimeout(() => {
        const hasAccess = checkAccess(); // Checks localStorage immediately
        if (!hasAccess) {
            showAccessDeniedModal(); // ❌ Shows modal incorrectly
        }
    }, 100);
}
```

**After:**
```javascript
function performAccessCheck() {
    // CRITICAL FIX: Check if role switch is in progress
    const switchInProgress = sessionStorage.getItem('role_switch_in_progress');
    const targetRole = sessionStorage.getItem('target_role');

    if (switchInProgress === 'true' && targetRole) {
        console.log('[RoleGuard] Role switch in progress to:', targetRole);

        // Clear the flags immediately
        sessionStorage.removeItem('role_switch_in_progress');
        sessionStorage.removeItem('target_role');

        // Check if target role is allowed
        if (ALLOWED_ROLES.includes(targetRole.toLowerCase())) {
            console.log('[RoleGuard] ✅ Target role is allowed - page can display');
            return; // ✅ Allow page to load
        }
    }

    // Normal access check
    setTimeout(() => {
        const hasAccess = checkAccess();
        if (!hasAccess) {
            showAccessDeniedModal();
        }
    }, 100);
}
```

## How It Works

### Role Switch Flow (profile-system.js)

1. User switches role via `switchToRole(newRole)`
2. API call to `/api/switch-role` updates database and returns new JWT tokens
3. **CRITICAL:** Sets sessionStorage flags:
   ```javascript
   sessionStorage.setItem('role_switch_in_progress', 'true');
   sessionStorage.setItem('target_role', data.active_role);
   ```
4. Navigates to target page after 500ms delay

### Page Load Flow (role-guard.js)

1. Page loads → role-guard.js runs `performAccessCheck()`
2. **NEW:** Checks `role_switch_in_progress` flag FIRST
3. If flag is set:
   - Clears the flags (consume them)
   - Validates that `target_role` is allowed for this page
   - If allowed, returns immediately (skip normal check)
4. If flag not set:
   - Runs normal access check using localStorage

## Files Modified

### Fixed in This Update
- ✅ `js/find-tutors/role-guard.js` - Added role switch flag check (lines 330-350)
- ✅ `js/page-structure/user-profile.js` - Added role switch flag check (lines 569-605)

### Already Had Fix
- ✅ `js/tutor-profile/init.js` - Lines 59-69
- ✅ `js/student-profile/init.js` - Lines 32-42
- ✅ `js/parent-profile/parent-profile.js` - Lines 100-130
- ✅ `js/advertiser-profile/advertiser-profile.js` - Lines 63-99

### Already Working
- ✅ `js/root/profile-system.js` - Sets the flags (lines 1537-1546)
- ✅ `js/root/profile-system.js` - Checks flags for profile pages (lines 1650-1661)

## Testing Steps

1. Login as a user with a student role
2. Go to student profile → Manage Role → Deactivate Student Role
3. Verify redirect to index.html
4. Click Profile Dropdown → Add Role → Select "Student" → Enter password → Verify OTP → Click "Activate Role"
5. When prompted "Switch to your reactivated Student role now?", click **OK**
6. **Expected:** Navigate to find-tutors page successfully
7. **Actual:** No "Access Restricted" modal should appear ✅

## Technical Details

### sessionStorage Flags
- `role_switch_in_progress`: Set to `'true'` when switching roles
- `target_role`: The role being switched to (e.g., 'student', 'tutor')

### Why sessionStorage?
- Persists across page navigation within same tab/window
- Automatically cleared when tab is closed
- Perfect for short-lived state during role switch operation

### Why Clear Flags Immediately?
- Prevents re-use on subsequent page loads
- Each role switch creates new flags
- Flags are "single-use tokens" for the switch operation

## Related Issues

- Role switching after adding a new role
- Role switching after reactivating a deactivated role
- Any navigation that happens immediately after role change

## Status

✅ **FIXED** - Role guard now respects `role_switch_in_progress` flag and allows page load during intentional role switches.
