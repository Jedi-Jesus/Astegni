# Emergency Debug - Role Switch Not Working

## Quick Test

Paste this BEFORE clicking to switch roles:

```javascript
// Clear everything first
sessionStorage.clear();
console.log('=== BEFORE SWITCH ===');
console.log('localStorage.userRole:', localStorage.getItem('userRole'));
console.log('sessionStorage.role_switch_in_progress:', sessionStorage.getItem('role_switch_in_progress'));
console.log('sessionStorage.target_role:', sessionStorage.getItem('target_role'));
console.log('AuthManager.user.active_role:', window.AuthManager?.user?.active_role);
```

Then click to switch to tutor.

Then IMMEDIATELY paste this:

```javascript
console.log('=== AFTER SWITCH CLICK (before navigation) ===');
console.log('localStorage.userRole:', localStorage.getItem('userRole'));
console.log('sessionStorage.role_switch_in_progress:', sessionStorage.getItem('role_switch_in_progress'));
console.log('sessionStorage.target_role:', sessionStorage.getItem('target_role'));
```

## What to Look For

**GOOD - Should see:**
```
sessionStorage.role_switch_in_progress: "true"
sessionStorage.target_role: "tutor"
```

**BAD - If you see:**
```
sessionStorage.role_switch_in_progress: null
sessionStorage.target_role: null
```

This means switchToRole() didn't run or didn't set the flags.

## If Flags Not Set

Check if switchToRole is being called:

```javascript
// Check if function exists
console.log('switchToRole exists?', typeof window.switchToRole);

// Manually test it
window.switchToRole('tutor');
```

## Most Likely Issues

1. **Cache** - Browser still using old JavaScript
   - Hard refresh: Ctrl + Shift + R
   - Clear cache completely

2. **switchToRole not being called**
   - Check what happens when you click the role option
   - Might be clicking the wrong element

3. **API call fails**
   - Check Network tab for /api/switch-role
   - Status should be 200

4. **JavaScript error**
   - Check Console for any errors in red
