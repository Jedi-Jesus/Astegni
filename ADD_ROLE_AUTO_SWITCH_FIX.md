# Add Role Auto-Switch Fix - Complete Summary

## Problem Description

When users added a new role (or reactivated a deactivated role) through the add-role-modal, the system was **automatically changing their current/active role in the background** without their consent, even before they had a chance to click the "Switch to Account" button in the success panel.

This was poor UX because:
- Users lost their current context (e.g., Student page) without choosing to
- The "Stay Here" button was meaningless since the role had already switched
- Users expected the switch to happen ONLY when they clicked "Switch to Account"

## Root Cause

The issue occurred in **two places**:

### 1. Backend (astegni-backend/app.py modules/routes.py)

**Line 4232** - When reactivating a role:
```python
# Set reactivated role as active role
current_user.active_role = new_role  # ❌ AUTOMATICALLY SWITCHED
```

**Line 4331** - When adding a new role:
```python
# Set newly added role as active role
current_user.active_role = new_role  # ❌ AUTOMATICALLY SWITCHED
```

The backend was automatically setting the newly added/reactivated role as the `active_role` and encoding it in the JWT tokens.

### 2. Frontend (js/root/profile-system.js)

**Lines 1472-1491** - After successfully adding a role:
```javascript
currentUser.active_role = data.active_role;  // ❌ AUTOMATICALLY UPDATED
currentUser.role = data.active_role;
localStorage.setItem('currentUser', JSON.stringify(currentUser));

userRole = data.active_role;  // ❌ AUTOMATICALLY UPDATED
localStorage.setItem('userRole', data.active_role);
```

The frontend was updating all state variables and localStorage with the new role before the user even saw the success panel.

## The Fix

### Backend Changes (astegni-backend/app.py modules/routes.py)

#### 1. Removed Auto-Switch for Reactivation (Line 4232)
```python
# DO NOT automatically set as active role - let user choose
# current_user.active_role = new_role  # REMOVED
```

#### 2. Updated JWT Token for Reactivation (Line 4242)
```python
token_data = {
    "sub": current_user.id,
    "role": current_user.active_role,  # Keep CURRENT role, not newly reactivated one
    "role_ids": role_ids
}
```

#### 3. Removed Auto-Switch for New Role (Line 4331)
```python
# DO NOT automatically set newly added role as active role
# current_user.active_role = new_role  # REMOVED
```

#### 4. Updated JWT Token for New Role (Line 4343)
```python
token_data = {
    "sub": current_user.id,
    "role": current_user.active_role,  # Keep CURRENT role, not newly added one
    "role_ids": role_ids
}
```

**Result**: Backend now only adds the role to the user's `roles` list but does NOT change `active_role`. JWT tokens still contain the current active role.

### Frontend Changes (js/root/profile-system.js)

#### 1. Removed Auto-Update of State (Lines 1444-1493)
```javascript
// CRITICAL FIX: Update JWT tokens ONLY (backend keeps current active_role)
// DO NOT update active_role here - user must explicitly choose to switch
if (data.access_token) {
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('access_token', data.access_token);
}

// Update current user data - ADD the new role to roles list, but DON'T change active_role
if (currentUser) {
    currentUser.roles = data.user_roles || [...(currentUser.roles || []), addRoleData.role];
    // DO NOT update active_role or role - user hasn't chosen to switch yet
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
}

// DO NOT update userRole variable or localStorage - user hasn't chosen to switch yet
```

**Result**: Frontend only updates the JWT tokens and adds the new role to the roles list. All active role state remains unchanged.

#### 2. Fixed Success Panel to Use Newly Added Role (Line 1498)
```javascript
window.pendingRoleSwitch = {
    role: addRoleData.role,
    active_role: addRoleData.role,  // Use the newly added role (not data.active_role)
    role_reactivated: data.role_reactivated
};
```

**Result**: Success panel now correctly shows "Switch to [NewRole] Account" button.

