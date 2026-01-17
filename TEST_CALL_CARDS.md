# Test Call Cards - Quick Guide

## What's Been Implemented

### ✅ Part A: Call History Cards

Beautiful call cards now appear in the chat area when you make or receive calls.

**Features:**
- **Answered calls** - Green card with duration (e.g., "2m 45s")
- **Missed calls** - Red card with "No answer"
- **Call type** - Phone icon for voice, video icon for video calls
- **Direction** - Up arrow for outgoing, down arrow for incoming
- **Call back button** - Click to call them back instantly

### Card Design:
```
┌────────────────────────────────┐
│ 📞 VOICE CALL                  ↑│  <- Header (green/red gradient)
│    Call ended                   │
├────────────────────────────────┤
│ 🕐 2m 45s    [📞 Call Back]    │  <- Body
└────────────────────────────────┘
```

## How to Test (Manual)

### Option 1: Test with Browser Console

1. **Start servers:**
   ```bash
   cd astegni-backend && python app.py
   python dev-server.py
   ```

2. **Open chat modal:**
   - Login at http://localhost:8081
   - Click chat icon
   - Select any contact

3. **Insert test call card** (browser console):
   ```javascript
   // Test answered voice call
   ChatModalManager.displayMessage({
       id: 'test-call-1',
       message_type: 'call',
       sent: true,
       is_mine: true,
       time: new Date(),
       media_metadata: {
           call_type: 'voice',
           status: 'answered',
           duration_seconds: 165  // 2m 45s
       }
   });

   // Test missed video call
   ChatModalManager.displayMessage({
       id: 'test-call-2',
       message_type: 'call',
       sent: false,
       is_mine: false,
       time: new Date(),
       media_metadata: {
           call_type: 'video',
           status: 'missed',
           duration_seconds: 0
       }
   });

   // Test declined call
   ChatModalManager.displayMessage({
       id: 'test-call-3',
       message_type: 'call',
       sent: true,
       is_mine: true,
       time: new Date(),
       media_metadata: {
           call_type: 'video',
           status: 'declined',
           duration_seconds: 0
       }
   });
   ```

### Option 2: Test with Real Calls

1. Make a real voice/video call between two accounts
2. End the call
3. Call card will automatically appear in chat
4. Click "Call Back" to call again

## Expected Results

### Answered Call (Green):
- Header: Gradient green background
- Icon: Phone/video icon in circle
- Label: "Call ended"
- Body: Clock icon + duration
- Button: "Call Back" (green)

### Missed Call (Red):
- Header: Gradient red background
- Icon: Phone-slash icon
- Label: "Missed call"
- Body: Info icon + "No answer"
- Button: "Call Back" (red)

### Declined Call (Red):
- Header: Gradient red background
- Icon: Phone-slash icon
- Label: "Call declined"
- Body: Info icon + "No answer"
- Button: "Call Back" (red)

## Troubleshooting

### Card not appearing?
1. Check console for errors
2. Verify `message_type: 'call'` is set
3. Ensure `media_metadata` has required fields

### Call back button not working?
1. Check that `ChatModalManager.initiateCallFromCard()` exists
2. Verify WebSocket is connected
3. Check that conversation is selected

## Next Steps

See [CALL_CARDS_IMPLEMENTATION.md](CALL_CARDS_IMPLEMENTATION.md) for:
- Phase 2: Independent call modal
- Phase 3: Automatic call logging
- Complete implementation details

## Current Status

✅ **Working:**
- Call card UI rendering
- Call type detection (voice/video)
- Status styling (answered/missed/declined)
- Duration formatting
- Call back button
- Direction indicators

⏳ **TODO:**
- Auto-create call cards after calls end
- Independent call modal
- Global WebSocket for calls when chat is closed
- Call notifications

---
**Ready to test!** Follow Option 1 above to see the call cards in action.
