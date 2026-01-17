# Call Card Scenarios - Complete Implementation ✅

## Three Call Scenarios

### Scenario A: Call Declined by Receiver
**Flow:**
1. User 1 makes a call
2. User 2 clicks "Decline" button
3. **Result:** Both users see **RED "Call declined"** card

**What Happens:**
- User 2 sends `call_declined` message
- User 1 receives `call_declined` and adds red card
- User 2 adds red card locally

**Card Details:**
- Color: Red gradient
- Status: "Call declined"
- Message: "No answer"
- Icon: Phone-slash

---

### Scenario B: Call Cancelled by Caller
**Flow:**
1. User 1 makes a call
2. User 2's phone is ringing (hasn't answered yet)
3. User 1 clicks "End Call" button (cancels before answer)
4. **Result:**
   - User 1 (caller) sees **RED "Call cancelled"** card
   - User 2 (receiver) sees **RED "Missed call"** card

**What Happens:**
- User 1 detects call was never answered (duration = 0)
- User 1 sends `call_cancelled` message
- User 1 adds red "cancelled" card (they cancelled it)
- User 2 receives `call_cancelled` and adds red "missed" card (they missed it)
- User 2's ringtone stops

**Card Details:**
- **For User 1 (Caller):**
  - Color: Red gradient
  - Status: "Call cancelled"
  - Message: "No answer"
  - Icon: Phone-slash

- **For User 2 (Receiver):**
  - Color: Red gradient
  - Status: "Missed call"
  - Message: "No answer"
  - Icon: Phone-slash

---

### Scenario C: Call Answered and Ended
**Flow:**
1. User 1 makes a call
2. User 2 accepts the call
3. They talk for X seconds
4. Either user clicks "End Call"
5. **Result:** Both users see **GREEN card with duration**

**What Happens:**
- Call start time is tracked when answered
- When ended, duration is calculated
- Sender sends `call_ended` message
- Both users add green card with duration

**Card Details:**
- Color: Green gradient
- Status: "Call ended"
- Message: Duration (e.g., "2m 45s")
- Icon: Phone or camera

---

## Implementation Details

### Frontend Changes (js/common-modals/chat-modal.js)

**1. endChatCall() - Lines 14606-14685**
```javascript
// Detect if call was answered
const wasAnswered = duration > 0;

if (wasAnswered) {
    // Scenario C: Add green card with duration
} else if (!this.state.isIncomingCall) {
    // Scenario B: Caller cancelled - add red "missed" card
    this.addCallCard(callType, 'missed', 0);
}

// Send appropriate message type
const messageType = wasAnswered ? 'call_ended' : 'call_cancelled';
```

**2. WebSocket Handler - Lines 13996-14043**
Added three cases:
- `call_declined` - Scenario A (receiver declined)
- `call_cancelled` - Scenario B (caller cancelled before answer)
- `call_ended` - Scenario C (call was answered and ended)

**3. declineIncomingCall() - Line 14443**
```javascript
this.addIncomingCallCard(callType, 'declined', 0);
```

### Backend Changes (astegni-backend/websocket_manager.py)

**Added handler at line 840-847:**
```python
elif message_type == "call_cancelled":
    # Forward call cancelled to recipient (caller hung up before answer)
    await manager.send_personal_message({
        "type": "call_cancelled",
        "conversation_id": data.get("conversation_id"),
        "call_type": data.get("call_type", "voice")
    }, recipient_key)
    print(f"📞 Call cancelled by {sender_key} - notified {recipient_key}")
```

---

## Visual Differences

### Red Cards (Scenarios A & B)
```
┌────────────────────────────────┐
│ 📞 VOICE CALL                  ↑│  <- Red gradient
│    Call declined / Missed call  │
├────────────────────────────────┤
│ ℹ️  No answer   [📞 Call Back]  │
└────────────────────────────────┘
```

### Green Cards (Scenario C)
```
┌────────────────────────────────┐
│ 📞 VOICE CALL                  ↑│  <- Green gradient
│    Call ended                   │
├────────────────────────────────┤
│ 🕐 2m 45s      [📞 Call Back]  │
└────────────────────────────────┘
```

---

## Testing Instructions

### Test Scenario A: Call Declined
1. **User 1:** Make a voice call to User 2
2. **User 2:** Wait for incoming call modal → Click "Decline"
3. **Expected:**
   - ✅ User 1 sees: RED card "Call declined" (outgoing arrow)
   - ✅ User 2 sees: RED card "Call declined" (incoming arrow)
   - ✅ Both cards persist and don't disappear

### Test Scenario B: Cancelled/Missed Call
1. **User 1:** Make a video call to User 2
2. **User 2:** Let it ring (don't answer yet)
3. **User 1:** Click "End Call" before User 2 answers
4. **Expected:**
   - ✅ User 1 sees: RED card "Call cancelled" (outgoing arrow)
   - ✅ User 2 sees: RED card "Missed call" (incoming arrow)
   - ✅ User 2's ringtone stops
   - ✅ Both cards persist

### Test Scenario C: Call Ended
1. **User 1:** Make a voice call to User 2
2. **User 2:** Click "Accept"
3. **Both:** Talk for 30 seconds
4. **User 1:** Click "End Call"
5. **Expected:**
   - ✅ User 1 sees: GREEN card "Call ended - 30s" (outgoing arrow)
   - ✅ User 2 sees: GREEN card "Call ended - 30s" (incoming arrow)
   - ✅ Both cards persist

---

## Console Messages to Look For

**Scenario A (Declined):**
```
📞 Call declined by {profile_type}_{profile_id} - notified {other_profile}
```

**Scenario B (Cancelled/Missed):**
```
📞 Call cancelled by {profile_type}_{profile_id} - notified {other_profile}
📞 Call card added: voice - cancelled - 0s  (for caller)
📞 Call card added: voice - missed - 0s      (for receiver)
```

**Scenario C (Ended):**
```
📞 Call ended by {profile_type}_{profile_id} - notified {other_profile}
📞 Call card added: voice - ended - 30s
```

---

## Status

✅ **All three scenarios implemented and ready to test!**

- [x] Scenario A: Call declined (red card)
- [x] Scenario B: Call cancelled/missed (red card)
- [x] Scenario C: Call answered and ended (green card with duration)
- [x] Cards persist during message reloads
- [x] Cards appear on both sides
- [x] Backend forwards all message types

---

**Last Updated:** 2026-01-16
**Files Modified:**
- `js/common-modals/chat-modal.js` (Lines 13996-14043, 14606-14685)
- `astegni-backend/websocket_manager.py` (Lines 840-847)
