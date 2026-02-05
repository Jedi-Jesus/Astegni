import re

def patch_api_calls():
    """Fix all API calls to use user-based parameters"""

    input_file = r'c:\Users\zenna\Downloads\Astegni\js\common-modals\chat-modal.js'

    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    original_size = len(content)

    # 1. Fix loadConversations function
    content = re.sub(
        r'async loadConversations\(filterType = \'all\'\) \{[\s\S]*?const userId = this\.state\.currentUser\?\.user_id;[\s\S]*?// Build URL with filter[\s\S]*?const url = `\$\{this\.API_BASE_URL\}/api/chat/conversations\?user_id=\$\{userId\}[^`]*`;',
        '''async loadConversations(filterType = 'all') {
        if (!this.state.currentUser) {
            console.log('Chat: No current user, cannot load conversations');
            return;
        }

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) return;

        try {
            const userId = this.state.currentUser.user_id;

            // Build URL with filter
            let url = `${this.API_BASE_URL}/api/chat/conversations?user_id=${userId}`;
            if (filterType && filterType !== 'all') {
                url += `&filter=${filterType}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load conversations: ${response.status}`);
            }

            const data = await response.json();
            this.state.conversations = data.conversations || [];

            console.log('Chat: Loaded', this.state.conversations.length, 'conversations');

            this.renderConversations();
        } catch (error) {
            console.error('Chat: Failed to load conversations:', error);
        }
    },''',
        content,
        count=1,
        flags=re.DOTALL
    )

    # 2. Fix loadContacts function
    content = re.sub(
        r'async loadContacts\(search = \'\'\) \{[\s\S]*?(?=\n    async loadConnectionRequests)',
        '''async loadContacts(search = '') {
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

    ''',
        content,
        count=1,
        flags=re.DOTALL
    )

    # 3. Fix startDirectChat function
    old_start_direct_chat = r'async startDirectChat\(recipientUserId[^)]*\)[^{]*\{[^}]*const userId = this\.state\.currentUser\?\.user_id;[^}]*body: JSON\.stringify\(\{[^}]*type: \'direct\',[^}]*participant_user_ids: \[recipientUserId\][^}]*\}\)'
    new_start_direct_chat = '''async startDirectChat(recipientUserId, recipientName = 'User', recipientAvatar = null) {
        if (!this.state.currentUser) {
            console.error('Chat: Cannot start chat - no current user');
            return;
        }

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
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

            console.log('Chat: Created direct conversation:', conversation.id);

            // Open the new conversation
            this.selectChat(conversation.id);
            this.loadConversations();

        } catch (error) {
            console.error('Chat: Failed to start direct chat:', error);
            this.showNotification('Failed to start conversation', 'error');
        }
    }'''

    # 4. Fix sendMessage to not send profile info
    content = re.sub(
        r'sender_profile_id:\s*userId,\s*sender_profile_type:\s*profileType,',
        '',
        content
    )

    # 5. Fix blockUser function
    content = re.sub(
        r'blocked_profile_id:\s*[^,]+,\s*blocked_profile_type:\s*[^,]+,\s*',
        '',
        content
    )

    # 6. Fix typing status broadcast
    content = re.sub(
        r'profile_id:\s*userId,\s*profile_type:\s*profileType,\s*user_id:\s*userId,',
        'user_id: userId,',
        content
    )

    # 7. Fix settings loading
    content = re.sub(
        r'/api/chat/settings/save\?user_id=\$\{userId\}&profile_id=[^&]+&profile_type=[^&]+',
        '/api/chat/settings/save?user_id=${userId}',
        content
    )

    # 8. Fix any remaining destructuring of currentProfile
    content = re.sub(
        r'const \{ profile_id, profile_type, user_id \} = this\.state\.currentProfile;[\s\S]*?const userId = user_id;',
        'const userId = this.state.currentUser?.user_id;',
        content
    )

    content = re.sub(
        r'const profileId = this\.state\.currentUser\?\.user_id;[\s\S]*?const profileType = this\.state\.currentProfile\?\.profile_type;[\s\S]*?const userId = this\.state\.currentUser\?\.user_id;',
        'const userId = this.state.currentUser?.user_id;',
        content
    )

    # 9. Fix refreshChatSettingsFromAPI
    content = re.sub(
        r'const userId = this\.state\.currentUser\?\.user_id;[\s\S]{0,100}const profileType = this\.state\.currentProfile\?\.profile_type;',
        'const userId = this.state.currentUser?.user_id;',
        content
    )

    # 10. Fix checkRecipientAllowsEveryone, checkRecipientAllowsCalls, etc.
    content = re.sub(
        r'async checkRecipientAllowsEveryone\(recipientUserId\) \{[\s\S]*?`\$\{this\.API_BASE_URL\}/api/chat/settings\?profile_id=\$\{recipientProfileId\}&profile_type=\$\{recipientProfileType\}`',
        '''async checkRecipientAllowsEveryone(recipientUserId) {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) return false;

        try {
            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/settings?user_id=${recipientUserId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                const settings = data.settings || {};
                return settings.who_can_message === 'everyone';
            }
        } catch (error) {
            console.debug('[Chat] Could not fetch recipient settings:', error.message);
        }

        return false;
    },''',
        content,
        count=1,
        flags=re.DOTALL
    )

    # 11. Fix global openChatModal function signature
    content = re.sub(
        r'window\.openChatModal = function\(recipientUserId, recipientProfileType, recipientUserId',
        'window.openChatModal = function(recipientUserId',
        content
    )

    # 12. Fix any remaining profile parameter patterns in URL builders
    content = re.sub(
        r'profile_id=\$\{userId\}&profile_type=\$\{profileType\}&user_id=\$\{userId\}',
        'user_id=${userId}',
        content
    )

    # 13. Remove profileType variable declarations
    content = re.sub(
        r'const profileType = this\.state\.currentProfile\?\.profile_type;\s*\n',
        '',
        content
    )

    # Write back
    with open(input_file, 'w', encoding='utf-8') as f:
        f.write(content)

    new_size = len(content)
    print(f"API call patches applied successfully")
    print(f"   Original size: {original_size} characters")
    print(f"   New size: {new_size} characters")
    print(f"   Changed: {original_size - new_size} characters")
    print("   - Fixed loadConversations()")
    print("   - Fixed loadContacts()")
    print("   - Fixed startDirectChat()")
    print("   - Fixed sendMessage()")
    print("   - Fixed blockUser()")
    print("   - Fixed typing status")
    print("   - Fixed settings endpoints")
    print("   - Fixed checkRecipientAllowsEveryone()")
    print("   - Fixed global openChatModal()")
    print("   - Removed profile parameters from URLs")

if __name__ == '__main__':
    patch_api_calls()
