# Role Switch After Reactivation - Bug Investigation

## Problem Statement

When a user reactivates a deactivated role (e.g., "tutor") and immediately tries to switch to it, they encounter an "Access Restricted" modal on the target page, even though they just activated that role.

## User's Reported Workflow

1. User is logged in as **student**
2. Opens "Add Role" modal → Reactivates **tutor** role
3. Backend `/api/add-role` succeeds → Sets database `active_role = 'tutor'`
4. Confirm dialog appears: "Switch to your reactivated Tutor role now?"
5. User clicks **OK**
6. **EXPECTED**: Should call `/api/switch-role` API → Generate new JWT token with `current_role: tutor`
7. **ACTUAL**: Page navigates to tutor-profile.html immediately WITHOUT calling `/api/switch-role`
8. Alert appears: "This page is for tutors only"
9. User bounced back to student profile

## Backend Evidence

From user's backend console logs:
```
INFO:     127.0.0.1:60668 - "POST /api/add-role HTTP/1.1" 200 OK
[get_current_user] User 1 current_role from token: tutor
Current user: {'id': 1, 'email': 'jediael.s.abebe@gmail.com', ..., 'active_role': 'student', 'roles': ['tutor', 'advertiser', 'student', 'parent', 'user']}
```

**Critical Finding**: NO `/api/switch-role` POST request in the logs

**Token vs Database Mismatch**:
- JWT token says: `current_role: tutor` (from old session)
- Database says: `active_role: student` (current state)

## Root Cause Analysis

### Bug #1: Missing API Call After Reactivation

**Location**: `js/root/profile-system.js` lines 1426-1435

```javascript
// Ask user if they want to switch to the role
const switchMessage = data.role_reactivated
    ? `Switch to your reactivated ${formatRoleName(addRoleData.role)} role now?`
    : `Switch to your new ${formatRoleName(addRoleData.role)} role now?`;

setTimeout(() => {
    if (confirm(switchMessage)) {
        switchToRole(addRoleData.role);  // ← This SHOULD call API
    }
}, 500);
```

**What should happen**: When user clicks OK, `switchToRole('tutor')` should:
1. POST to `/api/switch-role` with `{ role: 'tutor' }`
2. Backend generates NEW JWT tokens with `current_role: tutor`
3. Update localStorage with new tokens
4. Navigate to tutor-profile.html

**What's actually happening**: The `/api/switch-role` call is NOT happening (no POST request in logs)

**Possible Causes**:
1. JavaScript error preventing `switchToRole()` from executing
2. `switchToRole()` function is undefined/not in scope
3. Browser blocking the fetch request
4. The confirm dialog is being bypassed somehow

### Bug #2: Role Switcher Dropdown Issue

**Location**: `js/root/profile-system.js` lines 720-730

```javascript
roleOption.onclick = () => {
    if (role === activeRole) {
        // If clicking current role, just navigate to profile page
        const profileUrl = getProfileUrl(role);
        closeProfileDropdown();
        window.location.href = profileUrl;  // ← BUG: No API call!
    } else {
        // Switch to different role
        switchToRole(role);
    }
};
```

**The Problem**: When `role === activeRole`, it just navigates WITHOUT calling the API. This is problematic when:
- User has stale JWT token from old session
- Database shows `active_role = 'student'` but JWT token says `current_role = 'tutor'`
- User clicks "Tutor" in dropdown
- Code thinks it's the active role (from stale token?) and just navigates
- No new token is generated → access denied

### Bug #3: JWT Token Persistence Across Sessions

The backend logs show:
```
[get_current_user] User 1 current_role from token: tutor
```

But the database shows:
```
'active_role': 'student'
```

**This indicates**: The user is using an OLD JWT token from a previous session where they were a tutor. When they reactivated the tutor role, the `/api/add-role` endpoint updated the database but did NOT generate a new JWT token.

## Investigation Steps

### Step 1: Check if switchToRole() is being called

Add console.log at the start of `switchToRole()` function to see if it's being invoked.

**Location**: `js/root/profile-system.js` line ~1465

Current code:
```javascript
async function switchToRole(newRole) {
    console.log(`[switchToRole] Attempting to switch to: ${newRole}`);
    // ... rest of function
```

**Test**: User should check browser console for `[switchToRole]` messages

### Step 2: Check for JavaScript errors

User should open browser DevTools Console and look for any red error messages when clicking the confirm dialog.

### Step 3: Verify /api/add-role returns active_role

Check if `/api/add-role` endpoint response includes the new `active_role` field.

**Backend**: `astegni-backend/app.py modules/routes.py` - Check `/api/add-role` endpoint

### Step 4: Check if /api/add-role should generate new JWT

Currently, `/api/add-role` likely does NOT generate a new JWT token with updated role. It should.

## Proposed Fixes

### Fix #1: Make /api/add-role return new JWT tokens

**Backend Change**: After successfully adding/reactivating a role, the `/api/add-role` endpoint should:
1. Set the new role as active_role
2. Generate NEW JWT tokens with `current_role` set to the new role
3. Return tokens in response

This way, when user adds/reactivates a role, they immediately get a valid token for that role.

### Fix #2: Always call API when switching roles in dropdown

**Frontend Change**: Remove the optimization on lines 720-730 that skips API call for current role.

```javascript
roleOption.onclick = () => {
    // ALWAYS call switchToRole() - even if it's the "current" role
    // This ensures we get fresh tokens and database sync
    switchToRole(role);
};
```

### Fix #3: Add error handling and logging

Ensure `switchToRole()` logs errors clearly so we can debug why the API call isn't happening.

### Fix #4: Ensure switchToRole is in global scope

The confirm dialog callback needs access to `switchToRole()`. Verify it's exposed globally.

**Check**: `js/root/profile-system.js` should have:
```javascript
window.switchToRole = switchToRole;
```

## Next Steps

1. Check browser console for `[switchToRole]` logs
2. Check for JavaScript errors in browser console
3. Verify `/api/add-role` response data structure
4. Implement Fix #1: Update `/api/add-role` to return new JWT tokens
5. Implement Fix #2: Always call API in role switcher dropdown
6. Test the complete flow

## Root Cause Confirmed

✅ **FOUND**: The `/api/add-role` endpoint (lines 4130-4135, 4209-4214) does NOT return new JWT tokens.

**Current Response**:
```python
return {
    "message": "...",
    "user_roles": current_user.roles,
    "active_role": current_user.active_role,
    "role_reactivated": True
}
```

**Missing**: `access_token` and `refresh_token` fields

**Impact**: After reactivating a role, the user's JWT token is stale (has old role information), causing access denied errors.

## Fix Implementation

### Backend Fix: Update /api/add-role to return JWT tokens

File: `astegni-backend/app.py modules/routes.py` lines 4130-4135 and 4209-4214

Update both return statements to generate and include JWT tokens.

## Status

🔧 **FIXING** - Implementing backend fix to return JWT tokens from /api/add-role endpoint
