# Call Mode Switching - Voice ↔ Video

## Feature Overview

Users can now switch between voice and video modes during an active call without having to end and restart the call. This provides a seamless experience when users want to upgrade from voice to video or downgrade from video to voice.

## Implementation Date
January 16, 2026

## How It Works

### User Experience

**During a Voice Call:**
- User sees a blue "Switch to Video" button in call controls
- Clicking it enables camera and switches to video mode
- Remote user is notified and sees the video feed
- Button changes to "Switch to Voice"

**During a Video Call:**
- User sees a blue "Switch to Voice" button in call controls
- Clicking it disables camera and switches to voice-only mode
- Remote user is notified and video feed stops
- Button changes to "Switch to Video"

### Technical Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User clicks "Switch Mode" button                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ switchCallMode() function called                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
                ┌───────────────────────┐
                │   Current Mode?       │
                └───────────────────────┘
                    ↙               ↘
        ┌─────────────┐       ┌─────────────┐
        │   VIDEO     │       │   VOICE     │
        └─────────────┘       └─────────────┘
              ↓                     ↓
    ┌──────────────────┐   ┌──────────────────┐
    │ Switch to VOICE  │   │ Switch to VIDEO  │
    └──────────────────┘   └──────────────────┘
              ↓                     ↓
    1. Stop video track      1. Get video stream
    2. Remove from stream    2. Add to stream
    3. Remove from peer      3. Add to peer
    4. Update UI             4. Update UI
    5. Hide local video      5. Show local video
              ↓                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Send "call_mode_switched" message via WebSocket             │
└─────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│ Trigger WebRTC renegotiation with new offer                 │
└─────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│ Remote user receives notification and new media tracks      │
└─────────────────────────────────────────────────────────────┘
```

## Files Modified

### 1. Frontend - HTML
**File:** [modals/common-modals/chat-modal.html](modals/common-modals/chat-modal.html#L1817)

Added new button in call controls:
```html
<button id="chatSwitchModeBtn" onclick="ChatModalManager.switchCallMode()" title="Switch to Video">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
    </svg>
</button>
```

### 2. Frontend - JavaScript
**File:** [js/common-modals/chat-modal.js](js/common-modals/chat-modal.js)

#### A. Added `switchCallMode()` function (Line 14789-14931)
```javascript
async switchCallMode() {
    if (!this.state.localStream || !this.state.peerConnection) {
        console.log('❌ Cannot switch mode: No active call');
        return;
    }

    const targetMode = this.state.isVideoCall ? 'voice' : 'video';

    try {
        if (this.state.isVideoCall) {
            // VIDEO → VOICE
            // 1. Remove video track from stream and peer connection
            // 2. Update UI to voice mode
            // 3. Hide local video
        } else {
            // VOICE → VIDEO
            // 1. Get new video stream
            // 2. Add video track to stream and peer connection
            // 3. Update UI to video mode
            // 4. Show local video
        }

        // Send notification to remote user
        // Trigger WebRTC renegotiation
    } catch (error) {
        this.showToast(`Failed to switch to ${targetMode}: ${error.message}`, 'error');
    }
}
```

#### B. Added `handleRemoteModeSwitched()` function (Line 14773-14786)
```javascript
handleRemoteModeSwitched(newMode) {
    console.log(`🔄 Remote user switched to ${newMode} mode`);
    this.showToast(`Other user switched to ${newMode} call`, 'info');
}
```

#### C. Updated `showCallModal()` function (Line 15026-15073)
Added automatic button state update based on current call mode:
```javascript
if (switchModeBtn) {
    if (isVideo) {
        switchModeBtn.title = 'Switch to Voice';
        // Show microphone icon
    } else {
        switchModeBtn.title = 'Switch to Video';
        // Show video camera icon
    }
}
```

#### D. Added WebSocket message handler (Line 14096-14099)
```javascript
case 'call_mode_switched':
    console.log('🔄 Other user switched call mode to:', data.new_mode);
    this.handleRemoteModeSwitched(data.new_mode);
    break;
