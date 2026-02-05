import re

def patch_chat_modal():
    """Apply comprehensive patches to chat-modal.js"""

    input_file = r'c:\Users\zenna\Downloads\Astegni\js\common-modals\chat-modal.js'

    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Find and replace loadCurrentUser function (around line 999-1168)
    new_load_current_user = '''    // Load Current User from Auth - simplified for user-based architecture
    loadCurrentUser() {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            console.log('Chat: No token found');
            return;
        }

        // Fetch from API
        this.fetchCurrentUser();
    },

'''

    # Find and replace fetchCurrentUser function (around line 1171-1235)
    new_fetch_current_user = '''    // Fetch current user from API - simplified for user-based architecture
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

'''

    # Find and replace updateCurrentUserUI function (around line 1237-1290)
    new_update_current_user_ui = '''    // Update Current User Display - simplified for user-based architecture
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

'''

    # Find and replace getProfileParams function
    new_get_profile_params = '''    // Get profile parameters for API calls - user-based version
    getProfileParams() {
        if (!this.state.currentUser) {
            console.warn('Chat: No current user available');
            return null;
        }
        return {
            user_id: this.state.currentUser.user_id
        };
    },

'''

    content = ''.join(lines)

    # Replace loadCurrentUser (lines 1000-1168)
    pattern1 = r'    // Load Current User from Auth - tries multiple sources\n    loadCurrentUser\(\) \{[\s\S]*?    \},\n'
    content = re.sub(pattern1, new_load_current_user, content, count=1)

    # Replace fetchCurrentUser (lines 1170-1235)
    pattern2 = r'    // Fetch current user from API\n    async fetchCurrentUser\(\) \{[\s\S]*?    \},\n'
    content = re.sub(pattern2, new_fetch_current_user, content, count=1)

    # Replace updateCurrentUserUI (lines 1237-1290)
    pattern3 = r'    // Update Current User UI in sidebar\n    updateCurrentUserUI\(\) \{[\s\S]*?    \},\n'
    content = re.sub(pattern3, new_update_current_user_ui, content, count=1)

    # Replace getProfileParams
    pattern4 = r'    // Get profile parameters for API calls[\s\S]*?getProfileParams\(\) \{[\s\S]*?    \},\n'
    content = re.sub(pattern4, new_get_profile_params, content, count=1)

    # Additional replacements for API calls

    # Fix loadConversations
    content = re.sub(
        r'const userId = this\.state\.currentUser\?\.user_id;\n            const profileType = this\.state\.currentProfile\?\.profile_type;',
        'const userId = this.state.currentUser?.user_id;',
        content
    )

    # Fix loadContacts
    content = re.sub(
        r'const userId = this\.state\.currentUser\?\.user_id;\n\s+const profileType = this\.state\.currentProfile\?\.profile_type;',
        'const userId = this.state.currentUser?.user_id;',
        content
    )

    # Fix updateMyActiveStatus
    content = re.sub(
        r'const userId = this\.state\.currentUser\?\.user_id;\n\s+const profileType = this\.state\.currentProfile\?\.profile_type;',
        'const userId = this.state.currentUser?.user_id;',
        content
    )

    # Fix any remaining profile_id=, profile_type= patterns in API URLs
    content = re.sub(
        r'\?profile_id=\$\{[^}]+\}&profile_type=\$\{[^}]+\}(&user_id=\$\{[^}]+\})?',
        '?user_id=${userId}',
        content
    )

    content = re.sub(
        r'&profile_id=\$\{[^}]+\}&profile_type=\$\{[^}]+\}',
        '',
        content
    )

    # Fix params in URLSearchParams
    content = re.sub(
        r'profile_id:\s*userId,\s*profile_type:\s*profileType,\s*user_id:\s*userId,',
        'user_id: userId,',
        content
    )

    content = re.sub(
        r'profile_id:\s*profile_id,\s*profile_type:\s*profile_type,\s*user_id:\s*user_id,',
        'user_id: user_id,',
        content
    )

    # Write back
    with open(input_file, 'w', encoding='utf-8') as f:
        f.write(content)

    print("Successfully patched chat-modal.js")
    print("   - Replaced loadCurrentUser()")
    print("   - Replaced fetchCurrentUser()")
    print("   - Replaced updateCurrentUserDisplay()")
    print("   - Replaced getProfileParams()")
    print("   - Fixed API URL parameters")
    print("   - Cleaned up profile-based references")

if __name__ == '__main__':
    patch_chat_modal()
