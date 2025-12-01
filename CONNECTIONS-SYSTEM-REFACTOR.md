# Universal Connections System - Complete Refactor Guide

## Overview

The Astegni platform has been refactored from a tutor-specific `tutor_connections` table to a universal `connections` table that supports any user connecting with any user.

### What Changed

**Before:**
- `tutor_connections` table: Only students could connect with tutors
- Limited to student-tutor relationships
- `student_id` + `tutor_id` fields

**After:**
- `connections` table: Anyone can connect with anyone
- Supports multiple connection types (follow, friend, block)
- `user_id_1` + `user_id_2` fields (universal user references)

---

## Connection Types

The new system supports three connection types:

### 1. Follow (Directional)
Like Instagram or Twitter:
- User A follows User B (directional)
- User B doesn't automatically follow User A
- Status: `accepted` (immediate, no approval needed)

**Use cases:**
- Students following tutors
- Parents following schools
- Anyone following influencers/educators

### 2. Friend (Bidirectional)
Like Facebook:
- User A sends friend request to User B
- User B must accept
- Status: `pending` → `accepted`
- Creates mutual relationship

**Use cases:**
- Students connecting with classmates
- Tutors networking with other tutors
- Parents connecting with other parents

### 3. Block
User blocking:
- User A blocks User B
- Prevents any interaction
- Status: `accepted` (immediate)

---

## Database Schema

### Connections Table

```sql
CREATE TABLE connections (
    id SERIAL PRIMARY KEY,

    -- User relationship
    user_id_1 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_id_2 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Connection type: 'follow', 'friend', 'block'
    connection_type VARCHAR(20) NOT NULL DEFAULT 'follow',

    -- Status: 'pending', 'accepted', 'rejected', 'blocked'
    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    -- Who initiated the connection
    initiated_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Optional message when requesting connection
    connection_message TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_connection UNIQUE (user_id_1, user_id_2, connection_type),
    CONSTRAINT no_self_connection CHECK (user_id_1 != user_id_2)
);

-- Indexes for performance
CREATE INDEX idx_connections_user1 ON connections(user_id_1);
CREATE INDEX idx_connections_user2 ON connections(user_id_2);
CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_connections_type ON connections(connection_type);
CREATE INDEX idx_connections_both_users ON connections(user_id_1, user_id_2);
```

### Key Features

1. **No Duplicate Connections**: Unique constraint on (user_id_1, user_id_2, connection_type)
2. **No Self-Connections**: Check constraint prevents users from connecting with themselves
3. **Cascade Deletes**: When a user is deleted, their connections are automatically removed
4. **Bidirectional Support**: Same table supports both directional and bidirectional relationships

---

## Migration Steps

### Step 1: Run Migration Script

```bash
cd astegni-backend
python migrate_tutor_connections_to_connections.py
```

This script:
1. Creates new `connections` table
2. Migrates existing `tutor_connections` data
3. Converts student-tutor relationships to "follow" connections
4. Backs up old table as `tutor_connections_backup_TIMESTAMP`
5. Updates indexes for performance

### Step 2: Update Backend Code

The following files have been updated:

**`app.py modules/models.py`:**
- ✅ Replaced `TutorConnection` class with `Connection` class
- ✅ Added `ConnectionCreate`, `ConnectionUpdate`, `ConnectionResponse` Pydantic schemas
- ✅ Updated relationships in `TutorProfile` model

**`connection_endpoints.py` (NEW):**
- ✅ Complete API endpoints for connection management
- ✅ 9 endpoints covering all CRUD operations + stats

### Step 3: Register Endpoints in app.py

Add to `astegni-backend/app.py`:

```python
from connection_endpoints import router as connection_router
app.include_router(connection_router)
```

### Step 4: Test the Migration

```bash
# Start backend
cd astegni-backend
python app.py

# Test endpoints at http://localhost:8000/docs
```

---

## API Endpoints

### 1. Create Connection

```http
POST /api/connections
Authorization: Bearer {token}

{
  "target_user_id": 123,
  "connection_type": "follow",
  "connection_message": "Hi! I'd like to connect"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id_1": 98,
  "user_id_2": 123,
  "connection_type": "follow",
  "status": "accepted",
  "initiated_by": 98,
  "connection_message": "Hi! I'd like to connect",
  "created_at": "2025-01-15T10:30:00",
  "accepted_at": "2025-01-15T10:30:00",
  "user_1_name": "John Doe",
  "user_2_name": "Jane Smith"
}
```

### 2. Get My Connections

```http
GET /api/connections?connection_type=follow&direction=following
Authorization: Bearer {token}
```

**Query Parameters:**
- `connection_type`: `follow`, `friend`, `block` (optional)
- `status`: `pending`, `accepted`, `rejected` (optional)
- `direction`: `following`, `followers`, `all` (default: `all`)

### 3. Get Connection Stats

```http
GET /api/connections/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "followers_count": 150,
  "following_count": 80,
  "friends_count": 45,
  "pending_received_count": 10,
  "pending_sent_count": 5,
  "blocked_count": 2,
  "total_connections": 275
}
```

### 4. Update Connection (Accept/Reject)

```http
PUT /api/connections/{connection_id}
Authorization: Bearer {token}

{
  "status": "accepted"
}
```

**Note:** Only the recipient (user_id_2) can update the connection status.

### 5. Delete Connection (Unfollow/Unfriend)

```http
DELETE /api/connections/{connection_id}
Authorization: Bearer {token}
```

