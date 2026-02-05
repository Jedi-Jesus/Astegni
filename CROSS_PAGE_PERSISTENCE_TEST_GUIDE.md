# Cross-Page Persistence Test Guide

## Overview
This guide helps you verify that appearance settings (theme, color palette, fonts) persist correctly when navigating between pages.

## Quick Start

### Option 1: Use Debug Console Page (Recommended)
1. Open http://localhost:8081/cross-page-persistence-debug.html
2. This gives you a full dashboard with navigation links and consistency checks
3. Follow the test scenarios below

### Option 2: Manual Testing with Browser DevTools
1. Open any page (e.g., advertiser-profile.html)
2. Open Browser DevTools (F12) → Console
3. Run: `localStorage.getItem('appearance_settings')`
4. Navigate to another page
5. Check if the same value appears

## Critical Test Scenarios

### Scenario 1: Light Theme Persistence
**Goal:** Verify light theme persists from advertiser-profile to tutor-profile

**Steps:**
1. Open http://localhost:8081/profile-pages/advertiser-profile.html
2. Click Settings → Appearance
3. Select **Light** theme
4. Note the current state:
   ```javascript
   // Open console and run:
   console.log('data-theme:', document.documentElement.getAttribute('data-theme'));
   console.log('localStorage:', localStorage.getItem('appearance_settings'));
   ```
5. Navigate to http://localhost:8081/profile-pages/tutor-profile.html
6. **IMMEDIATELY** check in console:
   ```javascript
   console.log('data-theme:', document.documentElement.getAttribute('data-theme'));
   console.log('localStorage:', localStorage.getItem('appearance_settings'));
   ```

**Expected Result:**
- ✅ `data-theme` should be `"light"` on both pages
- ✅ `localStorage.appearance_settings` should have `theme: "light"` on both pages
- ✅ Page should NOT flash dark then light
- ✅ Background should be light immediately

**If it FAILS:**
- ❌ Page loads with dark theme then switches to light = race condition
- ❌ Page stays dark = theme not applying
- ❌ `localStorage` shows `"light"` but page is dark = HTML not updating

---

### Scenario 2: Dark Theme Persistence
**Goal:** Verify dark theme persists from tutor-profile to student-profile

**Steps:**
1. Open http://localhost:8081/profile-pages/tutor-profile.html
2. Click Settings → Appearance
3. Select **Dark** theme
4. Note the current state (same console commands as Scenario 1)
5. Navigate to http://localhost:8081/profile-pages/student-profile.html
6. **IMMEDIATELY** check in console

**Expected Result:**
- ✅ `data-theme` should be `"dark"` on both pages
- ✅ `localStorage.appearance_settings` should have `theme: "dark"` on both pages
- ✅ Page should NOT flash light then dark
- ✅ Background should be dark immediately

---

### Scenario 3: Color Palette Persistence
**Goal:** Verify color palettes persist across pages

**Steps:**
1. Open http://localhost:8081/profile-pages/advertiser-profile.html
2. Click Settings → Appearance → Color Palettes
3. Select **Ocean Blue** palette
4. Note the primary button color (should be blue)
5. Navigate to http://localhost:8081/profile-pages/tutor-profile.html
6. Check if buttons are still blue

**Expected Result:**
- ✅ Color palette should persist
- ✅ Buttons/UI should maintain Ocean Blue colors
- ✅ `localStorage.appearance_settings.colorPalette` should be `"ocean-blue"`

---

### Scenario 4: System Theme Persistence
**Goal:** Verify system theme follows OS preference

**Steps:**
1. Open http://localhost:8081/profile-pages/advertiser-profile.html
2. Click Settings → Appearance
3. Select **System** theme
4. Note your OS theme (Windows: Settings → Personalization → Colors)
5. Navigate to http://localhost:8081/profile-pages/student-profile.html
6. Check if theme matches OS

**Expected Result:**
- ✅ If OS is dark mode → page should be dark
- ✅ If OS is light mode → page should be light
- ✅ `localStorage.appearance_settings.theme` should be `"system"`

