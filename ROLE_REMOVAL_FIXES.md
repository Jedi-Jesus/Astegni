# Role Removal Bug Fixes

## Issues Fixed

### Issue A: 'Send OTP' Button Stuck on 'Sending...' ✅ FIXED
**File:** [js/common-modals/role-manager.js](js/common-modals/role-manager.js:226)

**Bug:** After OTP was sent successfully, the button text remained "Sending..." instead of changing back to "Send OTP".

**Root Cause:** The success handler (line 219) didn't update the button text. The timer countdown only updated the timer element, not the button.

**Fix Applied:**
```javascript
// Line 226 - Added immediate button text update
if (response.ok) {
    // Show success message
    if (window.showToast) {
        window.showToast(`OTP sent to your ${data.destination}`, 'success');
    }

    // Update button text immediately  ← NEW
    sendBtn.textContent = 'Send OTP';

    // Start countdown timer...
```

**Result:** Button now shows "Send OTP" immediately after successful send, with timer showing "(60s)" countdown below it.

---

### Issue B: Auto-Switching to Another Role Instead of Index.html ✅ FIXED

#### Backend Fix
**File:** [astegni-backend/role_management_endpoints.py](astegni-backend/role_management_endpoints.py:288-293)

**Bug:** When removing a role, backend auto-assigned the first remaining active role instead of setting `active_role = None`.

**Old Behavior (lines 288-326):**
```python
# If the removed role was the current role, switch to another ACTIVE role
new_active_role = user.active_role
if user.active_role == request.role:
    # Get all ACTIVE roles (excluding the one being removed)
    remaining_active_roles = []
    # ... check each role's is_active status ...

    if remaining_active_roles:
        user.active_role = remaining_active_roles[0]  # AUTO-ASSIGN!
        new_active_role = remaining_active_roles[0]
    else:
        user.active_role = None
        new_active_role = None
```

**New Behavior (lines 288-293):**
```python
# If the removed role was the current role, set to None (don't auto-assign)
# Let the user choose their next role from the frontend
new_active_role = user.active_role
if user.active_role == request.role:
    user.active_role = None
    new_active_role = None
```

**Result:** Backend now ALWAYS returns `new_active_role: null` when removing the active role, matching deactivation behavior.

---

#### Frontend Fix
**File:** [js/common-modals/role-manager.js](js/common-modals/role-manager.js:449-502)

**Bug:** Frontend had two code paths:
1. If `data.new_current_role` exists → auto-switch and redirect to that profile page
2. If no roles left → go to index.html

Since backend now always returns `null`, we simplified to one path.

**Old Behavior (lines 454-534):**
```javascript
if (data.new_current_role) {
    // Auto-switch to new role
    user.active_role = data.new_current_role;
    localStorage.setItem('userRole', data.new_current_role);
    // ... update dropdown ...
    window.location.href = profilePages[data.new_current_role];
} else {
    // No roles left
    user.active_role = null;
    window.location.reload();
}
```

**New Behavior (lines 449-502):**
```javascript
// Success - update localStorage and redirect to index.html (just like deactivation)
const user = JSON.parse(localStorage.getItem('user') || '{}');
const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

// Clear current role in localStorage (backend always returns null now)
localStorage.removeItem('userRole');
user.current_role = null;
user.active_role = null;
currentUser.role = null;
currentUser.active_role = null;
localStorage.setItem('user', JSON.stringify(user));
localStorage.setItem('currentUser', JSON.stringify(currentUser));

// CRITICAL: Update dropdown elements immediately BEFORE redirect
const dropdownProfileLink = document.getElementById('dropdown-profile-link');
const dropdownUserRole = document.getElementById('dropdown-user-role');

if (dropdownProfileLink) {
    dropdownProfileLink.href = '#';
    dropdownProfileLink.onclick = (e) => {
        e.preventDefault();
        if (window.openAddRoleModal) {
            window.openAddRoleModal();
        }
    };
}

if (dropdownUserRole) {
    dropdownUserRole.textContent = 'No role selected';
}

// Show success message with remaining roles count
const remainingCount = data.remaining_active_roles?.length || 0;
let message = `Your ${this.currentRole} role has been permanently removed and all data deleted.`;

if (remainingCount > 0) {
    message += ` You have ${remainingCount} other active role${remainingCount > 1 ? 's' : ''} available.`;
} else {
    message += ` You have no active roles remaining.`;
}

message += ` You can select a role or add a new one from the homepage.`;

alert(message);

// Always redirect to index.html
window.location.href = '/index.html';
```

