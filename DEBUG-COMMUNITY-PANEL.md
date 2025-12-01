# Community Panel Debugging Guide

## Issue 1: Cards Not Showing

### Root Cause
The panel switch event listeners in `community-panel-integration.js` are looking for:
- `event.detail.panel === 'tutor-community'`
- `event.detail.panelName === 'tutor-community'`

But the actual panel ID in the HTML is **`tutor-community-panel`** (note the `-panel` suffix).

### Quick Fix

**Option 1: Update the event listener** (Recommended)

Edit `js/tutor-profile/community-panel-integration.js` lines 548 and 558:

```javascript
// BEFORE
if (event.detail.panel === 'tutor-community' || event.detail.panelName === 'tutor-community') {

// AFTER
if (event.detail.panel === 'tutor-community-panel' ||
    event.detail.panel === 'tutor-community' ||
    event.detail.panelName === 'tutor-community-panel' ||
    event.detail.panelName === 'tutor-community') {
```

**Option 2: Manually trigger on panel open**

Add this to the end of `js/tutor-profile/community-panel-integration.js`:

```javascript
// Manual trigger when community panel becomes visible
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const panel = document.getElementById('tutor-community-panel');
            if (panel && !panel.classList.contains('hidden')) {
                console.log('🎉 Community panel detected as visible - loading data');
                switchCommunityMainTab('connections');
            }
        }
    });
});

const communityPanel = document.getElementById('tutor-community-panel');
if (communityPanel) {
    observer.observe(communityPanel, { attributes: true });
}
```

**Option 3: Check what event is actually firing**

Open browser DevTools Console and type:

```javascript
// Listen to ALL panel switch events
window.addEventListener('panelSwitch', (e) => console.log('panelSwitch event:', e.detail));
window.addEventListener('panelSwitched', (e) => console.log('panelSwitched event:', e.detail));

// Then click Community in sidebar and check what logs
```

### Testing in Browser Console

Open tutor-profile.html in browser, open DevTools (F12), paste this:

```javascript
// Test 1: Check if functions exist
console.log('switchCommunityMainTab exists:', typeof switchCommunityMainTab);
console.log('loadConnectionsGrid exists:', typeof loadConnectionsGrid);

// Test 2: Manually trigger data loading
switchCommunityMainTab('connections');

// Test 3: Check if grid element exists
console.log('Grid element:', document.getElementById('all-connections-grid'));

// Test 4: Directly load connections
loadConnectionsGrid('all-connections-grid', 'all');
```

---

## Issue 2: How Connection Requests Work with Status "connecting"

### Database Schema

The `connections` table has these key fields:

```sql
CREATE TABLE connections (
    id SERIAL PRIMARY KEY,
    user_id_1 INTEGER NOT NULL,
    user_id_2 INTEGER NOT NULL,
    connection_type VARCHAR(20) DEFAULT 'connect',  -- 'connect' or 'block'
    status VARCHAR(20) DEFAULT 'pending',            -- 'connecting', 'connected', 'disconnect', 'blocked'
    initiated_by INTEGER NOT NULL,                   -- Who sent the request
    created_at TIMESTAMP,
    accepted_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Status Values (Astegni Terminology)

| Status | Meaning |
|--------|---------|
| **`connecting`** | Connection request pending (waiting for acceptance) |
| **`connected`** | Connection accepted and active |
| **`disconnect`** | Connection was active but now disconnected |
| **`connection_failed`** | Connection request was rejected/failed |
| **`blocked`** | User blocked (for `connection_type='block'`) |

### Request Flow

**1. User A sends connection request to User B:**

```http
POST /api/connections
Body: { "target_user_id": 2, "connection_type": "connect" }
```

Database inserts:
```sql
{
    user_id_1: 1,          -- User A
    user_id_2: 2,          -- User B
    connection_type: "connect",
    status: "connecting",   -- Pending status!
    initiated_by: 1        -- User A sent it
}
```

**2. User B fetches received requests:**

```http
GET /api/connections?status=connecting&direction=all
```

Backend returns all connections where:
- `status = 'connecting'`
- Current user is either `user_id_1` OR `user_id_2`

**3. Frontend filters by `initiated_by`:**

```javascript
// In community-panel-integration.js:328-393
const allRequests = await fetchConnections('connecting', null, 'all');

// Received requests: others sent TO me
const receivedRequests = allRequests.filter(conn =>
    conn.initiated_by !== currentUserId
);

// Sent requests: I sent TO others
const sentRequests = allRequests.filter(conn =>
    conn.initiated_by === currentUserId
);
```

**4. User B accepts the request:**

```http
PUT /api/connections/{connection_id}
Body: { "status": "connected" }
```

Database updates:
```sql
UPDATE connections
SET status = 'connected',
    accepted_at = NOW()
WHERE id = {connection_id}
```

**5. Now both users see each other in Connections:**

```http
GET /api/connections?status=connected
```

### Key Code Locations

**Backend API:**
- [connection_endpoints.py:194-284](astegni-backend/connection_endpoints.py#L194-L284) - `GET /api/connections` (fetches by status)
- [connection_endpoints.py:49-191](astegni-backend/connection_endpoints.py#L49-L191) - `POST /api/connections` (creates with status='connecting')
- [connection_endpoints.py:430-490](astegni-backend/connection_endpoints.py#L430-L490) - `PUT /api/connections/{id}` (updates status to 'connected')

**Frontend:**
- [community-panel-data-loader.js:20-65](js/tutor-profile/community-panel-data-loader.js#L20-L65) - `fetchConnections(status, profileType, direction)`
- [community-panel-integration.js:328-393](js/tutor-profile/community-panel-integration.js#L328-L393) - `loadConnectionRequests()` (filters by initiated_by)

### Visual Diagram

```
Connection Lifecycle:

User A → "Connect" → User B
         ↓
    status: "connecting"
    initiated_by: User A
         ↓
    [User B's "Received Requests"]
         ↓
    User B clicks "Accept"
         ↓
    status: "connected"
    accepted_at: timestamp
         ↓
    [Both users see in "Connections"]
```

---

## Summary

**Issue 1 - Cards not showing:**
- Panel ID is `tutor-community-panel` but event listener checks `tutor-community`
- Fix the event listener or add MutationObserver
- Or manually call `switchCommunityMainTab('connections')` in console to test

**Issue 2 - How requests work:**
- Status `'connecting'` = pending connection request
- `initiated_by` field determines received vs sent
- Frontend filters `status='connecting'` connections by `initiated_by` to separate inbox/outbox
- After acceptance, status changes to `'connected'`
