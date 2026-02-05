# Appearance Debug Console - Instructions

## Quick Start

### Method 1: Inject via Browser Console (Recommended)

1. Open tutor-profile.html or student-profile.html in your browser
2. Open browser DevTools (F12)
3. Go to Console tab
4. Copy and paste the contents of `appearance-debug-console.js`
5. Press Enter
6. A debug console will appear in the top-right corner

### Method 2: Add Script Tag to HTML

Add this line to tutor-profile.html or student-profile.html:

```html
<script src="../appearance-debug-console.js"></script>
```

Place it AFTER appearance-manager.js loads.

### Method 3: Bookmark (Easiest for repeated use)

Create a bookmark with this as the URL:

```javascript
javascript:(function(){var s=document.createElement('script');s.src='http://localhost:8081/appearance-debug-console.js';document.body.appendChild(s);})();
```

Then click the bookmark when on tutor-profile page.

## Features

### 📊 Current State Panel
Shows real-time values:
- **HTML data-theme** - The actual theme attribute on `<html>`
- **HTML classList** - CSS classes on `<html>` (should include "dark" for dark theme)
- **Body classList** - CSS classes on `<body>`
- **localStorage.theme** - What theme-toggle.js reads
- **appearance_settings** - Full settings object from appearance-manager.js
- **window.theme** - Global theme variable
- **Manager loaded** - Whether appearance-manager.js is available
- **Manager settings** - Internal settings object

### ⚡ Action Buttons

**🔄 Refresh** - Manually refresh all state values

**⏱️ Auto (OFF/ON)** - Toggle auto-refresh every 1 second

**☀️ Light** - Apply light theme via appearance-manager

**🌙 Dark** - Apply dark theme via appearance-manager

**💻 System** - Apply system theme (follows OS preference)

**🗑️ Clear** - Clear all localStorage (theme + appearance_settings)

**✅ Reapply** - Force reapply all appearance settings

**🧹 Clear Logs** - Clear the event log

### 📝 Event Log
- Shows all actions taken
- Color-coded by type (info/warn/error/success)
- Timestamped
- Scrolls automatically

## Usage Scenarios

### Scenario 1: Theme Not Applying

1. Inject console
2. Click **🔄 Refresh**
3. Check:
   - Does `localStorage.theme` match `HTML data-theme`?
   - Is `Manager loaded` showing "YES ✓"?
   - Does `Manager settings.theme` match what you expect?

**If they don't match:**
- Click **✅ Reapply** to force-apply settings
- Or click **☀️ Light** / **🌙 Dark** to set manually

### Scenario 2: Testing Cross-Page Navigation

1. On advertiser-profile: Set theme to Dark
2. Navigate to tutor-profile
3. **Immediately** check debug console
4. Watch Event Log for:
   ```
   [XX:XX:XX] DOMContentLoaded fired
   [XX:XX:XX] window.load fired
   [XX:XX:XX] Reapplying ALL settings after page load
   ```

**What to look for:**
- `localStorage.theme` should be "dark"
- `HTML data-theme` should be "dark"
- If NOT, the window.load handler didn't fire

### Scenario 3: Race Condition Debugging

1. Enable **⏱️ Auto (ON)**
2. Watch the state panel update every second
3. Reload the page
4. Watch values change in real-time
5. Look for:
   - Does theme flicker between light/dark?
   - Does it settle on the wrong theme?
   - When does it reach the correct theme?

### Scenario 4: Manual Override

If theme is stuck:
1. Click **🗑️ Clear** to reset everything
2. Click **🌙 Dark** to set fresh
3. Click **🔄 Refresh** to verify
4. Reload page to test persistence

## Console API

You can also use the console programmatically:

```javascript
// Refresh state
appearanceDebugConsole.refresh();

// Apply themes
appearanceDebugConsole.applyLight();
appearanceDebugConsole.applyDark();
appearanceDebugConsole.applySystem();

// Clear storage
appearanceDebugConsole.clearStorage();

// Reapply settings
appearanceDebugConsole.reapplySettings();

// Export logs
const logs = appearanceDebugConsole.exportLogs();
console.log(logs);

// Close console
appearanceDebugConsole.close();
```

## What to Look For

### ✅ WORKING (advertiser-profile)
```
HTML data-theme: dark
localStorage.theme: dark
Manager loaded: YES ✓
Manager settings.theme: dark
```
All values match = working correctly

### ❌ BROKEN (tutor-profile before fix)
```
HTML data-theme: light
localStorage.theme: dark
Manager loaded: YES ✓
Manager settings.theme: dark
```
HTML doesn't match localStorage = theme not applying

### ⚠️ RACE CONDITION
```
At 0.1s: HTML data-theme: dark
At 0.5s: HTML data-theme: light
At 1.0s: HTML data-theme: dark
```
Values changing = scripts fighting over theme

## Expected Behavior After Fix

### On Initial Page Load:
```
[12:00:00] DOMContentLoaded fired
[12:00:00] State refreshed
[12:00:01] window.load fired
[12:00:01] Reapplying ALL settings after page load
[12:00:01] State refreshed
```

**Final state should be:**
- `HTML data-theme` = `localStorage.theme`
- `Manager settings.theme` = `localStorage.theme`
- All values consistent

### On Navigation:
1. Set theme in advertiser-profile
2. Navigate to tutor-profile
3. Console should show:
   ```
   [12:01:00] DOMContentLoaded fired
   [12:01:00] Reapplying ALL settings after page load
   ```
4. Theme should match without flicker

## Troubleshooting

### Console doesn't appear
- Check browser console for errors
- Make sure script loaded (check Network tab)
- Try injecting via browser console instead

### "Manager not available" error
- appearance-manager.js hasn't loaded yet
- Wait a moment and click **🔄 Refresh**
- Or inject console AFTER page fully loads

### Values not updating
- Click **🔄 Refresh** manually
- Or enable **⏱️ Auto (ON)**
- Check if console is minimized (click _ to toggle)

### Can't drag console
- Click and hold the blue header bar
- If stuck, close and re-inject

## Advanced Debugging

### Compare Two Pages

**Terminal 1 (advertiser-profile):**
```javascript
appearanceDebugConsole.exportLogs();
// Copy output
```

**Terminal 2 (tutor-profile):**
```javascript
appearanceDebugConsole.exportLogs();
// Copy output
```

Compare the two logs side-by-side to see differences.

### Monitor localStorage Changes

Add this to browser console:
```javascript
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    if (key === 'theme' || key === 'appearance_settings') {
        console.log(`[LocalStorage] ${key} = ${value}`);
        appearanceDebugConsole.log(`localStorage.${key} changed to: ${value}`, 'warn');
    }
    return originalSetItem.apply(this, arguments);
};
```

Now every localStorage change will be logged!

## Files

- **appearance-debug-console.js** - The debug console script
- **APPEARANCE_DEBUG_INSTRUCTIONS.md** - This file
- **test-appearance-theme-debug.html** - Standalone test page

## Support

If you find a bug with the debug console itself, check:
1. Browser console for JavaScript errors
2. Make sure you're using a modern browser (Chrome, Firefox, Edge)
3. Clear browser cache and reload

## Example Output

When working correctly, you should see:

```
HTML data-theme: dark ✓
HTML classList: dark
Body classList: dark font-sans
localStorage.theme: dark ✓
appearance_settings: { theme: "dark", colorPalette: "ocean-blue", ... } ✓
window.theme: dark
Manager loaded: YES ✓
Manager settings: { theme: "dark", ... } ✓
```

All green checkmarks = everything working! 🎉
