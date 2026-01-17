# Active Role Timing Fix - FINAL

## The Problem (From Your Console)

```
chat-call-modal.js:85 [StandaloneChatCall] No profile found for active role: null
```

The standalone call modal was trying to connect to WebSocket **before** `localStorage.getItem('active_role')` was set, causing it to fail with `active_role: null`.

## Why This Happens

**Timeline:**
1. Page loads HTML
2. `chat-call-modal.js` loads and executes immediately
3. `StandaloneChatCallManager.initialize()` runs
4. `initializeStandaloneWebSocket()` tries to get `active_role`
5. **BUT** `active_role` hasn't been set yet! ❌
6. Later, `auth.js` sets `active_role` in localStorage
7. Too late - WebSocket already failed to connect

## The Solution

I've updated the StandaloneChatCallManager to:

1. **Detect role from URL** if `active_role` not set
2. **Fallback to user data** if URL detection fails
3. **Retry after 2 seconds** if still can't determine role

### Code Changes

**File:** `js/common-modals/chat-call-modal.js`
**Lines:** 68-117

```javascript
let activeRole = localStorage.getItem('active_role');

// If active_role not set yet, try to detect from URL or user data
if (!activeRole) {
    console.log('[StandaloneChatCall] active_role not set, detecting from page...');

    // Try to detect from URL path
    const path = window.location.pathname.toLowerCase();
    if (path.includes('tutor-profile') && userData.tutor_profile_id) {
        activeRole = 'tutor';
    } else if (path.includes('student-profile') && userData.student_profile_id) {
        activeRole = 'student';
    } else if (path.includes('parent-profile') && userData.parent_profile_id) {
        activeRole = 'parent';
    } else if (path.includes('advertiser-profile') && userData.advertiser_profile_id) {
        activeRole = 'advertiser';
    } else {
        // Default to first available profile
        if (userData.tutor_profile_id) activeRole = 'tutor';
        else if (userData.student_profile_id) activeRole = 'student';
        else if (userData.parent_profile_id) activeRole = 'parent';
        else if (userData.advertiser_profile_id) activeRole = 'advertiser';
    }

    console.log('[StandaloneChatCall] Detected role:', activeRole);
}

// ... get profile ID ...

if (!profileId) {
    console.log('[StandaloneChatCall] No profile found for active role:', activeRole);
    // Retry after 2 seconds (active_role might be set by then)
    setTimeout(() => {
        console.log('[StandaloneChatCall] Retrying WebSocket connection...');
        this.initializeStandaloneWebSocket();
    }, 2000);
    return;
}
```

## How It Works

### Strategy 1: URL Detection
```javascript
// If on /profile-pages/tutor-profile.html → activeRole = 'tutor'
// If on /profile-pages/student-profile.html → activeRole = 'student'
```

### Strategy 2: First Available Profile
```javascript
// If user has tutor_profile_id → activeRole = 'tutor'
// Else if user has student_profile_id → activeRole = 'student'
// Etc.
```

### Strategy 3: Retry After 2 Seconds
```javascript
// If still can't determine role, wait 2 seconds and try again
// By then, localStorage.active_role should be set by auth.js
```

## Expected Console Output

### Before Fix
```
[StandaloneChatCall] Initializing...
[StandaloneChatCall] No profile found for active role: null
```
**Result:** No WebSocket connection ❌

### After Fix
```
[StandaloneChatCall] Initializing...
[StandaloneChatCall] active_role not set, detecting from page...
[StandaloneChatCall] Detected role: tutor
[StandaloneChatCall] Connecting to WebSocket: ws://localhost:8000/ws/1/Tutor
[StandaloneChatCall] ✅ WebSocket connected for calls
[StandaloneChatCall] Setting up WebSocket listeners
```
**Result:** WebSocket connected successfully ✅

## Testing

1. **Hard refresh** the page (Ctrl+Shift+R)
2. Open DevTools → Console
3. Look for:
   ```
   [StandaloneChatCall] active_role not set, detecting from page...
   [StandaloneChatCall] Detected role: tutor
   [StandaloneChatCall] ✅ WebSocket connected for calls
   ```
4. Have someone call you - modal should appear!

## Quick Verification

```javascript
// Check if WebSocket is now connected
console.log('WebSocket:', window.chatWebSocket?.readyState === 1 ? 'CONNECTED ✅' : 'NOT CONNECTED ❌');
```

Expected: `CONNECTED ✅`

## All Fixes Summary

This is the **4th and final fix** to make real calls work:

1. ✅ **Fix 1**: Expose chat WebSocket globally (`window.chatWebSocket`)
2. ✅ **Fix 2**: Listen for `call_invitation` event type (not just `incoming_call`)
3. ✅ **Fix 3**: Support both field formats (`from_name`/`caller_name`)
4. ✅ **Fix 4**: Auto-detect role when `active_role` not set yet

## Status: ✅ COMPLETE

Real calls should now work on all pages, even when `active_role` loads late!

**Test it:**
1. Refresh tutor-profile page
2. Wait for WebSocket to connect
3. Have someone call you
4. Modal should pop up! 🎉
