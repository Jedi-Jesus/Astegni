# FORCE BROWSER CACHE CLEAR

## The Problem
Your browser is caching the old version of `schedule-panel-manager.js` which doesn't have the `filterSchedulesByRole` function exported properly.

## Solution: Force Hard Refresh

### Windows/Linux:
1. Open tutor-profile.html in your browser
2. Press: **Ctrl + Shift + R** (or **Ctrl + F5**)
3. This forces a hard refresh and clears the cache

### Mac:
1. Open tutor-profile.html in your browser
2. Press: **Cmd + Shift + R** (or **Cmd + Option + R**)

## Alternative: Clear Cache Manually

### Chrome/Edge:
1. Press **F12** to open DevTools
2. Right-click the refresh button (top left of browser)
3. Select "Empty Cache and Hard Reload"

### Firefox:
1. Press **Ctrl + Shift + Delete**
2. Select "Cached Web Content"
3. Click "Clear Now"
4. Refresh the page

## Verify Fix Worked

After clearing cache, open browser console (F12) and run:
```javascript
console.log(typeof window.filterSchedulesByRole);
```

Should output: `"function"`

If it outputs `"undefined"`, the cache is still not cleared.

## Nuclear Option: Open in Incognito/Private Mode

1. Open browser in Incognito/Private mode (Ctrl + Shift + N)
2. Navigate to tutor-profile.html
3. Test the role filters
4. This bypasses all cache

## What I Changed
- Updated cache-busting version from `?v=20260204rolefilterfix` to `?v=20260204140641`
- This should force the browser to load the new version
