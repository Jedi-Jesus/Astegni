# Share Button Debug Instructions

## Problem
Share button not responding in:
- ✅ Works: tutor-profile, student-profile, advertiser-profile
- ❌ Broken: parent-profile, user-profile

## Files Updated with Debug Code

### 1. parent-profile.html (line ~7076)
### 2. user-profile.html (line ~3110)

Both files now have debug logging added after the share-profile-manager.js script loads.

## How to Debug

### Step 1: Open Browser Console
1. Open parent-profile.html in your browser
2. Press F12 to open Developer Tools
3. Go to the **Console** tab

### Step 2: Check Initial Debug Logs
When the page loads, you should see these logs:

```
✓ Share Profile Manager loaded
[DEBUG] shareProfile function exists: function
[DEBUG] localStorage.currentUser: true/false
[DEBUG] localStorage.user: true/false
[DEBUG] localStorage.token: true/false
[DEBUG] localStorage.userRole: parent/null
[DEBUG] localStorage.active_role: parent/null
[DEBUG] shareProfile() wrapper installed
```

### Step 3: Click the Share Button
When you click the share button, you should see:

```
[DEBUG] shareProfile() called!
[DEBUG] Arguments: ...
```

Then EITHER:
- Success: `[DEBUG] shareProfile() completed successfully`
- OR Error: `[DEBUG] shareProfile() error: ...`

## What to Look For

### Scenario 1: Function NOT Found
```
[DEBUG] shareProfile function exists: undefined
[DEBUG] shareProfile() NOT FOUND! Script may not have loaded.
```

**Issue:** The script failed to load or there's a JavaScript error preventing it.

**Check:**
- Look for red errors in console above the debug logs
- Check Network tab (F12 → Network) - is share-profile-manager.js loading with 200 status?

### Scenario 2: Function Exists But Not Called
```
[DEBUG] shareProfile function exists: function
[DEBUG] shareProfile() wrapper installed
```
But NO `[DEBUG] shareProfile() called!` when you click button.

**Issue:** The button click isn't reaching the function.

**Possible Causes:**
- Another element is overlaying the button (z-index issue)
- Click event is being prevented/stopped
- Button is disabled

**Check:**
```javascript
// In console, manually call:
shareProfile()
```
If this works, the button itself has an issue, not the function.

### Scenario 3: Function Called But Fails
```
[DEBUG] shareProfile() called!
[DEBUG] shareProfile() error: Please login to share your profile
```

**Issue:** localStorage doesn't have the required data.

**Fix:** Check the debug output shows:
- `localStorage.currentUser: true` OR `localStorage.user: true`
- `localStorage.token: true`
- `localStorage.userRole: parent` OR `localStorage.active_role: parent`

If any are false/null, you need to login again.

### Scenario 4: Modal Fetch Fails
```
[DEBUG] shareProfile() called!
Failed to load share modal
```

**Issue:** The modal HTML file isn't loading.

**Check:**
- F12 → Network tab
- Look for request to `/modals/common-modals/share-profile-modal.html`
- Check if it returns 404 or fails

**Fix:**
The modal is located at: [modals/common-modals/share-profile-modal.html](modals/common-modals/share-profile-modal.html)

## Manual Test in Console

If the button doesn't work, try running this in the browser console:

```javascript
// Check function exists
typeof shareProfile

// Check localStorage
console.log({
    currentUser: localStorage.getItem('currentUser'),
    user: localStorage.getItem('user'),
    token: localStorage.getItem('token'),
    userRole: localStorage.getItem('userRole'),
    active_role: localStorage.getItem('active_role')
});

// Manually call function
shareProfile()
```

## Comparison Test

1. Open **tutor-profile.html** (working) in one tab
2. Open **parent-profile.html** (broken) in another tab
3. Open console in BOTH tabs (F12)
4. Click share button in BOTH
5. Compare the debug output

Look for differences in:
- Which localStorage keys exist
- Error messages
- Network requests

## Quick Fix Test

If you want to test if the localStorage fix worked, run this in console:

```javascript
// Setup test data
const mockUser = {
    id: 999,
    first_name: 'Test',
    father_name: 'Parent',
    grandfather_name: 'User',
    active_role: 'parent',
    roles: ['parent']
};

localStorage.setItem('currentUser', JSON.stringify(mockUser));
localStorage.setItem('token', 'test-token');
localStorage.setItem('userRole', 'parent');

// Now try clicking share button
```

## Files Involved

### JavaScript
- [js/common-modals/share-profile-manager.js](js/common-modals/share-profile-manager.js) - Main share functionality

### HTML Modal
- [modals/common-modals/share-profile-modal.html](modals/common-modals/share-profile-modal.html) - Modal UI

### Profile Pages
- [profile-pages/parent-profile.html](profile-pages/parent-profile.html) - Broken ❌
- [profile-pages/user-profile.html](profile-pages/user-profile.html) - Broken ❌
- [profile-pages/tutor-profile.html](profile-pages/tutor-profile.html) - Working ✅
- [profile-pages/student-profile.html](profile-pages/student-profile.html) - Working ✅
- [profile-pages/advertiser-profile.html](profile-pages/advertiser-profile.html) - Working ✅

## Next Steps

1. **Run the debug** - Open parent-profile.html and check console
2. **Report findings** - Share the console output
3. **Compare** - Note differences between working (tutor) and broken (parent) profiles

## Debug Test Page

Alternative: Open [debug-share-button-parent.html](debug-share-button-parent.html) for a dedicated debug interface.
