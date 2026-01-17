# Test Real Call Integration - Quick Guide

## Quick Verification Script

After opening tutor-profile.html (or any page), paste this in browser console:

```javascript
console.clear();
console.log('=== REAL CALL INTEGRATION TEST ===\n');

// Check 1: WebSocket exposed globally
console.log('1. window.chatWebSocket:', window.chatWebSocket ? '✅ EXISTS' : '❌ NOT FOUND');
if (window.chatWebSocket) {
    console.log('   State:',
        window.chatWebSocket.readyState === 0 ? 'CONNECTING' :
        window.chatWebSocket.readyState === 1 ? '✅ OPEN' :
        window.chatWebSocket.readyState === 2 ? 'CLOSING' :
        window.chatWebSocket.readyState === 3 ? 'CLOSED' : 'UNKNOWN'
    );
}

// Check 2: StandaloneChatCallManager exists
console.log('\n2. StandaloneChatCallManager:', typeof StandaloneChatCallManager !== 'undefined' ? '✅ EXISTS' : '❌ NOT FOUND');

// Check 3: Modal in DOM
const modal = document.getElementById('chatCallModal');
console.log('\n3. Modal in DOM:', modal ? '✅ YES' : '❌ NO');

// Check 4: Simulate a call_invitation (exactly like backend sends)
if (window.chatWebSocket && typeof StandaloneChatCallManager !== 'undefined' && modal) {
    console.log('\n✅ All checks passed!');
    console.log('\n🧪 Simulating real backend call in 2 seconds...');

    setTimeout(() => {
        // Create a MessageEvent exactly like WebSocket would receive
        const testData = {
            type: 'call_invitation',
            from_name: 'Test Caller (Real Format)',
            from_avatar: '/assets/default-avatar.png',
            call_type: 'voice',
            conversation_id: 'test_conv_123',
            call_log_id: 'test_log_456',
            offer: {} // WebRTC offer (not needed for modal display)
        };

        console.log('\n📞 Dispatching call_invitation event...');
        console.log('📨 Message data:', testData);

        // Simulate WebSocket message event
        const messageEvent = new MessageEvent('message', {
            data: JSON.stringify(testData)
        });

        window.chatWebSocket.dispatchEvent(messageEvent);

        console.log('\n✅ Call invitation dispatched!');
        console.log('👀 Modal should appear now with:');
        console.log('   - Caller: Test Caller (Real Format)');
        console.log('   - Type: Voice Call');
    }, 2000);
} else {
    console.log('\n❌ Prerequisites missing!');
    if (!window.chatWebSocket) console.log('   → WebSocket not connected');
    if (typeof StandaloneChatCallManager === 'undefined') console.log('   → Manager not loaded');
    if (!modal) console.log('   → Modal not in DOM');

    console.log('\n💡 Make sure:');
    console.log('   1. You are logged in');
    console.log('   2. Chat modal has been opened at least once (to connect WebSocket)');
    console.log('   3. Page has fully loaded');
}
```

## Expected Output

### ✅ Success Case
```
=== REAL CALL INTEGRATION TEST ===

1. window.chatWebSocket: ✅ EXISTS
   State: ✅ OPEN

2. StandaloneChatCallManager: ✅ EXISTS

3. Modal in DOM: ✅ YES

✅ All checks passed!

🧪 Simulating real backend call in 2 seconds...

📞 Dispatching call_invitation event...
📨 Message data: {type: 'call_invitation', from_name: 'Test Caller (Real Format)', ...}
[StandaloneChatCall] Received call invitation: {...}
[StandaloneChatCall] Incoming call: {...}

✅ Call invitation dispatched!
👀 Modal should appear now with:
   - Caller: Test Caller (Real Format)
   - Type: Voice Call
```

**Then:** The call modal should pop up on your screen!

### ❌ WebSocket Not Connected Case
```
=== REAL CALL INTEGRATION TEST ===

1. window.chatWebSocket: ❌ NOT FOUND

❌ Prerequisites missing!
   → WebSocket not connected

💡 Make sure:
   1. You are logged in
   2. Chat modal has been opened at least once (to connect WebSocket)
   3. Page has fully loaded
```

**Fix:** Open the chat modal once to establish WebSocket connection, then close it and run the test again.

## Two-User Real Call Test

### Setup
- **User A** (Receiver): Opens tutor-profile.html
- **User B** (Caller): Opens chat modal, selects User A

### Steps

**User A (Receiver):**
1. Open `http://localhost:8081/profile-pages/tutor-profile.html`
2. Log in (if not already)
3. Open chat modal once, then close it (this connects WebSocket)
4. Stay on the page
5. Open DevTools → Console
6. Wait for call

**User B (Caller):**
1. Open any page with chat modal
2. Log in (if not already)
3. Click chat icon
4. Select User A from contacts
5. Click voice or video call button

**Expected Result for User A:**
- Console shows:
  ```
  📨 Message type: call_invitation
  [StandaloneChatCall] Received call invitation: {...}
  [StandaloneChatCall] Incoming call: {...}
  ```
- Standalone call modal pops up with User B's name and avatar
- Ringtone plays (if implemented)

**Expected Result for User B:**
- Outgoing call screen shows
- "Calling User A..." message appears

## Troubleshooting

### Modal doesn't appear

**Check 1: Is WebSocket connected?**
```javascript
console.log('WebSocket:', window.chatWebSocket?.readyState);
// Should be: 1 (OPEN)
```

**Fix:** Open chat modal once to connect, then close it.

**Check 2: Are listeners attached?**
```javascript
console.log('Manager initialized:', StandaloneChatCallManager.currentCall);
// Should exist (even if null)
```

**Fix:** Reload the page.

**Check 3: Is correct event type being sent?**
```javascript
// Listen for all WebSocket messages
window.chatWebSocket.addEventListener('message', (e) => {
    const data = JSON.parse(e.data);
    console.log('📨 WebSocket message:', data.type, data);
});
```

**Expected:** Should see `call_invitation` when call comes in.

### Modal appears but shows "Unknown"

**Check:** Field names in WebSocket message
```javascript
// The data should have:
{
  from_name: "...",  // ← Caller name
  from_avatar: "...", // ← Avatar URL
  call_type: "voice" // ← or "video"
}
```

**Fix:** Already handled in the code - supports both `from_name` and `caller_name`.

### Call connects but no audio/video

This is a different issue (WebRTC configuration). The modal integration fix only handles **showing the modal** when call comes in.

For WebRTC issues, check:
- Browser permissions (camera/microphone)
- STUN/TURN server configuration
- Network connectivity

## Verification Checklist

- [ ] WebSocket connects when chat modal opens
- [ ] `window.chatWebSocket` exists and is OPEN
- [ ] StandaloneChatCallManager exists
- [ ] Modal HTML is in DOM
- [ ] Test script shows all ✅
- [ ] Real call from another user shows modal
- [ ] Modal displays correct caller name
- [ ] Modal displays correct caller avatar
- [ ] Modal shows correct call type (voice/video)
- [ ] Accept button works
- [ ] Decline button works

## Quick One-Liner Test

Just want to verify the fix? Run this:

```javascript
window.chatWebSocket && typeof StandaloneChatCallManager !== 'undefined' && document.getElementById('chatCallModal') ? '✅ READY FOR REAL CALLS' : '❌ NOT READY'
```

**Expected:** `✅ READY FOR REAL CALLS`

---

**Version:** 1.0
**Date:** 2026-01-16
**Status:** ✅ Ready to Test
