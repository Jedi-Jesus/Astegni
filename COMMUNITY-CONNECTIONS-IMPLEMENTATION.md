# Community Panel Connections Implementation

## Overview
This document describes the implementation of the connections functionality in the tutor-community-panel, which reads from the `connections` table in the database and properly filters connections by profile type and request direction.

## Key Features Implemented

### 1. **All Connections Grid** (`all-connections-grid`)
- Fetches all connections with status `connected` from the database
- Displays all connections regardless of profile type
- Uses the `profile_type_2` field to determine the role of each connected user

### 2. **Filtered Connection Grids**
#### Students Connections (`students-connections-subsection`)
- Filters connections where `profile_type_2 === 'student'`
- Shows only student connections for the current tutor

#### Parents Connections (`parents-connections-subsection`)
- Filters connections where `profile_type_2 === 'parent'`
- Shows only parent connections for the current tutor

#### Tutors Connections (`tutors-connections-subsection`)
- Filters connections where `profile_type_2 === 'tutor'`
- Shows only tutor connections for the current tutor

### 3. **Requests Tab** (`requests-main-tab-content`)
The requests tab displays connection requests with status `connecting` and filters them based on the `initiated_by` field:

#### Requests Sent (`sent-requests-list`)
- Shows requests where `initiated_by === current_user_id`
- These are requests that the tutor sent to others
- Displays a "Cancel Request" button

#### Requests Received (`received-requests-list`)
- Shows requests where `initiated_by !== current_user_id`
- These are requests that others sent to the tutor
- Displays "Accept" and "Decline" buttons

## Implementation Details

### Database Schema
The `connections` table has the following key fields:
- `user_id_1`: First user in the connection
- `user_id_2`: Second user in the connection
- `profile_type_1`: Profile type of user_1 ('student', 'parent', 'tutor', 'advertiser')
- `profile_type_2`: Profile type of user_2
- `status`: Connection status ('connected', 'connecting', 'disconnect', 'connection_failed', 'blocked')
- `initiated_by`: User ID of who initiated the connection request
- `connection_type`: Type of connection ('connect', 'block')

### API Endpoint
**GET** `/api/connections?status={status}&direction={direction}`

Query Parameters:
- `status`: Filter by connection status (e.g., 'connected', 'connecting')
- `direction`: Filter by direction ('all', 'outgoing', 'incoming')

Response includes enriched user data:
- `user_1_name`, `user_2_name`
- `user_1_email`, `user_2_email`
- `user_1_profile_picture`, `user_2_profile_picture`
- `user_1_roles`, `user_2_roles`

### JavaScript Functions

#### `fetchConnections(status, profileType, direction)`
Located in: `js/tutor-profile/community-panel-data-loader.js`

- Fetches connections from the API
- Client-side filtering by `profile_type` (student, parent, tutor)
- Returns array of connection objects

#### `loadConnectionsGrid(gridId, profileType)`
Located in: `js/tutor-profile/community-panel-data-loader.js`

- Loads connections into a specific grid element
- Filters by profile type
- Handles loading states and empty states
- Creates connection cards for each result

#### `loadConnectionRequests()`
Located in: `js/tutor-profile/community-panel-integration.js`

- Fetches all requests with status `connecting`
- Filters by `initiated_by` field to separate sent vs received
- Populates both `sent-requests-list` and `received-requests-list`
- Updates request count badges

#### `createConnectionCard(connection)`
Located in: `js/tutor-profile/community-panel-data-loader.js`

- Creates a beautiful card UI for each connection
- Determines "other user" based on current user ID
- Extracts role from `profile_type_2` field
- Shows user avatar, name, role badge, and action buttons

#### `createConnectionRequestCard(connection, type)`
Located in: `js/tutor-profile/community-panel-integration.js`

- Creates a card UI for connection requests
- Shows different action buttons based on type ('received' or 'sent')
- "Received" requests: Accept & Decline buttons
- "Sent" requests: Cancel Request button

### Navigation Flow

