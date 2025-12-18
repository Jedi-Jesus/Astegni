// =============================================
// CHAT MODAL - chat-modal.js
// Full-featured chat modal for Astegni platform
// =============================================

const ChatModalManager = {
    // State Management
    state: {
        isOpen: false,
        currentUser: null,
        currentProfile: null,  // {profile_id, profile_type, user_id}
        selectedChat: null,
        selectedConversation: null,  // Full conversation object
        conversations: [],
        contacts: [],
        connectionRequests: { sent: [], received: [] },  // Pending connection requests
        messages: {},
        typingTimer: null,
        isTyping: false,
        mediaRecorder: null,
        recognition: null,
        recordingStartTime: null,
        currentStream: null,
        callTimer: null,
        callDuration: 0,
        videoStream: null,
        recordedAudio: null,
        replyingTo: null,
        pinnedMessages: [],
        contextMenuTarget: null,
        blockedContacts: [],
        isMinimized: false,
        lastSeenTimes: {},
        currentCallId: null,
        isReadingMessages: false,
        speechSynthesis: null,
        currentUtterance: null,
        // New state for VTT, TTS mode, and translate
        isVTTListening: false,
        vttRecognition: null,
        sendMode: 'text',  // 'text' or 'tts'
        voiceRecordMode: 'voice',  // 'voice' or 'vtt'
        translateLanguage: 'none',
        longPressTimer: null,
        longPressTriggered: false,
        voiceClickTimer: null,  // Timer to distinguish single vs double click on voice button
        // Message search state
        searchMatches: [],
        currentSearchIndex: 0,
        // Video recording state
        isVideoRecording: false,
        videoRecorder: null,
        videoPreviewStream: null,
        recordedVideoChunks: [],
        videoRecordingTimer: null,
        videoRecordingSeconds: 0
    },

    // API Configuration - ensure no duplicate /api prefix
    API_BASE_URL: (window.API_BASE_URL || 'http://localhost:8000').replace(/\/api\/?$/, ''),

    // Initialize
    init() {
        this.loadCurrentUser();
        this.setupEventListeners();
        this.loadEmojis();
        console.log('Chat Modal Manager initialized');
    },

    // Load Current User from Auth - tries multiple sources
    loadCurrentUser() {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');

        // Try multiple localStorage keys where user data might be stored
        const possibleKeys = ['userData', 'user', 'currentUser', 'userProfile', 'authUser'];
        let userData = null;

        for (const key of possibleKeys) {
            const stored = localStorage.getItem(key);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed && (parsed.id || parsed.user_id || parsed.full_name)) {
                        userData = parsed;
                        console.log('Chat: Found user data in localStorage key:', key);
                        break;
                    }
                } catch (e) {
                    // Not valid JSON, try next
                }
            }
        }

        if (userData) {
            this.state.currentUser = userData;

            // Extract profile info from user data
            // The user data should contain role_ids with profile IDs
            const user = this.state.currentUser;

            // Detect active role from current page URL first, then from stored role
            const currentPath = window.location.pathname.toLowerCase();
            let activeRole = null;

            // First try to detect from URL path (for profile pages)
            if (currentPath.includes('tutor-profile') || currentPath.includes('tutor_profile')) {
                activeRole = 'tutor';
            } else if (currentPath.includes('student-profile') || currentPath.includes('student_profile')) {
                activeRole = 'student';
            } else if (currentPath.includes('parent-profile') || currentPath.includes('parent_profile')) {
                activeRole = 'parent';
            } else if (currentPath.includes('advertiser-profile') || currentPath.includes('advertiser_profile')) {
                activeRole = 'advertiser';
            }

            // If not on a profile page, check localStorage for current role
            if (!activeRole) {
                // Check various localStorage keys for current role
                // 'userRole' is the primary key used by auth.js and profile-system.js
                const storedRole = localStorage.getItem('userRole') ||
                                   localStorage.getItem('currentRole') ||
                                   localStorage.getItem('current_role') ||
                                   localStorage.getItem('activeRole') ||
                                   localStorage.getItem('active_role');
                if (storedRole) {
                    activeRole = storedRole;
                    console.log('Chat: Active role from localStorage:', activeRole);
                }
            }

            // If still no role, try to get from JWT token
            if (!activeRole && token) {
                try {
                    const tokenParts = token.split('.');
                    if (tokenParts.length === 3) {
                        const payload = JSON.parse(atob(tokenParts[1]));
                        if (payload.role) {
                            activeRole = payload.role;
                            console.log('Chat: Active role from JWT token:', activeRole);
                        }
                    }
                } catch (e) {
                    console.warn('Chat: Could not decode JWT token for role:', e);
                }
            }

            // If still no role, use user object fields
            if (!activeRole) {
                activeRole = user.current_role || user.active_role || user.role || 'student';
                console.log('Chat: Active role from user object:', activeRole);
            }

            // Try to get role_ids from user object first, then from JWT token
            let roleIds = user.role_ids || {};

            // If role_ids is empty, try to get fresh currentUser from localStorage (auth may have updated it)
            if (!roleIds || Object.keys(roleIds).length === 0) {
                try {
                    const freshUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                    if (freshUser.role_ids && Object.keys(freshUser.role_ids).length > 0) {
                        roleIds = freshUser.role_ids;
                        console.log('Chat: Got role_ids from fresh localStorage read:', roleIds);
                    }
                } catch (e) {
                    console.warn('Chat: Could not re-read currentUser:', e);
                }
            }

            // If role_ids is empty, try to decode JWT token to get role_ids
            if (!roleIds || Object.keys(roleIds).length === 0) {
                try {
                    const tokenParts = token.split('.');
                    if (tokenParts.length === 3) {
                        const payload = JSON.parse(atob(tokenParts[1]));
                        if (payload.role_ids) {
                            roleIds = payload.role_ids;
                            console.log('Chat: Extracted role_ids from JWT:', roleIds);
                        }
                    }
                } catch (e) {
                    console.warn('Chat: Could not decode JWT token:', e);
                }
            }

            // Also try profile-specific ID fields (student_profile_id, tutor_profile_id, etc.)
            if (!roleIds || Object.keys(roleIds).length === 0) {
                roleIds = {
                    student: user.student_profile_id,
                    tutor: user.tutor_profile_id,
                    parent: user.parent_profile_id,
                    advertiser: user.advertiser_profile_id
                };
                console.log('Chat: Built role_ids from profile fields:', roleIds);
            }

            // Get the actual user_id (not profile_id)
            // user_id should come from user object's user_id field, or from JWT token
            let actualUserId = user.user_id || user.userId;

            // If user_id is not in user object, try to get it from JWT token
            if (!actualUserId && token) {
                try {
                    const tokenParts = token.split('.');
                    if (tokenParts.length === 3) {
                        const payload = JSON.parse(atob(tokenParts[1]));
                        // JWT token has 'sub' field for user_id
                        actualUserId = payload.sub || payload.user_id;
                        console.log('Chat: Got user_id from JWT token sub:', actualUserId);
                    }
                } catch (e) {
                    console.warn('Chat: Could not decode JWT for user_id:', e);
                }
            }

            // Last resort: use user.id but only if it looks like a user_id (>100 typically)
            // Profile IDs are usually smaller numbers
            if (!actualUserId) {
                actualUserId = user.id;
            }

            // Debug logging
            console.log('Chat: User data from localStorage:', user);
            console.log('Chat: role_ids resolved:', roleIds);
            console.log('Chat: activeRole detected:', activeRole);
            console.log('Chat: profile_id for role:', roleIds[activeRole]);
            console.log('Chat: actual user_id:', actualUserId);

            this.state.currentProfile = {
                profile_id: roleIds[activeRole] || user.profile_id || user.id,
                profile_type: activeRole,
                user_id: parseInt(actualUserId) || user.id
            };

            this.updateCurrentUserUI();
            console.log('Chat: Current profile loaded:', this.state.currentProfile, 'from page:', currentPath);
        } else if (token) {
            // Try to fetch from API if we have a token but no local data
            this.fetchCurrentUser();
        }
    },

    // Fetch current user from API
    async fetchCurrentUser() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) return;

            const response = await fetch(`${this.API_BASE_URL}/api/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const user = await response.json();
                this.state.currentUser = user;

                // Detect active role from current page URL
                const currentPath = window.location.pathname.toLowerCase();
                let activeRole = 'student'; // default

                if (currentPath.includes('tutor-profile') || currentPath.includes('tutor_profile')) {
                    activeRole = 'tutor';
                } else if (currentPath.includes('student-profile') || currentPath.includes('student_profile')) {
                    activeRole = 'student';
                } else if (currentPath.includes('parent-profile') || currentPath.includes('parent_profile')) {
                    activeRole = 'parent';
                } else if (currentPath.includes('advertiser-profile') || currentPath.includes('advertiser_profile')) {
                    activeRole = 'advertiser';
                } else {
                    // Fallback to stored role from localStorage or user object
                    const storedRole = localStorage.getItem('userRole');
                    activeRole = storedRole || user.current_role || user.active_role || user.role || 'student';
                }

                const roleIds = user.role_ids || {};

                // Get user_id properly - from user object or JWT token
                let actualUserId = user.user_id || user.userId;
                if (!actualUserId) {
                    try {
                        const tokenParts = token.split('.');
                        if (tokenParts.length === 3) {
                            const payload = JSON.parse(atob(tokenParts[1]));
                            actualUserId = payload.sub || payload.user_id;
                        }
                    } catch (e) {
                        console.warn('Chat: Could not decode JWT for user_id:', e);
                    }
                }
                if (!actualUserId) {
                    actualUserId = user.id;
                }

                this.state.currentProfile = {
                    profile_id: roleIds[activeRole] || user.profile_id || user.id,
                    profile_type: activeRole,
                    user_id: parseInt(actualUserId) || user.id
                };

                this.updateCurrentUserUI();
                console.log('Chat: User fetched from API:', this.state.currentProfile, 'from page:', currentPath);
            }
        } catch (error) {
            console.log('Chat: Could not fetch user from API:', error.message);
        }
    },

    // Update Current User UI in sidebar
    updateCurrentUserUI() {
        const user = this.state.currentUser;
        if (!user) return;

        const avatar = document.getElementById('chatCurrentUserAvatar');
        const name = document.getElementById('chatCurrentUserName');
        const role = document.getElementById('chatCurrentUserRole');

        // Get display name from various possible fields
        const displayName = user.full_name || user.name || user.username ||
                           `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'You';

        // Get avatar from various possible fields
        const avatarUrl = user.profile_picture || user.avatar || user.avatar_url ||
                         user.profile_image || user.photo ||
                         `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=F59E0B&color=fff`;

        // Get role from currentProfile.profile_type (which was correctly detected in loadCurrentUser)
        // This ensures we show the actual logged-in role, not just whatever is in user object
        const userRole = this.state.currentProfile?.profile_type ||
                        user.current_role || user.active_role || user.role || 'user';

        if (avatar) {
            avatar.src = avatarUrl;
            avatar.alt = displayName;
        }
        if (name) {
            name.textContent = displayName;
        }
        if (role) {
            role.textContent = this.capitalizeFirst(userRole);
        }

        console.log('Chat: Updated sidebar with user:', displayName, 'role:', userRole);
    },

    // Setup Event Listeners
    setupEventListeners() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindEvents());
        } else {
            this.bindEvents();
        }
    },

    bindEvents() {
        // Message input
        const messageInput = document.getElementById('chatMessageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            messageInput.addEventListener('input', () => {
                this.handleTyping();
                this.autoResizeTextarea(messageInput);
            });

            messageInput.addEventListener('paste', (e) => {
                this.handlePaste(e);
            });
        }

        // Contact search
        const contactSearch = document.getElementById('chatContactSearch');
        if (contactSearch) {
            contactSearch.addEventListener('input', (e) => {
                clearTimeout(this.searchTimer);
                this.searchTimer = setTimeout(() => {
                    this.searchContacts(e.target.value);
                }, 300);
            });
        }

        // Tab buttons
        document.querySelectorAll('#chatModal .sidebar-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleTabChange(e.target.dataset.tab, e);
            });
        });

        // File input
        const fileInput = document.getElementById('chatFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e);
            });
        }


        // Context menu prevention
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('#chatModal .message-bubble')) {
                e.preventDefault();
                this.showContextMenu(e);
            }
        });

        // Close context menu on click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#chatContextMenu')) {
                this.hideContextMenu();
            }
            // Also close send options menu if clicking outside
            if (!e.target.closest('#chatSendOptionsMenu') && !e.target.closest('#chatSendBtn')) {
                this.hideSendOptions();
            }
            // Close translate panel if clicking outside
            if (!e.target.closest('#chatTranslatePanel') && !e.target.closest('#chatTranslateBtn')) {
                const panel = document.getElementById('chatTranslatePanel');
                const btn = document.getElementById('chatTranslateBtn');
                if (panel && panel.classList.contains('active')) {
                    panel.classList.remove('active');
                    if (btn) btn.classList.remove('active');
                }
            }
        });

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // First check if settings modal is open
                const settingsModal = document.getElementById('chatSettingsModal');
                if (settingsModal && settingsModal.classList.contains('active')) {
                    settingsModal.classList.remove('active');
                    return;
                }
                // Then close main chat modal if open
                if (this.state.isOpen) {
                    this.close();
                }
            }
        });

        // GIF search
        const gifSearch = document.getElementById('chatGifSearch');
        if (gifSearch) {
            gifSearch.addEventListener('input', () => {
                clearTimeout(this.gifSearchTimer);
                this.gifSearchTimer = setTimeout(() => {
                    this.searchGIFs();
                }, 500);
            });
        }

        // Message search in chat area
        const messageSearch = document.getElementById('chatSearchBar');
        if (messageSearch) {
            messageSearch.addEventListener('input', (e) => {
                clearTimeout(this.messageSearchTimer);
                this.messageSearchTimer = setTimeout(() => {
                    this.searchMessages(e.target.value);
                }, 300);
            });

            messageSearch.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.clearMessageSearch();
                    this.toggleSearch();
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.navigateSearchResult(-1); // Go to previous result
                    } else {
                        this.navigateSearchResult(1); // Go to next result
                    }
                }
            });
        }
    },

    // Open Chat Modal
    open(targetUser = null) {
        const modal = document.getElementById('chatModal');
        if (!modal) {
            console.error('Chat modal not found');
            return;
        }

        console.log('Chat: Opening modal, targetUser:', targetUser);

        this.state.isOpen = true;
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';

        // Clear previous state to force fresh load
        this.state.conversations = [];
        this.state.connectionRequests = { sent: [], received: [] };

        // Refresh current user data (reads from localStorage or fetches from API)
        this.loadCurrentUser();

        console.log('Chat: After loadCurrentUser, currentProfile:', this.state.currentProfile);

        // Load conversations from API (contacts come from connections table)
        this.loadConversations().then(() => {
            console.log('Chat: Loaded', this.state.conversations.length, 'conversations/connections');
            // If target user specified, open that conversation
            if (targetUser) {
                this.openConversationWith(targetUser);
            }
        }).catch(err => {
            console.error('Chat: Error loading conversations:', err);
        });

        // Add body class to prevent scrolling
        document.body.style.overflow = 'hidden';
    },

    // Close Chat Modal
    close() {
        const modal = document.getElementById('chatModal');
        if (!modal) return;

        this.state.isOpen = false;
        this.state.isMinimized = false;
        modal.classList.add('hidden');
        modal.classList.remove('minimized');
        modal.style.display = 'none';

        // Close settings modal if open
        const settingsModal = document.getElementById('chatSettingsModal');
        if (settingsModal) {
            settingsModal.classList.remove('active');
        }

        // Hide minimized bar if exists
        const miniBar = document.getElementById('chatMinimizedBar');
        if (miniBar) {
            miniBar.classList.remove('visible');
        }

        // End any active call
        if (this.state.callTimer) {
            this.endCall();
        }

        // Stop any recording
        if (this.state.mediaRecorder) {
            this.stopVoiceRecording();
        }

        // Restore body scrolling
        document.body.style.overflow = '';
    },

    // Minimize Chat Modal
    minimize() {
        const modal = document.getElementById('chatModal');
        const container = document.querySelector('#chatModal .chat-modal-container');
        if (modal && container) {
            modal.classList.add('minimized');
            container.classList.add('minimized');
            this.state.isMinimized = true;

            // Create minimized bar if it doesn't exist
            let miniBar = document.getElementById('chatMinimizedBar');
            if (!miniBar) {
                miniBar = document.createElement('div');
                miniBar.id = 'chatMinimizedBar';
                miniBar.className = 'chat-minimized-bar';
                miniBar.innerHTML = `
                    <div class="mini-bar-content" onclick="restoreChatModal()">
                        <div class="mini-bar-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </div>
                        <span class="mini-bar-text">Chat</span>
                        <span class="mini-bar-badge" id="miniBarUnreadBadge" style="display: none;">0</span>
                    </div>
                    <button class="mini-bar-close" onclick="closeChatModal()" title="Close">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"></path>
                        </svg>
                    </button>
                `;
                document.body.appendChild(miniBar);
            }

            // Update unread badge
            this.updateMinimizedBadge();

            // Show the minimized bar
            miniBar.classList.add('visible');
        }
    },

    restore() {
        const modal = document.getElementById('chatModal');
        const container = document.querySelector('#chatModal .chat-modal-container');
        const miniBar = document.getElementById('chatMinimizedBar');

        if (modal && container) {
            modal.classList.remove('minimized');
            container.classList.remove('minimized');
            this.state.isMinimized = false;
        }

        if (miniBar) {
            miniBar.classList.remove('visible');
        }
    },

    updateMinimizedBadge() {
        const badge = document.getElementById('miniBarUnreadBadge');
        if (!badge) return;

        // Calculate total unread
        const totalUnread = this.state.conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);

        if (totalUnread > 0) {
            badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    },

    // Build API query params with profile info
    getProfileParams() {
        const profile = this.state.currentProfile;
        if (!profile) return '';
        return `profile_id=${profile.profile_id}&profile_type=${profile.profile_type}&user_id=${profile.user_id}`;
    },

    // Load Conversations from API
    async loadConversations(filterType = 'all') {
        const loadingEl = document.getElementById('chatContactsLoading');
        const listEl = document.getElementById('chatContactsList');

        try {
            // Show loading
            if (loadingEl) loadingEl.style.display = 'flex';

            if (!this.state.currentProfile) {
                console.warn('Chat: No current profile, loading user first');
                this.loadCurrentUser();
            }

            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();

            console.log('Chat: API Request - profile params:', profileParams);
            console.log('Chat: API Request - currentProfile:', this.state.currentProfile);

            // Load conversations AND connection requests in parallel
            const [conversationsResult, requestsResult] = await Promise.allSettled([
                // Fetch conversations
                fetch(
                    `${this.API_BASE_URL}/api/chat/conversations?${profileParams}&filter_type=${filterType}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                ).then(async r => {
                    if (!r.ok) {
                        const errorText = await r.text();
                        console.error('Chat: Conversations API error:', r.status, errorText);
                        return null;
                    }
                    return r.json();
                }),

                // Fetch connection requests
                fetch(
                    `${this.API_BASE_URL}/api/chat/connection-requests?${profileParams}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                ).then(async r => {
                    if (!r.ok) {
                        const errorText = await r.text();
                        console.error('Chat: Connection requests API error:', r.status, errorText);
                        return null;
                    }
                    return r.json();
                })
            ]);

            // Handle conversations
            if (conversationsResult.status === 'fulfilled' && conversationsResult.value) {
                this.state.conversations = conversationsResult.value.conversations || [];
                console.log('Chat: Loaded conversations:', this.state.conversations.length);
            } else {
                console.error('Chat: Failed to load conversations:', conversationsResult);
                console.log('Chat: Using sample conversations as fallback');
                this.state.conversations = this.getSampleConversations();
            }

            // Handle connection requests
            if (requestsResult.status === 'fulfilled' && requestsResult.value) {
                this.state.connectionRequests = {
                    sent: requestsResult.value.sent_requests || [],
                    received: requestsResult.value.received_requests || []
                };
                console.log('Chat: Loaded requests - Sent:', this.state.connectionRequests.sent.length,
                           'Received:', this.state.connectionRequests.received.length);
                // Log the profile_ids to help debug matching
                if (this.state.connectionRequests.sent.length > 0) {
                    console.log('Chat: Sent request profile_ids:', this.state.connectionRequests.sent.map(r => r.profile_id));
                }
                if (this.state.connectionRequests.received.length > 0) {
                    console.log('Chat: Received request profile_ids:', this.state.connectionRequests.received.map(r => r.profile_id));
                }
            }

            // Render conversations (includes connection requests)
            this.renderConversations();

        } catch (error) {
            console.error('Error loading conversations:', error);
            this.showToast('Error loading conversations', 'error');
        } finally {
            if (loadingEl) loadingEl.style.display = 'none';
        }
    },

    // Load contacts from connections (accepted connections)
    async loadContacts(search = '') {
        if (!this.state.currentProfile) {
            this.loadCurrentUser();
        }

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const profileParams = this.getProfileParams();

        try {
            const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/contacts?${profileParams}${searchParam}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                this.state.contacts = data.contacts || [];
                console.log('Chat: Loaded contacts:', this.state.contacts.length);
                return this.state.contacts;
            }
        } catch (error) {
            console.log('Chat: Error loading contacts:', error.message);
        }

        return [];
    },

    // Load connection requests (pending - sent and received)
    async loadConnectionRequests() {
        if (!this.state.currentProfile) {
            this.loadCurrentUser();
        }

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const profileParams = this.getProfileParams();

        try {
            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/connection-requests?${profileParams}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                this.state.connectionRequests = {
                    sent: data.sent_requests || [],
                    received: data.received_requests || []
                };
                console.log('Chat: Loaded connection requests - Sent:', data.sent_count, 'Received:', data.received_count);
                return this.state.connectionRequests;
            }
        } catch (error) {
            console.log('Chat: Error loading connection requests:', error.message);
        }

        return { sent: [], received: [] };
    },

    // Accept connection request
    async acceptConnectionRequest(connectionId) {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const profileParams = this.getProfileParams();

        try {
            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/connection-requests/${connectionId}/respond?${profileParams}&action=accept`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                this.showToast('Connection request accepted!', 'success');
                // Reload conversations to include the new contact
                await this.loadConversations();
                return true;
            }
        } catch (error) {
            console.log('Chat: Error accepting request:', error.message);
        }

        this.showToast('Failed to accept request', 'error');
        return false;
    },

    // Reject connection request
    async rejectConnectionRequest(connectionId) {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const profileParams = this.getProfileParams();

        try {
            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/connection-requests/${connectionId}/respond?${profileParams}&action=reject`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                this.showToast('Connection request declined', 'info');
                // Reload connection requests
                await this.loadConnectionRequests();
                this.renderConversations();
                return true;
            }
        } catch (error) {
            console.log('Chat: Error rejecting request:', error.message);
        }

        this.showToast('Failed to decline request', 'error');
        return false;
    },

    // Get Sample Conversations
    getSampleConversations() {
        return [
            {
                id: 'conv-1',
                user_id: 'user-1',
                name: 'Abebe Kebede',
                avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
                role: 'Tutor',
                last_message: 'Thank you for booking the session!',
                last_message_time: new Date(Date.now() - 2 * 60000),
                unread_count: 2,
                is_online: true,
                category: 'personal'
            },
            {
                id: 'conv-2',
                user_id: 'user-2',
                name: 'Tigist Haile',
                avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
                role: 'Student',
                last_message: 'Can we reschedule the class?',
                last_message_time: new Date(Date.now() - 3600000),
                unread_count: 0,
                is_online: true,
                category: 'personal'
            },
            {
                id: 'conv-3',
                user_id: 'user-3',
                name: 'Mathematics Study Group',
                avatar: null,
                role: '5 members',
                last_message: 'Meeting tomorrow at 3 PM',
                last_message_time: new Date(Date.now() - 86400000),
                unread_count: 5,
                is_online: false,
                category: 'groups',
                is_group: true
            },
            {
                id: 'conv-4',
                user_id: 'user-4',
                name: 'Dawit Mulugeta',
                avatar: 'https://randomuser.me/api/portraits/men/68.jpg',
                role: 'Parent',
                last_message: 'How is my child progressing?',
                last_message_time: new Date(Date.now() - 172800000),
                unread_count: 0,
                is_online: false,
                category: 'personal'
            }
        ];
    },

    // Render Conversations
    renderConversations() {
        const listEl = document.getElementById('chatContactsList');
        if (!listEl) return;

        // Clear existing content except loading
        listEl.innerHTML = '';

        const { sent, received } = this.state.connectionRequests;
        const hasRequests = (sent.length > 0 || received.length > 0);
        const hasConversations = this.state.conversations.length > 0;

        // Show connection requests section first (if any)
        if (hasRequests) {
            // Received requests section (can accept/reject)
            if (received.length > 0) {
                const receivedSection = document.createElement('div');
                receivedSection.className = 'requests-section';
                receivedSection.innerHTML = `
                    <div class="section-header" style="padding: 12px 16px; background: rgba(245, 158, 11, 0.1); border-bottom: 1px solid var(--border-color);">
                        <h4 style="margin: 0; font-size: 0.85rem; color: var(--button-bg); display: flex; align-items: center; gap: 8px;">
                            <span style="background: var(--button-bg); color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem;">${received.length}</span>
                            Connection Requests Received
                        </h4>
                    </div>
                `;
                listEl.appendChild(receivedSection);

                received.forEach(req => {
                    const reqEl = this.createRequestElement(req, 'received');
                    listEl.appendChild(reqEl);
                });
            }

            // Sent requests section (pending, waiting for response)
            if (sent.length > 0) {
                const sentSection = document.createElement('div');
                sentSection.className = 'requests-section';
                sentSection.innerHTML = `
                    <div class="section-header" style="padding: 12px 16px; background: rgba(107, 114, 128, 0.1); border-bottom: 1px solid var(--border-color);">
                        <h4 style="margin: 0; font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
                            <span style="background: var(--text-muted); color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem;">${sent.length}</span>
                            Requests Sent (Pending)
                        </h4>
                    </div>
                `;
                listEl.appendChild(sentSection);

                sent.forEach(req => {
                    const reqEl = this.createRequestElement(req, 'sent');
                    listEl.appendChild(reqEl);
                });
            }

            // Add separator before conversations
            if (hasConversations) {
                const separator = document.createElement('div');
                separator.style.cssText = 'padding: 12px 16px; background: var(--card-bg); border-bottom: 1px solid var(--border-color);';
                separator.innerHTML = '<h4 style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">Conversations</h4>';
                listEl.appendChild(separator);
            }
        }

        // Show empty state only if no conversations AND no requests
        if (!hasConversations && !hasRequests) {
            listEl.innerHTML = `
                <div class="chat-empty" style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                    <p>No conversations yet</p>
                    <button onclick="ChatModalManager.startNewChat()" style="margin-top: 16px; padding: 10px 20px; background: var(--button-bg); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Start a conversation
                    </button>
                </div>
            `;
            return;
        }

        // Render conversations
        this.state.conversations.forEach(conv => {
            const contactEl = this.createContactElement(conv);
            listEl.appendChild(contactEl);
        });
    },

    // Create Request Element (for connection requests)
    createRequestElement(req, direction) {
        const div = document.createElement('div');
        div.className = 'contact-item request-item';
        div.dataset.requestId = req.connection_id;
        div.dataset.direction = direction;
        div.dataset.category = 'requests';

        const displayName = req.display_name || `${req.first_name} ${req.father_name}`;
        const avatarUrl = req.avatar || req.profile_picture;
        const profileType = req.profile_type ? this.capitalizeFirst(req.profile_type) : 'User';
        const timeAgo = this.formatTimeAgo(req.requested_at);

        const avatarHtml = avatarUrl
            ? `<img src="${avatarUrl}" alt="${displayName}" class="contact-avatar">`
            : `<div class="contact-avatar" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem;">${displayName.charAt(0)}</div>`;

        // Different UI based on direction
        if (direction === 'received') {
            div.innerHTML = `
                <div class="contact-avatar-wrapper">
                    ${avatarHtml}
                    <span class="status-indicator request-pending" style="background: #f59e0b;"></span>
                </div>
                <div class="contact-info" style="flex: 1;">
                    <div class="contact-header">
                        <h4>${displayName}</h4>
                        <span class="message-time">${timeAgo}</span>
                    </div>
                    <span class="contact-role">${profileType}</span>
                    <div class="request-actions" style="display: flex; gap: 8px; margin-top: 8px;">
                        <button onclick="event.stopPropagation(); ChatModalManager.acceptConnectionRequest(${req.connection_id})"
                                style="flex: 1; padding: 6px 12px; background: var(--button-bg); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                            Accept
                        </button>
                        <button onclick="event.stopPropagation(); ChatModalManager.rejectConnectionRequest(${req.connection_id})"
                                style="flex: 1; padding: 6px 12px; background: transparent; color: var(--text-muted); border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                            Decline
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Sent request - show pending status
            div.innerHTML = `
                <div class="contact-avatar-wrapper">
                    ${avatarHtml}
                    <span class="status-indicator" style="background: #6b7280;"></span>
                </div>
                <div class="contact-info">
                    <div class="contact-header">
                        <h4>${displayName}</h4>
                        <span class="message-time">${timeAgo}</span>
                    </div>
                    <span class="contact-role">${profileType}</span>
                    <div class="contact-preview">
                        <p class="last-message" style="color: var(--text-muted); font-style: italic;">Request pending...</p>
                    </div>
                </div>
            `;
        }

        // Click to show request info in chat area
        div.addEventListener('click', () => {
            this.showRequestInChatArea(req, direction);
        });

        return div;
    },

    // Select a request (sent or received) - highlights it and shows in chat area
    selectRequest(req, direction) {
        console.log('Chat: selectRequest called with:', req, direction);
        console.log('Chat: Request connection_id:', req.connection_id, 'profile_id:', req.profile_id);
        this.showRequestInChatArea(req, direction);
    },

    // Show request details in chat area
    showRequestInChatArea(req, direction) {
        // Show chat content area
        const emptyState = document.getElementById('chatEmptyState');
        const chatContent = document.getElementById('chatContent');
        if (emptyState) emptyState.style.display = 'none';
        if (chatContent) chatContent.style.display = 'flex';

        const displayName = req.display_name || `${req.first_name} ${req.father_name}`;
        const avatarUrl = req.avatar || req.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff`;
        const profileType = req.profile_type ? this.capitalizeFirst(req.profile_type) : 'User';

        // Update header
        this.updateChatHeader({
            name: displayName,
            avatar: avatarUrl,
            role: profileType,
            is_online: false
        });

        // Show request message in chat area
        const chatArea = document.getElementById('chatArea');
        if (chatArea) {
            if (direction === 'received') {
                chatArea.innerHTML = `
                    <div class="date-divider"><span>Connection Request</span></div>
                    <div class="request-message" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center;">
                        <img src="${avatarUrl}" alt="${displayName}" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 16px; object-fit: cover;">
                        <h3 style="margin: 0 0 8px 0; color: var(--text-primary);">${displayName}</h3>
                        <p style="margin: 0 0 8px 0; color: var(--text-muted);">${profileType}</p>
                        <p style="margin: 0 0 24px 0; color: var(--text-secondary);">wants to connect with you</p>
                        <div style="display: flex; gap: 12px;">
                            <button onclick="ChatModalManager.acceptConnectionRequest(${req.connection_id})"
                                    style="padding: 12px 32px; background: var(--button-bg); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                                Accept Request
                            </button>
                            <button onclick="ChatModalManager.rejectConnectionRequest(${req.connection_id})"
                                    style="padding: 12px 32px; background: transparent; color: var(--text-muted); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer;">
                                Decline
                            </button>
                        </div>
                    </div>
                `;
            } else {
                chatArea.innerHTML = `
                    <div class="date-divider"><span>Request Sent</span></div>
                    <div class="request-message" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center;">
                        <img src="${avatarUrl}" alt="${displayName}" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 16px; object-fit: cover;">
                        <h3 style="margin: 0 0 8px 0; color: var(--text-primary);">${displayName}</h3>
                        <p style="margin: 0 0 8px 0; color: var(--text-muted);">${profileType}</p>
                        <p style="margin: 0 0 16px 0; color: var(--text-secondary);">Connection request sent</p>
                        <p style="margin: 0; color: var(--text-muted); font-style: italic;">Waiting for ${displayName} to accept your request...</p>
                    </div>
                `;
            }
        }

        // Clear selected chat state (this is a request, not a conversation)
        this.state.selectedChat = null;
        this.state.selectedConversation = null;

        // Update active state in sidebar - highlight the selected request
        const highlightRequest = () => {
            document.querySelectorAll('#chatModal .contact-item').forEach(item => {
                item.classList.remove('active');
            });
            const selectedEl = document.querySelector(`[data-request-id="${req.connection_id}"]`);
            if (selectedEl) {
                selectedEl.classList.add('active');
                // Scroll into view if needed
                selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                console.log('Chat: Highlighted request element with connection_id:', req.connection_id);
                return true;
            }
            return false;
        };

        // Try immediately, then retry after a short delay if not found (DOM may not be ready)
        if (!highlightRequest()) {
            console.log('Chat: Request element not found immediately, retrying...');
            setTimeout(() => {
                if (!highlightRequest()) {
                    console.warn('Chat: Could not find request element with connection_id:', req.connection_id);
                }
            }, 100);
        }
    },

    // Create Contact Element
    createContactElement(conv) {
        const div = document.createElement('div');
        div.className = `contact-item ${this.state.selectedChat === conv.id ? 'active' : ''}`;
        div.dataset.conversationId = conv.id;
        div.dataset.category = conv.type === 'group' ? 'groups' : 'personal';

        // Use display_name from API or fallback to name
        const displayName = conv.display_name || conv.name || 'Unknown';
        const avatarUrl = conv.avatar || conv.avatar_url;

        const avatarHtml = avatarUrl
            ? `<img src="${avatarUrl}" alt="${displayName}" class="contact-avatar">`
            : `<div class="contact-avatar" style="background: linear-gradient(135deg, var(--button-bg), var(--button-hover)); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem;">${conv.type === 'group' ? '&#128101;' : displayName.charAt(0)}</div>`;

        const statusClass = conv.is_online ? 'online' : 'offline';

        // Handle last message time - from API or sample data
        let timeAgo = '';
        if (conv.last_message?.time) {
            timeAgo = this.formatTimeAgo(conv.last_message.time);
        } else if (conv.last_message_at) {
            timeAgo = this.formatTimeAgo(conv.last_message_at);
        } else if (conv.last_message_time) {
            timeAgo = this.formatTimeAgo(conv.last_message_time);
        }

        // Get last message text
        let lastMsgText = conv.last_message?.content || conv.last_message || 'No messages yet';
        if (conv.is_connection || conv.is_family || conv.is_tutor_contact || conv.is_enrolled) {
            lastMsgText = 'Tap to start chatting';
        }

        // Role/participant count for display
        let roleText = conv.type === 'group'
            ? `${conv.participant_count || 0} members`
            : (conv.other_profile_type ? this.capitalizeFirst(conv.other_profile_type) : conv.role || '');

        // Add relationship badge (family, enrolled, session request, tutor contact)
        let relationshipBadge = '';
        if (conv.is_family && conv.relationship) {
            // Family badge (green)
            relationshipBadge = `<span class="family-badge" style="display: inline-block; margin-left: 0.5rem; padding: 0.1rem 0.4rem; background: linear-gradient(135deg, #10b981, #059669); color: white; border-radius: 4px; font-size: 0.65rem; font-weight: 600;">${conv.relationship}</span>`;
        } else if (conv.is_enrolled && conv.relationship) {
            // Enrolled badge (blue)
            relationshipBadge = `<span class="enrolled-badge" style="display: inline-block; margin-left: 0.5rem; padding: 0.1rem 0.4rem; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border-radius: 4px; font-size: 0.65rem; font-weight: 600;">${conv.relationship}</span>`;
        } else if (conv.is_session_request && conv.relationship) {
            // Session request badge (orange for pending, green for accepted)
            const badgeColor = conv.request_status === 'pending'
                ? 'background: linear-gradient(135deg, #f59e0b, #d97706);'
                : 'background: linear-gradient(135deg, #10b981, #059669);';
            relationshipBadge = `<span class="session-badge" style="display: inline-block; margin-left: 0.5rem; padding: 0.1rem 0.4rem; ${badgeColor} color: white; border-radius: 4px; font-size: 0.65rem; font-weight: 600;">${conv.relationship}</span>`;
        } else if (conv.is_tutor_contact) {
            // Tutor contact badge (amber)
            relationshipBadge = `<span class="tutor-badge" style="display: inline-block; margin-left: 0.5rem; padding: 0.1rem 0.4rem; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border-radius: 4px; font-size: 0.65rem; font-weight: 600;">Tutor</span>`;
        } else if (conv.is_connection) {
            // Connection badge (purple)
            relationshipBadge = `<span class="connection-badge" style="display: inline-block; margin-left: 0.5rem; padding: 0.1rem 0.4rem; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border-radius: 4px; font-size: 0.65rem; font-weight: 600;">Connected</span>`;
        }

        div.innerHTML = `
            <div class="contact-avatar-wrapper">
                ${avatarHtml}
                <span class="status-indicator ${statusClass}"></span>
            </div>
            <div class="contact-info">
                <div class="contact-header">
                    <h4>${displayName}${relationshipBadge}</h4>
                    <span class="message-time">${timeAgo}</span>
                </div>
                <span class="contact-role">${roleText}</span>
                <div class="contact-preview">
                    <p class="last-message">${typeof lastMsgText === 'string' ? lastMsgText : 'No messages yet'}</p>
                    ${conv.unread_count > 0 ? `<span class="unread-count">${conv.unread_count}</span>` : ''}
                </div>
            </div>
        `;

        div.addEventListener('click', () => {
            this.selectConversation(conv);
        });

        return div;
    },

    // Select Conversation
    async selectConversation(conv) {
        // DON'T create conversation immediately for connections
        // Wait until user sends a message (Say Hello or typing)
        // This allows us to show the "Say Hello" empty state first

        this.state.selectedChat = conv.id;
        this.state.selectedConversation = conv;

        // Update active state
        document.querySelectorAll('#chatModal .contact-item').forEach(item => {
            item.classList.remove('active');
        });
        const selectedEl = document.querySelector(`[data-conversation-id="${conv.id}"]`);
        if (selectedEl) {
            selectedEl.classList.add('active');
            // Clear unread
            const unreadEl = selectedEl.querySelector('.unread-count');
            if (unreadEl) unreadEl.style.display = 'none';
        }

        // Show chat content, hide empty state
        const emptyState = document.getElementById('chatEmptyState');
        const chatContent = document.getElementById('chatContent');
        if (emptyState) emptyState.style.display = 'none';
        if (chatContent) chatContent.style.display = 'flex';

        // Update header with display_name from API
        this.updateChatHeader({
            ...conv,
            name: conv.display_name || conv.name,
            avatar: conv.avatar || conv.avatar_url,
            role: conv.type === 'group'
                ? `${conv.participant_count || 0} members`
                : (conv.other_profile_type ? this.capitalizeFirst(conv.other_profile_type) : conv.role || '')
        });

        // Load messages (or show empty chat for new connections/family members/tutor contacts/enrolled contacts)
        // Check if this is an accepted connection, family member, tutor contact, or enrolled contact without a real conversation yet
        const isSyntheticConversation =
            (conv.is_connection && conv.id.startsWith('connection-')) ||
            (conv.is_family && (conv.id.startsWith('family-parent-') || conv.id.startsWith('family-child-'))) ||
            (conv.is_tutor_contact && conv.id.startsWith('tutor-')) ||
            (conv.is_enrolled && (conv.id.startsWith('enrolled-student-') || conv.id.startsWith('enrolled-tutor-') || conv.id.startsWith('enrolled-parent-') || conv.id.startsWith('child-tutor-')));

        if (isSyntheticConversation) {
            // Show the "Say Hello" empty state
            this.showEmptyConversation(conv);
        } else {
            // This is a real conversation - load messages
            this.loadMessages(conv.id);
        }

        // Update info panel
        this.updateInfoPanel(conv);

        // Check if contact is blocked and show appropriate UI
        this.checkBlockedStatus();

        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            this.toggleSidebar();
        }
    },

    // Create a real conversation from an accepted connection
    async createConversationFromConnection(conn) {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/conversations?${profileParams}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: 'direct',
                        participants: [{
                            profile_id: conn.other_profile_id,
                            profile_type: conn.other_profile_type,
                            user_id: conn.other_user_id
                        }]
                    })
                }
            );

            if (response.ok) {
                const data = await response.json();
                console.log('Chat: Created conversation from connection:', data.conversation_id);

                // Update the connection in our state to be a real conversation
                const idx = this.state.conversations.findIndex(c => c.id === conn.id);
                if (idx >= 0) {
                    this.state.conversations[idx].id = data.conversation_id;
                    this.state.conversations[idx].is_connection = false;

                    // Update the DOM element
                    const el = document.querySelector(`[data-conversation-id="${conn.id}"]`);
                    if (el) {
                        el.dataset.conversationId = data.conversation_id;
                    }
                }

                return { id: data.conversation_id, existing: data.existing };
            }
        } catch (error) {
            console.log('Chat: Could not create conversation:', error.message);
        }
        return null;
    },

    // Show empty conversation state for new connections
    showEmptyConversation(conv) {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        const displayName = conv.display_name || conv.name || 'User';
        const avatarUrl = conv.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=F59E0B&color=fff`;
        const safeName = displayName.replace(/'/g, "\\'");

        chatArea.innerHTML = `
            <div class="new-conversation-start" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; height: 100%;">
                <img src="${avatarUrl}" alt="${displayName}" style="width: 100px; height: 100px; border-radius: 50%; margin-bottom: 20px; object-fit: cover; border: 3px solid var(--button-bg);">
                <h3 style="margin: 0 0 8px 0; color: var(--text-primary); font-size: 1.3rem;">${displayName}</h3>
                <p style="margin: 0 0 8px 0; color: var(--button-bg); font-size: 0.9rem;">${this.capitalizeFirst(conv.other_profile_type || 'User')}</p>
                <p style="margin: 0 0 24px 0; color: var(--text-muted); font-size: 0.95rem;">You're now connected! Start a conversation.</p>
                <div style="display: flex; gap: 12px;">
                    <button onclick="ChatModalManager.sayHello('${safeName}')" style="padding: 12px 24px; background: var(--button-bg); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                        Say Hello
                    </button>
                </div>
            </div>
        `;
    },

    // Say Hello - sends a greeting message
    async sayHello(displayName) {
        const input = document.getElementById('chatMessageInput');
        if (input) {
            input.value = `Hello ${displayName}!`;
            input.focus();
            // Automatically send the message
            await this.sendMessage();
        }
    },

    // Update Chat Header
    updateChatHeader(conv) {
        const avatar = document.getElementById('chatUserAvatar');
        const name = document.getElementById('chatUserName');
        const role = document.getElementById('chatUserRole');
        const lastSeen = document.getElementById('chatLastSeen');
        const onlineIndicator = document.getElementById('chatUserOnlineIndicator');

        if (avatar) {
            avatar.src = conv.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(conv.name);
        }
        if (name) name.textContent = conv.name;
        if (role) role.textContent = conv.role;
        if (lastSeen) {
            lastSeen.textContent = conv.is_online ? 'Online' : `Last seen ${this.formatTimeAgo(conv.last_message_time)}`;
        }
        if (onlineIndicator) {
            onlineIndicator.style.background = conv.is_online ? '#10b981' : '#6b7280';
        }

        // Update call modal info
        const callAvatar = document.getElementById('chatCallUserAvatar');
        const callName = document.getElementById('chatCallUserName');
        const callRole = document.getElementById('chatCallUserRole');

        if (callAvatar) callAvatar.src = avatar?.src || '';
        if (callName) callName.textContent = conv.name;
        if (callRole) callRole.textContent = conv.role;
    },

    // Update Info Panel
    // Reads: profile_picture, full_name, quote from profile table
    // Reads: email, phone from users table
    // Calculates: role from users.roles JSON field
    async updateInfoPanel(conv) {
        const avatar = document.getElementById('chatInfoPanelAvatar');
        const name = document.getElementById('chatInfoPanelName');
        const role = document.getElementById('chatInfoPanelRole');
        const lastSeen = document.getElementById('chatInfoPanelLastSeen');
        const quote = document.getElementById('chatInfoPanelQuote');

        // Reset contact details visibility
        const locationEl = document.getElementById('chatInfoLocation');
        if (locationEl) locationEl.style.display = 'none';

        // Set defaults from conversation object first
        if (avatar) avatar.src = conv.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(conv.name);
        if (name) name.textContent = conv.name;
        if (role) role.textContent = conv.role || 'User';
        if (lastSeen) lastSeen.textContent = conv.is_online ? 'Online now' : `Last seen ${this.formatTimeAgo(conv.last_message_time)}`;
        if (quote) quote.textContent = conv.quote || 'No quote available';

        // Try to fetch detailed profile data from API (profile_id is primary identifier)
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) return;

            // Get profile_id and profile_type - prefer other_profile_id/other_profile_type for conversation partner
            const profileId = conv.other_profile_id || conv.profile_id;
            const profileType = conv.other_profile_type || conv.profile_type;

            // Fetch profile data first (primary source - for profile picture, name, quote)
            // API endpoints are: /api/student/{id}, /api/parent/{id}, /api/tutor/{id} (no /profile)
            if (profileId && profileType) {
                const profileResponse = await fetch(
                    `${this.API_BASE_URL}/api/${profileType}/${profileId}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );

                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();

                    // Update from profile table
                    if (profileData.profile_picture && avatar) {
                        avatar.src = profileData.profile_picture;
                    }
                    if ((profileData.full_name || profileData.name) && name) {
                        name.textContent = profileData.full_name || profileData.name;
                    }
                    if (profileData.quote && quote) {
                        quote.textContent = profileData.quote;
                    }
                    // Location from profile
                    if (profileData.location && locationEl) {
                        locationEl.style.display = 'flex';
                        const valueEl = locationEl.querySelector('.info-value');
                        if (valueEl) valueEl.textContent = profileData.location;
                    }
                    // Update role from profile type
                    if (role && profileType) {
                        role.textContent = this.capitalizeFirst(profileType);
                    }
                }
            }

            // Note: /api/users/{userId} endpoint doesn't exist
            // Role info is already available from profile_type, so we use that instead
            // The role is already set above from profileType
        } catch (error) {
            console.log('Chat: Could not fetch detailed user/profile info:', error);
            // Keep using conversation data as fallback
        }
    },

    // Calculate display role from users.roles JSON
    calculateUserRoles(roles) {
        if (!roles) return null;

        // Parse if string
        let rolesObj = typeof roles === 'string' ? JSON.parse(roles) : roles;

        // Get active roles
        const activeRoles = [];
        if (rolesObj.student) activeRoles.push('Student');
        if (rolesObj.tutor) activeRoles.push('Tutor');
        if (rolesObj.parent) activeRoles.push('Parent');
        if (rolesObj.advertiser) activeRoles.push('Advertiser');
        if (rolesObj.admin) activeRoles.push('Admin');
        if (rolesObj.institute) activeRoles.push('Institute');

        if (activeRoles.length === 0) return null;
        if (activeRoles.length === 1) return activeRoles[0];
        if (activeRoles.length === 2) return activeRoles.join(' & ');
        return activeRoles.slice(0, -1).join(', ') + ' & ' + activeRoles[activeRoles.length - 1];
    },

    // Load Messages
    async loadMessages(conversationId) {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        // Show loading
        chatArea.innerHTML = `
            <div style="display: flex; justify-content: center; padding: 40px;">
                <div class="loading-spinner" style="width: 30px; height: 30px; border: 3px solid rgba(245, 158, 11, 0.2); border-top-color: #F59E0B; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            </div>
        `;

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();

            // Try to fetch from API
            try {
                const response = await fetch(
                    `${this.API_BASE_URL}/api/chat/messages/${conversationId}?${profileParams}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    // Transform API messages to expected format
                    this.state.messages[conversationId] = (data.messages || []).map(msg => ({
                        id: msg.id,
                        text: msg.content,
                        content: msg.content,
                        message_type: msg.message_type,
                        sender_id: msg.sender_profile_id,
                        sender_name: msg.sender_name || 'User',
                        avatar: msg.sender_avatar,
                        time: msg.created_at,
                        sent: msg.is_mine,
                        is_mine: msg.is_mine,
                        reply_to: msg.reply_to,
                        reactions: msg.reactions,
                        is_edited: msg.is_edited,
                        media_url: msg.media_url,
                        media_metadata: msg.media_metadata,
                        // Session request specific fields from API
                        package_details: msg.package_details,
                        session_request_status: msg.session_request_status,
                        // Requested student info (when parent requests for child)
                        requested_to_id: msg.requested_to_id,
                        requested_to_name: msg.requested_to_name,
                        requested_to_avatar: msg.requested_to_avatar
                    }));
                    console.log('Chat: Loaded messages:', this.state.messages[conversationId].length);
                } else {
                    // Use sample messages
                    console.log('Chat: API returned error, using sample messages');
                    this.state.messages[conversationId] = this.getSampleMessages();
                }
            } catch (error) {
                console.log('Chat: Using sample messages:', error.message);
                this.state.messages[conversationId] = this.getSampleMessages();
            }

            // Render messages
            this.renderMessages(conversationId);

        } catch (error) {
            console.error('Error loading messages:', error);
            chatArea.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">Error loading messages</div>';
        }
    },

    // Get Sample Messages
    getSampleMessages() {
        return [
            {
                id: 'msg-1',
                text: 'Hello! How can I help you today?',
                sender_id: 'other',
                sender_name: 'Other User',
                avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
                time: new Date(Date.now() - 3600000),
                sent: false
            },
            {
                id: 'msg-2',
                text: 'Hi! I have a question about the upcoming session.',
                sender_id: 'me',
                sender_name: 'You',
                time: new Date(Date.now() - 3500000),
                sent: true
            },
            {
                id: 'msg-3',
                text: 'Of course! What would you like to know?',
                sender_id: 'other',
                sender_name: 'Other User',
                avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
                time: new Date(Date.now() - 3400000),
                sent: false
            },
            {
                id: 'msg-4',
                text: 'Can we start 30 minutes earlier next time?',
                sender_id: 'me',
                sender_name: 'You',
                time: new Date(Date.now() - 60000),
                sent: true
            },
            {
                id: 'msg-5',
                text: 'That works perfectly for me!',
                sender_id: 'other',
                sender_name: 'Other User',
                avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
                time: new Date(Date.now() - 30000),
                sent: false
            }
        ];
    },

    // Render Messages
    renderMessages(conversationId) {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        const messages = this.state.messages[conversationId] || [];

        // Clear and add date divider + typing indicators
        chatArea.innerHTML = `
            <div class="date-divider">
                <span>Today</span>
            </div>
        `;

        // Render each message
        messages.forEach(msg => {
            this.displayMessage(msg);
        });

        // Re-add typing indicators at the end of chat area
        this.addTypingIndicators();

        // Scroll to bottom
        this.scrollToBottom();
    },

    // Show error when user tries to message themselves
    showSelfMessageError(userName, userAvatar, userRole) {
        console.log('Chat: showSelfMessageError called for:', userName);

        // Ensure modal is visible first
        const modal = document.getElementById('chatModal');
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';
        }

        // Hide empty state, show chat content
        const emptyState = document.getElementById('chatEmptyState');
        const chatContent = document.getElementById('chatContent');

        if (emptyState) emptyState.style.display = 'none';
        if (chatContent) chatContent.style.display = 'flex';

        // Generate avatar URL if not provided
        const avatarUrl = userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'You')}&background=8B5CF6&color=fff&size=80`;

        // Update the user info header with target user's info
        const chatUserAvatar = document.getElementById('chatUserAvatar');
        const chatUserName = document.getElementById('chatUserName');
        const chatUserRole = document.getElementById('chatUserRole');
        const chatLastSeen = document.getElementById('chatLastSeen');
        const onlineIndicator = document.getElementById('chatUserOnlineIndicator');

        if (chatUserAvatar) chatUserAvatar.src = avatarUrl;
        if (chatUserName) chatUserName.textContent = userName || 'Yourself';
        if (chatUserRole) chatUserRole.textContent = userRole ? this.capitalizeFirst(userRole) : 'You';
        if (chatLastSeen) chatLastSeen.textContent = "That's you!";
        if (onlineIndicator) onlineIndicator.style.display = 'none';

        // Get chat area and input elements
        const chatArea = document.getElementById('chatArea');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.querySelector('.send-btn');
        const inputArea = document.querySelector('.chat-input-area');

        console.log('Chat: chatArea found:', !!chatArea);

        // Clear chat area and show error message with user's profile
        if (chatArea) {
            chatArea.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem; text-align: center;">
                    <img src="${avatarUrl}"
                         alt="${userName || 'You'}"
                         style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 1rem; border: 4px solid #e5e7eb;"
                         onerror="this.src='https://ui-avatars.com/api/?name=You&background=8B5CF6&color=fff&size=100'">
                    <h3 style="font-size: 1.5rem; font-weight: 700; color: var(--heading, #1f2937); margin-bottom: 0.25rem;">
                        ${userName || 'Yourself'}
                    </h3>
                    <span style="color: var(--button-bg, #6366f1); font-size: 0.9rem; font-weight: 500; margin-bottom: 1.5rem; background: rgba(99, 102, 241, 0.1); padding: 0.25rem 0.75rem; border-radius: 20px;">
                        ${userRole ? this.capitalizeFirst(userRole) : 'Your Account'}
                    </span>
                    <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #fee2e2, #fecaca); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <h4 style="font-size: 1rem; font-weight: 600; color: #dc2626; margin-bottom: 0.5rem;">
                        Cannot Message Yourself
                    </h4>
                    <p style="color: var(--text-secondary, #6b7280); font-size: 0.875rem; max-width: 280px; line-height: 1.5;">
                        Select a different conversation from the sidebar to continue chatting.
                    </p>
                </div>
            `;
        }

        // Hide the input area completely
        if (inputArea) {
            inputArea.style.display = 'none';
        }

        // Also disable input and send button as fallback
        if (messageInput) {
            messageInput.disabled = true;
            messageInput.placeholder = 'Cannot send messages to yourself';
        }
        if (sendButton) {
            sendButton.disabled = true;
            sendButton.style.opacity = '0.5';
            sendButton.style.cursor = 'not-allowed';
        }
    },

    // Add typing indicator elements to chat area
    addTypingIndicators() {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        // Remove existing typing indicators first
        const existingOther = document.getElementById('chatTypingIndicator');
        const existingSelf = document.getElementById('selfTypingIndicator');
        if (existingOther) existingOther.remove();
        if (existingSelf) existingSelf.remove();

        // Create other party typing indicator (left side)
        const otherTyping = document.createElement('div');
        otherTyping.className = 'message typing-message';
        otherTyping.id = 'chatTypingIndicator';
        otherTyping.innerHTML = `
            <img src="" alt="" class="message-avatar" id="typingUserAvatar">
            <div class="message-content">
                <div class="message-bubble typing-bubble">
                    <div class="typing-dots-wave">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;
        chatArea.appendChild(otherTyping);

        // Create self typing indicator (right side)
        const selfTyping = document.createElement('div');
        selfTyping.className = 'message sent typing-message';
        selfTyping.id = 'selfTypingIndicator';
        selfTyping.innerHTML = `
            <div class="message-content">
                <div class="message-bubble typing-bubble">
                    <div class="typing-dots-wave">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;
        chatArea.appendChild(selfTyping);
    },

    // Display Message
    displayMessage(msg) {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        const div = document.createElement('div');
        div.className = `message ${msg.sent ? 'sent' : ''}`;
        div.dataset.messageId = msg.id;

        let html = '';

        if (!msg.sent && msg.avatar) {
            html += `<img src="${msg.avatar}" alt="${msg.sender_name}" class="message-avatar">`;
        }

        html += '<div class="message-content">';

        // Handle session_request message type with package card - NO bubble wrapper
        if (msg.message_type === 'session_request' || msg.type === 'session_request') {
            html += this.renderSessionRequestCard(msg);
            html += `<span class="message-time-inline">${this.formatTime(msg.time)}</span>`;
            html += '</div>';
        } else {
            // Regular messages get the bubble wrapper
            html += '<div class="message-bubble">';

            if (msg.reply_to) {
                html += `
                    <div class="reply-reference" style="padding: 8px; background: rgba(var(--border-rgb), 0.1); border-radius: 8px; margin-bottom: 8px; border-left: 3px solid var(--button-bg);">
                        <strong style="color: var(--button-bg); font-size: 0.85rem;">${msg.reply_to.sender}</strong>
                        <p style="margin: 4px 0 0 0; font-size: 0.85rem; opacity: 0.8;">${msg.reply_to.text}</p>
                    </div>
                `;
            }

            if (msg.audio) {
                html += `
                    <div class="message-audio">
                        <audio controls style="max-width: 200px;">
                            <source src="${msg.audio}" type="audio/wav">
                        </audio>
                    </div>
                `;
            } else if (msg.image) {
                html += `
                    <div class="message-image">
                        <img src="${msg.image}" alt="Image" style="max-width: 250px; border-radius: 12px;">
                    </div>
                `;
            } else if (msg.file) {
                html += `
                    <div class="message-file" style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(var(--border-rgb), 0.1); border-radius: 8px;">
                        <span>&#128206;</span>
                        <a href="${msg.file.url}" target="_blank" style="color: var(--button-bg);">${msg.file.name}</a>
                    </div>
                `;
            } else {
                html += `<p class="message-text">${this.escapeHtml(msg.text || msg.content || '')}</p>`;
            }

            html += '</div>';
            html += `<span class="message-time-inline">${this.formatTime(msg.time)}</span>`;
            html += '</div>';
        }

        // Reactions
        if (msg.reactions && msg.reactions.length > 0) {
            html += '<div class="message-reactions" style="display: flex; gap: 4px; margin-top: 4px;">';
            msg.reactions.forEach(r => {
                html += `<span style="background: rgba(var(--border-rgb), 0.1); padding: 2px 6px; border-radius: 12px; font-size: 0.85rem;">${r.emoji} ${r.count}</span>`;
            });
            html += '</div>';
        }

        div.innerHTML = html;

        // Insert message BEFORE typing indicators so they stay at the bottom
        const typingIndicator = document.getElementById('chatTypingIndicator');
        if (typingIndicator) {
            chatArea.insertBefore(div, typingIndicator);
        } else {
            chatArea.appendChild(div);
        }
    },

    // Render Session Request Package Card - Beautiful detailed design matching packages-panel
    renderSessionRequestCard(msg) {
        const pkg = msg.package_details || {};
        const metadata = msg.media_metadata || {};
        const requestStatus = msg.session_request_status || {};
        const userMessage = msg.text || msg.content || '';

        // Parse metadata if it's a string
        const meta = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;

        // Status badge colors and styles
        const statusColors = {
            pending: { bg: '#fef3c7', text: '#92400e', icon: 'fa-clock', label: 'Pending Review' },
            accepted: { bg: '#d1fae5', text: '#065f46', icon: 'fa-check-circle', label: 'Accepted' },
            rejected: { bg: '#fee2e2', text: '#991b1b', icon: 'fa-times-circle', label: 'Declined' }
        };

        const status = requestStatus.status || meta.status || 'pending';
        const statusStyle = statusColors[status] || statusColors.pending;

        // Format price
        const price = pkg.hourly_rate || pkg.session_price || pkg.package_price || 0;
        const priceText = Math.round(price);

        // Get courses array
        const courses = pkg.courses
            ? (typeof pkg.courses === 'string' ? pkg.courses.split(',').map(c => c.trim()) : pkg.courses)
            : [];

        // Get session format array
        const sessionFormats = pkg.session_format
            ? (typeof pkg.session_format === 'string'
                ? (pkg.session_format.toLowerCase() === 'both' ? ['Online', 'In-person'] : [pkg.session_format])
                : pkg.session_format)
            : [];

        // Build schedule info from metadata (what user requested)
        let requestedSchedule = '';
        if (meta.schedule_type === 'recurring') {
            const parts = [];
            if (meta.days && meta.days.length > 0) parts.push(meta.days.join(', '));
            if (meta.months && meta.months.length > 0) parts.push(`Months: ${meta.months.slice(0, 3).join(', ')}${meta.months.length > 3 ? '...' : ''}`);
            if (meta.start_time && meta.end_time) parts.push(`${meta.start_time} - ${meta.end_time}`);
            requestedSchedule = parts.join(' • ') || 'Flexible';
        } else if (meta.schedule_type === 'specific_dates' && meta.specific_dates) {
            const dates = Array.isArray(meta.specific_dates) ? meta.specific_dates.slice(0, 3).join(', ') : meta.specific_dates;
            requestedSchedule = dates + (meta.specific_dates.length > 3 ? '...' : '');
            if (meta.start_time && meta.end_time) requestedSchedule += ` • ${meta.start_time} - ${meta.end_time}`;
        }

        // Package schedule info
        let packageSchedule = 'Flexible';
        if (pkg.schedule_type === 'recurring' && pkg.recurring_days) {
            packageSchedule = Array.isArray(pkg.recurring_days) ? pkg.recurring_days.join(', ') : pkg.recurring_days;
            if (pkg.start_time && pkg.end_time) {
                const startTime = pkg.start_time.substring(0, 5);
                const endTime = pkg.end_time.substring(0, 5);
                packageSchedule += ` • ${startTime} - ${endTime}`;
            }
        } else if (pkg.days_per_week) {
            packageSchedule = `${pkg.days_per_week} days/week`;
        }

        // Grade level
        const gradeLevel = pkg.grade_level || 'All Levels';

        // Payment frequency
        const paymentFrequency = pkg.payment_frequency === '2-weeks' ? 'Bi-weekly' : 'Monthly';

        // Build discounts array
        const discounts = [];
        if (pkg.discount_1_month > 0) discounts.push({ period: '1 Month', discount: pkg.discount_1_month });
        if (pkg.discount_6_month > 0) discounts.push({ period: '6 Months', discount: pkg.discount_6_month });
        if (pkg.discount_12_month > 0) discounts.push({ period: 'Yearly', discount: pkg.discount_12_month });

        // Store message data for click handler
        const messageId = msg.id || Date.now();
        if (!window.sessionRequestMessages) window.sessionRequestMessages = {};
        window.sessionRequestMessages[messageId] = msg;
        console.log('[ChatModal] Stored session request message:', messageId, 'with package_details:', msg.package_details);

        return `
            <div class="session-request-card" data-message-id="${messageId}" onclick="openViewRequestModal(window.sessionRequestMessages['${messageId}'])" style="max-width: 380px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)';">
                <!-- Header - Amber/Yellow Theme -->
                <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 0.875rem 1rem; color: white;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 3px;">
                                <i class="fas fa-paper-plane" style="font-size: 0.7rem; opacity: 0.9;"></i>
                                <span style="font-size: 0.65rem; font-weight: 600; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;">Session Request</span>
                            </div>
                            <h3 style="font-size: 1rem; font-weight: 700; margin: 0; color: white; line-height: 1.2;">
                                ${this.escapeHtml(pkg.name || 'Tutoring Package')}
                            </h3>
                            <p style="font-size: 0.7rem; opacity: 0.9; margin: 4px 0 0 0; display: flex; align-items: center; gap: 4px;">
                                <i class="fas fa-calendar-alt" style="font-size: 0.6rem;"></i> ${paymentFrequency} Package
                            </p>
                        </div>
                        <!-- Status Badge -->
                        <span style="background: ${statusStyle.bg}; color: ${statusStyle.text}; font-size: 0.6rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 10px; display: flex; align-items: center; gap: 3px; white-space: nowrap;">
                            <i class="fas ${statusStyle.icon}" style="font-size: 0.55rem;"></i>
                            ${statusStyle.label}
                        </span>
                    </div>
                </div>

                <!-- Body - White Background -->
                <div style="padding: 0.875rem 1rem; background: #ffffff;">

                    <!-- Courses Section -->
                    ${courses.length > 0 ? `
                        <div style="margin-bottom: 0.75rem;">
                            <div style="display: flex; align-items: center; margin-bottom: 0.35rem;">
                                <i class="fas fa-book" style="color: #d97706; margin-right: 0.35rem; font-size: 0.7rem;"></i>
                                <span style="font-size: 0.65rem; font-weight: 600; color: #374151;">Subjects</span>
                            </div>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.3rem;">
                                ${courses.slice(0, 4).map(course => {
                                    const courseName = typeof course === 'object' ? course.name : course;
                                    return `<span style="background: #fef3c7; color: #92400e; padding: 0.15rem 0.45rem; border-radius: 10px; font-size: 0.6rem; font-weight: 500;">${this.escapeHtml(courseName)}</span>`;
                                }).join('')}
                                ${courses.length > 4 ? `<span style="background: #f3f4f6; color: #6b7280; padding: 0.15rem 0.45rem; border-radius: 10px; font-size: 0.6rem; font-weight: 500;">+${courses.length - 4} more</span>` : ''}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Session Format -->
                    ${sessionFormats.length > 0 ? `
                        <div style="margin-bottom: 0.75rem;">
                            <div style="display: flex; align-items: center; margin-bottom: 0.35rem;">
                                <i class="fas fa-video" style="color: #d97706; margin-right: 0.35rem; font-size: 0.7rem;"></i>
                                <span style="font-size: 0.65rem; font-weight: 600; color: #374151;">Format</span>
                            </div>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.3rem;">
                                ${sessionFormats.map(format =>
                                    `<span style="background: #d1fae5; color: #065f46; padding: 0.15rem 0.45rem; border-radius: 10px; font-size: 0.6rem; font-weight: 500; text-transform: capitalize;">
                                        <i class="fas fa-${format.toLowerCase() === 'online' ? 'laptop' : 'users'}" style="margin-right: 2px; font-size: 0.5rem;"></i>${this.escapeHtml(format)}
                                    </span>`
                                ).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Requested Schedule -->
                    ${requestedSchedule ? `
                        <div style="margin-bottom: 0.75rem; padding: 0.5rem; background: #fffbeb; border-radius: 6px; border-left: 3px solid #f59e0b;">
                            <div style="display: flex; align-items: center; margin-bottom: 0.2rem;">
                                <i class="fas fa-clock" style="color: #d97706; margin-right: 0.35rem; font-size: 0.65rem;"></i>
                                <span style="font-size: 0.55rem; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.3px;">Requested Schedule</span>
                            </div>
                            <p style="margin: 0; font-size: 0.7rem; color: #78350f; line-height: 1.3;">${this.escapeHtml(requestedSchedule)}</p>
                        </div>
                    ` : ''}

                    <!-- Pricing Box -->
                    ${price > 0 ? `
                        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 0.6rem; border-radius: 8px; margin-bottom: 0.75rem; position: relative; overflow: hidden;">
                            <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.15), transparent); animation: shimmer 3s infinite; pointer-events: none;"></div>
                            <div style="display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 1;">
                                <div>
                                    <p style="margin: 0; font-size: 0.5rem; color: rgba(255,255,255,0.85); text-transform: uppercase; letter-spacing: 0.5px;">Per Session</p>
                                    <p style="margin: 0; font-size: 1.25rem; font-weight: 800; color: white;">${priceText} <span style="font-size: 0.7rem; font-weight: 500;">ETB</span></p>
                                </div>
                                <i class="fas fa-coins" style="font-size: 1.25rem; color: rgba(255,255,255,0.3);"></i>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Discounts Grid -->
                    ${discounts.length > 0 ? `
                        <div style="margin-bottom: 0.75rem;">
                            <div style="display: flex; align-items: center; margin-bottom: 0.35rem;">
                                <i class="fas fa-tags" style="color: #059669; margin-right: 0.35rem; font-size: 0.7rem;"></i>
                                <span style="font-size: 0.65rem; font-weight: 600; color: #374151;">Discounts</span>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(${Math.min(discounts.length, 3)}, 1fr); gap: 0.35rem;">
                                ${discounts.map(d => `
                                    <div style="background: #ecfdf5; padding: 0.35rem; border-radius: 6px; text-align: center;">
                                        <p style="margin: 0; font-size: 0.5rem; color: #6b7280; font-weight: 500;">${d.period}</p>
                                        <p style="margin: 0; font-size: 0.8rem; font-weight: 800; color: #059669;">-${d.discount}%</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- User Message -->
                    ${userMessage ? `
                        <div style="background: #fffbeb; border-left: 2px solid #f59e0b; padding: 0.4rem 0.6rem; border-radius: 0 6px 6px 0; margin-bottom: 0.75rem;">
                            <div style="display: flex; align-items: center; margin-bottom: 0.15rem;">
                                <i class="fas fa-comment-dots" style="color: #d97706; margin-right: 0.35rem; font-size: 0.6rem;"></i>
                                <span style="font-size: 0.5rem; font-weight: 700; color: #92400e; text-transform: uppercase;">Message</span>
                            </div>
                            <p style="font-size: 0.7rem; color: #78350f; margin: 0; line-height: 1.3; font-style: italic;">"${this.escapeHtml(userMessage)}"</p>
                        </div>
                    ` : ''}

                    <!-- Rejection Reason -->
                    ${status === 'rejected' && requestStatus.rejected_reason ? `
                        <div style="background: #fef2f2; border-left: 2px solid #ef4444; padding: 0.4rem 0.6rem; border-radius: 0 6px 6px 0; margin-bottom: 0.75rem;">
                            <div style="display: flex; align-items: center; margin-bottom: 0.15rem;">
                                <i class="fas fa-exclamation-circle" style="color: #ef4444; margin-right: 0.35rem; font-size: 0.6rem;"></i>
                                <span style="font-size: 0.5rem; font-weight: 700; color: #991b1b; text-transform: uppercase;">Reason</span>
                            </div>
                            <p style="font-size: 0.7rem; color: #991b1b; margin: 0; line-height: 1.3;">${this.escapeHtml(requestStatus.rejected_reason)}</p>
                        </div>
                    ` : ''}

                    <!-- Accepted Message -->
                    ${status === 'accepted' ? `
                        <div style="background: #ecfdf5; padding: 0.5rem; border-radius: 6px; text-align: center;">
                            <i class="fas fa-check-circle" style="color: #059669; font-size: 1rem;"></i>
                            <p style="font-size: 0.7rem; color: #047857; margin: 3px 0 0 0; font-weight: 600;">Request Accepted!</p>
                        </div>
                    ` : ''}

                    <!-- Footer Info -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem; border-top: 1px solid #f3f4f6; margin-top: 0.4rem;">
                        <span style="font-size: 0.55rem; color: #9ca3af; display: flex; align-items: center; gap: 3px;">
                            <i class="fas fa-info-circle" style="font-size: 0.5rem;"></i> Tap for details
                        </span>
                        <span style="font-size: 0.55rem; color: ${statusStyle.text}; font-weight: 600; display: flex; align-items: center; gap: 2px;">
                            <i class="fas fa-${status === 'pending' ? 'hourglass-half' : status === 'accepted' ? 'check' : 'times'}" style="font-size: 0.5rem;"></i>
                            ${statusStyle.label}
                        </span>
                    </div>
                </div>
            </div>

            <style>
                @keyframes shimmer {
                    0% { transform: translateX(-100%) rotate(45deg); }
                    100% { transform: translateX(100%) rotate(45deg); }
                }
            </style>
        `;
    },

    // Send Message
    async sendMessage() {
        const input = document.getElementById('chatMessageInput');
        const messageText = input?.value.trim();

        if (!messageText && !this.state.recordedAudio) return;

        // Voice messages are coming soon
        if (this.state.recordedAudio && !messageText) {
            this.showToast('Voice messages coming soon! For now, use Voice-to-Text mode.', 'info');
            return;
        }

        if (!this.state.selectedChat) {
            this.showToast('Please select a conversation first', 'error');
            return;
        }

        const profile = this.state.currentProfile;
        const user = this.state.currentUser;
        const conv = this.state.selectedConversation;

        // If this is a connection, family member, tutor contact, or enrolled contact without a conversation, create conversation first
        let conversationId = this.state.selectedChat;
        const needsConversation = conv && (
            (conv.is_connection && String(conversationId).startsWith('connection-')) ||
            (conv.is_family && (String(conversationId).startsWith('family-parent-') || String(conversationId).startsWith('family-child-'))) ||
            (conv.is_tutor_contact && String(conversationId).startsWith('tutor-')) ||
            (conv.is_enrolled && (String(conversationId).startsWith('enrolled-student-') || String(conversationId).startsWith('enrolled-tutor-') || String(conversationId).startsWith('enrolled-parent-') || String(conversationId).startsWith('child-tutor-')))
        );

        if (needsConversation) {
            const realConv = await this.createConversationFromConnection(conv);
            if (realConv) {
                conversationId = realConv.id;
                this.state.selectedChat = conversationId;
                this.state.selectedConversation.id = conversationId;
                this.state.selectedConversation.is_connection = false;
                this.state.selectedConversation.is_family = false;
                this.state.selectedConversation.is_tutor_contact = false;
                this.state.selectedConversation.is_enrolled = false;
            } else {
                this.showToast('Could not start conversation', 'error');
                return;
            }
        }

        const messageData = {
            id: `msg-${Date.now()}`,
            text: messageText,
            content: messageText,
            message_type: this.state.recordedAudio ? 'audio' : 'text',
            sender_id: profile?.profile_id || 'me',
            sender_name: user?.full_name || user?.first_name || 'You',
            avatar: user?.profile_picture,
            time: new Date(),
            sent: true,
            is_mine: true,
            reply_to: this.state.replyingTo,
            audio: this.state.recordedAudio
        };

        // Display message immediately (optimistic UI)
        this.displayMessage(messageData);

        // Clear input
        if (input) {
            input.value = '';
            this.autoResizeTextarea(input);
        }

        // Hide typing indicator after sending
        this.state.isTyping = false;
        const selfTypingIndicator = document.getElementById('selfTypingIndicator');
        if (selfTypingIndicator) {
            selfTypingIndicator.classList.remove('active');
        }

        const audioToSend = this.state.recordedAudio;
        this.state.recordedAudio = null;
        this.state.recordedAudioBlob = null;

        // Hide voice preview if visible
        this.hideVoicePreview();

        // Clear reply
        const replyToId = this.state.replyingTo?.id;
        if (this.state.replyingTo) {
            this.cancelReply();
        }

        // Scroll to bottom
        this.scrollToBottom();

        // Update last message in conversation
        this.updateConversationLastMessage(conversationId, messageText || 'Voice message');

        // Try to send to API
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/messages?${profileParams}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        conversation_id: conversationId,
                        message_type: audioToSend ? 'audio' : 'text',
                        content: messageText,
                        media_url: audioToSend || null,
                        reply_to_id: replyToId || null
                    })
                }
            );

            if (response.ok) {
                const data = await response.json();
                console.log('Chat: Message sent successfully:', data.message_id);
                // Update the optimistic message with the real ID
                messageData.id = data.message_id;

                // Clear the empty conversation view if this was the first message
                const emptyView = document.querySelector('.new-conversation-start');
                if (emptyView) {
                    emptyView.remove();
                    // Add date divider if not present
                    const chatArea = document.getElementById('chatArea');
                    if (chatArea && !chatArea.querySelector('.date-divider')) {
                        chatArea.insertAdjacentHTML('afterbegin', '<div class="date-divider"><span>Today</span></div>');
                    }
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.log('Chat: Message API returned error:', errorData);
                this.showToast('Message may not have saved', 'warning');
            }
        } catch (error) {
            console.log('Chat: Message sent locally (API unavailable):', error.message);
            this.showToast('Message sent (offline mode)', 'info');
        }
    },

    // Simulate Response (for demo purposes)
    simulateResponse() {
        const responses = [
            'That sounds great!',
            'I understand. Let me help you with that.',
            'Sure, no problem!',
            'Thanks for letting me know.',
            'I\'ll check on that and get back to you.',
            'Perfect! Looking forward to it.'
        ];

        const conv = this.state.conversations.find(c => c.id === this.state.selectedChat);
        if (!conv) return;

        const messageData = {
            id: `msg-${Date.now()}`,
            text: responses[Math.floor(Math.random() * responses.length)],
            sender_id: 'other',
            sender_name: conv.name,
            avatar: conv.avatar,
            time: new Date(),
            sent: false
        };

        this.displayMessage(messageData);
        this.scrollToBottom();
        this.updateConversationLastMessage(this.state.selectedChat, messageData.text);
    },

    // Update Conversation Last Message
    updateConversationLastMessage(conversationId, text) {
        const conv = this.state.conversations.find(c => c.id === conversationId);
        if (conv) {
            conv.last_message = text;
            conv.last_message_time = new Date();
        }

        // Update UI
        const contactEl = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (contactEl) {
            const lastMsgEl = contactEl.querySelector('.last-message');
            const timeEl = contactEl.querySelector('.message-time');
            if (lastMsgEl) lastMsgEl.textContent = text;
            if (timeEl) timeEl.textContent = 'Now';
        }
    },

    // Open Conversation with specific user (or create new one)
    async openConversationWith(user) {
        console.log('Chat: openConversationWith called with user:', user);

        // Ensure user object has expected properties (handle both formats)
        // Prefer profile_id over user_id - profile_id is the primary identifier for chat
        const userProfileId = user.profile_id || user.profileId || user.id;
        const userId = user.user_id;  // Only use explicit user_id, don't fallback to id
        const userName = user.full_name || user.name || 'Unknown';
        const userAvatar = user.profile_picture || user.avatar || '';
        const userRole = user.profile_type || user.profileType || user.role || 'user';
        const userIsOnline = user.is_online || user.isOnline || false;

        console.log('Chat: Looking for existing contact with:', { userProfileId, userId, userName });

        // Helper function to match user by profile_id or user_id
        const matchesUser = (item) => {
            // For requests from API: profile_id, user_id, profile_type
            // For conversations from API: other_profile_id, other_user_id, other_profile_type
            // For synthetic conversations: profile_id, other_profile_id

            // Match by profile_id (most reliable) - check other_profile_id FIRST for conversations
            // because item.profile_id could be the current user's profile ID, not the partner's
            if (userProfileId) {
                // For conversations, other_profile_id is the conversation partner's profile ID
                // For requests, profile_id is the requester's profile ID
                const itemProfileId = item.other_profile_id || item.profile_id;
                const itemProfileType = item.other_profile_type || item.profile_type;

                console.log('Chat: Checking item for match - other_profile_id:', item.other_profile_id,
                           'profile_id:', item.profile_id, 'looking for:', userProfileId);

                if (itemProfileId && (String(itemProfileId) === String(userProfileId))) {
                    // If we have profile_type info, make sure it matches
                    if (userRole && itemProfileType && itemProfileType !== userRole) {
                        console.log('Chat: profile_id matched but profile_type mismatch:', userRole, '!==', itemProfileType);
                        return false;
                    }
                    console.log('Chat: Matched by profile_id:', userProfileId, '===', itemProfileId);
                    return true;
                }
            }
            // Match by user_id (only if we have a valid user_id)
            if (userId) {
                const itemUserId = item.other_user_id || item.user_id;
                if (itemUserId && (String(itemUserId) === String(userId))) {
                    console.log('Chat: Matched by user_id:', userId, '===', itemUserId);
                    return true;
                }
            }
            return false;
        };

        // FIRST: Check if this user exists in connection requests (sent or received)
        // If so, just select that request element in the sidebar - don't create a new conversation
        const { sent, received } = this.state.connectionRequests;

        console.log('Chat: Checking sent requests:', sent.length, 'Received requests:', received.length);
        console.log('Chat: Looking for profile_id:', userProfileId, 'user_id:', userId);

        const sentRequest = sent.find(req => {
            console.log('Chat: Checking sent request - profile_id:', req.profile_id, 'user_id:', req.user_id);
            return matchesUser(req);
        });
        if (sentRequest) {
            console.log('Chat: Found in sent requests, selecting request element:', sentRequest);
            this.selectRequest(sentRequest, 'sent');
            return;
        }

        const receivedRequest = received.find(req => {
            console.log('Chat: Checking received request - profile_id:', req.profile_id, 'user_id:', req.user_id);
            return matchesUser(req);
        });
        if (receivedRequest) {
            console.log('Chat: Found in received requests, selecting request element:', receivedRequest);
            this.selectRequest(receivedRequest, 'received');
            return;
        }

        // SECOND: Check if conversation exists in conversations list
        // Log all conversations for debugging
        console.log('Chat: Searching through', this.state.conversations.length, 'conversations for profile_id:', userProfileId);
        this.state.conversations.forEach((c, i) => {
            console.log(`Chat: Conv[${i}] id=${c.id} other_profile_id=${c.other_profile_id} other_profile_type=${c.other_profile_type} is_tutor_contact=${c.is_tutor_contact}`);
        });

        // Prefer real conversations (numeric ID) over synthetic ones (tutor-*, connection-*, etc.)
        let conv = this.state.conversations.find(c => {
            const matches = matchesUser(c);
            if (!matches) return false;
            // Check if this is a real conversation (numeric ID or doesn't have synthetic flags)
            const isRealConversation = !c.is_tutor_contact && !c.is_connection && !c.is_family && !c.is_enrolled;
            const hasNumericId = typeof c.id === 'number' || (typeof c.id === 'string' && /^\d+$/.test(c.id));
            console.log('Chat: Found matching conv:', c.id, 'isReal:', isRealConversation, 'hasNumericId:', hasNumericId);
            return isRealConversation || hasNumericId;
        });

        // If no real conversation found, check for synthetic ones
        if (!conv) {
            console.log('Chat: No real conversation found, checking synthetic ones...');
            conv = this.state.conversations.find(c => matchesUser(c));
        }

        if (conv) {
            console.log('Chat: Found existing conversation:', conv.id, 'isReal:', !conv.is_tutor_contact, conv);
            // Move this conversation to the top of the list
            this.moveConversationToTop(conv);
            this.selectConversation(conv);
            return;
        }

        console.log('Chat: No existing contact found, creating temporary conversation with welcome state');

        // Create a temporary/synthetic conversation for new contacts
        // The real conversation will be created when the user sends a message
        conv = {
            id: `tutor-${userProfileId}`,  // Synthetic ID - will be replaced when real conversation is created
            other_profile_id: userProfileId,
            profile_id: userProfileId,
            profile_type: userRole,
            other_profile_type: userRole,
            user_id: userId || null,
            other_user_id: userId || null,
            display_name: userName,
            name: userName,
            avatar: userAvatar,
            type: 'direct',
            last_message: null,
            last_message_at: null,
            unread_count: 0,
            is_online: userIsOnline,
            is_tutor_contact: true,  // Flag to indicate this is a new tutor contact (not yet a real conversation)
            is_new_contact: true     // Flag to show welcome state
        };
        console.log('Chat: Created temporary conversation for new contact:', conv.id);

        // Add new conversation to beginning of list
        this.state.conversations = [conv, ...this.state.conversations];

        // Add the new contact element to the sidebar
        this.addNewContactElement(conv);

        // Select the conversation - this will show the welcome state because is_tutor_contact is true
        this.selectConversation(conv);
    },

    // Add a single new contact element to the list (without re-rendering everything)
    addNewContactElement(conv) {
        const listEl = document.getElementById('chatContactsList');
        if (!listEl) return;

        // Find where to insert (after request sections, before other conversations)
        const conversationsHeader = listEl.querySelector('.requests-section + div:not(.contact-item):not(.requests-section)');
        const firstConversation = listEl.querySelector('.contact-item[data-conversation-id]');

        const contactEl = this.createContactElement(conv);

        if (conversationsHeader) {
            // Insert after the "Conversations" header
            conversationsHeader.after(contactEl);
        } else if (firstConversation) {
            // Insert before the first existing conversation
            firstConversation.before(contactEl);
        } else {
            // Just append to the list
            listEl.appendChild(contactEl);
        }
    },

    // Move an existing conversation to the top of the list (both state and DOM)
    moveConversationToTop(conv) {
        // Move in state array
        const index = this.state.conversations.findIndex(c => c.id === conv.id);
        if (index > 0) {
            // Remove from current position and add to beginning
            this.state.conversations.splice(index, 1);
            this.state.conversations.unshift(conv);
            console.log('Chat: Moved conversation to top in state:', conv.id);
        }

        // Move in DOM
        const listEl = document.getElementById('chatContactsList');
        if (!listEl) return;

        const existingEl = listEl.querySelector(`[data-conversation-id="${conv.id}"]`);
        if (!existingEl) return;

        // Find where to insert (after request sections, before other conversations)
        const conversationsHeader = listEl.querySelector('.requests-section + div:not(.contact-item):not(.requests-section)');
        const firstConversation = listEl.querySelector('.contact-item[data-conversation-id]');

        // Only move if not already first
        if (existingEl !== firstConversation) {
            if (conversationsHeader) {
                // Insert after the "Conversations" header
                conversationsHeader.after(existingEl);
            } else if (firstConversation && existingEl !== firstConversation) {
                // Insert before the first existing conversation
                firstConversation.before(existingEl);
            }
            console.log('Chat: Moved conversation to top in DOM:', conv.id);
        }
    },

    // Toggle Sidebar (Mobile)
    toggleSidebar() {
        const sidebar = document.getElementById('chatSidebar');
        if (sidebar) {
            sidebar.classList.toggle('active');
        }
    },

    // Toggle Info Panel
    toggleInfo() {
        const infoPanel = document.getElementById('chatInfoPanel');
        const translatePanel = document.getElementById('chatTranslatePanel');
        const infoBtn = document.getElementById('chatInfoBtn');
        const translateBtn = document.getElementById('chatTranslateBtn');

        if (infoPanel) {
            const isOpening = !infoPanel.classList.contains('active');

            // If opening info panel, close translate panel first
            if (isOpening && translatePanel && translatePanel.classList.contains('active')) {
                translatePanel.classList.remove('active');
                if (translateBtn) translateBtn.classList.remove('active');
            }

            infoPanel.classList.toggle('active');
            if (infoBtn) infoBtn.classList.toggle('active', infoPanel.classList.contains('active'));
        }
    },

    // Toggle Search
    toggleSearch() {
        const container = document.getElementById('chatSearchContainer');
        if (container) {
            const isOpening = !container.classList.contains('active');
            container.classList.toggle('active');
            if (isOpening) {
                document.getElementById('chatSearchBar')?.focus();
            } else {
                // Clear search when closing
                this.clearMessageSearch();
            }
        }
    },

    // Search Messages in current conversation
    searchMessages(query) {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        // Clear previous highlights but keep the input value (user is typing)
        this.clearMessageSearch(false);

        if (!query || query.trim().length < 2) return;

        const lowerQuery = query.toLowerCase().trim();
        const messages = chatArea.querySelectorAll('.message-bubble');
        let matchCount = 0;
        const matches = [];

        messages.forEach((bubble, index) => {
            const text = bubble.textContent.toLowerCase();
            if (text.includes(lowerQuery)) {
                matchCount++;
                bubble.classList.add('search-highlight');
                matches.push({ element: bubble, index });

                // Highlight the matching text
                this.highlightTextInElement(bubble, query);
            }
        });

        // Store matches for navigation
        this.state.searchMatches = matches;
        this.state.currentSearchIndex = 0;

        // Show match count
        const searchContainer = document.getElementById('chatSearchContainer');
        let countEl = searchContainer?.querySelector('.search-count');
        if (!countEl && searchContainer) {
            countEl = document.createElement('span');
            countEl.className = 'search-count';
            countEl.style.cssText = 'font-size: 0.8rem; color: var(--text-muted); margin-right: 8px;';
            searchContainer.insertBefore(countEl, searchContainer.querySelector('.search-close'));
        }
        if (countEl) {
            countEl.textContent = matchCount > 0 ? `${matchCount} found` : 'No results';
        }

        // Show/hide navigation buttons based on results
        const navButtons = document.getElementById('searchNavButtons');
        if (navButtons) {
            navButtons.style.display = matchCount > 0 ? 'flex' : 'none';
        }

        // Scroll to first match
        if (matches.length > 0) {
            matches[0].element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            matches[0].element.classList.add('search-current');
        }
    },

    // Highlight text within an element
    highlightTextInElement(element, query) {
        const textNodes = [];
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
        }

        const lowerQuery = query.toLowerCase();
        textNodes.forEach(node => {
            const text = node.textContent;
            const lowerText = text.toLowerCase();
            const index = lowerText.indexOf(lowerQuery);
            if (index >= 0) {
                const span = document.createElement('span');
                span.className = 'search-match-text';
                span.style.cssText = 'background: rgba(245, 158, 11, 0.4); border-radius: 2px; padding: 0 2px;';
                span.textContent = text.substring(index, index + query.length);

                const before = document.createTextNode(text.substring(0, index));
                const after = document.createTextNode(text.substring(index + query.length));

                const parent = node.parentNode;
                parent.insertBefore(before, node);
                parent.insertBefore(span, node);
                parent.insertBefore(after, node);
                parent.removeChild(node);
            }
        });
    },

    // Navigate between search results
    navigateSearchResult(direction) {
        if (!this.state.searchMatches || this.state.searchMatches.length === 0) return;

        // Remove current highlight
        const current = this.state.searchMatches[this.state.currentSearchIndex];
        if (current) current.element.classList.remove('search-current');

        // Move to next/previous
        this.state.currentSearchIndex += direction;
        if (this.state.currentSearchIndex >= this.state.searchMatches.length) {
            this.state.currentSearchIndex = 0;
        } else if (this.state.currentSearchIndex < 0) {
            this.state.currentSearchIndex = this.state.searchMatches.length - 1;
        }

        // Highlight new current
        const newCurrent = this.state.searchMatches[this.state.currentSearchIndex];
        if (newCurrent) {
            newCurrent.element.classList.add('search-current');
            newCurrent.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Update count display
        const countEl = document.querySelector('#chatSearchContainer .search-count');
        if (countEl) {
            countEl.textContent = `${this.state.currentSearchIndex + 1}/${this.state.searchMatches.length}`;
        }
    },

    // Clear message search highlights
    // clearInput: true = clear the input field (when closing search), false = keep input (when re-searching)
    clearMessageSearch(clearInput = true) {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        // Remove highlight classes
        chatArea.querySelectorAll('.search-highlight').forEach(el => {
            el.classList.remove('search-highlight', 'search-current');
        });

        // Remove highlighted text spans and restore original text
        chatArea.querySelectorAll('.search-match-text').forEach(span => {
            const text = document.createTextNode(span.textContent);
            span.parentNode.replaceChild(text, span);
        });

        // Normalize text nodes
        chatArea.querySelectorAll('.message-bubble').forEach(bubble => {
            bubble.normalize();
        });

        // Clear search input only if requested (e.g., when closing search, not when re-searching)
        if (clearInput) {
            const searchInput = document.getElementById('chatSearchBar');
            if (searchInput) searchInput.value = '';
        }

        // Remove count element
        const countEl = document.querySelector('#chatSearchContainer .search-count');
        if (countEl) countEl.remove();

        // Hide navigation buttons
        const navButtons = document.getElementById('searchNavButtons');
        if (navButtons) navButtons.style.display = 'none';

        // Clear state
        this.state.searchMatches = [];
        this.state.currentSearchIndex = 0;
    },

    // Handle Tab Change
    handleTabChange(tab, event) {
        // Update active tab
        document.querySelectorAll('#chatModal .sidebar-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        if (event?.target) event.target.classList.add('active');

        // Filter contacts
        this.filterContacts(tab);
    },

    // Filter Contacts
    filterContacts(filter) {
        const contacts = document.querySelectorAll('#chatModal .contact-item');

        contacts.forEach(contact => {
            const category = contact.dataset.category;
            const unreadEl = contact.querySelector('.unread-count');
            // Check if unread element exists AND is visible (has content)
            const hasUnread = unreadEl && unreadEl.style.display !== 'none' && unreadEl.textContent.trim() !== '';

            switch (filter) {
                case 'all':
                    contact.style.display = 'flex';
                    break;
                case 'personal':
                    contact.style.display = category === 'personal' ? 'flex' : 'none';
                    break;
                case 'groups':
                    contact.style.display = category === 'groups' ? 'flex' : 'none';
                    break;
                case 'unread':
                    contact.style.display = hasUnread ? 'flex' : 'none';
                    break;
            }
        });

        // Show empty state if no contacts match the filter
        const visibleContacts = document.querySelectorAll('#chatModal .contact-item[style*="display: flex"]');
        const contactsList = document.getElementById('chatContactsList');

        // Remove existing empty state
        const existingEmpty = contactsList?.querySelector('.filter-empty-state');
        if (existingEmpty) existingEmpty.remove();

        if (visibleContacts.length === 0 && contactsList) {
            const emptyState = document.createElement('div');
            emptyState.className = 'filter-empty-state';
            emptyState.style.cssText = 'text-align: center; padding: 40px 20px; color: var(--text-muted);';
            emptyState.innerHTML = `
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.5;">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p style="margin: 0;">No ${filter === 'unread' ? 'unread messages' : filter + ' chats'} found</p>
            `;
            contactsList.appendChild(emptyState);
        }
    },

    // Search Contacts
    searchContacts(searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();

        document.querySelectorAll('#chatModal .contact-item').forEach(item => {
            const name = item.querySelector('h4')?.textContent.toLowerCase() || '';
            const lastMessage = item.querySelector('.last-message')?.textContent.toLowerCase() || '';

            if (name.includes(lowerSearch) || lastMessage.includes(lowerSearch)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    },

    // =============================================
    // TEXT-TO-SPEECH (Read Messages Aloud)
    // =============================================

    // Toggle Reading Messages
    toggleReadMessages() {
        if (this.state.isReadingMessages) {
            this.stopReadingMessages();
        } else {
            this.startReadingMessages();
        }
    },

    // Start Reading Messages (reads only unread/received messages)
    startReadingMessages() {
        if (!('speechSynthesis' in window)) {
            this.showToast('Text-to-speech not supported in this browser', 'error');
            return;
        }

        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        // Get all messages
        const allMessages = chatArea.querySelectorAll('.message');
        if (allMessages.length === 0) {
            this.showToast('No messages to read', 'info');
            return;
        }

        // Collect only received (unread) messages - messages NOT sent by us
        const textsToRead = [];
        allMessages.forEach(messageEl => {
            const isSent = messageEl.classList.contains('sent');
            const textEl = messageEl.querySelector('.message-text');
            const text = textEl?.textContent.trim();

            // Only read received messages (not sent by us)
            if (!isSent && text) {
                textsToRead.push(text);
            }
        });

        if (textsToRead.length === 0) {
            this.showToast('No unread messages to read', 'info');
            return;
        }

        this.state.isReadingMessages = true;

        // Update button state
        const btn = document.getElementById('chatReadMessagesBtn');
        if (btn) btn.classList.add('active');

        // Create speech synthesis - read messages naturally without prefixes
        const fullText = textsToRead.join('. ');
        const utterance = new SpeechSynthesisUtterance(fullText);

        // Configure voice
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.volume = 1;

        // Try to find a good voice
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Female')) ||
                           voices.find(v => v.lang.startsWith('en')) ||
                           voices[0];
        if (englishVoice) {
            utterance.voice = englishVoice;
        }

        // Handle events
        utterance.onend = () => {
            this.stopReadingMessages();
        };

        utterance.onerror = (e) => {
            console.error('Speech error:', e);
            this.stopReadingMessages();
        };

        this.state.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);

        this.showToast(`Reading ${textsToRead.length} message${textsToRead.length > 1 ? 's' : ''}...`, 'info');
    },

    // Stop Reading Messages
    stopReadingMessages() {
        window.speechSynthesis?.cancel();
        this.state.isReadingMessages = false;
        this.state.currentUtterance = null;

        const btn = document.getElementById('chatReadMessagesBtn');
        if (btn) btn.classList.remove('active');
    },

    // Show Typing Indicator
    showTypingIndicator(user) {
        const indicator = document.getElementById('chatTypingIndicator');
        const avatarImg = document.getElementById('typingUserAvatar');

        if (indicator) {
            if (avatarImg && user?.avatar) {
                avatarImg.src = user.avatar;
                avatarImg.alt = user.name || 'User';
            }
            indicator.classList.add('active');

            // Scroll to bottom to show typing indicator
            this.scrollToBottom();
        }
    },

    // Hide Typing Indicator
    hideTypingIndicator() {
        const indicator = document.getElementById('chatTypingIndicator');
        if (indicator) {
            indicator.classList.remove('active');
        }
    },

    // Voice Recording
    async startVoiceRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.state.mediaRecorder = new MediaRecorder(stream);

            const audioChunks = [];

            this.state.mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            this.state.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                this.state.recordedAudio = URL.createObjectURL(audioBlob);
                this.state.recordedAudioBlob = audioBlob;
                stream.getTracks().forEach(track => track.stop());
                // Show voice preview instead of auto-sending
                this.showVoicePreview();
            };

            this.state.mediaRecorder.start();
            this.state.recordingStartTime = Date.now();

            // Hide normal input, show recording UI in input area
            const inputWrapper = document.getElementById('chatInputWrapper');
            const recordingWrapper = document.getElementById('chatVoiceInputRecording');
            const recordBtn = document.getElementById('chatVoiceRecordBtn');

            if (inputWrapper) inputWrapper.style.display = 'none';
            if (recordingWrapper) recordingWrapper.style.display = 'flex';
            if (recordBtn) recordBtn.classList.add('active');

            // Start timer
            this.updateRecordingTimer();

            this.showToast('Recording voice message...', 'info');
        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.showToast('Could not access microphone', 'error');
        }
    },

    stopVoiceRecording() {
        if (this.state.mediaRecorder && this.state.mediaRecorder.state === 'recording') {
            this.state.mediaRecorder.stop();

            // Hide recording UI (preview will be shown by onstop handler)
            const recordingWrapper = document.getElementById('chatVoiceInputRecording');
            const recordBtn = document.getElementById('chatVoiceRecordBtn');

            if (recordingWrapper) recordingWrapper.style.display = 'none';
            if (recordBtn) recordBtn.classList.remove('active');
        }
    },

    cancelRecording() {
        if (this.state.mediaRecorder) {
            this.state.mediaRecorder.stop();
            this.state.recordedAudio = null;
        }

        // Hide recording UI, show normal input
        const inputWrapper = document.getElementById('chatInputWrapper');
        const recordingWrapper = document.getElementById('chatVoiceInputRecording');
        const recordBtn = document.getElementById('chatVoiceRecordBtn');

        if (inputWrapper) inputWrapper.style.display = 'block';
        if (recordingWrapper) recordingWrapper.style.display = 'none';
        if (recordBtn) recordBtn.classList.remove('active');

        this.showToast('Recording cancelled', 'info');
    },

    toggleVoiceRecording() {
        const btn = document.getElementById('chatVoiceRecordBtn');
        if (btn?.classList.contains('active')) {
            this.stopVoiceRecording();
        } else {
            this.startVoiceRecording();
        }
    },

    updateRecordingTimer() {
        const updateTimer = () => {
            if (this.state.mediaRecorder && this.state.mediaRecorder.state === 'recording') {
                const elapsed = Math.floor((Date.now() - this.state.recordingStartTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;

                const timerEl = document.getElementById('chatRecordingTime');
                if (timerEl) {
                    timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }

                requestAnimationFrame(updateTimer);
            }
        };
        updateTimer();
    },

    // Voice Preview Functions
    showVoicePreview() {
        const inputWrapper = document.getElementById('chatInputWrapper');
        const previewWrapper = document.getElementById('chatVoiceInputPreview');
        const voicePreviewAudio = document.getElementById('voicePreviewAudio');
        const durationEl = document.getElementById('voicePreviewDuration');

        if (previewWrapper && this.state.recordedAudio) {
            // Hide input, show preview in input area
            if (inputWrapper) inputWrapper.style.display = 'none';
            previewWrapper.style.display = 'flex';

            // Set up audio element
            if (voicePreviewAudio) {
                voicePreviewAudio.src = this.state.recordedAudio;
                voicePreviewAudio.onloadedmetadata = () => {
                    const duration = voicePreviewAudio.duration;
                    const minutes = Math.floor(duration / 60);
                    const seconds = Math.floor(duration % 60);
                    if (durationEl) {
                        durationEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    }
                };
                voicePreviewAudio.onended = () => {
                    this.resetVoicePreviewPlayButton();
                };
            }

            this.showToast('Voice recorded! Click play to preview or send to deliver.', 'success');
        }
    },

    hideVoicePreview() {
        const inputWrapper = document.getElementById('chatInputWrapper');
        const previewWrapper = document.getElementById('chatVoiceInputPreview');
        const voicePreviewAudio = document.getElementById('voicePreviewAudio');

        // Hide preview, show normal input
        if (inputWrapper) inputWrapper.style.display = 'block';
        if (previewWrapper) previewWrapper.style.display = 'none';

        if (voicePreviewAudio) {
            voicePreviewAudio.pause();
            voicePreviewAudio.src = '';
        }
        this.resetVoicePreviewPlayButton();
    },

    toggleVoicePreviewPlay() {
        const voicePreviewAudio = document.getElementById('voicePreviewAudio');
        const playBtn = document.getElementById('voicePreviewPlayBtn');

        if (!voicePreviewAudio) return;

        if (voicePreviewAudio.paused) {
            voicePreviewAudio.play();
            if (playBtn) {
                playBtn.querySelector('.play-icon').style.display = 'none';
                playBtn.querySelector('.pause-icon').style.display = 'block';
            }
        } else {
            voicePreviewAudio.pause();
            this.resetVoicePreviewPlayButton();
        }
    },

    resetVoicePreviewPlayButton() {
        const playBtn = document.getElementById('voicePreviewPlayBtn');
        if (playBtn) {
            const playIcon = playBtn.querySelector('.play-icon');
            const pauseIcon = playBtn.querySelector('.pause-icon');
            if (playIcon) playIcon.style.display = 'block';
            if (pauseIcon) pauseIcon.style.display = 'none';
        }
    },

    cancelVoicePreview() {
        this.state.recordedAudio = null;
        this.state.recordedAudioBlob = null;
        this.hideVoicePreview();
        this.showToast('Voice message discarded', 'info');
    },

    // Voice/Video Calls
    async startVoiceCall() {
        if (!this.state.selectedChat) {
            this.showToast('Please select a conversation first', 'error');
            return;
        }

        const modal = document.getElementById('chatCallModal');
        if (modal) {
            modal.classList.add('active');
            document.getElementById('chatVoiceCallAnimation').style.display = 'flex';
            document.getElementById('chatLocalVideo').style.display = 'none';
            document.getElementById('chatRemoteVideo').style.display = 'none';
            document.getElementById('chatCallStatus').textContent = 'Connecting...';

            // Log call to API
            try {
                const token = localStorage.getItem('token') || localStorage.getItem('access_token');
                const profileParams = this.getProfileParams();

                const response = await fetch(
                    `${this.API_BASE_URL}/api/chat/calls?${profileParams}`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            conversation_id: this.state.selectedChat,
                            call_type: 'voice'
                        })
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    this.state.currentCallId = data.call_id;
                    console.log('Chat: Call logged:', data.call_id);
                }
            } catch (error) {
                console.log('Chat: Call logging unavailable:', error.message);
            }

            this.startCallTimer();

            setTimeout(() => {
                document.getElementById('chatCallStatus').textContent = 'Connected';
                this.showToast('Voice call connected', 'success');
            }, 1500);
        }
    },

    async startVideoCall() {
        if (!this.state.selectedChat) {
            this.showToast('Please select a conversation first', 'error');
            return;
        }

        const modal = document.getElementById('chatCallModal');
        if (modal) {
            modal.classList.add('active');
            document.getElementById('chatCallStatus').textContent = 'Connecting...';

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                this.state.currentStream = stream;

                const localVideo = document.getElementById('chatLocalVideo');
                if (localVideo) {
                    localVideo.srcObject = stream;
                    localVideo.style.display = 'block';
                }

                document.getElementById('chatVoiceCallAnimation').style.display = 'none';
                document.getElementById('chatRemoteVideo').style.display = 'block';

                // Log call to API
                try {
                    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
                    const profileParams = this.getProfileParams();

                    const response = await fetch(
                        `${this.API_BASE_URL}/api/chat/calls?${profileParams}`,
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                conversation_id: this.state.selectedChat,
                                call_type: 'video'
                            })
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        this.state.currentCallId = data.call_id;
                        console.log('Chat: Video call logged:', data.call_id);
                    }
                } catch (error) {
                    console.log('Chat: Call logging unavailable:', error.message);
                }

                this.startCallTimer();

                setTimeout(() => {
                    document.getElementById('chatCallStatus').textContent = 'Connected';
                    this.showToast('Video call connected', 'success');
                }, 1500);
            } catch (error) {
                console.error('Error accessing camera:', error);
                this.showToast('Could not access camera', 'error');
                this.startVoiceCall();
            }
        }
    },

    startCallTimer() {
        this.state.callDuration = 0;
        this.state.callTimer = setInterval(() => {
            this.state.callDuration++;
            const minutes = Math.floor(this.state.callDuration / 60);
            const seconds = this.state.callDuration % 60;

            const timerEl = document.getElementById('chatCallTimer');
            if (timerEl) {
                timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    },

    toggleCallVideo() {
        const localVideo = document.getElementById('chatLocalVideo');
        const voiceAnimation = document.getElementById('chatVoiceCallAnimation');

        if (localVideo?.style.display === 'none') {
            this.startVideoCall();
        } else {
            if (localVideo) localVideo.style.display = 'none';
            if (voiceAnimation) voiceAnimation.style.display = 'flex';
            this.showToast('Switched to voice call', 'info');
        }
    },

    toggleMute() {
        const btn = document.getElementById('chatMuteBtn');
        if (btn) {
            btn.classList.toggle('active');
            const isMuted = btn.classList.contains('active');

            if (this.state.currentStream) {
                this.state.currentStream.getAudioTracks().forEach(track => {
                    track.enabled = !isMuted;
                });
            }

            this.showToast(isMuted ? 'Muted' : 'Unmuted', 'info');
        }
    },

    async endCall() {
        const modal = document.getElementById('chatCallModal');
        if (modal) {
            modal.classList.remove('active');
        }

        // Update call status in API
        if (this.state.currentCallId) {
            try {
                const token = localStorage.getItem('token') || localStorage.getItem('access_token');
                const profileParams = this.getProfileParams();

                await fetch(
                    `${this.API_BASE_URL}/api/chat/calls/${this.state.currentCallId}?${profileParams}`,
                    {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            status: 'ended',
                            duration_seconds: this.state.callDuration
                        })
                    }
                );
                console.log('Chat: Call ended, duration:', this.state.callDuration, 'seconds');
            } catch (error) {
                console.log('Chat: Call end update unavailable:', error.message);
            }
            this.state.currentCallId = null;
        }

        if (this.state.callTimer) {
            clearInterval(this.state.callTimer);
            this.state.callTimer = null;
        }

        if (this.state.currentStream) {
            this.state.currentStream.getTracks().forEach(track => track.stop());
            this.state.currentStream = null;
        }

        document.getElementById('chatCallTimer').textContent = '00:00';
        const localVideo = document.getElementById('chatLocalVideo');
        if (localVideo) localVideo.srcObject = null;

        this.showToast('Call ended', 'info');
    },

    // Context Menu
    showContextMenu(event) {
        const menu = document.getElementById('chatContextMenu');
        const messageEl = event.target.closest('.message');

        if (menu && messageEl) {
            menu.style.left = event.clientX + 'px';
            menu.style.top = event.clientY + 'px';
            menu.classList.add('active');

            this.state.contextMenuTarget = messageEl;

            // Show/hide edit button based on if it's own message
            const editBtn = document.getElementById('chatEditMsgBtn');
            const deleteBtn = document.getElementById('chatDeleteMsgBtn');
            const isSent = messageEl.classList.contains('sent');

            if (editBtn) editBtn.style.display = isSent ? 'flex' : 'none';
            if (deleteBtn) deleteBtn.style.display = isSent ? 'flex' : 'none';
        }
    },

    hideContextMenu() {
        const menu = document.getElementById('chatContextMenu');
        if (menu) {
            menu.classList.remove('active');
        }
    },

    // Message Actions
    replyMessage() {
        if (!this.state.contextMenuTarget) return;

        const messageText = this.state.contextMenuTarget.querySelector('.message-text');
        const isSent = this.state.contextMenuTarget.classList.contains('sent');
        const senderName = isSent ? 'You' : document.getElementById('chatUserName')?.textContent;

        if (messageText) {
            const replyPreview = document.getElementById('chatReplyPreview');
            if (replyPreview) {
                replyPreview.classList.add('active');
                replyPreview.querySelector('.reply-text').textContent = messageText.textContent;

                this.state.replyingTo = {
                    sender: senderName,
                    text: messageText.textContent
                };
            }
        }

        this.hideContextMenu();
        document.getElementById('chatMessageInput')?.focus();
    },

    cancelReply() {
        const replyPreview = document.getElementById('chatReplyPreview');
        if (replyPreview) {
            replyPreview.classList.remove('active');
        }
        this.state.replyingTo = null;
    },

    copyMessage() {
        if (!this.state.contextMenuTarget) return;

        const messageText = this.state.contextMenuTarget.querySelector('.message-text');
        if (messageText) {
            navigator.clipboard.writeText(messageText.textContent);
            this.showToast('Message copied', 'success');
        }

        this.hideContextMenu();
    },

    forwardMessage() {
        this.showToast('Forward feature coming soon', 'info');
        this.hideContextMenu();
    },

    async editMessage() {
        if (!this.state.contextMenuTarget) return;

        const messageId = this.state.contextMenuTarget.dataset.messageId;
        const messageText = this.state.contextMenuTarget.querySelector('.message-text');

        if (messageText) {
            const newText = prompt('Edit message:', messageText.textContent);
            if (newText !== null && newText.trim()) {
                // Try to update via API
                try {
                    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
                    const profileParams = this.getProfileParams();

                    const response = await fetch(
                        `${this.API_BASE_URL}/api/chat/messages/${messageId}?${profileParams}`,
                        {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                content: newText
                            })
                        }
                    );

                    if (response.ok) {
                        console.log('Chat: Message edited via API');
                    }
                } catch (error) {
                    console.log('Chat: Message edited locally:', error.message);
                }

                // Update UI
                messageText.textContent = newText;

                // Add edited indicator
                const timeEl = this.state.contextMenuTarget.querySelector('.message-time-inline');
                if (timeEl && !timeEl.textContent.includes('(edited)')) {
                    timeEl.textContent += ' (edited)';
                }

                this.showToast('Message edited', 'success');
            }
        }

        this.hideContextMenu();
    },

    async deleteMessage() {
        if (!this.state.contextMenuTarget) return;

        if (confirm('Delete this message?')) {
            const messageId = this.state.contextMenuTarget.dataset.messageId;

            // Try to delete via API
            try {
                const token = localStorage.getItem('token') || localStorage.getItem('access_token');
                const profileParams = this.getProfileParams();

                const response = await fetch(
                    `${this.API_BASE_URL}/api/chat/messages/${messageId}?${profileParams}`,
                    {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );

                if (response.ok) {
                    console.log('Chat: Message deleted via API');
                }
            } catch (error) {
                console.log('Chat: Message deleted locally:', error.message);
            }

            // Update UI
            this.state.contextMenuTarget.remove();
            this.showToast('Message deleted', 'info');
        }

        this.hideContextMenu();
    },

    async reactToMessage(reaction) {
        if (!this.state.contextMenuTarget) return;

        const messageId = this.state.contextMenuTarget.dataset.messageId;

        const reactionEmojis = {
            'heart': '&#10084;',
            'thumbsup': '&#128077;',
            'laugh': '&#128514;',
            'wow': '&#128558;',
            'sad': '&#128546;'
        };

        // Try to save reaction via API
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/messages/${messageId}/reactions?${profileParams}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        reaction: reaction
                    })
                }
            );

            if (response.ok) {
                console.log('Chat: Reaction saved via API');
            }
        } catch (error) {
            console.log('Chat: Reaction saved locally:', error.message);
        }

        // Update UI
        let reactionsContainer = this.state.contextMenuTarget.querySelector('.message-reactions');
        if (!reactionsContainer) {
            reactionsContainer = document.createElement('div');
            reactionsContainer.className = 'message-reactions';
            reactionsContainer.style.cssText = 'display: flex; gap: 4px; margin-top: 4px;';
            this.state.contextMenuTarget.querySelector('.message-content').appendChild(reactionsContainer);
        }

        const reactionEl = document.createElement('span');
        reactionEl.style.cssText = 'background: rgba(245, 158, 11, 0.1); padding: 2px 6px; border-radius: 12px; font-size: 0.85rem;';
        reactionEl.innerHTML = reactionEmojis[reaction];
        reactionsContainer.appendChild(reactionEl);

        this.hideContextMenu();
        this.showToast('Reaction added', 'success');
    },

    // Block/Delete Chat
    async blockContact() {
        if (!this.state.selectedChat || !this.state.selectedConversation) return;

        // Check if already blocked - if so, unblock instead
        if (this.isContactBlocked()) {
            return this.unblockContact();
        }

        if (confirm('Are you sure you want to block this contact? You will no longer receive messages from them.')) {
            const conv = this.state.selectedConversation;

            // Try to block via API
            try {
                const token = localStorage.getItem('token') || localStorage.getItem('access_token');
                const profileParams = this.getProfileParams();

                const response = await fetch(
                    `${this.API_BASE_URL}/api/chat/block?${profileParams}`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            blocked_profile_id: conv.other_profile_id,
                            blocked_profile_type: conv.other_profile_type || 'student',
                            blocked_user_id: conv.other_user_id
                        })
                    }
                );

                if (response.ok) {
                    console.log('Chat: Contact blocked via API');
                    // Update local state
                    this.state.blockedContacts.push({
                        id: this.state.selectedChat,
                        profile_id: conv.other_profile_id,
                        profile_type: conv.other_profile_type,
                        user_id: conv.other_user_id
                    });
                    this.showToast('Contact blocked successfully', 'success');

                    // Show blocked UI
                    this.showBlockedState(true);

                    // Close info panel
                    const infoPanel = document.getElementById('chatInfoPanel');
                    if (infoPanel && infoPanel.classList.contains('active')) {
                        this.toggleInfo();
                    }
                } else {
                    const errorData = await response.json();
                    this.showToast(errorData.detail || 'Failed to block contact', 'error');
                }
            } catch (error) {
                console.log('Chat: Block error:', error.message);
                // Fallback: Update local state only
                this.state.blockedContacts.push({
                    id: this.state.selectedChat,
                    profile_id: conv.other_profile_id,
                    profile_type: conv.other_profile_type,
                    user_id: conv.other_user_id
                });
                this.showBlockedState(true);
                this.showToast('Contact blocked locally', 'info');
                this.toggleInfo();
            }
        }
    },

    async unblockContact() {
        if (!this.state.selectedChat || !this.state.selectedConversation) return;

        const conv = this.state.selectedConversation;

        // Try to unblock via API
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/block/${conv.other_profile_id}/${conv.other_profile_type || 'student'}?${profileParams}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                console.log('Chat: Contact unblocked via API');
                // Remove from local blocked list
                this.state.blockedContacts = this.state.blockedContacts.filter(
                    b => !(b.profile_id === conv.other_profile_id && b.profile_type === conv.other_profile_type)
                );
                this.showToast('Contact unblocked successfully', 'success');

                // Hide blocked UI
                this.showBlockedState(false);

                // Reload messages
                this.loadMessages(this.state.selectedChat);
            } else {
                const errorData = await response.json();
                this.showToast(errorData.detail || 'Failed to unblock contact', 'error');
            }
        } catch (error) {
            console.log('Chat: Unblock error:', error.message);
            // Fallback: Update local state only
            this.state.blockedContacts = this.state.blockedContacts.filter(
                b => !(b.profile_id === conv.other_profile_id && b.profile_type === conv.other_profile_type)
            );
            this.showBlockedState(false);
            this.showToast('Contact unblocked locally', 'info');
        }
    },

    isContactBlocked() {
        if (!this.state.selectedConversation) return false;
        const conv = this.state.selectedConversation;
        return this.state.blockedContacts.some(
            b => b.profile_id === conv.other_profile_id && b.profile_type === conv.other_profile_type
        );
    },

    showBlockedState(isBlocked) {
        const overlay = document.getElementById('chatBlockedOverlay');
        const blockBtn = document.getElementById('chatBlockBtn');
        const inputArea = document.querySelector('#chatModal .input-area');

        if (overlay) {
            overlay.style.display = isBlocked ? 'flex' : 'none';
        }

        if (blockBtn) {
            if (isBlocked) {
                blockBtn.classList.add('blocked');
            } else {
                blockBtn.classList.remove('blocked');
            }
        }

        // Disable/enable input area
        if (inputArea) {
            inputArea.style.opacity = isBlocked ? '0.5' : '1';
            inputArea.style.pointerEvents = isBlocked ? 'none' : 'auto';
        }
    },

    async checkBlockedStatus() {
        if (!this.state.selectedConversation) return false;

        const conv = this.state.selectedConversation;

        // First check local state
        if (this.isContactBlocked()) {
            this.showBlockedState(true);
            return true;
        }

        // Then check with API
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/blocked?${profileParams}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                const blockedList = data.blocked || [];

                // Update local state
                this.state.blockedContacts = blockedList.map(b => ({
                    profile_id: b.blocked_profile_id,
                    profile_type: b.blocked_profile_type,
                    user_id: b.blocked_user_id
                }));

                // Check if current contact is blocked
                const isBlocked = blockedList.some(
                    b => b.blocked_profile_id === conv.other_profile_id &&
                         b.blocked_profile_type === conv.other_profile_type
                );

                this.showBlockedState(isBlocked);
                return isBlocked;
            }
        } catch (error) {
            console.log('Chat: Error checking blocked status:', error.message);
        }

        this.showBlockedState(false);
        return false;
    },

    async deleteChatHistory() {
        if (!this.state.selectedChat || !this.state.selectedConversation) return;

        if (confirm('Delete all messages in this chat? This will only delete for you, not for the other person.')) {
            const conv = this.state.selectedConversation;

            // Try to delete via API
            try {
                const token = localStorage.getItem('token') || localStorage.getItem('access_token');
                const profileParams = this.getProfileParams();

                const response = await fetch(
                    `${this.API_BASE_URL}/api/chat/conversations/${conv.id}/history?${profileParams}`,
                    {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (response.ok) {
                    console.log('Chat: History deleted via API');

                    // Clear the chat area in UI
                    const chatArea = document.getElementById('chatArea');
                    if (chatArea) {
                        chatArea.innerHTML = `
                            <div class="date-divider">
                                <span>Chat cleared</span>
                            </div>
                        `;
                        // Re-add typing indicators
                        this.addTypingIndicators();
                    }

                    // Clear local messages
                    this.state.messages = [];

                    this.showToast('Chat history deleted', 'success');

                    // Close info panel if open
                    const infoPanel = document.getElementById('chatInfoPanel');
                    if (infoPanel && infoPanel.classList.contains('active')) {
                        this.toggleInfo();
                    }
                } else {
                    const errorData = await response.json();
                    this.showToast(errorData.detail || 'Failed to delete chat history', 'error');
                }
            } catch (error) {
                console.log('Chat: Delete history error:', error.message);
                // Fallback: Clear UI only
                const chatArea = document.getElementById('chatArea');
                if (chatArea) {
                    chatArea.innerHTML = `
                        <div class="date-divider">
                            <span>Chat cleared</span>
                        </div>
                    `;
                    this.addTypingIndicators();
                }
                this.state.messages = [];
                this.showToast('Chat history cleared locally', 'info');
                this.toggleInfo();
            }
        }
    },

    // Emoji Modal
    openEmojiModal() {
        const modal = document.getElementById('chatEmojiModal');
        if (modal) {
            modal.classList.add('active');
        }
    },

    closeEmojiModal() {
        const modal = document.getElementById('chatEmojiModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    showEmojiTab(tab) {
        document.querySelectorAll('#chatModal .emoji-gif-content .tab').forEach(t => {
            t.classList.remove('active');
        });
        document.querySelectorAll('#chatModal .emoji-gif-content .tab-content').forEach(c => {
            c.classList.remove('active');
        });

        if (tab === 'emoji') {
            document.querySelector('#chatModal .emoji-gif-content .tab:first-child')?.classList.add('active');
            document.getElementById('chatEmojiTab')?.classList.add('active');
        } else {
            document.querySelector('#chatModal .emoji-gif-content .tab:last-child')?.classList.add('active');
            document.getElementById('chatGifTab')?.classList.add('active');
        }
    },

    loadEmojis() {
        const emojiTab = document.getElementById('chatEmojiTab');
        if (!emojiTab) return;

        const emojis = ['&#128512;','&#128513;','&#128514;','&#128515;','&#128516;','&#128517;','&#128518;','&#128519;','&#128520;','&#128521;','&#128522;','&#128523;','&#128524;','&#128525;','&#128526;','&#128527;','&#128528;','&#128529;','&#128530;','&#128531;','&#128532;','&#128533;','&#128534;','&#128535;','&#128536;','&#128537;','&#128538;','&#128539;','&#128540;','&#128541;','&#128542;','&#128543;','&#128544;','&#128545;','&#128546;','&#128547;','&#128548;','&#128549;','&#128550;','&#128551;','&#128552;','&#128553;','&#128554;','&#128555;','&#128556;','&#128557;','&#128558;','&#128559;','&#128560;','&#128561;','&#128562;','&#128563;','&#128564;','&#128565;','&#128566;','&#128567;','&#10084;','&#128147;','&#128148;','&#128149;','&#128150;','&#128151;','&#128152;','&#128153;','&#128154;','&#128155;','&#128156;','&#128157;','&#128158;','&#128159;','&#128076;','&#128077;','&#128078;','&#128079;','&#128080;'];

        emojiTab.innerHTML = '';
        emojis.forEach(emoji => {
            const btn = document.createElement('button');
            btn.className = 'emoji-item';
            btn.innerHTML = emoji;
            btn.onclick = () => this.insertEmoji(emoji);
            emojiTab.appendChild(btn);
        });
    },

    insertEmoji(emoji) {
        const input = document.getElementById('chatMessageInput');
        if (input) {
            const cursorPos = input.selectionStart;
            const textBefore = input.value.substring(0, cursorPos);
            const textAfter = input.value.substring(cursorPos);

            // Convert HTML entity to character
            const tempEl = document.createElement('span');
            tempEl.innerHTML = emoji;
            const emojiChar = tempEl.textContent;

            input.value = textBefore + emojiChar + textAfter;
            input.focus();
            input.setSelectionRange(cursorPos + emojiChar.length, cursorPos + emojiChar.length);

            this.closeEmojiModal();
        }
    },

    searchGIFs() {
        const searchTerm = document.getElementById('chatGifSearch')?.value;
        this.showToast(`Searching GIFs for "${searchTerm}"...`, 'info');
        // In real app, would call GIPHY API
    },

    // Media Tab
    showMediaTab(tab) {
        document.querySelectorAll('#chatModal .media-tab').forEach(t => {
            t.classList.remove('active');
        });
        document.querySelectorAll('#chatModal .media-tab-content').forEach(c => {
            c.classList.remove('active');
        });

        event?.target?.classList.add('active');
        document.getElementById(`chat${this.capitalizeFirst(tab)}Tab`)?.classList.add('active');
    },

    // File Handling
    handleFileSelection(event) {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
            files.forEach(file => {
                this.showToast(`File selected: ${file.name}`, 'info');
                // In real app, would upload file and send as message
            });
        }
    },

    handlePaste(e) {
        const items = e.clipboardData.items;

        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = item.getAsFile();
                this.showToast('Image pasted - ready to send', 'info');
                // In real app, would upload and send image
                break;
            }
        }
    },

    // Start New Chat - Show contact picker
    async startNewChat() {
        // Load contacts from connections
        const contacts = await this.loadContacts();

        if (contacts.length === 0) {
            this.showToast('No contacts found. Connect with users first!', 'info');
            return;
        }

        // Create contact picker modal
        const existingPicker = document.getElementById('chatContactPicker');
        if (existingPicker) existingPicker.remove();

        const pickerHtml = `
            <div id="chatContactPicker" class="chat-contact-picker" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--card-bg);
                border-radius: 16px;
                padding: 24px;
                width: 90%;
                max-width: 400px;
                max-height: 70vh;
                overflow-y: auto;
                z-index: 10001;
                box-shadow: 0 20px 50px rgba(0,0,0,0.3);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="margin: 0; color: var(--text-primary);">Start New Chat</h3>
                    <button onclick="document.getElementById('chatContactPicker').remove()" style="background: transparent; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted);">&times;</button>
                </div>
                <input type="text" id="contactPickerSearch" placeholder="Search contacts..." style="
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    margin-bottom: 16px;
                    background: var(--input-bg);
                    color: var(--text-primary);
                " oninput="ChatModalManager.filterContactPicker(this.value)">
                <div id="contactPickerList" style="display: flex; flex-direction: column; gap: 8px;">
                    ${contacts.map(c => `
                        <div class="contact-picker-item" onclick="ChatModalManager.selectContactFromPicker(${JSON.stringify(c).replace(/"/g, '&quot;')})" style="
                            display: flex;
                            align-items: center;
                            gap: 12px;
                            padding: 12px;
                            border-radius: 8px;
                            cursor: pointer;
                            transition: background 0.2s;
                        " onmouseover="this.style.background='var(--hover-bg)'" onmouseout="this.style.background='transparent'">
                            <img src="${c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || c.full_name)}`}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
                            <div>
                                <h4 style="margin: 0; color: var(--text-primary);">${c.name || c.full_name}</h4>
                                <span style="color: var(--text-muted); font-size: 0.85rem;">${this.capitalizeFirst(c.profile_type || c.role || 'user')}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div onclick="document.getElementById('chatContactPicker').remove()" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 10000;
            "></div>
        `;

        document.body.insertAdjacentHTML('beforeend', pickerHtml);
    },

    // Filter contact picker search
    filterContactPicker(searchTerm) {
        const items = document.querySelectorAll('.contact-picker-item');
        const lowerSearch = searchTerm.toLowerCase();

        items.forEach(item => {
            const name = item.querySelector('h4')?.textContent.toLowerCase() || '';
            item.style.display = name.includes(lowerSearch) ? 'flex' : 'none';
        });
    },

    // Select contact from picker to start conversation
    selectContactFromPicker(contact) {
        // Remove picker
        document.getElementById('chatContactPicker')?.remove();

        // Open conversation with selected contact
        this.openConversationWith({
            profile_id: contact.profile_id,
            profile_type: contact.profile_type,
            id: contact.user_id,
            full_name: contact.name || contact.full_name,
            name: contact.name || contact.full_name,
            profile_picture: contact.avatar,
            avatar: contact.avatar,
            role: contact.profile_type,
            is_online: contact.is_online
        });
    },

    // Settings
    openSettings() {
        this.showToast('Chat settings coming soon', 'info');
    },

    // Typing Indicator - Self (shows when current user is typing)
    handleTyping() {
        const selfTypingIndicator = document.getElementById('selfTypingIndicator');
        const messageInput = document.getElementById('chatMessageInput');
        const hasText = messageInput?.value.trim().length > 0;

        if (!this.state.isTyping && hasText) {
            this.state.isTyping = true;
            // Show self typing indicator (right side, like sent message)
            if (selfTypingIndicator) {
                selfTypingIndicator.classList.add('active');
                // Scroll to bottom to show typing indicator
                this.scrollToBottom();
            }
            // Would notify other user via WebSocket in production
        }

        clearTimeout(this.state.typingTimer);
        this.state.typingTimer = setTimeout(() => {
            this.state.isTyping = false;
            // Hide typing indicator after user stops typing
            if (selfTypingIndicator) {
                selfTypingIndicator.classList.remove('active');
            }
        }, 1500);

        // If input is cleared, hide immediately
        if (!hasText) {
            this.state.isTyping = false;
            if (selfTypingIndicator) {
                selfTypingIndicator.classList.remove('active');
            }
        }
    },

    // Show other party's typing indicator (called via WebSocket when other user types)
    showOtherTyping(isTyping, userAvatar = '') {
        const typingIndicator = document.getElementById('chatTypingIndicator');
        const avatarImg = document.getElementById('typingUserAvatar');

        if (typingIndicator) {
            if (isTyping) {
                if (avatarImg && userAvatar) {
                    avatarImg.src = userAvatar;
                }
                typingIndicator.classList.add('active');
                this.scrollToBottom();
            } else {
                typingIndicator.classList.remove('active');
            }
        }
    },

    // Handle incoming message (called via WebSocket or polling)
    handleIncomingMessage(message) {
        const conversationId = message.conversation_id;
        const isCurrentConversation = this.state.selectedChat === conversationId;

        // If this is the currently open conversation, add message to chat area
        if (isCurrentConversation) {
            this.appendMessageToChat(message);
            this.scrollToBottom();
            // Mark as read since user is viewing
            this.markConversationAsRead(conversationId);
        } else {
            // Update unread count for this conversation in the sidebar
            this.incrementUnreadCount(conversationId);
            // Play notification sound if enabled
            this.playNotificationSound();
        }

        // Update the last message preview in contacts list
        this.updateConversationPreview(conversationId, message);
    },

    // Append a new message to the chat area
    appendMessageToChat(message) {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        const isMine = message.sender_profile_id === this.state.currentProfile?.profile_id &&
                       message.sender_profile_type === this.state.currentProfile?.profile_type;

        const messageEl = document.createElement('div');
        messageEl.className = `message ${isMine ? 'sent' : 'received'}`;
        messageEl.dataset.messageId = message.id || message.message_id;

        const time = this.formatTime(message.created_at || new Date());
        const avatarUrl = message.sender_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender_name || 'U')}&background=6366f1&color=fff`;

        messageEl.innerHTML = `
            ${!isMine ? `<img src="${avatarUrl}" alt="" class="message-avatar">` : ''}
            <div class="message-content">
                <div class="message-bubble">
                    <p class="message-text">${this.escapeHtml(message.content || '')}</p>
                </div>
                <span class="message-time">${time}</span>
            </div>
        `;

        chatArea.appendChild(messageEl);
    },

    // Increment unread count for a conversation in the sidebar
    incrementUnreadCount(conversationId) {
        const contactEl = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (!contactEl) return;

        let unreadEl = contactEl.querySelector('.unread-count');

        if (unreadEl) {
            // Increment existing count
            const currentCount = parseInt(unreadEl.textContent) || 0;
            unreadEl.textContent = currentCount + 1;
            unreadEl.style.display = 'flex';
        } else {
            // Create new unread badge
            const previewEl = contactEl.querySelector('.contact-preview');
            if (previewEl) {
                unreadEl = document.createElement('span');
                unreadEl.className = 'unread-count';
                unreadEl.textContent = '1';
                previewEl.appendChild(unreadEl);
            }
        }

        // Also update state
        const conv = this.state.conversations.find(c => c.id === conversationId);
        if (conv) {
            conv.unread_count = (conv.unread_count || 0) + 1;
        }

        // Move conversation to top of list (most recent)
        this.moveConversationToTop(conversationId);
    },

    // Update unread count to a specific value
    updateUnreadCount(conversationId, count) {
        const contactEl = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (!contactEl) return;

        let unreadEl = contactEl.querySelector('.unread-count');

        if (count > 0) {
            if (unreadEl) {
                unreadEl.textContent = count;
                unreadEl.style.display = 'flex';
            } else {
                const previewEl = contactEl.querySelector('.contact-preview');
                if (previewEl) {
                    unreadEl = document.createElement('span');
                    unreadEl.className = 'unread-count';
                    unreadEl.textContent = count;
                    previewEl.appendChild(unreadEl);
                }
            }
        } else if (unreadEl) {
            unreadEl.style.display = 'none';
        }

        // Update state
        const conv = this.state.conversations.find(c => c.id === conversationId);
        if (conv) {
            conv.unread_count = count;
        }
    },

    // Clear unread count when conversation is read
    markConversationAsRead(conversationId) {
        this.updateUnreadCount(conversationId, 0);
    },

    // Update the last message preview in the contacts list
    updateConversationPreview(conversationId, message) {
        const contactEl = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (!contactEl) return;

        // Update last message text
        const lastMsgEl = contactEl.querySelector('.last-message');
        if (lastMsgEl) {
            const previewText = message.content || 'Media message';
            lastMsgEl.textContent = previewText.length > 40 ? previewText.substring(0, 40) + '...' : previewText;
        }

        // Update time
        const timeEl = contactEl.querySelector('.message-time');
        if (timeEl) {
            timeEl.textContent = this.formatTimeAgo(message.created_at || new Date());
        }

        // Update state
        const conv = this.state.conversations.find(c => c.id === conversationId);
        if (conv) {
            conv.last_message = {
                content: message.content,
                time: message.created_at || new Date().toISOString(),
                type: message.message_type
            };
        }
    },

    // Move a conversation to the top of the list (for new messages)
    moveConversationToTop(conversationId) {
        const listEl = document.getElementById('chatContactsList');
        const contactEl = document.querySelector(`[data-conversation-id="${conversationId}"]`);

        if (listEl && contactEl) {
            // Find the first conversation item (after any request sections)
            const firstConvItem = listEl.querySelector('.contact-item:not(.request-item)');
            if (firstConvItem && firstConvItem !== contactEl) {
                listEl.insertBefore(contactEl, firstConvItem);
            }
        }

        // Also reorder in state
        const convIndex = this.state.conversations.findIndex(c => c.id === conversationId);
        if (convIndex > 0) {
            const [conv] = this.state.conversations.splice(convIndex, 1);
            this.state.conversations.unshift(conv);
        }
    },

    // Play notification sound for new message
    playNotificationSound() {
        // Check if sound is enabled in settings
        if (this.state.settings?.sound_alerts === false) return;

        try {
            // Create a simple notification sound using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 880; // A5 note
            oscillator.type = 'sine';
            gainNode.gain.value = 0.1;

            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            // Audio not supported or blocked
        }
    },

    // Utility Functions
    formatTime(date) {
        const d = new Date(date);
        const hours = d.getHours();
        const minutes = d.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
        return `${formattedHours}:${formattedMinutes} ${ampm}`;
    },

    formatTimeAgo(date) {
        const now = new Date();
        const d = new Date(date);
        const diff = now - d;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        return d.toLocaleDateString();
    },

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    },

    scrollToBottom() {
        const chatArea = document.getElementById('chatArea');
        if (chatArea) {
            requestAnimationFrame(() => {
                chatArea.scrollTop = chatArea.scrollHeight;
            });
        }
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('chatToastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `chat-toast ${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background: transparent; border: none; color: inherit; cursor: pointer; margin-left: 8px;">&times;</button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // =============================================
    // TTS (Text-to-Speech) Functions for Input Area
    // =============================================

    // Convert typed message to speech (preview before sending)
    convertMessageToSpeech() {
        const messageInput = document.getElementById('chatMessageInput');
        const text = messageInput?.value.trim();

        if (!text) {
            this.showToast('Type a message first to convert to speech', 'info');
            return;
        }

        // Stop any current speech
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Visual feedback on TTS button
        const ttsBtn = document.getElementById('chatTTSBtn');
        if (ttsBtn) {
            ttsBtn.classList.add('speaking');
        }

        utterance.onend = () => {
            if (ttsBtn) {
                ttsBtn.classList.remove('speaking');
            }
        };

        utterance.onerror = () => {
            if (ttsBtn) {
                ttsBtn.classList.remove('speaking');
            }
            this.showToast('Speech synthesis failed', 'error');
        };

        window.speechSynthesis.speak(utterance);
        this.showToast('Reading message aloud...', 'info');
    },

    // Show send options context menu (right-click on send button)
    showSendOptions(event) {
        event.preventDefault();
        event.stopPropagation();

        const menu = document.getElementById('chatSendOptionsMenu');
        if (menu) {
            // Position menu near the send button
            menu.classList.add('active');
        }
    },

    // Hide send options menu
    hideSendOptions() {
        const menu = document.getElementById('chatSendOptionsMenu');
        if (menu) {
            menu.classList.remove('active');
        }
    },

    // Send message as voice (TTS audio)
    sendAsVoice() {
        const messageInput = document.getElementById('chatMessageInput');
        const text = messageInput?.value.trim();

        if (!text) {
            this.showToast('Type a message first', 'info');
            this.hideSendOptions();
            return;
        }

        // Hide the menu
        this.hideSendOptions();

        // For now, we'll send the text message with a TTS indicator
        // In production, this would convert to actual audio file and send as voice message
        this.sendMessage(`🔊 [Voice Message]: ${text}`);

        // Also speak the message locally
        if (window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            window.speechSynthesis.speak(utterance);
        }

        this.showToast('Voice message sent!', 'success');
    },

    // =============================================
    // VTT (Voice-to-Text) Functions
    // =============================================

    // Toggle Voice-to-Text listening
    toggleVoiceToText() {
        if (this.state.isVTTListening) {
            this.stopVTT();
        } else {
            this.startVTT();
        }
    },

    // Start VTT (Speech Recognition)
    startVTT() {
        // Check for browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            this.showToast('Voice-to-Text not supported in this browser', 'error');
            return;
        }

        try {
            this.state.vttRecognition = new SpeechRecognition();
            this.state.vttRecognition.continuous = true;
            this.state.vttRecognition.interimResults = true;
            this.state.vttRecognition.lang = 'en-US';

            const messageInput = document.getElementById('chatMessageInput');

            this.state.vttRecognition.onstart = () => {
                this.state.isVTTListening = true;
                // Add listening class to voice record button when in VTT mode
                const voiceBtn = document.getElementById('chatVoiceRecordBtn');
                if (voiceBtn && voiceBtn.classList.contains('vtt-mode')) {
                    voiceBtn.classList.add('listening');
                }
                this.showToast('Listening... Speak now', 'info');
            };

            this.state.vttRecognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                if (messageInput) {
                    // Append to existing text
                    const currentText = messageInput.value;
                    if (finalTranscript) {
                        messageInput.value = currentText + (currentText ? ' ' : '') + finalTranscript;
                    }
                    this.autoResizeTextarea(messageInput);
                }
            };

            this.state.vttRecognition.onerror = (event) => {
                console.error('VTT Error:', event.error);
                if (event.error === 'not-allowed') {
                    this.showToast('Microphone permission denied', 'error');
                } else {
                    this.showToast(`Speech recognition error: ${event.error}`, 'error');
                }
                this.stopVTT();
            };

            this.state.vttRecognition.onend = () => {
                // Only stop if not manually continuing
                if (this.state.isVTTListening) {
                    // Auto-restart for continuous listening
                    try {
                        this.state.vttRecognition.start();
                    } catch (e) {
                        this.stopVTT();
                    }
                }
            };

            this.state.vttRecognition.start();
        } catch (error) {
            console.error('VTT Start Error:', error);
            this.showToast('Could not start voice recognition', 'error');
        }
    },

    // Stop VTT
    stopVTT() {
        this.state.isVTTListening = false;
        // Remove listening class from voice record button
        const voiceBtn = document.getElementById('chatVoiceRecordBtn');
        if (voiceBtn) voiceBtn.classList.remove('listening');

        if (this.state.vttRecognition) {
            try {
                this.state.vttRecognition.stop();
            } catch (e) {
                // Ignore stop errors
            }
            this.state.vttRecognition = null;
        }
        this.showToast('Voice-to-Text stopped', 'info');
    },

    // =============================================
    // Send Mode (Text vs TTS) Functions
    // =============================================

    // Set send mode (text or tts)
    setSendMode(mode) {
        this.state.sendMode = mode;
        const sendBtn = document.getElementById('chatSendBtn');

        if (sendBtn) {
            if (mode === 'tts') {
                sendBtn.classList.add('tts-mode');
                this.updateSendButtonIcon(sendBtn, 'tts');
                this.showToast('TTS mode - Coming Soon!', 'info');
            } else {
                sendBtn.classList.remove('tts-mode');
                this.updateSendButtonIcon(sendBtn, 'text');
                this.showToast('Normal text mode', 'info');
            }
        }

        this.hideSendOptions();
    },

    // Update send button icon based on mode
    updateSendButtonIcon(btn, mode) {
        if (!btn) return;
        if (mode === 'tts') {
            // Speaker icon for TTS mode
            btn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>
            `;
        } else {
            // Normal send/paper plane icon
            btn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
            `;
        }
    },

    // Toggle send mode on double-click
    toggleSendMode(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const newMode = this.state.sendMode === 'text' ? 'tts' : 'text';
        this.setSendMode(newMode);
    },

    // Handle send message (checks current mode)
    handleSendMessage() {
        if (this.state.sendMode === 'tts') {
            // TTS is coming soon - show message and send as normal text
            this.showToast('TTS mode coming soon! Sending as text.', 'info');
            this.sendMessage();
        } else {
            this.sendMessage();
        }
    },

    // =============================================
    // Voice Record Mode Toggle Functions
    // =============================================

    // Toggle voice record mode on double-click (voice recording vs VTT)
    toggleVoiceRecordMode(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        // Cancel the single-click timer since we're handling double-click
        if (this.state.voiceClickTimer) {
            clearTimeout(this.state.voiceClickTimer);
            this.state.voiceClickTimer = null;
        }

        const voiceBtn = document.getElementById('chatVoiceRecordBtn');
        const recordingUI = document.getElementById('chatVoiceRecording');

        // If currently recording voice, stop it immediately and start VTT
        if (this.state.mediaRecorder && this.state.mediaRecorder.state === 'recording') {
            // Stop the recording
            this.state.mediaRecorder.stop();
            this.state.recordedAudio = null; // Discard the recording
            if (recordingUI) recordingUI.classList.remove('active');
            if (voiceBtn) voiceBtn.classList.remove('active');

            // Switch to VTT mode and start it
            this.state.voiceRecordMode = 'vtt';
            if (voiceBtn) {
                voiceBtn.classList.add('vtt-mode');
                this.updateVoiceButtonIcon(voiceBtn, 'vtt');
            }
            this.showToast('Switched to Voice-to-Text mode', 'info');
            // Start VTT immediately
            setTimeout(() => this.startVTT(), 100);
            return;
        }

        const newMode = this.state.voiceRecordMode === 'voice' ? 'vtt' : 'voice';
        this.state.voiceRecordMode = newMode;

        if (voiceBtn) {
            if (newMode === 'vtt') {
                voiceBtn.classList.add('vtt-mode');
                this.updateVoiceButtonIcon(voiceBtn, 'vtt');
                this.showToast('Voice-to-Text mode - Click to speak and type', 'info');
            } else {
                voiceBtn.classList.remove('vtt-mode');
                this.updateVoiceButtonIcon(voiceBtn, 'voice');
                this.showToast('Voice Recording mode - Click to record audio', 'info');
            }
        }
    },

    // Update voice button icon based on mode
    updateVoiceButtonIcon(btn, mode) {
        if (!btn) return;
        if (mode === 'vtt') {
            // Keyboard/text icon for VTT
            btn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                    <text x="12" y="10" font-size="6" fill="currentColor" text-anchor="middle">A</text>
                </svg>
            `;
        } else {
            // Normal microphone icon
            btn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
            `;
        }
    },

    // Override toggleVoiceRecording to check mode
    // Uses a timer to distinguish single click from double click
    toggleVoiceRecordingWithMode() {
        // If timer is already running, this is likely part of a double click - ignore
        if (this.state.voiceClickTimer) {
            return;
        }

        // Set a timer to delay the action, giving time for double click to cancel it
        this.state.voiceClickTimer = setTimeout(() => {
            this.state.voiceClickTimer = null;

            if (this.state.voiceRecordMode === 'vtt') {
                // Voice-to-Text mode
                this.toggleVoiceToText();
            } else {
                // Normal voice recording mode
                this.toggleVoiceRecording();
            }
        }, 250); // 250ms delay to wait for potential double click
    },

    // =============================================
    // Translate Panel Functions
    // =============================================

    // Toggle translate panel
    toggleTranslatePanel() {
        const translatePanel = document.getElementById('chatTranslatePanel');
        const infoPanel = document.getElementById('chatInfoPanel');
        const translateBtn = document.getElementById('chatTranslateBtn');
        const infoBtn = document.getElementById('chatInfoBtn');

        if (translatePanel) {
            const isOpening = !translatePanel.classList.contains('active');

            // If opening translate panel, close info panel first
            if (isOpening && infoPanel && infoPanel.classList.contains('active')) {
                infoPanel.classList.remove('active');
                if (infoBtn) infoBtn.classList.remove('active');
            }

            translatePanel.classList.toggle('active');
            if (translateBtn) translateBtn.classList.toggle('active', translatePanel.classList.contains('active'));
        }
    },

    // Set translate language
    setTranslateLanguage(lang) {
        // Translation feature is coming soon
        if (lang !== 'none') {
            const langNames = {
                'en': 'English', 'am': 'Amharic', 'om': 'Oromo', 'ti': 'Tigrinya',
                'fr': 'French', 'ar': 'Arabic', 'es': 'Spanish', 'pt': 'Portuguese',
                'zh': 'Chinese', 'hi': 'Hindi', 'sw': 'Swahili', 'de': 'German',
                'it': 'Italian', 'ja': 'Japanese', 'ko': 'Korean', 'ru': 'Russian',
                'tr': 'Turkish', 'nl': 'Dutch', 'pl': 'Polish', 'vi': 'Vietnamese',
                'th': 'Thai', 'id': 'Indonesian', 'ms': 'Malay', 'he': 'Hebrew',
                'uk': 'Ukrainian', 'bn': 'Bengali', 'ur': 'Urdu', 'ta': 'Tamil',
                'te': 'Telugu', 'yo': 'Yoruba', 'ig': 'Igbo', 'ha': 'Hausa',
                'zu': 'Zulu', 'af': 'Afrikaans'
            };
            this.showToast(`Translation to ${langNames[lang] || lang} - Coming Soon!`, 'info');
            // Don't change the state or close the panel for non-none selections
            return;
        }

        this.state.translateLanguage = lang;

        // Update UI
        const options = document.querySelectorAll('#chatTranslatePanel .language-option');
        options.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.lang === lang);
        });

        this.showToast('Translation disabled', 'info');

        // Close panel
        this.toggleTranslatePanel();

        // Clear search input
        const searchInput = document.getElementById('languageSearchInput');
        if (searchInput) searchInput.value = '';
        this.filterLanguages('');
        console.log('Chat: Translation language set to:', lang);
    },

    // Filter languages in translate panel
    filterLanguages(query) {
        const languageList = document.getElementById('languageList');
        const noResults = document.getElementById('noLanguagesFound');
        if (!languageList) return;

        const options = languageList.querySelectorAll('.language-option');
        const searchTerm = query.toLowerCase().trim();
        let visibleCount = 0;

        options.forEach(option => {
            const langName = option.querySelector('.lang-name')?.textContent.toLowerCase() || '';
            const langCode = option.dataset.lang?.toLowerCase() || '';
            const searchTerms = option.dataset.name?.toLowerCase() || '';

            const matches = langName.includes(searchTerm) ||
                           langCode.includes(searchTerm) ||
                           searchTerms.includes(searchTerm);

            option.style.display = matches ? 'flex' : 'none';
            if (matches) visibleCount++;
        });

        // Show/hide no results message
        if (noResults) {
            noResults.style.display = visibleCount === 0 ? 'block' : 'none';
        }
    },

    // =============================================
    // Settings Panel Functions
    // =============================================

    // Default settings values
    defaultSettings: {
        who_can_message: 'everyone',
        read_receipts: true,
        online_status: true,
        typing_indicators: true,
        message_notifications: true,
        sound_alerts: true,
        mute_duration: 'off',
        bubble_style: 'rounded',
        font_size: 'medium',
        message_density: 'comfortable',
        enter_key: 'send',
        auto_download: 'wifi',
        image_quality: 'compressed',
        default_translation: 'none',
        auto_translate: false,
        tts_voice: 'default'
    },

    // Toggle settings modal
    toggleSettingsPanel() {
        const settingsModal = document.getElementById('chatSettingsModal');

        if (settingsModal) {
            const isOpening = !settingsModal.classList.contains('active');

            if (isOpening) {
                // Load settings when opening
                this.loadChatSettings();
                this.loadBlockedContactsList();
                this.calculateStorageUsed();
            }

            settingsModal.classList.toggle('active');
        }
    },

    // Load chat settings from localStorage/API
    async loadChatSettings() {
        // Try to load from localStorage first
        let settings = JSON.parse(localStorage.getItem('chatSettings')) || {};

        // Merge with defaults
        settings = { ...this.defaultSettings, ...settings };

        // Try to load from API
        try {
            const profileId = this.state.currentUser?.profileId;
            const profileType = this.state.currentUser?.profileType;

            if (profileId && profileType) {
                const response = await fetch(
                    `${this.API_BASE_URL}/chat/settings?profile_id=${profileId}&profile_type=${profileType}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('access_token')}`
                        }
                    }
                );

                if (response.ok) {
                    const apiSettings = await response.json();
                    if (apiSettings.settings) {
                        settings = { ...settings, ...apiSettings.settings };
                    }
                }
            }
        } catch (error) {
            console.log('Chat: Using local settings (API unavailable)');
        }

        // Apply settings to UI
        this.applySettingsToUI(settings);

        // Store current settings
        this.state.chatSettings = settings;
    },

    // Apply settings to UI elements
    applySettingsToUI(settings) {
        // Privacy & Security
        const whoCanMessage = document.getElementById('settingWhoCanMessage');
        if (whoCanMessage) whoCanMessage.value = settings.who_can_message || 'everyone';

        const readReceipts = document.getElementById('settingReadReceipts');
        if (readReceipts) readReceipts.checked = settings.read_receipts !== false;

        const onlineStatus = document.getElementById('settingOnlineStatus');
        if (onlineStatus) onlineStatus.checked = settings.online_status !== false;

        const typingIndicators = document.getElementById('settingTypingIndicators');
        if (typingIndicators) typingIndicators.checked = settings.typing_indicators !== false;

        // Notifications
        const messageNotifications = document.getElementById('settingMessageNotifications');
        if (messageNotifications) messageNotifications.checked = settings.message_notifications !== false;

        const soundAlerts = document.getElementById('settingSoundAlerts');
        if (soundAlerts) soundAlerts.checked = settings.sound_alerts !== false;

        const muteAll = document.getElementById('settingMuteAll');
        if (muteAll) muteAll.value = settings.mute_duration || 'off';

        // Appearance
        const bubbleStyle = document.getElementById('settingBubbleStyle');
        if (bubbleStyle) bubbleStyle.value = settings.bubble_style || 'rounded';

        const fontSize = document.getElementById('settingFontSize');
        if (fontSize) fontSize.value = settings.font_size || 'medium';

        const density = document.getElementById('settingDensity');
        if (density) density.value = settings.message_density || 'comfortable';

        const enterKey = document.getElementById('settingEnterKey');
        if (enterKey) enterKey.value = settings.enter_key || 'send';

        // Media & Storage
        const autoDownload = document.getElementById('settingAutoDownload');
        if (autoDownload) autoDownload.value = settings.auto_download || 'wifi';

        const imageQuality = document.getElementById('settingImageQuality');
        if (imageQuality) imageQuality.value = settings.image_quality || 'compressed';

        // Language & Accessibility
        const defaultTranslation = document.getElementById('settingDefaultTranslation');
        if (defaultTranslation) defaultTranslation.value = settings.default_translation || 'none';

        const autoTranslate = document.getElementById('settingAutoTranslate');
        if (autoTranslate) autoTranslate.checked = settings.auto_translate === true;

        const ttsVoice = document.getElementById('settingTTSVoice');
        if (ttsVoice) ttsVoice.value = settings.tts_voice || 'default';

        // Apply visual settings immediately
        this.applyVisualSettings(settings);
    },

    // Apply visual settings (bubble style, font size, density)
    applyVisualSettings(settings) {
        const messagesArea = document.getElementById('chatMessagesArea');
        if (!messagesArea) return;

        // Apply bubble style
        messagesArea.classList.remove('bubble-rounded', 'bubble-square');
        messagesArea.classList.add(`bubble-${settings.bubble_style || 'rounded'}`);

        // Apply font size
        messagesArea.classList.remove('font-small', 'font-medium', 'font-large');
        messagesArea.classList.add(`font-${settings.font_size || 'medium'}`);

        // Apply density
        messagesArea.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
        messagesArea.classList.add(`density-${settings.message_density || 'comfortable'}`);
    },

    // Update a single chat setting
    async updateChatSetting(key, value) {
        // Update local state
        if (!this.state.chatSettings) {
            this.state.chatSettings = { ...this.defaultSettings };
        }
        this.state.chatSettings[key] = value;

        // Save to localStorage
        localStorage.setItem('chatSettings', JSON.stringify(this.state.chatSettings));

        // Apply visual settings immediately if applicable
        if (['bubble_style', 'font_size', 'message_density'].includes(key)) {
            this.applyVisualSettings(this.state.chatSettings);
        }

        // Try to save to API
        try {
            const profileId = this.state.currentUser?.profileId;
            const profileType = this.state.currentUser?.profileType;

            if (profileId && profileType) {
                const response = await fetch(`${this.API_BASE_URL}/chat/settings`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('access_token')}`
                    },
                    body: JSON.stringify({
                        profile_id: profileId,
                        profile_type: profileType,
                        settings: this.state.chatSettings
                    })
                });

                if (response.ok) {
                    console.log('Chat: Setting saved to API:', key, value);
                }
            }
        } catch (error) {
            console.log('Chat: Setting saved locally (API unavailable):', key, value);
        }

        this.showToast('Setting updated', 'success');
    },

    // Load blocked contacts list for settings panel
    async loadBlockedContactsList() {
        const listContainer = document.getElementById('settingsBlockedList');
        if (!listContainer) return;

        // Get blocked users from state or API
        const blockedUsers = this.state.blockedUsers || [];

        if (blockedUsers.length === 0) {
            listContainer.innerHTML = '<p class="no-blocked">No blocked contacts</p>';
            return;
        }

        let html = '';
        for (const blocked of blockedUsers) {
            html += `
                <div class="blocked-contact-item" data-user-id="${blocked.user_id || blocked.id}">
                    <div class="blocked-contact-info">
                        <img class="blocked-contact-avatar" src="${blocked.avatar || '/system_images/default-avatar.svg'}" alt="">
                        <span class="blocked-contact-name">${blocked.name || 'Unknown User'}</span>
                    </div>
                    <button class="unblock-btn-small" onclick="unblockFromSettings(${blocked.user_id || blocked.id})">Unblock</button>
                </div>
            `;
        }

        listContainer.innerHTML = html;
    },

    // Unblock from settings panel
    async unblockFromSettings(userId) {
        try {
            const profileId = this.state.currentUser?.profileId;
            const profileType = this.state.currentUser?.profileType;

            const response = await fetch(`${this.API_BASE_URL}/chat/unblock`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    profile_id: profileId,
                    profile_type: profileType,
                    blocked_user_id: userId
                })
            });

            if (response.ok) {
                // Remove from local blocked list
                this.state.blockedUsers = (this.state.blockedUsers || []).filter(u =>
                    (u.user_id || u.id) !== userId
                );

                // Refresh the list
                this.loadBlockedContactsList();
                this.showToast('Contact unblocked', 'success');
            } else {
                throw new Error('Failed to unblock');
            }
        } catch (error) {
            console.error('Error unblocking from settings:', error);
            this.showToast('Failed to unblock contact', 'error');
        }
    },

    // Calculate storage used
    calculateStorageUsed() {
        const storageElement = document.getElementById('settingStorageUsed');
        if (!storageElement) return;

        // Calculate localStorage usage for chat data
        let totalSize = 0;
        const chatKeys = ['chatSettings', 'chatDrafts', 'chatCache'];

        chatKeys.forEach(key => {
            const item = localStorage.getItem(key);
            if (item) {
                totalSize += item.length * 2; // UTF-16 encoding
            }
        });

        // Format size
        let sizeText;
        if (totalSize < 1024) {
            sizeText = `${totalSize} bytes`;
        } else if (totalSize < 1024 * 1024) {
            sizeText = `${(totalSize / 1024).toFixed(1)} KB`;
        } else {
            sizeText = `${(totalSize / (1024 * 1024)).toFixed(1)} MB`;
        }

        storageElement.textContent = sizeText;
    },

    // Clear chat cache
    clearChatCache() {
        const cacheKeys = ['chatCache', 'chatDrafts'];
        cacheKeys.forEach(key => localStorage.removeItem(key));

        this.calculateStorageUsed();
        this.showToast('Cache cleared', 'success');
    },

    // Export chat history
    async exportChatHistory() {
        this.showToast('Preparing export...', 'info');

        try {
            const profileId = this.state.currentUser?.profileId;
            const profileType = this.state.currentUser?.profileType;

            // Fetch all conversations
            const response = await fetch(
                `${this.API_BASE_URL}/chat/conversations?profile_id=${profileId}&profile_type=${profileType}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('access_token')}`
                    }
                }
            );

            if (!response.ok) throw new Error('Failed to fetch conversations');

            const data = await response.json();

            // Create export data
            const exportData = {
                exportDate: new Date().toISOString(),
                user: {
                    profileId,
                    profileType
                },
                conversations: data.conversations || []
            };

            // Download as JSON
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showToast('Chat history exported', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('Export failed', 'error');
        }
    },

    // Delete all chat data
    async deleteAllChatData() {
        if (!confirm('Are you sure you want to delete ALL your chat data? This action cannot be undone.')) {
            return;
        }

        if (!confirm('This will permanently delete all your messages, conversations, and chat settings. Continue?')) {
            return;
        }

        try {
            const profileId = this.state.currentUser?.profileId;
            const profileType = this.state.currentUser?.profileType;
            const userId = this.state.currentUser?.userId;

            const response = await fetch(
                `${this.API_BASE_URL}/chat/data?profile_id=${profileId}&profile_type=${profileType}&user_id=${userId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('access_token')}`
                    }
                }
            );

            if (response.ok) {
                // Clear local storage
                localStorage.removeItem('chatSettings');
                localStorage.removeItem('chatCache');
                localStorage.removeItem('chatDrafts');

                // Reset state
                this.state.conversations = [];
                this.state.selectedConversation = null;
                this.state.chatSettings = { ...this.defaultSettings };

                // Refresh UI
                this.renderConversations([]);
                this.toggleSettingsPanel();

                this.showToast('All chat data deleted', 'success');
            } else {
                throw new Error('Failed to delete data');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showToast('Failed to delete chat data', 'error');
        }
    },

    // =============================================
    // Video Recording Functions (with Preview)
    // =============================================

    // Open video preview modal - user clicks video button
    async toggleVideoRecording() {
        await this.openVideoPreview();
    },

    // Open video preview modal and show camera
    async openVideoPreview() {
        const modal = document.getElementById('chatVideoPreviewModal');
        const video = document.getElementById('chatVideoPreview');

        if (!modal || !video) {
            this.showToast('Video preview not available', 'error');
            return;
        }

        try {
            // Request camera and microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            });

            this.state.videoPreviewStream = stream;
            video.srcObject = stream;

            // Show modal
            modal.classList.add('active');

            // Reset UI
            this.resetVideoPreviewUI();

        } catch (error) {
            console.error('Video preview error:', error);
            if (error.name === 'NotAllowedError') {
                this.showToast('Camera permission denied', 'error');
            } else if (error.name === 'NotFoundError') {
                this.showToast('No camera found', 'error');
            } else {
                this.showToast('Could not access camera', 'error');
            }
        }
    },

    // Close video preview modal
    closeVideoPreview() {
        const modal = document.getElementById('chatVideoPreviewModal');
        const video = document.getElementById('chatVideoPreview');

        // Stop recording if active
        if (this.state.isVideoRecording) {
            this.stopVideoRecordingInPreview();
        }

        // Stop preview stream
        if (this.state.videoPreviewStream) {
            this.state.videoPreviewStream.getTracks().forEach(track => track.stop());
            this.state.videoPreviewStream = null;
        }

        if (video) {
            video.srcObject = null;
        }

        if (modal) {
            modal.classList.remove('active');
        }

        // Clear recorded data
        this.state.recordedVideoChunks = [];
        this.state.videoRecordingSeconds = 0;
    },

    // Reset video preview UI
    resetVideoPreviewUI() {
        const indicator = document.getElementById('videoRecordingIndicator');
        const recordBtn = document.getElementById('videoRecordToggleBtn');
        const sendBtn = document.getElementById('videoSendBtn');
        const timerEl = document.getElementById('videoRecordingTimer');

        if (indicator) indicator.classList.remove('active');
        if (recordBtn) recordBtn.classList.remove('recording');
        if (sendBtn) sendBtn.disabled = true;
        if (timerEl) timerEl.textContent = '0:00';
    },

    // Toggle recording in preview modal
    toggleVideoRecordingInPreview() {
        if (this.state.isVideoRecording) {
            this.stopVideoRecordingInPreview();
        } else {
            this.startVideoRecordingInPreview();
        }
    },

    // Start recording in preview modal
    startVideoRecordingInPreview() {
        if (!this.state.videoPreviewStream) {
            this.showToast('No camera stream available', 'error');
            return;
        }

        try {
            this.state.recordedVideoChunks = [];

            // Create MediaRecorder
            const options = { mimeType: 'video/webm;codecs=vp9,opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                this.state.videoRecorder = new MediaRecorder(this.state.videoPreviewStream);
            } else {
                this.state.videoRecorder = new MediaRecorder(this.state.videoPreviewStream, options);
            }

            this.state.videoRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.state.recordedVideoChunks.push(event.data);
                }
            };

            this.state.videoRecorder.onstop = () => {
                // Enable send button when recording stops
                const sendBtn = document.getElementById('videoSendBtn');
                if (sendBtn && this.state.recordedVideoChunks.length > 0) {
                    sendBtn.disabled = false;
                }
            };

            this.state.videoRecorder.start(1000);
            this.state.isVideoRecording = true;
            this.state.videoRecordingSeconds = 0;

            // Update UI
            const indicator = document.getElementById('videoRecordingIndicator');
            const recordBtn = document.getElementById('videoRecordToggleBtn');

            if (indicator) indicator.classList.add('active');
            if (recordBtn) recordBtn.classList.add('recording');

            // Start timer
            this.startVideoRecordingTimer();

        } catch (error) {
            console.error('Start recording error:', error);
            this.showToast('Could not start recording', 'error');
        }
    },

    // Stop recording in preview modal
    stopVideoRecordingInPreview() {
        if (this.state.videoRecorder && this.state.isVideoRecording) {
            this.state.videoRecorder.stop();
            this.state.isVideoRecording = false;

            // Stop timer
            if (this.state.videoRecordingTimer) {
                clearInterval(this.state.videoRecordingTimer);
                this.state.videoRecordingTimer = null;
            }

            // Update UI
            const indicator = document.getElementById('videoRecordingIndicator');
            const recordBtn = document.getElementById('videoRecordToggleBtn');

            if (indicator) indicator.classList.remove('active');
            if (recordBtn) recordBtn.classList.remove('recording');
        }
    },

    // Start recording timer
    startVideoRecordingTimer() {
        const timerEl = document.getElementById('videoRecordingTimer');

        this.state.videoRecordingTimer = setInterval(() => {
            this.state.videoRecordingSeconds++;
            const minutes = Math.floor(this.state.videoRecordingSeconds / 60);
            const seconds = this.state.videoRecordingSeconds % 60;
            if (timerEl) {
                timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    },

    // Send recorded video
    sendRecordedVideo() {
        if (this.state.recordedVideoChunks.length === 0) {
            this.showToast('No video recorded', 'error');
            return;
        }

        const videoBlob = new Blob(this.state.recordedVideoChunks, { type: 'video/webm' });
        const sizeMB = (videoBlob.size / 1024 / 1024).toFixed(2);

        // Close preview
        this.closeVideoPreview();

        // For now, show coming soon message
        this.showToast(`Video recorded (${sizeMB} MB) - Sending coming soon!`, 'info');

        // TODO: Implement video upload and send
        // this.uploadAndSendVideo(videoBlob);
    }
};

// =============================================
// GLOBAL FUNCTIONS (for onclick handlers in HTML)
// =============================================

function openChatModal(targetUser = null) {
    ChatModalManager.open(targetUser);
}

function closeChatModal() {
    ChatModalManager.close();
}

function minimizeChatModal() {
    ChatModalManager.minimize();
}

function restoreChatModal() {
    ChatModalManager.restore();
}

function toggleChatSidebar() {
    ChatModalManager.toggleSidebar();
}

function toggleChatInfo() {
    ChatModalManager.toggleInfo();
}

function toggleChatSearch() {
    ChatModalManager.toggleSearch();
}

function navigateSearchNext() {
    ChatModalManager.navigateSearchResult(1);
}

function navigateSearchPrev() {
    ChatModalManager.navigateSearchResult(-1);
}

function toggleReadMessages() {
    ChatModalManager.toggleReadMessages();
}

function showComingSoonReadMessages() {
    ChatModalManager.showToast('Read Messages Aloud - Coming Soon!', 'info');
}

// VTT (Voice-to-Text) Functions
function toggleVoiceToText() {
    ChatModalManager.toggleVoiceToText();
}

// Send mode functions
function showSendOptions(event) {
    ChatModalManager.showSendOptions(event);
}

function setSendMode(mode) {
    ChatModalManager.setSendMode(mode);
}

function handleSendMessage() {
    ChatModalManager.handleSendMessage();
}

function toggleSendMode(event) {
    ChatModalManager.toggleSendMode(event);
}

function toggleVoiceRecordMode(event) {
    ChatModalManager.toggleVoiceRecordMode(event);
}

function toggleChatVoiceRecordingWithMode() {
    ChatModalManager.toggleVoiceRecordingWithMode();
}

function sendAsVoice() {
    ChatModalManager.sendAsVoice();
}

function toggleVideoRecording() {
    ChatModalManager.toggleVideoRecording();
}

function closeVideoPreview() {
    ChatModalManager.closeVideoPreview();
}

function toggleVideoRecordingInPreview() {
    ChatModalManager.toggleVideoRecordingInPreview();
}

function sendRecordedVideo() {
    ChatModalManager.sendRecordedVideo();
}

function sendChatMessage() {
    ChatModalManager.sendMessage();
}

// Typing indicators (for WebSocket integration)
function showOtherUserTyping(isTyping, userAvatar = '') {
    ChatModalManager.showOtherTyping(isTyping, userAvatar);
}

// Handle incoming message from WebSocket
function handleIncomingChatMessage(message) {
    ChatModalManager.handleIncomingMessage(message);
}

// Update unread count for a conversation
function updateChatUnreadCount(conversationId, count) {
    ChatModalManager.updateUnreadCount(conversationId, count);
}

// Increment unread count for a conversation
function incrementChatUnreadCount(conversationId) {
    ChatModalManager.incrementUnreadCount(conversationId);
}

// Translate functions
function toggleTranslatePanel() {
    ChatModalManager.toggleTranslatePanel();
}

function setTranslateLanguage(lang) {
    ChatModalManager.setTranslateLanguage(lang);
}

function filterLanguages(query) {
    ChatModalManager.filterLanguages(query);
}

// Settings functions
function toggleChatSettings() {
    ChatModalManager.toggleSettingsPanel();
}

function updateChatSetting(key, value) {
    ChatModalManager.updateChatSetting(key, value);
}

function clearChatCache() {
    ChatModalManager.clearChatCache();
}

function exportChatHistory() {
    ChatModalManager.exportChatHistory();
}

function deleteAllChatData() {
    ChatModalManager.deleteAllChatData();
}

function unblockFromSettings(userId) {
    ChatModalManager.unblockFromSettings(userId);
}

function startNewChatFromModal() {
    ChatModalManager.startNewChat();
}

function openChatSettings() {
    ChatModalManager.toggleSettingsPanel();
}

// Voice Recording
function toggleChatVoiceRecording() {
    ChatModalManager.toggleVoiceRecording();
}

function cancelChatRecording() {
    ChatModalManager.cancelRecording();
}

// Voice Preview
function toggleVoicePreviewPlay() {
    ChatModalManager.toggleVoicePreviewPlay();
}

function cancelVoicePreview() {
    ChatModalManager.cancelVoicePreview();
}

// Calls
function startChatVoiceCall() {
    ChatModalManager.startVoiceCall();
}

function startChatVideoCall() {
    ChatModalManager.startVideoCall();
}

function toggleChatCallVideo() {
    ChatModalManager.toggleCallVideo();
}

function toggleChatMute() {
    ChatModalManager.toggleMute();
}

function endChatCall() {
    ChatModalManager.endCall();
}

// Emoji/GIF
function openChatEmojiModal() {
    ChatModalManager.openEmojiModal();
}

function closeChatEmojiModal() {
    ChatModalManager.closeEmojiModal();
}

function showChatEmojiTab(tab) {
    ChatModalManager.showEmojiTab(tab);
}

// Message Actions
function replyChatMessage() {
    ChatModalManager.replyMessage();
}

function cancelChatReply() {
    ChatModalManager.cancelReply();
}

function copyChatMessage() {
    ChatModalManager.copyMessage();
}

function forwardChatMessage() {
    ChatModalManager.forwardMessage();
}

function editChatMessage() {
    ChatModalManager.editMessage();
}

function deleteChatMessage() {
    ChatModalManager.deleteMessage();
}

function reactToChatMessage(reaction) {
    ChatModalManager.reactToMessage(reaction);
}

// Info Panel Actions
function blockChatContact() {
    ChatModalManager.blockContact();
}

function unblockChatContact() {
    ChatModalManager.unblockContact();
}

function deleteChatHistory() {
    ChatModalManager.deleteChatHistory();
}

function showChatMediaTab(tab) {
    ChatModalManager.showMediaTab(tab);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    ChatModalManager.init();
});

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.ChatModalManager = ChatModalManager;
    window.openChatModal = openChatModal;
    window.closeChatModal = closeChatModal;
}
