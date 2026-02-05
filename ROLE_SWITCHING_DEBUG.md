# Role Switching Not Working - Debug Guide

## Quick Diagnostics

Please check the following to help identify the issue:

### 1. How Many Roles Do You Have?
Open the profile dropdown and check the "Switch Role" section:
- Do you see any roles listed?
- How many roles do you see?
- What are the role names shown?

### 2. What Happens When You Click?
When you click on a role to switch:
- Does anything happen at all? (No feedback, no error)
- Do you see a toast message?
- Does the page start loading then stop?
- Do you get an error in the browser console?

### 3. Check Browser Console
1. Press F12 to open Developer Tools
2. Go to the "Console" tab
3. Try to switch roles
4. Do you see any red error messages?
5. If yes, please copy the error message

### 4. Check Network Tab
1. Press F12 to open Developer Tools
2. Go to the "Network" tab
3. Try to switch roles
4. Look for a request to `/api/switch-role`
5. Click on it and check:
   - Status code (should be 200)
   - Response body
   - Any error messages

## Common Issues & Solutions

### Issue 1: Only One Role
**Symptom:** You have only 1 role, and clicking it does nothing

**Expected Behavior:** When you have only 1 role, it shows with a "CURRENT" badge and is disabled (not clickable)

**Why:** You can't "switch" to the role you're already using

**Solution:** This is normal. Add another role to enable role switching.

---

### Issue 2: Multiple Roles, No Response on Click
**Symptom:** You have 2+ roles, clicking does nothing

**Possible Causes:**
1. JavaScript error preventing click handler from executing
2. `switchToRole` function not properly loaded
3. Profile dropdown closing before the click registers

**Debug Steps:**
1. Open browser console
2. Type: `typeof window.switchToRole`
3. Should return `"function"`
4. If it returns `"undefined"`, the function isn't loaded

**Solution:** Refresh the page with Ctrl+Shift+R (hard refresh)

---

### Issue 3: API Error
**Symptom:** Toast message says "Failed to switch role" or similar error

**Possible Causes:**
1. Backend API endpoint `/api/switch-role` not working
2. Invalid token (authentication issue)
3. Role doesn't exist in database

**Debug Steps:**
1. Check Network tab for the API request
2. Look at the response body
3. Check if status is 401 (authentication) or 400/500 (server error)

**Solution:**
- If 401: Logout and login again
- If 400/500: Check backend logs

---

### Issue 4: Click Closes Dropdown
**Symptom:** Clicking a role just closes the dropdown without switching

**Possible Cause:** Click event on the dropdown overlay instead of the role option

**Solution:** Make sure you're clicking directly on the role name/option, not the background

---

## Code Analysis

### Current Implementation

**File:** `js/root/profile-system.js`

**Single Role (line 696-704):**
```javascript
if (userFacingRoles.length === 1) {
    // Single role - shows as disabled, no onclick
    const currentRoleOption = document.createElement('div');
    currentRoleOption.className = 'role-option active disabled';
    // NO onclick handler - can't click
}
```

**Multiple Roles (line 705-732):**
```javascript
else if (userFacingRoles.length > 1) {
    userFacingRoles.forEach(role => {
        const roleOption = document.createElement('div');
        roleOption.className = 'role-option';

        roleOption.onclick = () => {
            if (role === activeRole) {
                // Clicking active role navigates to profile page
                window.location.href = profileUrl;
            } else {
                // Clicking inactive role switches to it
                switchToRole(role);
            }
        };
    });
}
```

**switchToRole Function (line 1455-1527):**
```javascript
async function switchToRole(newRole) {
    // 1. Check if already on this role
    if (newRole === userRole) return;

    // 2. Close dropdown
    closeProfileDropdown();

    // 3. Show toast: "Switching to X role..."
    window.showToast(`Switching to ${formatRoleName(newRole)} role...`, 'info');

    // 4. Call API
    const response = await fetch(`${API_BASE_URL}/api/switch-role`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getStoredAuthToken()}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
    });

    // 5. Update localStorage
    // 6. Show success toast
    // 7. Redirect to new profile page
}
```

## What Should Happen (Normal Flow)

1. Click on a role that's not your current role
2. Dropdown closes
3. Toast message: "Switching to [Role] role..."
4. API call to `/api/switch-role`
5. localStorage updated with new role
6. Toast message: "Switched to [Role] role"
7. Page redirects to the new role's profile page

**Timing:** Should complete in ~500ms

## Next Steps

Please provide the following information:

1. **Number of roles you have:**
2. **Which roles:**
3. **What role you're currently on:**
4. **What role you're trying to switch to:**
5. **What happens when you click (describe in detail):**
6. **Any error messages in console:**
7. **Network tab shows (if applicable):**

This will help me identify the exact issue and provide a targeted fix!
