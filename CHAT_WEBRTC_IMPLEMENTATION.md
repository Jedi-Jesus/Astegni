# Chat Modal WebRTC Implementation Guide

This document provides the complete WebRTC implementation for voice and video calls in the chat modal.

## 1. Add to ChatModalManager.state (around line 36)

Add these WebRTC-related state properties:

```javascript
// In ChatModalManager.state object (after line 36):
    // WebRTC Call State
    isCallActive: false,
    isVideoCall: false,  // false = voice only, true = video
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
    iceCandidateQueue: [],  // Queue ICE candidates until remote description is set
```

## 2. Add WebRTC Configuration (after the init() function, around line 300)

```javascript
// WebRTC Configuration
getWebRTCConfiguration() {
    return {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
        ]
    };
},
```

## 3. Voice Call Initiation

Add this function to start a voice call:

```javascript
// Start Voice Call (called from header button)
async startChatVoiceCall() {
    if (!this.state.selectedChat) {
        this.showToast('Please select a contact first', 'error');
        return;
    }

    console.log('📞 Starting voice call...');
    this.state.isVideoCall = false;
    this.state.isIncomingCall = false;

    try {
        // Get microphone access only
        this.state.localStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        // Show call modal in active state
        this.showCallModal(false);

        // Set up peer connection
        await this.setupPeerConnection();

        // Create and send offer
        const offer = await this.state.peerConnection.createOffer();
        await this.state.peerConnection.setLocalDescription(offer);

        // Send call invitation via WebSocket
        this.sendCallInvitation('voice', offer);

    } catch (error) {
        console.error('Failed to start voice call:', error);
        if (error.name === 'NotAllowedError') {
            this.showToast('Microphone permission denied', 'error');
        } else if (error.name === 'NotFoundError') {
            this.showToast('No microphone found', 'error');
        } else {
            this.showToast('Failed to start call: ' + error.message, 'error');
        }
        this.cleanupCall();
    }
},
```

## 4. Video Call Initiation

```javascript
// Start Video Call (called from header button)
async startChatVideoCall() {
    if (!this.state.selectedChat) {
        this.showToast('Please select a contact first', 'error');
        return;
    }

    console.log('📹 Starting video call...');
    this.state.isVideoCall = true;
    this.state.isIncomingCall = false;

    try {
        // Get camera and microphone access
        this.state.localStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        // Show call modal in active state
        this.showCallModal(true);

        // Display local video
        const localVideo = document.getElementById('chatLocalVideo');
        if (localVideo) {
            localVideo.srcObject = this.state.localStream;
        }

        // Set up peer connection
        await this.setupPeerConnection();

        // Create and send offer
        const offer = await this.state.peerConnection.createOffer();
        await this.state.peerConnection.setLocalDescription(offer);

        // Send call invitation via WebSocket
        this.sendCallInvitation('video', offer);

    } catch (error) {
        console.error('Failed to start video call:', error);
        if (error.name === 'NotAllowedError') {
            this.showToast('Camera/microphone permission denied', 'error');
        } else if (error.name === 'NotFoundError') {
            this.showToast('No camera/microphone found', 'error');
        } else {
            this.showToast('Failed to start call: ' + error.message, 'error');
        }
        this.cleanupCall();
    }
},
```

## 5. Set Up Peer Connection

```javascript
// Set up WebRTC Peer Connection
async setupPeerConnection() {
    const config = this.getWebRTCConfiguration();
    this.state.peerConnection = new RTCPeerConnection(config);

    // Add local stream tracks
    if (this.state.localStream) {
        this.state.localStream.getTracks().forEach(track => {
            this.state.peerConnection.addTrack(track, this.state.localStream);
        });
    }

    // Handle remote stream
    this.state.peerConnection.ontrack = (event) => {
        console.log('📹 Received remote track:', event.track.kind);
        this.state.remoteStream = event.streams[0];

        const remoteVideo = document.getElementById('chatRemoteVideo');
        if (remoteVideo) {
            remoteVideo.srcObject = this.state.remoteStream;
        }

        // Update status
        const statusEl = document.getElementById('chatCallStatus');
        if (statusEl) {
            statusEl.textContent = 'Connected';
        }

        // Start call timer
        this.startCallTimer();
    };

    // Handle ICE candidates
    this.state.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('🧊 Sending ICE candidate');
            this.sendIceCandidate(event.candidate);
        }
    };

    // Handle connection state changes
    this.state.peerConnection.onconnectionstatechange = () => {
        console.log('📡 Connection state:', this.state.peerConnection.connectionState);
        switch (this.state.peerConnection.connectionState) {
            case 'connected':
                console.log('✅ Call connected');
                break;
            case 'disconnected':
                this.showToast('Call disconnected', 'warning');
                break;
            case 'failed':
                this.showToast('Call failed', 'error');
                this.endChatCall();
                break;
        }
    };
},
```

