import re

def fix_remaining_refs():
    """Fix remaining currentProfile references"""

    input_file = r'c:\Users\zenna\Downloads\Astegni\js\common-modals\chat-modal.js'

    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    print("Fixing remaining profile references...")

    # 1. Fix console.log statements - just update messages
    content = re.sub(
        r'console\.log\(\'Chat: After loadCurrentUser - currentProfile:\', this\.state\.currentProfile\);',
        "console.log('Chat: After loadCurrentUser - currentUser:', this.state.currentUser);",
        content
    )

    content = re.sub(
        r'console\.log\(\'Chat: After loadCurrentUser, currentProfile:\', this\.state\.currentProfile\);',
        "console.log('Chat: After loadCurrentUser, currentUser:', this.state.currentUser);",
        content
    )

    content = re.sub(
        r'console\.log\(\'Chat: API Request - currentProfile:\', this\.state\.currentProfile\);',
        "console.log('Chat: API Request - currentUser:', this.state.currentUser);",
        content
    )

    content = re.sub(
        r'console\.log\(\'Chat: currentProfile:\', this\.state\.currentProfile\);',
        "console.log('Chat: currentUser:', this.state.currentUser);",
        content
    )

    # 2. Fix destructuring patterns that remain
    content = re.sub(
        r'const \{ profile_id, profile_type \} = this\.state\.currentProfile;',
        'const userId = this.state.currentUser?.user_id;',
        content
    )

    # 3. Fix variable declarations using currentProfile
    content = re.sub(
        r'const profile = this\.state\.currentProfile;',
        'const userId = this.state.currentUser?.user_id;',
        content
    )

    content = re.sub(
        r'const currentProfile = this\.state\.currentProfile;',
        'const userId = this.state.currentUser?.user_id;',
        content
    )

    # 4. Fix conditional checks
    content = re.sub(
        r'if \(!token \|\| !this\.state\.currentProfile\)',
        'if (!token || !this.state.currentUser)',
        content
    )

    content = re.sub(
        r'if \(!this\.state\.selectedChat \|\| !this\.state\.currentProfile\)',
        'if (!this.state.selectedChat || !this.state.currentUser)',
        content
    )

    # 5. Fix message ownership check (isMine)
    old_is_mine = r'const isMine = message\.sender_profile_id === this\.state\.currentProfile\?\.profile_id &&\s*message\.sender_profile_type === this\.state\.currentProfile\?\.profile_type;'
    new_is_mine = 'const isMine = message.sender_user_id === this.state.currentUser?.user_id;'
    content = re.sub(old_is_mine, new_is_mine, content)

    # 6. Fix gender reference
    content = re.sub(
        r'senderGender = this\.state\.currentUser\?\.gender \|\| this\.state\.currentProfile\?\.gender \|\| \'male\';',
        "senderGender = this.state.currentUser?.gender || 'male';",
        content
    )

    # 7. Fix any profile.profile_id or profile.profile_type usage after variable declaration
    # This needs to be context-aware, so we'll do pattern matching
    content = re.sub(
        r'profile\.profile_id',
        'userId',
        content
    )

    content = re.sub(
        r'profile\.profile_type',
        '/* profile_type not needed */',
        content
    )

    content = re.sub(
        r'currentProfile\.profile_id',
        'userId',
        content
    )

    content = re.sub(
        r'currentProfile\.profile_type',
        '/* profile_type not needed */',
        content
    )

    # 8. Fix any remaining uses in API URLs
    content = re.sub(
        r'\$\{profile_id\}&profile_type=\$\{profile_type\}',
        '${userId}',
        content
    )

    content = re.sub(
        r'profile_id=\$\{profile\.profile_id\}&profile_type=\$\{profile\.profile_type\}',
        'user_id=${userId}',
        content
    )

    # 9. Fix settings save calls
    content = re.sub(
        r'user_id:\s*userId,\s*profile_id:\s*profile_id,\s*profile_type:\s*profile_type,',
        'user_id: userId,',
        content
    )

    # 10. Fix URLSearchParams that still have profile params
    content = re.sub(
        r'const params = new URLSearchParams\(\{[\s\S]*?profile_id:\s*profile_id,[\s\S]*?profile_type:\s*profile_type,[\s\S]*?user_id:\s*user_id,',
        '''const params = new URLSearchParams({
                user_id: user_id,''',
        content
    )

    # Count remaining
    profile_count = len(re.findall(r'this\.state\.currentProfile', content))
    print(f"Remaining currentProfile references: {profile_count}")

    # Write back
    with open(input_file, 'w', encoding='utf-8') as f:
        f.write(content)

    print("Remaining references fixed!")
    print(f"Final file size: {len(content)} characters")

if __name__ == '__main__':
    fix_remaining_refs()
