# Cross-Page Persistence Debug - Step by Step Guide

## Quick Setup (30 seconds)

### Step 1: Start Your Servers
```bash
# Terminal 1 - Backend
cd astegni-backend
python app.py

# Terminal 2 - Frontend
cd ..
python dev-server.py
```

Wait for:
```
✓ Backend: Uvicorn running on http://0.0.0.0:8000
✓ Frontend: Serving HTTP on 0.0.0.0 port 8081
```

### Step 2: Open Debug Page
Open your browser and go to:
```
http://localhost:8081/cross-page-persistence-debug.html
```

You should see a dark-themed dashboard with:
- 🔍 Cross-Page Persistence Debug Console (title)
- 🌐 Test Navigation section (page links)
- 📊 Current State panel
- ⚡ Quick Actions panel
- ✅ Consistency Checks panel
- 📝 Event Log panel

---

## Basic Testing (5 minutes)

### Test 1: Verify Debug Page Works

**What to do:**
1. Look at the **📊 Current State** panel
2. Click the **🔄 Refresh** button
3. Check the **📝 Event Log** at the bottom

**What you should see:**
```
Event Log:
[--:--:--] Debug console loaded. Click Refresh to see current state.
[6:30:00] Refreshing state...
[6:30:00] State refreshed
```

**Current State should show:**
- Current Page: `/cross-page-persistence-debug.html`
- HTML data-theme: `light` or `dark` (with green color)
- Manager Loaded: `YES ✓` or `NO ✗`

✅ **If you see this → Debug page is working!**

❌ **If you see errors → Check:**
- Are both servers running?
- Did you open the correct URL?
- Check browser console (F12) for JavaScript errors

---

### Test 2: Apply a Theme

**What to do:**
1. In the **⚡ Quick Actions** panel
2. Click **🌙 Apply Dark** button
3. Watch the page change

**What you should see:**
- Background turns dark immediately
- Event log shows:
  ```
  [6:31:00] Applying DARK theme...
  [6:31:00] Dark theme applied via manager
  [6:31:00] Refreshing state...
  [6:31:00] State refreshed
  ```
- Current State shows: `HTML data-theme: dark`

✅ **If background is dark → Theme system works!**

---

### Test 3: Check Consistency

**What to do:**
1. Click **✅ Check Consistency** button
2. Scroll down to **✅ Consistency Checks** panel

**What you should see:**
Six green checkmarks (✅):
```
✅ HTML data-theme (dark) matches appearance_settings.theme (dark)
✅ Manager settings.theme (dark) matches appearance_settings.theme (dark)
✅ HTML has data-theme="dark"
✅ localStorage has appearance_settings
✅ appearanceModalManager is loaded
✅ HTML classList includes theme class
```

At top of page, green alert:
```
✅ All consistency checks passed!
```

✅ **If all checks are green → Everything is consistent!**

❌ **If you see red X marks (❌) → Something is broken. See troubleshooting below.**

---

### Test 4: Copy Results

**What to do:**
1. Click **📋 Copy Results** button
2. Open Notepad or any text editor
3. Press `Ctrl+V` to paste

**What you should see:**
```
=== CROSS-PAGE PERSISTENCE DEBUG RESULTS ===
Generated: 1/28/2026, 6:32:15 PM
Page: /cross-page-persistence-debug.html

--- CURRENT STATE ---
HTML data-theme: dark
HTML classList: dark font-sans
...
```

✅ **If results paste → Copy function works!**

---

## Cross-Page Testing (10 minutes)

This is the **critical test** to verify theme persists when navigating.

### Test 5: Dark Theme → Tutor Profile

**What to do:**
1. Make sure you're on the debug page: `http://localhost:8081/cross-page-persistence-debug.html`
2. Click **🌙 Apply Dark** button
3. Verify page is dark
4. Click **✅ Check Consistency** - should show all green
5. Click **📋 Copy Results** - save this as "BEFORE.txt"
6. In the **🌐 Test Navigation** section, click **👨‍🏫 Tutor Profile** link
7. **WAIT** for page to load
8. Look at the background color immediately

**What you should see:**
- ✅ Page loads with **dark background immediately**
- ✅ **NO flash** from light to dark
- ✅ **NO delay** before dark theme appears

**What NOT to see:**
- ❌ Page loads light, then switches to dark
- ❌ Page flickers between themes
- ❌ Page stays light

**Now verify:**
1. Open browser console (F12)
2. Type:
   ```javascript
   document.documentElement.getAttribute('data-theme')
   ```
3. Press Enter
4. Should show: `"dark"`

**Check localStorage:**
```javascript
localStorage.getItem('appearance_settings')
```
Should show: `{"theme":"dark",...}`

✅ **If page is dark immediately → Persistence works!**

❌ **If page flashed or stayed light → Persistence broken. Continue to troubleshooting.**

---

### Test 6: Tutor Profile → Student Profile