## 6. Send Call Invitation via WebSocket

```javascript
// Send call invitation via WebSocket
sendCallInvitation(callType, offer) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
        this.showToast('WebSocket not connected', 'error');
        this.cleanupCall();
        return;
    }

    const conversation = this.state.selectedConversation;
    const otherParticipant = conversation.participants.find(
        p => p.profile_id !== this.state.currentProfile.profile_id
    );

    if (!otherParticipant) {
        this.showToast('Could not find call recipient', 'error');
        this.cleanupCall();
        return;
    }

    const invitation = {
        type: 'call_invitation',
        call_type: callType,  // 'voice' or 'video'
        conversation_id: conversation.id,
        from_profile_id: this.state.currentProfile.profile_id,
        from_profile_type: this.state.currentProfile.profile_type,
        from_name: this.state.currentUser.full_name || this.state.currentUser.email,
        to_profile_id: otherParticipant.profile_id,
        to_profile_type: otherParticipant.profile_type,
        offer: offer
    };

    console.log('📤 Sending call invitation:', invitation);
    this.websocket.send(JSON.stringify(invitation));

    // Update UI to show calling
    const statusEl = document.getElementById('chatCallStatus');
    if (statusEl) {
        statusEl.textContent = 'Calling...';
    }
},
```

## 7. Handle Incoming Call

```javascript
// Handle incoming call invitation
handleIncomingCallInvitation(data) {
    console.log('📞 Incoming call invitation:', data);

    this.state.pendingCallInvitation = data;
    this.state.pendingOffer = data.offer;
    this.state.isVideoCall = data.call_type === 'video';
    this.state.isIncomingCall = true;

    // Show incoming call screen
    const callModal = document.getElementById('chatCallModal');
    const incomingScreen = document.getElementById('chatIncomingCallScreen');
    const activeScreen = document.getElementById('chatActiveCallScreen');

    if (callModal && incomingScreen && activeScreen) {
        callModal.classList.add('active');
        incomingScreen.style.display = 'flex';
        activeScreen.style.display = 'none';

        // Set caller info
        document.getElementById('chatIncomingCallerName').textContent = data.from_name || 'Unknown';
        document.getElementById('chatIncomingCallType').textContent =
            data.call_type === 'video' ? 'Video Call' : 'Voice Call';

        // Set avatar
        const avatarEl = document.getElementById('chatIncomingCallAvatar');
        if (avatarEl) {
            avatarEl.src = data.from_avatar || getChatDefaultAvatar(data.from_name);
        }

        // Play ringtone
        this.playRingtone();
    }
},
```

## 8. Accept Incoming Call

```javascript
// Accept incoming call
async acceptIncomingCall() {
    console.log('✅ Accepting incoming call');

    try {
        // Stop ringtone
        this.stopRingtone();

        // Get media stream
        this.state.localStream = await navigator.mediaDevices.getUserMedia({
            video: this.state.isVideoCall ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            } : false,
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        // Show active call screen
        this.showCallModal(this.state.isVideoCall);

        // Display local video if video call
        if (this.state.isVideoCall) {
            const localVideo = document.getElementById('chatLocalVideo');
            if (localVideo) {
                localVideo.srcObject = this.state.localStream;
            }
        }

        // Set up peer connection
        await this.setupPeerConnection();

        // Set remote description (the offer)
        if (this.state.pendingOffer) {
            await this.state.peerConnection.setRemoteDescription(
                new RTCSessionDescription(this.state.pendingOffer)
            );

            // Process queued ICE candidates
            while (this.state.iceCandidateQueue.length > 0) {
                const candidate = this.state.iceCandidateQueue.shift();
                await this.state.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        }

        // Create and send answer
        const answer = await this.state.peerConnection.createAnswer();
        await this.state.peerConnection.setLocalDescription(answer);

        // Send answer via WebSocket
        this.sendCallAnswer(answer);

    } catch (error) {
        console.error('Failed to accept call:', error);
        this.showToast('Failed to accept call: ' + error.message, 'error');
        this.declineIncomingCall();
    }
},
```

## 9. Decline Incoming Call

