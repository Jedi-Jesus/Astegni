# Role Switching Debug Fix - Enhanced Logging

## Problem
User still seeing the prompt "This page is for [role] only..." when switching roles via navbar dropdown, despite previous grace period fixes.

## Root Cause Analysis

Based on console output showing:
```
[profile-system] Role mismatch detected: page=tutor, active=student
[profile-system] Redirecting to student profile page...
🔍 [TutorProfile] Grace Period Check: {switchTimestamp: null, targetRole: null, ...}
```

The issue is that `switchTimestamp` is **NULL** when the new page loads. This means either:
1. The timestamp was never set properly
2. The timestamp was cleared before the new page could check it
3. There's a timing/race condition between setting and checking

## Investigation Strategy

The key question is: **WHERE is the timestamp being cleared or why is it NULL?**

Possible causes:
1. `checkRolePageMismatch()` is clearing it prematurely (despite the 10s grace period)
2. LocalStorage isn't persisting between page navigations (browser issue)
3. The timestamp is being set but immediately cleared by another function
4. The 100ms delay isn't enough for localStorage to sync

## Changes Made

### 1. Enhanced Logging in `checkRolePageMismatch()`

Added comprehensive logging to track:
- When the function is called
- What the current timestamp is
- Whether it's within the grace period
- Why it's skipping or not skipping checks

**File:** [js/root/profile-system.js](js/root/profile-system.js:1765-1798)

```javascript
function checkRolePageMismatch() {
    console.log('[profile-system.checkRolePageMismatch] ========== FUNCTION CALLED ==========');
    console.log('[profile-system.checkRolePageMismatch] Current time:', Date.now());
    console.log('[profile-system.checkRolePageMismatch] URL:', window.location.pathname);
    console.log('[profile-system.checkRolePageMismatch] userRole variable:', userRole);

    const switchTimestamp = localStorage.getItem('role_switch_timestamp');
    const targetRole = localStorage.getItem('role_switch_target');

    console.log('[profile-system.checkRolePageMismatch] localStorage.role_switch_timestamp:', switchTimestamp);
    console.log('[profile-system.checkRolePageMismatch] localStorage.role_switch_target:', targetRole);

    if (switchTimestamp) {
        const timeSinceSwitch = Date.now() - parseInt(switchTimestamp);
        const isWithinGracePeriod = timeSinceSwitch < 10000;

        console.log('[profile-system.checkRolePageMismatch] Timestamp age:', timeSinceSwitch, 'ms');
        console.log('[profile-system.checkRolePageMismatch] Is within grace period?', isWithinGracePeriod);

        if (isWithinGracePeriod) {
            console.log('[profile-system.checkRolePageMismatch] ✅ Role switch in progress to:', targetRole, '- COMPLETELY SKIPPING all checks');
            console.log('[profile-system.checkRolePageMismatch] ========== EARLY RETURN ==========');
            return; // Skip ALL checks
        } else {
            console.log('[profile-system.checkRolePageMismatch] ⏰ Grace period expired, clearing flags');
            localStorage.removeItem('role_switch_timestamp');
            localStorage.removeItem('role_switch_target');
        }
    } else {
        console.log('[profile-system.checkRolePageMismatch] No timestamp found - not a role switch');
    }

    // ... rest of function
}
```

### 2. Enhanced Logging in `switchToRole()`

Added timestamp age logging to verify how much time passes before navigation:

**File:** [js/root/profile-system.js](js/root/profile-system.js:1649-1657)

```javascript
console.log('[switchToRole] ========== PRE-NAVIGATION STATE ==========');
console.log('  Target URL:', profileUrl);
console.log('  localStorage.role_switch_timestamp:', localStorage.getItem('role_switch_timestamp'));
console.log('  localStorage.role_switch_target:', localStorage.getItem('role_switch_target'));
console.log('  localStorage.userRole:', localStorage.getItem('userRole'));
console.log('  Time until expiry:', 10000 - (Date.now() - parseInt(localStorage.getItem('role_switch_timestamp'))), 'ms');
console.log('  Timestamp age:', Date.now() - parseInt(localStorage.getItem('role_switch_timestamp')), 'ms');
console.log('  Current time:', Date.now());
console.log('============================================');
```

## Testing Instructions

### Step 1: Clear Console and LocalStorage
1. Open browser DevTools (F12)
2. Go to Console tab
3. Clear console (Ctrl+L or click Clear icon)
4. Run this in console to clear old timestamps:
   ```javascript
   localStorage.removeItem('role_switch_timestamp');
   localStorage.removeItem('role_switch_target');
   ```

### Step 2: Hard Refresh
1. Press **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
2. This forces browser to reload ALL JavaScript files with no cache

