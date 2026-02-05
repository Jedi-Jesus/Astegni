# Role Management - Different Security Levels

## Summary

Implemented tiered security for role management:
- **Deactivation** (Reversible): Password only
- **Removal** (Permanent): Password + OTP

## Rationale

### Why Password-Only for Deactivation?
- Deactivation is **reversible** - users can reactivate by adding the role again
- Data is **preserved** - nothing is deleted, just hidden
- Lower friction encourages users to deactivate instead of permanently deleting
- Faster process for temporary role management

### Why Password + OTP for Removal?
- Removal is **permanent and irreversible**
- All data is **permanently deleted** (profile, credentials, connections, reviews)
- Extra security layer prevents accidental permanent deletion
- Requires user to have access to their email/phone for OTP

## Changes Made

### Backend Changes

#### [astegni-backend/role_management_endpoints.py](astegni-backend/role_management_endpoints.py)

**Created Two Separate Request Models:**
```python
# For deactivation - password only
class RoleActionRequest(BaseModel):
    role: Literal['student', 'tutor', 'parent', 'advertiser', 'user']
    password: str

# For removal - password + OTP
class RoleRemovalRequest(BaseModel):
    role: Literal['student', 'tutor', 'parent', 'advertiser', 'user']
    password: str
    otp: str  # OTP required for permanent deletion
```

**Deactivation Endpoint (`/api/role/deactivate`) - Password Only:**
```python
async def deactivate_role(
    request: RoleActionRequest,  # No OTP required
    ...
):
    # Verify password
    if not bcrypt.checkpw(request.password.encode('utf-8'), user.password_hash.encode('utf-8')):
        raise HTTPException(...)

    # Deactivate role (set is_active = False)
    role_model.is_active = False
```

**Removal Endpoint (`/api/role/remove`) - Password + OTP:**
```python
async def remove_role(
    request: RoleRemovalRequest,  # OTP required
    ...
):
    # Verify password
    if not bcrypt.checkpw(request.password.encode('utf-8'), user.password_hash.encode('utf-8')):
        raise HTTPException(...)

    # Verify OTP
    otp_record = db.query(OTP).filter(
        OTP.user_id == current_user.id,
        OTP.otp_code == request.otp,
        OTP.purpose == "role_remove",
        OTP.is_used == False,
        OTP.expires_at > datetime.utcnow()
    ).first()

    if not otp_record:
        raise HTTPException(...)

    # Permanently delete role and all data
    db.delete(role_model)
```

### Frontend Changes

#### [js/common-modals/role-manager.js](js/common-modals/role-manager.js)

**Deactivation - No OTP Validation:**
```javascript
confirmDeactivate: async function() {
    const password = document.getElementById('deactivate-password').value;
    // No OTP field

    // Only validate password
    if (!password) {
        errorEl.textContent = 'Please enter your password';
        return;
    }

    // Send only password
    body: JSON.stringify({
        role: this.currentRole,
        password: password
    })
}
```

**Removal - OTP Required:**
```javascript
confirmRemove: async function() {
    const password = document.getElementById('remove-password').value;
    const otp = document.getElementById('remove-otp').value;

    // Validate password
    if (!password) {
        errorEl.textContent = 'Please enter your password';
        return;
    }

    // Validate OTP
    if (!otp || otp.length !== 6) {
        errorEl.textContent = 'Please enter a valid 6-digit OTP';
        return;
    }

    // Send password + OTP
    body: JSON.stringify({
        role: this.currentRole,
        password: password,
        otp: otp
    })
}
```

#### [modals/common-modals/manage-role-modal.html](modals/common-modals/manage-role-modal.html)

**Deactivate Panel - Password Only:**
```html
<!-- Password Confirmation -->
<div class="mb-4">
    <label>Confirm Your Password</label>
    <input type="password" id="deactivate-password" ...>
</div>

<!-- NO OTP FIELD -->

<button onclick="RoleManager.confirmDeactivate()">
    Deactivate Role
</button>
```

**Remove Panel - Password + OTP:**
```html
<!-- Password Confirmation -->
<div class="mb-4">
    <label>Confirm Your Password</label>
    <input type="password" id="remove-password" ...>
</div>

<!-- OTP Input -->
<div class="mb-4">
    <label>Enter OTP Code</label>
    <input type="text" id="remove-otp" maxlength="6" ...>
    <button onclick="RoleManager.sendOTP('remove')">
        Send OTP
    </button>
    <span id="remove-otp-timer"></span>
</div>

<button onclick="RoleManager.confirmRemove()">
    Remove Role
</button>
```

**Updated Warning Message:**
```html
<p class="text-sm text-yellow-700">
    Deactivation requires password only.
    Permanent removal requires password + OTP for extra security.
</p>
```

## User Flows

### Role Deactivation (Reversible)
1. User opens "Manage Role" modal
2. User selects "Deactivate Role"
3. User enters **password only**
4. User clicks "Deactivate Role"
5. System verifies password
6. Role is deactivated (hidden but data preserved)
7. User can reactivate anytime by adding the role again

### Role Removal (Permanent)
1. User opens "Manage Role" modal
2. User selects "Remove Role (Permanent)"
3. User checks confirmation checkbox
4. User enters **password**
5. User clicks "Send OTP"
6. System sends OTP to email/phone
7. User enters **6-digit OTP**
8. User clicks "Remove Role"
9. Final confirmation dialog appears
10. System verifies password AND OTP
11. Role and all data is permanently deleted
12. Cannot be recovered

## Security Comparison

| Feature | Deactivation | Removal |
|---------|-------------|---------|
| **Reversible?** | ✅ Yes | ❌ No |
| **Data Preserved?** | ✅ Yes | ❌ Deleted |
| **Password Required?** | ✅ Yes | ✅ Yes |
| **OTP Required?** | ❌ No | ✅ Yes |
| **Confirmation Dialog?** | ❌ No | ✅ Yes |
| **Can Reactivate?** | ✅ Yes | ❌ No |
| **Speed** | Fast | Slower |
| **Security Level** | Medium | High |

## Benefits

1. **User-Friendly Deactivation**: Quick and easy for temporary role management
2. **Secure Deletion**: Extra protection prevents accidental permanent data loss
3. **Clear Distinction**: Different security levels match the severity of actions
4. **Reduced Regret**: Users less likely to permanently delete if deactivation is easy
5. **Data Safety**: Important data protected by multi-factor verification

## Testing

### Test Deactivation (Password Only):
1. Login to http://localhost:8081
2. Go to profile → Settings → Manage Role
3. Select "Deactivate Role"
4. Enter password (no OTP needed)
5. Click "Deactivate Role"
6. Verify dropdown shows new active role

### Test Removal (Password + OTP):
1. Login to http://localhost:8081
2. Go to profile → Settings → Manage Role
3. Select "Remove Role (Permanent)"
4. Check confirmation box
5. Enter password
6. Click "Send OTP"
7. Check email/phone for OTP
8. Enter 6-digit OTP
9. Click "Remove Role"
10. Confirm in dialog
11. Verify role is permanently removed

## Files Changed

1. `astegni-backend/role_management_endpoints.py` - Added `RoleRemovalRequest`, OTP verification for removal only
2. `js/common-modals/role-manager.js` - OTP validation only for removal
3. `modals/common-modals/manage-role-modal.html` - OTP input only in removal panel

## Notes

- Backend must be restarted: `cd astegni-backend && python app.py`
- Frontend requires hard refresh (Ctrl+Shift+R)
- Deactivation is recommended over removal for most cases
- Removal should be used only when user wants to permanently leave a role