```javascript
// Decline incoming call
declineIncomingCall() {
    console.log('❌ Declining incoming call');

    this.stopRingtone();

    // Send decline message
    if (this.state.pendingCallInvitation && this.websocket) {
        const message = {
            type: 'call_declined',
            conversation_id: this.state.pendingCallInvitation.conversation_id,
            from_profile_id: this.state.currentProfile.profile_id,
            to_profile_id: this.state.pendingCallInvitation.from_profile_id
        };
        this.websocket.send(JSON.stringify(message));
    }

    // Close call modal
    const callModal = document.getElementById('chatCallModal');
    if (callModal) {
        callModal.classList.remove('active');
    }

    // Reset state
    this.state.pendingCallInvitation = null;
    this.state.pendingOffer = null;
    this.state.isIncomingCall = false;
},
```

## 10. Send Call Answer

```javascript
// Send call answer via WebSocket
sendCallAnswer(answer) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
        console.error('WebSocket not connected');
        return;
    }

    const message = {
        type: 'call_answer',
        conversation_id: this.state.pendingCallInvitation.conversation_id,
        from_profile_id: this.state.currentProfile.profile_id,
        to_profile_id: this.state.pendingCallInvitation.from_profile_id,
        answer: answer
    };

    console.log('📤 Sending call answer');
    this.websocket.send(JSON.stringify(message));
},
```

## 11. Handle Call Answer (for caller)

```javascript
// Handle call answer (received by caller)
async handleCallAnswer(data) {
    console.log('📞 Received call answer');

    try {
        if (this.state.peerConnection && data.answer) {
            await this.state.peerConnection.setRemoteDescription(
                new RTCSessionDescription(data.answer)
            );

            // Process queued ICE candidates
            while (this.state.iceCandidateQueue.length > 0) {
                const candidate = this.state.iceCandidateQueue.shift();
                await this.state.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }

            console.log('✅ Remote description set');
        }
    } catch (error) {
        console.error('Error handling call answer:', error);
    }
},
```

## 12. Send/Receive ICE Candidates

```javascript
// Send ICE candidate
sendIceCandidate(candidate) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
        return;
    }

    const conversation = this.state.selectedConversation ||
                        { id: this.state.pendingCallInvitation?.conversation_id };

    const otherProfileId = this.state.isIncomingCall
        ? this.state.pendingCallInvitation?.from_profile_id
        : this.state.selectedConversation?.participants.find(
            p => p.profile_id !== this.state.currentProfile.profile_id
          )?.profile_id;

    const message = {
        type: 'ice_candidate',
        conversation_id: conversation.id,
        from_profile_id: this.state.currentProfile.profile_id,
        to_profile_id: otherProfileId,
        candidate: candidate
    };

    this.websocket.send(JSON.stringify(message));
},

// Handle incoming ICE candidate
async handleIceCandidate(data) {
    console.log('🧊 Received ICE candidate');

    try {
        if (this.state.peerConnection) {
            // If remote description is not set yet, queue the candidate
            if (!this.state.peerConnection.remoteDescription) {
                console.log('Queueing ICE candidate (no remote description yet)');
                this.state.iceCandidateQueue.push(data.candidate);
                return;
            }

            await this.state.peerConnection.addIceCandidate(
                new RTCIceCandidate(data.candidate)
            );
            console.log('✅ ICE candidate added');
        }
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
},
```

## 13. Call Controls

```javascript
// Toggle mute
toggleChatMute() {
    if (!this.state.localStream) return;

    const audioTrack = this.state.localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.state.isAudioMuted = !audioTrack.enabled;

        // Update button UI
        const muteBtn = document.getElementById('chatMuteBtn');
        if (muteBtn) {
            muteBtn.classList.toggle('muted', this.state.isAudioMuted);
            muteBtn.title = this.state.isAudioMuted ? 'Unmute' : 'Mute';
        }

        console.log('🎤 Audio', this.state.isAudioMuted ? 'muted' : 'unmuted');
    }
},

// Toggle video
toggleChatCallVideo() {
    if (!this.state.localStream || !this.state.isVideoCall) return;

    const videoTrack = this.state.localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.state.isVideoOff = !videoTrack.enabled;

        // Update button UI
        const videoBtn = document.getElementById('chatToggleVideoBtn');
        if (videoBtn) {
            videoBtn.classList.toggle('video-off', this.state.isVideoOff);
            videoBtn.title = this.state.isVideoOff ? 'Turn on camera' : 'Turn off camera';
        }

        console.log('📹 Video', this.state.isVideoOff ? 'off' : 'on');
    }
},

// End call
endChatCall() {
    console.log('📞 Ending call');

    // Send end call message
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        const conversation = this.state.selectedConversation ||
                            { id: this.state.pendingCallInvitation?.conversation_id };

        const message = {
            type: 'call_ended',
            conversation_id: conversation.id,
            from_profile_id: this.state.currentProfile.profile_id
        };
        this.websocket.send(JSON.stringify(message));
    }

    // Cleanup
    this.cleanupCall();

    // Hide call modal
    const callModal = document.getElementById('chatCallModal');
    if (callModal) {
        callModal.classList.remove('active');
    }
},
```

