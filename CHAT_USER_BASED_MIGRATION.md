# Chat System: Role-Based to User-Based Migration

## Overview

This migration transforms the Astegni chat system from **role-based** to **user-based** architecture, allowing users to chat regardless of their active role (student, tutor, parent, advertiser).

## Why This Migration?

### Before (Role-Based)
- Users could only chat as a specific role (e.g., "student profile", "tutor profile")
- Switching roles meant losing chat context
- Required `profile_id` + `profile_type` for all operations
- Chat history was fragmented across roles

### After (User-Based)
- Users chat as themselves, regardless of role
- Single unified chat identity per user
- Chat history persists across role switches
- Only requires `user_id` for all operations
- **Backward compatible** with existing profile-based data

## Migration Components

### 1. Database Migration
**File**: `astegni-backend/migrate_chat_to_user_based.py`

**What it does:**
- Makes `profile_id` and `profile_type` nullable across all chat tables
- Adds `user_id` columns where needed
- Populates `user_id` from existing profile data
- Creates indexes for performance
- Ensures backward compatibility

**Tables Modified:**
- `conversations` - Added `created_by_user_id`
- `conversation_participants` - Made profile fields nullable, indexed `user_id`
- `chat_messages` - Made sender profile fields nullable, indexed `sender_user_id`
- `call_logs` - Made caller profile fields nullable
- `chat_settings` - Migrated to user-based (one setting per user)
- `blocked_chat_contacts` - Added `blocker_user_id` and `blocked_user_id`
- `message_reactions` - Ensured user-based structure

### 2. Backend Helper Functions
**File**: `astegni-backend/chat_user_based_helpers.py`

**New user-based functions:**
- `get_user_display_info(conn, user_id)` - Get user name/avatar
- `get_user_privacy_settings(conn, user_id)` - Get privacy settings
- `are_users_connected(conn, user1_id, user2_id)` - Check if connected
- `is_user_blocked(conn, blocker_user_id, blocked_user_id)` - Check block status
- `check_can_message(conn, sender_user_id, recipient_user_id)` - Verify permissions
- `check_can_call(conn, caller_user_id, recipient_user_id)` - Verify call permissions
- `get_user_contacts(conn, user_id)` - Get all contacts
- `get_or_create_direct_conversation(conn, user1_id, user2_id)` - Conversation management

### 3. Backend Endpoint Updates

**Key Changes:**

#### Authentication
```python
# OLD: Required profile_id + profile_type from JWT
profile_id = current_user.get("profile_id")
profile_type = current_user.get("profile_type")

# NEW: Only requires user_id from JWT
user_id = current_user.get("user_id")
```

#### Starting Conversations
```python
# OLD: POST /api/chat/conversations
{
    "participants": [
        {"profile_id": 123, "profile_type": "student", "user_id": 45},
        {"profile_id": 456, "profile_type": "tutor", "user_id": 67}
    ]
}

# NEW: POST /api/chat/conversations
{
    "participant_user_ids": [45, 67]
}
```

#### Sending Messages
```python
# OLD: Message stored with sender_profile_id + sender_profile_type
# NEW: Message stored with sender_user_id only (profile fields nullable)
```

### 4. Frontend Updates

**File**: `js/common-modals/chat-modal.js`

**Key Changes:**

#### State Management
```javascript
// OLD
state: {
    currentProfile: {
        profile_id: 123,
        profile_type: 'student',
        user_id: 45
    }
}

// NEW
state: {
    currentUser: {
        user_id: 45,
        name: 'John Doe',
        avatar: 'https://...'
    }
}
```

#### Loading Current User
```javascript
// OLD
async loadCurrentUser() {
    const user = await this.fetchCurrentUser();
    const activeRole = localStorage.getItem('active_role');
    this.state.currentProfile = {
        profile_id: user[`${activeRole}_profile_id`],
        profile_type: activeRole,
        user_id: user.id
    };
}

// NEW
async loadCurrentUser() {
    const user = await this.fetchCurrentUser();
    this.state.currentUser = {
        user_id: user.id,
        name: `${user.first_name} ${user.father_name || user.last_name}`,
        avatar: user.profile_picture
    };
}
```

#### API Calls
```javascript
// OLD
fetch(`${API_BASE_URL}/api/chat/conversations`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        participants: [
            {
                profile_id: currentProfile.profile_id,
                profile_type: currentProfile.profile_type,
                user_id: currentProfile.user_id
            },
            {
                profile_id: recipientProfileId,
                profile_type: recipientProfileType,
                user_id: recipientUserId
            }
        ]
    })
})

// NEW
fetch(`${API_BASE_URL}/api/chat/conversations`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        participant_user_ids: [currentUser.user_id, recipientUserId]
    })
})
```

## Migration Steps

