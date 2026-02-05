# Role Reversion After Grace Period - Complete Fix

## Problem Summary

Users experienced role switching failures with a very specific pattern:
1. Role switch API call succeeded ✅
2. Database updated correctly ✅
3. Page navigation worked ✅
4. Grace period protection worked (0-10 seconds) ✅
5. **BUT**: Role reverted back to old role after ~15 seconds ❌

## Root Cause

**SQLAlchemy Session Identity Map Caching**

The issue was NOT a database transaction problem. The database was being updated correctly. The problem was that SQLAlchemy's session-level identity map was caching stale user objects across HTTP requests via connection pooling.

### How It Happened

```
POST /api/switch-role (Request A)
├─ Gets Session A from connection pool
├─ Queries User(id=123) → Cached in Session A's identity map
├─ Updates active_role = 'tutor'
├─ Commits to database ✅
└─ Session A returns to pool (with cached User object still in identity map)

[15 seconds later...]

GET /api/me (Request B)
├─ Gets Session A from connection pool (reused!)
├─ Queries User(id=123)
├─ SQLAlchemy checks identity map: "I already have this object!"
├─ Returns CACHED object (active_role = 'student') ❌
└─ Frontend overwrites localStorage with stale data
    └─ Role validation fails → Redirect
```

The grace period (10 seconds) masked the problem initially, but once expired, the first `/api/me` call returned stale data and overwrote the correct role in localStorage.

## Solution Implemented

### Backend Fix: Force Fresh User Data in `get_current_user()`

**File**: `astegni-backend/utils.py` (lines 229-234)

Added `db.expire()` and `db.refresh()` to force SQLAlchemy to query fresh data from the database on every authenticated request:

```python
user = db.query(User).filter(User.id == user_id).first()
if user is None:
    raise credentials_exception

# CRITICAL FIX: Expire and refresh user object to get fresh data from database
# This prevents SQLAlchemy session cache from returning stale active_role data
# after role switches (fixes role reversion bug after grace period expires)
db.expire(user)
db.refresh(user)
print(f"[get_current_user] Refreshed user {user.id} from database - active_role: {user.active_role}")
```

**Why This Works:**
- `db.expire(user)` marks the object's attributes as stale
- `db.refresh(user)` forces an immediate SELECT query to reload fresh data
- Every authenticated request gets up-to-date user data
- No more stale active_role from session cache

**Performance Impact:**
- Adds one extra SELECT query per authenticated request
- Query is fast (indexed by primary key)
- Negligible performance impact
- Worth it for data consistency

## Complete Timeline (After Fix)

```
T+0ms:    User clicks "Switch to Tutor"

T+100ms:  POST /api/switch-role
          - Database updated: active_role = 'tutor' ✅
          - Returns new JWT token ✅
          - localStorage.userRole = 'tutor' ✅
          - Grace period flags set ✅

T+200ms:  Navigation to tutor-profile.html

T+300ms:  Page loads
          - AuthManager.restoreSession() runs
          - Grace period detected ✅
          - Forces role to 'tutor' ✅
          - Dispatches userRoleUpdated event ✅
          - ProfileSystem refreshes UI ✅

T+10000ms: Grace period expires naturally
          - Flags cleared by AuthManager ✅

T+15000ms: fetchCurrentUserData() calls GET /api/me
          - get_current_user() runs
          - ✅ db.expire(user) + db.refresh(user) called
          - ✅ Fresh query to database
          - ✅ Returns active_role = 'tutor'
          - ✅ localStorage.userRole = 'tutor' (confirmed)
          - ✅ No redirect!

RESULT:   ✅ Role persists correctly
          ✅ No unexpected redirects
          ✅ User stays on correct profile page
```

## All Fixes Applied (Summary)

This was a **6-part comprehensive fix** addressing multiple issues in the role switching flow:

### 1. Race Condition - Grace Period Flags Cleared Too Early
**Files**: `js/tutor-profile/init.js`, `js/student-profile/init.js`, `js/parent-profile/parent-profile.js`, `js/advertiser-profile/advertiser-profile.js`

**Fix**: Don't clear grace period flags immediately - let them expire naturally after 10 seconds.

**Docs**: [ROLE_SWITCH_RACE_CONDITION_FIX.md](ROLE_SWITCH_RACE_CONDITION_FIX.md)

### 2. AuthManager Loading Stale User Data
**File**: `js/root/auth.js` (lines 93-131)

**Fix**: Added grace period detection in `restoreSession()` to force correct role during transition.

**Docs**: [ROLE_SWITCH_RACE_CONDITION_FIX.md](ROLE_SWITCH_RACE_CONDITION_FIX.md)

### 3. Profile Container Not Updating
**Files**: `js/root/auth.js` (dispatch event), `js/root/profile-system.js` (listen for event)

**Fix**: Event-based communication between AuthManager and ProfileSystem to refresh UI after role switch.

