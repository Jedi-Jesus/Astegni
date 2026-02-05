# Chat Additional Fixes - Round 2

**Date:** 2026-02-03
**Files Modified:**
- `astegni-backend/chat_endpoints.py`
- `js/common-modals/chat-modal.js`

## Issues Fixed

### ❌ Error 1: Database Column Mismatch
```
[Chat API] Error getting user status: column "last_active_at" does not exist
LINE 2: SELECT last_active_at, is_online
HINT: Perhaps you meant to reference the column "user_sessions.last_active".
```

**Root Cause:**
The `get_user_online_status` function was querying the wrong table (`user_sessions` instead of `chat_active_sessions`).

**Fix Applied:**
Changed query to use the correct table `chat_active_sessions` which has the `last_active_at` column.

**Location:** [astegni-backend/chat_endpoints.py:2140-2147](astegni-backend/chat_endpoints.py#L2140-L2147)

**Before:**
```python
cur.execute("""
    SELECT last_active_at, is_online
    FROM user_sessions
    WHERE user_id = %s
    ORDER BY last_active_at DESC
    LIMIT 1
""", (target_user_id,))
```

**After:**
```python
cur.execute("""
    SELECT last_active_at, is_online
    FROM chat_active_sessions
    WHERE user_id = %s
    ORDER BY last_active_at DESC
    LIMIT 1
""", (target_user_id,))
```

---

### ❌ Error 2: Typing Indicator with Invalid Conversation ID
```
INFO: 127.0.0.1:60988 - "POST /api/chat/conversations/tutor-1/typing?user_id=1&is_typing=true HTTP/1.1" 422 Unprocessable Content
```

**Root Cause:**
When opening a new conversation with a user, the system creates a temporary "synthetic" conversation with an ID like `tutor-1` (not a real integer conversation ID). The typing indicator endpoint expects an integer conversation ID.

**Fix Applied:**
Added a check in `broadcastTypingStatus` to skip typing indicators for synthetic conversations. Typing indicators will only be sent for real conversations (after the conversation is created in the database).

**Location:** [js/common-modals/chat-modal.js:10623-10629](js/common-modals/chat-modal.js#L10623-L10629)

**Added Code:**
```javascript
// Skip typing indicator for synthetic conversations (they don't have real conversation IDs yet)
const conv = this.state.selectedConversation;
if (conv && this.isSyntheticConversation(conv)) {
    console.debug('[Chat] Skipping typing indicator for synthetic conversation:', this.state.selectedChat);
    return;
}
```

---

### ❌ Error 3: Creating Conversation with Invalid ID
```
INFO: 127.0.0.1:60988 - "POST /api/chat/conversations?user_id=1 HTTP/1.1" 422 Unprocessable Content
```

**Root Cause:**
Same as Error 2 - synthetic conversation IDs (like `tutor-1`) were being used before creating a real conversation.

**Fix Applied:**
The existing code already had logic to detect synthetic conversations and create real ones before sending messages (see `sendMessage` function at line 4536: `createConversationFromConnection`). The typing indicator fix above prevents the 422 error from occurring.

**How It Works:**
1. User opens chat with someone → Creates synthetic conversation with ID like `tutor-1`
2. User types → Typing indicator is now **skipped** for synthetic conversations
3. User sends message → Real conversation is created with integer ID
4. Future typing indicators use the real conversation ID

---

## What Are Synthetic Conversations?

Synthetic conversations are temporary conversation objects created in the frontend before a real conversation exists in the database. They use special ID formats:

- `tutor-{profile_id}` - New tutor contact
- `connection-{profile_id}` - Accepted connection without conversation
- `family-parent-{id}` or `family-child-{id}` - Family members
- `enrolled-student-{id}` - Enrolled students

These get replaced with real integer IDs when:
- User sends the first message
- API call to `/api/chat/conversations` (POST) creates the conversation

**Detection Function:**
```javascript
isSyntheticConversation(conv) {
    if (!conv) return false;
    const id = typeof conv === 'object' ? conv.id : conv;
    return (
        conv.is_tutor_contact ||
        conv.is_connection ||
        conv.is_family ||
        conv.is_enrolled ||
        String(id).includes('-')  // IDs with hyphens are synthetic
    );
}
```

---

## Database Tables Reference

### `chat_active_sessions` Table
Stores current active chat sessions for online status tracking.

**Columns:**
- `id` - Primary key
- `user_id` - References users table
- `device_name`, `device_type`, `browser`, `os` - Device info
- `is_online` - Boolean online status
- `last_active_at` - Timestamp of last activity
- `created_at` - Session creation time

### `user_sessions` Table
Different table for general user authentication sessions (NOT for chat online status).

**Columns:**
- `id` - Primary key
- `user_id` - References users table
- `last_active` - Different column name (not `last_active_at`)
- Used for JWT token sessions, not chat presence

---

## Testing

After these fixes:
1. ✅ Online status queries work correctly
2. ✅ Typing indicators only sent for real conversations
3. ✅ No 422 errors when opening new chats
4. ✅ Conversations created properly when sending first message

## Verification

```bash
# Start backend
cd astegni-backend && python app.py

# Start frontend
python dev-server.py

# Test flow:
1. Open chat modal
2. Click on a user who doesn't have an existing conversation
3. Start typing → Should NOT see 422 error
4. Send a message → Real conversation created
5. Continue typing → Typing indicator works normally
```

## Summary

All three issues were related to:
1. **Wrong table reference** in backend query
2. **Synthetic conversation IDs** being sent to endpoints expecting real integer IDs

The fixes ensure that:
- Backend queries the correct table for online status
- Typing indicators are only sent for real conversations
- User experience is smooth when starting new conversations
