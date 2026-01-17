# Infinite Loop Fix + Simple Solution

## The Problem

The standalone call modal was stuck in an infinite retry loop:

```
[StandaloneChatCall] Detected role: null
[StandaloneChatCall] No profile found for active role: null
[StandaloneChatCall] Retrying WebSocket connection...
```

Repeating forever, making hundreds of `/api/me` requests.

## Root Cause

The `/api/me` endpoint returns user data but **without the profile IDs** (`tutor_profile_id`, etc.), so role detection always fails.

## Fixes Applied

### Fix 1: Stop Infinite Loop
Added retry limit (max 3 retries):

```javascript
this.retryCount = 0;
this.maxRetries = 3;

// In initializeStandaloneWebSocket():
this.retryCount++;
if (this.retryCount > this.maxRetries) {
    console.log('[StandaloneChatCall] Max retries reached. Giving up...');
    return;
}
```

**Result:** Stops after 3 attempts instead of looping forever.

### Fix 2: Better Debugging
Added detailed logging to see what's happening:

```javascript
console.log('[StandaloneChatCall] User data:', userData);
console.log('[StandaloneChatCall] localStorage active_role:', activeRole);
console.log('[StandaloneChatCall] Current path:', window.location.pathname);
console.log('[StandaloneChatCall] Checking profile IDs:', {
    tutor: userData.tutor_profile_id,
    student: userData.student_profile_id,
    parent: userData.parent_profile_id,
    advertiser: userData.advertiser_profile_id
});
```

## The Simple Solution

Instead of trying to create a separate WebSocket, **just use the chat modal's WebSocket**!

### Current Behavior:
- Chat modal creates WebSocket when you open it
- Standalone call modal tries to create its own WebSocket
- Both fail if profile info isn't available

### Better Approach:
- Just open the chat modal in the background (hidden)
- Let it establish the WebSocket connection
- Standalone call modal uses that existing connection

## Recommended Fix

Replace the complex standalone WebSocket initialization with this simple approach:

**In tutor-profile.html (and other pages):**

```javascript
// After page loads, silently initialize chat modal WebSocket
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth to complete
    setTimeout(() => {
        // This connects the WebSocket without showing the modal
        if (typeof ChatModalManager !== 'undefined' && ChatModalManager.connectWebSocket) {
            ChatModalManager.loadCurrentUser();
            ChatModalManager.connectWebSocket();
            console.log('✅ Chat WebSocket initialized for calls');
        }
    }, 2000);
});
```

This way:
- ✅ Uses existing, tested code
- ✅ No duplicate WebSocket connections
- ✅ No retry loops
- ✅ No complex role detection
- ✅ Works immediately

## What to Do Now

### Option 1: Keep Current Fix
- The infinite loop is stopped
- It will try 3 times then give up
- User must open chat modal to receive calls
- **Downside:** Calls won't work until user opens chat

### Option 2: Silent Chat Init (Recommended)
- Add the simple code above to each page
- Chat modal WebSocket connects automatically
- No visible changes for user
- Calls work immediately
- **Benefit:** Simple, reliable, uses existing code

## Testing

After refreshing the page, you should see:

### Current Fix:
```
[StandaloneChatCall] Initializing...
[StandaloneChatCall] active_role not set, detecting from page...
[StandaloneChatCall] User data: {...}
[StandaloneChatCall] Detected role: null
[StandaloneChatCall] No profile found for active role: null
[StandaloneChatCall] Retrying WebSocket connection (1/3)...
[StandaloneChatCall] Retrying WebSocket connection (2/3)...
[StandaloneChatCall] Retrying WebSocket connection (3/3)...
[StandaloneChatCall] Max retries reached. Giving up...
```

**Then:** Open chat modal once → WebSocket connects → Calls work

### With Silent Chat Init:
```
✅ Chat WebSocket initialized for calls
[StandaloneChatCall] Initializing...
[StandaloneChatCall] Setting up WebSocket listeners
```

**Then:** Calls work immediately, no user action needed

## Status

- ✅ Infinite loop fixed
- ✅ Better debugging added
- ⚠️ Still requires opening chat modal for calls to work
- 💡 Simple solution available (silent chat init)

Would you like me to implement the silent chat initialization approach?
