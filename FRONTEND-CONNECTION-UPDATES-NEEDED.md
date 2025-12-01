# Frontend Connection Updates - Action Items

## Backend Updates ✅ COMPLETE

The backend has been fully updated to use the new simplified connections schema:
- ✅ Database migrated to new structure
- ✅ Models updated (`models.py`)
- ✅ All API endpoints updated (`connection_endpoints.py`)

## Frontend Files That Need Updates

### Files to Update:
1. **js/tutor-profile/community-modal-functions.js**
2. **js/tutor-profile/community-modal-manager.js**
3. **js/tutor-profile/community-panel-data-loader.js**
4. **js/tutor-profile/community-panel-integration.js**

---

## Changes Needed

### 1. API Request Changes

#### Old Field Names (DON'T USE):
```javascript
// OLD - DO NOT USE
{
    target_user_id: userId,
    target_profile_id: profileId,
    target_profile_type: 'tutor',
    connection_type: 'connect',  // REMOVED
    connection_message: message
}
```

#### New Field Names (USE THESE):
```javascript
// NEW - USE THIS
{
    requested_to: userId,
    requested_to_type: 'tutor',  // or 'student', 'parent', 'advertiser'
    connection_message: message
}
```

### 2. Status Value Changes

#### Old Status Values (DON'T USE):
- `'connecting'` → Change to `'pending'`
- `'connected'` → Change to `'accepted'`
- `'connection_failed'` → Change to `'rejected'`
- `'disconnect'` → Change to `'rejected'`

#### New Status Values (USE THESE):
- `'pending'` - Request sent, awaiting response
- `'accepted'` - Connection accepted
- `'rejected'` - Connection rejected
- `'blocked'` - User blocked

### 3. Response Field Changes

#### Old Response Fields (DON'T USE):
```javascript
// OLD
connection.user_id_1
connection.user_id_2
connection.profile_id_1
connection.profile_type_1
connection.profile_id_2
connection.profile_type_2
connection.initiated_by
connection.created_at  // Use requested_at instead
```

#### New Response Fields (USE THESE):
```javascript
// NEW
connection.requested_by
connection.requester_type
connection.requested_to
connection.requested_to_type
connection.status  // 'pending', 'accepted', 'rejected', 'blocked'
connection.connection_message
connection.requested_at  // When request was sent
connection.connected_at  // When accepted (nullable)
connection.updated_at
```

### 4. Display Changes

#### Connection Status Badges
```javascript
// OLD
if (status === 'connecting') badge = 'Pending';
if (status === 'connected') badge = 'Connected';
if (status === 'connection_failed') badge = 'Failed';

// NEW
if (status === 'pending') badge = 'Pending';
if (status === 'accepted') badge = 'Connected';
if (status === 'rejected') badge = 'Rejected';
if (status === 'blocked') badge = 'Blocked';
```

#### User Details
```javascript
// OLD
connection.user_1_name
connection.user_2_name
connection.user_1_profile_picture
connection.user_2_profile_picture

// NEW
connection.requester_name  // Person who sent the request
connection.recipient_name  // Person who received the request
connection.requester_profile_picture
connection.recipient_profile_picture
```

---

## Search & Replace Guide

Use your editor's search and replace feature:

### 1. Field Names
- `target_user_id` → `requested_to`
- `target_profile_type` → `requested_to_type`
- `connection_type:` → (REMOVE THIS FIELD)
- `user_id_1` → `requested_by`
- `user_id_2` → `requested_to`
- `initiated_by` → `requested_by`
- `created_at` → `requested_at` (for connections)
- `user_1_name` → `requester_name`
- `user_2_name` → `recipient_name`

### 2. Status Values
- `'connecting'` → `'pending'`
- `'connected'` → `'accepted'`
- `'connection_failed'` → `'rejected'`
- `'disconnect'` → `'rejected'`

### 3. API Endpoints (No changes needed!)
All endpoints remain the same:
- ✅ `POST /api/connections`
- ✅ `GET /api/connections`
- ✅ `GET /api/connections/stats`
- ✅ `GET /api/connections/{id}`
- ✅ `PUT /api/connections/{id}`
- ✅ `DELETE /api/connections/{id}`
- ✅ `POST /api/connections/check`

---

## Example Updates

### Before (Old Code):
```javascript
// Creating a connection
async function connectWithUser(userId, userType) {
    const response = await fetch(`${API_URL}/api/connections`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            target_user_id: userId,
            target_profile_type: userType,
            connection_type: 'connect',
            connection_message: 'Hi, let\'s connect!'
        })
    });
    const data = await response.json();

    // OLD field access
    if (data.status === 'connecting') {
        alert('Connection request sent!');
    }
}

// Displaying connection
function displayConnection(conn) {
    const otherUser = conn.user_id_1 === currentUserId
        ? conn.user_2_name
        : conn.user_1_name;

    const statusBadge = conn.status === 'connected' ? 'Connected' : 'Pending';

    return `<div>${otherUser} - ${statusBadge}</div>`;
}
```

### After (New Code):
```javascript
// Creating a connection
async function connectWithUser(userId, userType) {
    const response = await fetch(`${API_URL}/api/connections`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            requested_to: userId,  // CHANGED
            requested_to_type: userType,  // CHANGED
            // connection_type removed - always 'pending' initially
            connection_message: 'Hi, let\'s connect!'
        })
    });
    const data = await response.json();

    // NEW field access
    if (data.status === 'pending') {  // CHANGED
        alert('Connection request sent!');
    }
}

// Displaying connection
function displayConnection(conn) {
    const otherUser = conn.requested_by === currentUserId
        ? conn.recipient_name  // CHANGED
        : conn.requester_name;  // CHANGED

    const statusBadge = conn.status === 'accepted' ? 'Connected' : 'Pending';  // CHANGED

    return `<div>${otherUser} - ${statusBadge}</div>`;
}
```

---

## Testing Checklist

After updating frontend files:

- [ ] Send connection request (POST /api/connections)
- [ ] View sent requests (GET /api/connections?direction=outgoing)
- [ ] View received requests (GET /api/connections?direction=incoming)
- [ ] Accept connection request (PUT /api/connections/{id} status=accepted)
- [ ] Reject connection request (PUT /api/connections/{id} status=rejected)
- [ ] Block user (PUT /api/connections/{id} status=blocked)
- [ ] Display connection status badges correctly
- [ ] Show correct user names (requester vs recipient)
- [ ] Display timestamps (requested_at, connected_at)

---

## Need Help?

If you need assistance updating a specific file, just ask! The changes are mostly:
1. Rename fields in API requests
2. Rename fields when accessing response data
3. Update status value checks
4. Update UI labels/badges

**Status:** Backend ✅ Complete | Frontend ⏳ Needs Updates