```

### 3. Frontend - CSS
**File:** [css/common-modals/chat-modal.css](css/common-modals/chat-modal.css#L9235-9241)

Added styling for switch mode button:
```css
.call-controls button#chatSwitchModeBtn {
    background: rgba(59, 130, 246, 0.3);
}

.call-controls button#chatSwitchModeBtn:hover {
    background: rgba(59, 130, 246, 0.5);
}
```

### 4. Backend - WebSocket Router
**File:** [astegni-backend/app.py](astegni-backend/app.py#L493-498)

Added new message types to WebSocket routing:
```python
elif message_type in ["video_call_invitation", "video_offer", "video_answer",
                      "ice_candidate", "video_call_declined", "video_call_ended",
                      "video_call_cancelled", "video_call_participant_left",
                      "call_invitation", "call_answer", "call_declined", "call_ended", "call_cancelled",
                      "call_mode_switched", "webrtc_offer"]:  # Added these two
    await handle_video_call_message(message, connection_key, db)
```

## WebSocket Messages

### 1. Mode Switch Notification
```json
{
    "type": "call_mode_switched",
    "conversation_id": 37,
    "from_profile_id": 1,
    "to_profile_id": 2,
    "to_profile_type": "student",
    "new_mode": "video"
}
```

### 2. WebRTC Renegotiation Offer
```json
{
    "type": "webrtc_offer",
    "conversation_id": 37,
    "from_profile_id": 1,
    "to_profile_id": 2,
    "to_profile_type": "student",
    "offer": {
        "type": "offer",
        "sdp": "v=0\r\no=- ..."
    }
}
```

## WebRTC Details

### Voice to Video Upgrade

1. **Get Camera Access:**
   ```javascript
   const videoStream = await navigator.mediaDevices.getUserMedia({
       video: {
           width: { ideal: 1280 },
           height: { ideal: 720 },
           facingMode: 'user'
       }
   });
   ```

2. **Add Video Track:**
   ```javascript
   const videoTrack = videoStream.getVideoTracks()[0];
   this.state.localStream.addTrack(videoTrack);
   this.state.peerConnection.addTrack(videoTrack, this.state.localStream);
   ```

3. **Renegotiate:**
   ```javascript
   const offer = await this.state.peerConnection.createOffer();
   await this.state.peerConnection.setLocalDescription(offer);
   // Send offer to peer via WebSocket
   ```

### Video to Voice Downgrade

1. **Stop Video Track:**
   ```javascript
   const videoTrack = this.state.localStream.getVideoTracks()[0];
   if (videoTrack) {
       videoTrack.stop();
       this.state.localStream.removeTrack(videoTrack);
   }
   ```

2. **Remove from Peer Connection:**
   ```javascript
   const videoSender = this.state.peerConnection.getSenders()
       .find(s => s.track && s.track.kind === 'video');
   if (videoSender) {
       this.state.peerConnection.removeTrack(videoSender);
   }
   ```

3. **Renegotiate:**
   ```javascript
   const offer = await this.state.peerConnection.createOffer();
   await this.state.peerConnection.setLocalDescription(offer);
   // Send offer to peer via WebSocket
   ```

## UI States

### Button Icon - Voice Mode
```svg
<!-- Video camera icon - indicating switch TO video -->
<svg width="24" height="24" viewBox="0 0 24 24">
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
</svg>
```

### Button Icon - Video Mode
```svg
<!-- Microphone icon - indicating switch TO voice -->
<svg width="24" height="24" viewBox="0 0 24 24">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
</svg>
```

## Testing Instructions

### Test 1: Voice to Video Upgrade
1. Start a voice call between two users
2. During the call, click "Switch to Video" button
3. **Expected:**
   - Camera permission prompt appears (if first time)
   - Local video feed appears
   - Remote user sees your video feed
   - Button changes to "Switch to Voice"
   - Remote user gets notification: "Other user switched to video call"

### Test 2: Video to Voice Downgrade
1. Start a video call between two users
2. During the call, click "Switch to Voice" button
3. **Expected:**
   - Local video feed disappears
   - Voice wave animation appears
   - Remote user's video of you disappears
   - Button changes to "Switch to Video"
   - Remote user gets notification: "Other user switched to voice call"

### Test 3: Multiple Switches
1. Start a voice call
2. Switch to video
3. Switch back to voice
4. Switch to video again
5. **Expected:**
   - All transitions work smoothly
   - No audio/video glitches
   - Button state always reflects current mode
   - Notifications appear for each switch

### Test 4: Error Handling
1. Start a voice call
2. Deny camera permission when switching to video
3. **Expected:**
   - Error toast: "Failed to switch to video: Permission denied"
   - Call continues as voice call
   - Button remains as "Switch to Video"

## Console Output

### Successful Voice → Video Switch
```
🔄 Switching call mode from voice to video
📹 Video stream obtained
✅ Switched to video call
🔄 Sending mode switch notification
🔄 Creating new offer for renegotiation
```

### Successful Video → Voice Switch
```
🔄 Switching call mode from video to voice
🎤 Video track stopped and removed
✅ Switched to voice call
🔄 Sending mode switch notification
🔄 Creating new offer for renegotiation
```

### Remote User Notification
```
🔄 Other user switched call mode to: video
📹 Remote user enabled video
```

## Edge Cases Handled

### 1. No Active Call
```javascript
if (!this.state.localStream || !this.state.peerConnection) {
    console.log('❌ Cannot switch mode: No active call');
    return;
}
```

### 2. Camera Permission Denied
```javascript
try {
    const videoStream = await navigator.mediaDevices.getUserMedia({...});
} catch (error) {
    this.showToast(`Failed to switch to video: ${error.message}`, 'error');
}
```

### 3. Signaling State Check
```javascript
if (this.state.peerConnection.signalingState === 'stable') {
    // Only renegotiate if in stable state
    const offer = await this.state.peerConnection.createOffer();
}
```

## Benefits

1. **Seamless Transitions** - No need to end and restart calls
2. **Bandwidth Optimization** - Users can downgrade to voice to save bandwidth
3. **Privacy Control** - Quick switch to voice when camera privacy is needed
4. **User Flexibility** - Start with voice, upgrade to video when needed
5. **Better UX** - One-click switching with visual feedback

## Button Styling

- **Color:** Blue background (`rgba(59, 130, 246, 0.3)`)
- **Hover:** Darker blue (`rgba(59, 130, 246, 0.5)`)
- **Position:** Between "Toggle Video" and "Mute" buttons
- **Size:** 60px × 60px circular button
- **Icon:** Changes based on current mode

## Related Files

- [CALL_LOGS_DISPLAY_FIX.md](CALL_LOGS_DISPLAY_FIX.md) - Call history display
- [CALL_LOGGING_BUG_FIX.md](CALL_LOGGING_BUG_FIX.md) - Database call logging
- [WEBRTC_CALLS_IMPLEMENTATION_COMPLETE.md](WEBRTC_CALLS_IMPLEMENTATION_COMPLETE.md) - WebRTC setup

## Summary

✅ **Button Added** - Blue switch mode button in call controls
✅ **Voice → Video** - Upgrade from voice to video during call
✅ **Video → Voice** - Downgrade from video to voice during call
✅ **WebSocket Signaling** - Notify remote user of mode changes
✅ **WebRTC Renegotiation** - Seamless media track switching
✅ **UI Updates** - Dynamic button icon and tooltip
✅ **Error Handling** - Graceful handling of permission denials
✅ **User Notifications** - Toast messages for mode switches

The call mode switching feature is now **fully implemented** and ready for testing!

---

**Status:** ✅ Complete
**Implementation Date:** January 16, 2026
**Feature:** Switch between voice and video during active calls