---

### Scenario 5: Cross-Profile Navigation Loop
**Goal:** Test persistence across ALL profile pages

**Steps:**
1. Open http://localhost:8081/cross-page-persistence-debug.html
2. Click **Apply Dark** button
3. Navigate in this order:
   - advertiser-profile.html → Check theme
   - tutor-profile.html → Check theme
   - student-profile.html → Check theme
   - parent-profile.html → Check theme
   - user-profile.html → Check theme
4. On EACH page, verify in console:
   ```javascript
   document.documentElement.getAttribute('data-theme') === 'dark'
   ```

**Expected Result:**
- ✅ ALL pages should load with dark theme
- ✅ NO page should flash or reset to light
- ✅ localStorage should be consistent across all pages

---

## Using the Debug Console

### Dashboard Features

**📊 Current State Panel**
- Shows real-time values of all theme-related variables
- Automatically color-coded: Green = OK, Red = Error

**⚡ Quick Actions**
- **Apply Light/Dark/System** - Set theme without opening modal
- **Clear All** - Reset localStorage for fresh start
- **Reapply** - Force reapply current settings
- **Export Report** - Download JSON report of current state

**✅ Consistency Checks**
- Click "Check Consistency" to validate:
  - Does `data-theme` match `appearance_settings.theme`?
  - Does manager settings match localStorage?
  - Are all required values present?

**📝 Event Log**
- Tracks all actions and state changes
- Persists across navigation (stored in sessionStorage)
- Shows logs from previous pages you visited

### How to Use Debug Console

**Test 1: Light → Navigate**
1. Open debug console page
2. Click **"Test 1: Light → Navigate"**
3. Click "Tutor Profile" link
4. Check if theme is still light

**Test 2: Dark → Navigate**
1. Open debug console page
2. Click **"Test 2: Dark → Navigate"**
3. Click "Student Profile" link
4. Check if theme is still dark

**Test 3: Clear → Navigate**
1. Open debug console page
2. Click **"Test 3: Clear → Navigate"**
3. Click any profile link
4. Check what default theme is applied

---

## Console Commands for Manual Testing

### Check Current State
```javascript
// View all appearance settings
console.log('data-theme:', document.documentElement.getAttribute('data-theme'));
console.log('HTML class:', document.documentElement.className);
console.log('localStorage.theme:', localStorage.getItem('theme'));
console.log('localStorage.appearance_settings:', localStorage.getItem('appearance_settings'));
console.log('Manager loaded:', typeof appearanceModalManager !== 'undefined');
if (typeof appearanceModalManager !== 'undefined') {
    console.log('Manager settings:', appearanceModalManager.settings);
}
```

### Apply Theme Manually
```javascript
// Apply dark theme
if (typeof appearanceModalManager !== 'undefined') {
    appearanceModalManager.applyTheme('dark');
    appearanceModalManager.settings.theme = 'dark';
    appearanceModalManager.saveSettings();
    console.log('Dark theme applied');
}
```

### Monitor Theme Changes
```javascript
// Watch for theme attribute changes
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
            console.log('THEME CHANGED:', document.documentElement.getAttribute('data-theme'));
        }
    });
});
observer.observe(document.documentElement, { attributes: true });
console.log('Now monitoring theme changes...');
```

### Monitor localStorage Changes
```javascript
// Intercept localStorage changes
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    if (key === 'theme' || key === 'appearance_settings') {
        console.log(`[LocalStorage] ${key} = ${value}`);
    }
    return originalSetItem.apply(this, arguments);
};
console.log('Now monitoring localStorage changes...');
```

---

## What to Look For

### ✅ WORKING (Expected Behavior)
```
Page: advertiser-profile
data-theme: "dark"
appearance_settings.theme: "dark"
Manager settings.theme: "dark"

[Navigate to tutor-profile]

Page: tutor-profile
data-theme: "dark"  ← SAME
appearance_settings.theme: "dark"  ← SAME
Manager settings.theme: "dark"  ← SAME
```
**Status:** Theme persisted correctly ✓

