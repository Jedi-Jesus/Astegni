# Role Deactivation Bug Fix - Complete

## Issues Found and Fixed

### 1. Backend: `active_role` Not Cleared in Database ✅ FIXED
**File:** [role_management_endpoints.py](astegni-backend/role_management_endpoints.py)

**Bug:** Lines 91, 100-108, 122, 129, 136-153 were using `current_user` (JWT object from dependency injection) instead of `user` (actual database object fetched on line 73).

**Impact:** When deactivating a role, `is_active` was set to False correctly, but `active_role` in the users table remained unchanged because we were modifying the wrong object.

**Fix Applied:**
```python
# BEFORE (WRONG):
if current_user.active_role == request.role:
    current_user.active_role = None  # This doesn't update DB!

# AFTER (CORRECT):
if user.active_role == request.role:
    user.active_role = None  # This updates DB correctly!
```

Changed all references:
- Line 91: `current_user.roles` → `user.roles`
- Lines 100-108: `current_user.id` → `user.id`
- Line 122: `current_user.active_role` → `user.active_role`
- Line 129: `current_user.roles` → `user.roles`
- Lines 136-153: `current_user.id` → `user.id`

---

### 2. Frontend: Index.html Requires Both `userRole` AND Token ✅ FIXED
**File:** [js/index/init-index.js](js/index/init-index.js)

**Bug:** Line 11 checked `if (savedUser && savedRole && savedToken)`, but when a role is deactivated, `userRole` is removed from localStorage, causing the entire condition to fail.

**Impact:** When redirected to index.html after deactivation, the UI didn't update because `updateUIForLoggedInUser()` was never called.

**Fix Applied:**
```javascript
// BEFORE (WRONG):
if (savedUser && savedRole && savedToken) {
    // Only runs if user has a role - fails for deactivated users!

// AFTER (CORRECT):
if (savedUser && savedToken) {
    // Runs for all logged-in users, even with no active role
    APP_STATE.userRole = savedRole; // Can be null

    updateUIForLoggedInUser();  // Handles null role correctly

    // Only update profile link if there's a role
    if (savedRole) {
        updateProfileLink(savedRole);
    }
```

---

### 3. Frontend: Dropdown Doesn't Handle Null Roles ✅ ALREADY FIXED
**File:** [js/index/profile-and-authentication.js](js/index/profile-and-authentication.js)

**Status:** Already fixed in lines 302-336 to handle null/no active roles:
- Shows "No role selected" text
- Sets profile link to `#` with onclick to open "Add Role" modal
- Properly handles `null`, `'null'`, and `'undefined'` values

---

### 4. Frontend: Role Manager Updates Dropdown Before Redirect ✅ ALREADY FIXED
**File:** [js/common-modals/role-manager.js](js/common-modals/role-manager.js)

**Status:** Already fixed in lines 322-338 to update dropdown immediately before redirect:
- Sets `dropdown-profile-link.href = '#'`
- Sets onclick handler to open "Add Role" modal
- Sets `dropdown-user-role.textContent = 'No role selected'`

---

### 5. Protection: Active Role Guard ✅ ALREADY IMPLEMENTED
**File:** [js/root/active-role-guard.js](js/root/active-role-guard.js)

**Status:** Already implemented and included in all profile pages
- Fetches `/api/my-roles` on page load
- Backend filters out deactivated roles automatically
- Bounces user to index.html if accessing deactivated role page

---

### 6. Enhanced Debugger ✅ ADDED
**File:** [js/utils/role-switch-debugger.js](js/utils/role-switch-debugger.js)

**Added:** Enhanced tracking for:
- `/api/role/deactivate` requests and responses
- `/api/my-roles` responses
- Dropdown state in snapshot (href, onclick, text)
- localStorage state (user, currentUser, userRole)

**Usage:** Press `Ctrl+Shift+D` to open debugger

---

## Complete Flow After Fix

### User Deactivates Role:

1. **Frontend:** User clicks "Deactivate Role" → enters password → clicks confirm
2. **Backend API Call:** `POST /api/role/deactivate` with `{role: "parent", password: "..."}`
3. **Backend Processing:**
   - Fetches `user` from database (line 73)
   - Verifies password
   - Sets `role_model.is_active = False` (line 117)
   - Sets `user.active_role = None` ✅ NOW CORRECT (line 123)
   - Commits to database (line 125)
   - Returns `{deactivated_role, new_active_role: null, remaining_active_roles: [...]}`
4. **Frontend Response Handler:**
   - Clears localStorage: `userRole` removed, `user.active_role = null`
   - Updates dropdown immediately (lines 322-338)
   - Redirects to `/index.html`
