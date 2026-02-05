import re

def verify_refactoring():
    """Verify the chat modal refactoring is complete"""

    input_file = r'c:\Users\zenna\Downloads\Astegni\js\common-modals\chat-modal.js'

    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    print("=" * 70)
    print("CHAT MODAL REFACTORING VERIFICATION")
    print("=" * 70)
    print()

    # 1. Check state structure
    print("1. STATE STRUCTURE:")
    if 'currentUser: null,  // {user_id, name, avatar, email}' in content:
        print("   [PASS] currentUser properly defined")
    else:
        print("   [FAIL] currentUser not properly defined")

    if 'currentProfile: null,  // DEPRECATED' in content:
        print("   [PASS] currentProfile marked as deprecated")
    else:
        print("   [WARN] currentProfile not marked deprecated")
    print()

    # 2. Check key functions exist
    print("2. KEY FUNCTIONS:")
    functions = [
        'async fetchCurrentUser()',
        'updateCurrentUserDisplay()',
        'async loadConversations(',
        'async loadContacts(',
        'async startDirectChat(',
        'getProfileParams()'
    ]

    for func in functions:
        if func in content:
            print(f"   [PASS] {func} exists")
        else:
            print(f"   [FAIL] {func} missing")
    print()

    # 3. Check API patterns
    print("3. API ENDPOINTS:")

    # Good patterns (user_id only)
    good_patterns = [
        r'/api/chat/conversations\?user_id=',
        r'/api/chat/contacts\?user_id=',
        r'/api/chat/settings\?user_id='
    ]

    for pattern in good_patterns:
        count = len(re.findall(pattern, content))
        print(f"   [INFO] Found {count} instances of user_id-only endpoint")

    # Bad patterns (should be minimal)
    bad_patterns = [
        (r'profile_id=\$\{[^}]+\}&profile_type=\$\{[^}]+\}', 'profile_id+profile_type in URL'),
        (r'const \{ profile_id, profile_type, user_id \}', 'profile destructuring'),
    ]

    for pattern, desc in bad_patterns:
        count = len(re.findall(pattern, content))
        if count > 5:
            print(f"   [WARN] Found {count} instances of {desc}")
        else:
            print(f"   [PASS] Only {count} instances of {desc}")
    print()

    # 4. Check references
    print("4. REFERENCE COUNTS:")

    counts = {
        'this.state.currentProfile': len(re.findall(r'this\.state\.currentProfile', content)),
        'this.state.currentUser': len(re.findall(r'this\.state\.currentUser', content)),
        'profile_type': len(re.findall(r'profile_type', content)),
        'profile_id': len(re.findall(r'profile_id', content)),
        'user_id': len(re.findall(r'user_id', content)),
    }

    for key, count in counts.items():
        print(f"   {key}: {count}")

    # Validation
    if counts['this.state.currentProfile'] < 10:
        print("   [PASS] currentProfile references minimized")
    else:
        print(f"   [WARN] Still {counts['this.state.currentProfile']} currentProfile references")

    if counts['this.state.currentUser'] > 50:
        print("   [PASS] currentUser widely used")
    else:
        print("   [WARN] currentUser not widely adopted")
    print()

    # 5. Check function signatures
    print("5. FUNCTION SIGNATURES:")

    old_signatures = [
        r'async startDirectChat\(recipientProfileId, recipientProfileType',
        r'checkRecipientAllowsEveryone\(recipientProfileId, recipientProfileType',
        r'checkRecipientAllowsCalls\(recipientProfileId, recipientProfileType',
    ]

    for sig in old_signatures:
        if re.search(sig, content):
            print(f"   [FAIL] Old signature found: {sig}")
        else:
            print(f"   [PASS] Old signature removed: {sig}")
    print()

    # 6. Check conversation creation
    print("6. CONVERSATION CREATION:")
    if 'participant_user_ids: [recipientUserId]' in content:
        print("   [PASS] Correct conversation creation format")
    else:
        print("   [WARN] May still use old format")

    if 'participants: [' in content and 'profile_id:' in content:
        print("   [WARN] Old participants format may still exist")
    else:
        print("   [PASS] Old participants format removed")
    print()

    # 7. File size check
    print("7. FILE METRICS:")
    lines = content.count('\n')
    size_kb = len(content) / 1024
    print(f"   Lines: {lines}")
    print(f"   Size: {size_kb:.1f} KB")

    if lines < 16400:
        print("   [PASS] Line count reduced")
    else:
        print("   [WARN] Line count not reduced")
    print()

    # 8. Critical checks
    print("8. CRITICAL CHECKS:")

    critical = [
        ('async loadCurrentUser()', 'loadCurrentUser simplified'),
        ('this.state.currentUser.user_id', 'currentUser.user_id used'),
        ('getChatSettingsKey()', 'getChatSettingsKey exists'),
        ('updateCurrentUserDisplay()', 'updateCurrentUserDisplay exists'),
    ]

    for check, desc in critical:
        if check in content:
            print(f"   [PASS] {desc}")
        else:
            print(f"   [FAIL] {desc}")
    print()

    # 9. Summary
    print("=" * 70)
    print("SUMMARY:")
    print("=" * 70)

    # Calculate score
    score = 0
    total = 10

    if 'currentUser: null,  // {user_id, name, avatar, email}' in content:
        score += 1
    if counts['this.state.currentProfile'] < 10:
        score += 1
    if counts['this.state.currentUser'] > 50:
        score += 1
    if 'participant_user_ids: [recipientUserId]' in content:
        score += 1
    if lines < 16400:
        score += 1
    if 'async loadCurrentUser()' in content:
        score += 1
    if 'updateCurrentUserDisplay()' in content:
        score += 1
    if len(re.findall(r'/api/chat/conversations\?user_id=', content)) > 0:
        score += 1
    if len(re.findall(r'const \{ profile_id, profile_type, user_id \}', content)) < 5:
        score += 1
    if 'getChatSettingsKey()' in content:
        score += 1

    percentage = (score / total) * 100
    print(f"Score: {score}/{total} ({percentage:.0f}%)")
    print()

    if percentage >= 90:
        print("STATUS: ✓ EXCELLENT - Refactoring is complete and correct")
    elif percentage >= 75:
        print("STATUS: ✓ GOOD - Minor issues, but refactoring is successful")
    elif percentage >= 60:
        print("STATUS: ! WARNING - Some issues need attention")
    else:
        print("STATUS: ✗ FAIL - Major issues, refactoring incomplete")
    print()

    print("=" * 70)
    print("Verification complete!")
    print("=" * 70)

if __name__ == '__main__':
    verify_refactoring()
