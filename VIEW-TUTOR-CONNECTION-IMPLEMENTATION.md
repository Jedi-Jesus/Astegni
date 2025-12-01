# View Tutor Connection Implementation

## Overview

The connect functionality in `view-tutor.html` now fully integrates with the database `connections` table using Astegni's unique "Connect" terminology.

## What Was Implemented

### 1. **Connection Manager Module** (`js/view-tutor/connection-manager.js`)

A comprehensive JavaScript class that handles all connection operations:

**Features:**
- ✅ Check connection status between current user and tutor
- ✅ Send connection requests to tutors
- ✅ Cancel pending connection requests
- ✅ Disconnect from connected tutors
- ✅ Dynamic button UI updates based on connection status
- ✅ Visual notifications for user feedback

**Connection Statuses Supported:**
- `null` - No connection exists
- `connecting` - Connection request pending (awaiting acceptance)
- `connected` - Connection established and active
- `disconnect` - Connection was terminated
- `connection_failed` - Connection request was rejected
- `blocked` - User has blocked the tutor

### 2. **Updated view-tutor.html**

**Changes:**
1. Added connection-manager.js script import
2. Replaced placeholder `connectTutor()` function with full implementation
3. Added initialization code to:
   - Create connection manager instance on page load
   - Check connection status when tutor profile loads
   - Update connect button UI automatically

### 3. **Updated view-tutor-db-loader.js**

**Changes:**
- Added `window.currentTutorData` exposure in `loadMainProfile()` method
- This allows connection manager to access the tutor's user_id

## How It Works

### Flow Diagram

```
User Opens view-tutor.html?id=123
         ↓
Page loads and initializes
         ↓
ViewTutorDBLoader fetches tutor data
         ↓
window.currentTutorData is set
         ↓
ConnectionManager checks connection status
         ↓
Connect button UI updates automatically
         ↓
User clicks "Connect" button
         ↓
POST /api/connections (connection_type: 'connect', status: 'connecting')
         ↓
Connection record saved in database
         ↓
Button updates to "⏳ Connecting..."
         ↓
Notification: "Connection request sent successfully!"
```

### Database Integration

**Endpoint Used:** `POST /api/connections`

**Request Body:**
```json
{
  "target_user_id": 85,
  "connection_type": "connect",
  "connection_message": null
}
```

**Response:**
```json
{
  "id": 123,
  "user_id_1": 42,
  "user_id_2": 85,
  "connection_type": "connect",
  "status": "connecting",
  "initiated_by": 42,
  "connection_message": null,
  "created_at": "2025-01-26T10:30:00",
  "connected_at": null,
  "updated_at": "2025-01-26T10:30:00",
  "user_1_name": "Student Name",
  "user_2_name": "Tutor Name",
  "user_1_email": "student@example.com",
  "user_2_email": "tutor@example.com"
}
```

**Database Table:** `connections`

**Columns Used:**
- `id` - Primary key
- `user_id_1` - User who initiated the connection
- `user_id_2` - Target user (tutor)
- `connection_type` - Always 'connect' for this feature
- `status` - 'connecting', 'connected', 'disconnect', 'connection_failed', 'blocked'
- `initiated_by` - User ID who created the connection
- `connection_message` - Optional message (currently null)
- `created_at` - Timestamp when connection was created
- `connected_at` - Timestamp when status changed to 'connected'
- `updated_at` - Last update timestamp

## Button UI States

### 1. No Connection (Default)
```
🔗 Connect
- Transparent background
- Border with text color
- Clickable
```

### 2. Connecting (Outgoing Request)
```
⏳ Connecting...
- Yellow/amber background
- Yellow border
- Disabled (not clickable)
```

### 3. Connected
```
✓ Connected
- Green background
- Green border
- Clickable (shows disconnect option)
```

### 4. Disconnected
```
🔄 Reconnect
- Transparent background
- Border with text color
- Clickable
```

