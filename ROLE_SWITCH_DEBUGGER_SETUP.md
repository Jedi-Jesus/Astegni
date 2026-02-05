# Role Switch Debugger - Setup Instructions

## What This Does

The Role Switch Debugger is an **embedded debug panel** that appears on the right side of your screen and captures all role-switching events in real-time. Unlike the standalone HTML version, this runs **in the same window** as your application, so it can capture all console logs.

## Setup (2 Minutes)

### Step 1: Add the Script to Your Profile Pages

Add this line to **each profile page** HTML file, in the `<head>` section (before the closing `</head>` tag):

```html
<!-- Role Switch Debugger (remove in production) -->
<script src="../js/utils/role-switch-debugger.js"></script>
```

**Files to update:**
- `profile-pages/tutor-profile.html`
- `profile-pages/student-profile.html`
- `profile-pages/parent-profile.html`
- `profile-pages/user-profile.html`
- `profile-pages/advertiser-profile.html`

**Example:**
```html
<head>
    <meta charset="UTF-8">
    <title>ASTEGNI - Tutor Profile</title>

    <!-- ... other scripts ... -->

    <!-- Role Switch Debugger (remove in production) -->
    <script src="../js/utils/role-switch-debugger.js"></script>
</head>
```

### Step 2: Hard Refresh Your Browser

Press **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac) to force reload the page with no cache.

## How to Use

### Toggle the Debug Panel

Press **Ctrl+Shift+D** to show/hide the debug panel.

The panel will slide in from the right side of the screen.

### What You'll See

**📊 Statistics (Top Section)**
- **TOTAL**: Total number of events captured
- **SUCCESS**: Successful role switches
- **ERRORS**: Failed switches or errors
- **CURRENT STATUS**: Real-time status of role switching

**🎛️ Controls**
- **🗑️ Clear**: Clear all logs
- **🧹 Clear Flags**: Remove `role_switch_timestamp` and `role_switch_target` from localStorage
- **📸 Snapshot**: Capture current state (localStorage, URL, timestamp)
- **📋 Copy**: Copy all logs to clipboard in formatted text (perfect for sharing!)
- **💾 Export**: Download all logs as JSON file

**📋 Event Log (Main Section)**
- Shows all role-switching related console logs
- Color-coded by type (info, success, error, warning)
- Highlights important keywords like `role_switch_timestamp`, `null`, `Grace period`
- Auto-scrolls to latest events
- Timestamps for each event

## Testing Role Switching

1. **Open a profile page** (e.g., `http://localhost:8081/profile-pages/student-profile.html`)

2. **Press Ctrl+Shift+D** to open the debug panel

3. **Click "Clear Flags"** to clear any old timestamps

4. **Switch roles** using the navbar dropdown (e.g., Student → Tutor)

5. **Watch the debug panel** - it will show:
   - `[switchToRole]` - When you click the role switcher
   - `PRE-NAVIGATION STATE` - Before navigation
   - `[checkRolePageMismatch]` - When the new page checks roles
   - `[TutorProfile]` or `[StudentProfile]` - Profile init.js checks

## What to Look For

### ✅ Successful Role Switch

You should see logs like this:

```
[switchToRole] Set role_switch_timestamp: 1737847200000 for role: tutor
[switchToRole] ========== PRE-NAVIGATION STATE ==========
  localStorage.role_switch_timestamp: 1737847200000
  localStorage.role_switch_target: tutor
  Timestamp age: 100 ms
============================================

[NEW PAGE LOADS]

[profile-system.checkRolePageMismatch] ========== FUNCTION CALLED ==========
[profile-system.checkRolePageMismatch] localStorage.role_switch_timestamp: 1737847200000
[profile-system.checkRolePageMismatch] Timestamp age: 250 ms
[profile-system.checkRolePageMismatch] Is within grace period? true
[profile-system.checkRolePageMismatch] ✅ Role switch in progress - COMPLETELY SKIPPING all checks
[profile-system.checkRolePageMismatch] ========== EARLY RETURN ==========

🔍 [TutorProfile] Grace Period Check: {switchTimestamp: "1737847200000", targetRole: "tutor"}
✅ [TutorProfile] Role switch detected (within 10s grace period) - allowing page load
✅ [TutorProfile] Skipping role validation (user just switched roles)
```

**Stats should show:**
- TOTAL: 15+ events
- SUCCESS: 1
- CURRENT STATUS: "⏸️ No active switch" (after completed)

### ❌ Failed Role Switch

If you see:

```
[profile-system.checkRolePageMismatch] localStorage.role_switch_timestamp: null
```

This means the timestamp was never set or was cleared prematurely.

If you see:

```
[profile-system.checkRolePageMismatch] Timestamp age: 15000 ms
[profile-system.checkRolePageMismatch] Is within grace period? false
```

This means too much time passed (>10 seconds).

If you see:

```
[profile-system] Role mismatch detected: page=tutor, active=student
[profile-system] Redirecting to student profile page...
```

This means `checkRolePageMismatch()` redirected you back.

## Share Logs for Analysis

If the issue persists, you have two options to share the logs:

### Option 1: Copy to Clipboard (Easiest)

1. Press **Ctrl+Shift+D** to open the debug panel
2. Switch roles to reproduce the issue
3. Click **📋 Copy** button
4. Paste directly into your message (Ctrl+V)

The copied text includes:
- Statistics summary
- Current localStorage state
- All event logs with timestamps
- Clean, formatted text ready to share

### Option 2: Export as JSON File

1. Press **Ctrl+Shift+D** to open the debug panel
2. Switch roles to reproduce the issue
3. Click **💾 Export** button
4. Share the downloaded JSON file

The JSON file contains:
- All captured logs with timestamps
- Statistics (total, success, errors)
- Current localStorage state

## Keyboard Shortcuts

- **Ctrl+Shift+D**: Toggle debug panel
- **Ctrl+Shift+R**: Hard refresh browser (reload with no cache)

## Tips

1. **Keep the panel open** while testing - it auto-updates in real-time
2. **Click "Clear Flags"** before each test to ensure clean state
3. **Watch for the highlighted keywords** - they show important values
4. The panel **auto-scrolls** to show latest events
5. **Separators** appear between major events for easier reading

## Removing the Debugger (Production)

Before deploying to production, remove the debugger script:

```html
<!-- DELETE THIS LINE: -->
<script src="../js/utils/role-switch-debugger.js"></script>
```

Or use a conditional include:

```html
<!-- Only load in development -->
<script>
    if (window.location.hostname === 'localhost') {
        document.write('<script src="../js/utils/role-switch-debugger.js"><\/script>');
    }
</script>
```

## Advantages Over Standalone HTML Version

✅ **Captures all logs** - Runs in same window as your app
✅ **Always visible** - Slides in from the side, doesn't require separate tab
✅ **Keyboard shortcut** - Toggle with Ctrl+Shift+D
✅ **Real-time updates** - No refresh needed
✅ **Beautiful UI** - Color-coded, animated, easy to read
✅ **Export capability** - Download logs as JSON
✅ **State snapshots** - Capture localStorage state at any time

---

**Status:** Ready to use
**Location:** [js/utils/role-switch-debugger.js](js/utils/role-switch-debugger.js)
**Activation:** Ctrl+Shift+D after adding script to HTML pages
