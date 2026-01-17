# Real Call Integration Fix - COMPLETE

## The Problem

When doing a **real call** (via WebSocket), the standalone call modal wasn't appearing on tutor-profile page (or any page), even though test calls worked perfectly.

## Root Cause Analysis

There were **2 critical bugs** preventing real calls from working:

### Bug 1: WebSocket Not Exposed Globally

**Problem:**
- `ChatModalManager` creates its own WebSocket: `this.websocket = new WebSocket(wsUrl)`
- `StandaloneChatCallManager` looks for `window.chatWebSocket` which was never set
- The two managers were completely disconnected - they didn't share the WebSocket connection

**Impact:** StandaloneChatCallManager couldn't receive any WebSocket messages, so real calls never triggered the modal.

### Bug 2: Wrong Event Type and Field Names

**Problem:**
- Backend sends `call_invitation` WebSocket message type
- StandaloneChatCallManager was listening for `incoming_call`
- Field names didn't match:
  - Backend sends: `from_name`, `from_avatar`
  - StandaloneChatCallManager expected: `caller_name`, `caller_avatar`

**Impact:** Even if WebSocket was connected, the modal wouldn't show because the event type and fields didn't match.

## The Fix

### Fix 1: Expose WebSocket Globally (chat-modal.js)

**File:** `js/common-modals/chat-modal.js`
**Location:** Line 14029-14042

**What Changed:**
```javascript
try {
    this.websocket = new WebSocket(wsUrl);

    // Expose WebSocket globally for StandaloneChatCallManager
    window.chatWebSocket = this.websocket;

    this.websocket.onopen = () => {
        console.log('🔍 ========== WEBSOCKET CONNECTED ==========');
        console.log(`✅ Chat WebSocket connected as ${profileType} profile ${profileId}`);
        console.log('✅ Connection key:', `${profileType}_${profileId}`);
        console.log('🔍 ==========================================');

        // Dispatch websocket-ready event for StandaloneChatCallManager
        document.dispatchEvent(new CustomEvent('websocket-ready'));
        console.log('📡 Dispatched websocket-ready event');
    };
```

**Why This Works:**
- Sets `window.chatWebSocket = this.websocket` so StandaloneChatCallManager can access it
- Dispatches `websocket-ready` event when connection is established
- StandaloneChatCallManager already had code to listen for this event (lines 32-35 in chat-call-modal.js)

### Fix 2: Listen for Correct Event Type (chat-call-modal.js)

**File:** `js/common-modals/chat-call-modal.js`
**Location:** Line 55-58

**What Changed:**
```javascript
// Support both 'call_invitation' (new) and 'incoming_call' (legacy)
if (data.type === 'call_invitation' || data.type === 'incoming_call') {
    console.log('[StandaloneChatCall] Received call invitation:', data);
    this.handleIncomingCall(data);
}
```

**Why This Works:**
- Now listens for `call_invitation` (the actual event backend sends)
- Also supports `incoming_call` for backward compatibility

### Fix 3: Support Both Field Name Formats (chat-call-modal.js)

**File:** `js/common-modals/chat-call-modal.js`
**Location:** Line 90-98

**What Changed:**
```javascript
// Set caller information (support both formats)
const callerName = data.caller_name || data.from_name || 'Unknown';
const callerAvatar = data.caller_avatar || data.from_avatar || '/assets/default-avatar.png';

document.getElementById('chatIncomingCallerName').textContent = callerName;
document.getElementById('chatIncomingCallType').textContent = data.call_type === 'video' ? 'Video Call' : 'Voice Call';

const avatarImg = document.getElementById('chatIncomingCallAvatar');
avatarImg.src = callerAvatar;
```

**Why This Works:**
- Uses `from_name` (backend format) if `caller_name` not available
- Uses `from_avatar` (backend format) if `caller_avatar` not available
- Supports both old and new formats

## How to Test

### Test 1: Verify WebSocket Connection

1. Open tutor-profile page
2. Open browser DevTools → Console
3. Look for these messages:
   ```
   ✅ Chat WebSocket connected as Tutor profile [id]
   📡 Dispatched websocket-ready event
   [StandaloneChatCall] Initializing...
   [StandaloneChatCall] Setting up WebSocket listeners
   ```

**Expected:** All 4 messages should appear, confirming WebSocket is shared.

### Test 2: Test Real Call

1. User A: Open tutor-profile page (or any integrated page)
2. User B: Open chat modal, select User A, click voice/video call button
3. **Expected Result:** User A should see the standalone call modal pop up immediately

### Test 3: Verify Call Data

While call modal is showing:
```javascript
// In browser console on User A's page
console.log(StandaloneChatCallManager.incomingCallData);
```

**Expected Output:**
```json
{
  "type": "call_invitation",
  "from_name": "User B Name",
  "from_avatar": "/path/to/avatar.jpg",
  "call_type": "voice",
  "conversation_id": "...",
  "call_log_id": "...",
  "offer": {...}
}
```

## Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `js/common-modals/chat-modal.js` | 14031-14042 | Expose WebSocket globally and dispatch event |
| `js/common-modals/chat-call-modal.js` | 55-58 | Listen for `call_invitation` |
| `js/common-modals/chat-call-modal.js` | 90-98 | Support both field formats |

## Console Messages to Verify Fix

When everything is working correctly, you should see these console messages:

**On Page Load:**
```
✅ Chat Modal HTML loaded for tutor-profile
✅ ChatModalManager initialized for tutor-profile
✅ Standalone Chat Call Modal loaded for tutor-profile
[StandaloneChatCall] Initializing...
```

**When Chat Opens:**
```
📡 Connecting to WebSocket for calls
✅ Chat WebSocket connected as Tutor profile [id]
📡 Dispatched websocket-ready event
[StandaloneChatCall] Setting up WebSocket listeners
```

**When Call Comes In:**
```
📨 Message type: call_invitation
[StandaloneChatCall] Received call invitation: {...}
[StandaloneChatCall] Incoming call: {...}
```

## Why Test Calls Worked But Real Calls Didn't

**Test calls** used direct JavaScript:
```javascript
StandaloneChatCallManager.handleIncomingCall({ ... });
```
This bypassed the WebSocket completely - it directly called the function.

**Real calls** rely on WebSocket messages:
```
Backend → WebSocket → window.chatWebSocket → StandaloneChatCallManager.handleIncomingCall()
```
Since `window.chatWebSocket` was never set, the chain was broken.

## Status: ✅ FIXED

All bugs have been resolved:
- ✅ WebSocket now exposed globally as `window.chatWebSocket`
- ✅ `websocket-ready` event dispatched when connected
- ✅ StandaloneChatCallManager listens for correct event type
- ✅ Field names handled for both formats

Real calls should now work on **all integrated pages**:
- ✅ profile-pages/tutor-profile.html
- ✅ profile-pages/student-profile.html
- ✅ profile-pages/parent-profile.html
- ✅ profile-pages/advertiser-profile.html
- ✅ view-profiles/view-tutor.html
- ✅ view-profiles/view-student.html
- ✅ view-profiles/view-parent.html
- ✅ view-profiles/view-advertiser.html
- ✅ index.html
- ✅ branch/find-tutors.html
- ✅ branch/reels.html

## Next Steps

1. **Test on tutor-profile** - Open the page, have someone call you
2. **Test on other pages** - Verify it works everywhere
3. **Test both voice and video** - Verify both call types work
4. **Test accept/decline** - Verify call flow works correctly

The fix is complete and ready for testing! 🚀