---

### ❌ NOT WORKING (Race Condition)
```
Page: advertiser-profile
data-theme: "dark"
appearance_settings.theme: "dark"

[Navigate to tutor-profile]

Console log:
[DOMContentLoaded] theme-toggle.js setting theme to "light"
[DOMContentLoaded] appearance-manager.js setting theme to "dark"
[window.load] appearance-manager.js reapplying theme to "dark"

Page: tutor-profile
data-theme: "dark"  ← Correct but flickered
appearance_settings.theme: "dark"
```
**Status:** Theme eventually correct but flashed light → dark ✗

---

### ❌ NOT WORKING (Theme Not Applying)
```
Page: advertiser-profile
data-theme: "dark"
appearance_settings.theme: "dark"

[Navigate to tutor-profile]

Page: tutor-profile
data-theme: "light"  ← WRONG!
appearance_settings.theme: "dark"  ← localStorage has dark but HTML is light
```
**Status:** Theme not applying from localStorage ✗

---

### ❌ NOT WORKING (Manager Not Reapplying)
```
Page: advertiser-profile
data-theme: "dark"
appearance_settings.theme: "dark"

[Navigate to tutor-profile]

Console log:
[DOMContentLoaded] theme-toggle.js setting theme to "light"
[window.load] ← NO REAPPLY EVENT!

Page: tutor-profile
data-theme: "light"
appearance_settings.theme: "dark"
```
**Status:** window.load handler not firing ✗

---

## Debugging Checklist

If theme is NOT persisting:

### Step 1: Check localStorage
```javascript
localStorage.getItem('appearance_settings')
```
- ✅ If NULL → Theme not being saved
- ✅ If present → Move to Step 2

### Step 2: Check if Manager Loads
```javascript
typeof appearanceModalManager !== 'undefined'
```
- ✅ If false → appearance-manager.js not loading
- ✅ If true → Move to Step 3

### Step 3: Check window.load Handler
```javascript
// Add this to appearance-manager.js to verify:
window.addEventListener('load', () => {
    console.log('[DEBUG] window.load fired - reapplying settings');
    // ... rest of handler
});
```
- ✅ If log appears → Handler is running
- ✅ If log missing → Handler not registered or not firing

### Step 4: Check Script Loading Order
Open tutor-profile.html and verify:
```html
<!-- Should be in this order: -->
<script src="../js/root/theme-toggle.js"></script>
<!-- ... other scripts ... -->
<script src="../js/common-modals/appearance-manager.js"></script>
```
- ✅ appearance-manager.js should load AFTER theme-toggle.js

### Step 5: Check Cache
```bash
# Clear browser cache:
Ctrl+Shift+R (hard reload)
# OR
Ctrl+F5 (force refresh)
```
- ✅ Old cached JavaScript might be running

### Step 6: Check for JavaScript Errors
Open Console (F12) and look for:
- ❌ `ReferenceError: appearanceModalManager is not defined`
- ❌ `TypeError: Cannot read property 'settings' of undefined`
- ❌ Any other errors preventing script execution

---

## Expected Console Output (Working)

When navigating from advertiser-profile to tutor-profile with dark theme:

```
[advertiser-profile.html]
✓ Dark theme applied
✓ Settings saved to localStorage

[navigation occurs]

[tutor-profile.html]
✓ DOMContentLoaded fired
✓ theme-toggle.js initialized with theme: light (from old localStorage.theme)
✓ appearance-manager.js initialized with theme: dark (from appearance_settings)
✓ window.load fired
✓ [Appearance] Reapplying ALL settings after page load: {theme: "dark", ...}
✓ Theme applied: dark
```

**Result:** Page loads dark, stays dark ✅

---

## Expected Console Output (NOT Working)

When theme is NOT persisting:

