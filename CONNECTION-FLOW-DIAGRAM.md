# Connection Flow - Visual Diagram

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER OPENS VIEW-TUTOR PAGE                        │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│  Page Load Sequence:                                                 │
│  1. HTML loads                                                       │
│  2. view-tutor-db-loader.js loads tutor data from API                │
│  3. connection-manager.js initializes                                │
│  4. Auto-checks connection status with tutor                         │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    BUTTON STATE DETERMINED                           │
│                                                                      │
│  IF no connection → Button shows: "🔗 Connect"                       │
│  IF connecting → Button shows: "⏳ Connecting..."                    │
│  IF connected → Button shows: "✓ Connected"                          │
│  IF disconnected → Button shows: "🔄 Reconnect"                      │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
                     USER CLICKS CONNECT BUTTON
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION CHECK                              │
│                                                                      │
│  Check localStorage for token                                        │
│      ↓                                    ↓                          │
│   FOUND                                NOT FOUND                     │
│      ↓                                    ↓                          │
│  Continue                          Show error notification           │
│                                     Open auth modal                  │
│                                         STOP                         │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    SEND CONNECTION REQUEST                           │
│                                                                      │
│  POST /api/connections                                               │
│  Headers: { Authorization: "Bearer {token}" }                        │
│  Body: {                                                             │
│    target_user_id: 85,                                              │
│    connection_type: "connect",                                      │
│    connection_message: null                                         │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND PROCESSING                                │
│                                                                      │
│  1. Validates authentication token                                   │
│  2. Checks target user exists (tutor with user_id=85)               │
│  3. Prevents self-connection                                         │
│  4. Checks for existing connection                                   │
│  5. Creates new Connection record:                                   │
│     - user_id_1 = current_user_id (42)                              │
│     - user_id_2 = tutor_user_id (85)                                │
│     - connection_type = "connect"                                    │
│     - status = "connecting"                                          │
│     - initiated_by = current_user_id (42)                           │
│  6. Saves to database                                                │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    DATABASE RECORD CREATED                           │
│                                                                      │
│  connections table:                                                  │
│  ┌────┬──────────┬──────────┬─────────┬────────────┬───────────┐   │
│  │ id │ user_id_1│ user_id_2│  type   │  status    │initiated_by│   │
│  ├────┼──────────┼──────────┼─────────┼────────────┼───────────┤   │
│  │123 │    42    │    85    │ connect │ connecting │    42     │   │
│  └────┴──────────┴──────────┴─────────┴────────────┴───────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND RESPONSE                                 │
│                                                                      │
│  1. Receives 201 Created response                                    │
│  2. Shows success notification: "Connection request sent!"           │
│  3. Checks connection status again                                   │
│  4. Updates button UI to: "⏳ Connecting..."                         │
│  5. Button is disabled (can't send duplicate requests)               │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
                        CONNECTION REQUEST SENT!
```

## Button State Machine

```
                    ┌──────────────────┐
                    │   No Connection  │
                    │   🔗 Connect     │
                    └────────┬─────────┘
                             │
                    User clicks button
                             │
                             ↓
                    ┌──────────────────┐
                    │   Connecting     │──────→ User can cancel
                    │   ⏳ Connecting...│      (DELETE connection)
                    └────────┬─────────┘
                             │
                   Tutor accepts request
                   (PUT status="connected")
                             │
                             ↓
                    ┌──────────────────┐
                    │    Connected     │──────→ User can disconnect
                    │   ✓ Connected    │      (PUT status="disconnect")
                    └────────┬─────────┘
                             │
                    User disconnects
                             │
                             ↓
                    ┌──────────────────┐
                    │   Disconnected   │──────→ User can reconnect
                    │   🔄 Reconnect   │      (POST new connection)
                    └──────────────────┘
```

## API Endpoints Flow

### 1. Check Status (On Page Load)

```
┌─────────┐    POST /api/connections/check     ┌─────────┐
│ Browser │ ──────────────────────────────────→ │ Backend │
│         │                                     │         │
│         │ ←────────────────────────────────── │         │
└─────────┘  { is_connected: false, ... }      └─────────┘
```

### 2. Send Request (User Clicks Connect)

```
┌─────────┐    POST /api/connections           ┌─────────┐
│ Browser │ ──────────────────────────────────→ │ Backend │
│         │  { target_user_id: 85, ... }       │         │
│         │                                     │    │    │
│         │                                     │    ↓    │
│         │                                     │ [INSERT │
│         │                                     │   INTO  │
│         │                                     │  DB]    │
│         │ ←────────────────────────────────── │    │    │
└─────────┘  { id: 123, status: "connecting" } └─────────┘
```

### 3. Update Status (Accept/Reject/Disconnect)

```
┌─────────┐    PUT /api/connections/123        ┌─────────┐
│ Browser │ ──────────────────────────────────→ │ Backend │
│         │  { status: "connected" }           │         │
│         │                                     │    │    │
│         │                                     │    ↓    │
│         │                                     │ [UPDATE │
│         │                                     │   DB]   │
│         │ ←────────────────────────────────── │    │    │
└─────────┘  { id: 123, status: "connected" }  └─────────┘
```

### 4. Cancel Request (Delete Connection)

```
┌─────────┐    DELETE /api/connections/123     ┌─────────┐
│ Browser │ ──────────────────────────────────→ │ Backend │
│         │                                     │         │
│         │                                     │    │    │
│         │                                     │    ↓    │
│         │                                     │ [DELETE │
│         │                                     │  FROM   │
│         │                                     │   DB]   │
│         │ ←────────────────────────────────── │    │    │
└─────────┘  204 No Content                     └─────────┘
```

## Database Schema

```
connections table
┌────────────────┬──────────────┬──────────────────────────────────┐
│ Column         │ Type         │ Description                      │
├────────────────┼──────────────┼──────────────────────────────────┤
│ id             │ INTEGER      │ Primary key                      │
│ user_id_1      │ INTEGER      │ User who initiated connection    │
│ user_id_2      │ INTEGER      │ Target user (tutor)              │
│ connection_type│ VARCHAR      │ 'connect' or 'block'             │
│ status         │ VARCHAR      │ 'connecting', 'connected', etc.  │
│ initiated_by   │ INTEGER      │ User ID who created record       │
│ message        │ TEXT         │ Optional connection message      │
│ created_at     │ TIMESTAMP    │ When connection was created      │
│ connected_at   │ TIMESTAMP    │ When status → 'connected'        │
│ updated_at     │ TIMESTAMP    │ Last update time                 │
└────────────────┴──────────────┴──────────────────────────────────┘
```

## Code Flow

### view-tutor.html Initialization

```javascript
DOMContentLoaded
      ↓
Create ConnectionManager instance
      ↓
Wait for tutor data to load (window.currentTutorData)
      ↓
Extract tutor user_id
      ↓
Call checkConnectionStatus(tutorUserId)
      ↓
Update button UI based on status
```

### connectTutor() Function Flow

```javascript
User clicks "Connect" button
      ↓
Check if logged in
      ↓ YES
Check current connection status
      ↓
┌─────────────┬──────────────┬────────────┐
│             │              │            │
No connection  Connecting    Connected
│             │              │            │
↓             ↓              ↓            │
Send new      Show cancel    Show disconnect
request       option         option       │
│             │              │            │
↓             ↓              ↓            │
POST          DELETE         PUT          │
/connections  /connections   /connections │
              /123           /123         │
│             │              │            │
└─────────────┴──────────────┴────────────┘
      ↓
Update button UI
      ↓
Show notification
```

## Error Handling Flow

```
User action
      ↓
API call
      ↓
┌─────────────────┬──────────────────┬──────────────────┐
│                 │                  │                  │
Success (2xx)    Auth Error (401)   Other Error (4xx)
│                 │                  │                  │
↓                 ↓                  ↓                  │
Show success     Show login         Show error         │
notification     required msg       notification       │
Update button    Open auth modal    Reset button       │
│                 │                  │                  │
└─────────────────┴──────────────────┴──────────────────┘
```

## Real-World Example

### Scenario: Student Connects with Tutor

```
1. Student (user_id: 42) views tutor profile (tutor_id: 85)
   URL: view-tutor.html?id=1

2. Page loads, checks if student is already connected
   POST /api/connections/check { target_user_id: 85 }
   Response: { is_connected: false, status: null }

3. Button shows: "🔗 Connect"

4. Student clicks "Connect" button

5. Frontend sends:
   POST /api/connections
   Body: { target_user_id: 85, connection_type: "connect" }

6. Backend creates database record:
   INSERT INTO connections (
     user_id_1, user_id_2, connection_type, status, initiated_by
   ) VALUES (42, 85, 'connect', 'connecting', 42)

7. Backend responds:
   {
     id: 123,
     user_id_1: 42,
     user_id_2: 85,
     status: "connecting",
     created_at: "2025-01-26T10:30:00"
   }

8. Frontend updates:
   - Shows notification: "Connection request sent successfully!"
   - Changes button to: "⏳ Connecting..."
   - Disables button (prevents duplicate requests)

9. Student refreshes page
   - Connection status check returns: { status: "connecting" }
   - Button automatically shows: "⏳ Connecting..."
   - Status persists from database!

10. Later, tutor (user_id: 85) accepts request:
    PUT /api/connections/123 { status: "connected" }
    Database updates: status = "connected", connected_at = NOW()

11. Next time student views profile:
    - Status check returns: { is_connected: true, status: "connected" }
    - Button shows: "✓ Connected"
```

## Files Architecture

```
view-profiles/
  └── view-tutor.html
      │
      ├── Imports: js/view-tutor/view-tutor-db-loader.js
      │   └── Sets: window.currentTutorData
      │
      ├── Imports: js/view-tutor/connection-manager.js
      │   └── Provides: ConnectionManager class
      │
      ├── Initialization Script (inline)
      │   └── Creates: window.connectionManagerInstance
      │   └── Calls: checkConnectionStatus()
      │   └── Updates: connect button UI
      │
      └── connectTutor() function (inline)
          └── Handles: button click events
          └── Calls: ConnectionManager methods
```

## Success Indicators

✅ **Page Load:**
- Console shows: "✅ Connection Manager: Checking connection status..."
- Button updates to correct state

✅ **Send Request:**
- Network tab shows: POST /api/connections → 201
- Notification appears
- Button changes to "Connecting..."

✅ **Database:**
- New row in connections table
- status = "connecting"
- user_id_1 and user_id_2 are correct

✅ **Persistence:**
- Refresh page → button still shows correct state
- Status retrieved from database

**IMPLEMENTATION COMPLETE!** 🎉
