# Schedule View Modal Fix

## Issue
When clicking "View Details" on a schedule in the student profile, the error appears:
```
Uncaught ReferenceError: openViewScheduleModal is not defined
```

## Root Cause
Browser caching old JavaScript files that don't have the function exported to the window object.

## Solution Applied

### 1. Updated Cache-Busting Versions
- **student-profile.html:6056** - Updated global-functions.js from `?v=20260129-viewmodal` to `?v=20260129-viewschedule-fix`
- **student-profile.html:6131** - Updated schedule-manager.js from `?v=20260129` to `?v=20260129-viewfix`

### 2. Added Wrapper Function
Created `handleViewScheduleClick()` in [schedule-manager.js](js/student-profile/schedule-manager.js) that:
- Checks if `openViewScheduleModal` function exists
- Provides helpful error message if function not loaded
- Logs available schedule functions for debugging

### 3. Added Debug Verification
- Added console log at end of global-functions.js to verify all schedule functions loaded
- Added detailed logging in wrapper function

## How to Test

### Method 1: Hard Refresh (Recommended)
1. Open student profile page with schedule panel
2. Press **Ctrl + Shift + R** (or **Ctrl + F5**) to do a hard refresh
3. Open browser console (F12)
4. Look for log: `[Student Global Functions] Schedule modal functions loaded:`
5. Click "View Details" button on any schedule
6. Modal should open successfully

### Method 2: Use Debug Script
1. Open browser console (F12)
2. Copy and paste the entire contents of `debug-schedule-modal.js`
3. Press Enter
4. Follow the console output
5. Try clicking "View Details" button

### Method 3: Clear Cache Manually
1. Open browser DevTools (F12)
2. Go to Network tab
3. Right-click and select "Clear browser cache"
4. Refresh the page
5. Try clicking "View Details" button

## Files Modified

1. **profile-pages/student-profile.html**
   - Line 6056: Updated global-functions.js cache-busting version
   - Line 6131: Updated schedule-manager.js cache-busting version

2. **js/student-profile/schedule-manager.js**
   - Line 213: Changed onclick from `openViewScheduleModal(id)` to `handleViewScheduleClick(id)`
   - Lines 247-263: Added wrapper function with error handling

3. **js/student-profile/global-functions.js**
   - Lines 3662-3668: Added verification logging

## Debug Tools Created

- **debug-schedule-modal.js** - Console script to force-reload the function and verify it's loaded

## Expected Console Output

After hard refresh, you should see:
```
[Student Global Functions] Schedule modal functions loaded: {
    openViewScheduleModal: "function",
    closeViewScheduleModal: "function",
    editScheduleFromView: "function",
    deleteScheduleFromView: "function"
}
```

When clicking "View Details":
```
[Schedule Manager] View schedule clicked for ID: 123
[View Schedule Modal] Opening for ID: 123
[View Schedule Modal] Loaded schedule: {...}
```

## If Still Not Working

1. Check console for any script loading errors
2. Verify both script files are loading with new cache-busting versions
3. Run the debug script from `debug-schedule-modal.js`
4. Check if modal HTML is loaded: `document.getElementById('viewScheduleModal')`

## Prevention

The wrapper function approach prevents this issue in the future by:
- Gracefully handling missing function
- Providing clear error message to user
- Logging debug info for developers
- Suggesting page refresh as solution
