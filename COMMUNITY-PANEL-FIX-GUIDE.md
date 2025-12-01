# Community Panel Fix - Complete Implementation Guide

## Problem Summary

The community panel in `tutor-profile.html` was not loading data properly when clicking on the sidebar "Community" item or when switching between tabs (Connections, Requests, Events, Clubs).

## Root Causes Identified

1. **Missing Integration**: The `switchCommunityMainTab()` function existed in `bookstore-gamestore-communityModal.js` but was NOT integrated with the database-backed `CommunityManager` class
2. **No Data Loading**: Clicking on cards/tabs would only show/hide UI elements but never triggered API calls to load data from the database
3. **Requests Tab Not Loading**: The "Requests" tab had no logic to:
   - Load "Received" requests (status='pending', direction='incoming')
   - Load "Sent" requests (status='pending', direction='outgoing')
4. **Events/Clubs Not Loading**: No database integration for events and clubs tables

## Solution Implemented

### 1. Created Dedicated Community Panel Manager

**File**: `js/tutor-profile/community-panel-manager.js` (NEW)

This file provides:
- `switchCommunityMainTab(section)` - Switches between Connections/Requests/Events/Clubs and loads data
- `switchRequestsTab(tab)` - Switches between Received/Sent requests and loads data
- Filter functions for each section
- Search functions
- Integration with `CommunityManager` for all database operations

### 2. Data Flow Architecture

```
User Action (Click Sidebar "Community")
  ↓
Panel Manager loads "Connections" by default
  ↓
switchCommunityMainTab('connections') called
  ↓
CommunityManager.loadSectionGrid('connections', 'all') called
  ↓
API: GET /api/connections?status=accepted&direction=all
  ↓
Display accepted connections in grid
```

**Connections Tab**:
- Loads: `status=accepted` (all accepted connections)
- API: `GET /api/connections?status=accepted&direction=all`

**Requests Tab** (Default: Received):
- Received: `status=pending`, `direction=incoming`
- Sent: `status=pending`, `direction=outgoing`
- API: `GET /api/connections?status=pending&direction=incoming`

**Events Tab**:
- Loads: Events from `events` table
- API: `GET /api/events`

**Clubs Tab**:
- Loads: Clubs from `clubs` table
- API: `GET /api/clubs`

### 3. Updated communityManager.js

Fixed status values to match new schema:
- OLD: `status='connecting'` → NEW: `status='pending'`
- OLD: `status='connected'` → NEW: `status='accepted'`

### 4. Seed Data for Testing

Created `seed_tutor_connections.py` to populate test data:

**Tutor 85 (test account: jediael.s.abebe@gmail.com) has**:
- 2 incoming requests (pending): Tutor 86 → Tutor 85, Tutor 112 → Tutor 85
- 1 outgoing request (pending): Tutor 85 → Tutor 90
- 2 accepted connections: Tutor 100 ↔ Tutor 85, Tutor 85 ↔ Tutor 105

## Testing Instructions

### Step 1: Start Backend Server

```bash
cd astegni-backend
python app.py
```

Server runs on: http://localhost:8000

### Step 2: Start Frontend Server

```bash
# From project root (new terminal)
python -m http.server 8080
```

Frontend runs on: http://localhost:8080

### Step 3: Login as Tutor 85

1. Open: http://localhost:8080/profile-pages/tutor-profile.html
2. Login credentials:
   - Email: `jediael.s.abebe@gmail.com`
   - Password: `@JesusJediael1234`

### Step 4: Test Community Panel

#### Test 1: Click "Community" in Sidebar
1. Click "Community" in the left sidebar
2. **Expected**: Panel switches to community panel
3. **Expected**: "Connections" card is auto-selected (active state with elevation)
4. **Expected**: Connections grid loads showing 2 accepted connections:
   - Tutor 100 ↔ Tutor 85
   - Tutor 85 ↔ Tutor 105
5. **Check Console**: Should see logs like:
   ```
   🔄 [Tutor Panel] Switching to main section: connections
   📊 [Tutor Panel] Loading data for section: connections
   📥 [Tutor Panel] Loading connections (status=accepted)...
   ```

