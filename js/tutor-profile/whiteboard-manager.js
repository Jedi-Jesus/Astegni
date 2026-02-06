/**
 * Whiteboard Manager - Digital Collaborative Whiteboard
 *
 * Handles the complete whiteboard functionality including:
 * - Canvas drawing and text writing
 * - Real-time synchronization
 * - Session management
 * - Chat functionality
 * - Page navigation
 */

class WhiteboardManager {
    constructor() {
        this.API_BASE = `${window.API_BASE_URL || 'http://localhost:8000'}/api/whiteboard`;
        this.currentSession = null;
        this.currentPage = null;
        this.pages = [];
        this.currentTool = 'pen';
        this.strokeColor = '#000000';
        this.strokeWidth = 3;
        this.isDrawing = false;
        this.isTextEditing = false; // Flag to disable keyboard shortcuts during text editing
        this.currentStroke = [];
        // Text formatting state
        this.textFormatting = {
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            subscript: false,
            superscript: false,
            bulletList: false,
            numberedList: false
        };
        this.canvas = null;
        this.ctx = null;
        this.permissions = {
            can_draw: false,
            can_write: false,
            can_erase: false
        };
        this.ws = null;
        this.sessionStartTime = null;
        this.timerInterval = null;
        this.isRecording = false;
        this.recordings = [];
        this.mediaRecorder = null; // MediaRecorder instance for canvas/audio recording
        this.recordedChunks = []; // Chunks of recorded data
        this.recordingStartTime = null; // When recording started
        this.recordingTimerInterval = null; // Interval for updating recording timer on button
        this.displayStream = null; // Screen capture stream for recording
        this.interactionAllowed = false; // Whether students can draw/write
        this.interactionRequests = []; // Pending interaction requests from students
        this.activePermissions = []; // Participants who currently have drawing permission {id, name, avatar, profileType}
        this.isVideoSessionActive = false; // Whether live video call is active
        this.isSessionHost = false; // Whether current user is the host (caller) of the session
        this.permissionRequestPending = false; // Whether participant has a pending permission request
        this.hostPeerInfo = null; // Info about the session host (for permission requests)
        this.isCallPending = false; // Whether we're waiting for someone to answer
        this.selectedStudentId = null; // Currently selected student for video call (tutor perspective)
        this.selectedTutorId = null; // Currently selected tutor for video call (student perspective)
        this.selectedParticipants = []; // Array of selected participants {id, role, name, avatar}
        this.localStream = null; // Local media stream (camera/microphone)

        // Multi-party video call support (mesh topology)
        this.peerConnections = new Map(); // Map of participantId -> RTCPeerConnection
        this.remoteStreams = new Map(); // Map of participantId -> MediaStream
        this.pendingOffers = new Map(); // Map of participantId -> offer (for receivers)
        this.connectedParticipants = []; // Array of currently connected participant IDs

        // Legacy single-peer properties (kept for backward compatibility)
        this.remoteStream = null; // Remote media stream from peer
        this.peerConnection = null; // WebRTC peer connection
        this.pendingCallInvitation = null; // Pending incoming call invitation
        this.pendingOffer = null; // Pending WebRTC offer from caller
        this.remotePeerInfo = null; // Stores remote peer info during active call (for ICE candidates)

        this.callStartTime = null; // When the call started (for duration timer)
        this.callDurationInterval = null; // Interval for updating call duration
        this.isAudioMuted = false; // Local audio mute state
        this.isVideoHidden = false; // Local video hidden state
        this.currentCallId = null; // Current call history ID for tracking
        this.callHistoryCallees = []; // Track callees for multi-party call history

        // Context-aware state
        this.context = 'all_students'; // 'all_students', 'single_student', 'all_tutors', 'single_tutor'
        this.contextStudentId = null; // Student profile ID when opened from Student Details
        this.contextTutorId = null; // Tutor profile ID when opened from Tutor Details (student perspective)
        this.enrolledStudents = []; // Loaded from enrolled_students table (tutor perspective)
        this.enrolledTutors = []; // Loaded from enrolled_students table (student perspective)
        this.courseworkList = []; // Loaded from courseworks table
        this.tutorInfo = null; // Current tutor's info
        this.studentInfo = null; // Current student's info (when user is student)
        this.userRole = null; // 'tutor' or 'student' - detected from JWT/localStorage

        // Online presence tracking - uses profile IDs (tutor_profile_id or student_profile_id)
        // Stores both "type:id" format (e.g., "student:123") and plain IDs for compatibility
        this.onlineUsers = new Set();
        this.leftParticipants = new Set(); // Set of profile IDs who left (can reconnect)

        // Reconnection tracking
        this.canRejoinSession = false; // Whether current user can rejoin a session they left
        this.lastSessionId = null; // Session ID of the session they left

        // Page flip animation state
        this.isFlipping = false;
        this.pendingTextPosition = null; // For inline text editor

        // Text position tracking to prevent overlapping
        this.lastTextY = 50; // Track last Y position where text was drawn
        this.textPositions = []; // Array of {x, y, width, height} for collision detection
        this.textBoundingBoxes = []; // Array of text bounding boxes for collision detection

        // Ad panel and popup timing system
        this.adPanelTimer = null;
        this.adPanelCountdown = null;
        this.popupTimers = [];
        this.shownPopups = new Set(); // Track which popups have been shown

        // Document viewer state
        this.currentDocument = null;
        this.documentPages = [];
        this.currentDocPage = 0;
        this.documentZoom = 1;

        // Remote cursors for real-time collaboration
        this.remoteCursors = new Map(); // participantId -> {x, y, name, color}

        // Pop-up schedule (in minutes from session start)
        this.popupSchedule = [
            { minute: 6, title: 'Quick Tip', icon: 'fa-lightbulb', message: 'Take short breaks every 25 minutes for better retention!', cta: 'Learn More' },
            { minute: 19, title: 'Premium Feature', icon: 'fa-star', message: 'Upgrade to record your sessions and review them anytime!', cta: 'Upgrade Now' },
            { minute: 41, title: 'Did You Know?', icon: 'fa-info-circle', message: 'You can invite parents to view session recordings.', cta: 'Invite Parents' },
            { minute: 55, title: 'Session Ending Soon', icon: 'fa-clock', message: 'Your session is approaching 1 hour. Consider scheduling a follow-up!', cta: 'Schedule Next' }
        ];

        // Event listener setup tracking (prevents duplicate setup)
        this._eventListenersSetup = false;
    }

    /**
     * Generate initials from a name (first letter of first name + first letter of father name)
     * @param {string} name - Full name string
     * @returns {string} - Two-letter initials (uppercase)
     */
    getInitials(name) {
        if (!name || typeof name !== 'string') return 'U';
        const parts = name.trim().split(/\s+/).filter(p => p.length > 0);
        if (parts.length === 0) return 'U';
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        // First letter of first name + first letter of second name (father's name)
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }

    /**
     * Generate an initials avatar HTML element
     * @param {string} name - Full name to generate initials from
     * @param {string} size - Size class: 'small', 'medium', 'large'
     * @returns {string} - HTML string for initials avatar
     */
    getInitialsAvatar(name, size = 'medium') {
        const initials = this.getInitials(name);
        const sizes = {
            small: { width: '32px', height: '32px', fontSize: '0.75rem' },
            medium: { width: '40px', height: '40px', fontSize: '0.875rem' },
            large: { width: '64px', height: '64px', fontSize: '1.25rem' }
        };
        const s = sizes[size] || sizes.medium;
        return `<div class="initials-avatar" style="
            width: ${s.width};
            height: ${s.height};
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary-color), var(--primary-dark, #4f46e5));
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: ${s.fontSize};
            flex-shrink: 0;
        ">${initials}</div>`;
    }

    /**
     * Handle image load error by replacing with initials avatar
     * @param {HTMLImageElement} img - The image element that failed to load
     * @param {string} name - Name to generate initials from
     */
    handleAvatarError(img, name) {
        const initials = this.getInitials(name);
        const parent = img.parentElement;
        const size = img.classList.contains('video-avatar') ? 'large' :
                     img.classList.contains('student-card-avatar') ? 'medium' : 'medium';

        // Create initials div
        const initialsDiv = document.createElement('div');
        initialsDiv.className = 'initials-avatar';
        initialsDiv.textContent = initials;
        initialsDiv.style.cssText = `
            width: ${img.offsetWidth || 40}px;
            height: ${img.offsetHeight || 40}px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary-color), #4f46e5);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: ${size === 'large' ? '1.5rem' : '0.875rem'};
            flex-shrink: 0;
        `;

        // Replace image with initials
        if (parent) {
            parent.replaceChild(initialsDiv, img);
        }
    }

    /**
     * Initialize the whiteboard system
     */
    async initialize() {
        console.log('🎨 Initializing Whiteboard Manager...');

        // Detect user role from JWT token or localStorage
        this.detectUserRole();

        // CRITICAL FIX: Load modal lazily (non-blocking) to prevent page freeze
        // Modal will be loaded when user first opens whiteboard, not on page load
        console.log('🎨 Whiteboard modal will be loaded lazily when first opened');

        // Check if modal was already preloaded by ModalLoader
        // If it exists, set up event listeners immediately
        const modalExists = document.getElementById('whiteboardModal');
        if (modalExists) {
            this.setupEventListeners();
        }

        // Load all context-aware data based on user role
        // NOTE: Profile info must load BEFORE WebSocket so we have the profile ID
        try {
            if (this.userRole === 'student') {
                // Student perspective: load tutors instead of students
                // Load student info first for WebSocket connection
                await this.loadStudentInfo();
                await Promise.all([
                    this.loadSessionHistory(),
                    this.loadTutorsList(),
                    this.loadStudentCourseworkList(),
                    this.loadFilesList()
                ].map(p => p.catch(e => {
                    console.warn('Failed to load some whiteboard data:', e);
                    return null; // Don't fail entire initialization
                })));
                console.log('🎨 Whiteboard Manager initialized for STUDENT with context:', this.context);
            } else {
                // Tutor perspective (default): load students
                // Load tutor info first for WebSocket connection
                await this.loadTutorInfo();
                await Promise.all([
                    this.loadSessionHistory(),
                    this.loadStudentsList(),
                    this.loadCourseworkList(),
                    this.loadFilesList()
                ].map(p => p.catch(e => {
                    console.warn('Failed to load some whiteboard data:', e);
                    return null; // Don't fail entire initialization
                })));
                console.log('🎨 Whiteboard Manager initialized for TUTOR with context:', this.context);
            }

            // Initialize WebSocket connection AFTER profile info is loaded
            // This ensures we have the profile ID for the connection
            // Don't let WebSocket errors block the modal functionality
            try {
                this.initializeWebSocket();
            } catch (error) {
                console.error('WebSocket initialization failed (non-blocking):', error);
            }
        } catch (error) {
            console.error('Whiteboard initialization error (continuing anyway):', error);
        }

        console.log('🎨 Whiteboard Manager initialization complete');
    }

    /**
     * Initialize WebSocket connection for real-time communication
     * Uses profile ID and role for connection (e.g., /ws/123/tutor or /ws/456/student)
     */
    initializeWebSocket() {
        // Get profile ID based on user role
        // Note: Backend returns tutor_profile_id/student_profile_id, not just "id"
        let profileId;
        let role = this.userRole;

        if (this.userRole === 'student') {
            profileId = this.studentInfo?.student_profile_id || this.studentInfo?.id;
            role = 'student';
        } else {
            profileId = this.tutorInfo?.tutor_profile_id || this.tutorInfo?.id;
            role = 'tutor';
        }

        console.log('🔌 WebSocket init - role:', role, 'profileId:', profileId, 'tutorInfo:', this.tutorInfo, 'studentInfo:', this.studentInfo);

        if (!profileId) {
            console.log('⚠️ Profile info not loaded yet - WebSocket will be initialized after profile loads');
            // Will be called again after loadTutorInfo/loadStudentInfo completes
            return;
        }

        // Store profile ID for video call messages
        this.myProfileId = profileId;

        // Determine WebSocket URL based on environment
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const apiHost = (window.API_BASE_URL || 'http://localhost:8000').replace(/^https?:\/\//, '');
        const wsUrl = `${wsProtocol}//${apiHost}/ws/${profileId}/${role}`;

        console.log('🔌 Connecting to WebSocket:', wsUrl);

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = async () => {
            console.log(`✅ WebSocket connected as ${role} profile ${profileId}`);

            // Track attendance connection
            await this.trackAttendanceConnection('connect');

            // Start attendance heartbeat (every 15 seconds)
            this.startAttendanceHeartbeat();
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (e) {
                console.error('Failed to parse WebSocket message:', e);
            }
        };

        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
        };

        this.ws.onclose = async (event) => {
            console.log('🔌 WebSocket closed:', event.code, event.reason, 'wasClean:', event.wasClean);
            console.log('🔌 WebSocket close - isVideoSessionActive:', this.isVideoSessionActive);

            // Track attendance disconnection
            await this.trackAttendanceConnection('disconnect');

            // Stop attendance heartbeat
            this.stopAttendanceHeartbeat();

            // Attempt to reconnect - faster if in active video call
            const reconnectDelay = this.isVideoSessionActive ? 1000 : 5000;
            setTimeout(() => {
                if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
                    console.log('🔄 Attempting to reconnect WebSocket...');
                    this.initializeWebSocket();
                }
            }, reconnectDelay);
        };

        // Send heartbeat every 30 seconds to keep connection alive
        this.wsHeartbeat = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    }

    /**
     * Get the "other party" info from selectedParticipants
     * Returns {id, type} for the primary participant (first in array)
     * This is role-agnostic - works whether host is tutor or student
     */
    getOtherParty() {
        if (this.selectedParticipants.length > 0) {
            const participant = this.selectedParticipants[0];
            return {
                id: participant.id,
                type: participant.role, // 'tutor' or 'student'
                name: participant.name,
                avatar: participant.avatar
            };
        }

        // Fallback to legacy properties for backward compatibility
        if (this.selectedTutorId) {
            return { id: this.selectedTutorId, type: 'tutor', name: null, avatar: null };
        }
        if (this.selectedStudentId) {
            return { id: this.selectedStudentId, type: 'student', name: null, avatar: null };
        }

        return null;
    }

    /**
     * Set the "other party" - updates both selectedParticipants and legacy properties
     * @param {number} id - Profile ID of the other party
     * @param {string} type - Profile type ('tutor' or 'student')
     * @param {string} name - Display name (optional)
     * @param {string} avatar - Avatar URL (optional)
     */
    setOtherParty(id, type, name = null, avatar = null) {
        console.log(`📋 Setting other party: ${type}_${id} (${name || 'unnamed'})`);

        // Update selectedParticipants array (source of truth)
        this.selectedParticipants = [{
            id: id,
            role: type,
            name: name || (type === 'tutor' ? 'Tutor' : 'Student'),
            avatar: avatar
        }];

        // Update legacy properties for backward compatibility
        if (type === 'tutor') {
            this.selectedTutorId = id;
            this.selectedStudentId = null;
        } else if (type === 'student') {
            this.selectedStudentId = id;
            this.selectedTutorId = null;
        }

        console.log(`📋 Updated: selectedParticipants=${JSON.stringify(this.selectedParticipants)}, selectedTutorId=${this.selectedTutorId}, selectedStudentId=${this.selectedStudentId}`);
    }

    /**
     * Handle incoming WebSocket messages
     */
    handleWebSocketMessage(data) {
        const messageType = data.type;
        console.log('�� WebSocket message received:', messageType, JSON.stringify(data, null, 2));

        switch (messageType) {
            case 'connection':
                console.log('✅ WebSocket connection confirmed:', data);
                break;

            case 'video_call_invitation':
                console.log('🔔 DEBUG: Received video_call_invitation', data);
                this.handleIncomingCallInvitation(data);
                break;

            case 'video_offer':
                console.log('🔔 DEBUG: Received video_offer', data);
                this.handleIncomingVideoOffer(data);
                break;

            case 'video_answer':
                console.log('🔔 DEBUG: Received video_answer - CALLER SHOULD UPDATE BUTTON NOW', data);
                console.log('🔔 DEBUG: Current state - isCallPending:', this.isCallPending, 'isVideoSessionActive:', this.isVideoSessionActive);
                this.handleVideoAnswer(data);
                break;

            case 'ice_candidate':
                this.handleRemoteIceCandidate(data);
                break;

            case 'video_call_declined':
                this.handleCallDeclined();
                break;

            case 'video_call_ended':
                console.log('📞 Session ended by:', data.ended_by_name || data.ended_by_role || 'host');
                this.showNotification(`Session ended by ${data.ended_by_name || 'host'}`, 'info');
                // Clear rejoin state - session is completely ended
                this.canRejoinSession = false;
                this.lastSessionId = null;
                this.hideRejoinButton();
                this.endVideoSession(false); // Don't notify back - they already ended
                break;

            case 'video_call_participant_left':
                console.log('📞 Participant left the call:', data.left_participant_name || data.left_participant_id);
                this.handleParticipantLeft(data);
                break;

            case 'video_call_cancelled':
                console.log('📞 DEBUG: Remote party cancelled the call - SHOULD STOP RINGING', data);
                this.handleCallCancelled();
                break;

            case 'pong':
                // Heartbeat response - connection is alive
                break;

            case 'user_online':
                // User came online
                this.handleUserOnline(data);
                break;

            case 'user_offline':
                // User went offline
                this.handleUserOffline(data);
                break;

            case 'missed_calls_notification':
                // Received missed calls when coming online
                console.log('📞 Received missed calls notification:', data);
                this.handleMissedCallsNotification(data);
                break;

            case 'online_users_list':
                // Initial list of online users
                this.handleOnlineUsersList(data);
                break;

            case 'video_call_reconnect_request':
                // Participant wants to reconnect
                this.handleReconnectRequest(data);
                break;

            // ============================================
            // WHITEBOARD COLLABORATION MESSAGES
            // ============================================

            case 'whiteboard_stroke':
                // Remote participant drew something
                console.log('🎨 Received whiteboard stroke from:', data.sender_id);
                this.handleRemoteStroke(data);
                break;

            case 'whiteboard_text_typing':
                // Remote participant is typing text
                console.log('⌨️ Received text typing from:', data.sender_name);
                this.handleRemoteTextTyping(data);
                break;

            case 'whiteboard_permission_request':
                // Participant is requesting permission to draw
                console.log('✋ Permission request from:', data.requester_name);
                this.handlePermissionRequest(data);
                break;

            case 'whiteboard_permission_granted':
                // Host granted permission to draw
                console.log('✅ Permission granted by host');
                this.handlePermissionGranted(data);
                break;

            case 'whiteboard_permission_denied':
                // Host denied permission to draw
                console.log('❌ Permission denied by host');
                this.handlePermissionDenied(data);
                break;

            case 'whiteboard_permission_revoked':
                // Host revoked previously granted permission
                console.log('🚫 Permission revoked by host');
                this.handlePermissionRevoked(data);
                break;

            case 'whiteboard_page_change':
                // Host navigated to different page or added new page
                console.log('📄 Page change:', data.action);
                this.handleRemotePageChange(data);
                break;

            case 'whiteboard_cursor':
                // Remote cursor position update
                this.handleRemoteCursor(data);
                break;

            case 'whiteboard_clear':
                // Canvas cleared by other party
                console.log('🧹 Canvas cleared by:', data.sender_name || data.sender_id);
                this.handleRemoteClear(data);
                break;

            case 'whiteboard_undo':
                // Undo by other party
                console.log('🔙 Undo by:', data.sender_name || data.sender_id);
                this.handleRemoteUndo(data);
                break;

            case 'whiteboard_color_change':
                // Color change by other party
                console.log('🎨 Color change by:', data.sender_name || data.sender_id, '→', data.color);
                this.handleRemoteColorChange(data);
                break;

            case 'whiteboard_tool_change':
                // ✨ NEW CASE: Tool change from host or other participants
                console.log('🔧 Tool change from:', data.sender_name, '→', data.tool);
                this.handleRemoteToolChange(data);
                break;

            default:
                console.log('Unknown WebSocket message type:', messageType, data);
        }
    }

    /**
     * Detect user role from JWT token or localStorage
     * PRIORITY: Page path > activeRole localStorage > JWT current_role > fallback
     */
    detectUserRole() {
        try {
            // FIRST: Check current page path - this is the most reliable indicator
            const currentPath = window.location.pathname;
            if (currentPath.includes('student-profile')) {
                this.userRole = 'student';
                console.log('🎨 User role detected from page path (student-profile):', this.userRole);
                return;
            } else if (currentPath.includes('tutor-profile')) {
                this.userRole = 'tutor';
                console.log('🎨 User role detected from page path (tutor-profile):', this.userRole);
                return;
            }

            // SECOND: Try to get active role from localStorage
            const activeRole = localStorage.getItem('activeRole');
            if (activeRole === 'student' || activeRole === 'tutor') {
                this.userRole = activeRole;
                console.log('🎨 User role detected from localStorage:', this.userRole);
                return;
            }

            // THIRD: Try to decode JWT token to get current_role (the active role in the session)
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (token) {
                try {
                    // Decode JWT payload (base64)
                    const payload = JSON.parse(atob(token.split('.')[1]));

                    // Check current_role first (this is the active role set when switching roles)
                    const currentRole = payload.current_role || payload.role || payload.active_role;
                    if (currentRole === 'student' || currentRole === 'tutor') {
                        this.userRole = currentRole;
                        console.log('🎨 User role detected from JWT current_role:', this.userRole);
                        return;
                    }
                } catch (e) {
                    console.warn('Could not decode JWT:', e);
                }
            }

            // FOURTH: Check view-* pages
            if (currentPath.includes('view-student')) {
                this.userRole = 'student';
            } else if (currentPath.includes('view-tutor')) {
                this.userRole = 'tutor';
            } else {
                // Default to tutor (the original behavior)
                this.userRole = 'tutor';
            }

            console.log('🎨 User role inferred from fallback logic:', this.userRole);
        } catch (error) {
            console.error('Error detecting user role:', error);
            this.userRole = 'tutor'; // Default fallback
        }
    }

    /**
     * Ensure whiteboard modal is loaded
     * Uses ModalLoader if available, otherwise waits for modal to exist
     */
    async ensureModalLoaded() {
        // Check if modal already exists in DOM
        if (document.getElementById('whiteboardModal')) {
            console.log('🎨 Whiteboard modal already in DOM');
            return true;
        }

        // Try to load via ModalLoader if available
        if (typeof ModalLoader !== 'undefined') {
            try {
                await ModalLoader.load('whiteboard-modal.html');
                console.log('🎨 Whiteboard modal loaded via ModalLoader');
                // After loading modal, setup event listeners
                this.setupEventListeners();
                return true;
            } catch (error) {
                console.error('🎨 ModalLoader failed to load whiteboard modal:', error);
                return false;
            }
        }

        // Wait for modal to be loaded (with timeout)
        try {
            await new Promise((resolve, reject) => {
                let attempts = 0;
                const maxAttempts = 50; // 5 seconds max

                const checkModal = setInterval(() => {
                    attempts++;
                    if (document.getElementById('whiteboardModal')) {
                        clearInterval(checkModal);
                        console.log('🎨 Whiteboard modal found in DOM');
                        resolve();
                    } else if (attempts >= maxAttempts) {
                        clearInterval(checkModal);
                        console.error('🎨 Whiteboard modal not found after timeout');
                        reject(new Error('Whiteboard modal not loaded'));
                    }
                }, 100);
            });
            // After loading modal, setup event listeners
            this.setupEventListeners();
            return true;
        } catch (error) {
            console.error('🎨 Failed to load whiteboard modal:', error);
            return false;
        }
    }

    /**
     * Setup all event listeners
     * Safe to call even if modal is not loaded yet
     */
    setupEventListeners() {
        // Prevent duplicate setup
        if (this._eventListenersSetup) {
            console.log('🎨 Event listeners already set up, skipping duplicate setup');
            return;
        }

        // Check if modal exists before setting up listeners
        const modal = document.getElementById('whiteboardModal');
        if (!modal) {
            console.log('🎨 Whiteboard modal not in DOM yet, skipping event listener setup');
            return;
        }

        console.log('🎨 Setting up whiteboard event listeners...');

        // Modal controls - Check if elements exist and log
        const closeBtn = document.getElementById('closeWhiteboard');
        const minimizeBtn = document.getElementById('minimizeWhiteboard');
        const maximizeBtn = document.getElementById('maximizeWhiteboard');

        console.log('🎨 Header buttons:', {
            closeBtn: !!closeBtn,
            minimizeBtn: !!minimizeBtn,
            maximizeBtn: !!maximizeBtn
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                console.log('🎨 Close button clicked');
                this.closeModal();
            });
        }
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                console.log('🎨 Minimize button clicked');
                this.minimizeModal();
            });
        }
        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', () => {
                console.log('🎨 Maximize button clicked');
                this.maximizeModal();
            });
        }

        // Mobile toggle button for left sidebar in header
        document.getElementById('mobileToggleHistory')?.addEventListener('click', () => this.toggleMobileSidebar('history'));

        // Mobile backdrop click to close sidebars
        document.getElementById('mobileSidebarBackdrop')?.addEventListener('click', () => this.closeMobileSidebars());

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentSession) {
                this.closeModal();
            }
        });

        // Canvas setup
        this.canvas = document.getElementById('whiteboardCanvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

        // Resize canvas to fit container
        window.addEventListener('resize', () => this.resizeCanvas());
        this.resizeCanvas();

        // Left Sidebar icon buttons (VS Code style)
        const leftSidebarBtns = modal.querySelectorAll('.sidebar-icon-btn');
        console.log(`🎨 Found ${leftSidebarBtns.length} left sidebar buttons`);
        leftSidebarBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const panel = e.currentTarget.dataset.panel;
                console.log(`🎨 Left sidebar button clicked: ${panel}`);
                this.switchSidebarPanel(panel);
            });
        });

        // Right Sidebar icon buttons (Live, Chat, AI)
        const rightSidebarBtns = modal.querySelectorAll('.right-sidebar-icon-btn');
        console.log(`🎨 Found ${rightSidebarBtns.length} right sidebar buttons`);
        rightSidebarBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const panel = e.currentTarget.dataset.panel;
                console.log(`🎨 Right sidebar button clicked: ${panel}`);
                this.switchRightSidebarPanel(panel);
            });
        });

        // Sidebar toggle buttons (for tablet view)
        document.getElementById('leftSidebarToggle')?.addEventListener('click', () => {
            this.toggleLeftSidebar();
        });

        document.getElementById('rightSidebarToggle')?.addEventListener('click', () => {
            this.toggleRightSidebar();
        });

        // AI input and send button
        const aiMessageInput = document.getElementById('aiMessageInput');
        const sendAiMessageBtn = document.getElementById('sendAiMessageBtn');
        if (aiMessageInput && sendAiMessageBtn) {
            sendAiMessageBtn.addEventListener('click', () => this.sendAiMessage());
            aiMessageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendAiMessage();
                }
            });
        }

        // Canvas drawing events - Mouse
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Canvas drawing events - Touch
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.canvas.dispatchEvent(mouseEvent);
        });

        // Tool selection
        const toolButtons = document.querySelectorAll('.tool-button[data-tool]');
        console.log(`🔧 Found ${toolButtons.length} tool buttons`);
        toolButtons.forEach(btn => {
            console.log(`  - Tool button: ${btn.dataset.tool}`);
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tool = e.currentTarget.dataset.tool;
                console.log(`🖱️ Tool clicked: ${tool}`);
                this.selectTool(tool);
            });
        });

        // Text formatting buttons
        document.querySelectorAll('.format-button[data-format]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.currentTarget.dataset.format;
                this.toggleTextFormat(format);
            });
        });

        // Color picker
        const colorInput = document.getElementById('strokeColor');
        const colorDisplay = document.getElementById('colorDisplay');

        colorDisplay.addEventListener('click', () => {
            // Permission check: need draw or write permission to change color
            if (!this.canUserChangeColor()) {
                this.showNotification('You need draw or write permission to change color', 'error');
                return;
            }
            colorInput.click();
        });
        colorInput.addEventListener('input', (e) => {
            // Permission check: need draw or write permission to change color
            if (!this.canUserChangeColor()) {
                this.showNotification('You need draw or write permission to change color', 'error');
                return;
            }
            this.strokeColor = e.target.value;
            colorDisplay.style.backgroundColor = e.target.value;
            // Broadcast color change to other party
            this.broadcastColorChange(e.target.value);
        });

        // Stroke width - requires draw or write permission
        document.getElementById('strokeWidth')?.addEventListener('input', (e) => {
            if (!this.canUserChangeColor()) {
                this.showNotification('You need draw or write permission to change stroke width', 'error');
                return;
            }
            this.strokeWidth = parseInt(e.target.value);
            document.getElementById('widthDisplay').textContent = `${e.target.value}px`;
        });

        // Page navigation - permission checked inside each method
        document.getElementById('prevPageBtn')?.addEventListener('click', () => this.previousPage());
        document.getElementById('nextPageBtn')?.addEventListener('click', () => this.nextPage());
        document.getElementById('addPageBtn')?.addEventListener('click', () => this.addNewPage());

        // Actions - permission checked inside each method
        document.getElementById('undoBtn')?.addEventListener('click', () => this.undo());
        document.getElementById('clearBtn')?.addEventListener('click', () => this.clearPage());
        document.getElementById('allowInteractionBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleInteractionDropdown();
        });

        // Dropdown action buttons
        document.getElementById('approveAllRequestsBtn')?.addEventListener('click', () => this.approveAllInteractionRequests());
        document.getElementById('denyAllRequestsBtn')?.addEventListener('click', () => this.denyAllInteractionRequests());

        // Toggle all interaction switch
        document.getElementById('toggleAllInteraction')?.addEventListener('change', (e) => {
            this.setInteractionState(e.target.checked);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const wrapper = document.getElementById('allowInteractionWrapper');
            if (wrapper && !wrapper.contains(e.target)) {
                this.closeInteractionDropdown();
            }
        });

        // Request Interaction button (participant view)
        document.getElementById('requestInteractionBtn')?.addEventListener('click', () => this.requestDrawPermission());

        document.getElementById('saveBtn')?.addEventListener('click', () => this.saveSession());

        // Recording
        document.getElementById('recordBtn')?.addEventListener('click', () => this.toggleRecording());

        // Start Video Session
        document.getElementById('startVideoSessionBtn')?.addEventListener('click', () => this.startVideoSession());

        // Add Participant button (host only, shown during active session)
        document.getElementById('addParticipantBtn')?.addEventListener('click', () => this.showAddParticipantModal());

        // Rejoin Session button (for participants who left an active session)
        document.getElementById('rejoinSessionBtn')?.addEventListener('click', () => this.requestReconnection());

        // Video Controls (mute mic, toggle camera)
        document.getElementById('toggleMicBtn')?.addEventListener('click', () => this.toggleAudio());
        document.getElementById('toggleCameraBtn')?.addEventListener('click', () => this.toggleVideo());

        // Chat
        document.getElementById('whiteboardSendBtn')?.addEventListener('click', () => this.sendChatMessage());
        document.getElementById('whiteboardChatInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.currentSession && !this.currentPage) return;

            // Check if user is typing in any input field (including contenteditable)
            const isTyping = e.target.tagName === 'INPUT' ||
                           e.target.tagName === 'TEXTAREA' ||
                           e.target.isContentEditable ||
                           this.isTextEditing;

            // Tool shortcuts (only when NOT typing)
            if (!isTyping) {
                switch(e.key.toLowerCase()) {
                    case 'p':
                        e.preventDefault();
                        this.selectTool('pen');
                        break;
                    case 'e':
                        e.preventDefault();
                        this.selectTool('eraser');
                        break;
                    case 't':
                        e.preventDefault();
                        this.selectTool('text');
                        break;
                    case 'l':
                        e.preventDefault();
                        this.selectTool('line');
                        break;
                    case 'r':
                        e.preventDefault();
                        this.selectTool('rectangle');
                        break;
                    case 'c':
                        e.preventDefault();
                        this.selectTool('circle');
                        break;
                    case 'a':
                        e.preventDefault();
                        this.selectTool('arrow');
                        break;
                }

                // Page navigation with arrow keys (only when not typing)
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.previousPage();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.nextPage();
                }
            }

            // Undo (works everywhere, but prevent default to avoid conflicts)
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undo();
            }
        });

        // Request permission button (for participants)
        document.getElementById('requestPermissionBtn')?.addEventListener('click', () => {
            this.requestDrawPermission();
        });

        // Close document viewer button
        document.getElementById('closeDocViewer')?.addEventListener('click', () => {
            this.closeDocumentViewer();
        });

        // Mark as setup to prevent duplicate calls
        this._eventListenersSetup = true;
        console.log('✅ Whiteboard event listeners setup complete');
    }

    /**
     * Open whiteboard modal with a session
     * @param {number|null} sessionId - Optional session ID to open
     * @param {number|null} studentId - Optional student profile ID to create/find session for
     * @param {string} context - Context: 'teaching_tools' (all students) or 'student_details' (single student)
     */
    async openWhiteboard(sessionId = null, studentId = null, context = 'teaching_tools') {
        try {
            // Ensure modal is loaded before opening
            const modalLoaded = await this.ensureModalLoaded();
            if (!modalLoaded) {
                alert('Failed to load whiteboard. Please refresh the page and try again.');
                return;
            }

            // CRITICAL FIX: Re-setup event listeners every time modal opens
            // This ensures buttons work even if modal was dynamically loaded
            this._eventListenersSetup = false;
            this.setupEventListeners();

            // Set context for data loading based on user role
            if (this.userRole === 'student') {
                // Student perspective: load tutors
                if (this.contextTutorId) {
                    this.context = 'single_tutor';
                } else {
                    this.context = 'all_tutors';
                }
                // Reload data with context (student perspective)
                await Promise.all([
                    this.loadTutorsList(),
                    this.loadStudentCourseworkList(),
                    this.loadFilesList()
                ]);
            } else {
                // Tutor perspective: load students
                if (studentId) {
                    this.contextStudentId = studentId;
                    this.context = 'single_student';
                } else {
                    this.contextStudentId = null;
                    this.context = 'all_students';
                }
                // Reload data with context (tutor perspective)
                await Promise.all([
                    this.loadStudentsList(),
                    this.loadCourseworkList(),
                    this.loadFilesList()
                ]);
            }

            // Case 1: Opening with a specific student (from Students panel or Student Details Modal)
            if (studentId && !sessionId) {
                // Find or create a session with this student
                const sessions = await this.loadSessionHistory();
                const existingSession = sessions.find(s =>
                    s.student_id === studentId &&
                    (s.status === 'in-progress' || s.status === 'scheduled')
                );

                if (existingSession) {
                    sessionId = existingSession.id;
                } else {
                    // No session - open blank whiteboard with student pre-selected
                    document.getElementById('whiteboardModal').classList.add('active');

                    // Collapse right sidebar by default (opens only when icon clicked)
                    document.querySelector('.whiteboard-right-sidebar')?.classList.add('collapsed');

                    this.switchSidebarPanel('students');

                    // Initialize blank canvas
                    this.initializeBlankCanvas();

                    // Initialize interaction wrapper (host view by default)
                    this.updateInteractionWrapperRole();

                    // Highlight and select the student
                    this.selectStudent(studentId);

                    // Load call history and check for missed calls
                    await this.loadCallHistory();
                    await this.loadMissedCalls();

                    this.showNotification('Whiteboard opened for selected student. Start teaching!', 'info');
                    return;
                }
            }

            // Case 2: Opening from Digital Whiteboard card - open with any available session or blank board
            if (!sessionId && !studentId) {
                const sessions = await this.loadSessionHistory();

                if (sessions && sessions.length > 0) {
                    // Find in-progress session or use the first one
                    const activeSession = sessions.find(s => s.status === 'in-progress') || sessions[0];
                    sessionId = activeSession.id;
                } else {
                    // No sessions available - open blank whiteboard
                    document.getElementById('whiteboardModal').classList.add('active');

                    // Collapse right sidebar by default (opens only when icon clicked)
                    document.querySelector('.whiteboard-right-sidebar')?.classList.add('collapsed');

                    this.switchSidebarPanel('students');

                    // Show appropriate message based on user role
                    const message = this.userRole === 'student'
                        ? 'Whiteboard opened. Select a tutor to start a session or use as blank board.'
                        : 'Whiteboard opened. Select a student to start a session or use as blank board.';
                    this.showNotification(message, 'info');

                    // Initialize blank canvas
                    this.initializeBlankCanvas();

                    // Initialize interaction wrapper (host view by default)
                    this.updateInteractionWrapperRole();

                    // Load call history and check for missed calls
                    await this.loadCallHistory();
                    await this.loadMissedCalls();

                    return;
                }
            }

            // Case 3: Opening with specific session ID (from session history or found session)
            // Load session data
            await this.loadSession(sessionId);

            // Show modal
            document.getElementById('whiteboardModal').classList.add('active');

            // Collapse right sidebar by default (opens only when icon clicked)
            document.querySelector('.whiteboard-right-sidebar')?.classList.add('collapsed');

            // NOTE: Timer now starts when video call connects (onCallConnected)
            // Don't start timer here - session timer should only run during active video call

            // Initialize interaction wrapper (host view by default since no session yet)
            this.updateInteractionWrapperRole();

            // Load chat messages
            await this.loadChatMessages();

            // Load call history and check for missed calls
            await this.loadCallHistory();
            await this.loadMissedCalls();

            console.log('✅ Whiteboard opened successfully (context:', this.context, ')');
        } catch (error) {
            console.error('❌ Error opening whiteboard:', error);
            this.showNotification('Failed to open whiteboard', 'error');
        }
    }

    /**
     * Initialize a blank canvas for drawing
     */
    initializeBlankCanvas() {
        this.canvas = document.getElementById('whiteboardCanvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Create a temporary page for drawing
        this.currentPage = {
            id: 'temp',
            page_number: 1,
            background_color: '#FFFFFF',
            strokes: []
        };
        this.pages = [this.currentPage];
        this.updatePageInfo();

        // CRITICAL: Determine if user is host based on their role
        // Tutors are hosts, students are participants (need permissions)
        // isSessionHost will be updated to true/false when video call starts
        if (this.userRole === 'tutor') {
            this.isSessionHost = true;
            this.permissions = { can_draw: true, can_write: true, can_erase: true };
        } else {
            // Students/participants start with no permissions until granted
            this.isSessionHost = false;
            this.permissions = { can_draw: false, can_write: false, can_erase: false };
        }
        console.log(`📋 Blank whiteboard: userRole=${this.userRole}, isSessionHost=${this.isSessionHost}`);

        // Update toolbar permissions based on role
        this.updateToolbarPermissions();
    }

    /**
     * Reset canvas for a new call - ensures fresh start without loading history
     * Called when a new video call is initiated to ensure clean slate
     */
    resetCanvasForNewCall() {
        console.log('🧹 Resetting canvas for new call - fresh start');

        // Clear the canvas
        if (this.canvas && this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Reset pages to a single blank page
        this.currentPage = {
            id: 'temp',
            page_number: 1,
            background_color: '#FFFFFF',
            strokes: []
        };
        this.pages = [this.currentPage];

        // Reset text position tracking
        this.lastTextY = 50;
        this.textPositions = [];
        this.textBoundingBoxes = [];

        // Update page info display
        this.updatePageInfo();

        // Exit read-only mode if it was active (from viewing history)
        if (this.isCanvasReadOnly) {
            this.isCanvasReadOnly = false;
            const indicator = document.querySelector('.canvas-readonly-indicator');
            if (indicator) {
                indicator.style.display = 'none';
            }
        }

        console.log('✅ Canvas reset complete - ready for new session');
    }

    /**
     * Open whiteboard from Student Details Modal (single student context)
     * @param {number} studentProfileId - The student's profile ID
     */
    async openWhiteboardForStudent(studentProfileId) {
        console.log('🎨 Opening whiteboard for student (from Student Details):', studentProfileId);
        this.contextStudentId = studentProfileId;
        this.context = 'single_student';
        await this.openWhiteboard(null, studentProfileId, 'student_details');
    }

    /**
     * Open whiteboard from Teaching Tools (all students context)
     */
    async openWhiteboardFromTeachingTools() {
        console.log('🎨 Opening whiteboard from Teaching Tools (all students)');
        this.contextStudentId = null;
        this.context = 'all_students';
        await this.openWhiteboard(null, null, 'teaching_tools');
    }

    /**
     * Close whiteboard modal
     */
    closeModal() {
        const overlay = document.getElementById('whiteboardModal');
        const modal = document.getElementById('whiteboardModalContainer');

        overlay.classList.remove('active', 'minimized-state');
        modal.classList.remove('minimized', 'maximized');

        // Stop timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        // Disconnect WebSocket
        if (this.ws) {
            this.ws.close();
        }

        this.currentSession = null;
    }

    /**
     * Minimize whiteboard modal
     */
    minimizeModal() {
        const modal = document.getElementById('whiteboardModalContainer');
        const overlay = document.getElementById('whiteboardModal');
        const minimizeBtn = document.getElementById('minimizeWhiteboard');
        const maximizeBtn = document.getElementById('maximizeWhiteboard');

        if (modal.classList.contains('minimized')) {
            // Restore
            modal.classList.remove('minimized');
            overlay.classList.remove('minimized-state');
            minimizeBtn.innerHTML = '<i class="fas fa-window-minimize"></i>';
        } else {
            // Minimize
            modal.classList.add('minimized');
            modal.classList.remove('maximized');
            overlay.classList.add('minimized-state');
            minimizeBtn.innerHTML = '<i class="fas fa-window-restore"></i>';
            maximizeBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
    }

    /**
     * Maximize whiteboard modal
     */
    maximizeModal() {
        const modal = document.getElementById('whiteboardModalContainer');
        const overlay = document.getElementById('whiteboardModal');
        const maximizeBtn = document.getElementById('maximizeWhiteboard');

        if (modal.classList.contains('maximized')) {
            // Restore
            modal.classList.remove('maximized');
            maximizeBtn.innerHTML = '<i class="fas fa-expand"></i>';
        } else {
            // Maximize
            modal.classList.add('maximized');
            modal.classList.remove('minimized');
            overlay.classList.remove('minimized-state');
            maximizeBtn.innerHTML = '<i class="fas fa-compress"></i>';
        }

        // Resize canvas after maximize/restore
        setTimeout(() => this.resizeCanvas(), 100);
    }

    /**
     * Switch sidebar panel (VS Code style)
     * Clicking the same button again collapses the sidebar
     * Opening left sidebar closes right sidebar (mutual exclusivity)
     */
    switchSidebarPanel(panel) {
        console.log(`🎨 switchSidebarPanel called with: ${panel}`);

        const modal = document.getElementById('whiteboardModal');
        if (!modal) {
            console.error('🎨 Modal not found in switchSidebarPanel');
            return;
        }

        const leftSidebar = modal.querySelector('.whiteboard-sidebar');
        const rightSidebar = modal.querySelector('.whiteboard-right-sidebar');
        const clickedBtn = modal.querySelector(`.sidebar-icon-btn[data-panel="${panel}"]`);

        console.log('🎨 Found elements:', {
            leftSidebar: !!leftSidebar,
            rightSidebar: !!rightSidebar,
            clickedBtn: !!clickedBtn
        });

        const isCurrentlyActive = clickedBtn?.classList.contains('active');

        // If clicking the same active button, toggle collapse
        if (isCurrentlyActive) {
            leftSidebar?.classList.toggle('collapsed');
            console.log('🎨 Toggled collapsed state');
            return;
        }

        // Ensure left sidebar is expanded when switching panels
        leftSidebar?.classList.remove('collapsed');

        // Close right sidebar when opening left sidebar (mutual exclusivity)
        rightSidebar?.classList.add('collapsed');

        // Update icon buttons
        modal.querySelectorAll('.sidebar-icon-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.panel === panel);
        });

        // Update panels
        modal.querySelectorAll('.sidebar-panel').forEach(p => {
            const isActive = p.id === `${panel}Panel`;
            p.classList.toggle('active', isActive);
            console.log(`🎨 Panel ${p.id}: ${isActive ? 'active' : 'inactive'}`);
        });
    }

    /**
     * Switch right sidebar panel (Live, Chat, AI)
     * Clicking the same button again collapses the sidebar
     * Opening right sidebar closes left sidebar (mutual exclusivity)
     */
    switchRightSidebarPanel(panel) {
        console.log(`🎨 switchRightSidebarPanel called with: ${panel}`);

        const modal = document.getElementById('whiteboardModal');
        if (!modal) {
            console.error('🎨 Modal not found in switchRightSidebarPanel');
            return;
        }

        const leftSidebar = modal.querySelector('.whiteboard-sidebar');
        const rightSidebar = modal.querySelector('.whiteboard-right-sidebar');
        const clickedBtn = modal.querySelector(`.right-sidebar-icon-btn[data-panel="${panel}"]`);

        console.log('🎨 Found elements:', {
            leftSidebar: !!leftSidebar,
            rightSidebar: !!rightSidebar,
            clickedBtn: !!clickedBtn
        });

        const isCurrentlyActive = clickedBtn?.classList.contains('active');
        const isRightSidebarCollapsed = rightSidebar?.classList.contains('collapsed');

        // If clicking the same active button, toggle collapse
        if (isCurrentlyActive) {
            // If expanding the right sidebar, close the left sidebar
            if (isRightSidebarCollapsed) {
                leftSidebar?.classList.add('collapsed');
            }
            rightSidebar?.classList.toggle('collapsed');
            return;
        }

        // Ensure right sidebar is expanded when switching panels
        rightSidebar?.classList.remove('collapsed');

        // Close left sidebar when right sidebar is active/expanding (mutual exclusivity)
        leftSidebar?.classList.add('collapsed');

        // Update icon buttons (scope to modal)
        modal.querySelectorAll('.right-sidebar-icon-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.panel === panel);
        });

        // Update panels (scope to modal)
        modal.querySelectorAll('.right-sidebar-panel').forEach(p => {
            const panelId = panel === 'live' ? 'livePanel' :
                           panel === 'chat' ? 'chatPanel' :
                           panel === 'ai' ? 'aiPanel' : '';
            const isActive = p.id === panelId;
            p.classList.toggle('active', isActive);
            console.log(`🎨 Right panel ${p.id}: ${isActive ? 'active' : 'inactive'}`);
        });
    }

    /**
     * Send AI message
     */
    sendAiMessage() {
        const input = document.getElementById('aiMessageInput');
        const message = input?.value?.trim();

        if (!message) return;

        // Add user message to chat
        this.addAiMessage(message, 'user');
        input.value = '';

        // Simulate AI response (placeholder)
        setTimeout(() => {
            this.addAiMessage(this.generateAiResponse(message), 'ai');
        }, 1000);
    }

    /**
     * Add AI message to chat
     */
    addAiMessage(message, sender) {
        const messagesContainer = document.getElementById('aiMessages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ${sender}`;

        const isUser = sender === 'user';

        messageDiv.innerHTML = `
            <div class="ai-avatar">
                ${isUser ? '<i class="fas fa-user"></i>' : '<span class="emoji-icon">✨</span>'}
            </div>
            <div class="ai-bubble">
                <p>${message}</p>
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * Generate AI response (placeholder - will be replaced with actual AI API)
     */
    generateAiResponse(userMessage) {
        const responses = [
            "I understand you're asking about that topic. Let me help you break it down step by step.",
            "That's a great question! Here's what I can tell you about it...",
            "Based on what you've shared, I'd suggest focusing on the key concepts first.",
            "Let me explain this in a different way that might be clearer.",
            "This is an interesting problem. Let's work through it together."
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    /**
     * Ask AI with quick action
     */
    askAI(action) {
        const prompts = {
            'explain': 'Can you explain the concept we\'re working on in simpler terms?',
            'solve': 'Help me solve this problem step by step.',
            'quiz': 'Create a quick quiz question to test my understanding.'
        };

        const input = document.getElementById('aiMessageInput');
        if (input && prompts[action]) {
            input.value = prompts[action];
            this.sendAiMessage();
        }

        // Note: Don't call switchRightSidebarPanel here since user is already on AI panel
        // and it would toggle the sidebar closed
    }

    /**
     * Load session history
     */
    async loadSessionHistory() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');

            if (!token || !user || !user.id) return [];

            const userType = (user.roles && user.roles.includes('tutor')) ? 'tutor' : 'student';
            const response = await fetch(
                `${this.API_BASE}/sessions/history/${userType}/${user.id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (data.success) {
                this.renderSessionHistory(data.sessions);
                return data.sessions;
            }
        } catch (error) {
            console.error('Error loading session history:', error);
        }

        return [];
    }

    /**
     * Render session history cards
     */
    renderSessionHistory(sessions) {
        const container = document.getElementById('sessionHistoryList');

        if (!sessions || sessions.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 8px;"></i>
                    <p>No sessions yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sessions.map(session => `
            <div class="session-card ${session.status === 'in-progress' ? 'active' : ''}"
                 data-session-id="${session.id}">
                <div class="session-card-header" onclick="whiteboardManager.toggleSessionCard(${session.id})">
                    <div>
                        <h4 class="session-card-title">${session.session_title}</h4>
                        <p class="session-card-date">
                            ${new Date(session.scheduled_start).toLocaleDateString()}
                        </p>
                    </div>
                    <button class="session-toggle">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                <div class="session-card-body">
                    <div class="session-detail-item">
                        <i class="fas fa-book"></i>
                        <span>${session.subject} - ${session.grade_level}</span>
                    </div>
                    <div class="session-detail-item">
                        <i class="fas fa-user"></i>
                        <span>${session.other_user_name}</span>
                    </div>
                    <div class="session-detail-item">
                        <i class="fas fa-circle"></i>
                        <span class="permission-badge ${session.status !== 'in-progress' ? 'disabled' : ''}">
                            ${session.status}
                        </span>
                    </div>
                    <div class="session-actions">
                        <button class="session-action-btn" onclick="whiteboardManager.loadSession(${session.id})">
                            <i class="fas fa-play"></i> Open
                        </button>
                        <button class="session-action-btn" onclick="whiteboardManager.downloadSession(${session.id})">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button class="session-action-btn danger" onclick="whiteboardManager.deleteSession(${session.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Toggle session card expansion
     */
    toggleSessionCard(sessionId) {
        const card = document.querySelector(`[data-session-id="${sessionId}"]`);
        card.classList.toggle('expanded');
    }

    /**
     * Download session data
     */
    async downloadSession(sessionId) {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const response = await fetch(`${this.API_BASE}/sessions/${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                // Create JSON file with session data
                const sessionData = {
                    session: data.session,
                    pages: data.session.pages || [],
                    downloaded_at: new Date().toISOString()
                };

                const dataStr = JSON.stringify(sessionData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);

                const link = document.createElement('a');
                link.href = url;
                link.download = `${data.session.session_title}_${Date.now()}.json`;
                link.click();

                URL.revokeObjectURL(url);
                this.showNotification('Session data downloaded successfully', 'success');
            }
        } catch (error) {
            console.error('Error downloading session:', error);
            this.showNotification('Failed to download session', 'error');
        }
    }

    /**
     * Delete a session
     */
    async deleteSession(sessionId) {
        if (!confirm('Delete this session? This cannot be undone.')) return;

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const response = await fetch(`${this.API_BASE}/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Session deleted successfully', 'success');
                await this.loadSessionHistory();
            }
        } catch (error) {
            console.error('Error deleting session:', error);
            this.showNotification('Failed to delete session', 'error');
        }
    }

    /**
     * Load a specific session
     */
    async loadSession(sessionId) {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const response = await fetch(`${this.API_BASE}/sessions/${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.currentSession = data.session;
                this.pages = data.session.pages || [];

                // ✨ CRITICAL FIX: Set other party from session data using host/participant model
                // session.tutor_id = host profile ID (regardless of actual role)
                // session.student_id = participant profile ID (regardless of actual role)
                // session.host_profile_type = actual role of host ('tutor' or 'student')
                // session.participant_profile_type = actual role of participant ('tutor' or 'student')
                const session = data.session;
                const hostProfileType = session.host_profile_type;
                const participantProfileType = session.participant_profile_type;
                const hostProfileId = session.tutor_id; // Legacy naming: tutor_id is actually host
                const participantProfileId = session.student_id; // Legacy naming: student_id is actually participant

                console.log(`📋 Session loaded - host: ${hostProfileType}_${hostProfileId}, participant: ${participantProfileType}_${participantProfileId}`);
                console.log(`📋 Current user role: ${this.userRole}, myProfileId: ${this.myProfileId}`);

                // Determine if I am the host or participant, then set the "other party"
                const amIHost = (this.userRole === hostProfileType && this.myProfileId == hostProfileId);
                const amIParticipant = (this.userRole === participantProfileType && this.myProfileId == participantProfileId);

                if (amIHost) {
                    // I am the host - the other party is the participant
                    this.setOtherParty(participantProfileId, participantProfileType, session.student_name);
                    this.isSessionHost = true;
                    // Host has FULL permissions
                    this.permissions = { can_draw: true, can_write: true, can_erase: true };
                    console.log(`📋 I am HOST - full permissions granted`);
                } else if (amIParticipant) {
                    // I am the participant - the other party is the host
                    this.setOtherParty(hostProfileId, hostProfileType, session.tutor_name);
                    this.isSessionHost = false;
                    // Participant uses session-stored permissions (granted by host)
                    this.permissions = data.session.student_permissions || {
                        can_draw: false,
                        can_write: false,
                        can_erase: false
                    };
                    console.log(`📋 I am PARTICIPANT - permissions:`, this.permissions);
                } else {
                    // Fallback: Could not determine role, try legacy logic
                    console.warn(`⚠️ Could not determine host/participant role, using fallback`);
                    if (this.userRole === 'tutor' && participantProfileId) {
                        this.setOtherParty(participantProfileId, participantProfileType || 'student', session.student_name);
                        this.isSessionHost = true;
                        this.permissions = { can_draw: true, can_write: true, can_erase: true };
                    } else if (this.userRole === 'student' && hostProfileId) {
                        this.setOtherParty(hostProfileId, hostProfileType || 'tutor', session.tutor_name);
                        this.isSessionHost = false;
                        this.permissions = data.session.student_permissions || {
                            can_draw: false,
                            can_write: false,
                            can_erase: false
                        };
                    }
                }

                // Update UI
                document.getElementById('whiteboardSessionTitle').textContent =
                    data.session.session_title;

                // Update tutor name subtitle
                const tutorNameSubtitle = document.getElementById('tutorNameSubtitle');
                if (tutorNameSubtitle && data.session.other_user_name) {
                    tutorNameSubtitle.textContent = data.session.other_user_name;
                }

                // Load first page
                if (this.pages.length > 0) {
                    this.loadPage(0);
                }

                // Update page info
                this.updatePageInfo();

                // Populate student list in chat recipient dropdown
                this.populateStudentDropdown();

                // Update toolbar permissions based on loaded session permissions
                this.updateToolbarPermissions();

                console.log('✅ Session loaded:', this.currentSession);
            }
        } catch (error) {
            console.error('Error loading session:', error);
        }
    }

    /**
     * Find or create a whiteboard session for the current video call
     * Creates a session with profile IDs (host + participant)
     */
    async findOrCreateSession() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                console.warn('No auth token - cannot create session');
                return;
            }

            // Determine participant info based on connected participants
            let participantProfileId, participantProfileType;

            if (this.selectedParticipants && this.selectedParticipants.length > 0) {
                // Multi-party call - use first participant for now
                const firstParticipant = this.selectedParticipants[0];
                participantProfileId = firstParticipant.id;
                participantProfileType = firstParticipant.role;
            } else if (this.userRole === 'tutor' && this.selectedStudentId) {
                // Tutor calling student
                participantProfileId = this.selectedStudentId;
                participantProfileType = 'student';
            } else if (this.userRole === 'student' && this.selectedTutorId) {
                // Student calling tutor
                participantProfileId = this.selectedTutorId;
                participantProfileType = 'tutor';
            } else {
                console.warn('Cannot determine participant for session creation');
                return;
            }

            console.log(`🎨 Finding or creating session for ${participantProfileType} ${participantProfileId} (I am ${this.userRole})`);

            // Call quick-create endpoint (finds existing or creates new)
            // IMPORTANT: Pass host_profile_type so users with multiple roles create session with correct role
            const response = await fetch(`${this.API_BASE}/sessions/quick-create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    participant_profile_id: participantProfileId,
                    participant_profile_type: participantProfileType,
                    session_title: `Session with ${participantProfileType}`,
                    host_profile_type: this.userRole  // Tell backend which role we're operating as
                })
            });

            if (!response.ok) {
                console.error('Failed to create session:', response.status);
                return;
            }

            const data = await response.json();

            if (data.success) {
                console.log(`✅ Session ${data.existing ? 'found' : 'created'}: ${data.session_id}`);

                // Load the session to populate currentSession and pages
                await this.loadSession(data.session_id);
            }
        } catch (error) {
            console.error('❌ Error finding/creating session:', error);
        }
    }

    /**
     * Load a specific page
     */
    loadPage(pageIndex) {
        if (pageIndex < 0 || pageIndex >= this.pages.length) return;

        this.currentPage = this.pages[pageIndex];

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Set background color
        this.ctx.fillStyle = this.currentPage.background_color || '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Reset text position tracking for this page
        this.lastTextY = 50;
        this.textPositions = [];
        this.textBoundingBoxes = [];

        // Draw all strokes and track text positions
        if (this.currentPage.strokes) {
            this.currentPage.strokes.forEach(stroke => {
                this.drawStroke(stroke);

                // Track text position to prevent overlap on this page
                if (stroke.stroke_type === 'text' && stroke.stroke_data) {
                    const textX = stroke.stroke_data.x || 0;
                    const textY = stroke.stroke_data.y || 0;
                    const fontSize = stroke.stroke_data.fontSize || 18;
                    const text = stroke.stroke_data.text || '';

                    // Measure text width for accurate bounding box
                    this.ctx.font = `${fontSize}px Arial`;
                    const textWidth = this.ctx.measureText(text).width;

                    // Register bounding box for collision detection
                    this.registerTextBoundingBox(textX, textY, textWidth, fontSize);

                    // Update lastTextY to be after this text
                    if (textY + fontSize > this.lastTextY) {
                        this.lastTextY = textY + fontSize;
                    }
                }
            });
        }

        this.updatePageInfo();
    }

    /**
     * Draw a stroke on canvas
     */
    drawStroke(stroke) {
        const data = stroke.stroke_data;

        // ✨ CRITICAL FIX: Ensure we're drawing on the correct canvas
        const visibleCanvas = document.getElementById('whiteboardCanvas');
        if (this.canvas !== visibleCanvas && visibleCanvas) {
            console.log('⚠️ drawStroke: Canvas mismatch detected, updating reference');
            this.canvas = visibleCanvas;
            this.ctx = visibleCanvas.getContext('2d', { willReadFrequently: true });
        }

        this.ctx.strokeStyle = data.color || '#000000';
        this.ctx.lineWidth = data.width || 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        switch (stroke.stroke_type) {
            case 'pen':
            case 'eraser':
                if (data.points && data.points.length > 0) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(data.points[0][0], data.points[0][1]);
                    for (let i = 1; i < data.points.length; i++) {
                        this.ctx.lineTo(data.points[i][0], data.points[i][1]);
                    }
                    this.ctx.stroke();
                }
                break;

            case 'text':
                // Apply text formatting if present
                if (data.formatting) {
                    const formatting = data.formatting;

                    // Build font string with bold/italic
                    let fontStyle = '';
                    if (formatting.italic) fontStyle += 'italic ';
                    if (formatting.bold) fontStyle += 'bold ';

                    this.ctx.font = `${fontStyle}${data.fontSize || 16}px ${data.fontFamily || 'Arial'}`;
                    this.ctx.fillStyle = data.color || '#000000';
                    this.ctx.fillText(data.text, data.x, data.y);

                    // Draw underline if enabled
                    if (formatting.underline) {
                        const textWidth = this.ctx.measureText(data.text).width;
                        this.ctx.beginPath();
                        this.ctx.strokeStyle = data.color || '#000000';
                        this.ctx.lineWidth = 1;
                        this.ctx.moveTo(data.x, data.y + 2);
                        this.ctx.lineTo(data.x + textWidth, data.y + 2);
                        this.ctx.stroke();
                    }

                    // Draw strikethrough if enabled
                    if (formatting.strikethrough) {
                        const textWidth = this.ctx.measureText(data.text).width;
                        const fontSize = data.fontSize || 16;
                        this.ctx.beginPath();
                        this.ctx.strokeStyle = data.color || '#000000';
                        this.ctx.lineWidth = 1;
                        this.ctx.moveTo(data.x, data.y - fontSize * 0.3);
                        this.ctx.lineTo(data.x + textWidth, data.y - fontSize * 0.3);
                        this.ctx.stroke();
                    }
                } else {
                    // No formatting - render simple text
                    this.ctx.font = `${data.fontSize || 16}px ${data.fontFamily || 'Arial'}`;
                    this.ctx.fillStyle = data.color || '#000000';
                    this.ctx.fillText(data.text, data.x, data.y);
                }
                break;

            case 'line':
                this.ctx.beginPath();
                this.ctx.moveTo(data.startX, data.startY);
                this.ctx.lineTo(data.endX, data.endY);
                this.ctx.stroke();
                break;

            case 'rectangle':
                this.ctx.strokeRect(data.x, data.y, data.width, data.height);
                break;

            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(data.x, data.y, data.radius, 0, 2 * Math.PI);
                this.ctx.stroke();
                break;

            case 'triangle':
                // Draw perfect triangle from 3 corner points
                if (data.points && data.points.length >= 3) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(data.points[0][0], data.points[0][1]);
                    this.ctx.lineTo(data.points[1][0], data.points[1][1]);
                    this.ctx.lineTo(data.points[2][0], data.points[2][1]);
                    this.ctx.closePath();
                    this.ctx.stroke();
                }
                break;

            case 'arrow':
                // Arrow implementation (simplified - draws line with arrowhead)
                if (data.points && data.points.length >= 2) {
                    const start = data.points[0];
                    const end = data.points[data.points.length - 1];

                    // Draw line
                    this.ctx.beginPath();
                    this.ctx.moveTo(start[0], start[1]);
                    this.ctx.lineTo(end[0], end[1]);
                    this.ctx.stroke();

                    // Draw arrowhead
                    const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
                    const arrowLength = 15;
                    this.ctx.beginPath();
                    this.ctx.moveTo(end[0], end[1]);
                    this.ctx.lineTo(
                        end[0] - arrowLength * Math.cos(angle - Math.PI / 6),
                        end[1] - arrowLength * Math.sin(angle - Math.PI / 6)
                    );
                    this.ctx.moveTo(end[0], end[1]);
                    this.ctx.lineTo(
                        end[0] - arrowLength * Math.cos(angle + Math.PI / 6),
                        end[1] - arrowLength * Math.sin(angle + Math.PI / 6)
                    );
                    this.ctx.stroke();
                }
                break;
        }
    }

    /**
     * Draw a perfect triangle on canvas
     * @param {Array} corners - 3 corner points [[x1,y1], [x2,y2], [x3,y3]]
     */
    drawTriangle(corners) {
        if (!corners || corners.length < 3) return;

        this.ctx.strokeStyle = this.strokeColor;
        this.ctx.lineWidth = this.strokeWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        this.ctx.moveTo(corners[0][0], corners[0][1]);
        this.ctx.lineTo(corners[1][0], corners[1][1]);
        this.ctx.lineTo(corners[2][0], corners[2][1]);
        this.ctx.closePath();
        this.ctx.stroke();
    }

    /**
     * Redraw all strokes on the current page
     */
    redrawPage() {
        // DEBUG: Log who called redrawPage
        console.log('🧹 redrawPage() called - clearing canvas');

        // Redraw background
        this.ctx.fillStyle = this.currentPage?.background_color || '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Redraw all existing strokes
        if (this.currentPage?.strokes) {
            this.currentPage.strokes.forEach(stroke => {
                this.drawStroke(stroke);
            });
        }
    }

    /**
     * Start drawing on canvas
     */
    startDrawing(e) {
        // PERMISSION CHECK: Only host (tutor) or participants with granted permission can draw
        if (!this.canUserDraw()) {
            console.log('⛔ Drawing blocked: No permission');
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.currentTool === 'text') {
            this.addText(x, y);
            return;
        }

        this.isDrawing = true;
        this.currentStroke = [[x, y]];
    }

    /**
     * Draw on canvas
     */
    draw(e) {
        if (!this.isDrawing) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.currentStroke.push([x, y]);

        // Draw locally
        this.ctx.strokeStyle = this.strokeColor;
        this.ctx.lineWidth = this.strokeWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        const points = this.currentStroke;
        if (points.length > 1) {
            this.ctx.beginPath();
            this.ctx.moveTo(points[points.length - 2][0], points[points.length - 2][1]);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
        }

        // Broadcast cursor position for real-time collaboration (throttled)
        this.throttledCursorBroadcast(x, y);
    }

    /**
     * Throttled cursor position broadcast to reduce network traffic
     */
    throttledCursorBroadcast(x, y) {
        if (this.cursorBroadcastTimeout) return;

        this.cursorBroadcastTimeout = setTimeout(() => {
            this.broadcastCursorPosition(x, y);
            this.cursorBroadcastTimeout = null;
        }, 50); // Broadcast at most every 50ms
    }

    /**
     * Stop drawing
     */
    async stopDrawing() {
        if (!this.isDrawing) return;

        this.isDrawing = false;

        if (this.currentStroke.length > 1) {
            let stroke_type = this.currentTool;
            let stroke_points = this.currentStroke;

            // TRIANGLE AUTO-CORRECTION: Detect if pen stroke is roughly a triangle
            // DISABLED: Uncomment to enable triangle auto-correction
            /*
            if (this.currentTool === 'pen') {
                const triangleDetected = this.detectTriangle(this.currentStroke);
                if (triangleDetected) {
                    console.log('🔺 Triangle detected! Auto-correcting...');
                    stroke_type = 'triangle';
                    stroke_points = triangleDetected.points; // Use perfect corners

                    // Clear the messy pen stroke and redraw as perfect triangle
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.redrawPage(); // Redraw existing strokes
                    this.drawTriangle(triangleDetected.points); // Draw perfect triangle
                }
            }
            */

            const stroke = {
                stroke_type: stroke_type,
                stroke_data: {
                    points: stroke_points,
                    color: this.strokeColor,
                    width: this.strokeWidth
                }
            };

            // Save stroke to server
            await this.saveStroke(stroke);

            // Broadcast to participants for real-time sync
            this.broadcastStroke(stroke);
        }

        this.currentStroke = [];
    }

    /**
     * Add text to canvas using inline text editor (canvas-like experience)
     */
    addText(x, y) {
        console.log('📝 DEBUG: addText called at', x, y);

        // PERMISSION CHECK: Only host or participants with write permission can add text
        if (!this.canUserWrite()) {
            console.log('⛔ Text input blocked: No write permission');
            this.showNotification('You need write permission to add text', 'error');
            return;
        }

        // Create or get the inline text editor overlay
        let textOverlay = document.getElementById('canvasTextOverlay');

        if (!textOverlay) {
            // Create the overlay element if it doesn't exist
            textOverlay = document.createElement('textarea');
            textOverlay.id = 'canvasTextOverlay';
            textOverlay.style.cssText = `
                position: absolute;
                background: rgba(255, 255, 255, 0.95);
                border: 2px solid #3b82f6;
                border-radius: 4px;
                padding: 8px;
                font-family: Arial, sans-serif;
                font-size: ${this.strokeWidth * 6}px;
                color: ${this.strokeColor};
                outline: none;
                resize: none;
                overflow: hidden;
                min-width: 200px;
                min-height: 40px;
                z-index: 1000;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            `;
            document.getElementById('canvasContainer').appendChild(textOverlay);
        }

        // ✨✨✨ CRITICAL FIX: Disable canvas pointer events ✨✨✨
        // This allows the text overlay to receive clicks and keyboard input
        // Canvas becomes "transparent" to pointer events while text editing
        this.canvas.style.pointerEvents = 'none';
        console.log('🎨 Canvas pointer events disabled for text editing');

        // Store position for later use
        this.pendingTextPosition = { x, y };

        // Position the overlay at click location
        const canvasRect = this.canvas.getBoundingClientRect();
        const containerRect = document.getElementById('canvasContainer').getBoundingClientRect();

        // Calculate position relative to container
        const overlayX = Math.min(x, canvasRect.width - 220);
        const overlayY = Math.min(y, canvasRect.height - 60);

        textOverlay.style.left = `${overlayX}px`;
        textOverlay.style.top = `${overlayY}px`;
        textOverlay.style.fontSize = `${this.strokeWidth * 6}px`;
        textOverlay.style.color = this.strokeColor;
        textOverlay.style.display = 'block';
        textOverlay.value = '';

        // Store the temporary text stroke ID for real-time updates
        this.tempTextStrokeId = Date.now();

        // Set flag to disable keyboard shortcuts while text editing
        this.isTextEditing = true;

        // Auto-resize function
        const autoResize = () => {
            textOverlay.style.height = 'auto';
            textOverlay.style.height = Math.max(40, textOverlay.scrollHeight) + 'px';
            textOverlay.style.width = 'auto';
            const lines = textOverlay.value.split('\n');
            const maxLineLength = Math.max(...lines.map(line => line.length), 10);
            textOverlay.style.width = Math.max(200, maxLineLength * (this.strokeWidth * 3.5)) + 'px';
        };

        // Handle input for auto-resize AND real-time text preview
        const handleInput = () => {
            console.log('⌨️ DEBUG: handleInput triggered, text:', textOverlay.value);
            autoResize();
            updateTextPreview();
        };

        // Real-time text preview - shows text on canvas as you type
        const updateTextPreview = () => {
            const currentText = textOverlay.value;
            console.log('⌨️ DEBUG: updateTextPreview, currentText:', currentText);

            // Redraw page to clear old preview
            this.redrawPage();

            // Draw current text as preview (semi-transparent)
            if (currentText) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.7; // Semi-transparent preview
                this.drawTextDirectly(currentText, this.pendingTextPosition.x, this.pendingTextPosition.y);
                this.ctx.restore();
            }

            // Broadcast typing preview to other participants in real-time
            console.log('⌨️ DEBUG: About to call broadcastTextTyping');
            this.broadcastTextTyping(currentText, this.pendingTextPosition.x, this.pendingTextPosition.y);
        };

        // Handle keydown events
        const handleKeydown = (e) => {
            // Stop event propagation to prevent keyboard shortcuts from interfering
            e.stopPropagation();

            // Enter = new line (natural typing behavior)
            // Escape = cancel and remove text
            if (e.key === 'Escape') {
                e.preventDefault();
                cancelText();
            }
            // Note: Enter key now works naturally for new lines
            // All other keys (including P, E, T, L, R, C, A) will work normally for typing
        };

        // Handle clicking outside to finish
        const handleClickOutside = (e) => {
            if (e.target !== textOverlay && textOverlay.style.display !== 'none') {
                finishText();
            }
        };

        const finishText = () => {
            const text = textOverlay.value.trim();
            if (text) {
                // Clear preview and draw final text
                this.redrawPage();
                this.drawTextOnCanvas(text, this.pendingTextPosition.x, this.pendingTextPosition.y);
            } else {
                // No text entered, just redraw to clear preview
                this.redrawPage();
            }
            cleanup();
        };

        const cancelText = () => {
            this.redrawPage(); // Clear preview
            cleanup();
        };

        const cleanup = () => {
            textOverlay.style.display = 'none';
            textOverlay.value = '';
            textOverlay.removeEventListener('input', handleInput);
            textOverlay.removeEventListener('keydown', handleKeydown);
            document.removeEventListener('click', handleClickOutside);
            this.tempTextStrokeId = null;

            // ✨✨✨ CRITICAL FIX: Re-enable canvas pointer events ✨✨✨
            // Canvas becomes interactive again for drawing
            this.canvas.style.pointerEvents = 'auto';
            console.log('🎨 Canvas pointer events re-enabled');

            // Re-enable keyboard shortcuts
            this.isTextEditing = false;
        };

        // Add event listeners
        textOverlay.addEventListener('input', handleInput);
        textOverlay.addEventListener('keydown', handleKeydown);

        // Delay the click-outside listener to avoid immediate trigger
        setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 100);

        // Focus and position cursor
        textOverlay.focus();
        autoResize();
    }

    /**
     * Draw text directly on canvas (no save) - for real-time preview
     */
    drawTextDirectly(text, x, y) {
        // Apply text formatting
        const formatted = this.applyTextFormatting(text);

        // Build font string with formatting
        let fontStyle = '';
        if (formatted.italic) fontStyle += 'italic ';
        if (formatted.bold) fontStyle += 'bold ';
        const fontSize = formatted.subscript || formatted.superscript
            ? this.strokeWidth * 4  // Smaller for sub/superscript
            : this.strokeWidth * 6;

        // Adjust Y position for sub/superscript
        let adjustedY = y;
        if (formatted.subscript) adjustedY += fontSize * 0.3;
        if (formatted.superscript) adjustedY -= fontSize * 0.3;

        // Draw text locally
        this.ctx.font = `${fontStyle}${fontSize}px Arial`;
        this.ctx.fillStyle = this.strokeColor;

        // Handle multi-line text
        const lines = formatted.text.split('\n');
        const lineHeight = fontSize * 1.2;

        lines.forEach((line, index) => {
            const lineY = adjustedY + (index * lineHeight);
            this.ctx.fillText(line, x, lineY);

            // Draw underline if enabled
            if (formatted.underline) {
                const textWidth = this.ctx.measureText(line).width;
                this.ctx.beginPath();
                this.ctx.strokeStyle = this.strokeColor;
                this.ctx.lineWidth = 1;
                this.ctx.moveTo(x, lineY + 2);
                this.ctx.lineTo(x + textWidth, lineY + 2);
                this.ctx.stroke();
            }

            // Draw strikethrough if enabled
            if (formatted.strikethrough) {
                const textWidth = this.ctx.measureText(line).width;
                this.ctx.beginPath();
                this.ctx.strokeStyle = this.strokeColor;
                this.ctx.lineWidth = 1;
                this.ctx.moveTo(x, lineY - fontSize * 0.3);
                this.ctx.lineTo(x + textWidth, lineY - fontSize * 0.3);
                this.ctx.stroke();
            }
        });
    }

    /**
     * Draw text on canvas and save to server
     * Uses collision detection to prevent overlapping text
     */
    drawTextOnCanvas(text, x, y) {
        // Apply text formatting
        const formatted = this.applyTextFormatting(text);

        // Build font string with formatting
        let fontStyle = '';
        if (formatted.italic) fontStyle += 'italic ';
        if (formatted.bold) fontStyle += 'bold ';
        const fontSize = formatted.subscript || formatted.superscript
            ? this.strokeWidth * 4  // Smaller for sub/superscript
            : this.strokeWidth * 6;

        // Measure text width for collision detection
        this.ctx.font = `${fontStyle}${fontSize}px Arial`;
        const textWidth = this.ctx.measureText(formatted.text).width;

        // Find non-overlapping position
        const position = this.findNonOverlappingPosition(x, y, textWidth, fontSize);
        let adjustedX = position.x;
        let adjustedY = position.y;

        // Further adjust Y position for sub/superscript
        if (formatted.subscript) adjustedY += fontSize * 0.3;
        if (formatted.superscript) adjustedY -= fontSize * 0.3;

        // Register this text's bounding box for future collision detection
        this.registerTextBoundingBox(adjustedX, adjustedY, textWidth, fontSize);

        // Update lastTextY tracker
        this.lastTextY = adjustedY;

        // Draw text locally
        this.ctx.fillStyle = this.strokeColor;
        this.ctx.fillText(formatted.text, adjustedX, adjustedY);

        // Draw underline if enabled
        if (formatted.underline) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = this.strokeColor;
            this.ctx.lineWidth = 1;
            this.ctx.moveTo(adjustedX, adjustedY + 2);
            this.ctx.lineTo(adjustedX + textWidth, adjustedY + 2);
            this.ctx.stroke();
        }

        // Draw strikethrough if enabled
        if (formatted.strikethrough) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = this.strokeColor;
            this.ctx.lineWidth = 1;
            this.ctx.moveTo(adjustedX, adjustedY - fontSize * 0.3);
            this.ctx.lineTo(adjustedX + textWidth, adjustedY - fontSize * 0.3);
            this.ctx.stroke();
        }

        // Save to server with formatting info (use adjusted positions)
        this.saveStroke({
            stroke_type: 'text',
            stroke_data: {
                text: formatted.text,
                x: adjustedX,
                y: adjustedY,
                fontSize: fontSize,
                fontFamily: 'Arial',
                color: this.strokeColor,
                formatting: {
                    bold: formatted.bold,
                    italic: formatted.italic,
                    underline: formatted.underline,
                    strikethrough: formatted.strikethrough,
                    subscript: formatted.subscript,
                    superscript: formatted.superscript
                }
            }
        });

        // Broadcast to participants if real-time sync enabled (use adjusted positions)
        this.broadcastStroke({
            stroke_type: 'text',
            stroke_data: {
                text: formatted.text,
                x: adjustedX,
                y: adjustedY,
                fontSize: fontSize,
                fontFamily: 'Arial',
                color: this.strokeColor,
                formatting: {
                    bold: formatted.bold,
                    italic: formatted.italic,
                    underline: formatted.underline,
                    strikethrough: formatted.strikethrough,
                    subscript: formatted.subscript,
                    superscript: formatted.superscript
                }
            }
        });

        console.log(`📝 Text drawn with formatting:`, formatted);
    }

    /**
     * Save stroke to server
     */
    async saveStroke(stroke) {
        if (!this.currentPage) return;

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const response = await fetch(`${this.API_BASE}/canvas/stroke`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    page_id: this.currentPage.id,
                    ...stroke
                })
            });

            const data = await response.json();

            if (data.success) {
                console.log('✅ Stroke saved');
            }
        } catch (error) {
            console.error('Error saving stroke:', error);
        }
    }

    /**
     * Select a tool
     * Dynamically shows/hides relevant toolbar sections
     * Permission check: Participants need appropriate permissions to use tools
     */
    selectTool(tool) {
        // Permission check based on tool type
        const drawTools = ['pen', 'line', 'rectangle', 'circle', 'triangle', 'arrow'];
        const writeTools = ['text'];
        const eraseTools = ['eraser'];

        if (drawTools.includes(tool) && !this.canUserDraw()) {
            console.log(`⛔ Tool selection blocked: No draw permission for ${tool}`);
            this.showNotification('You need draw permission to use this tool', 'error');
            return;
        }
        if (writeTools.includes(tool) && !this.canUserWrite()) {
            console.log(`⛔ Tool selection blocked: No write permission for ${tool}`);
            this.showNotification('You need write permission to use this tool', 'error');
            return;
        }
        if (eraseTools.includes(tool) && !this.canUserErase()) {
            console.log(`⛔ Tool selection blocked: No erase permission for ${tool}`);
            this.showNotification('You need erase permission to use this tool', 'error');
            return;
        }

        this.currentTool = tool;

        // Update UI - highlight active tool
        document.querySelectorAll('.tool-button[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });

        // Change canvas cursor based on tool
        if (tool === 'text') {
            this.canvas.style.cursor = 'text';
        } else if (tool === 'eraser') {
            this.canvas.style.cursor = 'crosshair';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }

        // Show/hide appropriate toolbar sections with smooth CSS transitions
        const penTools = document.getElementById('penTools');
        const textTools = document.getElementById('textTools');

        if (tool === 'text') {
            // TEXT MODE: Hide pen tools, show text formatting tools
            if (penTools) {
                penTools.classList.add('hidden');
                setTimeout(() => {
                    if (penTools.classList.contains('hidden')) {
                        penTools.style.display = 'none';
                    }
                }, 300);
            }
            if (textTools) {
                textTools.style.display = 'flex';
                void textTools.offsetWidth;
                textTools.classList.remove('hidden');
            }

            // Switch to text editor mode
            this.enableTextEditorMode();
            console.log('📝 Text mode activated - canvas now editable');
        } else {
            // PEN MODE: Show pen tools (shapes + eraser), hide text tools
            if (textTools) {
                textTools.classList.add('hidden');
                setTimeout(() => {
                    if (textTools.classList.contains('hidden')) {
                        textTools.style.display = 'none';
                    }
                }, 300);
            }
            if (penTools) {
                penTools.style.display = 'flex';
                void penTools.offsetWidth;
                penTools.classList.remove('hidden');
            }

            // Switch to drawing mode
            this.enableDrawingMode();
            console.log(`✏️ Drawing mode activated - tool: ${tool}`);
        }

        // Reset any active text formatting when switching away from text
        if (tool !== 'text') {
            this.resetTextFormatting();
        }

        // ✨✨✨ NEW: Broadcast tool change if user has permission ✨✨✨
        // Host can always broadcast, participants need interaction permission
        if (this.canBroadcastToolChange()) {
            this.broadcastToolChange(tool);
        } else if (this.userRole !== 'tutor') {
            console.log('⚠️ Cannot broadcast tool change: No interaction permission');
        }
    }

    /**
     * Enable text editor mode - convert canvas to contenteditable text area
     */
    enableTextEditorMode() {
        // Check permission before enabling
        if (!this.canUserWrite()) {
            console.log('⛔ Text editor blocked: No write permission');
            console.log('⛔ Debug info:', {
                userRole: this.userRole,
                isSessionHost: this.isSessionHost,
                permissions: this.permissions,
                selectedTutorId: this.selectedTutorId,
                selectedStudentId: this.selectedStudentId
            });
            this.showNotification('You need write permission to use text editor', 'error');
            return;
        }

        console.log('✅ Text editor permission granted:', {
            userRole: this.userRole,
            isSessionHost: this.isSessionHost,
            permissions: this.permissions,
            selectedTutorId: this.selectedTutorId,
            selectedStudentId: this.selectedStudentId
        });

        // Create text editor overlay if it doesn't exist
        let textEditor = document.getElementById('canvasTextEditorOverlay');
        if (!textEditor) {
            textEditor = document.createElement('div');
            textEditor.id = 'canvasTextEditorOverlay';
            textEditor.contentEditable = 'true';
            textEditor.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                padding: 20px;
                font-size: 16px;
                font-family: Arial, sans-serif;
                color: ${this.strokeColor};
                background: transparent;
                border: none;
                outline: none;
                overflow-y: auto;
                white-space: pre-wrap;
                word-wrap: break-word;
                z-index: 10;
                cursor: text;
            `;

            // Insert after canvas
            this.canvas.parentElement.style.position = 'relative';
            this.canvas.parentElement.appendChild(textEditor);
        }

        // Hide canvas, show text editor
        this.canvas.style.opacity = '0.1'; // Keep canvas visible as background
        textEditor.style.display = 'block';
        textEditor.focus();

        // Update text color when stroke color changes
        textEditor.style.color = this.strokeColor;

        // ✨ CRITICAL FIX: Add input listener for real-time text broadcasting
        // Remove existing listener to prevent duplicates
        textEditor.removeEventListener('input', this._textEditorInputHandler);

        // Create bound handler for this instance
        this._textEditorInputHandler = () => {
            const currentText = textEditor.innerText || textEditor.textContent || '';
            console.log('⌨️ Text editor input:', currentText.substring(0, 30) + '...');

            // Broadcast text typing to participants
            // Use center of canvas as position since this is full-screen editor
            const centerX = this.canvas.width / 2;
            const centerY = 50; // Near top
            this.broadcastTextTyping(currentText, centerX, centerY);
        };

        textEditor.addEventListener('input', this._textEditorInputHandler);

        console.log('📝 Text editor mode enabled');
    }

    /**
     * Enable drawing mode - hide text editor, show canvas
     */
    async enableDrawingMode() {
        const textEditor = document.getElementById('canvasTextEditorOverlay');

        if (textEditor) {
            // Save text content to canvas before hiding
            const textContent = textEditor.innerHTML;
            if (textContent.trim()) {
                // Convert HTML text to canvas and broadcast to participants
                await this.saveTextEditorContentToCanvas(textContent);
            }

            // Clear the text editor content after saving
            textEditor.innerHTML = '';

            // Hide text editor, show canvas
            textEditor.style.display = 'none';
        }

        this.canvas.style.opacity = '1';
        this.canvas.style.cursor = 'crosshair';

        console.log('✏️ Drawing mode enabled');
    }

    /**
     * Save text editor content to canvas
     */
    async saveTextEditorContentToCanvas(htmlContent) {
        // Strip HTML tags for plain text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';

        if (!plainText.trim()) return;

        // Draw text on canvas - use dynamic Y positioning to avoid overlap
        const x = 30;
        const lineHeight = 24;
        const fontSize = this.strokeWidth * 6;
        const lines = plainText.split('\n');
        const padding = 10; // Extra padding between text blocks

        // Calculate starting Y position to avoid overlap
        // Use lastTextY + padding, but wrap to top if near bottom
        const totalHeight = lines.length * lineHeight;
        const maxY = this.canvas.height - totalHeight - 30;

        let startY = this.lastTextY + padding;

        // If starting position would put text off-screen, wrap to top
        if (startY > maxY) {
            startY = 50;
            // Clear text position tracking for new "page" of text
            this.textPositions = [];
        }

        this.ctx.font = `${fontSize}px Arial`;
        this.ctx.fillStyle = this.strokeColor;

        lines.forEach((line, index) => {
            this.ctx.fillText(line, x, startY + (index * lineHeight));
        });

        // Update lastTextY to track where text ends
        this.lastTextY = startY + (lines.length * lineHeight);

        // ✨ CRITICAL FIX: Save each line as a stroke and broadcast to participants
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            if (!line.trim()) continue;

            const stroke = {
                stroke_type: 'text',
                stroke_data: {
                    text: line,
                    x: x,
                    y: startY + (index * lineHeight),
                    fontSize: fontSize,
                    fontFamily: 'Arial',
                    color: this.strokeColor
                }
            };

            // Save to server
            await this.saveStroke(stroke);

            // Broadcast to participants for real-time sync
            this.broadcastStroke(stroke);
        }

        console.log('📝 Text editor content saved to canvas at Y:', startY);
    }

    /**
     * Toggle text formatting option
     * @param {string} format - bold, italic, underline, strikethrough, subscript, superscript, bulletList, numberedList
     */
    toggleTextFormat(format) {
        // Permission check: need write permission to format text
        if (!this.canUserWrite()) {
            console.log(`⛔ Text formatting blocked: No write permission`);
            this.showNotification('You need write permission to format text', 'error');
            return;
        }

        // If text editor is active, use execCommand for live formatting
        const textEditor = document.getElementById('canvasTextEditorOverlay');
        if (textEditor && textEditor.style.display !== 'none') {
            this.applyLiveTextFormatting(format);
            return;
        }

        // Otherwise, toggle state for canvas text rendering (legacy)
        this.textFormatting[format] = !this.textFormatting[format];

        // Mutually exclusive: subscript and superscript
        if (format === 'subscript' && this.textFormatting.subscript) {
            this.textFormatting.superscript = false;
        } else if (format === 'superscript' && this.textFormatting.superscript) {
            this.textFormatting.subscript = false;
        }

        // Mutually exclusive: bulletList and numberedList
        if (format === 'bulletList' && this.textFormatting.bulletList) {
            this.textFormatting.numberedList = false;
        } else if (format === 'numberedList' && this.textFormatting.numberedList) {
            this.textFormatting.bulletList = false;
        }

        // Update format button UI
        this.updateFormatButtonsUI();

        console.log(`📝 Text format toggled: ${format} = ${this.textFormatting[format]}`);
    }

    /**
     * Apply text formatting to contenteditable text editor using execCommand
     */
    applyLiveTextFormatting(format) {
        const textEditor = document.getElementById('canvasTextEditorOverlay');
        if (!textEditor) return;

        // Focus the editor to apply formatting
        textEditor.focus();

        // Map format names to execCommand commands
        const commandMap = {
            'bold': 'bold',
            'italic': 'italic',
            'underline': 'underline',
            'strikethrough': 'strikeThrough',
            'subscript': 'subscript',
            'superscript': 'superscript',
            'bulletList': 'insertUnorderedList',
            'numberedList': 'insertOrderedList'
        };

        const command = commandMap[format];
        if (command) {
            document.execCommand(command, false, null);
            console.log(`📝 Applied live formatting: ${format}`);
        }

        // Update button UI based on current selection state
        this.updateFormatButtonsUIFromSelection();
    }

    /**
     * Update format buttons UI based on current text selection
     */
    updateFormatButtonsUIFromSelection() {
        const formatChecks = {
            'bold': () => document.queryCommandState('bold'),
            'italic': () => document.queryCommandState('italic'),
            'underline': () => document.queryCommandState('underline'),
            'strikethrough': () => document.queryCommandState('strikeThrough'),
            'subscript': () => document.queryCommandState('subscript'),
            'superscript': () => document.queryCommandState('superscript'),
            'bulletList': () => document.queryCommandState('insertUnorderedList'),
            'numberedList': () => document.queryCommandState('insertOrderedList')
        };

        document.querySelectorAll('.format-button[data-format]').forEach(btn => {
            const format = btn.dataset.format;
            const isActive = formatChecks[format] ? formatChecks[format]() : false;
            btn.classList.toggle('active', isActive);
        });
    }

    /**
     * Update format buttons visual state
     */
    updateFormatButtonsUI() {
        document.querySelectorAll('.format-button[data-format]').forEach(btn => {
            const format = btn.dataset.format;
            btn.classList.toggle('active', this.textFormatting[format]);
        });
    }

    /**
     * Reset all text formatting
     */
    resetTextFormatting() {
        Object.keys(this.textFormatting).forEach(key => {
            this.textFormatting[key] = false;
        });
        this.updateFormatButtonsUI();
    }

    /**
     * Apply text formatting to text string
     * Returns formatted text with HTML-like markup
     */
    applyTextFormatting(text) {
        let formatted = text;
        let styles = [];
        let prefix = '';

        // Add list bullet/number
        if (this.textFormatting.bulletList) {
            prefix = '• ';
        } else if (this.textFormatting.numberedList) {
            // Would need to track line number - simplified as "1. " for now
            prefix = '1. ';
        }

        // Build style array for CSS-like rendering
        if (this.textFormatting.bold) styles.push('font-weight:bold');
        if (this.textFormatting.italic) styles.push('font-style:italic');

        return {
            text: prefix + formatted,
            bold: this.textFormatting.bold,
            italic: this.textFormatting.italic,
            underline: this.textFormatting.underline,
            strikethrough: this.textFormatting.strikethrough,
            subscript: this.textFormatting.subscript,
            superscript: this.textFormatting.superscript,
            styles: styles.join(';')
        };
    }

    /**
     * Detect if drawn shape is roughly a triangle and auto-correct it
     * @param {Array} points - Array of [x, y] coordinates
     * @returns {Object|null} - Triangle data if detected, null otherwise
     */
    detectTriangle(points) {
        if (points.length < 10) return null; // Too few points

        // Find 3 corner points by detecting sharp angle changes
        const corners = this.findCorners(points, 3);

        if (corners.length !== 3) return null;

        // Verify it's roughly a triangle (angles sum close to 180°)
        const angles = this.calculateAngles(corners);
        const angleSum = angles.reduce((sum, angle) => sum + angle, 0);

        // Allow 20° tolerance
        if (Math.abs(angleSum - 180) < 20) {
            return {
                type: 'triangle',
                points: corners
            };
        }

        return null;
    }

    /**
     * Find corner points in a stroke (points with sharp angle changes)
     * @param {Array} points - Array of [x, y] coordinates
     * @param {number} targetCorners - Number of corners to find
     * @returns {Array} - Array of corner points
     */
    findCorners(points, targetCorners = 3) {
        if (points.length < targetCorners * 3) return [];

        const corners = [];
        const threshold = 30; // Minimum angle change to be considered a corner (degrees)

        for (let i = 5; i < points.length - 5; i++) {
            const prev = points[i - 5];
            const curr = points[i];
            const next = points[i + 5];

            const angle = this.calculateAngle(prev, curr, next);

            // If angle change is significant, it's a corner
            if (angle < 180 - threshold) {
                corners.push(curr);
            }
        }

        // If we found too many corners, keep the sharpest ones
        if (corners.length > targetCorners) {
            return corners.slice(0, targetCorners);
        }

        return corners;
    }

    /**
     * Calculate angle at point B given points A-B-C
     * @returns {number} - Angle in degrees
     */
    calculateAngle(a, b, c) {
        const ab = Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
        const bc = Math.sqrt((c[0] - b[0]) ** 2 + (c[1] - b[1]) ** 2);
        const ac = Math.sqrt((c[0] - a[0]) ** 2 + (c[1] - a[1]) ** 2);

        // Law of cosines
        const cosAngle = (ab ** 2 + bc ** 2 - ac ** 2) / (2 * ab * bc);
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);

        return angle;
    }

    /**
     * Calculate all 3 angles in a triangle
     * @param {Array} corners - 3 corner points [[x1,y1], [x2,y2], [x3,y3]]
     * @returns {Array} - 3 angles in degrees
     */
    calculateAngles(corners) {
        if (corners.length !== 3) return [];

        const [a, b, c] = corners;
        return [
            this.calculateAngle(c, a, b),
            this.calculateAngle(a, b, c),
            this.calculateAngle(b, c, a)
        ];
    }

    /**
     * Clear current page
     */
    clearPage() {
        // PERMISSION CHECK: Only host or participants with erase permission can clear
        if (!this.canUserErase()) {
            console.log('⛔ Clear blocked: No erase permission');
            this.showNotification('You need erase permission to clear the canvas', 'error');
            return;
        }

        if (!confirm('Clear entire page? This cannot be undone.')) return;

        this.performClear(true); // true = broadcast to other party
    }

    /**
     * Perform the actual clear operation
     * @param {boolean} broadcast - Whether to broadcast to other party
     */
    performClear(broadcast = true) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Clear strokes array
        if (this.currentPage) {
            this.currentPage.strokes = [];
        }

        // Reset text position tracking
        this.lastTextY = 50;
        this.textPositions = [];
        this.textBoundingBoxes = [];

        // Broadcast clear to all participants
        if (broadcast && this.ws && this.ws.readyState === WebSocket.OPEN) {
            const otherParty = this.getOtherParty();
            if (!otherParty) {
                console.warn('⚠️ Cannot broadcast clear: No other party set');
                return;
            }

            const senderName = this.userRole === 'tutor'
                ? this.tutorInfo?.full_name || 'Tutor'
                : this.studentInfo?.full_name || 'Student';

            const message = {
                type: 'whiteboard_clear',
                session_id: this.currentSession?.id,
                page_id: this.currentPage?.id,
                sender_id: this.myProfileId,
                sender_role: this.userRole,
                sender_name: senderName,
                // ✨ ROLE-AGNOSTIC: Use generic profile routing
                from_profile_id: this.myProfileId,
                from_profile_type: this.userRole,
                to_profile_id: otherParty.id,
                to_profile_type: otherParty.type,
                // Legacy fields for backward compatibility
                from_student_profile_id: this.userRole === 'student' ? this.myProfileId : null,
                from_tutor_profile_id: this.userRole === 'tutor' ? this.myProfileId : null,
                to_student_profile_id: otherParty.type === 'student' ? otherParty.id : null,
                to_tutor_profile_id: otherParty.type === 'tutor' ? otherParty.id : null
            };

            this.ws.send(JSON.stringify(message));
            console.log(`📤 Broadcasting clear to ${otherParty.type}_${otherParty.id}`);
        }
    }

    /**
     * Undo last stroke
     */
    undo() {
        // Check if there are strokes to undo
        if (!this.currentPage || !this.currentPage.strokes || this.currentPage.strokes.length === 0) {
            this.showNotification('Nothing to undo', 'info');
            return;
        }

        // PERMISSION CHECK: Only host or participants with erase permission can undo
        if (!this.canUserErase()) {
            console.log('⛔ Undo blocked: No erase permission');
            this.showNotification('You need erase permission to undo', 'error');
            return;
        }

        this.performUndo(true); // true = broadcast to other party
    }

    /**
     * Perform the actual undo operation
     * @param {boolean} broadcast - Whether to broadcast to other party
     */
    performUndo(broadcast = true) {
        if (!this.currentPage || !this.currentPage.strokes || this.currentPage.strokes.length === 0) {
            return;
        }

        // Remove last stroke
        const removedStroke = this.currentPage.strokes.pop();
        console.log('🔙 Undo: Removed stroke', removedStroke);

        // Redraw page without the removed stroke
        this.redrawPage();

        // Broadcast undo to other party
        if (broadcast && this.ws && this.ws.readyState === WebSocket.OPEN) {
            const otherParty = this.getOtherParty();
            if (!otherParty) {
                console.warn('⚠️ Cannot broadcast undo: No other party set');
                return;
            }

            const senderName = this.userRole === 'tutor'
                ? this.tutorInfo?.full_name || 'Tutor'
                : this.studentInfo?.full_name || 'Student';

            const message = {
                type: 'whiteboard_undo',
                session_id: this.currentSession?.id,
                page_id: this.currentPage?.id,
                sender_id: this.myProfileId,
                sender_role: this.userRole,
                sender_name: senderName,
                // ✨ ROLE-AGNOSTIC: Use generic profile routing
                from_profile_id: this.myProfileId,
                from_profile_type: this.userRole,
                to_profile_id: otherParty.id,
                to_profile_type: otherParty.type,
                // Legacy fields for backward compatibility
                from_student_profile_id: this.userRole === 'student' ? this.myProfileId : null,
                from_tutor_profile_id: this.userRole === 'tutor' ? this.myProfileId : null,
                to_student_profile_id: otherParty.type === 'student' ? otherParty.id : null,
                to_tutor_profile_id: otherParty.type === 'tutor' ? otherParty.id : null
            };

            this.ws.send(JSON.stringify(message));
            console.log(`📤 Broadcasting undo to ${otherParty.type}_${otherParty.id}`);
        }
    }

    /**
     * Broadcast color change to other party
     * B. Color change should only work for participants allowed by host
     */
    broadcastColorChange(color) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        // Permission check: Only host or participants with draw/write permission can broadcast color changes
        if (!this.canUserChangeColor()) {
            console.log('⛔ Color broadcast blocked: No permission');
            return;
        }

        const otherParty = this.getOtherParty();
        if (!otherParty) return;

        const senderName = this.userRole === 'tutor'
            ? this.tutorInfo?.full_name || 'Tutor'
            : this.studentInfo?.full_name || 'Student';

        const message = {
            type: 'whiteboard_color_change',
            session_id: this.currentSession?.id,
            color: color,
            sender_id: this.myProfileId,
            sender_role: this.userRole,
            sender_name: senderName,
            // ✨ ROLE-AGNOSTIC: Use generic profile routing
            from_profile_id: this.myProfileId,
            from_profile_type: this.userRole,
            to_profile_id: otherParty.id,
            to_profile_type: otherParty.type,
            // Legacy fields for backward compatibility
            from_student_profile_id: this.userRole === 'student' ? this.myProfileId : null,
            from_tutor_profile_id: this.userRole === 'tutor' ? this.myProfileId : null,
            to_student_profile_id: otherParty.type === 'student' ? otherParty.id : null,
            to_tutor_profile_id: otherParty.type === 'tutor' ? otherParty.id : null
        };

        this.ws.send(JSON.stringify(message));
        console.log(`📤 Broadcasting color change: ${color} to ${otherParty.type}_${otherParty.id}`);
    }

    /**
     * Save session
     */
    saveSession() {
        this.showNotification('Session saved successfully', 'success');
    }

    /**
     * Toggle allow interaction dropdown visibility
     * Only works when video session is active and user is the host
     */
    toggleInteractionDropdown() {
        // Only allow interaction management during active video sessions
        if (!this.isVideoSessionActive) {
            this.showNotification('Start a video session first to manage interaction permissions', 'info');
            return;
        }

        // Only hosts can manage interaction permissions
        if (!this.isSessionHost) {
            this.showNotification('Only the session host can manage interaction permissions', 'info');
            return;
        }

        const wrapper = document.getElementById('allowInteractionWrapper');
        if (!wrapper) return;

        const isOpen = wrapper.classList.contains('dropdown-open');

        if (isOpen) {
            this.closeInteractionDropdown();
        } else {
            this.openInteractionDropdown();
        }
    }

    /**
     * Open the interaction requests dropdown
     */
    openInteractionDropdown() {
        const wrapper = document.getElementById('allowInteractionWrapper');
        if (!wrapper) return;

        // Update the dropdown content with current requests
        this.updateInteractionDropdownContent();

        // Update toggle switch state
        const toggleSwitch = document.getElementById('toggleAllInteraction');
        if (toggleSwitch) {
            toggleSwitch.checked = this.interactionAllowed;
        }

        // Show dropdown
        wrapper.classList.add('dropdown-open');
    }

    /**
     * Close the interaction requests dropdown
     */
    closeInteractionDropdown() {
        const wrapper = document.getElementById('allowInteractionWrapper');
        if (wrapper) {
            wrapper.classList.remove('dropdown-open');
        }
    }

    /**
     * Update dropdown content with current interaction requests and active permissions
     */
    updateInteractionDropdownContent() {
        const requestsList = document.getElementById('dropdownRequestsList');
        if (!requestsList) return;

        let contentHTML = '';

        // Section 1: Active Permissions (participants who can currently draw)
        if (this.activePermissions.length > 0) {
            const activeHTML = this.activePermissions.map(p => {
                const avatarHtml = p.avatar && !p.avatar.includes('user-default')
                    ? `<img src="${p.avatar}" alt="${p.name}"
                           onerror="whiteboardManager.handleAvatarError(this, '${p.name.replace(/'/g, "\\'")}')">`
                    : `<div class="initials-avatar">${p.initials || this.getInitials(p.name)}</div>`;

                return `
                    <div class="request-item active-permission" data-participant-id="${p.id}">
                        <div class="request-avatar">
                            ${avatarHtml}
                        </div>
                        <div class="request-info">
                            <span class="request-name">${p.name}</span>
                            <span class="request-status active"><i class="fas fa-circle"></i> Can interact</span>
                        </div>
                        <div class="request-actions">
                            <button class="request-action-btn revoke" onclick="event.stopPropagation(); whiteboardManager.revokeInteractionPermission('${p.id}')" title="Stop interaction">
                                <i class="fas fa-stop"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            contentHTML += `
                <div class="dropdown-section active-section">
                    <div class="section-header">
                        <i class="fas fa-user-check"></i>
                        <span>Active (${this.activePermissions.length})</span>
                        ${this.activePermissions.length > 1 ? `<button class="section-action-btn" onclick="event.stopPropagation(); whiteboardManager.revokeAllPermissions()" title="Stop all">Stop All</button>` : ''}
                    </div>
                    ${activeHTML}
                </div>
            `;
        }

        // Section 2: Pending Requests
        if (this.interactionRequests.length > 0) {
            const requestsHTML = this.interactionRequests.map(req => {
                const avatarHtml = req.studentAvatar && !req.studentAvatar.includes('user-default')
                    ? `<img src="${req.studentAvatar}" alt="${req.studentName}"
                           onerror="whiteboardManager.handleAvatarError(this, '${req.studentName.replace(/'/g, "\\'")}')">`
                    : `<div class="initials-avatar">${req.studentInitials || this.getInitials(req.studentName)}</div>`;

                return `
                    <div class="request-item pending-request" data-student-id="${req.studentId}">
                        <div class="request-avatar">
                            ${avatarHtml}
                        </div>
                        <div class="request-info">
                            <span class="request-name">${req.studentName}</span>
                            <span class="request-time">${this.formatTimeAgo(req.requestedAt)}</span>
                        </div>
                        <div class="request-actions">
                            <button class="request-action-btn approve" onclick="event.stopPropagation(); whiteboardManager.approveInteractionRequest('${req.studentId}')" title="Allow">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="request-action-btn deny" onclick="event.stopPropagation(); whiteboardManager.denyInteractionRequest('${req.studentId}')" title="Deny">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            contentHTML += `
                <div class="dropdown-section pending-section">
                    <div class="section-header">
                        <i class="fas fa-clock"></i>
                        <span>Pending (${this.interactionRequests.length})</span>
                    </div>
                    ${requestsHTML}
                </div>
            `;
        }

        // Show empty state only if both are empty
        if (this.activePermissions.length === 0 && this.interactionRequests.length === 0) {
            contentHTML = `
                <div class="no-requests-message">
                    <i class="fas fa-inbox"></i>
                    <span>No pending requests</span>
                </div>
            `;
        }

        requestsList.innerHTML = contentHTML;

        // Add click handler to each pending request item (clicking approves)
        requestsList.querySelectorAll('.pending-request').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't approve if clicking the action buttons
                if (e.target.closest('.request-actions')) return;
                const studentId = item.dataset.studentId;
                this.approveInteractionRequest(studentId);
            });
        });
    }

    /**
     * Legacy: Toggle allow interaction - Show requests modal if there are pending requests
     * @deprecated Use toggleInteractionDropdown instead
     */
    async toggleAllowInteraction() {
        this.toggleInteractionDropdown();
    }

    /**
     * Set interaction state (on/off)
     */
    async setInteractionState(enabled, studentIds = null) {
        const btn = document.getElementById('allowInteractionBtn');
        if (!btn) return;

        this.interactionAllowed = enabled;

        // Update button appearance
        if (this.interactionAllowed) {
            btn.classList.add('active');
            btn.querySelector('.btn-text').textContent = 'Interaction On';
            this.showNotification('Student interaction enabled - Students can now draw and write on the whiteboard', 'success');
        } else {
            btn.classList.remove('active');
            btn.querySelector('.btn-text').textContent = 'Allow Interaction';
            this.showNotification('Student interaction disabled - Only you can draw on the whiteboard', 'info');
        }

        // Update badge
        this.updateInteractionBadge();

        // If we have an active session, update permissions via API
        if (this.currentSession) {
            try {
                const token = localStorage.getItem('token') || localStorage.getItem('access_token');
                const response = await fetch(`${API_BASE_URL}/api/whiteboard/sessions/${this.currentSession.id}/permissions`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        can_draw: this.interactionAllowed,
                        can_write: this.interactionAllowed,
                        can_erase: this.interactionAllowed,
                        student_ids: studentIds // Specific students if provided
                    })
                });

                if (response.ok) {
                    console.log('Permissions updated successfully');
                    // Future: Broadcast via WebSocket to connected students
                }
            } catch (error) {
                console.warn('Could not update permissions via API:', error);
            }
        }

        console.log('Allow interaction set:', {
            interactionAllowed: this.interactionAllowed,
            sessionId: this.currentSession?.id,
            studentIds
        });
    }

    /**
     * Update interaction request badge count
     */
    updateInteractionBadge() {
        const badge = document.getElementById('interactionRequestBadge');
        if (!badge) return;

        const count = this.interactionRequests.length;
        badge.textContent = count;

        if (count > 0) {
            badge.classList.add('has-requests');
        } else {
            badge.classList.remove('has-requests');
        }
    }

    /**
     * Add an interaction request from a participant
     * This would be called when receiving a WebSocket message
     * @param {number} requesterId - Profile ID of the requester
     * @param {string} requesterName - Name of the requester
     * @param {string} requesterAvatar - Avatar URL of the requester
     * @param {string} requesterProfileType - 'student' or 'tutor'
     */
    addInteractionRequest(requesterId, requesterName, requesterAvatar, requesterProfileType = 'student') {
        // Check if already requested
        if (this.interactionRequests.find(r => r.requesterId === requesterId)) {
            return;
        }

        this.interactionRequests.push({
            requesterId,
            requesterName,
            requesterAvatar: requesterAvatar, // Will use initials if null/invalid
            requesterInitials: this.getInitials(requesterName),
            requesterProfileType, // 'student' or 'tutor' - needed for routing response
            requestedAt: new Date(),
            // Legacy aliases for backward compatibility
            studentId: requesterId,
            studentName: requesterName,
            studentAvatar: requesterAvatar,
            studentInitials: this.getInitials(requesterName)
        });

        this.updateInteractionBadge();
        this.showNotification(`${requesterName} is requesting to interact on the whiteboard`, 'info');

        // Update dropdown content if it's open
        const wrapper = document.getElementById('allowInteractionWrapper');
        if (wrapper && wrapper.classList.contains('dropdown-open')) {
            this.updateInteractionDropdownContent();
        }
    }

    /**
     * Show interaction requests modal
     */
    showInteractionRequestsModal() {
        // Remove existing modal if any
        document.querySelector('.interaction-requests-modal-overlay')?.remove();

        const requestsHTML = this.interactionRequests.map(req => {
            const avatarHtml = req.studentAvatar && !req.studentAvatar.includes('user-default') ?
                `<img src="${req.studentAvatar}" alt="${req.studentName}" class="request-avatar"
                     onerror="whiteboardManager.handleAvatarError(this, '${req.studentName.replace(/'/g, "\\'")}')">` :
                `<div class="request-avatar initials-avatar" style="
                    width: 36px; height: 36px; border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary-color, #6366f1), #4f46e5);
                    color: white; display: flex; align-items: center; justify-content: center;
                    font-weight: 600; font-size: 0.75rem;
                ">${req.studentInitials || this.getInitials(req.studentName)}</div>`;

            return `
                <div class="request-item" data-student-id="${req.studentId}">
                    <div class="request-student">
                        ${avatarHtml}
                        <div class="request-info">
                            <span class="request-name">${req.studentName}</span>
                            <span class="request-time">${this.formatTimeAgo(req.requestedAt)}</span>
                        </div>
                    </div>
                    <div class="request-actions">
                        <button class="request-btn approve" onclick="whiteboardManager.approveInteractionRequest('${req.studentId}')" title="Allow">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="request-btn deny" onclick="whiteboardManager.denyInteractionRequest('${req.studentId}')" title="Deny">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        const modalHTML = `
            <div class="interaction-requests-modal-overlay">
                <div class="interaction-requests-modal">
                    <div class="requests-modal-header">
                        <h3><i class="fas fa-hand-pointer"></i> Interaction Requests</h3>
                        <button class="close-requests-modal" onclick="document.querySelector('.interaction-requests-modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="requests-modal-body">
                        ${this.interactionRequests.length > 0 ? requestsHTML : `
                            <div class="no-requests">
                                <i class="fas fa-inbox"></i>
                                <p>No pending requests</p>
                            </div>
                        `}
                    </div>
                    <div class="requests-modal-footer">
                        <button class="btn-secondary" onclick="whiteboardManager.denyAllInteractionRequests()">
                            <i class="fas fa-times"></i> Deny All
                        </button>
                        <button class="btn-primary" onclick="whiteboardManager.approveAllInteractionRequests()">
                            <i class="fas fa-check-double"></i> Allow All
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Close on overlay click
        document.querySelector('.interaction-requests-modal-overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('interaction-requests-modal-overlay')) {
                e.target.remove();
            }
        });
    }

    /**
     * Format time ago
     */
    formatTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    }

    /**
     * Approve a single interaction request
     */
    approveInteractionRequest(requesterId) {
        console.log('🔍 approveInteractionRequest called with:', requesterId, typeof requesterId);
        console.log('🔍 Current requests:', JSON.stringify(this.interactionRequests));

        // Convert to number for comparison (IDs from onclick may come as strings)
        const numericId = typeof requesterId === 'string' ? parseInt(requesterId, 10) : requesterId;
        const request = this.interactionRequests.find(r =>
            r.requesterId == numericId || r.studentId == numericId
        );
        console.log('🔍 Found request:', request);

        if (request) {
            this.interactionRequests = this.interactionRequests.filter(r =>
                r.requesterId != numericId && r.studentId != numericId
            );

            // Determine routing based on requester's profile type
            const requesterType = request.requesterProfileType || 'student';

            // Track this participant as having active permission
            if (!this.activePermissions.find(p => p.id == numericId)) {
                this.activePermissions.push({
                    id: numericId,
                    name: request.requesterName || request.studentName,
                    avatar: request.requesterAvatar || request.studentAvatar,
                    initials: request.requesterInitials || request.studentInitials || this.getInitials(request.requesterName || request.studentName),
                    profileType: requesterType
                });
            }

            this.updateInteractionBadge();
            this.setInteractionState(true, [requesterId]);
            this.showNotification(`${request.requesterName || request.studentName} can now interact on the whiteboard`, 'success');

            // Notify the participant via WebSocket with proper routing
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'whiteboard_permission_granted',
                    session_id: this.currentSession?.id,
                    target_id: requesterId,
                    granted_by: this.myProfileId,
                    permissions: {
                        can_draw: true,
                        can_write: true,
                        can_erase: true
                    },
                    // Routing: from host (me) to requester
                    from_student_profile_id: this.userRole === 'student' ? this.myProfileId : null,
                    from_tutor_profile_id: this.userRole === 'tutor' ? this.myProfileId : null,
                    to_student_profile_id: requesterType === 'student' ? requesterId : null,
                    to_tutor_profile_id: requesterType === 'tutor' ? requesterId : null
                }));

                console.log('✅ Sent permission granted to:', { requesterId, requesterType });
            }
        }

        // Update dropdown content
        this.updateInteractionDropdownContent();

        // Close dropdown if no more requests
        if (this.interactionRequests.length === 0) {
            // Keep dropdown open to show "no requests" message
            // User can close it manually
        }

        // Also close legacy modal if it exists
        document.querySelector('.interaction-requests-modal-overlay')?.remove();
    }

    /**
     * Deny a single interaction request
     */
    denyInteractionRequest(requesterId) {
        // Convert to number for comparison (IDs from onclick may come as strings)
        const numericId = typeof requesterId === 'string' ? parseInt(requesterId, 10) : requesterId;
        const request = this.interactionRequests.find(r =>
            r.requesterId == numericId || r.studentId == numericId
        );
        if (request) {
            this.interactionRequests = this.interactionRequests.filter(r =>
                r.requesterId != numericId && r.studentId != numericId
            );
            this.updateInteractionBadge();
            this.showNotification(`Denied interaction request from ${request.requesterName || request.studentName}`, 'info');

            // Notify the participant via WebSocket with proper routing
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                // Determine routing based on requester's profile type
                const requesterType = request.requesterProfileType || 'student';

                this.ws.send(JSON.stringify({
                    type: 'whiteboard_permission_denied',
                    session_id: this.currentSession?.id,
                    target_id: requesterId,
                    denied_by: this.myProfileId,
                    // Routing: from host (me) to requester
                    from_student_profile_id: this.userRole === 'student' ? this.myProfileId : null,
                    from_tutor_profile_id: this.userRole === 'tutor' ? this.myProfileId : null,
                    to_student_profile_id: requesterType === 'student' ? requesterId : null,
                    to_tutor_profile_id: requesterType === 'tutor' ? requesterId : null
                }));

                console.log('❌ Sent permission denied to:', { requesterId, requesterType });
            }
        }

        // Update dropdown content
        this.updateInteractionDropdownContent();

        // Also close legacy modal if it exists
        document.querySelector('.interaction-requests-modal-overlay')?.remove();
    }

    /**
     * Approve all interaction requests
     */
    approveAllInteractionRequests() {
        const requests = [...this.interactionRequests];
        const count = requests.length;

        if (count === 0) {
            this.showNotification('No pending requests to approve', 'info');
            return;
        }

        // Track all as active permissions and send WebSocket messages
        requests.forEach(request => {
            const requesterId = request.requesterId || request.studentId;
            const numericId = typeof requesterId === 'string' ? parseInt(requesterId, 10) : requesterId;
            const requesterType = request.requesterProfileType || 'student';

            // Add to active permissions
            if (!this.activePermissions.find(p => p.id == numericId)) {
                this.activePermissions.push({
                    id: numericId,
                    name: request.requesterName || request.studentName,
                    avatar: request.requesterAvatar || request.studentAvatar,
                    initials: request.requesterInitials || request.studentInitials || this.getInitials(request.requesterName || request.studentName),
                    profileType: requesterType
                });
            }

            // Send permission granted via WebSocket
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'whiteboard_permission_granted',
                    session_id: this.currentSession?.id,
                    target_id: requesterId,
                    granted_by: this.myProfileId,
                    permissions: {
                        can_draw: true,
                        can_write: true,
                        can_erase: true
                    },
                    from_student_profile_id: this.userRole === 'student' ? this.myProfileId : null,
                    from_tutor_profile_id: this.userRole === 'tutor' ? this.myProfileId : null,
                    to_student_profile_id: requesterType === 'student' ? requesterId : null,
                    to_tutor_profile_id: requesterType === 'tutor' ? requesterId : null
                }));
            }
        });

        const requesterIds = requests.map(r => r.requesterId || r.studentId);
        this.interactionRequests = [];
        this.updateInteractionBadge();
        this.setInteractionState(true, requesterIds);
        this.showNotification(`Allowed ${count} participant(s) to interact on the whiteboard`, 'success');

        // Update dropdown content
        this.updateInteractionDropdownContent();

        // Also close legacy modal if it exists
        document.querySelector('.interaction-requests-modal-overlay')?.remove();
    }

    /**
     * Deny all interaction requests
     */
    denyAllInteractionRequests() {
        const requests = [...this.interactionRequests];
        const count = requests.length;

        if (count === 0) {
            this.showNotification('No pending requests to deny', 'info');
            return;
        }

        // Send permission denied to each requester with proper routing
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            requests.forEach(request => {
                const requesterId = request.requesterId || request.studentId;
                const requesterType = request.requesterProfileType || 'student';

                this.ws.send(JSON.stringify({
                    type: 'whiteboard_permission_denied',
                    session_id: this.currentSession?.id,
                    target_id: requesterId,
                    denied_by: this.myProfileId,
                    from_student_profile_id: this.userRole === 'student' ? this.myProfileId : null,
                    from_tutor_profile_id: this.userRole === 'tutor' ? this.myProfileId : null,
                    to_student_profile_id: requesterType === 'student' ? requesterId : null,
                    to_tutor_profile_id: requesterType === 'tutor' ? requesterId : null
                }));
            });
        }

        this.interactionRequests = [];
        this.updateInteractionBadge();
        this.showNotification(`Denied ${count} interaction request(s)`, 'info');

        // Update dropdown content
        this.updateInteractionDropdownContent();

        // Also close legacy modal if it exists
        document.querySelector('.interaction-requests-modal-overlay')?.remove();
    }

    /**
     * Revoke interaction permission from a specific participant
     * @param {number|string} participantId - The participant's profile ID
     */
    revokeInteractionPermission(participantId) {
        const numericId = typeof participantId === 'string' ? parseInt(participantId, 10) : participantId;
        const participant = this.activePermissions.find(p => p.id == numericId);

        if (participant) {
            // Remove from active permissions
            this.activePermissions = this.activePermissions.filter(p => p.id != numericId);
            this.updateInteractionDropdownContent();
            this.showNotification(`Stopped interaction for ${participant.name}`, 'info');

            // Notify the participant via WebSocket
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                const participantType = participant.profileType || 'student';

                this.ws.send(JSON.stringify({
                    type: 'whiteboard_permission_revoked',
                    session_id: this.currentSession?.id,
                    target_id: participantId,
                    revoked_by: this.myProfileId,
                    // Routing: from host (me) to participant
                    from_student_profile_id: this.userRole === 'student' ? this.myProfileId : null,
                    from_tutor_profile_id: this.userRole === 'tutor' ? this.myProfileId : null,
                    to_student_profile_id: participantType === 'student' ? participantId : null,
                    to_tutor_profile_id: participantType === 'tutor' ? participantId : null
                }));

                console.log('🚫 Sent permission revoked to:', { participantId, participantType });
            }

            // Update button state if no more active permissions
            if (this.activePermissions.length === 0) {
                this.setInteractionState(false);
            }
        }
    }

    /**
     * Revoke all active interaction permissions
     */
    revokeAllPermissions() {
        const participants = [...this.activePermissions];
        const count = participants.length;

        if (count === 0) {
            this.showNotification('No active permissions to revoke', 'info');
            return;
        }

        // Send revoke message to each participant
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            participants.forEach(participant => {
                const participantType = participant.profileType || 'student';

                this.ws.send(JSON.stringify({
                    type: 'whiteboard_permission_revoked',
                    session_id: this.currentSession?.id,
                    target_id: participant.id,
                    revoked_by: this.myProfileId,
                    from_student_profile_id: this.userRole === 'student' ? this.myProfileId : null,
                    from_tutor_profile_id: this.userRole === 'tutor' ? this.myProfileId : null,
                    to_student_profile_id: participantType === 'student' ? participant.id : null,
                    to_tutor_profile_id: participantType === 'tutor' ? participant.id : null
                }));
            });
        }

        this.activePermissions = [];
        this.setInteractionState(false);
        this.updateInteractionDropdownContent();
        this.showNotification(`Stopped interaction for ${count} participant(s)`, 'info');
    }

    /**
     * Simulate receiving interaction requests (for testing)
     * In production, this would be triggered by WebSocket messages
     */
    simulateInteractionRequest() {
        const mockStudents = [
            { id: 'student_1', name: 'Abebe Kebede', avatar: null },
            { id: 'student_2', name: 'Sara Tesfaye', avatar: null },
            { id: 'student_3', name: 'Dawit Haile', avatar: null }
        ];

        const randomStudent = mockStudents[Math.floor(Math.random() * mockStudents.length)];
        this.addInteractionRequest(randomStudent.id, randomStudent.name, randomStudent.avatar);
    }

    /**
     * Check if current user can manage pages (add/navigate)
     * Host can always manage pages
     * Participants need explicit draw permission OR special page permission
     */
    canUserManagePages() {
        // 1. Tutors can ALWAYS manage pages (regardless of video call status)
        if (this.userRole === 'tutor') {
            return true;
        }

        // 2. If user is host of current video call
        if (this.isSessionHost) {
            return true;
        }

        // 3. Students in a call need explicit draw permission
        if (this.currentVideoCall && !this.isSessionHost) {
            return this.permissions.can_draw === true;
        }

        // 4. Solo whiteboard usage (no call) - allow page navigation for everyone
        if (!this.currentVideoCall) {
            return true;
        }

        // 5. Default: no permission
        return false;
    }

    /**
     * Page navigation - Navigate to previous page with flip animation
     * Broadcasts to other party for sync
     * Permission check: Only host or users with draw permission can navigate
     */
    previousPage() {
        // C. Permission check: Only host or users with draw permission can navigate
        if (!this.canUserManagePages()) {
            console.log('⛔ Page navigation blocked: No permission');
            this.showNotification('You need draw permission to navigate pages', 'info');
            return;
        }

        const currentIndex = this.pages.indexOf(this.currentPage);
        if (currentIndex > 0) {
            this.flipToPage(currentIndex - 1, 'prev');
            // Broadcast navigation to other party
            this.broadcastPageChange('navigate', this.pages[currentIndex - 1]);
            console.log(`📄 Navigated to previous page ${currentIndex}`);
        }
    }

    /**
     * Navigate to next page with flip animation
     * Broadcasts to other party for sync
     * Permission check: Only host or users with draw permission can navigate
     */
    nextPage() {
        // C. Permission check: Only host or users with draw permission can navigate
        if (!this.canUserManagePages()) {
            console.log('⛔ Page navigation blocked: No permission');
            this.showNotification('You need draw permission to navigate pages', 'info');
            return;
        }

        const currentIndex = this.pages.indexOf(this.currentPage);
        if (currentIndex < this.pages.length - 1) {
            this.flipToPage(currentIndex + 1, 'next');
            // Broadcast navigation to other party
            this.broadcastPageChange('navigate', this.pages[currentIndex + 1]);
            console.log(`📄 Navigated to next page ${currentIndex + 2}`);
        }
    }

    /**
     * Flip to a specific page with animation
     * @param {number} pageIndex - Target page index
     * @param {string} direction - 'next' or 'prev'
     */
    flipToPage(pageIndex, direction) {
        if (this.isFlipping) return;
        this.isFlipping = true;

        const flipper = document.getElementById('canvasPageFlipper');
        const nextCanvas = document.getElementById('whiteboardCanvasNext');
        const nextCtx = nextCanvas?.getContext('2d', { willReadFrequently: true });

        // Pre-render the target page on the hidden canvas
        if (nextCanvas && nextCtx) {
            nextCtx.fillStyle = '#FFFFFF';
            nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

            // Draw target page strokes
            const targetPage = this.pages[pageIndex];
            if (targetPage && targetPage.strokes) {
                targetPage.strokes.forEach(stroke => {
                    this.drawStrokeOnContext(stroke, nextCtx);
                });
            }
        }

        // Add flip animation class
        flipper?.classList.add(direction === 'next' ? 'flipping-next' : 'flipping-prev');

        // After animation completes, update the actual page
        setTimeout(() => {
            flipper?.classList.remove('flipping-next', 'flipping-prev');
            this.loadPage(pageIndex);
            this.isFlipping = false;
        }, 600); // Match CSS animation duration
    }

    /**
     * Draw a stroke on a specific context (for pre-rendering)
     */
    drawStrokeOnContext(stroke, ctx) {
        const data = stroke.stroke_data;
        ctx.strokeStyle = data.color || '#000000';
        ctx.lineWidth = data.width || 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (stroke.stroke_type) {
            case 'pen':
            case 'eraser':
                if (data.points && data.points.length > 0) {
                    ctx.beginPath();
                    ctx.moveTo(data.points[0][0], data.points[0][1]);
                    for (let i = 1; i < data.points.length; i++) {
                        ctx.lineTo(data.points[i][0], data.points[i][1]);
                    }
                    ctx.stroke();
                }
                break;
            case 'text':
                ctx.font = `${data.fontSize || 18}px ${data.fontFamily || 'Arial'}`;
                ctx.fillStyle = data.color || '#000000';
                ctx.fillText(data.text, data.x, data.y);
                break;
            case 'line':
                ctx.beginPath();
                ctx.moveTo(data.startX, data.startY);
                ctx.lineTo(data.endX, data.endY);
                ctx.stroke();
                break;
            case 'rectangle':
                ctx.strokeRect(data.x, data.y, data.width, data.height);
                break;
            case 'circle':
                ctx.beginPath();
                ctx.arc(data.x, data.y, data.radius, 0, 2 * Math.PI);
                ctx.stroke();
                break;
        }
    }

    /**
     * Add a new page to the session
     * Permission check: Only host or users with draw permission can add pages
     */
    async addNewPage() {
        // C. Permission check: Only host or users with draw permission can add pages
        if (!this.canUserManagePages()) {
            console.log('⛔ Add page blocked: No permission');
            this.showNotification('You need draw permission to add pages', 'info');
            return;
        }

        if (!this.currentSession) {
            // For blank canvas without session, add page locally
            const newPage = {
                id: `temp_${Date.now()}`,
                page_number: this.pages.length + 1,
                background_color: '#FFFFFF',
                strokes: []
            };
            this.pages.push(newPage);
            this.flipToPage(this.pages.length - 1, 'next');
            this.showNotification(`Page ${this.pages.length} added`, 'success');

            // Broadcast to participants even without session
            this.broadcastPageChange('add', newPage);
            return;
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const pageNumber = this.pages.length + 1;
            const pageTitle = `Page ${pageNumber}`;

            // Use correct endpoint: /pages/create with query params
            const response = await fetch(`${this.API_BASE}/pages/create?session_id=${this.currentSession.id}&page_title=${encodeURIComponent(pageTitle)}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success && data.page_id) {
                const newPage = {
                    id: data.page_id,
                    page_number: data.page_number || pageNumber,
                    page_title: pageTitle,
                    background_color: '#FFFFFF',
                    strokes: []
                };
                this.pages.push(newPage);
                this.flipToPage(this.pages.length - 1, 'next');
                this.showNotification(`Page ${this.pages.length} added`, 'success');

                // Broadcast to participants
                this.broadcastPageChange('add', newPage);
            } else {
                console.error('Failed to add page:', data);
                this.showNotification('Failed to add page', 'error');
            }
        } catch (error) {
            console.error('Error adding new page:', error);
            // Fallback: add locally
            const newPage = {
                id: `temp_${Date.now()}`,
                page_number: this.pages.length + 1,
                background_color: '#FFFFFF',
                strokes: []
            };
            this.pages.push(newPage);
            this.flipToPage(this.pages.length - 1, 'next');
            this.showNotification(`Page ${this.pages.length} added (offline)`, 'info');

            // Still broadcast to participants
            this.broadcastPageChange('add', newPage);
        }
    }

    /**
     * Update page info display
     */
    updatePageInfo() {
        const currentIndex = this.pages.indexOf(this.currentPage);
        document.getElementById('pageInfo').textContent =
            `Page ${currentIndex + 1} of ${this.pages.length}`;

        // Update button states - disable for participants like toolbar buttons
        const canManagePages = this.canUserManagePages();
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');

        if (prevPageBtn) {
            if (!canManagePages) {
                // No permission - disable and gray out (like toolbar)
                prevPageBtn.disabled = true;
                prevPageBtn.style.opacity = '0.4';
                prevPageBtn.style.cursor = 'not-allowed';
                prevPageBtn.style.pointerEvents = 'none';
            } else {
                // Has permission - check position
                prevPageBtn.disabled = currentIndex === 0;
                prevPageBtn.style.opacity = currentIndex === 0 ? '0.6' : '1';
                prevPageBtn.style.cursor = currentIndex === 0 ? 'not-allowed' : 'pointer';
                prevPageBtn.style.pointerEvents = currentIndex === 0 ? 'none' : 'auto';
            }
        }

        if (nextPageBtn) {
            if (!canManagePages) {
                // No permission - disable and gray out (like toolbar)
                nextPageBtn.disabled = true;
                nextPageBtn.style.opacity = '0.4';
                nextPageBtn.style.cursor = 'not-allowed';
                nextPageBtn.style.pointerEvents = 'none';
            } else {
                // Has permission - check position
                nextPageBtn.disabled = currentIndex === this.pages.length - 1;
                nextPageBtn.style.opacity = currentIndex === this.pages.length - 1 ? '0.6' : '1';
                nextPageBtn.style.cursor = currentIndex === this.pages.length - 1 ? 'not-allowed' : 'pointer';
                nextPageBtn.style.pointerEvents = currentIndex === this.pages.length - 1 ? 'none' : 'auto';
            }
        }
    }

    /**
     * Load chat messages
     */
    async loadChatMessages() {
        if (!this.currentSession) return;

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const response = await fetch(
                `${this.API_BASE}/chat/${this.currentSession.id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (data.success) {
                this.renderChatMessages(data.messages);
            }
        } catch (error) {
            console.error('Error loading chat messages:', error);
        }
    }

    /**
     * Render chat messages
     */
    renderChatMessages(messages) {
        const container = document.getElementById('whiteboardChatMessages');
        const user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');

        container.innerHTML = messages.map(msg => {
            const isSent = msg.sender_id === user.id;
            const initials = this.getInitials(msg.sender_name);
            const avatarHtml = msg.sender_avatar && !msg.sender_avatar.includes('user-default') ?
                `<img src="${msg.sender_avatar}"
                     alt="${msg.sender_name}"
                     class="message-avatar"
                     onerror="whiteboardManager.handleAvatarError(this, '${msg.sender_name.replace(/'/g, "\\'")}')">` :
                `<div class="message-avatar initials-avatar" style="
                    width: 32px; height: 32px; border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary-color, #6366f1), #4f46e5);
                    color: white; display: flex; align-items: center; justify-content: center;
                    font-weight: 600; font-size: 0.7rem; flex-shrink: 0;
                ">${initials}</div>`;

            return `
                <div class="chat-message ${isSent ? 'sent' : ''}">
                    ${avatarHtml}
                    <div class="message-content">
                        <div class="message-sender">${msg.sender_name}</div>
                        <div class="message-bubble">${msg.message_text}</div>
                        <div class="message-time">${new Date(msg.created_at).toLocaleTimeString()}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Send chat message
     */
    async sendChatMessage() {
        const input = document.getElementById('whiteboardChatInput');
        const message = input.value.trim();

        if (!message || !this.currentSession) return;

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const response = await fetch(`${this.API_BASE}/chat/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: this.currentSession.id,
                    message_text: message
                })
            });

            const data = await response.json();

            if (data.success) {
                input.value = '';
                await this.loadChatMessages();
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    /**
     * Start session timer
     */
    startSessionTimer() {
        this.sessionStartTime = new Date();

        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((new Date() - this.sessionStartTime) / 1000);
            const hours = Math.floor(elapsed / 3600);
            const minutes = Math.floor((elapsed % 3600) / 60);
            const seconds = elapsed % 60;

            document.getElementById('sessionTimer').textContent =
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            // Check for timed events
            this.checkTimedEvents(minutes, seconds);
        }, 1000);

        // Reset popup tracking for new session
        this.shownPopups.clear();
    }

    /**
     * Check and trigger timed events (ad panel at 28 min, pop-ups at specific times)
     */
    checkTimedEvents(minutes, seconds) {
        // Show ad panel at 28 minutes (stays for 5 minutes)
        if (minutes === 28 && seconds === 0 && !this.adPanelTimer) {
            this.showAdPanel();
        }

        // Check for scheduled pop-ups
        this.popupSchedule.forEach(popup => {
            if (minutes === popup.minute && seconds === 0 && !this.shownPopups.has(popup.minute)) {
                this.showTimedPopup(popup);
                this.shownPopups.add(popup.minute);
            }
        });
    }

    /**
     * Show the ad panel (slides in from right)
     */
    showAdPanel() {
        const adPanel = document.getElementById('whiteboardAdPanel');
        if (!adPanel) return;

        adPanel.classList.add('active');

        // Start 5 minute countdown
        let timeLeft = 5 * 60; // 5 minutes in seconds
        const timerSpan = document.getElementById('adPanelTimer');

        this.adPanelCountdown = setInterval(() => {
            timeLeft--;
            const mins = Math.floor(timeLeft / 60);
            const secs = timeLeft % 60;
            if (timerSpan) {
                timerSpan.textContent = `Closes in ${mins}:${String(secs).padStart(2, '0')}`;
            }

            if (timeLeft <= 0) {
                this.hideAdPanel();
            }
        }, 1000);

        // Also allow manual close
        const closeBtn = document.getElementById('closeAdPanelBtn');
        if (closeBtn) {
            closeBtn.onclick = () => this.hideAdPanel();
        }
    }

    /**
     * Hide the ad panel
     */
    hideAdPanel() {
        const adPanel = document.getElementById('whiteboardAdPanel');
        if (adPanel) {
            adPanel.classList.remove('active');
        }

        if (this.adPanelCountdown) {
            clearInterval(this.adPanelCountdown);
            this.adPanelCountdown = null;
        }
    }

    /**
     * Show a timed pop-up notification
     */
    showTimedPopup(popupConfig) {
        const container = document.getElementById('whiteboardPopupContainer');
        if (!container) return;

        const popupId = `popup_${popupConfig.minute}`;
        const popupEl = document.createElement('div');
        popupEl.className = 'whiteboard-popup';
        popupEl.id = popupId;
        popupEl.innerHTML = `
            <div class="popup-header">
                <div class="popup-header-content">
                    <i class="fas ${popupConfig.icon}"></i>
                    <span class="popup-title">${popupConfig.title}</span>
                </div>
                <button class="popup-close-btn" onclick="whiteboardManager.closePopup('${popupId}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="popup-content">
                <p>${popupConfig.message}</p>
                ${popupConfig.cta ? `<button class="popup-cta" onclick="whiteboardManager.handlePopupCta('${popupConfig.cta}')">${popupConfig.cta} <i class="fas fa-arrow-right"></i></button>` : ''}
            </div>
            <div class="popup-timer-bar">
                <div class="popup-timer-progress"></div>
            </div>
        `;

        container.appendChild(popupEl);

        // Auto-dismiss after 12 seconds
        setTimeout(() => {
            this.closePopup(popupId);
        }, 12000);
    }

    /**
     * Close a popup by ID
     */
    closePopup(popupId) {
        const popup = document.getElementById(popupId);
        if (popup) {
            popup.classList.add('exiting');
            setTimeout(() => {
                popup.remove();
            }, 300); // Match exit animation duration
        }
    }

    /**
     * Handle popup CTA button clicks
     */
    handlePopupCta(action) {
        console.log('Pop-up CTA clicked:', action);
        // Handle different CTAs
        switch (action) {
            case 'Learn More':
                // Could open a help modal or external link
                this.showNotification('Opening learning tips...', 'info');
                break;
            case 'Upgrade Now':
                // Could open subscription modal
                this.showNotification('Opening upgrade options...', 'info');
                break;
            case 'Invite Parents':
                // Could open parent invitation modal
                this.showNotification('Opening parent invitation...', 'info');
                break;
            case 'Schedule Next':
                // Could open scheduling modal
                this.showNotification('Opening scheduler...', 'info');
                break;
            default:
                this.showNotification(action, 'info');
        }
    }

    // ============================================================================
    // REAL-TIME SYNC METHODS
    // ============================================================================

    /**
     * ✨ NEW METHOD: Check if user can broadcast tool changes
     * @returns {boolean} True if user can broadcast (host or allowed participant)
     */
    canBroadcastToolChange() {
        // Host can ALWAYS broadcast tool changes (regardless of role - tutor or student)
        if (this.isSessionHost) {
            console.log('✅ Can broadcast tool change: User is host');
            return true;
        }

        // Participants can broadcast ONLY if they have interaction permission
        // This ensures only active, engaged participants sync their tools
        if (this.interactionAllowed) {
            console.log('✅ Can broadcast tool change: Participant has permission');
            return true;
        }

        // No permission = no broadcasting
        console.log('❌ Cannot broadcast tool change: Participant lacks permission');
        return false;
    }

    /**
     * ✨ NEW METHOD: Broadcast tool change to all participants
     * Now works for BOTH host and allowed participants
     * @param {string} tool - The tool that was selected (pen, text, eraser, line, etc.)
     */
    broadcastToolChange(tool) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.log('⚠️ Cannot broadcast tool change: WebSocket not connected');
            return;
        }

        // Get sender info (works for both host and participants)
        let senderName;
        if (this.userRole === 'tutor') {
            senderName = this.tutorInfo?.full_name || 'Tutor';
        } else {
            senderName = this.studentInfo?.full_name || 'Student';
        }

        // Get other party info using role-agnostic method
        const otherParty = this.getOtherParty();
        if (!otherParty) {
            console.warn('⚠️ Cannot broadcast tool change: No other party set');
            return;
        }

        const message = {
            type: 'whiteboard_tool_change',
            session_id: this.currentSession?.id,
            tool: tool,
            sender_id: this.myProfileId,
            sender_role: this.userRole,
            sender_name: senderName,
            timestamp: Date.now(),
            // ✨ ROLE-AGNOSTIC: Use generic profile routing
            from_profile_id: this.myProfileId,
            from_profile_type: this.userRole,
            to_profile_id: otherParty.id,
            to_profile_type: otherParty.type,
            // Legacy fields for backward compatibility
            from_student_profile_id: this.userRole === 'student' ? this.myProfileId : null,
            from_tutor_profile_id: this.userRole === 'tutor' ? this.myProfileId : null,
            to_student_profile_id: otherParty.type === 'student' ? otherParty.id : null,
            to_tutor_profile_id: otherParty.type === 'tutor' ? otherParty.id : null
        };

        try {
            this.ws.send(JSON.stringify(message));
            console.log(`📤 Broadcasting tool change: ${tool} (from ${this.userRole}_${this.myProfileId} to ${otherParty.type}_${otherParty.id})`);
        } catch (error) {
            console.error('❌ Failed to broadcast tool change:', error);
        }
    }

    /**
     * ✨ NEW METHOD: Select tool without broadcasting (to avoid infinite loops)
     * This is used when receiving remote tool changes
     * Temporarily disables broadcasting to prevent echo
     * @param {string} tool - The tool to select
     */
    selectToolSilently(tool) {
        // Store original permission state
        const originalInteractionAllowed = this.interactionAllowed;
        const originalRole = this.userRole;

        // Temporarily disable broadcasting by:
        // 1. Pretending to be a non-tutor
        // 2. Pretending to have no permission
        this.interactionAllowed = false;
        this.userRole = 'silent_participant';

        // Call normal selectTool (which won't broadcast due to canBroadcastToolChange() returning false)
        this.selectTool(tool);

        // Restore original state
        this.interactionAllowed = originalInteractionAllowed;
        this.userRole = originalRole;

        console.log(`🔕 Tool selected silently: ${tool}`);
    }

    /**
     * Broadcast a stroke to all connected participants
     */
    broadcastStroke(stroke) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.log('⚠️ Cannot broadcast stroke: WebSocket not connected');
            return;
        }

        // Get other party info using role-agnostic method
        const otherParty = this.getOtherParty();
        if (!otherParty) {
            console.warn('⚠️ Cannot broadcast stroke: No other party set');
            return;
        }

        // Get sender name for remote display
        const senderName = this.userRole === 'tutor'
            ? this.tutorInfo?.full_name || 'Tutor'
            : this.studentInfo?.full_name || 'Student';

        // Prepare message with routing information
        const message = {
            type: 'whiteboard_stroke',
            session_id: this.currentSession?.id,
            page_id: this.currentPage?.id,
            stroke: stroke,
            sender_id: this.myProfileId,
            sender_role: this.userRole,
            sender_name: senderName,
            // ✨ ROLE-AGNOSTIC: Use generic profile routing
            from_profile_id: this.myProfileId,
            from_profile_type: this.userRole,
            to_profile_id: otherParty.id,
            to_profile_type: otherParty.type,
            // Legacy fields for backward compatibility
            from_student_profile_id: this.userRole === 'student' ? this.myProfileId : null,
            from_tutor_profile_id: this.userRole === 'tutor' ? this.myProfileId : null,
            to_student_profile_id: otherParty.type === 'student' ? otherParty.id : null,
            to_tutor_profile_id: otherParty.type === 'tutor' ? otherParty.id : null
        };

        // DEBUG: Log stroke broadcast details
        console.log(`📤 Broadcasting ${stroke.stroke_type} stroke:`, {
            stroke_type: stroke.stroke_type,
            from: `${this.userRole}_${this.myProfileId}`,
            to: `${otherParty.type}_${otherParty.id}`,
            session_id: this.currentSession?.id,
            page_id: this.currentPage?.id,
            has_text: stroke.stroke_data?.text ? `"${stroke.stroke_data.text}"` : 'N/A'
        });

        this.ws.send(JSON.stringify(message));

        // Update sync indicator
        this.updateSyncIndicator('syncing');
        setTimeout(() => this.updateSyncIndicator('synced'), 500);
    }

    /**
     * Broadcast page change to all connected participants
     */
    broadcastPageChange(action, page) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        // Get other party info using role-agnostic method
        const otherParty = this.getOtherParty();
        if (!otherParty) return;

        // Get sender name from profile data
        const senderName = this.myProfileData?.first_name
            ? `${this.myProfileData.first_name} ${this.myProfileData.last_name || ''}`.trim()
            : 'Host';

        const message = {
            type: 'whiteboard_page_change',
            session_id: this.currentSession?.id,
            action: action, // 'add', 'navigate', 'delete'
            page: page,
            sender_id: this.myProfileId,
            sender_name: senderName,
            sender_role: this.userRole,
            // ✨ ROLE-AGNOSTIC: Use generic profile routing
            from_profile_id: this.myProfileId,
            from_profile_type: this.userRole,
            to_profile_id: otherParty.id,
            to_profile_type: otherParty.type,
            // Legacy fields for backward compatibility
            from_student_profile_id: this.userRole === 'student' ? this.myProfileId : null,
            from_tutor_profile_id: this.userRole === 'tutor' ? this.myProfileId : null,
            to_student_profile_id: otherParty.type === 'student' ? otherParty.id : null,
            to_tutor_profile_id: otherParty.type === 'tutor' ? otherParty.id : null
        };

        console.log(`📤 Broadcasting page ${action}:`, {
            action,
            pageId: page.id,
            from: `${this.userRole}_${this.myProfileId}`,
            to: `${otherParty.type}_${otherParty.id}`
        });

        this.ws.send(JSON.stringify(message));
    }

    /**
     * Broadcast cursor position for real-time collaboration
     */
    broadcastCursorPosition(x, y) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        if (!this.interactionAllowed && this.userRole !== 'tutor') return;

        // Get other party info using role-agnostic method
        const otherParty = this.getOtherParty();
        if (!otherParty) return;

        const message = {
            type: 'whiteboard_cursor',
            session_id: this.currentSession?.id,
            x: x,
            y: y,
            sender_id: this.myProfileId,
            sender_name: this.userRole === 'tutor' ? this.tutorInfo?.full_name : this.studentInfo?.full_name,
            sender_role: this.userRole,
            // ✨ ROLE-AGNOSTIC: Use generic profile routing
            from_profile_id: this.myProfileId,
            from_profile_type: this.userRole,
            to_profile_id: otherParty.id,
            to_profile_type: otherParty.type,
            // Legacy fields for backward compatibility
            from_student_profile_id: this.userRole === 'student' ? this.myProfileId : null,
            from_tutor_profile_id: this.userRole === 'tutor' ? this.myProfileId : null,
            to_student_profile_id: otherParty.type === 'student' ? otherParty.id : null,
            to_tutor_profile_id: otherParty.type === 'tutor' ? otherParty.id : null
        };

        this.ws.send(JSON.stringify(message));
    }

    /**
     * Broadcast real-time text typing to other participants (throttled)
     */
    broadcastTextTyping(text, x, y) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        // Throttle to max 10 messages per second to avoid flooding
        const now = Date.now();
        if (this.lastTextTypingBroadcast && now - this.lastTextTypingBroadcast < 100) {
            // Clear existing timeout and schedule new one
            if (this.textTypingBroadcastTimeout) {
                clearTimeout(this.textTypingBroadcastTimeout);
            }

            this.textTypingBroadcastTimeout = setTimeout(() => {
                this.sendTextTypingMessage(text, x, y);
            }, 100);
            return;
        }

        this.sendTextTypingMessage(text, x, y);
    }

    /**
     * Send text typing message via WebSocket
     */
    sendTextTypingMessage(text, x, y) {
        // Get other party info using role-agnostic method
        const otherParty = this.getOtherParty();
        if (!otherParty) {
            console.warn('⚠️ Cannot send text typing: No other party set');
            return;
        }

        // Get sender name for remote display
        const senderName = this.userRole === 'tutor'
            ? this.tutorInfo?.full_name || 'Tutor'
            : this.studentInfo?.full_name || 'Student';

        // DEBUG: Log routing info
        console.log(`📤 Sending text typing:`, {
            text: text?.substring(0, 20),
            from: `${this.userRole}_${this.myProfileId}`,
            to: `${otherParty.type}_${otherParty.id}`,
            wsOpen: this.ws?.readyState === WebSocket.OPEN
        });

        const message = {
            type: 'whiteboard_text_typing',
            session_id: this.currentSession?.id,
            page_id: this.currentPage?.id,
            text: text,
            x: x,
            y: y,
            color: this.strokeColor,
            fontSize: this.strokeWidth * 6,
            sender_id: this.myProfileId,
            sender_role: this.userRole,
            sender_name: senderName,
            // ✨ ROLE-AGNOSTIC: Use generic profile routing
            from_profile_id: this.myProfileId,
            from_profile_type: this.userRole,
            to_profile_id: otherParty.id,
            to_profile_type: otherParty.type,
            // Legacy fields for backward compatibility
            from_student_profile_id: this.userRole === 'student' ? this.myProfileId : null,
            from_tutor_profile_id: this.userRole === 'tutor' ? this.myProfileId : null,
            to_student_profile_id: otherParty.type === 'student' ? otherParty.id : null,
            to_tutor_profile_id: otherParty.type === 'tutor' ? otherParty.id : null
        };

        this.ws.send(JSON.stringify(message));
        this.lastTextTypingBroadcast = Date.now();
    }

    /**
     * Handle incoming whiteboard stroke from WebSocket
     */
    handleRemoteStroke(data) {
        if (data.sender_id === this.myProfileId) return; // Ignore own strokes

        // DEBUG: Log received stroke
        console.log(`📥 Received ${data.stroke?.stroke_type} stroke from ${data.sender_name}:`, {
            stroke_type: data.stroke?.stroke_type,
            from: `${data.sender_role}_${data.sender_id}`,
            has_text: data.stroke?.stroke_data?.text ? `"${data.stroke.stroke_data.text}"` : 'N/A',
            session_id: data.session_id,
            page_id: data.page_id
        });

        // ✨ CRITICAL FIX: Add stroke to local page strokes array so it persists through redraws
        if (this.currentPage && data.stroke) {
            if (!this.currentPage.strokes) {
                this.currentPage.strokes = [];
            }
            this.currentPage.strokes.push(data.stroke);
            console.log(`💾 Added remote stroke to local page (total strokes: ${this.currentPage.strokes.length})`);
        }

        // Draw the stroke on canvas
        this.drawStroke(data.stroke);

        // Show drawing indicator
        this.showDrawingIndicator(data.sender_name || 'Participant');
    }

    /**
     * Handle remote cursor position update
     */
    handleRemoteCursor(data) {
        if (data.sender_id === this.myProfileId) return;

        // Update or create remote cursor element
        let cursorEl = document.getElementById(`cursor_${data.sender_id}`);
        if (!cursorEl) {
            cursorEl = document.createElement('div');
            cursorEl.id = `cursor_${data.sender_id}`;
            cursorEl.className = 'remote-cursor';
            cursorEl.innerHTML = `
                <div class="remote-cursor-pointer" style="--cursor-color: ${this.getRandomColor(data.sender_id)}"></div>
                <div class="remote-cursor-label" style="background: ${this.getRandomColor(data.sender_id)}">${data.sender_name || 'User'}</div>
            `;
            document.getElementById('canvasContainer')?.appendChild(cursorEl);
        }

        cursorEl.style.left = `${data.x}px`;
        cursorEl.style.top = `${data.y}px`;

        // Hide cursor after 3 seconds of inactivity
        clearTimeout(this.remoteCursors.get(data.sender_id)?.timeout);
        this.remoteCursors.set(data.sender_id, {
            ...data,
            timeout: setTimeout(() => {
                cursorEl?.remove();
                this.remoteCursors.delete(data.sender_id);
            }, 3000)
        });
    }

    /**
     * Handle remote text typing in real-time
     */
    handleRemoteTextTyping(data) {
        // DEBUG: Log received text typing data
        console.log('📥 handleRemoteTextTyping called:', {
            sender_id: data.sender_id,
            sender_name: data.sender_name,
            myProfileId: this.myProfileId,
            text: data.text?.substring(0, 30),
            x: data.x,
            y: data.y,
            color: data.color,
            fontSize: data.fontSize
        });

        if (data.sender_id === this.myProfileId) {
            console.log('⏭️ Ignoring own typing (sender_id matches myProfileId)');
            return; // Ignore own typing
        }

        // Store the remote typing data for this sender
        if (!this.remoteTypingData) {
            this.remoteTypingData = new Map();
        }

        // Clear existing timeout for this sender
        if (this.remoteTypingTimeouts && this.remoteTypingTimeouts.has(data.sender_id)) {
            clearTimeout(this.remoteTypingTimeouts.get(data.sender_id));
        }

        if (!this.remoteTypingTimeouts) {
            this.remoteTypingTimeouts = new Map();
        }

        // Update the typing data for this sender
        this.remoteTypingData.set(data.sender_id, {
            text: data.text,
            x: data.x,
            y: data.y,
            color: data.color,
            fontSize: data.fontSize,
            senderName: data.sender_name
        });

        // Redraw the page with the remote typing preview
        this.redrawPageWithRemoteTyping();

        // Clear the remote typing data after 2 seconds of inactivity
        const timeout = setTimeout(() => {
            this.remoteTypingData.delete(data.sender_id);
            this.remoteTypingTimeouts.delete(data.sender_id);
            this.redrawPageWithRemoteTyping(); // Redraw to clear the preview
        }, 2000);

        this.remoteTypingTimeouts.set(data.sender_id, timeout);
    }

    /**
     * Redraw page with remote typing overlays
     */
    redrawPageWithRemoteTyping() {
        const dataSize = this.remoteTypingData?.size || 0;
        // DEBUG: Log redraw call with explicit size
        console.log(`🔄 redrawPageWithRemoteTyping called - data size: ${dataSize}, ctx: ${!!this.ctx}, canvas: ${!!this.canvas}`);

        // Redraw the base page
        this.redrawPage();
        console.log('📄 Base page redrawn, now drawing overlays...');

        // Draw all remote typing previews on top
        if (this.remoteTypingData && this.remoteTypingData.size > 0) {
            console.log('✏️ Drawing remote typing previews:', this.remoteTypingData.size);
            this.remoteTypingData.forEach((typingData, senderId) => {
                console.log('  📝 Drawing text from sender', senderId, ':', {
                    text: typingData.text?.substring(0, 20),
                    x: typingData.x,
                    y: typingData.y,
                    color: typingData.color,
                    fontSize: typingData.fontSize
                });
                if (typingData.text) {
                    console.log('🖌️ ACTUALLY DRAWING TEXT on canvas:', {
                        text: typingData.text.substring(0, 30),
                        x: typingData.x,
                        y: typingData.y,
                        canvasWidth: this.canvas?.width,
                        canvasHeight: this.canvas?.height,
                        ctxValid: !!this.ctx,
                        canvasId: this.canvas?.id,
                        canvasVisible: this.canvas?.offsetParent !== null
                    });

                    // DEBUG: Verify this.canvas is the visible one
                    const visibleCanvas = document.getElementById('whiteboardCanvas');
                    const isSameCanvas = this.canvas === visibleCanvas;
                    console.log(`🔍 Canvas check: thisCanvas=${this.canvas?.id}, visibleCanvas=${visibleCanvas?.id}, SAME=${isSameCanvas}`);

                    // CRITICAL FIX: If canvases don't match, use the visible one!
                    let targetCtx = this.ctx;
                    if (!isSameCanvas && visibleCanvas) {
                        console.log('⚠️ CANVAS MISMATCH! Switching to visible canvas');
                        targetCtx = visibleCanvas.getContext('2d', { willReadFrequently: true });
                    }

                    // DEBUG: Draw a bright red box to confirm ctx is working
                    targetCtx.save();
                    targetCtx.fillStyle = 'red';
                    targetCtx.fillRect(typingData.x - 5, 100, 300, 50); // Bright red box
                    targetCtx.restore();
                    console.log('🔴 DEBUG: Red box drawn at x:', typingData.x, 'y: 100');

                    // Draw typing indicator label above the text
                    targetCtx.save();
                    targetCtx.font = 'bold 16px Arial'; // Larger font for visibility
                    targetCtx.fillStyle = '#ff0000'; // Red for visibility
                    const labelY = 130; // Fixed Y for visibility
                    targetCtx.fillText(`${typingData.senderName} is typing...`, typingData.x, labelY);
                    targetCtx.restore();

                    // Draw the actual text being typed
                    targetCtx.save();
                    targetCtx.font = `bold ${typingData.fontSize + 10}px Arial`; // Larger font
                    targetCtx.fillStyle = '#0000ff'; // Blue for visibility
                    const textY = 160; // Fixed Y for visibility
                    targetCtx.fillText(typingData.text, typingData.x, textY);
                    targetCtx.restore();

                    console.log('✅ Text drawn at:', { x: typingData.x, y: textY, labelY: labelY });
                }
            });
        }
    }

    /**
     * Get a consistent color for a user ID
     */
    getRandomColor(id) {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
        const hash = String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    }

    /**
     * Update sync indicator status
     */
    updateSyncIndicator(status) {
        const indicator = document.getElementById('canvasSyncIndicator');
        if (!indicator) return;

        indicator.classList.remove('syncing', 'error');

        switch (status) {
            case 'syncing':
                indicator.classList.add('syncing');
                indicator.querySelector('.sync-text').textContent = 'Syncing...';
                break;
            case 'synced':
                indicator.querySelector('.sync-text').textContent = 'Synced';
                break;
            case 'error':
                indicator.classList.add('error');
                indicator.querySelector('.sync-text').textContent = 'Offline';
                break;
        }
    }

    /**
     * Handle incoming permission request from a participant
     * Only processed by the session host
     */
    handlePermissionRequest(data) {
        // Only host should process permission requests
        if (!this.isSessionHost) {
            console.log('Ignoring permission request - not the host');
            return;
        }

        // Add to interaction requests list with profile type for routing
        this.addInteractionRequest(
            data.requester_id,
            data.requester_name,
            data.requester_avatar || null,
            data.requester_profile_type || 'student' // 'student' or 'tutor'
        );
    }

    /**
     * Handle permission granted notification (for participants)
     * IMPORTANT: Does NOT clear the canvas - preserves existing content
     */
    handlePermissionGranted(data) {
        // Update local permissions
        this.permissions = {
            can_draw: true,
            can_write: true,
            can_erase: true
        };

        // Reset pending state
        this.permissionRequestPending = false;

        // Update permission indicator and request button
        this.updatePermissionIndicator();

        // Enable toolbar tools
        this.updateToolbarPermissions();

        // NOTE: We intentionally do NOT clear or redraw the canvas here
        // The canvas should keep all existing content when permission is granted
        console.log('✅ Permission granted - canvas content preserved');

        this.showNotification('You can now draw on the whiteboard!', 'success');
    }

    /**
     * Handle permission denied notification (for participants)
     */
    handlePermissionDenied(data) {
        // Reset pending state
        this.permissionRequestPending = false;

        // Update request button state
        this.updateRequestInteractionButton();

        this.showNotification('Permission request was denied', 'info');
    }

    /**
     * Handle permission revoked notification (for participants)
     */
    handlePermissionRevoked(data) {
        // Remove local permissions
        this.permissions = {
            can_draw: false,
            can_write: false,
            can_erase: false
        };

        // Reset pending state
        this.permissionRequestPending = false;

        // Update permission indicator and request button
        this.updatePermissionIndicator();

        // Disable toolbar tools
        this.updateToolbarPermissions();
        this.updateRequestInteractionButton();

        this.showNotification('Your drawing permission has been revoked by the host', 'warning');
    }

    /**
     * Handle remote page change (navigation or new page)
     * C. When host adds/navigates pages, participant should follow along
     */
    handleRemotePageChange(data) {
        if (data.sender_id === this.myProfileId) return;

        switch (data.action) {
            case 'add':
                // Remote added a new page - add to array and navigate to it
                this.pages.push(data.page);
                this.updatePageInfo();

                // Navigate to the new page with flip animation (follow the host)
                const newPageIndex = this.pages.length - 1;
                this.flipToPage(newPageIndex, 'next');

                this.showNotification(`${data.sender_name || 'Host'} added page ${this.pages.length}`, 'info');
                console.log(`📄 Remote page added and navigated to page ${this.pages.length}`);
                break;

            case 'navigate':
                // Remote navigated to different page - sync to same page with animation
                const pageIndex = this.pages.findIndex(p => p.id === data.page.id);
                if (pageIndex >= 0) {
                    // Determine direction for animation
                    const currentIndex = this.pages.indexOf(this.currentPage);
                    const direction = pageIndex > currentIndex ? 'next' : 'prev';

                    // Use flip animation for smooth transition
                    this.flipToPage(pageIndex, direction);

                    this.showNotification(`${data.sender_name || 'Host'} navigated to page ${pageIndex + 1}`, 'info');
                    console.log(`📄 Remote navigation to page ${pageIndex + 1}`);
                } else {
                    console.warn(`⚠️ Page not found for navigation: ${data.page.id}`);
                }
                break;

            case 'delete':
                // Remote deleted a page
                this.pages = this.pages.filter(p => p.id !== data.page.id);
                this.updatePageInfo();
                if (this.currentPage?.id === data.page.id) {
                    // Current page was deleted, go to first page
                    if (this.pages.length > 0) {
                        this.flipToPage(0, 'prev');
                    }
                }
                this.showNotification(`${data.sender_name || 'Host'} deleted a page`, 'info');
                console.log(`📄 Remote page deleted`);
                break;
        }
    }

    /**
     * Handle remote canvas clear
     */
    handleRemoteClear(data) {
        if (data.sender_id === this.myProfileId) return;

        // Perform clear without broadcasting (to avoid loops)
        this.performClear(false);

        this.showNotification(`${data.sender_name || 'Other party'} cleared the canvas`, 'info');
    }

    /**
     * Handle remote undo
     */
    handleRemoteUndo(data) {
        if (data.sender_id === this.myProfileId) return;

        // Perform undo without broadcasting (to avoid loops)
        this.performUndo(false);

        this.showNotification(`${data.sender_name || 'Other party'} undid last stroke`, 'info');
    }

    /**
     * Handle remote color change
     * Updates both the internal color state and the UI display for all participants
     * A. When host changes color, colorDisplay should also change for participant
     */
    handleRemoteColorChange(data) {
        if (data.sender_id === this.myProfileId) return;

        // Update local color state
        this.strokeColor = data.color;

        // Update UI - force the style update for colorDisplay and colorInput
        const colorDisplay = document.getElementById('colorDisplay');
        const colorInput = document.getElementById('strokeColor');

        if (colorDisplay) {
            // Use multiple methods to ensure the color updates visually
            colorDisplay.style.backgroundColor = data.color;
            colorDisplay.style.setProperty('background-color', data.color, 'important');

            // Also update via CSS attribute for better specificity
            colorDisplay.setAttribute('style', `background-color: ${data.color} !important;`);

            // Force a repaint using requestAnimationFrame for smoother update
            requestAnimationFrame(() => {
                colorDisplay.style.backgroundColor = data.color;
                colorDisplay.style.setProperty('background-color', data.color, 'important');
            });

            console.log(`🎨 Updated colorDisplay background to: ${data.color}`);
        } else {
            console.warn('⚠️ colorDisplay element not found');
        }

        if (colorInput) {
            colorInput.value = data.color;
        } else {
            console.warn('⚠️ strokeColor input element not found');
        }

        console.log(`🎨 Color synced from ${data.sender_name}: ${data.color}`);
        this.showNotification(`${data.sender_name || 'Other party'} changed color to ${data.color}`, 'info');
    }

    /**
     * ✨ NEW METHOD: Handle remote tool change from ANY user
     * Updates toolbar to match sender's selected tool
     * Works for tool changes from host OR other participants
     * @param {Object} data - WebSocket message data
     */
    handleRemoteToolChange(data) {
        // Don't sync with yourself (ignore your own broadcasts)
        if (data.sender_id === this.profileId) {
            console.log('ℹ️ Ignoring tool change (from myself)');
            return;
        }

        // Validate the tool
        const validTools = ['pen', 'text', 'eraser', 'line', 'rectangle', 'circle', 'triangle', 'arrow'];
        if (!validTools.includes(data.tool)) {
            console.warn('⚠️ Invalid tool received:', data.tool);
            return;
        }

        console.log(`🔧 ${data.sender_name} (${data.sender_role}) switched to: ${data.tool}`);

        // ✨ FIX: Do NOT sync tool selection to participant's toolbar
        // Each user should control their own tool selection independently
        // Previously: this.selectToolSilently(data.tool); - REMOVED

        // Just log the tool change for debugging purposes
        console.log(`ℹ️ Remote user ${data.sender_name} is now using: ${data.tool} (not syncing to local toolbar)`);
    }

    /**
     * Show drawing indicator when remote participant is drawing
     */
    showDrawingIndicator(name) {
        let indicator = document.getElementById('drawingIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'drawingIndicator';
            indicator.className = 'drawing-indicator';
            document.getElementById('canvasContainer')?.appendChild(indicator);
        }

        indicator.textContent = `${name} is drawing...`;
        indicator.style.display = 'block';

        // Clear existing timeout
        clearTimeout(this.drawingIndicatorTimeout);

        // Hide after 2 seconds of no activity
        this.drawingIndicatorTimeout = setTimeout(() => {
            indicator.style.display = 'none';
        }, 2000);
    }

    /**
     * Show drawing indicator when someone else is drawing
     */
    showDrawingIndicator(name) {
        let indicator = document.getElementById('drawingIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'drawingIndicator';
            indicator.className = 'drawing-indicator';
            document.getElementById('canvasContainer')?.appendChild(indicator);
        }

        indicator.innerHTML = `
            <span class="drawing-dot"></span>
            <span>${name} is drawing...</span>
        `;
        indicator.style.display = 'flex';

        // Hide after 2 seconds
        clearTimeout(this.drawingIndicatorTimeout);
        this.drawingIndicatorTimeout = setTimeout(() => {
            indicator.style.display = 'none';
        }, 2000);
    }

    // ============================================================================
    // DOCUMENT VIEWER METHODS (PDF/Word/PPT)
    // ============================================================================

    /**
     * Open a file in the document viewer
     */
    async openFileInViewer(file) {
        const overlay = document.getElementById('documentViewerOverlay');
        const titleEl = document.getElementById('documentViewerTitle');
        const contentEl = document.getElementById('documentViewerContent');

        if (!overlay || !contentEl) return;

        // Show overlay
        overlay.style.display = 'flex';
        titleEl.textContent = file.name || 'Document';
        contentEl.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin fa-3x"></i><p>Loading document...</p></div>';

        this.currentDocument = file;
        this.documentPages = [];
        this.currentDocPage = 0;
        this.documentZoom = 1;

        try {
            const fileExt = file.name?.split('.').pop()?.toLowerCase();

            if (fileExt === 'pdf') {
                await this.loadPdfDocument(file.url || file.path);
            } else if (['doc', 'docx'].includes(fileExt)) {
                await this.loadWordDocument(file.url || file.path);
            } else if (['ppt', 'pptx'].includes(fileExt)) {
                await this.loadPptDocument(file.url || file.path);
            } else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExt)) {
                await this.loadImageDocument(file.url || file.path);
            } else {
                contentEl.innerHTML = `<div class="doc-error"><i class="fas fa-file-alt fa-3x"></i><p>Unsupported file type: ${fileExt}</p></div>`;
            }
        } catch (error) {
            console.error('Error loading document:', error);
            contentEl.innerHTML = `<div class="doc-error"><i class="fas fa-exclamation-triangle fa-3x"></i><p>Failed to load document</p></div>`;
        }

        // Setup viewer controls
        this.setupDocumentViewerControls();
    }

    /**
     * Load PDF document using PDF.js
     */
    async loadPdfDocument(url) {
        const contentEl = document.getElementById('documentViewerContent');

        // Check if PDF.js is available
        if (typeof pdfjsLib === 'undefined') {
            // Load PDF.js dynamically
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        try {
            const loadingTask = pdfjsLib.getDocument(url);
            const pdf = await loadingTask.promise;

            this.documentPages = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                this.documentPages.push({ pageNum: i, pdf: pdf });
            }

            await this.renderDocumentPage(0);
            this.updateDocumentPageInfo();
        } catch (error) {
            throw new Error('Failed to load PDF: ' + error.message);
        }
    }

    /**
     * Load Word document (display as message - full conversion would need server-side)
     */
    async loadWordDocument(url) {
        const contentEl = document.getElementById('documentViewerContent');
        contentEl.innerHTML = `
            <div class="doc-preview">
                <i class="fas fa-file-word fa-5x" style="color: #2b579a; margin-bottom: 20px;"></i>
                <h3>Word Document</h3>
                <p>Word documents can be viewed after conversion.</p>
                <a href="${url}" target="_blank" class="doc-download-btn">
                    <i class="fas fa-download"></i> Download to View
                </a>
            </div>
        `;
    }

    /**
     * Load PowerPoint document (display as message - full conversion would need server-side)
     */
    async loadPptDocument(url) {
        const contentEl = document.getElementById('documentViewerContent');
        contentEl.innerHTML = `
            <div class="doc-preview">
                <i class="fas fa-file-powerpoint fa-5x" style="color: #d24726; margin-bottom: 20px;"></i>
                <h3>PowerPoint Presentation</h3>
                <p>PowerPoint files can be viewed after conversion.</p>
                <a href="${url}" target="_blank" class="doc-download-btn">
                    <i class="fas fa-download"></i> Download to View
                </a>
            </div>
        `;
    }

    /**
     * Load image document
     */
    async loadImageDocument(url) {
        const contentEl = document.getElementById('documentViewerContent');
        this.documentPages = [{ url: url, type: 'image' }];

        const img = new Image();
        img.onload = () => {
            contentEl.innerHTML = '';
            contentEl.appendChild(img);
        };
        img.onerror = () => {
            contentEl.innerHTML = `<div class="doc-error"><i class="fas fa-image fa-3x"></i><p>Failed to load image</p></div>`;
        };
        img.src = url;
        img.style.maxWidth = '100%';
        img.style.transform = `scale(${this.documentZoom})`;
    }

    /**
     * Render a specific page of the document
     */
    async renderDocumentPage(pageIndex) {
        if (pageIndex < 0 || pageIndex >= this.documentPages.length) return;

        const contentEl = document.getElementById('documentViewerContent');
        const page = this.documentPages[pageIndex];

        if (page.pdf) {
            // PDF page
            const pdfPage = await page.pdf.getPage(page.pageNum);
            const viewport = pdfPage.getViewport({ scale: 1.5 * this.documentZoom });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await pdfPage.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;

            contentEl.innerHTML = '';
            contentEl.appendChild(canvas);
        } else if (page.type === 'image') {
            // Already loaded as image
            const img = contentEl.querySelector('img');
            if (img) {
                img.style.transform = `scale(${this.documentZoom})`;
            }
        }

        this.currentDocPage = pageIndex;
        this.updateDocumentPageInfo();
    }

    /**
     * Setup document viewer controls
     */
    setupDocumentViewerControls() {
        document.getElementById('docPrevPage')?.addEventListener('click', () => {
            if (this.currentDocPage > 0) {
                this.renderDocumentPage(this.currentDocPage - 1);
            }
        });

        document.getElementById('docNextPage')?.addEventListener('click', () => {
            if (this.currentDocPage < this.documentPages.length - 1) {
                this.renderDocumentPage(this.currentDocPage + 1);
            }
        });

        document.getElementById('docZoomIn')?.addEventListener('click', () => {
            this.documentZoom = Math.min(this.documentZoom + 0.25, 3);
            this.renderDocumentPage(this.currentDocPage);
        });

        document.getElementById('docZoomOut')?.addEventListener('click', () => {
            this.documentZoom = Math.max(this.documentZoom - 0.25, 0.5);
            this.renderDocumentPage(this.currentDocPage);
        });

        document.getElementById('closeDocViewer')?.addEventListener('click', () => {
            this.closeDocumentViewer();
        });
    }

    /**
     * Update document page info display
     */
    updateDocumentPageInfo() {
        const pageInfo = document.getElementById('docPageInfo');
        if (pageInfo) {
            pageInfo.textContent = `${this.currentDocPage + 1} / ${this.documentPages.length}`;
        }
    }

    /**
     * Close the document viewer
     */
    closeDocumentViewer() {
        const overlay = document.getElementById('documentViewerOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        this.currentDocument = null;
        this.documentPages = [];
    }

    /**
     * Load a script dynamically
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // ============================================================================
    // PARTICIPANT PERMISSION METHODS
    // ============================================================================

    /**
     * Request permission to draw (for participants)
     * Only works during active video sessions
     */
    requestDrawPermission() {
        // Only allow requesting during active video sessions
        if (!this.isVideoSessionActive) {
            this.showNotification('Join a video session first to request interaction permission', 'info');
            return;
        }

        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.showNotification('Not connected to session', 'error');
            return;
        }

        // Don't send if already pending
        if (this.permissionRequestPending) {
            this.showNotification('Your request is still pending', 'info');
            return;
        }

        // Mark request as pending
        this.permissionRequestPending = true;

        // Get requester info - use 'name' field from API response
        const requesterName = this.userRole === 'student'
            ? (this.studentInfo?.name || this.studentInfo?.full_name || 'Student')
            : (this.tutorInfo?.name || this.tutorInfo?.full_name || 'User');
        const requesterAvatar = this.userRole === 'student'
            ? this.studentInfo?.profile_picture
            : this.tutorInfo?.profile_picture;

        // Determine recipient - send to the HOST
        // hostPeerInfo is set when we accept an incoming call (we're not the host)
        let toStudentProfileId = null;
        let toTutorProfileId = null;

        if (this.hostPeerInfo) {
            if (this.hostPeerInfo.profile_type === 'student') {
                toStudentProfileId = this.hostPeerInfo.profile_id;
            } else {
                toTutorProfileId = this.hostPeerInfo.profile_id;
            }
        } else {
            // Fallback to selected IDs
            toStudentProfileId = this.selectedStudentId;
            toTutorProfileId = this.selectedTutorId;
        }

        console.log('📤 Sending permission request to host:', { toStudentProfileId, toTutorProfileId });

        this.ws.send(JSON.stringify({
            type: 'whiteboard_permission_request',
            session_id: this.currentSession?.id,
            requester_id: this.myProfileId,
            requester_name: requesterName,
            requester_avatar: requesterAvatar,
            requester_profile_type: this.userRole,
            from_student_profile_id: this.userRole === 'student' ? this.myProfileId : null,
            from_tutor_profile_id: this.userRole === 'tutor' ? this.myProfileId : null,
            to_student_profile_id: toStudentProfileId,
            to_tutor_profile_id: toTutorProfileId
        }));

        // Update button state
        this.updateRequestInteractionButton();

        this.showNotification('Permission request sent to host', 'info');
    }

    /**
     * Update permission indicator visibility based on host status, session state, and permissions
     * Only shows for non-hosts when video session is active and they don't have permission
     */
    updatePermissionIndicator() {
        const indicator = document.getElementById('canvasPermissionIndicator');
        if (indicator) {
            // Only show when video session is active
            if (!this.isVideoSessionActive) {
                indicator.style.display = 'none';
            } else if (this.isSessionHost) {
                // Only show for non-hosts (participants who joined) who don't have permission
                // Host can be either tutor or student - whoever initiated the call
                indicator.style.display = 'none';
            } else if (this.permissions.can_draw || this.permissions.can_write) {
                indicator.style.display = 'none';
            } else {
                indicator.style.display = 'flex';
            }
        }

        // Update the interaction wrapper to show host or participant view
        this.updateInteractionWrapperRole();
    }

    /**
     * Update the interaction wrapper to show the correct view based on role
     * Host sees "Allow Interaction" with dropdown
     * Participant sees "Request Interaction" button
     * Default: Show host view when no video session is active
     */
    updateInteractionWrapperRole() {
        const wrapper = document.getElementById('allowInteractionWrapper');
        const hostView = document.getElementById('hostInteractionView');
        const participantView = document.getElementById('participantInteractionView');

        if (!wrapper) return;

        // Determine if we should show host view:
        // - Always show host view when no video session is active (default state)
        // - When video session is active, show based on isSessionHost
        const showHostView = !this.isVideoSessionActive || this.isSessionHost;

        // Set data attribute for CSS-based hiding (backup)
        wrapper.setAttribute('data-role', showHostView ? 'host' : 'participant');

        // Also directly control visibility for immediate effect
        if (hostView) {
            hostView.style.display = showHostView ? 'block' : 'none';
        }
        if (participantView) {
            participantView.style.display = showHostView ? 'none' : 'flex';
        }

        // Update request button state based on current permission status
        if (!showHostView) {
            this.updateRequestInteractionButton();
        }
    }

    /**
     * Update the request interaction button state
     */
    updateRequestInteractionButton() {
        const requestBtn = document.getElementById('requestInteractionBtn');
        if (!requestBtn) return;

        // Check if already has permission
        if (this.permissions.can_draw || this.permissions.can_write) {
            requestBtn.classList.remove('request-pending');
            requestBtn.classList.add('request-granted');
            requestBtn.innerHTML = '<i class="fas fa-check tool-icon"></i><span class="btn-text">Permission Granted</span>';
            requestBtn.disabled = true;
        } else if (this.permissionRequestPending) {
            requestBtn.classList.add('request-pending');
            requestBtn.classList.remove('request-granted');
            requestBtn.innerHTML = '<i class="fas fa-hourglass-half tool-icon"></i><span class="btn-text">Waiting for host...</span>';
            requestBtn.disabled = true;
        } else {
            requestBtn.classList.remove('request-pending', 'request-granted');
            requestBtn.innerHTML = '<i class="fas fa-hand-paper tool-icon"></i><span class="btn-text">Request Interaction</span>';
            requestBtn.disabled = false;
        }
    }

    /**
     * Update toolbar tools based on permissions
     * Disable/enable tools for participants based on granted permissions
     */
    updateToolbarPermissions() {
        // Host always has full access to all tools
        if (this.isSessionHost) {
            document.querySelectorAll('.tool-button').forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
                btn.title = '';
            });
            return;
        }

        // For participants: Disable tools based on permissions
        const drawTools = ['pen', 'line', 'rectangle', 'circle', 'triangle', 'arrow'];
        const writeTools = ['text'];
        const eraseTools = ['eraser'];

        document.querySelectorAll('.tool-button[data-tool]').forEach(btn => {
            const tool = btn.dataset.tool;
            let hasPermission = false;

            if (drawTools.includes(tool)) {
                hasPermission = this.permissions.can_draw;
            } else if (writeTools.includes(tool)) {
                hasPermission = this.permissions.can_write;
            } else if (eraseTools.includes(tool)) {
                hasPermission = this.permissions.can_erase;
            }

            // Disable button if participant doesn't have permission
            btn.disabled = !hasPermission;
            btn.style.opacity = hasPermission ? '1' : '0.4';
            btn.style.cursor = hasPermission ? 'pointer' : 'not-allowed';
            btn.title = hasPermission ? '' : 'Request permission from host to use this tool';
        });

        // Disable clear button if no erase permission
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            const canClear = this.permissions.can_erase;
            clearBtn.disabled = !canClear;
            clearBtn.style.opacity = canClear ? '1' : '0.4';
            clearBtn.style.cursor = canClear ? 'pointer' : 'not-allowed';
            clearBtn.title = canClear ? 'Clear canvas' : 'Request erase permission from host';
        }

        // Disable undo button if no erase permission
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
            const canUndo = this.permissions.can_erase;
            undoBtn.disabled = !canUndo;
            undoBtn.style.opacity = canUndo ? '1' : '0.4';
            undoBtn.style.cursor = canUndo ? 'pointer' : 'not-allowed';
            undoBtn.title = canUndo ? 'Undo (Ctrl+Z)' : 'Request erase permission from host';
        }

        // Disable color picker if no draw or write permission
        const colorDisplay = document.getElementById('colorDisplay');
        const colorInput = document.getElementById('strokeColor');
        const canChangeColor = this.permissions.can_draw || this.permissions.can_write;
        if (colorDisplay) {
            colorDisplay.style.opacity = canChangeColor ? '1' : '0.4';
            colorDisplay.style.cursor = canChangeColor ? 'pointer' : 'not-allowed';
            colorDisplay.title = canChangeColor ? 'Choose color' : 'Request draw or write permission from host';
        }
        if (colorInput) {
            colorInput.disabled = !canChangeColor;
        }

        // Disable stroke width if no draw or write permission
        const strokeWidth = document.getElementById('strokeWidth');
        if (strokeWidth) {
            strokeWidth.disabled = !canChangeColor;
            strokeWidth.style.opacity = canChangeColor ? '1' : '0.4';
            strokeWidth.style.cursor = canChangeColor ? 'pointer' : 'not-allowed';
        }

        // Disable page navigation/add buttons for participants without permission (like toolbar)
        // Buttons remain visible but grayed out and unclickable
        // Pages will sync automatically when host navigates
        const canManagePages = this.canUserManagePages();
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        const addPageBtn = document.getElementById('addPageBtn');

        if (prevPageBtn) {
            if (!canManagePages) {
                prevPageBtn.disabled = true;
                prevPageBtn.style.opacity = '0.4';
                prevPageBtn.style.cursor = 'not-allowed';
                prevPageBtn.style.pointerEvents = 'none';
            } else {
                // Reset when permission granted (actual state set in updatePageInfo)
                prevPageBtn.style.pointerEvents = 'auto';
            }
        }
        if (nextPageBtn) {
            if (!canManagePages) {
                nextPageBtn.disabled = true;
                nextPageBtn.style.opacity = '0.4';
                nextPageBtn.style.cursor = 'not-allowed';
                nextPageBtn.style.pointerEvents = 'none';
            } else {
                // Reset when permission granted (actual state set in updatePageInfo)
                nextPageBtn.style.pointerEvents = 'auto';
            }
        }
        if (addPageBtn) {
            addPageBtn.disabled = !canManagePages;
            addPageBtn.style.opacity = canManagePages ? '1' : '0.4';
            addPageBtn.style.cursor = canManagePages ? 'pointer' : 'not-allowed';
            addPageBtn.style.pointerEvents = canManagePages ? 'auto' : 'none';
        }

        // Disable recording button for non-host participants
        const recordBtn = document.getElementById('recordBtn');
        if (recordBtn) {
            recordBtn.disabled = !this.isSessionHost;
            recordBtn.style.opacity = this.isSessionHost ? '1' : '0.4';
            recordBtn.style.cursor = this.isSessionHost ? 'pointer' : 'not-allowed';
            recordBtn.title = this.isSessionHost ? 'Record Session' : 'Only the host can record';
        }

        // Disable text formatting buttons for participants without write permission
        const canWrite = this.permissions.can_write;
        document.querySelectorAll('.format-button[data-format]').forEach(btn => {
            btn.disabled = !canWrite;
            btn.style.opacity = canWrite ? '1' : '0.4';
            btn.style.cursor = canWrite ? 'pointer' : 'not-allowed';
            btn.title = canWrite ? '' : 'Request write permission from host';
        });
    }

    /**
     * Check if a rectangle overlaps with any existing text bounding boxes
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width of the text
     * @param {number} height - Height of the text
     * @returns {boolean} - True if overlapping, false otherwise
     */
    checkTextOverlap(x, y, width, height) {
        const padding = 10; // Extra padding to prevent close text
        const newBox = {
            left: x - padding,
            right: x + width + padding,
            top: y - height - padding,
            bottom: y + padding
        };

        for (const box of this.textBoundingBoxes) {
            // Check for intersection
            if (!(newBox.right < box.left ||
                  newBox.left > box.right ||
                  newBox.bottom < box.top ||
                  newBox.top > box.bottom)) {
                return true; // Overlap detected
            }
        }
        return false;
    }

    /**
     * Find a non-overlapping position for new text
     * @param {number} preferredX - Preferred X position
     * @param {number} preferredY - Preferred Y position
     * @param {number} width - Width of the text
     * @param {number} height - Height of the text
     * @returns {{x: number, y: number}} - Non-overlapping position
     */
    findNonOverlappingPosition(preferredX, preferredY, width, height) {
        // If no overlap at preferred position, use it
        if (!this.checkTextOverlap(preferredX, preferredY, width, height)) {
            return { x: preferredX, y: preferredY };
        }

        // Try shifting down incrementally
        const verticalStep = height + 15;
        let newY = preferredY;
        let attempts = 0;
        const maxAttempts = 20;

        while (attempts < maxAttempts) {
            newY += verticalStep;

            // Wrap to top if we exceed canvas height
            if (newY > this.canvas.height - 30) {
                newY = 50;
                preferredX = 30; // Reset X to left side when wrapping
            }

            if (!this.checkTextOverlap(preferredX, newY, width, height)) {
                return { x: preferredX, y: newY };
            }
            attempts++;
        }

        // Fallback: just use next Y position after lastTextY
        return { x: preferredX, y: this.lastTextY + verticalStep };
    }

    /**
     * Register a text bounding box for collision detection
     * @param {number} x - X position
     * @param {number} y - Y position (baseline)
     * @param {number} width - Width of the text
     * @param {number} height - Height of the text (font size)
     */
    registerTextBoundingBox(x, y, width, height) {
        this.textBoundingBoxes.push({
            left: x,
            right: x + width,
            top: y - height,
            bottom: y,
            x: x,
            y: y,
            width: width,
            height: height
        });
    }

    /**
     * Clear text bounding boxes (called when clearing page or switching pages)
     */
    clearTextBoundingBoxes() {
        this.textBoundingBoxes = [];
        this.lastTextY = 50;
    }

    /**
     * Check if current user can draw on canvas
     * Host (session creator) can always draw
     * Participants need explicit permission
     */
    canUserDraw() {
        // Host can always draw (host is whoever initiated the video call)
        if (this.isSessionHost) {
            return true;
        }

        // Participants need can_draw permission
        return this.permissions.can_draw === true;
    }

    /**
     * Check if current user can write text on canvas
     * Host can always write
     * Participants need explicit permission
     */
    canUserWrite() {
        // Host can always write
        if (this.isSessionHost) {
            return true;
        }

        // Participants need can_write permission
        return this.permissions.can_write === true;
    }

    /**
     * Check if current user can change color
     * Host can always change color
     * Participants need draw OR write permission
     */
    canUserChangeColor() {
        // Host can always change color
        if (this.isSessionHost) {
            return true;
        }

        // Participants need can_draw OR can_write permission
        return this.permissions.can_draw === true || this.permissions.can_write === true;
    }

    /**
     * Check if current user can erase on canvas
     * Host can always erase
     * Participants need explicit permission
     */
    canUserErase() {
        // Host can always erase
        if (this.isSessionHost) {
            return true;
        }

        // Participants need can_erase permission
        return this.permissions.can_erase === true;
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // TODO: Integrate with existing notification system
    }

    /**
     * Toggle sidebar (works on both desktop and mobile)
     */
    toggleMobileSidebar(sidebar) {
        const historyElement = document.querySelector('.whiteboard-sidebar');
        const chatElement = document.querySelector('.whiteboard-right-sidebar');
        const backdrop = document.getElementById('mobileSidebarBackdrop');

        if (sidebar === 'history') {
            // On desktop: toggle collapsed class
            // On mobile: toggle mobile-active class
            if (window.innerWidth > 768) {
                historyElement?.classList.toggle('collapsed');
            } else {
                const isActive = historyElement?.classList.toggle('mobile-active');
                chatElement?.classList.remove('mobile-active');
                backdrop?.classList.toggle('active', isActive);
            }
        } else if (sidebar === 'chat') {
            if (window.innerWidth <= 768) {
                const isActive = chatElement?.classList.toggle('mobile-active');
                historyElement?.classList.remove('mobile-active');
                backdrop?.classList.toggle('active', isActive);
            } else {
                chatElement?.classList.toggle('expanded');
            }
        }
    }

    /**
     * Close all mobile sidebars
     */
    closeMobileSidebars() {
        const historyElement = document.querySelector('.whiteboard-sidebar');
        const chatElement = document.querySelector('.whiteboard-right-sidebar');
        const backdrop = document.getElementById('mobileSidebarBackdrop');

        historyElement?.classList.remove('mobile-active');
        chatElement?.classList.remove('mobile-active');
        backdrop?.classList.remove('active');

        // Reset toggle button states
        document.getElementById('rightSidebarToggle')?.classList.remove('active');
    }

    /**
     * Toggle left sidebar expanded state (for tablet view)
     */
    toggleLeftSidebar() {
        const leftSidebar = document.querySelector('.whiteboard-sidebar');
        const rightSidebar = document.querySelector('.whiteboard-right-sidebar');
        const toggleBtn = document.getElementById('leftSidebarToggle');

        if (leftSidebar) {
            const isExpanded = leftSidebar.classList.toggle('expanded');
            toggleBtn?.classList.toggle('active', isExpanded);

            // Close right sidebar if open
            if (isExpanded) {
                rightSidebar?.classList.remove('expanded');
                document.getElementById('rightSidebarToggle')?.classList.remove('active');
            }
        }
    }

    /**
     * Toggle right sidebar expanded state (works on both tablet and mobile)
     */
    toggleRightSidebar() {
        const leftSidebar = document.querySelector('.whiteboard-sidebar');
        const rightSidebar = document.querySelector('.whiteboard-right-sidebar');
        const toggleBtn = document.getElementById('rightSidebarToggle');
        const backdrop = document.getElementById('mobileSidebarBackdrop');

        if (rightSidebar) {
            // On mobile (<=768px), use mobile-active class
            if (window.innerWidth <= 768) {
                const isActive = rightSidebar.classList.toggle('mobile-active');
                toggleBtn?.classList.toggle('active', isActive);
                backdrop?.classList.toggle('active', isActive);

                // Close left sidebar if open
                leftSidebar?.classList.remove('mobile-active');
            } else {
                // On tablet, use expanded class
                const isExpanded = rightSidebar.classList.toggle('expanded');
                toggleBtn?.classList.toggle('active', isExpanded);

                // Close left sidebar if open
                if (isExpanded) {
                    leftSidebar?.classList.remove('expanded');
                    document.getElementById('leftSidebarToggle')?.classList.remove('active');
                }
            }
        }
    }

    /**
     * Resize canvas to fill the container completely (full available space)
     * Uses the entire container without maintaining fixed aspect ratio
     */
    resizeCanvas() {
        if (!this.canvas) return;

        const container = document.getElementById('canvasContainer');
        if (!container) return;

        // Get container dimensions (minus small padding)
        const containerWidth = container.clientWidth - 16; // 8px padding on each side
        const containerHeight = container.clientHeight - 16;

        // Use FULL container space (no aspect ratio constraint)
        let canvasWidth = containerWidth;
        let canvasHeight = containerHeight;

        // Ensure minimum size
        canvasWidth = Math.max(canvasWidth, 400);
        canvasHeight = Math.max(canvasHeight, 300);

        // Only resize if dimensions changed significantly (avoid constant resizing)
        if (Math.abs(this.canvas.width - canvasWidth) > 10 || Math.abs(this.canvas.height - canvasHeight) > 10) {
            console.log(`📐 Resizing canvas to full space: ${this.canvas.width}x${this.canvas.height} → ${Math.round(canvasWidth)}x${Math.round(canvasHeight)}`);

            // Store current strokes before resizing (for scaling if needed)
            const currentStrokes = this.currentPage?.strokes || [];

            // Resize canvas
            this.canvas.width = Math.round(canvasWidth);
            this.canvas.height = Math.round(canvasHeight);

            // Also resize the next canvas for page flip animation
            const nextCanvas = document.getElementById('whiteboardCanvasNext');
            if (nextCanvas) {
                nextCanvas.width = this.canvas.width;
                nextCanvas.height = this.canvas.height;
            }

            // Redraw current page to fit new canvas size
            if (this.currentPage) {
                this.redrawPage();
            }
        }
    }

    /**
     * Delete current page
     */
    async deletePage() {
        if (!this.currentPage || this.pages.length <= 1) {
            this.showNotification('Cannot delete the only page', 'warning');
            return;
        }

        if (!confirm('Delete this page? This cannot be undone.')) return;

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const response = await fetch(`${this.API_BASE}/pages/${this.currentPage.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                // Remove from local pages array
                const currentIndex = this.pages.indexOf(this.currentPage);
                this.pages.splice(currentIndex, 1);

                // Load previous or first page
                const newIndex = currentIndex > 0 ? currentIndex - 1 : 0;
                this.loadPage(newIndex);

                this.showNotification('Page deleted successfully', 'success');
            }
        } catch (error) {
            console.error('Error deleting page:', error);
            this.showNotification('Failed to delete page', 'error');
        }
    }

    /**
     * Download canvas as image
     */
    downloadCanvas() {
        if (!this.canvas) return;

        try {
            // Create a download link
            const link = document.createElement('a');
            const sessionTitle = this.currentSession?.session_title || 'whiteboard';
            const pageNum = this.pages.indexOf(this.currentPage) + 1;
            link.download = `${sessionTitle}_page${pageNum}_${Date.now()}.png`;

            // Convert canvas to blob
            this.canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);

                this.showNotification('Canvas downloaded successfully', 'success');
            });
        } catch (error) {
            console.error('Error downloading canvas:', error);
            this.showNotification('Failed to download canvas', 'error');
        }
    }

    /**
     * Start a live video session with the selected person (tutor or student)
     * Both tutors and students can initiate calls to each other
     */
    async startVideoSession() {
        const startBtn = document.getElementById('startVideoSessionBtn');

        // Check if there's a pending incoming call to accept
        if (this.pendingCallInvitation) {
            await this.acceptIncomingCall();
            return;
        }

        // Check if there's a selected person to call
        // For tutors: need to select a student
        // For students: need to select a tutor
        if (this.userRole === 'student') {
            if (!this.selectedTutorId) {
                this.showNotification('Please select a tutor first', 'warning');
                // Note: The "students" panel shows tutors when user is a student
                this.switchSidebarPanel('students');
                return;
            }
        } else {
            if (!this.selectedStudentId) {
                this.showNotification('Please select a student first', 'warning');
                this.switchSidebarPanel('students');
                return;
            }
        }

        // Handle different states
        if (this.isCallPending) {
            // Cancel pending call (waiting for answer)
            await this.cancelPendingCall();
        } else if (this.isVideoSessionActive) {
            // Check if this should be "Leave Session" or "End Session"
            const buttonText = this.getSessionButtonText();
            if (buttonText === 'End Session') {
                // End the session for everyone
                await this.endSessionForAll();
            } else {
                // Just leave the session (others continue)
                await this.leaveVideoSession();
            }
        } else {
            // Start new video session
            await this.initiateVideoCall();
        }
    }

    /**
     * Cancel a pending outgoing call (before it's answered)
     * Supports multi-party calls
     */
    async cancelPendingCall() {
        console.log('📞 DEBUG: cancelPendingCall() called');
        console.log('📞 DEBUG: selectedParticipants:', this.selectedParticipants);
        console.log('📞 DEBUG: selectedStudentId:', this.selectedStudentId);
        console.log('📞 DEBUG: selectedTutorId:', this.selectedTutorId);
        console.log('📞 DEBUG: userRole:', this.userRole);
        console.log('📞 DEBUG: ws readyState:', this.ws?.readyState, '(OPEN=1)');

        // Notify remote peer(s) that call was cancelled
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // For multi-party calls, notify all selected participants
            if (this.selectedParticipants.length > 0) {
                for (const participant of this.selectedParticipants) {
                    const message = {
                        type: 'video_call_cancelled',
                        session_id: this.currentSession?.id,
                        is_multi_party: true
                    };

                    if (participant.role === 'student') {
                        message.to_student_profile_id = participant.id;
                    } else {
                        message.to_tutor_profile_id = participant.id;
                    }

                    console.log('📞 DEBUG: Sending cancel message (multi-party):', JSON.stringify(message));
                    this.ws.send(JSON.stringify(message));
                    console.log(`📞 Sent cancel to ${participant.role} ${participant.id}`);
                }
            } else {
                // Legacy single-party cancel
                const message = {
                    type: 'video_call_cancelled',
                    session_id: this.currentSession?.id
                };

                if (this.userRole === 'student') {
                    message.to_tutor_profile_id = this.selectedTutorId;
                } else {
                    message.to_student_profile_id = this.selectedStudentId;
                }

                console.log('📞 DEBUG: Sending cancel message (single-party):', JSON.stringify(message));
                this.ws.send(JSON.stringify(message));
            }
        } else {
            console.log('📞 DEBUG: WebSocket NOT open, cannot send cancel message!');
        }

        // Clean up and reset state
        await this.endVideoSession(false); // Don't notify as ended, we're cancelling

        this.showNotification('Call cancelled', 'info');
    }

    /**
     * Initiate a video call - request camera/mic and set up connections to all selected participants
     * Supports multi-party calls using mesh topology (each participant connects to all others)
     */
    async initiateVideoCall() {
        const startBtn = document.getElementById('startVideoSessionBtn');

        try {
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';

            // Request camera and microphone access
            this.localStream = await navigator.mediaDevices.getUserMedia({
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

            // Display local video in host placeholder
            this.displayLocalVideo();

            // Show video controls
            this.showVideoControls();

            // Clear previous connections
            this.peerConnections.clear();
            this.remoteStreams.clear();
            this.connectedParticipants = [];

            // Get participants to call
            const participantsToCall = this.selectedParticipants.length > 0
                ? this.selectedParticipants
                : (this.userRole === 'student' && this.selectedTutorId
                    ? [{ id: this.selectedTutorId, role: 'tutor' }]
                    : this.selectedStudentId
                        ? [{ id: this.selectedStudentId, role: 'student' }]
                        : []);

            if (participantsToCall.length === 0) {
                throw new Error('No participants selected');
            }

            console.log(`📹 Initiating call to ${participantsToCall.length} participant(s):`, participantsToCall);

            // Mark this user as the session host (they initiated the call)
            this.isSessionHost = true;
            // Host has FULL permissions
            this.permissions = { can_draw: true, can_write: true, can_erase: true };
            // Update toolbar to reflect full permissions
            this.updateToolbarPermissions();
            console.log('📋 Initiating call as HOST - full permissions granted');

            // Create peer connection for each participant
            for (const participant of participantsToCall) {
                await this.setupPeerConnectionForParticipant(participant);
            }

            // Update UI state - call is pending until answered
            this.isCallPending = true;
            startBtn.disabled = false;
            startBtn.classList.add('pending');
            startBtn.innerHTML = '<i class="fas fa-phone-slash"></i> Cancel Call';

            // Update host video placeholder styling
            const hostPlaceholder = document.getElementById('tutorVideoPlaceholder');
            if (hostPlaceholder) {
                hostPlaceholder.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.5)';
            }

            // Update selected participant video placeholders and show video controls
            const participantPlaceholders = document.querySelectorAll('.student-video-placeholder');
            participantPlaceholders.forEach(placeholder => {
                const participantId = parseInt(placeholder.dataset.participantId);
                if (participantsToCall.some(p => p.id === participantId)) {
                    placeholder.classList.add('calling');
                    placeholder.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
                    // Show video controls on participant card when call is initiated
                    this.showParticipantVideoControls(placeholder);
                }
            });

            // Switch to Live Video panel to show the participants
            this.switchRightSidebarPanel('live');

            const participantCount = participantsToCall.length;
            const participantWord = participantCount === 1 ? 'participant' : 'participants';
            this.showNotification(`Calling ${participantCount} ${participantWord}... Waiting for answer.`, 'info');
            console.log('📹 Video call initiated to all participants, waiting for answers');

            // Send call invitations via WebSocket to all participants
            this.sendMultiCallInvitations(participantsToCall);

        } catch (error) {
            console.error('Error starting video call:', error);
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-video"></i> Start Session';

            // Handle specific errors
            if (error.name === 'NotAllowedError') {
                this.showNotification('Camera/microphone access denied. Please allow access and try again.', 'error');
            } else if (error.name === 'NotFoundError') {
                this.showNotification('No camera or microphone found. Please connect a device and try again.', 'error');
            } else if (error.name === 'NotReadableError') {
                this.showNotification('Camera or microphone is already in use by another application.', 'error');
            } else {
                this.showNotification('Failed to start video call: ' + error.message, 'error');
            }
        }
    }

    /**
     * Display local video stream in the host placeholder (shows "You")
     * The host placeholder always shows the current user's own camera
     */
    displayLocalVideo() {
        const hostPlaceholder = document.getElementById('tutorVideoPlaceholder'); // Host = You
        if (!hostPlaceholder || !this.localStream) return;

        console.log('📹 displayLocalVideo - showing in host placeholder (You)');

        // Create video element for local stream
        let localVideo = hostPlaceholder.querySelector('video.local-video');
        if (!localVideo) {
            localVideo = document.createElement('video');
            localVideo.className = 'local-video';
            localVideo.autoplay = true;
            localVideo.muted = true; // Mute local video to prevent echo
            localVideo.playsInline = true;
            localVideo.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 12px;
                position: absolute;
                top: 0;
                left: 0;
            `;

            hostPlaceholder.style.position = 'relative';
            hostPlaceholder.insertBefore(localVideo, hostPlaceholder.firstChild);
        }

        localVideo.srcObject = this.localStream;

        // Hide avatar and style name label
        const avatar = hostPlaceholder.querySelector('.video-avatar');
        const initialsAvatar = hostPlaceholder.querySelector('.initials-avatar');
        const name = hostPlaceholder.querySelector('.video-participant-name');
        if (avatar) avatar.style.display = 'none';
        if (initialsAvatar) initialsAvatar.style.display = 'none';
        if (name) name.style.cssText = 'position: absolute; bottom: 10px; left: 10px; z-index: 10; background: rgba(0,0,0,0.5); padding: 4px 8px; border-radius: 4px; color: white;';

        console.log('📹 Local video displayed in host placeholder');
    }

    /**
     * Set up WebRTC peer connection for video call
     */
    async setupPeerConnection() {
        // ICE servers configuration (STUN/TURN servers)
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };

        this.peerConnection = new RTCPeerConnection(configuration);

        // Add local stream tracks to peer connection
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }

        // Handle incoming remote stream
        this.peerConnection.ontrack = (event) => {
            console.log('📹 Received remote track:', event.track.kind);
            this.remoteStream = event.streams[0];
            this.displayRemoteVideo();
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 ICE candidate:', event.candidate.candidate);
                // Send ICE candidate to remote peer via WebSocket
                this.sendIceCandidate(event.candidate);
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            console.log('📡 Connection state:', this.peerConnection.connectionState);
            switch (this.peerConnection.connectionState) {
                case 'connected':
                    this.onCallConnected();
                    break;
                case 'disconnected':
                    this.showNotification('Video call disconnected. Attempting to reconnect...', 'warning');
                    break;
                case 'failed':
                    this.showNotification('Video call failed. Please try again.', 'error');
                    this.endVideoSession();
                    break;
            }
        };

        // Create and send offer (as the caller/tutor)
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        // Send offer to student via WebSocket
        this.sendVideoOffer(offer);
    }

    /**
     * Set up WebRTC peer connection for a specific participant (multi-party mesh)
     * Creates individual peer connection for each participant in the call
     * @param {Object} participant - Participant info {id, role, name, avatar}
     */
    async setupPeerConnectionForParticipant(participant) {
        const participantId = participant.id;
        const participantRole = participant.role;

        console.log(`📹 Setting up peer connection for ${participantRole} ${participantId}`);

        // ICE servers configuration
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };

        const pc = new RTCPeerConnection(configuration);

        // Store peer connection in map
        this.peerConnections.set(participantId, pc);

        // Add local stream tracks to this peer connection
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
        }

        // Handle incoming remote stream from this participant
        pc.ontrack = (event) => {
            console.log(`📹 Received remote track from ${participantRole} ${participantId}:`, event.track.kind);
            const stream = event.streams[0];
            this.remoteStreams.set(participantId, stream);

            // Display this participant's video in their placeholder
            this.displayRemoteVideoForParticipant(participantId, participantRole, stream);
        };

        // Handle ICE candidates - route to specific participant
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(`🧊 ICE candidate for ${participantRole} ${participantId}`);
                this.sendIceCandidateToParticipant(event.candidate, participantId, participantRole);
            }
        };

        // Handle connection state changes for this participant
        pc.onconnectionstatechange = () => {
            console.log(`📡 Connection state for ${participantRole} ${participantId}:`, pc.connectionState);

            switch (pc.connectionState) {
                case 'connected':
                    // Add to connected participants list
                    if (!this.connectedParticipants.includes(participantId)) {
                        this.connectedParticipants.push(participantId);
                        // Update button text when participant count changes
                        this.updateSessionButtonText();
                    }
                    // Check if all participants are connected
                    this.checkAllParticipantsConnected();
                    break;

                case 'disconnected':
                    this.showNotification(`${participant.name || participantRole} disconnected. Attempting to reconnect...`, 'warning');
                    break;

                case 'failed':
                    this.showNotification(`Connection to ${participant.name || participantRole} failed.`, 'error');
                    // Remove from connected participants
                    this.connectedParticipants = this.connectedParticipants.filter(id => id !== participantId);
                    this.handleParticipantDisconnect(participantId, participantRole);
                    break;
            }
        };

        // Create and store the offer for this participant
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Store pending offer to be sent with invitation
        this.pendingOffers.set(participantId, offer);

        console.log(`📹 Peer connection ready for ${participantRole} ${participantId}`);
    }

    /**
     * Send call invitations to multiple participants (multi-party)
     * @param {Array} participants - Array of participant objects {id, role, name, avatar}
     */
    sendMultiCallInvitations(participants) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.log('WebSocket not connected - cannot send call invitations');
            return;
        }

        const callerProfileId = this.userRole === 'student'
            ? (this.studentInfo?.student_profile_id || this.studentInfo?.id)
            : (this.tutorInfo?.tutor_profile_id || this.tutorInfo?.id);

        const callerName = this.userRole === 'student'
            ? (this.studentInfo?.name || 'Student')
            : (this.tutorInfo?.name || 'Tutor');

        for (const participant of participants) {
            const offer = this.pendingOffers.get(participant.id);

            const invitation = {
                type: 'video_call_invitation',
                session_id: this.currentSession?.id,
                from_role: this.userRole,
                caller_name: callerName,
                is_multi_party: true,
                participant_count: participants.length,
                // ✨ ROLE-AGNOSTIC: Use generic profile routing
                from_profile_id: callerProfileId,
                from_profile_type: this.userRole,
                to_profile_id: participant.id,
                to_profile_type: participant.role,
                // Legacy fields for backward compatibility
                from_student_profile_id: this.userRole === 'student' ? callerProfileId : null,
                from_tutor_profile_id: this.userRole === 'tutor' ? callerProfileId : null,
                to_student_profile_id: participant.role === 'student' ? participant.id : null,
                to_tutor_profile_id: participant.role === 'tutor' ? participant.id : null
            };

            console.log(`📞 Sending call invitation to ${participant.role}_${participant.id}:`, invitation);
            this.ws.send(JSON.stringify(invitation));

            // Also send the video offer
            if (offer) {
                const offerMessage = {
                    type: 'video_offer',
                    offer: offer,
                    from_role: this.userRole,
                    is_multi_party: true,
                    // ✨ ROLE-AGNOSTIC: Use generic profile routing
                    from_profile_id: callerProfileId,
                    from_profile_type: this.userRole,
                    to_profile_id: participant.id,
                    to_profile_type: participant.role,
                    // Legacy fields for backward compatibility
                    from_student_profile_id: this.userRole === 'student' ? callerProfileId : null,
                    from_tutor_profile_id: this.userRole === 'tutor' ? callerProfileId : null,
                    to_student_profile_id: participant.role === 'student' ? participant.id : null,
                    to_tutor_profile_id: participant.role === 'tutor' ? participant.id : null
                };

                this.ws.send(JSON.stringify(offerMessage));
                console.log(`📹 Sent video offer to ${participant.role}_${participant.id}`);
            }
        }
    }

    /**
     * Send ICE candidate to a specific participant (multi-party)
     * @param {RTCIceCandidate} candidate - The ICE candidate
     * @param {number} participantId - Target participant's profile ID
     * @param {string} participantRole - Target participant's role
     */
    sendIceCandidateToParticipant(candidate, participantId, participantRole) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        const myProfileId = this.myProfileId || (this.userRole === 'student'
            ? (this.studentInfo?.student_profile_id || this.studentInfo?.id)
            : (this.tutorInfo?.tutor_profile_id || this.tutorInfo?.id));

        const message = {
            type: 'ice_candidate',
            candidate: candidate,
            from_role: this.userRole,
            is_multi_party: true,
            // ✨ ROLE-AGNOSTIC: Use generic profile routing
            from_profile_id: myProfileId,
            from_profile_type: this.userRole,
            to_profile_id: participantId,
            to_profile_type: participantRole,
            // Legacy fields for backward compatibility
            from_student_profile_id: this.userRole === 'student' ? myProfileId : null,
            from_tutor_profile_id: this.userRole === 'tutor' ? myProfileId : null,
            to_student_profile_id: participantRole === 'student' ? participantId : null,
            to_tutor_profile_id: participantRole === 'tutor' ? participantId : null
        };

        this.ws.send(JSON.stringify(message));
    }

    /**
     * Display remote video for a specific participant in multi-party call
     * @param {number} participantId - Participant's profile ID
     * @param {string} participantRole - Participant's role
     * @param {MediaStream} stream - The remote media stream
     */
    displayRemoteVideoForParticipant(participantId, participantRole, stream) {
        console.log(`📹 Displaying video for ${participantRole} ${participantId}`);

        // Find the placeholder for this participant
        const placeholder = document.querySelector(`.student-video-placeholder[data-participant-id="${participantId}"]`);

        if (!placeholder) {
            console.log(`📹 No placeholder found for participant ${participantId}, creating one`);
            this.createParticipantPlaceholder(participantId, participantRole, stream);
            return;
        }

        // Create video element for remote stream
        let remoteVideo = placeholder.querySelector('video.remote-video');
        if (!remoteVideo) {
            remoteVideo = document.createElement('video');
            remoteVideo.className = 'remote-video';
            remoteVideo.autoplay = true;
            remoteVideo.playsInline = true;
            remoteVideo.muted = false;
            remoteVideo.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 10px;
                position: absolute;
                top: 0;
                left: 0;
                z-index: 5;
            `;

            placeholder.style.position = 'relative';
            placeholder.insertBefore(remoteVideo, placeholder.firstChild);
        }

        remoteVideo.srcObject = stream;

        // Hide avatar when video is playing
        const imgAvatar = placeholder.querySelector('.student-avatar');
        const initialsAvatar = placeholder.querySelector('.initials-avatar');
        const name = placeholder.querySelector('.student-name');
        const status = placeholder.querySelector('.student-status');

        if (imgAvatar) imgAvatar.style.display = 'none';
        if (initialsAvatar) initialsAvatar.style.display = 'none';
        if (name) name.style.cssText = 'position: absolute; bottom: 8px; left: 8px; z-index: 10; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 4px; color: white; font-size: 0.75rem;';
        if (status) status.style.cssText = 'position: absolute; top: 8px; right: 8px; z-index: 10;';

        // Update placeholder styling to show connected
        placeholder.classList.remove('calling');
        placeholder.classList.add('connected');
        placeholder.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.5)'; // Green glow for connected

        // Remove cancel button and add remove button for connected participants
        const cancelBtn = placeholder.querySelector('.cancel-call-btn');
        if (cancelBtn) cancelBtn.remove();

        // Add remove participant button if not already there and we have multiple participants
        if (!placeholder.querySelector('.remove-participant-btn') && this.selectedParticipants.length > 1) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-participant-btn';
            removeBtn.title = 'Remove from call';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeParticipant(participantId);
            });
            placeholder.appendChild(removeBtn);
        }

        // Show video controls on participant card
        this.showParticipantVideoControls(placeholder);

        console.log(`📹 Remote video displayed for ${participantRole} ${participantId}`);
    }

    /**
     * Create a new participant placeholder in the video grid for multi-party call
     * @param {number} participantId - Participant's profile ID
     * @param {string} participantRole - Participant's role
     * @param {MediaStream} stream - The remote media stream
     */
    createParticipantPlaceholder(participantId, participantRole, stream) {
        const videoGrid = document.getElementById('studentVideoGrid');
        if (!videoGrid) return;

        // Find participant info from selected participants
        const participant = this.selectedParticipants.find(p => p.id === participantId) ||
                          { id: participantId, role: participantRole, name: participantRole };

        const placeholder = document.createElement('div');
        placeholder.className = 'student-video-placeholder connected';
        placeholder.dataset.participantId = participantId;
        placeholder.dataset.participantRole = participantRole;
        placeholder.style.cssText = 'position: relative; box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);';

        placeholder.innerHTML = `
            <span class="student-status connected"></span>
            <span class="student-name" style="position: absolute; bottom: 8px; left: 8px; z-index: 10; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 4px; color: white; font-size: 0.75rem;">
                ${participant.name || participantRole}
            </span>
        `;

        // Create and add video element
        const remoteVideo = document.createElement('video');
        remoteVideo.className = 'remote-video';
        remoteVideo.autoplay = true;
        remoteVideo.playsInline = true;
        remoteVideo.muted = false;
        remoteVideo.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 10px;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 5;
        `;
        remoteVideo.srcObject = stream;

        placeholder.insertBefore(remoteVideo, placeholder.firstChild);
        videoGrid.appendChild(placeholder);

        // Show video controls
        this.showParticipantVideoControls(placeholder);
    }

    /**
     * Check if all invited participants are connected (multi-party)
     */
    checkAllParticipantsConnected() {
        const expectedCount = this.selectedParticipants.length || 1;
        const connectedCount = this.connectedParticipants.length;

        console.log(`📹 Connected ${connectedCount}/${expectedCount} participants`);

        if (connectedCount > 0 && !this.isVideoSessionActive) {
            // At least one participant connected - start the call
            this.onCallConnected();
        }

        if (connectedCount === expectedCount) {
            this.showNotification(`All ${expectedCount} participants connected!`, 'success');
        }
    }

    /**
     * Handle participant disconnect in multi-party call
     * @param {number} participantId - Disconnected participant's profile ID
     * @param {string} participantRole - Disconnected participant's role
     */
    handleParticipantDisconnect(participantId, participantRole) {
        // Close and remove peer connection
        const pc = this.peerConnections.get(participantId);
        if (pc) {
            pc.close();
            this.peerConnections.delete(participantId);
        }

        // Remove remote stream
        this.remoteStreams.delete(participantId);

        // Update placeholder UI
        const placeholder = document.querySelector(`.student-video-placeholder[data-participant-id="${participantId}"]`);
        if (placeholder) {
            const remoteVideo = placeholder.querySelector('video.remote-video');
            if (remoteVideo) remoteVideo.remove();

            // Restore avatar
            const imgAvatar = placeholder.querySelector('.student-avatar');
            const initialsAvatar = placeholder.querySelector('.initials-avatar');
            if (imgAvatar) imgAvatar.style.display = '';
            if (initialsAvatar) initialsAvatar.style.display = '';

            placeholder.classList.remove('connected', 'calling');
            placeholder.style.boxShadow = '';
        }

        // If no participants left, end the session
        if (this.connectedParticipants.length === 0 && this.peerConnections.size === 0) {
            this.showNotification('All participants disconnected. Call ended.', 'info');
            this.endVideoSession(false);
        }
    }

    /**
     * Display remote video stream in the participant placeholder
     * Host placeholder = You (local camera)
     * Participant placeholder = The other person (remote video)
     */
    displayRemoteVideo() {
        const participantPlaceholder = document.querySelector('.student-video-placeholder.selected');
        if (!participantPlaceholder || !this.remoteStream) {
            console.log('📹 displayRemoteVideo: No participant placeholder or stream', {
                hasPlaceholder: !!participantPlaceholder,
                hasStream: !!this.remoteStream
            });
            return;
        }

        console.log('📹 Displaying remote video in participant placeholder');

        // Create video element for remote stream
        let remoteVideo = participantPlaceholder.querySelector('video.remote-video');
        if (!remoteVideo) {
            remoteVideo = document.createElement('video');
            remoteVideo.className = 'remote-video';
            remoteVideo.autoplay = true;
            remoteVideo.playsInline = true;
            remoteVideo.muted = false; // Ensure audio is enabled
            remoteVideo.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 10px;
                position: absolute;
                top: 0;
                left: 0;
                z-index: 5;
            `;

            participantPlaceholder.style.position = 'relative';
            participantPlaceholder.insertBefore(remoteVideo, participantPlaceholder.firstChild);
        }

        remoteVideo.srcObject = this.remoteStream;

        // Hide avatar when video is playing
        const imgAvatar = participantPlaceholder.querySelector('.student-avatar');
        const initialsAvatar = participantPlaceholder.querySelector('.initials-avatar');
        const name = participantPlaceholder.querySelector('.student-name');
        const status = participantPlaceholder.querySelector('.student-status');

        if (imgAvatar) imgAvatar.style.display = 'none';
        if (initialsAvatar) initialsAvatar.style.display = 'none';
        if (name) name.style.cssText = 'position: absolute; bottom: 8px; left: 8px; z-index: 10; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 4px; color: white; font-size: 0.75rem;';
        if (status) status.style.cssText = 'position: absolute; top: 8px; right: 8px; z-index: 10;';

        console.log('📹 Remote video element created and stream attached');

        // Show video controls on participant card
        this.showParticipantVideoControls(participantPlaceholder);
    }

    /**
     * Show video controls on the host (You) card
     */
    showVideoControls() {
        const hostControls = document.getElementById('hostVideoControls');
        if (hostControls) {
            hostControls.style.display = 'flex';
        }
        console.log('📹 Video controls shown');
    }

    /**
     * Hide video controls on the host (You) card
     */
    hideVideoControls() {
        const hostControls = document.getElementById('hostVideoControls');
        if (hostControls) {
            hostControls.style.display = 'none';
        }
        console.log('📹 Video controls hidden');
    }

    /**
     * Show video controls on participant card (dynamically add if not present)
     * Includes toggle buttons to mute participant's audio/video locally (for current user only)
     */
    showParticipantVideoControls(participantPlaceholder) {
        if (!participantPlaceholder) return;

        const participantId = participantPlaceholder.dataset.participantId;

        // Check if controls already exist
        let controls = participantPlaceholder.querySelector('.video-controls.participant-controls');
        if (!controls) {
            // Create controls with both audio and video toggle buttons
            controls = document.createElement('div');
            controls.className = 'video-controls participant-controls';
            controls.innerHTML = `
                <button class="video-control-btn participant-audio-toggle" data-participant-id="${participantId}" data-muted="false" title="Mute participant audio (for you only)">
                    <i class="fas fa-volume-up"></i>
                </button>
                <button class="video-control-btn participant-video-toggle" data-participant-id="${participantId}" data-hidden="false" title="Hide participant video (for you only)">
                    <i class="fas fa-video"></i>
                </button>
            `;
            participantPlaceholder.appendChild(controls);

            // Add event listeners for the toggle buttons
            const audioToggle = controls.querySelector('.participant-audio-toggle');
            const videoToggle = controls.querySelector('.participant-video-toggle');

            audioToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleParticipantAudio(participantPlaceholder, participantId);
            });

            videoToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleParticipantVideo(participantPlaceholder, participantId);
            });
        }
        controls.style.display = 'flex';
    }

    /**
     * Toggle participant's audio locally (mute/unmute for current user only)
     * This does NOT affect what other participants hear
     */
    toggleParticipantAudio(placeholder, participantId) {
        const remoteVideo = placeholder.querySelector('video.remote-video');
        const audioToggle = placeholder.querySelector('.participant-audio-toggle');

        if (!remoteVideo || !audioToggle) return;

        const isMuted = audioToggle.dataset.muted === 'true';

        if (isMuted) {
            // Unmute
            remoteVideo.muted = false;
            audioToggle.dataset.muted = 'false';
            audioToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
            audioToggle.title = 'Mute participant audio (for you only)';
            audioToggle.classList.remove('muted');
            console.log(`🔊 Unmuted audio for participant ${participantId}`);
        } else {
            // Mute
            remoteVideo.muted = true;
            audioToggle.dataset.muted = 'true';
            audioToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
            audioToggle.title = 'Unmute participant audio';
            audioToggle.classList.add('muted');
            console.log(`🔇 Muted audio for participant ${participantId}`);
        }
    }

    /**
     * Toggle participant's video locally (show/hide for current user only)
     * This does NOT affect what other participants see
     * Uses opacity instead of display to keep layout stable (same as host toggle)
     */
    toggleParticipantVideo(placeholder, participantId) {
        const remoteVideo = placeholder.querySelector('video.remote-video');
        const videoToggle = placeholder.querySelector('.participant-video-toggle');
        const avatar = placeholder.querySelector('.student-avatar');
        const initialsAvatar = placeholder.querySelector('.initials-avatar');

        // Only require videoToggle to exist, remoteVideo may not exist yet
        if (!videoToggle) return;

        const isHidden = videoToggle.dataset.hidden === 'true';

        if (isHidden) {
            // Show video (use opacity like host toggle)
            if (remoteVideo) remoteVideo.style.opacity = '1';
            videoToggle.dataset.hidden = 'false';
            videoToggle.innerHTML = '<i class="fas fa-video"></i>';
            videoToggle.title = 'Hide participant video (for you only)';
            videoToggle.classList.remove('video-off');
            // Hide avatars when video is shown (only if video exists)
            if (remoteVideo) {
                if (avatar) avatar.style.display = 'none';
                if (initialsAvatar) initialsAvatar.style.display = 'none';
            }
            console.log(`📹 Showing video for participant ${participantId}`);
        } else {
            // Hide video (use opacity like host toggle)
            if (remoteVideo) remoteVideo.style.opacity = '0';
            videoToggle.dataset.hidden = 'true';
            videoToggle.innerHTML = '<i class="fas fa-video-slash"></i>';
            videoToggle.title = 'Show participant video';
            videoToggle.classList.add('video-off');
            // Show avatars when video is hidden
            if (avatar) avatar.style.display = '';
            if (initialsAvatar) initialsAvatar.style.display = '';
            console.log(`📹 Hiding video for participant ${participantId}`);
        }
    }

    /**
     * Toggle local audio (mute/unmute microphone)
     */
    toggleAudio() {
        if (!this.localStream) return;

        const audioTracks = this.localStream.getAudioTracks();
        const micBtn = document.getElementById('toggleMicBtn');

        if (audioTracks.length === 0) {
            console.log('📹 No audio tracks found');
            return;
        }

        this.isAudioMuted = !this.isAudioMuted;
        audioTracks.forEach(track => {
            track.enabled = !this.isAudioMuted;
        });

        // Update button appearance
        if (micBtn) {
            if (this.isAudioMuted) {
                micBtn.classList.add('muted');
                micBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                micBtn.title = 'Unmute';
            } else {
                micBtn.classList.remove('muted');
                micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                micBtn.title = 'Mute';
            }
        }

        console.log(`📹 Audio ${this.isAudioMuted ? 'muted' : 'unmuted'}`);
        this.showNotification(this.isAudioMuted ? 'Muted' : 'Unmuted', 'info');
    }

    /**
     * Toggle local video (show/hide camera)
     */
    toggleVideo() {
        if (!this.localStream) return;

        const videoTracks = this.localStream.getVideoTracks();
        const cameraBtn = document.getElementById('toggleCameraBtn');

        if (videoTracks.length === 0) {
            console.log('📹 No video tracks found');
            return;
        }

        this.isVideoHidden = !this.isVideoHidden;
        videoTracks.forEach(track => {
            track.enabled = !this.isVideoHidden;
        });

        // Update button appearance
        if (cameraBtn) {
            if (this.isVideoHidden) {
                cameraBtn.classList.add('camera-off');
                cameraBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
                cameraBtn.title = 'Show Video';
            } else {
                cameraBtn.classList.remove('camera-off');
                cameraBtn.innerHTML = '<i class="fas fa-video"></i>';
                cameraBtn.title = 'Hide Video';
            }
        }

        // Toggle local video visibility
        const hostPlaceholder = document.getElementById('tutorVideoPlaceholder');
        const localVideo = hostPlaceholder?.querySelector('video.local-video');
        if (localVideo) {
            localVideo.style.opacity = this.isVideoHidden ? '0' : '1';
        }

        // Show avatar when video is hidden
        const avatar = hostPlaceholder?.querySelector('.video-avatar');
        const initialsAvatar = hostPlaceholder?.querySelector('.initials-avatar');
        if (this.isVideoHidden) {
            if (avatar) avatar.style.display = '';
            if (initialsAvatar) initialsAvatar.style.display = '';
        } else {
            if (avatar) avatar.style.display = 'none';
            if (initialsAvatar) initialsAvatar.style.display = 'none';
        }

        console.log(`📹 Video ${this.isVideoHidden ? 'hidden' : 'shown'}`);
        this.showNotification(this.isVideoHidden ? 'Camera off' : 'Camera on', 'info');
    }

    /**
     * Start call duration timer in the modal header
     * This is the main session timer that runs during active video calls
     */
    startCallDurationTimer() {
        this.callStartTime = Date.now();
        this.sessionStartTime = new Date(); // Also set for compatibility with timed events

        // Clear any existing intervals
        if (this.callDurationInterval) {
            clearInterval(this.callDurationInterval);
        }
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        // Reset popup tracking for new session
        this.shownPopups.clear();

        const timerElement = document.getElementById('sessionTimer');

        this.callDurationInterval = setInterval(() => {
            const elapsed = Date.now() - this.callStartTime;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);

            const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            if (timerElement) {
                timerElement.textContent = timeStr;
            }

            // Check for timed events (ad panel at 28 min, pop-ups at specific times)
            this.checkTimedEvents(minutes, seconds);
        }, 1000);

        console.log('📹 Call duration timer started');
    }

    /**
     * Stop call duration timer
     */
    stopCallDurationTimer() {
        if (this.callDurationInterval) {
            clearInterval(this.callDurationInterval);
            this.callDurationInterval = null;
        }
        this.callStartTime = null;

        // Reset timer display
        const timerElement = document.getElementById('sessionTimer');
        if (timerElement) {
            timerElement.textContent = '00:00:00';
        }

        console.log('📹 Call duration timer stopped');
    }

    /**
     * Reset video control states (called when ending call)
     */
    resetVideoControlStates() {
        // Reset mute state
        this.isAudioMuted = false;
        this.isVideoHidden = false;
        this.isCallPending = false;

        // Reset button appearances
        const micBtn = document.getElementById('toggleMicBtn');
        const cameraBtn = document.getElementById('toggleCameraBtn');

        if (micBtn) {
            micBtn.classList.remove('muted');
            micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            micBtn.title = 'Toggle Microphone';
        }

        if (cameraBtn) {
            cameraBtn.classList.remove('camera-off');
            cameraBtn.innerHTML = '<i class="fas fa-video"></i>';
            cameraBtn.title = 'Toggle Camera';
        }
    }

    /**
     * Called when the video call is successfully connected
     * Updates UI and starts the call duration timer
     */
    async onCallConnected() {
        console.log('🔔 DEBUG: onCallConnected() CALLED - BUTTON SHOULD CHANGE TO END/LEAVE SESSION');
        this.showNotification('Video call connected!', 'success');

        // Mark call as no longer pending
        this.isCallPending = false;
        this.isVideoSessionActive = true;

        // Determine button text based on role and participant count
        // Host (tutor): Always "End Session"
        // Participants with 2 people total: "End Session"
        // Participants with 3+ people: "Leave Session"
        const buttonText = this.getSessionButtonText();

        const startBtn = document.getElementById('startVideoSessionBtn');
        console.log('🔔 DEBUG: startBtn element:', startBtn);
        if (startBtn) {
            startBtn.classList.remove('pending');
            startBtn.classList.add('active');
            startBtn.innerHTML = `<i class="fas fa-phone-slash"></i> ${buttonText}`;
            console.log(`🔔 DEBUG: Button updated to ${buttonText}`);
        } else {
            console.log('🔔 DEBUG: ERROR - startVideoSessionBtn not found!');
        }

        // Show video controls on all participant placeholders
        const participantPlaceholders = document.querySelectorAll('.student-video-placeholder');
        participantPlaceholders.forEach(placeholder => {
            this.showParticipantVideoControls(placeholder);
        });
        console.log(`📹 Video controls added to ${participantPlaceholders.length} participant(s)`);

        // Show "Add Participant" button for host
        this.showAddParticipantButton();

        // Hide rejoin button (in case this is a reconnection)
        this.hideRejoinButton();
        this.canRejoinSession = false;

        // Start the call duration timer
        this.startCallDurationTimer();

        // Show permission indicator for participants (students)
        // This allows them to request interaction permission from the host
        this.updatePermissionIndicator();

        // Create call history record for each callee
        await this.createCallHistoryRecords();

        // Handle session creation differently based on role
        if (this.isSessionHost) {
            // HOST: Create a fresh session for new calls
            // Clear any existing session state and canvas to start fresh
            // History should only be loaded explicitly by clicking on history cards
            this.currentSession = null;
            this.resetCanvasForNewCall();
            await this.findOrCreateSession();
            console.log('📞 Host call connected - fresh session created');
        } else {
            // PARTICIPANT: Join the existing session created by host
            // Do NOT reset the canvas - load session data from host instead
            await this.findOrCreateSession();
            // Load the session to get any existing strokes from the host
            if (this.currentSession?.id) {
                await this.loadSession(this.currentSession.id);
                console.log('📞 Participant call connected - joined existing session, loaded canvas data');
            } else {
                console.log('📞 Participant call connected - waiting for session');
            }
        }
    }

    /**
     * Create call history records for all participants in the call
     */
    async createCallHistoryRecords() {
        // Only create records if we don't already have one (prevent duplicates on reconnect)
        if (this.currentCallId) {
            console.log('📝 Call history already exists, skipping creation');
            return;
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                console.warn('No auth token for call history');
                return;
            }

            // Determine callees based on selected participants or single callee
            const callees = [];

            if (this.selectedParticipants && this.selectedParticipants.length > 0) {
                // Multi-party call
                for (const participant of this.selectedParticipants) {
                    callees.push({
                        profile_id: participant.id,
                        profile_type: participant.role,
                        name: participant.name,
                        avatar: participant.avatar
                    });
                }
            } else if (this.userRole === 'tutor' && this.selectedStudentId) {
                // Tutor calling single student
                const student = this.enrolledStudents.find(s => s.student_profile_id === this.selectedStudentId || s.id === this.selectedStudentId);
                callees.push({
                    profile_id: this.selectedStudentId,
                    profile_type: 'student',
                    name: student?.student_name || student?.name || 'Student',
                    avatar: student?.student_photo || student?.avatar
                });
            } else if (this.userRole === 'student' && this.selectedTutorId) {
                // Student calling tutor
                const tutor = this.enrolledTutors.find(t => t.tutor_profile_id === this.selectedTutorId || t.id === this.selectedTutorId);
                callees.push({
                    profile_id: this.selectedTutorId,
                    profile_type: 'tutor',
                    name: tutor?.tutor_name || tutor?.name || 'Tutor',
                    avatar: tutor?.tutor_photo || tutor?.avatar
                });
            } else if (this.remotePeerInfo) {
                // Incoming call that was accepted
                const isFromTutor = !!this.remotePeerInfo.from_tutor_profile_id;
                callees.push({
                    profile_id: isFromTutor ? this.remotePeerInfo.from_tutor_profile_id : this.remotePeerInfo.from_student_profile_id,
                    profile_type: isFromTutor ? 'tutor' : 'student',
                    name: this.remotePeerInfo.caller_name || (isFromTutor ? 'Tutor' : 'Student'),
                    avatar: this.remotePeerInfo.caller_avatar
                });
            }

            if (callees.length === 0) {
                console.warn('No callees identified for call history');
                return;
            }

            // Store callees for later reference
            this.callHistoryCallees = callees;

            // Create call history for first callee (primary record)
            const primaryCallee = callees[0];
            const response = await fetch(`${this.API_BASE}/call-history`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    callee_profile_id: primaryCallee.profile_id,
                    callee_profile_type: primaryCallee.profile_type,
                    callee_name: primaryCallee.name,
                    callee_avatar: primaryCallee.avatar,
                    call_type: 'video',
                    whiteboard_session_id: this.currentSession?.id,
                    tutor_package_name: this.currentSession?.session_title,
                    is_multi_party: callees.length > 1
                })
            });

            const data = await response.json();
            if (data.success) {
                this.currentCallId = data.call_id;
                console.log(`📝 Call history created: ID ${this.currentCallId}`);
            } else {
                console.error('Failed to create call history:', data);
            }

        } catch (error) {
            console.error('Error creating call history:', error);
        }
    }

    /**
     * End call history record with canvas snapshot
     * Called when the video session ends
     */
    async endCallHistoryWithCanvas() {
        if (!this.currentCallId) {
            console.log('📝 No call history to end');
            return;
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                console.warn('No auth token for ending call history');
                return;
            }

            // Calculate call duration in seconds
            let durationSeconds = 0;
            if (this.callStartTime) {
                durationSeconds = Math.round((Date.now() - this.callStartTime) / 1000);
            }

            // Capture current canvas state as base64 image
            let canvasSnapshot = null;
            if (this.canvas) {
                try {
                    const imageData = this.canvas.toDataURL('image/png');
                    canvasSnapshot = {
                        imageData: imageData,
                        pageCount: this.pages ? this.pages.length : 1,
                        currentPageId: this.currentPage?.id,
                        canvasWidth: this.canvas.width,
                        canvasHeight: this.canvas.height,
                        timestamp: new Date().toISOString()
                    };
                    console.log('📸 Canvas snapshot captured');
                } catch (canvasError) {
                    console.warn('Could not capture canvas:', canvasError);
                }
            }

            // Update call history with end time, duration, and canvas snapshot
            const response = await fetch(`${this.API_BASE}/call-history/${this.currentCallId}/end`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    duration_seconds: durationSeconds,
                    canvas_snapshot: canvasSnapshot
                })
            });

            const data = await response.json();
            if (data.success) {
                console.log(`📝 Call history ended: ID ${this.currentCallId}, duration: ${durationSeconds}s, canvas saved: ${data.canvas_saved}`);
            } else {
                console.error('Failed to end call history:', data);
            }

            // Clear call ID after successful update
            this.currentCallId = null;
            this.callHistoryCallees = [];

        } catch (error) {
            console.error('Error ending call history:', error);
            // Clear call ID anyway to prevent stuck state
            this.currentCallId = null;
            this.callHistoryCallees = [];
        }
    }

    /**
     * Get the appropriate session button text based on user role and participant count
     * - Host (tutor): Always "End Session" (ends call for everyone)
     * - 2 participants total: "End Session" (ends call)
     * - 3+ participants: "Leave Session" (only current user leaves, call continues)
     */
    getSessionButtonText() {
        // Host (tutor) always sees "End Session"
        if (this.userRole === 'tutor') {
            return 'End Session';
        }

        // Calculate total participants (including self)
        const totalParticipants = this.getTotalParticipantCount();

        // 2 participants = "End Session", 3+ = "Leave Session"
        if (totalParticipants <= 2) {
            return 'End Session';
        } else {
            return 'Leave Session';
        }
    }

    /**
     * Get total participant count in the current call (including self)
     * Uses connectedParticipants for accurate real-time count
     */
    getTotalParticipantCount() {
        // Count connected participants + self (host counts as 1)
        // connectedParticipants is updated when someone joins or leaves
        const connectedCount = this.connectedParticipants?.length || 0;

        // Total = connected participants + self
        // For a call with 1 host + 2 participants: connectedCount=2, total=3
        // When one leaves: connectedCount=1, total=2
        return connectedCount + 1;
    }

    /**
     * Send call invitation via WebSocket (works for both tutor→student and student→tutor)
     * Uses profile IDs for routing (e.g., to_student_profile_id, to_tutor_profile_id)
     */
    sendCallInvitation() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const invitation = {
                type: 'video_call_invitation',
                session_id: this.currentSession?.id,
                from_role: this.userRole
            };

            // Add caller info based on role - using PROFILE IDs
            // Note: Backend returns student_profile_id/tutor_profile_id, not just "id"
            if (this.userRole === 'student') {
                invitation.to_tutor_profile_id = this.selectedTutorId;
                invitation.from_student_profile_id = this.studentInfo?.student_profile_id || this.studentInfo?.id;
                invitation.caller_name = this.studentInfo?.name || 'Student';
            } else {
                invitation.to_student_profile_id = this.selectedStudentId;
                invitation.from_tutor_profile_id = this.tutorInfo?.tutor_profile_id || this.tutorInfo?.id;
                invitation.caller_name = this.tutorInfo?.name || 'Tutor';
            }

            console.log('📞 Sending call invitation:', invitation);
            this.ws.send(JSON.stringify(invitation));
        } else {
            console.log('WebSocket not connected - call invitation will be sent when recipient opens whiteboard');
        }
    }

    /**
     * Send video offer to remote peer via WebSocket
     * Uses profile IDs for routing
     */
    sendVideoOffer(offer) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = {
                type: 'video_offer',
                offer: offer,
                from_role: this.userRole
            };

            // Use profile IDs for routing
            // Note: Backend returns student_profile_id/tutor_profile_id, not just "id"
            if (this.userRole === 'student') {
                message.to_tutor_profile_id = this.selectedTutorId;
                message.from_student_profile_id = this.studentInfo?.student_profile_id || this.studentInfo?.id;
            } else {
                message.to_student_profile_id = this.selectedStudentId;
                message.from_tutor_profile_id = this.tutorInfo?.tutor_profile_id || this.tutorInfo?.id;
            }

            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Send ICE candidate to remote peer via WebSocket
     * Uses profile IDs for routing
     */
    sendIceCandidate(candidate) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = {
                type: 'ice_candidate',
                candidate: candidate,
                from_role: this.userRole
            };

            // Add sender's profile ID for routing responses
            if (this.userRole === 'student') {
                message.from_student_profile_id = this.studentInfo?.student_profile_id || this.studentInfo?.id;
                message.to_tutor_profile_id = this.selectedTutorId;
            } else {
                message.from_tutor_profile_id = this.tutorInfo?.tutor_profile_id || this.tutorInfo?.id;
                message.to_student_profile_id = this.selectedStudentId;
            }

            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Handle incoming video answer from participant
     * @param {Object} data - Contains answer and participant info
     */
    async handleVideoAnswer(data) {
        const answer = data.answer;

        // For multi-party calls, route answer to correct peer connection
        if (data.is_multi_party || this.peerConnections.size > 0) {
            // Determine which participant sent this answer
            const participantId = data.from_student_profile_id || data.from_tutor_profile_id;

            if (participantId && this.peerConnections.has(participantId)) {
                const pc = this.peerConnections.get(participantId);
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                console.log(`📹 Video answer received and set for participant ${participantId}`);
                return;
            }
        }

        // Legacy single-peer handling
        if (this.peerConnection) {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('📹 Video answer received and set (legacy single-peer)');
        }
    }

    /**
     * Handle incoming ICE candidate from remote peer
     * @param {Object} data - Contains candidate and participant info
     */
    async handleRemoteIceCandidate(data) {
        const candidate = data.candidate;

        // For multi-party calls, route ICE candidate to correct peer connection
        if (data.is_multi_party || this.peerConnections.size > 0) {
            // Determine which participant sent this candidate
            const participantId = data.from_student_profile_id || data.from_tutor_profile_id;

            if (participantId && this.peerConnections.has(participantId)) {
                const pc = this.peerConnections.get(participantId);
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                console.log(`🧊 Remote ICE candidate added for participant ${participantId}`);
                return;
            }
        }

        // Legacy single-peer handling
        if (this.peerConnection) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('🧊 Remote ICE candidate added (legacy single-peer)');
        }
    }

    /**
     * Handle incoming video call invitation (works for both tutor and student receivers)
     * @param {Object} invitation - The call invitation data
     */
    handleIncomingCallInvitation(invitation) {
        console.log('📞 Incoming call invitation:', invitation);

        this.pendingCallInvitation = invitation;

        // Determine caller name based on who is calling
        const callerName = invitation.caller_name ||
            (invitation.from_role === 'student' ? 'Student' : 'Tutor');

        // Multi-party call info
        const isMultiParty = invitation.is_multi_party;
        const participantCount = invitation.participant_count || 1;

        // Update button to show incoming call with Accept and Reject options
        const startBtn = document.getElementById('startVideoSessionBtn');
        if (startBtn) {
            startBtn.classList.add('incoming-call');
            startBtn.innerHTML = '<i class="fas fa-phone-alt fa-shake"></i> Accept';
            startBtn.title = isMultiParty
                ? `Incoming group call from ${callerName} (${participantCount} participants)`
                : `Accept call from ${callerName}`;

            // Add reject button if it doesn't exist
            let rejectBtn = document.getElementById('rejectCallBtn');
            if (!rejectBtn) {
                rejectBtn = document.createElement('button');
                rejectBtn.id = 'rejectCallBtn';
                rejectBtn.className = 'reject-call-btn';
                rejectBtn.innerHTML = '<i class="fas fa-phone-slash"></i> Reject';
                rejectBtn.title = 'Reject incoming call';
                // Use arrow function to preserve 'this' context
                const self = this;
                rejectBtn.onclick = () => {
                    console.log('🔴 Reject button clicked');
                    self.declineIncomingCall();
                };
                // Insert reject button after the start/accept button
                startBtn.parentNode.insertBefore(rejectBtn, startBtn.nextSibling);
            }
            rejectBtn.style.display = 'inline-flex';
        }

        // Show notification
        const notificationText = isMultiParty
            ? `Incoming group call from ${callerName} (${participantCount} participants)!`
            : `Incoming video call from ${callerName}!`;
        this.showNotification(notificationText, 'info');

        // Play ringtone sound (optional)
        this.playRingtone();

        // Auto-decline after 60 seconds if not answered
        this.callTimeout = setTimeout(() => {
            if (this.pendingCallInvitation) {
                this.declineIncomingCall();
                this.showNotification('Missed call - invitation expired', 'warning');
            }
        }, 60000);
    }

    /**
     * Handle incoming video offer (WebRTC offer from caller)
     * @param {Object} data - Contains the offer and caller info (using profile IDs)
     */
    handleIncomingVideoOffer(data) {
        console.log('📹 Incoming video offer:', data);
        console.log('📹 Offer data - from_role:', data.from_role,
                    'from_tutor_profile_id:', data.from_tutor_profile_id,
                    'from_student_profile_id:', data.from_student_profile_id);

        this.pendingOffer = data.offer;
        this.pendingCallInvitation = {
            ...this.pendingCallInvitation,
            from_tutor_profile_id: data.from_tutor_profile_id,
            from_student_profile_id: data.from_student_profile_id,
            from_role: data.from_role
        };

        console.log('📹 Updated pendingCallInvitation:', this.pendingCallInvitation);
    }

    /**
     * Accept incoming call invitation (for student/receiver)
     */
    async acceptIncomingCall() {
        if (!this.pendingCallInvitation) {
            this.showNotification('No incoming call to accept', 'warning');
            return;
        }

        const startBtn = document.getElementById('startVideoSessionBtn');

        try {
            // Clear timeout
            if (this.callTimeout) {
                clearTimeout(this.callTimeout);
                this.callTimeout = null;
            }

            // Stop ringtone
            this.stopRingtone();

            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
            startBtn.classList.remove('incoming-call');

            // Hide reject button when call is accepted
            const rejectBtn = document.getElementById('rejectCallBtn');
            if (rejectBtn) {
                rejectBtn.style.display = 'none';
            }

            // Request camera and microphone access
            this.localStream = await navigator.mediaDevices.getUserMedia({
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

            // Display local video
            this.displayLocalVideo();

            // Show video controls
            this.showVideoControls();

            // Mark this user as NOT the host (they're accepting, not initiating)
            this.isSessionHost = false;
            // Reset permissions - participant starts with no permissions until host grants them
            this.permissions = { can_draw: false, can_write: false, can_erase: false };
            // Update toolbar to reflect no permissions
            this.updateToolbarPermissions();
            console.log('📋 Accepting call as PARTICIPANT - no permissions until granted');

            // Switch to Live Video panel to show the call
            this.switchRightSidebarPanel('live');

            // Store remote peer info BEFORE setting up peer connection
            // This is needed for ICE candidate routing
            if (this.pendingCallInvitation) {
                this.remotePeerInfo = {
                    from_role: this.pendingCallInvitation.from_role,
                    from_tutor_profile_id: this.pendingCallInvitation.from_tutor_profile_id,
                    from_student_profile_id: this.pendingCallInvitation.from_student_profile_id,
                    is_multi_party: this.pendingCallInvitation.is_multi_party || false
                };
                console.log('📹 Stored remote peer info before peer connection:', this.remotePeerInfo);

                // Store host info (the caller is the host)
                // Used for permission requests
                // ✨ ROLE-AGNOSTIC: Use from_profile_id/from_profile_type if available, fallback to legacy
                const callerProfileId = this.pendingCallInvitation.from_profile_id
                    || this.pendingCallInvitation.from_tutor_profile_id
                    || this.pendingCallInvitation.from_student_profile_id;
                const callerProfileType = this.pendingCallInvitation.from_profile_type
                    || this.pendingCallInvitation.from_role;

                this.hostPeerInfo = {
                    profile_type: callerProfileType,
                    profile_id: callerProfileId
                };
                console.log('📹 Stored host peer info:', this.hostPeerInfo);

                // IMPORTANT: Set other party using role-agnostic method
                // This ensures all routing works correctly
                if (callerProfileId && callerProfileType) {
                    this.setOtherParty(
                        callerProfileId,
                        callerProfileType,
                        this.pendingCallInvitation.caller_name,
                        this.pendingCallInvitation.caller_avatar
                    );
                    console.log('📹 Set other party from incoming call:', this.getOtherParty());
                }
            }

            // Set up peer connection and create answer
            await this.setupPeerConnectionAsReceiver();

            // Update UI state
            this.isVideoSessionActive = true;
            startBtn.disabled = false;
            startBtn.classList.add('active');

            // Determine button text based on role and participant count
            const buttonText = this.getSessionButtonText();
            startBtn.innerHTML = `<i class="fas fa-phone-slash"></i> ${buttonText}`;

            // Update video placeholder styling based on caller role and show video controls
            if (this.remotePeerInfo?.from_role === 'student') {
                // We are tutor receiving from student - highlight student placeholder
                const studentPlaceholder = document.querySelector('.student-video-placeholder.selected');
                if (studentPlaceholder) {
                    studentPlaceholder.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
                    // Show video controls on participant card when accepting call
                    this.showParticipantVideoControls(studentPlaceholder);
                }
            } else {
                // We are student receiving from tutor - highlight tutor placeholder
                const tutorPlaceholder = document.getElementById('tutorVideoPlaceholder');
                if (tutorPlaceholder) {
                    tutorPlaceholder.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.5)';
                }
            }

            // Show video controls on all participant placeholders
            const allParticipantPlaceholders = document.querySelectorAll('.student-video-placeholder');
            allParticipantPlaceholders.forEach(placeholder => {
                this.showParticipantVideoControls(placeholder);
            });

            this.showNotification('Call connected!', 'success');
            console.log('📹 Call accepted and connected');

            // Clear pending invitation (remote peer info is preserved in this.remotePeerInfo)
            this.pendingCallInvitation = null;
            this.pendingOffer = null;

        } catch (error) {
            console.error('Error accepting call:', error);
            startBtn.disabled = false;
            startBtn.classList.remove('incoming-call');
            startBtn.innerHTML = '<i class="fas fa-video"></i> Start Session';

            if (error.name === 'NotAllowedError') {
                this.showNotification('Camera/microphone access denied. Please allow access to join the call.', 'error');
            } else {
                this.showNotification('Failed to join call: ' + error.message, 'error');
            }

            // Clear pending state
            this.pendingCallInvitation = null;
            this.pendingOffer = null;
        }
    }

    /**
     * Set up peer connection as the receiver (answering a call)
     * Supports both single-party and multi-party calls
     */
    async setupPeerConnectionAsReceiver() {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };

        // Get caller's profile ID for multi-party support
        const callerProfileId = this.pendingCallInvitation?.from_tutor_profile_id ||
                               this.pendingCallInvitation?.from_student_profile_id;
        const callerRole = this.pendingCallInvitation?.from_role || 'tutor';
        const isMultiParty = this.pendingCallInvitation?.is_multi_party;

        console.log(`📹 Setting up receiver peer connection for ${callerRole} ${callerProfileId}, multi-party: ${isMultiParty}`);

        const pc = new RTCPeerConnection(configuration);

        // Store in both legacy and new locations for compatibility
        this.peerConnection = pc;
        if (callerProfileId) {
            this.peerConnections.set(callerProfileId, pc);
        }

        // Add local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
        }

        // Handle incoming remote stream
        pc.ontrack = (event) => {
            console.log('📹 Received remote track:', event.track.kind);
            const stream = event.streams[0];
            this.remoteStream = stream;

            // Store in remoteStreams map for multi-party
            if (callerProfileId) {
                this.remoteStreams.set(callerProfileId, stream);
            }

            // Display the remote video
            this.displayRemoteVideoAsParticipant(callerProfileId, callerRole, stream);
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendIceCandidateToCaller(event.candidate);
            }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            console.log('📡 Connection state:', pc.connectionState);
            switch (pc.connectionState) {
                case 'connected':
                    if (callerProfileId && !this.connectedParticipants.includes(callerProfileId)) {
                        this.connectedParticipants.push(callerProfileId);
                    }
                    this.onCallConnected();
                    break;
                case 'disconnected':
                    this.showNotification('Video call disconnected. Attempting to reconnect...', 'warning');
                    break;
                case 'failed':
                    this.showNotification('Video call failed. Please try again.', 'error');
                    this.endVideoSession();
                    break;
            }
        };

        // Set remote description (the offer)
        if (this.pendingOffer) {
            await pc.setRemoteDescription(new RTCSessionDescription(this.pendingOffer));
        }

        // Create and send answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Send answer back to caller
        this.sendVideoAnswer(answer);
    }

    /**
     * Display remote video in the participant placeholder
     * Host placeholder = You (local camera)
     * Participant placeholder = The other person (remote video)
     * @param {number} participantId - Caller's profile ID (optional for legacy support)
     * @param {string} participantRole - Caller's role (optional for legacy support)
     * @param {MediaStream} stream - The remote media stream (optional, uses this.remoteStream if not provided)
     */
    displayRemoteVideoAsParticipant(participantId = null, participantRole = null, stream = null) {
        const remoteStream = stream || this.remoteStream;

        console.log('📹 displayRemoteVideoAsParticipant called', {
            participantId,
            participantRole,
            userRole: this.userRole,
            hasRemoteStream: !!remoteStream
        });

        if (!remoteStream) {
            console.log('📹 displayRemoteVideoAsParticipant: No remote stream available');
            return;
        }

        // Try to find placeholder by participant ID first, then fall back to selected
        let placeholder = null;
        if (participantId) {
            placeholder = document.querySelector(`.student-video-placeholder[data-participant-id="${participantId}"]`);
        }
        if (!placeholder) {
            placeholder = document.querySelector('.student-video-placeholder.selected');
        }
        if (!placeholder) {
            // Try to find any available placeholder in the video grid
            placeholder = document.querySelector('.student-video-placeholder');
        }

        if (!placeholder) {
            console.log('📹 displayRemoteVideoAsParticipant: No participant placeholder found, creating one');
            // Create a placeholder if none exists
            if (participantId && participantRole) {
                this.createParticipantPlaceholder(participantId, participantRole, remoteStream);
            }
            return;
        }

        console.log('📹 Displaying remote video in participant placeholder');

        let remoteVideo = placeholder.querySelector('video.remote-video');
        if (!remoteVideo) {
            remoteVideo = document.createElement('video');
            remoteVideo.className = 'remote-video';
            remoteVideo.autoplay = true;
            remoteVideo.playsInline = true;
            remoteVideo.muted = false; // Ensure audio is enabled
            remoteVideo.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 12px;
                position: absolute;
                top: 0;
                left: 0;
                z-index: 5;
            `;

            placeholder.style.position = 'relative';
            placeholder.insertBefore(remoteVideo, placeholder.firstChild);
        }

        remoteVideo.srcObject = remoteStream;

        // Hide avatars
        const avatarSelectors = ['.student-avatar', '.initials-avatar'];
        avatarSelectors.forEach(selector => {
            const avatar = placeholder.querySelector(selector);
            if (avatar) avatar.style.display = 'none';
        });

        // Style the name label
        const name = placeholder.querySelector('.student-name');
        if (name) {
            name.style.cssText = 'position: absolute; bottom: 10px; left: 10px; z-index: 10; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 4px; color: white; font-size: 0.85rem;';
        }

        // Also hide status indicator if present (for student placeholder)
        const status = placeholder.querySelector('.student-status');
        if (status) {
            status.style.cssText = 'position: absolute; top: 8px; right: 8px; z-index: 10;';
        }

        // Update placeholder styling to show connected
        placeholder.classList.add('connected');
        placeholder.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.5)';

        // Show video controls on participant card
        this.showParticipantVideoControls(placeholder);

        console.log('📹 Remote video element created and stream attached for', participantRole || 'unknown', 'caller');
    }

    /**
     * Send video answer back to the caller (works for both directions)
     * Uses profile IDs for routing
     */
    sendVideoAnswer(answer) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = {
                type: 'video_answer',
                answer: answer,
                from_role: this.userRole,
                is_multi_party: this.pendingCallInvitation?.is_multi_party || false
            };

            // Add sender's profile ID so caller knows who answered
            if (this.userRole === 'student') {
                message.from_student_profile_id = this.studentInfo?.student_profile_id || this.studentInfo?.id;
            } else {
                message.from_tutor_profile_id = this.tutorInfo?.tutor_profile_id || this.tutorInfo?.id;
            }

            // Send to whoever called us - using profile IDs
            if (this.pendingCallInvitation?.from_role === 'student') {
                message.to_student_profile_id = this.pendingCallInvitation.from_student_profile_id;
            } else {
                message.to_tutor_profile_id = this.pendingCallInvitation?.from_tutor_profile_id;
            }

            console.log('📹 Sending video answer:', message);
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Send ICE candidate to caller (works for both directions)
     * Uses profile IDs for routing
     */
    sendIceCandidateToCaller(candidate) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = {
                type: 'ice_candidate',
                candidate: candidate,
                from_role: this.userRole,
                is_multi_party: this.pendingCallInvitation?.is_multi_party || this.remotePeerInfo?.is_multi_party || false
            };

            // Add sender's profile ID so caller knows who sent this ICE candidate
            if (this.userRole === 'student') {
                message.from_student_profile_id = this.studentInfo?.student_profile_id || this.studentInfo?.id;
            } else {
                message.from_tutor_profile_id = this.tutorInfo?.tutor_profile_id || this.tutorInfo?.id;
            }

            // Use pendingCallInvitation if available, otherwise use remotePeerInfo
            // (remotePeerInfo is set when call is accepted, before pendingCallInvitation is cleared)
            const peerInfo = this.pendingCallInvitation || this.remotePeerInfo;

            // Send to whoever called us - using profile IDs
            // The caller's from_role tells us WHO called, so we route back to them
            if (peerInfo?.from_role === 'tutor') {
                // Tutor called us (we are student), send back to tutor
                message.to_tutor_profile_id = peerInfo.from_tutor_profile_id;
                console.log('🧊 Sending ICE candidate to tutor:', peerInfo.from_tutor_profile_id);
            } else if (peerInfo?.from_role === 'student') {
                // Student called us (we are tutor), send back to student
                message.to_student_profile_id = peerInfo.from_student_profile_id;
                console.log('🧊 Sending ICE candidate to student:', peerInfo.from_student_profile_id);
            } else {
                console.warn('⚠️ sendIceCandidateToCaller: No peer info available (pendingCallInvitation and remotePeerInfo are both null)');
                return; // Don't send a message without a recipient
            }

            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('⚠️ sendIceCandidateToCaller: WebSocket not open');
        }
    }

    /**
     * Decline incoming call
     * Uses profile IDs for routing
     */
    declineIncomingCall() {
        if (this.callTimeout) {
            clearTimeout(this.callTimeout);
            this.callTimeout = null;
        }

        this.stopRingtone();

        // Notify caller that call was declined
        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.pendingCallInvitation) {
            const message = {
                type: 'video_call_declined'
            };

            // Send to whoever called us - using profile IDs
            if (this.pendingCallInvitation.from_role === 'student') {
                message.to_student_profile_id = this.pendingCallInvitation.from_student_profile_id;
            } else {
                message.to_tutor_profile_id = this.pendingCallInvitation.from_tutor_profile_id;
            }

            this.ws.send(JSON.stringify(message));
        }

        // Reset button state
        const startBtn = document.getElementById('startVideoSessionBtn');
        if (startBtn) {
            startBtn.classList.remove('incoming-call');
            startBtn.innerHTML = '<i class="fas fa-video"></i> Start Session';
            startBtn.title = 'Start live video call';
        }

        // Hide reject button
        const rejectBtn = document.getElementById('rejectCallBtn');
        if (rejectBtn) {
            rejectBtn.style.display = 'none';
        }

        this.pendingCallInvitation = null;
        this.pendingOffer = null;

        this.showNotification('Call declined', 'info');
    }

    /**
     * Handle call declined notification (for caller)
     */
    handleCallDeclined() {
        this.showNotification('Call was declined', 'warning');
        this.endVideoSession();
    }

    /**
     * Handle when a participant leaves the call (multi-party)
     * The call continues for remaining participants
     */
    handleParticipantLeft(data) {
        const leftId = data.left_participant_id;
        const leftRole = data.left_participant_role;
        const leftName = data.left_participant_name || `${leftRole} ${leftId}`;

        console.log(`📞 Participant left: ${leftName} (${leftRole} ${leftId})`);

        // Close peer connection for this participant
        if (this.peerConnections.has(leftId)) {
            const pc = this.peerConnections.get(leftId);
            pc.close();
            this.peerConnections.delete(leftId);
            console.log(`📹 Closed peer connection for ${leftName}`);
        }

        // Remove from remote streams
        this.remoteStreams.delete(leftId);

        // Remove from connected participants
        this.connectedParticipants = this.connectedParticipants.filter(id => id !== leftId);

        // Update the UI - remove the participant's card entirely from the video grid
        const placeholder = document.querySelector(`.student-video-placeholder[data-participant-id="${leftId}"]`);
        if (placeholder) {
            // Remove the entire card from the grid
            placeholder.remove();
            console.log(`📹 Removed participant card for ${leftName} from video grid`);
        }

        // Also remove from selectedParticipants array
        this.selectedParticipants = this.selectedParticipants.filter(p => p.id !== leftId);

        // Track this participant for potential reconnection
        this.trackLeftParticipant(leftId);

        // Notify user
        this.showNotification(`${leftName} left the call`, 'info');

        // If this was a 1-on-1 call or all participants left, end our session too
        if (this.connectedParticipants.length === 0 && this.peerConnections.size === 0) {
            this.showNotification('All participants left. Call ended.', 'info');
            this.endVideoSession(false); // Don't notify - they already left
        } else {
            // Update button text if participant count changed (e.g., from 3+ to 2)
            this.updateSessionButtonText();
        }
    }

    /**
     * Update the session button text based on current participant count
     * Called when participants join or leave
     */
    updateSessionButtonText() {
        if (!this.isVideoSessionActive) return;

        const startBtn = document.getElementById('startVideoSessionBtn');
        if (startBtn && startBtn.classList.contains('active')) {
            const buttonText = this.getSessionButtonText();
            startBtn.innerHTML = `<i class="fas fa-phone-slash"></i> ${buttonText}`;
            console.log(`📞 Updated button to: ${buttonText}`);
        }
    }

    /**
     * Handle call cancelled notification (for receiver when caller cancels)
     */
    handleCallCancelled() {
        console.log('🔔 DEBUG: handleCallCancelled() CALLED - SHOULD STOP RINGING');
        this.showNotification('Call was cancelled by the other party', 'info');

        // Clear pending invitation if we were about to receive a call
        console.log('🔔 DEBUG: Clearing pendingCallInvitation:', this.pendingCallInvitation);
        this.pendingCallInvitation = null;
        this.pendingOffer = null;

        // Clear call timeout if set
        if (this.callTimeout) {
            console.log('🔔 DEBUG: Clearing callTimeout');
            clearTimeout(this.callTimeout);
            this.callTimeout = null;
        }

        // Update button back to normal state
        const startBtn = document.getElementById('startVideoSessionBtn');
        console.log('🔔 DEBUG: Resetting button, current innerHTML:', startBtn?.innerHTML);
        if (startBtn) {
            startBtn.classList.remove('incoming-call', 'pending', 'active');
            startBtn.innerHTML = '<i class="fas fa-video"></i> Start Session';
            console.log('🔔 DEBUG: Button reset to Start Session');
        }

        // Hide reject button if visible
        const rejectBtn = document.getElementById('rejectCallBtn');
        if (rejectBtn) {
            rejectBtn.style.display = 'none';
        }

        // Stop ringtone if playing
        console.log('🔔 DEBUG: Stopping ringtone, ringtoneAudio:', this.ringtoneAudio);
        this.stopRingtone();

        // Reset call states
        this.isCallPending = false;
    }

    /**
     * Play ringtone for incoming call
     */
    playRingtone() {
        // Create audio context for ringtone
        try {
            if (!this.ringtoneAudio) {
                this.ringtoneAudio = new Audio();
                // Use a simple beep pattern as ringtone
                this.ringtoneAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleAoAN6LX7KF1BQA3o9bsoHUFADej1uygdQUAN6PW7KB1BQA3o9bsoHUFAA==';
                this.ringtoneAudio.loop = true;
            }
            this.ringtoneAudio.play().catch(e => console.log('Could not play ringtone:', e));
        } catch (e) {
            console.log('Ringtone not available:', e);
        }
    }

    /**
     * Stop ringtone
     */
    stopRingtone() {
        if (this.ringtoneAudio) {
            this.ringtoneAudio.pause();
            this.ringtoneAudio.currentTime = 0;
        }
    }

    /**
     * Leave the video session (only ends for current user, not the whole call)
     * Other participants can continue their call
     * @param {boolean} notifyRemote - Whether to notify other participants that we left (default: true)
     */
    async endVideoSession(notifyRemote = true) {
        const startBtn = document.getElementById('startVideoSessionBtn');

        // Stop local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                track.stop();
            });
            this.localStream = null;
        }

        // Close all peer connections (multi-party)
        if (this.peerConnections.size > 0) {
            console.log(`📹 Closing ${this.peerConnections.size} peer connections`);
            for (const [participantId, pc] of this.peerConnections) {
                pc.close();
                console.log(`📹 Closed peer connection for participant ${participantId}`);
            }
            this.peerConnections.clear();
            this.remoteStreams.clear();
            this.pendingOffers.clear();
            this.connectedParticipants = [];
        }

        // Close legacy single peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        this.remoteStream = null;
        this.isVideoSessionActive = false;
        this.remotePeerInfo = null; // Clear stored remote peer info

        // Reset video control states (mute, camera, pending)
        this.resetVideoControlStates();

        // Hide video controls
        this.hideVideoControls();

        // Stop call duration timer
        this.stopCallDurationTimer();

        // Hide permission indicator (session ended)
        this.updatePermissionIndicator();

        // Reset interaction state
        this.interactionAllowed = false;
        this.interactionRequests = [];
        this.activePermissions = [];
        this.isSessionHost = false;
        this.permissionRequestPending = false;
        this.permissions = { can_draw: false, can_write: false, can_erase: false };
        this.hostPeerInfo = null;
        this.updateInteractionBadge();
        this.closeInteractionDropdown();
        this.updateInteractionWrapperRole();

        // Save call history with canvas snapshot before cleanup
        await this.endCallHistoryWithCanvas();

        // Hide the Add Participant button and reset add-participant mode (host only feature)
        this.hideAddParticipantButton();
        this.isAddingParticipantMode = false;

        // Update button state
        if (startBtn) {
            startBtn.classList.remove('active', 'pending');
            startBtn.innerHTML = '<i class="fas fa-video"></i> Start Session';
        }

        // Hide participant video controls
        const participantControls = document.querySelectorAll('.video-controls.participant-controls');
        participantControls.forEach(ctrl => ctrl.style.display = 'none');

        // Restore host placeholder (You)
        const hostPlaceholder = document.getElementById('tutorVideoPlaceholder');
        if (hostPlaceholder) {
            const localVideo = hostPlaceholder.querySelector('video.local-video');
            if (localVideo) localVideo.remove();

            // Restore avatars
            const videoAvatar = hostPlaceholder.querySelector('.video-avatar');
            const initialsAvatar = hostPlaceholder.querySelector('.initials-avatar');
            const name = hostPlaceholder.querySelector('.video-participant-name');
            if (videoAvatar) videoAvatar.style.display = '';
            if (initialsAvatar) initialsAvatar.style.display = '';
            if (name) name.style.cssText = '';
            hostPlaceholder.style.boxShadow = '';
        }

        // Restore all participant placeholders (multi-party)
        const allParticipantPlaceholders = document.querySelectorAll('.student-video-placeholder');
        allParticipantPlaceholders.forEach(placeholder => {
            const remoteVideo = placeholder.querySelector('video.remote-video');
            if (remoteVideo) remoteVideo.remove();

            // Restore avatars
            const imgAvatar = placeholder.querySelector('.student-avatar');
            const initialsAvatar = placeholder.querySelector('.initials-avatar');
            const participantName = placeholder.querySelector('.student-name');
            const participantStatus = placeholder.querySelector('.student-status');
            if (imgAvatar) imgAvatar.style.display = '';
            if (initialsAvatar) initialsAvatar.style.display = '';
            if (participantName) participantName.style.cssText = '';
            if (participantStatus) participantStatus.style.cssText = '';
            placeholder.classList.remove('connected', 'calling', 'selected');
            placeholder.style.boxShadow = '';
        });

        // Notify via WebSocket that we LEFT the call (not ended it)
        // Other participants can continue their call without us
        if (notifyRemote && this.ws && this.ws.readyState === WebSocket.OPEN) {
            // Get our own profile ID to include in the message
            const myProfileId = this.userRole === 'student'
                ? (this.studentInfo?.student_profile_id || this.studentInfo?.id)
                : (this.tutorInfo?.tutor_profile_id || this.tutorInfo?.id);
            const myName = this.userRole === 'student'
                ? (this.studentInfo?.name || 'Student')
                : (this.tutorInfo?.name || 'Tutor');

            // For multi-party calls, notify all participants that we left
            if (this.selectedParticipants.length > 0) {
                for (const participant of this.selectedParticipants) {
                    const message = {
                        type: 'video_call_participant_left',
                        session_id: this.currentSession?.id,
                        is_multi_party: true,
                        left_participant_id: myProfileId,
                        left_participant_role: this.userRole,
                        left_participant_name: myName
                    };

                    if (participant.role === 'student') {
                        message.to_student_profile_id = participant.id;
                    } else {
                        message.to_tutor_profile_id = participant.id;
                    }

                    this.ws.send(JSON.stringify(message));
                    console.log(`📞 Sent video_call_participant_left to ${participant.role} ${participant.id}`);
                }
            } else {
                // Legacy single-party notification - in 1-on-1 calls, leaving does end the call
                const message = {
                    type: 'video_call_participant_left',
                    session_id: this.currentSession?.id,
                    left_participant_id: myProfileId,
                    left_participant_role: this.userRole,
                    left_participant_name: myName
                };

                // Route to the correct recipient based on our role
                // Use selectedTutorId/selectedStudentId, or fallback to remotePeerInfo for accepted incoming calls
                if (this.userRole === 'student') {
                    message.to_tutor_profile_id = this.selectedTutorId || this.remotePeerInfo?.from_tutor_profile_id;
                } else {
                    message.to_student_profile_id = this.selectedStudentId || this.remotePeerInfo?.from_student_profile_id;
                }

                // Only send if we have a valid recipient
                if (message.to_tutor_profile_id || message.to_student_profile_id) {
                    this.ws.send(JSON.stringify(message));
                    console.log('📞 Sent video_call_participant_left to remote party:',
                        message.to_tutor_profile_id || message.to_student_profile_id);
                } else {
                    console.warn('📞 Cannot send video_call_participant_left - no recipient ID available');
                }
            }
        }

        // Clear selected participants for next call
        this.selectedParticipants = [];

        // Only show notification if we're actively leaving (not being called from endSessionForAll)
        if (notifyRemote) {
            this.showNotification('You left the video session', 'info');
        }
        console.log('📹 Left video session');
    }

    /**
     * Leave the video session (participant leaves, call continues for others)
     * Used when there are 3+ participants and a non-host wants to leave
     */
    async leaveVideoSession() {
        console.log('📞 Leaving video session (call continues for others)');

        // Store session info before ending so we can rejoin
        this.canRejoinSession = true;
        this.lastSessionId = this.currentSession?.id;

        // Send "participant left" message - others continue
        // The endVideoSession(true) sends video_call_participant_left to notify others
        // Note: endVideoSession already shows "You left the video session" notification
        await this.endVideoSession(true);

        // Show rejoin button for participants who left an active session
        if (this.userRole !== 'tutor' && this.canRejoinSession) {
            this.showRejoinButton();
        }
    }

    /**
     * End the session for ALL participants
     * Used by host OR when only 2 participants are in the call
     * Sends a special "end session" message that tells everyone to disconnect
     */
    async endSessionForAll() {
        console.log('📞 Ending session for ALL participants');

        // Notify all participants that the session is ending
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const myProfileId = this.userRole === 'student'
                ? (this.studentInfo?.student_profile_id || this.studentInfo?.id)
                : (this.tutorInfo?.tutor_profile_id || this.tutorInfo?.id);
            const myName = this.userRole === 'student'
                ? (this.studentInfo?.name || 'Student')
                : (this.tutorInfo?.name || 'Tutor');

            // Build list of participants to notify
            // Use selectedParticipants if available (initiator), otherwise use remotePeerInfo (receiver)
            let participantsToNotify = [];

            if (this.selectedParticipants.length > 0) {
                participantsToNotify = this.selectedParticipants;
            } else if (this.remotePeerInfo) {
                // We received the call - notify the caller
                const callerId = this.remotePeerInfo.from_tutor_profile_id || this.remotePeerInfo.from_student_profile_id;
                const callerRole = this.remotePeerInfo.from_role;
                if (callerId && callerRole) {
                    participantsToNotify = [{ id: callerId, role: callerRole }];
                }
            }

            // Notify all participants that session is ENDING
            if (participantsToNotify.length > 0) {
                for (const participant of participantsToNotify) {
                    const message = {
                        type: 'video_call_ended',
                        session_id: this.currentSession?.id,
                        is_multi_party: participantsToNotify.length > 1,
                        ended_by_id: myProfileId,
                        ended_by_role: this.userRole,
                        ended_by_name: myName
                    };

                    if (participant.role === 'student') {
                        message.to_student_profile_id = participant.id;
                    } else {
                        message.to_tutor_profile_id = participant.id;
                    }

                    this.ws.send(JSON.stringify(message));
                    console.log(`📞 Sent video_call_ended to ${participant.role} ${participant.id}`);
                }
            } else {
                // Fallback - try using selectedTutorId or selectedStudentId
                const message = {
                    type: 'video_call_ended',
                    session_id: this.currentSession?.id,
                    ended_by_id: myProfileId,
                    ended_by_role: this.userRole,
                    ended_by_name: myName
                };

                // Route to the correct recipient based on our role
                if (this.userRole === 'student' && this.selectedTutorId) {
                    message.to_tutor_profile_id = this.selectedTutorId;
                    this.ws.send(JSON.stringify(message));
                    console.log('📞 Sent video_call_ended to tutor');
                } else if (this.userRole === 'tutor' && this.selectedStudentId) {
                    message.to_student_profile_id = this.selectedStudentId;
                    this.ws.send(JSON.stringify(message));
                    console.log('📞 Sent video_call_ended to student');
                }
            }
        }

        // Clean up our own session (don't send participant_left, we already sent ended)
        await this.endVideoSession(false);

        this.showNotification('Session ended for all participants', 'info');
    }

    // ==========================================
    // ONLINE PRESENCE & ADD PARTICIPANT MID-SESSION
    // ==========================================

    /**
     * Handle user coming online notification
     * Uses profile_id (tutor_profile_id or student_profile_id) for tracking
     */
    handleUserOnline(data) {
        // Extract profile ID based on role
        const profileId = data.tutor_profile_id || data.student_profile_id || data.profile_id;
        const profileType = data.profile_type || (data.tutor_profile_id ? 'tutor' : 'student');

        if (profileId) {
            // Store as "type:id" for unique identification across roles
            const profileKey = `${profileType}:${profileId}`;
            this.onlineUsers.add(profileKey);
            // Also add just the ID for backward compatibility
            this.onlineUsers.add(profileId);
            this.updateParticipantOnlineStatus(profileId, true, profileType);
            console.log(`🟢 ${profileType} profile ${profileId} is now online`);
        }
    }

    /**
     * Handle user going offline notification
     * Uses profile_id (tutor_profile_id or student_profile_id) for tracking
     *
     * Also handles "user_offline" response when trying to call an offline user:
     * - Shows notification that user is offline
     * - For multi-party calls: only removes the offline participant, continues with others
     * - For single calls: stops the calling state
     * - Adds the call to missed call history
     */
    handleUserOffline(data) {
        // Check if this is a response to a video call invitation (user was offline when we tried to call)
        if (data.original_message_type === 'video_call_invitation') {
            console.log('📞 Call recipient is offline - showing notification');

            const offlineName = data.offline_user_name || 'User';
            const offlineProfileId = data.offline_user_profile_id;
            const offlineProfileType = data.offline_user_profile_type;
            const callId = data.call_id;

            // Check if this is a multi-party call
            const isMultiParty = this.selectedParticipants && this.selectedParticipants.length > 1;

            if (isMultiParty) {
                // MULTI-PARTY CALL: Only handle this specific offline participant
                console.log(`📞 Multi-party call: ${offlineName} is offline, continuing with other participants`);

                // Show notification for this participant
                this.showNotification(`${offlineName} is offline. Continuing call with other participants.`, 'warning');

                // Remove the offline participant from selectedParticipants
                this.selectedParticipants = this.selectedParticipants.filter(p => p.id !== offlineProfileId);

                // Remove their peer connection if exists
                if (this.peerConnections.has(offlineProfileId)) {
                    const pc = this.peerConnections.get(offlineProfileId);
                    pc.close();
                    this.peerConnections.delete(offlineProfileId);
                    console.log(`📞 Removed peer connection for offline participant ${offlineProfileId}`);
                }

                // Remove their pending offer if exists
                this.pendingOffers.delete(offlineProfileId);

                // Update ONLY this participant's video placeholder (not all)
                const offlinePlaceholder = document.querySelector(
                    `.student-video-placeholder[data-participant-id="${offlineProfileId}"]`
                );
                if (offlinePlaceholder) {
                    offlinePlaceholder.classList.remove('calling');
                    offlinePlaceholder.classList.add('offline');
                    const statusEl = offlinePlaceholder.querySelector('.student-status');
                    if (statusEl) {
                        statusEl.innerHTML = '<i class="fas fa-user-slash"></i> Offline';
                        statusEl.className = 'student-status offline';
                    }
                }

                // Check if we still have participants to call
                if (this.selectedParticipants.length === 0) {
                    // All participants are offline - cancel the call
                    console.log('📞 All participants are offline - cancelling call');
                    this.showNotification('All participants are offline. Call cancelled.', 'error');
                    this.isCallPending = false;

                    const startBtn = document.getElementById('startVideoSessionBtn');
                    if (startBtn) {
                        startBtn.classList.remove('calling', 'pending');
                        startBtn.disabled = false;
                        startBtn.innerHTML = '<i class="fas fa-video"></i> Start Session';
                    }
                }
                // If we still have participants, the call continues - don't reset isCallPending

            } else {
                // SINGLE CALL: Stop the entire calling state
                console.log('📞 Single call: recipient is offline - stopping call');

                // Show notification
                this.showNotification(`${offlineName} is offline. Your call was saved as a missed call.`, 'warning');

                // Stop calling state
                this.isCallPending = false;

                // Update UI - reset the Start Session button
                const startBtn = document.getElementById('startVideoSessionBtn');
                if (startBtn) {
                    startBtn.classList.remove('calling', 'pending');
                    startBtn.disabled = false;
                    startBtn.innerHTML = '<i class="fas fa-video"></i> Start Session';
                }

                // Remove calling animation from video placeholder
                const placeholders = document.querySelectorAll('.student-video-placeholder.calling');
                placeholders.forEach(p => p.classList.remove('calling'));
            }

            // Add to local call history for display (for both single and multi-party)
            if (callId) {
                this.addToLocalCallHistory({
                    id: callId,
                    direction: 'outgoing',
                    status: 'offline',
                    callee: {
                        profile_id: offlineProfileId,
                        profile_type: offlineProfileType,
                        name: offlineName,
                        avatar: data.offline_user_avatar
                    },
                    initiated_at: data.timestamp || new Date().toISOString()
                });
            }

            // Refresh call history in sidebar
            this.loadCallHistory();

            return;
        }

        // Regular user offline notification (not a call response)
        const profileId = data.offline_user_profile_id || data.tutor_profile_id || data.student_profile_id || data.profile_id;
        const profileType = data.offline_user_profile_type || data.profile_type || (data.tutor_profile_id ? 'tutor' : 'student');

        if (profileId) {
            // Remove both formats
            const profileKey = `${profileType}:${profileId}`;
            this.onlineUsers.delete(profileKey);
            this.onlineUsers.delete(profileId);
            this.updateParticipantOnlineStatus(profileId, false, profileType);
            console.log(`🔴 ${profileType} profile ${profileId} is now offline`);
        }
    }

    /**
     * Add a call to local call history for immediate display
     */
    addToLocalCallHistory(call) {
        if (!this.callHistory) {
            this.callHistory = [];
        }
        // Add to beginning of array (most recent first)
        this.callHistory.unshift(call);
        console.log('📞 Added call to local history:', call);
    }

    /**
     * Load call history from API
     */
    async loadCallHistory() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) return;

            const response = await fetch(`${this.API_BASE}/call-history?limit=20`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.callHistory = data.calls || [];
                this.renderCallHistory();
                console.log(`📞 Loaded ${this.callHistory.length} calls from history`);
            }
        } catch (error) {
            console.error('Error loading call history:', error);
        }
    }

    /**
     * Load missed calls from API (unseen calls)
     */
    async loadMissedCalls() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) return;

            const response = await fetch(`${this.API_BASE}/call-history/missed`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.missedCalls = data.missed_calls || [];

                // Show notification if there are missed calls
                if (this.missedCalls.length > 0) {
                    this.showMissedCallsNotification();
                }

                this.renderCallHistory();
                console.log(`📞 Loaded ${this.missedCalls.length} missed calls`);
            }
        } catch (error) {
            console.error('Error loading missed calls:', error);
        }
    }

    /**
     * Handle missed calls notification from WebSocket (sent when user comes online)
     * This is triggered automatically when a user connects to WebSocket
     */
    handleMissedCallsNotification(data) {
        console.log('📞 Processing missed calls notification:', data);

        const count = data.count || 0;
        const calls = data.calls || [];

        if (count === 0 || calls.length === 0) {
            console.log('📞 No missed calls to show');
            return;
        }

        // Store the missed calls
        this.missedCalls = calls.map(call => ({
            id: call.id,
            status: call.status,
            initiated_at: call.initiated_at,
            tutor_package_name: call.tutor_package_name,
            caller: {
                profile_id: call.caller_profile_id,
                profile_type: call.caller_profile_type,
                name: call.caller_name,
                avatar: call.caller_avatar
            },
            callee: {
                profile_id: call.callee_profile_id,
                profile_type: call.callee_profile_type,
                name: call.callee_name,
                avatar: call.callee_avatar
            },
            callee_seen: false
        }));

        // Show notification toast
        const message = count === 1
            ? `You missed a call from ${calls[0].caller_name}`
            : `You have ${count} missed calls`;

        this.showNotification(message, 'warning');

        // If whiteboard modal is open, render the call history
        const modal = document.getElementById('whiteboardModal');
        if (modal && modal.classList.contains('active')) {
            this.renderCallHistory();
        }

        console.log(`📞 Processed ${count} missed calls notification`);
    }

    /**
     * Show notification banner for missed calls
     */
    showMissedCallsNotification() {
        if (!this.missedCalls || this.missedCalls.length === 0) return;

        const count = this.missedCalls.length;
        const message = count === 1
            ? `You have 1 missed call from ${this.missedCalls[0].caller.name}`
            : `You have ${count} missed calls`;

        this.showNotification(message, 'info');
    }

    /**
     * Render call history in the left sidebar
     */
    renderCallHistory() {
        const historyList = document.getElementById('sessionHistoryList');
        if (!historyList) return;

        // Check if call history section exists, if not create it
        let callHistorySection = historyList.querySelector('.call-history-section');
        if (!callHistorySection) {
            callHistorySection = document.createElement('div');
            callHistorySection.className = 'call-history-section';
            callHistorySection.innerHTML = `
                <div class="section-header">
                    <h4><i class="fas fa-phone"></i> Call History</h4>
                    <span class="missed-call-badge" id="missedCallBadge" style="display: none;">0</span>
                </div>
                <div class="call-history-list" id="callHistoryItems"></div>
            `;
            // Insert at the top of the history list
            historyList.insertBefore(callHistorySection, historyList.firstChild);
        }

        const callHistoryItems = callHistorySection.querySelector('#callHistoryItems');
        if (!callHistoryItems) return;

        // Update missed call badge
        const badge = callHistorySection.querySelector('#missedCallBadge');
        const missedCount = (this.missedCalls || []).length;
        if (badge) {
            badge.textContent = missedCount;
            badge.style.display = missedCount > 0 ? 'inline-flex' : 'none';
        }

        // Combine and sort calls (missed calls first, then regular history)
        const allCalls = [
            ...(this.missedCalls || []).map(c => ({ ...c, isMissed: true })),
            ...(this.callHistory || []).filter(c => !this.missedCalls?.find(m => m.id === c.id))
        ];

        if (allCalls.length === 0) {
            callHistoryItems.innerHTML = `
                <div class="no-calls-message">
                    <i class="fas fa-phone-slash"></i>
                    <p>No call history yet</p>
                </div>
            `;
            return;
        }

        // Render call cards
        callHistoryItems.innerHTML = allCalls.slice(0, 10).map(call => this.renderCallCard(call)).join('');

        // Add click handlers
        callHistoryItems.querySelectorAll('.call-history-card').forEach(card => {
            card.addEventListener('click', () => this.handleCallHistoryCardClick(card));
        });
    }

    /**
     * Render a single call history card
     */
    renderCallCard(call) {
        const isOutgoing = call.direction === 'outgoing';
        const isMissed = call.isMissed || call.status === 'missed' || call.status === 'offline' || call.status === 'no_answer';
        const otherParty = isOutgoing ? call.callee : call.caller;

        // Format time
        const callTime = call.initiated_at ? new Date(call.initiated_at) : new Date();
        const timeStr = this.formatCallTime(callTime);

        // Determine icon and status text
        let iconClass, statusText, cardClass;
        if (isMissed && !isOutgoing) {
            iconClass = 'fas fa-phone-missed text-red';
            statusText = 'Missed call';
            cardClass = 'missed';
        } else if (isMissed && isOutgoing) {
            iconClass = 'fas fa-phone-slash text-orange';
            statusText = call.status === 'offline' ? 'User offline' : 'No answer';
            cardClass = 'no-answer';
        } else if (isOutgoing) {
            iconClass = 'fas fa-phone-alt text-green';
            statusText = 'Outgoing call';
            cardClass = 'outgoing';
        } else {
            iconClass = 'fas fa-phone text-blue';
            statusText = 'Incoming call';
            cardClass = 'incoming';
        }

        // Duration
        const durationStr = call.duration_seconds
            ? this.formatDuration(call.duration_seconds)
            : '';

        // Avatar
        const avatarHtml = otherParty?.avatar && !otherParty.avatar.includes('user-default')
            ? `<img src="${otherParty.avatar}" alt="${otherParty.name}" class="call-avatar">`
            : `<div class="call-avatar-placeholder">${(otherParty?.name || 'U').charAt(0).toUpperCase()}</div>`;

        return `
            <div class="call-history-card ${cardClass} ${call.isMissed ? 'unseen' : ''}"
                 data-call-id="${call.id}"
                 data-profile-id="${otherParty?.profile_id}"
                 data-profile-type="${otherParty?.profile_type}">
                <div class="call-avatar-container">
                    ${avatarHtml}
                    <span class="call-direction-icon"><i class="${iconClass}"></i></span>
                </div>
                <div class="call-info">
                    <div class="call-name">${otherParty?.name || 'Unknown'}</div>
                    <div class="call-details">
                        <span class="call-status">${statusText}</span>
                        ${call.tutor_package_name ? `<span class="call-package">${call.tutor_package_name}</span>` : ''}
                    </div>
                </div>
                <div class="call-time-info">
                    <div class="call-time">${timeStr}</div>
                    ${durationStr ? `<div class="call-duration">${durationStr}</div>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Format call time for display
     */
    formatCallTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;

        return date.toLocaleDateString();
    }

    /**
     * Format call duration
     */
    formatDuration(seconds) {
        if (!seconds || seconds < 1) return '';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    }

    /**
     * Handle click on call history card
     * Loads canvas snapshot and recording if available
     */
    async handleCallHistoryCardClick(card) {
        const callId = card.dataset.callId;
        const profileId = card.dataset.profileId;
        const profileType = card.dataset.profileType;

        // Mark as seen if it was a missed call
        if (card.classList.contains('unseen')) {
            await this.markCallAsSeen(callId);
            card.classList.remove('unseen');
        }

        console.log(`📞 Clicked call history: ${profileType} ${profileId}, call ID: ${callId}`);

        // Fetch full call details including canvas snapshot and recording
        await this.loadCallHistoryDetails(callId);
    }

    /**
     * Load full call history details and restore canvas/recording
     */
    async loadCallHistoryDetails(callId) {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                this.showNotification('Please log in to view call details', 'warning');
                return;
            }

            this.showNotification('Loading session...', 'info');

            const response = await fetch(`${this.API_BASE}/call-history/${callId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (!data.success || !data.call) {
                this.showNotification('Failed to load call details', 'error');
                return;
            }

            const call = data.call;

            // Restore canvas if snapshot exists
            if (call.canvas_snapshot) {
                await this.loadCanvasFromSnapshot(call.canvas_snapshot);
                this.showNotification('Canvas restored from session', 'success');
            } else {
                this.showNotification('No canvas data for this session', 'info');
            }

            // Show recording in Live Panel if available
            if (call.recording_url) {
                this.showRecordingInLivePanel(call.recording_url, call);
            }

        } catch (error) {
            console.error('Error loading call details:', error);
            this.showNotification('Failed to load session details', 'error');
        }
    }

    /**
     * Load canvas from snapshot (read-only mode)
     */
    async loadCanvasFromSnapshot(snapshot) {
        if (!this.canvas || !this.ctx || !snapshot?.imageData) {
            console.warn('Cannot load canvas snapshot: canvas not ready or no data');
            return;
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // Clear current canvas
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

                // Scale and draw the snapshot
                const scale = Math.min(
                    this.canvas.width / (snapshot.canvasWidth || img.width),
                    this.canvas.height / (snapshot.canvasHeight || img.height)
                );
                const x = (this.canvas.width - (snapshot.canvasWidth || img.width) * scale) / 2;
                const y = (this.canvas.height - (snapshot.canvasHeight || img.height) * scale) / 2;

                this.ctx.drawImage(img, x, y, (snapshot.canvasWidth || img.width) * scale, (snapshot.canvasHeight || img.height) * scale);

                // Enable read-only mode indicator
                this.setCanvasReadOnlyMode(true, snapshot.timestamp);

                console.log(`📸 Canvas restored: ${snapshot.pageCount || 1} page(s), captured at ${snapshot.timestamp}`);
                resolve();
            };
            img.onerror = () => {
                console.error('Failed to load canvas snapshot image');
                reject(new Error('Failed to load canvas image'));
            };
            img.src = snapshot.imageData;
        });
    }

    /**
     * Set canvas to read-only mode (viewing historical data)
     */
    setCanvasReadOnlyMode(enabled, timestamp) {
        this.isCanvasReadOnly = enabled;

        // Show/hide read-only indicator
        let indicator = document.querySelector('.canvas-readonly-indicator');
        if (enabled) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.className = 'canvas-readonly-indicator';
                const canvasContainer = this.canvas?.parentElement;
                if (canvasContainer) {
                    canvasContainer.appendChild(indicator);
                }
            }
            const dateStr = timestamp ? new Date(timestamp).toLocaleString() : 'Historical session';
            indicator.innerHTML = `
                <i class="fas fa-eye"></i>
                <span>Viewing: ${dateStr}</span>
                <button class="exit-readonly-btn" onclick="window.whiteboardManager?.exitCanvasReadOnlyMode()">
                    <i class="fas fa-times"></i> Exit
                </button>
            `;
            indicator.style.display = 'flex';

            // Disable drawing tools
            const toolBtns = document.querySelectorAll('.tool-btn');
            toolBtns.forEach(btn => btn.classList.add('disabled'));
        } else {
            if (indicator) {
                indicator.style.display = 'none';
            }
            // Re-enable drawing tools
            const toolBtns = document.querySelectorAll('.tool-btn');
            toolBtns.forEach(btn => btn.classList.remove('disabled'));
        }
    }

    /**
     * Exit canvas read-only mode and clear the restored snapshot
     */
    exitCanvasReadOnlyMode() {
        this.setCanvasReadOnlyMode(false);

        // Clear canvas and reset to current page
        if (this.canvas && this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Hide any video that was showing
        this.hideRecordingFromLivePanel();

        this.showNotification('Exited session view', 'info');
    }

    /**
     * Show recording video in the Live Panel (video grid area)
     */
    showRecordingInLivePanel(recordingUrl, callData) {
        const videoGrid = document.getElementById('videoGrid');
        if (!videoGrid) return;

        // Check if recording player already exists
        let recordingPlayer = videoGrid.querySelector('.recording-player-container');
        if (!recordingPlayer) {
            recordingPlayer = document.createElement('div');
            recordingPlayer.className = 'recording-player-container';
            videoGrid.appendChild(recordingPlayer);
        }

        // Format call info for display
        const otherParty = callData.caller?.name || callData.callee?.name || 'Unknown';
        const duration = callData.duration_seconds ? this.formatDuration(callData.duration_seconds) : '';
        const dateStr = callData.ended_at ? new Date(callData.ended_at).toLocaleDateString() : '';

        recordingPlayer.innerHTML = `
            <div class="recording-header">
                <h4><i class="fas fa-play-circle"></i> Session Recording</h4>
                <span class="recording-info">${otherParty} • ${dateStr} ${duration ? `• ${duration}` : ''}</span>
            </div>
            <video class="session-recording-video" controls autoplay>
                <source src="${recordingUrl}" type="video/webm">
                Your browser does not support the video tag.
            </video>
            <div class="recording-controls">
                <button class="recording-close-btn" onclick="window.whiteboardManager?.hideRecordingFromLivePanel()">
                    <i class="fas fa-times"></i> Close Recording
                </button>
            </div>
        `;

        recordingPlayer.style.display = 'block';

        // Hide other video placeholders when showing recording
        const placeholders = videoGrid.querySelectorAll('.student-video-placeholder, #tutorVideoPlaceholder');
        placeholders.forEach(p => p.style.display = 'none');

        console.log(`🎬 Showing recording in Live Panel: ${recordingUrl}`);
    }

    /**
     * Hide recording from Live Panel
     */
    hideRecordingFromLivePanel() {
        const videoGrid = document.getElementById('videoGrid');
        if (!videoGrid) return;

        const recordingPlayer = videoGrid.querySelector('.recording-player-container');
        if (recordingPlayer) {
            // Pause and remove video
            const video = recordingPlayer.querySelector('video');
            if (video) {
                video.pause();
                video.src = '';
            }
            recordingPlayer.style.display = 'none';
        }

        // Show video placeholders again
        const placeholders = videoGrid.querySelectorAll('.student-video-placeholder, #tutorVideoPlaceholder');
        placeholders.forEach(p => p.style.display = '');

        console.log('🎬 Recording hidden from Live Panel');
    }

    /**
     * Mark a call as seen
     */
    async markCallAsSeen(callId) {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) return;

            await fetch(`${this.API_BASE}/call-history/${callId}/mark-seen`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Update local state
            if (this.missedCalls) {
                this.missedCalls = this.missedCalls.filter(c => c.id !== parseInt(callId));
            }
        } catch (error) {
            console.error('Error marking call as seen:', error);
        }
    }

    /**
     * Handle initial list of online users
     * Expects array of objects with profile_id and profile_type
     */
    handleOnlineUsersList(data) {
        const users = data.users || data.online_users || [];
        this.onlineUsers = new Set();

        console.log(`📋 Online users list received: ${users.length} users`);

        // Process each online user
        users.forEach(user => {
            if (typeof user === 'object') {
                // New format: { profile_id, profile_type, tutor_profile_id, student_profile_id }
                const profileId = user.tutor_profile_id || user.student_profile_id || user.profile_id;
                const profileType = user.profile_type || (user.tutor_profile_id ? 'tutor' : 'student');
                if (profileId) {
                    const profileKey = `${profileType}:${profileId}`;
                    this.onlineUsers.add(profileKey);
                    this.onlineUsers.add(profileId);
                    this.updateParticipantOnlineStatus(profileId, true, profileType);
                }
            } else {
                // Legacy format: just profile ID
                this.onlineUsers.add(user);
                this.updateParticipantOnlineStatus(user, true);
            }
        });
    }

    /**
     * Update the online status indicator for a participant in the UI
     * @param {number} profileId - The profile ID (tutor_profile_id or student_profile_id)
     * @param {boolean} isOnline - Whether the user is online
     * @param {string} profileType - 'tutor' or 'student' (optional)
     */
    updateParticipantOnlineStatus(profileId, isOnline, profileType = null) {
        // Update in student list (left sidebar) - check both student and tutor data attributes
        let studentCard;
        if (profileType === 'student') {
            studentCard = document.querySelector(`.student-card[data-student-id="${profileId}"]`);
        } else if (profileType === 'tutor') {
            studentCard = document.querySelector(`.student-card[data-tutor-id="${profileId}"]`);
        } else {
            // Try both if type not specified
            studentCard = document.querySelector(`.student-card[data-student-id="${profileId}"], .student-card[data-tutor-id="${profileId}"]`);
        }

        if (studentCard) {
            const statusIndicator = studentCard.querySelector('.online-status, .status-indicator');
            if (statusIndicator) {
                statusIndicator.classList.toggle('online', isOnline);
                statusIndicator.classList.toggle('offline', !isOnline);
            }
            // Also update card appearance
            studentCard.classList.toggle('is-online', isOnline);
            studentCard.classList.toggle('is-offline', !isOnline);
        }

        // Update in video grid (right sidebar)
        const placeholder = document.querySelector(`.student-video-placeholder[data-participant-id="${profileId}"]`);
        if (placeholder) {
            const status = placeholder.querySelector('.student-status');
            if (status) {
                status.classList.toggle('online', isOnline);
                status.classList.toggle('offline', !isOnline);
            }
        }
    }

    /**
     * Check if a user/profile is online
     * @param {number} profileId - The profile ID to check
     * @param {string} profileType - 'tutor' or 'student' (optional, for precise lookup)
     * @returns {boolean} - Whether the user is online
     */
    isUserOnline(profileId, profileType = null) {
        if (profileType) {
            // Check with profile type for precise lookup
            return this.onlineUsers.has(`${profileType}:${profileId}`);
        }
        // Fallback: check just the ID
        return this.onlineUsers.has(profileId) ||
               this.onlineUsers.has(`student:${profileId}`) ||
               this.onlineUsers.has(`tutor:${profileId}`);
    }

    /**
     * Request online users list from server
     * Server should return list of online profiles with profile_id and profile_type
     */
    requestOnlineUsersList() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // Include our profile info so server knows who is asking
            const request = {
                type: 'get_online_users',
                session_id: this.currentSession?.id,
                requester_role: this.userRole
            };

            // Add requester profile ID
            if (this.userRole === 'student') {
                request.requester_student_profile_id = this.studentInfo?.student_profile_id || this.studentInfo?.id;
            } else {
                request.requester_tutor_profile_id = this.tutorInfo?.tutor_profile_id || this.tutorInfo?.id;
            }

            this.ws.send(JSON.stringify(request));
            console.log('📡 Requested online users list');
        }
    }

    /**
     * Show the "Add Participant" button when session is active (host only)
     */
    showAddParticipantButton() {
        if (this.userRole !== 'tutor') return; // Only host can add participants

        const addBtn = document.getElementById('addParticipantBtn');
        if (addBtn) {
            addBtn.style.display = 'flex';
        }
    }

    /**
     * Hide the "Add Participant" button and clean up add-participant mode
     */
    hideAddParticipantButton() {
        const addBtn = document.getElementById('addParticipantBtn');
        if (addBtn) {
            addBtn.style.display = 'none';
        }

        // Also remove the "Done Adding" button if it exists
        const doneBtn = document.getElementById('doneAddingParticipantsBtn');
        if (doneBtn) {
            doneBtn.remove();
        }

        // Remove add-participant-mode class from students list
        const container = document.getElementById('studentsList');
        if (container) {
            container.classList.remove('add-participant-mode');
        }
    }

    /**
     * Show the "Rejoin Session" button (for participants who left an active session)
     */
    showRejoinButton() {
        const rejoinBtn = document.getElementById('rejoinSessionBtn');
        if (rejoinBtn) {
            rejoinBtn.style.display = 'flex';
        }
        // Hide the start session button when rejoin is shown
        const startBtn = document.getElementById('startVideoSessionBtn');
        if (startBtn) {
            startBtn.style.display = 'none';
        }
    }

    /**
     * Hide the "Rejoin Session" button
     */
    hideRejoinButton() {
        const rejoinBtn = document.getElementById('rejoinSessionBtn');
        if (rejoinBtn) {
            rejoinBtn.style.display = 'none';
        }
        // Show the start session button when rejoin is hidden
        const startBtn = document.getElementById('startVideoSessionBtn');
        if (startBtn) {
            startBtn.style.display = 'flex';
        }
    }

    /**
     * Show modal/panel to select participants to add mid-session
     */
    showAddParticipantModal() {
        if (!this.isVideoSessionActive) {
            this.showNotification('No active session to add participants to', 'warning');
            return;
        }

        if (this.userRole !== 'tutor') {
            this.showNotification('Only the host can add participants', 'warning');
            return;
        }

        // Switch to Students panel in left sidebar to select participants
        this.switchSidebarPanel('students');

        // Enable multi-select mode
        this.enableMultiSelectForAddParticipant();

        this.showNotification('Select participants to add to the session', 'info');
    }

    /**
     * Enable add participant mode for mid-session adding
     * Clicking a card directly initiates a call to that person
     * Cards already in call are disabled
     */
    enableMultiSelectForAddParticipant() {
        this.isAddingParticipantMode = true;

        const container = document.getElementById('studentsList');
        if (!container) return;

        // Request latest online users list (for visual indicator only)
        this.requestOnlineUsersList();

        // Add visual indicator for add mode
        container.classList.add('add-participant-mode');

        // Update card states - clicking will directly add to call
        const cards = container.querySelectorAll('.student-card');
        cards.forEach(card => {
            // Get profile ID and type from data attributes
            const studentId = card.dataset.studentId ? parseInt(card.dataset.studentId) : null;
            const tutorId = card.dataset.tutorId ? parseInt(card.dataset.tutorId) : null;
            const participantId = studentId || tutorId;
            const profileType = studentId ? 'student' : 'tutor';

            // Check if already in the call
            const isInCall = this.connectedParticipants.includes(participantId) ||
                           this.selectedParticipants.some(p => p.id === participantId);

            // Check if online (for visual indicator only, not blocking)
            const isOnline = this.isUserOnline(participantId, profileType);

            if (isInCall) {
                // Already in call - block selection
                card.classList.add('already-in-call');
                card.classList.remove('offline-participant');
                card.style.opacity = '0.5';
                card.style.pointerEvents = 'none';
            } else {
                // Allow selection - clicking will directly call this person
                card.classList.remove('already-in-call');
                card.style.opacity = '1';
                card.style.pointerEvents = 'auto';
                card.style.cursor = 'pointer';

                // Show offline indicator but still allow selection
                if (!isOnline) {
                    card.classList.add('offline-participant');
                } else {
                    card.classList.remove('offline-participant');
                }
            }
        });

        this.showNotification('Click a participant to add them to the call', 'info');
    }

    /**
     * Handle card click during add participant mode
     * Directly initiates call to the clicked participant
     */
    async handleAddParticipantCardClick(participantId, participantRole, participantName, participantAvatar) {
        if (!this.isAddingParticipantMode) return;

        console.log(`📞 Adding participant directly: ${participantName} (${participantRole} ${participantId})`);

        const participant = {
            id: participantId,
            role: participantRole,
            name: participantName,
            avatar: participantAvatar
        };

        // Add to call immediately
        await this.addParticipantMidSession(participant);

        // Update the card to show it's now in call
        const container = document.getElementById('studentsList');
        const card = container?.querySelector(
            `.student-card[data-student-id="${participantId}"], .student-card[data-tutor-id="${participantId}"]`
        );
        if (card) {
            card.classList.add('already-in-call');
            card.style.opacity = '0.5';
            card.style.pointerEvents = 'none';
        }

        this.showNotification(`Calling ${participantName}...`, 'info');
    }

    /**
     * Exit add participant mode
     */
    exitAddParticipantMode() {
        this.isAddingParticipantMode = false;

        const container = document.getElementById('studentsList');
        if (container) {
            container.classList.remove('add-participant-mode');

            // Reset card styles
            const cards = container.querySelectorAll('.student-card');
            cards.forEach(card => {
                card.classList.remove('already-in-call', 'offline-participant');
                card.style.opacity = '1';
                card.style.pointerEvents = 'auto';
            });
        }
    }

    /**
     * Add a participant to an ongoing session
     * @param {Object} participant - {id, role, name, avatar}
     *                              id = tutor_profile_id or student_profile_id
     *                              role = 'tutor' or 'student'
     */
    async addParticipantMidSession(participant) {
        console.log(`📞 Adding participant mid-session:`, participant);

        // Check if participant is online using profile-based tracking
        const profileType = participant.role === 'tutor' ? 'tutor' : 'student';
        const isOnline = this.isUserOnline(participant.id, profileType);
        const canReconnect = this.leftParticipants.has(participant.id);

        if (!isOnline && !canReconnect) {
            console.log(`⚠️ ${profileType} profile ${participant.id} may be offline, sending invitation anyway`);
        }

        try {
            // Add to selectedParticipants if not already there (ensures persistence across re-renders)
            if (!this.selectedParticipants.some(p => p.id === participant.id)) {
                this.selectedParticipants.push(participant);
            }

            // Create peer connection for this participant
            await this.setupPeerConnectionForParticipant(participant);

            // Add placeholder to video grid (appends without overriding existing cards)
            this.addParticipantToVideoGrid(participant);

            // Send call invitation to the new participant
            this.sendCallInvitationToParticipant(participant);

            console.log(`📞 Invitation sent to ${participant.name}`);
        } catch (error) {
            console.error(`Failed to add participant ${participant.name}:`, error);
            this.showNotification(`Failed to add ${participant.name}`, 'error');
        }
    }

    /**
     * Add participant placeholder to video grid during mid-session add
     */
    addParticipantToVideoGrid(participant) {
        const videoGrid = document.getElementById('studentVideoGrid');
        if (!videoGrid) return;

        // Check if placeholder already exists
        if (document.querySelector(`.student-video-placeholder[data-participant-id="${participant.id}"]`)) {
            return;
        }

        const avatar = participant.avatar && !participant.avatar.includes('user-default') ?
            `<img src="${participant.avatar}" alt="${participant.name}" class="student-avatar"
                 onerror="whiteboardManager.handleAvatarError(this, '${participant.name.replace(/'/g, "\\'")}')">` :
            this.getInitialsAvatar(participant.name, 'medium');

        const placeholder = document.createElement('div');
        placeholder.className = 'student-video-placeholder calling';
        placeholder.dataset.participantId = participant.id;
        placeholder.dataset.participantRole = participant.role;
        placeholder.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
        placeholder.innerHTML = `
            ${avatar}
            <div class="student-name">${participant.name}</div>
            <div class="student-status calling">
                <i class="fas fa-phone-alt fa-pulse"></i> Calling...
            </div>
            <button class="cancel-call-btn" title="Cancel call">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add click handler for cancel button
        const cancelBtn = placeholder.querySelector('.cancel-call-btn');
        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cancelCallToParticipant(participant.id, participant.role, participant.name);
        });

        videoGrid.appendChild(placeholder);
    }

    /**
     * Cancel an outgoing call to a specific participant
     */
    cancelCallToParticipant(participantId, participantRole, participantName) {
        console.log(`📞 Cancelling call to ${participantName} (${participantRole} ${participantId})`);

        // Send cancel message via WebSocket
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = {
                type: 'video_call_cancelled',
                session_id: this.currentSession?.id,
                is_multi_party: true
            };

            if (participantRole === 'student') {
                message.to_student_profile_id = participantId;
            } else {
                message.to_tutor_profile_id = participantId;
            }

            this.ws.send(JSON.stringify(message));
        }

        // Close peer connection if exists
        if (this.peerConnections.has(participantId)) {
            const pc = this.peerConnections.get(participantId);
            pc.close();
            this.peerConnections.delete(participantId);
        }

        // Remove pending offer
        this.pendingOffers.delete(participantId);

        // Remove from selectedParticipants
        this.selectedParticipants = this.selectedParticipants.filter(p => p.id !== participantId);

        // Remove the video placeholder
        const placeholder = document.querySelector(`.student-video-placeholder[data-participant-id="${participantId}"]`);
        if (placeholder) {
            placeholder.remove();
        }

        // Update sidebar card state
        const container = document.getElementById('studentsList');
        const card = container?.querySelector(
            `.student-card[data-student-id="${participantId}"], .tutor-card[data-tutor-id="${participantId}"]`
        );
        if (card) {
            card.classList.remove('already-in-call');
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
        }

        this.showNotification(`Call to ${participantName} cancelled`, 'info');

        // If no participants left, check if we should end the session
        if (this.selectedParticipants.length === 0 && !this.isVideoSessionActive) {
            this.isCallPending = false;
            const startBtn = document.getElementById('startVideoSessionBtn');
            if (startBtn) {
                startBtn.classList.remove('calling', 'pending');
                startBtn.disabled = true;
                startBtn.innerHTML = '<i class="fas fa-video"></i> Start Session';
            }
        }
    }

    /**
     * Send call invitation to a specific participant (for mid-session add)
     */
    sendCallInvitationToParticipant(participant) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket not connected');
            return;
        }

        const invitation = {
            type: 'video_call_invitation',
            session_id: this.currentSession?.id,
            from_role: this.userRole,
            is_mid_session_add: true, // Flag to indicate this is a mid-session add
            is_multi_party: true
        };

        // Add caller info
        if (this.userRole === 'student') {
            invitation.from_student_profile_id = this.studentInfo?.student_profile_id || this.studentInfo?.id;
            invitation.caller_name = this.studentInfo?.name || 'Student';
        } else {
            invitation.from_tutor_profile_id = this.tutorInfo?.tutor_profile_id || this.tutorInfo?.id;
            invitation.caller_name = this.tutorInfo?.name || 'Tutor';
        }

        // Add recipient info
        if (participant.role === 'student') {
            invitation.to_student_profile_id = participant.id;
        } else {
            invitation.to_tutor_profile_id = participant.id;
        }

        console.log('📞 Sending mid-session call invitation:', invitation);
        this.ws.send(JSON.stringify(invitation));
    }

    // ==========================================
    // PARTICIPANT RECONNECTION
    // ==========================================

    /**
     * Handle participant left - track them for potential reconnection
     */
    trackLeftParticipant(participantId) {
        this.leftParticipants.add(participantId);
        console.log(`📋 Tracking left participant ${participantId} for potential reconnection`);
    }

    /**
     * Handle reconnection request from a participant who left
     */
    handleReconnectRequest(data) {
        const participantId = data.from_student_profile_id || data.from_tutor_profile_id;
        const participantRole = data.from_role;
        const participantName = data.caller_name || `${participantRole} ${participantId}`;

        console.log(`🔄 Reconnection request from ${participantName}`);

        // Check if this participant was in the session
        if (this.leftParticipants.has(participantId)) {
            // Auto-accept reconnection
            this.acceptReconnection(data);
        } else {
            // Treat as new participant request
            this.handleIncomingCallInvitation(data);
        }
    }

    /**
     * Accept reconnection from a participant who left
     */
    async acceptReconnection(data) {
        const participantId = data.from_student_profile_id || data.from_tutor_profile_id;
        const participantRole = data.from_role;
        const participantName = data.caller_name || `${participantRole} ${participantId}`;

        console.log(`✅ Accepting reconnection from ${participantName}`);

        // Remove from left participants
        this.leftParticipants.delete(participantId);

        // Add back to selected participants if not there
        if (!this.selectedParticipants.some(p => p.id === participantId)) {
            this.selectedParticipants.push({
                id: participantId,
                role: participantRole,
                name: participantName,
                avatar: null
            });
        }

        // Handle as normal incoming call (will set up peer connection)
        await this.handleIncomingCallInvitation(data);

        this.showNotification(`${participantName} reconnected`, 'success');
    }

    /**
     * Request to reconnect to a session after leaving
     * Called by participant who wants to rejoin
     */
    requestReconnection() {
        if (!this.canRejoinSession) {
            this.showNotification('No active session to rejoin', 'warning');
            return;
        }

        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.showNotification('Cannot reconnect - no connection to server', 'error');
            return;
        }

        // Hide rejoin button immediately
        this.hideRejoinButton();

        const request = {
            type: 'video_call_reconnect_request',
            session_id: this.lastSessionId || this.currentSession?.id,
            from_role: this.userRole
        };

        // Add caller info
        if (this.userRole === 'student') {
            request.from_student_profile_id = this.studentInfo?.student_profile_id || this.studentInfo?.id;
            request.caller_name = this.studentInfo?.name || 'Student';
            // Send to tutor (host)
            request.to_tutor_profile_id = this.selectedTutorId;
        } else {
            request.from_tutor_profile_id = this.tutorInfo?.tutor_profile_id || this.tutorInfo?.id;
            request.caller_name = this.tutorInfo?.name || 'Tutor';
            // Send to first connected student
            if (this.connectedParticipants.length > 0) {
                request.to_student_profile_id = this.connectedParticipants[0];
            }
        }

        console.log('🔄 Sending reconnection request:', request);
        this.ws.send(JSON.stringify(request));

        this.showNotification('Reconnecting to session...', 'info');

        // Clear rejoin state after attempting reconnection
        this.canRejoinSession = false;
    }

    /**
     * Toggle recording - records canvas and optionally video/audio
     * Only host can record sessions
     */
    async toggleRecording() {
        // Permission check: Only host can record
        if (!this.isSessionHost) {
            console.log('⛔ Recording blocked: Only host can record');
            this.showNotification('Only the host can record sessions', 'error');
            return;
        }

        const recordBtn = document.getElementById('recordBtn');

        if (this.isRecording) {
            // Stop recording
            await this.stopRecordingSession();
        } else {
            // Show save location choice
            this.showRecordingSaveChoice();
        }
    }

    /**
     * Show recording save location choice modal
     */
    showRecordingSaveChoice() {
        // Remove existing choice modal if any
        const existing = document.querySelector('.recording-save-choice');
        if (existing) existing.remove();

        const choiceModal = document.createElement('div');
        choiceModal.className = 'recording-save-choice';
        choiceModal.innerHTML = `
            <h3><i class="fas fa-video"></i> Start Recording</h3>
            <div class="choice-options">
                <button class="choice-btn" data-mode="system">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <div class="choice-text">
                        <div class="choice-title">Save to System</div>
                        <div class="choice-desc">Records video panel only. Saved to server, viewable in session history.</div>
                    </div>
                </button>
                <button class="choice-btn" data-mode="local">
                    <i class="fas fa-download"></i>
                    <div class="choice-text">
                        <div class="choice-title">Save Locally</div>
                        <div class="choice-desc">Records entire modal. Downloads to your computer.</div>
                    </div>
                </button>
            </div>
            <button class="cancel-btn">Cancel</button>
        `;

        document.body.appendChild(choiceModal);

        // Add event listeners
        choiceModal.querySelector('[data-mode="system"]').addEventListener('click', () => {
            this.recordingMode = 'system';
            choiceModal.remove();
            this.startSystemRecording();
        });

        choiceModal.querySelector('[data-mode="local"]').addEventListener('click', () => {
            this.recordingMode = 'local';
            choiceModal.remove();
            this.startLocalRecording();
        });

        choiceModal.querySelector('.cancel-btn').addEventListener('click', () => {
            choiceModal.remove();
        });
    }

    /**
     * Start system recording - captures video panel only, uploads to server
     */
    async startSystemRecording() {
        const recordBtn = document.getElementById('recordBtn');

        try {
            // Get the video grid element
            const videoGrid = document.getElementById('videoGrid');
            if (!videoGrid) {
                this.showNotification('Video panel not found', 'error');
                return;
            }

            // Capture the video grid as a stream
            // Note: captureStream is not available on all elements, so we use canvas capture
            // Create a canvas to capture the video grid
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = videoGrid.offsetWidth || 640;
            captureCanvas.height = videoGrid.offsetHeight || 480;
            const captureCtx = captureCanvas.getContext('2d');

            // Prepare audio tracks
            const audioTracks = [];

            // Add audio from peer connections (remote participants)
            for (const [id, stream] of this.remoteStreams) {
                const tracks = stream.getAudioTracks();
                if (tracks.length > 0) {
                    audioTracks.push(...tracks);
                }
            }

            // Add local microphone audio if available and not muted
            if (this.localStream && !this.isAudioMuted) {
                audioTracks.push(...this.localStream.getAudioTracks());
            }

            // If no video call active, record the canvas instead
            let videoStream;
            if (this.isVideoSessionActive && this.remoteStreams.size > 0) {
                // Record the video grid by repeatedly drawing to canvas
                videoStream = captureCanvas.captureStream(30);

                // Start frame capture loop
                this.systemRecordingCapture = setInterval(() => {
                    this.captureVideoGridFrame(captureCtx, captureCanvas.width, captureCanvas.height);
                }, 33); // ~30fps
            } else {
                // Fall back to whiteboard canvas recording
                if (this.canvas) {
                    videoStream = this.canvas.captureStream(30);
                } else {
                    this.showNotification('No video content to record', 'warning');
                    return;
                }
            }

            // Combine video and audio
            const tracks = [...videoStream.getTracks()];
            if (audioTracks.length > 0) {
                // Create audio context to mix multiple audio tracks
                const audioContext = new AudioContext();
                const destination = audioContext.createMediaStreamDestination();

                for (const track of audioTracks) {
                    const source = audioContext.createMediaStreamSource(new MediaStream([track]));
                    source.connect(destination);
                }

                tracks.push(...destination.stream.getAudioTracks());
                this.audioContext = audioContext; // Store for cleanup
            }

            const combinedStream = new MediaStream(tracks);

            // Setup MediaRecorder
            const options = { mimeType: 'video/webm;codecs=vp9,opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm;codecs=vp8,opus';
            }
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm';
            }

            this.mediaRecorder = new MediaRecorder(combinedStream, options);
            this.recordedChunks = [];
            this.recordingStartTime = Date.now();
            this.displayStream = videoStream;
            this.captureCanvas = captureCanvas;

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                await this.processRecording();
            };

            this.mediaRecorder.onerror = (event) => {
                console.error('Recording error:', event.error);
                this.showNotification('Recording error: ' + event.error.message, 'error');
                this.stopRecordingSession();
            };

            // Start recording
            this.mediaRecorder.start(1000);
            this.isRecording = true;
            this.startRecordingTimer();

            this.showNotification('Recording video panel...', 'success');
            console.log('🎥 System recording started (video panel)');

        } catch (error) {
            console.error('Error starting system recording:', error);
            this.showNotification('Failed to start recording: ' + error.message, 'error');
        }
    }

    /**
     * Capture video grid frame to canvas
     */
    captureVideoGridFrame(ctx, width, height) {
        const videoGrid = document.getElementById('videoGrid');
        if (!videoGrid) return;

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);

        // Find all video elements and draw them
        const videos = videoGrid.querySelectorAll('video');
        const videoCount = videos.length;

        if (videoCount === 0) return;

        // Simple grid layout
        const cols = Math.ceil(Math.sqrt(videoCount));
        const rows = Math.ceil(videoCount / cols);
        const cellWidth = width / cols;
        const cellHeight = height / rows;

        videos.forEach((video, index) => {
            if (video.readyState >= 2) { // HAVE_CURRENT_DATA
                const col = index % cols;
                const row = Math.floor(index / cols);
                const x = col * cellWidth;
                const y = row * cellHeight;

                try {
                    ctx.drawImage(video, x, y, cellWidth, cellHeight);
                } catch (e) {
                    // Video might not be ready
                }
            }
        });
    }

    /**
     * Start local recording - captures entire modal, downloads locally
     */
    async startLocalRecording() {
        const recordBtn = document.getElementById('recordBtn');

        try {
            // Use screen capture to record the entire modal
            let displayStream;

            try {
                displayStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        displaySurface: 'window',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        frameRate: { ideal: 30 }
                    },
                    audio: true
                });
            } catch (displayError) {
                console.log('Screen capture declined, falling back to canvas capture');
                if (this.canvas) {
                    displayStream = this.canvas.captureStream(30);
                } else {
                    this.showNotification('Cannot start recording. Please allow screen capture.', 'warning');
                    return;
                }
            }

            const tracks = [...displayStream.getTracks()];

            if (this.localStream && !this.isAudioMuted) {
                const audioTracks = this.localStream.getAudioTracks();
                tracks.push(...audioTracks);
            }

            const combinedStream = new MediaStream(tracks);

            const options = { mimeType: 'video/webm;codecs=vp9,opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm;codecs=vp8,opus';
            }
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm';
            }

            this.mediaRecorder = new MediaRecorder(combinedStream, options);
            this.recordedChunks = [];
            this.recordingStartTime = Date.now();
            this.displayStream = displayStream;

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                await this.processRecording();
            };

            this.mediaRecorder.onerror = (event) => {
                console.error('Recording error:', event.error);
                this.showNotification('Recording error: ' + event.error.message, 'error');
                this.stopRecordingSession();
            };

            displayStream.getVideoTracks()[0].onended = () => {
                if (this.isRecording) {
                    this.stopRecordingSession();
                }
            };

            this.mediaRecorder.start(1000);
            this.isRecording = true;
            this.startRecordingTimer();

            this.showNotification('Recording entire modal...', 'success');
            console.log('🎥 Local recording started (entire modal)');

        } catch (error) {
            console.error('Error starting local recording:', error);
            this.showNotification('Failed to start recording: ' + error.message, 'error');
        }
    }

    /**
     * Start recording the whiteboard session (LEGACY - kept for compatibility)
     * Captures the entire modal using screen capture API
     */
    async startRecordingSession() {
        // Default to local recording for backward compatibility
        this.recordingMode = 'local';
        await this.startLocalRecording();
    }

    /**
     * Start the recording timer displayed on the button
     */
    startRecordingTimer() {
        const recordBtn = document.getElementById('recordBtn');
        if (!recordBtn) return;

        this.recordingTimerInterval = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            recordBtn.innerHTML = `<i class="fas fa-stop"></i> ${timeStr}`;
        }, 1000);

        // Set initial state
        recordBtn.classList.add('recording');
        recordBtn.innerHTML = '<i class="fas fa-stop"></i> 00:00';
    }

    /**
     * Stop the recording timer
     */
    stopRecordingTimer() {
        if (this.recordingTimerInterval) {
            clearInterval(this.recordingTimerInterval);
            this.recordingTimerInterval = null;
        }
    }

    /**
     * Stop the current recording session
     */
    async stopRecordingSession() {
        const recordBtn = document.getElementById('recordBtn');

        // Stop the recording timer
        this.stopRecordingTimer();

        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        // Stop display stream tracks
        if (this.displayStream) {
            this.displayStream.getTracks().forEach(track => track.stop());
            this.displayStream = null;
        }

        // Clean up system recording resources
        if (this.systemRecordingCapture) {
            clearInterval(this.systemRecordingCapture);
            this.systemRecordingCapture = null;
        }

        // Close audio context used for mixing
        if (this.audioContext) {
            try {
                this.audioContext.close();
            } catch (e) {
                console.log('Audio context already closed');
            }
            this.audioContext = null;
        }

        // Clean up capture canvas
        if (this.captureCanvas) {
            this.captureCanvas = null;
        }

        this.isRecording = false;

        if (recordBtn) {
            recordBtn.classList.remove('recording');
            recordBtn.innerHTML = '<i class="fas fa-circle"></i> Record';
        }

        this.showNotification('Recording stopped. Processing...', 'info');
    }

    /**
     * Process the recorded chunks into a downloadable/uploadable file
     */
    async processRecording() {
        if (!this.recordedChunks || this.recordedChunks.length === 0) {
            this.showNotification('No recording data captured', 'warning');
            return;
        }

        try {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            const duration = Math.round((Date.now() - this.recordingStartTime) / 1000);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `whiteboard-recording-${timestamp}.webm`;

            if (this.recordingMode === 'system') {
                // SYSTEM MODE: Upload to server
                await this.uploadRecordingToServer(blob, filename, duration);
            } else {
                // LOCAL MODE: Download to computer
                await this.downloadRecordingLocally(blob, filename, duration);
            }

            // Clear recorded chunks
            this.recordedChunks = [];
            this.recordingStartTime = null;
            this.recordingMode = null;

        } catch (error) {
            console.error('Error processing recording:', error);
            this.showNotification('Failed to process recording', 'error');
        }
    }

    /**
     * Upload recording to server (System mode)
     */
    async uploadRecordingToServer(blob, filename, duration) {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');

        if (!token) {
            this.showNotification('Authentication required to save recording', 'error');
            // Fall back to local download
            await this.downloadRecordingLocally(blob, filename, duration);
            return;
        }

        this.showNotification('Uploading recording to server...', 'info');

        try {
            const formData = new FormData();
            formData.append('video', blob, filename);

            // Use currentCallId if available, otherwise use current session
            if (this.currentCallId) {
                formData.append('call_id', this.currentCallId);
            } else if (this.currentSession) {
                formData.append('session_id', this.currentSession.id);
            }

            const response = await fetch(`${this.API_BASE}/recordings/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                console.log('🎥 Recording uploaded:', data);

                // If we have a call_id and got a file_url, update the call history
                if (this.currentCallId && data.file_url) {
                    await this.updateCallHistoryRecording(this.currentCallId, data.file_url);
                }

                this.showNotification(`Recording saved to system! Duration: ${duration}s`, 'success');
                console.log(`🎥 Recording uploaded: ${filename}, ${duration}s, ${(blob.size / 1024 / 1024).toFixed(2)}MB`);

                // Refresh call history to show the new recording indicator
                await this.loadCallHistory();
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Upload failed:', errorData);
                this.showNotification('Upload failed. Downloading locally instead.', 'warning');
                // Fall back to local download
                await this.downloadRecordingLocally(blob, filename, duration);
            }
        } catch (error) {
            console.error('Error uploading recording:', error);
            this.showNotification('Upload failed. Downloading locally instead.', 'warning');
            // Fall back to local download
            await this.downloadRecordingLocally(blob, filename, duration);
        }
    }

    /**
     * Update call history with recording URL
     */
    async updateCallHistoryRecording(callId, recordingUrl) {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');

        try {
            const response = await fetch(`${this.API_BASE}/call-history/${callId}/recording`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recording_url: recordingUrl
                })
            });

            if (response.ok) {
                console.log('✅ Call history updated with recording URL');
            } else {
                console.error('Failed to update call history with recording URL');
            }
        } catch (error) {
            console.error('Error updating call history recording:', error);
        }
    }

    /**
     * Download recording locally (Local mode)
     */
    async downloadRecordingLocally(blob, filename, duration) {
        // Create download link
        const url = URL.createObjectURL(blob);

        // Auto-download the recording
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        // Save recording metadata to database if session exists
        if (this.currentSession) {
            await this.saveRecordingMetadata(filename, duration, blob.size);
        }

        this.showNotification(`Recording downloaded! Duration: ${duration}s`, 'success');
        console.log(`🎥 Recording downloaded: ${filename}, ${duration}s, ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
    }

    /**
     * Save recording metadata to database
     */
    async saveRecordingMetadata(filename, duration, fileSize) {
        if (!this.currentSession) return;

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const recordingTitle = `${this.currentSession.session_title || 'Session'} - ${new Date().toLocaleDateString()}`;

            const response = await fetch(`${this.API_BASE}/recordings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: this.currentSession.id,
                    recording_title: recordingTitle,
                    recording_type: 'canvas',
                    file_name: filename,
                    file_size: fileSize,
                    duration_seconds: duration
                })
            });

            const data = await response.json();
            if (data.success) {
                console.log('✅ Recording metadata saved to database');
            }
        } catch (error) {
            console.error('Error saving recording metadata:', error);
            // Non-critical - recording is still downloaded locally
        }
    }

    /**
     * Load and render students list in Students panel
     * Context-aware: loads all enrolled students or single student based on context
     */
    async loadStudentsList() {
        const container = document.getElementById('studentsList');
        if (!container) return;

        // Show loading state
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 8px;"></i>
                <p>Loading students...</p>
            </div>
        `;

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 8px;"></i>
                        <p>Please log in to view students</p>
                    </div>
                `;
                return;
            }

            // Build URL with optional student_id for single student context
            let url = `${this.API_BASE}/context/enrolled-students`;
            if (this.contextStudentId) {
                url += `?student_id=${this.contextStudentId}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to load students');
            }

            this.enrolledStudents = data.students || [];
            this.context = data.context || 'all_students';

            if (this.enrolledStudents.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                        <i class="fas fa-user-graduate" style="font-size: 2rem; margin-bottom: 8px;"></i>
                        <p>No enrolled students yet</p>
                        <p style="font-size: 0.75rem; margin-top: 8px;">Students who enroll in your packages will appear here</p>
                    </div>
                `;
                return;
            }

            // Render student cards
            container.innerHTML = this.enrolledStudents.map(student => `
                <div class="student-card" data-student-id="${student.student_profile_id}" data-user-id="${student.student_user_id}" data-name="${student.name}">
                    ${student.profile_picture && !student.profile_picture.includes('user-default') ?
                        `<img src="${student.profile_picture}"
                             alt="${student.name}"
                             class="student-card-avatar"
                             onerror="whiteboardManager.handleAvatarError(this, '${student.name.replace(/'/g, "\\'")}')">` :
                        this.getInitialsAvatar(student.name, 'medium')
                    }
                    <div class="student-card-info">
                        <h4 class="student-card-name">${student.name}</h4>
                        <p class="student-card-classes">${student.courses.join(', ') || student.package_name || 'No courses'}</p>
                        ${student.grade_level ? `<span class="student-card-grade">${student.grade_level}</span>` : ''}
                    </div>
                </div>
            `).join('');

            // Add click handlers to student cards (pass event for multi-select detection)
            container.querySelectorAll('.student-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    const studentId = parseInt(card.dataset.studentId);
                    this.selectStudent(studentId, e);
                });
            });

            // Setup search functionality
            this.setupStudentSearch();

            console.log(`✅ Loaded ${this.enrolledStudents.length} enrolled students (context: ${this.context})`);

        } catch (error) {
            console.error('Error loading students:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 8px;"></i>
                    <p>Failed to load students</p>
                    <p style="font-size: 0.75rem; margin-top: 8px;">${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Setup student search functionality
     */
    setupStudentSearch() {
        const searchInput = document.getElementById('studentsSearch');
        const container = document.getElementById('studentsList');
        if (!searchInput || !container) return;

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            container.querySelectorAll('.student-card').forEach(card => {
                const name = card.querySelector('.student-card-name')?.textContent.toLowerCase() || '';
                const classes = card.querySelector('.student-card-classes')?.textContent.toLowerCase() || '';
                const matches = name.includes(searchTerm) || classes.includes(searchTerm);
                card.style.display = matches ? 'flex' : 'none';
            });
        });
    }

    // ============================================
    // STUDENT PERSPECTIVE METHODS
    // When user is a student, load tutors instead of students
    // ============================================

    /**
     * Load and render tutors list in Students/Tutors panel (STUDENT PERSPECTIVE)
     * Context-aware: loads all enrolled tutors or single tutor based on context
     */
    async loadTutorsList() {
        const container = document.getElementById('studentsList');
        if (!container) return;

        // Update panel header to say "Tutors" instead of "Students"
        const panelHeader = document.querySelector('#studentsPanel .sidebar-panel-header h3');
        if (panelHeader) {
            panelHeader.innerHTML = '<i class="fas fa-chalkboard-teacher"></i> My Tutors';
        }

        // Also update the sidebar icon button tooltip
        const sidebarBtn = document.querySelector('.sidebar-icon-btn[data-panel="students"]');
        if (sidebarBtn) {
            sidebarBtn.title = 'My Tutors';
        }

        // Update search placeholder
        const searchInput = document.getElementById('studentsSearch');
        if (searchInput) {
            searchInput.placeholder = 'Search tutors...';
        }

        // Show loading state
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 8px;"></i>
                <p>Loading tutors...</p>
            </div>
        `;

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 8px;"></i>
                        <p>Please log in to view tutors</p>
                    </div>
                `;
                return;
            }

            // Build URL with optional tutor_id for single tutor context
            let url = `${this.API_BASE}/context/enrolled-tutors`;
            if (this.contextTutorId) {
                url += `?tutor_id=${this.contextTutorId}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to load tutors');
            }

            this.enrolledTutors = data.tutors || [];
            this.context = data.context || 'all_tutors';

            if (this.enrolledTutors.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                        <i class="fas fa-chalkboard-teacher" style="font-size: 2rem; margin-bottom: 8px;"></i>
                        <p>No enrolled tutors yet</p>
                        <p style="font-size: 0.75rem; margin-top: 8px;">Tutors you enroll with will appear here</p>
                    </div>
                `;
                return;
            }

            // Render tutor cards (using similar styling to student cards)
            container.innerHTML = this.enrolledTutors.map(tutor => `
                <div class="student-card tutor-card" data-tutor-id="${tutor.tutor_profile_id}" data-user-id="${tutor.tutor_user_id}" data-name="${tutor.name}">
                    ${tutor.profile_picture && !tutor.profile_picture.includes('user-default') ?
                        `<img src="${tutor.profile_picture}"
                             alt="${tutor.name}"
                             class="student-card-avatar"
                             onerror="whiteboardManager.handleAvatarError(this, '${tutor.name.replace(/'/g, "\\'")}')">` :
                        this.getInitialsAvatar(tutor.name, 'medium')
                    }
                    <div class="student-card-info">
                        <h4 class="student-card-name">${tutor.name}${tutor.is_verified ? ' <i class="fas fa-check-circle" style="color: #10b981; font-size: 0.7rem;" title="Verified"></i>' : ''}</h4>
                        <p class="student-card-classes">${tutor.courses.join(', ') || tutor.package_name || 'No courses'}</p>
                        ${tutor.expertise_badge ? `<span class="student-card-grade">${tutor.expertise_badge}</span>` : ''}
                    </div>
                </div>
            `).join('');

            // Add click handlers to tutor cards (pass event for multi-select detection)
            container.querySelectorAll('.tutor-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    const tutorId = parseInt(card.dataset.tutorId);
                    this.selectTutor(tutorId, e);
                });
            });

            // Setup search functionality (reuse student search)
            this.setupTutorSearch();

            console.log(`✅ Loaded ${this.enrolledTutors.length} enrolled tutors (context: ${this.context})`);

        } catch (error) {
            console.error('Error loading tutors:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 8px;"></i>
                    <p>Failed to load tutors</p>
                    <p style="font-size: 0.75rem; margin-top: 8px;">${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Setup tutor search functionality
     */
    setupTutorSearch() {
        const searchInput = document.getElementById('studentsSearch');
        const container = document.getElementById('studentsList');
        if (!searchInput || !container) return;

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            container.querySelectorAll('.tutor-card').forEach(card => {
                const name = card.querySelector('.student-card-name')?.textContent.toLowerCase() || '';
                const classes = card.querySelector('.student-card-classes')?.textContent.toLowerCase() || '';
                const matches = name.includes(searchTerm) || classes.includes(searchTerm);
                card.style.display = matches ? 'flex' : 'none';
            });
        });
    }

    /**
     * Select a tutor and load their coursework (STUDENT PERSPECTIVE)
     * Supports multi-selection with Ctrl/Cmd+click
     */
    async selectTutor(tutorProfileId, event = null) {
        const container = document.getElementById('studentsList');
        const card = container.querySelector(`.tutor-card[data-tutor-id="${tutorProfileId}"]`);
        const tutor = this.enrolledTutors.find(t => t.tutor_profile_id === tutorProfileId);

        // If in add participant mode, directly call this person
        if (this.isAddingParticipantMode && tutor) {
            await this.handleAddParticipantCardClick(
                tutorProfileId,
                'tutor',
                tutor.name,
                tutor.profile_picture
            );
            return;
        }

        // Check if multi-select mode (Ctrl/Cmd key held)
        const isMultiSelect = event && (event.ctrlKey || event.metaKey);

        if (isMultiSelect) {
            // Toggle this tutor in the selectedParticipants array
            const existingIndex = this.selectedParticipants.findIndex(p => p.id === tutorProfileId);

            if (existingIndex >= 0) {
                // Remove from selection
                this.selectedParticipants.splice(existingIndex, 1);
                card?.classList.remove('selected');
            } else if (tutor) {
                // Add to selection (max 4 participants)
                if (this.selectedParticipants.length < 4) {
                    this.selectedParticipants.push({
                        id: tutorProfileId,
                        role: 'tutor',
                        name: tutor.name,
                        avatar: tutor.profile_picture
                    });
                    card?.classList.add('selected');
                } else {
                    this.showNotification('Maximum 4 participants can be selected', 'warning');
                    return;
                }
            }
        } else {
            // Single select mode - clear others and select this one
            this.selectedParticipants = [];
            container.querySelectorAll('.tutor-card').forEach(c => c.classList.remove('selected'));

            if (tutor) {
                this.selectedParticipants.push({
                    id: tutorProfileId,
                    role: 'tutor',
                    name: tutor.name,
                    avatar: tutor.profile_picture
                });
                card?.classList.add('selected');
            }
        }

        // Update contextTutorId for coursework loading (use first selected)
        this.contextTutorId = this.selectedParticipants.length > 0 ? this.selectedParticipants[0].id : null;

        // Update selectedTutorId for video calls (primary participant)
        this.selectedTutorId = this.selectedParticipants.length > 0 ? this.selectedParticipants[0].id : null;

        // Load coursework from first selected tutor
        if (this.contextTutorId) {
            await this.loadStudentCourseworkList();
        }

        // Update video grid with all selected participants
        this.updateVideoGridWithParticipants();

        // Enable the Start Session button if at least one participant is selected
        const startBtn = document.getElementById('startVideoSessionBtn');
        if (startBtn) {
            startBtn.disabled = this.selectedParticipants.length === 0;
            const count = this.selectedParticipants.length;
            startBtn.title = count === 0
                ? 'Select a tutor first'
                : count === 1
                    ? 'Start live video call with selected tutor'
                    : `Start live video call with ${count} participants`;
        }

        console.log('📚 Selected participants:', this.selectedParticipants.map(p => p.name));
    }

    /**
     * Update video grid when a tutor is selected (STUDENT PERSPECTIVE)
     */
    updateVideoGridForTutor(tutorProfileId) {
        const videoGrid = document.getElementById('studentVideoGrid');
        if (!videoGrid) return;

        // Find the selected tutor
        const tutor = this.enrolledTutors.find(t => t.tutor_profile_id === tutorProfileId);

        if (tutor) {
            // Update grid to show selected tutor prominently
            const avatarHtml = tutor.profile_picture && !tutor.profile_picture.includes('user-default') ?
                `<img src="${tutor.profile_picture}"
                     alt="${tutor.name}"
                     class="student-avatar"
                     id="mainTutorVideoAvatar"
                     onerror="whiteboardManager.handleAvatarError(this, '${tutor.name.replace(/'/g, "\\'")}')">` :
                this.getInitialsAvatar(tutor.name, 'large');

            videoGrid.innerHTML = `
                <div class="student-video-placeholder selected" id="mainTutorVideoPlaceholder">
                    ${avatarHtml}
                    <div class="student-name" id="mainTutorVideoParticipantName">${tutor.name}</div>
                    <div class="student-status online">
                        <i class="fas fa-circle"></i>
                    </div>
                </div>
            `;
        } else {
            // Show all enrolled tutors in video grid (up to 4)
            const displayTutors = this.enrolledTutors.slice(0, 4);
            videoGrid.innerHTML = displayTutors.map(t => {
                const avatarHtml = t.profile_picture && !t.profile_picture.includes('user-default') ?
                    `<img src="${t.profile_picture}"
                         alt="${t.name}"
                         class="student-avatar"
                         onerror="whiteboardManager.handleAvatarError(this, '${t.name.replace(/'/g, "\\'")}')">` :
                    this.getInitialsAvatar(t.name, 'medium');

                return `
                    <div class="student-video-placeholder" data-tutor-id="${t.tutor_profile_id}">
                        ${avatarHtml}
                        <div class="student-name">${t.name}</div>
                        <div class="student-status offline">
                            <i class="fas fa-circle"></i>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    /**
     * Load student info for video panel (STUDENT PERSPECTIVE)
     */
    async loadStudentInfo() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) return;

            const response = await fetch(`${this.API_BASE}/context/student-info`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success && data.student) {
                this.studentInfo = data.student;
                this.updateStudentVideoDisplay();
            }
        } catch (error) {
            console.error('Error loading student info:', error);
        }
    }

    /**
     * Update student video display with loaded info (STUDENT PERSPECTIVE)
     */
    updateStudentVideoDisplay() {
        if (!this.studentInfo) return;

        // Update the tutor video display to show current student instead
        const tutorAvatar = document.getElementById('tutorVideoAvatar');
        const tutorName = document.getElementById('tutorVideoParticipantName');

        if (tutorAvatar) {
            if (this.studentInfo.profile_picture && !this.studentInfo.profile_picture.includes('user-default')) {
                // Has valid profile picture - create img element
                this.updateAvatarWithImage(tutorAvatar, this.studentInfo.profile_picture, this.studentInfo.name, 'large');
            } else {
                // No profile picture - show initials
                this.updateAvatarWithInitials(tutorAvatar, this.studentInfo.name, 'large');
            }
        }

        if (tutorName) {
            tutorName.textContent = this.studentInfo.name + ' (You)';
        }
    }

    /**
     * Load coursework list for student (STUDENT PERSPECTIVE)
     * Shows coursework assigned TO this student, optionally filtered by tutor
     */
    async loadStudentCourseworkList() {
        const container = document.getElementById('courseworkList');
        if (!container) return;

        // Show loading state
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 8px;"></i>
                <p>Loading coursework...</p>
            </div>
        `;

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 8px;"></i>
                        <p>Please log in to view coursework</p>
                    </div>
                `;
                return;
            }

            // Build URL with optional tutor_id for filtering
            let url = `${this.API_BASE}/context/student-coursework`;
            if (this.contextTutorId) {
                url += `?tutor_id=${this.contextTutorId}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to load coursework');
            }

            this.courseworkList = data.coursework || [];

            if (this.courseworkList.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="text-align: center; padding: 20px; color: var(--text-secondary);">
                        <i class="fas fa-clipboard-list" style="font-size: 2rem; margin-bottom: 8px;"></i>
                        <p>No coursework yet</p>
                        <p style="font-size: 0.75rem; margin-top: 8px;">Coursework assigned by your tutors will appear here</p>
                    </div>
                `;
                return;
            }

            // Render coursework items (with tutor name instead of student name)
            container.innerHTML = this.courseworkList.map(cw => `
                <div class="coursework-item" data-id="${cw.id}" onclick="whiteboardManager.openCourseworkDetails('${cw.id}')">
                    <div class="coursework-header">
                        <span class="coursework-type ${cw.coursework_type}">${cw.coursework_type || 'Assignment'}</span>
                        <span class="coursework-status ${cw.status}">${cw.status}</span>
                    </div>
                    <h5 class="coursework-title">${cw.title || cw.course_name}</h5>
                    <div class="coursework-meta">
                        <span><i class="fas fa-chalkboard-teacher"></i> ${cw.tutor_name || 'Unknown Tutor'}</span>
                        ${cw.due_date ? `<span><i class="fas fa-calendar"></i> Due: ${new Date(cw.due_date).toLocaleDateString()}</span>` : ''}
                    </div>
                    <div class="coursework-stats">
                        <span><i class="fas fa-question-circle"></i> ${cw.question_count} questions</span>
                        <span><i class="fas fa-star"></i> ${cw.total_points} points</span>
                    </div>
                </div>
            `).join('');

            console.log(`✅ Loaded ${this.courseworkList.length} coursework items (student perspective)`);

        } catch (error) {
            console.error('Error loading student coursework:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 8px;"></i>
                    <p>Failed to load coursework</p>
                    <p style="font-size: 0.75rem; margin-top: 8px;">${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Open whiteboard for a specific tutor (STUDENT PERSPECTIVE - from Tutor Details Modal)
     * @param {number} tutorProfileId - The tutor's profile ID
     */
    async openWhiteboardForTutor(tutorProfileId) {
        console.log('🎨 Opening whiteboard for tutor (student perspective):', tutorProfileId);
        this.contextTutorId = tutorProfileId;
        this.context = 'single_tutor';
        this.userRole = 'student';
        await this.openWhiteboard(null, null, 'tutor_details');
    }

    /**
     * Open whiteboard from Learning Tools (STUDENT PERSPECTIVE - all tutors context)
     */
    async openWhiteboardFromLearningTools() {
        console.log('🎨 Opening whiteboard from Learning Tools (student perspective - all tutors)');
        this.contextTutorId = null;
        this.context = 'all_tutors';
        this.userRole = 'student';
        await this.openWhiteboard(null, null, 'learning_tools');
    }

    // ============================================
    // END STUDENT PERSPECTIVE METHODS
    // ============================================

    /**
     * Select a student and load their coursework
     * Supports multi-selection with Ctrl/Cmd+click
     */
    async selectStudent(studentProfileId, event = null) {
        const container = document.getElementById('studentsList');
        const card = container.querySelector(`.student-card[data-student-id="${studentProfileId}"]`);
        const student = this.enrolledStudents.find(s => s.student_profile_id === studentProfileId);

        // If in add participant mode, directly call this person
        if (this.isAddingParticipantMode && student) {
            await this.handleAddParticipantCardClick(
                studentProfileId,
                'student',
                student.name,
                student.profile_picture
            );
            return;
        }

        // Check if multi-select mode (Ctrl/Cmd key held)
        const isMultiSelect = event && (event.ctrlKey || event.metaKey);

        if (isMultiSelect) {
            // Toggle this student in the selectedParticipants array
            const existingIndex = this.selectedParticipants.findIndex(p => p.id === studentProfileId);

            if (existingIndex >= 0) {
                // Remove from selection
                this.selectedParticipants.splice(existingIndex, 1);
                card?.classList.remove('selected');
            } else if (student) {
                // Add to selection (max 4 participants)
                if (this.selectedParticipants.length < 4) {
                    this.selectedParticipants.push({
                        id: studentProfileId,
                        role: 'student',
                        name: student.name,
                        avatar: student.profile_picture
                    });
                    card?.classList.add('selected');
                } else {
                    this.showNotification('Maximum 4 participants can be selected', 'warning');
                    return;
                }
            }
        } else {
            // Single select mode - clear others and select this one
            this.selectedParticipants = [];
            container.querySelectorAll('.student-card').forEach(c => c.classList.remove('selected'));

            if (student) {
                this.selectedParticipants.push({
                    id: studentProfileId,
                    role: 'student',
                    name: student.name,
                    avatar: student.profile_picture
                });
                card?.classList.add('selected');
            }
        }

        // Update contextStudentId for coursework loading (use first selected)
        this.contextStudentId = this.selectedParticipants.length > 0 ? this.selectedParticipants[0].id : null;

        // Update selectedStudentId for video calls (primary participant)
        this.selectedStudentId = this.selectedParticipants.length > 0 ? this.selectedParticipants[0].id : null;

        // Load coursework for first selected student
        if (this.contextStudentId) {
            await this.loadCourseworkList();
        }

        // Update video grid with all selected participants
        this.updateVideoGridWithParticipants();

        // Enable the Start Session button if at least one participant is selected
        const startBtn = document.getElementById('startVideoSessionBtn');
        if (startBtn) {
            startBtn.disabled = this.selectedParticipants.length === 0;
            const count = this.selectedParticipants.length;
            startBtn.title = count === 0
                ? 'Select a student first'
                : count === 1
                    ? 'Start live video call with selected student'
                    : `Start live video call with ${count} participants`;
        }

        console.log('📚 Selected participants:', this.selectedParticipants.map(p => p.name));
    }

    /**
     * Update video grid to show all selected participants
     */
    updateVideoGridWithParticipants() {
        const videoGrid = document.getElementById('studentVideoGrid');
        if (!videoGrid) return;

        if (this.selectedParticipants.length === 0) {
            // Show all enrolled students/tutors (up to 4)
            const displayList = this.userRole === 'student' ? this.enrolledTutors : this.enrolledStudents;
            const displayItems = displayList.slice(0, 4);

            if (displayItems.length === 0) {
                videoGrid.innerHTML = `
                    <div class="empty-video-grid">
                        <i class="fas fa-users"></i>
                        <p>No ${this.userRole === 'student' ? 'tutors' : 'students'} to display</p>
                    </div>
                `;
                return;
            }

            videoGrid.innerHTML = displayItems.map(item => {
                const id = this.userRole === 'student' ? item.tutor_profile_id : item.student_profile_id;
                const avatar = item.profile_picture && !item.profile_picture.includes('user-default') ?
                    `<img src="${item.profile_picture}" alt="${item.name}" class="student-avatar"
                         onerror="whiteboardManager.handleAvatarError(this, '${item.name.replace(/'/g, "\\'")}')">` :
                    this.getInitialsAvatar(item.name, 'medium');

                return `
                    <div class="student-video-placeholder" data-participant-id="${id}">
                        ${avatar}
                        <div class="student-name">${item.name}</div>
                        <div class="student-status offline">
                            <i class="fas fa-circle"></i>
                        </div>
                    </div>
                `;
            }).join('');
            return;
        }

        // If in active session, don't replace the entire grid - just ensure all participants have cards
        const isInActiveCall = this.isVideoSessionActive || this.isCallPending;

        if (isInActiveCall) {
            // During active call, only add missing participants, don't remove existing ones
            // This prevents replacing video elements that already have streams
            this.selectedParticipants.forEach((participant, index) => {
                const existingPlaceholder = videoGrid.querySelector(
                    `.student-video-placeholder[data-participant-id="${participant.id}"]`
                );

                if (!existingPlaceholder) {
                    // Add new participant card without removing existing ones
                    this.addParticipantToVideoGrid(participant);
                }
            });

            // Update remove buttons visibility on all cards
            const allPlaceholders = videoGrid.querySelectorAll('.student-video-placeholder');
            allPlaceholders.forEach(placeholder => {
                const participantId = parseInt(placeholder.dataset.participantId);
                let removeBtn = placeholder.querySelector('.remove-participant-btn');

                if (this.selectedParticipants.length > 1) {
                    // Add remove button if not exists
                    if (!removeBtn) {
                        removeBtn = document.createElement('button');
                        removeBtn.className = 'remove-participant-btn';
                        removeBtn.title = 'Remove from call';
                        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                        removeBtn.onclick = () => whiteboardManager.removeParticipant(participantId);
                        placeholder.appendChild(removeBtn);
                    }
                } else {
                    // Remove the button if only one participant
                    if (removeBtn) removeBtn.remove();
                }
            });
            return;
        }

        // Not in active call - full re-render is OK
        videoGrid.innerHTML = this.selectedParticipants.map((participant, index) => {
            const avatar = participant.avatar && !participant.avatar.includes('user-default') ?
                `<img src="${participant.avatar}" alt="${participant.name}" class="student-avatar"
                     onerror="whiteboardManager.handleAvatarError(this, '${participant.name.replace(/'/g, "\\'")}')">` :
                this.getInitialsAvatar(participant.name, index === 0 ? 'large' : 'medium');

            return `
                <div class="student-video-placeholder ${index === 0 ? 'selected' : ''}"
                     data-participant-id="${participant.id}"
                     data-participant-role="${participant.role}">
                    ${avatar}
                    <div class="student-name">${participant.name}</div>
                    <div class="student-status online">
                        <i class="fas fa-circle"></i>
                    </div>
                    ${this.selectedParticipants.length > 1 ? `
                        <button class="remove-participant-btn" onclick="whiteboardManager.removeParticipant(${participant.id})" title="Remove">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    /**
     * Remove a participant from the selection or end call with them if session is active
     */
    removeParticipant(participantId) {
        const participant = this.selectedParticipants.find(p => p.id === participantId);
        const index = this.selectedParticipants.findIndex(p => p.id === participantId);

        if (index < 0) return;

        // Check if we're in an active video session
        const isInActiveCall = this.isVideoSessionActive || this.isCallPending;

        if (isInActiveCall && this.connectedParticipants.includes(participantId)) {
            // Active call - end the call with this specific participant
            console.log(`📞 Ending call with participant ${participantId}`);

            // Send end call message to this participant
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                const message = {
                    type: 'video_call_participant_left',
                    session_id: this.currentSession?.id,
                    left_participant_id: this.userRole === 'student'
                        ? (this.studentInfo?.student_profile_id || this.studentInfo?.id)
                        : (this.tutorInfo?.tutor_profile_id || this.tutorInfo?.id),
                    left_participant_name: this.userRole === 'student'
                        ? (this.studentInfo?.name || 'Student')
                        : (this.tutorInfo?.name || 'Tutor'),
                    left_participant_role: this.userRole,
                    reason: 'removed_by_host'
                };

                // Route to the participant being removed
                if (participant?.role === 'student') {
                    message.to_student_profile_id = participantId;
                } else {
                    message.to_tutor_profile_id = participantId;
                }

                this.ws.send(JSON.stringify(message));
            }

            // Close peer connection with this participant
            if (this.peerConnections.has(participantId)) {
                const pc = this.peerConnections.get(participantId);
                pc.close();
                this.peerConnections.delete(participantId);
            }

            // Remove from connected participants
            this.connectedParticipants = this.connectedParticipants.filter(id => id !== participantId);

            // Remove remote stream
            this.remoteStreams.delete(participantId);

            this.showNotification(`${participant?.name || 'Participant'} removed from call`, 'info');
        }

        // Remove from selectedParticipants array
        this.selectedParticipants.splice(index, 1);

        // Update card selection state in sidebar
        const container = document.getElementById('studentsList');
        const card = container?.querySelector(`.student-card[data-student-id="${participantId}"], .student-card[data-tutor-id="${participantId}"]`);
        if (card) {
            card.classList.remove('selected', 'already-in-call');
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
        }

        // Update primary selected ID
        this.selectedStudentId = this.selectedParticipants.length > 0 ? this.selectedParticipants[0].id : null;
        this.selectedTutorId = this.selectedParticipants.length > 0 ? this.selectedParticipants[0].id : null;

        // Remove the video placeholder for this participant (don't re-render entire grid)
        const placeholder = document.querySelector(`.student-video-placeholder[data-participant-id="${participantId}"]`);
        if (placeholder) {
            placeholder.remove();
        }

        // Update button state
        const startBtn = document.getElementById('startVideoSessionBtn');
        if (startBtn && !isInActiveCall) {
            startBtn.disabled = this.selectedParticipants.length === 0;
        }

        // If no participants left in an active call, end the session
        if (isInActiveCall && this.selectedParticipants.length === 0) {
            this.showNotification('All participants removed. Ending session.', 'info');
            this.endVideoSession(false);
        }
    }

    /**
     * Open whiteboard with a specific student
     */
    async openWhiteboardWithStudent(studentId) {
        console.log('Opening whiteboard for student:', studentId);
        // Set context before opening
        this.contextStudentId = studentId;
        this.context = 'single_student';
        await this.openWhiteboard(null, studentId);
    }

    /**
     * Load coursework list for whiteboard panel
     * Context-aware: loads all coursework or single student's coursework
     */
    async loadCourseworkList() {
        const container = document.getElementById('courseworkList');
        if (!container) return;

        // Show loading state
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 8px;"></i>
                <p>Loading coursework...</p>
            </div>
        `;

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 8px;"></i>
                        <p>Please log in to view coursework</p>
                    </div>
                `;
                return;
            }

            // Build URL with optional student_id for single student context
            let url = `${this.API_BASE}/context/coursework`;
            if (this.contextStudentId) {
                url += `?student_id=${this.contextStudentId}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to load coursework');
            }

            this.courseworkList = data.coursework || [];

            if (this.courseworkList.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="text-align: center; padding: 20px; color: var(--text-secondary);">
                        <i class="fas fa-clipboard-list" style="font-size: 2rem; margin-bottom: 8px;"></i>
                        <p>No coursework yet</p>
                        <button class="btn-primary" onclick="whiteboardManager.createCourseworkForCurrentStudent()" style="margin-top: 12px;">
                            <i class="fas fa-plus"></i> Create Coursework
                        </button>
                    </div>
                `;
                return;
            }

            // Render coursework list
            container.innerHTML = this.courseworkList.map(cw => {
                const statusColors = {
                    'draft': 'bg-gray-100 text-gray-600',
                    'posted': 'bg-blue-100 text-blue-600',
                    'in_progress': 'bg-yellow-100 text-yellow-600',
                    'submitted': 'bg-green-100 text-green-600',
                    'graded': 'bg-purple-100 text-purple-600'
                };
                const statusClass = statusColors[cw.status] || 'bg-gray-100 text-gray-600';

                return `
                    <div class="coursework-item" data-coursework-id="${cw.id}" onclick="whiteboardManager.openCourseworkDetails('${cw.id}')">
                        <div class="coursework-header">
                            <span class="coursework-title">${cw.title || cw.course_name || 'Untitled'}</span>
                            <span class="coursework-status ${statusClass}">${cw.status}</span>
                        </div>
                        <div class="coursework-meta">
                            <span class="coursework-type">
                                <i class="fas fa-${cw.coursework_type === 'quiz' ? 'question-circle' : cw.coursework_type === 'assignment' ? 'tasks' : 'book'}"></i>
                                ${cw.coursework_type}
                            </span>
                            ${cw.student_name ? `
                                <span class="coursework-student">
                                    <i class="fas fa-user"></i>
                                    ${cw.student_name}
                                </span>
                            ` : ''}
                            <span class="coursework-points">
                                <i class="fas fa-star"></i>
                                ${cw.scored_points || 0}/${cw.total_points || 0} pts
                            </span>
                        </div>
                        ${cw.due_date ? `
                            <div class="coursework-due">
                                <i class="fas fa-calendar"></i>
                                Due: ${new Date(cw.due_date).toLocaleDateString()}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');

            // Setup coursework search
            this.setupCourseworkSearch();

            console.log(`✅ Loaded ${this.courseworkList.length} coursework items (context: ${this.context})`);

        } catch (error) {
            console.error('Error loading coursework:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 8px;"></i>
                    <p>Failed to load coursework</p>
                    <p style="font-size: 0.75rem; margin-top: 8px;">${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Setup coursework search functionality
     */
    setupCourseworkSearch() {
        const searchInput = document.getElementById('courseworkSearch');
        const container = document.getElementById('courseworkList');
        if (!searchInput || !container) return;

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            container.querySelectorAll('.coursework-item').forEach(item => {
                const title = item.querySelector('.coursework-title')?.textContent.toLowerCase() || '';
                const type = item.querySelector('.coursework-type')?.textContent.toLowerCase() || '';
                const student = item.querySelector('.coursework-student')?.textContent.toLowerCase() || '';
                const matches = title.includes(searchTerm) || type.includes(searchTerm) || student.includes(searchTerm);
                item.style.display = matches ? 'block' : 'none';
            });
        });
    }

    /**
     * Open coursework details (integrate with coursework manager)
     */
    openCourseworkDetails(courseworkId) {
        console.log('Opening coursework details:', courseworkId);
        // Check if courseworkManager exists
        if (typeof courseworkManager !== 'undefined') {
            courseworkManager.viewCourseworkDetails(courseworkId);
        } else {
            this.showNotification('Coursework details not available', 'info');
        }
    }

    /**
     * Load tutor info for video panel
     */
    async loadTutorInfo() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) return;

            const response = await fetch(`${this.API_BASE}/context/tutor-info`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success && data.tutor) {
                this.tutorInfo = data.tutor;
                this.updateTutorVideoDisplay();
            }
        } catch (error) {
            console.error('Error loading tutor info:', error);
        }
    }

    /**
     * Update tutor video display with loaded info
     */
    updateTutorVideoDisplay() {
        if (!this.tutorInfo) return;

        const tutorAvatar = document.getElementById('tutorVideoAvatar');
        const tutorName = document.getElementById('tutorVideoParticipantName');

        if (tutorAvatar) {
            if (this.tutorInfo.profile_picture && !this.tutorInfo.profile_picture.includes('user-default')) {
                // Has valid profile picture - create img element
                this.updateAvatarWithImage(tutorAvatar, this.tutorInfo.profile_picture, this.tutorInfo.name, 'large');
            } else {
                // No profile picture - show initials
                this.updateAvatarWithInitials(tutorAvatar, this.tutorInfo.name, 'large');
            }
        }

        if (tutorName) {
            tutorName.textContent = this.tutorInfo.name;
        }
    }

    /**
     * Update an avatar element with an image
     */
    updateAvatarWithImage(element, src, name, size = 'medium') {
        const parent = element.parentElement;
        const sizes = {
            small: { width: '32px', height: '32px' },
            medium: { width: '40px', height: '40px' },
            large: { width: '80px', height: '80px' }
        };
        const s = sizes[size] || sizes.medium;

        const img = document.createElement('img');
        img.src = src;
        img.alt = name;
        img.className = 'video-avatar';
        img.id = element.id;
        img.style.cssText = `width: ${s.width}; height: ${s.height}; border-radius: 50%; object-fit: cover;`;
        img.onerror = () => {
            this.updateAvatarWithInitials(img, name, size);
        };

        if (parent) {
            parent.replaceChild(img, element);
        }
    }

    /**
     * Update an avatar element with initials
     */
    updateAvatarWithInitials(element, name, size = 'medium') {
        const initials = this.getInitials(name);
        const parent = element.parentElement;
        const sizes = {
            small: { width: '32px', height: '32px', fontSize: '0.75rem' },
            medium: { width: '40px', height: '40px', fontSize: '0.875rem' },
            large: { width: '80px', height: '80px', fontSize: '1.5rem' }
        };
        const s = sizes[size] || sizes.medium;

        const initialsDiv = document.createElement('div');
        initialsDiv.className = 'initials-avatar video-avatar';
        initialsDiv.id = element.id;
        initialsDiv.textContent = initials;
        initialsDiv.style.cssText = `
            width: ${s.width};
            height: ${s.height};
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary-color, #6366f1), #4f46e5);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: ${s.fontSize};
            flex-shrink: 0;
        `;

        if (parent) {
            parent.replaceChild(initialsDiv, element);
        }
    }

    /**
     * Replace an image element with initials avatar
     */
    replaceImageWithInitials(imgElement, name, size = 'medium') {
        const initials = this.getInitials(name);
        const parent = imgElement.parentElement;

        const sizes = {
            small: { width: '32px', height: '32px', fontSize: '0.75rem' },
            medium: { width: '40px', height: '40px', fontSize: '0.875rem' },
            large: { width: '80px', height: '80px', fontSize: '1.5rem' }
        };
        const s = sizes[size] || sizes.medium;

        const initialsDiv = document.createElement('div');
        initialsDiv.className = 'initials-avatar video-avatar';
        initialsDiv.textContent = initials;
        initialsDiv.style.cssText = `
            width: ${s.width};
            height: ${s.height};
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary-color, #6366f1), #4f46e5);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: ${s.fontSize};
            flex-shrink: 0;
        `;

        if (parent) {
            parent.replaceChild(initialsDiv, imgElement);
        }
    }

    /**
     * Update video grid when a student is selected
     */
    updateVideoGridForStudent(studentProfileId) {
        const videoGrid = document.getElementById('studentVideoGrid');
        if (!videoGrid) return;

        // Find the selected student
        const student = this.enrolledStudents.find(s => s.student_profile_id === studentProfileId);

        if (student) {
            // Update grid to show selected student prominently
            const avatarHtml = student.profile_picture && !student.profile_picture.includes('user-default') ?
                `<img src="${student.profile_picture}"
                     alt="${student.name}"
                     class="student-avatar"
                     id="mainStudentVideoAvatar"
                     onerror="whiteboardManager.handleAvatarError(this, '${student.name.replace(/'/g, "\\'")}')">` :
                this.getInitialsAvatar(student.name, 'large');

            videoGrid.innerHTML = `
                <div class="student-video-placeholder selected" id="mainStudentVideoPlaceholder">
                    ${avatarHtml}
                    <div class="student-name" id="mainStudentVideoParticipantName">${student.name}</div>
                    <div class="student-status online">
                        <i class="fas fa-circle"></i>
                    </div>
                </div>
            `;
        } else {
            // Show all enrolled students in video grid (up to 4)
            const displayStudents = this.enrolledStudents.slice(0, 4);
            videoGrid.innerHTML = displayStudents.map(s => {
                const avatarHtml = s.profile_picture && !s.profile_picture.includes('user-default') ?
                    `<img src="${s.profile_picture}"
                         alt="${s.name}"
                         class="student-avatar"
                         onerror="whiteboardManager.handleAvatarError(this, '${s.name.replace(/'/g, "\\'")}')">` :
                    this.getInitialsAvatar(s.name, 'medium');

                return `
                    <div class="student-video-placeholder" data-student-id="${s.student_profile_id}">
                        ${avatarHtml}
                        <div class="student-name">${s.name}</div>
                        <div class="student-status offline">
                            <i class="fas fa-circle"></i>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    /**
     * Load files for whiteboard panel (placeholder for now)
     */
    async loadFilesList() {
        const container = document.getElementById('filesList');
        if (!container) return;

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) return;

            let url = `${this.API_BASE}/context/files`;
            if (this.contextStudentId) {
                url += `?student_id=${this.contextStudentId}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.files && data.files.length > 0) {
                container.innerHTML = data.files.map(file => `
                    <div class="file-item">
                        <div class="file-item-icon">
                            <i class="fas fa-${this.getFileIcon(file.type)}"></i>
                        </div>
                        <div class="file-item-info">
                            <span class="file-item-name">${file.name}</span>
                            <div class="file-item-actions">
                                <button class="file-action-btn" onclick="whiteboardManager.downloadFile('${file.url}')">
                                    <i class="fas fa-download"></i>
                                </button>
                                <button class="file-action-btn danger" onclick="whiteboardManager.deleteFile('${file.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                        <i class="fas fa-folder-open" style="font-size: 2rem; margin-bottom: 8px;"></i>
                        <p>No files yet</p>
                        <p style="font-size: 0.75rem; margin-top: 8px;">Files feature coming soon</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading files:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    <i class="fas fa-folder-open" style="font-size: 2rem; margin-bottom: 8px;"></i>
                    <p>No files yet</p>
                </div>
            `;
        }
    }

    /**
     * Get file icon based on file type
     */
    getFileIcon(fileType) {
        const iconMap = {
            'pdf': 'file-pdf',
            'doc': 'file-word',
            'docx': 'file-word',
            'xls': 'file-excel',
            'xlsx': 'file-excel',
            'ppt': 'file-powerpoint',
            'pptx': 'file-powerpoint',
            'jpg': 'file-image',
            'jpeg': 'file-image',
            'png': 'file-image',
            'gif': 'file-image',
            'mp4': 'file-video',
            'mp3': 'file-audio',
            'zip': 'file-archive',
            'txt': 'file-alt'
        };
        return iconMap[fileType?.toLowerCase()] || 'file';
    }

    /**
     * Download file
     */
    downloadFile(fileName) {
        // TODO: Implement actual file download from server
        this.showNotification(`Downloading ${fileName}...`, 'info');
        console.log('Download file:', fileName);
    }

    /**
     * Delete file
     */
    async deleteFile(fileName) {
        if (!confirm(`Delete ${fileName}? This cannot be undone.`)) return;

        // TODO: Implement actual file deletion via API
        this.showNotification(`${fileName} deleted successfully`, 'success');
        console.log('Delete file:', fileName);
    }

    /**
     * Populate student dropdown for chat recipients
     */
    populateStudentDropdown() {
        const dropdown = document.getElementById('chatRecipient');
        if (!dropdown || !this.currentSession) return;

        // Get existing options
        const baseOptions = `
            <option value="group">Everyone</option>
            <option value="tutor">Tutor</option>
        `;

        // Add student options (mock data for now)
        const studentOptions = `
            <option value="student_1">Student 1</option>
            <option value="student_2">Student 2</option>
            <option value="student_3">Student 3</option>
        `;

        dropdown.innerHTML = baseOptions + studentOptions;
    }

    /**
     * Create coursework for the current student in the whiteboard session
     */
    createCourseworkForCurrentStudent() {
        if (!this.currentSession) {
            alert('⚠️ Please start a session first');
            return;
        }

        // Get student ID from current session
        const studentId = this.currentSession.student_id;

        if (!studentId) {
            alert('⚠️ No student selected for this session');
            return;
        }

        // Check if courseworkManager exists
        if (typeof courseworkManager !== 'undefined') {
            // Close whiteboard modal
            this.closeModal();

            // Pre-select the student
            courseworkManager.selectedStudentId = studentId;

            // Open coursework creation modal
            courseworkManager.openGiveCourseworkModal();

            // Pre-populate student info
            setTimeout(() => {
                const student = courseworkManager.students?.find(s => s.id === studentId);
                if (student) {
                    const selectedDiv = document.getElementById('courseworkSelectedStudent');
                    if (selectedDiv) {
                        const initials = this.getInitials(student.name);
                        const avatarHtml = student.profilePicture && !student.profilePicture.includes('user-default') ?
                            `<img src="${student.profilePicture}" alt="${student.name}"
                                 onerror="this.outerHTML='<div class=\\'initials-avatar\\' style=\\'width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;\\'>${initials}</div>'">` :
                            `<div class="initials-avatar" style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;">${initials}</div>`;

                        selectedDiv.innerHTML = `
                            <div class="selected-student">
                                ${avatarHtml}
                                <div>
                                    <strong>${student.name}</strong>
                                    <p>${student.grade}</p>
                                </div>
                            </div>
                        `;
                    }
                }
            }, 100);
        } else {
            alert('❌ Coursework Manager not loaded. Please ensure coursework-manager.js is included.');
        }
    }

    /**
     * Load coursework for the current student
     */
    async loadCourseworkForStudent(studentId) {
        const courseworkListEl = document.getElementById('courseworkList');
        if (!courseworkListEl) return;

        try {
            // Check if courseworkManager exists
            if (typeof courseworkManager === 'undefined') {
                courseworkListEl.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Coursework Manager not loaded</p>
                    </div>
                `;
                return;
            }

            // Get all coursework
            let allCoursework = courseworkManager.courseworks || [];

            // Filter for this student
            let studentCoursework = allCoursework.filter(cw =>
                cw.studentId === studentId ||
                cw.student_id === studentId ||
                (Array.isArray(cw.students) && cw.students.includes(studentId))
            );

            if (studentCoursework.length === 0) {
                courseworkListEl.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-clipboard-list"></i>
                        <p>No coursework yet</p>
                        <button class="btn-primary" onclick="whiteboardManager.createCourseworkForCurrentStudent()">
                            <i class="fas fa-plus"></i> Create Coursework
                        </button>
                    </div>
                `;
                return;
            }

            // Render coursework list
            const courseworkHTML = studentCoursework.map(cw => `
                <div class="session-card" onclick="courseworkManager.viewCourseworkDetails('${cw.id}')">
                    <div class="session-card-header">
                        <span class="session-name">${cw.courseName || cw.course_name}</span>
                        <span class="session-status ${cw.status}">${cw.status}</span>
                    </div>
                    <div class="session-card-details">
                        <span class="session-time">
                            <i class="far fa-calendar"></i>
                            ${cw.courseworkType || cw.coursework_type}
                        </span>
                        <span class="session-duration">
                            <i class="far fa-clock"></i>
                            ${cw.timeLimit || cw.time_limit || 0} min
                        </span>
                    </div>
                </div>
            `).join('');

            courseworkListEl.innerHTML = courseworkHTML;

        } catch (error) {
            console.error('Error loading coursework:', error);
            courseworkListEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load coursework</p>
                </div>
            `;
        }
    }

    // ============================================
    // DIGITAL LAB METHODS
    // ============================================

    /**
     * Current selected lab course
     */
    currentLabCourse = null;

    /**
     * Lab course names mapping
     */
    labCourseNames = {
        'chemistry': 'Chemistry Lab',
        'physics': 'Physics Lab',
        'biology': 'Biology Lab',
        'mathematics': 'Mathematics Lab',
        'computer': 'Computer / ICT Lab',
        'music': 'Music Studio',
        'visualart': 'Visual Art Studio'
    };

    /**
     * Select a lab course and show its tools
     */
    selectLabCourse(course) {
        this.currentLabCourse = course;

        // Hide course list
        const courseList = document.getElementById('labCourseList');
        const toolsView = document.getElementById('labToolsView');
        const backBtn = document.getElementById('labBackBtn');
        const panelTitle = document.getElementById('labPanelTitle');

        if (courseList) courseList.style.display = 'none';
        if (toolsView) toolsView.style.display = 'block';
        if (backBtn) backBtn.style.display = 'flex';

        // Update title
        if (panelTitle) {
            panelTitle.textContent = this.labCourseNames[course] || 'Digital Lab';
        }

        // Hide all tool grids
        const allTools = document.querySelectorAll('.lab-tools-grid');
        allTools.forEach(grid => grid.style.display = 'none');

        // Show selected course tools
        const selectedTools = document.getElementById(`${course}Tools`);
        if (selectedTools) {
            selectedTools.style.display = 'grid';
        }

        console.log('Selected lab course:', course);
    }

    /**
     * Show lab course list (go back from tools view)
     */
    showLabCourseList() {
        this.currentLabCourse = null;

        const courseList = document.getElementById('labCourseList');
        const toolsView = document.getElementById('labToolsView');
        const backBtn = document.getElementById('labBackBtn');
        const panelTitle = document.getElementById('labPanelTitle');

        if (courseList) courseList.style.display = 'block';
        if (toolsView) toolsView.style.display = 'none';
        if (backBtn) backBtn.style.display = 'none';

        // Reset title
        if (panelTitle) {
            panelTitle.textContent = 'Digital Lab';
        }

        // Hide all tool grids
        const allTools = document.querySelectorAll('.lab-tools-grid');
        allTools.forEach(grid => grid.style.display = 'none');

        console.log('Returned to lab course list');
    }

    /**
     * Toggle lab category expansion (legacy method, kept for compatibility)
     */
    toggleLabCategory(element) {
        const category = element.closest('.lab-category');
        if (category) {
            category.classList.toggle('expanded');
        }
    }

    /**
     * Open a lab experiment
     */
    openLabExperiment(experimentType, experimentName) {
        console.log('Opening lab experiment:', experimentType, experimentName);

        // Show coming soon notification for now
        this.showNotification(`🧪 Digital Lab: ${experimentName} - Coming Soon!`, 'info');

        // Future implementation will open the actual lab interface
        // This will integrate with the IP-protected Digital Lab system
        switch(experimentType) {
            case 'periodic-table':
                this.openPeriodicTable();
                break;
            case 'molecular-builder':
                this.openMolecularBuilder();
                break;
            case 'reactions':
                this.openChemicalReactions();
                break;
            case 'titration':
                this.openTitrationLab();
                break;
            case 'circuit-builder':
                this.openCircuitBuilder();
                break;
            case 'mechanics':
                this.openMechanicsLab();
                break;
            case 'waves':
                this.openWavesLab();
                break;
            case 'optics':
                this.openOpticsLab();
                break;
            case 'cell-explorer':
                this.openCellExplorer();
                break;
            case 'dna-lab':
                this.openDNALab();
                break;
            case 'ecosystem':
                this.openEcosystemLab();
                break;
            case 'anatomy':
                this.openAnatomyLab();
                break;
            case '3d-graphing':
                this.open3DGraphing();
                break;
            case 'geometry':
                this.openGeometryLab();
                break;
            case 'probability':
                this.openProbabilityLab();
                break;
            case 'calculus':
                this.openCalculusLab();
                break;
            default:
                console.log('Unknown experiment type:', experimentType);
        }
    }

    // Placeholder methods for each lab type (to be implemented in Phase 2)
    openPeriodicTable() {
        this.showLabPlaceholder('Periodic Table', 'Interactive periodic table with element details, electron configurations, and compound building.');
    }

    openMolecularBuilder() {
        this.showLabPlaceholder('Molecular Builder', 'Build and visualize 3D molecular structures, bonds, and chemical compounds.');
    }

    openChemicalReactions() {
        this.showLabPlaceholder('Chemical Reactions', 'Simulate chemical reactions with visual animations and stoichiometry calculations.');
    }

    openTitrationLab() {
        this.showLabPlaceholder('Titration Lab', 'Virtual titration experiments with pH indicators and concentration calculations.');
    }

    openCircuitBuilder() {
        this.showLabPlaceholder('Circuit Builder', 'Build and test electrical circuits with resistors, capacitors, LEDs, and more.');
    }

    openMechanicsLab() {
        this.showLabPlaceholder('Mechanics Simulator', 'Explore forces, motion, projectiles, and mechanical systems.');
    }

    openWavesLab() {
        this.showLabPlaceholder('Wave Simulator', 'Visualize wave properties, interference patterns, and sound waves.');
    }

    openOpticsLab() {
        this.showLabPlaceholder('Optics Lab', 'Experiment with lenses, mirrors, light refraction, and optical instruments.');
    }

    openCellExplorer() {
        this.showLabPlaceholder('Cell Explorer', 'Interactive 3D cell models with organelle details and functions.');
    }

    openDNALab() {
        this.showLabPlaceholder('DNA Lab', 'Explore DNA structure, replication, transcription, and genetic mutations.');
    }

    openEcosystemLab() {
        this.showLabPlaceholder('Ecosystem Simulator', 'Create and observe ecosystem dynamics, food chains, and population models.');
    }

    openAnatomyLab() {
        this.showLabPlaceholder('Human Anatomy', '3D human body exploration with organ systems and anatomical details.');
    }

    open3DGraphing() {
        this.showLabPlaceholder('3D Graphing', 'Plot and visualize mathematical functions in 3D space.');
    }

    openGeometryLab() {
        this.showLabPlaceholder('Geometry Lab', 'Interactive geometric constructions, proofs, and transformations.');
    }

    openProbabilityLab() {
        this.showLabPlaceholder('Probability Lab', 'Simulate probability experiments, distributions, and statistical analysis.');
    }

    openCalculusLab() {
        this.showLabPlaceholder('Calculus Visualizer', 'Visualize derivatives, integrals, limits, and calculus concepts.');
    }

    /**
     * Show placeholder for lab features (Phase 2)
     */
    showLabPlaceholder(labName, description) {
        const labContent = `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-flask" style="font-size: 4rem; color: var(--primary-color, #f59e0b); margin-bottom: 20px;"></i>
                <h3 style="font-size: 1.5rem; margin-bottom: 10px; color: var(--text-primary, #1e293b);">${labName}</h3>
                <p style="color: var(--text-secondary, #64748b); margin-bottom: 20px; max-width: 400px; margin-left: auto; margin-right: auto;">${description}</p>
                <div style="background: linear-gradient(135deg, #f59e0b, #ea580c); color: white; padding: 12px 24px; border-radius: 8px; display: inline-block;">
                    <i class="fas fa-rocket"></i> Coming in Phase 2
                </div>
                <p style="color: var(--text-secondary, #64748b); margin-top: 16px; font-size: 0.85rem;">
                    The Digital Lab is an IP-protected innovation that will transform science education.
                </p>
            </div>
        `;

        // For now, show in an alert. In Phase 2, this will open a full lab interface
        const modal = document.createElement('div');
        modal.className = 'lab-placeholder-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--card-background, #ffffff);
            padding: 0;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            z-index: 10001;
            max-width: 500px;
            width: 90%;
        `;
        modal.innerHTML = `
            <div style="display: flex; justify-content: flex-end; padding: 12px;">
                <button class="lab-modal-close-btn"
                        style="background: none; border: none; cursor: pointer; font-size: 1.2rem; color: var(--text-secondary, #64748b);">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            ${labContent}
        `;

        const overlay = document.createElement('div');
        overlay.className = 'lab-overlay';

        // Close function
        const closeLabModal = () => {
            modal.remove();
            overlay.remove();
        };

        // Add click handler to close button
        modal.querySelector('.lab-modal-close-btn').onclick = closeLabModal;

        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
        `;
        overlay.onclick = closeLabModal;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);
    }

    /**
     * Search lab experiments
     */
    searchLabExperiments(searchTerm) {
        const labList = document.getElementById('labList');
        if (!labList) return;

        const items = labList.querySelectorAll('.lab-item');
        const categories = labList.querySelectorAll('.lab-category');

        searchTerm = searchTerm.toLowerCase().trim();

        if (!searchTerm) {
            // Show all items
            items.forEach(item => item.style.display = '');
            categories.forEach(cat => cat.style.display = '');
            return;
        }

        categories.forEach(category => {
            const categoryItems = category.querySelectorAll('.lab-item');
            let hasVisibleItems = false;

            categoryItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    item.style.display = '';
                    hasVisibleItems = true;
                } else {
                    item.style.display = 'none';
                }
            });

            // Show/hide category based on matching items
            category.style.display = hasVisibleItems ? '' : 'none';

            // Expand categories with matching items
            if (hasVisibleItems) {
                category.classList.add('expanded');
            }
        });
    }

    // ============================================
    // ATTENDANCE TRACKING METHODS
    // ============================================

    /**
     * Track attendance connection/disconnection via API
     * @param {string} action - 'connect' or 'disconnect'
     */
    async trackAttendanceConnection(action) {
        if (!this.currentSession || !this.currentSession.id) {
            console.log('⏭️ Skipping attendance tracking - no active session');
            return;
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                console.warn('⚠️ No auth token for attendance tracking');
                return;
            }

            // Determine user type (tutor or student)
            const userType = this.userRole || 'tutor'; // Default to tutor if not set

            const endpoint = `${this.API_BASE}/../whiteboard/sessions/${this.currentSession.id}/${action}`;
            console.log(`📊 Tracking attendance ${action} for ${userType}`);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: this.currentSession.id,
                    user_type: userType
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`✅ Attendance ${action} tracked:`, result);
            } else {
                console.warn(`⚠️ Failed to track attendance ${action}:`, response.status);
            }
        } catch (error) {
            console.error(`❌ Error tracking attendance ${action}:`, error);
        }
    }

    /**
     * Start sending attendance heartbeat every 15 seconds
     */
    startAttendanceHeartbeat() {
        // Clear existing interval if any
        this.stopAttendanceHeartbeat();

        if (!this.currentSession || !this.currentSession.id) {
            return;
        }

        console.log('💓 Starting attendance heartbeat (every 15s)');

        this.attendanceHeartbeatInterval = setInterval(async () => {
            if (!this.currentSession || !this.currentSession.id) {
                this.stopAttendanceHeartbeat();
                return;
            }

            try {
                const token = localStorage.getItem('token') || localStorage.getItem('access_token');
                if (!token) return;

                const userType = this.userRole || 'tutor';
                const endpoint = `${this.API_BASE}/../whiteboard/sessions/${this.currentSession.id}/heartbeat`;

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        session_id: this.currentSession.id,
                        user_type: userType,
                        activity_type: 'heartbeat'
                    })
                });

                if (response.ok) {
                    console.log('💓 Attendance heartbeat sent');
                } else {
                    console.warn('⚠️ Attendance heartbeat failed:', response.status);
                }
            } catch (error) {
                console.error('❌ Error sending attendance heartbeat:', error);
            }
        }, 15000); // Every 15 seconds
    }

    /**
     * Stop attendance heartbeat
     */
    stopAttendanceHeartbeat() {
        if (this.attendanceHeartbeatInterval) {
            clearInterval(this.attendanceHeartbeatInterval);
            this.attendanceHeartbeatInterval = null;
            console.log('🛑 Attendance heartbeat stopped');
        }
    }
}

// Initialize whiteboard manager
const whiteboardManager = new WhiteboardManager();

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    whiteboardManager.initialize();
});

// Also listen for modalsLoaded event
// ModalLoader might finish loading after DOMContentLoaded
document.addEventListener('modalsLoaded', () => {
    // If modal now exists, force re-setup of event listeners
    // This handles the case where modal HTML was replaced by modal-loader
    if (document.getElementById('whiteboardModal')) {
        console.log('🎨 modalsLoaded event: Re-setting up whiteboard event listeners');
        // Reset flag to force re-setup
        whiteboardManager._eventListenersSetup = false;
        whiteboardManager.setupEventListeners();
    }
});

// Global function to open whiteboard modal (for onclick handlers)
function openWhiteboardModal(sessionId = null, studentId = null, context = 'teaching_tools') {
    if (typeof whiteboardManager !== 'undefined' && whiteboardManager) {
        whiteboardManager.openWhiteboard(sessionId, studentId, context);
    } else {
        console.error('WhiteboardManager not initialized');
        openComingSoonModal('Digital Whiteboard');
    }
}

// Open whiteboard from Teaching Tools (all students)
function openWhiteboardFromTeachingTools() {
    if (typeof whiteboardManager !== 'undefined' && whiteboardManager) {
        whiteboardManager.openWhiteboardFromTeachingTools();
    } else {
        console.error('WhiteboardManager not initialized');
        openComingSoonModal('Digital Whiteboard');
    }
}

// Open whiteboard for a specific student (from Student Details Modal)
function openWhiteboardForStudent(studentProfileId) {
    if (typeof whiteboardManager !== 'undefined' && whiteboardManager) {
        whiteboardManager.openWhiteboardForStudent(studentProfileId);
    } else {
        console.error('WhiteboardManager not initialized');
        openComingSoonModal('Digital Whiteboard');
    }
}

// Open whiteboard for the currently viewed student (from Student Details Modal)
function openWhiteboardForCurrentStudent() {
    // Close the student details modal first
    if (typeof closeStudentDetailsModal === 'function') {
        closeStudentDetailsModal();
    }

    // Get the current student's profile ID from window.currentStudentDetails
    const studentProfileId = window.currentStudentDetails?.student_profile_id;

    if (!studentProfileId) {
        console.error('No current student selected');
        alert('No student selected. Please try again.');
        return;
    }

    console.log('🎨 Opening whiteboard for current student:', studentProfileId);

    if (typeof whiteboardManager !== 'undefined' && whiteboardManager) {
        whiteboardManager.openWhiteboardForStudent(studentProfileId);
    } else {
        console.error('WhiteboardManager not initialized');
        openComingSoonModal('Digital Whiteboard');
    }
}

// Open whiteboard from Learning Tools (STUDENT PERSPECTIVE - all tutors)
function openWhiteboardFromLearningTools() {
    if (typeof whiteboardManager !== 'undefined' && whiteboardManager) {
        whiteboardManager.openWhiteboardFromLearningTools();
    } else {
        console.error('WhiteboardManager not initialized');
        openComingSoonModal('Digital Whiteboard');
    }
}

// Open whiteboard for a specific tutor (STUDENT PERSPECTIVE - from Tutor Details Modal)
function openWhiteboardForTutor(tutorProfileId) {
    if (typeof whiteboardManager !== 'undefined' && whiteboardManager) {
        whiteboardManager.openWhiteboardForTutor(tutorProfileId);
    } else {
        console.error('WhiteboardManager not initialized');
        openComingSoonModal('Digital Whiteboard');
    }
}

// Open whiteboard for the currently viewed tutor (STUDENT PERSPECTIVE - from Tutor Details Modal)
function openWhiteboardForCurrentTutor() {
    // Close the tutor details modal first (if exists)
    if (typeof closeTutorDetailsModal === 'function') {
        closeTutorDetailsModal();
    }

    // Get the current tutor's profile ID from window.currentTutorDetails
    const tutorProfileId = window.currentTutorDetails?.tutor_profile_id || window.currentTutorDetails?.id;

    if (!tutorProfileId) {
        console.error('No current tutor selected');
        alert('No tutor selected. Please try again.');
        return;
    }

    console.log('🎨 Opening whiteboard for current tutor:', tutorProfileId);

    if (typeof whiteboardManager !== 'undefined' && whiteboardManager) {
        whiteboardManager.openWhiteboardForTutor(tutorProfileId);
    } else {
        console.error('WhiteboardManager not initialized');
        openComingSoonModal('Digital Whiteboard');
    }
}

// Export to window for global access
window.openWhiteboardModal = openWhiteboardModal;
window.openWhiteboardFromTeachingTools = openWhiteboardFromTeachingTools;
window.openWhiteboardForStudent = openWhiteboardForStudent;
window.openWhiteboardForCurrentStudent = openWhiteboardForCurrentStudent;
window.openWhiteboardFromLearningTools = openWhiteboardFromLearningTools;
window.openWhiteboardForTutor = openWhiteboardForTutor;
window.openWhiteboardForCurrentTutor = openWhiteboardForCurrentTutor;

// ============================================
// STUDENT WHITEBOARD MANAGER
// Manages whiteboard sessions for specific students
// ============================================

const StudentWhiteboardManager = {
    currentStudentId: null,
    sessions: [],

    /**
     * Initialize the manager with a student ID
     */
    init(studentId) {
        this.currentStudentId = studentId;
        console.log('📝 StudentWhiteboardManager initialized for student:', studentId);
    },

    /**
     * Load whiteboard sessions for the current student from whiteboardManager
     */
    async loadSessions() {
        const container = document.getElementById('student-whiteboard-sessions');
        if (!container) return;

        // Show loading state
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                <p>Loading whiteboard sessions...</p>
            </div>
        `;

        try {
            // Get student ID from the modal
            if (!this.currentStudentId) {
                console.warn('No student ID set');
                container.innerHTML = `
                    <div class="col-span-full card p-6 text-center text-gray-500">
                        <p>Student information not available</p>
                    </div>
                `;
                return;
            }

            // Check if whiteboardManager exists
            if (typeof whiteboardManager === 'undefined') {
                container.innerHTML = `
                    <div class="col-span-full card p-6 text-center text-yellow-500">
                        <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                        <p>whiteboardManager not loaded</p>
                        <p class="text-sm mt-2">Please ensure whiteboard-manager.js is included</p>
                    </div>
                `;
                return;
            }

            // Load all sessions from whiteboardManager
            const allSessions = await whiteboardManager.loadSessionHistory();

            // Filter sessions for this specific student
            const studentSessions = allSessions.filter(session =>
                session.student_id === this.currentStudentId ||
                session.studentId === this.currentStudentId
            );

            this.sessions = studentSessions;

            if (studentSessions.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full card p-6 text-center text-gray-500">
                        <i class="fas fa-chalkboard text-3xl mb-3"></i>
                        <p>No whiteboard sessions yet</p>
                        <p class="text-sm mt-2">Create your first session to get started</p>
                    </div>
                `;
                return;
            }

            // Render session cards
            container.innerHTML = studentSessions.map(session => this.renderSessionCard(session)).join('');

        } catch (error) {
            console.error('Error loading whiteboard sessions:', error);
            container.innerHTML = `
                <div class="col-span-full card p-6 text-center text-red-500">
                    <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                    <p>Failed to load whiteboard sessions</p>
                    <p class="text-sm mt-2">${error.message}</p>
                </div>
            `;
        }
    },

    /**
     * Render a session card
     */
    renderSessionCard(session) {
        const statusColors = {
            'scheduled': 'bg-blue-100 text-blue-800',
            'in-progress': 'bg-green-100 text-green-800',
            'completed': 'bg-gray-100 text-gray-800',
            'cancelled': 'bg-red-100 text-red-800'
        };

        const statusIcons = {
            'scheduled': '📅',
            'in-progress': '▶️',
            'completed': '✅',
            'cancelled': '❌'
        };

        const sessionDate = new Date(session.session_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const statusClass = statusColors[session.status] || 'bg-gray-100 text-gray-800';
        const statusIcon = statusIcons[session.status] || '📝';

        return `
            <div class="card p-4 hover:shadow-lg transition">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-bold text-lg">${session.session_title || 'Whiteboard Session'}</h4>
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${statusClass}">
                        ${statusIcon} ${session.status}
                    </span>
                </div>

                <div class="space-y-2 mb-4">
                    <div class="flex items-center gap-2 text-sm">
                        <i class="fas fa-calendar text-gray-500"></i>
                        <span style="color: var(--text-secondary);">${sessionDate}</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm">
                        <i class="fas fa-file text-gray-500"></i>
                        <span style="color: var(--text-secondary);">
                            ${session.page_count || 0} page${session.page_count !== 1 ? 's' : ''}
                        </span>
                    </div>
                    ${session.description ? `
                        <div class="text-sm text-gray-600 mt-2">
                            ${session.description}
                        </div>
                    ` : ''}
                </div>

                <div class="flex gap-2">
                    ${session.status === 'scheduled' ? `
                        <button
                            onclick="StudentWhiteboardManager.startSession(${session.id})"
                            class="flex-1 btn-primary"
                            style="padding: 8px; font-size: 0.875rem;">
                            <i class="fas fa-play"></i> Start Session
                        </button>
                    ` : session.status === 'in-progress' ? `
                        <button
                            onclick="StudentWhiteboardManager.openSession(${session.id})"
                            class="flex-1 btn-primary"
                            style="padding: 8px; font-size: 0.875rem;">
                            <i class="fas fa-chalkboard"></i> Continue
                        </button>
                    ` : `
                        <button
                            onclick="StudentWhiteboardManager.viewSession(${session.id})"
                            class="flex-1 btn-secondary"
                            style="padding: 8px; font-size: 0.875rem;">
                            <i class="fas fa-eye"></i> View
                        </button>
                    `}
                    <button
                        onclick="StudentWhiteboardManager.deleteSession(${session.id})"
                        class="btn-secondary"
                        style="padding: 8px; font-size: 0.875rem;"
                        title="Delete session">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Create a new whiteboard session - Opens whiteboardManager with student pre-selected
     */
    async createNewSession() {
        if (!this.currentStudentId) {
            alert('❌ No student selected');
            return;
        }

        // Check if whiteboardManager exists
        if (typeof whiteboardManager === 'undefined') {
            alert('❌ whiteboardManager not loaded. Please ensure whiteboard-manager.js is included.');
            return;
        }

        // Open whiteboard with this student ID
        // whiteboardManager will handle creating/finding a session
        await whiteboardManager.openWhiteboardWithStudent(this.currentStudentId);

        // After the whiteboard is closed, reload the sessions
        // (Note: This will auto-refresh when returning to this view)
    },

    /**
     * Start a scheduled session - Opens whiteboardManager
     */
    async startSession(sessionId) {
        if (typeof whiteboardManager !== 'undefined') {
            await whiteboardManager.openWhiteboard(sessionId);
        } else {
            alert('❌ whiteboardManager not loaded');
        }
    },

    /**
     * Open a session (launches whiteboard modal)
     */
    openSession(sessionId) {
        if (typeof whiteboardManager !== 'undefined') {
            whiteboardManager.openWhiteboard(sessionId);
        } else {
            alert('❌ whiteboardManager not loaded');
        }
    },

    /**
     * View a completed session (read-only)
     */
    viewSession(sessionId) {
        this.openSession(sessionId);
    },

    /**
     * Delete a session - Delegates to whiteboardManager
     */
    async deleteSession(sessionId) {
        // For now, just show a message
        // The actual delete functionality should be in whiteboardManager
        alert('🗑️ Delete functionality: This should be implemented in whiteboardManager.\n\nFor now, sessions can be deleted from the main Teaching Tools panel.');
    }
};

// Export to window
window.StudentWhiteboardManager = StudentWhiteboardManager;
