# Whiteboard Text Broadcasting Debug - Console Logging Added

## Issue Being Investigated

**Problem**: When host types text (e.g., "Hello world!") using the text tool, the participant doesn't see it on their canvas.

**Known Working**: Pen strokes broadcast successfully and appear on participant's canvas in real-time.

## Debug Logging Added

I've added comprehensive console logging to track text broadcasts through the entire flow:

### Frontend Changes: `js/tutor-profile/whiteboard-manager.js`

#### 1. Broadcasting Side (Line ~3922-3930)
Added logging in `broadcastStroke()` method to show:
- Stroke type (pen, text, etc.)
- Sender (tutor_85, student_30)
- Recipient (who it's being sent to)
- Session and page IDs
- Text content (if it's a text stroke)

**Example Output**:
```javascript
📤 Broadcasting text stroke: {
    stroke_type: "text",
    from: "tutor_85",
    to: "student_30",
    session_id: 26,
    page_id: 123,
    has_text: "Hello world!"
}
```

#### 2. Receiving Side (Line ~4048-4055)
Added logging in `handleRemoteStroke()` method to show:
- Received stroke type
- Sender information
- Text content (if present)
- Session and page IDs

**Example Output**:
```javascript
📥 Received text stroke from Tutor Name: {
    stroke_type: "text",
    from: "tutor_85",
    has_text: "Hello world!",
    session_id: 26,
    page_id: 123
}
```

## Testing Instructions

### Setup
1. **Clear browser cache** (important for new JS to load):
   - Chrome/Edge: `Ctrl + Shift + Delete`
   - Or hard refresh: `Ctrl + Shift + R`

2. **Restart backend** (already done):
   ```bash
   cd astegni-backend
   python app.py
   ```

3. **Restart frontend dev server**:
   ```bash
   python dev-server.py
   ```

### Test Procedure

**As HOST (Tutor)**:
1. Open browser console (`F12`)
2. Open whiteboard in `profile-pages/tutor-profile.html`
3. Start video call with a student
4. Once connected, select Text tool
5. Click on canvas and type "Hello world!"
6. Press Enter or click outside to finish text
7. **Check console for**:
   ```
   📤 Broadcasting text stroke: { stroke_type: "text", from: "tutor_85", to: "student_30", has_text: "Hello world!" }
   ```

**As PARTICIPANT (Student)**:
1. Open browser console (`F12`) in a separate browser/window
2. Open whiteboard in `profile-pages/student-profile.html`
3. Accept the video call from tutor
4. **Watch the canvas AND the console**
5. **Check console for**:
   ```
   📥 Received text stroke from Tutor Name: { stroke_type: "text", from: "tutor_85", has_text: "Hello world!" }
   ```

### Expected Results

#### ✅ If Text Broadcasting Works:
**Host console**:
```
📤 Broadcasting text stroke: { stroke_type: "text", from: "tutor_85", to: "student_30", has_text: "Hello world!" }
```

**Participant console**:
```
📥 Received text stroke from Tutor Name: { stroke_type: "text", from: "tutor_85", has_text: "Hello world!" }
```

**Participant canvas**: "Hello world!" appears

#### ❌ If Text Broadcasting Fails:

**Scenario 1: Text not sent**
- Host console: No "📤 Broadcasting text stroke" message
- **Problem**: `broadcastStroke()` not being called OR WebSocket not connected
- **Check**: Look for "⚠️ Cannot broadcast stroke: WebSocket not connected" message

**Scenario 2: Text sent but not received**
- Host console: Shows "📤 Broadcasting text stroke"
- Backend logs: Shows "🎨 Relayed stroke: text from tutor_85 to student_30"
- Participant console: No "📥 Received text stroke" message
- **Problem**: WebSocket message not reaching participant OR being filtered out

**Scenario 3: Text received but not displayed**
- Host console: Shows "📤 Broadcasting text stroke"
- Backend logs: Shows "🎨 Relayed stroke: text"
- Participant console: Shows "📥 Received text stroke"
- Participant canvas: Text NOT visible
- **Problem**: `drawStroke()` not rendering text correctly

### Additional Debug Checks

**Check WebSocket Connection**:
Both host and participant should see in console:
```
✅ WebSocket connected
```

**Check selectedStudentId/selectedTutorId**:
When video call starts, you should see:
```
📹 Set selectedStudentId from incoming call: 30
// or
📹 Set selectedTutorId from incoming call: 85
```

These values are used for message routing.

### Comparison: Pen vs Text

**Pen stroke (WORKING)**:
- Host draws with pen
- Console: `📤 Broadcasting pen stroke: { stroke_type: "pen", ... }`
- Backend: `🎨 Relayed stroke: pen from tutor_85 to student_30`
- Participant: `📥 Received pen stroke from Tutor Name: { stroke_type: "pen", ... }`
- Participant sees pen strokes ✅

**Text stroke (NOT WORKING)**:
- Host types "Hello world!"
- Console: `📤 Broadcasting text stroke: { stroke_type: "text", has_text: "Hello world!" }`
- Backend: Should show `🎨 Relayed stroke: text from tutor_85 to student_30`
- Participant: Should show `📥 Received text stroke from Tutor Name: { has_text: "Hello world!" }`
- Participant should see text ❌ (currently not working)

## Diagnostic Questions

After testing, the console logs will answer:

1. **Is text being broadcast?**
   - YES: See "📤 Broadcasting text stroke" in host console
   - NO: Problem in `drawTextOnCanvas()` or permission check

2. **Is the backend receiving the text broadcast?**
   - YES: Backend logs show "🎨 Relayed stroke: text"
   - NO: WebSocket connection issue

3. **Is the participant receiving the text message?**
   - YES: See "📥 Received text stroke" in participant console
   - NO: WebSocket routing issue

4. **Is the participant's drawStroke() being called with text?**
   - YES: See "📥 Received text stroke" followed by text appearing
   - NO: `handleRemoteStroke()` not calling `drawStroke()` or text rendering broken

## Next Steps Based on Results

### If host doesn't broadcast text:
- Check if `drawTextOnCanvas()` is completing successfully
- Check if user has write permission
- Check if WebSocket is connected

### If backend doesn't receive text:
- Check WebSocket connection between host and backend
- Check browser console for WebSocket errors
- Verify message format matches backend expectations

### If participant doesn't receive text:
- Check WebSocket connection between backend and participant
- Check message routing (selectedStudentId/selectedTutorId values)
- Verify recipient_key is correct in backend

### If participant receives text but doesn't display it:
- Check `drawStroke()` method's text case (line 1589-1631)
- Verify text stroke format matches what `drawStroke()` expects
- Check if text is being drawn outside visible canvas area

## Files Modified

1. `js/tutor-profile/whiteboard-manager.js`
   - Line ~3896-3937: Added debug logging to `broadcastStroke()`
   - Line ~4045-4062: Added debug logging to `handleRemoteStroke()`

2. `WHITEBOARD-TEXT-BROADCAST-DEBUG.md` (this file)
   - Complete testing guide and troubleshooting steps

## Status

🔍 **DEBUG MODE ACTIVE** - Ready for testing with comprehensive console logging

Please test and share:
1. Host console output (full text broadcast flow)
2. Participant console output (what is/isn't received)
3. Backend console output (what backend sees)
4. Whether text appears on participant's canvas

This will help pinpoint exactly where the text broadcast is failing.