#### Test 2: Click "Requests" Card
1. Click the "Requests" card (orange card with 📬 icon)
2. **Expected**: Panel switches to requests section
3. **Expected**: "Received" tab is auto-selected (blue background)
4. **Expected**: Received requests grid loads showing 2 pending requests:
   - Tutor 86 → Tutor 85 ("Pending your approval")
   - Tutor 112 → Tutor 85 ("Pending your approval")
5. **Expected**: Each request has "Accept" and "Decline" buttons
6. **Check Console**: Should see:
   ```
   🔄 [Tutor Panel] Switching to main section: requests
   📥 [Tutor Panel] Loading requests (received tab, status=pending, direction=incoming)...
   🔄 [Tutor Panel] Switching requests tab to: received
   📥 [Tutor Panel] Loading received requests (status=pending, direction=incoming)...
   ```

#### Test 3: Click "Sent" Tab in Requests
1. While in Requests section, click "Sent" tab button
2. **Expected**: Tab switches to "Sent" (blue background)
3. **Expected**: Sent requests grid loads showing 1 outgoing request:
   - Tutor 85 → Tutor 90 ("Awaiting response")
4. **Expected**: Request has "View Profile" and "Cancel" buttons
5. **Check Console**: Should see:
   ```
   🔄 [Tutor Panel] Switching requests tab to: sent
   📥 [Tutor Panel] Loading sent requests (status=pending, direction=outgoing)...
   ```

#### Test 4: Click "Events" Card
1. Click the "Events" card
2. **Expected**: Panel switches to events section
3. **Expected**: Events grid loads from database
4. **Check Console**: Should see:
   ```
   🔄 [Tutor Panel] Switching to main section: events
   📥 [Tutor Panel] Loading events from database...
   ```

#### Test 5: Click "Clubs" Card
1. Click the "Clubs" card
2. **Expected**: Panel switches to clubs section
3. **Expected**: Clubs grid loads from database
4. **Check Console**: Should see:
   ```
   🔄 [Tutor Panel] Switching to main section: clubs
   📥 [Tutor Panel] Loading clubs from database...
   ```

#### Test 6: Filter Connections by Role
1. Go back to "Connections" tab
2. Click filter buttons: "All", "Students", "Parents", "Tutors"
3. **Expected**: Grid reloads with filtered data each time
4. **Expected**: Filter button gets blue background when active

#### Test 7: Search Connections
1. In Connections tab, type a search query in the search box
2. **Expected**: Grid filters in real-time
3. **Expected**: Shows "No results found" if no matches

#### Test 8: Accept a Request
1. Go to "Requests" → "Received" tab
2. Click "Accept" on Tutor 86's request
3. **Expected**: Success toast message
4. **Expected**: Request disappears from "Received" tab
5. **Expected**: Tutor 86 now appears in "Connections" tab
6. **Check Database**:
   ```bash
   cd astegni-backend
   python -c "import psycopg; conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db'); cur = conn.cursor(); cur.execute(\"SELECT * FROM connections WHERE id=25\"); print(cur.fetchone())"
   ```
   **Expected**: Status changed from 'pending' to 'accepted'

## Error States & Loading States

### Loading States
When switching tabs, you should see:
```html
<div style="text-align: center; padding: 2rem; color: var(--text-muted);">
  Loading from database...
</div>
```

### Empty States
When no data exists:
- **Connections**: "No connections found" with 🔍 icon
- **Requests**: "No incoming requests" with 📩 icon
- **Events**: "No events available" with 📅 icon
- **Clubs**: "No clubs available" with 🎭 icon

### Error States
On API failure:
```html
<div style="text-align: center; padding: 2rem; color: var(--text-danger);">
  <p>Failed to load data. Please try again.</p>
  <button onclick="...">Retry</button>
</div>
```

## Network Tab Verification

Open Chrome DevTools → Network tab while testing:

1. **Connections Tab**: Should see `GET /api/connections?status=accepted&direction=all`
2. **Received Requests**: Should see `GET /api/connections?status=pending&direction=incoming`
3. **Sent Requests**: Should see `GET /api/connections?status=pending&direction=outgoing`
4. **Events Tab**: Should see `GET /api/events`
5. **Clubs Tab**: Should see `GET /api/clubs`
6. **Connection Stats** (on page load): Should see `GET /api/connections/stats`

## Files Modified/Created

