# Chat API Errors Fixed

**Date:** 2026-02-03
**File Modified:** `js/common-modals/chat-modal.js`

## Errors Fixed

### ❌ Error 1: 405 Method Not Allowed
```
Failed to load resource: the server responded with a status of 405 (Method Not Allowed)
http://localhost:8000/api/connections/request
```

**Root Cause:**
The endpoint `/api/connections/request` doesn't exist. The correct endpoint is `/api/connections` (POST).

**Fix Applied:**
- Changed endpoint from `/api/connections/request` to `/api/connections`
- Updated request body to match the `ConnectionCreate` model:
  - `recipient_id`: User ID to send request to
  - `recipient_type`: Role of recipient (e.g., 'student', 'tutor')
  - `requester_type`: Role of requester (auto-determined from current user)

**Before:**
```javascript
fetch(`${this.API_BASE_URL}/api/connections/request`, {
    method: 'POST',
    body: JSON.stringify({
        sender_user_id: userId,
        recipient_user_id: recipientUserId
    })
})
```

**After:**
```javascript
fetch(`${this.API_BASE_URL}/api/connections`, {
    method: 'POST',
    body: JSON.stringify({
        recipient_id: recipientUserId,
        recipient_type: 'student',
        requester_type: this.state.currentUser?.role || 'student'
    })
})
```

**Location:** [js/common-modals/chat-modal.js:3028](js/common-modals/chat-modal.js#L3028)

---

### ❌ Error 2: 422 Unprocessable Content
```
Failed to load resource: the server responded with a status of 422 (Unprocessable Content)
http://localhost:8000/api/chat/users/online-status?user_id=1&profile_ids=student_1
```

**Root Cause:**
The endpoint expects `user_ids` (comma-separated integers) but was receiving `profile_ids` (profile format like `student_1`).

**Fix Applied:**
- Changed from building `profile_ids` (e.g., `student_1`) to building `user_ids` (e.g., `1,2,3`)
- Updated query parameter from `profile_ids` to `user_ids`
- Updated response handling to map status by `user_id` instead of profile keys

**Before:**
```javascript
// Built profile IDs like: "student_1,tutor_5"
const profileIds = conversations.map(conv => {
    const pType = conv.other_profile_type;
    const pId = conv.other_profile_id;
    return `${pType}_${pId}`;
}).join(',');

fetch(`${API_BASE_URL}/api/chat/users/online-status?user_id=1&profile_ids=${profileIds}`);

// Mapped by profile keys
if (statusMap[`${pType}_${pId}`]) {
    conv.is_online = statusMap[`${pType}_${pId}`].is_online;
}
```

**After:**
```javascript
// Build user IDs like: "1,2,3"
const userIds = conversations
    .map(conv => conv.other_user_id)
    .filter(Boolean)
    .join(',');

fetch(`${API_BASE_URL}/api/chat/users/online-status?user_id=1&user_ids=${userIds}`);

// Map by user_id
const statusMap = {};
statuses.forEach(status => {
    statusMap[status.user_id] = status;
});

if (statusMap[conv.other_user_id]) {
    conv.is_online = statusMap[conv.other_user_id].is_online;
}
```

**Location:** [js/common-modals/chat-modal.js:492-523](js/common-modals/chat-modal.js#L492-L523)

---

## Backend Endpoints (Reference)

### Connection Request Endpoint
```
POST /api/connections

Request Body:
{
    "recipient_id": 123,              // User ID (from users table)
    "recipient_type": "student",       // Role: tutor/student/parent/advertiser
    "requester_type": "student"        // Optional: auto-determined if not provided
}

Response:
{
    "id": 1,
    "requested_by": 1,
    "requested_to": 123,
    "requester_type": "student",
    "recipient_type": "student",
    "status": "pending",
    "requested_at": "2026-02-03T10:30:00"
}
```

**File:** [astegni-backend/connection_endpoints.py:83-256](astegni-backend/connection_endpoints.py#L83-L256)

### Online Status Endpoint
```
GET /api/chat/users/online-status?user_id=1&user_ids=2,3,4

Response:
{
    "statuses": [
        {
            "user_id": 2,
            "is_online": true,
            "last_seen": "2026-02-03T10:30:00"
        },
        {
            "user_id": 3,
            "is_online": false,
            "last_seen": "2026-02-03T09:15:00"
        }
    ]
}
```

**File:** [astegni-backend/chat_endpoints.py:2184-2206](astegni-backend/chat_endpoints.py#L2184-L2206)

---

## Testing

After these fixes:
1. ✅ Connection requests should work without 405 errors
2. ✅ Online status polling should work without 422 errors
3. ✅ User presence indicators should update correctly
4. ✅ No more console errors for these endpoints

## Notes

- The connection request endpoint now correctly uses the user-based architecture
- Online status checking now uses `user_id` consistently across frontend and backend
- Both fixes align with the user-based migration that was previously completed
- No database changes were required - these were purely frontend API call fixes

## Files Modified

1. `js/common-modals/chat-modal.js` - Lines 3028 (connection request) and 492-523 (online status)

## Verification Commands

```bash
# Start backend
cd astegni-backend && python app.py

# Start frontend
python dev-server.py

# Open browser and check console - should see no 405 or 422 errors
```