### 5. Request Declined
```
✗ Request Declined
- Red background
- Red border
- Disabled
```

### 6. Blocked
```
🚫 Blocked
- Red background
- Red border
- Disabled
```

## User Interactions

### Scenario 1: Sending Connection Request (No existing connection)

1. User clicks "🔗 Connect" button
2. System checks if user is logged in
   - If not logged in → Shows error notification + opens auth modal
3. If logged in → Sends POST request to `/api/connections`
4. Database creates new record with status = 'connecting'
5. Button updates to "⏳ Connecting..."
6. Success notification appears: "Connection request sent successfully!"

### Scenario 2: Canceling Pending Request

1. User clicks "⏳ Connecting..." button
2. Confirmation dialog: "You have a pending connection request. Do you want to cancel it?"
3. If user confirms → Sends DELETE request to `/api/connections/{id}`
4. Database deletes the connection record
5. Button updates to "🔗 Connect"
6. Notification: "Connection request cancelled"

### Scenario 3: Disconnecting

1. User clicks "✓ Connected" button
2. Confirmation dialog: "You are already connected with this tutor. Do you want to disconnect?"
3. If user confirms → Sends PUT request to `/api/connections/{id}` with status = 'disconnect'
4. Database updates connection status to 'disconnect'
5. Button updates to "🔄 Reconnect"
6. Notification: "Disconnected successfully"

### Scenario 4: Not Logged In

1. User clicks "🔗 Connect" button
2. Error notification: "Please log in to connect with tutors"
3. Auth modal opens automatically (if available)
4. No database interaction

## Testing Instructions

### Prerequisites

1. **Backend running:**
   ```bash
   cd astegni-backend
   python app.py
   ```

2. **Frontend running:**
   ```bash
   # From project root
   python -m http.server 8080
   ```

3. **User logged in:**
   - You need to be logged in as a student/parent/any user
   - Token must be stored in localStorage

### Test Cases

#### Test 1: Send Connection Request

1. Open: http://localhost:8080/view-profiles/view-tutor.html?id=1
2. Make sure you're logged in
3. Check browser console:
   ```
   ✅ Connection Manager: Checking connection status for tutor user ID: 85
   Connection status: { is_connected: false, status: null, ... }
   ```
4. Button should show: "🔗 Connect"
5. Click the "Connect" button
6. Browser console should show:
   ```
   POST http://localhost:8000/api/connections 201
   ```
7. Notification appears: "Connection request sent successfully!"
8. Button updates to: "⏳ Connecting..."

#### Test 2: Verify Database Entry

1. After sending connection request, check database:
   ```bash
   cd astegni-backend
   python -c "
   from models import Connection, SessionLocal
   db = SessionLocal()
   conn = db.query(Connection).order_by(Connection.id.desc()).first()
   print(f'Connection ID: {conn.id}')
   print(f'User 1: {conn.user_id_1}')
   print(f'User 2: {conn.user_id_2}')
   print(f'Type: {conn.connection_type}')
   print(f'Status: {conn.status}')
   print(f'Created: {conn.created_at}')
   "
   ```

Expected output:
```
Connection ID: 123
User 1: 42
User 2: 85
Type: connect
Status: connecting
Created: 2025-01-26 10:30:00
```

#### Test 3: Cancel Connection Request

1. Refresh the page: http://localhost:8080/view-profiles/view-tutor.html?id=1
2. Button should show: "⏳ Connecting..." (status persists)
3. Click the button
4. Confirm cancellation in dialog
5. Notification: "Connection request cancelled"
6. Button updates to: "🔗 Connect"
7. Database record should be deleted

#### Test 4: Not Logged In

1. Clear localStorage:
   ```javascript
   localStorage.clear();
   ```
2. Refresh page
3. Button should show: "🔗 Connect"
4. Click button
5. Error notification: "Please log in to connect with tutors"
6. No database interaction

#### Test 5: Connection Status Persistence

