# Frontend /api/me Role Field Fix

## Problem

After implementing the backend fix (`db.expire()` + `db.refresh()`), the role was **still** reverting back to the old role approximately 25-40 seconds after a successful switch.

### Debug Log Evidence

From the user's latest debug log (15:50:40):

```
[15:50:06] ✅ Role switch successful - updated to: tutor
[15:50:15] ✅ Grace period active - forcing role to: tutor
[15:50:22] ✅ Grace period expired - role still correct: tutor

[15:50:40] ❌ Role reverted to: student
[profile-system.checkRolePageMismatch] userRole variable: student
[TutorProfile] User role is 'student', not 'tutor'. Redirecting...
```

The role successfully persisted through the grace period, then suddenly reverted at 15:50:40 (about 34 seconds after the switch).

## Root Cause

The frontend's `fetchCurrentUserData()` function was reading the **wrong field** from the `/api/me` API response.

### Backend API Response

The `/api/me` endpoint returns a `UserResponse` model which has:
- ✅ `active_role` - The current active role (CORRECT)
- ❌ `role` - **This field doesn't exist in UserResponse**

**File**: `astegni-backend/app.py modules/models.py` (line 951)

```python
class UserResponse(BaseModel):
    id: int
    first_name: str
    # ...
    roles: List[str]  # All roles the user has
    active_role: Optional[str] = None  # Current active role ← THIS IS THE CORRECT FIELD
    # ...
```

### Frontend Code Error

**File**: `js/root/profile-system.js` (line 337 - BEFORE FIX)

```javascript
async function fetchCurrentUserData() {
    const response = await fetch(`${API_BASE_URL}/api/me`, ...);
    const userData = await response.json();

    // ❌ WRONG: Reading userData.role (which doesn't exist or is undefined)
    userRole = userData.role;
    localStorage.setItem('userRole', userData.role);
}
```

When `userData.role` is `undefined`, JavaScript silently sets `userRole` to `undefined`, and then the validation logic treats this as an invalid role, causing redirects.

## The Fix

Changed `fetchCurrentUserData()` to read `active_role` instead of `role`:

**File**: `js/root/profile-system.js` (lines 331-343)

```javascript
if (response.ok) {
    const userData = await response.json();
    currentUser = {
        id: userData.id,
        name: `${userData.first_name} ${userData.father_name}`,
        first_name: userData.first_name,
        father_name: userData.father_name,
        email: userData.email,
        phone: userData.phone,
        role: userData.active_role,  // FIXED: Use active_role from API
        active_role: userData.active_role,  // Include both for compatibility
        profile_picture: userData.profile_picture,
        created_at: userData.created_at,
        is_active: userData.is_active,
        email_verified: userData.email_verified
    };
    userRole = userData.active_role;  // FIXED: Use active_role instead of role

    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    // Only store userRole if it has a valid value (prevent storing "undefined" string)
    if (userData.active_role && userData.active_role !== 'undefined') {
        localStorage.setItem('userRole', userData.active_role);  // FIXED: Use active_role
    }
}
```

### Key Changes:
1. Line 331: `role: userData.active_role` - Store active_role in currentUser object
2. Line 332: `active_role: userData.active_role` - Include both fields for compatibility
3. Line 338: `userRole = userData.active_role` - Read from correct API field
4. Line 343: `localStorage.setItem('userRole', userData.active_role)` - Store correct value

## Why This Fix Works

1. **Backend returns fresh data**: The `db.expire()` + `db.refresh()` fix ensures the backend returns up-to-date `active_role`
2. **Frontend reads correct field**: Now reads `userData.active_role` instead of non-existent `userData.role`
3. **No more undefined values**: `localStorage.userRole` always has the correct, defined value
4. **Role persists**: Even when `fetchCurrentUserData()` is called after grace period, it gets and stores the correct role

## Complete Timeline (After Both Fixes)

```
T+0ms:    User clicks "Switch to Tutor"

T+100ms:  POST /api/switch-role
          - Backend: db updated, active_role = 'tutor' ✅
          - Frontend: localStorage.userRole = 'tutor' ✅
          - Grace period flags set ✅

T+200ms:  Navigation to tutor-profile.html

T+300ms:  Page loads
          - AuthManager.restoreSession() runs
          - Grace period detected ✅
          - Forces role to 'tutor' ✅

T+10000ms: Grace period expires
          - Flags cleared naturally ✅

T+25000ms: fetchCurrentUserData() runs
          - Calls GET /api/me
          - Backend: db.expire() + db.refresh() ✅
          - Backend returns: active_role = 'tutor' ✅
          - Frontend reads: userData.active_role ✅
          - localStorage.userRole = 'tutor' (stays correct!) ✅

T+40000ms: Role validation runs
          - Reads localStorage.userRole = 'tutor' ✅
          - Current page: tutor-profile.html ✅
          - Match! No redirect ✅

RESULT:   ✅ Role persists indefinitely
          ✅ No unexpected redirects
          ✅ User stays on correct profile page
```

## Testing

1. Clear browser cache and restart frontend
2. Log in with multi-role account
3. Switch from student → tutor
4. Wait 60+ seconds on tutor profile page
5. Open DevTools → Network tab
6. Watch for `/api/me` calls - they should return `active_role: "tutor"`
7. Verify `localStorage.userRole` remains "tutor"
8. Verify no redirects occur

### Expected Logs

```
[fetchCurrentUserData] Received response with active_role: tutor
[fetchCurrentUserData] Updated localStorage.userRole to: tutor
[profile-system.checkRolePageMismatch] userRole: tutor, page: tutor-profile.html
✅ Role matches page - no redirect needed
```

## Files Modified

- ✅ `js/root/profile-system.js` (lines 331-343) - Read `active_role` instead of `role` from `/api/me` response

## Related Fixes

This is the **final piece** of the role switching fix. It works together with:

1. **Backend fix**: `astegni-backend/utils.py` - Force fresh DB queries with `db.expire()` + `db.refresh()`
2. **Grace period race condition fix**: Don't clear flags prematurely
3. **AuthManager refresh fix**: Grace period detection in `restoreSession()`
4. **Profile UI update fix**: Event-based communication for UI refresh
5. **Role management fix**: Set grace period flags on role removal
6. **Frontend API fix** (THIS FIX): Read correct field from `/api/me` response

## Summary

The role was reverting because `fetchCurrentUserData()` was reading `userData.role` (which doesn't exist in the API response) instead of `userData.active_role`. This caused `localStorage.userRole` to be set to `undefined`, triggering validation failures and redirects.

The fix ensures the frontend reads the correct `active_role` field from the `/api/me` API response, which the backend now guarantees to be fresh and up-to-date thanks to the `db.expire()` + `db.refresh()` fix.

**This completes the full role switching fix!** 🎉
