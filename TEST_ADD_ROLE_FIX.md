# Test Guide: Add Role Modal Fix

## Issue Fixed
When users added a role via the add-role-modal, the system automatically changed their current/active role in the background without their consent, even before they clicked "Switch to Account".

## What Was Changed

### Backend (`astegni-backend/app.py modules/routes.py`)
1. **Line 4232**: Removed automatic `current_user.active_role = new_role` when reactivating a role
2. **Line 4242**: JWT token now uses `current_user.active_role` (unchanged) instead of `new_role`
3. **Line 4331**: Removed automatic `current_user.active_role = new_role` when adding a new role
4. **Line 4343**: JWT token now uses `current_user.active_role` (unchanged) instead of `new_role`

### Frontend (`js/root/profile-system.js`)
1. **Lines 1440-1492**: Removed all code that updated `active_role`, `currentUser.role`, and `userRole` after successfully adding a role
2. Now only updates the JWT tokens and adds the new role to the `roles` list
3. Active role remains unchanged until user explicitly clicks "Switch to Account"

## Test Steps

### Prerequisites
1. Start backend: `cd astegni-backend && python app.py`
2. Start frontend: `python dev-server.py` (http://localhost:8081)
3. Have a user account with at least one active role (e.g., Student)

### Test Case 1: Add New Role Without Auto-Switch
1. Login as a user with an active role (e.g., Student)
2. Note your current role in the profile dropdown
3. Open Add Role modal (via profile dropdown or other means)
4. Select a new role (e.g., Tutor)
5. Enter password and verify OTP
6. **EXPECTED**: Success panel appears with "Switch to Tutor Account" button
7. **VERIFY**:
   - Open browser DevTools → Console
   - Check `localStorage.getItem('userRole')` - should still be 'student'
   - Check the profile dropdown - should still show "Student"
   - Your current page should still be the student profile page
8. Click "Stay Here" button
9. **VERIFY**:
   - Modal closes
   - You remain on the student profile page
   - Profile dropdown still shows "Student" as active role
   - Role switcher dropdown shows BOTH Student and Tutor options

### Test Case 2: Add New Role and Switch
1. Login as a user with an active role (e.g., Student)
2. Open Add Role modal
3. Select a new role (e.g., Parent)
4. Enter password and verify OTP
5. Success panel appears with "Switch to Parent Account" button
6. **VERIFY BEFORE CLICKING**:
   - `localStorage.getItem('userRole')` still returns 'student' (not 'parent')
   - Profile dropdown still shows "Student"
7. Click "Switch to Parent Account" button
8. **VERIFY**:
   - API call to `/api/switch-role` is made
   - You are redirected to the Parent profile page
   - Profile dropdown shows "Parent" as active role
   - `localStorage.getItem('userRole')` returns 'parent'

### Test Case 3: Reactivate Deactivated Role Without Auto-Switch
1. Login as a user with an active role (e.g., Student)
2. Deactivate a role you have (e.g., Tutor role)
3. Note your current role should still be Student (or null if you deactivated your only role)
4. Open Add Role modal
5. Select the deactivated role (Tutor)
6. Enter password and verify OTP
7. **EXPECTED**: Success panel shows "Role Reactivated Successfully!"
8. **VERIFY**:
   - Profile dropdown still shows "Student" (not Tutor)
   - `localStorage.getItem('userRole')` still returns 'student'
   - You are still on the student profile page
9. Click "Stay Here"
10. **VERIFY**: Tutor role is now available in role switcher but NOT active

### Test Case 4: User Without Active Role Adds First Role
1. Create a new user OR deactivate all roles for existing user
2. Login (should have no active role)
3. Open Add Role modal
4. Add a role (e.g., Student)
5. **VERIFY**:
   - Success panel appears
   - Click "Switch to Student Account"
   - You are redirected to student profile page
   - Profile dropdown shows "Student"

## Expected Behavior Summary

✅ **CORRECT**: Role is added to the user's roles list, but active_role remains unchanged until user clicks "Switch to Account"
✅ **CORRECT**: JWT tokens are updated with new role_ids, but still use the current active_role
✅ **CORRECT**: User can click "Stay Here" to keep current role active
✅ **CORRECT**: User can click "Switch to [Role] Account" to switch to the newly added role

❌ **INCORRECT (OLD BEHAVIOR)**: Role is added AND automatically becomes active_role in the background
❌ **INCORRECT (OLD BEHAVIOR)**: User's current role changes even if they click "Stay Here"

## Debugging Tips

If the fix doesn't work:

1. **Check Backend Logs**:
   - Look for errors in `python app.py` output
   - Ensure backend restarted after the changes

2. **Check Browser Console**:
   - Open DevTools → Console
   - Look for `[handleAddRoleSubmit]` logs
   - Verify active_role is NOT being updated

3. **Check localStorage**:
   ```javascript
   // In browser console
   console.log('userRole:', localStorage.getItem('userRole'));
   console.log('currentUser:', JSON.parse(localStorage.getItem('currentUser')));
   console.log('access_token:', localStorage.getItem('access_token'));
   ```

4. **Check API Response**:
   - Open DevTools → Network tab
   - Find the `/api/add-role` request
   - Check the response - `active_role` should be the CURRENT role, not the newly added one

## Success Criteria

- ✅ User's active role does NOT change when adding a new role
- ✅ User can choose to stay with current role or switch to new role
- ✅ Role switcher shows all available roles including the newly added one
- ✅ "Switch to Account" button correctly switches to the new role
- ✅ "Stay Here" button keeps current role and closes modal
