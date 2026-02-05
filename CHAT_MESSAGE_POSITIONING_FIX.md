# Chat Message Positioning Fix

## Issue
Sender's messages were appearing on the left side instead of the right side in the chat interface.

## Root Cause
The frontend relies on the `is_mine` property from the backend to determine message positioning:
- `sent: true` or `is_mine: true` → Message appears on the RIGHT (sent messages)
- `sent: false` or `is_mine: false` → Message appears on the LEFT (received messages)

The backend was **NOT** returning the `is_mine` field in the message objects, causing all messages to default to the left side.

## Solution

### Backend Fix: [chat_endpoints.py:864-866](astegni-backend/chat_endpoints.py#L864-L866)

Added the `is_mine` flag to each message in the `get_messages` endpoint:

```python
# Add is_mine flag to indicate if current user sent this message
msg_dict['is_mine'] = msg_dict.get('sender_user_id') == user_id
```

This compares the message's `sender_user_id` with the requesting `user_id` to determine ownership.

### How It Works

**Frontend (chat-modal.js:3341)**
```javascript
sent: msg.is_mine,  // Sets message position based on is_mine from backend
```

**Frontend (chat-modal.js:3842)**
```javascript
div.className = `message ${msg.sent ? 'sent' : 'received'}`;
// 'sent' class → right side (your messages)
// 'received' class → left side (other user's messages)
```

## Testing

1. **Restart the backend**:
   ```bash
   cd astegni-backend
   python app.py
   ```

2. **Test in chat**:
   - Open the chat modal
   - Send a message
   - **Expected**: Your message appears on the RIGHT with purple/blue bubble
   - **Expected**: Other user's messages appear on the LEFT with gray bubble

3. **Verify existing messages**:
   - Open any existing conversation
   - **Expected**: Your past messages are on the RIGHT
   - **Expected**: Other user's past messages are on the LEFT

## Related Files

- **Backend**: `astegni-backend/chat_endpoints.py` (line 866)
- **Frontend**: `js/common-modals/chat-modal.js` (lines 3341, 3842, 4565)
- **CSS**: Message positioning is controlled by `.message.sent` and `.message.received` classes

## Additional Fixes Applied

1. **Typing Indicator Fix** (chat_endpoints.py:2047): Added `embed=True` to fix 422 error