**Note:** Either party can delete the connection.

### 6. Check Connection Status

```http
POST /api/connections/check
Authorization: Bearer {token}

{
  "target_user_id": 123
}
```

**Response:**
```json
{
  "is_connected": true,
  "connection_type": "follow",
  "status": "accepted",
  "direction": "outgoing",
  "connection_id": 1,
  "created_at": "2025-01-15T10:30:00"
}
```

### 7. Get User's Public Connections

```http
GET /api/users/{user_id}/connections?connection_type=follow&status=accepted
```

**Note:** Public endpoint, shows only accepted connections by default.

---

## Frontend Integration

### Example: Follow a User

```javascript
async function followUser(targetUserId) {
    try {
        const response = await fetch('http://localhost:8000/api/connections', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                target_user_id: targetUserId,
                connection_type: 'follow'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to follow user');
        }

        const data = await response.json();
        console.log('Now following:', data);

        // Update UI
        updateFollowButton(targetUserId, 'following');

    } catch (error) {
        console.error('Error following user:', error);
    }
}
```

### Example: Check Connection Status

```javascript
async function checkConnectionStatus(targetUserId) {
    try {
        const response = await fetch('http://localhost:8000/api/connections/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                target_user_id: targetUserId
            })
        });

        const data = await response.json();

        if (data.is_connected) {
            console.log(`Connection status: ${data.status} (${data.connection_type})`);
            // Show "Unfollow" or "Connected" button
        } else {
            console.log('Not connected');
            // Show "Follow" or "Connect" button
        }

    } catch (error) {
        console.error('Error checking connection:', error);
    }
}
```

### Example: Get Connection Stats

```javascript
async function loadConnectionStats() {
    try {
        const response = await fetch('http://localhost:8000/api/connections/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const stats = await response.json();

        // Update UI
        document.getElementById('followers-count').textContent = stats.followers_count;
        document.getElementById('following-count').textContent = stats.following_count;
        document.getElementById('friends-count').textContent = stats.friends_count;

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}
```

---

## Use Cases

### 1. Student Following Tutor

```javascript
// Student clicks "Follow" on tutor profile
await followUser(tutorUserId); // Creates 'follow' connection, status='accepted'
```

### 2. Friend Request Between Students

```javascript
// Student A sends friend request to Student B
const response = await fetch('/api/connections', {
    method: 'POST',
    body: JSON.stringify({
        target_user_id: studentBId,
        connection_type: 'friend',
        connection_message: 'Let\'s study together!'
    })
});
// Creates connection with status='pending'

// Student B accepts the request
await fetch(`/api/connections/${connectionId}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'accepted' })
});
// Updates status to 'accepted'
```

### 3. Blocking a User

```javascript
// User blocks another user
await fetch('/api/connections', {
    method: 'POST',
    body: JSON.stringify({
        target_user_id: blockedUserId,
        connection_type: 'block'
    })
});
// Creates 'block' connection, status='accepted' (immediate)
```

---

## Testing

### Test Script 1: Create Follow Connection

```bash
curl -X POST http://localhost:8000/api/connections \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_user_id": 2,
    "connection_type": "follow"
  }'
```

### Test Script 2: Get My Followers

```bash
curl -X GET "http://localhost:8000/api/connections?direction=followers&connection_type=follow" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Script 3: Get Connection Stats

```bash
curl -X GET http://localhost:8000/api/connections/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Benefits of New System

### 1. Flexibility
- Any user can connect with any user
- Not limited to student-tutor relationships
- Supports multiple connection types

### 2. Social Features
- Follow system (like Instagram)
- Friend system (like Facebook)
- Block system (privacy control)

### 3. Scalability
- Single unified table
- Efficient indexes
- Prevents duplicates and self-connections

### 4. Better Analytics
- Track followers, following, friends separately
- Connection statistics per user
- Direction-aware queries (incoming vs outgoing)

---

## Migration Checklist

- ✅ Database migration script created
- ✅ New `connections` table created
- ✅ Old data migrated from `tutor_connections`
- ✅ Models updated in `models.py`
- ✅ Pydantic schemas created
- ✅ API endpoints created (9 endpoints)
- ⏳ Endpoints registered in `app.py` (TODO)
- ⏳ Frontend integration (TODO)
- ⏳ Test existing features (TODO)
- ⏳ Update profile pages UI (TODO)
- ⏳ Drop old backup table after verification (TODO)

---

## Next Steps

1. **Register endpoints in app.py:**
   ```python
   from connection_endpoints import router as connection_router
   app.include_router(connection_router)
   ```

2. **Test the API:**
   - Visit http://localhost:8000/docs
   - Test all endpoints with sample data

3. **Update Frontend:**
   - Add "Follow" buttons to profile pages
   - Show follower/following counts
   - Implement connection requests UI

4. **Verify Data Migration:**
   - Check that old connections still work
   - Test creating new connections

5. **Clean Up:**
   - After verification, drop backup table:
     ```sql
     DROP TABLE tutor_connections_backup_TIMESTAMP;
     ```

---

## Support

For questions or issues:
- Check `connection_endpoints.py` for endpoint implementation
- Check `models.py` for schema definitions
- Run migration script again if needed (it's safe to re-run)

---

**Date:** 2025-01-15
**Status:** ✅ Backend Complete, Frontend Pending
**Breaking Changes:** Yes (table name and column names changed)
**Backward Compatible:** No (requires migration)
