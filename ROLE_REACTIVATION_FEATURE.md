# Role Reactivation Feature

## Overview
Implemented a feature that allows users to reactivate deactivated roles through the "Add Role" modal. When a user tries to add a role they previously had but deactivated, the system now detects this and shows an "Activate Role" option with OTP verification.

## User Flow

### Deactivating a Role
1. User goes to Settings > Danger Zone
2. Clicks "Manage Roles"
3. Selects "Deactivate Role"
4. Enters password
5. Role is deactivated (`is_active = False`)
6. Role remains in user's roles list but is hidden

### Reactivating a Role
1. User opens profile dropdown
2. Clicks "+ Add New Role"
3. Selects a role they previously deactivated
4. System shows yellow warning message: "Role Already Exists (Deactivated)"
5. Button changes to "Activate Role"
6. User enters password
7. OTP is sent to their email/phone
8. User enters OTP
9. Button shows "Activate Role" on step 2
10. Role is reactivated (`is_active = True`)
11. Success message: "Tutor role reactivated successfully!"
12. User prompted: "Switch to your reactivated Tutor role now?"

## Files Modified

### Backend

1. **`astegni-backend/app.py modules/routes.py`**

   **New Endpoint:**
   ```python
   @router.get("/api/check-role-status")
   def check_role_status(role: str, current_user: User, db: Session)
   ```
   - Returns: `has_role`, `is_active`, `is_deactivated`
   - Used by frontend to check if role is deactivated before showing UI

   **Modified Endpoint: `/api/add-role`**
   - Lines 3954-3975: Check if role exists and is deactivated before rejecting
   - Lines 3997-4022: Reactivation logic after OTP verification
   - If role is deactivated, set `is_active = True` and return immediately
   - Response includes `role_reactivated: true` flag

### Frontend

1. **`modals/common-modals/add-role-modal.html`**
   - Added deactivated role warning message (lines 43-56)
   - Added IDs to submit button and button text for dynamic updates

2. **`js/root/profile-system.js`**
   - `openAddRoleModalInternal()`: Reset isReactivation flag and setup role listener
   - `setupRoleSelectionListener()`: NEW function (lines 952-996)
     - Listens for role selection changes
     - Calls `/api/check-role-status` endpoint
     - Shows/hides deactivated message
     - Updates button text to "Activate Role" or "Verify & Continue"
   - `handleAddRoleSubmit()`: Updated button text for step 2 based on isReactivation flag
   - Success handler: Shows different messages for reactivation vs new role

## API Endpoints

### GET `/api/my-roles`
**Important Change:** Now filters out deactivated roles from the response.

**Request:**
```
Headers:
  Authorization: Bearer {token}
```

**Response (with deactivated tutor role):**
```json
{
  "user_roles": ["student", "parent"],  // tutor NOT included (deactivated)
  "active_role": "student"
}
```

**Response (all roles active):**
```json
{
  "user_roles": ["student", "tutor", "parent"],
  "active_role": "tutor"
}
```

### GET `/api/check-role-status?role=tutor`
**Request:**
```
Headers:
  Authorization: Bearer {token}
```

**Response:**
```json
{
  "has_role": true,
  "is_active": false,
  "is_deactivated": true
}
```

### POST `/api/add-role`
**Request:**
```json
{
  "otp": "123456",
  "new_role": "tutor",
  "password": "user_password"
}
```

**Response (Reactivation):**
```json
{
  "message": "Tutor role reactivated successfully",
  "user_roles": ["student", "tutor", "parent"],
  "active_role": "student",
  "role_reactivated": true
}
```

**Response (New Role):**
```json
{
  "message": "Tutor role added successfully",
  "user_roles": ["student", "tutor"],
  "active_role": "student",
  "role_reactivated": false
}
```

## Technical Details

### Backend Logic Flow

1. User submits add-role form with selected role
2. Backend checks if role exists in `current_user.roles`
3. If exists, queries the role profile table (TutorProfile, StudentProfile, etc.)
4. Checks `is_active` field on profile
5. If `is_active = False`:
   - Allow password/OTP verification to proceed
   - After OTP verified, set `is_active = True`
   - Return success with `role_reactivated: true`
6. If `is_active = True` or role doesn't exist:
   - Proceed with normal add-role flow

### Frontend Logic Flow

1. When modal opens, attach listener to role dropdown
2. On role selection change:
   - Call `/api/check-role-status?role={selectedRole}`
   - If `is_deactivated = true`:
     - Show yellow warning message
     - Change button text to "Activate Role"
     - Set `addRoleData.isReactivation = true`
   - Otherwise:
     - Hide warning message
     - Set button text to "Verify & Continue"
     - Set `addRoleData.isReactivation = false`
3. On form submission:
   - Step 1 button stays as "Activate Role" or "Verify & Continue"
   - Step 2 button shows "Activate Role" or "Add Role" based on flag
4. On success:
   - Show "reactivated" or "added" message
   - Ask "reactivated" or "new" in switch prompt

### Data Structure

**addRoleData Object:**
```javascript
{
  role: 'tutor',           // Selected role
  password: 'password123', // User's password
  isReactivation: false    // NEW: Flag for UI updates
}
```

## UI States

### State 1: Normal Add Role
- Dropdown shows available roles
- No warning message
- Button: "Verify & Continue" → "Add Role"
- Success: "Tutor role added successfully!"

### State 2: Reactivate Role
- Dropdown shows available roles
- Yellow warning message visible
- Button: "Activate Role" → "Activate Role"
- Success: "Tutor role reactivated successfully!"

## Benefits

1. **User-Friendly**: Users don't need to know about "deactivated" vs "removed" - the system handles it automatically
2. **Data Preservation**: Reactivating keeps all old data intact
3. **Security**: Still requires password + OTP verification
4. **Clear Communication**: UI clearly shows when role is being reactivated vs added new
5. **Consistent Flow**: Uses existing add-role modal and OTP system
6. **Clean UI**: Deactivated roles don't appear in role switcher dropdown - only active roles are shown

## Testing

### Test Reactivation Flow
1. Log in as user with tutor role
2. Go to Settings > Manage Roles
3. Deactivate tutor role
4. **Verify tutor role disappears from profile dropdown**
5. **Verify tutor role disappears from role switcher**
6. Open profile dropdown
7. Click "+ Add New Role"
8. Select "Tutor" from dropdown
9. Verify yellow message appears
10. Verify button says "Activate Role"
11. Enter password and submit
12. Verify OTP is sent
13. Enter OTP
14. Verify success message says "reactivated"
15. **Verify tutor role reappears in profile dropdown**
16. Verify role is active again

### Test Normal Add Role Flow
1. Select a role you never had
2. Verify no warning message
3. Verify button says "Verify & Continue"
4. Complete flow
5. Verify success message says "added"

## Version
- **Created**: January 23, 2026
- **Version**: 1.0.0
- **Compatible with**: Astegni Platform v2.1.0
