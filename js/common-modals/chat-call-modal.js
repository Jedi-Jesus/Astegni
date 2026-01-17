/**
 * Standalone Chat Call Modal Manager
 * Handles incoming calls independently of chat modal
 * Can pop up anywhere in the application
 */

class StandaloneChatCallManagerClass {
    constructor() {
        this.currentCall = null;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.callTimer = null;
        this.callStartTime = null;
        this.isMuted = false;
        this.isVideoEnabled = false;
        this.callMode = 'voice'; // 'voice' or 'video'
        this.isIncoming = false;
        this.incomingCallData = null;
        this.retryCount = 0;
        this.maxRetries = 3; // Stop after 3 retries
    }

    /**
     * Initialize the standalone call modal
     * Called on page load
     */
    async initialize() {
        console.log('[StandaloneChatCall] Initializing...');

        // Listen for WebSocket incoming call events
        if (window.chatWebSocket) {
            this.setupWebSocketListeners();
        } else {
            // Wait for WebSocket to be ready (when chat modal opens)
            document.addEventListener('websocket-ready', () => {
                this.setupWebSocketListeners();
            });

            // Also try to initialize our own WebSocket connection for calls
            // This ensures calls work even if user never opens chat modal
            this.initializeStandaloneWebSocket();
        }
    }

    /**
     * Initialize standalone WebSocket for calls (independent of chat modal)
     * This allows receiving calls without opening chat modal first
     */
    async initializeStandaloneWebSocket() {
        try {
            // Get current user profile info
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                console.log('[StandaloneChatCall] No token, waiting for user to log in');
                return;
            }

            // Get user profile
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                console.log('[StandaloneChatCall] Could not get user profile');
                return;
            }

            const userData = await response.json();
            let activeRole = localStorage.getItem('active_role');

            console.log('[StandaloneChatCall] User data:', userData);
            console.log('[StandaloneChatCall] User data keys:', Object.keys(userData));
            console.log('[StandaloneChatCall] localStorage active_role:', activeRole);
            console.log('[StandaloneChatCall] Current path:', window.location.pathname);

            // If active_role not set, detect from URL path and user roles
            if (!activeRole) {
                console.log('[StandaloneChatCall] active_role not set, detecting from page...');

                const path = window.location.pathname.toLowerCase();
                const userRoles = userData.roles || [];

                console.log('[StandaloneChatCall] User roles:', userRoles);

                // Detect role from URL path
                if (path.includes('tutor-profile') && userRoles.includes('tutor')) {
                    activeRole = 'tutor';
                } else if (path.includes('student-profile') && userRoles.includes('student')) {
                    activeRole = 'student';
                } else if (path.includes('parent-profile') && userRoles.includes('parent')) {
                    activeRole = 'parent';
                } else if (path.includes('advertiser-profile') && userRoles.includes('advertiser')) {
                    activeRole = 'advertiser';
                } else {
                    // Default to first available role
                    if (userRoles.includes('tutor')) activeRole = 'tutor';
                    else if (userRoles.includes('student')) activeRole = 'student';
                    else if (userRoles.includes('parent')) activeRole = 'parent';
                    else if (userRoles.includes('advertiser')) activeRole = 'advertiser';
                }

                console.log('[StandaloneChatCall] Detected role from URL/roles:', activeRole);

                // Set active_role in localStorage for future use
                if (activeRole) {
                    localStorage.setItem('active_role', activeRole);
                    console.log('[StandaloneChatCall] Set active_role in localStorage:', activeRole);
                }
            }

            // Get profile ID by fetching the role-specific profile from API
            console.log('[StandaloneChatCall] Fetching profile for role:', activeRole);

