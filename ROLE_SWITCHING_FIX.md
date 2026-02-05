# Role Switching Fix - Profile Page Access Issue

## Problem

After reactivating a role or switching roles, users were redirected to the profile page but got an error message: "This page is for [role] only. You are logged in as: [old_role]"

**Example:**
- Student reactivates tutor role
- Gets redirected to tutor-profile.html
- Page shows: "This page is for tutors only. You are logged in as: student"

## Root Cause

When switching/reactivating roles, the code updated localStorage correctly:
- ✅ New JWT token stored
- ✅ `localStorage.userRole` updated
- ⚠️ **`localStorage.currentUser` NOT updated** (if `currentUser` variable was null)

**Why it happened:**

```javascript
// profile-system.js line 1560 (BEFORE FIX)
if (currentUser) {  // ❌ This fails if currentUser is null!
    currentUser.role = data.active_role;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
}
```

When the user switches roles from index.html:
1. `currentUser` variable in profile-system.js is `null` (not initialized on index)
2. The `if (currentUser)` check fails
3. `localStorage.currentUser` is NOT updated with new role
4. User redirects to profile page
5. AuthManager.restoreSession() reads old `currentUser` from localStorage
6. AuthManager sees old role → blocks access

## Solution

**Always load `currentUser` from localStorage before updating it:**

```javascript
// FIXED CODE
if (!currentUser) {
    // Load from localStorage if not in memory
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
    }
}

if (currentUser) {
    currentUser.role = data.active_role;
    currentUser.active_role = data.active_role;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
} else {
    // Fallback: Create minimal user object
    const minimalUser = {
        id: window.AuthManager?.user?.id,
        role: data.active_role,
        active_role: data.active_role,
        roles: data.user_roles || []
    };
    localStorage.setItem('currentUser', JSON.stringify(minimalUser));
}
```

## Changes Made

### File: `js/root/profile-system.js`

**1. Fixed switchToRole() function (line ~1559)**
- Added check to load `currentUser` from localStorage if null
- Added fallback to create minimal user object if not found

**2. Fixed handleAddRoleSubmit() function (line ~1431)**
- Same fix applied for role reactivation flow
- Ensures `currentUser` is always updated when adding/reactivating roles

## How It Works Now

### Role Switch Flow:

1. **User clicks role in dropdown**
   - Calls `switchToRole('tutor')`

2. **API call to `/api/switch-role`**
   - Backend updates `active_role = 'tutor'`
   - Returns new JWT with `role: 'tutor'`

3. **Frontend updates ALL localStorage:**
   - ✅ `localStorage.token` = new JWT
   - ✅ `localStorage.userRole` = 'tutor'
   - ✅ `localStorage.currentUser.active_role` = 'tutor' **(NOW FIXED)**

4. **Redirect to profile page**
   - sessionStorage flags: `role_switch_in_progress = true`

5. **Profile page loads**
   - AuthManager.restoreSession() reads localStorage
   - Sees `currentUser.active_role = 'tutor'` ✅
   - Allows access to tutor profile page ✅

### Role Reactivation Flow:

1. **User reactivates tutor role**
   - Enters password + OTP
   - API returns new JWT with `active_role: 'tutor'`

2. **Frontend updates ALL localStorage:**
   - ✅ New JWT token
   - ✅ `userRole = 'tutor'`
   - ✅ `currentUser.active_role = 'tutor'` **(NOW FIXED)**

3. **Redirect to tutor-profile.html**
   - Page loads successfully
   - No access denied error ✅

## Testing

**Test Case 1: Switch from Student to Tutor**
1. Log in as user with [student, tutor] roles
2. Active role: student
3. Click dropdown → Select "Tutor"
4. **Expected:** Redirects to tutor-profile.html, loads successfully ✅

**Test Case 2: Reactivate Deactivated Role**
1. Deactivate tutor role
2. Redirected to index.html
3. Click "Add Role" → Select tutor → Enter password + OTP
4. **Expected:** Redirects to tutor-profile.html, loads successfully ✅

**Test Case 3: Switch on Index.html**
1. User on index.html with multiple roles
2. Click dropdown → Switch to different role
3. **Expected:** Updates work even though `currentUser` variable is null ✅

## Key Insight

**Always assume `currentUser` might be null**, especially when:
- User is on index.html (profile-system.js loaded but `currentUser` not initialized)
- User just logged in (variable not yet set)
- Page just loaded (module variables reset)

**Solution:** Always load from localStorage first, then create fallback if needed.