```
[advertiser-profile.html]
✓ Dark theme applied
✓ Settings saved to localStorage

[navigation occurs]

[tutor-profile.html]
✓ DOMContentLoaded fired
✓ theme-toggle.js initialized with theme: light
✗ appearance-manager.js initialized with theme: dark but overridden by theme-toggle.js
✗ window.load fired but no reapply log
```

**Result:** Page loads light, stays light ❌

---

## Files Involved

### Frontend
- **js/common-modals/appearance-manager.js** - Main appearance management system (has window.load fix)
- **js/root/theme-toggle.js** - Old simple theme toggle (navbar buttons)
- **profile-pages/tutor-profile.html** - Profile page (line 4270: loads appearance-manager.js)
- **profile-pages/student-profile.html** - Profile page (line 7631: loads appearance-manager.js)

### Debug Tools
- **cross-page-persistence-debug.html** - Visual debug dashboard
- **appearance-debug-console.js** - Injectable debug console
- **APPEARANCE_DEBUG_INSTRUCTIONS.md** - Instructions for debug console

---

## Known Issues and Solutions

### Issue 1: Theme Flashes on Page Load
**Symptom:** Page loads light, then switches to dark (or vice versa)

**Cause:** Race condition between theme-toggle.js and appearance-manager.js

**Solution:**
- window.load handler in appearance-manager.js should force-reapply theme
- Verify handler is present in js/common-modals/appearance-manager.js:
```javascript
window.addEventListener('load', () => {
    setTimeout(() => {
        if (appearanceModalManager && appearanceModalManager.settings) {
            console.log('[Appearance] Reapplying ALL settings after page load:', appearanceModalManager.settings);
            appearanceModalManager.applySettings();
        }
    }, 100);
});
```

### Issue 2: Theme Not Persisting at All
**Symptom:** Theme always resets to light on navigation

**Cause:** localStorage.appearance_settings not being read

**Solution:**
- Check if appearance-manager.js is loading
- Verify localStorage has the key: `localStorage.getItem('appearance_settings')`
- Check for JavaScript errors in console

### Issue 3: Manager Not Available
**Symptom:** `appearanceModalManager is not defined`

**Cause:** Script not loaded or loaded too early

**Solution:**
- Verify script tag exists in HTML
- Check script path is correct
- Ensure script is loaded before trying to use it

---

## Success Criteria

Your appearance system is working correctly if:

✅ **Persistence:** Theme persists when navigating between any two pages
✅ **No Flash:** Page loads with correct theme immediately (no light→dark flash)
✅ **Consistency:** All values match (data-theme, localStorage, manager settings)
✅ **All Pages:** Works on tutor-profile, student-profile, advertiser-profile, etc.
✅ **All Themes:** Light, Dark, and System all persist correctly
✅ **Color Palettes:** Selected palette persists across pages
✅ **Font Settings:** Font selections persist across pages

---

## Next Steps After Testing

### If ALL Tests Pass ✅
1. Remove debug console files (optional - keep for future debugging)
2. Commit changes with message:
   ```
   Fix: Appearance theme persistence across all profile pages

   - Added window.load handler to force-reapply theme
   - Migrated hardcoded colors to CSS variables
   - Tested cross-page persistence (advertiser → tutor → student)
   ```

### If Tests FAIL ❌
1. Note which scenario failed
2. Open cross-page-persistence-debug.html
3. Run the failed scenario
4. Click "Export Report" to download debug data
5. Share the report for further analysis

---

## Support

If you encounter issues:

1. **Check browser console** for JavaScript errors
2. **Run consistency check** in debug console
3. **Export debug report** for detailed state analysis
4. **Clear browser cache** and test again
5. **Test in incognito mode** to rule out extension conflicts

---

## Summary

This test guide provides comprehensive verification of appearance theme persistence. Use the debug console page for visual testing, or run manual console commands for detailed debugging. The key is ensuring that `localStorage.appearance_settings` matches what's rendered on the page across all navigation events.

**Primary Goal:** When you set a theme on advertiser-profile and navigate to tutor-profile, the theme should persist without any flash or reset. If this works, your fix is complete! 🎉