            let profileId, profileType;
            try {
                const profileEndpoint = `${window.API_BASE_URL || 'http://localhost:8000'}/api/${activeRole}/profile`;
                console.log('[StandaloneChatCall] Fetching from:', profileEndpoint);

                const profileResponse = await fetch(profileEndpoint, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    profileId = profileData.id;
                    profileType = activeRole.charAt(0).toUpperCase() + activeRole.slice(1); // Capitalize first letter
                    console.log('[StandaloneChatCall] Got profile from API - ID:', profileId, 'Type:', profileType);
                } else {
                    console.log('[StandaloneChatCall] Could not fetch profile:', profileResponse.status, profileResponse.statusText);

                    // Check retry limit
                    this.retryCount++;
                    if (this.retryCount > this.maxRetries) {
                        console.log('[StandaloneChatCall] Max retries reached. Giving up. WebSocket will connect when chat modal opens.');
                        return;
                    }

                    setTimeout(() => {
                        this.initializeStandaloneWebSocket();
                    }, 2000);
                    return;
                }
            } catch (error) {
                console.error('[StandaloneChatCall] Error fetching profile:', error);

                // Check retry limit
                this.retryCount++;
                if (this.retryCount > this.maxRetries) {
                    console.log('[StandaloneChatCall] Max retries reached. Giving up. WebSocket will connect when chat modal opens.');
                    return;
                }

                setTimeout(() => {
                    this.initializeStandaloneWebSocket();
                }, 2000);
                return;
            }

            // Connect to WebSocket
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const apiHost = (window.API_BASE_URL || 'http://localhost:8000').replace(/^https?:\/\//, '');
            const wsUrl = `${wsProtocol}//${apiHost}/ws/${profileId}/${profileType}`;

            console.log('[StandaloneChatCall] Connecting to WebSocket:', wsUrl);

            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('[StandaloneChatCall] ✅ WebSocket connected for calls');
                // Expose globally so it can be used
                window.chatWebSocket = ws;
                // Setup listeners
                this.setupWebSocketListeners();
                // Dispatch event for other components
                document.dispatchEvent(new CustomEvent('websocket-ready'));
            };

            ws.onerror = (error) => {
                console.error('[StandaloneChatCall] WebSocket error:', error);
            };