**What to do:**
1. You should still be on tutor-profile with dark theme
2. Navigate back to debug page: `http://localhost:8081/cross-page-persistence-debug.html`
3. Click **✅ Check Consistency** - should still be all green
4. Click **👨‍🎓 Student Profile** link
5. Watch the background

**What you should see:**
- ✅ Page loads dark immediately
- ✅ NO flash

✅ **If dark theme persists → Full persistence confirmed!**

---

### Test 7: Light Theme → Multiple Pages

**What to do:**
1. Go back to debug page
2. Click **☀️ Apply Light** button
3. Click **✅ Check Consistency** - should be all green
4. Navigate to each profile in order:
   - **📢 Advertiser Profile**
   - **👨‍🏫 Tutor Profile**
   - **👨‍🎓 Student Profile**
   - **👨‍👩‍👧 Parent Profile**
   - **👤 User Profile**

**On EACH page, check:**
- Is background light?
- Is there any flash?

✅ **If all pages are light with no flash → Perfect!**

---

## Advanced Testing (15 minutes)

### Test 8: Use Built-in Test Scenarios

**What to do:**
1. Go back to debug page
2. Scroll to **⚡ Quick Actions** panel
3. Click **Test 1: Light → Navigate**
4. Read the alert message
5. Manually click **👨‍🏫 Tutor Profile** link
6. Verify theme is light

**Repeat for:**
- **Test 2: Dark → Navigate** → Click Student Profile
- **Test 3: Clear → Navigate** → Click any profile (should use default theme)

---

### Test 9: Auto-Refresh Monitoring

**What to do:**
1. On debug page
2. Click the button: **⏱️ Auto-Refresh (OFF)**
3. It changes to: **⏱️ Auto-Refresh (ON)**
4. Watch the **Event Log** panel
5. Every 1 second, you'll see: `[--:--:--] Refreshing state...`
6. Open browser console (F12)
7. Type:
   ```javascript
   document.documentElement.setAttribute('data-theme', 'light')
   ```
8. Press Enter
9. Watch the **Current State** panel update automatically

**What you should see:**
- State panel updates every second
- Shows real-time changes

**Turn off auto-refresh:**
- Click **⏱️ Auto-Refresh (ON)** again

---

### Test 10: Color Palette Persistence

**What to do:**
1. On debug page, click **🌙 Apply Dark**
2. Open browser console (F12)
3. Manually set a color palette:
   ```javascript
   if (typeof appearanceModalManager !== 'undefined') {
       appearanceModalManager.settings.colorPalette = 'ocean-blue';
       appearanceModalManager.saveSettings();
       appearanceModalManager.applySettings();
   }
   ```
4. Look at buttons - they should turn blue
5. Click **📋 Copy Results**
6. Verify `colorPalette: "ocean-blue"` is in the results
7. Navigate to **👨‍🏫 Tutor Profile**
8. Check if buttons are still blue

✅ **If buttons stay blue → Color palette persists!**

---

## Troubleshooting

### Issue 1: "Manager not available" in results

**Symptoms:**
```
Manager Loaded: NO ✗
Manager Settings: NOT AVAILABLE
```

**Cause:** appearance-manager.js not loading on this page

**Solution:**
1. This is **normal** for the debug page itself
2. Navigate to a profile page (tutor-profile, student-profile)
3. Then check again - Manager should be `YES ✓`

---

### Issue 2: Theme flashes when navigating

**Symptoms:**
- Page loads light
- Then switches to dark (or vice versa)
- Takes 0.5-1 second

**Diagnosis:**
1. Open tutor-profile in browser
2. Open Console (F12)
3. Reload page (Ctrl+R)
4. Look for these logs:
   ```
   [DOMContentLoaded] theme-toggle.js initialized
   [DOMContentLoaded] appearance-manager.js initialized
   [window.load] Reapplying ALL settings after page load
   ```

**If you see:**
```
✓ DOMContentLoaded logs
✗ NO window.load log
```

**Cause:** window.load handler not firing

**Fix:** Check [appearance-manager.js](js/common-modals/appearance-manager.js:75-82) has:
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

---

### Issue 3: Consistency checks show red X marks

**Symptoms:**
```
❌ HTML data-theme (light) does NOT match appearance_settings.theme (dark)
```

**Diagnosis:**
1. Click **📋 Copy Results**
2. Look at the **CURRENT STATE** section
3. Compare values:

**Example broken state:**
```
HTML data-theme: light
localStorage.appearance_settings: {"theme":"dark"}
Manager Settings: {"theme":"dark"}
```

**This means:** localStorage says dark, but HTML shows light

**Fix:**
1. Click **✅ Reapply** button
2. Click **🔄 Refresh**
3. Click **✅ Check Consistency** again
4. If still broken → appearance-manager.js not applying theme correctly

---

### Issue 4: All checks green but theme doesn't persist

**Symptoms:**
- Debug page shows all green
- But navigating to tutor-profile resets theme

