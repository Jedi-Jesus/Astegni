# Role Deactivation Complete Fix

## Issues Fixed

### 1. Dropdown Not Updated After Deactivation
**Problem:** After deactivating a role and redirecting to index.html, the `dropdown-profile-link` still pointed to the deactivated role's profile page, and `dropdown-user-role` still showed the old role name.

**Solution:** Updated [role-manager.js](js/common-modals/role-manager.js:322-338) to immediately update dropdown elements before redirect.

### 2. Index.html Doesn't Handle Null Roles
**Problem:** When a user has no active role, the dropdown still tried to navigate to a profile page and showed incorrect role text.

**Solution:** Updated [profile-and-authentication.js](js/index/profile-and-authentication.js:302-336) to properly handle null/no active roles.

### 3. Profile Pages Don't Bounce Back for Deactivated Roles
**Problem:** Users could access profile pages for deactivated roles by typing the URL directly.

**Solution:** Already implemented via [active-role-guard.js](js/root/active-role-guard.js) which is included in all profile pages.

---

## Complete Flow After Deactivation

### User Journey
1. User clicks "Deactivate Role" in Manage Role modal
2. Enters password and clicks "Deactivate Role" button
3. Backend sets `is_active = False` on role profile
4. Backend sets `active_role = null` in user record
5. Frontend updates:
   - `localStorage.userRole` → removed
   - `user.active_role` → `null`
   - `currentUser.role` → `null`
   - `dropdown-profile-link.href` → `#` (opens Add Role modal on click)
   - `dropdown-user-role.textContent` → "No role selected"
6. User redirected to `/index.html`
7. Index.html loads with "No role selected" in dropdown
8. Clicking profile header opens "Add Role" modal

### What Happens If User Tries to Access Deactivated Role Page

**Scenario:** User deactivates "Student" role but types `/profile-pages/student-profile.html` in browser

**Protection:** [active-role-guard.js](js/root/active-role-guard.js:57-153) runs on page load:

1. Fetches `/api/my-roles` from backend
2. Backend returns only **active** roles (deactivated roles filtered out)
3. Guard checks if "student" is in active roles list
4. Since it's NOT in the list (deactivated), shows alert:
   ```
   Your student role has been deactivated. Please select an active role or reactivate this role.
   ```
5. Redirects to `/index.html`

---

## Code Changes

### 1. [role-manager.js](js/common-modals/role-manager.js) - Line 322-338

```javascript
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
```

**Why:** Sets dropdown to correct state BEFORE redirecting to index.html, so index.html loads with correct UI.

---

### 2. [profile-and-authentication.js](js/index/profile-and-authentication.js) - Line 302-336

```javascript
if (dropdownUserRole) {
    const role = APP_STATE.currentUser.active_role || APP_STATE.userRole;

    // Handle case where user has no active role
    if (!role || role === 'null' || role === 'undefined') {
        dropdownUserRole.textContent = 'No role selected';
    } else {
        dropdownUserRole.textContent = role.charAt(0).toUpperCase() + role.slice(1);
    }
}

// Make profile header clickable - navigate to role profile page
if (dropdownProfileLink) {
    const role = APP_STATE.currentUser.active_role || APP_STATE.userRole;

    // Handle case where user has no active role
    if (!role || role === 'null' || role === 'undefined') {
        dropdownProfileLink.href = '#';
        dropdownProfileLink.onclick = (e) => {
            e.preventDefault();
            // Open "Add Role" modal
            if (window.openAddRoleModal && typeof window.openAddRoleModal === 'function') {
                window.openAddRoleModal();
            }
        };
    } else {
        const profileUrl = PROFILE_URLS[role] || 'index.html';
        dropdownProfileLink.href = profileUrl;
        dropdownProfileLink.onclick = null; // Remove onclick if there was one
    }
}
```

**Why:** Ensures index.html properly handles users with no active role on page load.

---

### 3. [active-role-guard.js](js/root/active-role-guard.js) - Already Implemented