#### 3. Fixed confirmSwitchToNewRole to Actually Switch (Line 2084)
```javascript
window.confirmSwitchToNewRole = async function() {
    if (!window.pendingRoleSwitch) return;

    const { role, active_role } = window.pendingRoleSwitch;

    // Close the modal
    if (window.closeModal) {
        window.closeModal('add-role-modal');
    }

    // Use switchToRole to properly switch to the newly added role
    await ProfileSystem.switchToRole(active_role);
};
```

**Result**: When user clicks "Switch to Account", it now calls the `/api/switch-role` endpoint to properly update the backend and frontend state before navigating.

## User Flow After Fix

### Scenario 1: User Adds New Role and Stays
1. User has active role "Student"
2. User opens add-role-modal and adds "Tutor" role
3. OTP verified, role added successfully ✅
4. Success panel appears: "Switch to Tutor Account" or "Stay Here"
5. **User clicks "Stay Here"**
6. Modal closes
7. User remains on Student profile page ✅
8. Profile dropdown still shows "Student" ✅
9. Role switcher now shows both "Student" and "Tutor" options ✅

### Scenario 2: User Adds New Role and Switches
1. User has active role "Student"
2. User opens add-role-modal and adds "Parent" role
3. OTP verified, role added successfully ✅
4. Success panel appears: "Switch to Parent Account" or "Stay Here"
5. **User clicks "Switch to Parent Account"**
6. API call to `/api/switch-role` with role="parent" ✅
7. Backend updates `active_role` to "parent"
8. Frontend updates all state (localStorage, currentUser, userRole) ✅
9. User is redirected to Parent profile page ✅
10. Profile dropdown shows "Parent" ✅

### Scenario 3: User Reactivates Deactivated Role
1. User has active role "Student"
2. User previously deactivated "Tutor" role
3. User opens add-role-modal and selects "Tutor"
4. Message shows: "Role Already Exists (Deactivated)"
5. Button text changes to "Activate Role"
6. OTP verified, role reactivated successfully ✅
7. Success panel: "Role Reactivated Successfully!"
8. User clicks "Stay Here"
9. User remains on Student profile ✅
10. Tutor role is now available in role switcher (reactivated) ✅

## Files Changed

1. **astegni-backend/app.py modules/routes.py**
   - Lines 4232, 4242 (reactivation flow)
   - Lines 4331, 4343 (new role flow)

2. **js/root/profile-system.js**
   - Lines 1444-1493 (handleAddRoleSubmit - state updates)
   - Line 1498 (pendingRoleSwitch data)
   - Lines 2084-2104 (confirmSwitchToNewRole function)

3. **TEST_ADD_ROLE_FIX.md** (test documentation)

4. **ADD_ROLE_AUTO_SWITCH_FIX.md** (this file)

## Testing

See [TEST_ADD_ROLE_FIX.md](TEST_ADD_ROLE_FIX.md) for comprehensive test cases.

**Quick Test:**
1. Restart backend: `cd astegni-backend && python app.py`
2. Login with a role (e.g., Student)
3. Add a new role (e.g., Tutor)
4. After OTP verification, check browser console:
   - `localStorage.getItem('userRole')` should still be 'student'
5. Click "Stay Here" - you should remain on Student page
6. Open role switcher - both Student and Tutor should be listed
7. Try again and click "Switch to Tutor Account" - should switch successfully

## Benefits

✅ **User Control**: Users explicitly choose when to switch roles
✅ **Better UX**: "Stay Here" button now works as expected
✅ **No Surprises**: Current context is preserved unless user chooses to switch
✅ **Consistent Behavior**: Both add role and reactivate role work the same way
✅ **Proper State Management**: Role switch happens via proper API call with full state update

## Backward Compatibility

This fix is **fully backward compatible**:
- Existing JWT tokens remain valid
- No database schema changes required
- No breaking changes to API contracts
- Users with existing roles are unaffected
- Only changes the behavior of the add-role flow

## Migration Notes

**No migration required!** Just restart the backend and clear browser cache:

```bash
# Backend
cd astegni-backend
python app.py

# Frontend - users should clear cache or hard refresh
# Chrome/Edge: Ctrl+Shift+R
# Firefox: Ctrl+F5
```
