# Role Reactivation JWT Token Fix - Complete Solution

## Problem Summary

When users reactivate a deactivated role (or add a new role) and try to navigate to that role's page, they encounter an "Access Restricted" error even though they just added/reactivated the role.

## Root Cause

The `/api/add-role` endpoint was updating the database `active_role` field but **NOT generating new JWT tokens** with the updated role information. This caused a mismatch:

- **Database**: `active_role = 'tutor'` (just reactivated)
- **JWT Token** (in localStorage): `current_role = 'student'` (old session)

When the user navigated to tutor-profile.html, the page's role guard checked the JWT token and denied access.

## Solution

Update both **backend** and **frontend** to generate and handle new JWT tokens immediately after adding/reactivating a role.

---

## Backend Changes

**File**: `astegni-backend/app.py modules/routes.py`

### Change #1: Role Reactivation (lines 4123-4163)

**Before**:
```python
if role_model and hasattr(role_model, 'is_active') and not role_model.is_active:
    role_model.is_active = True
    role_reactivated = True
    db.commit()
    db.refresh(current_user)

    return {
        "message": f"{new_role.capitalize()} role reactivated successfully",
        "user_roles": current_user.roles,
        "active_role": current_user.active_role,
        "role_reactivated": True
    }
```

**After**:
```python
if role_model and hasattr(role_model, 'is_active') and not role_model.is_active:
    role_model.is_active = True
    role_reactivated = True

    # Set reactivated role as active role
    current_user.active_role = new_role

    db.commit()
    db.refresh(current_user)

    # Generate new JWT tokens with updated role information
    role_ids = get_role_ids_from_user(current_user, db)

    token_data = {
        "sub": current_user.id,
        "role": new_role,  # Set reactivated role as active
        "role_ids": role_ids
    }

    new_access_token = create_access_token(data=token_data)
    new_refresh_token = create_refresh_token(data=token_data)

    # Store new refresh token
    refresh_token_obj = RefreshToken(
        token=new_refresh_token,
        user_id=current_user.id,
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(refresh_token_obj)
    db.commit()

    return {
        "message": f"{new_role.capitalize()} role reactivated successfully",
        "user_roles": current_user.roles,
        "active_role": current_user.active_role,
        "role_reactivated": True,
        "access_token": new_access_token,  # NEW
        "refresh_token": new_refresh_token,  # NEW
        "token_type": "bearer"
    }
```

### Change #2: New Role Addition (lines 4227-4269)

**Before**:
```python
# Commit and ensure changes are flushed to database
db.commit()
db.flush()
db.refresh(current_user)

# Close the session to ensure no stale data remains
db.close()

message = f"{new_role.capitalize()} role restored successfully" if role_restored else f"{new_role.capitalize()} role added successfully"

return {
    "message": message,
    "user_roles": current_user.roles,
    "active_role": current_user.active_role,
    "role_restored": role_restored
}
```

**After**:
```python
# Set newly added role as active role
current_user.active_role = new_role

# Commit and ensure changes are flushed to database
db.commit()
db.flush()
db.refresh(current_user)

# Generate new JWT tokens with updated role information
role_ids = get_role_ids_from_user(current_user, db)

token_data = {
    "sub": current_user.id,
    "role": new_role,  # Set newly added role as active
    "role_ids": role_ids
}

new_access_token = create_access_token(data=token_data)
new_refresh_token = create_refresh_token(data=token_data)

# Store new refresh token
refresh_token_obj = RefreshToken(
    token=new_refresh_token,
    user_id=current_user.id,
    expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
)
db.add(refresh_token_obj)
db.commit()

# Close the session to ensure no stale data remains
db.close()

message = f"{new_role.capitalize()} role restored successfully" if role_restored else f"{new_role.capitalize()} role added successfully"

return {
    "message": message,
    "user_roles": current_user.roles,
    "active_role": current_user.active_role,
    "role_restored": role_restored,
    "access_token": new_access_token,  # NEW
    "refresh_token": new_refresh_token,  # NEW
    "token_type": "bearer"
}
```

---

## Frontend Changes

**File**: `js/root/profile-system.js`

### Change: Handle JWT Tokens from /api/add-role (lines 1401-1472)

**Before**:
```javascript
if (response.ok) {
    const successMessage = data.role_reactivated
        ? `${formatRoleName(addRoleData.role)} role reactivated successfully!`
        : `${formatRoleName(addRoleData.role)} role added successfully!`;

    if (window.showToast) {
        window.showToast(successMessage, 'success');
    }

    // Update current user data
    if (currentUser) {
        currentUser.roles = data.user_roles || [...(currentUser.roles || []), addRoleData.role];
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }

    // Close modal
    if (window.closeModal) {
        window.closeModal('add-role-modal');
    } else {
        document.getElementById('add-role-modal')?.classList.add('hidden');
    }

    // Refresh role switcher
    await setupRoleSwitcher();

    // Ask user if they want to switch to the role
    const switchMessage = data.role_reactivated
        ? `Switch to your reactivated ${formatRoleName(addRoleData.role)} role now?`
        : `Switch to your new ${formatRoleName(addRoleData.role)} role now?`;

    setTimeout(() => {
        if (confirm(switchMessage)) {
            switchToRole(addRoleData.role);  // ← This was failing
        }
    }, 500);
}
```

