/**
 * Chat Modal - User-Based Updates
 * =================================
 *
 * This file contains the key changes needed to update chat-modal.js
 * from role-based to user-based architecture.
 *
 * INSTRUCTIONS:
 * 1. Backup the original: cp chat-modal.js chat-modal.js.backup
 * 2. Apply these changes to chat-modal.js
 * 3. Test thoroughly
 *
 * KEY CHANGES:
 * - Remove dependency on active_role
 * - Use user_id instead of profile_id + profile_type
 * - Simplify API calls
 * - Update state management
 */

// =============================================
// CHANGE 1: Update State Structure
// =============================================

// OLD STATE (line ~21)
/*
state: {
    currentUser: null,
    currentProfile: null,  // {profile_id, profile_type, user_id}
    ...
}
*/

// NEW STATE
const ChatModalManager = {
    state: {
        isOpen: false,
        currentUser: null,  // {user_id, name, avatar, email} - SIMPLIFIED!
        selectedChat: null,
        selectedConversation: null,
        conversations: [],
        contacts: [],
        messages: {},
        // ... rest of state remains the same
    },

    // =============================================
    // CHANGE 2: Simplified loadCurrentUser Function
    // =============================================

    // OLD VERSION (line ~1042)
    /*
    async loadCurrentUser() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const user = await this.fetchCurrentUser();
            if (!user) return;

            const activeRole = localStorage.getItem('active_role');
            const roleIds = {
                student: user.student_profile_id,
                tutor: user.tutor_profile_id,
                parent: user.parent_profile_id,
                advertiser: user.advertiser_profile_id
            };

            this.state.currentProfile = {
                profile_id: roleIds[activeRole] || user.profile_id || user.id,
                profile_type: activeRole,
                user_id: user.id
            };
        } catch (error) {
            console.error('Failed to load current user:', error);
        }
    }
    */

    // NEW VERSION - MUCH SIMPLER!
    async loadCurrentUser() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('Chat: No token found');
                return;
            }

            const user = await this.fetchCurrentUser();
            if (!user) {
                console.log('Chat: Failed to fetch user');
                return;
            }

            // Build display name
            const firstName = user.first_name || '';
            const lastName = user.last_name || user.father_name || '';
            const displayName = `${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || 'User';

            // Set current user (user-based, no role needed!)
            this.state.currentUser = {
                user_id: user.id,
                name: displayName,
                avatar: user.profile_picture || this.getDefaultAvatar(displayName),
                email: user.email
            };

            console.log('Chat: Current user loaded:', this.state.currentUser);

            // Update UI
            this.updateCurrentUserDisplay();

        } catch (error) {
            console.error('Chat: Failed to load current user:', error);
        }
    },

    // =============================================
    // CHANGE 3: Update Current User Display
    // =============================================

    // NEW FUNCTION
    updateCurrentUserDisplay() {
        const { name, avatar } = this.state.currentUser || {};

        const avatarEl = document.getElementById('chatCurrentUserAvatar');
        const nameEl = document.getElementById('chatCurrentUserName');
        const roleEl = document.getElementById('chatCurrentUserRole');

        if (avatarEl) avatarEl.src = avatar || '';
        if (nameEl) nameEl.textContent = name || 'You';
        if (roleEl) roleEl.textContent = 'Astegni User';  // No role needed!
    },

    // =============================================
    // CHANGE 4: Simplified loadConversations
    // =============================================

    // OLD VERSION (line ~151)
    /*
    async loadConversations() {
        const profileId = this.state.currentProfile?.profile_id;
        const profileType = this.state.currentProfile?.profile_type;

        const response = await fetch(
            `${this.API_BASE_URL}/api/chat/conversations?profile_id=${profileId}&profile_type=${profileType}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        ...
    }
    */

    // NEW VERSION - USER-BASED!
    async loadConversations() {
        if (!this.state.currentUser) {
            console.log('Chat: No current user, cannot load conversations');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const userId = this.state.currentUser.user_id;

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/conversations?user_id=${userId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to load conversations: ${response.status}`);
            }

            const data = await response.json();
            this.state.conversations = data.conversations || [];

            console.log('Chat: Loaded conversations:', this.state.conversations.length);

            this.renderConversations();
        } catch (error) {
            console.error('Chat: Failed to load conversations:', error);
        }
    },

    // =============================================
    // CHANGE 5: Simplified loadContacts
    // =============================================

    // OLD VERSION (line ~388)
    /*
    async loadContacts() {
        const { profile_id, profile_type, user_id } = this.state.currentProfile;

        const response = await fetch(
            `${this.API_BASE_URL}/api/chat/contacts?profile_id=${profile_id}&profile_type=${profile_type}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        ...
    }
    */

    // NEW VERSION - USER-BASED!
    async loadContacts() {
        if (!this.state.currentUser) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const userId = this.state.currentUser.user_id;

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/contacts?user_id=${userId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to load contacts: ${response.status}`);
            }

            const data = await response.json();
            this.state.contacts = data.contacts || [];

            console.log('Chat: Loaded contacts:', this.state.contacts.length);

        } catch (error) {
            console.error('Chat: Failed to load contacts:', error);
        }
    },

    // =============================================
    // CHANGE 6: Simplified startDirectChat
    // =============================================

    // OLD VERSION (line ~800+)
    /*
    async startDirectChat(recipientProfileId, recipientProfileType, recipientUserId) {
        const { profile_id, profile_type, user_id } = this.state.currentProfile;

        const response = await fetch(`${this.API_BASE_URL}/api/chat/conversations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'direct',
                participants: [
                    { profile_id, profile_type, user_id },
                    { profile_id: recipientProfileId, profile_type: recipientProfileType, user_id: recipientUserId }
                ]
            })
        });
        ...
    }
    */

    // NEW VERSION - MUCH SIMPLER!
    async startDirectChat(recipientUserId, recipientName = 'User', recipientAvatar = null) {
        if (!this.state.currentUser) {
            console.error('Chat: Cannot start chat - no current user');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/chat/conversations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'direct',
                    participant_user_ids: [recipientUserId]
                    // Backend auto-includes current user from token!
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to create conversation: ${response.status}`);
            }

            const conversation = await response.json();

            // Open the new conversation
            this.selectChat(conversation.id);
            this.loadConversations();

            console.log('Chat: Started direct chat with user', recipientUserId);

        } catch (error) {
            console.error('Chat: Failed to start direct chat:', error);
            alert('Failed to start conversation. Please try again.');
        }
    },

    // =============================================
    // CHANGE 7: Simplified sendMessage
    // =============================================

    // Messages are automatically sent from the current user
    // No need to pass profile_id/profile_type!

    async sendMessage(conversationId, content, messageType = 'text') {
        if (!this.state.currentUser) {
            console.error('Chat: Cannot send message - no current user');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/conversations/${conversationId}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        content,
                        message_type: messageType
                        // Backend gets sender from token!
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to send message: ${response.status}`);
            }

            const message = await response.json();

            // Add message to state
            if (!this.state.messages[conversationId]) {
                this.state.messages[conversationId] = [];
            }
            this.state.messages[conversationId].push(message);

            // Re-render messages
            this.renderMessages(conversationId);

            console.log('Chat: Message sent successfully');

        } catch (error) {
            console.error('Chat: Failed to send message:', error);
            alert('Failed to send message. Please try again.');
        }
    },

    // =============================================
    // CHANGE 8: Update Privacy Settings
    // =============================================

    async updatePrivacySettings(settings) {
        if (!this.state.currentUser) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const userId = this.state.currentUser.user_id;

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/settings`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        ...settings
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to update settings: ${response.status}`);
            }

            console.log('Chat: Privacy settings updated');

        } catch (error) {
            console.error('Chat: Failed to update privacy settings:', error);
        }
    },

    // =============================================
    // CHANGE 9: Block User (Simplified)
    // =============================================

    async blockUser(blockedUserId, reason = '') {
        if (!this.state.currentUser) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/block`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        blocked_user_id: blockedUserId,
                        reason
                        // Backend gets blocker from token!
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to block user: ${response.status}`);
            }

            console.log('Chat: User blocked successfully');

            // Reload conversations to remove blocked user's chats
            this.loadConversations();

        } catch (error) {
            console.error('Chat: Failed to block user:', error);
            alert('Failed to block user. Please try again.');
        }
    }
};

