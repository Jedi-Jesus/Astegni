# Debug Role Switching - Step-by-Step Guide

## Issue
Role switching shows "This page is for [role] only. You are logged in as: [old_role]" alert and bounces back.

## What We've Fixed So Far

1. ✅ profile-system.js `switchToRole()` - Updates all state + sessionStorage flag
2. ✅ profile-system.js `checkRolePageMismatch()` - Checks sessionStorage flag
3. ✅ auth.js `restoreSession()` - ALWAYS syncs from localStorage.userRole
4. ✅ All profile pages (tutor/student/parent/advertiser) - Check sessionStorage flag
5. ✅ Enhanced logging everywhere

## Debugging Steps

### Step 1: Open Browser Console
1. Press F12 to open DevTools
2. Go to Console tab
3. Clear console (trash icon)

### Step 2: Check Current State

Paste this into console:

```javascript
console.log('=== CURRENT STATE ===');
console.log('localStorage.userRole:', localStorage.getItem('userRole'));
console.log('AuthManager.user.active_role:', window.AuthManager?.user?.active_role);
console.log('sessionStorage flags:', {
    switch_in_progress: sessionStorage.getItem('role_switch_in_progress'),
    target_role: sessionStorage.getItem('target_role')
});
const cu = JSON.parse(localStorage.getItem('currentUser') || '{}');
console.log('currentUser.active_role:', cu.active_role);
console.log('currentUser.roles:', cu.roles);
```

### Step 3: Try to Switch Roles

1. Click on your profile dropdown (top right)
2. Click on a different role (e.g., if you're student, click "Tutor")
3. Watch the console logs

### Step 4: What to Look For in Console

#### ✅ GOOD - Role Switch Working:
```
[switchToRole] Called with newRole: tutor
[switchToRole] Current userRole: student
[switchToRole] Making API call to /api/switch-role...
[switchToRole] API response status: 200
[switchToRole] API response data: {active_role: "tutor", ...}
[switchToRole] Updated AuthManager.user.active_role to: tutor
[switchToRole] Set role_switch_in_progress flag for: tutor
[switchToRole] Navigating to: ../profile-pages/tutor-profile.html

--- PAGE LOADS ---

[AuthManager.restoreSession] Syncing active_role from userRole: tutor
🔍 [TutorProfile] Role Check Debug: {userRole: "tutor", sessionStorage_switchInProgress: "true", ...}
✅ [TutorProfile] Role switch in progress to tutor - allowing page load
```

#### ❌ BAD - Still Bouncing:
```
[switchToRole] Called with newRole: tutor
[switchToRole] Current userRole: student
[switchToRole] Making API call to /api/switch-role...
[switchToRole] API response status: 200
[switchToRole] Set role_switch_in_progress flag for: tutor
[switchToRole] Navigating to: ../profile-pages/tutor-profile.html

--- PAGE LOADS ---

[AuthManager.restoreSession] Syncing active_role from userRole: student  ← WRONG!
🔍 [TutorProfile] Role Check Debug: {userRole: "student", ...}  ← WRONG!
⚠️ User role is 'student', not 'tutor'. Redirecting...
```

### Step 5: Check localStorage Timing

If bouncing still happens, check if localStorage is being updated:

```javascript
// BEFORE clicking switch
console.log('BEFORE:', localStorage.getItem('userRole'));

// Click the role switch button

// IMMEDIATELY AFTER (in console, quickly)
console.log('AFTER:', localStorage.getItem('userRole'));

// Check sessionStorage
console.log('Flag set?', sessionStorage.getItem('role_switch_in_progress'));
```

### Step 6: Manual State Check After Navigation

If the page bounces, immediately check in console:

```javascript
console.log('Page loaded. Checking state:');
console.log('localStorage.userRole:', localStorage.getItem('userRole'));
console.log('sessionStorage.role_switch_in_progress:', sessionStorage.getItem('role_switch_in_progress'));
console.log('sessionStorage.target_role:', sessionStorage.getItem('target_role'));
console.log('AuthManager.user.active_role:', window.AuthManager?.user?.active_role);
```

## Common Issues and Solutions

### Issue 1: sessionStorage Flag Not Set
**Symptom**: `sessionStorage.role_switch_in_progress` is null
**Cause**: switchToRole() didn't run or failed before setting flag
**Solution**: Check if API call succeeded (status 200)

### Issue 2: localStorage.userRole Not Updated
**Symptom**: localStorage.userRole is still old role
**Cause**: API returned undefined or switchToRole() failed
**Solution**: Check API response in Network tab

### Issue 3: sessionStorage Flag Set But Still Bouncing
**Symptom**: Flag is "true" but page still shows alert
**Cause**: Page-level auth check not reading the flag correctly
**Solution**: Check that the profile page has the sessionStorage check (see files below)

### Issue 4: Role Switch API Fails
**Symptom**: API returns 400 or 403
**Cause**: User doesn't actually have that role
**Solution**: Check `currentUser.roles` array includes the target role

## Files That Should Have sessionStorage Check

All these files should have the sessionStorage check BEFORE role validation:

1. ✅ `js/tutor-profile/init.js` (Lines 74-94)
2. ✅ `js/student-profile/init.js` (Lines 47-67)
3. ✅ `js/parent-profile/parent-profile.js` (Lines 115-135)
4. ✅ `js/advertiser-profile/advertiser-profile.js` (Lines 78-98)

### How to Verify File Has Fix

For each file, search for this code:

```javascript
const switchInProgress = sessionStorage.getItem('role_switch_in_progress');
const targetRole = sessionStorage.getItem('target_role');

if (switchInProgress === 'true' && targetRole === 'tutor') {
```

If you DON'T see this, the file needs to be updated.

## Cache Clearing

If files seem unchanged:

1. **Hard Refresh**: Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)
2. **Clear Cache**:
   - Open DevTools (F12)
   - Right-click Refresh button
   - Select "Empty Cache and Hard Reload"