**After**:
```javascript
if (response.ok) {
    const successMessage = data.role_reactivated
        ? `${formatRoleName(addRoleData.role)} role reactivated successfully!`
        : `${formatRoleName(addRoleData.role)} role added successfully!`;

    if (window.showToast) {
        window.showToast(successMessage, 'success');
    }

    // CRITICAL FIX: Update JWT tokens with new role information (backend now returns tokens)
    if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('access_token', data.access_token);
        console.log('[handleAddRoleSubmit] Updated access token with new role');
    }

    if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
        console.log('[handleAddRoleSubmit] Updated refresh token');
    }

    // Update AuthManager with new token
    if (window.AuthManager && data.access_token) {
        window.AuthManager.token = data.access_token;
        if (window.AuthManager.user) {
            window.AuthManager.user.active_role = data.active_role;
            window.AuthManager.user.role = data.active_role;
        }
    }

    // Update current user data
    if (currentUser) {
        currentUser.roles = data.user_roles || [...(currentUser.roles || []), addRoleData.role];
        currentUser.active_role = data.active_role;
        currentUser.role = data.active_role;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }

    // Update userRole variable
    userRole = data.active_role;
    if (data.active_role && data.active_role !== 'undefined') {
        localStorage.setItem('userRole', data.active_role);
    }

    // Set sessionStorage flag for navigation
    sessionStorage.setItem('role_switch_in_progress', 'true');
    sessionStorage.setItem('target_role', data.active_role);
    console.log('[handleAddRoleSubmit] Set role_switch_in_progress flag for:', data.active_role);

    // Close modal
    if (window.closeModal) {
        window.closeModal('add-role-modal');
    } else {
        document.getElementById('add-role-modal')?.classList.add('hidden');
    }

    // Refresh role switcher
    await setupRoleSwitcher();

    // Ask user if they want to go to the role's profile page
    const switchMessage = data.role_reactivated
        ? `Go to your ${formatRoleName(addRoleData.role)} profile now?`
        : `Go to your new ${formatRoleName(addRoleData.role)} profile now?`;

    setTimeout(() => {
        if (confirm(switchMessage)) {
            // Navigate directly to profile page (no need to call switchToRole API - already done)
            const profileUrl = getProfileUrl(addRoleData.role);
            console.log('[handleAddRoleSubmit] Navigating to:', profileUrl);
            window.location.href = profileUrl;
        }
    }, 500);
}
```

---

## How It Works Now

### Flow After Reactivating a Role:

1. **User clicks "Activate Role"** in the Add Role modal
2. **Frontend sends** POST to `/api/add-role` with OTP, password, and role
3. **Backend**:
   - Verifies OTP and password
   - Sets role as active: `current_user.active_role = new_role`
   - Reactivates the role profile: `role_model.is_active = True`
   - **Generates NEW JWT tokens** with `current_role = new_role`
   - Returns tokens in response
4. **Frontend receives response**:
   - Stores new JWT tokens in localStorage
   - Updates all user state (currentUser, userRole, AuthManager)
   - Sets `role_switch_in_progress` flag in sessionStorage
   - Shows confirm dialog
5. **User clicks "Go to profile"**:
   - Navigates directly to profile page (e.g., tutor-profile.html)
   - **No additional API call needed** (tokens already updated)
6. **Profile page loads**:
   - Role guard checks sessionStorage flag
   - Sees `role_switch_in_progress = true` and `target_role = 'tutor'`
   - **Allows access** (skips normal validation)
   - Clears the flags

### Result:

✅ No more "Access Restricted" errors
✅ JWT token matches database active_role
✅ Seamless role activation and navigation
✅ No race conditions or timing issues

---

## Benefits

1. **Eliminates Race Conditions**: No delay between role activation and token update
2. **Simplifies Flow**: No need for separate `/api/switch-role` call after activation
3. **Better UX**: Instant role switch without intermediate steps
4. **Consistent with /api/switch-role**: Both endpoints now return JWT tokens
5. **Prevents Stale Tokens**: User always has valid token for their active role

---

## Testing Steps

1. Login as a user with a student role
2. Go to student profile → Manage Role → Deactivate Student Role
3. Verify redirect to index.html
4. Click Profile Dropdown → Add Role → Select "Student" → Enter password → Verify OTP → Click "Activate Role"
5. When prompted "Go to your Student profile now?", click **OK**
6. **Expected**: Navigate to student profile successfully ✅
7. **No "Access Restricted" modal should appear** ✅
8. Verify JWT token in localStorage has correct role
9. Refresh the page - should still work
10. Check backend console - should see new refresh token created

---

## Files Modified

### Backend
- ✅ `astegni-backend/app.py modules/routes.py` (lines 4123-4163, 4227-4269)

### Frontend
- ✅ `js/root/profile-system.js` (lines 1401-1472)

### Documentation
- ✅ `ROLE_REACTIVATION_JWT_TOKEN_FIX.md` (this file)
- ✅ `ROLE_SWITCH_AFTER_REACTIVATION_BUG_INVESTIGATION.md` (investigation notes)

---

## Status

✅ **FIXED** - Role reactivation now generates and returns new JWT tokens, eliminating access denied errors.

## Version

- **Before**: v2.1.0
- **After**: v2.1.1 (JWT token fix for role reactivation)