### Step 1: Backup Database
```bash
cd /var/www/astegni/astegni-backend  # Production
# OR
cd c:\Users\zenna\Downloads\Astegni\astegni-backend  # Local

pg_dump astegni_user_db > backup_before_chat_migration_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run Database Migration
```bash
python migrate_chat_to_user_based.py
```

Expected output:
```
[HH:MM:SS] Starting chat system migration to user-based...
[HH:MM:SS] Step 1: Making conversations user-based...
[HH:MM:SS]   ✓ Made created_by_profile_id and created_by_profile_type nullable
[HH:MM:SS]   ✓ Added created_by_user_id column
[HH:MM:SS]   ✓ Updated X conversations with created_by_user_id
...
[HH:MM:SS] MIGRATION COMPLETED SUCCESSFULLY!
```

### Step 3: Update Backend Endpoints

The existing `chat_endpoints.py` will continue to work (backward compatible), but you should gradually migrate to user-based endpoints:

**Option A: Gradual Migration**
- Import helpers from `chat_user_based_helpers.py`
- Add new user-based endpoints alongside old ones
- Deprecate old endpoints over time

**Option B: Full Replacement**
- Update existing endpoints to use user-based helpers
- Remove profile-based logic
- Test thoroughly

### Step 4: Update Frontend

Update `js/common-modals/chat-modal.js`:

1. **Remove role dependency:**
```javascript
// Remove these lines
const activeRole = localStorage.getItem('active_role');
const profileId = user[`${activeRole}_profile_id`];
const profileType = activeRole;
```

2. **Use user_id directly:**
```javascript
// Add this instead
const userId = user.id;
```

3. **Update all API calls** to use `user_id` instead of `profile_id + profile_type`

### Step 5: Test

**Test Checklist:**
- [ ] Create new direct conversation
- [ ] Send text message
- [ ] Send media (image, video, audio)
- [ ] React to message
- [ ] Reply to message
- [ ] Forward message
- [ ] Delete message
- [ ] Edit message
- [ ] Pin message
- [ ] Create group chat
- [ ] Add participants to group
- [ ] Remove participant from group
- [ ] Block user
- [ ] Unblock user
- [ ] Update privacy settings
- [ ] Make voice call
- [ ] Make video call
- [ ] Search messages
- [ ] View conversation history
- [ ] Mark messages as read
- [ ] Archive conversation
- [ ] Mute conversation

### Step 6: Deploy

**Local:**
```bash
# Start backend
cd astegni-backend
python app.py

# Start frontend (new terminal)
cd ..
python dev-server.py
```

**Production:**
```bash
# SSH to server
ssh root@128.140.122.215

# Navigate to project
cd /var/www/astegni

# Pull latest changes
git pull origin main

# Run migration
cd astegni-backend
source venv/bin/activate
python migrate_chat_to_user_based.py

# Restart backend
systemctl restart astegni-backend

# Verify
journalctl -u astegni-backend -f
curl https://api.astegni.com/health
```

## Backward Compatibility

The migration is **fully backward compatible**:

### Database Level
- All profile fields (`profile_id`, `profile_type`) are **nullable**, not deleted
- Existing data is preserved
- Both user-based and profile-based queries work

### API Level
- Old endpoints continue to work with profile-based parameters
- New endpoints work with user-based parameters
- Gradual migration is possible

### Frontend Level
- Old chat modal can continue using profile-based approach
- New chat modal uses user-based approach
- Both can coexist during migration

## Benefits After Migration

1. **Unified Identity**: Users have one chat identity, not multiple per role
2. **Persistent History**: Chat history survives role switches
3. **Simpler Code**: No need to track `profile_id + profile_type`
4. **Better UX**: Users don't lose conversations when switching roles
5. **Future-Proof**: Ready for role-free features (e.g., general messaging)

## Rollback Plan

If issues occur:

### Database Rollback
```bash
# Restore from backup
psql astegni_user_db < backup_before_chat_migration_YYYYMMDD_HHMMSS.sql
```

### Code Rollback
```bash
# Revert backend changes
git revert <commit-hash>

# Revert frontend changes
git revert <commit-hash>

# Restart
systemctl restart astegni-backend
```

## API Examples

### Get Conversations (User-Based)
```
GET /api/chat/conversations?user_id={user_id}
Authorization: Bearer {token}

Response:
[
    {
        "id": 1,
        "type": "direct",
        "other_user": {
            "user_id": 67,
            "name": "Jane Smith",
            "avatar": "https://...",
            "online": true
        },
        "last_message": {
            "content": "Hello!",
            "created_at": "2024-01-15T10:30:00Z"
        },
        "unread_count": 3
    }
]
```

### Send Message (User-Based)
```
POST /api/chat/conversations/{conversation_id}/messages
Authorization: Bearer {token}
Content-Type: application/json

{
    "content": "Hello!",
    "message_type": "text"
}

Response:
{
    "id": 123,
    "conversation_id": 1,
    "sender_user_id": 45,
    "sender_name": "John Doe",
    "sender_avatar": "https://...",
    "content": "Hello!",
    "message_type": "text",
    "created_at": "2024-01-15T10:31:00Z"
}
```

### Block User (User-Based)
```
POST /api/chat/block
Authorization: Bearer {token}
Content-Type: application/json

{
    "blocked_user_id": 67,
    "reason": "Spam"
}

Response:
{
    "success": true,
    "message": "User blocked successfully"
}
```

## Support

For questions or issues:
1. Check this document
2. Review `chat_user_based_helpers.py` for implementation details
3. Test locally first with `dev-server.py`
4. Create GitHub issue if problems persist

---

**Last Updated**: 2026-02-01
**Version**: 2.1.0
**Status**: Ready for implementation