## 14. Utility Functions

```javascript
// Show call modal
showCallModal(isVideo) {
    const callModal = document.getElementById('chatCallModal');
    const incomingScreen = document.getElementById('chatIncomingCallScreen');
    const activeScreen = document.getElementById('chatActiveCallScreen');
    const voiceAnimation = document.getElementById('chatVoiceCallAnimation');
    const videoToggleBtn = document.getElementById('chatToggleVideoBtn');

    if (!callModal || !activeScreen) return;

    callModal.classList.add('active');
    if (incomingScreen) incomingScreen.style.display = 'none';
    activeScreen.style.display = 'block';

    // Show/hide voice animation
    if (voiceAnimation) {
        voiceAnimation.style.display = isVideo ? 'none' : 'flex';
    }

    // Show/hide video toggle button
    if (videoToggleBtn) {
        videoToggleBtn.style.display = isVideo ? 'inline-flex' : 'none';
    }

    // Set user info
    if (this.state.selectedChat) {
        document.getElementById('chatCallUserName').textContent =
            this.state.selectedChat.name || 'Unknown';
        document.getElementById('chatCallUserRole').textContent =
            this.state.selectedChat.role || '';

        const avatarEl = document.getElementById('chatCallUserAvatar');
        if (avatarEl) {
            avatarEl.src = this.state.selectedChat.avatar ||
                          getChatDefaultAvatar(this.state.selectedChat.name);
        }
    }

    this.state.isCallActive = true;
},

// Start call timer
startCallTimer() {
    this.state.callStartTime = Date.now();
    this.state.callDurationInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.state.callStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        const timerEl = document.getElementById('chatCallTimer');
        if (timerEl) {
            timerEl.textContent = formatted;
        }
    }, 1000);
},

// Cleanup call
cleanupCall() {
    // Stop all tracks
    if (this.state.localStream) {
        this.state.localStream.getTracks().forEach(track => track.stop());
        this.state.localStream = null;
    }

    if (this.state.remoteStream) {
        this.state.remoteStream.getTracks().forEach(track => track.stop());
        this.state.remoteStream = null;
    }

    // Close peer connection
    if (this.state.peerConnection) {
        this.state.peerConnection.close();
        this.state.peerConnection = null;
    }

    // Stop timer
    if (this.state.callDurationInterval) {
        clearInterval(this.state.callDurationInterval);
        this.state.callDurationInterval = null;
    }

    // Reset state
    this.state.isCallActive = false;
    this.state.isVideoCall = false;
    this.state.isIncomingCall = false;
    this.state.isAudioMuted = false;
    this.state.isVideoOff = false;
    this.state.pendingOffer = null;
    this.state.pendingCallInvitation = null;
    this.state.iceCandidateQueue = [];

    this.stopRingtone();
},

// Ringtone functions
playRingtone() {
    // Create audio element for ringtone
    if (!this.ringtoneAudio) {
        this.ringtoneAudio = new Audio();
        this.ringtoneAudio.loop = true;
        // Use default browser notification sound or custom ringtone
        this.ringtoneAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAo=';
    }
    this.ringtoneAudio.play().catch(e => console.log('Could not play ringtone:', e));
},

stopRingtone() {
    if (this.ringtoneAudio) {
        this.ringtoneAudio.pause();
        this.ringtoneAudio.currentTime = 0;
    }
},
```

## 15. WebSocket Message Handlers

Add these cases to your existing WebSocket message handler:

```javascript
// In your existing WebSocket onmessage handler, add these cases:

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

## 16. Global Functions (for onclick handlers)

Add these global wrapper functions at the end of the file:

```javascript
// Global functions for onclick handlers
function startChatVoiceCall() {
    ChatModalManager.startChatVoiceCall();
}

function startChatVideoCall() {
    ChatModalManager.startChatVideoCall();
}
```

## Implementation Complete!

This implementation follows the whiteboard modal pattern and provides:
- ✅ Voice-only calls
- ✅ Video calls
- ✅ Incoming call screen with accept/decline
- ✅ WebRTC signaling via WebSocket
- ✅ ICE candidate handling
- ✅ Call controls (mute, video toggle)
- ✅ Call timer
- ✅ Proper cleanup

The call modal will now work for both incoming and outgoing voice/video calls!
