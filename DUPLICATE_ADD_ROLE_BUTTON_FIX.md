# Duplicate "Add New Role" Button Fix

## Issue Reported
When user has no role, the profile dropdown menu (`#role-options`) shows two "Add New Role" buttons.

## Investigation

### Current Logic in setupRoleSwitcher()

When `userFacingRoles.length === 0` (no roles):
1. Line 640: `roleOptions.innerHTML = '';` - Clear existing content
2. Line 687-695: Add "No roles yet" message
3. Line 735-746: Add "Add New Role" button
4. Line 748-750: Try to update `dropdown-user-role` with `formatRoleName(activeRole)`

### Potential Causes

#### Cause #1: formatRoleName(null) Bug
When `activeRole` is `null`, line 750 calls:
```javascript
dropdownUserRole.textContent = formatRoleName(activeRole);
```

The `formatRoleName()` function (line 1539):
```javascript
return roleNames[role] || role.charAt(0).toUpperCase() + role.slice(1);
```

When `role` is `null`, `role.charAt(0)` would throw an error (cannot read property 'charAt' of null).

**Fix Applied:** Added validation before calling formatRoleName:
```javascript
if (dropdownUserRole && activeRole && activeRole !== 'null' && activeRole !== 'undefined') {
    dropdownUserRole.textContent = formatRoleName(activeRole);
}
```

#### Cause #2: Duplicate Function Calls?
Searched for all calls to `setupRoleSwitcher()`:
- `updateProfileDropdown()` line 621
- `switchToRole()` line 1422
- Exported to window object

No obvious duplicate calls found.

#### Cause #3: Multiple Role Options Containers?
Checked HTML - there are two separate role switcher sections:
- Desktop: `#role-options` (inside `#profile-dropdown-menu`)
- Mobile: `#mobile-role-options` (inside mobile menu)

But these are separate containers, so they shouldn't both be visible simultaneously on desktop.

## Current State After Fix

When user has no role, the dropdown should show:
```
┌─────────────────────────────┐
│ Switch Role                 │
│ ───────────────────────────│
│ 📝 No roles yet             │
│ + Add New Role              │ ← Only ONE button
└─────────────────────────────┘
```

## Expected Behavior

### Scenario 1: No Roles
```
Profile Dropdown Header: "No role selected"
Role Options Section:
  - "No roles yet" (disabled, gray text)
  - "+ Add New Role" (clickable)
```

### Scenario 2: One Role
```
Profile Dropdown Header: "Tutor" (or whatever the role is)
Role Options Section:
  - "Tutor" with "CURRENT" badge (disabled)
  - "+ Add New Role" (clickable)
```

### Scenario 3: Multiple Roles
```
Profile Dropdown Header: "Tutor" (active role)
Role Options Section:
  - "Tutor" with "ACTIVE" badge (clickable to navigate)
  - "Student" (clickable to switch)
  - "+ Add New Role" (clickable)
```

## Files Modified

**js/root/profile-system.js** - Line 748-753
- Added validation before calling formatRoleName()
- Only update dropdown-user-role text if activeRole exists and is valid
- Prevents overwriting "No role selected" text when there's no role

## Testing Needed

Please test:
1. Deactivate your last role
2. Check profile dropdown - how many "Add New Role" buttons do you see?
3. If you see 2, please describe where each one appears:
   - Is one in the header area?
   - Are both in the role options list?
   - Are you on desktop or mobile?

## Additional Notes

If the issue persists, it might be:
1. CSS making something appear duplicated
2. Browser caching old JavaScript
3. Another script adding the button

**To rule out caching:** Hard refresh (Ctrl+Shift+R) or clear browser cache
