# 🔄 Force Reload Instructions - Fix filterSchedulesByRole Error

## The Problem
The error `filterSchedulesByRole is not defined` occurs because your browser has cached the old JavaScript file. The fix is already in place, but you need to force your browser to reload the updated files.

## ✅ Solution Methods (Choose One)

### Method 1: Hard Refresh (RECOMMENDED - Fastest)
**Windows/Linux:**
- Press `Ctrl + Shift + R`
- Or `Ctrl + F5`

**Mac:**
- Press `Cmd + Shift + R`

### Method 2: Use Test Page
1. Open: `http://localhost:8081/clear-student-schedule-cache.html`
2. Click "Hard Refresh Browser" button
3. Click "Test Function" to verify the fix
4. Click "Go to Student Profile" to test in real page

### Method 3: Clear Browser Cache Manually
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh the page

### Method 4: DevTools (For Developers)
1. Open DevTools (`F12`)
2. Right-click on the refresh button in browser
3. Select "Empty Cache and Hard Reload"

### Method 5: Disable Cache in DevTools (For Development)
1. Open DevTools (`F12`)
2. Go to Network tab
3. Check "Disable cache" checkbox
4. Keep DevTools open while developing

## 🧪 Verify The Fix Works

### In Browser Console (F12 → Console):
```javascript
// Should show "function"
console.log(typeof window.filterSchedulesByRole);

// Should show the function code
console.log(window.filterSchedulesByRole);
```

If both show valid results, the fix is working! ✅

## 📁 Files That Were Fixed

### Student Profile:
- `js/student-profile/schedule-manager.js` - Added `window.filterSchedulesByRole = filterSchedulesByRole;`
- `profile-pages/student-profile.html` - Updated onclick handlers to pass `event`
- Script version updated to: `?v=20260204-filterfix`

### Parent Profile:
- `js/parent-profile/schedule-manager.js` - Added `window.filterSchedulesByRole = filterSchedulesByRole;`
- `profile-pages/parent-profile.html` - Updated onclick handlers to pass `event`

### Tutor Profile:
- Already has the export (no changes needed)

## ⚠️ If Still Not Working

If you still see the error after trying all methods above:

1. **Close ALL browser tabs/windows**
2. **Restart your browser completely**
3. **Clear cache using Method 3 above**
4. **Open the page again**

## 🚀 For Development Server Users

If using `dev-server.py` (port 8081), cache should be disabled automatically.

If using standard Python HTTP server (port 8080):
```bash
# Stop it (Ctrl+C) and restart with:
python dev-server.py
# Then access: http://localhost:8081
```

The dev server has `Cache-Control: no-store` headers to prevent this issue.

## ✨ Expected Behavior After Fix

The schedule filter buttons should now work properly:
- 🟦 **All Sessions** - Shows all schedules
- 👨‍🏫 **As Tutor** - Shows only tutor schedules
- 🎓 **As Student** - Shows only student schedules
- 👨‍👩‍👧 **As Parent** - Shows only parent schedules

The active button will be highlighted in blue, and schedules will filter accordingly.