**Diagnosis:**
1. On debug page: Apply Dark → All green
2. Navigate to tutor-profile
3. Open console immediately
4. Check:
   ```javascript
   localStorage.getItem('appearance_settings')
   ```

**If it shows:**
- `null` or `undefined` → localStorage cleared during navigation (very rare)
- `{"theme":"dark"}` but page is light → window.load handler not reapplying

**Fix:**
1. Clear browser cache: `Ctrl+Shift+Delete`
2. Check "Cached images and files"
3. Click "Clear data"
4. Reload and test again

---

### Issue 5: Copy Results button doesn't work

**Symptoms:**
- Click **📋 Copy Results**
- Nothing happens or error appears

**Cause:** Clipboard API blocked (some browsers require HTTPS)

**Workaround:**
1. Click **📄 Export Report** instead
2. Download JSON file
3. Open in text editor

---

## Quick Reference Commands

### Check theme in console:
```javascript
// Current theme
document.documentElement.getAttribute('data-theme')

// LocalStorage theme
localStorage.getItem('appearance_settings')

// Manager settings
appearanceModalManager?.settings
```

### Force reapply theme:
```javascript
if (typeof appearanceModalManager !== 'undefined') {
    appearanceModalManager.applySettings();
}
```

### Clear everything:
```javascript
localStorage.clear();
location.reload();
```

### Monitor theme changes:
```javascript
new MutationObserver(m => m.forEach(mut => {
    if (mut.attributeName === 'data-theme') {
        console.log('Theme changed to:', document.documentElement.getAttribute('data-theme'));
    }
})).observe(document.documentElement, { attributes: true });
```

---

## Expected Results Summary

### ✅ WORKING (Success)

**When you navigate from advertiser-profile to tutor-profile:**
1. Set dark theme on advertiser-profile
2. Navigate to tutor-profile
3. Page loads **dark immediately**
4. No flash, no delay
5. Consistency check shows all green
6. localStorage matches HTML theme

**Debug page should show:**
```
HTML data-theme: dark ✓
localStorage.appearance_settings: {"theme":"dark"} ✓
Manager Loaded: YES ✓
Manager Settings: {"theme":"dark"} ✓

Consistency Checks: ALL PASSED ✓
```

### ❌ NOT WORKING (Failure)

**When theme does NOT persist:**
1. Set dark theme on advertiser-profile
2. Navigate to tutor-profile
3. Page loads **light** (or flashes)
4. Consistency check shows red X marks
5. localStorage says "dark" but HTML shows "light"

**Debug page should show:**
```
HTML data-theme: light ✗
localStorage.appearance_settings: {"theme":"dark"} ✓
Manager Loaded: YES ✓
Manager Settings: {"theme":"dark"} ✓

❌ HTML data-theme (light) does NOT match appearance_settings.theme (dark)
```

---

## What to Do Next

### If All Tests Pass ✅
1. Theme persistence is working!
2. The fix is complete
3. You can safely use the appearance system
4. Optional: Delete debug files or keep for future testing

### If Tests Fail ❌
1. Click **📋 Copy Results**
2. Save to file: `debug-results.txt`
3. Note which specific test failed:
   - Test 5? Theme doesn't persist to tutor-profile
   - Test 6? Theme doesn't persist to student-profile
   - Test 7? Theme doesn't persist to other profiles
4. Share the debug results for analysis

---

## Files Reference

**Debug Tools:**
- `cross-page-persistence-debug.html` - Main debug dashboard (this tool)
- `appearance-debug-console.js` - Injectable debug console
- `DEBUG_PAGE_STEP_BY_STEP_GUIDE.md` - This guide
- `CROSS_PAGE_PERSISTENCE_TEST_GUIDE.md` - Detailed test scenarios

**Core Files:**
- `js/common-modals/appearance-manager.js` - Main appearance system
- `js/root/theme-toggle.js` - Old theme toggle (navbar)
- `profile-pages/tutor-profile.html` - Profile page
- `profile-pages/student-profile.html` - Profile page

---

## Time Estimates

- **Quick test:** 2 minutes (Test 1-3)
- **Basic verification:** 5 minutes (Test 1-4)
- **Cross-page testing:** 10 minutes (Test 5-7)
- **Full testing:** 20 minutes (All tests)

---

## Support Checklist

Before asking for help, verify:

- [ ] Both servers running (backend port 8000, frontend port 8081)
- [ ] Opened correct URL: `http://localhost:8081/cross-page-persistence-debug.html`
- [ ] Clicked **Refresh** button
- [ ] Clicked **Check Consistency** button
- [ ] Clicked **Copy Results** and saved output
- [ ] Tested navigation to at least 2 different profile pages
- [ ] Cleared browser cache and tested again
- [ ] Checked browser console (F12) for errors

---

## Success Message

When everything works, you should see:

```
✅ All consistency checks passed!
```

And when navigating between pages:
- ✅ Theme persists
- ✅ No flash
- ✅ Immediate theme application
- ✅ All values match

**That's it! Your appearance system is working perfectly! 🎉**
