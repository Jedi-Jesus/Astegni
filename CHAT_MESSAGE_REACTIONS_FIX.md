# Chat Message Reactions Fix

## Issue Fixed

**Error**: `column mr.reactor_user_id does not exist`

**Root Cause**:
1. Table name was `message_reactions` instead of `chat_message_reactions` (following chat table naming convention)
2. Column name was `reactor_user_id` instead of `user_id` (following user-based architecture)

## Changes Applied

### File: `astegni-backend/chat_endpoints.py`

#### 1. Fixed Table Name (All References)
```sql
-- BEFORE:
FROM message_reactions mr
INSERT INTO message_reactions
DELETE FROM message_reactions

-- AFTER:
FROM chat_message_reactions mr
INSERT INTO chat_message_reactions
DELETE FROM chat_message_reactions
```

#### 2. Fixed Column Name (All References)
```sql
-- BEFORE:
SELECT mr.reaction, mr.reactor_user_id, mr.created_at
INSERT INTO chat_message_reactions (message_id, reactor_user_id, reaction, created_at)
ON CONFLICT (message_id, reactor_user_id)
AND reactor_user_id = %s

-- AFTER:
SELECT mr.reaction, mr.user_id, mr.created_at
INSERT INTO chat_message_reactions (message_id, user_id, reaction, created_at)
ON CONFLICT (message_id, user_id)
AND user_id = %s
```

#### 3. Fixed Python Dictionary Keys
```python
# BEFORE:
reactor_info = get_user_display_info(conn, reaction['reactor_user_id'])
"user_id": reaction['reactor_user_id']

# AFTER:
reactor_info = get_user_display_info(conn, reaction['user_id'])
"user_id": reaction['user_id']
```

## Affected Endpoints
- `GET /api/chat/messages/{conversation_id}` - Loads message reactions
- `POST /api/chat/messages/{message_id}/react` - Add/update reaction
- `DELETE /api/chat/messages/{message_id}/react` - Remove reaction

## Current Chat System Status

### ✅ Working
- WebSocket connection (`/ws/{user_id}`)
- Status updates (200 OK)
- Conversations loading (8 conversations)
- Blocked contacts
- Typing indicators

### ⚠️ Fixed (Needs Restart)
- Message reactions (table and column names corrected)

### ⚠️ Non-Critical Issues
- `chat_two_step_verification` table missing (optional feature)
- Polls endpoint 422 error (optional feature)

---

## Restart Instructions

### 1. Stop Backend
```
Ctrl+C in backend terminal
```

### 2. Restart Backend
```bash
cd astegni-backend
python app.py
```

### 3. Test Chat Messages
1. Open chat modal
2. Select a conversation
3. Messages should now load successfully with reactions

## Expected Results

### Before Fix
```
[Chat API] Error fetching messages for conversation 37: column mr.reactor_user_id does not exist
INFO:     127.0.0.1:60366 - "GET /api/chat/messages/37?user_id=1 HTTP/1.1" 500 Internal Server Error
```

### After Fix
```
INFO:     127.0.0.1:60366 - "GET /api/chat/messages/37?user_id=1 HTTP/1.1" 200 OK
```

---

## Summary

This completes the chat system migration to user-based architecture. All message-related endpoints should now work correctly:

✅ Conversations loading
✅ Status updates
✅ WebSocket connections
✅ Message loading with reactions
✅ Blocked contacts
✅ Typing indicators

**Action Required**: Restart backend to apply message reactions fix

---

**Date**: 2026-02-03
**Migration**: Chat System 2.0 (User-Based) - Message Reactions Fix