**Result:** Role removal now behaves exactly like deactivation:
1. Clears `active_role` in database and localStorage
2. Updates dropdown to "No role selected"
3. Redirects to index.html
4. User can choose next role from dropdown or add new role

---

## Complete Flow After Fixes

### User Removes Role:

1. **User Action:**
   - Click "Remove Role" → Click "Send OTP"
   - ✅ Button shows "Send OTP" with "(60s)" timer
   - Enter OTP + password + check confirmation
   - Click "Remove Role" → Confirm final warning

2. **Backend Processing:**
   - Verifies password and OTP
   - Deletes role profile and all associated data
   - Removes role from `user.roles` array
   - Sets `user.active_role = None` ✅ NOW CORRECT
   - Returns `{deleted_role, new_active_role: null, remaining_active_roles: [...]}`

3. **Frontend Response:**
   - Clears localStorage: `userRole` removed, `user.active_role = null`
   - Updates dropdown: "No role selected", onclick opens Add Role modal
   - Shows alert with remaining roles count
   - Redirects to `/index.html`

4. **Index.html Loads:**
   - User is logged in with no active role
   - Dropdown shows "No role selected"
   - Clicking dropdown opens "Add Role" modal
   - User can select from remaining active roles or add new role

---

## Key Differences: Remove vs Deactivate

| Action | Deactivate | Remove |
|--------|-----------|--------|
| **Data Preserved** | ✅ Yes | ❌ No - Permanently deleted |
| **Can Reactivate** | ✅ Yes - Add role again | ❌ No - Must create new |
| **Security** | Password only | Password + OTP |
| **Sets active_role to null** | ✅ Yes | ✅ Yes |
| **Redirects to index.html** | ✅ Yes | ✅ Yes |
| **Dropdown state** | "No role selected" | "No role selected" |
| **Database** | `is_active = False` | Profile deleted, role removed from array |

---

## Testing Steps

### Test 1: Send OTP Button
```bash
1. Click "Remove Role"
2. Click "Send OTP"
```

**Expected:**
- ✅ Button shows "Sending..." briefly
- ✅ Button changes to "Send OTP" when OTP sent
- ✅ Timer shows "(60s)" and counts down
- ✅ Button disabled during countdown
- ✅ After 60s, button shows "Resend OTP" and is enabled

---

### Test 2: Remove Role (Has Other Active Roles)
```bash
1. Login with multiple roles (e.g., tutor, student, parent)
2. Click dropdown → "Manage Role"
3. Click "Remove Role"
4. Send OTP → Enter OTP + password
5. Check confirmation → Click "Remove Role" → Confirm
```

**Expected:**
- ✅ Alert: "Your parent role has been permanently removed and all data deleted. You have 2 other active roles available. You can select a role or add a new one from the homepage."
- ✅ Redirected to `/index.html`
- ✅ Dropdown shows "No role selected"
- ✅ Clicking dropdown opens Add Role modal with remaining roles
- ✅ Database: `active_role = NULL`, role removed from array, profile deleted

---

### Test 3: Remove Last Active Role
```bash
1. Login with only one active role
2. Remove that role
```

**Expected:**
- ✅ Alert: "Your student role has been permanently removed and all data deleted. You have no active roles remaining. You can select a role or add a new one from the homepage."
- ✅ Redirected to `/index.html`
- ✅ Dropdown shows "No role selected"
- ✅ Must add new role to continue

---

## Files Modified

### Backend
1. **[astegni-backend/role_management_endpoints.py](astegni-backend/role_management_endpoints.py)**
   - Lines 288-293: Removed auto-assignment logic, always set `active_role = None`

### Frontend
2. **[js/common-modals/role-manager.js](js/common-modals/role-manager.js)**
   - Line 226: Fixed OTP button text update
   - Lines 449-502: Simplified removal flow to always redirect to index.html

---

## Summary

✅ **OTP button fixed** - Shows correct text after sending
✅ **No auto-switching** - Backend sets `active_role = None`
✅ **Consistent behavior** - Remove now matches deactivate flow
✅ **Always goes to index** - User chooses next role from homepage
✅ **Proper cleanup** - Dropdown and localStorage updated correctly

Both deactivation and removal now follow the same pattern: clear active_role, redirect to index.html, let user choose their next action.
