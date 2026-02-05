# Role Switch Race Condition - Fixed

## Problem Summary

When switching roles (e.g., student → tutor), users were being redirected back to the homepage even though the role switch was successful. The issue occurred **8 seconds after the page loaded** - right after the grace period flags were cleared.

## Root Cause

The bug was caused by a **race condition** with the grace period management:

1. **Role Switch Succeeds** - API updates database, localStorage updated with new role
2. **Navigation Happens** - Browser navigates to new profile page
3. **Page Loads** - `AuthManager.restoreSession()` runs
4. **Race Condition**:
   - `restoreSession()` loads `currentUser` from localStorage
   - **BUT**: The user object in localStorage may still have the **old role** from before navigation
   - The grace period check happens **AFTER** `restoreSession()` loads the stale user object
5. **Grace Period Cleared Prematurely** - Page init clears the flags immediately
6. **8 Seconds Later** - Another script checks the role → finds the wrong role → redirects user

### Specific Issue

In `auth.js`, the `restoreSession()` function was loading the user object from localStorage **without checking if a role switch was in progress**. This meant it would load stale data from before the role switch.

Then, the page-specific init files (tutor-profile, student-profile, etc.) were **clearing the grace period flags immediately** upon detection, leaving no protection for subsequent validation checks that happened within the same page load.

## Solution

### 1. Made `AuthManager.restoreSession()` Grace-Period Aware

**File**: `js/root/auth.js`

Added grace period detection **before** loading the user object:

```javascript
// CRITICAL FIX: Check if role switch is in progress (within 10s grace period)
const switchTimestamp = localStorage.getItem('role_switch_timestamp');
const targetRole = localStorage.getItem('role_switch_target');

if (switchTimestamp && targetRole) {
    const timeSinceSwitch = Date.now() - parseInt(switchTimestamp);
    const isWithinGracePeriod = timeSinceSwitch < 10000;

    if (isWithinGracePeriod) {
        // FORCE the user object to have the target role (override any stale data)
        this.user.active_role = targetRole;
        this.user.role = targetRole;
        localStorage.setItem('userRole', targetRole);
    } else {
        // Grace period expired - clear the flags
        localStorage.removeItem('role_switch_timestamp');
        localStorage.removeItem('role_switch_target');
    }
}
```

**Key Points**:
- Checks grace period **immediately** after loading user from localStorage
- **Forces** the user object to have the correct role during grace period
- Clears expired flags automatically
- Ensures `AuthManager.user.active_role` is always correct

### 2. Stopped Premature Grace Period Flag Clearing

**Files Updated**:
- `js/tutor-profile/init.js`
- `js/student-profile/init.js`
- `js/parent-profile/parent-profile.js`
- `js/advertiser-profile/advertiser-profile.js`

**Change**: Removed the immediate clearing of grace period flags:

```javascript
if (isWithinGracePeriod) {
    // DON'T clear the flags here - let them expire naturally
    // This ensures any subsequent checks within the grace period still pass
    // The flags will be cleared by AuthManager.restoreSession() when they expire
    console.log('✅ Grace period will expire in ${10000 - timeSinceSwitch}ms');
}
```

**Why This Works**:
- Flags stay active for the full 10 seconds
- Any subsequent role checks within that window will still see the flags
- Flags are auto-cleared by `AuthManager.restoreSession()` when they expire
- No more race conditions between different validation checks

## How It Works Now

### Timeline of Events (Fixed)

```
T+0ms:    User clicks "Switch to Tutor"
T+100ms:  API call succeeds
          - Database updated: active_role = 'tutor'
          - localStorage.userRole = 'tutor'
          - localStorage.currentUser updated
          - AuthManager.user.active_role = 'tutor'
          - Grace period flags set (timestamp + target)

T+200ms:  Navigation to tutor-profile.html

T+300ms:  Page starts loading

T+400ms:  AuthManager.restoreSession() runs
          - Loads user from localStorage
          - ✅ DETECTS grace period flags
          - ✅ FORCES user.active_role = 'tutor'
          - Does NOT clear flags yet

T+500ms:  Page init.js runs
          - Checks grace period (still valid)
          - ✅ Skips validation (grace period active)
          - Does NOT clear flags

T+2000ms: Another script checks role
          - Reads AuthManager.user.active_role
          - ✅ Returns 'tutor' (correct!)
          - Grace period still active

T+8000ms: Grace period still active
          - No redirects
          - User stays on page

T+10001ms: Grace period expires
          - Next call to restoreSession() clears flags
          - Normal validation resumes
          - Everything works because role is correct
```

## Benefits

1. **Race Condition Eliminated**: Grace period flags protect against all validation checks
2. **Centralized Cleanup**: Flags are cleared in one place (AuthManager)
3. **Defensive**: Even if localStorage has stale data, grace period overrides it
4. **Debuggable**: Better logging shows exactly when grace period is active/expired

## Testing

To verify the fix works:

1. Log in as a user with multiple roles
2. Switch to a different role
3. Page should load successfully
4. No redirects should occur within 10 seconds
5. Check console logs - should see grace period detection messages

## Files Modified

- `js/root/auth.js` - Added grace period detection to `restoreSession()`
- `js/tutor-profile/init.js` - Removed premature flag clearing
- `js/student-profile/init.js` - Removed premature flag clearing
- `js/parent-profile/parent-profile.js` - Removed premature flag clearing
- `js/advertiser-profile/advertiser-profile.js` - Removed premature flag clearing

## Related Documentation

See also:
- `ROLE_SWITCHING_COMPLETE_FIX.md` - Previous role switching fixes
- `AUTH_VS_ROLE_STATE_ANALYSIS.md` - Analysis of role state management
