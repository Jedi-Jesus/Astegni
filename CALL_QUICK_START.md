# Quick Start: Voice & Video Calls in Chat Modal

## ✅ What's Already Done

1. ✅ HTML structure enhanced in `modals/common-modals/chat-modal.html`
2. ✅ CSS styling added to `css/common-modals/chat-modal.css`
3. ✅ Complete WebRTC code documented in `CHAT_WEBRTC_IMPLEMENTATION.md`

## 🔧 What You Need to Do (5 Simple Steps)

### Step 1: Add State Properties (1 minute)

Open `js/common-modals/chat-modal.js`, find the `state:` object (around line 18), and add these properties after the existing ones:

```javascript
// Add these after line ~95 (after existing state properties)
        isCallActive: false,
        isVideoCall: false,
        isIncomingCall: false,
        localStream: null,
        remoteStream: null,
        peerConnection: null,
        pendingOffer: null,
        pendingCallInvitation: null,
        callStartTime: null,
        callDurationInterval: null,
        isAudioMuted: false,
        isVideoOff: false,
        iceCandidateQueue: [],
```

### Step 2: Copy All Functions (5 minutes)

Open `CHAT_WEBRTC_IMPLEMENTATION.md` and copy sections 2-14 into `ChatModalManager` (after the existing methods, before the closing `};`):

Find a good spot after existing methods (e.g., after `loadEmojis()` or similar) and paste all the functions from the implementation doc.

### Step 3: Add WebSocket Handlers (2 minutes)

Find your WebSocket `onmessage` handler in `chat-modal.js` (search for `case 'message':` or similar) and add these new cases:

```javascript
case 'call_invitation':
    ChatModalManager.handleIncomingCallInvitation(data);
    break;

case 'call_answer':
    ChatModalManager.handleCallAnswer(data);
    break;

case 'ice_candidate':
    ChatModalManager.handleIceCandidate(data);
    break;

case 'call_declined':
    ChatModalManager.showToast('Call declined', 'info');
    ChatModalManager.cleanupCall();
    document.getElementById('chatCallModal')?.classList.remove('active');
    break;

case 'call_ended':
    ChatModalManager.showToast('Call ended', 'info');
    ChatModalManager.cleanupCall();
    document.getElementById('chatCallModal')?.classList.remove('active');
    break;
```

### Step 4: Add Global Functions (1 minute)

At the very end of `chat-modal.js` (after the closing `};` of ChatModalManager), add:

```javascript
// Global functions for onclick handlers
function startChatVoiceCall() {
    ChatModalManager.startChatVoiceCall();
}

function startChatVideoCall() {
    ChatModalManager.startChatVideoCall();
}
```

### Step 5: Test It! (2 minutes)

1. Open two browser windows (or one normal + one incognito)
2. Log in as different users in each
3. Open chat between them
4. Click the phone icon (voice call) or video icon (video call)
5. Accept the call in the other window
6. You should see/hear each other!

## 🎯 That's It!

Total time: ~10 minutes

The call buttons are already in the HTML ([chat-modal.html:140-150](modals/common-modals/chat-modal.html)), the CSS is already added, and the HTML structure is ready. You just need to add the JavaScript code!

## 📞 Call Buttons Location

The call buttons are in the user-info header:
- **Line 140**: Voice call button - `onclick="startChatVoiceCall()"`
- **Line 145**: Video call button - `onclick="startChatVideoCall()"`

## 🔍 Troubleshooting

**"Function not found" error?**
- Make sure you added the global wrapper functions at the end of the file

**No video/audio?**
- Check browser permissions (camera/microphone)
- Try HTTPS (WebRTC requires secure context)

**Connection not working?**
- Check WebSocket is connected
- Verify backend routes WebSocket messages correctly
- Check browser console for errors

**Can't hear/see remote peer?**
- Check ICE candidates are being exchanged
- Verify `handleIceCandidate()` is processing the queue
- Try on localhost first before production

## 📚 Full Documentation

- [CHAT_WEBRTC_IMPLEMENTATION.md](CHAT_WEBRTC_IMPLEMENTATION.md) - Complete code with explanations
- [CALL_IMPLEMENTATION_SUMMARY.md](CALL_IMPLEMENTATION_SUMMARY.md) - Detailed overview

## 🎉 Features You Get

✅ Voice-only calls (audio waves animation)
✅ Video calls (full screen remote + PIP local)
✅ Incoming call screen with ringtone
✅ Accept/Decline buttons
✅ Call duration timer
✅ Mute microphone
✅ Toggle camera on/off
✅ End call button
✅ WebRTC peer-to-peer connection
✅ NAT traversal with STUN servers
✅ Mobile responsive design
✅ Animated UI elements

Ready to go! 🚀
