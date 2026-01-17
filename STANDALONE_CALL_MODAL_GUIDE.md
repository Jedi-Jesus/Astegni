# Standalone Chat Call Modal Integration Guide

## Overview

The standalone chat call modal allows users to receive incoming calls from anywhere in the application, without needing to open the chat modal first. When a contact calls, the call modal will pop up automatically.

## Files Created

1. **HTML**: `modals/common-modals/chat-call-modal.html`
2. **CSS**: `css/common-modals/chat-call-modal.css`
3. **JavaScript**: `js/common-modals/chat-call-modal.js`

## Integration Steps

### Step 1: Add CSS to Your Page

Add the chat call modal CSS to the `<head>` section of your page:

```html
<link rel="stylesheet" href="/css/common-modals/chat-call-modal.css">
```

### Step 2: Add JavaScript to Your Page

Add the chat call modal JavaScript before the closing `</body>` tag:

```html
<script src="/js/common-modals/chat-call-modal.js"></script>
```

**Important**: Make sure this is loaded AFTER:
- WebSocket manager (`websocket_manager.js` or chat WebSocket initialization)
- Auth/user initialization

### Step 3: Load the Modal HTML

Add this JavaScript to load the modal HTML into your page:

```javascript
// Load standalone call modal
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/modals/common-modals/chat-call-modal.html');
        const html = await response.text();
        document.body.insertAdjacentHTML('beforeend', html);
        console.log('Standalone chat call modal loaded');
    } catch (error) {
        console.error('Failed to load chat call modal:', error);
    }
});
```

**Alternative**: Use the modal loader if available:

```javascript
await modalLoader.loadModal('chat-call-modal.html', 'common');
```

## Complete Integration Example

Here's a complete example for a profile page:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My Profile</title>

    <!-- Other CSS -->
    <link rel="stylesheet" href="/css/root.css">

    <!-- Standalone Call Modal CSS -->
    <link rel="stylesheet" href="/css/common-modals/chat-call-modal.css">
</head>
<body>
    <!-- Your page content -->

    <!-- Scripts -->
    <script src="/js/root/app.js"></script>
    <script src="/js/root/auth.js"></script>

    <!-- WebSocket (if not already included) -->
    <script src="/js/websocket-manager.js"></script>

    <!-- Standalone Call Modal -->
    <script src="/js/common-modals/chat-call-modal.js"></script>

    <!-- Load modal HTML -->
    <script>
        document.addEventListener('DOMContentLoaded', async () => {
            // Initialize user/auth first
            await authManager.initialize();

            // Load call modal
            try {
                const response = await fetch('/modals/common-modals/chat-call-modal.html');
                const html = await response.text();
                document.body.insertAdjacentHTML('beforeend', html);
                console.log('Standalone chat call modal loaded');
            } catch (error) {
                console.error('Failed to load chat call modal:', error);
            }
        });
    </script>
</body>
</html>
```

## How It Works

### Automatic Incoming Calls

Once integrated, the standalone call modal will automatically:

1. **Listen for WebSocket events** - Monitors for `incoming_call` messages
2. **Display incoming call screen** - Shows caller info with accept/decline buttons
3. **Handle WebRTC connection** - Manages audio/video streams
4. **Show active call screen** - Full-screen call interface with controls

### Manual Integration (If Needed)

If you need to manually trigger the call modal:

```javascript
// Show incoming call (usually triggered by WebSocket)
StandaloneChatCallManager.handleIncomingCall({
    call_id: 'call_123',
    conversation_id: 'conv_456',
    caller_name: 'John Doe',
    caller_role: 'Tutor',
    caller_avatar: '/path/to/avatar.jpg',
    call_type: 'voice' // or 'video'
});

// End call
StandaloneChatCallManager.endChatCall();
```

## Features

### Incoming Call Screen
- Caller avatar with pulsing ring animation
- Caller name and role
- Call type (voice/video)
- Accept/Decline buttons

### Active Call Screen
- Full-screen interface
- Video display (for video calls)
- Voice wave animation (for voice calls)
- Call timer
- Controls:
  - Mute/Unmute
  - Toggle video (for video calls)
  - Switch between voice/video modes
  - Add participant (placeholder for group calls)
  - End call

## WebSocket Event Types

The modal listens for these WebSocket message types:

- `incoming_call` - New incoming call
- `call_ended` - Remote user ended call
- `webrtc_offer` - WebRTC offer from caller
- `webrtc_answer` - WebRTC answer from callee
- `ice_candidate` - ICE candidate for connection
- `call_mode_changed` - Remote user switched voice/video

## Backend Requirements

Your backend should send WebSocket messages in this format:

### Incoming Call
```json
{
    "type": "incoming_call",
    "call_id": "unique_call_id",
    "conversation_id": "conversation_id",
    "caller_name": "John Doe",
    "caller_role": "Tutor",
    "caller_avatar": "/uploads/avatars/user_123.jpg",
    "call_type": "voice"
}
```

### WebRTC Signaling
```json
{
    "type": "webrtc_offer",
    "offer": { /* RTCSessionDescription */ },
    "call_id": "call_id",
    "conversation_id": "conversation_id"
}
```

## Troubleshooting

### Modal Not Appearing
1. Check browser console for errors
2. Verify modal HTML is loaded into DOM
3. Ensure WebSocket connection is active
4. Check z-index conflicts (modal uses z-index: 10002)

### No Audio/Video
1. Check browser permissions for camera/microphone
2. Verify WebRTC connection is established
3. Check browser console for WebRTC errors
4. Test with HTTPS (WebRTC requires secure context in production)

### WebSocket Not Connected
1. Ensure WebSocket is initialized before call modal
2. Check WebSocket connection status
3. Verify backend WebSocket endpoint is running
4. Check for WebSocket authentication issues

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 11+)
- WebRTC requires HTTPS in production (localhost is exempt)

## Notes

- The modal uses the global `StandaloneChatCallManager` instance
- All functions are exposed globally for `onclick` handlers
- Modal is completely independent of chat modal
- Can be integrated into any page (profile, dashboard, etc.)
- Automatically handles incoming calls without user interaction needed

## Future Enhancements

- Group call support
- Screen sharing
- Call recording
- Custom ringtones
- Call history integration
- Push notifications for missed calls
