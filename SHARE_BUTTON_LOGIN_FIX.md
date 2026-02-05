# Share Button "Please Login" Fix

## Problem
When clicking the Share button in parent-profile (and other profiles), users were getting a "Please login to share your profile" error even though they were already logged in.

## Root Cause
**localStorage Key Mismatch:**
- `AuthManager` (in `js/root/auth.js`) stores user data in: `localStorage.getItem('currentUser')`
- `share-profile-manager.js` was looking for: `localStorage.getItem('user')`

This mismatch caused the share functionality to not find the user data, even though the user was authenticated.

## Files Changed

### 1. js/common-modals/share-profile-manager.js
**Changed all localStorage access to check both keys for compatibility:**

- Line 17-29: Updated `shareProfile()` function
  - Now checks: `localStorage.getItem('currentUser') || localStorage.getItem('user')`
  - Also checks: `localStorage.getItem('userRole') || localStorage.getItem('active_role')`

- Line 259-264: Updated `shareViaNative()`
- Line 287-292: Updated `shareViaWhatsApp()`
- Line 312-317: Updated `shareViaTwitter()`
- Line 330-335: Updated `shareViaTelegram()`
- Line 344-349: Updated `shareViaEmail()`
- Line 372: Updated `viewReferralDashboard()`

### 2. Profile Pages (Cache-Busting)
Added `?v=20260204` to force browser to reload the updated JavaScript:

- profile-pages/parent-profile.html
- profile-pages/tutor-profile.html
- profile-pages/student-profile.html
- profile-pages/advertiser-profile.html
- profile-pages/user-profile.html

## Testing

### Before Fix
1. Login as parent
2. Go to parent-profile.html
3. Click Share button
4. Error: "Please login to share your profile" ❌

### After Fix
1. Login as parent
2. Go to parent-profile.html
3. Click Share button
4. Share modal opens successfully ✅

## Technical Details

### AuthManager Storage Pattern
```javascript
// auth.js line 73
const user = localStorage.getItem('currentUser');
```

### Updated Share Manager Pattern
```javascript
// share-profile-manager.js line 17
const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
const activeRole = localStorage.getItem('userRole') || localStorage.getItem('active_role');
```

This backward-compatible approach:
- ✅ Works with AuthManager's `currentUser` key
- ✅ Falls back to legacy `user` key if needed
- ✅ Handles both `userRole` and `active_role` keys

## Related Files
- `js/root/auth.js` - AuthManager that manages authentication
- `js/root/app.js` - Global app state (uses `user` key)
- `js/common-modals/share-profile-manager.js` - Share functionality

## Prevention
To avoid similar issues in the future:

1. **Use AuthManager methods** instead of direct localStorage access:
   ```javascript
   // Good
   const user = window.AuthManager.getUser();
   const token = window.AuthManager.getToken();
   const role = window.AuthManager.getUserRole();

   // Avoid
   const user = JSON.parse(localStorage.getItem('user'));
   ```

2. **Check both keys** if direct localStorage access is necessary:
   ```javascript
   const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
   ```

3. **Document localStorage keys** in a central location to track usage

## Status
✅ **FIXED** - All profile pages now properly detect logged-in users when clicking Share button.
