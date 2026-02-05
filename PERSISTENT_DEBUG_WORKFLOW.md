# Persistent Debug Console - Workflow Guide

## What This Does

This debug console **stays open** while you navigate between pages and automatically tracks appearance inconsistencies.

## Setup (30 seconds)

### Step 1: Open Any Profile Page
```
http://localhost:8081/profile-pages/advertiser-profile.html
```

### Step 2: Inject Debug Console
1. Press `F12` to open Browser DevTools
2. Go to **Console** tab
3. Copy the entire contents of `persistent-debug-console.js`
4. Paste into console
5. Press `Enter`

You should see:
```
✅ Persistent Debug Console Loaded
```

A floating panel appears in the bottom-right corner.

---

## Testing Color Palette Persistence (THE CRITICAL TEST)

### Scenario: Set Color Palette in Advertiser → Check Tutor Profile

**Step 1: Set Color Palette in Advertiser Profile**

1. You should be on `advertiser-profile.html`
2. The debug console is open (bottom-right)
3. Click **Settings → Appearance** (on the page, not debug console)
4. Select **Ocean Blue** color palette
5. Close the appearance modal
6. **In the debug console**, click **📸 Snapshot**
7. You should see:
   ```
   📊 Snapshots (1)
   #1  [6:40:00 PM]
   /profile-pages/advertiser-profile.html
   HTML: light | LS: light
   Palette: ocean-blue
   ```

**Step 2: Navigate to Tutor Profile**

1. In your browser's address bar, navigate to:
   ```
   http://localhost:8081/profile-pages/tutor-profile.html
   ```
2. **WATCH THE PAGE CAREFULLY:**
   - Are buttons ocean-blue?
   - Or are they amber (default)?
3. **In the debug console**, click **📸 Snapshot**
4. You should see:
   ```
   📊 Snapshots (2)
   #2  [6:40:15 PM]
   /profile-pages/tutor-profile.html
   HTML: light | LS: light
   Palette: ocean-blue (or astegni-classic if broken)
   ```

**Step 3: Compare Results**

1. In the debug console, click **🔄 Compare**
2. Look at the **⚠️ Inconsistencies Detected** section

**WORKING (Expected):**
```
✅ Consistency Verified
✅ Theme persisted correctly
✅ HTML matches localStorage
✅ Color palette preserved
```

**BROKEN (What you're seeing):**
```
❌ Inconsistencies Detected
⚠️ Color palette CHANGED: "ocean-blue" → "astegni-classic"
```

---

## What Each Button Does

### 📸 Snapshot
- Captures current state (theme, color palette, page)
- Adds to snapshot list
- Click this BEFORE and AFTER navigation

### 🔄 Compare
- Compares last 2 snapshots
- Shows inconsistencies
- Click this AFTER taking 2 snapshots

### 📋 Copy
- Copies all snapshots and logs to clipboard
- Paste into a text file to save

---

## The Workflow

```
1. advertiser-profile.html
   ↓
2. Set color palette to "Ocean Blue"
   ↓
3. Click 📸 Snapshot
   ↓
4. Navigate to tutor-profile.html
   ↓
5. Click 📸 Snapshot
   ↓
6. Click 🔄 Compare
   ↓
7. See if palette changed
```

---

## What to Look For

### Quick Snapshot Panel

This updates automatically:

```
📸 Quick Snapshot
data-theme: light
localStorage: light
Manager: light
Consistent: ✅ YES (or ❌ NO)
```

If you see `❌ NO`, there's a mismatch between HTML and localStorage.

### Snapshots List

After taking 2 snapshots:

```
📊 Snapshots (2)

#1  [6:40:00 PM]
/profile-pages/advertiser-profile.html
HTML: light | LS: light
Palette: ocean-blue

#2  [6:40:15 PM]
/profile-pages/tutor-profile.html
HTML: light | LS: light
Palette: astegni-classic  ← CHANGED!
```

If palette changed → Broken persistence

---

## Test Scenarios

### Test 1: Ocean Blue Palette
1. advertiser-profile → Set Ocean Blue → Snapshot
2. tutor-profile → Snapshot → Compare
3. **Expected:** Palette should stay "ocean-blue"
4. **Actual (your issue):** Palette reverts to "astegni-classic"

### Test 2: Dark Theme
1. advertiser-profile → Set Dark → Snapshot
2. tutor-profile → Snapshot → Compare
3. **Expected:** Theme should stay "dark"
4. **Actual:** You said this partially works

### Test 3: Light Theme
1. advertiser-profile → Set Light → Snapshot
2. tutor-profile → Snapshot → Compare
3. **Expected:** Theme should stay "light"
4. **Actual:** You said this doesn't work well

---

## Common Results

### Result A: Theme Persists, Palette Doesn't
```
Snapshot #1: advertiser-profile
  Theme: dark ✓
  Palette: ocean-blue ✓

Snapshot #2: tutor-profile
  Theme: dark ✓ (persisted!)
  Palette: astegni-classic ✗ (reset!)
```

**This means:**
- Theme system works
- Color palette system broken

### Result B: Theme Flashes
```
Event Log:
[6:40:15] Navigation: /advertiser-profile.html → /tutor-profile.html
[6:40:15] Theme changed to: light
[6:40:16] Theme changed to: dark
```

**This means:**
- Race condition
- Page loads light, then switches to dark

### Result C: Both Broken
```
Snapshot #1: advertiser-profile
  Theme: dark
  Palette: ocean-blue

Snapshot #2: tutor-profile
  Theme: light ✗
  Palette: astegni-classic ✗
```

**This means:**
- Neither persists
- Major issue with appearance manager

---

## After Testing

1. Click **📋 Copy** in debug console
2. Paste into notepad
3. Save as `debug-report.txt`
4. Share the report

The report will show:
- All snapshots you took
- Which values changed
- Event log (theme changes, navigation)

---

## Tips

**Tip 1: Keep Console Open**
The debug console stays on screen even when you navigate. No need to re-inject.

**Tip 2: Take Snapshots Immediately**
After navigating, click Snapshot right away before any delayed theme application.

**Tip 3: Watch Event Log**
The event log shows when themes change. If you see multiple theme changes in quick succession, that's a race condition.

**Tip 4: Test Multiple Palettes**
Try different palettes to confirm they all fail:
- Ocean Blue
- Forest Green
- Sunset Orange
- Purple Dream

---

## Expected Behavior (When Fixed)

```
📊 Snapshots (2)

#1  [6:40:00 PM]
/profile-pages/advertiser-profile.html
HTML: dark | LS: dark
Palette: ocean-blue

#2  [6:40:15 PM]
/profile-pages/tutor-profile.html
HTML: dark | LS: dark
Palette: ocean-blue  ← SAME! ✓

🔄 Compare:
✅ Consistency Verified
✅ Theme persisted correctly
✅ HTML matches localStorage
✅ Color palette preserved
```

---

## Quick Commands

If you need to manually check values:

```javascript
// Check localStorage
JSON.parse(localStorage.getItem('appearance_settings'))

// Check current palette
document.documentElement.getAttribute('data-color-palette')

// Check manager settings
appearanceModalManager?.settings
```

---

## Summary

This persistent debug console:
1. ✅ Stays open across navigation
2. ✅ Tracks state automatically
3. ✅ Shows inconsistencies visually
4. ✅ Compares before/after snapshots
5. ✅ Identifies exactly what changed

Use it to prove that color palettes aren't persisting from advertiser → tutor/student profiles.
