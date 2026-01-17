# Test Call Button Shake Animation

## How to Test the Shake Animation

### Step 1: Reload the Page
**IMPORTANT**: You must fully reload the page to pick up the new JavaScript code.

1. Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac) to hard reload
2. Or close and reopen the browser tab

### Step 2: Open Browser Console
1. Press `F12` to open DevTools
2. Click the "Console" tab

### Step 3: Test the Animation Manually

In the browser console, type and run:

```javascript
testCallButtonShake()
```

**Expected Result:**
- Both call buttons (voice and video) should shake/wiggle for 5 seconds
- Buttons should turn green with a glow effect
- You should see these console logs:
  ```
  🧪 Testing call button shake animation...
  📳 startCallButtonShake() called
  📳 Voice button element: <button id="chatVoiceCallBtn"...>
  📳 Video button element: <button id="chatVideoCallBtn"...>
  📳 Added shake class to voice button. Classes: header-btn voice-call incoming-call-shake
  📳 Added shake class to video button. Classes: header-btn incoming-call-shake
  📳 Call buttons should be shaking now
  🧪 Stopping shake animation... (after 5 seconds)
  📳 stopCallButtonShake() called
  📳 Removed shake class from voice button
  📳 Removed shake class from video button
  📳 Call button shake stopped
  ```

### Step 4: Test with Actual Call

1. Open chat modal between two users
2. User A initiates a call to User B
3. **On User B's screen**, watch the console logs

**Expected Result:**
- When incoming call is received, you should see:
  ```
  📞 Incoming call invitation: {...}
  📳 startCallButtonShake() called
  📳 Added shake class to voice button...
  📳 Added shake class to video button...
  ```
- Call buttons should shake until you accept or decline

## Troubleshooting

### Issue: Console says "Voice call button not found!" or "Video call button not found!"

**Cause**: The chat modal isn't open or the buttons don't exist yet.

**Solution**:
1. Open the chat modal first
2. Make sure you can see the voice and video call buttons in the header
3. Then try `testCallButtonShake()` again

### Issue: Buttons don't shake but console shows "Added shake class"

**Possible Causes:**

1. **CSS not loaded**: Check if `chat-modal.css` is loaded in the page
   - Open DevTools → Network tab → Filter by "chat-modal.css"
   - Make sure it returns 200 OK

2. **CSS animation not applied**: Check computed styles
   - Right-click on voice call button → Inspect
   - In DevTools Elements tab, find the button
   - Look at "Styles" panel
   - Search for "incoming-call-shake" class
   - Verify the animation is applied

3. **Browser cache**: Hard reload the page
   - Press `Ctrl + Shift + R` or `Cmd + Shift + R`

### Issue: Can't see the shake visually

The shake animation might be too subtle. Try increasing the animation intensity:

Temporary test: Run this in console to make it more obvious:
```javascript
const style = document.createElement('style');
style.textContent = `
@keyframes shake-call-button {
    0%, 100% {
        transform: translateX(0) rotate(0deg);
    }
    10%, 30%, 50%, 70%, 90% {
        transform: translateX(-10px) rotate(-15deg);
    }
    20%, 40%, 60%, 80% {
        transform: translateX(10px) rotate(15deg);
    }
}
`;
document.head.appendChild(style);
testCallButtonShake();
```

This creates a MUCH more obvious shake for testing.

### Issue: Animation works in test but not on real incoming call

**Cause**: The WebSocket message isn't reaching `handleIncomingCallInvitation()`

**Check:**
1. Open console on User B (the one receiving the call)
2. User A calls User B
3. Look for this log: `📨 WebSocket message received: call_invitation`
4. Then look for: `📞 Incoming call invitation: {...}`
5. Then look for: `📳 startCallButtonShake() called`

If you don't see these logs, the WebSocket isn't routing the message correctly.

## How the Shake Works

### 1. When Incoming Call Arrives:
```javascript
handleIncomingCallInvitation(data) {
    // ... incoming call setup ...
    this.startCallButtonShake();  // ← Triggers shake
}
```

### 2. Shake Method Adds CSS Class:
```javascript
startCallButtonShake() {
    const voiceBtn = document.getElementById('chatVoiceCallBtn');
    const videoBtn = document.getElementById('chatVideoCallBtn');
    voiceBtn.classList.add('incoming-call-shake');  // ← Adds shake class
    videoBtn.classList.add('incoming-call-shake');
}
```

### 3. CSS Animates the Buttons:
```css
.header-btn.incoming-call-shake {
    animation: shake-call-button 0.6s ease-in-out infinite;
    background: rgba(34, 197, 94, 0.1) !important;
    color: #22c55e !important;
}

@keyframes shake-call-button {
    /* Wiggle animation */
}
```

### 4. When User Responds (Accept/Decline):
```javascript
acceptIncomingCall() {
    this.stopCallButtonShake();  // ← Removes shake
}

declineIncomingCall() {
    this.stopCallButtonShake();  // ← Removes shake
}
```

## Quick Verification Checklist

- [ ] Page reloaded after code changes
- [ ] Browser console open (F12 → Console tab)
- [ ] Chat modal is open
- [ ] Call buttons are visible
- [ ] Run `testCallButtonShake()` in console
- [ ] Buttons shake for 5 seconds with green highlight
- [ ] Test with actual call between two users
- [ ] Shake stops when accepting/declining call

## Still Not Working?

If you've tried all the above and it still doesn't work, provide:

1. **Console logs** when running `testCallButtonShake()`
2. **Console logs** when receiving an actual call
3. **Screenshot** of the DevTools Elements tab showing the button element and its classes
4. **Network tab** showing if chat-modal.css loaded successfully

This will help identify the exact issue.

## Implementation Files

- **JavaScript**: [js/common-modals/chat-modal.js](js/common-modals/chat-modal.js)
  - Lines 14491-14514: Shake methods
  - Lines 14593-14600: Test function
  - Line 14116: Trigger on incoming call
  - Lines 14129, 14193: Stop on accept/decline

- **CSS**: [css/common-modals/chat-modal.css](css/common-modals/chat-modal.css)
  - Lines 9302-9323: Animation and styling

- **HTML**: [modals/common-modals/chat-modal.html](modals/common-modals/chat-modal.html)
  - Lines 140, 145: Button IDs

Date Created: 2026-01-16