### New Files
1. `js/tutor-profile/community-panel-manager.js` - Main panel manager
2. `astegni-backend/seed_tutor_connections.py` - Test data seeder

### Modified Files
1. `js/page-structure/communityManager.js` - Updated status values ('pending', 'accepted')
2. `profile-pages/tutor-profile.html` - Already loads community-panel-manager.js

## Key Functions

### Panel Manager (`community-panel-manager.js`)
- `window.switchCommunityMainTab(section)` - Main tab switching
- `window.switchRequestsTab(tab)` - Requests tab switching
- `window.filterConnectionsBy(category)` - Filter connections
- `window.filterReceivedRequestsBy(category)` - Filter received requests
- `window.filterSentRequestsBy(category)` - Filter sent requests
- `window.searchConnections(event)` - Search connections
- `window.searchReceivedRequests(event)` - Search received requests
- `window.searchSentRequests(event)` - Search sent requests

### Community Manager (`communityManager.js`)
- `loadSectionGrid(section, category)` - Load connections/events/clubs
- `loadRequestTab(tab, category)` - Load received/sent requests
- `acceptConnection(connectionId)` - Accept request (PUT /api/connections/{id} with status='accepted')
- `rejectConnection(connectionId)` - Reject request (PUT /api/connections/{id} with status='rejected')
- `cancelSentRequest(connectionId)` - Cancel sent request (DELETE /api/connections/{id})

## Connection Schema

### Database Table: `connections`
```sql
CREATE TABLE connections (
    id SERIAL PRIMARY KEY,
    requested_by INT NOT NULL,        -- User ID who initiated
    requester_type VARCHAR(50),        -- Role: 'tutor', 'student', 'parent'
    requested_to INT NOT NULL,         -- User ID receiving request
    requested_to_type VARCHAR(50),     -- Role they connected as
    status VARCHAR(50) NOT NULL,       -- 'pending', 'accepted', 'rejected', 'blocked'
    connection_message TEXT,
    requested_at TIMESTAMP,
    connected_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Status Values
- `pending` - Request sent, awaiting response
- `accepted` - Connection established
- `rejected` - Request declined
- `blocked` - User blocked

### Direction Logic
- **Incoming**: `requested_to = current_user_id`
- **Outgoing**: `requested_by = current_user_id`
- **All**: `requested_by = current_user_id OR requested_to = current_user_id`

## Troubleshooting

### Issue: Panel doesn't switch
**Fix**: Check browser console for errors. Verify `community-panel-manager.js` is loaded.

### Issue: No data loads
**Fix**:
1. Check backend is running on port 8000
2. Check Network tab for failed API calls
3. Verify token exists: `localStorage.getItem('token')`
4. Check console logs for API errors

### Issue: "CommunityManager not initialized"
**Fix**: Verify `communityManager.js` loads BEFORE `community-panel-manager.js` in HTML:
```html
<script src="../js/page-structure/communityManager.js"></script>
<script src="../js/tutor-profile/community-panel-manager.js"></script>
```

### Issue: Empty states show but data exists
**Fix**:
1. Run seed script: `python astegni-backend/seed_tutor_connections.py`
2. Check database: `SELECT * FROM connections WHERE requested_to = 85 OR requested_by = 85`
3. Verify JWT token has correct user_id (should be 85 for test account)

## Success Criteria

✅ Clicking "Community" in sidebar loads connections automatically
✅ Clicking "Connections" card loads accepted connections (status='accepted')
✅ Clicking "Requests" card loads received requests (status='pending', direction='incoming')
✅ "Received" tab shows 2 pending incoming requests
✅ "Sent" tab shows 1 pending outgoing request
✅ Events tab loads from events table
✅ Clubs tab loads from clubs table
✅ All loading, empty, and error states work correctly
✅ Filters work for each section
✅ Search works for each section
✅ Accept/Reject buttons work and update database
✅ No JavaScript errors in console
✅ API calls visible in Network tab

## Maintenance Notes

- The `switchCommunityMainTab()` function is now defined in `community-panel-manager.js`, NOT in `bookstore-gamestore-communityModal.js`
- Any future updates to community panel logic should go in `community-panel-manager.js`
- Database operations remain in `communityManager.js` (separation of concerns)
- Test data can be regenerated anytime by running `seed_tutor_connections.py`
