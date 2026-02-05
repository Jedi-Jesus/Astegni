import re

def final_cleanup():
    """Final cleanup pass for chat-modal.js"""

    input_file = r'c:\Users\zenna\Downloads\Astegni\js\common-modals\chat-modal.js'

    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    print(f"Starting final cleanup...")
    print(f"Original size: {len(content)} characters")

    # Count occurrences before
    profile_count = len(re.findall(r'this\.state\.currentProfile', content))
    profile_type_count = len(re.findall(r'profile_type', content))
    print(f"Before: {profile_count} currentProfile references, {profile_type_count} profile_type references")

    # 1. Replace all remaining currentProfile existence checks
    content = re.sub(
        r'if \(!this\.state\.currentProfile\)',
        'if (!this.state.currentUser)',
        content
    )

    content = re.sub(
        r'if \(this\.state\.currentProfile\)',
        'if (this.state.currentUser)',
        content
    )

    # 2. Fix any remaining destructuring patterns
    content = re.sub(
        r'const \{ profile_id, profile_type, user_id \} = this\.state\.currentProfile;',
        'const userId = this.state.currentUser?.user_id;',
        content
    )

    content = re.sub(
        r'const userId = this\.state\.currentProfile\?\.user_id;',
        'const userId = this.state.currentUser?.user_id;',
        content
    )

    # 3. Fix variable declarations for API calls
    content = re.sub(
        r'const profileId = this\.state\.currentProfile\?\.profile_id;\s*const userId = this\.state\.currentProfile\?\.user_id;',
        'const userId = this.state.currentUser?.user_id;',
        content
    )

    # 4. Fix refreshChatSettingsFromAPI
    pattern = r'async refreshChatSettingsFromAPI\(\) \{[\s\S]*?try \{[\s\S]*?const userId = this\.state\.currentUser\?\.user_id;[\s\S]*?if \(!userId \|\| !profileType\)'
    replacement = '''async refreshChatSettingsFromAPI() {
        try {
            const userId = this.state.currentUser?.user_id;

            if (!userId)'''
    content = re.sub(pattern, replacement, content, count=1)

    # 5. Fix loadTranslationSettings
    pattern = r'async loadTranslationSettings\(\) \{[\s\S]*?const userId = this\.state\.currentUser\?\.user_id;[\s\S]*?const profileType = this\.state\.currentProfile\?\.profile_type;[\s\S]*?if \(userId && profileType\)'
    replacement = '''async loadTranslationSettings() {
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
            const userId = this.state.currentUser?.user_id;

            if (userId)'''
    content = re.sub(pattern, replacement, content, count=1)

    # 6. Fix all API URLs with profile parameters
    # Settings endpoint
    content = re.sub(
        r'\$\{this\.API_BASE_URL\}/api/chat/settings\?profile_id=\$\{[^}]+\}&profile_type=\$\{[^}]+\}',
        '${this.API_BASE_URL}/api/chat/settings?user_id=${userId}',
        content
    )

    content = re.sub(
        r'/api/chat/settings\?profile_id=\$\{profileId\}&profile_type=\$\{profileType\}',
        '/api/chat/settings?user_id=${userId}',
        content
    )

    # Status update endpoint
    content = re.sub(
        r'/api/chat/users/status/update\?profile_id=\$\{[^}]+\}&profile_type=\$\{[^}]+\}&user_id=',
        '/api/chat/users/status/update?user_id=',
        content
    )

    # 7. Fix updateMyActiveStatus
    pattern = r'async updateMyActiveStatus\(\) \{[\s\S]*?if \(!this\.state\.currentProfile\) return;'
    replacement = '''async updateMyActiveStatus() {
        if (!this.state.currentUser) return;'''
    content = re.sub(pattern, replacement, content, count=1)

    # 8. Fix URLSearchParams builders
    content = re.sub(
        r'profile_id:\s*profile_id,\s*profile_type:\s*profile_type,\s*user_id:\s*user_id,',
        'user_id: user_id,',
        content
    )

    content = re.sub(
        r'profile_id:\s*userId,\s*profile_type:\s*profileType,\s*user_id:\s*userId,',
        'user_id: userId,',
        content
    )

    # 9. Fix pollLastSeenUpdates
    content = re.sub(
        r'const profileParams = this\.getProfileParams\(\);[\s\S]{0,50}if \(!profileParams\) return;',
        '''const userId = this.state.currentUser?.user_id;
            if (!userId) return;''',
        content
    )

    # 10. Fix pollNewMessages
    content = re.sub(
        r'const profileParams = this\.getProfileParams\(\);[\s\S]{0,50}if \(!profileParams\) \{',
        '''const userId = this.state.currentUser?.user_id;
            if (!userId) {''',
        content
    )

    # 11. Fix typing status polling
    content = re.sub(
        r'const profileParams = this\.getProfileParams\(\);[\s\S]{0,50}const response = await fetch\(\s*`\$\{this\.API_BASE_URL\}/api/chat/conversations/\$\{this\.state\.selectedChat\}/typing\?profile_id=\$\{profileParams\.profile_id\}&profile_type=\$\{profileParams\.profile_type\}',
        '''const userId = this.state.currentUser?.user_id;
            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/conversations/${this.state.selectedChat}/typing?user_id=${userId}''',
        content
    )

    # 12. Fix broadcastTypingStatus
    content = re.sub(
        r'const profileParams = this\.getProfileParams\(\);[\s\S]{0,100}if \(!profileParams\) return;[\s\S]{0,100}body: JSON\.stringify\(\{[\s\S]*?profile_id:[\s\S]*?profile_type:[\s\S]*?is_typing:',
        '''const userId = this.state.currentUser?.user_id;
            if (!userId) return;

            const response = await fetch(
                `${this.API_BASE_URL}/api/chat/conversations/${conversationId}/typing`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        is_typing:''',
        content
    )

    # 13. Fix message sending
    content = re.sub(
        r'sender_profile_id:\s*userId,\s*sender_profile_type:\s*profileType,\s*',
        '',
        content
    )

    # 14. Fix block/unblock
    content = re.sub(
        r'blocked_profile_id:\s*[^,]+,\s*blocked_profile_type:\s*[^,]+,\s*',
        '',
        content
    )

    # 15. Fix connection requests
    content = re.sub(
        r'from_profile_id:\s*userId,\s*from_profile_type:\s*profileType,\s*',
        '',
        content
    )

    # 16. Fix any remaining profile_id/profile_type pairs in API URLs
    content = re.sub(
        r'profile_id=\$\{[^}]+\}&profile_type=\$\{[^}]+\}(&user_id=\$\{[^}]+\})?',
        'user_id=${userId}',
        content
    )

    # 17. Clean up unused variable declarations
    content = re.sub(
        r'const profileType = this\.state\.currentProfile\?\.profile_type;\s*\n',
        '',
        content
    )

    content = re.sub(
        r'const profileId = this\.state\.currentProfile\?\.profile_id;\s*\n',
        '',
        content
    )

    # 18. Fix function signatures - remove profile parameters
    content = re.sub(
        r'checkRecipientAllowsCalls\(recipientProfileId, recipientProfileType\)',
        'checkRecipientAllowsCalls(recipientUserId)',
        content
    )

    content = re.sub(
        r'checkSenderAllowsForwarding\(senderProfileId, senderProfileType\)',
        'checkSenderAllowsForwarding(senderUserId)',
        content
    )

    content = re.sub(
        r'checkSenderBlocksScreenshots\(senderProfileId, senderProfileType\)',
        'checkSenderBlocksScreenshots(senderUserId)',
        content
    )

    content = re.sub(
        r'applyScreenshotProtection\(profileId, profileType\)',
        'applyScreenshotProtection(userId)',
        content
    )

    content = re.sub(
        r'sendConnectionRequestFromChat\(profileId, profileType, displayName\)',
        'sendConnectionRequestFromChat(userId, displayName)',
        content
    )

    content = re.sub(
        r'openChatWithOriginalSender\(profileId, profileType, name, avatar\)',
        'openChatWithOriginalSender(userId, name, avatar)',
        content
    )

    content = re.sub(
        r'removeMember\(profileId, profileType\)',
        'removeMember(userId)',
        content
    )

    # 19. Fix function calls - remove profile arguments
    content = re.sub(
        r'this\.checkRecipientAllowsCalls\([^,]+,\s*[^,]+,\s*([^)]+)\)',
        r'this.checkRecipientAllowsCalls(\1)',
        content
    )

    content = re.sub(
        r'this\.startDirectChat\([^,]+,\s*[^,]+,\s*([^)]+)\)',
        r'this.startDirectChat(\1)',
        content
    )

    # Count occurrences after
    profile_count_after = len(re.findall(r'this\.state\.currentProfile', content))
    profile_type_count_after = len(re.findall(r'profile_type', content))

    print(f"After: {profile_count_after} currentProfile references, {profile_type_count_after} profile_type references")
    print(f"Reduced currentProfile by: {profile_count - profile_count_after}")
    print(f"Reduced profile_type by: {profile_type_count - profile_type_count_after}")

    # Write back
    with open(input_file, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Final size: {len(content)} characters")
    print("Final cleanup complete!")

if __name__ == '__main__':
    final_cleanup()