### Step 3: Test Role Switch
1. Make sure you're logged in with multiple roles (e.g., Student and Tutor)
2. Navigate to one profile page (e.g., student-profile.html)
3. Click the navbar role dropdown (your name/profile icon)
4. Select a different role (e.g., "Tutor")

### Step 4: Analyze Console Output

**Expected Output (if working correctly):**

```
[switchToRole] Set role_switch_timestamp: 1737847200000 for role: tutor
[switchToRole] ========== PRE-NAVIGATION STATE ==========
  Target URL: profile-pages/tutor-profile.html
  localStorage.role_switch_timestamp: 1737847200000
  localStorage.role_switch_target: tutor
  localStorage.userRole: tutor
  Time until expiry: 9900 ms
  Timestamp age: 100 ms
  Current time: 1737847200100
============================================

[NEW PAGE LOADS - tutor-profile.html]

[profile-system.checkRolePageMismatch] ========== FUNCTION CALLED ==========
[profile-system.checkRolePageMismatch] Current time: 1737847200250
[profile-system.checkRolePageMismatch] URL: /profile-pages/tutor-profile.html
[profile-system.checkRolePageMismatch] userRole variable: tutor
[profile-system.checkRolePageMismatch] localStorage.role_switch_timestamp: 1737847200000
[profile-system.checkRolePageMismatch] localStorage.role_switch_target: tutor
[profile-system.checkRolePageMismatch] Timestamp age: 250 ms
[profile-system.checkRolePageMismatch] Is within grace period? true
[profile-system.checkRolePageMismatch] ✅ Role switch in progress to: tutor - COMPLETELY SKIPPING all checks
[profile-system.checkRolePageMismatch] ========== EARLY RETURN ==========

🔍 [TutorProfile] Grace Period Check: {switchTimestamp: "1737847200000", targetRole: "tutor", ...}
🔍 [TutorProfile] Time since switch: 300ms, Grace period valid: true
✅ [TutorProfile] Role switch detected (within 10s grace period) - allowing page load
✅ [TutorProfile] Skipping role validation (user just switched roles)
```

**Problem Indicators (if still broken):**

Look for these red flags:
1. **Timestamp is NULL on new page:**
   ```
   [profile-system.checkRolePageMismatch] localStorage.role_switch_timestamp: null
   ```
   → This means localStorage isn't persisting between pages

2. **Grace period expired:**
   ```
   [profile-system.checkRolePageMismatch] Timestamp age: 15000 ms
   [profile-system.checkRolePageMismatch] Is within grace period? false
   ```
   → This means too much time passed (>10 seconds)

3. **Role mismatch detected:**
   ```
   [profile-system] Role mismatch detected: page=tutor, active=student
   ```
   → This means `userRole` variable is out of sync with the page

4. **Timestamp never set:**
   ```
   [switchToRole] ========== PRE-NAVIGATION STATE ==========
   localStorage.role_switch_timestamp: null
   ```
   → This means the timestamp setting failed

### Step 5: Copy Full Console Output

If the issue persists:
1. Right-click in console
2. Select "Save as..." or copy all text
3. Share the COMPLETE console output showing:
   - The PRE-NAVIGATION STATE logs
   - The checkRolePageMismatch() logs
   - The TutorProfile/StudentProfile init logs
   - Any error messages

## What We're Looking For

The enhanced logging will help us identify:

1. **Is the timestamp being set?**
   - Check PRE-NAVIGATION STATE logs

2. **Is the timestamp persisting to the new page?**
   - Check checkRolePageMismatch() localStorage logs

3. **How much time passes between pages?**
   - Compare timestamps: (new page time) - (timestamp value) = age

4. **Is checkRolePageMismatch() being called at all?**
   - Look for "FUNCTION CALLED" log

5. **Why is it redirecting?**
   - Look for "Role mismatch detected" or "Grace period expired"

## Potential Next Steps (Based on Results)

### If timestamp is NULL:
- LocalStorage bug in browser
- Try sessionStorage as fallback
- Investigate browser extensions blocking localStorage

### If grace period expired:
- Increase grace period to 30 seconds
- Investigate what's causing the delay

### If userRole variable is wrong:
- Race condition in initialize() function
- Need to delay checkRolePageMismatch() call

### If timestamp is set correctly but still redirecting:
- Logic error in grace period check
- Need to add more early returns

## Files Modified

1. [js/root/profile-system.js](js/root/profile-system.js)
   - Lines 1765-1799: Enhanced `checkRolePageMismatch()` logging
   - Lines 1649-1657: Enhanced `switchToRole()` pre-navigation logging

## Success Criteria

✅ NO alert/prompt appears when switching roles
✅ Console shows timestamp being set before navigation
✅ Console shows timestamp being detected on new page
✅ Console shows grace period check returning early
✅ User lands on correct profile page without bouncing back

---

**Status:** Debug logging added, awaiting test results
**Date:** 2026-01-25
**Next Action:** User needs to test role switching and share console output