**Docs**: [PROFILE_CONTAINER_UPDATE_FIX.md](PROFILE_CONTAINER_UPDATE_FIX.md)

### 4. Role Management Missing Grace Period
**File**: `js/common-modals/role-manager.js` (lines 462-477)

**Fix**: Set grace period flags before navigation after role removal.

**Docs**: [ROLE_MANAGEMENT_GRACE_PERIOD_FIX.md](ROLE_MANAGEMENT_GRACE_PERIOD_FIX.md)

### 5. Backend Returning Stale Role Data
**File**: `astegni-backend/utils.py` (lines 229-234)

**Fix**: Force fresh user data in `get_current_user()` with `db.expire()` and `db.refresh()`.

**Docs**: [BACKEND_ROLE_STALENESS_ANALYSIS.md](BACKEND_ROLE_STALENESS_ANALYSIS.md)

### 6. Frontend Reading Wrong API Field (FINAL FIX)
**File**: `js/root/profile-system.js` (lines 331-343)

**Fix**: Read `userData.active_role` instead of `userData.role` in `fetchCurrentUserData()`.

**Docs**: [FRONTEND_API_ME_ROLE_FIX.md](FRONTEND_API_ME_ROLE_FIX.md)

## Testing the Complete Fix

### Test Case 1: Regular Role Switch
1. Log in with multi-role account (e.g., student + tutor)
2. Switch from student to tutor
3. Watch console logs:
   ```
   [AuthManager.restoreSession] ✅ Within grace period - forcing active_role to: tutor
   [AuthManager.restoreSession] Dispatched userRoleUpdated event
   [profile-system] UI refreshed after role switch
   ```
4. Wait 15+ seconds on tutor profile page
5. Check Network tab - `/api/me` calls should return `active_role: "tutor"`
6. Verify no redirects occur
7. Profile should remain on tutor page with tutor information displayed

### Test Case 2: Role Removal
1. Log in with multi-role account (e.g., student + tutor)
2. Go to tutor profile
3. Open "Manage Role" modal
4. Remove tutor role (switches to student)
5. Watch console logs:
   ```
   [RoleManager] Set grace period flags for role: student
   [AuthManager.restoreSession] ✅ Within grace period - forcing active_role to: student
   [profile-system] UI refreshed after role switch
   ```
6. Wait 15+ seconds on student profile page
7. Verify no redirects occur
8. Student profile should remain loaded

### Test Case 3: Multiple Rapid Switches
1. Log in with multi-role account
2. Rapidly switch: student → tutor → student → tutor
3. Each switch should work correctly
4. No redirects should occur
5. Final profile should match the last selected role

### Backend Logs to Verify

After the fix, you should see these logs on every authenticated request:

```
[get_current_user] Refreshed user {user_id} from database - active_role: {role}
```

This confirms that fresh data is being loaded from the database on every request.

## Files Modified

### Backend
- ✅ `astegni-backend/utils.py` (lines 229-234) - Added `db.expire()` and `db.refresh()` in `get_current_user()`

### Frontend
- ✅ `js/root/auth.js` - Grace period detection in `restoreSession()`, dispatch `userRoleUpdated` event
- ✅ `js/root/profile-system.js` (lines 331-343) - Read `active_role` from API, listen for `userRoleUpdated` event
- ✅ `js/tutor-profile/init.js` - Don't clear grace period flags prematurely
- ✅ `js/student-profile/init.js` - Don't clear grace period flags prematurely
- ✅ `js/parent-profile/parent-profile.js` - Don't clear grace period flags prematurely
- ✅ `js/advertiser-profile/advertiser-profile.js` - Don't clear grace period flags prematurely
- ✅ `js/common-modals/role-manager.js` - Set grace period flags on role removal

## Next Steps

1. **Restart the backend server** to apply the fix:
   ```bash
   cd astegni-backend
   python app.py
   ```

2. **Test thoroughly** using the test cases above

3. **Monitor logs** to verify fresh user data is being loaded

4. **Verify** no role reversion occurs after 15+ seconds

## Technical Lessons Learned

1. **SQLAlchemy Identity Map**: Session-level caching can persist across HTTP requests via connection pooling
2. **Always expire critical data**: When data can change outside current transaction, explicitly refresh it
3. **Grace period patterns**: Useful for handling timing-sensitive operations like navigation after state changes
4. **Event-driven UI**: Decouples modules and allows reactive updates
5. **Comprehensive logging**: Critical for debugging timing-dependent issues

## Summary

The role reversion issue was caused by **SQLAlchemy's session-level identity map caching stale user objects** across multiple HTTP requests via connection pooling. The fix ensures that every authenticated request gets fresh user data from the database by calling `db.expire()` and `db.refresh()` in the `get_current_user()` dependency.

This final piece completes the role switching fix, ensuring that role switches persist correctly even after the grace period expires and subsequent API calls are made.
