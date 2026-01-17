# Standalone Chat Call Modal - Quick Start

## What Is This?

A standalone chat call modal that allows users to receive incoming audio/video calls from anywhere in the Astegni application, without needing to open the chat modal first.

## Key Benefits

✅ **Automatic** - Pops up automatically when someone calls
✅ **Standalone** - Works independently of chat modal
✅ **WebRTC** - Peer-to-peer audio/video calls
✅ **Responsive** - Works on mobile and desktop
✅ **Integrated** - Already added to all major pages

## Quick Links

- 📘 **[Integration Guide](STANDALONE_CALL_MODAL_GUIDE.md)** - Complete documentation
- 🏗️ **[Architecture](CALL_MODAL_ARCHITECTURE.md)** - System diagrams and flow
- ✅ **[Integration Status](CALL_MODAL_INTEGRATION_COMPLETE.md)** - What's been done
- 🧪 **[Test Page](INTEGRATE_CALL_MODAL.html)** - Live demo with test buttons

## Files Created

| File | Purpose |
|------|---------|
| `modals/common-modals/chat-call-modal.html` | Modal HTML structure |
| `css/common-modals/chat-call-modal.css` | Complete styling |
| `js/common-modals/chat-call-modal.js` | JavaScript manager |

## Pages Integrated

✅ Tutor Profile (`profile-pages/tutor-profile.html`)
✅ Student Profile (`profile-pages/student-profile.html`)
✅ Parent Profile (`profile-pages/parent-profile.html`)
✅ Find Tutors (`branch/find-tutors.html`)

## How to Use

### For Users
1. Log in to Astegni
2. Navigate to any page (profile, find tutors, etc.)
3. When someone calls you, the modal pops up automatically
4. Click "Accept" to answer or "Decline" to reject
5. Use the call controls to mute, toggle video, or end call

### For Developers

#### Test the Modal
1. Open `INTEGRATE_CALL_MODAL.html` in browser
2. Click "Test Voice Call" or "Test Video Call"
3. Verify the modal appears and functions correctly

#### Add to New Pages
```html
<!-- 1. Add CSS in <head> -->
<link rel="stylesheet" href="../css/common-modals/chat-call-modal.css">

<!-- 2. Add JavaScript before </body> -->
<script src="../js/common-modals/chat-call-modal.js"></script>

<!-- 3. Load modal HTML -->
<script>
fetch('../modals/common-modals/chat-call-modal.html')
    .then(response => response.text())
    .then(html => {
        document.body.insertAdjacentHTML('beforeend', html);
        console.log('✅ Standalone Chat Call Modal loaded');
    });
</script>
```

## Features

### Incoming Call Screen
- Caller avatar with pulsing animation
- Caller name and role
- Call type (voice/video)
- Accept/Decline buttons
- Ringtone support (placeholder)

### Active Call Screen
- Full-screen video interface
- Picture-in-picture for local video
- Voice wave animation for audio calls
- Call timer
- Controls:
  - 🔇 Mute/Unmute
  - 📹 Toggle video
  - 🔄 Switch voice/video mode
  - ➕ Add participant (coming soon)
  - ❌ End call

## WebSocket Events

The modal automatically handles these WebSocket message types:

| Event | Description |
|-------|-------------|
| `incoming_call` | Shows modal with caller info |
| `call_accepted` | Starts WebRTC connection |
| `call_declined` | Closes modal |
| `call_ended` | Ends call and cleans up |
| `webrtc_offer` | Handles WebRTC offer |
| `webrtc_answer` | Handles WebRTC answer |
| `ice_candidate` | Adds ICE candidate |

## Backend Integration

Your backend should send WebSocket messages in this format:

```json
{
  "type": "incoming_call",
  "call_id": "unique_call_id",
  "conversation_id": "conv_id",
  "caller_name": "John Doe",
  "caller_role": "Tutor",
  "caller_avatar": "/path/to/avatar.jpg",
  "call_type": "voice"
}
```