            ws.onclose = () => {
                console.log('[StandaloneChatCall] WebSocket closed, will reconnect in 5s');
                // Reconnect after 5 seconds
                setTimeout(() => {
                    this.initializeStandaloneWebSocket();
                }, 5000);
            };

        } catch (error) {
            console.error('[StandaloneChatCall] Failed to initialize WebSocket:', error);
        }
    }

    /**
     * Setup WebSocket listeners for incoming calls
     */
    setupWebSocketListeners() {
        if (!window.chatWebSocket) {
            console.error('[StandaloneChatCall] WebSocket not available');
            return;
        }

        console.log('[StandaloneChatCall] Setting up WebSocket listeners');

        // Listen for incoming calls
        window.chatWebSocket.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);

            // Support both 'call_invitation' (new) and 'incoming_call' (legacy)
            if (data.type === 'call_invitation' || data.type === 'incoming_call') {
                console.log('[StandaloneChatCall] Received call invitation:', data);
                this.handleIncomingCall(data);
            } else if (data.type === 'call_ended') {
                this.handleCallEnded(data);
            } else if (data.type === 'webrtc_offer') {
                this.handleWebRTCOffer(data);
            } else if (data.type === 'webrtc_answer') {
                this.handleWebRTCAnswer(data);
            } else if (data.type === 'ice_candidate') {
                this.handleICECandidate(data);
            }
        });
    }

    /**
     * Handle incoming call notification
     */
    async handleIncomingCall(data) {
        console.log('[StandaloneChatCall] Incoming call:', data);

        this.isIncoming = true;
        this.incomingCallData = data;

        // Show incoming call screen
        const modal = document.getElementById('standaloneChatCallModal');
        const incomingScreen = document.getElementById('standaloneIncomingCallScreen');
        const activeScreen = document.getElementById('standaloneActiveCallScreen');

        if (!modal || !incomingScreen || !activeScreen) {
            console.error('[StandaloneChatCall] Modal elements not found');
            return;
        }

        // Set caller information (support both formats)
        const callerName = data.caller_name || data.from_name || 'Unknown';
        const callerAvatar = data.caller_avatar || data.from_avatar || '/assets/default-avatar.png';

        document.getElementById('standaloneIncomingCallerName').textContent = callerName;
        document.getElementById('standaloneIncomingCallType').textContent = data.call_type === 'video' ? 'Video Call' : 'Voice Call';

        const avatarImg = document.getElementById('standaloneIncomingCallAvatar');
        avatarImg.src = callerAvatar;

        // Show modal and incoming screen
        modal.classList.add('active');
        incomingScreen.style.display = 'flex';
        activeScreen.style.display = 'none';

        // Play ringtone (optional)
        this.playRingtone();
    }

    /**
     * Accept incoming call
     */
    async acceptIncomingCall() {
        console.log('[StandaloneChatCall] Accepting call - delegating to chat modal for WebRTC');

        if (!this.incomingCallData) {
            console.error('[StandaloneChatCall] No incoming call data');
            return;
        }

        // Stop ringtone
        this.stopRingtone();

        // Close standalone modal
        this.closeModal();

        // Delegate to chat modal for actual call handling (WebRTC)
        if (typeof ChatModalManager !== 'undefined') {
            // Pass the call data to chat modal
            ChatModalManager.state.pendingCallInvitation = this.incomingCallData;
            ChatModalManager.state.pendingOffer = this.incomingCallData.offer;
            ChatModalManager.state.isVideoCall = this.incomingCallData.call_type === 'video';
            ChatModalManager.state.isIncomingCall = true;

            // Open chat modal
            ChatModalManager.open();

            // Let chat modal handle the call acceptance
            setTimeout(() => {
                ChatModalManager.acceptIncomingCall();
            }, 500); // Small delay to ensure modal is fully loaded
        } else {
            console.error('[StandaloneChatCall] ChatModalManager not found - cannot handle call');
        }
    }

    /**
     * Decline incoming call
     */
    declineIncomingCall() {
        console.log('[StandaloneChatCall] Declining call');

        // Stop ringtone
        this.stopRingtone();

        // Send decline to server
        if (this.incomingCallData && window.chatWebSocket && window.chatWebSocket.readyState === WebSocket.OPEN) {
            window.chatWebSocket.send(JSON.stringify({
                type: 'call_declined',
                call_id: this.incomingCallData.call_id,
                conversation_id: this.incomingCallData.conversation_id
            }));
        }

        // Close modal
        this.closeModal();
    }

    /**
     * Initialize WebRTC connection
     */
    async initializeWebRTC() {
        try {
            console.log('[StandaloneChatCall] Initializing WebRTC');

            // Get media stream
            const constraints = {
                audio: true,
                video: this.callMode === 'video'
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

            // Set local video
            const localVideo = document.getElementById('chatLocalVideo');
            if (localVideo && this.callMode === 'video') {
                localVideo.srcObject = this.localStream;
                localVideo.style.display = 'block';
            } else if (localVideo) {
                localVideo.style.display = 'none';
            }

            // Show/hide voice animation
            const voiceAnimation = document.getElementById('chatVoiceCallAnimation');
            if (voiceAnimation) {
                voiceAnimation.style.display = this.callMode === 'voice' ? 'flex' : 'none';
            }

            // Create peer connection
            this.peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });

            // Add local stream tracks
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            // Handle remote stream
            this.peerConnection.ontrack = (event) => {
                console.log('[StandaloneChatCall] Received remote track');
                if (!this.remoteStream) {
                    this.remoteStream = new MediaStream();
                    const remoteVideo = document.getElementById('chatRemoteVideo');
                    if (remoteVideo) {
                        remoteVideo.srcObject = this.remoteStream;
                    }
                }
                this.remoteStream.addTrack(event.track);
            };

            // Handle ICE candidates
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate && window.chatWebSocket && window.chatWebSocket.readyState === WebSocket.OPEN) {
                    window.chatWebSocket.send(JSON.stringify({
                        type: 'ice_candidate',
                        candidate: event.candidate,
                        call_id: this.currentCall?.call_id,
                        conversation_id: this.currentCall?.conversation_id
                    }));
                }
            };

            // If incoming call, wait for offer. If outgoing, create offer
            if (this.isIncoming) {
                console.log('[StandaloneChatCall] Waiting for WebRTC offer');
            } else {
                await this.createOffer();
            }

        } catch (error) {
            console.error('[StandaloneChatCall] Error initializing WebRTC:', error);
            alert('Failed to access camera/microphone. Please check permissions.');
            this.endChatCall();
        }
    }

    /**
     * Create WebRTC offer
     */
    async createOffer() {
        try {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            if (window.chatWebSocket && window.chatWebSocket.readyState === WebSocket.OPEN) {
                window.chatWebSocket.send(JSON.stringify({
                    type: 'webrtc_offer',
                    offer: offer,
                    call_id: this.currentCall?.call_id,
                    conversation_id: this.currentCall?.conversation_id
                }));
            }
        } catch (error) {
            console.error('[StandaloneChatCall] Error creating offer:', error);
        }
    }

    /**
     * Handle WebRTC offer
     */
    async handleWebRTCOffer(data) {
        try {
            console.log('[StandaloneChatCall] Received WebRTC offer');

            if (!this.peerConnection) {
                await this.initializeWebRTC();
            }

            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            if (window.chatWebSocket && window.chatWebSocket.readyState === WebSocket.OPEN) {
                window.chatWebSocket.send(JSON.stringify({
                    type: 'webrtc_answer',
                    answer: answer,
                    call_id: data.call_id,
                    conversation_id: data.conversation_id
                }));
            }
        } catch (error) {
            console.error('[StandaloneChatCall] Error handling offer:', error);
        }
    }

    /**
     * Handle WebRTC answer
     */
    async handleWebRTCAnswer(data) {
        try {
            console.log('[StandaloneChatCall] Received WebRTC answer');
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (error) {
            console.error('[StandaloneChatCall] Error handling answer:', error);
        }
    }

    /**
     * Handle ICE candidate
     */
    async handleICECandidate(data) {
        try {
            console.log('[StandaloneChatCall] Received ICE candidate');
            if (this.peerConnection && data.candidate) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        } catch (error) {
            console.error('[StandaloneChatCall] Error adding ICE candidate:', error);
        }
    }

    /**
     * Toggle mute
     */
    toggleChatMute() {
        this.isMuted = !this.isMuted;

        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !this.isMuted;
            }
        }

        const muteBtn = document.getElementById('chatMuteBtn');
        if (muteBtn) {
            muteBtn.classList.toggle('muted', this.isMuted);
            muteBtn.title = this.isMuted ? 'Unmute' : 'Mute';
        }

        console.log('[StandaloneChatCall] Mute toggled:', this.isMuted);
    }

    /**
     * Toggle video
     */
    toggleChatCallVideo() {
        if (this.callMode !== 'video') return;

        this.isVideoEnabled = !this.isVideoEnabled;

        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = this.isVideoEnabled;
            }
        }

        const videoBtn = document.getElementById('chatSwitchVideoModeBtn');
        if (videoBtn) {
            videoBtn.classList.toggle('video-off', !this.isVideoEnabled);
            videoBtn.title = this.isVideoEnabled ? 'Turn Off Video' : 'Turn On Video';
        }

        console.log('[StandaloneChatCall] Video toggled:', this.isVideoEnabled);
    }

    /**
     * Switch call mode (voice <-> video)
     */
    async switchCallMode() {
        const newMode = this.callMode === 'voice' ? 'video' : 'voice';
        console.log(`[StandaloneChatCall] Switching call mode from ${this.callMode} to ${newMode}`);

        try {
            // Stop current tracks
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
            }

            // Get new stream with updated constraints
            const constraints = {
                audio: true,
                video: newMode === 'video'
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

            // Update local video
            const localVideo = document.getElementById('chatLocalVideo');
            if (localVideo) {
                if (newMode === 'video') {
                    localVideo.srcObject = this.localStream;
                    localVideo.style.display = 'block';
                } else {
                    localVideo.style.display = 'none';
                }
            }

            // Show/hide voice animation
            const voiceAnimation = document.getElementById('chatVoiceCallAnimation');
            if (voiceAnimation) {
                voiceAnimation.style.display = newMode === 'voice' ? 'flex' : 'none';
            }

            // Replace tracks in peer connection
            if (this.peerConnection) {
                const senders = this.peerConnection.getSenders();
                const newTracks = this.localStream.getTracks();

                for (const sender of senders) {
                    const newTrack = newTracks.find(track => track.kind === sender.track?.kind);
                    if (newTrack) {
                        await sender.replaceTrack(newTrack);
                    }
                }
            }

            this.callMode = newMode;

            // Update button
            const switchBtn = document.getElementById('chatSwitchCallModeBtn');
            if (switchBtn) {
                switchBtn.title = newMode === 'video' ? 'Switch to Voice' : 'Switch to Video';
            }

            // Notify other participant
            if (window.chatWebSocket && window.chatWebSocket.readyState === WebSocket.OPEN) {
                window.chatWebSocket.send(JSON.stringify({
                    type: 'call_mode_changed',
                    mode: newMode,
                    call_id: this.currentCall?.call_id,
                    conversation_id: this.currentCall?.conversation_id
                }));
            }

        } catch (error) {
            console.error('[StandaloneChatCall] Error switching call mode:', error);
            alert('Failed to switch call mode. Please check permissions.');
        }
    }

    /**
     * Add participant to call (placeholder)
     */
    addParticipantToCall() {
        console.log('[StandaloneChatCall] Add participant feature not implemented yet');
        alert('Group calls coming soon!');
    }

    /**
     * End call
     */
    endChatCall() {
        console.log('[StandaloneChatCall] Ending call');

        // Stop call timer
        this.stopCallTimer();

        // Stop all media tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }

        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
        }

        // Notify server
        if (this.currentCall && window.chatWebSocket && window.chatWebSocket.readyState === WebSocket.OPEN) {
            window.chatWebSocket.send(JSON.stringify({
                type: 'call_ended',
                call_id: this.currentCall.call_id,
                conversation_id: this.currentCall.conversation_id
            }));
        }

        // Reset state
        this.currentCall = null;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.isMuted = false;
        this.isVideoEnabled = false;
        this.isIncoming = false;
        this.incomingCallData = null;

        // Close modal
        this.closeModal();
    }

    /**
     * Handle call ended by remote
     */
    handleCallEnded(data) {
        console.log('[StandaloneChatCall] Call ended by remote');
        this.endChatCall();
    }

    /**
     * Start call timer
     */
    startCallTimer() {
        this.callStartTime = Date.now();
        this.callTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.callStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');

            const timerElement = document.getElementById('chatCallTimer');
            if (timerElement) {
                timerElement.textContent = `${minutes}:${seconds}`;
            }
        }, 1000);
    }

    /**
     * Stop call timer
     */
    stopCallTimer() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
    }

    /**
     * Play ringtone
     */
    playRingtone() {
        // Implement ringtone if needed
        console.log('[StandaloneChatCall] Playing ringtone');
    }

    /**
     * Stop ringtone
     */
    stopRingtone() {
        // Implement ringtone stop if needed
        console.log('[StandaloneChatCall] Stopping ringtone');
    }

    /**
     * Close modal
     */
    closeModal() {
        const modal = document.getElementById('standaloneChatCallModal');
        if (modal) {
            modal.classList.remove('active');
        }

        const incomingScreen = document.getElementById('standaloneIncomingCallScreen');
        if (incomingScreen) {
            incomingScreen.style.display = 'none';
        }

        const activeScreen = document.getElementById('standaloneActiveCallScreen');
        if (activeScreen) {
            activeScreen.style.display = 'none';
        }
    }
}

// Create global instance
const StandaloneChatCallManager = new StandaloneChatCallManagerClass();

// Initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        StandaloneChatCallManager.initialize();
    });
} else {
    StandaloneChatCallManager.initialize();
}
