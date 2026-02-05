import re
import sys

def refactor_chat_modal(input_file, output_file):
    """Refactor chat-modal.js from role-based to user-based architecture"""

    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    print(f"Original file size: {len(content)} characters")

    # 1. Update state structure - remove currentProfile comment
    content = re.sub(
        r'currentUser: null,\s*currentProfile: null,\s*// \{profile_id, profile_type, user_id\}',
        'currentUser: null,  // {user_id, name, avatar, email}\n        currentProfile: null,  // DEPRECATED - kept for backward compatibility only',
        content
    )

    # 2. Replace all instances of profile parameter patterns in API URLs

    # conversations endpoint
    content = re.sub(
        r'profile_id=\$\{profileId\}&profile_type=\$\{profileType\}&user_id=\$\{userId\}',
        'user_id=${userId}',
        content
    )

    content = re.sub(
        r'profile_id=\$\{profile_id\}&profile_type=\$\{profile_type\}&user_id=\$\{user_id\}',
        'user_id=${user_id}',
        content
    )

    content = re.sub(
        r'profile_id=\$\{this\.state\.currentProfile\?\.profile_id\}&profile_type=\$\{this\.state\.currentProfile\?\.profile_type\}',
        'user_id=${this.state.currentUser?.user_id}',
        content
    )

    # settings endpoint
    content = re.sub(
        r'/api/chat/settings\?profile_id=\$\{profileId\}&profile_type=\$\{profileType\}',
        '/api/chat/settings?user_id=${userId}',
        content
    )

    # 3. Update variable declarations that destructure currentProfile
    content = re.sub(
        r'const \{ profile_id, profile_type, user_id \} = this\.state\.currentProfile;',
        'const userId = this.state.currentUser?.user_id;',
        content
    )

    content = re.sub(
        r'const profileId = this\.state\.currentProfile\?\.profile_id;\s*const profileType = this\.state\.currentProfile\?\.profile_type;\s*const userId = this\.state\.currentProfile\?\.user_id;',
        'const userId = this.state.currentUser?.user_id;',
        content
    )

    # 4. Update conditional checks for currentProfile
    content = re.sub(
        r'if \(!this\.state\.currentProfile\)',
        'if (!this.state.currentUser)',
        content
    )

    # 5. Update references in getProfileParams
    content = re.sub(
        r'profile_id:\s*profileId,\s*profile_type:\s*profileType,\s*user_id:\s*userId',
        'user_id: userId',
        content
    )

    # 6. Update function signatures - remove profileType and profileId parameters
    # startDirectChat
    content = re.sub(
        r'async startDirectChat\(recipientProfileId, recipientProfileType, recipientUserId',
        'async startDirectChat(recipientUserId',
        content
    )

    # checkRecipientAllowsEveryone
    content = re.sub(
        r'async checkRecipientAllowsEveryone\(recipientProfileId, recipientProfileType\)',
        'async checkRecipientAllowsEveryone(recipientUserId)',
        content
    )

    # checkRecipientAllowsCalls
    content = re.sub(
        r'async checkRecipientAllowsCalls\(recipientProfileId, recipientProfileType\)',
        'async checkRecipientAllowsCalls(recipientUserId)',
        content
    )

    # checkSenderAllowsForwarding
    content = re.sub(
        r'async checkSenderAllowsForwarding\(senderProfileId, senderProfileType\)',
        'async checkSenderAllowsForwarding(senderUserId)',
        content
    )

    # checkSenderBlocksScreenshots
    content = re.sub(
        r'async checkSenderBlocksScreenshots\(senderProfileId, senderProfileType\)',
        'async checkSenderBlocksScreenshots(senderUserId)',
        content
    )

    # applyScreenshotProtection
    content = re.sub(
        r'async applyScreenshotProtection\(profileId, profileType\)',
        'async applyScreenshotProtection(userId)',
        content
    )

    # sendConnectionRequestFromChat
    content = re.sub(
        r'async sendConnectionRequestFromChat\(profileId, profileType, displayName\)',
        'async sendConnectionRequestFromChat(userId, displayName)',
        content
    )

    # openChatWithOriginalSender
    content = re.sub(
        r'async openChatWithOriginalSender\(profileId, profileType, name, avatar\)',
        'async openChatWithOriginalSender(userId, name, avatar)',
        content
    )

    # removeMember
    content = re.sub(
        r'async removeMember\(profileId, profileType\)',
        'async removeMember(userId)',
        content
    )

    # 7. Update conversation creation body
    content = re.sub(
        r'participants: \[\s*\{\s*profile_id:\s*profile_id,\s*profile_type:\s*profile_type,\s*user_id:\s*user_id\s*\},\s*\{\s*profile_id:\s*recipientProfileId,\s*profile_type:\s*recipientProfileType,\s*user_id:\s*recipientUserId\s*\}\s*\]',
        'participant_user_ids: [recipientUserId]',
        content
    )

    # 8. Update status update call
    content = re.sub(
        r'profile_id:\s*profile_id,\s*profile_type:\s*profile_type,\s*user_id:\s*user_id,',
        'user_id: userId,',
        content
    )

    # 9. Update blockUser body
    content = re.sub(
        r'blocked_profile_id:\s*[^,]+,\s*blocked_profile_type:\s*[^,]+,\s*blocked_user_id:',
        'blocked_user_id:',
        content
    )

    # 10. Update global function calls
    content = re.sub(
        r'openChatModal\(recipientProfileId, recipientProfileType, recipientUserId',
        'openChatModal(recipientUserId',
        content
    )

    print(f"Refactored file size: {len(content)} characters")
    print("Basic find-replace changes applied")

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\nRefactored file written to: {output_file}")

if __name__ == '__main__':
    input_file = r'c:\Users\zenna\Downloads\Astegni\js\common-modals\chat-modal-role-based-backup.js'
    output_file = r'c:\Users\zenna\Downloads\Astegni\js\common-modals\chat-modal.js'
    refactor_chat_modal(input_file, output_file)
