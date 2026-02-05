#!/bin/bash
# Fix all remaining syntax errors in chat-modal.js

cd "c:\Users\zenna\Downloads\Astegni"

# Fix all incomplete comment patterns systematically
sed -i 's/caller_profile_type: null \/\/ profile_type removed,$/caller_user_id: this.state.currentUser?.user_id,/g' "js/common-modals/chat-modal.js"
sed -i 's/from_profile_type: this\.state\.\/\/ profile_type removed/\/\/ from_profile_type removed/g' "js/common-modals/chat-modal.js"
sed -i 's/caller_profile_type: this\.state\.\/\/ profile_type removed/\/\/ caller_profile_type removed/g' "js/common-modals/chat-modal.js"

# Fix incomplete statements
sed -i 's/, \/\/ profile_type removed$/\/\/ profile_type removed/g' "js/common-modals/chat-modal.js"

echo "Syntax fixes applied. Run: node -c js/common-modals/chat-modal.js"