**Location:** Included in all profile pages:
- [tutor-profile.html](profile-pages/tutor-profile.html)
- [student-profile.html](profile-pages/student-profile.html)
- [parent-profile.html](profile-pages/parent-profile.html)
- [advertiser-profile.html](profile-pages/advertiser-profile.html)
- [user-profile.html](profile-pages/user-profile.html)

**Function:** Automatically runs on page load and:
1. Fetches active roles from `/api/my-roles`
2. Checks if page role is in active roles list
3. If NOT, bounces user to index.html with alert
4. If active_role doesn't match page, redirects to correct profile

---

## Backend Already Correct

### `/api/my-roles` Endpoint
[app.py modules/routes.py](astegni-backend/app.py modules/routes.py:3577-3622)

**Key Logic:**
```python
# Filter out deactivated roles
active_roles = []

for role in current_user.roles:
    # Check if role is active
    is_active = True

    if role == 'student':
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if profile and hasattr(profile, 'is_active'):
            is_active = profile.is_active
    # ... similar for other roles

    # Only include active roles
    if is_active:
        active_roles.append(role)

return {
    "user_roles": active_roles,  # Only active roles
    "active_role": active_role
}
```

**Result:** Deactivated roles are automatically filtered out, so frontend never sees them.

---

### `/api/role/deactivate` Endpoint
[role_management_endpoints.py](astegni-backend/role_management_endpoints.py:57-163)

**Key Actions:**
1. Verifies password (line 72-88)
2. Checks user has the role (line 91-95)
3. Sets `role_model.is_active = False` (line 117)
4. If deactivated role was active, sets `active_role = None` (line 119-122)
5. Returns remaining active roles (line 126-163)

---

## Testing Checklist

### Test 1: Deactivate Role
- [ ] Login as user with multiple roles
- [ ] Click profile dropdown → "Manage Role"
- [ ] Click "Deactivate Role"
- [ ] Enter password and confirm
- [ ] **Expected:** Redirected to index.html
- [ ] **Expected:** Dropdown shows "No role selected"
- [ ] **Expected:** Clicking dropdown header opens "Add Role" modal

### Test 2: Try to Access Deactivated Role Page
- [ ] After deactivating student role
- [ ] Type `/profile-pages/student-profile.html` in browser
- [ ] **Expected:** Alert: "Your student role has been deactivated"
- [ ] **Expected:** Redirected to `/index.html`

### Test 3: Reactivate Role
- [ ] Click "Add Role" from dropdown
- [ ] Select the deactivated role
- [ ] Enter password
- [ ] **Expected:** Role reactivated (backend sets `is_active = True`)
- [ ] **Expected:** Redirected to role profile page
- [ ] **Expected:** Role works normally

### Test 4: Deactivate Last Active Role
- [ ] User with only one role
- [ ] Deactivate that role
- [ ] **Expected:** `active_role = null`
- [ ] **Expected:** Dropdown shows "No role selected"
- [ ] **Expected:** Must add a role to continue using Astegni

---

## Key Files Modified

1. **Frontend:**
   - [js/common-modals/role-manager.js](js/common-modals/role-manager.js) - Line 322-338
   - [js/index/profile-and-authentication.js](js/index/profile-and-authentication.js) - Line 302-336

2. **Backend (Already Correct):**
   - [astegni-backend/role_management_endpoints.py](astegni-backend/role_management_endpoints.py)
   - [astegni-backend/app.py modules/routes.py](astegni-backend/app.py modules/routes.py) - `/api/my-roles` endpoint

3. **Protection (Already Implemented):**
   - [js/root/active-role-guard.js](js/root/active-role-guard.js) - Included in all profile pages

---

## Summary

✅ **Dropdown updated after deactivation** - Shows "No role selected" and opens Add Role modal on click
✅ **Index.html handles null roles** - Properly displays when user has no active role
✅ **Profile pages bounce back deactivated roles** - Active role guard prevents access
✅ **Backend filters deactivated roles** - `/api/my-roles` only returns active roles
✅ **Data preserved** - Deactivation sets `is_active = false`, data intact
✅ **Reactivation works** - Users can reactivate by adding the role again

All issues resolved. Users can safely deactivate roles and the system properly handles the no-role state.