1. Send connection request
2. Refresh page multiple times
3. Button should always show: "⏳ Connecting..."
4. Status is persisted in database and checked on each page load

## API Endpoints Used

### 1. Check Connection Status
```
POST /api/connections/check
Headers: Authorization: Bearer {token}
Body: { target_user_id: 85 }
```

### 2. Send Connection Request
```
POST /api/connections
Headers: Authorization: Bearer {token}
Body: {
  target_user_id: 85,
  connection_type: "connect",
  connection_message: null
}
```

### 3. Cancel Connection Request
```
DELETE /api/connections/{connection_id}
Headers: Authorization: Bearer {token}
```

### 4. Disconnect
```
PUT /api/connections/{connection_id}
Headers: Authorization: Bearer {token}
Body: { status: "disconnect" }
```

## Files Modified

1. ✅ **Created:** `js/view-tutor/connection-manager.js` (355 lines)
2. ✅ **Modified:** `view-profiles/view-tutor.html`
   - Added connection-manager.js script import
   - Replaced `connectTutor()` function (76 lines)
   - Added connection manager initialization script (39 lines)
3. ✅ **Modified:** `js/view-tutor/view-tutor-db-loader.js`
   - Added `window.currentTutorData = data.profile;` in `loadMainProfile()`

## Error Handling

### Authentication Errors (401)
- Shows notification: "Authentication required. Please log in."
- Opens auth modal if available
- No database interaction

### Connection Already Exists (400)
- Shows notification with existing status
- Example: "Connection already exists with status: connecting"

### Network Errors
- Shows notification: "Failed to process connection request"
- Button resets to previous state
- Console error logged for debugging

### Missing Tutor Data
- Shows notification: "Unable to connect: Tutor information not found"
- Button disabled

## Notifications System

Notifications appear in the top-right corner with:
- **Success** (green): Connection request sent, disconnected
- **Error** (red): Failed requests, authentication errors
- **Info** (blue): Request cancelled, general information

Notifications auto-dismiss after 3 seconds with slide-in/slide-out animation.

## Future Enhancements

Potential improvements for Phase 2:

1. **Real-time Updates:**
   - WebSocket integration to notify when connection is accepted
   - Live button update when tutor accepts/rejects request

2. **Connection Message:**
   - Add input field for personalized message when connecting
   - Display message in tutor's connection requests panel

3. **Connection Management Page:**
   - Dedicated page to view all connections
   - Filter by status (pending, connected, etc.)
   - Bulk actions (accept all, reject all)

4. **Mutual Connections:**
   - Show "Mutual Connections: 5 people" in profile
   - Display common connections list

5. **Connection Suggestions:**
   - "People you may know" based on subjects, location
   - AI-powered tutor recommendations

## Troubleshooting

### Button doesn't update after clicking
- Check browser console for errors
- Verify backend is running on port 8000
- Verify connection endpoints are registered in `app.py`
- Check network tab for API response

### Connection status not persisting
- Verify database connection
- Check if connection record was created
- Verify user_id matches in database

### "Tutor user ID not found" error
- Ensure view-tutor-db-loader.js loads before connection manager
- Check `window.currentTutorData` is set
- Verify API endpoint `/api/view-tutor/{id}` returns user_id

### Button shows wrong status
- Clear browser cache and localStorage
- Verify connection record in database
- Check `checkConnectionStatus()` response in console

## Support

For issues or questions:
1. Check browser console for detailed error messages
2. Verify all API endpoints are accessible (http://localhost:8000/docs)
3. Check database for connection records
4. Review this documentation for expected behavior

## Success Criteria

✅ Connection request creates database record
✅ Connection status persists across page refreshes
✅ Button UI updates automatically based on status
✅ Users receive clear feedback via notifications
✅ Authentication is required and verified
✅ Database connections table is properly used
✅ All connection statuses are handled correctly

**Status: COMPLETE AND READY FOR TESTING**