## Browser Requirements

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari (iOS 11+)
- ⚠️ **HTTPS required in production** (WebRTC needs secure context)

## Troubleshooting

### Modal doesn't appear
- Check browser console for errors
- Verify WebSocket connection is active
- Ensure modal HTML loaded successfully

### No audio/video
- Check browser permissions (camera/microphone)
- Verify HTTPS in production
- Check browser console for WebRTC errors

### Call doesn't connect
- Verify WebSocket is sending correct events
- Check STUN/TURN server accessibility
- Review browser console for connection errors

## Testing Checklist

- [ ] Open test page: `INTEGRATE_CALL_MODAL.html`
- [ ] Click "Test Voice Call" - modal appears
- [ ] Click "Accept" - active call screen shows
- [ ] Test mute button - UI updates
- [ ] Test video toggle (if video call)
- [ ] Test mode switch - voice ↔ video
- [ ] Click "End Call" - modal closes
- [ ] Repeat with "Test Video Call"

## Next Steps

### Immediate
1. Test on all integrated pages
2. Verify WebSocket events work correctly
3. Test actual calls between users

### Future Enhancements
- Group calls (multi-participant)
- Screen sharing
- Call recording
- Custom ringtones
- Call history
- Push notifications for missed calls

## Documentation

| Document | Description |
|----------|-------------|
| **[README_CALL_MODAL.md](README_CALL_MODAL.md)** | This quick start guide |
| **[STANDALONE_CALL_MODAL_GUIDE.md](STANDALONE_CALL_MODAL_GUIDE.md)** | Complete integration guide with API details |
| **[CALL_MODAL_ARCHITECTURE.md](CALL_MODAL_ARCHITECTURE.md)** | System architecture and flow diagrams |
| **[CALL_MODAL_INTEGRATION_COMPLETE.md](CALL_MODAL_INTEGRATION_COMPLETE.md)** | Integration status and page-by-page details |
| **[INTEGRATE_CALL_MODAL.html](INTEGRATE_CALL_MODAL.html)** | Live demo page with test buttons |

## Support

- **Issues?** Check the troubleshooting section above
- **Questions?** Review the documentation links
- **Bugs?** Check browser console for errors

## Code Example

### Manual Trigger (for testing)
```javascript
// Simulate an incoming call
StandaloneChatCallManager.handleIncomingCall({
    call_id: 'test_123',
    conversation_id: 'conv_456',
    caller_name: 'Jane Smith',
    caller_role: 'Student',
    caller_avatar: '/path/to/avatar.jpg',
    call_type: 'voice'
});
```

### End Call Programmatically
```javascript
StandaloneChatCallManager.endChatCall();
```

### Check Call Status
```javascript
console.log(StandaloneChatCallManager.currentCall);
console.log(StandaloneChatCallManager.callMode); // 'voice' or 'video'
console.log(StandaloneChatCallManager.isMuted);
console.log(StandaloneChatCallManager.isVideoEnabled);
```

## Success Criteria

The modal is working correctly when:

1. ✅ Loads without errors on all pages
2. ✅ WebSocket listeners are active
3. ✅ Incoming calls show modal automatically
4. ✅ Accept button starts call
5. ✅ WebRTC connection establishes
6. ✅ Media streams properly
7. ✅ Controls work (mute, video, mode switch)
8. ✅ End call cleans up resources

## Production Deployment

Before going live:

1. Test on all integrated pages
2. Verify HTTPS is enabled
3. Test with real users and calls
4. Check mobile responsiveness
5. Verify call quality on different networks
6. Test error handling (permissions, network drops)
7. Load test with multiple concurrent calls

---

**Version**: 1.0
**Status**: ✅ Ready for Testing
**Last Updated**: 2026-01-16

**Quick Links**:
[Integration Guide](STANDALONE_CALL_MODAL_GUIDE.md) | [Architecture](CALL_MODAL_ARCHITECTURE.md) | [Test Page](INTEGRATE_CALL_MODAL.html)