1. User clicks "Connections" main tab
   → `switchCommunityMainTab('connections')` is called
   → Loads all connections by default

2. User clicks "Students", "Parents", or "Tutors" sub-tabs
   → `toggleConnectionsSubSection('students'|'parents'|'tutors')` is called
   → Filters connections by profile type

3. User clicks "Requests" main tab
   → `switchCommunityMainTab('requests')` is called
   → Calls `loadConnectionRequests()` which separates sent vs received

4. User clicks "Sent" or "Received" summary cards
   → `toggleRequestsSubSection('sent'|'received')` is called
   → Toggles visibility of the respective subsection

## How Profile Type Filtering Works

The key insight is that `profile_type_2` tells us the role of the "other" user in the connection:

```javascript
if (connection.user_id_1 === currentUserId) {
    // Other user is user_2
    profileType = connection.profile_type_2;  // ← Their role
} else {
    // Other user is user_1
    profileType = connection.profile_type_1;  // ← Their role
}
```

We filter connections by checking if this profile type matches the desired filter:

```javascript
// Filter for students only
connections.filter(conn => {
    if (conn.user_id_1 === currentUserId) {
        return conn.profile_type_2 === 'student';
    } else {
        return conn.profile_type_1 === 'student';
    }
});
```

## How Request Filtering Works

The `initiated_by` field tells us who initiated the connection request:

```javascript
// Received requests: Someone sent a request TO me
const receivedRequests = allRequests.filter(conn =>
    conn.initiated_by !== currentUserId
);

// Sent requests: I sent a request TO someone
const sentRequests = allRequests.filter(conn =>
    conn.initiated_by === currentUserId
);
```

## Files Modified

1. **`js/tutor-profile/community-panel-data-loader.js`**
   - Updated `fetchConnections()` to accept `profileType` and `direction` parameters
   - Updated `createConnectionCard()` to use `profile_type_2` for role determination
   - Updated `loadConnectionsGrid()` to properly filter by profile type
   - Added `getCurrentUserId()` helper function

2. **`js/tutor-profile/community-panel-integration.js`**
   - Updated `loadConnectionRequests()` to filter by `initiated_by` field
   - Updated `createConnectionRequestCard()` to use `profile_type_2` for role determination
   - Added `toggleRequestsSubSection()` function
   - Added `getCurrentUserId()` helper function
   - Exported `toggleRequestsSubSection` to window

## Testing

To test the implementation:

1. Start the backend and frontend servers
2. Navigate to the tutor profile page
3. Click on the "Community" panel
4. Click "Connections" main tab → Should show all connections
5. Click "Students" sub-tab → Should filter to only students
6. Click "Parents" sub-tab → Should filter to only parents
7. Click "Tutors" sub-tab → Should filter to only tutors
8. Click "Requests" main tab → Should show sent and received requests separately
9. Click "Sent" card → Should show only requests you initiated
10. Click "Received" card → Should show only requests others sent to you

## Example Connection Object

```json
{
  "id": 123,
  "user_id_1": 50,
  "user_id_2": 75,
  "profile_type_1": "tutor",
  "profile_type_2": "student",
  "status": "connected",
  "initiated_by": 50,
  "connection_type": "connect",
  "user_1_name": "John Smith",
  "user_2_name": "Jane Doe",
  "user_1_email": "john@example.com",
  "user_2_email": "jane@example.com",
  "user_1_profile_picture": "https://...",
  "user_2_profile_picture": "https://...",
  "user_1_roles": ["tutor"],
  "user_2_roles": ["student"],
  "created_at": "2025-01-15T10:30:00Z",
  "connected_at": "2025-01-15T10:35:00Z"
}
```

## Summary

The implementation now:
✅ Reads connections from the `connections` table in the database
✅ Populates `all-connections-grid` with all connected users
✅ Filters by `profile_type_2` for Students, Parents, and Tutors sub-sections
✅ Filters requests by `initiated_by` to separate Sent vs Received requests
✅ Displays beautiful connection cards with user info and action buttons
✅ Updates request count badges dynamically
✅ Provides proper empty states and loading states