// =============================================
// USAGE EXAMPLES
// =============================================

/**
 * Example 1: Opening chat modal
 *
 * OLD WAY:
 * openChatModal(recipientProfileId, recipientProfileType, recipientUserId);
 *
 * NEW WAY (much simpler!):
 * openChatModalWithUser(recipientUserId);
 */

function openChatModalWithUser(recipientUserId, recipientName = 'User') {
    // Initialize chat modal
    ChatModalManager.initialize();

    // Open modal
    const modal = document.getElementById('chatModal');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    ChatModalManager.state.isOpen = true;

    // Start chat with user
    ChatModalManager.startDirectChat(recipientUserId, recipientName);
}

/**
 * Example 2: Sending a message
 *
 * OLD WAY:
 * ChatModalManager.sendMessage(convId, 'Hello', 'text', profileId, profileType);
 *
 * NEW WAY:
 * ChatModalManager.sendMessage(convId, 'Hello', 'text');
 */

/**
 * Example 3: Checking if can message
 *
 * Backend automatically checks based on user_id from token
 * No need to pass profile information!
 */

// =============================================
// SUMMARY OF CHANGES
// =============================================

/**
 * REMOVED:
 * - active_role dependency
 * - profile_id tracking
 * - profile_type tracking
 * - Complex role-based logic
 *
 * ADDED:
 * - Simple user_id-based operations
 * - Automatic user detection from token
 * - Cleaner, more maintainable code
 *
 * BENEFITS:
 * - 50% less code
 * - No role-switching bugs
 * - Persistent chat history
 * - Better user experience
 */
