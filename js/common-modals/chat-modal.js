// =============================================
// CHAT MODAL - chat-modal.js
// Full-featured chat modal for Astegni platform
// =============================================

// Helper function to get default avatar (uses global getDefaultAvatar if available, otherwise fallback)
function getChatDefaultAvatar(name = 'User') {
    if (typeof window.getDefaultAvatar === 'function') {
        return window.getDefaultAvatar(name);
    }
    // Fallback to UI Avatars service
    const cleanName = (name || 'User').trim();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=4F46E5&color=fff&size=128&bold=true`;
}

const ChatModalManager = {
    // State Management
    state: {
        isOpen: false,
        currentUser: null,  // {user_id, name, avatar, email}
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
        autoTranslateEnabled: false,  // Auto-translate incoming messages
        pendingTranslateMessageId: null,  // For single message translation from context menu
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
        videoRecordingSeconds: 0,
        // Multi-select state
        isMultiSelectMode: false,
        selectedContacts: [],  // Array of conversation objects
        contactContextMenuTarget: null,
        contactToDelete: null,  // Contact pending deletion confirmation
        // Offline queue state
        offlineQueue: [],  // Messages waiting to be sent
        isOnline: navigator.onLine,
        // Message polling state
        messagePollingInterval: null,
        lastMessageTimestamp: null,
        pollCount: 0,
        // Typing polling state
        typingPollingInterval: null,
        // Last seen polling state
        lastSeenPollingInterval: null,
        // Mute, Pin, Archive state (stored locally)
        mutedConversations: JSON.parse(localStorage.getItem('chat_muted') || '[]'),
        pinnedConversations: JSON.parse(localStorage.getItem('chat_pinned') || '[]'),
        archivedConversations: JSON.parse(localStorage.getItem('chat_archived') || '[]'),
        // Forward mode state
        isForwardMode: false,
        forwardMessage: null,  // The message object being forwarded
        forwardSelectedContacts: [],  // Array of conversation objects selected for forwarding
        // Pending request recipient (for messaging before connection is accepted)
        pendingRequestRecipient: null,
        // WebRTC Call State
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
        currentCallLogId: null,  // Store call log ID for database updates
        pendingCallLogPromise: null,  // Tracks in-flight createCallLog to avoid race conditions

        // Multi-party call support (mesh topology)
        peerConnections: new Map(),  // Map of participantId -> RTCPeerConnection
        remoteStreams: new Map(),  // Map of participantId -> MediaStream
        callParticipants: [],  // Array of participant objects in current call
        pendingParticipantInvites: new Map(),  // Map of participantId -> pending invitation

        // Call timeout
        callInvitationTimeout: null  // Timer for unanswered calls (20 seconds)
    },

    // API Configuration - ensure no duplicate /api prefix
    API_BASE_URL: (window.API_BASE_URL || 'http://localhost:8000').replace(/\/api\/?$/, ''),

    // Track initialization state
    _initialized: false,

    // Initialize
    init() {
        // Check if modal HTML exists before initializing
        const modal = document.getElementById('chatModal');
        if (!modal) {
            console.log('Chat Modal Manager: Modal HTML not found, skipping initialization');
            return;
        }

        // Prevent duplicate initialization but allow re-binding events
        if (this._initialized) {
            console.log('Chat Modal Manager: Already initialized, re-binding events only');
            this.bindEvents();
            return;
        }

        this._initialized = true;
        this.loadCurrentUser();
        console.log('Chat: After loadCurrentUser - currentUser:', this.state.currentUser);
        console.log('Chat: After loadCurrentUser - currentUser:', this.state.currentUser?.full_name || this.state.currentUser?.email);
        this.setupEventListeners();
        this.loadEmojis();
        this.loadOfflineQueue();
        this.setupOnlineStatusListener();
        this.loadTranslationSettings();
        this.loadChatSettingsOnInit(); // Load chat settings on startup
        console.log('Chat Modal Manager initialized successfully');
    },

    // Get user-specific localStorage key for chat settings
    getChatSettingsKey() {
        const userId = this.state.currentUser?.user_id;
        if (userId) {
            return `chatSettings_user_${userId}`;
        }
        return 'chatSettings'; // Fallback to global key
    },

    // Load chat settings on initialization (lightweight version that doesn't require DOM)
    async loadChatSettingsOnInit() {
        // Start with defaults
        let settings = { ...this.defaultSettings };

        // Try to get profile-specific settings from localStorage
        const settingsKey = this.getChatSettingsKey();
        try {
            const stored = localStorage.getItem(settingsKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                settings = { ...settings, ...parsed };
                console.log('[Chat] Loaded settings from localStorage key:', settingsKey);
            }
        } catch (e) {
            console.log('[Chat] Could not parse localStorage settings');
        }

        // Store in state immediately
        this.state.chatSettings = settings;

        // Then try to load from API for latest settings (async, non-blocking)
        await this.refreshChatSettingsFromAPI();
    },

    // Refresh chat settings from API (can be called anytime)
    async refreshChatSettingsFromAPI() {
        try {
            const userId = this.state.currentUser?.user_id;

            if (!userId) {
                console.log('[Chat] No user ID, skipping API settings load');
                return;
            }

            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                console.log('[Chat] No token, skipping API settings load');
                return;
            }

            console.log('[Chat] Loading settings from API for user', userId);

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/settings?user_id=${userId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                const apiSettings = await response.json();
                if (apiSettings.settings) {
                    // Merge API settings with defaults (API takes precedence)
                    this.state.chatSettings = { ...this.defaultSettings, ...apiSettings.settings };

                    // Save to profile-specific localStorage key
                    const settingsKey = this.getChatSettingsKey();
                    localStorage.setItem(settingsKey, JSON.stringify(this.state.chatSettings));

                    console.log('[Chat] Settings loaded from API:', this.state.chatSettings);
                    console.log('[Chat] Key settings - typing_indicators:', this.state.chatSettings.typing_indicators,
                                'tts_voice:', this.state.chatSettings.tts_voice);
                }
            } else {
                console.log('[Chat] API settings request failed:', response.status);
            }
        } catch (error) {
            console.log('[Chat] Using local settings (API unavailable):', error.message);
        }
    },

    // Load translation settings from localStorage/API on startup
    async loadTranslationSettings() {
        try {
            // Try profile-specific localStorage first
            const settingsKey = this.getChatSettingsKey();
            let localSettings = {};
            try {
                const stored = localStorage.getItem(settingsKey);
                if (stored) {
                    localSettings = JSON.parse(stored);
                }
            } catch (e) {
                // Ignore parse errors
            }

            // Apply local settings immediately
            if (localSettings.default_translation) {
                this.state.translateLanguage = localSettings.default_translation;
            }
            if (localSettings.auto_translate !== undefined) {
                this.state.autoTranslateEnabled = localSettings.auto_translate;
            }

            // Try to load from API for latest settings
                                    if (profileId && profileType) {
                const token = localStorage.getItem('token') || localStorage.getItem('access_token');
                if (token) {
                    const response = await fetch(
                        `${this.API_BASE_URL}/api/chat/settings?user_id=${userId}`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        const settings = data.settings || {};

                        if (settings.default_translation) {
                            this.state.translateLanguage = settings.default_translation;
                        }
                        if (settings.auto_translate !== undefined) {
                            this.state.autoTranslateEnabled = settings.auto_translate;
                        }

                        console.log('[Chat] Translation settings loaded:', {
                            language: this.state.translateLanguage,
                            autoTranslate: this.state.autoTranslateEnabled
                        });
                    }
                }
            }
        } catch (error) {
            console.log('[Chat] Using default translation settings');
        }
    },

    // Load offline queue from localStorage
    loadOfflineQueue() {
        try {
            const queue = localStorage.getItem('chatOfflineQueue');
            if (queue) {
                this.state.offlineQueue = JSON.parse(queue);
                console.log('[Chat] Loaded offline queue:', this.state.offlineQueue.length, 'messages');
            }
        } catch (error) {
            console.error('[Chat] Error loading offline queue:', error);
            this.state.offlineQueue = [];
        }
    },

    // Save offline queue to localStorage
    saveOfflineQueue() {
        try {
            localStorage.setItem('chatOfflineQueue', JSON.stringify(this.state.offlineQueue));
        } catch (error) {
            console.error('[Chat] Error saving offline queue:', error);
        }
    },

    // Add message to offline queue
    addToOfflineQueue(messageData, conversationId) {
        const queueItem = {
            id: messageData.id,
            conversationId: conversationId,
            messageData: messageData,
            timestamp: Date.now(),
            retryCount: 0
        };
        this.state.offlineQueue.push(queueItem);
        this.saveOfflineQueue();
        console.log('[Chat] Message added to offline queue:', messageData.id);
    },

    // Remove message from offline queue
    removeFromOfflineQueue(messageId) {
        this.state.offlineQueue = this.state.offlineQueue.filter(item => item.id !== messageId);
        this.saveOfflineQueue();
    },

    // Setup online/offline status listener
    setupOnlineStatusListener() {
        window.addEventListener('online', () => {
            console.log('[Chat] Connection restored - processing offline queue');
            this.state.isOnline = true;
            this.processOfflineQueue();
        });

        window.addEventListener('offline', () => {
            console.log('[Chat] Connection lost - messages will be queued');
            this.state.isOnline = false;
        });
    },

    // Start polling for new messages (real-time updates)
    startMessagePolling() {
        // Stop any existing polling first
        this.stopMessagePolling();

        // Immediately update status when chat opens
        this.updateMyActiveStatus();

        // Poll every 3 seconds for new messages in selected conversation
        this.state.messagePollingInterval = setInterval(() => {
            if (this.state.isOpen && this.state.isOnline) {
                // Poll selected conversation for messages
                if (this.state.selectedChat) {
                    this.pollNewMessages();
                    // Poll typing status every time (1.5 second effective interval)
                    this.pollTypingStatus();
                }
                // Every 3rd poll, also refresh all conversation unread counts
                if (this.state.pollCount % 3 === 0) {
                    this.pollUnreadCounts();
                }
                // Every 10th poll (30 seconds), update our active status
                if (this.state.pollCount % 10 === 0) {
                    this.updateMyActiveStatus();
                }
            }
        }, 3000);

        // Also start a separate faster polling for typing status (every 1.5 seconds)
        this.state.typingPollingInterval = setInterval(() => {
            if (this.state.isOpen && this.state.isOnline && this.state.selectedChat) {
                this.pollTypingStatus();
            }
        }, 1500);

        console.log('[Chat] Message polling started');
    },

    // Update current user's active status (heartbeat) with device info
    async updateMyActiveStatus() {
        if (!this.state.currentUser) return;

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) return;

        try {
            const userId = this.state.currentUser?.user_id;

            // Get device info for Active Sessions feature
            const deviceInfo = this.getCurrentDeviceInfo();
            const deviceName = `${deviceInfo.browser} on ${deviceInfo.os}`;

            // Build URL with device info
            const params = new URLSearchParams({
                user_id: userId,
                device_name: deviceName,
                device_type: deviceInfo.deviceType || 'desktop',
                browser: deviceInfo.browser,
                os: deviceInfo.os
            });

            await fetch(
                `${this.API_BASE_URL}/api/chat/users/status/update?${params.toString()}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            // Silent success - don't log every heartbeat
        } catch (error) {
            console.error('[Chat] Failed to update active status:', error);
        }
    },

    // Stop polling for messages
    stopMessagePolling() {
        if (this.state.messagePollingInterval) {
            clearInterval(this.state.messagePollingInterval);
            this.state.messagePollingInterval = null;
            console.log('[Chat] Message polling stopped');
        }
        // Also stop typing polling
        if (this.state.typingPollingInterval) {
            clearInterval(this.state.typingPollingInterval);
            this.state.typingPollingInterval = null;
        }
    },

    // Start polling for last seen updates (silent background updates)
    startLastSeenPolling() {
        this.stopLastSeenPolling();

        // Poll every 10 seconds for last seen updates
        this.state.lastSeenPollingInterval = setInterval(() => {
            if (this.state.isOpen && this.state.isOnline) {
                this.pollLastSeenUpdates();
            }
        }, 10000);
    },

    // Stop polling for last seen
    stopLastSeenPolling() {
        if (this.state.lastSeenPollingInterval) {
            clearInterval(this.state.lastSeenPollingInterval);
            this.state.lastSeenPollingInterval = null;
        }
    },

    // Check if a recipient allows messages from everyone (for who_can_message setting)
    async checkRecipientAllowsEveryone(recipientUserId) {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) return false;

        try {
            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/settings?user_id=${userId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                const settings = data.settings || {};
                // Returns true if who_can_message is 'everyone', false otherwise
                return settings.who_can_message === 'everyone';
            }
        } catch (error) {
            console.debug('[Chat] Could not fetch recipient settings:', error.message);
        }

        // Default to false (connections only) if we can't fetch settings
        return false;
    },

    // Silently poll and update last seen times in contact list
    async pollLastSeenUpdates() {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token || !this.state.conversations.length) return;

        try {
            const profileParams = this.getProfileParams();

            // Build list of user_ids to query (not profile_ids)
            const userIds = this.state.conversations
                .filter(conv => conv.type !== 'group' && conv.type !== 'channel')
                .map(conv => conv.other_user_id)  // Use other_user_id instead of profile IDs
                .filter(Boolean)
                .join(',');

            if (!userIds) return;

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/users/online-status?${profileParams}&user_ids=${encodeURIComponent(userIds)}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (!response.ok) return;

            const data = await response.json();
            const statuses = data.statuses || [];

            // Create a map of user_id to status for quick lookup
            const statusMap = {};
            statuses.forEach(status => {
                statusMap[status.user_id] = status;
            });

            // Update conversations state silently
            this.state.conversations.forEach(conv => {
                const otherUserId = conv.other_user_id;

                if (otherUserId && statusMap[otherUserId]) {
                    conv.is_online = statusMap[otherUserId].is_online;
                    conv.last_seen = statusMap[otherUserId].last_seen;
                }
            });

            // Update DOM silently without re-rendering entire list
            this.updateLastSeenInDOM();

            // Also update chat header if a conversation is selected
            if (this.state.selectedConversation) {
                this.updateChatHeader(this.state.selectedConversation);
            }
        } catch (error) {
            // Silent fail - don't spam console
        }
    },

    // Update last seen text in DOM without re-rendering
    updateLastSeenInDOM() {
        this.state.conversations.forEach(conv => {
            const contactEl = document.querySelector(`[data-conversation-id="${conv.id}"]`);
            if (!contactEl) return;

            const lastSeenEl = contactEl.querySelector('.contact-last-seen');
            const statusIndicator = contactEl.querySelector('.status-indicator');
            const isOnline = conv.is_online && !conv.online_hidden;

            // Update status indicator
            if (statusIndicator) {
                statusIndicator.classList.toggle('online', isOnline);
                statusIndicator.classList.toggle('offline', !isOnline);
            }

            // Update last seen text
            if (isOnline) {
                // Show "Online" text
                if (lastSeenEl) {
                    lastSeenEl.textContent = 'Online';
                    lastSeenEl.classList.add('online');
                } else {
                    // Create element if doesn't exist
                    const headerEl = contactEl.querySelector('.contact-header');
                    if (headerEl && !headerEl.querySelector('.contact-last-seen')) {
                        const span = document.createElement('span');
                        span.className = 'contact-last-seen online';
                        span.textContent = 'Online';
                        headerEl.appendChild(span);
                    }
                }
            } else if (!conv.last_seen_hidden && conv.last_seen) {
                // Show last seen time
                const lastSeenDate = new Date(conv.last_seen);
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

                if (lastSeenDate > thirtyDaysAgo) {
                    if (lastSeenEl) {
                        lastSeenEl.textContent = this.formatTimeAgo(conv.last_seen);
                        lastSeenEl.classList.remove('online');
                    } else {
                        const headerEl = contactEl.querySelector('.contact-header');
                        if (headerEl && !headerEl.querySelector('.contact-last-seen')) {
                            const span = document.createElement('span');
                            span.className = 'contact-last-seen';
                            span.textContent = this.formatTimeAgo(conv.last_seen);
                            headerEl.appendChild(span);
                        }
                    }
                } else if (lastSeenEl) {
                    lastSeenEl.remove();
                }
            } else if (lastSeenEl) {
                // No last seen - remove element
                lastSeenEl.remove();
            }
        });
    },

    // Check if a conversation is synthetic (not a real database conversation)
    isSyntheticConversation(conv) {
        if (!conv) return false;
        const id = typeof conv === 'string' ? conv : conv.id;
        return (
            (typeof id === 'string') && (
                id.startsWith('connection-') ||
                id.startsWith('family-parent-') ||
                id.startsWith('family-child-') ||
                id.startsWith('tutor-') ||
                id.startsWith('enrolled-student-') ||
                id.startsWith('enrolled-tutor-') ||
                id.startsWith('enrolled-parent-') ||
                id.startsWith('child-tutor-') ||
                id.startsWith('parent-invitation-sent-') ||
                id.startsWith('parent-invitation-received-') ||
                id.startsWith('parent-invitation-pending-') ||
                id.startsWith('child-invitation-sent-') ||
                id.startsWith('child-invitation-received-') ||
                id.startsWith('session-request-') ||
                id.startsWith('my-request-tutor-')
            )
        );
    },

    // Poll for new messages in the current conversation
    async pollNewMessages() {
        if (!this.state.selectedChat) return;

        // Skip polling for synthetic conversations (invitations, connections, etc.)
        if (this.isSyntheticConversation(this.state.selectedChat)) return;

        const conversationId = this.state.selectedChat;
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) return;

        this.state.pollCount++;

        try {
            const profileParams = this.getProfileParams();
            const currentMessages = this.state.messages[conversationId] || [];

            // Every 3rd poll (9 seconds), do a full refresh to update read statuses
            // This ensures read receipts update quickly when both users are chatting
            const isFullRefresh = this.state.pollCount % 3 === 0;

            // Build URL
            let url = `${this.API_BASE_URL}/api/chat/messages/${conversationId}?${profileParams}`;

            // Only add after parameter for incremental polls (not full refresh)
            if (!isFullRefresh) {
                const lastMessage = currentMessages[currentMessages.length - 1];
                const afterTimestamp = lastMessage?.time || this.state.lastMessageTimestamp;
                if (afterTimestamp) {
                    const timestamp = new Date(afterTimestamp).toISOString();
                    url += `&after=${encodeURIComponent(timestamp)}`;
                }
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const newMessages = data.messages || [];

                if (isFullRefresh) {
                    // Full refresh: Update all messages with fresh data including read statuses
                    if (newMessages.length > 0) {
                        const updatedMessages = newMessages.map(msg => {
                            const isMine = msg.is_mine;
                            return {
                                id: msg.id,
                                text: msg.content,
                                content: msg.content,
                                message_type: msg.message_type || 'text',
                                sender_id: msg.sender_profile_id,
                                sender_name: msg.sender_name || 'User',
                                avatar: msg.sender_avatar,
                                time: msg.created_at,
                                sent: isMine,
                                is_mine: isMine,
                                status: msg.status,  // Include read status from API
                                // Forwarded message fields
                                is_forwarded: msg.is_forwarded,
                                forwarded_from: msg.forwarded_from,
                                forwarded_from_avatar: msg.forwarded_from_avatar,
                                forwarded_from_profile_id: msg.forwarded_from_profile_id,
                                forwarded_from_profile_type: msg.forwarded_from_profile_type
                            };
                        });

                        // Check if any status changed (to avoid unnecessary re-renders)
                        let statusChanged = false;
                        updatedMessages.forEach(newMsg => {
                            const existingMsg = currentMessages.find(m => m.id === newMsg.id);
                            if (existingMsg && existingMsg.status !== newMsg.status) {
                                statusChanged = true;
                            }
                        });

                        // Preserve call logs (both database and local) during refresh
                        const existingCallLogs = currentMessages.filter(msg =>
                            msg.message_type === 'call' || msg.type === 'call'
                        );

                        // Update state with fresh data + preserved call logs
                        this.state.messages[conversationId] = [...updatedMessages, ...existingCallLogs];

                        // Sort by timestamp
                        this.state.messages[conversationId].sort((a, b) => {
                            const timeA = new Date(a.time || a.created_at).getTime();
                            const timeB = new Date(b.time || b.created_at).getTime();
                            return timeA - timeB;
                        });

                        // Only re-render if status changed or new messages arrived
                        // Compare only non-call messages since call logs are preserved
                        const previousNonCallCount = currentMessages.filter(m => m.message_type !== 'call' && m.type !== 'call').length;
                        if (statusChanged || updatedMessages.length !== previousNonCallCount) {
                            this.renderMessages(conversationId);
                        }
                    }
                } else if (newMessages.length > 0) {
                    // Incremental poll: Only add new messages
                    const existingIds = new Set(currentMessages.map(m => m.id));
                    const trulyNewMessages = newMessages.filter(msg => !existingIds.has(msg.id));

                    if (trulyNewMessages.length > 0) {
                        console.log('[Chat] Received', trulyNewMessages.length, 'new messages');

                        // Add new messages to state
                        trulyNewMessages.forEach(msg => {
                            const isMine = msg.is_mine;
                            const messageData = {
                                id: msg.id,
                                text: msg.content,
                                content: msg.content,
                                message_type: msg.message_type || 'text',
                                sender_id: msg.sender_profile_id,
                                sender_name: msg.sender_name || 'User',
                                avatar: msg.sender_avatar,
                                time: msg.created_at,
                                sent: isMine,
                                is_mine: isMine,
                                status: msg.status,
                                // Forwarded message fields
                                is_forwarded: msg.is_forwarded,
                                forwarded_from: msg.forwarded_from,
                                forwarded_from_avatar: msg.forwarded_from_avatar,
                                forwarded_from_profile_id: msg.forwarded_from_profile_id,
                                forwarded_from_profile_type: msg.forwarded_from_profile_type
                            };
                            this.state.messages[conversationId].push(messageData);
                        });

                        // Sort all messages by timestamp
                        this.state.messages[conversationId].sort((a, b) => {
                            const timeA = new Date(a.time || a.created_at).getTime();
                            const timeB = new Date(b.time || b.created_at).getTime();
                            return timeA - timeB;
                        });

                        // Re-render all messages
                        this.renderMessages(conversationId);

                        // Update last message timestamp
                        const sortedMsgs = this.state.messages[conversationId];
                        const latestMsg = sortedMsgs[sortedMsgs.length - 1];
                        this.state.lastMessageTimestamp = latestMsg.time || latestMsg.created_at;

                        // Update sidebar preview
                        this.updateConversationPreview(conversationId, {
                            content: latestMsg.text || latestMsg.content,
                            created_at: latestMsg.time
                        });

                        // Notify for messages from others (if chat modal is not focused)
                        const newFromOthers = trulyNewMessages.filter(m => !m.is_mine);
                        if (newFromOthers.length > 0 && !this.state.isOpen) {
                            this.playNotificationSound();
                            // Show browser notification for the latest message
                            const latestFromOther = newFromOthers[newFromOthers.length - 1];
                            this.showBrowserNotification(latestFromOther, latestFromOther.sender_name);
                        }
                    }
                }
            }
        } catch (error) {
            // Silently fail on polling errors to avoid spamming console
            if (this.state.isOnline) {
                console.debug('[Chat] Polling error:', error.message);
            }
        }
    },

    // Poll for unread counts across all conversations
    async pollUnreadCounts() {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) return;

        try {
            const profileParams = this.getProfileParams();
            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/conversations?${profileParams}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (response.ok) {
                const data = await response.json();
                const conversations = data.conversations || [];

                // Update unread counts for each conversation
                conversations.forEach(conv => {
                    const existingConv = this.state.conversations.find(c => c.id === conv.id);
                    if (existingConv) {
                        const oldCount = existingConv.unread_count || 0;
                        const newCount = conv.unread_count || 0;

                        // Only update if count changed
                        if (oldCount !== newCount) {
                            // Update the badge in UI
                            this.updateUnreadCount(conv.id, newCount);

                            // Update last message preview if there's a new message
                            if (conv.last_message && newCount > oldCount) {
                                this.updateConversationPreview(conv.id, {
                                    content: conv.last_message.content,
                                    created_at: conv.last_message.time || conv.last_message.created_at
                                });

                                // Move to top if not selected
                                if (this.state.selectedChat !== conv.id) {
                                    this.moveConversationToTop(conv.id);
                                }
                            }
                        }
                    } else {
                        // New conversation appeared - add it to state and render
                        this.state.conversations.push(conv);
                        // Re-render conversations to show the new one
                        this.renderConversations();
                    }
                });
            }
        } catch (error) {
            // Silently fail
            if (this.state.isOnline) {
                console.debug('[Chat] Unread count polling error:', error.message);
            }
        }
    },

    // Process offline queue when connection is restored
    async processOfflineQueue() {
        if (this.state.offlineQueue.length === 0) return;

        console.log('[Chat] Processing', this.state.offlineQueue.length, 'queued messages');

        // Process messages in order
        const queue = [...this.state.offlineQueue];
        for (const item of queue) {
            try {
                const success = await this.retrySendMessage(item);
                if (success) {
                    this.removeFromOfflineQueue(item.id);
                    // Update message status in UI
                    this.updateMessageStatus(item.id, 'sent');
                } else {
                    item.retryCount++;
                    if (item.retryCount >= 3) {
                        // Max retries reached, mark as failed
                        this.updateMessageStatus(item.id, 'failed');
                        this.removeFromOfflineQueue(item.id);
                    }
                }
            } catch (error) {
                console.error('[Chat] Error retrying message:', error);
            }
        }
        this.saveOfflineQueue();
    },

    // Retry sending a queued message
    async retrySendMessage(queueItem) {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();
            const msg = queueItem.messageData;

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/messages?${profileParams}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        conversation_id: queueItem.conversationId,
                        message_type: msg.message_type || 'text',
                        content: msg.text || msg.content,
                        media_url: msg.audio || null,
                        reply_to_id: msg.reply_to?.id || null
                    })
                }
            );

            if (response.ok) {
                const data = await response.json();
                console.log('[Chat] Queued message sent successfully:', data.message_id);
                return true;
            }
            return false;
        } catch (error) {
            console.error('[Chat] Error sending queued message:', error);
            return false;
        }
    },

    // Update message status indicator in UI
    updateMessageStatus(messageId, status) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageEl) return;

        let statusIndicator = messageEl.querySelector('.message-status');
        if (!statusIndicator) {
            // Create status indicator if it doesn't exist
            const timeEl = messageEl.querySelector('.message-time-inline');
            if (timeEl) {
                statusIndicator = document.createElement('span');
                statusIndicator.className = 'message-status';
                timeEl.insertAdjacentElement('beforebegin', statusIndicator);
            }
        }

        if (statusIndicator) {
            statusIndicator.className = `message-status status-${status}`;
            switch (status) {
                case 'pending':
                    statusIndicator.innerHTML = '<svg class="status-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
                    statusIndicator.title = 'Sending...';
                    break;
                case 'sent':
                    statusIndicator.innerHTML = '<svg class="status-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>';
                    statusIndicator.title = 'Sent';
                    break;
                case 'read':
                    statusIndicator.innerHTML = '<svg class="status-icon" width="18" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L7 17l-5-5"/><path d="M22 6L11 17"/></svg>';
                    statusIndicator.title = 'Read';
                    break;
                case 'failed':
                    statusIndicator.innerHTML = '<svg class="status-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
                    statusIndicator.title = 'Failed to send. Tap to retry.';
                    statusIndicator.style.cursor = 'pointer';
                    statusIndicator.onclick = () => this.retryFailedMessage(messageId);
                    break;
            }
        }
    },

    // Retry a failed message
    async retryFailedMessage(messageId) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageEl) return;

        // Find message in state
        for (const convId in this.state.messages) {
            const msg = this.state.messages[convId].find(m => m.id === messageId);
            if (msg) {
                this.updateMessageStatus(messageId, 'pending');
                const queueItem = {
                    id: messageId,
                    conversationId: convId,
                    messageData: msg,
                    retryCount: 0
                };
                const success = await this.retrySendMessage(queueItem);
                this.updateMessageStatus(messageId, success ? 'sent' : 'failed');
                break;
            }
        }
    },

    // Load Current User from Auth - simplified for user-based architecture
    loadCurrentUser() {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            console.log('Chat: No token found');
            return;
        }

        // Fetch from API
        this.fetchCurrentUser();
    },


    // Fetch current user from API - simplified for user-based architecture
    async fetchCurrentUser() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                console.log('Chat: No token available');
                return null;
            }

            const response = await fetch(`${this.API_BASE_URL}/api/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.error('Chat: Failed to fetch user:', response.status);
                return null;
            }

            const user = await response.json();

            // Build display name
            const firstName = user.first_name || '';
            const lastName = user.last_name || user.father_name || '';
            const displayName = `${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || 'User';

            // Set current user (user-based, no role needed!)
            this.state.currentUser = {
                user_id: user.id,
                name: displayName,
                avatar: user.profile_picture || getChatDefaultAvatar(displayName),
                email: user.email,
                // Keep full user object for backward compatibility
                _fullUser: user
            };

            console.log('Chat: Current user loaded:', this.state.currentUser);

            // Update UI
            this.updateCurrentUserDisplay();

            return user;

        } catch (error) {
            console.error('Chat: Failed to fetch current user:', error);
            return null;
        }
    },


    // Update Current User Display - simplified for user-based architecture
    updateCurrentUserDisplay() {
        const { name, avatar } = this.state.currentUser || {};

        const avatarEl = document.getElementById('chatCurrentUserAvatar');
        const nameEl = document.getElementById('chatCurrentUserName');
        const roleEl = document.getElementById('chatCurrentUserRole');

        if (avatarEl && avatar) avatarEl.src = avatar;
        if (nameEl) nameEl.textContent = name || 'You';
        if (roleEl) roleEl.textContent = 'Astegni User';  // No role distinction needed

        console.log('Chat: Updated user display:', name);
    },

    // DEPRECATED - kept for backward compatibility
    updateCurrentUserUI() {
        this.updateCurrentUserDisplay();
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
        console.log('Chat: bindEvents() called');

        // Message input
        const messageInput = document.getElementById('chatMessageInput');
        console.log('Chat: chatMessageInput element:', messageInput ? 'FOUND' : 'NOT FOUND');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                console.log('🔥 Keypress in chatMessageInput:', e.key);
                if (e.key === 'Enter') {
                    console.log('🔥 Enter key pressed! Value:', messageInput.value);
                    const enterKeyBehavior = this.state.chatSettings?.enter_key || 'send';
                    console.log('Chat: enterKeyBehavior:', enterKeyBehavior, 'shiftKey:', e.shiftKey);

                    if (enterKeyBehavior === 'send' && !e.shiftKey) {
                        // Send message on Enter (Shift+Enter for new line)
                        console.log('🔥 Sending message via Enter key...');
                        e.preventDefault();
                        this.sendMessage();
                    } else if (enterKeyBehavior === 'newline' && e.shiftKey) {
                        // Send message on Shift+Enter (Enter for new line)
                        console.log('🔥 Sending message via Shift+Enter...');
                        e.preventDefault();
                        this.sendMessage();
                    }
                    // Otherwise, let the default behavior happen (new line)
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

        // Send button - add direct click listener as backup
        const sendBtn = document.getElementById('chatSendBtn');
        console.log('Chat: chatSendBtn element:', sendBtn ? 'FOUND' : 'NOT FOUND');
        if (sendBtn) {
            sendBtn.addEventListener('click', (e) => {
                console.log('🔥 Send button CLICKED via addEventListener!');
                console.log('Chat: Input value:', document.getElementById('chatMessageInput')?.value);
                // Don't call handleSendMessage here - let onclick handle it
                // This is just for debugging
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


        // Context menu for messages
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('#chatModal .message-bubble')) {
                e.preventDefault();
                this.showContextMenu(e);
            }
            // Context menu for contacts/conversations
            if (e.target.closest('#chatModal .contact-item:not(.request-item)')) {
                e.preventDefault();
                this.showContactContextMenu(e);
            }
        });

        // Close context menu on click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#chatContextMenu')) {
                this.hideContextMenu();
            }
            // Close contact context menu
            if (!e.target.closest('#chatContactContextMenu')) {
                this.hideContactContextMenu();
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

        // Create group name input - update submit button on input
        const groupNameInput = document.getElementById('createGroupNameInput');
        if (groupNameInput) {
            groupNameInput.addEventListener('input', () => {
                this.updateSelectedMembersUI();
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
    async open(targetUser = null) {
        const modal = document.getElementById('chatModal');
        if (!modal) {
            console.error('Chat modal not found');
            return;
        }

        console.log('Chat: Opening modal, targetUser:', targetUser);

        // Store target user for after 2FA verification
        this.state.pendingTargetUser = targetUser;

        // First, load current user data to get profile info
        this.loadCurrentUser();

        // Check if two-step verification is required
        const twoStepRequired = await this.checkTwoStepRequired();
        if (twoStepRequired && !this.state.twoStepVerified) {
            console.log('Chat: Two-step verification required');
            this.showTwoStepVerifyModal();
            return;
        }

        // Proceed to open chat
        this.proceedToOpenChat(targetUser);
    },

    // Proceed to open chat after 2FA verification (or if not required)
    async proceedToOpenChat(targetUser = null) {
        const modal = document.getElementById('chatModal');
        if (!modal) return;

        this.state.isOpen = true;
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';

        // Clear previous state to force fresh load
        this.state.conversations = [];
        this.state.connectionRequests = { sent: [], received: [] };

        console.log('Chat: After loadCurrentUser, currentUser:', this.state.currentUser);

        // IMPORTANT: Refresh settings from API when modal opens (ensures profile-specific settings)
        await this.refreshChatSettingsFromAPI();

        // Apply visual settings (bubble style, font size, etc.) from state
        if (this.state.chatSettings) {
            this.applyVisualSettings(this.state.chatSettings);
            console.log('[Chat] Applied visual settings on modal open');
        }

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

        // Connect to WebSocket for real-time chat and call signaling
        this.connectWebSocket();

        // Start polling for real-time updates (unread counts, new messages)
        this.startMessagePolling();

        // Start polling for last seen updates (silent background updates)
        this.startLastSeenPolling();

        // Request notification permission if not already granted
        this.requestNotificationPermission();

        // Add body class to prevent scrolling
        document.body.style.overflow = 'hidden';
    },

    // Check if two-step verification is required for this user
    async checkTwoStepRequired() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                console.log('Chat: No token found, skipping 2FA check');
                return false;
            }

            if (!this.state.currentUser) {
                console.log('Chat: No currentProfile, attempting to load user');
                this.loadCurrentUser();
                if (!this.state.currentUser) {
                    console.log('Chat: Still no currentProfile after load, skipping 2FA check');
                    return false;
                }
            }

            const userId = this.state.currentUser?.user_id;
            console.log('Chat: Checking 2FA status for user_id:', userId);

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/security/two-step?user_id=${userId}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (response.ok) {
                const data = await response.json();
                console.log('Chat: 2FA status response:', data);
                return data.enabled === true;
            } else {
                console.log('Chat: 2FA status check failed with status:', response.status);
            }
            return false;
        } catch (error) {
            console.error('Chat: Error checking 2FA status:', error);
            return false;
        }
    },

    // Show the two-step verification modal
    showTwoStepVerifyModal() {
        const modal = document.getElementById('twoStepVerifyModal');
        const forgotModal = document.getElementById('forgotTwoStepModal');
        console.log('Chat: showTwoStepVerifyModal called, modal element:', modal);

        if (modal) {
            // CRITICAL: Move modal to body so it's not inside the hidden chatModal
            // This ensures it can be displayed even when chatModal is hidden
            if (modal.parentElement && modal.parentElement.id !== 'body' && !modal.parentElement.matches('body')) {
                console.log('Chat: Moving twoStepVerifyModal to body from:', modal.parentElement.id || modal.parentElement.tagName);
                document.body.appendChild(modal);
                // Also move the forgot modal if it exists
                if (forgotModal && forgotModal.parentElement && !forgotModal.parentElement.matches('body')) {
                    document.body.appendChild(forgotModal);
                }
            }

            // Remove any existing inline style first
            modal.removeAttribute('style');

            // Force visibility using cssText with !important
            modal.style.cssText = 'display: flex !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; z-index: 10100 !important; align-items: center !important; justify-content: center !important; visibility: visible !important; opacity: 1 !important;';

            // Also add active class
            modal.classList.add('active');

            console.log('Chat: Two-step verify modal shown, computed display:', window.getComputedStyle(modal).display);

            // Focus the password input
            setTimeout(() => {
                const input = document.getElementById('twoStepVerifyPassword');
                if (input) {
                    input.focus();
                    console.log('Chat: Focused password input');
                }
            }, 100);
        } else {
            console.error('Chat: twoStepVerifyModal element not found in DOM!');
        }
    },

    // Hide the two-step verification modal
    hideTwoStepVerifyModal() {
        const modal = document.getElementById('twoStepVerifyModal');
        if (modal) {
            modal.style.cssText = 'display: none !important;';
            modal.classList.remove('active');
            // Clear the password input
            const input = document.getElementById('twoStepVerifyPassword');
            if (input) input.value = '';
            // Hide error
            const error = document.getElementById('twoStepVerifyError');
            if (error) error.style.display = 'none';
        }
    },

    // Verify the two-step password
    async verifyTwoStepPasswordAction() {
        const password = document.getElementById('twoStepVerifyPassword')?.value;
        const error = document.getElementById('twoStepVerifyError');
        const btn = document.getElementById('twoStepVerifyBtn');
        const btnText = document.getElementById('twoStepVerifyBtnText');
        const spinner = btn?.querySelector('.btn-spinner');

        if (!password || password.length < 6) {
            if (error) {
                error.textContent = 'Please enter your security password (min 6 characters)';
                error.style.display = 'block';
            }
            return;
        }

        // Show loading state
        if (btnText) btnText.textContent = 'Verifying...';
        if (spinner) spinner.style.display = 'block';
        if (btn) btn.disabled = true;

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const userId = this.state.currentUser?.user_id;

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/security/two-step/verify?user_id=${userId}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ password })
                }
            );

            const data = await response.json();

            if (response.ok && data.verified) {
                // Success! Mark as verified for this session
                this.state.twoStepVerified = true;
                this.hideTwoStepVerifyModal();

                // Now proceed to open chat with the pending target user
                this.proceedToOpenChat(this.state.pendingTargetUser);
                this.showToast('Verification successful!', 'success');
            } else {
                // Wrong password
                if (error) {
                    error.textContent = 'Incorrect password. Please try again.';
                    error.style.display = 'block';
                }
                // Shake the input
                const input = document.getElementById('twoStepVerifyPassword');
                if (input) {
                    input.classList.add('error');
                    setTimeout(() => input.classList.remove('error'), 500);
                }
            }
        } catch (err) {
            console.error('Chat: Error verifying 2FA:', err);
            if (error) {
                error.textContent = 'Verification failed. Please try again.';
                error.style.display = 'block';
            }
        } finally {
            // Reset button state
            if (btnText) btnText.textContent = 'Verify & Continue';
            if (spinner) spinner.style.display = 'none';
            if (btn) btn.disabled = false;
        }
    },

    // Toggle password visibility in 2FA modal
    toggleTwoStepPasswordVisibility() {
        const input = document.getElementById('twoStepVerifyPassword');
        const eyeIcon = document.querySelector('.toggle-password-btn .eye-icon');
        const eyeOffIcon = document.querySelector('.toggle-password-btn .eye-off-icon');

        if (input && input.type === 'password') {
            input.type = 'text';
            if (eyeIcon) eyeIcon.style.display = 'none';
            if (eyeOffIcon) eyeOffIcon.style.display = 'block';
        } else if (input) {
            input.type = 'password';
            if (eyeIcon) eyeIcon.style.display = 'block';
            if (eyeOffIcon) eyeOffIcon.style.display = 'none';
        }
    },

    // Open forgot password flow
    forgotTwoStepPasswordAction() {
        const forgotModal = document.getElementById('forgotTwoStepModal');
        const recoveryEmailDisplay = document.getElementById('recoveryEmailDisplay');
        const noRecoveryEmail = document.getElementById('noRecoveryEmail');
        const step1 = document.getElementById('forgotStep1');

        // Reset to step 1
        document.getElementById('forgotStep1').style.display = 'block';
        document.getElementById('forgotStep2').style.display = 'none';
        document.getElementById('forgotStep3').style.display = 'none';

        // Use the user's actual email from their account (users table)
        const userEmail = this.state.currentUser?.email;
        if (userEmail) {
            // Mask the email (j***@gmail.com)
            const parts = userEmail.split('@');
            const maskedEmail = parts[0].charAt(0) + '***@' + parts[1];
            recoveryEmailDisplay.textContent = maskedEmail;
            recoveryEmailDisplay.parentElement.style.display = 'flex';
            noRecoveryEmail.style.display = 'none';
        } else {
            recoveryEmailDisplay.parentElement.style.display = 'none';
            noRecoveryEmail.style.display = 'block';
        }

        if (forgotModal) {
            // CRITICAL: Move modal to body so it's not inside the hidden chatModal
            if (forgotModal.parentElement && !forgotModal.parentElement.matches('body')) {
                console.log('Chat: Moving forgotTwoStepModal to body from:', forgotModal.parentElement.id || forgotModal.parentElement.tagName);
                document.body.appendChild(forgotModal);
            }
            // Show with proper styling to ensure visibility
            forgotModal.style.cssText = 'display: flex !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; z-index: 10101 !important; align-items: center !important; justify-content: center !important; visibility: visible !important; opacity: 1 !important;';
            forgotModal.classList.add('active');
        }
    },

    // Close forgot password modal
    closeForgotTwoStepModalAction() {
        const modal = document.getElementById('forgotTwoStepModal');
        if (modal) {
            modal.style.display = 'none';
            // Clear OTP inputs
            document.querySelectorAll('.otp-input').forEach(input => {
                input.value = '';
                input.classList.remove('filled', 'error');
            });
            // Clear password fields
            const newPass = document.getElementById('newTwoStepPassword');
            const confirmPass = document.getElementById('confirmNewTwoStepPassword');
            if (newPass) newPass.value = '';
            if (confirmPass) confirmPass.value = '';
        }
    },

    // Send reset code to user's account email
    async sendTwoStepResetCodeAction() {
        const btn = document.querySelector('#forgotStep1 .settings-action-btn');
        const btnText = document.getElementById('sendResetCodeBtnText');
        const spinner = btn?.querySelector('.btn-spinner');

        // Use user's actual email from their account
        const userEmail = this.state.currentUser?.email;
        if (!userEmail) {
            this.showToast('No email found for your account', 'error');
            return;
        }

        // Show loading
        if (btnText) btnText.textContent = 'Sending...';
        if (spinner) spinner.style.display = 'block';
        if (btn) btn.disabled = true;

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const userId = this.state.currentUser?.user_id;

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/security/two-step/forgot?user_id=${user_id}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Chat: Forgot password response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Chat: Forgot password response data:', data);

                // Move to step 2
                const step1 = document.getElementById('forgotStep1');
                const step2 = document.getElementById('forgotStep2');
                console.log('Chat: Step elements - step1:', step1, 'step2:', step2);

                if (step1) step1.style.display = 'none';
                if (step2) {
                    step2.style.display = 'block';
                    console.log('Chat: Step 2 now visible');
                }

                // Start resend countdown
                this.startResendCountdown();

                this.showToast('Reset code sent to your email!', 'success');
            } else {
                const data = await response.json();
                console.log('Chat: Forgot password error:', data);
                this.showToast(data.detail || 'Failed to send reset code', 'error');
            }
        } catch (err) {
            console.error('Chat: Error sending reset code:', err);
            this.showToast('Failed to send reset code', 'error');
        } finally {
            if (btnText) btnText.textContent = 'Send Reset Code';
            if (spinner) spinner.style.display = 'none';
            if (btn) btn.disabled = false;
        }
    },

    // Start resend countdown timer
    startResendCountdown() {
        const resendBtn = document.getElementById('resendCodeBtn');
        const countdown = document.getElementById('resendCountdown');
        const timer = document.getElementById('countdownTimer');

        if (resendBtn) resendBtn.style.display = 'none';
        if (countdown) countdown.style.display = 'inline';

        let seconds = 60;
        if (timer) timer.textContent = seconds;

        this.resendCountdownInterval = setInterval(() => {
            seconds--;
            if (timer) timer.textContent = seconds;

            if (seconds <= 0) {
                clearInterval(this.resendCountdownInterval);
                if (resendBtn) resendBtn.style.display = 'inline';
                if (countdown) countdown.style.display = 'none';
            }
        }, 1000);
    },

    // Reset two-step password with OTP
    async resetTwoStepPasswordAction() {
        // Get OTP from inputs
        const otpInputs = document.querySelectorAll('.otp-input');
        let otp = '';
        otpInputs.forEach(input => otp += input.value);

        const newPassword = document.getElementById('newTwoStepPassword')?.value;
        const confirmPassword = document.getElementById('confirmNewTwoStepPassword')?.value;
        const otpError = document.getElementById('otpError');
        const passwordError = document.getElementById('newPasswordError');

        // Validate
        if (otp.length !== 6) {
            if (otpError) {
                otpError.textContent = 'Please enter the 6-digit code';
                otpError.style.display = 'block';
            }
            otpInputs.forEach(input => input.classList.add('error'));
            return;
        }

        if (!newPassword || newPassword.length < 6) {
            if (passwordError) {
                passwordError.textContent = 'Password must be at least 6 characters';
                passwordError.style.display = 'block';
            }
            return;
        }

        if (newPassword !== confirmPassword) {
            if (passwordError) {
                passwordError.textContent = 'Passwords don\'t match';
                passwordError.style.display = 'block';
            }
            return;
        }

        // Hide errors
        if (otpError) otpError.style.display = 'none';
        if (passwordError) passwordError.style.display = 'none';

        const btn = document.querySelector('#forgotStep2 .settings-action-btn.primary');
        const btnText = document.getElementById('resetPasswordBtnText');
        const spinner = btn?.querySelector('.btn-spinner');

        // Show loading
        if (btnText) btnText.textContent = 'Resetting...';
        if (spinner) spinner.style.display = 'block';
        if (btn) btn.disabled = true;

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const userId = this.state.currentUser?.user_id;

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/security/two-step/reset?user_id=${user_id}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ otp, new_password: newPassword })
                }
            );

            if (response.ok) {
                // Success! Show step 3
                document.getElementById('forgotStep2').style.display = 'none';
                document.getElementById('forgotStep3').style.display = 'block';

                // Clear the countdown interval
                if (this.resendCountdownInterval) {
                    clearInterval(this.resendCountdownInterval);
                }

                // Update password input in verify modal
                const verifyInput = document.getElementById('twoStepVerifyPassword');
                if (verifyInput) verifyInput.value = newPassword;
            } else {
                const data = await response.json();
                if (otpError) {
                    otpError.textContent = data.detail || 'Invalid code. Please try again.';
                    otpError.style.display = 'block';
                }
                otpInputs.forEach(input => input.classList.add('error'));
            }
        } catch (err) {
            console.error('Chat: Error resetting password:', err);
            this.showToast('Failed to reset password', 'error');
        } finally {
            if (btnText) btnText.textContent = 'Reset Password';
            if (spinner) spinner.style.display = 'none';
            if (btn) btn.disabled = false;
        }
    },

    // Close chat completely (from 2FA modal X button)
    closeChatModalCompletely() {
        this.hideTwoStepVerifyModal();
        this.closeForgotTwoStepModalAction();
        // Reset pending state
        this.state.pendingTargetUser = null;
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

        // Stop message polling
        this.stopMessagePolling();

        // Stop last seen polling
        this.stopLastSeenPolling();

        // Disconnect WebSocket
        this.disconnectWebSocket();

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
        const userId = this.state.currentUser?.user_id;
        if (!userId) return '';
        return `user_id=${userId}`;
    },

    // Load Conversations from API
    async loadConversations(filterType = 'all') {
        const loadingEl = document.getElementById('chatContactsLoading');
        const listEl = document.getElementById('chatContactsList');

        try {
            // Show loading
            if (loadingEl) loadingEl.style.display = 'flex';

            if (!this.state.currentUser) {
                console.warn('Chat: No current profile, loading user first');
                await this.loadCurrentUser();
            }

            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();

            // Don't proceed if we still don't have a user ID
            if (!profileParams) {
                console.error('Chat: Cannot load conversations - no user ID available');
                return;
            }

            console.log('Chat: API Request - profile params:', profileParams);
            console.log('Chat: API Request - currentUser:', this.state.currentUser);

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
        if (!this.state.currentUser) return;

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) return;

        try {
            const userId = this.state.currentUser.user_id;

            let url = `${this.API_BASE_URL}/api/chat/contacts?user_id=${userId}`;
            if (search) {
                url += `&search=${encodeURIComponent(search)}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load contacts: ${response.status}`);
            }

            const data = await response.json();
            this.state.contacts = data.contacts || [];

            console.log('Chat: Loaded', this.state.contacts.length, 'contacts');

            // Render contacts if we're in contacts tab
            const activeTab = document.querySelector('#chatTabButtons .active');
            if (activeTab && activeTab.dataset.tab === 'contacts') {
                this.renderContacts();
            }

        } catch (error) {
            console.error('Chat: Failed to load contacts:', error);
        }
    },

    
    async loadConnectionRequests() {
        if (!this.state.currentUser) {
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

                // Switch to All filter to show the newly accepted contact
                this.switchToAllFilter();
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

        // Update global mute indicators after rendering contacts
        this.updateGlobalMuteIndicators();
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
    async showRequestInChatArea(req, direction) {
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

        // Check if the OTHER party allows messages from everyone
        // For both directions, check the other party's who_can_message setting
        // This allows messaging before the connection is accepted if the other party allows everyone
        let otherPartyAllowsEveryone = await this.checkRecipientAllowsEveryone(req.profile_id, req.profile_type);

        // Show request message in chat area
        const chatArea = document.getElementById('chatArea');
        if (chatArea) {
            if (direction === 'received') {
                // Received request - show Accept/Decline buttons
                // If the requester allows everyone, also show that we can message them
                const canMessageNote = otherPartyAllowsEveryone
                    ? `<p style="margin: 16px 0 0 0; color: var(--accent-color); font-size: 0.85rem;">You can also message them before accepting.</p>`
                    : '';

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
                        ${canMessageNote}
                    </div>
                `;
            } else {
                // Sent request - show different message based on recipient's settings
                if (otherPartyAllowsEveryone) {
                    chatArea.innerHTML = `
                        <div class="date-divider"><span>Request Sent</span></div>
                        <div class="request-message" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center;">
                            <img src="${avatarUrl}" alt="${displayName}" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 16px; object-fit: cover;">
                            <h3 style="margin: 0 0 8px 0; color: var(--text-primary);">${displayName}</h3>
                            <p style="margin: 0 0 8px 0; color: var(--text-muted);">${profileType}</p>
                            <p style="margin: 0 0 16px 0; color: var(--text-secondary);">Connection request sent</p>
                            <p style="margin: 0; color: var(--accent-color); font-size: 0.9rem;">You can start messaging while waiting for them to accept.</p>
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
        }

        // Clear selected chat state (this is a request, not a conversation)
        this.state.selectedChat = null;
        this.state.selectedConversation = null;

        // Store request info for potential messaging (for both directions if other party allows everyone)
        this.state.pendingRequestRecipient = otherPartyAllowsEveryone ? {
            profile_id: req.profile_id,
            profile_type: req.profile_type,
            user_id: req.user_id,
            display_name: displayName,
            avatar: avatarUrl,
            allows_everyone: otherPartyAllowsEveryone
        } : null;

        // Handle chat input based on whether the other party allows everyone
        const inputWrapper = document.getElementById('chatInputWrapper');
        const messageInput = document.getElementById('chatMessageInput');
        const sendButton = document.getElementById('chatSendBtn');

        if (inputWrapper) {
            inputWrapper.style.display = 'block';

            if (otherPartyAllowsEveryone) {
                // Other party allows everyone - ENABLE input for messaging (both directions)
                if (messageInput) {
                    messageInput.disabled = false;
                    messageInput.placeholder = 'Type a message...';
                    messageInput.style.opacity = '1';
                    messageInput.style.cursor = 'text';
                }
                if (sendButton) {
                    sendButton.disabled = false;
                    sendButton.style.opacity = '1';
                    sendButton.style.cursor = 'pointer';
                }
                const inputButtons = inputWrapper.querySelectorAll('button:not(#chatSendBtn)');
                inputButtons.forEach(btn => {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                });
            } else {
                // Disable the input - other party only accepts connections
                if (messageInput) {
                    messageInput.disabled = true;
                    messageInput.placeholder = direction === 'received'
                        ? 'Accept the request to start messaging...'
                        : 'Waiting for request to be accepted...';
                    messageInput.style.opacity = '0.6';
                    messageInput.style.cursor = 'not-allowed';
                }
                if (sendButton) {
                    sendButton.disabled = true;
                    sendButton.style.opacity = '0.5';
                    sendButton.style.cursor = 'not-allowed';
                }
                const inputButtons = inputWrapper.querySelectorAll('button:not(#chatSendBtn)');
                inputButtons.forEach(btn => {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                });
            }
        }

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
        // Set category based on conversation type
        let category = 'personal';
        if (conv.type === 'channel') {
            category = 'channels';
        } else if (conv.type === 'group') {
            category = 'groups';
        }
        div.dataset.category = category;

        // Use display_name from API or fallback to name
        const displayName = conv.display_name || conv.name || 'Unknown';
        const avatarUrl = conv.avatar || conv.avatar_url;

        // Different default avatar icons for groups vs channels
        const isGroupOrChannel = conv.type === 'group' || conv.type === 'channel';
        const defaultIcon = conv.type === 'channel' ? '&#128266;' : '&#128101;'; // 📢 for channel, 👥 for group

        const avatarHtml = avatarUrl
            ? `<img src="${avatarUrl}" alt="${displayName}" class="contact-avatar">`
            : `<div class="contact-avatar" style="background: linear-gradient(135deg, var(--button-bg), var(--button-hover)); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem;">${isGroupOrChannel ? defaultIcon : displayName.charAt(0)}</div>`;

        // Determine online status (respecting privacy)
        const isOnline = conv.is_online && !conv.online_hidden;
        const statusClass = isOnline ? 'online' : 'offline';

        // Get last message text
        let lastMsgText = conv.last_message?.content || conv.last_message || 'No messages yet';
        // Strip [Forwarded from ...] prefix from sidebar preview
        if (typeof lastMsgText === 'string') {
            lastMsgText = lastMsgText.replace(/^\[Forwarded from [^\]]+\]\s*/i, '').trim() || lastMsgText;
        }
        if (conv.is_connection || conv.is_family || conv.is_tutor_contact || conv.is_enrolled) {
            lastMsgText = 'Tap to start chatting';
        }

        // Role/participant count for display
        let roleText = conv.type === 'group'
            ? `${conv.participant_count || 0} members`
            : (conv.other_profile_type ? this.capitalizeFirst(conv.other_profile_type) : conv.role || '');

        // Add last seen info for direct conversations (not hidden by privacy)
        // RULES:
        // 1. If online: show "Online" text in top-right corner
        // 2. If offline AND has last_seen: show "10 hours ago" in top-right (without "Last seen" prefix)
        // 3. If never logged in (no last_seen): DON'T show anything
        let lastSeenText = '';
        if (conv.type !== 'group' && conv.type !== 'channel') {
            if (isOnline) {
                // User is online - show "Online" text in top-right
                lastSeenText = '<span class="contact-last-seen online">Online</span>';
            } else if (!conv.last_seen_hidden && conv.last_seen) {
                // Check if last_seen is within reasonable range (30 days)
                // Older data is likely stale from testing and shouldn't be shown
                const lastSeenDate = new Date(conv.last_seen);
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

                if (lastSeenDate > thirtyDaysAgo) {
                    // User is offline - show last seen time in top-right (e.g., "10 hours ago")
                    lastSeenText = `<span class="contact-last-seen">${this.formatTimeAgo(conv.last_seen)}</span>`;
                }
                // If older than 30 days, don't show (likely stale test data)
            }
            // If last_seen is null/undefined (never logged in), lastSeenText stays empty
        }

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
        } else if (conv.is_parent_invitation && conv.relationship) {
            // Parent invitation badge (purple for co-parent, teal for received)
            const badgeColor = conv.invitation_direction === 'sent'
                ? (conv.request_status === 'pending'
                    ? 'background: linear-gradient(135deg, #8b5cf6, #7c3aed);'
                    : 'background: linear-gradient(135deg, #10b981, #059669);')
                : (conv.request_status === 'pending'
                    ? 'background: linear-gradient(135deg, #ec4899, #db2777);'
                    : 'background: linear-gradient(135deg, #10b981, #059669);');
            relationshipBadge = `<span class="parent-invitation-badge" style="display: inline-block; margin-left: 0.5rem; padding: 0.1rem 0.4rem; ${badgeColor} color: white; border-radius: 4px; font-size: 0.65rem; font-weight: 600;">${conv.relationship}</span>`;
        } else if (conv.is_child_invitation && conv.relationship) {
            // Child invitation badge (cyan for child invitation)
            const badgeColor = conv.invitation_direction === 'sent'
                ? (conv.request_status === 'pending'
                    ? 'background: linear-gradient(135deg, #06b6d4, #0891b2);'
                    : 'background: linear-gradient(135deg, #10b981, #059669);')
                : (conv.request_status === 'pending'
                    ? 'background: linear-gradient(135deg, #f97316, #ea580c);'
                    : 'background: linear-gradient(135deg, #10b981, #059669);');
            relationshipBadge = `<span class="child-invitation-badge" style="display: inline-block; margin-left: 0.5rem; padding: 0.1rem 0.4rem; ${badgeColor} color: white; border-radius: 4px; font-size: 0.65rem; font-weight: 600;">${conv.relationship}</span>`;
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
                <span class="status-indicator ${statusClass}"${conv.online_hidden ? ' style="display: none;"' : ''}></span>
            </div>
            <div class="contact-info">
                <div class="contact-header">
                    <h4>${displayName}${relationshipBadge}</h4>
                    ${lastSeenText}
                </div>
                <span class="contact-role">${roleText}</span>
                <div class="contact-preview">
                    <p class="last-message">${typeof lastMsgText === 'string' ? lastMsgText : 'No messages yet'}</p>
                    ${conv.unread_count > 0 ? `<span class="unread-count">${conv.unread_count}</span>` : ''}
                </div>
            </div>
        `;

        div.addEventListener('click', () => {
            // In forward mode, toggle forward selection
            if (this.state.isForwardMode) {
                this.toggleForwardContact(conv);
            }
            // In multi-select mode, toggle selection instead of opening conversation
            else if (this.state.isMultiSelectMode) {
                this.toggleContactSelection(conv);
            } else {
                this.selectConversation(conv);
            }
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
        let roleText = '';
        if (conv.type === 'channel') {
            roleText = `${conv.participant_count || 0} subscribers`;
        } else if (conv.type === 'group') {
            roleText = `${conv.participant_count || 0} members`;
        } else {
            roleText = conv.other_profile_type ? this.capitalizeFirst(conv.other_profile_type) : conv.role || '';
        }

        this.updateChatHeader({
            ...conv,
            name: conv.display_name || conv.name,
            avatar: conv.avatar || conv.avatar_url,
            role: roleText
        });

        // Load messages (or show empty chat for new connections/family members/tutor contacts/enrolled contacts/invitations)
        // Check if this is a synthetic conversation (not a real database conversation)
        const isSyntheticConversation = this.isSyntheticConversation(conv);

        if (isSyntheticConversation) {
            // Show the "Say Hello" empty state
            this.showEmptyConversation(conv);
        } else {
            // This is a real conversation - load messages
            this.loadMessages(conv.id);
        }

        // Update info panel
        this.updateInfoPanel(conv);

        // Load polls for this conversation
        if (!isSyntheticConversation) {
            this.loadConversationPolls();
        }

        // Load pinned messages for groups/channels
        if (!isSyntheticConversation && (conv.type === 'group' || conv.type === 'channel')) {
            this.loadPinnedMessages();
        } else {
            // Hide pinned messages section for direct chats
            const pinnedSection = document.getElementById('chatPinnedMessages');
            if (pinnedSection) pinnedSection.style.display = 'none';
        }

        // Show and re-enable chat input wrapper (may have been disabled by request view)
        const inputWrapper = document.getElementById('chatInputWrapper');
        const messageInput = document.getElementById('chatMessageInput');
        const sendButton = document.getElementById('chatSendBtn');

        if (inputWrapper) {
            inputWrapper.style.display = 'block';

            // Re-enable the input (may have been disabled by request view)
            if (messageInput) {
                messageInput.disabled = false;
                messageInput.placeholder = 'Type a message...';
                messageInput.style.opacity = '1';
                messageInput.style.cursor = 'text';
            }

            // Re-enable send button
            if (sendButton) {
                sendButton.disabled = false;
                sendButton.style.opacity = '1';
                sendButton.style.cursor = 'pointer';
            }

            // Re-enable other input buttons
            const inputButtons = inputWrapper.querySelectorAll('button:not(#chatSendBtn)');
            inputButtons.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            });
        }

        // Check channel posting restrictions (only creator can post in channels)
        this.updateChannelInputRestriction(conv);

        // Check if contact is blocked and show appropriate UI
        this.checkBlockedStatus();

        // Check and apply screenshot protection for direct conversations
        if (conv.type === 'direct' && conv.other_profile_id && conv.other_profile_type) {
            this.applyScreenshotProtection(conv.other_profile_id, conv.other_profile_type);
        } else {
            // Remove protection for groups/channels
            this.removeScreenshotProtection();
        }

        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            this.toggleSidebar();
        }

        // Start polling for new messages (real-time updates)
        this.startMessagePolling();
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
                        participant_user_ids: [conn.other_user_id]  // Backend expects array of user IDs
                    })
                }
            );

            if (response.ok) {
                const data = await response.json();
                const conversationId = data.conversation?.id;
                console.log('Chat: Created conversation from connection:', conversationId);

                if (!conversationId) {
                    console.error('Chat: No conversation ID in response:', data);
                    return null;
                }

                // Update the connection in our state to be a real conversation
                const idx = this.state.conversations.findIndex(c => c.id === conn.id);
                if (idx >= 0) {
                    this.state.conversations[idx].id = conversationId;
                    this.state.conversations[idx].is_connection = false;

                    // Update the DOM element
                    const el = document.querySelector(`[data-conversation-id="${conn.id}"]`);
                    if (el) {
                        el.dataset.conversationId = conversationId;
                    }
                }

                return { id: conversationId, existing: data.message?.includes('Existing') };
            }
        } catch (error) {
            console.log('Chat: Could not create conversation:', error.message);
        }
        return null;
    },

    // Create a conversation with a pending request recipient (for calling/messaging before connection accepted)
    async createConversationWithPendingRecipient() {
        const pendingRecipient = this.state.pendingRequestRecipient;
        if (!pendingRecipient) return null;

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const userId = this.state.currentUser?.user_id;

            if (!token || !this.state.currentUser) return null;

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/conversations?user_id=${userId}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: 'direct',
                        participant_user_ids: [pendingRecipient.user_id]  // Backend expects array of user IDs
                    })
                }
            );

            if (response.ok) {
                const data = await response.json();
                const conversationId = data.conversation?.id;
                console.log('Chat: Created conversation with pending recipient:', conversationId);

                if (!conversationId) {
                    console.error('Chat: No conversation ID in response:', data);
                    return null;
                }

                // Update state
                this.state.selectedChat = conversationId;
                this.state.selectedConversation = {
                    id: conversationId,
                    type: 'direct',
                    display_name: pendingRecipient.display_name,
                    avatar: pendingRecipient.avatar,
                    other_profile_id: pendingRecipient.profile_id,
                    other_profile_type: pendingRecipient.profile_type,
                    other_user_id: pendingRecipient.user_id
                };

                // Clear pending recipient
                this.state.pendingRequestRecipient = null;

                return { id: conversationId, existing: data.message?.includes('Existing') };
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.log('Chat: Could not create conversation with pending recipient:', errorData.detail);
            }
        } catch (error) {
            console.log('Chat: Error creating conversation with pending recipient:', error.message);
        }
        return null;
    },

    // Show empty conversation state for new connections or strangers
    showEmptyConversation(conv) {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        const displayName = conv.display_name || conv.name || 'User';
        const avatarUrl = conv.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=F59E0B&color=fff`;
        const safeName = displayName.replace(/'/g, "\\'");
        const profileType = this.capitalizeFirst(conv.other_profile_type || 'User');

        // Check if this is a stranger who only allows connections to message
        const isStrangerConnectionsOnly = conv.is_stranger && conv.recipient_allows_everyone === false;

        if (isStrangerConnectionsOnly) {
            // Show "You need to connect first" view with Connect button
            chatArea.innerHTML = `
                <div class="new-conversation-start" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; height: 100%;">
                    <img src="${avatarUrl}" alt="${displayName}" style="width: 100px; height: 100px; border-radius: 50%; margin-bottom: 20px; object-fit: cover; border: 3px solid var(--border-color);">
                    <h3 style="margin: 0 0 8px 0; color: var(--text-primary); font-size: 1.3rem;">${displayName}</h3>
                    <p style="margin: 0 0 8px 0; color: var(--text-muted); font-size: 0.9rem;">${profileType}</p>
                    <div style="display: flex; align-items: center; gap: 8px; margin: 16px 0; padding: 12px 20px; background: var(--warning-bg, #fef3c7); border-radius: 8px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span style="color: #92400e; font-size: 0.95rem;">You need to connect first</span>
                    </div>
                    <p style="margin: 0 0 24px 0; color: var(--text-muted); font-size: 0.9rem;">This user only accepts messages from connections.</p>
                    <div style="display: flex; gap: 12px;">
                        <button onclick="ChatModalManager.sendConnectionRequestFromChat(${conv.other_profile_id}, '${conv.other_profile_type}', '${safeName}')"
                                style="padding: 12px 24px; background: var(--button-bg); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 8px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                            Connect
                        </button>
                    </div>
                </div>
            `;

            // Also disable the input for strangers with connections-only setting
            this.disableChatInput('Connect to start messaging...');
        } else {
            // Normal "Say Hello" view for connections or strangers who allow everyone
            const messageText = conv.is_stranger
                ? 'Start a conversation with this user.'
                : "You're now connected! Start a conversation.";

            chatArea.innerHTML = `
                <div class="new-conversation-start" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; height: 100%;">
                    <img src="${avatarUrl}" alt="${displayName}" style="width: 100px; height: 100px; border-radius: 50%; margin-bottom: 20px; object-fit: cover; border: 3px solid var(--button-bg);">
                    <h3 style="margin: 0 0 8px 0; color: var(--text-primary); font-size: 1.3rem;">${displayName}</h3>
                    <p style="margin: 0 0 8px 0; color: var(--button-bg); font-size: 0.9rem;">${profileType}</p>
                    <p style="margin: 0 0 24px 0; color: var(--text-muted); font-size: 0.95rem;">${messageText}</p>
                    <div style="display: flex; gap: 12px;">
                        <button onclick="ChatModalManager.sayHello('${safeName}')" style="padding: 12px 24px; background: var(--button-bg); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                            Say Hello
                        </button>
                    </div>
                </div>
            `;
        }
    },

    // Disable chat input with a custom placeholder
    disableChatInput(placeholder) {
        const inputWrapper = document.getElementById('chatInputWrapper');
        const messageInput = document.getElementById('chatMessageInput');
        const sendButton = document.getElementById('chatSendBtn');

        if (inputWrapper) {
            inputWrapper.style.display = 'block';

            if (messageInput) {
                messageInput.disabled = true;
                messageInput.placeholder = placeholder;
                messageInput.style.opacity = '0.6';
                messageInput.style.cursor = 'not-allowed';
            }

            if (sendButton) {
                sendButton.disabled = true;
                sendButton.style.opacity = '0.5';
                sendButton.style.cursor = 'not-allowed';
            }

            const inputButtons = inputWrapper.querySelectorAll('button:not(#chatSendBtn)');
            inputButtons.forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            });
        }
    },

    // Send connection request from chat modal (for strangers)
    async sendConnectionRequestFromChat(recipientUserId, displayName) {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const userId = this.state.currentUser?.user_id;

        if (!token || !userId) {
            this.showToast('Please log in to send connection requests', 'error');
            return;
        }

        try {
            const response = await fetch(
                `${this.API_BASE_URL}/api/connections`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        recipient_id: recipientUserId,
                        recipient_type: 'student',  // Default, could be dynamic based on recipient
                        requester_type: this.state.currentUser?.role || 'student'
                    })
                }
            );

            if (response.ok) {
                this.showToast(`Connection request sent to ${displayName}!`, 'success');
                // Reload conversations to show the new pending request
                await this.loadConversations();
            } else {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.detail?.includes('already exists')) {
                    this.showToast('Connection request already sent', 'info');
                } else {
                    this.showToast(errorData.detail || 'Failed to send request', 'error');
                }
            }
        } catch (error) {
            console.error('[Chat] Error sending connection request:', error);
            this.showToast('Failed to send connection request', 'error');
        }
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
        const nameLink = document.getElementById('chatUserNameLink');
        const role = document.getElementById('chatUserRole');
        const lastSeen = document.getElementById('chatLastSeen');
        const onlineIndicator = document.getElementById('chatUserOnlineIndicator');

        if (avatar) {
            avatar.src = conv.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(conv.name);
        }
        if (name) name.textContent = conv.name;

        // Set profile link based on profile type
        if (nameLink) {
            const profileType = conv.other_profile_type || conv.profile_type || '';
            const profileId = conv.other_profile_id || conv.profile_id || '';

            if (profileType && profileId) {
                let viewPage = '';
                switch (profileType.toLowerCase()) {
                    case 'tutor':
                        viewPage = `/view-profiles/view-tutor.html?id=${profileId}`;
                        break;
                    case 'student':
                        viewPage = `/view-profiles/view-student.html?id=${profileId}`;
                        break;
                    case 'parent':
                        viewPage = `/view-profiles/view-parent.html?id=${profileId}`;
                        break;
                    case 'advertiser':
                        viewPage = `/view-profiles/view-advertiser.html?id=${profileId}`;
                        break;
                    default:
                        viewPage = '';
                }

                if (viewPage) {
                    nameLink.href = viewPage;
                    nameLink.style.pointerEvents = 'auto';
                    nameLink.title = `View ${this.capitalizeFirst(profileType)} Profile`;
                } else {
                    nameLink.href = '#';
                    nameLink.style.pointerEvents = 'none';
                    nameLink.title = '';
                }
            } else {
                nameLink.href = '#';
                nameLink.style.pointerEvents = 'none';
                nameLink.title = '';
            }
        }
        if (role) role.textContent = conv.role;
        if (lastSeen) {
            if (conv.is_online) {
                lastSeen.textContent = 'Online';
                lastSeen.classList.add('online');
            } else if (conv.last_seen_hidden) {
                // User's privacy settings hide last seen
                lastSeen.textContent = '';
                lastSeen.classList.remove('online');
            } else if (conv.last_seen) {
                // Use actual last_seen from API (when user was last active)
                lastSeen.textContent = `Last seen ${this.formatTimeAgo(conv.last_seen)}`;
                lastSeen.classList.remove('online');
            } else {
                lastSeen.textContent = 'Last seen recently';
                lastSeen.classList.remove('online');
            }
        }
        if (onlineIndicator) {
            if (conv.online_hidden) {
                // User's privacy settings hide online status
                onlineIndicator.style.display = 'none';
            } else {
                onlineIndicator.style.display = 'block';
                onlineIndicator.style.background = conv.is_online ? '#10b981' : '#6b7280';
            }
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

        // Get location element
        const locationEl = document.getElementById('chatInfoLocation');

        // Set defaults from conversation object first
        const convName = conv.display_name || conv.name || 'Unknown User';
        if (avatar) avatar.src = conv.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(convName);
        if (name) name.textContent = convName;
        if (role) role.textContent = conv.role || 'User';
        if (lastSeen) {
            if (conv.is_online && !conv.online_hidden) {
                lastSeen.textContent = 'Online now';
                lastSeen.classList.add('online');
            } else if (conv.last_seen_hidden) {
                // User's privacy settings hide last seen
                lastSeen.textContent = '';
                lastSeen.style.display = 'none';
            } else if (conv.last_seen) {
                // Use actual last_seen from API (when user was last active)
                lastSeen.textContent = `Last seen ${this.formatTimeAgo(conv.last_seen)}`;
                lastSeen.style.display = 'block';
                lastSeen.classList.remove('online');
            } else {
                lastSeen.textContent = 'Last seen recently';
                lastSeen.style.display = 'block';
                lastSeen.classList.remove('online');
            }
        }
        if (quote) quote.textContent = conv.quote || 'No quote available';

        // Set default location (always show, will be updated if API returns location)
        if (locationEl) {
            locationEl.style.display = 'inline-flex';
            const valueEl = locationEl.querySelector('.info-value');
            if (valueEl) valueEl.textContent = 'Not set yet';
        }

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

                    // Name: full_name -> username -> convName fallback
                    const displayName = profileData.full_name || profileData.username || convName;
                    if (displayName && name) {
                        name.textContent = displayName;
                    }

                    if (profileData.quote && quote) {
                        quote.textContent = profileData.quote;
                    }

                    // Location from profile (update if exists, otherwise keeps "Not set yet")
                    if (profileData.location && locationEl) {
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

        // Update info panel action buttons state
        this.updateInfoPanelActions();
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

                    // Preserve local call cards before replacing messages
                    const existingMessages = this.state.messages[conversationId] || [];
                    const localCallCards = existingMessages.filter(msg => msg.isLocalCallCard);

                    // Transform API messages to expected format
                    this.state.messages[conversationId] = (data.messages || []).map(msg => ({
                        id: msg.id,
                        text: msg.content,
                        content: msg.content,
                        message_type: msg.message_type,
                        sender_id: msg.sender_profile_id,
                        sender_profile_id: msg.sender_profile_id,  // For forwarding privacy check
                        sender_profile_type: msg.sender_profile_type,  // For forwarding privacy check
                        sender_name: msg.sender_name || 'User',
                        avatar: msg.sender_avatar,
                        time: msg.created_at,
                        sent: msg.is_mine,
                        is_mine: msg.is_mine,
                        status: msg.status || (msg.is_mine ? 'sent' : null),  // read status from API
                        reply_to: msg.reply_to,
                        reactions: msg.reactions,
                        is_edited: msg.is_edited,
                        is_pinned: msg.is_pinned,  // Pinned message status
                        media_url: msg.media_url,
                        media_metadata: msg.media_metadata,
                        // Session request specific fields from API
                        package_details: msg.package_details,
                        session_request_status: msg.session_request_status,
                        // Requested student info (when parent requests for child)
                        requested_to_id: msg.requested_to_id,
                        requested_to_name: msg.requested_to_name,
                        requested_to_avatar: msg.requested_to_avatar,
                        // Forwarded message fields
                        is_forwarded: msg.is_forwarded,
                        forwarded_from: msg.forwarded_from,
                        forwarded_from_avatar: msg.forwarded_from_avatar,
                        forwarded_from_profile_id: msg.forwarded_from_profile_id,
                        forwarded_from_profile_type: msg.forwarded_from_profile_type
                    }));

                    // Fetch call logs from database
                    try {
                        const callLogsResponse = await fetch(
                            `${this.API_BASE_URL}/api/call-logs/${conversationId}?${profileParams}`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${token}`
                                }
                            }
                        );

                        if (callLogsResponse.ok) {
                            const callLogsData = await callLogsResponse.json();

                            // Transform call logs to call card format
                            const callCards = (callLogsData.call_logs || []).map(log => ({
                                id: `call-log-${log.id}`,
                                message_type: 'call',
                                type: 'call',
                                sent: log.is_caller,
                                is_mine: log.is_caller,
                                time: log.started_at,
                                isLocalCallCard: false,  // From database, not local
                                media_metadata: {
                                    call_type: log.call_type,
                                    status: log.status,
                                    duration_seconds: log.duration_seconds
                                }
                            }));

                            // Add call cards to messages
                            if (callCards.length > 0) {
                                this.state.messages[conversationId].push(...callCards);
                                console.log('Chat: Loaded', callCards.length, 'call logs from database');
                            }
                        }
                    } catch (callLogsError) {
                        console.log('Chat: Could not load call logs:', callLogsError.message);
                    }

                    // Re-add local call cards that haven't been persisted yet
                    if (localCallCards.length > 0) {
                        this.state.messages[conversationId].push(...localCallCards);
                        console.log('Chat: Restored', localCallCards.length, 'local call cards');
                    }

                    // Sort all messages by time (messages, call logs, local cards)
                    this.state.messages[conversationId].sort((a, b) => {
                        const timeA = new Date(a.time).getTime();
                        const timeB = new Date(b.time).getTime();
                        return timeA - timeB;
                    });

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

        // Clear chat area
        chatArea.innerHTML = '';

        // Track last date to add date dividers
        let lastDateStr = null;

        // Render each message with date dividers
        messages.forEach(msg => {
            const msgDate = new Date(msg.time || msg.created_at);
            const dateStr = this.formatDateForDivider(msgDate);

            // Add date divider if date changed
            if (dateStr !== lastDateStr) {
                const divider = document.createElement('div');
                divider.className = 'date-divider';
                divider.innerHTML = `<span>${dateStr}</span>`;
                chatArea.appendChild(divider);
                lastDateStr = dateStr;
            }

            this.displayMessage(msg);
        });

        // If no messages, show today's divider
        if (messages.length === 0) {
            chatArea.innerHTML = `
                <div class="date-divider">
                    <span>Today</span>
                </div>
            `;
        }

        // Re-add typing indicators at the end of chat area
        this.addTypingIndicators();

        // Scroll to bottom
        this.scrollToBottom();

        // Apply auto-translation if enabled
        this.applyAutoTranslationIfEnabled();
    },

    // Apply auto-translation if the setting is enabled
    async applyAutoTranslationIfEnabled() {
        // Check if auto-translate is enabled and a language is set
        const autoTranslateEnabled = this.state.autoTranslateEnabled ||
                                     this.state.chatSettings?.auto_translate;
        const targetLanguage = this.state.translateLanguage ||
                              this.state.chatSettings?.default_translation;

        if (autoTranslateEnabled && targetLanguage && targetLanguage !== 'none') {
            console.log('[Chat] Auto-translating messages to:', targetLanguage);
            await this.translateAllMessages(targetLanguage);
        }
    },

    // Format date for date divider
    formatDateForDivider(date) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        if (msgDay.getTime() === today.getTime()) {
            return 'Today';
        } else if (msgDay.getTime() === yesterday.getTime()) {
            return 'Yesterday';
        } else {
            // Format as "Dec 20, 2025"
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        }
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

    // Check if current user is the channel creator (only creators can post in channels)
    isChannelCreator(conv) {
        if (!conv || conv.type !== 'channel') return true; // Not a channel, allow posting

        const userId = this.state.currentUser?.user_id;
        if (!this.state.currentUser) return false;

        // Check if current user is the creator
        const isCreator = String(conv.created_by_profile_id) === String(userId) &&
                         conv.created_by_user_id === userId;

        console.log('Chat: Channel creator check:', {
            convCreator: { user_id: conv.created_by_user_id },
            currentUser: { user_id: userId },
            isCreator
        });

        return isCreator;
    },

    // Check if current user is admin in the conversation (for both groups and channels)
    isCurrentUserAdmin(conv) {
        if (!conv) return false;

        // For channels, check if user is the creator
        if (conv.type === 'channel') {
            return this.isChannelCreator(conv);
        }

        // For groups, we need to check participants
        // If we have cached participant data, use it
        if (conv.participants && Array.isArray(conv.participants)) {
            const userId = this.state.currentUser?.user_id;
            if (!this.state.currentUser) return false;
            return conv.participants.some(p =>
                String(p.profile_id) === String(userId) &&
                p.profile_type === null &&
                p.role === 'admin'
            );
        }

        // Fallback: Check if user is the creator (created_by fields)
        const userId = this.state.currentUser?.user_id;
        if (!this.state.currentUser) return false;

        return String(conv.created_by_profile_id) === String(userId) &&
               conv.created_by_profile_type === null;
    },

    // Update input area for channel restrictions
    updateChannelInputRestriction(conv) {
        const inputWrapper = document.getElementById('chatInputWrapper');
        const messageInput = document.getElementById('chatMessageInput');
        const sendButton = document.querySelector('#chatInputWrapper button[onclick*="sendMessage"]');
        const inputArea = document.querySelector('.chat-input-area');

        // Remove any existing channel restriction message
        const existingRestriction = document.getElementById('channelRestrictionMessage');
        if (existingRestriction) existingRestriction.remove();

        // If not a channel, ensure input is enabled
        if (!conv || conv.type !== 'channel') {
            if (messageInput) {
                messageInput.disabled = false;
                messageInput.placeholder = 'Type a message...';
            }
            if (sendButton) {
                sendButton.disabled = false;
                sendButton.style.opacity = '1';
                sendButton.style.cursor = 'pointer';
            }
            if (inputArea) inputArea.style.display = 'flex';
            return;
        }

        // It's a channel - check if user is the creator
        const canPost = this.isChannelCreator(conv);

        if (!canPost) {
            // User cannot post - hide input and show restriction message
            if (inputArea) inputArea.style.display = 'none';

            // Add restriction message
            if (inputWrapper) {
                const restrictionMsg = document.createElement('div');
                restrictionMsg.id = 'channelRestrictionMessage';
                restrictionMsg.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                    background: var(--bg-tertiary, #f3f4f6);
                    border-top: 1px solid var(--border-color, #e5e7eb);
                    color: var(--text-secondary, #6b7280);
                    font-size: 0.875rem;
                    gap: 8px;
                `;
                restrictionMsg.innerHTML = `
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 00-8 0v4h8z"/>
                    </svg>
                    <span>Only the channel creator can post messages</span>
                `;
                inputWrapper.insertBefore(restrictionMsg, inputWrapper.firstChild);
            }

            if (messageInput) {
                messageInput.disabled = true;
                messageInput.placeholder = 'Only channel creator can post';
            }
            if (sendButton) {
                sendButton.disabled = true;
                sendButton.style.opacity = '0.5';
                sendButton.style.cursor = 'not-allowed';
            }
        } else {
            // User is the creator - enable input
            if (inputArea) inputArea.style.display = 'flex';
            if (messageInput) {
                messageInput.disabled = false;
                messageInput.placeholder = 'Broadcast to your channel...';
            }
            if (sendButton) {
                sendButton.disabled = false;
                sendButton.style.opacity = '1';
                sendButton.style.cursor = 'pointer';
            }
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
        div.className = `message ${msg.sent ? 'sent' : 'received'}${msg.is_pinned ? ' pinned' : ''}`;
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
        } else if (msg.message_type === 'call' || msg.type === 'call') {
            // Handle call message type with call card - NO bubble wrapper
            html += this.renderCallCard(msg);
            html += `<span class="message-time-inline">${this.formatTime(msg.time)}</span>`;
            html += '</div>';
        } else {
            // Regular messages get the bubble wrapper
            html += '<div class="message-bubble">';

            // Add pinned indicator if message is pinned
            if (msg.is_pinned) {
                html += '<span class="pinned-indicator"><i class="fas fa-thumbtack"></i></span>';
            }

            // Check for forwarded message - either new format (is_forwarded flag) or old format ([Forwarded from ...] in content)
            const messageContent = msg.text || msg.content || '';
            const oldForwardMatch = messageContent.match(/^\[Forwarded from ([^\]]+)\]/i);
            const isForwardedMessage = msg.is_forwarded || msg.forwarded_from || oldForwardMatch;

            // Add forwarded message header if this is a forwarded message
            if (isForwardedMessage) {
                // For old-style messages, extract the original sender from the prefix
                let originalSenderName = msg.forwarded_from || (oldForwardMatch ? oldForwardMatch[1] : 'Unknown');
                let originalAvatar = msg.forwarded_from_avatar || '';

                // Check if the original sender is the current user using profile_id (most reliable)
                // Only show "You" if: 1) I sent this forwarded message, AND 2) the original sender is me
                const userId = this.state.currentUser?.user_id;
                const currentUser = this.state.currentUser;
                const isMySentMessage = msg.sent || msg.is_mine;

                // Compare using profile_id if available, otherwise fall back to name comparison
                let isCurrentUserOriginalSender = false;
                if (msg.forwarded_from_profile_id && currentProfile?.profile_id) {
                    // Use profile_id comparison (most reliable)
                    isCurrentUserOriginalSender =
                        String(msg.forwarded_from_profile_id) === String(userId) &&
                        msg.forwarded_from_profile_type === null;
                } else {
                    // Fallback to name comparison for old messages
                    const currentUserName = currentUser?.full_name ||
                                            `${currentUser?.first_name || ''} ${currentUser?.father_name || ''}`.trim();
                    isCurrentUserOriginalSender = currentUserName &&
                                                  originalSenderName.toLowerCase() === currentUserName.toLowerCase();
                }

                // Display "You" ONLY if: I sent this forwarded message AND I was the original sender
                // For received messages, always show the original sender's actual name
                let displayName = originalSenderName;
                if (isMySentMessage && isCurrentUserOriginalSender) {
                    displayName = 'You';
                    // Use current user's avatar for "You"
                    originalAvatar = currentUser?.profile_picture || currentProfile?.profile_picture || originalAvatar;
                }

                // Generate fallback avatar if not provided
                if (!originalAvatar) {
                    originalAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(originalSenderName)}&background=F59E0B&color=fff&size=32`;
                }

                // Build clickable original sender link (only if not current user and has profile info)
                const canClickOriginalSender = !isCurrentUserOriginalSender &&
                    msg.forwarded_from_profile_id && msg.forwarded_from_profile_type;

                const originalSenderClick = canClickOriginalSender
                    ? `onclick="ChatModalManager.openChatWithOriginalSender(${msg.forwarded_from_profile_id}, '${msg.forwarded_from_profile_type}', '${this.escapeHtml(originalSenderName).replace(/'/g, "\\'")}', '${originalAvatar.replace(/'/g, "\\'")}'); event.stopPropagation();"`
                    : '';

                const senderNameClass = canClickOriginalSender
                    ? 'original-sender-name clickable-sender'
                    : 'original-sender-name';

                html += `
                    <div class="forwarded-message-header">
                        <div class="forwarded-label">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 17 20 12 15 7"></polyline>
                                <path d="M4 18v-2a4 4 0 0 1 4-4h12"></path>
                            </svg>
                            <span>Forwarded</span>
                        </div>
                        <div class="original-sender-info" ${originalSenderClick} style="${canClickOriginalSender ? 'cursor: pointer;' : ''}">
                            <span class="original-label">From:</span>
                            <img src="${originalAvatar}" alt="${this.escapeHtml(displayName)}" class="original-sender-avatar" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(originalSenderName)}&background=F59E0B&color=fff&size=24'">
                            <span class="${senderNameClass}">${this.escapeHtml(displayName)}</span>
                        </div>
                    </div>
                `;
            }

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
                // Get message text and strip old-style forwarded prefix if present
                let messageText = msg.text || msg.content || '';
                // Remove any [Forwarded from ...] prefix from old messages
                messageText = messageText.replace(/^\[Forwarded from [^\]]+\]\s*/i, '').trim();
                html += `<p class="message-text">${this.escapeHtml(messageText)}</p>`;
            }

            html += '</div>';
            // Add status indicator for sent messages
            if (msg.sent || msg.is_mine) {
                const status = msg.status || 'sent';
                let statusIcon = '';
                let statusTitle = '';
                switch (status) {
                    case 'pending':
                        // Clock icon (SVG)
                        statusIcon = '<svg class="status-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
                        statusTitle = 'Sending...';
                        break;
                    case 'sent':
                        // Single check (SVG)
                        statusIcon = '<svg class="status-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>';
                        statusTitle = 'Sent';
                        break;
                    case 'read':
                        // Double check (SVG)
                        statusIcon = '<svg class="status-icon" width="18" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L7 17l-5-5"/><path d="M22 6L11 17"/></svg>';
                        statusTitle = 'Read';
                        break;
                    case 'failed':
                        // Exclamation circle (SVG)
                        statusIcon = '<svg class="status-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
                        statusTitle = 'Failed to send. Tap to retry.';
                        break;
                }
                html += `<div class="message-time-status"><span class="message-status status-${status}" title="${statusTitle}">${statusIcon}</span><span class="message-time-inline">${this.formatTime(msg.time)}</span></div>`;
            } else {
                html += `<span class="message-time-inline">${this.formatTime(msg.time)}</span>`;
            }
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
        if (typingIndicator && typingIndicator.parentNode === chatArea) {
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

        // Check if package has been deleted (no id or name means package was deleted)
        const isPackageDeleted = !pkg.id && !pkg.name;

        // If package is deleted, show a simple deleted message card
        if (isPackageDeleted) {
            const messageId = msg.id || Date.now();
            if (!window.sessionRequestMessages) window.sessionRequestMessages = {};
            window.sessionRequestMessages[messageId] = msg;

            return `
                <div class="session-request-card deleted" data-message-id="${messageId}" style="max-width: 380px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); cursor: default;">
                    <!-- Header - Gray Theme for deleted -->
                    <div style="background: linear-gradient(135deg, #6b7280, #4b5563); padding: 0.875rem 1rem; color: white;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 3px;">
                                    <i class="fas fa-paper-plane" style="font-size: 0.7rem; opacity: 0.9;"></i>
                                    <span style="font-size: 0.65rem; font-weight: 600; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;">Session Request</span>
                                </div>
                                <h3 style="font-size: 1rem; font-weight: 700; margin: 0; color: white; line-height: 1.2;">
                                    Package Unavailable
                                </h3>
                            </div>
                            <!-- Deleted Badge -->
                            <span style="background: #fee2e2; color: #991b1b; font-size: 0.6rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 10px; display: flex; align-items: center; gap: 3px; white-space: nowrap;">
                                <i class="fas fa-trash-alt" style="font-size: 0.55rem;"></i>
                                Deleted
                            </span>
                        </div>
                    </div>

                    <!-- Body -->
                    <div style="padding: 1.25rem 1rem; background: #ffffff; text-align: center;">
                        <div style="margin-bottom: 0.75rem;">
                            <i class="fas fa-box-open" style="font-size: 2.5rem; color: #d1d5db;"></i>
                        </div>
                        <p style="font-size: 0.85rem; color: #6b7280; margin: 0 0 0.5rem 0; font-weight: 500;">
                            This package has been deleted
                        </p>
                        <p style="font-size: 0.7rem; color: #9ca3af; margin: 0;">
                            The tutor has removed this package from their offerings.
                        </p>
                        ${userMessage ? `
                            <div style="background: #f3f4f6; border-left: 2px solid #9ca3af; padding: 0.4rem 0.6rem; border-radius: 0 6px 6px 0; margin-top: 0.75rem; text-align: left;">
                                <div style="display: flex; align-items: center; margin-bottom: 0.15rem;">
                                    <i class="fas fa-comment-dots" style="color: #6b7280; margin-right: 0.35rem; font-size: 0.6rem;"></i>
                                    <span style="font-size: 0.5rem; font-weight: 700; color: #6b7280; text-transform: uppercase;">Original Message</span>
                                </div>
                                <p style="font-size: 0.7rem; color: #4b5563; margin: 0; line-height: 1.3; font-style: italic;">"${this.escapeHtml(userMessage)}"</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

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

    // Render Call Card - Beautiful call history display
    renderCallCard(msg) {
        const callData = msg.media_metadata || {};
        const callType = callData.call_type || 'voice';  // 'voice' or 'video'
        const status = callData.status || 'missed';  // 'answered', 'missed', 'declined', 'ended'
        const duration = callData.duration_seconds || 0;
        const isCaller = msg.sent || msg.is_mine;

        // Status styling
        const statusConfig = {
            answered: { icon: 'fa-phone', color: '#10b981', label: 'Call ended', bgColor: '#d1fae5' },
            missed: { icon: 'fa-phone-slash', color: '#ef4444', label: 'Missed call', bgColor: '#fee2e2' },
            declined: { icon: 'fa-phone-slash', color: '#ef4444', label: 'Call declined', bgColor: '#fee2e2' },
            cancelled: { icon: 'fa-phone-slash', color: '#ef4444', label: 'Call cancelled', bgColor: '#fee2e2' },
            no_answer: { icon: 'fa-phone-slash', color: '#f59e0b', label: 'No answer', bgColor: '#fef3c7' },
            ended: { icon: 'fa-phone', color: '#10b981', label: 'Call ended', bgColor: '#d1fae5' }
        };

        const config = statusConfig[status] || statusConfig.missed;

        // Format duration
        let durationText = '';
        if (duration > 0) {
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
        }

        // Call type icon
        const callTypeIcon = callType === 'video' ? 'fa-video' : 'fa-phone';
        const callTypeLabel = callType === 'video' ? 'Video Call' : 'Voice Call';

        // Direction arrow
        const directionIcon = isCaller ? 'fa-arrow-up' : 'fa-arrow-down';
        const directionColor = isCaller ? '#10b981' : '#3b82f6';

        return `
            <div class="call-card" style="max-width: 280px; border-radius: 12px; overflow: hidden; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, ${config.color}, ${config.color}dd); padding: 0.75rem 1rem; color: white; display: flex; align-items: center; gap: 0.75rem;">
                    <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fas ${callTypeIcon}" style="font-size: 1.1rem;"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 0.65rem; opacity: 0.9; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
                            ${callTypeLabel}
                        </div>
                        <div style="font-size: 0.9rem; font-weight: 700;">
                            ${config.label}
                        </div>
                    </div>
                    <i class="fas ${directionIcon}" style="font-size: 0.9rem; color: rgba(255,255,255,0.8);"></i>
                </div>

                <!-- Body -->
                <div style="padding: 0.875rem 1rem; display: flex; align-items: center; justify-content: space-between;">
                    ${duration > 0 ? `
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-clock" style="color: #6b7280; font-size: 0.75rem;"></i>
                            <span style="color: #374151; font-size: 0.8rem; font-weight: 600;">${durationText}</span>
                        </div>
                    ` : `
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-info-circle" style="color: #6b7280; font-size: 0.75rem;"></i>
                            <span style="color: #6b7280; font-size: 0.75rem;">No answer</span>
                        </div>
                    `}

                    <button onclick="ChatModalManager.initiateCallFromCard('${callType}')" style="background: ${config.color}; color: white; border: none; padding: 0.4rem 0.9rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; transition: all 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        <i class="fas ${callTypeIcon}" style="font-size: 0.7rem;"></i>
                        Call Back
                    </button>
                </div>
            </div>
        `;
    },

    // Initiate call from call card
    initiateCallFromCard(callType) {
        if (callType === 'video') {
            this.startChatVideoCall();
        } else {
            this.startChatVoiceCall();
        }
    },

    // Add call card to chat area
    addCallCard(callType, status, duration = 0) {
        if (!this.state.selectedConversation) return;

        const callMessage = {
            id: `call-${Date.now()}`,
            message_type: 'call',
            type: 'call',
            sent: true,
            is_mine: true,
            time: new Date(),
            isLocalCallCard: true,  // Mark as local so it persists during reloads
            media_metadata: {
                call_type: callType,
                status: status,
                duration_seconds: duration
            }
        };

        // Add to messages array
        const conversationId = this.state.selectedConversation.id;
        if (!this.state.messages[conversationId]) {
            this.state.messages[conversationId] = [];
        }
        this.state.messages[conversationId].push(callMessage);

        // Display the message
        this.displayMessage(callMessage);

        // Scroll to bottom
        this.scrollToBottom();

        console.log(`📞 Call card added: ${callType} - ${status} - ${duration}s`);
    },

    // Add incoming call card (when you receive a call)
    addIncomingCallCard(callType, status, duration = 0) {
        if (!this.state.selectedConversation) return;

        const callMessage = {
            id: `call-${Date.now()}`,
            message_type: 'call',
            type: 'call',
            sent: false,
            is_mine: false,
            time: new Date(),
            isLocalCallCard: true,  // Mark as local so it persists during reloads
            media_metadata: {
                call_type: callType,
                status: status,
                duration_seconds: duration
            }
        };

        // Add to messages array
        const conversationId = this.state.selectedConversation.id;
        if (!this.state.messages[conversationId]) {
            this.state.messages[conversationId] = [];
        }
        this.state.messages[conversationId].push(callMessage);

        // Display the message
        this.displayMessage(callMessage);

        // Scroll to bottom
        this.scrollToBottom();

        console.log(`📞 Incoming call card added: ${callType} - ${status} - ${duration}s`);
    },

    // Send Message
    async sendMessage() {
        // If in multi-select mode, send to all selected contacts
        if (this.state.isMultiSelectMode && this.state.selectedContacts.length > 0) {
            return this.sendToMultipleContacts();
        }

        const input = document.getElementById('chatMessageInput');
        const messageText = input?.value.trim();

        if (!messageText && !this.state.recordedAudio) return;

        // Voice messages are coming soon
        if (this.state.recordedAudio && !messageText) {
            this.showToast('Voice messages coming soon! For now, use Voice-to-Text mode.', 'info');
            return;
        }

        // Check if we're sending to a pending request recipient (who allows everyone)
        const pendingRecipient = this.state.pendingRequestRecipient;
        if (!this.state.selectedChat && pendingRecipient && pendingRecipient.allows_everyone) {
            // Create conversation with the pending recipient first
            return this.sendMessageToPendingRecipient(messageText);
        }

        if (!this.state.selectedChat) {
            this.showToast('Please select a conversation first', 'error');
            return;
        }

        const userId = this.state.currentUser?.user_id;
        const user = this.state.currentUser;
        const conv = this.state.selectedConversation;

        // Check channel posting restriction (only creator can post)
        if (conv && conv.type === 'channel' && !this.isChannelCreator(conv)) {
            this.showToast('Only the channel creator can post messages', 'error');
            return;
        }

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
            sender_id: userId || 'me',
            sender_name: user?.name || user?.full_name || user?.first_name || 'You',
            avatar: user?.profile_picture,
            time: new Date(),
            sent: true,
            is_mine: true,
            reply_to: this.state.replyingTo,
            audio: this.state.recordedAudio,
            status: 'pending'  // pending -> sent -> read
        };

        // Clear the empty conversation view BEFORE displaying the message (for new conversations)
        const emptyView = document.querySelector('.new-conversation-start');
        if (emptyView) {
            emptyView.remove();
            // Add date divider and typing indicators for the new conversation
            const chatArea = document.getElementById('chatArea');
            if (chatArea) {
                chatArea.innerHTML = '<div class="date-divider"><span>Today</span></div>';
                this.addTypingIndicators();
            }
        }

        // Display message immediately (optimistic UI)
        console.log('[Chat] Displaying message:', messageData);
        this.displayMessage(messageData);

        // Add message to state for persistence
        if (!this.state.messages[conversationId]) {
            this.state.messages[conversationId] = [];
        }
        this.state.messages[conversationId].push(messageData);
        console.log('[Chat] Message added to state. Total messages:', this.state.messages[conversationId].length);

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
                const messageId = data.message?.id || data.message_id;  // Backend returns data.message.id
                console.log('Chat: Message sent successfully:', messageId);
                // Update the optimistic message with the real ID and status
                const oldId = messageData.id;
                messageData.id = messageId;
                messageData.status = 'sent';
                // Update status indicator in UI
                this.updateMessageStatus(oldId, 'sent');
                // Update the data-message-id attribute
                const msgEl = document.querySelector(`[data-message-id="${oldId}"]`);
                if (msgEl) msgEl.dataset.messageId = messageId;
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.log('Chat: Message API returned error:', errorData);
                messageData.status = 'failed';
                this.updateMessageStatus(messageData.id, 'failed');
                this.showToast('Message failed to send. Tap to retry.', 'error');
            }
        } catch (error) {
            console.log('Chat: Message queued for retry (offline):', error.message);
            // Add to offline queue for retry when connection is restored
            this.addToOfflineQueue(messageData, conversationId);
            // Keep status as pending (will be updated when sent)
            this.showToast('No connection. Message will send when online.', 'info');
        }
    },

    // Send message to a pending request recipient (when they allow everyone)
    async sendMessageToPendingRecipient(messageText) {
        const pendingRecipient = this.state.pendingRequestRecipient;
        if (!pendingRecipient || !pendingRecipient.allows_everyone) {
            this.showToast('Cannot send message to this user', 'error');
            return;
        }

        const userId = this.state.currentUser?.user_id;
        const user = this.state.currentUser;
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');

        if (!this.state.currentUser || !token) {
            this.showToast('Please log in to send messages', 'error');
            return;
        }

        try {
            // First, create a conversation with the recipient
            const createResponse = await fetch(
                `${this.API_BASE_URL}/api/chat/conversations?user_id=${userId}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: 'direct',
                        participant_user_ids: [pendingRecipient.user_id]  // Backend expects array of user IDs
                    })
                }
            );

            if (!createResponse.ok) {
                const errorData = await createResponse.json().catch(() => ({}));
                this.showToast(errorData.detail || 'Could not start conversation', 'error');
                return;
            }

            const convData = await createResponse.json();
            const conversationId = convData.conversation?.id;

            if (!conversationId) {
                console.error('Chat: No conversation ID in response:', convData);
                this.showToast('Could not start conversation', 'error');
                return;
            }

            // Now send the message
            const sendResponse = await fetch(
                `${this.API_BASE_URL}/api/chat/messages?user_id=${userId}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        conversation_id: conversationId,
                        message_type: 'text',
                        content: messageText
                    })
                }
            );

            if (sendResponse.ok) {
                // Clear input
                const input = document.getElementById('chatMessageInput');
                if (input) input.value = '';

                // Clear pending recipient state
                this.state.pendingRequestRecipient = null;

                // Set the conversation as selected and reload
                this.state.selectedChat = conversationId;
                this.state.selectedConversation = {
                    id: conversationId,
                    type: 'direct',
                    display_name: pendingRecipient.display_name,
                    avatar: pendingRecipient.avatar,
                    other_profile_id: pendingRecipient.profile_id,
                    other_profile_type: pendingRecipient.profile_type
                };

                // Reload conversations and messages
                await this.loadConversations();
                this.selectConversation(this.state.selectedConversation);

                this.showToast('Message sent!', 'success');
            } else {
                const errorData = await sendResponse.json().catch(() => ({}));
                this.showToast(errorData.detail || 'Failed to send message', 'error');
            }
        } catch (error) {
            console.error('[Chat] Error sending to pending recipient:', error);
            this.showToast('Failed to send message', 'error');
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

    // Open chat with original sender of a forwarded message
    async openChatWithOriginalSender(targetUserId, name, avatar) {
        console.log('Chat: Opening chat with original sender:', { targetUserId, name, avatar });

        // Don't open chat with yourself
        const userId = this.state.currentUser?.user_id;
        if (userId === targetUserId) {
            this.showToast('This is your own message', 'info');
            return;
        }

        // Use existing openConversationWith method with the original sender's info
        await this.openConversationWith({
            user_id: targetUserId,
            full_name: name,
            name: name,
            profile_picture: avatar,
            avatar: avatar,
            role: profileType
        });
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

        console.log('Chat: No existing contact found, checking recipient settings...');

        // Check if the target user allows messages from everyone or connections only
        const recipientAllowsEveryone = await this.checkRecipientAllowsEveryone(userProfileId, userRole);
        console.log('Chat: Recipient allows everyone:', recipientAllowsEveryone);

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
            is_new_contact: true,    // Flag to show welcome state
            is_stranger: true,       // Flag to indicate this is a stranger (no connection or request)
            recipient_allows_everyone: recipientAllowsEveryone  // Store recipient's messaging preference
        };
        console.log('Chat: Created temporary conversation for new contact:', conv.id, 'allowsEveryone:', recipientAllowsEveryone);

        // Add new conversation to beginning of list
        this.state.conversations = [conv, ...this.state.conversations];

        // Add the new contact element to the sidebar
        this.addNewContactElement(conv);

        // Select the conversation - this will show appropriate state based on recipient's settings
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

    // Toggle Sidebar (All screens)
    toggleSidebar() {
        const sidebar = document.getElementById('chatSidebar');
        const chatMain = document.getElementById('chatMain');
        if (sidebar) {
            sidebar.classList.toggle('hidden');
            // Add class to chat-main for animation
            if (chatMain) {
                chatMain.classList.toggle('sidebar-hidden');
            }
        }
    },

    // Toggle Info Panel
    toggleInfo() {
        const infoPanel = document.getElementById('chatInfoPanel');
        const translatePanel = document.getElementById('chatTranslatePanel');
        const infoBtn = document.getElementById('chatInfoBtn');
        const translateBtn = document.getElementById('chatTranslateBtn');
        const chatMain = document.getElementById('chatMain');

        if (infoPanel) {
            const isOpening = !infoPanel.classList.contains('active');

            // If opening info panel, close translate panel first
            if (isOpening && translatePanel && translatePanel.classList.contains('active')) {
                translatePanel.classList.remove('active');
                if (translateBtn) translateBtn.classList.remove('active');
            }

            infoPanel.classList.toggle('active');
            if (infoBtn) infoBtn.classList.toggle('active', infoPanel.classList.contains('active'));

            // Animate chat area - shift when panel opens
            if (chatMain) {
                chatMain.classList.toggle('panel-open', infoPanel.classList.contains('active'));
            }

            // Load members list if this is a group/channel
            if (isOpening && this.state.selectedConversation) {
                const convType = this.state.selectedConversation.type;
                if (convType === 'group' || convType === 'channel') {
                    this.loadGroupMembersList();
                }
            }
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

        // Show/hide create button based on tab
        this.updateCreateButtonVisibility(tab);
    },

    // Update Create Group/Channel button visibility based on active tab
    updateCreateButtonVisibility(tab) {
        const footer = document.getElementById('chatSidebarFooter');
        const createLabel = document.getElementById('createGroupChannelLabel');

        if (!footer) return;

        if (tab === 'groups') {
            footer.style.display = 'block';
            if (createLabel) createLabel.textContent = 'Create Group';
        } else if (tab === 'channels') {
            footer.style.display = 'block';
            if (createLabel) createLabel.textContent = 'Create Channel';
        } else {
            footer.style.display = 'none';
        }
    },

    // Show create group/channel modal
    showCreateGroupChannel() {
        const activeTab = document.querySelector('#chatModal .sidebar-tabs .tab-btn.active');
        const tab = activeTab?.dataset.tab || 'groups';
        const isChannel = tab === 'channels';

        // Update modal title and labels
        const modalTitle = document.getElementById('createGroupModalTitle');
        const submitLabel = document.getElementById('createGroupSubmitLabel');
        const nameInput = document.getElementById('createGroupNameInput');
        const descSection = document.getElementById('channelDescSection');

        if (modalTitle) modalTitle.textContent = isChannel ? 'Create Channel' : 'Create Group';
        if (submitLabel) submitLabel.textContent = isChannel ? 'Create Channel' : 'Create Group';
        if (nameInput) nameInput.placeholder = isChannel ? 'Channel name' : 'Group name';
        if (descSection) descSection.style.display = isChannel ? 'block' : 'none';

        // Store mode
        this.state.createGroupMode = isChannel ? 'channel' : 'group';
        this.state.selectedGroupMembers = [];
        this.state.groupIconData = null;

        // Reset form
        if (nameInput) nameInput.value = '';
        const descInput = document.getElementById('createChannelDescInput');
        if (descInput) descInput.value = '';
        const iconPicker = document.querySelector('.group-icon-picker');
        if (iconPicker) {
            iconPicker.innerHTML = '<i class="fas fa-camera"></i>';
        }

        // Show modal
        const modal = document.getElementById('createGroupChannelModal');
        if (modal) modal.classList.add('active');

        // Load contacts
        this.loadGroupContacts();
        this.updateSelectedMembersUI();
    },

    // Close create group modal
    closeCreateGroupModal() {
        const modal = document.getElementById('createGroupChannelModal');
        if (modal) modal.classList.remove('active');
    },

    // Load contacts for group creation
    async loadGroupContacts() {
        const contactsList = document.getElementById('createGroupContactsList');
        if (!contactsList) return;

        // Show loading
        contactsList.innerHTML = `
            <div class="contacts-loading">
                <div class="loading-spinner"></div>
                <p>Loading contacts...</p>
            </div>
        `;

        // Get valid contacts (not requests, not blocked, not archived)
        const validContacts = this.state.conversations.filter(conv => {
            const convId = String(conv.id);
            const isArchived = this.state.archivedConversations.includes(convId);
            const isBlocked = this.state.blockedContacts.some(
                b => b.profile_id === conv.other_profile_id && b.profile_type === conv.other_profile_type
            );
            const isRequest = conv.status === 'request_sent' || conv.status === 'request_received';
            const isGroup = conv.type === 'group' || conv.type === 'channel';

            return !isArchived && !isBlocked && !isRequest && !isGroup;
        });

        if (validContacts.length === 0) {
            contactsList.innerHTML = '<p class="no-contacts">No contacts available</p>';
            return;
        }

        // Fetch profile data for each contact to get proper names
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const enrichedContacts = await Promise.all(validContacts.map(async (contact) => {
            // Use existing data first
            let name = contact.display_name || contact.name || 'Unknown';
            let avatar = contact.avatar || contact.avatar_url || getChatDefaultAvatar(contact.display_name || contact.name || 'User');
            let role = contact.other_profile_type || contact.role || 'User';

            // Try to fetch profile data if we have profile_id and profile_type
            const profileId = contact.other_profile_id || contact.profile_id;
            const profileType = contact.other_profile_type || contact.profile_type;

            if (token && profileId && profileType) {
                try {
                    const response = await fetch(
                        `${this.API_BASE_URL}/api/${profileType}/${profileId}`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );
                    if (response.ok) {
                        const profileData = await response.json();
                        name = profileData.full_name || profileData.name || name;
                        avatar = profileData.profile_picture || avatar;
                        role = this.capitalizeFirst(profileType);
                    }
                } catch (e) {
                    // Use fallback data
                }
            }

            return {
                ...contact,
                name,
                avatar,
                role
            };
        }));

        // Render contacts
        contactsList.innerHTML = enrichedContacts.map(contact => {
            const isSelected = this.state.selectedGroupMembers.some(m => m.id === contact.id);
            return `
                <div class="create-group-contact-item ${isSelected ? 'selected' : ''}"
                     data-contact-id="${contact.id}"
                     onclick="ChatModalManager.toggleGroupMember(${contact.id})">
                    <div class="contact-checkbox"></div>
                    <img src="${contact.avatar}"
                         alt="${contact.name}"
                         class="contact-avatar"
                         onerror="this.onerror=null; this.src=getChatDefaultAvatar('${contact.name}')">
                    <div class="contact-details">
                        <span class="contact-name">${contact.name}</span>
                        <span class="contact-role">${contact.role}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Store all contacts for search
        this.state.allGroupContacts = enrichedContacts;
    },

    // Toggle member selection
    toggleGroupMember(contactId) {
        const contact = this.state.allGroupContacts?.find(c => c.id === contactId);
        if (!contact) return;

        const index = this.state.selectedGroupMembers.findIndex(m => m.id === contactId);

        if (index > -1) {
            // Remove
            this.state.selectedGroupMembers.splice(index, 1);
        } else {
            // Add
            this.state.selectedGroupMembers.push(contact);
        }

        // Update UI
        const contactEl = document.querySelector(`[data-contact-id="${contactId}"]`);
        if (contactEl) {
            contactEl.classList.toggle('selected', index === -1);
        }

        this.updateSelectedMembersUI();
    },

    // Update selected members chips and count
    updateSelectedMembersUI() {
        const chipsList = document.getElementById('selectedMembersList');
        const countEl = document.getElementById('selectedMembersCount');
        const submitBtn = document.getElementById('createGroupSubmitBtn');
        const count = this.state.selectedGroupMembers?.length || 0;

        // Update count text
        if (countEl) {
            countEl.textContent = `${count} member${count !== 1 ? 's' : ''} selected`;
        }

        // Update submit button state (require at least 1 member for group, 0 for channel)
        const nameInput = document.getElementById('createGroupNameInput');
        const hasName = nameInput?.value.trim().length > 0;
        const minMembers = this.state.createGroupMode === 'channel' ? 0 : 1;

        if (submitBtn) {
            submitBtn.disabled = !hasName || count < minMembers;
        }

        // Render chips
        if (chipsList) {
            chipsList.innerHTML = this.state.selectedGroupMembers.map(member => `
                <div class="selected-member-chip">
                    <img src="${member.avatar || getChatDefaultAvatar(member.name)}"
                         alt="${member.name}"
                         onerror="this.onerror=null; this.src=getChatDefaultAvatar('${member.name}')">
                    <span>${member.name.split(' ')[0]}</span>
                    <button class="remove-member" onclick="event.stopPropagation(); ChatModalManager.toggleGroupMember(${member.id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }
    },

    // Search contacts in group modal
    searchGroupContacts(query) {
        const contactsList = document.getElementById('createGroupContactsList');
        if (!contactsList || !this.state.allGroupContacts) return;

        const filtered = this.state.allGroupContacts.filter(contact =>
            contact.name.toLowerCase().includes(query.toLowerCase()) ||
            (contact.role && contact.role.toLowerCase().includes(query.toLowerCase()))
        );

        if (filtered.length === 0) {
            contactsList.innerHTML = '<p class="no-contacts">No contacts found</p>';
            return;
        }

        contactsList.innerHTML = filtered.map(contact => {
            const isSelected = this.state.selectedGroupMembers.some(m => m.id === contact.id);
            return `
                <div class="create-group-contact-item ${isSelected ? 'selected' : ''}"
                     data-contact-id="${contact.id}"
                     onclick="ChatModalManager.toggleGroupMember(${contact.id})">
                    <div class="contact-checkbox"></div>
                    <img src="${contact.avatar || getChatDefaultAvatar(contact.name)}"
                         alt="${contact.name}"
                         class="contact-avatar"
                         onerror="this.onerror=null; this.src=getChatDefaultAvatar('${contact.name}')">
                    <div class="contact-details">
                        <span class="contact-name">${contact.name}</span>
                        <span class="contact-role">${contact.role || 'User'}</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    // Pick group icon
    pickGroupIcon() {
        const input = document.getElementById('groupIconInput');
        if (input) input.click();
    },

    // Handle group icon file change
    handleGroupIconChange(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            return;
        }

        // Read and display
        const reader = new FileReader();
        reader.onload = (e) => {
            const iconPicker = document.querySelector('.group-icon-picker');
            if (iconPicker) {
                iconPicker.innerHTML = `<img src="${e.target.result}" alt="Group Icon">`;
                this.state.groupIconData = e.target.result;
            }
        };
        reader.readAsDataURL(file);
    },

    // Submit create group/channel
    async submitCreateGroup() {
        const nameInput = document.getElementById('createGroupNameInput');
        const descInput = document.getElementById('createChannelDescInput');
        const name = nameInput?.value.trim();
        const description = descInput?.value.trim();
        const isChannel = this.state.createGroupMode === 'channel';

        if (!name) {
            this.showToast(`Please enter a ${isChannel ? 'channel' : 'group'} name`, 'error');
            return;
        }

        const minMembers = isChannel ? 0 : 1;
        if (this.state.selectedGroupMembers.length < minMembers) {
            this.showToast('Please select at least one member', 'error');
            return;
        }

        // Show loading state
        const submitBtn = document.getElementById('createGroupSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token || !this.state.currentUser) {
                this.showToast('Please log in to create a group', 'error');
                return;
            }

            // Build participants array from selected members - backend expects just user IDs
            const participantUserIds = this.state.selectedGroupMembers.map(member =>
                member.other_user_id || member.user_id
            );

            // Upload group icon if provided
            let avatarUrl = null;
            if (this.state.groupIconData) {
                try {
                    // Convert base64 to blob
                    const response = await fetch(this.state.groupIconData);
                    const blob = await response.blob();
                    const formData = new FormData();
                    formData.append('file', blob, 'group_icon.jpg');

                    const uploadResponse = await fetch(`${this.API_BASE_URL}/api/upload/profile-picture`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });

                    if (uploadResponse.ok) {
                        const uploadData = await uploadResponse.json();
                        avatarUrl = uploadData.url || uploadData.file_url;
                    }
                } catch (uploadError) {
                    console.warn('Failed to upload group icon:', uploadError);
                }
            }

            // Create the group/channel via API
            const userId = this.state.currentUser?.user_id;
            const convType = isChannel ? 'channel' : 'group';

            const createResponse = await fetch(
                `${this.API_BASE_URL}/api/chat/conversations?user_id=${userId}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: convType,
                        name: name,
                        description: description || null,
                        avatar_url: avatarUrl,
                        participant_user_ids: participantUserIds  // Backend expects array of user IDs
                    })
                }
            );

            if (!createResponse.ok) {
                const errorData = await createResponse.json();
                throw new Error(errorData.detail || 'Failed to create');
            }

            const result = await createResponse.json();
            const conversationId = result.conversation?.id;
            const rejectedParticipants = result.rejected_participants || [];

            if (!conversationId) {
                console.error('Chat: No conversation ID in response:', result);
                throw new Error('No conversation ID returned from server');
            }

            // Show feedback about rejected participants (privacy settings prevented adding)
            if (rejectedParticipants.length > 0) {
                const rejectedNames = await this.getParticipantNames(rejectedParticipants);
                const rejectedCount = rejectedParticipants.length;
                const addedCount = (result.added_participants || []).length;

                if (addedCount === 0 && this.state.selectedGroupMembers.length > 0) {
                    // All members were rejected
                    this.showToast(
                        `${isChannel ? 'Channel' : 'Group'} created, but no members could be added. ${rejectedNames.join(', ')} ${rejectedCount === 1 ? 'has' : 'have'} privacy settings preventing ${isChannel ? 'channel' : 'group'} additions.`,
                        'warning'
                    );
                } else {
                    // Some members were rejected
                    this.showToast(
                        `${isChannel ? 'Channel' : 'Group'} "${name}" created! ${rejectedCount} member${rejectedCount > 1 ? 's' : ''} couldn't be added due to privacy settings: ${rejectedNames.join(', ')}`,
                        'warning'
                    );
                }
            } else {
                this.showToast(`${isChannel ? 'Channel' : 'Group'} "${name}" created successfully!`, 'success');
            }

            // Close modal
            this.closeCreateGroupModal();

            // Reload conversations to show the new group
            await this.loadConversations();

            // Select the new conversation
            if (conversationId) {
                const newConv = this.state.conversations.find(c => c.id === conversationId);
                if (newConv) {
                    this.selectConversation(newConv);
                }
            }

        } catch (error) {
            console.error('Error creating group:', error);
            this.showToast(error.message || 'Failed to create. Please try again.', 'error');
        } finally {
            // Reset button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span id="createGroupSubmitLabel">${isChannel ? 'Create Channel' : 'Create Group'}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 12h14M12 5l7 7-7 7"></path>
                    </svg>`;
            }
        }
    },

    // Filter Contacts
    filterContacts(filter) {
        const contacts = document.querySelectorAll('#chatModal .contact-item');

        contacts.forEach(contact => {
            const category = contact.dataset.category;
            const convId = contact.dataset.conversationId;
            const isRequestItem = contact.classList.contains('request-item');
            const unreadEl = contact.querySelector('.unread-count');
            // Check if unread element exists AND is visible (has content)
            const hasUnread = unreadEl && unreadEl.style.display !== 'none' && unreadEl.textContent.trim() !== '';

            // Check statuses
            const isArchived = convId && this.state.archivedConversations.includes(convId);
            // Blocked contacts are stored as objects with profile_id and profile_type
            const conv = this.state.conversations.find(c => String(c.id) === String(convId));
            const isBlocked = conv && this.state.blockedContacts.some(
                b => b.profile_id === conv.other_profile_id && b.profile_type === conv.other_profile_type
            );
            const isChannel = category === 'channels';

            let shouldShow = false;

            switch (filter) {
                case 'all':
                    // Show all except: archived, blocked, requests, channels
                    shouldShow = !isArchived && !isBlocked && !isRequestItem && !isChannel;
                    break;
                case 'personal':
                    shouldShow = category === 'personal' && !isArchived && !isBlocked && !isRequestItem;
                    break;
                case 'groups':
                    shouldShow = category === 'groups' && !isArchived && !isBlocked;
                    break;
                case 'channels':
                    shouldShow = isChannel && !isArchived && !isBlocked;
                    break;
                case 'requests':
                    // Only show request items (sent/received connection requests)
                    shouldShow = isRequestItem;
                    break;
                case 'unread':
                    shouldShow = hasUnread && !isArchived && !isBlocked && !isRequestItem;
                    break;
                case 'archived':
                    // Only show archived conversations
                    shouldShow = isArchived;
                    break;
                case 'blocked':
                    // Only show blocked conversations
                    shouldShow = isBlocked;
                    break;
            }

            contact.style.display = shouldShow ? 'flex' : 'none';
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

            let emptyMessage = '';
            let emptyIcon = '';
            switch (filter) {
                case 'archived':
                    emptyIcon = '<i class="fas fa-archive" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5;"></i>';
                    emptyMessage = 'No archived chats';
                    break;
                case 'blocked':
                    emptyIcon = '<i class="fas fa-ban" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5;"></i>';
                    emptyMessage = 'No blocked contacts';
                    break;
                case 'requests':
                    emptyIcon = '<i class="fas fa-user-plus" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5;"></i>';
                    emptyMessage = 'No pending requests';
                    break;
                case 'channels':
                    emptyIcon = '<i class="fas fa-broadcast-tower" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5;"></i>';
                    emptyMessage = 'No channels yet';
                    break;
                case 'groups':
                    emptyIcon = '<i class="fas fa-users" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5;"></i>';
                    emptyMessage = 'No group chats';
                    break;
                case 'unread':
                    emptyIcon = '<i class="fas fa-check-circle" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5;"></i>';
                    emptyMessage = 'No unread messages';
                    break;
                default:
                    emptyIcon = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.5;">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>`;
                    emptyMessage = `No ${filter} chats found`;
            }

            emptyState.innerHTML = `
                ${emptyIcon}
                <p style="margin: 0;">${emptyMessage}</p>
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

    // Start Reading Messages - reads ALL messages with voice based on sender's gender
    // Respects Voice Preferences settings (none/synthetic/truevoice)
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

        // Get voice preference from state (primary) or DOM (fallback)
        const settings = this.state.chatSettings || {};
        const voicePreference = settings.tts_voice || document.getElementById('settingTTSVoice')?.value || 'synthetic';
        const speechRate = parseFloat(settings.speech_rate || document.getElementById('settingSpeechRate')?.value) || 1.0;

        // Check if voice is disabled
        if (voicePreference === 'none') {
            this.showToast('Text-to-speech is disabled. Enable it in Voice Preferences.', 'info');
            return;
        }

        // Check if TrueVoice is selected
        if (voicePreference === 'truevoice') {
            // TrueVoice reads messages in sender's actual cloned voice
            this.showToast('TrueVoice: Tap individual messages to hear them in sender\'s voice', 'info');
            return;
        }

        // Synthetic Voice Mode - reads ALL messages with voice based on sender's gender
        // Collect all messages with their sender info
        const messagesToRead = [];
        allMessages.forEach(messageEl => {
            const textEl = messageEl.querySelector('.message-text');
            const text = textEl?.textContent.trim();

            if (text) {
                const isSent = messageEl.classList.contains('sent');
                // Get sender gender from data attribute or determine from context
                let senderGender = messageEl.dataset.senderGender;

                if (!senderGender) {
                    // If sent by current user, use current user's gender
                    if (isSent) {
                        senderGender = this.state.currentUser?.gender || 'male';
                    } else {
                        // For received messages, try to get from conversation partner
                        const conv = this.state.selectedConversation;
                        if (conv && conv.other_participant) {
                            senderGender = conv.other_participant.gender || 'male';
                        } else {
                            senderGender = 'male'; // Default fallback
                        }
                    }
                }

                messagesToRead.push({
                    text: text,
                    gender: senderGender?.toLowerCase() === 'female' ? 'female' : 'male',
                    isSent: isSent
                });
            }
        });

        if (messagesToRead.length === 0) {
            this.showToast('No messages to read', 'info');
            return;
        }

        this.state.isReadingMessages = true;

        // Update button state
        const btn = document.getElementById('chatReadMessagesBtn');
        if (btn) btn.classList.add('active');

        // Get available voices
        const voices = window.speechSynthesis.getVoices();

        // Cache male and female voices for reuse
        const maleVoice = this.getMaleVoice(voices);
        const femaleVoice = this.getFemaleVoice(voices);

        // Store messages queue for sequential reading
        this.state.messageReadQueue = messagesToRead;
        this.state.messageReadIndex = 0;
        this.state.speechRate = speechRate;
        this.state.maleVoice = maleVoice;
        this.state.femaleVoice = femaleVoice;

        // Start reading the first message
        this.readNextMessage();

        this.showToast(`Reading ${messagesToRead.length} message${messagesToRead.length > 1 ? 's' : ''}...`, 'info');
    },

    // Read the next message in queue with appropriate voice
    readNextMessage() {
        if (!this.state.isReadingMessages || !this.state.messageReadQueue) {
            this.stopReadingMessages();
            return;
        }

        const queue = this.state.messageReadQueue;
        const index = this.state.messageReadIndex;

        if (index >= queue.length) {
            // All messages read
            this.stopReadingMessages();
            return;
        }

        const message = queue[index];
        const utterance = new SpeechSynthesisUtterance(message.text);

        // Configure voice based on sender's gender
        utterance.rate = this.state.speechRate || 1.0;
        utterance.pitch = 1;
        utterance.volume = 1;

        // Use appropriate voice based on sender's gender
        if (message.gender === 'female' && this.state.femaleVoice) {
            utterance.voice = this.state.femaleVoice;
        } else if (this.state.maleVoice) {
            utterance.voice = this.state.maleVoice;
        }

        // Handle completion - read next message
        utterance.onend = () => {
            this.state.messageReadIndex++;
            // Small pause between messages
            setTimeout(() => this.readNextMessage(), 300);
        };

        utterance.onerror = (e) => {
            // 'interrupted' and 'canceled' are not real errors - they occur when speech is stopped
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
                console.error('Speech error:', e.error);
            }
            this.state.messageReadIndex++;
            this.readNextMessage();
        };

        this.state.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
    },

    // Get male voice (prefer Google voices for quality)
    getMaleVoice(voices) {
        return voices.find(v => v.name === 'Google UK English Male') ||
               voices.find(v => v.name === 'Google US English') ||
               voices.find(v => v.name.includes('Google') && v.lang.startsWith('en') && !v.name.toLowerCase().includes('female')) ||
               voices.find(v => v.name.includes('David') && v.lang.startsWith('en')) ||
               voices.find(v => v.name.includes('Mark') && v.lang.startsWith('en')) ||
               voices.find(v => v.name.includes('James') && v.lang.startsWith('en')) ||
               voices.find(v => v.name === 'Alex' && v.lang.startsWith('en')) ||
               voices.find(v => v.name === 'Daniel' && v.lang.startsWith('en')) ||
               voices.find(v => v.lang.startsWith('en') && !v.name.toLowerCase().includes('female')) ||
               voices.find(v => v.lang.startsWith('en')) ||
               voices[0];
    },

    // Get female voice (prefer Google voices for quality)
    getFemaleVoice(voices) {
        return voices.find(v => v.name === 'Google UK English Female') ||
               voices.find(v => v.name.includes('Google') && v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
               voices.find(v => v.name.includes('Zira') && v.lang.startsWith('en')) ||
               voices.find(v => v.name.includes('Hazel') && v.lang.startsWith('en')) ||
               voices.find(v => v.name === 'Samantha' && v.lang.startsWith('en')) ||
               voices.find(v => v.name === 'Victoria' && v.lang.startsWith('en')) ||
               voices.find(v => v.name === 'Karen' && v.lang.startsWith('en')) ||
               voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
               voices.find(v => v.lang.startsWith('en')) ||
               voices[0];
    },

    // Stop Reading Messages
    stopReadingMessages() {
        window.speechSynthesis?.cancel();
        this.state.isReadingMessages = false;
        this.state.currentUtterance = null;
        // Clean up queue state
        this.state.messageReadQueue = null;
        this.state.messageReadIndex = 0;
        this.state.maleVoice = null;
        this.state.femaleVoice = null;

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

    // Check if recipient allows calls from everyone (for who_can_call setting)
    async checkRecipientAllowsCalls(recipientUserId) {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) return false;

        try {
            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/settings?user_id=${userId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                const settings = data.settings || {};
                // Returns true if allow_calls_from is 'everyone', false otherwise
                return settings.allow_calls_from === 'everyone';
            }
        } catch (error) {
            console.debug('[Chat] Could not fetch recipient call settings:', error.message);
        }

        // Default to false (connections only) if we can't fetch settings
        return false;
    },

    // Check if message sender allows forwarding their messages
    async checkSenderAllowsForwarding(senderUserId) {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) return true; // Default to allow if we can't check

        try {
            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/settings?user_id=${userId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                const settings = data.settings || {};
                // Returns true if forwarding is NOT disabled (i.e., allow forwarding)
                return !settings.disable_forwarding;
            }
        } catch (error) {
            console.debug('[Chat] Could not fetch sender forwarding settings:', error.message);
        }

        // Default to allowing forwarding if we can't fetch settings
        return true;
    },

    // Check if sender has screenshot protection enabled
    async checkSenderBlocksScreenshots(senderUserId) {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) return false;

        try {
            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/settings?user_id=${userId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                const settings = data.settings || {};
                return settings.block_screenshots === true;
            }
        } catch (error) {
            console.debug('[Chat] Could not fetch sender screenshot settings:', error.message);
        }

        return false;
    },

    // Apply screenshot protection to the chat area
    async applyScreenshotProtection(profileId, profileType) {
        const chatArea = document.getElementById('chatArea');
        const chatContent = document.getElementById('chatContent');
        if (!chatArea) return;

        // Check if the other party has screenshot protection enabled
        // Note: We need the user_id, not profile_id. Get it from the selected conversation
        const otherUserId = this.state.selectedConversation?.other_user_id;
        if (!otherUserId) return;

        const hasProtection = await this.checkSenderBlocksScreenshots(otherUserId);

        if (hasProtection) {
            // Add protection class to chat area
            chatArea.classList.add('screenshot-protected');
            if (chatContent) chatContent.classList.add('screenshot-protected');

            // Show a subtle indicator that this chat is protected
            this.showProtectionIndicator(true);

            // Add blur effect when window loses focus (attempts to prevent screenshots)
            this._screenshotProtectionHandler = () => {
                if (document.hidden || !document.hasFocus()) {
                    chatArea.classList.add('blurred');
                } else {
                    chatArea.classList.remove('blurred');
                }
            };

            document.addEventListener('visibilitychange', this._screenshotProtectionHandler);
            window.addEventListener('blur', this._screenshotProtectionHandler);
            window.addEventListener('focus', this._screenshotProtectionHandler);

            console.debug('[Chat] Screenshot protection enabled for this conversation');
        } else {
            this.removeScreenshotProtection();
        }
    },

    // Remove screenshot protection
    removeScreenshotProtection() {
        const chatArea = document.getElementById('chatArea');
        const chatContent = document.getElementById('chatContent');

        if (chatArea) {
            chatArea.classList.remove('screenshot-protected', 'blurred');
        }
        if (chatContent) {
            chatContent.classList.remove('screenshot-protected');
        }

        // Remove event listeners
        if (this._screenshotProtectionHandler) {
            document.removeEventListener('visibilitychange', this._screenshotProtectionHandler);
            window.removeEventListener('blur', this._screenshotProtectionHandler);
            window.removeEventListener('focus', this._screenshotProtectionHandler);
            this._screenshotProtectionHandler = null;
        }

        // Hide protection indicator
        this.showProtectionIndicator(false);
    },

    // Show/hide screenshot protection indicator in chat header
    showProtectionIndicator(show) {
        let indicator = document.getElementById('chatProtectionIndicator');

        if (show) {
            if (!indicator) {
                // Create indicator element
                const headerInfo = document.querySelector('#chatModal .chat-header .chat-user-info');
                if (headerInfo) {
                    indicator = document.createElement('div');
                    indicator.id = 'chatProtectionIndicator';
                    indicator.className = 'protection-indicator';
                    indicator.innerHTML = `
                        <i class="fas fa-shield-alt"></i>
                        <span>Protected</span>
                    `;
                    indicator.title = 'This conversation has screenshot protection enabled';
                    headerInfo.appendChild(indicator);
                }
            }
            if (indicator) indicator.style.display = 'flex';
        } else {
            if (indicator) indicator.style.display = 'none';
        }
    },

    // Voice/Video Calls
    async startVoiceCall() {
        // Check if we have a selected conversation OR a pending request recipient
        const pendingRecipient = this.state.pendingRequestRecipient;

        if (!this.state.selectedChat && !pendingRecipient) {
            this.showToast('Please select a conversation first', 'error');
            return;
        }

        // For pending requests, check if recipient allows calls from everyone
        if (!this.state.selectedChat && pendingRecipient) {
            const allowsCalls = await this.checkRecipientAllowsCalls(pendingRecipient.user_id);
            if (!allowsCalls) {
                this.showToast('User does not accept calls', 'error');
                return;
            }

            // Create conversation first, then make the call
            this.showToast('Creating conversation to start call...', 'info');
            const conv = await this.createConversationWithPendingRecipient();
            if (!conv) {
                this.showToast('Could not start call', 'error');
                return;
            }
        }

        const modal = document.getElementById('chatCallModal');
        if (modal) {
            modal.classList.add('active');
            document.getElementById('chatVoiceCallAnimation').style.display = 'flex';
            document.getElementById('chatLocalVideo').style.display = 'none';
            document.getElementById('chatRemoteVideo').style.display = 'none';
            document.getElementById('chatCallStatus').textContent = 'Connecting...';

            // Log call to API (using correct query params format)
            try {
                const token = localStorage.getItem('token') || localStorage.getItem('access_token');
                const profileParams = this.getProfileParams();

                const response = await fetch(
                    `${this.API_BASE_URL}/api/chat/calls?${profileParams}&conversation_id=${this.state.selectedChat}&call_type=voice`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
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
        // Check if we have a selected conversation OR a pending request recipient
        const pendingRecipient = this.state.pendingRequestRecipient;

        if (!this.state.selectedChat && !pendingRecipient) {
            this.showToast('Please select a conversation first', 'error');
            return;
        }

        // For pending requests, check if recipient allows calls from everyone
        if (!this.state.selectedChat && pendingRecipient) {
            const allowsCalls = await this.checkRecipientAllowsCalls(pendingRecipient.user_id);
            if (!allowsCalls) {
                this.showToast('User does not accept calls', 'error');
                return;
            }

            // Create conversation first, then make the call
            this.showToast('Creating conversation to start call...', 'info');
            const conv = await this.createConversationWithPendingRecipient();
            if (!conv) {
                this.showToast('Could not start call', 'error');
                return;
            }
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

                // Log call to API (using correct query params format)
                try {
                    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
                    const profileParams = this.getProfileParams();

                    const response = await fetch(
                        `${this.API_BASE_URL}/api/chat/calls?${profileParams}&conversation_id=${this.state.selectedChat}&call_type=video`,
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
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
    async showContextMenu(event) {
        const menu = document.getElementById('chatContextMenu');
        const messageEl = event.target.closest('.message');

        if (menu && messageEl) {
            menu.style.left = event.clientX + 'px';
            menu.style.top = event.clientY + 'px';
            menu.classList.add('active');

            this.state.contextMenuTarget = messageEl;

            // Get conversation context
            const conv = this.state.selectedConversation;
            const isChannel = conv && conv.type === 'channel';
            const isGroupOrChannel = conv && (conv.type === 'group' || conv.type === 'channel');
            const isChannelAdmin = isChannel && this.isChannelCreator(conv);
            const isChannelMember = isChannel && !isChannelAdmin;

            // Get button references
            const editBtn = document.getElementById('chatEditMsgBtn');
            const deleteBtn = document.getElementById('chatDeleteMsgBtn');
            const pinBtn = document.getElementById('chatPinMsgBtn');
            const replyBtn = document.getElementById('chatReplyMsgBtn');
            const forwardBtn = document.getElementById('chatForwardMsgBtn');
            const copyBtn = document.getElementById('chatCopyMsgBtn');
            const isSent = messageEl.classList.contains('sent');

            // Check if screenshot protection is active (blocks copy for received messages)
            const chatArea = document.getElementById('chatArea');
            const isProtected = chatArea?.classList.contains('screenshot-protected');

            // Show/hide copy button based on screenshot protection
            if (copyBtn) {
                // Can always copy own messages, but not others' messages when protected
                const canCopy = isSent || !isProtected;
                copyBtn.style.display = canCopy ? 'flex' : 'none';
            }

            // Check if forwarding is allowed for this message
            let canForward = true;
            if (!isSent) {
                // Get message sender's profile info
                const messageId = messageEl.dataset.messageId;
                const conversationId = this.state.selectedConversation?.id;
                const messages = this.state.messages[conversationId] || [];
                const messageObj = messages.find(m => String(m.id) === String(messageId));

                if (messageObj?.sender_profile_id && messageObj?.sender_profile_type) {
                    canForward = await this.checkSenderAllowsForwarding(
                        messageObj.sender_profile_id,
                        messageObj.sender_profile_type
                    );
                }
            }

            // Show/hide forward button based on sender's privacy settings
            if (forwardBtn) {
                forwardBtn.style.display = canForward ? 'flex' : 'none';
            }

            // For channel members: only show Copy, Forward (if allowed), and React
            // Hide: Reply, Edit, Delete, Pin
            if (isChannelMember) {
                if (replyBtn) replyBtn.style.display = 'none';
                if (editBtn) editBtn.style.display = 'none';
                if (deleteBtn) deleteBtn.style.display = 'none';
                if (pinBtn) pinBtn.style.display = 'none';
            } else {
                // Normal behavior for non-channels or channel admins
                // Show/hide edit and delete based on if it's own message
                if (editBtn) editBtn.style.display = isSent ? 'flex' : 'none';
                if (deleteBtn) deleteBtn.style.display = isSent ? 'flex' : 'none';

                // Reply is always available for non-channel-members
                if (replyBtn) replyBtn.style.display = 'flex';

                // Show pin button only for groups/channels (and only for admins in channels)
                if (pinBtn) {
                    const isPinned = messageEl.classList.contains('pinned');
                    const canPin = isGroupOrChannel && (!isChannel || isChannelAdmin);
                    pinBtn.style.display = canPin ? 'flex' : 'none';
                    pinBtn.innerHTML = isPinned
                        ? '<i class="fas fa-thumbtack"></i> Unpin Message'
                        : '<i class="fas fa-thumbtack"></i> Pin Message';
                    pinBtn.onclick = () => {
                        const msgId = messageEl.dataset.messageId;
                        if (isPinned) {
                            this.unpinMessage(msgId);
                        } else {
                            this.pinMessage(msgId);
                        }
                        this.hideContextMenu();
                    };
                }
            }
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

        // Check if screenshot protection is enabled for this conversation
        const chatArea = document.getElementById('chatArea');
        const isProtected = chatArea?.classList.contains('screenshot-protected');
        const isSentByMe = this.state.contextMenuTarget.classList.contains('sent');

        // Only block copying of received messages when protection is enabled
        if (isProtected && !isSentByMe) {
            this.showToast('Copying is disabled for this conversation', 'error');
            this.hideContextMenu();
            return;
        }

        const messageText = this.state.contextMenuTarget.querySelector('.message-text');
        if (messageText) {
            navigator.clipboard.writeText(messageText.textContent);
            this.showToast('Message copied', 'success');
        }

        this.hideContextMenu();
    },

    async forwardMessage() {
        // Get the message to forward from context menu target
        const messageEl = this.state.contextMenuTarget;
        if (!messageEl) {
            this.showToast('No message selected', 'error');
            this.hideContextMenu();
            return;
        }

        // Extract message data
        const messageId = messageEl.dataset.messageId;
        const messageBubble = messageEl.querySelector('.message-bubble');
        const messageText = messageBubble?.querySelector('.message-text')?.textContent || '';
        const messageType = messageEl.dataset.messageType || 'text';

        // Get the actual message object from state to get profile IDs
        const conversationId = this.state.selectedConversation?.id;
        const messages = this.state.messages[conversationId] || [];
        const messageObj = messages.find(m => String(m.id) === String(messageId));

        // Check if the original sender has disabled forwarding
        const isSentByMe = messageEl.classList.contains('sent');
        if (!isSentByMe && messageObj) {
            // Check original sender's privacy settings
            const senderProfileId = messageObj.sender_profile_id;
            const senderProfileType = messageObj.sender_profile_type;

            if (senderProfileId && senderProfileType) {
                const canForward = await this.checkSenderAllowsForwarding(senderUserId);
                if (!canForward) {
                    this.showToast('This message cannot be forwarded - sender has disabled forwarding', 'error');
                    this.hideContextMenu();
                    return;
                }
            }
        }

        // Get any media content
        const imageEl = messageBubble?.querySelector('.message-image img');
        const videoEl = messageBubble?.querySelector('.message-video video');
        const audioEl = messageBubble?.querySelector('.voice-message');
        const fileEl = messageBubble?.querySelector('.file-message');

        // Get ORIGINAL sender info using profile IDs
        const isSent = messageEl.classList.contains('sent');
        const messageAvatar = messageEl.querySelector('.message-avatar');
        const userId = this.state.currentUser?.user_id;
        const currentUser = this.state.currentUser;

        let originalSenderName, originalSenderAvatar, originalSenderProfileId, originalSenderProfileType;

        if (isSent) {
            // Message was sent by current user - use current user's profile info
            originalSenderProfileId = currentProfile?.profile_id;
            originalSenderProfileType = currentProfile?.profile_type;
            originalSenderName = currentUser?.full_name ||
                                 `${currentUser?.first_name || ''} ${currentUser?.father_name || ''}`.trim() ||
                                 currentProfile?.name ||
                                 'Unknown';
            originalSenderAvatar = currentUser?.profile_picture ||
                                   currentProfile?.profile_picture ||
                                   document.getElementById('chatCurrentUserAvatar')?.src ||
                                   getChatDefaultAvatar(originalSenderName);
        } else {
            // Message from other user - use their profile info from the message object
            originalSenderProfileId = messageObj?.sender_profile_id || this.state.selectedConversation?.other_profile_id;
            originalSenderProfileType = messageObj?.sender_profile_type || this.state.selectedConversation?.other_profile_type;
            originalSenderName = messageObj?.sender_name ||
                                 this.state.selectedConversation?.display_name ||
                                 this.state.selectedConversation?.name ||
                                 'Unknown';
            originalSenderAvatar = messageObj?.sender_avatar ||
                                   messageAvatar?.src ||
                                   this.state.selectedConversation?.avatar ||
                                   this.state.selectedConversation?.avatar_url ||
                                   getChatDefaultAvatar(originalSenderName);
        }

        const forwardData = {
            id: messageId,
            text: messageText,
            content: messageText,
            message_type: messageType,
            image_url: imageEl?.src || null,
            video_url: videoEl?.src || null,
            audio_url: audioEl?.querySelector('audio')?.src || null,
            file_url: fileEl?.querySelector('a')?.href || null,
            file_name: fileEl?.querySelector('.file-name')?.textContent || null,
            original_sender: originalSenderName,
            original_sender_avatar: originalSenderAvatar,
            original_sender_profile_id: originalSenderProfileId,
            original_sender_profile_type: originalSenderProfileType
        };

        this.hideContextMenu();
        this.enterForwardMode(forwardData);
    },

    // Enter forward mode - show contact selection with checkboxes
    enterForwardMode(messageData) {
        this.state.isForwardMode = true;
        this.state.forwardMode = true;
        this.state.forwardMessage = messageData;
        this.state.forwardSelectedContacts = [];

        const modal = document.getElementById('chatModal');
        if (modal) modal.classList.add('forward-mode');

        // Add forward UI elements to contacts
        this.renderForwardUI();
        this.showForwardPreview();
        this.showToast('Select contacts to forward the message', 'info');
    },

    // Render forward mode UI - checkboxes on contacts
    renderForwardUI() {
        // Add checkboxes to regular contacts
        const contacts = document.querySelectorAll('#chatModal .contact-item:not(.request-item)');
        contacts.forEach(contactEl => {
            // Add checkbox if not exists
            if (!contactEl.querySelector('.forward-checkbox')) {
                const checkbox = document.createElement('div');
                checkbox.className = 'forward-checkbox';
                checkbox.onclick = (e) => {
                    e.stopPropagation();
                    const convId = contactEl.dataset.conversationId;
                    const conv = this.state.conversations.find(c => String(c.id) === String(convId));
                    if (conv) this.toggleForwardContact(conv);
                };
                contactEl.insertBefore(checkbox, contactEl.firstChild);
            }
        });

        // Add forward header to sidebar
        const listEl = document.getElementById('chatContactsList');
        if (listEl && !document.getElementById('forwardHeader')) {
            const header = document.createElement('div');
            header.id = 'forwardHeader';
            header.className = 'forward-header';
            header.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-share" style="color: white; font-size: 0.8rem;"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600; color: white; font-size: 0.95rem;">Forward Message</div>
                            <div style="font-size: 0.8rem; color: rgba(255,255,255,0.8);"><span id="forwardSelectedCount">0</span> selected</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="ChatModalManager.selectAllForwardContacts()" id="forwardSelectAllBtn" class="select-all-forward-btn" style="padding: 6px 12px; font-size: 0.8rem; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                            All
                        </button>
                        <button onclick="ChatModalManager.exitForwardMode()" class="cancel-forward-btn" style="padding: 6px 12px; font-size: 0.8rem; background: rgba(255,255,255,0.15); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                            Cancel
                        </button>
                    </div>
                </div>
            `;
            listEl.parentNode.insertBefore(header, listEl);
        }
    },

    // Select all contacts for forwarding
    selectAllForwardContacts() {
        // Get all valid conversations (not request items)
        const validConversations = this.state.conversations.filter(conv =>
            !conv.is_request && conv.id
        );

        // Check if all are already selected
        const allSelected = validConversations.length === this.state.forwardSelectedContacts.length;

        if (allSelected) {
            // Deselect all
            this.state.forwardSelectedContacts = [];
        } else {
            // Select all
            this.state.forwardSelectedContacts = [...validConversations];
        }

        this.updateForwardUI();
        this.updateSelectAllButton();
    },

    // Update select all button text based on state
    updateSelectAllButton() {
        const btn = document.getElementById('forwardSelectAllBtn');
        if (!btn) return;

        const validConversations = this.state.conversations.filter(conv =>
            !conv.is_request && conv.id
        );
        const allSelected = validConversations.length === this.state.forwardSelectedContacts.length && validConversations.length > 0;

        btn.textContent = allSelected ? 'None' : 'All';
        btn.style.background = allSelected ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.2)';
    },

    // Show forward message preview in the chat area
    showForwardPreview() {
        const chatContent = document.getElementById('chatContent');
        const chatEmptyState = document.getElementById('chatEmptyState');
        const msg = this.state.forwardMessage;

        // Hide normal chat views
        if (chatEmptyState) chatEmptyState.style.display = 'none';
        if (chatContent) chatContent.style.display = 'flex';

        // Create forward preview
        const chatArea = document.getElementById('chatArea');
        if (chatArea) {
            // Build preview content based on message type
            let previewContent = '';
            if (msg.image_url) {
                previewContent = `<img src="${msg.image_url}" alt="Image" style="max-width: 200px; max-height: 150px; border-radius: 8px; margin: 12px 0;">`;
            } else if (msg.video_url) {
                previewContent = `<video src="${msg.video_url}" style="max-width: 200px; max-height: 150px; border-radius: 8px; margin: 12px 0;" controls></video>`;
            } else if (msg.file_url) {
                previewContent = `
                    <div style="display: flex; align-items: center; gap: 8px; padding: 10px; background: var(--bg-tertiary); border-radius: 8px; margin: 12px 0;">
                        <i class="fas fa-file" style="color: var(--button-bg); font-size: 1.2rem;"></i>
                        <span style="color: var(--text-primary);">${this.escapeHtml(msg.file_name || 'File')}</span>
                    </div>
                `;
            }

            chatArea.innerHTML = `
                <div class="forward-preview-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; text-align: center;">
                    <div style="margin-bottom: 20px;">
                        <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, var(--button-bg), var(--button-hover)); display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                            <i class="fas fa-share" style="color: white; font-size: 1.5rem;"></i>
                        </div>
                        <h3 style="color: var(--text-primary); margin-bottom: 5px;">Forward Message</h3>
                        <p style="color: var(--text-muted); font-size: 0.9rem;">Select contacts from the sidebar</p>
                    </div>

                    <div class="forward-message-preview" style="background: var(--bg-secondary); border-radius: 16px; padding: 0; max-width: 380px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden;">
                        <!-- Forwarded By Label -->
                        <div style="padding: 10px 16px 0; text-align: left;">
                            <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: linear-gradient(135deg, rgba(var(--button-rgb, 245, 158, 11), 0.15), rgba(var(--button-rgb, 245, 158, 11), 0.08)); border-radius: 12px; border-left: 3px solid var(--button-bg);">
                                <i class="fas fa-share" style="font-size: 0.7rem; color: var(--button-bg);"></i>
                                <span style="font-size: 0.75rem; font-weight: 600; color: var(--button-bg);">Forwarded</span>
                            </div>
                        </div>
                        <!-- Sender Profile with Avatar -->
                        <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px;">
                            <img src="${msg.original_sender_avatar}" alt="${this.escapeHtml(msg.original_sender)}"
                                 style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--button-bg); box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                                 onerror="this.onerror=null; this.src=getChatDefaultAvatar('${this.escapeHtml(msg.original_sender)}')">
                            <div style="flex: 1; text-align: left;">
                                <div style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem;">${this.escapeHtml(msg.original_sender)}</div>
                                <div style="font-size: 0.7rem; color: var(--text-muted);">Original sender</div>
                            </div>
                        </div>
                        <!-- Message Content -->
                        <div style="padding: 0 16px 16px; border-top: 1px solid rgba(var(--border-rgb, 0, 0, 0), 0.08); margin-top: 4px; padding-top: 12px;">
                            ${previewContent}
                            ${msg.text ? `<p style="color: var(--text-primary); margin: 0; word-break: break-word; line-height: 1.5; text-align: left;">${this.escapeHtml(msg.text)}</p>` : '<p style="color: var(--text-muted); font-style: italic; margin: 0;">[Media message]</p>'}
                        </div>
                    </div>

                    <div id="forwardSelectedDisplay" style="margin-top: 24px; width: 100%; max-width: 500px;">
                        <p style="color: var(--text-muted); font-size: 0.85rem;">No contacts selected yet</p>
                    </div>
                </div>
            `;
        }

        // Keep input available for additional message
        const messageInput = document.getElementById('chatMessageInput');
        const sendBtn = document.getElementById('chatSendBtn');

        if (messageInput) {
            // Update placeholder to indicate optional message
            messageInput.placeholder = 'Add a message (optional)...';
        }

        // Update the main send button to handle forward
        if (sendBtn) {
            sendBtn.dataset.forwardMode = 'true';
            this.updateForwardSendButton();
        }
    },

    // Toggle contact selection for forwarding
    toggleForwardContact(conv) {
        const index = this.state.forwardSelectedContacts.findIndex(c => c.id === conv.id);

        if (index > -1) {
            this.state.forwardSelectedContacts.splice(index, 1);
        } else {
            this.state.forwardSelectedContacts.push(conv);
        }

        this.updateForwardUI();
        this.updateSelectAllButton();
    },

    // Update forward mode UI
    updateForwardUI() {
        const count = this.state.forwardSelectedContacts.length;

        // Update checkboxes
        document.querySelectorAll('#chatModal .contact-item:not(.request-item)').forEach(contactEl => {
            const convId = contactEl.dataset.conversationId;
            const isSelected = this.state.forwardSelectedContacts.some(c => String(c.id) === String(convId));
            const checkbox = contactEl.querySelector('.forward-checkbox');

            if (isSelected) {
                contactEl.classList.add('forward-selected');
                if (checkbox) checkbox.classList.add('checked');
            } else {
                contactEl.classList.remove('forward-selected');
                if (checkbox) checkbox.classList.remove('checked');
            }
        });

        // Update counts
        const countEl = document.getElementById('forwardSelectedCount');
        if (countEl) countEl.textContent = count;

        const toCountEl = document.getElementById('forwardToCount');
        if (toCountEl) toCountEl.textContent = count;

        // Update main send button state for forward mode
        this.updateForwardSendButton();

        // Update selected contacts display - show 7 per row as compact circular avatars
        const display = document.getElementById('forwardSelectedDisplay');
        if (display) {
            if (count === 0) {
                display.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No contacts selected yet</p>';
            } else {
                display.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">
                            <i class="fas fa-users" style="margin-right: 6px;"></i>
                            Sending to ${count} contact${count > 1 ? 's' : ''}
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; justify-items: center; max-width: 100%;">
                            ${this.state.forwardSelectedContacts.map(conv => {
                                const displayName = conv.display_name || conv.name || 'Unknown';
                                const avatarUrl = conv.avatar || conv.avatar_url;
                                return `
                                    <div class="forward-contact-avatar" style="display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer;" title="${this.escapeHtml(displayName)}" onclick="ChatModalManager.toggleForwardContact(ChatModalManager.state.forwardSelectedContacts.find(c => c.id === '${conv.id}') || ChatModalManager.state.conversations.find(c => String(c.id) === '${conv.id}'))">
                                        <div style="position: relative;">
                                            ${avatarUrl
                                                ? `<img src="${avatarUrl}" alt="${this.escapeHtml(displayName)}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid var(--button-bg); box-shadow: 0 2px 8px rgba(0,0,0,0.15);" onerror="this.onerror=null; this.src=getChatDefaultAvatar('${this.escapeHtml(displayName)}')">`
                                                : `<div style="width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, var(--button-bg), var(--button-hover)); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1rem; border: 2px solid var(--button-bg); box-shadow: 0 2px 8px rgba(0,0,0,0.15);">${displayName.charAt(0).toUpperCase()}</div>`
                                            }
                                            <div style="position: absolute; top: -4px; right: -4px; width: 18px; height: 18px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid var(--bg-secondary);">
                                                <i class="fas fa-check" style="color: white; font-size: 0.55rem;"></i>
                                            </div>
                                        </div>
                                        <span style="font-size: 0.65rem; color: var(--text-secondary); max-width: 50px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center;">${this.escapeHtml(displayName.split(' ')[0])}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
        }
    },

    // Update the main send button for forward mode
    updateForwardSendButton() {
        const sendBtn = document.getElementById('chatSendBtn');
        if (!sendBtn || !this.state.forwardMode) return;

        const count = this.state.forwardSelectedContacts.length;

        if (count > 0) {
            sendBtn.disabled = false;
            sendBtn.style.opacity = '1';
            sendBtn.style.cursor = 'pointer';
            // Change icon to forward icon
            sendBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 17 20 12 15 7"></polyline>
                    <path d="M4 18v-2a4 4 0 0 1 4-4h12"></path>
                </svg>
            `;
        } else {
            sendBtn.disabled = true;
            sendBtn.style.opacity = '0.5';
            sendBtn.style.cursor = 'not-allowed';
            sendBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 17 20 12 15 7"></polyline>
                    <path d="M4 18v-2a4 4 0 0 1 4-4h12"></path>
                </svg>
            `;
        }
    },

    // Execute the forward - send message to all selected contacts
    async executeForward() {
        const msg = this.state.forwardMessage;
        const contacts = this.state.forwardSelectedContacts;

        if (!msg || contacts.length === 0) {
            this.showToast('Please select at least one contact', 'warning');
            return;
        }

        const sendBtn = document.getElementById('chatSendBtn');
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const profileParams = this.getProfileParams();

        // Get optional additional message from input
        const messageInput = document.getElementById('chatMessageInput');
        const additionalMessage = messageInput ? messageInput.value.trim() : '';

        let successCount = 0;
        let failCount = 0;

        // Forward message - extract just the actual message content (strip any [Forwarded from...] prefix)
        let forwardedText = msg.text || msg.content || '[Forwarded media]';
        // Remove any existing forwarded prefix like "[Forwarded from You] " or "[Forwarded from Name] "
        forwardedText = forwardedText.replace(/^\[Forwarded from [^\]]+\]\s*/i, '').trim();

        for (const conv of contacts) {
            try {
                let conversationId = conv.id;

                // Create conversation if needed
                const needsConversation =
                    (conv.is_connection && String(conversationId).startsWith('connection-')) ||
                    (conv.is_family && (String(conversationId).startsWith('family-parent-') || String(conversationId).startsWith('family-child-'))) ||
                    (conv.is_tutor_contact && String(conversationId).startsWith('tutor-')) ||
                    (conv.is_enrolled && (String(conversationId).startsWith('enrolled-student-') || String(conversationId).startsWith('enrolled-tutor-') || String(conversationId).startsWith('enrolled-parent-') || String(conversationId).startsWith('child-tutor-')));

                if (needsConversation) {
                    const realConv = await this.createConversationFromConnection(conv);
                    if (realConv) {
                        conversationId = realConv.id;
                    } else {
                        failCount++;
                        continue;
                    }
                }

                // Send the forwarded message with full metadata including profile IDs
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
                            content: forwardedText,
                            message_type: msg.message_type || 'text',
                            is_forwarded: true,
                            forwarded_from: msg.original_sender,
                            forwarded_from_avatar: msg.original_sender_avatar || '',
                            forwarded_from_profile_id: msg.original_sender_profile_id,
                            forwarded_from_profile_type: msg.original_sender_profile_type
                            // Forwarder info comes from sender (current user) - no need to send separately
                        })
                    }
                );

                if (response.ok) {
                    successCount++;

                    // If there's an additional message, send it after the forward
                    if (additionalMessage) {
                        await fetch(
                            `${this.API_BASE_URL}/api/chat/messages?${profileParams}`,
                            {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    conversation_id: conversationId,
                                    content: additionalMessage,
                                    message_type: 'text'
                                })
                            }
                        );
                    }
                } else {
                    failCount++;
                }
            } catch (error) {
                console.error('Error forwarding to conversation:', conv.id, error);
                failCount++;
            }
        }

        // Clear the message input
        if (messageInput) {
            messageInput.value = '';
        }

        // Exit forward mode
        this.exitForwardMode();

        // Show result
        const withMessage = additionalMessage ? ' with your message' : '';
        if (successCount > 0 && failCount === 0) {
            this.showToast(`Message forwarded to ${successCount} contact(s)${withMessage}`, 'success');
        } else if (successCount > 0 && failCount > 0) {
            this.showToast(`Forwarded to ${successCount}, failed for ${failCount}`, 'warning');
        } else {
            this.showToast('Failed to forward message', 'error');
        }
    },

    // Cancel forward (alias for exitForwardMode for the indicator close button)
    cancelForward() {
        this.exitForwardMode();
    },

    // Exit forward mode
    exitForwardMode() {
        this.state.isForwardMode = false;
        this.state.forwardMode = false;
        this.state.forwardMessage = null;
        this.state.forwardSelectedContacts = [];

        const modal = document.getElementById('chatModal');
        if (modal) modal.classList.remove('forward-mode');

        // Remove checkboxes
        document.querySelectorAll('#chatModal .forward-checkbox').forEach(cb => cb.remove());

        // Remove forward-selected class
        document.querySelectorAll('#chatModal .contact-item.forward-selected').forEach(el => {
            el.classList.remove('forward-selected');
        });

        // Remove header
        const header = document.getElementById('forwardHeader');
        if (header) header.remove();

        // Restore send button to normal state
        const sendBtn = document.getElementById('chatSendBtn');
        if (sendBtn) {
            sendBtn.dataset.forwardMode = 'false';
            sendBtn.disabled = false;
            sendBtn.style.opacity = '1';
            sendBtn.style.cursor = 'pointer';
            sendBtn.innerHTML = `
                <svg class="send-icon-normal" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                <svg class="send-icon-tts" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>
            `;
        }

        // Restore input wrapper placeholder
        const messageInput = document.getElementById('chatMessageInput');
        if (messageInput) {
            messageInput.placeholder = 'Type a message...';
        }

        // Restore chat view
        if (this.state.selectedConversation) {
            this.selectConversation(this.state.selectedConversation);
        } else {
            const chatEmptyState = document.getElementById('chatEmptyState');
            const chatContent = document.getElementById('chatContent');
            if (chatEmptyState) chatEmptyState.style.display = 'flex';
            if (chatContent) chatContent.style.display = 'none';
        }
    },

    // =============================================
    // CONTACT CONTEXT MENU & MULTI-SELECT
    // =============================================

    showContactContextMenu(event) {
        const contactEl = event.target.closest('.contact-item');
        if (!contactEl) return;

        const conversationId = contactEl.dataset.conversationId;
        const conv = this.state.conversations.find(c => String(c.id) === String(conversationId));
        if (!conv) return;

        this.state.contactContextMenuTarget = conv;

        // Check current states for this conversation
        const convId = String(conv.id);
        const isConvMuted = this.state.mutedConversations.includes(convId);
        const isGloballyMuted = this.isNotificationsMuted();
        const isMuted = isConvMuted || isGloballyMuted;
        const isPinned = this.state.pinnedConversations.includes(convId);
        const isArchived = this.state.archivedConversations.includes(convId);

        // Create or update context menu
        let menu = document.getElementById('chatContactContextMenu');
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'chatContactContextMenu';
            menu.className = 'contact-context-menu';
            // Append to chatModal so CSS selectors work
            const chatModal = document.getElementById('chatModal');
            if (chatModal) {
                chatModal.appendChild(menu);
            } else {
                document.body.appendChild(menu);
            }
        }

        // Update menu content with current states
        menu.innerHTML = `
            <div class="context-menu-item select-multiple" onclick="ChatModalManager.toggleMultiSelectMode()">
                <i class="fas fa-check-double"></i>
                <span>Select Multiple</span>
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item mute" onclick="ChatModalManager.muteConversation()">
                <i class="fas ${isMuted ? 'fa-bell' : 'fa-bell-slash'}"></i>
                <span>${isMuted ? 'Unmute' : 'Mute'}</span>
            </div>
            <div class="context-menu-item pin" onclick="ChatModalManager.pinConversation()">
                <i class="fas fa-thumbtack" ${isPinned ? 'style="color: var(--button-bg);"' : ''}></i>
                <span>${isPinned ? 'Unpin Chat' : 'Pin Chat'}</span>
            </div>
            <div class="context-menu-item archive" onclick="ChatModalManager.archiveConversation()">
                <i class="fas ${isArchived ? 'fa-inbox' : 'fa-archive'}"></i>
                <span>${isArchived ? 'Unarchive' : 'Archive'}</span>
            </div>
        `;

        // Position the menu
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        menu.classList.add('active');
    },

    hideContactContextMenu() {
        const menu = document.getElementById('chatContactContextMenu');
        if (menu) {
            menu.classList.remove('active');
        }
    },

    toggleMultiSelectMode() {
        this.hideContactContextMenu();
        this.state.isMultiSelectMode = !this.state.isMultiSelectMode;

        const modal = document.getElementById('chatModal');

        if (this.state.isMultiSelectMode) {
            // Enter multi-select mode
            this.state.selectedContacts = [];

            // Add multi-select-mode class to modal for CSS targeting
            if (modal) modal.classList.add('multi-select-mode');

            // Add checkboxes to all contacts FIRST (before selecting)
            this.renderMultiSelectUI();
            this.showMultiSelectChatArea();

            // Now select the right-clicked contact (after UI elements exist)
            if (this.state.contactContextMenuTarget) {
                this.toggleContactSelection(this.state.contactContextMenuTarget);
            }
        } else {
            // Exit multi-select mode
            if (modal) modal.classList.remove('multi-select-mode');
            this.exitMultiSelectMode();
        }
    },

    renderMultiSelectUI() {
        // Add checkboxes to regular contacts
        const contacts = document.querySelectorAll('#chatModal .contact-item:not(.request-item)');
        contacts.forEach(contactEl => {
            // Add checkbox if not exists
            if (!contactEl.querySelector('.multi-select-checkbox')) {
                const checkbox = document.createElement('div');
                checkbox.className = 'multi-select-checkbox';
                // Check icon handled by CSS ::after pseudo-element
                checkbox.onclick = (e) => {
                    e.stopPropagation();
                    const convId = contactEl.dataset.conversationId;
                    const conv = this.state.conversations.find(c => String(c.id) === String(convId));
                    if (conv) this.toggleContactSelection(conv);
                };
                contactEl.insertBefore(checkbox, contactEl.firstChild);
            }

            // Update click handler
            contactEl.dataset.originalClick = 'true';
        });

        // Add disabled state to request items (pending requests can't be selected)
        const requestItems = document.querySelectorAll('#chatModal .contact-item.request-item');
        requestItems.forEach(requestEl => {
            // Add disabled class for styling
            requestEl.classList.add('multi-select-disabled');

            // Add tooltip if not exists
            if (!requestEl.querySelector('.multi-select-disabled-tooltip')) {
                const tooltip = document.createElement('div');
                tooltip.className = 'multi-select-disabled-tooltip';
                const direction = requestEl.dataset.direction;
                tooltip.textContent = direction === 'incoming'
                    ? 'Accept request first to message'
                    : 'Request must be accepted to message';
                requestEl.appendChild(tooltip);
            }

            // Block click events in multi-select mode
            if (!requestEl.dataset.multiSelectBlocked) {
                requestEl.dataset.multiSelectBlocked = 'true';
                requestEl.addEventListener('click', this.blockRequestClickInMultiSelect.bind(this), true);
            }
        });

        // Add multi-select header to sidebar
        const listEl = document.getElementById('chatContactsList');
        if (listEl && !document.getElementById('multiSelectHeader')) {
            const header = document.createElement('div');
            header.id = 'multiSelectHeader';
            header.className = 'multi-select-header';
            header.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-users" style="color: white; font-size: 0.8rem;"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600; color: white; font-size: 0.95rem;">Select Multiple Contacts</div>
                            <div style="font-size: 0.8rem; color: rgba(255,255,255,0.8);"><span id="selectedCount">0</span> selected</div>
                            <div style="display: flex; align-items: center; gap: 4px; color: rgba(255,255,255,0.7); font-size: 0.75rem; margin-top: 2px;">
                                <i class="fas fa-arrow-down" style="font-size: 0.65rem;"></i>
                                <span>Click to select</span>
                            </div>
                        </div>
                    </div>
                    <div class="select-actions" style="display: flex; gap: 8px;">
                        <button onclick="ChatModalManager.selectAllContacts()" class="select-all-btn" style="padding: 4px 10px; font-size: 0.8rem; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                            All
                        </button>
                        <button onclick="ChatModalManager.exitMultiSelectMode()" class="cancel-select-btn" style="padding: 4px 10px; font-size: 0.8rem; background: rgba(255,255,255,0.15); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                            Cancel
                        </button>
                    </div>
                </div>
            `;
            listEl.parentNode.insertBefore(header, listEl);
        }
    },

    blockRequestClickInMultiSelect(e) {
        // Only block if in multi-select mode
        if (this.state.isMultiSelectMode) {
            e.stopPropagation();
            e.preventDefault();
            // Show the tooltip briefly
            const tooltip = e.currentTarget.querySelector('.multi-select-disabled-tooltip');
            if (tooltip) {
                tooltip.classList.add('visible');
                setTimeout(() => tooltip.classList.remove('visible'), 2000);
            }
        }
    },

    toggleContactSelection(conv) {
        const index = this.state.selectedContacts.findIndex(c => c.id === conv.id);

        if (index > -1) {
            // Remove from selection
            this.state.selectedContacts.splice(index, 1);
        } else {
            // Add to selection
            this.state.selectedContacts.push(conv);
        }

        // Update UI
        this.updateContactSelectionUI();
        this.updateMultiSelectChatArea();
    },

    updateContactSelectionUI() {
        // Update checkboxes
        document.querySelectorAll('#chatModal .contact-item:not(.request-item)').forEach(contactEl => {
            const convId = contactEl.dataset.conversationId;
            const isSelected = this.state.selectedContacts.some(c => String(c.id) === String(convId));
            const checkbox = contactEl.querySelector('.multi-select-checkbox');

            if (isSelected) {
                contactEl.classList.add('multi-selected');
                if (checkbox) checkbox.classList.add('checked');
            } else {
                contactEl.classList.remove('multi-selected');
                if (checkbox) checkbox.classList.remove('checked');
            }
        });

        // Update count
        const countEl = document.getElementById('selectedCount');
        if (countEl) {
            countEl.textContent = this.state.selectedContacts.length;
        }
    },

    selectAllContacts() {
        this.state.selectedContacts = [...this.state.conversations];
        this.updateContactSelectionUI();
        this.updateMultiSelectChatArea();
    },

    exitMultiSelectMode() {
        this.state.isMultiSelectMode = false;
        this.state.selectedContacts = [];

        // Remove multi-select-mode class from modal
        const modal = document.getElementById('chatModal');
        if (modal) modal.classList.remove('multi-select-mode');

        // Remove checkboxes
        document.querySelectorAll('#chatModal .multi-select-checkbox').forEach(cb => cb.remove());

        // Remove multi-selected class
        document.querySelectorAll('#chatModal .contact-item.multi-selected').forEach(el => {
            el.classList.remove('multi-selected');
        });

        // Clean up request items disabled state
        document.querySelectorAll('#chatModal .contact-item.request-item').forEach(requestEl => {
            requestEl.classList.remove('multi-select-disabled');
            const tooltip = requestEl.querySelector('.multi-select-disabled-tooltip');
            if (tooltip) tooltip.remove();
            delete requestEl.dataset.multiSelectBlocked;
        });

        // Remove header
        const header = document.getElementById('multiSelectHeader');
        if (header) header.remove();

        // Restore the original user-info header
        const userInfo = document.querySelector('#chatContent .user-info');
        if (userInfo && userInfo.dataset.originalContent) {
            userInfo.innerHTML = userInfo.dataset.originalContent;
            delete userInfo.dataset.originalContent;
        }

        // Restore header actions visibility
        const headerActions = document.querySelector('#chatContent .header-actions');
        if (headerActions) headerActions.style.display = '';

        // Restore normal chat view
        const chatArea = document.getElementById('chatArea');
        if (chatArea) {
            if (this.state.selectedConversation) {
                this.selectConversation(this.state.selectedConversation);
            } else {
                chatArea.innerHTML = `
                    <div class="chat-empty" style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                        <i class="fas fa-comments" style="font-size: 3rem; opacity: 0.3; margin-bottom: 16px;"></i>
                        <p>Select a conversation to start messaging</p>
                    </div>
                `;
            }
        }
    },

    showMultiSelectChatArea() {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        // Show chat content area if hidden
        const chatContent = document.getElementById('chatContent');
        const emptyState = document.getElementById('chatEmptyState');
        if (chatContent) chatContent.style.display = 'flex';
        if (emptyState) emptyState.style.display = 'none';

        // Update the user-info header to show multi-select mode
        this.updateMultiSelectHeader();

        // Only show selected contacts - no header text
        chatArea.innerHTML = `
            <div class="multi-select-chat-area" style="height: 100%; padding: 20px; overflow-y: auto;">
                <div id="multiSelectContactsDisplay" style="width: 100%;">
                    <p style="text-align: center; color: var(--text-muted);">No contacts selected yet</p>
                </div>
            </div>
        `;
    },

    // Update the user-info header for multi-select mode
    updateMultiSelectHeader() {
        const userInfo = document.querySelector('#chatContent .user-info');
        if (!userInfo) return;

        // Store original content for restoration
        if (!userInfo.dataset.originalContent) {
            userInfo.dataset.originalContent = userInfo.innerHTML;
        }

        userInfo.innerHTML = `
            <div class="multi-select-user-info" style="display: flex; align-items: center; width: 100%; gap: 12px;">
                <div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, var(--button-bg), var(--button-hover)); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fas fa-paper-plane" style="color: white; font-size: 1rem;"></i>
                </div>
                <div style="flex: 1;">
                    <h2 style="margin: 0; font-size: 1rem; color: var(--text-primary); font-weight: 600;">Send to Multiple Contacts</h2>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">Select contacts from the left, then type your message below</span>
                    <span style="font-size: 0.8rem; color: var(--button-bg); margin-left: 8px; font-weight: 500;" id="multiSelectHeaderCount">(0 selected)</span>
                </div>
                <button onclick="ChatModalManager.exitMultiSelectMode()"
                    style="padding: 8px 14px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 6px; font-size: 0.85rem;">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        `;

        // Hide header actions
        const headerActions = document.querySelector('#chatContent .header-actions');
        if (headerActions) headerActions.style.display = 'none';
    },

    // Update multi-select header count
    updateMultiSelectHeaderChips() {
        const countEl = document.getElementById('multiSelectHeaderCount');
        const sidebarCountEl = document.getElementById('selectedCount');

        const count = this.state.selectedContacts.length;

        // Update user-info header count
        if (countEl) {
            countEl.textContent = `(${count} selected)`;
        }

        // Update sidebar header count
        if (sidebarCountEl) {
            sidebarCountEl.textContent = count;
        }
    },

    updateMultiSelectChatArea() {
        const display = document.getElementById('multiSelectContactsDisplay');
        if (!display) return;

        if (this.state.selectedContacts.length === 0) {
            display.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No contacts selected yet</p>';
        } else {
            display.innerHTML = `
                <div class="selected-contacts-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">
                    ${this.state.selectedContacts.map(conv => {
                        const displayName = conv.display_name || conv.name || 'Unknown';
                        const avatarUrl = conv.avatar || conv.avatar_url;
                        const avatarHtml = avatarUrl
                            ? `<img src="${avatarUrl}" alt="${displayName}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">`
                            : `<div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--button-bg), var(--button-hover)); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.8rem;">${displayName.charAt(0)}</div>`;

                        return `
                            <div class="selected-contact-chip" data-conv-id="${conv.id}"
                                style="display: flex; align-items: center; gap: 6px; padding: 5px 8px; background: var(--bg-secondary); border-radius: 18px; border: 2px solid var(--button-bg);">
                                ${avatarHtml}
                                <span style="font-weight: 500; color: var(--text-primary); font-size: 0.8rem; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayName}</span>
                                <button onclick="ChatModalManager.removeFromSelection('${conv.id}')"
                                    style="width: 18px; height: 18px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #ef4444; flex-shrink: 0;">
                                    <i class="fas fa-times" style="font-size: 0.55rem;"></i>
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        // Update the header counts
        this.updateMultiSelectHeaderChips();
    },

    removeFromSelection(convId) {
        const conv = this.state.selectedContacts.find(c => String(c.id) === String(convId));
        if (conv) {
            this.toggleContactSelection(conv);
        }
    },

    async sendToMultipleContacts() {
        // Use the existing chat input
        const input = document.getElementById('chatMessageInput');
        const messageText = input?.value.trim();

        if (!messageText || this.state.selectedContacts.length === 0) {
            this.showToast('Please select contacts and enter a message', 'warning');
            return;
        }

        // Disable send button while sending
        const sendBtn = document.getElementById('chatSendBtn');
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const profileParams = this.getProfileParams();
        const user = this.state.currentUser;
        const userId = this.state.currentUser?.user_id;

        let successCount = 0;
        let failCount = 0;

        for (const conv of this.state.selectedContacts) {
            try {
                let conversationId = conv.id;

                // If this is a synthetic conversation (connection without real conversation), create one first
                const needsConversation =
                    (conv.is_connection && String(conversationId).startsWith('connection-')) ||
                    (conv.is_family && (String(conversationId).startsWith('family-parent-') || String(conversationId).startsWith('family-child-'))) ||
                    (conv.is_tutor_contact && String(conversationId).startsWith('tutor-')) ||
                    (conv.is_enrolled && (String(conversationId).startsWith('enrolled-student-') || String(conversationId).startsWith('enrolled-tutor-') || String(conversationId).startsWith('enrolled-parent-') || String(conversationId).startsWith('child-tutor-')));

                if (needsConversation) {
                    const realConv = await this.createConversationFromConnection(conv);
                    if (realConv) {
                        conversationId = realConv.id;
                    } else {
                        failCount++;
                        continue;
                    }
                }

                // Send message to this conversation
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
                            message_type: 'text',
                            content: messageText
                        })
                    }
                );

                if (response.ok) {
                    successCount++;

                    // Add message to local state
                    const messageData = {
                        id: `msg-${Date.now()}-${conv.id}`,
                        text: messageText,
                        content: messageText,
                        message_type: 'text',
                        sender_id: profile?.profile_id || 'me',
                        sender_name: user?.full_name || user?.first_name || 'You',
                        time: new Date(),
                        sent: true,
                        is_mine: true
                    };

                    if (!this.state.messages[conversationId]) {
                        this.state.messages[conversationId] = [];
                    }
                    this.state.messages[conversationId].push(messageData);

                    // Update last message in conversation
                    this.updateConversationLastMessage(conversationId, messageText);
                } else {
                    failCount++;
                }
            } catch (error) {
                console.error(`Error sending to ${conv.name}:`, error);
                failCount++;
            }
        }

        // Restore send button
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
                </svg>
            `;
        }

        // Show result
        if (successCount > 0 && failCount === 0) {
            this.showToast(`Message sent to ${successCount} contact${successCount > 1 ? 's' : ''}!`, 'success');
        } else if (successCount > 0 && failCount > 0) {
            this.showToast(`Sent to ${successCount}, failed for ${failCount} contact(s)`, 'warning');
        } else {
            this.showToast('Failed to send messages', 'error');
        }

        // Clear input and exit multi-select mode
        if (input) input.value = '';
        this.exitMultiSelectMode();
    },

    muteConversation() {
        this.hideContactContextMenu();
        const conv = this.state.contactContextMenuTarget;
        if (!conv) return;

        const convId = String(conv.id);
        const index = this.state.mutedConversations.indexOf(convId);

        if (index > -1) {
            // Unmute
            this.state.mutedConversations.splice(index, 1);
            this.showToast('Conversation unmuted', 'success');
        } else {
            // Mute
            this.state.mutedConversations.push(convId);
            this.showToast('Conversation muted', 'success');
        }

        // Save to localStorage
        localStorage.setItem('chat_muted', JSON.stringify(this.state.mutedConversations));

        // Update UI
        this.updateConversationBadges(convId);
    },

    pinConversation() {
        this.hideContactContextMenu();
        const conv = this.state.contactContextMenuTarget;
        if (!conv) return;

        const convId = String(conv.id);
        const index = this.state.pinnedConversations.indexOf(convId);

        if (index > -1) {
            // Unpin
            this.state.pinnedConversations.splice(index, 1);
            this.showToast('Conversation unpinned', 'success');
        } else {
            // Pin
            this.state.pinnedConversations.push(convId);
            this.showToast('Conversation pinned', 'success');
        }

        // Save to localStorage
        localStorage.setItem('chat_pinned', JSON.stringify(this.state.pinnedConversations));

        // Update UI - reorder contacts list with pinned at top
        this.reorderContactsWithPinned();
        this.updateConversationBadges(convId);
    },

    archiveConversation() {
        this.hideContactContextMenu();
        const conv = this.state.contactContextMenuTarget;
        if (!conv) return;

        const convId = String(conv.id);
        const index = this.state.archivedConversations.indexOf(convId);
        const wasArchived = index > -1;

        if (wasArchived) {
            // Unarchive
            this.state.archivedConversations.splice(index, 1);
            this.showToast('Conversation unarchived', 'success');

            // Switch to All filter to show the unarchived contact
            this.switchToAllFilter();
        } else {
            // Archive
            this.state.archivedConversations.push(convId);
            this.showToast('Conversation archived', 'success');
        }

        // Save to localStorage
        localStorage.setItem('chat_archived', JSON.stringify(this.state.archivedConversations));

        // Update UI - hide/show based on current filter
        this.renderContactsList();

        // Update info panel if open
        this.updateInfoPanelActions();
    },

    // Show delete contact confirmation modal
    showDeleteContactConfirmation() {
        this.hideContactContextMenu();

        // Get contact info from context menu target or current conversation
        const conv = this.state.contactContextMenuTarget || this.state.currentConversation;
        if (!conv) {
            this.showToast('No contact selected', 'error');
            return;
        }

        // Store the contact to delete
        this.state.contactToDelete = conv;

        // Get other participant info
        const otherParticipant = conv.participants?.find(p =>
            String(p.profile_id) !== String(this.state.currentUser?.profile_id) ||
            p.profile_type !== this.state.currentUser?.role
        ) || conv.other_user || {};

        const contactName = otherParticipant.name || conv.display_name || 'this contact';
        const contactAvatar = otherParticipant.profile_picture || otherParticipant.avatar ||
            conv.avatar || 'system_images/default-avatar.png';

        // Update modal content
        const modal = document.getElementById('deleteContactModal');
        const avatarEl = document.getElementById('deleteContactAvatar');
        const nameEl = document.getElementById('deleteContactName');

        if (avatarEl) avatarEl.src = contactAvatar;
        if (nameEl) nameEl.textContent = contactName;

        // Show modal
        if (modal) {
            modal.classList.add('active');
        }
    },

    // Confirm and execute delete contact
    async confirmDeleteContact() {
        const conv = this.state.contactToDelete;
        if (!conv) {
            this.showToast('No contact selected', 'error');
            hideDeleteContactConfirmation();
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                this.showToast('Please log in to delete contacts', 'error');
                hideDeleteContactConfirmation();
                return;
            }

            // Get connection info from conversation
            const otherParticipant = conv.participants?.find(p =>
                String(p.profile_id) !== String(this.state.currentUser?.profile_id) ||
                p.profile_type !== this.state.currentUser?.role
            ) || conv.other_user || {};

            // Delete connection from database
            const connectionResponse = await fetch(`${API_BASE_URL}/api/connections/delete`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    profile_id: otherParticipant.profile_id,
                    profile_type: otherParticipant.profile_type
                })
            });

            // Also delete the conversation
            if (conv.id) {
                await fetch(`${API_BASE_URL}/api/chat/conversations/${conv.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }

            // Remove from local state
            this.state.conversations = this.state.conversations.filter(c => c.id !== conv.id);

            // Remove from muted/pinned/archived if present
            const convId = String(conv.id);
            this.state.mutedConversations = this.state.mutedConversations.filter(id => id !== convId);
            this.state.pinnedConversations = this.state.pinnedConversations.filter(id => id !== convId);
            this.state.archivedConversations = this.state.archivedConversations.filter(id => id !== convId);

            // Save to localStorage
            localStorage.setItem('chat_muted', JSON.stringify(this.state.mutedConversations));
            localStorage.setItem('chat_pinned', JSON.stringify(this.state.pinnedConversations));
            localStorage.setItem('chat_archived', JSON.stringify(this.state.archivedConversations));

            // Clear current conversation if it's the one being deleted
            if (this.state.currentConversation?.id === conv.id) {
                this.state.currentConversation = null;
                document.getElementById('chatContent').style.display = 'none';
                document.getElementById('chatEmptyState').style.display = 'flex';

                // Close info panel if open
                const infoPanel = document.getElementById('chatInfoPanel');
                if (infoPanel) infoPanel.classList.remove('active');
            }

            // Re-render contacts list
            this.renderContactsList();

            // Show success message
            this.showToast('Contact deleted successfully', 'success');

            // Clear the contact to delete
            this.state.contactToDelete = null;

        } catch (error) {
            console.error('Error deleting contact:', error);
            this.showToast('Failed to delete contact', 'error');
        }

        // Hide the modal
        hideDeleteContactConfirmation();
    },

    // Switch to All filter (used when unarchiving/unblocking)
    switchToAllFilter() {
        const allTab = document.querySelector('#chatModal .sidebar-tabs .tab-btn[data-tab="all"]');
        if (allTab) {
            // Remove active from all tabs
            document.querySelectorAll('#chatModal .sidebar-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
            // Add active to All tab
            allTab.classList.add('active');
            // Apply filter
            this.filterContacts('all');
            this.updateCreateButtonVisibility('all');
        }
    },

    // Helper to update mute/pin badges on a conversation
    updateConversationBadges(convId) {
        const contactEl = document.querySelector(`[data-conversation-id="${convId}"]`);
        if (!contactEl) return;

        const isMuted = this.state.mutedConversations.includes(convId);
        const isPinned = this.state.pinnedConversations.includes(convId);

        // Remove existing badges
        contactEl.querySelectorAll('.mute-badge, .pin-badge').forEach(b => b.remove());

        // Add badges
        const contactInfo = contactEl.querySelector('.contact-info');
        if (contactInfo) {
            const header = contactInfo.querySelector('.contact-header');
            if (header) {
                if (isPinned) {
                    const pinBadge = document.createElement('span');
                    pinBadge.className = 'pin-badge';
                    pinBadge.innerHTML = '<i class="fas fa-thumbtack" style="font-size: 0.7rem; color: var(--button-bg); margin-left: 6px;"></i>';
                    header.querySelector('h4').appendChild(pinBadge);
                }
                if (isMuted) {
                    const muteBadge = document.createElement('span');
                    muteBadge.className = 'mute-badge';
                    muteBadge.innerHTML = '<i class="fas fa-bell-slash" style="font-size: 0.7rem; color: var(--text-muted); margin-left: 6px;"></i>';
                    header.querySelector('h4').appendChild(muteBadge);
                }
            }
        }
    },

    // Reorder contacts list with pinned conversations at the top
    reorderContactsWithPinned() {
        const listEl = document.getElementById('chatContactsList');
        if (!listEl) return;

        // Get all contact items (not requests)
        const contacts = Array.from(listEl.querySelectorAll('.contact-item:not(.request-item)'));

        // Sort: pinned first, then by original order
        contacts.sort((a, b) => {
            const aId = a.dataset.conversationId;
            const bId = b.dataset.conversationId;
            const aPinned = this.state.pinnedConversations.includes(aId);
            const bPinned = this.state.pinnedConversations.includes(bId);

            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return 0;
        });

        // Re-append in sorted order (after any headers/request sections)
        const firstContact = listEl.querySelector('.contact-item:not(.request-item)');
        const insertPoint = firstContact ? firstContact : null;

        contacts.forEach(contact => {
            if (insertPoint && insertPoint.parentNode === listEl) {
                listEl.insertBefore(contact, insertPoint);
            } else {
                listEl.appendChild(contact);
            }
        });
    },

    // Check if conversation is muted
    isConversationMuted(convId) {
        return this.state.mutedConversations.includes(String(convId));
    },

    // Update global mute indicators when "Mute all chats" setting changes
    updateGlobalMuteIndicators() {
        const isGloballyMuted = this.isNotificationsMuted();

        // 1. Update all contact cards in the contacts list - use existing .mute-badge
        document.querySelectorAll('#chatContactsList .contact-item').forEach(contactEl => {
            const header = contactEl.querySelector('.contact-header h4');
            if (!header) return;

            const convId = contactEl.dataset.conversationId;
            const isConvMuted = convId && this.isConversationMuted(convId);

            // Use existing mute-badge class (same as individual mute)
            let muteBadge = header.querySelector('.mute-badge');

            // Show mute badge if globally muted OR individually muted
            if (isGloballyMuted || isConvMuted) {
                if (!muteBadge) {
                    muteBadge = document.createElement('span');
                    muteBadge.className = 'mute-badge';
                    muteBadge.innerHTML = '<i class="fas fa-bell-slash" style="font-size: 0.7rem; color: var(--text-muted); margin-left: 6px;"></i>';
                    header.appendChild(muteBadge);
                }
            } else {
                // Remove mute badge if not muted (neither globally nor individually)
                if (muteBadge) {
                    muteBadge.remove();
                }
            }
        });

        // 2. Update the mute card in info panel to reflect mute state
        // Individual mute always takes priority over global mute
        const muteCard = document.getElementById('infoPanelMuteCard');
        if (muteCard) {
            const icon = muteCard.querySelector('.action-card-icon i');
            const title = muteCard.querySelector('.action-card-title');
            const conv = this.state.selectedConversation;
            const isConvMuted = conv && this.isConversationMuted(conv.id);

            // Show muted if either individually muted OR globally muted
            const shouldShowMuted = isConvMuted || isGloballyMuted;

            if (shouldShowMuted) {
                muteCard.classList.add('active');
                if (icon) icon.className = 'fas fa-bell-slash';
                if (title) title.textContent = 'Muted';
                // Add visual indicator if globally muted (not individually)
                if (isGloballyMuted && !isConvMuted) {
                    muteCard.classList.add('globally-muted');
                    muteCard.setAttribute('title', 'All chats are muted from settings');
                } else {
                    muteCard.classList.remove('globally-muted');
                    muteCard.removeAttribute('title');
                }
            } else {
                muteCard.classList.remove('active', 'globally-muted');
                muteCard.removeAttribute('title');
                if (icon) icon.className = 'fas fa-bell';
                if (title) title.textContent = 'Mute';
            }
        }
    },

    // Check if conversation is pinned
    isConversationPinned(convId) {
        return this.state.pinnedConversations.includes(String(convId));
    },

    // Check if conversation is archived
    isConversationArchived(convId) {
        return this.state.archivedConversations.includes(String(convId));
    },

    // Toggle mute from info panel
    toggleMuteFromInfoPanel() {
        const conv = this.state.selectedConversation;
        if (!conv) return;

        this.state.contactContextMenuTarget = conv;
        this.muteConversation();
        this.updateInfoPanelActions();
    },

    // Toggle pin from info panel
    togglePinFromInfoPanel() {
        const conv = this.state.selectedConversation;
        if (!conv) return;

        this.state.contactContextMenuTarget = conv;
        this.pinConversation();
        this.updateInfoPanelActions();
    },

    // Toggle archive from info panel
    toggleArchiveFromInfoPanel() {
        const conv = this.state.selectedConversation;
        if (!conv) return;

        this.state.contactContextMenuTarget = conv;
        this.archiveConversation();
        this.updateInfoPanelActions();
    },

    // Update info panel action buttons to reflect current state
    updateInfoPanelActions() {
        const conv = this.state.selectedConversation;
        if (!conv) return;

        const convId = String(conv.id);
        const isMuted = this.state.mutedConversations.includes(convId);
        const isPinned = this.state.pinnedConversations.includes(convId);
        const isArchived = this.state.archivedConversations.includes(convId);

        // Update mute card
        const muteCard = document.getElementById('infoPanelMuteCard');
        if (muteCard) {
            muteCard.classList.toggle('active', isMuted);
            const icon = muteCard.querySelector('.action-card-icon i');
            const title = muteCard.querySelector('.action-card-title');
            if (icon) icon.className = isMuted ? 'fas fa-bell-slash' : 'fas fa-bell';
            if (title) title.textContent = isMuted ? 'Unmute' : 'Mute';
        }

        // Update pin card
        const pinCard = document.getElementById('infoPanelPinCard');
        if (pinCard) {
            pinCard.classList.toggle('active', isPinned);
            const title = pinCard.querySelector('.action-card-title');
            if (title) title.textContent = isPinned ? 'Unpin' : 'Pin';
        }

        // Update archive card
        const archiveCard = document.getElementById('infoPanelArchiveCard');
        if (archiveCard) {
            archiveCard.classList.toggle('active', isArchived);
            const icon = archiveCard.querySelector('.action-card-icon i');
            const title = archiveCard.querySelector('.action-card-title');
            if (icon) icon.className = isArchived ? 'fas fa-inbox' : 'fas fa-archive';
            if (title) title.textContent = isArchived ? 'Unarchive' : 'Archive';
        }

        // Show/hide members tab button for groups/channels
        const membersTabBtn = document.getElementById('chatMembersTabBtn');
        const isGroupOrChannel = conv.type === 'group' || conv.type === 'channel';
        if (membersTabBtn) {
            membersTabBtn.style.display = isGroupOrChannel ? 'inline-block' : 'none';
        }

        // Show/hide polls tab button for groups/channels only
        const pollsTabBtn = document.getElementById('chatPollsTabBtn');
        if (pollsTabBtn) {
            pollsTabBtn.style.display = isGroupOrChannel ? 'inline-block' : 'none';
        }

        // Show/hide create poll button based on permissions
        // For channels, only admin can create polls. For groups, anyone can.
        const createPollBtn = document.querySelector('#chatPollsTab .create-poll-btn');
        if (createPollBtn && conv) {
            const canCreatePoll = conv.type !== 'channel' || this.isChannelCreator(conv);
            createPollBtn.style.display = canCreatePoll ? 'flex' : 'none';
        }

        // Show/hide Add Member vs Leave button for groups/channels
        const addMemberBtn = document.getElementById('chatAddMemberBtn');
        const leaveGroupBtn = document.getElementById('chatLeaveGroupBtn');
        const leaveGroupBtnText = document.getElementById('chatLeaveGroupBtnText');

        if (isGroupOrChannel && addMemberBtn && leaveGroupBtn) {
            // Determine if user is admin/creator
            const isChannel = conv.type === 'channel';
            const isAdmin = this.isCurrentUserAdmin(conv);

            if (isAdmin) {
                // Admin/creator sees Add Member button
                addMemberBtn.style.display = 'flex';
                leaveGroupBtn.style.display = 'none';
            } else {
                // Regular member sees Leave button
                addMemberBtn.style.display = 'none';
                leaveGroupBtn.style.display = 'flex';
                // Update button text based on type
                if (leaveGroupBtnText) {
                    leaveGroupBtnText.textContent = isChannel ? 'Leave Channel' : 'Leave Group';
                }
            }
        } else if (addMemberBtn && leaveGroupBtn) {
            // Not a group/channel - hide both
            addMemberBtn.style.display = 'none';
            leaveGroupBtn.style.display = 'none';
        }
    },

    // Load group/channel members list
    async loadGroupMembersList() {
        const membersList = document.getElementById('chatMembersList');
        const membersCount = document.getElementById('chatMembersCount');
        if (!membersList) return;

        const conv = this.state.selectedConversation;
        if (!conv || (conv.type !== 'group' && conv.type !== 'channel')) {
            membersList.innerHTML = '';
            return;
        }

        // Show loading
        membersList.innerHTML = '<div class="members-loading"><i class="fas fa-spinner fa-spin"></i> Loading members...</div>';

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();

            // Fetch conversation details to get participants
            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/conversations/${conv.id}?${profileParams}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (response.ok) {
                const data = await response.json();
                const participants = data.participants || [];

                // Update members count (use "subscribers" for channels)
                if (membersCount) {
                    const isChannel = conv.type === 'channel';
                    const label = isChannel ? 'subscriber' : 'member';
                    membersCount.textContent = `${participants.length} ${label}${participants.length !== 1 ? 's' : ''}`;
                }

                // Check if current user is admin
                const userId = this.state.currentUser?.user_id;
                const isCurrentUserAdmin = participants.some(p =>
                    p.profile_id == currentProfile?.profile_id &&
                    p.profile_type === currentProfile?.profile_type &&
                    p.role === 'admin'
                );

                // Render members
                if (participants.length === 0) {
                    membersList.innerHTML = '<p class="no-media">No members</p>';
                } else {
                    const isChannel = conv.type === 'channel';
                    const removeTitle = isChannel ? 'Remove from channel' : 'Remove from group';

                    membersList.innerHTML = participants.map(member => {
                        const isCurrentUser = member.profile_id == currentProfile?.profile_id &&
                                              member.profile_type === currentProfile?.profile_type;
                        // For channels, only creator can remove. For groups, admins can remove
                        const isCreator = this.isChannelCreator(conv);
                        const canRemove = (isChannel ? isCreator : isCurrentUserAdmin) && !isCurrentUser && member.role !== 'admin';

                        return `
                        <div class="member-item" data-user-id="${member.user_id}" data-profile-id="${member.profile_id}" data-profile-type="${member.profile_type}">
                            <img src="${member.avatar || getChatDefaultAvatar(member.display_name || 'User')}"
                                 alt="${member.display_name}"
                                 class="member-avatar"
                                 onerror="this.onerror=null; this.src=getChatDefaultAvatar('${member.display_name || 'User'}')">
                            <div class="member-info">
                                <span class="member-name">${member.display_name || 'Unknown'}${isCurrentUser ? ' (You)' : ''}</span>
                                <span class="member-role ${member.role === 'admin' ? 'admin' : ''}">${member.role === 'admin' ? 'Admin' : this.capitalizeFirst(member.profile_type)}</span>
                            </div>
                            ${member.role === 'admin' ? '<i class="fas fa-crown member-admin-badge" title="Admin"></i>' : ''}
                            ${canRemove ? `
                                <button class="remove-member-btn" onclick="event.stopPropagation(); ChatModalManager.removeMember(${member.profile_id}, '${member.profile_type}')" title="${removeTitle}">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : ''}
                        </div>
                    `}).join('');
                }
            } else {
                membersList.innerHTML = '<p class="no-media">Failed to load members</p>';
            }
        } catch (error) {
            console.error('Error loading members:', error);
            membersList.innerHTML = '<p class="no-media">Failed to load members</p>';
        }
    },

    // Remove a member from group/channel
    async removeMember(userId) {
        const conv = this.state.selectedConversation;
        if (!conv) return;

        const isChannel = conv.type === 'channel';
        const entityLabel = isChannel ? 'channel' : 'group';
        const memberLabel = isChannel ? 'subscriber' : 'member';

        // Confirm removal
        if (!confirm(`Are you sure you want to remove this ${memberLabel} from the ${entityLabel}?`)) {
            return;
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/conversations/${conv.id}/participants/${profileId}/${profileType}?${profileParams}`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (response.ok) {
                this.showToast(`${this.capitalizeFirst(memberLabel)} removed successfully`, 'success');
                // Refresh the members list
                await this.loadGroupMembersList();
            } else {
                const error = await response.json();
                this.showToast(error.detail || `Failed to remove ${memberLabel}`, 'error');
            }
        } catch (error) {
            console.error('Error removing member:', error);
            this.showToast(`Failed to remove ${memberLabel}`, 'error');
        }
    },

    // Leave a group or channel (for non-admin members)
    async leaveGroupOrChannel() {
        const conv = this.state.selectedConversation;
        if (!conv || (conv.type !== 'group' && conv.type !== 'channel')) {
            this.showToast('Cannot leave this conversation', 'error');
            return;
        }

        const isChannel = conv.type === 'channel';
        const entityLabel = isChannel ? 'channel' : 'group';

        // Confirm leaving
        if (!confirm(`Are you sure you want to leave this ${entityLabel}? You will no longer receive messages from it.`)) {
            return;
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const userId = this.state.currentUser?.user_id;
            if (!this.state.currentUser) {
                this.showToast('Profile not found', 'error');
                return;
            }

            const profileParams = this.getProfileParams();

            // Use the same endpoint as removeMember but remove self
            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/conversations/${conv.id}/participants/${userId}?${profileParams}`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (response.ok) {
                this.showToast(`You have left the ${entityLabel}`, 'success');

                // Close the info panel
                const infoPanel = document.getElementById('chatInfoPanel');
                if (infoPanel) infoPanel.classList.remove('open');

                // Remove the conversation from the list
                const contactEl = document.querySelector(`[data-conversation-id="${conv.id}"]`);
                if (contactEl) contactEl.remove();

                // Clear the current selection and show empty state
                this.state.selectedChat = null;
                this.state.selectedConversation = null;
                document.getElementById('chatEmptyState').style.display = 'flex';
                document.getElementById('chatContent').style.display = 'none';

                // Reload conversations to ensure the list is up to date
                await this.loadConversations();
            } else {
                const error = await response.json();
                this.showToast(error.detail || `Failed to leave ${entityLabel}`, 'error');
            }
        } catch (error) {
            console.error('Error leaving group/channel:', error);
            this.showToast(`Failed to leave ${entityLabel}`, 'error');
        }
    },

    // Pin a message (for groups/channels)
    async pinMessage(messageId) {
        if (!messageId) return;

        // Convert to string for consistent comparison
        const msgIdStr = String(messageId);

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/messages/${messageId}/pin?${profileParams}`,
                {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (response.ok) {
                this.showToast('Message pinned', 'success');

                // Update the message in state to reflect pinned status
                const convId = this.state.selectedConversation?.id;
                if (convId && this.state.messages[convId]) {
                    const msgIndex = this.state.messages[convId].findIndex(m => String(m.id) === msgIdStr);
                    if (msgIndex !== -1) {
                        this.state.messages[convId][msgIndex].is_pinned = true;
                    }
                }

                // Add pinned indicator to the message in chat area
                // Search all message elements in the chat area
                const chatArea = document.getElementById('chatArea');
                if (chatArea) {
                    const allMessages = chatArea.querySelectorAll('.message[data-message-id]');
                    allMessages.forEach(msgEl => {
                        if (msgEl.dataset.messageId === msgIdStr || msgEl.dataset.messageId === messageId) {
                            msgEl.classList.add('pinned');
                            // Add pin icon if not exists
                            const bubble = msgEl.querySelector('.message-bubble');
                            if (bubble && !bubble.querySelector('.pinned-indicator')) {
                                const indicator = document.createElement('span');
                                indicator.className = 'pinned-indicator';
                                indicator.innerHTML = '<i class="fas fa-thumbtack"></i>';
                                bubble.insertBefore(indicator, bubble.firstChild);
                            }
                        }
                    });
                }

                // Refresh pinned messages display
                await this.loadPinnedMessages();
            } else {
                this.showToast('Failed to pin message', 'error');
            }
        } catch (error) {
            console.error('Error pinning message:', error);
            this.showToast('Failed to pin message', 'error');
        }
    },

    // Unpin a message
    async unpinMessage(messageId) {
        if (!messageId) return;

        // Convert to string for consistent comparison
        const msgIdStr = String(messageId);

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/messages/${messageId}/pin`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (response.ok) {
                this.showToast('Message unpinned', 'success');

                // Update the message in state to reflect unpinned status
                const convId = this.state.selectedConversation?.id;
                if (convId && this.state.messages[convId]) {
                    const msgIndex = this.state.messages[convId].findIndex(m => String(m.id) === msgIdStr);
                    if (msgIndex !== -1) {
                        this.state.messages[convId][msgIndex].is_pinned = false;
                    }
                }

                // Remove pinned indicator from the message in chat area
                // Search all message elements in the chat area
                const chatArea = document.getElementById('chatArea');
                if (chatArea) {
                    const allMessages = chatArea.querySelectorAll('.message[data-message-id]');
                    allMessages.forEach(msgEl => {
                        if (msgEl.dataset.messageId === msgIdStr || msgEl.dataset.messageId === messageId) {
                            msgEl.classList.remove('pinned');
                            const indicator = msgEl.querySelector('.pinned-indicator');
                            if (indicator) indicator.remove();
                        }
                    });
                }

                // Also remove the pinned message item from the pinned section immediately
                const pinnedItems = document.querySelectorAll('.pinned-message-item');
                pinnedItems.forEach(item => {
                    if (item.dataset.messageId === msgIdStr || item.dataset.messageId === messageId) {
                        item.remove();
                    }
                });

                // Check if there are any pinned messages left, hide section if empty
                const pinnedSection = document.getElementById('chatPinnedMessages');
                const pinnedList = pinnedSection?.querySelector('.pinned-messages-list');
                if (pinnedList && pinnedList.children.length === 0) {
                    pinnedSection.style.display = 'none';
                }

                // Refresh pinned messages display to ensure sync with server
                await this.loadPinnedMessages();
            } else {
                this.showToast('Failed to unpin message', 'error');
            }
        } catch (error) {
            console.error('Error unpinning message:', error);
            this.showToast('Failed to unpin message', 'error');
        }
    },

    // Load and display pinned messages for current conversation
    async loadPinnedMessages() {
        const pinnedSection = document.getElementById('chatPinnedMessages');
        const pinnedList = pinnedSection?.querySelector('.pinned-messages-list');

        if (!pinnedSection || !pinnedList) return;

        const conv = this.state.selectedConversation;

        // Only show pinned messages for groups and channels
        if (!conv || (conv.type !== 'group' && conv.type !== 'channel')) {
            pinnedSection.style.display = 'none';
            return;
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();

            // Fetch conversation details which include pinned_messages
            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/conversations/${conv.id}?${profileParams}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (response.ok) {
                const data = await response.json();
                const pinnedMessages = data.pinned_messages || [];

                if (pinnedMessages.length === 0) {
                    pinnedSection.style.display = 'none';
                    return;
                }

                // Show pinned messages section
                pinnedSection.style.display = 'block';

                // Render pinned messages
                pinnedList.innerHTML = pinnedMessages.map(msg => {
                    const senderName = msg.first_name ? `${msg.first_name} ${msg.father_name || ''}`.trim() : 'Unknown';
                    const content = msg.content || '';
                    const truncatedContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
                    const pinnedAt = msg.pinned_at ? this.formatTimeAgo(msg.pinned_at) : '';

                    return `
                        <div class="pinned-message-item" data-message-id="${msg.id}" onclick="ChatModalManager.scrollToMessage(${msg.id})">
                            <div class="pinned-message-icon">
                                <i class="fas fa-thumbtack"></i>
                            </div>
                            <div class="pinned-message-content">
                                <div class="pinned-message-sender">${senderName}</div>
                                <div class="pinned-message-text">${this.escapeHtml(truncatedContent)}</div>
                            </div>
                            <button class="pinned-message-unpin" onclick="event.stopPropagation(); ChatModalManager.unpinMessage(${msg.id})" title="Unpin">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
                }).join('');
            } else {
                pinnedSection.style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading pinned messages:', error);
            pinnedSection.style.display = 'none';
        }
    },

    // Scroll to a specific message in the chat
    scrollToMessage(messageId) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageEl) {
            messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight the message briefly
            messageEl.classList.add('highlight-message');
            setTimeout(() => {
                messageEl.classList.remove('highlight-message');
            }, 2000);
        }
    },

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

                // Switch to All filter to show the unblocked contact
                this.switchToAllFilter();
                this.renderContactsList();
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

            // Switch to All filter to show the unblocked contact
            this.switchToAllFilter();
            this.renderContactsList();
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

        // Find and activate the clicked tab button
        const tabBtn = document.querySelector(`#chatModal .media-tab[onclick="showChatMediaTab('${tab}')"]`);
        if (tabBtn) {
            tabBtn.classList.add('active');
        }
        document.getElementById(`chat${this.capitalizeFirst(tab)}Tab`)?.classList.add('active');
    },

    // Poll Management
    polls: [],

    openCreatePollModal() {
        // Check if user can create polls in this conversation
        const conv = this.state.selectedConversation;
        if (conv && conv.type === 'channel' && !this.isChannelCreator(conv)) {
            this.showToast('Only the channel admin can create polls', 'error');
            return;
        }

        // Create poll modal HTML if it doesn't exist
        let pollModal = document.getElementById('createPollModal');
        if (!pollModal) {
            pollModal = document.createElement('div');
            pollModal.id = 'createPollModal';
            pollModal.className = 'create-poll-modal';
            pollModal.innerHTML = `
                <div class="create-poll-modal-overlay" onclick="ChatModalManager.closeCreatePollModal()"></div>
                <div class="create-poll-modal-content">
                    <div class="create-poll-header">
                        <h3>Create Poll</h3>
                        <button class="create-poll-close" onclick="ChatModalManager.closeCreatePollModal()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="create-poll-body">
                        <div class="poll-question-input">
                            <label>Question</label>
                            <input type="text" id="pollQuestionInput" placeholder="Ask a question..." maxlength="200">
                        </div>
                        <div class="poll-options-container" id="pollOptionsContainer">
                            <label>Options</label>
                            <div class="poll-option-input">
                                <input type="text" placeholder="Option 1" maxlength="100">
                                <button class="remove-option-btn" onclick="ChatModalManager.removePollOption(this)" style="display: none;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M18 6L6 18M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                            <div class="poll-option-input">
                                <input type="text" placeholder="Option 2" maxlength="100">
                                <button class="remove-option-btn" onclick="ChatModalManager.removePollOption(this)" style="display: none;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M18 6L6 18M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <button class="add-option-btn" onclick="ChatModalManager.addPollOption()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 5v14M5 12h14"></path>
                            </svg>
                            Add Option
                        </button>
                        <div class="poll-end-time">
                            <label>Poll ends in</label>
                            <select id="pollEndTime">
                                <option value="1">1 hour</option>
                                <option value="6">6 hours</option>
                                <option value="12">12 hours</option>
                                <option value="24" selected>1 day</option>
                                <option value="72">3 days</option>
                                <option value="168">1 week</option>
                                <option value="0">No end time</option>
                            </select>
                        </div>
                        <div class="poll-settings">
                            <label class="poll-setting">
                                <input type="checkbox" id="pollMultipleChoice">
                                <span>Allow multiple answers</span>
                            </label>
                            <label class="poll-setting">
                                <input type="checkbox" id="pollAnonymous">
                                <span>Anonymous voting</span>
                            </label>
                        </div>
                    </div>
                    <div class="create-poll-footer">
                        <button class="cancel-poll-btn" onclick="ChatModalManager.closeCreatePollModal()">Cancel</button>
                        <button class="submit-poll-btn" onclick="ChatModalManager.submitPoll()">Create Poll</button>
                    </div>
                </div>
            `;
            document.getElementById('chatModal').appendChild(pollModal);
        }
        pollModal.style.display = 'flex';
    },

    closeCreatePollModal() {
        const pollModal = document.getElementById('createPollModal');
        if (pollModal) {
            pollModal.style.display = 'none';
            // Reset form
            const questionInput = document.getElementById('pollQuestionInput');
            if (questionInput) questionInput.value = '';
            const endTimeSelect = document.getElementById('pollEndTime');
            if (endTimeSelect) endTimeSelect.value = '24';
            const multipleChoice = document.getElementById('pollMultipleChoice');
            if (multipleChoice) multipleChoice.checked = false;
            const anonymous = document.getElementById('pollAnonymous');
            if (anonymous) anonymous.checked = false;
            const optionsContainer = document.getElementById('pollOptionsContainer');
            if (optionsContainer) {
                optionsContainer.innerHTML = `
                    <label>Options</label>
                    <div class="poll-option-input">
                        <input type="text" placeholder="Option 1" maxlength="100">
                        <button class="remove-option-btn" onclick="ChatModalManager.removePollOption(this)" style="display: none;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="poll-option-input">
                        <input type="text" placeholder="Option 2" maxlength="100">
                        <button class="remove-option-btn" onclick="ChatModalManager.removePollOption(this)" style="display: none;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                `;
            }
        }
    },

    addPollOption() {
        const optionsContainer = document.getElementById('pollOptionsContainer');
        const optionInputs = optionsContainer.querySelectorAll('.poll-option-input');
        if (optionInputs.length >= 10) {
            this.showToast('Maximum 10 options allowed', 'warning');
            return;
        }
        const newOption = document.createElement('div');
        newOption.className = 'poll-option-input';
        newOption.innerHTML = `
            <input type="text" placeholder="Option ${optionInputs.length + 1}" maxlength="100">
            <button class="remove-option-btn" onclick="ChatModalManager.removePollOption(this)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
            </button>
        `;
        optionsContainer.appendChild(newOption);
        // Show remove buttons if more than 2 options
        this.updatePollRemoveButtons();
    },

    removePollOption(button) {
        const optionsContainer = document.getElementById('pollOptionsContainer');
        const optionInputs = optionsContainer.querySelectorAll('.poll-option-input');
        if (optionInputs.length <= 2) {
            this.showToast('Minimum 2 options required', 'warning');
            return;
        }
        button.parentElement.remove();
        this.updatePollRemoveButtons();
        // Update placeholder numbers
        const remaining = optionsContainer.querySelectorAll('.poll-option-input input');
        remaining.forEach((input, i) => {
            input.placeholder = `Option ${i + 1}`;
        });
    },

    updatePollRemoveButtons() {
        const optionsContainer = document.getElementById('pollOptionsContainer');
        const optionInputs = optionsContainer.querySelectorAll('.poll-option-input');
        const showRemove = optionInputs.length > 2;
        optionInputs.forEach(opt => {
            const btn = opt.querySelector('.remove-option-btn');
            if (btn) btn.style.display = showRemove ? 'flex' : 'none';
        });
    },

    async submitPoll() {
        const question = document.getElementById('pollQuestionInput')?.value.trim();
        const optionsContainer = document.getElementById('pollOptionsContainer');
        const optionInputs = optionsContainer.querySelectorAll('.poll-option-input input');
        const options = Array.from(optionInputs).map(input => input.value.trim()).filter(v => v);
        const multipleChoice = document.getElementById('pollMultipleChoice')?.checked || false;
        const anonymous = document.getElementById('pollAnonymous')?.checked || false;
        const endTimeHours = parseInt(document.getElementById('pollEndTime')?.value || '24');

        if (!question) {
            this.showToast('Please enter a question', 'error');
            return;
        }
        if (options.length < 2) {
            this.showToast('Please add at least 2 options', 'error');
            return;
        }

        const conv = this.state.selectedConversation;
        if (!conv || !conv.id) {
            this.showToast('Please select a conversation first', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();

            // Send to API
            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/polls?${profileParams}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        conversation_id: conv.id,
                        question,
                        options,
                        multiple_choice: multipleChoice,
                        anonymous,
                        end_time_hours: endTimeHours
                    })
                }
            );

            if (response.ok) {
                const data = await response.json();
                const poll = this.transformPollFromAPI(data.poll);

                // Add to polls array
                this.polls.push(poll);

                // Post poll as a message in chat area
                this.postPollToChat(poll);

                // Update polls list in sidebar
                this.renderPollsList();

                // Close modal
                this.closeCreatePollModal();
                this.showToast('Poll created successfully!', 'success');

                console.log('Poll created:', poll);
            } else {
                const error = await response.json();
                this.showToast(error.detail || 'Failed to create poll', 'error');
            }
        } catch (error) {
            console.error('Error creating poll:', error);
            // Fallback to local-only poll if API fails
            this.createLocalPoll(question, options, multipleChoice, anonymous, endTimeHours);
        }
    },

    // Fallback for when API is unavailable
    createLocalPoll(question, options, multipleChoice, anonymous, endTimeHours) {
        const now = new Date();
        const pollId = Date.now();
        const endTime = endTimeHours > 0 ? new Date(now.getTime() + endTimeHours * 60 * 60 * 1000) : null;

        const poll = {
            id: pollId,
            question,
            options: options.map((text, i) => ({
                id: pollId * 100 + i, // Unique option IDs based on poll ID
                text,
                votes: 0,
                percentage: 0,
                voters: []
            })),
            multipleChoice,
            anonymous,
            totalVotes: 0,
            status: 'active',
            createdAt: now.toISOString(),
            endTime: endTime ? endTime.toISOString() : null,
            timeRemaining: this.getPollTimeRemaining({ endTime: endTime ? endTime.toISOString() : null }),
            createdBy: this.currentUserId,
            userVotes: []
        };

        this.polls.push(poll);
        this.postPollToChat(poll);
        this.renderPollsList();
        this.closeCreatePollModal();
        this.showToast('Poll created (offline mode)', 'info');
    },

    // Transform poll data from API to local format
    transformPollFromAPI(apiPoll) {
        return {
            id: apiPoll.id,
            question: apiPoll.question,
            options: apiPoll.options.map(opt => ({
                id: opt.id,
                text: opt.text,
                votes: opt.votes,
                percentage: opt.percentage,
                voters: opt.voters || []
            })),
            multipleChoice: apiPoll.multiple_choice,
            anonymous: apiPoll.anonymous,
            totalVotes: apiPoll.total_votes,
            status: apiPoll.status,
            createdAt: apiPoll.created_at,
            endTime: apiPoll.end_time,
            timeRemaining: apiPoll.time_remaining,
            createdBy: apiPoll.created_by ? {
                profile_id: apiPoll.created_by.profile_id,
                profile_type: apiPoll.created_by.profile_type,
                name: apiPoll.created_by.name
            } : null,
            userVotes: apiPoll.user_votes || []
        };
    },

    // Load polls for current conversation from API
    async loadConversationPolls() {
        const conv = this.state.selectedConversation;
        if (!conv || !conv.id) return;

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/polls/conversation/${conv.id}?${profileParams}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (response.ok) {
                const data = await response.json();
                this.polls = (data.polls || []).map(p => this.transformPollFromAPI(p));
                this.renderPollsList();

                // Also render polls in chat area if they exist
                this.polls.forEach(poll => {
                    if (!document.querySelector(`[data-poll-id="${poll.id}"]`)) {
                        this.postPollToChat(poll);
                    }
                });
            }
        } catch (error) {
            console.error('Error loading polls:', error);
        }
    },

    // Post poll as a message in the chat area
    postPollToChat(poll) {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        const typingIndicator = document.getElementById('chatTypingIndicator');
        const pollMessageId = `poll-msg-${poll.id}`;

        const pollMessageHtml = this.createPollMessageHtml(poll, pollMessageId);

        // Insert before typing indicator
        if (typingIndicator) {
            typingIndicator.insertAdjacentHTML('beforebegin', pollMessageHtml);
        } else {
            chatArea.insertAdjacentHTML('beforeend', pollMessageHtml);
        }

        // Scroll to the new poll
        const pollMessage = document.getElementById(pollMessageId);
        if (pollMessage) {
            pollMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    },

    // Create poll message HTML for chat area
    createPollMessageHtml(poll, messageId) {
        const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
        const isEnded = poll.status === 'ended' || (poll.endTime && new Date(poll.endTime) < new Date());
        const timeRemaining = this.getPollTimeRemaining(poll);

        // Check if current user is the poll creator
        const userId = this.state.currentUser?.user_id;
        // Handle both old format (createdBy as user_id) and new format (createdBy as object)
        let isCreator = false;
        if (profile && poll.createdBy) {
            if (typeof poll.createdBy === 'object') {
                // New format: createdBy is an object with profile_id and profile_type
                isCreator = String(userId) === String(poll.createdBy.profile_id) &&
                    userId === poll.createdBy.user_id;
            } else {
                // Old format: createdBy was just user_id - compare with current user_id
                isCreator = String(profile.user_id) === String(poll.createdBy);
            }
        }

        console.log('Poll delete check:', {
            pollId: poll.id,
            isCreator,
            userId: userId,
            createdBy: poll.createdBy
        });

        return `
            <div class="message sent poll-message" id="${messageId}" data-poll-id="${poll.id}">
                <div class="message-content">
                    <div class="message-bubble poll-bubble">
                        <div class="poll-header">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 20V10"></path>
                                <path d="M12 20V4"></path>
                                <path d="M6 20v-6"></path>
                            </svg>
                            <span>Poll</span>
                            ${poll.multipleChoice ? '<span class="poll-badge">Multiple choice</span>' : ''}
                            ${isCreator ? `
                                <button class="poll-delete-btn" onclick="event.stopPropagation(); deletePoll(${poll.id})" title="Delete poll">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M3 6h18"></path>
                                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
                                        <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                        <div class="poll-question">${this.escapeHtml(poll.question)}</div>
                        <div class="poll-options">
                            ${poll.options.map((opt) => {
                                const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                                const isSelected = opt.voters.includes(this.currentUserId);
                                return `
                                    <div class="poll-option ${isSelected ? 'selected' : ''} ${isEnded ? 'ended' : ''}"
                                         onclick="${isEnded ? '' : `votePoll(${poll.id}, ${opt.id})`}"
                                         ${isEnded ? 'style="cursor: default;"' : ''}>
                                        <div class="poll-option-row">
                                            <div class="poll-option-radio"></div>
                                            <span class="poll-option-text">${this.escapeHtml(opt.text)}</span>
                                            <span class="poll-option-percent">${percentage}%</span>
                                        </div>
                                        <div class="poll-option-progress">
                                            <div class="poll-option-progress-bar" style="width: ${percentage}%"></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <div class="poll-footer">
                            <span class="poll-votes">${totalVotes} vote${totalVotes !== 1 ? 's' : ''}</span>
                            ${timeRemaining ? `<span class="poll-time-remaining">${timeRemaining}</span>` : ''}
                            ${isEnded ? '<span class="poll-ended-badge">Ended</span>' : ''}
                        </div>
                    </div>
                    <span class="message-time">${this.formatTime(new Date(poll.createdAt))}</span>
                </div>
            </div>
        `;
    },

    // Get remaining time for poll
    getPollTimeRemaining(poll) {
        if (!poll.endTime) return null;
        const now = new Date();
        const end = new Date(poll.endTime);
        const diff = end - now;

        if (diff <= 0) return null;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours >= 24) {
            const days = Math.floor(hours / 24);
            return `${days}d left`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m left`;
        } else {
            return `${minutes}m left`;
        }
    },

    // Update poll message in chat area
    updatePollInChat(poll) {
        const pollMessage = document.querySelector(`[data-poll-id="${poll.id}"]`);
        if (pollMessage) {
            const newHtml = this.createPollMessageHtml(poll, pollMessage.id);
            pollMessage.outerHTML = newHtml;
        }
    },

    // Render polls list in sidebar (just cards that link to chat)
    renderPollsList() {
        const pollsList = document.getElementById('chatPollsList');
        if (!pollsList) return;

        // Filter polls for current conversation
        const conversationPolls = this.polls.filter(p => true); // In real app, filter by conversation

        if (conversationPolls.length === 0) {
            pollsList.innerHTML = '<p class="no-media">No polls yet</p>';
            return;
        }

        // Get current profile for creator check
        const userId = this.state.currentUser?.user_id;

        pollsList.innerHTML = conversationPolls.map(poll => {
            const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
            const isEnded = poll.status === 'ended' || (poll.endTime && new Date(poll.endTime) < new Date());
            const timeRemaining = this.getPollTimeRemaining(poll);

            // Check if current user is the poll creator
            // Handle both old format (createdBy as user_id) and new format (createdBy as object)
            let isCreator = false;
            if (profile && poll.createdBy) {
                if (typeof poll.createdBy === 'object') {
                    // New format: createdBy is an object with profile_id and profile_type
                    isCreator = String(userId) === String(poll.createdBy.profile_id) &&
                        userId === poll.createdBy.user_id;
                } else {
                    // Old format: createdBy was just user_id - compare with current user_id
                    isCreator = String(profile.user_id) === String(poll.createdBy);
                }
            }

            return `
                <div class="poll-card" onclick="scrollToPoll(${poll.id})">
                    <div class="poll-card-header">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 20V10"></path>
                            <path d="M12 20V4"></path>
                            <path d="M6 20v-6"></path>
                        </svg>
                        <span class="poll-card-status ${isEnded ? 'ended' : 'active'}">${isEnded ? 'Ended' : 'Active'}</span>
                        ${isCreator ? `
                            <button class="poll-card-delete-btn" onclick="event.stopPropagation(); deletePoll(${poll.id})" title="Delete poll">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18"></path>
                                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
                                    <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                    <div class="poll-card-question">${this.escapeHtml(poll.question)}</div>
                    <div class="poll-card-meta">
                        <span>${totalVotes} vote${totalVotes !== 1 ? 's' : ''}</span>
                        ${timeRemaining ? `<span>${timeRemaining}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    // Scroll to poll in chat area
    scrollToPoll(pollId) {
        const pollMessage = document.querySelector(`[data-poll-id="${pollId}"]`);
        if (pollMessage) {
            pollMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight briefly
            pollMessage.classList.add('poll-highlight');
            setTimeout(() => pollMessage.classList.remove('poll-highlight'), 2000);
        }
    },

    async votePoll(pollId, optionId) {
        const poll = this.polls.find(p => p.id === pollId);
        if (!poll) return;

        // Check if poll has ended
        if (poll.status === 'ended' || (poll.endTime && new Date(poll.endTime) < new Date())) {
            this.showToast('This poll has ended', 'info');
            return;
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const userId = this.state.currentUser?.user_id;
            if (!userId) {
                console.error('Chat: No profile loaded for voting');
                this.showToast('Please refresh the page and try again', 'error');
                return;
            }

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/polls/${pollId}/vote?${profileParams}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ option_id: optionId })
                }
            );

            if (response.ok) {
                const data = await response.json();

                // Update local poll with API response
                const updatedPoll = this.transformPollFromAPI(data.poll);
                const pollIndex = this.polls.findIndex(p => p.id === pollId);
                if (pollIndex !== -1) {
                    this.polls[pollIndex] = updatedPoll;
                }

                // Update poll in chat area
                this.updatePollInChat(updatedPoll);

                // Update polls list in sidebar
                this.renderPollsList();

                this.showToast(data.action === 'added' ? 'Vote recorded!' : 'Vote removed!', 'success');
            } else {
                const errorData = await response.json();
                this.showToast(errorData.detail || 'Failed to vote', 'error');
            }
        } catch (error) {
            console.error('Error voting on poll:', error);
            // Fallback to local voting if API fails
            this.voteLocalPoll(pollId, optionId);
        }
    },

    // Fallback local voting when API is unavailable
    voteLocalPoll(pollId, optionId) {
        const poll = this.polls.find(p => p.id === pollId);
        if (!poll) return;

        const userId = this.currentUserId;
        const option = poll.options.find(opt => opt.id === optionId);
        if (!option) return;

        // Check if user already voted
        const alreadyVoted = poll.options.some(opt => opt.voters.includes(userId));

        if (poll.multipleChoice) {
            // Toggle vote for multiple choice
            if (option.voters.includes(userId)) {
                option.voters = option.voters.filter(id => id !== userId);
                option.votes--;
            } else {
                option.voters.push(userId);
                option.votes++;
            }
        } else {
            // Single choice - remove previous vote if exists
            if (alreadyVoted) {
                poll.options.forEach(opt => {
                    if (opt.voters.includes(userId)) {
                        opt.voters = opt.voters.filter(id => id !== userId);
                        opt.votes--;
                    }
                });
            }
            // Add new vote
            if (!option.voters.includes(userId)) {
                option.voters.push(userId);
                option.votes++;
            }
        }

        // Update poll in chat area
        this.updatePollInChat(poll);

        // Update polls list in sidebar
        this.renderPollsList();

        this.showToast('Vote recorded! (offline mode)', 'success');
    },

    // Delete a poll (only for creator)
    async deletePoll(pollId) {
        const poll = this.polls.find(p => p.id === pollId);
        if (!poll) return;

        // Confirm deletion
        if (!confirm('Are you sure you want to delete this poll? This action cannot be undone.')) {
            return;
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const userId = this.state.currentUser?.user_id;
            if (!userId) {
                console.error('Chat: No profile loaded for deleting poll');
                this.showToast('Please refresh the page and try again', 'error');
                return;
            }

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/polls/${pollId}?${profileParams}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                // Remove poll from local array
                const pollIndex = this.polls.findIndex(p => p.id === pollId);
                if (pollIndex !== -1) {
                    this.polls.splice(pollIndex, 1);
                }

                // Remove poll message from chat area
                const pollMessage = document.querySelector(`[data-poll-id="${pollId}"]`);
                if (pollMessage) {
                    pollMessage.remove();
                }

                // Update polls list in sidebar
                this.renderPollsList();

                this.showToast('Poll deleted successfully', 'success');
            } else {
                const errorData = await response.json();
                this.showToast(errorData.detail || 'Failed to delete poll', 'error');
            }
        } catch (error) {
            console.error('Error deleting poll:', error);
            this.showToast('Failed to delete poll', 'error');
        }
    },

    // Member Management
    openAddMemberModal() {
        const conv = this.state.selectedConversation;
        if (!conv || (conv.type !== 'group' && conv.type !== 'channel')) {
            this.showToast('You can only add members to groups or channels', 'info');
            return;
        }

        const isChannel = conv.type === 'channel';
        const memberLabel = isChannel ? 'Subscribers' : 'Members';

        // Create add member modal HTML if it doesn't exist
        let memberModal = document.getElementById('addMemberModal');
        if (!memberModal) {
            memberModal = document.createElement('div');
            memberModal.id = 'addMemberModal';
            memberModal.className = 'add-member-modal';
            memberModal.innerHTML = `
                <div class="add-member-modal-overlay" onclick="ChatModalManager.closeAddMemberModal()"></div>
                <div class="add-member-modal-content">
                    <div class="add-member-header">
                        <h3 id="addMemberModalTitle">Add ${memberLabel}</h3>
                        <button class="add-member-close" onclick="ChatModalManager.closeAddMemberModal()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="add-member-body">
                        <div class="member-search-input">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="M21 21l-4.35-4.35"></path>
                            </svg>
                            <input type="text" id="memberSearchInput" placeholder="Search contacts..." oninput="ChatModalManager.searchMembersToAdd(this.value)">
                        </div>
                        <div class="member-contacts-list" id="memberContactsList">
                            <p class="no-contacts">Loading contacts...</p>
                        </div>
                        <div class="selected-members" id="selectedMembersContainer" style="display: none;">
                            <label id="selectedMembersLabel">Selected ${memberLabel}</label>
                            <div class="selected-members-list" id="selectedMembersList"></div>
                        </div>
                    </div>
                    <div class="add-member-footer">
                        <button class="add-member-cancel-btn" onclick="ChatModalManager.closeAddMemberModal()">Cancel</button>
                        <button class="add-member-submit-btn" onclick="ChatModalManager.submitAddMembers()" id="addMembersSubmitBtn" disabled>
                            Add ${memberLabel}
                        </button>
                    </div>
                </div>
            `;
            document.getElementById('chatModal').appendChild(memberModal);
        } else {
            // Update labels for existing modal
            const title = document.getElementById('addMemberModalTitle');
            const selectedLabel = document.getElementById('selectedMembersLabel');
            const submitBtn = document.getElementById('addMembersSubmitBtn');
            if (title) title.textContent = `Add ${memberLabel}`;
            if (selectedLabel) selectedLabel.textContent = `Selected ${memberLabel}`;
            if (submitBtn) submitBtn.textContent = `Add ${memberLabel}`;
        }

        // Reset state
        this.selectedMembersToAdd = [];
        document.getElementById('memberSearchInput').value = '';
        document.getElementById('selectedMembersContainer').style.display = 'none';
        document.getElementById('selectedMembersList').innerHTML = '';
        document.getElementById('addMembersSubmitBtn').disabled = true;

        // Load available contacts
        this.loadContactsForMemberAdd();

        // Show modal
        memberModal.classList.add('active');
    },

    closeAddMemberModal() {
        const modal = document.getElementById('addMemberModal');
        if (modal) {
            modal.classList.remove('active');
        }
        this.selectedMembersToAdd = [];
    },

    selectedMembersToAdd: [],

    async loadContactsForMemberAdd() {
        const contactsList = document.getElementById('memberContactsList');
        contactsList.innerHTML = `
            <div class="contacts-loading">
                <div class="loading-spinner"></div>
                <p>Loading contacts...</p>
            </div>
        `;

        try {
            // Get existing members of the conversation by fetching from API
            const conv = this.state.selectedConversation;
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();

            // Fetch current participants from API to ensure we have accurate list
            let existingMemberIds = [];
            try {
                const response = await fetch(
                    `${this.API_BASE_URL}/api/chat/conversations/${conv.id}?${profileParams}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                if (response.ok) {
                    const data = await response.json();
                    existingMemberIds = (data.participants || []).map(p => p.user_id);
                    // Update conversation with participants
                    this.state.selectedConversation.participants = data.participants;
                }
            } catch (e) {
                // Fall back to cached participants
                existingMemberIds = (conv.participants || []).map(p => p.user_id);
            }

            // Get valid contacts from conversations (same approach as loadGroupContacts)
            const validContacts = this.state.conversations.filter(c => {
                const convId = String(c.id);
                const isArchived = this.state.archivedConversations.includes(convId);
                const isBlocked = this.state.blockedContacts.some(
                    b => b.profile_id === c.other_profile_id && b.profile_type === c.other_profile_type
                );
                const isRequest = c.status === 'request_sent' || c.status === 'request_received';
                const isGroup = c.type === 'group' || c.type === 'channel';
                // Also filter out existing members
                const isExistingMember = existingMemberIds.includes(c.other_user_id || c.user_id);

                return !isArchived && !isBlocked && !isRequest && !isGroup && !isExistingMember;
            });

            if (validContacts.length === 0) {
                contactsList.innerHTML = '<p class="no-contacts">All your contacts are already members</p>';
                return;
            }

            // Fetch profile data for each contact to get proper names (same as loadGroupContacts)
            const enrichedContacts = await Promise.all(validContacts.map(async (contact) => {
                let name = contact.display_name || contact.name || 'Unknown';
                let avatar = contact.avatar || contact.avatar_url || getChatDefaultAvatar(name);
                let role = contact.other_profile_type || contact.role || 'User';
                const userId = contact.other_user_id || contact.user_id;

                // Try to fetch profile data if we have profile_id and profile_type
                const profileId = contact.other_profile_id || contact.profile_id;
                const profileType = contact.other_profile_type || contact.profile_type;

                if (token && profileId && profileType) {
                    try {
                        const response = await fetch(
                            `${this.API_BASE_URL}/api/${profileType}/${profileId}`,
                            { headers: { 'Authorization': `Bearer ${token}` } }
                        );
                        if (response.ok) {
                            const profileData = await response.json();
                            name = profileData.full_name || profileData.name || name;
                            avatar = profileData.profile_picture || avatar;
                            role = this.capitalizeFirst(profileType);
                        }
                    } catch (e) {
                        // Use fallback data
                    }
                }

                return {
                    ...contact,
                    user_id: userId,
                    name,
                    avatar,
                    role
                };
            }));

            // Store enriched contacts for later use when selecting
            this.availableContactsForAdd = enrichedContacts;

            contactsList.innerHTML = enrichedContacts.map(contact => `
                <div class="member-contact-item" data-user-id="${contact.user_id}" onclick="ChatModalManager.toggleMemberSelection(${contact.user_id})">
                    <img src="${contact.avatar || getChatDefaultAvatar(contact.name)}" alt="${this.escapeHtml(contact.name)}" class="member-contact-avatar" onerror="this.onerror=null; this.src=getChatDefaultAvatar('${this.escapeHtml(contact.name)}')">
                    <div class="member-contact-info">
                        <span class="member-contact-name">${this.escapeHtml(contact.name)}</span>
                        <span class="member-contact-role">${this.capitalizeFirst(contact.role || 'User')}</span>
                    </div>
                    <div class="member-contact-check">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading contacts for member add:', error);
            contactsList.innerHTML = '<p class="no-contacts">Failed to load contacts</p>';
        }
    },

    // Store available contacts for add member modal
    availableContactsForAdd: [],

    searchMembersToAdd(query) {
        const items = document.querySelectorAll('#memberContactsList .member-contact-item');
        const lowerQuery = query.toLowerCase();

        items.forEach(item => {
            const name = item.querySelector('.member-contact-name').textContent.toLowerCase();
            item.style.display = name.includes(lowerQuery) ? 'flex' : 'none';
        });
    },

    toggleMemberSelection(userId) {
        // Find the full contact from stored contacts
        const contact = this.availableContactsForAdd.find(c => c.user_id === userId);
        if (!contact) {
            console.error('Contact not found for userId:', userId);
            return;
        }

        const item = document.querySelector(`.member-contact-item[data-user-id="${userId}"]`);
        const index = this.selectedMembersToAdd.findIndex(m => m.user_id === userId);

        if (index > -1) {
            // Remove from selection
            this.selectedMembersToAdd.splice(index, 1);
            item?.classList.remove('selected');
        } else {
            // Add full contact to selection (includes profile_id, profile_type, etc.)
            this.selectedMembersToAdd.push(contact);
            item?.classList.add('selected');
        }

        this.updateSelectedMembersDisplay();
    },

    updateSelectedMembersDisplay() {
        const container = document.getElementById('selectedMembersContainer');
        const list = document.getElementById('selectedMembersList');
        const submitBtn = document.getElementById('addMembersSubmitBtn');

        if (this.selectedMembersToAdd.length === 0) {
            container.style.display = 'none';
            submitBtn.disabled = true;
        } else {
            container.style.display = 'block';
            submitBtn.disabled = false;
            list.innerHTML = this.selectedMembersToAdd.map(member => `
                <div class="selected-member-chip">
                    <img src="${member.avatar || getChatDefaultAvatar(member.name)}" alt="${this.escapeHtml(member.name)}" onerror="this.onerror=null; this.src=getChatDefaultAvatar('${this.escapeHtml(member.name)}')">
                    <span>${this.escapeHtml(member.name)}</span>
                    <button onclick="ChatModalManager.toggleMemberSelection(${member.user_id})">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            `).join('');
        }
    },

    async submitAddMembers() {
        if (this.selectedMembersToAdd.length === 0) return;

        const conv = this.state.selectedConversation;
        const submitBtn = document.getElementById('addMembersSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();

            // Build participants array - backend expects just user IDs
            const participantUserIds = this.selectedMembersToAdd.map(member =>
                member.user_id || member.other_user_id
            );

            console.log('Adding participants (user IDs):', participantUserIds);

            // Send all participants in one request
            const response = await fetch(`${this.API_BASE_URL}/api/chat/conversations/${conv.id}/participants?${profileParams}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    participant_user_ids: participantUserIds  // Backend expects array of user IDs
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Add members result:', result);

                const addedCount = (result.added || []).length;
                const rejectedParticipants = result.rejected || [];
                const isChannel = this.state.selectedConversation?.type === 'channel';
                const memberLabel = isChannel ? 'subscriber' : 'member';

                // Handle rejected participants due to privacy settings
                if (rejectedParticipants.length > 0) {
                    const rejectedNames = await this.getParticipantNames(rejectedParticipants);
                    const rejectedCount = rejectedParticipants.length;

                    if (addedCount === 0) {
                        // All members were rejected
                        this.showToast(
                            `Could not add ${memberLabel}${rejectedCount > 1 ? 's' : ''}. ${rejectedNames.join(', ')} ${rejectedCount === 1 ? 'has' : 'have'} privacy settings preventing ${isChannel ? 'channel' : 'group'} additions.`,
                            'warning'
                        );
                    } else {
                        // Some added, some rejected
                        this.showToast(
                            `Added ${addedCount} ${memberLabel}${addedCount > 1 ? 's' : ''}. ${rejectedCount} couldn't be added due to privacy settings: ${rejectedNames.join(', ')}`,
                            'warning'
                        );
                    }
                } else {
                    this.showToast(`Added ${addedCount} ${memberLabel}${addedCount > 1 ? 's' : ''} successfully!`, 'success');
                }

                this.closeAddMemberModal();

                // Refresh the members list in the info panel
                await this.loadGroupMembersList();
            } else {
                const error = await response.json();
                console.error('Add members failed:', error);
                this.showToast(error.detail || 'Failed to add members', 'error');
            }

        } catch (error) {
            console.error('Error adding members:', error);
            this.showToast('Failed to add members', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Members';
        }
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
        // Check if typing indicators are enabled in settings
        const settings = this.state.chatSettings || {};
        const typingEnabled = settings.typing_indicators !== false;

        const selfTypingIndicator = document.getElementById('selfTypingIndicator');
        const messageInput = document.getElementById('chatMessageInput');
        const hasText = messageInput?.value.trim().length > 0;

        if (!this.state.isTyping && hasText) {
            this.state.isTyping = true;
            // Show self typing indicator only if enabled in settings
            if (typingEnabled && selfTypingIndicator) {
                selfTypingIndicator.classList.add('active');
                // Scroll to bottom to show typing indicator
                this.scrollToBottom();
            }
            // Notify backend that we're typing (only if enabled)
            if (typingEnabled) {
                this.broadcastTypingStatus(true);
            }
        }

        clearTimeout(this.state.typingTimer);
        this.state.typingTimer = setTimeout(() => {
            if (this.state.isTyping) {
                this.state.isTyping = false;
                // Hide typing indicator after user stops typing
                if (selfTypingIndicator) {
                    selfTypingIndicator.classList.remove('active');
                }
                // Notify backend that we stopped typing (only if enabled)
                if (typingEnabled) {
                    this.broadcastTypingStatus(false);
                }
            }
        }, 2000);

        // If input is cleared, hide immediately
        if (!hasText) {
            if (this.state.isTyping) {
                this.state.isTyping = false;
                if (selfTypingIndicator) {
                    selfTypingIndicator.classList.remove('active');
                }
                // Notify backend that we stopped typing (only if enabled)
                if (typingEnabled) {
                    this.broadcastTypingStatus(false);
                }
            }
        }
    },

    // Broadcast typing status to backend
    async broadcastTypingStatus(isTyping) {
        if (!this.state.selectedChat || !this.state.currentUser) return;

        // Skip typing indicator for synthetic conversations (they don't have real conversation IDs yet)
        const conv = this.state.selectedConversation;
        if (conv && this.isSyntheticConversation(conv)) {
            console.debug('[Chat] Skipping typing indicator for synthetic conversation:', this.state.selectedChat);
            return;
        }

        // Double-check typing indicators setting
        const settings = this.state.chatSettings || {};
        if (settings.typing_indicators === false) return;

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) return;

        try {
            const userId = this.state.currentUser?.user_id;
            await fetch(
                `${this.API_BASE_URL}/api/chat/conversations/${this.state.selectedChat}/typing?user_id=${userId}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ is_typing: isTyping })  // Backend expects is_typing in request body
                }
            );
        } catch (error) {
            // Silent fail - typing indicator is not critical
            console.debug('[Chat] Failed to broadcast typing status:', error.message);
        }
    },

    // Poll for other users' typing status
    async pollTypingStatus() {
        if (!this.state.selectedChat || !this.state.currentUser) return;

        // Skip polling for synthetic conversations (invitations, connections, etc.)
        if (this.isSyntheticConversation(this.state.selectedChat)) return;

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) return;

        try {
            const userId = this.state.currentUser?.user_id;
            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/conversations/${this.state.selectedChat}/typing?user_id=${userId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.is_someone_typing && data.typing_users.length > 0) {
                    // Show typing indicator with the first typing user's info
                    const typingUser = data.typing_users[0];
                    this.showOtherTyping(true, typingUser.avatar);
                } else {
                    this.showOtherTyping(false);
                }
            }
        } catch (error) {
            // Silent fail
            console.debug('[Chat] Failed to poll typing status:', error.message);
        }
    },

    // Show other party's typing indicator (called via WebSocket when other user types)
    showOtherTyping(isTyping, userAvatar = '') {
        // Check if typing indicators are enabled in settings
        const settings = this.state.chatSettings || {};
        if (settings.typing_indicators === false) {
            return; // Don't show typing indicators if disabled
        }

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
            // Play notification sound and show browser notification
            this.playNotificationSound();
            this.showBrowserNotification(message, message.sender_name);
        }

        // Update the last message preview in contacts list
        this.updateConversationPreview(conversationId, message);
    },

    // Append a new message to the chat area
    appendMessageToChat(message) {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        const conversationId = message.conversation_id || this.state.selectedChat;
        const isMine = message.sender_user_id === this.state.currentUser?.user_id;

        // Add message to state for persistence
        const messageData = {
            id: message.id || message.message_id,
            text: message.content,
            content: message.content,
            message_type: message.message_type || 'text',
            sender_id: message.sender_profile_id,
            sender_name: message.sender_name,
            avatar: message.sender_avatar,
            time: message.created_at || new Date(),
            sent: isMine,
            is_mine: isMine
        };

        if (!this.state.messages[conversationId]) {
            this.state.messages[conversationId] = [];
        }
        // Avoid duplicates
        if (!this.state.messages[conversationId].some(m => m.id === messageData.id)) {
            this.state.messages[conversationId].push(messageData);
        }

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

    // Check if notifications are currently muted
    isNotificationsMuted() {
        const settings = this.state.chatSettings || {};
        const muteDuration = settings.mute_duration;

        // If muted forever
        if (muteDuration === 'forever') return true;

        // If muted with a time limit, check mute_until
        if (muteDuration && muteDuration !== 'off') {
            const muteUntil = settings.mute_until;
            if (muteUntil) {
                const muteUntilDate = new Date(muteUntil);
                if (muteUntilDate > new Date()) {
                    return true; // Still muted
                }
            }
        }

        return false;
    },

    // Check if notifications should be shown
    shouldShowNotification() {
        const settings = this.state.chatSettings || {};

        // Check if message notifications are disabled
        if (settings.message_notifications === false) return false;

        // Check if muted
        if (this.isNotificationsMuted()) return false;

        return true;
    },

    // Play notification sound for new message
    playNotificationSound() {
        const settings = this.state.chatSettings || {};

        // Check if sound alerts are disabled
        if (settings.sound_alerts === false) return;

        // Check if notifications are muted
        if (this.isNotificationsMuted()) return;

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

    // Show browser notification for new message
    showBrowserNotification(message, senderName) {
        // Check if we should show notifications
        if (!this.shouldShowNotification()) return;

        // Check if browser supports notifications
        if (!('Notification' in window)) return;

        // Check if permission is granted
        if (Notification.permission === 'granted') {
            this.createNotification(message, senderName);
        } else if (Notification.permission !== 'denied') {
            // Request permission
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.createNotification(message, senderName);
                }
            });
        }
    },

    // Create the actual browser notification
    createNotification(message, senderName) {
        const settings = this.state.chatSettings || {};
        const showPreview = settings.notification_preview !== false;

        const title = senderName || 'New Message';
        const body = showPreview ? (message.content || message.text || 'New message received') : 'You have a new message';

        const notification = new Notification(title, {
            body: body,
            icon: '/system_images/logo.png',
            tag: 'chat-message-' + (message.conversation_id || 'new'),
            requireInteraction: false
        });

        // Close notification after 5 seconds
        setTimeout(() => notification.close(), 5000);

        // Handle click - focus the chat
        notification.onclick = () => {
            window.focus();
            if (message.conversation_id) {
                this.openConversation(message.conversation_id);
            }
            notification.close();
        };
    },

    // Request browser notification permission
    requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.log('Chat: Browser does not support notifications');
            return;
        }

        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Chat: Notification permission granted');
                } else {
                    console.log('Chat: Notification permission denied');
                }
            });
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

        if (minutes < 1) return 'just now';
        if (minutes === 1) return '1 minute ago';
        if (minutes < 60) return `${minutes} minutes ago`;
        if (hours === 1) return '1 hour ago';
        if (hours < 24) return `${hours} hours ago`;
        if (days === 1) return 'yesterday';
        if (days < 7) return `${days} days ago`;
        if (days < 30) {
            const weeks = Math.floor(days / 7);
            return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
        }
        if (days < 365) {
            const months = Math.floor(days / 30);
            return months === 1 ? '1 month ago' : `${months} months ago`;
        }
        return d.toLocaleDateString();
    },

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    // Get readable names for rejected participants from group/channel creation
    async getParticipantNames(participants) {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const names = [];

        for (const p of participants) {
            // Try to find in our cached contacts first
            const cachedContact = this.state.allGroupContacts?.find(
                c => (c.other_profile_id === p.profile_id && c.other_profile_type === p.profile_type) ||
                     (c.profile_id === p.profile_id && c.profile_type === p.profile_type)
            );

            if (cachedContact?.name) {
                names.push(cachedContact.name);
                continue;
            }

            // Try to fetch from API
            if (token && p.profile_id && p.profile_type) {
                try {
                    const response = await fetch(
                        `${this.API_BASE_URL}/api/${p.profile_type}/${p.profile_id}`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );
                    if (response.ok) {
                        const profileData = await response.json();
                        names.push(profileData.full_name || profileData.name || `${this.capitalizeFirst(p.profile_type)} #${p.profile_id}`);
                        continue;
                    }
                } catch (e) {
                    // Fallback
                }
            }

            // Fallback name
            names.push(`${this.capitalizeFirst(p.profile_type)} #${p.profile_id}`);
        }

        return names;
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
        console.log('Chat: handleSendMessage() called');
        console.log('Chat: currentUser:', this.state.currentUser);
        console.log('Chat: selectedConversation:', this.state.selectedConversation);

        // Check if in forward mode - execute forward instead of normal send
        if (this.state.forwardMode || this.state.isForwardMode) {
            this.executeForward();
            return;
        }

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
        const chatMain = document.getElementById('chatMain');

        if (translatePanel) {
            const isOpening = !translatePanel.classList.contains('active');

            // If opening translate panel, close info panel first
            if (isOpening && infoPanel && infoPanel.classList.contains('active')) {
                infoPanel.classList.remove('active');
                if (infoBtn) infoBtn.classList.remove('active');
            }

            translatePanel.classList.toggle('active');
            if (translateBtn) translateBtn.classList.toggle('active', translatePanel.classList.contains('active'));

            // Animate chat area - shift when panel opens
            if (chatMain) {
                chatMain.classList.toggle('panel-open', translatePanel.classList.contains('active'));
            }
        }
    },

    // Language names for display
    LANGUAGE_NAMES: {
        'en': 'English', 'am': 'Amharic', 'om': 'Oromo', 'ti': 'Tigrinya',
        'fr': 'French', 'ar': 'Arabic', 'es': 'Spanish', 'pt': 'Portuguese',
        'zh': 'Chinese', 'hi': 'Hindi', 'sw': 'Swahili', 'de': 'German',
        'it': 'Italian', 'ja': 'Japanese', 'ko': 'Korean', 'ru': 'Russian',
        'tr': 'Turkish', 'nl': 'Dutch', 'pl': 'Polish', 'vi': 'Vietnamese',
        'th': 'Thai', 'id': 'Indonesian', 'ms': 'Malay', 'he': 'Hebrew',
        'uk': 'Ukrainian', 'bn': 'Bengali', 'ur': 'Urdu', 'ta': 'Tamil',
        'te': 'Telugu', 'yo': 'Yoruba', 'ig': 'Igbo', 'ha': 'Hausa',
        'zu': 'Zulu', 'af': 'Afrikaans'
    },

    // Set translate language for auto-translation
    async setTranslateLanguage(lang) {
        this.state.translateLanguage = lang;

        // Update UI
        const options = document.querySelectorAll('#chatTranslatePanel .language-option');
        options.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.lang === lang);
        });

        // Close panel first
        this.toggleTranslatePanel();

        // Clear search input
        const searchInput = document.getElementById('languageSearchInput');
        if (searchInput) searchInput.value = '';
        this.filterLanguages('');

        // Check if there's a pending single message translation
        if (this.state.pendingTranslateMessageId && lang !== 'none') {
            const messageId = this.state.pendingTranslateMessageId;
            this.state.pendingTranslateMessageId = null;
            await this.translateSingleMessage(messageId, lang);
            console.log('Chat: Translated pending message:', messageId);
            return;
        }

        // Normal auto-translate behavior
        if (lang === 'none') {
            this.showToast('Auto-translation disabled', 'info');
            // Remove all translations from current messages
            this.removeAllTranslations();
        } else {
            const langName = this.LANGUAGE_NAMES[lang] || lang;
            this.showToast(`Auto-translating to ${langName}...`, 'info');
            // Translate all current messages
            await this.translateAllMessages(lang);
        }

        console.log('Chat: Translation language set to:', lang);
    },

    // Translate a single message using the Google Translate API
    async translateMessage(messageId, targetLanguage) {
        try {
            const response = await fetch(
                `${this.API_BASE_URL}/api/translate/message/${messageId}?target_language=${targetLanguage}`
            );

            if (response.ok) {
                const data = await response.json();
                return data;
            } else {
                const errorData = await response.json();
                console.error('Translation API error:', errorData);
                return { success: false, error: errorData.detail || 'Translation failed' };
            }
        } catch (error) {
            console.error('Translation request failed:', error);
            return { success: false, error: error.message };
        }
    },

    // Translate text directly (for new messages)
    async translateText(text, targetLanguage, sourceLanguage = null) {
        try {
            const body = {
                text: text,
                target_language: targetLanguage
            };
            if (sourceLanguage) {
                body.source_language = sourceLanguage;
            }

            const response = await fetch(`${this.API_BASE_URL}/api/translate/text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                return { success: false, error: errorData.detail || 'Translation failed' };
            }
        } catch (error) {
            console.error('Translation request failed:', error);
            return { success: false, error: error.message };
        }
    },

    // Translate all visible messages to the target language
    async translateAllMessages(targetLanguage) {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        const messages = chatArea.querySelectorAll('.message .message-text');
        const textsToTranslate = [];
        const elements = [];

        // Collect all text messages
        messages.forEach(msgEl => {
            const originalText = msgEl.dataset.originalText || msgEl.textContent;
            if (originalText && originalText.trim()) {
                textsToTranslate.push(originalText);
                elements.push(msgEl);
                // Store original text if not already stored
                if (!msgEl.dataset.originalText) {
                    msgEl.dataset.originalText = originalText;
                }
            }
        });

        if (textsToTranslate.length === 0) return;

        try {
            // Batch translate for efficiency
            const response = await fetch(`${this.API_BASE_URL}/api/translate/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    texts: textsToTranslate,
                    target_language: targetLanguage
                })
            });

            if (response.ok) {
                const results = await response.json();
                results.forEach((result, index) => {
                    if (result.success && elements[index]) {
                        const msgEl = elements[index];
                        msgEl.innerHTML = this.escapeHtml(result.translated_text);
                        msgEl.classList.add('translated');

                        // Add translation indicator
                        this.addTranslationIndicator(msgEl, result.source_language, targetLanguage);
                    }
                });
                this.showToast(`Translated ${results.filter(r => r.success).length} messages`, 'success');
            } else {
                this.showToast('Translation service unavailable', 'error');
            }
        } catch (error) {
            console.error('Batch translation failed:', error);
            this.showToast('Translation failed', 'error');
        }
    },

    // Add translation indicator below message
    addTranslationIndicator(msgEl, sourceLanguage, targetLanguage) {
        // Remove existing indicator
        const existingIndicator = msgEl.parentElement.querySelector('.translation-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        const sourceName = this.LANGUAGE_NAMES[sourceLanguage] || sourceLanguage || 'Auto-detected';
        const targetName = this.LANGUAGE_NAMES[targetLanguage] || targetLanguage;

        const indicator = document.createElement('div');
        indicator.className = 'translation-indicator';
        indicator.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 8l6 6"></path>
                <path d="M4 14l6-6 2-3"></path>
                <path d="M2 5h12"></path>
                <path d="M7 2v3"></path>
                <path d="M22 22l-5-10-5 10"></path>
                <path d="M14 18h6"></path>
            </svg>
            <span>Translated from ${sourceName}</span>
            <button class="show-original-btn" onclick="ChatModalManager.toggleOriginalText(this)" title="Show original">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            </button>
        `;
        indicator.style.cssText = `
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 0.7rem;
            color: var(--text-secondary, #6b7280);
            margin-top: 4px;
            opacity: 0.8;
        `;

        msgEl.parentElement.appendChild(indicator);
    },

    // Toggle between original and translated text
    toggleOriginalText(btn) {
        const indicator = btn.closest('.translation-indicator');
        const msgBubble = indicator?.parentElement;
        const msgText = msgBubble?.querySelector('.message-text');

        if (!msgText || !msgText.dataset.originalText) return;

        const isShowingOriginal = msgText.classList.contains('showing-original');

        if (isShowingOriginal) {
            // Switch back to translated
            msgText.innerHTML = this.escapeHtml(msgText.dataset.translatedText);
            msgText.classList.remove('showing-original');
            btn.title = 'Show original';
            indicator.querySelector('span').textContent = `Translated from ${msgText.dataset.sourceLanguage || 'Auto-detected'}`;
        } else {
            // Show original
            if (!msgText.dataset.translatedText) {
                msgText.dataset.translatedText = msgText.textContent;
            }
            msgText.innerHTML = this.escapeHtml(msgText.dataset.originalText);
            msgText.classList.add('showing-original');
            btn.title = 'Show translation';
            indicator.querySelector('span').textContent = 'Showing original';
        }
    },

    // Remove all translations and show original text
    removeAllTranslations() {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        const translatedMessages = chatArea.querySelectorAll('.message-text.translated');
        translatedMessages.forEach(msgEl => {
            if (msgEl.dataset.originalText) {
                msgEl.innerHTML = this.escapeHtml(msgEl.dataset.originalText);
                msgEl.classList.remove('translated', 'showing-original');
            }
        });

        // Remove all translation indicators
        const indicators = chatArea.querySelectorAll('.translation-indicator');
        indicators.forEach(ind => ind.remove());
    },

    // Translate a single message on demand (for the translate button on each message)
    async translateSingleMessage(messageId, targetLanguage = null) {
        const lang = targetLanguage || this.state.translateLanguage;
        if (!lang || lang === 'none') {
            // Show language picker if no language selected
            this.toggleTranslatePanel();
            return;
        }

        const messageEl = document.querySelector(`.message[data-message-id="${messageId}"]`);
        const msgText = messageEl?.querySelector('.message-text');

        if (!msgText) return;

        // Store original text
        if (!msgText.dataset.originalText) {
            msgText.dataset.originalText = msgText.textContent;
        }

        // Show loading state
        msgText.style.opacity = '0.5';

        try {
            const result = await this.translateText(msgText.dataset.originalText, lang);

            if (result.success) {
                msgText.innerHTML = this.escapeHtml(result.translated_text);
                msgText.dataset.translatedText = result.translated_text;
                msgText.dataset.sourceLanguage = this.LANGUAGE_NAMES[result.source_language] || result.source_language;
                msgText.classList.add('translated');
                this.addTranslationIndicator(msgText, result.source_language, lang);
            } else {
                this.showToast(result.error || 'Translation failed', 'error');
            }
        } catch (error) {
            console.error('Translation failed:', error);
            this.showToast('Translation failed', 'error');
        } finally {
            msgText.style.opacity = '1';
        }
    },

    // Check translation service status
    async checkTranslationStatus() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/translate/status`);
            if (response.ok) {
                const data = await response.json();
                return data.configured;
            }
            return false;
        } catch (error) {
            console.error('Failed to check translation status:', error);
            return false;
        }
    },

    // Translate message from context menu
    translateMessageFromContextMenu() {
        if (!this.state.contextMenuTarget) {
            this.hideContextMenu();
            return;
        }

        const messageId = this.state.contextMenuTarget.dataset.messageId;
        this.hideContextMenu();

        // If no language is set, show the translate panel to let user pick
        if (!this.state.translateLanguage || this.state.translateLanguage === 'none') {
            // Store the message ID to translate after language selection
            this.state.pendingTranslateMessageId = messageId;
            this.toggleTranslatePanel();

            // Show a toast to guide the user
            this.showToast('Select a language to translate', 'info');
        } else {
            // Translate using the already selected language
            this.translateSingleMessage(messageId);
        }
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
        typing_indicator_style: 'circle',
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
                this.checkAndDisplayTranslationStatus();
            }

            settingsModal.classList.toggle('active');
        }
    },

    // Check and display translation service status in settings
    async checkAndDisplayTranslationStatus() {
        const statusDesc = document.getElementById('translationServiceStatus');
        const statusIndicator = document.getElementById('translationStatusIndicator');

        if (!statusDesc || !statusIndicator) return;

        try {
            const isConfigured = await this.checkTranslationStatus();

            if (isConfigured) {
                statusDesc.textContent = 'Google Translate API connected';
                statusIndicator.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                `;
                statusIndicator.style.color = '#10b981';
            } else {
                statusDesc.textContent = 'API key not configured';
                statusIndicator.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                `;
                statusIndicator.style.color = '#f59e0b';
            }
        } catch (error) {
            statusDesc.textContent = 'Unable to check status';
            statusIndicator.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
            `;
            statusIndicator.style.color = '#ef4444';
        }
    },

    // Update translation setting and sync with translate panel
    async updateTranslationSetting(key, value) {
        // Update the setting via the normal settings update
        await this.updateChatSetting(key, value);

        // Sync with translate panel state
        if (key === 'default_translation') {
            this.state.translateLanguage = value;

            // Update the translate panel UI
            const options = document.querySelectorAll('#chatTranslatePanel .language-option');
            options.forEach(opt => {
                opt.classList.toggle('active', opt.dataset.lang === value);
            });

            // If auto-translate is enabled, translate current messages
            const autoTranslate = document.getElementById('settingAutoTranslate');
            if (autoTranslate?.checked && value !== 'none') {
                await this.translateAllMessages(value);
            } else if (value === 'none') {
                this.removeAllTranslations();
            }

            const langName = this.LANGUAGE_NAMES[value] || value;
            if (value === 'none') {
                this.showToast('Translation language cleared', 'info');
            } else {
                this.showToast(`Default language set to ${langName}`, 'success');
            }
        }

        if (key === 'auto_translate') {
            if (value === true) {
                const defaultLang = this.state.translateLanguage || this.state.chatSettings?.default_translation;
                if (defaultLang && defaultLang !== 'none') {
                    await this.translateAllMessages(defaultLang);
                    this.showToast('Auto-translate enabled', 'success');
                } else {
                    this.showToast('Select a default language first', 'info');
                    // Uncheck the toggle since no language is selected
                    const autoTranslateEl = document.getElementById('settingAutoTranslate');
                    if (autoTranslateEl) autoTranslateEl.checked = false;
                }
            } else {
                this.removeAllTranslations();
                this.showToast('Auto-translate disabled', 'info');
            }
        }
    },

    // Load chat settings from localStorage/API (called when settings panel opens)
    async loadChatSettings() {
        // Start with defaults
        let settings = { ...this.defaultSettings };

        // Try to load from profile-specific localStorage first
        const settingsKey = this.getChatSettingsKey();
        try {
            const stored = localStorage.getItem(settingsKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                settings = { ...settings, ...parsed };
                console.log('[Chat] loadChatSettings: Loaded from localStorage key:', settingsKey);
            }
        } catch (e) {
            console.log('[Chat] loadChatSettings: Could not parse localStorage');
        }

        // Try to load from API (takes precedence)
        try {
                                    if (profileId && profileType) {
                console.log('[Chat] loadChatSettings: Loading from API for', profileType, profileId);
                const response = await fetch(
                    `${this.API_BASE_URL}/api/chat/settings?user_id=${userId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('access_token')}`
                        }
                    }
                );

                if (response.ok) {
                    const apiSettings = await response.json();
                    if (apiSettings.settings) {
                        settings = { ...this.defaultSettings, ...apiSettings.settings };
                        console.log('[Chat] loadChatSettings: Got settings from API:', settings);

                        // Update localStorage with API settings
                        localStorage.setItem(settingsKey, JSON.stringify(settings));
                    }
                }
            }
        } catch (error) {
            console.log('[Chat] loadChatSettings: Using local settings (API unavailable)');
        }

        // Apply settings to UI
        this.applySettingsToUI(settings);

        // Store current settings in state
        this.state.chatSettings = settings;

        console.log('[Chat] loadChatSettings: Final state - typing_indicators:', settings.typing_indicators,
                    'tts_voice:', settings.tts_voice, 'online_status:', settings.online_status);

        // Update global mute indicators based on loaded settings
        this.updateGlobalMuteIndicators();
    },

    // Apply settings to UI elements
    applySettingsToUI(settings) {
        // Privacy & Security - Visibility
        const lastSeenVisibility = document.getElementById('settingLastSeenVisibility');
        if (lastSeenVisibility) lastSeenVisibility.value = settings.last_seen_visibility || 'everyone';

        const onlineStatus = document.getElementById('settingOnlineStatus');
        if (onlineStatus) onlineStatus.checked = settings.online_status !== false;

        const readReceipts = document.getElementById('settingReadReceipts');
        if (readReceipts) readReceipts.checked = settings.read_receipts !== false;

        const typingIndicators = document.getElementById('settingTypingIndicators');
        if (typingIndicators) typingIndicators.checked = settings.typing_indicators !== false;

        // Privacy & Security - Messaging
        const whoCanMessage = document.getElementById('settingWhoCanMessage');
        if (whoCanMessage) whoCanMessage.value = settings.who_can_message || 'everyone';

        const allowCallsFrom = document.getElementById('settingAllowCallsFrom');
        if (allowCallsFrom) allowCallsFrom.value = settings.allow_calls_from || 'everyone';

        const allowGroupAdds = document.getElementById('settingAllowGroupAdds');
        if (allowGroupAdds) allowGroupAdds.value = settings.allow_group_adds || 'everyone';

        const allowChannelAdds = document.getElementById('settingAllowChannelAdds');
        if (allowChannelAdds) allowChannelAdds.value = settings.allow_channel_adds || 'everyone';

        // Privacy & Security - Message Protection
        const blockScreenshots = document.getElementById('settingBlockScreenshots');
        if (blockScreenshots) blockScreenshots.checked = settings.block_screenshots === true;

        const disableForwarding = document.getElementById('settingDisableForwarding');
        if (disableForwarding) disableForwarding.checked = settings.disable_forwarding === true;

        // Update two-step verification button state
        const twoStepBtn = document.getElementById('twoStepBtnText');
        if (twoStepBtn) {
            twoStepBtn.textContent = settings.two_step_verification ? 'Enabled' : 'Set Up';
        }

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

        const typingStyle = document.getElementById('settingTypingStyle');
        if (typingStyle) typingStyle.value = settings.typing_indicator_style || 'circle';

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

    // Apply visual settings (bubble style, font size, density, typing indicator)
    applyVisualSettings(settings) {
        const chatArea = document.getElementById('chatArea');
        if (!chatArea) return;

        // Apply bubble style
        chatArea.classList.remove('bubble-rounded', 'bubble-square');
        chatArea.classList.add(`bubble-${settings.bubble_style || 'rounded'}`);

        // Apply font size
        chatArea.classList.remove('font-small', 'font-medium', 'font-large');
        chatArea.classList.add(`font-${settings.font_size || 'medium'}`);

        // Apply density
        chatArea.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
        chatArea.classList.add(`density-${settings.message_density || 'comfortable'}`);

        // Apply typing indicator style
        chatArea.classList.remove('typing-circle', 'typing-square');
        chatArea.classList.add(`typing-${settings.typing_indicator_style || 'circle'}`);
    },

    // Update a single chat setting
    async updateChatSetting(key, value) {
        // Update local state
        if (!this.state.chatSettings) {
            this.state.chatSettings = { ...this.defaultSettings };
        }
        this.state.chatSettings[key] = value;

        // Handle mute_duration - calculate mute_until timestamp
        if (key === 'mute_duration') {
            if (value === 'off' || value === 'forever') {
                this.state.chatSettings.mute_until = null;
            } else if (value === '1h') {
                this.state.chatSettings.mute_until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            } else if (value === '8h') {
                this.state.chatSettings.mute_until = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
            } else if (value === '24h') {
                this.state.chatSettings.mute_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            }
        }

        // Save to profile-specific localStorage key
        const settingsKey = this.getChatSettingsKey();
        localStorage.setItem(settingsKey, JSON.stringify(this.state.chatSettings));
        console.log('[Chat] Setting saved to localStorage key:', settingsKey, key, '=', value);

        // Apply visual settings immediately if applicable
        if (['bubble_style', 'font_size', 'message_density', 'typing_indicator_style'].includes(key)) {
            this.applyVisualSettings(this.state.chatSettings);
        }

        // Try to save to API
        try {
                                    if (profileId && profileType) {
                const response = await fetch(`${this.API_BASE_URL}/api/chat/settings`, {
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

        // Show appropriate toast message
        if (key === 'mute_duration') {
            if (value === 'off') {
                this.showToast('Notifications unmuted', 'success');
            } else if (value === 'forever') {
                this.showToast('Notifications muted until you turn back on', 'success');
            } else {
                this.showToast(`Notifications muted for ${value.replace('h', ' hour(s)')}`, 'success');
            }
            // Update global mute indicators across all UI elements
            this.updateGlobalMuteIndicators();
        } else if (key === 'message_notifications') {
            this.showToast(value ? 'Message notifications enabled' : 'Message notifications disabled', 'success');
        } else if (key === 'sound_alerts') {
            this.showToast(value ? 'Sound alerts enabled' : 'Sound alerts disabled', 'success');
        } else {
            this.showToast('Setting updated', 'success');
        }
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
                        <img class="blocked-contact-avatar" src="${blocked.avatar || getChatDefaultAvatar(blocked.name || 'User')}" alt="" onerror="this.onerror=null; this.src=getChatDefaultAvatar('${blocked.name || 'User'}')">
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

    // =============================================
    // ACTIVE SESSIONS PANEL METHODS
    // =============================================

    // Open active sessions panel
    openActiveSessionsPanel() {
        const panel = document.getElementById('activeSessionsPanel');
        if (panel) {
            panel.classList.add('active');
            this.loadActiveSessions();
        }
    },

    // Close active sessions panel
    closeActiveSessionsPanel() {
        const panel = document.getElementById('activeSessionsPanel');
        if (panel) {
            panel.classList.remove('active');
        }
    },

    // Load active sessions
    async loadActiveSessions() {
        const listContainer = document.getElementById('otherSessionsList');
        const currentDetails = document.getElementById('currentSessionDetails');

        if (!listContainer) return;

        // Show loading state
        listContainer.innerHTML = `
            <div class="sessions-loading">
                <div class="loading-spinner"></div>
                <p>Loading sessions...</p>
            </div>
        `;

        // Get current device info
        const deviceInfo = this.getCurrentDeviceInfo();
        if (currentDetails) {
            currentDetails.textContent = `${deviceInfo.browser} on ${deviceInfo.os}`;
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileId = this.state.currentUser?.profileId;
            const profileType = this.state.currentUser?.profileType;

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/sessions?user_id=${userId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                const sessions = data.sessions || [];

                if (sessions.length === 0) {
                    listContainer.innerHTML = `
                        <div class="no-other-sessions">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <p>No other active sessions</p>
                        </div>
                    `;
                } else {
                    listContainer.innerHTML = sessions.map(session => this.renderSessionItem(session)).join('');
                }
            } else {
                // Show mock data for now
                this.showMockSessions(listContainer);
            }
        } catch (error) {
            console.log('Chat: Using mock sessions (API unavailable)');
            this.showMockSessions(listContainer);
        }
    },

    // Show mock sessions for development
    showMockSessions(container) {
        container.innerHTML = `
            <div class="no-other-sessions">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p>No other active sessions</p>
            </div>
        `;
    },

    // Render a session item
    renderSessionItem(session) {
        const deviceIcon = session.device_type === 'mobile' ? `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
        ` : `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
        `;

        const lastActive = session.last_active ? this.formatLastActive(session.last_active) : 'Unknown';

        return `
            <div class="session-item" data-session-id="${session.id}">
                <div class="session-device-icon ${session.device_type || ''}">
                    ${deviceIcon}
                </div>
                <div class="session-info">
                    <span class="session-device-name">${session.device_name || 'Unknown Device'}</span>
                    <span class="session-details">${session.browser || ''} ${session.os ? '• ' + session.os : ''}</span>
                    <span class="session-status inactive">${lastActive}</span>
                </div>
                <button class="session-terminate-btn" onclick="terminateSession('${session.id}')">Terminate</button>
            </div>
        `;
    },

    // Format last active time
    formatLastActive(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString();
    },

    // Get current device info
    getCurrentDeviceInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown Browser';
        let os = 'Unknown OS';
        let deviceType = 'desktop';

        // Detect browser
        if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Edg')) browser = 'Edge';  // Edge includes "Edg" not "Edge"
        else if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Safari')) browser = 'Safari';
        else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

        // Detect OS
        if (ua.includes('Windows')) os = 'Windows';
        else if (ua.includes('Mac')) os = 'macOS';
        else if (ua.includes('Linux')) os = 'Linux';
        else if (ua.includes('Android')) os = 'Android';
        else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

        // Detect device type
        if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
            deviceType = 'mobile';
        } else if (ua.includes('iPad') || ua.includes('Tablet')) {
            deviceType = 'tablet';
        }

        return { browser, os, deviceType };
    },

    // Terminate a specific session
    async terminateSession(sessionId) {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');

            const response = await fetch(`${this.API_BASE_URL}/api/chat/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // Remove from UI
                const sessionElement = document.querySelector(`[data-session-id="${sessionId}"]`);
                if (sessionElement) {
                    sessionElement.remove();
                }
                this.showToast('Session terminated', 'success');

                // Check if there are no more sessions
                const listContainer = document.getElementById('otherSessionsList');
                if (listContainer && !listContainer.querySelector('.session-item')) {
                    listContainer.innerHTML = `
                        <div class="no-other-sessions">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <p>No other active sessions</p>
                        </div>
                    `;
                }
            } else {
                throw new Error('Failed to terminate session');
            }
        } catch (error) {
            console.error('Error terminating session:', error);
            this.showToast('Failed to terminate session', 'error');
        }
    },

    // Terminate all other sessions
    async terminateAllOtherSessions() {
        if (!confirm('Are you sure you want to terminate all other sessions? You will be logged out from all other devices.')) {
            return;
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileId = this.state.currentUser?.profileId;
            const profileType = this.state.currentUser?.profileType;

            const response = await fetch(`${this.API_BASE_URL}/api/chat/sessions/terminate-all`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    profile_id: profileId,
                    profile_type: profileType
                })
            });

            if (response.ok) {
                const listContainer = document.getElementById('otherSessionsList');
                if (listContainer) {
                    listContainer.innerHTML = `
                        <div class="no-other-sessions">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <p>No other active sessions</p>
                        </div>
                    `;
                }
                this.showToast('All other sessions terminated', 'success');
            } else {
                throw new Error('Failed to terminate sessions');
            }
        } catch (error) {
            console.error('Error terminating all sessions:', error);
            this.showToast('Failed to terminate sessions', 'error');
        }
    },

    // =============================================
    // TWO-STEP VERIFICATION PANEL METHODS
    // =============================================

    // Open two-step verification panel
    openTwoStepPanel() {
        const panel = document.getElementById('twoStepPanel');
        if (panel) {
            panel.classList.add('active');
            this.loadTwoStepStatus();
        }
    },

    // Close two-step verification panel
    closeTwoStepPanel() {
        const panel = document.getElementById('twoStepPanel');
        if (panel) {
            panel.classList.remove('active');
        }
    },

    // Load two-step verification status
    async loadTwoStepStatus() {
        const settings = this.state.chatSettings || {};
        const isEnabled = settings.two_step_verification === true;

        const statusIcon = document.querySelector('#twoStepStatus .two-step-icon');
        const statusTitle = document.getElementById('twoStepStatusTitle');
        const statusDesc = document.getElementById('twoStepStatusDesc');
        const formSection = document.getElementById('twoStepForm');
        const enabledSection = document.getElementById('twoStepEnabled');

        if (isEnabled) {
            // Show enabled state
            if (statusIcon) {
                statusIcon.classList.remove('disabled');
                statusIcon.classList.add('enabled');
            }
            if (statusTitle) statusTitle.textContent = 'Two-Step Verification is On';
            if (statusDesc) statusDesc.textContent = 'Your account is protected with an additional password.';
            if (formSection) formSection.style.display = 'none';
            if (enabledSection) enabledSection.style.display = 'block';
        } else {
            // Show disabled state
            if (statusIcon) {
                statusIcon.classList.remove('enabled');
                statusIcon.classList.add('disabled');
            }
            if (statusTitle) statusTitle.textContent = 'Two-Step Verification is Off';
            if (statusDesc) statusDesc.textContent = 'Set up an additional password to protect your account.';
            if (formSection) formSection.style.display = 'block';
            if (enabledSection) enabledSection.style.display = 'none';
        }
    },

    // Mask email for display
    maskEmail(email) {
        if (!email) return '';
        const [local, domain] = email.split('@');
        if (!domain) return email;
        const maskedLocal = local.charAt(0) + '***' + local.charAt(local.length - 1);
        return maskedLocal + '@' + domain;
    },

    // Enable two-step verification
    async enableTwoStepVerification() {
        const password = document.getElementById('twoStepPassword')?.value;
        const confirmPassword = document.getElementById('twoStepConfirmPassword')?.value;

        // Validate
        if (!password || password.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        try {
                                    const userId = this.state.currentUser?.id;

            if (!profileId || !profileType || !userId) {
                this.showToast('Profile information not available', 'error');
                return;
            }

            // Call the dedicated enable endpoint that hashes and saves the password
            const params = new URLSearchParams({
                user_id: userId,
                password: password
            });

            const response = await fetch(`${this.API_BASE_URL}/api/chat/security/two-step/enable?${params.toString()}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('access_token')}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to enable two-step verification');
            }

            // Clear form
            document.getElementById('twoStepPassword').value = '';
            document.getElementById('twoStepConfirmPassword').value = '';

            // Update UI
            this.loadTwoStepStatus();
            this.showToast('Two-step verification enabled', 'success');
        } catch (error) {
            console.error('Error enabling two-step verification:', error);
            this.showToast(error.message || 'Failed to enable two-step verification', 'error');
        }
    },

    // Disable two-step verification - requires password verification
    async disableTwoStepVerification() {
        // Prompt for current password to verify
        const password = prompt('Enter your current security password to disable two-step verification:');
        if (!password) {
            return; // User cancelled
        }

        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }

        if (!confirm('Are you sure you want to disable two-step verification? Your account will be less secure.')) {
            return;
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const userId = this.state.currentUser?.user_id;

            const params = new URLSearchParams();
            params.append('profile_id', profile_id);
            params.append('profile_type', profile_type);
            params.append('password', password);

            const response = await fetch(`${this.API_BASE_URL}/api/chat/security/two-step/disable?${params.toString()}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to disable two-step verification');
            }

            // Reset verification state
            this.state.twoStepVerified = false;

            // Update UI
            this.loadTwoStepStatus();
            this.showToast('Two-step verification disabled', 'success');
        } catch (error) {
            console.error('Error disabling two-step verification:', error);
            this.showToast(error.message || 'Incorrect password or failed to disable', 'error');
        }
    },

    // Change two-step password - prompts for current and new password
    async changeTwoStepPassword() {
        // Prompt for current password
        const currentPassword = prompt('Enter your CURRENT security password:');
        if (!currentPassword) return;

        if (currentPassword.length < 6) {
            this.showToast('Current password must be at least 6 characters', 'error');
            return;
        }

        // Prompt for new password
        const newPassword = prompt('Enter your NEW security password (min 6 characters):');
        if (!newPassword) return;

        if (newPassword.length < 6) {
            this.showToast('New password must be at least 6 characters', 'error');
            return;
        }

        // Confirm new password
        const confirmPassword = prompt('Confirm your NEW security password:');
        if (!confirmPassword) return;

        if (newPassword !== confirmPassword) {
            this.showToast('New passwords do not match', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const userId = this.state.currentUser?.user_id;

            const params = new URLSearchParams();
            params.append('profile_id', profile_id);
            params.append('profile_type', profile_type);
            params.append('current_password', currentPassword);
            params.append('new_password', newPassword);

            const response = await fetch(`${this.API_BASE_URL}/api/chat/security/two-step/change-password?${params.toString()}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to change password');
            }

            this.showToast('Security password updated successfully', 'success');
        } catch (error) {
            console.error('Error changing two-step password:', error);
            this.showToast(error.message || 'Incorrect current password', 'error');
        }
    },

    // Toggle password visibility in setup form
    toggleSetupPasswordVisibility(inputId, button) {
        const input = document.getElementById(inputId);
        if (!input || !button) return;

        const eyeIcon = button.querySelector('.eye-icon');
        const eyeOffIcon = button.querySelector('.eye-off-icon');

        if (input.type === 'password') {
            input.type = 'text';
            if (eyeIcon) eyeIcon.style.display = 'none';
            if (eyeOffIcon) eyeOffIcon.style.display = 'block';
        } else {
            input.type = 'password';
            if (eyeIcon) eyeIcon.style.display = 'block';
            if (eyeOffIcon) eyeOffIcon.style.display = 'none';
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

    // =============================================
    // Export Chat Modal Functions
    // =============================================

    // State for export modal
    exportModalState: {
        conversations: [],
        filteredConversations: [],
        selectedConversations: [],
        isLoading: false
    },

    // Export chat history - opens the export modal
    async exportChatHistory() {
        this.openExportModal();
    },

    // Open export modal and load conversations
    async openExportModal() {
        const modal = document.getElementById('chatExportModal');
        if (!modal) return;

        // Reset state
        this.exportModalState = {
            conversations: [],
            filteredConversations: [],
            selectedConversations: [],
            isLoading: true
        };

        // Show modal
        modal.style.display = 'flex';

        // Reset UI
        const searchInput = document.getElementById('exportChatSearch');
        const selectAllCheckbox = document.getElementById('exportSelectAll');
        const confirmBtn = document.getElementById('exportConfirmBtn');

        if (searchInput) searchInput.value = '';
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        if (confirmBtn) confirmBtn.disabled = true;

        this.updateExportSelectedCount();

        // Show initial state - prompt to search
        const list = document.getElementById('exportConversationsList');
        if (list) {
            list.innerHTML = '<div class="export-loading">Loading conversations...</div>';
        }

        // Load conversations in background (but don't display them yet)
        await this.loadExportConversations();

        // After loading, show search prompt instead of all conversations
        if (list && this.exportModalState.conversations.length > 0) {
            this.exportModalState.filteredConversations = []; // Clear filtered list
            list.innerHTML = `
                <div class="export-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <p>Search for conversations to export</p>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">${this.exportModalState.conversations.length} conversations available</span>
                </div>
            `;
        }
    },

    // Close export modal
    closeExportModal() {
        const modal = document.getElementById('chatExportModal');
        if (modal) {
            modal.style.display = 'none';
        }
        // Reset state
        this.exportModalState = {
            conversations: [],
            filteredConversations: [],
            selectedConversations: [],
            isLoading: false
        };
    },

    // Load conversations for export modal
    async loadExportConversations() {
        try {
                                    const userId = this.state.currentUser?.id;

            if (!profileId || !profileType) {
                this.showToast('User profile not found', 'error');
                this.closeExportModal();
                return;
            }

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/conversations?user_id=${userId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('access_token')}`
                    }
                }
            );

            if (!response.ok) throw new Error('Failed to fetch conversations');

            const data = await response.json();
            const conversations = (data.conversations || []).filter(conv =>
                conv.id && !conv.is_connection && !conv.is_family
            );

            // Fetch message count for each conversation
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const conversationsWithCounts = await Promise.all(
                conversations.map(async (conv) => {
                    try {
                        const messagesResponse = await fetch(
                            `${this.API_BASE_URL}/api/chat/messages/${conv.id}?user_id=${userId}&limit=1`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${token}`
                                }
                            }
                        );
                        if (messagesResponse.ok) {
                            const messagesData = await messagesResponse.json();
                            // The API returns total_count in the response
                            conv.message_count = messagesData.total_count || messagesData.total || 0;
                        } else {
                            console.warn(`Failed to fetch message count for conversation ${conv.id}:`, messagesResponse.status);
                            conv.message_count = 0;
                        }
                    } catch (e) {
                        console.error(`Error fetching message count for conversation ${conv.id}:`, e);
                        conv.message_count = 0;
                    }
                    return conv;
                })
            );

            this.exportModalState.conversations = conversationsWithCounts;
            this.exportModalState.filteredConversations = [...conversationsWithCounts];
            this.exportModalState.isLoading = false;

            this.renderExportConversations();
            this.updateExportSelectedCount();
        } catch (error) {
            console.error('Error loading conversations for export:', error);
            const list = document.getElementById('exportConversationsList');
            if (list) {
                list.innerHTML = `
                    <div class="export-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 8v4M12 16h.01"></path>
                        </svg>
                        <p>Failed to load conversations</p>
                    </div>
                `;
            }
        }
    },

    // Render export conversations list
    renderExportConversations() {
        const list = document.getElementById('exportConversationsList');
        if (!list) return;

        const conversations = this.exportModalState.filteredConversations;

        if (conversations.length === 0) {
            list.innerHTML = `
                <div class="export-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <p>No conversations found</p>
                </div>
            `;
            return;
        }

        list.innerHTML = conversations.map(conv => {
            const isSelected = this.exportModalState.selectedConversations.some(c => c.id === conv.id);
            const name = conv.name || conv.display_name || 'Unknown';
            const avatar = conv.avatar || conv.profile_picture || getChatDefaultAvatar(name);
            const messageCount = conv.message_count || 0;

            const lastMessageDate = conv.last_message_at
                ? new Date(conv.last_message_at).toLocaleDateString()
                : '';

            return `
                <div class="export-conversation-item ${isSelected ? 'selected' : ''}"
                     data-conv-id="${conv.id}"
                     onclick="ChatModalManager.toggleExportConversation('${conv.id}')">
                    <img src="${avatar}" alt="${name}" class="export-conv-avatar"
                         onerror="this.src='${getChatDefaultAvatar(name)}'">
                    <div class="export-conv-info">
                        <div class="export-conv-name">${name}</div>
                        <div class="export-conv-meta">
                            <span>${messageCount} message${messageCount !== 1 ? 's' : ''}</span>
                            ${lastMessageDate ? `<span>•</span><span>${lastMessageDate}</span>` : ''}
                        </div>
                    </div>
                    <div class="export-conv-checkbox">
                        <label class="export-checkbox-label" onclick="event.stopPropagation()">
                            <input type="checkbox" ${isSelected ? 'checked' : ''}
                                   onchange="ChatModalManager.toggleExportConversation('${conv.id}')">
                            <span class="export-checkbox-custom"></span>
                        </label>
                    </div>
                </div>
            `;
        }).join('');
    },

    // Filter export conversations
    filterExportChats(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const list = document.getElementById('exportConversationsList');

        if (!term) {
            // No search term - show prompt to search (but keep selected conversations visible)
            this.exportModalState.filteredConversations = [];

            if (list) {
                // Show selected conversations if any, otherwise show search prompt
                if (this.exportModalState.selectedConversations.length > 0) {
                    this.exportModalState.filteredConversations = [...this.exportModalState.selectedConversations];
                    this.renderExportConversations();
                } else {
                    list.innerHTML = `
                        <div class="export-empty">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            <p>Search for conversations to export</p>
                            <span style="font-size: 0.8rem; color: var(--text-muted);">${this.exportModalState.conversations.length} conversations available</span>
                        </div>
                    `;
                }
            }
            return;
        }

        // Filter by search term
        this.exportModalState.filteredConversations = this.exportModalState.conversations.filter(conv => {
            const name = (conv.name || conv.display_name || '').toLowerCase();
            return name.includes(term);
        });

        this.renderExportConversations();
    },

    // Toggle select/deselect a conversation for export
    toggleExportConversation(convId) {
        const conv = this.exportModalState.conversations.find(c => c.id === parseInt(convId) || c.id === convId);
        if (!conv) return;

        const index = this.exportModalState.selectedConversations.findIndex(c => c.id === conv.id);

        if (index === -1) {
            this.exportModalState.selectedConversations.push(conv);
        } else {
            this.exportModalState.selectedConversations.splice(index, 1);
        }

        this.renderExportConversations();
        this.updateExportSelectedCount();
        this.updateSelectAllCheckbox();
    },

    // Toggle select all conversations
    toggleSelectAllExport(checked) {
        if (checked) {
            // Select ALL conversations and show them all in the list
            this.exportModalState.selectedConversations = [...this.exportModalState.conversations];
            this.exportModalState.filteredConversations = [...this.exportModalState.conversations];
        } else {
            // Deselect all conversations and clear the list
            this.exportModalState.selectedConversations = [];
            this.exportModalState.filteredConversations = [];
        }

        this.renderExportConversations();
        this.updateExportSelectedCount();
    },

    // Update the select all checkbox state
    updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('exportSelectAll');
        if (!selectAllCheckbox) return;

        const total = this.exportModalState.conversations.length;
        const selected = this.exportModalState.selectedConversations.length;

        selectAllCheckbox.checked = total > 0 && selected === total;
        selectAllCheckbox.indeterminate = selected > 0 && selected < total;
    },

    // Update selected count display
    updateExportSelectedCount() {
        const countEl = document.getElementById('exportSelectedCount');
        const confirmBtn = document.getElementById('exportConfirmBtn');
        const count = this.exportModalState.selectedConversations.length;

        if (countEl) {
            countEl.textContent = `${count} conversation${count !== 1 ? 's' : ''} selected`;
        }

        if (confirmBtn) {
            confirmBtn.disabled = count === 0;
        }
    },

    // Handle date range change
    onDateRangeChange(value) {
        const customDateRange = document.getElementById('exportCustomDateRange');
        if (customDateRange) {
            customDateRange.style.display = value === 'custom' ? 'flex' : 'none';
        }

        // Set default dates for custom range
        if (value === 'custom') {
            const today = new Date();
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const dateFrom = document.getElementById('exportDateFrom');
            const dateTo = document.getElementById('exportDateTo');

            if (dateFrom && !dateFrom.value) {
                dateFrom.value = thirtyDaysAgo.toISOString().split('T')[0];
            }
            if (dateTo && !dateTo.value) {
                dateTo.value = today.toISOString().split('T')[0];
            }
        }
    },

    // Get date range based on selected option
    getExportDateRange() {
        const selectedOption = document.querySelector('input[name="exportDateRange"]:checked')?.value || 'all';
        const now = new Date();
        let fromDate = null;
        let toDate = new Date(now.getTime());
        toDate.setHours(23, 59, 59, 999); // End of today

        switch (selectedOption) {
            case '7days':
                fromDate = new Date(now);
                fromDate.setDate(fromDate.getDate() - 7);
                fromDate.setHours(0, 0, 0, 0);
                break;
            case '30days':
                fromDate = new Date(now);
                fromDate.setDate(fromDate.getDate() - 30);
                fromDate.setHours(0, 0, 0, 0);
                break;
            case '3months':
                fromDate = new Date(now);
                fromDate.setMonth(fromDate.getMonth() - 3);
                fromDate.setHours(0, 0, 0, 0);
                break;
            case '1year':
                fromDate = new Date(now);
                fromDate.setFullYear(fromDate.getFullYear() - 1);
                fromDate.setHours(0, 0, 0, 0);
                break;
            case 'custom':
                const dateFromInput = document.getElementById('exportDateFrom')?.value;
                const dateToInput = document.getElementById('exportDateTo')?.value;
                if (dateFromInput) {
                    fromDate = new Date(dateFromInput);
                    fromDate.setHours(0, 0, 0, 0);
                }
                if (dateToInput) {
                    toDate = new Date(dateToInput);
                    toDate.setHours(23, 59, 59, 999);
                }
                break;
            case 'all':
            default:
                // No date filtering
                return { fromDate: null, toDate: null };
        }

        return { fromDate, toDate };
    },

    // Confirm and execute export
    async confirmExport() {
        const selectedConvs = this.exportModalState.selectedConversations;

        if (selectedConvs.length === 0) {
            this.showToast('Please select at least one conversation to export', 'warning');
            return;
        }

        // Get export options
        const includeMedia = document.getElementById('exportIncludeMedia')?.checked ?? true;
        const includeTimestamps = document.getElementById('exportIncludeTimestamps')?.checked ?? true;
        const includeSenderNames = document.getElementById('exportIncludeSenderNames')?.checked ?? true;

        // Get date range
        const { fromDate, toDate } = this.getExportDateRange();

        this.showToast('Preparing export...', 'info');

        try {
                                    const userId = this.state.currentUser?.id;
            const currentUserName = this.state.currentUser?.name || this.state.currentUser?.full_name || 'You';
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');

            // Fetch messages for each selected conversation
            const exportConversations = [];

            for (const conv of selectedConvs) {
                try {
                    // Fetch all messages (high limit for export - no pagination needed)
                    const messagesResponse = await fetch(
                        `${this.API_BASE_URL}/api/chat/messages/${conv.id}?user_id=${userId}&limit=10000`,
                        {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        }
                    );

                    if (messagesResponse.ok) {
                        const messagesData = await messagesResponse.json();
                        let messages = messagesData.messages || [];

                        // Filter messages by date range if specified
                        if (fromDate || toDate) {
                            messages = messages.filter(msg => {
                                if (!msg.created_at) return true;
                                const msgDate = new Date(msg.created_at);
                                if (fromDate && msgDate < fromDate) return false;
                                if (toDate && msgDate > toDate) return false;
                                return true;
                            });
                        }

                        exportConversations.push({
                            ...conv,
                            messages: messages
                        });
                    } else {
                        console.error(`Failed to fetch messages for conv ${conv.id}:`, messagesResponse.status);
                        exportConversations.push({ ...conv, messages: [] });
                    }
                } catch (e) {
                    console.error(`Error fetching messages for conv ${conv.id}:`, e);
                    exportConversations.push({ ...conv, messages: [] });
                }
            }

            // Count total messages
            const totalMessages = exportConversations.reduce((sum, conv) => sum + (conv.messages?.length || 0), 0);

            // Generate .txt content
            let txtContent = '';
            txtContent += '='.repeat(60) + '\n';
            txtContent += 'ASTEGNI CHAT EXPORT\n';
            txtContent += '='.repeat(60) + '\n';
            txtContent += `Export Date: ${new Date().toLocaleString()}\n`;
            txtContent += `Total Conversations: ${exportConversations.length}\n`;
            txtContent += `Total Messages: ${totalMessages}\n`;
            if (fromDate || toDate) {
                txtContent += `Date Range: ${fromDate ? fromDate.toLocaleDateString() : 'Beginning'} - ${toDate ? toDate.toLocaleDateString() : 'Now'}\n`;
            }
            txtContent += '='.repeat(60) + '\n\n';

            for (const conv of exportConversations) {
                const convName = conv.name || conv.display_name || 'Unknown';

                txtContent += '-'.repeat(60) + '\n';
                txtContent += `CONVERSATION WITH: ${convName}\n`;
                txtContent += `Messages: ${conv.messages?.length || 0}\n`;
                txtContent += '-'.repeat(60) + '\n\n';

                if (conv.messages && conv.messages.length > 0) {
                    let lastSender = null;
                    let lastDate = null;

                    for (const msg of conv.messages) {
                        const senderName = msg.is_mine ? currentUserName : (msg.sender_name || convName);
                        const msgDate = msg.created_at ? new Date(msg.created_at) : null;
                        const dateStr = msgDate ? msgDate.toLocaleDateString() : null;

                        // Add date header if date changed (only show date once per day)
                        if (includeTimestamps && dateStr && dateStr !== lastDate) {
                            if (lastDate !== null) {
                                txtContent += '\n'; // Add spacing between days
                            }
                            txtContent += `--- ${msgDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ---\n\n`;
                            lastDate = dateStr;
                            lastSender = null; // Reset sender on new day
                        }

                        // Add timestamp for each message
                        if (includeTimestamps && msgDate) {
                            txtContent += `[${msgDate.toLocaleTimeString()}]\n`;
                        }

                        // Add sender name only if different from last sender
                        if (includeSenderNames && senderName !== lastSender) {
                            txtContent += `${senderName}:\n`;
                            lastSender = senderName;
                        }

                        // Add message content
                        if (msg.content) {
                            txtContent += `    ${msg.content}\n`;
                        } else if (msg.message_type && msg.message_type !== 'text') {
                            // Handle media messages
                            if (includeMedia) {
                                txtContent += `    [${msg.message_type.toUpperCase()}${msg.file_name ? ': ' + msg.file_name : ''}]\n`;
                            } else {
                                txtContent += `    [${msg.message_type.toUpperCase()}]\n`;
                            }
                        }

                        txtContent += '\n';
                    }
                } else {
                    txtContent += '(No messages in selected date range)\n';
                }

                txtContent += '\n';
            }

            txtContent += '='.repeat(60) + '\n';
            txtContent += 'END OF EXPORT\n';
            txtContent += '='.repeat(60) + '\n';

            // Download as .txt file
            const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `astegni-chat-export-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showToast(`Exported ${exportConversations.length} conversation${exportConversations.length !== 1 ? 's' : ''}`, 'success');
            this.closeExportModal();
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('Export failed: ' + error.message, 'error');
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

        this.showToast('Deleting all chat data...', 'info');

        try {
                                    const userId = this.state.currentUser?.id;

            if (!profileId || !profileType || !userId) {
                this.showToast('User profile not found', 'error');
                return;
            }

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/data?user_id=${userId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('access_token')}`
                    }
                }
            );

            if (response.ok) {
                const result = await response.json();

                // Clear local storage (both profile-specific and legacy global keys)
                const settingsKey = this.getChatSettingsKey();
                localStorage.removeItem(settingsKey);
                localStorage.removeItem('chatSettings'); // Legacy key
                localStorage.removeItem('chatCache');
                localStorage.removeItem('chatDrafts');

                // Reset state
                this.state.conversations = [];
                this.state.selectedConversation = null;
                this.state.selectedChat = null;
                this.state.chatSettings = { ...this.defaultSettings };
                this.state.mutedConversations = [];
                this.state.pinnedConversations = [];
                this.state.archivedConversations = [];

                // Hide chat content, show empty state
                const chatContent = document.getElementById('chatContent');
                const emptyState = document.getElementById('chatEmptyState');
                if (chatContent) chatContent.style.display = 'none';
                if (emptyState) emptyState.style.display = 'flex';

                // Refresh UI
                this.renderConversations();
                this.toggleSettingsPanel();

                this.showToast(`All chat data deleted (${result.conversations_cleared || 0} conversations cleared)`, 'success');
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to delete data');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showToast('Failed to delete chat data: ' + error.message, 'error');
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
    },

    // =============================================
    // WEBSOCKET CONNECTION FOR CALLS
    // =============================================

    // Connect to WebSocket for real-time signaling
    connectWebSocket() {
        console.log('🔍 ========== WEBSOCKET CONNECTION DEBUG ==========');

        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            console.log('📡 WebSocket already connected');
            console.log('🔍 ================================================');
            return;
        }

        if (!this.state.currentUser) {
            console.log('📡 Cannot connect WebSocket: No profile loaded yet');
            console.log('🔍 Current Profile:', this.state.currentProfile);
            console.log('🔍 Current User:', this.state.currentUser);
            console.log('🔍 ================================================');
            return;
        }

        const userId = this.state.currentUser?.user_id;

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const apiHost = (this.API_BASE_URL || 'http://localhost:8000').replace(/^https?:\/\//, '');
        const wsUrl = `${wsProtocol}//${apiHost}/ws/${userId}`;

        console.log('📡 Connecting to WebSocket for calls');
        console.log('📡 User ID:', userId);
        console.log('📡 WebSocket URL:', wsUrl);
        console.log('📡 Connection key will be:', `user_${userId}`);
        console.log('🔍 ================================================');

        try {
            this.websocket = new WebSocket(wsUrl);

            // Expose WebSocket globally for StandaloneChatCallManager
            window.chatWebSocket = this.websocket;

            this.websocket.onopen = () => {
                console.log('🔍 ========== WEBSOCKET CONNECTED ==========');
                console.log(`✅ Chat WebSocket connected for user ${userId}`);
                console.log('✅ Connection key:', `user_${userId}`);
                console.log('🔍 ==========================================');

                // Dispatch websocket-ready event for StandaloneChatCallManager
                document.dispatchEvent(new CustomEvent('websocket-ready'));
                console.log('📡 Dispatched websocket-ready event');
            };

            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('🔍 ========== WEBSOCKET MESSAGE RECEIVED ==========');
                    console.log('📨 Message type:', data.type);
                    console.log('📨 Full message:', JSON.stringify(data, null, 2));

                    // Route WebRTC call signaling messages
                    switch (data.type) {
                        case 'call_invitation':
                            console.log('✅ Routing to handleIncomingCallInvitation');
                            this.handleIncomingCallInvitation(data);
                            break;

                        case 'call_answer':
                            console.log('✅ Routing to handleCallAnswer');
                            this.handleCallAnswer(data);
                            break;

                        case 'ice_candidate':
                            console.log('✅ Routing to handleIceCandidate');
                            this.handleIceCandidate(data);
                            break;

                        case 'call_declined':
                            console.log('✅ Call declined, showing toast');
                            // Scenario A: They declined your call - show red "declined" card
                            const declinedCallType = this.state.isVideoCall ? 'video' : 'voice';
                            if (this.state.selectedConversation) {
                                this.addCallCard(declinedCallType, 'declined', 0);
                            }
                            this.showToast('Call declined', 'info');
                            // Update call log to declined status
                            this.updateCallLog('declined', 0);
                            this.cleanupCall();
                            const callModal = document.getElementById('chatCallModal');
                            if (callModal) callModal.classList.remove('active');
                            break;

                        case 'call_cancelled':
                            console.log('✅ Call cancelled by caller');
                            // Scenario B: They cancelled the call before you answered - show red "missed" card
                            const cancelledCallType = data.call_type || 'voice';
                            if (this.state.selectedConversation) {
                                this.addIncomingCallCard(cancelledCallType, 'missed', 0);
                            }
                            this.showToast('Missed call', 'info');
                            // Update receiver's call log to missed status
                            this.updateCallLog('missed', 0);
                            this.cleanupCall();
                            const cancelledCallModal = document.getElementById('chatCallModal');
                            if (cancelledCallModal) cancelledCallModal.classList.remove('active');
                            break;

                        case 'call_ended':
                            console.log('✅ Call ended by other person');
                            // Scenario C: Call was answered and ended - show green card with duration
                            const endedDuration = this.state.callStartTime
                                ? Math.floor((Date.now() - this.state.callStartTime) / 1000)
                                : 0;
                            const endedCallType = this.state.isVideoCall ? 'video' : 'voice';
                            if (endedDuration > 0 && this.state.selectedConversation) {
                                // If incoming call, add as incoming card, otherwise outgoing
                                if (this.state.isIncomingCall) {
                                    this.addIncomingCallCard(endedCallType, 'ended', endedDuration);
                                } else {
                                    this.addCallCard(endedCallType, 'ended', endedDuration);
                                }
                            }
                            this.showToast('Call ended', 'info');
                            this.cleanupCall();
                            const endedCallModal = document.getElementById('chatCallModal');
                            if (endedCallModal) endedCallModal.classList.remove('active');
                            break;

                        case 'call_mode_switched':
                            console.log('🔄 Other user switched call mode to:', data.new_mode);
                            this.handleRemoteModeSwitched(data.new_mode);
                            break;

                        case 'webrtc_offer':
                            // Mid-call renegotiation offer (e.g. other side switched voice→video)
                            console.log('🔄 Received renegotiation offer');
                            this.handleRenegotiationOffer(data);
                            break;

                        case 'webrtc_answer':
                            // Answer to a renegotiation offer we sent
                            console.log('🔄 Received renegotiation answer');
                            if (this.state.peerConnection && data.answer) {
                                this.state.peerConnection.setRemoteDescription(
                                    new RTCSessionDescription(data.answer)
                                ).catch(e => console.error('Renegotiation answer failed:', e));
                            }
                            break;

                        default:
                            console.log('⚠️ Unhandled message type:', data.type);
                    }
                    console.log('🔍 ================================================');
                } catch (error) {
                    console.error('❌ Error handling WebSocket message:', error);
                    console.error('❌ Error stack:', error.stack);
                }
            };

            this.websocket.onerror = (error) => {
                console.error('📡 WebSocket error:', error);
            };

            this.websocket.onclose = () => {
                console.log('📡 WebSocket disconnected');
                this.websocket = null;

                // Reconnect after 5 seconds if chat modal is still open
                if (this.state.isOpen) {
                    console.log('📡 Reconnecting in 5 seconds...');
                    setTimeout(() => {
                        if (this.state.isOpen) {
                            this.connectWebSocket();
                        }
                    }, 5000);
                }
            };
        } catch (error) {
            console.error('📡 Failed to create WebSocket:', error);
        }
    },

    // Disconnect WebSocket
    disconnectWebSocket() {
        if (this.websocket) {
            console.log('📡 Disconnecting WebSocket');
            this.websocket.close();
            this.websocket = null;
        }
    },

    // =============================================
    // WEBRTC VOICE & VIDEO CALL FUNCTIONS
    // =============================================

    // WebRTC Configuration — fetches time-limited TURN credentials from backend
    async getWebRTCConfiguration() {
        const fallback = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();
            const response = await fetch(
                `${this.API_BASE_URL}/api/turn-credentials?${profileParams}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (!response.ok) throw new Error(`TURN credentials fetch failed: ${response.status}`);
            const data = await response.json();
            console.log('📡 TURN credentials fetched, ICE servers:', data.iceServers.length);
            return { iceServers: data.iceServers };
        } catch (e) {
            console.warn('📡 Could not fetch TURN credentials, using STUN only:', e.message);
            return fallback;
        }
    },

    // Call Logging Functions
    async createCallLog(callType, isIncoming = false) {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();

            // For incoming calls, get conversation_id from pending invitation
            const conversationId = isIncoming
                ? this.state.pendingCallInvitation?.conversation_id
                : this.state.selectedConversation?.id;

            if (!conversationId) {
                console.error('No conversation ID available for call log');
                return;
            }

            const response = await fetch(`${this.API_BASE_URL}/api/call-logs?${profileParams}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    conversation_id: conversationId,
                    caller_user_id: this.state.currentUser?.user_id,
                    call_type: callType,
                    status: 'initiated',
                    started_at: new Date().toISOString()
                })
            });

            if (!response.ok) {
                console.error('Failed to create call log:', response.statusText);
                return;
            }

            const data = await response.json();
            // Store the call log ID for later updates
            const previousId = this.state.currentCallLogId;
            this.state.currentCallLogId = data.call_log_id;
            console.log(`📝 Call log created (${isIncoming ? 'incoming' : 'outgoing'}): ${data.call_log_id}${previousId ? ` (previous: ${previousId})` : ''}`);
        } catch (error) {
            console.error('Error creating call log:', error);
        }
    },

    async updateCallLog(status, duration = null) {
        // If createCallLog hasn't resolved yet, wait for it first
        if (!this.state.currentCallLogId && this.state.pendingCallLogPromise) {
            await this.state.pendingCallLogPromise;
        }
        if (!this.state.currentCallLogId) {
            console.log('📝 No call log ID to update');
            return;
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();

            const updateData = { status };

            // Set answered_at for answered status
            if (status === 'answered') {
                updateData.answered_at = new Date().toISOString();
            }

            // Set ended_at for terminal statuses
            if (['ended', 'cancelled', 'declined', 'missed'].includes(status)) {
                updateData.ended_at = new Date().toISOString();
                if (duration !== null) {
                    updateData.duration_seconds = duration;
                }
            }

            const response = await fetch(`${this.API_BASE_URL}/api/call-logs/${this.state.currentCallLogId}?${profileParams}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Failed to update call log (${response.status}):`, errorText);
                console.error(`Attempted to update call log ID: ${this.state.currentCallLogId}`);
                return;
            }

            console.log(`📝 Call log updated: ${status}${duration ? ` (${duration}s)` : ''}`);
        } catch (error) {
            console.error('Error updating call log:', error);
        }
    },

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
                localVideo.play().catch(e => console.warn('Local video play failed:', e));
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

    // Set up WebRTC Peer Connection
    async setupPeerConnection() {
        const config = await this.getWebRTCConfiguration();
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
            // Always use event.streams[0] — it's the same MediaStream object for both
            // audio and video tracks in a standard 1-on-1 call.
            this.state.remoteStream = event.streams[0];

            if (this.state.isVideoCall) {
                // Video call: route the entire remote stream (audio+video) through the
                // <video> element. Re-assign on every track event so the video element
                // picks up whichever track arrives last (audio can arrive before video).
                const remoteVideo = document.getElementById('chatRemoteVideo');
                if (remoteVideo) {
                    remoteVideo.srcObject = this.state.remoteStream;
                    remoteVideo.play().catch(e => console.warn('Remote video play failed:', e));
                }
            } else {
                // Voice-only call: use the static <audio> element (must be in the DOM
                // at load time — dynamically created elements are blocked on mobile).
                const remoteAudio = document.getElementById('chatRemoteAudio');
                if (remoteAudio) {
                    remoteAudio.srcObject = this.state.remoteStream;
                    remoteAudio.play().catch(e => console.warn('Remote audio play failed:', e));
                }
            }

            // Update status
            // Status, timer, and call log are handled in onconnectionstatechange 'connected'
            // to ensure they fire reliably on both caller and receiver sides.
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
            const state = this.state.peerConnection.connectionState;
            console.log('📡 Connection state:', state);
            switch (state) {
                case 'connected':
                    console.log('✅ Call connected');
                    // Reliably update UI on BOTH caller and receiver sides.
                    // ontrack fires before remote description is set on the caller,
                    // so we use onconnectionstatechange as the authoritative "connected" signal.
                    const statusEl = document.getElementById('chatCallStatus');
                    if (statusEl) statusEl.textContent = 'Connected';
                    this.startCallTimer();
                    if (this.state.isIncomingCall) {
                        this.updateCallLog('answered');
                    }
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

        // Renegotiation — fires when a track is added/removed mid-call (e.g. switchCallMode).
        // Without this, the remote peer never gets the updated SDP and the new track is silent/invisible.
        // Only act when the connection is already established (signalingState === 'stable'),
        // not during the initial offer/answer exchange.
        this.state.peerConnection.onnegotiationneeded = async () => {
            if (this.state.peerConnection.signalingState !== 'stable') return;
            if (!this.state.isCallActive) return;
            console.log('🔄 Negotiation needed — sending renegotiation offer');
            try {
                const offer = await this.state.peerConnection.createOffer();
                await this.state.peerConnection.setLocalDescription(offer);
                const otherUserId = this.state.isIncomingCall
                    ? this.state.pendingCallInvitation?.from_user_id
                    : this.state.selectedConversation?.other_user_id;
                const conversationId = this.state.selectedConversation?.id ||
                                       this.state.pendingCallInvitation?.conversation_id;
                if (this.websocket && this.websocket.readyState === WebSocket.OPEN && otherUserId) {
                    this.websocket.send(JSON.stringify({
                        type: 'webrtc_offer',
                        conversation_id: conversationId,
                        from_user_id: this.state.currentUser?.user_id,
                        to_user_id: otherUserId,
                        offer: offer
                    }));
                }
            } catch (e) {
                console.error('Renegotiation failed:', e);
            }
        };
    },

    // Send call invitation via WebSocket
    sendCallInvitation(callType, offer) {
        console.log('🔍 ========== CALL INVITATION DEBUG ==========');
        console.log('📤 sendCallInvitation called with type:', callType);
        console.log('📡 WebSocket status:', this.websocket ? `Ready state: ${this.websocket.readyState}` : 'WebSocket is null');
        console.log('📡 WebSocket.OPEN constant:', WebSocket.OPEN);
        console.log('🔍 Current Profile:', this.state.currentProfile);
        console.log('🔍 Current User:', this.state.currentUser);
        console.log('🔍 Selected Chat:', this.state.selectedChat);
        console.log('🔍 Selected Conversation:', this.state.selectedConversation);

        if (!this.websocket) {
            console.error('❌ WebSocket is null!');
            this.showToast('WebSocket not connected (null)', 'error');
            this.cleanupCall();
            return;
        }

        if (this.websocket.readyState !== WebSocket.OPEN) {
            console.error(`❌ WebSocket not open! Ready state: ${this.websocket.readyState} (CONNECTING=0, OPEN=1, CLOSING=2, CLOSED=3)`);
            this.showToast(`WebSocket not connected (state: ${this.websocket.readyState})`, 'error');
            this.cleanupCall();
            return;
        }

        const conversation = this.state.selectedConversation;

        if (!conversation) {
            console.error('❌ No conversation selected!');
            this.showToast('No conversation selected', 'error');
            this.cleanupCall();
            return;
        }

        console.log('🔍 Conversation object:', JSON.stringify(conversation, null, 2));

        // Get recipient info from conversation (USER-BASED: uses other_user_id)
        if (!conversation.other_user_id) {
            console.error('❌ No recipient found in conversation!');
            console.error('❌ other_user_id:', conversation.other_user_id);
            console.error('❌ Full conversation:', conversation);
            this.showToast('Could not find call recipient', 'error');
            this.cleanupCall();
            return;
        }

        const invitation = {
            type: 'call_invitation',
            call_type: callType,  // 'voice' or 'video'
            conversation_id: conversation.id,
            from_user_id: this.state.currentUser?.user_id,
            from_name: (this.state.currentUser?.name || this.state.currentUser?.full_name || this.state.currentUser?.first_name || this.state.currentUser?.email),
            from_avatar: this.state.currentUser.profile_picture,
            to_user_id: conversation.other_user_id,
            offer: offer
        };

        console.log('📤 Sending call invitation:', JSON.stringify(invitation, null, 2));
        console.log('📤 Recipient key will be:', `user_${conversation.other_user_id}`);
        this.websocket.send(JSON.stringify(invitation));
        console.log('✅ Call invitation sent via WebSocket');
        console.log('🔍 ========================================');

        // Log call initiation to database (store promise for race-condition safety)
        this.state.pendingCallLogPromise = this.createCallLog(callType);

        // Update UI to show calling
        const statusEl = document.getElementById('chatCallStatus');
        if (statusEl) {
            statusEl.textContent = 'Calling...';
        }

        // Start 20-second timeout for unanswered calls
        this.startCallInvitationTimeout(callType);
    },

    // Start timeout for unanswered calls (caller side)
    startCallInvitationTimeout(callType) {
        // Clear any existing timeout
        if (this.state.callInvitationTimeout) {
            clearTimeout(this.state.callInvitationTimeout);
        }

        // Set 20-second timeout
        this.state.callInvitationTimeout = setTimeout(() => {
            console.log('⏰ Call invitation timeout - no answer after 20 seconds');

            // Check if call is still pending (not answered)
            if (!this.state.isCallActive && this.state.peerConnection) {
                this.showToast('No answer', 'info');

                // Add "no answer" call card
                if (this.state.selectedConversation) {
                    this.addCallCard(callType, 'no_answer', 0);
                }

                // Update call log to no_answer status
                this.updateCallLog('no_answer', 0);

                // Send cancellation to recipient
                const conversation = this.state.selectedConversation;
                if (conversation && this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                    const message = {
                        type: 'call_cancelled',
                        conversation_id: conversation.id,
                        from_user_id: this.state.currentUser?.user_id,
                        to_user_id: conversation.other_user_id,
                        call_type: callType
                    };
                    this.websocket.send(JSON.stringify(message));
                }

                // Cleanup call
                this.cleanupCall();

                // Hide call modal
                const callModal = document.getElementById('chatCallModal');
                if (callModal) {
                    callModal.classList.remove('active');
                }
            }
        }, 20000); // 20 seconds
    },

    // Handle incoming call invitation
    handleIncomingCallInvitation(data) {
        console.log('📞 Incoming call invitation:', data);

        // Check if this is a group call invitation (someone adding us to active call)
        const isGroupCallInvite = data.group_call === true;

        // If already in an active call, add as participant instead of showing incoming screen
        if (this.state.isCallActive && isGroupCallInvite) {
            console.log('📞 Adding to existing call as group participant');
            this.acceptGroupCallInvitation(data);
            return;
        }

        // If already in active call but NOT a group invite, show notification
        if (this.state.isCallActive && !isGroupCallInvite) {
            console.log('📞 Already in call, showing notification for new call');
            this.showIncomingCallNotification(data);
            return;
        }

        // If chat modal is not open, delegate to standalone call modal
        if (!this.state.isOpen && typeof StandaloneChatCallManager !== 'undefined') {
            console.log('📞 Chat modal not open, delegating to standalone call modal');
            StandaloneChatCallManager.handleIncomingCall(data);
            return;
        }

        this.state.pendingCallInvitation = data;
        this.state.pendingOffer = data.offer;
        this.state.isVideoCall = data.call_type === 'video';
        this.state.isIncomingCall = true;

        // Create call log for receiver (store promise for race-condition safety)
        this.state.pendingCallLogPromise = this.createCallLog(data.call_type, true);  // true = incoming call

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

            // Start 20-second timeout for incoming call (receiver side)
            this.startIncomingCallTimeout(data);
        }
    },

    // Start timeout for incoming calls (receiver side)
    startIncomingCallTimeout(callData) {
        // Clear any existing timeout
        if (this.state.callInvitationTimeout) {
            clearTimeout(this.state.callInvitationTimeout);
        }

        // Set 20-second timeout
        this.state.callInvitationTimeout = setTimeout(() => {
            console.log('⏰ Incoming call timeout - not answered after 20 seconds');

            // Check if call is still pending (not answered)
            if (this.state.isIncomingCall && this.state.pendingCallInvitation) {
                this.showToast('Missed call', 'info');

                // Stop ringtone
                this.stopRingtone();

                // Add "missed" call card
                if (this.state.selectedConversation) {
                    this.addIncomingCallCard(callData.call_type, 'missed', 0);
                }

                // Update call log to missed status
                this.updateCallLog('missed', 0);

                // Cleanup call
                this.cleanupCall();

                // Hide call modal
                const callModal = document.getElementById('chatCallModal');
                if (callModal) {
                    callModal.classList.remove('active');
                }
            }
        }, 20000); // 20 seconds
    },

    // Accept group call invitation (when already in call)
    async acceptGroupCallInvitation(data) {
        console.log('✅ Accepting group call invitation from', data.from_name);

        const participantId = `user_${data.from_user_id}`;

        // Add to participants list
        if (!this.state.callParticipants.some(p => p.id === participantId)) {
            this.state.callParticipants.push({
                id: participantId,
                user_id: data.from_user_id,
                name: data.from_name,
                avatar: data.from_avatar
            });
        }

        // Store pending invitation
        this.state.pendingParticipantInvites.set(participantId, data);

        // Show toast
        this.showToast(`${data.from_name} is joining the call...`, 'info');

        // Setup peer connection for this participant
        await this.setupPeerConnectionForGroupParticipant(participantId, data);
    },

    // Setup peer connection for group participant (answering their offer)
    async setupPeerConnectionForGroupParticipant(participantId, inviteData) {
        console.log(`🔗 Setting up peer connection for group participant: ${participantId}`);

        // Create new RTCPeerConnection
        const peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        // Add local stream tracks to peer connection
        if (this.state.localStream) {
            this.state.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.state.localStream);
            });
        }

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                const message = {
                    type: 'ice_candidate',
                    candidate: event.candidate,
                    from_user_id: this.state.currentUser?.user_id,
                    to_user_id: inviteData.from_user_id
                };
                this.websocket.send(JSON.stringify(message));
            }
        };

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            console.log(`📹 Received track from group participant: ${participantId}`);
            const remoteStream = event.streams[0];
            this.state.remoteStreams.set(participantId, remoteStream);
            this.displayParticipantVideo(participantId, remoteStream);
        };

        // Store peer connection
        this.state.peerConnections.set(participantId, peerConnection);

        // Set remote description (offer from caller)
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(inviteData.offer));

            // Create answer
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            // Send answer via WebSocket
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                const message = {
                    type: 'call_answer',
                    answer: answer,
                    from_user_id: this.state.currentUser?.user_id,
                    to_user_id: inviteData.from_user_id
                };
                this.websocket.send(JSON.stringify(message));
            }

        } catch (error) {
            console.error('Error accepting group call invitation:', error);
            this.showToast('Failed to join group call', 'error');
        }
    },

    // Show incoming call notification when already in call
    showIncomingCallNotification(data) {
        const callerName = data.from_name || 'Someone';
        const callType = data.call_type === 'video' ? 'video' : 'voice';

        // Show persistent notification with accept/decline options
        this.showToast(
            `${callerName} is calling (${callType}).\nYou're already in a call.`,
            'info',
            10000  // Show for 10 seconds
        );

        // Store the pending invitation
        this.state.pendingParticipantInvites.set(`${data.from_profile_type}_${data.from_profile_id}`, data);

        // TODO: Could show an in-call notification UI with accept/decline buttons
    },

    // Accept incoming call
    async acceptIncomingCall() {
        console.log('✅ Accepting incoming call');

        // Clear call invitation timeout
        if (this.state.callInvitationTimeout) {
            clearTimeout(this.state.callInvitationTimeout);
            this.state.callInvitationTimeout = null;
        }

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
                    localVideo.play().catch(e => console.warn('Local video play failed:', e));
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

    // Decline incoming call
    declineIncomingCall() {
        console.log('❌ Declining incoming call');

        // Clear call invitation timeout
        if (this.state.callInvitationTimeout) {
            clearTimeout(this.state.callInvitationTimeout);
            this.state.callInvitationTimeout = null;
        }

        this.stopRingtone();

        // Add declined call card (you declined it)
        if (this.state.pendingCallInvitation && this.state.selectedConversation) {
            const callType = this.state.pendingCallInvitation.call_type || 'voice';
            this.addIncomingCallCard(callType, 'declined', 0);
        }

        // Update receiver's call log to declined status
        this.updateCallLog('declined', 0);

        // Send decline message
        if (this.state.pendingCallInvitation && this.websocket) {
            const message = {
                type: 'call_declined',
                conversation_id: this.state.pendingCallInvitation.conversation_id,
                from_user_id: this.state.currentUser?.user_id,
                to_user_id: this.state.pendingCallInvitation.from_user_id
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

    // Send call answer via WebSocket
    sendCallAnswer(answer) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            console.error('WebSocket not connected');
            return;
        }

        const message = {
            type: 'call_answer',
            conversation_id: this.state.pendingCallInvitation.conversation_id,
            from_user_id: this.state.currentUser?.user_id,
            to_user_id: this.state.pendingCallInvitation.from_user_id,
            answer: answer
        };

        console.log('📤 Sending call answer');
        this.websocket.send(JSON.stringify(message));
    },

    // Handle call answer (received by caller)
    async handleCallAnswer(data) {
        console.log('📞 Received call answer');

        // Clear call invitation timeout (call was answered)
        if (this.state.callInvitationTimeout) {
            clearTimeout(this.state.callInvitationTimeout);
            this.state.callInvitationTimeout = null;
        }

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

    // Send ICE candidate
    sendIceCandidate(candidate) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            return;
        }

        const conversation = this.state.selectedConversation ||
                            { id: this.state.pendingCallInvitation?.conversation_id };

        const otherUserId = this.state.isIncomingCall
            ? this.state.pendingCallInvitation?.from_user_id
            : this.state.selectedConversation?.other_user_id;

        const message = {
            type: 'ice_candidate',
            conversation_id: conversation.id,
            from_user_id: this.state.currentUser?.user_id,
            to_user_id: otherUserId,
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
            const videoBtn = document.getElementById('chatSwitchVideoModeBtn');
            if (videoBtn) {
                videoBtn.classList.toggle('video-off', this.state.isVideoOff);
                videoBtn.title = this.state.isVideoOff ? 'Turn on camera' : 'Turn off camera';
            }

            console.log('📹 Video', this.state.isVideoOff ? 'off' : 'on');
        }
    },

    // Handle remote user switching call mode
    handleRemoteModeSwitched(newMode) {
        console.log(`🔄 Remote user switched to ${newMode} mode`);

        // Update UI to show the new mode
        this.showToast(`Other user switched to ${newMode} call`, 'info');

        // Update local state to match (will be updated via renegotiation)
        if (newMode === 'video') {
            console.log('📹 Remote user enabled video');
        } else {
            console.log('🎤 Remote user switched to voice only');
        }
    },

    // Handle a mid-call renegotiation offer from the remote peer
    async handleRenegotiationOffer(data) {
        if (!this.state.peerConnection || !data.offer) return;
        try {
            await this.state.peerConnection.setRemoteDescription(
                new RTCSessionDescription(data.offer)
            );
            const answer = await this.state.peerConnection.createAnswer();
            await this.state.peerConnection.setLocalDescription(answer);

            const otherUserId = this.state.isIncomingCall
                ? this.state.pendingCallInvitation?.from_user_id
                : this.state.selectedConversation?.other_user_id;
            const conversationId = this.state.selectedConversation?.id ||
                                   this.state.pendingCallInvitation?.conversation_id;

            if (this.websocket && this.websocket.readyState === WebSocket.OPEN && otherUserId) {
                this.websocket.send(JSON.stringify({
                    type: 'webrtc_answer',
                    conversation_id: conversationId,
                    from_user_id: this.state.currentUser?.user_id,
                    to_user_id: otherUserId,
                    answer: answer
                }));
            }
            console.log('✅ Renegotiation offer handled, answer sent');
        } catch (e) {
            console.error('handleRenegotiationOffer failed:', e);
        }
    },

    // Switch between voice and video call
    async switchCallMode() {
        if (!this.state.localStream || !this.state.peerConnection) {
            console.log('❌ Cannot switch mode: No active call');
            return;
        }

        const targetMode = this.state.isVideoCall ? 'voice' : 'video';
        console.log(`🔄 Switching call mode from ${this.state.isVideoCall ? 'video' : 'voice'} to ${targetMode}`);

        try {
            // Get current audio track
            const currentAudioTrack = this.state.localStream.getAudioTracks()[0];

            if (this.state.isVideoCall) {
                // Switching from VIDEO to VOICE

                // 1. Remove video track from local stream
                const videoTrack = this.state.localStream.getVideoTracks()[0];
                if (videoTrack) {
                    videoTrack.stop();
                    this.state.localStream.removeTrack(videoTrack);
                }

                // 2. Remove video track from peer connection
                const videoSender = this.state.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
                if (videoSender) {
                    this.state.peerConnection.removeTrack(videoSender);
                }

                // 3. Update UI
                this.state.isVideoCall = false;
                this.showCallModal(false);

                // 4. Hide local video
                const localVideo = document.getElementById('chatLocalVideo');
                if (localVideo) {
                    localVideo.srcObject = null;
                    localVideo.style.display = 'none';
                }

                // 5. Update switch button - always visible
                const switchBtn = document.getElementById('chatSwitchCallModeBtn');
                if (switchBtn) {
                    switchBtn.title = 'Switch to Video';
                    switchBtn.innerHTML = `
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="23 7 16 12 23 17 23 7"></polygon>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                        </svg>
                    `;
                    switchBtn.style.display = 'inline-flex';
                }

                // 6. Hide video toggle button (not needed in voice mode)
                const videoToggleBtn = document.getElementById('chatSwitchVideoModeBtn');
                if (videoToggleBtn) {
                    videoToggleBtn.style.display = 'none';
                }

                console.log('✅ Switched to voice call');

            } else {
                // Switching from VOICE to VIDEO

                // 1. Get video stream
                const videoStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'user'
                    }
                });

                const videoTrack = videoStream.getVideoTracks()[0];

                // 2. Add video track to local stream
                this.state.localStream.addTrack(videoTrack);

                // 3. Add video track to peer connection
                this.state.peerConnection.addTrack(videoTrack, this.state.localStream);

                // 4. Update UI
                this.state.isVideoCall = true;
                this.showCallModal(true);

                // 5. Show local video
                const localVideo = document.getElementById('chatLocalVideo');
                if (localVideo) {
                    localVideo.srcObject = this.state.localStream;
                    localVideo.style.display = 'block';
                }

                // 6. Update switch button - always visible (phone icon to switch to voice)
                const switchBtn = document.getElementById('chatSwitchCallModeBtn');
                if (switchBtn) {
                    switchBtn.title = 'Switch to Voice Call';
                    switchBtn.innerHTML = `
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                    `;
                    switchBtn.style.display = 'inline-flex';
                }

                // 7. Show video toggle button (needed in video mode)
                const videoToggleBtn = document.getElementById('chatSwitchVideoModeBtn');
                if (videoToggleBtn) {
                    videoToggleBtn.style.display = 'inline-flex';
                }

                console.log('✅ Switched to video call');
            }

            // Send mode switch notification to other user via WebSocket
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                const otherUserId = this.state.isIncomingCall
                    ? this.state.pendingCallInvitation?.from_user_id
                    : this.state.selectedConversation?.other_user_id;

                const conversationId = this.state.selectedConversation?.id ||
                                     this.state.pendingCallInvitation?.conversation_id;

                const message = {
                    type: 'call_mode_switched',
                    conversation_id: conversationId,
                    from_user_id: this.state.currentUser?.user_id,
                    to_user_id: otherUserId,
                    new_mode: targetMode
                };

                this.websocket.send(JSON.stringify(message));
            }

            // Trigger renegotiation
            if (this.state.peerConnection.signalingState === 'stable') {
                const offer = await this.state.peerConnection.createOffer();
                await this.state.peerConnection.setLocalDescription(offer);

                // Send new offer to peer via WebSocket
                if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                    const otherUserId = this.state.isIncomingCall
                        ? this.state.pendingCallInvitation?.from_user_id
                        : this.state.selectedConversation?.other_user_id;

                    const conversationId = this.state.selectedConversation?.id ||
                                         this.state.pendingCallInvitation?.conversation_id;

                    const message = {
                        type: 'webrtc_offer',
                        conversation_id: conversationId,
                        from_user_id: this.state.currentUser?.user_id,
                        to_user_id: otherUserId,
                        offer: offer
                    };

                    this.websocket.send(JSON.stringify(message));
                }
            }

        } catch (error) {
            console.error('❌ Error switching call mode:', error);
            this.showToast(`Failed to switch to ${targetMode}: ${error.message}`, 'error');
        }
    },

    // End call
    endChatCall() {
        console.log('📞 Ending call');

        // Calculate call duration
        const duration = this.state.callStartTime
            ? Math.floor((Date.now() - this.state.callStartTime) / 1000)
            : 0;

        // Determine call type
        const callType = this.state.isVideoCall ? 'video' : 'voice';

        // Check if call was answered (call started)
        const wasAnswered = duration > 0;

        // Add call card to chat
        if (this.state.selectedConversation) {
            if (wasAnswered) {
                // Scenario C: Call was answered and ended - show green card with duration
                if (this.state.isIncomingCall) {
                    this.addIncomingCallCard(callType, 'ended', duration);
                } else {
                    this.addCallCard(callType, 'ended', duration);
                }
            } else if (!this.state.isIncomingCall) {
                // Scenario B: Caller cancelled their own call - show red "cancelled" card
                this.addCallCard(callType, 'cancelled', 0);
            }
        }

        // Send end/cancelled call message
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            const conversation = this.state.selectedConversation ||
                                { id: this.state.pendingCallInvitation?.conversation_id };

            // Get recipient user ID (user-based)
            const otherUserId = this.state.isIncomingCall
                ? this.state.pendingCallInvitation?.from_user_id
                : this.state.selectedConversation?.other_user_id;

            // Only send message if we have a valid recipient
            if (otherUserId) {
                // Determine message type based on whether call was answered
                const messageType = wasAnswered ? 'call_ended' : 'call_cancelled';

                // Update call log with final status and duration
                const finalStatus = wasAnswered ? 'ended' : 'cancelled';
                this.updateCallLog(finalStatus, duration);

                const message = {
                    type: messageType,
                    conversation_id: conversation.id,
                    from_user_id: this.state.currentUser?.user_id,
                    to_user_id: otherUserId,
                    call_type: callType  // Include call type for cancelled calls
                };

                console.log(`📤 Sending ${messageType} to user_${otherUserId}`);
                this.websocket.send(JSON.stringify(message));
            } else {
                console.warn('⚠️ Cannot send call end message: recipient user ID not found');
                console.warn('⚠️ isIncomingCall:', this.state.isIncomingCall);
                console.warn('⚠️ pendingCallInvitation:', this.state.pendingCallInvitation);
                console.warn('⚠️ selectedConversation:', this.state.selectedConversation);
            }
        }

        // Cleanup
        this.cleanupCall();

        // Hide call modal
        const callModal = document.getElementById('chatCallModal');
        if (callModal) {
            callModal.classList.remove('active');
        }
    },

    // Add participant to call
    async addParticipantToCall() {
        console.log('➕ Adding participant to call');

        // Check if there's an active call
        if (!this.state.isCallActive) {
            this.showToast('No active call', 'error');
            return;
        }

        // Show add participant modal
        const modal = document.getElementById('chatAddParticipantModal');
        if (!modal) return;

        modal.style.display = 'flex';

        // Load contacts list
        await this.loadParticipantList();
    },

    // Load available contacts for adding to call
    async loadParticipantList() {
        const listContainer = document.getElementById('addParticipantList');
        if (!listContainer) return;

        listContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading contacts...</div>';

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const profileParams = this.getProfileParams();

            // Fetch conversations (contacts)
            const response = await fetch(`${this.API_BASE_URL}/api/chat/conversations?${profileParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load contacts');
            }

            const data = await response.json();
            const conversations = data.conversations || [];

            // Filter out current call participants and current chat
            const availableContacts = conversations.filter(conv => {
                // Skip current conversation
                if (conv.id === this.state.selectedChat) return false;

                // Skip if already in call
                const participantId = `${conv.other_profile_type}_${conv.other_profile_id}`;
                return !this.state.callParticipants.some(p => p.id === participantId);
            });

            if (availableContacts.length === 0) {
                listContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No contacts available</div>';
                return;
            }

            // Render contact list
            listContainer.innerHTML = availableContacts.map(contact => `
                <div class="participant-item" onclick="ChatModalManager.inviteParticipantToCall('${contact.other_profile_type}', ${contact.other_profile_id}, '${contact.other_name}', '${contact.other_avatar || ''}')">
                    <img src="${contact.other_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.other_name)}&background=8B5CF6&color=fff&size=80`}"
                         alt="${contact.other_name}"
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(contact.other_name)}&background=8B5CF6&color=fff&size=80'">
                    <div class="participant-item-info">
                        <div class="participant-item-name">${contact.other_name}</div>
                        <div class="participant-item-role">${this.capitalizeFirst(contact.other_profile_type)}</div>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading participants:', error);
            listContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Error loading contacts</div>';
        }
    },

    // Filter participant list
    filterParticipantList(searchTerm) {
        const items = document.querySelectorAll('.participant-item');
        const term = searchTerm.toLowerCase();

        items.forEach(item => {
            const name = item.querySelector('.participant-item-name')?.textContent.toLowerCase() || '';
            item.style.display = name.includes(term) ? 'flex' : 'none';
        });
    },

    // Close add participant modal
    closeAddParticipantModal() {
        const modal = document.getElementById('chatAddParticipantModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // Invite participant to ongoing call
    async inviteParticipantToCall(profileType, profileId, name, avatar) {
        console.log(`📞 Inviting ${name} to call`);

        const participantId = `${profileType}_${profileId}`;

        // Add to participants list
        this.state.callParticipants.push({
            id: participantId,
            profile_type: profileType,
            profile_id: profileId,
            name: name,
            avatar: avatar
        });

        // Close modal
        this.closeAddParticipantModal();

        // Show toast
        this.showToast(`Calling ${name}...`, 'info');

        // Setup peer connection for new participant
        await this.setupPeerConnectionForParticipant(participantId, profileType, profileId);

        // Send call invitation via WebSocket
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            const message = {
                type: 'call_invite',
                from_profile_id: this.state.userId,
                // from_profile_type removed
                to_profile_id: profileId,
                to_profile_type: profileType,
                call_type: this.state.isVideoCall ? 'video' : 'voice',
                group_call: true
            };
            this.websocket.send(JSON.stringify(message));
        }
    },

    // Setup peer connection for a new participant (mesh topology)
    async setupPeerConnectionForParticipant(participantId, userId) {
        console.log(`🔗 Setting up peer connection for participant: ${participantId}`);

        // Create new RTCPeerConnection
        const peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        // Add local stream tracks to peer connection
        if (this.state.localStream) {
            this.state.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.state.localStream);
            });
        }

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                const message = {
                    type: 'ice_candidate',
                    candidate: event.candidate,
                    from_user_id: this.state.currentUser?.user_id,
                    to_user_id: userId
                };
                this.websocket.send(JSON.stringify(message));
            }
        };

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            console.log(`📹 Received track from participant: ${participantId}`);
            const remoteStream = event.streams[0];
            this.state.remoteStreams.set(participantId, remoteStream);
            this.displayParticipantVideo(participantId, remoteStream);
        };

        // Store peer connection
        this.state.peerConnections.set(participantId, peerConnection);

        // Create and send offer
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                const message = {
                    type: 'call_offer',
                    offer: offer,
                    from_profile_id: this.state.userId,
                    // from_profile_type removed
                    to_profile_id: profileId,
                    to_profile_type: profileType,
                    call_type: this.state.isVideoCall ? 'video' : 'voice'
                };
                this.websocket.send(JSON.stringify(message));
            }
        } catch (error) {
            console.error('Error creating offer:', error);
            this.showToast('Failed to invite participant', 'error');
        }
    },

    // Display participant video in UI
    displayParticipantVideo(participantId, stream) {
        console.log(`🎥 Displaying video for participant: ${participantId}`);

        const participant = this.state.callParticipants.find(p => p.id === participantId);
        if (!participant) {
            console.error('Participant not found:', participantId);
            return;
        }

        // Switch to grid view if multiple participants
        this.updateCallLayout();

        // Create video element for participant
        const grid = document.getElementById('chatParticipantsGrid');
        if (!grid) return;

        // Check if video container already exists
        let container = document.getElementById(`participant-${participantId}`);
        if (!container) {
            container = document.createElement('div');
            container.id = `participant-${participantId}`;
            container.className = 'participant-video-container';

            const video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true;
            video.srcObject = stream;

            const label = document.createElement('div');
            label.className = 'participant-video-label';
            label.textContent = participant.name;

            container.appendChild(video);
            container.appendChild(label);
            grid.appendChild(container);
        } else {
            // Update existing video
            const video = container.querySelector('video');
            if (video) {
                video.srcObject = stream;
            }
        }

        // Update participant list
        this.updateParticipantsList();

        this.showToast(`${participant.name} joined!`, 'success');
    },

    // Update call layout based on number of participants
    updateCallLayout() {
        const totalParticipants = this.state.callParticipants.length + 1; // +1 for self
        const grid = document.getElementById('chatParticipantsGrid');
        const remoteVideo = document.getElementById('chatRemoteVideo');
        const localVideo = document.getElementById('chatLocalVideo');

        if (!grid) return;

        if (totalParticipants > 2) {
            // Group call - show grid
            grid.style.display = 'grid';
            remoteVideo.style.display = 'none';
            localVideo.style.display = 'none';

            // Apply grid class based on participant count
            grid.className = 'call-participants-grid';
            if (totalParticipants === 2) {
                grid.classList.add('grid-2');
            } else if (totalParticipants === 3 || totalParticipants === 4) {
                grid.classList.add('grid-4');
            } else {
                grid.classList.add('grid-5-plus');
            }

            // Add local video to grid if not already there
            let localContainer = document.getElementById('participant-local');
            if (!localContainer && this.state.localStream) {
                localContainer = document.createElement('div');
                localContainer.id = 'participant-local';
                localContainer.className = 'participant-video-container';

                const video = document.createElement('video');
                video.autoplay = true;
                video.muted = true;
                video.playsInline = true;
                video.srcObject = this.state.localStream;

                const label = document.createElement('div');
                label.className = 'participant-video-label';
                label.textContent = 'You';

                localContainer.appendChild(video);
                localContainer.appendChild(label);
                grid.insertBefore(localContainer, grid.firstChild);
            }

            // Add original remote participant to grid if exists
            if (this.state.remoteStream && !document.getElementById('participant-original')) {
                const originalContainer = document.createElement('div');
                originalContainer.id = 'participant-original';
                originalContainer.className = 'participant-video-container';

                const video = document.createElement('video');
                video.autoplay = true;
                video.playsInline = true;
                video.srcObject = this.state.remoteStream;

                const label = document.createElement('div');
                label.className = 'participant-video-label';
                const conv = this.state.conversations?.find(c => c.id === this.state.selectedChat);
                label.textContent = conv?.other_name || 'Participant';

                originalContainer.appendChild(video);
                originalContainer.appendChild(label);
                grid.appendChild(originalContainer);
            }
        } else {
            // 1-on-1 call - use traditional layout
            grid.style.display = 'none';
            remoteVideo.style.display = 'block';
            localVideo.style.display = 'block';
        }
    },

    // Update participants list overlay
    updateParticipantsList() {
        const count = document.getElementById('chatParticipantsCount');
        const items = document.getElementById('chatParticipantsItems');

        if (!count || !items) return;

        const totalParticipants = this.state.callParticipants.length + 1; // +1 for self
        count.textContent = totalParticipants;

        // Build participant list
        const participantHTML = [
            // Add self first
            `<div class="participant-list-item you">
                <img src="${this.state.currentUser?.avatar || 'https://ui-avatars.com/api/?name=You&background=10b981&color=fff&size=24'}"
                     alt="You"
                     onerror="this.src='https://ui-avatars.com/api/?name=You&background=10b981&color=fff&size=24'">
                <span class="participant-name">You</span>
            </div>`,
            // Add original participant
            ...(() => {
                const conv = this.state.conversations?.find(c => c.id === this.state.selectedChat);
                if (conv) {
                    return [`<div class="participant-list-item">
                        <img src="${conv.other_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.other_name)}&background=8B5CF6&color=fff&size=24`}"
                             alt="${conv.other_name}"
                             onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(conv.other_name)}&background=8B5CF6&color=fff&size=24'">
                        <span class="participant-name">${conv.other_name}</span>
                    </div>`];
                }
                return [];
            })(),
            // Add other participants
            ...this.state.callParticipants.map(p => `
                <div class="participant-list-item">
                    <img src="${p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=8B5CF6&color=fff&size=24`}"
                         alt="${p.name}"
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=8B5CF6&color=fff&size=24'">
                    <span class="participant-name">${p.name}</span>
                </div>
            `)
        ];

        items.innerHTML = participantHTML.join('');
    },

    // Show call modal
    showCallModal(isVideo) {
        const callModal = document.getElementById('chatCallModal');
        const incomingScreen = document.getElementById('chatIncomingCallScreen');
        const activeScreen = document.getElementById('chatActiveCallScreen');
        const voiceAnimation = document.getElementById('chatVoiceCallAnimation');
        const videoToggleBtn = document.getElementById('chatSwitchVideoModeBtn');
        const switchModeBtn = document.getElementById('chatSwitchCallModeBtn');

        if (!callModal || !activeScreen) return;

        callModal.classList.add('active');
        if (incomingScreen) incomingScreen.style.display = 'none';
        activeScreen.style.display = 'block';

        // Show/hide voice animation
        if (voiceAnimation) {
            voiceAnimation.style.display = isVideo ? 'none' : 'flex';
        }

        // Show/hide buttons based on call mode
        // Video mode: Show BOTH video toggle and call mode switch
        // Voice mode: Hide video toggle, show call mode switch
        if (videoToggleBtn) {
            videoToggleBtn.style.display = isVideo ? 'inline-flex' : 'none';
        }

        // Update switch mode button - always visible, changes icon based on mode
        if (switchModeBtn) {
            switchModeBtn.style.display = 'inline-flex';
            if (isVideo) {
                // Currently video - show phone icon to switch back to voice
                switchModeBtn.title = 'Switch to Voice Call';
                switchModeBtn.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                `;
            } else {
                // Currently voice - show video camera icon to switch to video
                switchModeBtn.title = 'Switch to Video Call';
                switchModeBtn.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                `;
            }
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
        // Clear call invitation timeout
        if (this.state.callInvitationTimeout) {
            clearTimeout(this.state.callInvitationTimeout);
            this.state.callInvitationTimeout = null;
        }

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
        this.state.callStartTime = null;
        this.state.currentCallLogId = null;  // Clear call log ID
        this.state.pendingCallLogPromise = null;

        // Clear the static remote audio element (do NOT remove it — it must stay in the DOM
        // so mobile browsers don't block autoplay on the next call)
        const remoteAudio = document.getElementById('chatRemoteAudio');
        if (remoteAudio) {
            remoteAudio.srcObject = null;
            remoteAudio.pause();
        }

        // Stop ringtone (ensures incoming call sounds stop)
        this.stopRingtone();
    },

    // Ringtone functions
    playRingtone() {
        // Create audio element for ringtone
        if (!this.ringtoneAudio) {
            this.ringtoneAudio = new Audio();
            this.ringtoneAudio.loop = true;
            // Use default browser notification sound or custom ringtone
            this.ringtoneAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAoUXrTp66hVFApGn+DyvmwhBjSM1/LMeS0FJHfH8N2RQAo=';
        }
        this.ringtoneAudio.play().catch(e => console.log('Could not play ringtone:', e));
    },

    stopRingtone() {
        if (this.ringtoneAudio) {
            this.ringtoneAudio.pause();
            this.ringtoneAudio.currentTime = 0;
        }
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

// WebRTC Call Functions
function startChatVoiceCall() {
    ChatModalManager.startChatVoiceCall();
}

function startChatVideoCall() {
    ChatModalManager.startChatVideoCall();
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
    console.log('🔥 Global handleSendMessage() called!');
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

// Active Sessions Panel functions
function openActiveSessionsPanel() {
    ChatModalManager.openActiveSessionsPanel();
}

function closeActiveSessionsPanel() {
    ChatModalManager.closeActiveSessionsPanel();
}

function terminateSession(sessionId) {
    ChatModalManager.terminateSession(sessionId);
}

function terminateAllOtherSessions() {
    ChatModalManager.terminateAllOtherSessions();
}

// Two-Step Verification Panel functions
function openTwoStepVerification() {
    ChatModalManager.openTwoStepPanel();
}

function closeTwoStepPanel() {
    ChatModalManager.closeTwoStepPanel();
}

function enableTwoStepVerification() {
    ChatModalManager.enableTwoStepVerification();
}

function disableTwoStepVerification() {
    ChatModalManager.disableTwoStepVerification();
}

function changeTwoStepPassword() {
    ChatModalManager.changeTwoStepPassword();
}

function toggleSetupPasswordVisibility(inputId, button) {
    ChatModalManager.toggleSetupPasswordVisibility(inputId, button);
}

// Coming Soon Panel functions
function showComingSoonPanel(featureName) {
    const panel = document.getElementById('comingSoonPanel');
    const title = document.getElementById('comingSoonPanelTitle');
    const desc = document.getElementById('comingSoonPanelDesc');

    if (panel && title && desc) {
        title.textContent = featureName;

        // Set description based on feature
        const descriptions = {
            'Media & Storage': 'Media download preferences, image quality settings, and storage management features are currently under development.',
            'Voice Preferences': 'Text-to-speech voice selection, speech rate controls, and auto-play settings for voice messages are coming soon.',
            'Language & Translation': 'Automatic message translation and language preferences will be available in a future update.'
        };

        desc.textContent = descriptions[featureName] || 'This feature is currently under development and will be available in a future update.';
        panel.classList.add('active');
    }
}

function hideComingSoonPanel() {
    const panel = document.getElementById('comingSoonPanel');
    if (panel) {
        panel.classList.remove('active');
    }
}

// Voice Selection Handler - shows TrueVoice setup panel when TrueVoice is selected
function handleVoiceSelection(value) {
    if (value === 'truevoice') {
        // Check if user already has TrueVoice set up
        if (typeof TrueVoiceManager !== 'undefined' && TrueVoiceManager.state && TrueVoiceManager.state.isEnrolled) {
            // Already enrolled, just save the setting
            updateChatSetting('tts_voice', value);
        } else {
            // Not enrolled, show TrueVoice setup panel
            showTrueVoiceSetupPanel();
            // Reset selection to synthetic (default)
            const select = document.getElementById('settingTTSVoice');
            if (select) {
                select.value = 'synthetic';
            }
        }
    } else {
        // Normal voice selection (none, synthetic)
        updateChatSetting('tts_voice', value);
    }
}

// TrueVoice Setup Panel
function showTrueVoiceSetupPanel() {
    const panel = document.getElementById('truevoiceSetupPanel');
    if (panel) {
        panel.classList.add('active');
    }
}

function hideTrueVoiceSetupPanel() {
    const panel = document.getElementById('truevoiceSetupPanel');
    if (panel) {
        panel.classList.remove('active');
    }
}

function startTrueVoiceSetup() {
    hideTrueVoiceSetupPanel();
    if (typeof TrueVoiceManager !== 'undefined') {
        TrueVoiceManager.startEnrollment();
    }
}

// Delete Contact Confirmation Modal functions
function showDeleteContactConfirmation() {
    ChatModalManager.showDeleteContactConfirmation();
}

function hideDeleteContactConfirmation() {
    const modal = document.getElementById('deleteContactModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function confirmDeleteContact() {
    ChatModalManager.confirmDeleteContact();
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

// Duplicate call functions removed - using correct versions at line 14656-14661

function endChatCall() {
    ChatModalManager.endChatCall();
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

function translateChatMessage() {
    ChatModalManager.translateMessageFromContextMenu();
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

// Poll Functions
function openCreatePollModal() {
    ChatModalManager.openCreatePollModal();
}

function votePoll(pollId, optionId) {
    ChatModalManager.votePoll(pollId, optionId);
}

function deletePoll(pollId) {
    ChatModalManager.deletePoll(pollId);
}

function scrollToPoll(pollId) {
    ChatModalManager.scrollToPoll(pollId);
}

// Member Functions
function openAddMemberModal() {
    ChatModalManager.openAddMemberModal();
}

function leaveGroupOrChannel() {
    ChatModalManager.leaveGroupOrChannel();
}

// Two-Step Verification Functions
function verifyTwoStepPassword() {
    ChatModalManager.verifyTwoStepPasswordAction();
}

function toggleTwoStepPasswordVisibility() {
    ChatModalManager.toggleTwoStepPasswordVisibility();
}

function forgotTwoStepPassword() {
    ChatModalManager.forgotTwoStepPasswordAction();
}

function closeForgotTwoStepModal() {
    ChatModalManager.closeForgotTwoStepModalAction();
}

function sendTwoStepResetCode() {
    ChatModalManager.sendTwoStepResetCodeAction();
}

function resetTwoStepPassword() {
    ChatModalManager.resetTwoStepPasswordAction();
}

function closeChatModalCompletely() {
    ChatModalManager.closeChatModalCompletely();
}

// OTP Input Handlers
function handleOtpInput(input) {
    const value = input.value;

    // Only allow digits
    input.value = value.replace(/[^0-9]/g, '');

    if (input.value) {
        input.classList.add('filled');
        // Move to next input
        const nextInput = input.nextElementSibling;
        if (nextInput && nextInput.classList.contains('otp-input')) {
            nextInput.focus();
        }
    } else {
        input.classList.remove('filled');
    }
}

function handleOtpKeydown(event, input) {
    // Handle backspace - move to previous input
    if (event.key === 'Backspace' && !input.value) {
        const prevInput = input.previousElementSibling;
        if (prevInput && prevInput.classList.contains('otp-input')) {
            prevInput.focus();
            prevInput.value = '';
            prevInput.classList.remove('filled');
        }
    }

    // Handle paste
    if (event.key === 'v' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        navigator.clipboard.readText().then(text => {
            const digits = text.replace(/[^0-9]/g, '').slice(0, 6);
            const inputs = document.querySelectorAll('.otp-input');
            digits.split('').forEach((digit, i) => {
                if (inputs[i]) {
                    inputs[i].value = digit;
                    inputs[i].classList.add('filled');
                }
            });
            // Focus the next empty input or the last one
            const nextEmpty = Array.from(inputs).find(i => !i.value);
            if (nextEmpty) nextEmpty.focus();
            else inputs[inputs.length - 1].focus();
        });
    }
}

// Initialize on DOM load - but only if chatModal already exists in DOM
// (for pages that include the modal HTML directly)
// For pages that load the modal dynamically, they should call ChatModalManager.init() after loading
function initChatModalIfReady() {
    // Only auto-init if the modal HTML is already present
    if (document.getElementById('chatModal')) {
        ChatModalManager.init();
    } else {
        console.log('Chat Modal Manager: Waiting for modal HTML to be loaded dynamically');
    }
}

// Check if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatModalIfReady);
} else {
    // DOM is already loaded, run immediately
    initChatModalIfReady();
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.ChatModalManager = ChatModalManager;
    window.openChatModal = openChatModal;
    window.closeChatModal = closeChatModal;
    window.filterLanguages = filterLanguages;
    window.toggleChatSettings = toggleChatSettings;
    window.minimizeChatModal = minimizeChatModal;
    window.restoreChatModal = restoreChatModal;
    window.toggleChatSidebar = toggleChatSidebar;
    window.toggleChatInfo = toggleChatInfo;
    window.toggleChatSearch = toggleChatSearch;
    window.navigateSearchNext = navigateSearchNext;
    window.navigateSearchPrev = navigateSearchPrev;
    window.toggleReadMessages = toggleReadMessages;
    window.showComingSoonReadMessages = showComingSoonReadMessages;
    window.startChatVoiceCall = startChatVoiceCall;
    window.startChatVideoCall = startChatVideoCall;
    window.toggleVoiceToText = toggleVoiceToText;
    window.showSendOptions = showSendOptions;
    window.setSendMode = setSendMode;
    window.handleSendMessage = handleSendMessage;
    window.toggleSendMode = toggleSendMode;
    window.toggleVoiceRecordMode = toggleVoiceRecordMode;

    // ===========================================
    // DEBUG CONSOLE - Run debugChatModal() in browser console
    // ===========================================
    window.debugChatModal = function() {
        console.log('='.repeat(60));
        console.log('🔍 CHAT MODAL DEBUG REPORT');
        console.log('='.repeat(60));

        // 1. Check if modal HTML exists
        const modal = document.getElementById('chatModal');
        console.log('\n📦 1. MODAL HTML:');
        console.log('   #chatModal exists:', !!modal);
        console.log('   #chat-modal-container exists:', !!document.getElementById('chat-modal-container'));
        console.log('   #chat-modal-container innerHTML length:', document.getElementById('chat-modal-container')?.innerHTML?.length || 0);

        // 2. Check key elements
        console.log('\n🎯 2. KEY ELEMENTS:');
        const elements = [
            'chatMessageInput',
            'chatContactSearch',
            'chatSendBtn',
            'chatArea',
            'chatContactsList',
            'chatCurrentUserName',
            'chatCurrentUserAvatar'
        ];
        elements.forEach(id => {
            const el = document.getElementById(id);
            console.log(`   #${id}:`, el ? '✅ FOUND' : '❌ NOT FOUND');
        });

        // 3. Check ChatModalManager state
        console.log('\n⚙️ 3. CHATMODALMANAGER STATE:');
        console.log('   _initialized:', ChatModalManager._initialized);
        console.log('   state.isOpen:', ChatModalManager.state.isOpen);
        console.log('   state.currentUser:', ChatModalManager.state.currentUser?.full_name || ChatModalManager.state.currentUser?.email || 'NOT SET');
        console.log('   state.currentProfile:', ChatModalManager.state.currentProfile);
        console.log('   state.selectedChat:', ChatModalManager.state.selectedChat);
        console.log('   state.selectedConversation:', ChatModalManager.state.selectedConversation?.id || 'NOT SET');
        console.log('   state.conversations count:', ChatModalManager.state.conversations?.length || 0);

        // 4. Check localStorage
        console.log('\n💾 4. LOCALSTORAGE:');
        console.log('   token:', localStorage.getItem('token') ? '✅ EXISTS (' + localStorage.getItem('token').substring(0,20) + '...)' : '❌ NOT FOUND');
        console.log('   access_token:', localStorage.getItem('access_token') ? '✅ EXISTS' : '❌ NOT FOUND');
        console.log('   currentUser:', localStorage.getItem('currentUser') ? '✅ EXISTS' : '❌ NOT FOUND');
        console.log('   userRole:', localStorage.getItem('userRole'));

        // Parse currentUser if exists
        try {
            const cu = JSON.parse(localStorage.getItem('currentUser') || '{}');
            console.log('   currentUser.role_ids:', cu.role_ids);
            console.log('   currentUser.id:', cu.id);
            console.log('   currentUser.user_id:', cu.user_id);
        } catch(e) {
            console.log('   currentUser parse error:', e.message);
        }

        // 5. Check global functions
        console.log('\n🌐 5. GLOBAL FUNCTIONS:');
        const funcs = ['openChatModal', 'closeChatModal', 'handleSendMessage', 'toggleChatSidebar', 'sendMessage'];
        funcs.forEach(fn => {
            console.log(`   ${fn}:`, typeof window[fn] === 'function' ? '✅ DEFINED' : '❌ NOT DEFINED');
        });

        // 6. Check event listeners on send button
        console.log('\n🖱️ 6. SEND BUTTON:');
        const sendBtn = document.getElementById('chatSendBtn');
        if (sendBtn) {
            console.log('   onclick attribute:', sendBtn.getAttribute('onclick'));
            console.log('   element HTML:', sendBtn.outerHTML.substring(0, 200));
        } else {
            console.log('   ❌ Send button not found');
        }

        // 7. Check message input
        console.log('\n⌨️ 7. MESSAGE INPUT:');
        const msgInput = document.getElementById('chatMessageInput');
        if (msgInput) {
            console.log('   value:', msgInput.value || '(empty)');
            console.log('   disabled:', msgInput.disabled);
            console.log('   readonly:', msgInput.readOnly);
        } else {
            console.log('   ❌ Message input not found');
        }

        // 8. API Configuration
        console.log('\n🔗 8. API CONFIGURATION:');
        console.log('   ChatModalManager.API_BASE_URL:', ChatModalManager.API_BASE_URL);
        console.log('   window.API_BASE_URL:', window.API_BASE_URL);
        console.log('   getProfileParams():', ChatModalManager.getProfileParams());

        // 9. Check if bindEvents was called
        console.log('\n🔧 9. EVENT BINDING STATUS:');
        if (msgInput) {
            // Try to check if events are bound by looking at jQuery or native
            const events = getEventListeners ? getEventListeners(msgInput) : 'Cannot check (Chrome DevTools only)';
            console.log('   Message input events:', events);
        }

        console.log('\n📋 10. AVAILABLE DEBUG COMMANDS:');
        console.log('   testChatSend()     - Test sending a message');
        console.log('   reinitChatModal()  - Reinitialize ChatModalManager');
        console.log('   forceBindEvents()  - Force rebind all events');

        console.log('\n' + '='.repeat(60));
        console.log('END OF DEBUG REPORT');
        console.log('='.repeat(60));

        return {
            modalExists: !!modal,
            initialized: ChatModalManager._initialized,
            currentProfile: ChatModalManager.state.currentProfile,
            selectedChat: ChatModalManager.state.selectedChat
        };
    };

    // Test function to manually trigger send
    window.testChatSend = function() {
        console.log('🧪 Testing chat send...');
        const input = document.getElementById('chatMessageInput');
        if (input) {
            input.value = 'Test message from debug console';
            console.log('   Set input value to:', input.value);
        } else {
            console.log('   ❌ chatMessageInput not found!');
            return;
        }

        console.log('   Current state.selectedChat:', ChatModalManager.state.selectedChat);
        console.log('   Current state.currentProfile:', ChatModalManager.state.currentProfile);

        console.log('   Calling ChatModalManager.handleSendMessage()...');
        try {
            ChatModalManager.handleSendMessage();
            console.log('   ✅ handleSendMessage() completed');
        } catch(e) {
            console.log('   ❌ Error:', e.message);
            console.error(e);
        }
    };

    // Reinitialize function
    window.reinitChatModal = function() {
        console.log('🔄 Reinitializing ChatModalManager...');
        ChatModalManager._initialized = false;
        ChatModalManager.init();
        console.log('   ✅ Reinitialized. _initialized is now:', ChatModalManager._initialized);
        return debugChatModal();
    };

    // Force rebind events
    window.forceBindEvents = function() {
        console.log('🔧 Force binding events...');
        ChatModalManager.bindEvents();
        console.log('   ✅ bindEvents() called');

        // Test if Enter key works
        const input = document.getElementById('chatMessageInput');
        if (input) {
            console.log('   Testing keypress listener...');
            input.focus();
            console.log('   Input focused. Type a message and press Enter to test.');
        }
    };
}