3. **Check File Loaded**:
   - DevTools → Network tab
   - Filter: "profile-system.js"
   - Click on file → Preview tab
   - Search for "role_switch_in_progress"
   - Should see the code

## Testing Sequence

1. Login with user that has multiple roles (student + tutor + parent)
2. Navigate to student-profile.html
3. Open console (F12)
4. Run state check (Step 2 code)
5. Click profile dropdown
6. Click "Tutor" role
7. Watch console logs
8. Page should navigate to tutor-profile.html
9. Page should load successfully (NO alert)
10. Run state check again to confirm

## Expected Final Console Output

```
[switchToRole] Called with newRole: tutor
[switchToRole] Current userRole: student
[switchToRole] Making API call to /api/switch-role...
[switchToRole] API response status: 200
[switchToRole] API response data: {active_role: "tutor", access_token: "...", ...}
[switchToRole] Updated access token with new role
[switchToRole] Updated AuthManager.user.active_role to: tutor
[switchToRole] Updated localStorage.userRole to: tutor
[switchToRole] Updated currentUser object with new role
[switchToRole] Set role_switch_in_progress flag for: tutor
[switchToRole] Navigating to: ../profile-pages/tutor-profile.html

--- NEW PAGE LOADS ---

[AuthManager.restoreSession] Starting session restoration...
[AuthManager.restoreSession] Found token: true Found user: true
[AuthManager.restoreSession] Parsed user: {id: 123, active_role: "student", ...}
[AuthManager.restoreSession] Syncing active_role from userRole: tutor
[AuthManager.restoreSession] Previous active_role: student
[AuthManager.restoreSession] Session restored successfully
🔍 [TutorProfile] Role Check Debug: {
  userRole: "tutor",
  user_active_role: "tutor",
  localStorage_userRole: "tutor",
  sessionStorage_switchInProgress: "true",
  sessionStorage_targetRole: "tutor"
}
✅ [TutorProfile] Role switch in progress to tutor - allowing page load
✅ Authentication verified for tutor role
```

## If Still Not Working

Paste this entire block into console to get full diagnostics:

```javascript
console.log('=== FULL DIAGNOSTIC ===');
console.log('1. Environment:');
console.log('   API_BASE_URL:', window.API_BASE_URL);
console.log('   Current page:', window.location.href);

console.log('2. LocalStorage:');
console.log('   userRole:', localStorage.getItem('userRole'));
console.log('   token exists:', !!localStorage.getItem('token'));
const cu = JSON.parse(localStorage.getItem('currentUser') || '{}');
console.log('   currentUser.active_role:', cu.active_role);
console.log('   currentUser.role:', cu.role);
console.log('   currentUser.roles:', cu.roles);

console.log('3. SessionStorage:');
console.log('   role_switch_in_progress:', sessionStorage.getItem('role_switch_in_progress'));
console.log('   target_role:', sessionStorage.getItem('target_role'));

console.log('4. AuthManager:');
console.log('   exists:', !!window.AuthManager);
console.log('   user exists:', !!window.AuthManager?.user);
console.log('   user.active_role:', window.AuthManager?.user?.active_role);
console.log('   user.role:', window.AuthManager?.user?.role);
console.log('   user.roles:', window.AuthManager?.user?.roles);
console.log('   getUserRole():', window.AuthManager?.getUserRole());

console.log('5. ProfileSystem:');
console.log('   exists:', !!window.ProfileSystem);
console.log('   switchToRole exists:', !!window.switchToRole);

console.log('6. Functions Test:');
if (window.AuthManager) {
    console.log('   AuthManager.getUserRole():', window.AuthManager.getUserRole());
}

console.log('=== END DIAGNOSTIC ===');
```

Copy the entire output and provide it for analysis.

---

**Created**: 2026-01-24
**Purpose**: Debug role switching bounce-back issue
**Status**: Active debugging