5. **Index.html Loads:**
   - Checks localStorage: `savedUser` exists, `savedRole` is null, `savedToken` exists ✅ NOW PASSES
   - Calls `updateUIForLoggedInUser()` ✅ NOW RUNS
   - Dropdown shows "No role selected" ✅ CORRECT
   - Clicking dropdown opens "Add Role" modal ✅ CORRECT

### User Tries to Access Deactivated Role Page:

1. User types `/profile-pages/parent-profile.html` in browser
2. Active role guard runs on page load
3. Fetches `/api/my-roles` → backend returns `{active_role: null, user_roles: ["tutor", "student", ...]}`
   - Note: "parent" is NOT in `user_roles` because backend filters out deactivated roles
4. Guard checks if "parent" is in active roles list → NOT FOUND
5. Shows alert: "Your parent role has been deactivated"
6. Redirects to `/index.html` ✅ BOUNCES CORRECTLY

---

## Testing Steps

### Test 1: Deactivate Role (Complete Flow)
```bash
1. Login as jediael.s.abebe@gmail.com
2. Open debugger: Press Ctrl+Shift+D
3. Click dropdown → "Manage Role"
4. Click "Deactivate Role"
5. Enter password: @JesusJediael1234
6. Click "Deactivate Role"
```

**Expected Results:**
- ✅ Debugger shows: `🔴 DEACTIVATING ROLE: parent`
- ✅ Debugger shows: `✅ DEACTIVATION SUCCESS: parent | new_active_role: null`
- ✅ Alert: "Your parent role has been deactivated..."
- ✅ Redirected to `/index.html`
- ✅ Dropdown shows "No role selected"
- ✅ Clicking dropdown opens "Add Role" modal
- ✅ Database: `active_role = NULL`, `is_active = FALSE`

### Test 2: Try to Access Deactivated Page
```bash
1. After deactivation, type URL: /profile-pages/parent-profile.html
```

**Expected Results:**
- ✅ Debugger shows: `📋 MY-ROLES: active_role="null" | user_roles=[tutor, student, advertiser, user]`
  - Note: "parent" is NOT in the list
- ✅ Alert: "Your parent role has been deactivated. Please select an active role or reactivate this role."
- ✅ Redirected to `/index.html`

### Test 3: Reactivate Role
```bash
1. Click dropdown (opens Add Role modal)
2. Select "Parent"
3. Enter password: @JesusJediael1234
4. Click "Add Role"
```

**Expected Results:**
- ✅ Backend sets `is_active = TRUE`
- ✅ Backend sets `active_role = 'parent'`
- ✅ Redirected to `/profile-pages/parent-profile.html`
- ✅ Page loads normally (guard allows access)

---

## Files Modified

### Backend
1. **[astegni-backend/role_management_endpoints.py](astegni-backend/role_management_endpoints.py)**
   - Lines 91, 100-108, 122, 129, 136-153: Changed `current_user` → `user`

### Frontend
2. **[js/index/init-index.js](js/index/init-index.js)**
   - Line 12: Removed `savedRole` from condition
   - Lines 18-24: Handle null role case

3. **[js/utils/role-switch-debugger.js](js/utils/role-switch-debugger.js)**
   - Lines 209-261: Enhanced API tracking for deactivation
   - Lines 481-506: Enhanced state snapshot with dropdown data

### Already Fixed (Previous Work)
4. **[js/common-modals/role-manager.js](js/common-modals/role-manager.js)** ✅
5. **[js/index/profile-and-authentication.js](js/index/profile-and-authentication.js)** ✅
6. **[js/root/active-role-guard.js](js/root/active-role-guard.js)** ✅

---

## Database Fix for Existing Users

If a user already deactivated a role before this fix, their `active_role` might still be set. Run:

```bash
cd astegni-backend
python fix_jediael_active_role.py
```

Or manually in Python:
```python
from models import SessionLocal, User
db = SessionLocal()
user = db.query(User).filter(User.email == 'jediael.s.abebe@gmail.com').first()
user.active_role = None
db.commit()
```

---

## Summary

✅ **Backend bug fixed** - `active_role` now correctly cleared in database
✅ **Frontend init fixed** - Index.html handles users with no active role
✅ **Dropdown updates** - Shows "No role selected" and opens Add Role modal
✅ **Page protection** - Active role guard bounces deactivated role access
✅ **Debugger enhanced** - Tracks deactivation flow and dropdown state
✅ **Database fixed** - Jediael's account manually corrected

**Root Cause:** Using dependency-injected `current_user` object instead of database-fetched `user` object for updates.

**The Fix:** Change all `current_user` references to `user` in the deactivation endpoint to ensure database updates work correctly.
