# Login Active Role Fix

## Issue
When logging in, the system was using `users.current_role` from the database without checking if that role was actually active (`is_active=True` in the role profile). This meant users could log in as a deactivated role, causing confusion and broken functionality.

## Root Cause
The login endpoint (`POST /api/login`) at line 524 in `app.py modules/routes.py` was directly using `user.active_role` without verifying if that role's profile had `is_active=True`.

```python
# BEFORE (BROKEN):
token_data = {
    "sub": user.id,
    "role": user.active_role,  # ❌ Not checking if role is actually active!
    "role_ids": role_ids
}
```

Similarly, the `/api/me` and `/api/my-roles` endpoints were returning the stored `current_role` without verification.

## Solution

### 1. Created `get_first_active_role()` Helper Function
**File:** `astegni-backend/utils.py` (Lines 103-147)

**Purpose:** Query the database to find the first ACTIVE role for a user.

**How it works:**
1. Iterates through user's roles in priority order: `student → tutor → parent → advertiser → user`
2. For each role, queries the role profile table (e.g., `tutor_profiles`)
3. Checks if `is_active=True` in the profile
4. Returns the first active role found, or `None` if no active roles exist

**Key Code:**
```python
def get_first_active_role(user: User, db: Session) -> Optional[str]:
    """
    Get the first ACTIVE role for a user.
    Checks each role profile to verify it's active (is_active=True).
    """
    from models import StudentProfile, TutorProfile, ParentProfile, AdvertiserProfile, UserProfile

    role_priority = ['student', 'tutor', 'parent', 'advertiser', 'user']

    for role in role_priority:
        if role not in user.roles:
            continue

        # Check if this role's profile is active
        is_active = False

        if role == 'student':
            profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
            is_active = profile and getattr(profile, 'is_active', True)
        # ... similar checks for tutor, parent, advertiser, user

        if is_active:
            return role

    return None  # No active roles found
```

### 2. Updated Login Endpoint
**File:** `astegni-backend/app.py modules/routes.py` (Lines 517-538)

**Changes:**
1. Call `get_first_active_role()` to verify active role
2. Update `user.current_role` and `user.active_role` in database if different
3. Use verified `active_role` in JWT token (not `user.active_role`)

**Key Code:**
```python
# AFTER (FIXED):
# CRITICAL FIX: Get first ACTIVE role instead of using user.active_role directly
active_role = get_first_active_role(user, db)

# Update user's current_role in database to match active role
if active_role != user.current_role:
    user.current_role = active_role
    user.active_role = active_role

db.commit()

# Create tokens with verified active role
token_data = {
    "sub": user.id,
    "role": active_role,  # ✅ Verified active role from database
    "role_ids": role_ids
}
```

### 3. Updated `/api/me` Endpoint
**File:** `astegni-backend/app.py modules/routes.py` (Lines 678-683)

**Changes:**
- Verify and correct `current_role` on every request
- Update database if mismatch detected

**Key Code:**
```python
@router.get("/api/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # CRITICAL FIX: Verify current_role is actually active, update if not
    active_role = get_first_active_role(current_user, db)
    if active_role != current_user.current_role:
        current_user.current_role = active_role
        current_user.active_role = active_role
        db.commit()
```

### 4. Updated `/api/my-roles` Endpoint
**File:** `astegni-backend/app.py modules/routes.py` (Lines 3509-3550)

**Changes:**
- Verify and correct `current_role` before returning
- Return verified `active_role` instead of `current_user.active_role`

**Key Code:**
```python
@router.get("/api/my-roles")
def get_user_roles(...):
    # CRITICAL FIX: Verify current_role is actually active, update if not
    active_role = get_first_active_role(current_user, db)
    if active_role != current_user.current_role:
        current_user.current_role = active_role
        current_user.active_role = active_role
        db.commit()

    # ... filter active roles ...

    return {
        "user_roles": active_roles,
        "active_role": active_role  # Use verified active_role
    }
```

## How It Works Now

### Login Flow:
1. **User enters credentials** and clicks login
2. **Backend verifies password**
3. **Backend calls `get_first_active_role()`** to find first active role
4. **Backend updates `users.current_role`** if it doesn't match active role
5. **Backend creates JWT tokens** with verified active role
6. **Frontend receives tokens** with correct active role
7. **User is logged in** as their first active role (or sees "no role" if none active)

### Scenarios:

#### Scenario 1: User has active roles
- **Before Fix:** Logs in as deactivated tutor role (broken)
- **After Fix:** Automatically switches to active student role ✅

#### Scenario 2: User deactivated all roles
- **Before Fix:** Logs in as deactivated role (broken)
- **After Fix:** `active_role = None`, shows "No role yet, add role" ✅

#### Scenario 3: User has multiple active roles
- **Before Fix:** Logs in as whatever was in `users.current_role` (might be deactivated)
- **After Fix:** Logs in as first active role in priority order ✅

## Benefits

1. **Consistent State:** `users.current_role` always matches an active role
2. **Auto-Correction:** Every API request verifies and corrects active role
3. **No Manual Sync:** Database automatically stays in sync
4. **Better UX:** Users never see deactivated roles after login
5. **Future-Proof:** Works correctly even if user deactivates roles while logged in

## Testing

To test the fix:
```bash
# 1. Start backend
cd astegni-backend
python app.py

# 2. Test login with deactivated role:
# - Deactivate all roles for a user
# - Log out
# - Log back in
# - Should show "No role yet" or switch to another active role

# 3. Test /api/me endpoint:
# - Login as tutor
# - Deactivate tutor role (via manage-role-modal)
# - Call /api/me
# - Should return updated active_role (student/parent/etc or null)

# 4. Test /api/my-roles endpoint:
# - Similar to above
# - active_role should match first active role
```

## Files Modified

1. **astegni-backend/utils.py** - Lines 103-147 (new helper function)
2. **astegni-backend/app.py modules/routes.py** - Lines 517-538 (login endpoint)
3. **astegni-backend/app.py modules/routes.py** - Lines 678-683 (/api/me endpoint)
4. **astegni-backend/app.py modules/routes.py** - Lines 3509-3550 (/api/my-roles endpoint)

## Related Issues Fixed

- Users can no longer log in as deactivated roles
- `users.current_role` is always in sync with active role status
- API endpoints auto-correct role mismatches
- Frontend receives correct active role from backend
- "No role yet" state is properly supported throughout the system

## Database Impact

**No migration required!** The fix:
- Works with existing database schema
- Uses existing `is_active` columns in role profile tables
- Updates existing `users.current_role` and `users.active_role` columns as needed
- Auto-corrects any existing data mismatches on login/API calls
