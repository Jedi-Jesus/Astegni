# Role Deactivation Dropdown Fix

## Issue
After deactivating a role using the manage-role-modal, the `dropdown-profile-link` was still pointing to the deactivated role's profile page instead of switching to the new active role or showing "No role yet, add role" when no roles remain.

## Root Cause
The frontend wasn't properly updating the profile dropdown after role deactivation/removal. While the backend correctly returned `new_current_role` (which could be `null` if no active roles remained), the frontend didn't refresh the dropdown-profile-link element or the role switcher UI.

## Solution

### 1. Fixed `role-manager.js` (Deactivate Role Function)
**File:** `js/common-modals/role-manager.js`

**Changes:**
- Added proper profile dropdown refresh after role deactivation
- Force update `dropdown-profile-link` to point to new active role
- Handle "no roles remaining" case by:
  - Setting `dropdown-profile-link.href = '#'`
  - Adding click handler to open "Add Role" modal
  - Reloading page to show updated state
  - NOT clearing access tokens (user stays logged in)

**Key Code:**
```javascript
// After successful deactivation with remaining roles
if (data.new_current_role) {
    // Update localStorage
    localStorage.setItem('userRole', data.new_current_role);

    // Update Profile System
    if (window.ProfileSystem) {
        await window.ProfileSystem.updateProfileDropdown();
        await window.ProfileSystem.setupRoleSwitcher();
    }

    // Force update dropdown-profile-link
    const dropdownProfileLink = document.getElementById('dropdown-profile-link');
    if (dropdownProfileLink) {
        dropdownProfileLink.href = profilePages[data.new_current_role];
    }

    // Redirect to new role's profile page
    window.location.href = profilePages[data.new_current_role];
} else {
    // No active roles left
    localStorage.removeItem('userRole');

    // Update dropdown-profile-link to open "Add Role" modal
    const dropdownProfileLink = document.getElementById('dropdown-profile-link');
    if (dropdownProfileLink) {
        dropdownProfileLink.href = '#';
        dropdownProfileLink.onclick = (e) => {
            e.preventDefault();
            if (window.openAddRoleModal) {
                window.openAddRoleModal();
            }
        };
    }

    // Reload page (user stays logged in)
    window.location.reload();
}
```

### 2. Fixed `role-manager.js` (Remove Role Function)
**File:** `js/common-modals/role-manager.js`

**Changes:**
- Applied same fix to permanent role removal function
- Consistent behavior with deactivation

### 3. Enhanced `profile-system.js` (Dropdown Update)
**File:** `js/root/profile-system.js`

**Changes in `updateProfileDropdown():`**
- **CRITICAL FIX at Line 582-583:** Moved role text update inside validity check (was setting role before checking if it's valid)
- Added check for invalid/null userRole
- When no active role exists:
  - Set `dropdown-profile-link.href = '#'`
  - Add click handler to open "Add Role" modal
  - Update `dropdown-user-role` text to "No role yet - Add a role"
- When active role exists:
  - Set `dropdown-user-role` text to formatted role name
  - Set `dropdown-profile-link` to correct profile page

**Key Code:**
```javascript
// CRITICAL FIX: Don't set role text here - will be set below based on validity check
// Line 582-583: Commented out early role text assignment

const dropdownProfileLink = document.getElementById('dropdown-profile-link');
if (dropdownProfileLink) {
    if (!userRole || userRole === 'undefined' || userRole === 'null') {
        // No active role
        dropdownProfileLink.href = '#';
        dropdownProfileLink.onclick = (e) => {
            e.preventDefault();
            closeProfileDropdown();
            if (typeof openAddRoleModal === 'function') {
                openAddRoleModal();
            }
        };

        // Update text to "No role yet - Add a role"
        if (elements.role) {
            elements.role.textContent = 'No role yet - Add a role';
        }
    } else {
        // User has valid active role
        if (elements.role) {
            elements.role.textContent = formatRoleName(userRole);
        }
        const profileUrl = getProfileUrl(userRole);
        dropdownProfileLink.href = profileUrl;
    }
}
```

### 4. Enhanced `profile-system.js` (Role Switcher)
**File:** `js/root/profile-system.js`

**Changes in `setupRoleSwitcher():`**
- Added case for when user has zero active roles
- Show "No roles yet" message in role switcher

**Key Code:**
```javascript
if (userFacingRoles.length === 0) {
    // No roles at all - show message
    const noRoleMessage = document.createElement('div');
    noRoleMessage.className = 'role-option disabled';
    noRoleMessage.innerHTML = `<span class="role-name">No roles yet</span>`;
    roleOptions.appendChild(noRoleMessage);
}
```

## User Experience Improvements

### Before Fix:
1. User deactivates their only role
2. Dropdown still shows old deactivated role
3. Clicking profile link goes to deactivated role's page
4. User gets redirected away (confusing)

### After Fix:
1. User deactivates their only role
2. Dropdown immediately updates to show "No role yet - Add a role"
3. Role switcher shows "No roles yet" message
4. Clicking profile dropdown opens "Add Role" modal
5. User stays logged in and can easily add a new role
6. Page refreshes to show updated state

### With Remaining Active Roles:
1. User deactivates one role (but has others)
2. System automatically switches to next active role
3. Dropdown updates to show new active role
4. User gets redirected to new role's profile page
5. Seamless transition

## Backend Support
The backend already properly supported this by returning:
- `new_current_role`: The new active role (or `null` if no active roles)
- `remaining_active_roles`: List of all remaining active roles

Both endpoints return this information:
- `POST /api/role/deactivate` (Lines 195-200 in role_management_endpoints.py)
- `DELETE /api/role/remove` (Lines 395-400 in role_management_endpoints.py)

## Testing
To test the fix:
1. Create a user with multiple roles (e.g., tutor + student)
2. Deactivate one role → Should switch to other role
3. Deactivate all roles → Should show "No role yet" and open "Add Role" modal when clicked
4. Add a new role → Should work seamlessly

## Files Modified
1. `js/common-modals/role-manager.js` - Lines 308-388 (deactivate), 485-565 (remove)
2. `js/root/profile-system.js` - Lines 588-615 (updateProfileDropdown), 683-691 (setupRoleSwitcher)

## Related Issues Fixed
- User no longer required to have a role in users table
- "No role yet" state is now fully supported
- Users without active roles can add roles without confusion
- Dropdown always shows correct, up-to-date information
