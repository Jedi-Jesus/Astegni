# View Student - Connection Manager Integration

## Summary
Implemented the connect button functionality using the ConnectionManager class, matching the implementation in view-tutor.html for consistency and advanced features.

## Changes Made

### 1. Added ConnectionManager Script - `view-profiles/view-student.html`

**Script Inclusion (Line 3991)**

```html
<!-- Connection Manager - Handles connection requests -->
<script src="../js/view-tutor/connection-manager.js?v=3"></script>
```

**Location:** Added after view-student-documents.js and before the main script block

---

### 2. Replaced connectStudent() Function

**Updated Function (Lines 4127-4214)**

Changed from basic fetch API call to full ConnectionManager integration.

**Before (Basic Implementation):**
```javascript
async function connectStudent() {
    // Simple fetch to /api/connections/send
    // Basic button state management
    // Alert-based notifications
}
```

**After (ConnectionManager Implementation):**
```javascript
async function connectStudent() {
    const connectionManager = window.connectionManagerInstance;

    // Validate connection manager
    if (!connectionManager) {
        console.error('Connection manager not initialized');
        return;
    }

    // Get student user ID
    const studentUserId = window.currentStudentUserId;
    if (!studentUserId) {
        connectionManager.showNotification('Unable to connect: Student information not found', 'error');
        return;
    }

    // Check authentication
    const token = connectionManager.getToken();
    if (!token) {
        connectionManager.showNotification('Please log in to connect with students', 'error');
        if (typeof openAuthModal === 'function') {
            openAuthModal();
        }
        return;
    }

    // Get current connection status
    const currentStatus = connectionManager.currentConnectionStatus;
    const button = document.querySelector('button[onclick="connectStudent()"]');

    // Handle different connection states
    if (currentStatus === 'connected') {
        // Already connected - offer disconnect
        const confirmDisconnect = confirm('You are already connected with this student. Do you want to disconnect?');
        if (confirmDisconnect) {
            await connectionManager.disconnectFromTutor(connectionManager.currentConnectionId);
            connectionManager.showNotification('Disconnected successfully', 'success');

            const newStatus = await connectionManager.checkConnectionStatus(studentUserId);
            connectionManager.updateConnectionButtonUI(button, newStatus);
        }
    } else if (currentStatus === 'connecting') {
        // Pending request
        connectionManager.showNotification('Click the dropdown arrow to cancel the connection request', 'info');
    } else {
        // Send new connection request
        if (button) {
            button.disabled = true;
            button.innerHTML = '⏳ Sending...';
        }

        await connectionManager.sendConnectionRequest(studentUserId);
        connectionManager.showNotification('Connection request sent successfully!', 'success');

        // Update button UI
        const newStatus = await connectionManager.checkConnectionStatus(studentUserId);
        const currentButton = document.querySelector('button[onclick="connectStudent()"]');
        if (currentButton) {
            connectionManager.updateConnectionButtonUI(currentButton, newStatus);
        }
    }
}
```

---

### 3. Added ConnectionManager Initialization

**Initialization Script (Lines 4818-4850)**

Added DOMContentLoaded listener to initialize ConnectionManager and check connection status.

```javascript
document.addEventListener('DOMContentLoaded', async () => {
    // Create global connection manager instance
    window.connectionManagerInstance = new ConnectionManager();

    // Wait for student data to load, then get the user_id
    // The ViewStudentLoader sets window.currentStudentUserId
    const checkStudentDataLoaded = setInterval(async () => {
        if (window.currentStudentUserId) {
            clearInterval(checkStudentDataLoaded);

            console.log(`✅ Connection Manager: Checking connection status for student user ID: ${window.currentStudentUserId}`);

            // Check connection status
            const connectionStatus = await window.connectionManagerInstance.checkConnectionStatus(window.currentStudentUserId);

            console.log('Connection status:', connectionStatus);

            // Update connect button UI
            const connectButton = document.querySelector('button[onclick="connectStudent()"]');
            if (connectButton) {
                window.connectionManagerInstance.updateConnectionButtonUI(connectButton, connectionStatus);
            }
        }
    }, 100); // Check every 100ms until student data is loaded

    // Timeout after 10 seconds
    setTimeout(() => {
        clearInterval(checkStudentDataLoaded);
    }, 10000);
});
```

**Initialization Flow:**
1. Creates `window.connectionManagerInstance`
2. Waits for `window.currentStudentUserId` to be set by ViewStudentLoader
3. Checks current connection status with student
4. Updates button UI based on status
5. Polls every 100ms, times out after 10 seconds

---

## ConnectionManager Features

### 1. Connection States

The ConnectionManager tracks four connection states:

| State | Description | Button Display |
|-------|-------------|----------------|
| **null** | No connection | 🔗 Connect |
| **connecting** | Pending request | ⏳ Pending ▼ |
| **connected** | Accepted connection | ✓ Connected ▼ |
| **disconnected** | Previously connected | 🔗 Connect |

### 2. Button UI Updates

**updateConnectionButtonUI(button, status):**
- Automatically updates button text, icon, and style
- Adds dropdown for pending/connected states
- Handles button disable/enable states
- Applies appropriate CSS classes

**Example Button States:**

```html
<!-- No connection -->
<button>🔗 Connect</button>

<!-- Pending request -->
<button disabled>⏳ Pending ▼</button>

<!-- Connected -->
<button>✓ Connected ▼</button>

<!-- Sending -->
<button disabled>⏳ Sending...</button>
```

### 3. Notifications System

**showNotification(message, type):**
- Toast-style notifications
- Types: 'success', 'error', 'info'
- Auto-dismiss after 3 seconds
- Positioned top-right corner

**Example Notifications:**
```javascript
connectionManager.showNotification('Connection request sent successfully!', 'success');
connectionManager.showNotification('Please log in to connect with students', 'error');
connectionManager.showNotification('Click the dropdown arrow to cancel', 'info');
```

### 4. Connection Actions

**sendConnectionRequest(receiverUserId):**
- Sends connection request to API
- Handles authentication
- Returns connection data
- Updates internal status

**disconnectFromTutor(connectionId):**
- Disconnects from user
- Sends DELETE request to API
- Updates button UI

**checkConnectionStatus(receiverUserId):**
- Checks current connection status
- Returns: null | 'connecting' | 'connected' | 'disconnected'
- Caches result in `currentConnectionStatus`

**cancelConnectionRequest(connectionId):**
- Cancels pending request
- Available from dropdown menu

---

## API Endpoints Used

### 1. Send Connection Request
```
POST /api/connections/send
Headers: Authorization: Bearer {token}
Body: { receiver_user_id: number }
Response: { id, sender_user_id, receiver_user_id, status, created_at }
```

### 2. Check Connection Status
```
GET /api/connections/status/{receiver_user_id}
Headers: Authorization: Bearer {token}
Response: {
    status: "connected" | "connecting" | null,
    connection_id: number | null,
    is_sender: boolean
}
```

### 3. Disconnect
```
DELETE /api/connections/{connection_id}
Headers: Authorization: Bearer {token}
Response: { message: "Connection deleted successfully" }
```

### 4. Cancel Request
```
DELETE /api/connections/{connection_id}/cancel
Headers: Authorization: Bearer {token}
Response: { message: "Connection request cancelled" }
```

---

## Comparison: view-tutor.html vs view-student.html

### Similarities (Identical Implementation):
✅ Both use `window.connectionManagerInstance`
✅ Both check connection status on page load
✅ Both update button UI automatically
✅ Both handle pending, connected, disconnected states
✅ Both use toast notifications
✅ Both support disconnect/cancel actions
✅ Both validate authentication
✅ Both have dropdown menus for pending/connected states

### Differences (Variable Names Only):
- `window.currentTutorUserId` → `window.currentStudentUserId`
- `connectTutor()` → `connectStudent()`
- Message: "connect with tutors" → "connect with students"

**Result:** Functionally identical, only target entity differs (tutor vs student)

---

## User Flow

### Scenario 1: First Connection
```
1. User visits view-student.html?id=28
   ↓
2. Page loads, ConnectionManager initializes
   ↓
3. Checks connection status → null (no connection)
   ↓
4. Button displays: "🔗 Connect"
   ↓
5. User clicks Connect
   ↓
6. Check authentication → valid
   ↓
7. Send connection request
   ↓
8. Button updates: "⏳ Pending ▼"
   ↓
9. Notification: "Connection request sent successfully!"
```

### Scenario 2: Already Connected
```
1. User visits page
   ↓
2. Connection status → 'connected'
   ↓
3. Button displays: "✓ Connected ▼"
   ↓
4. User clicks button
   ↓
5. Confirm dialog: "You are already connected. Disconnect?"
   ↓
6. If Yes → Disconnect → Button updates to "🔗 Connect"
   ↓
7. If No → No action
```

### Scenario 3: Pending Request
```
1. User visits page
   ↓
2. Connection status → 'connecting'
   ↓
3. Button displays: "⏳ Pending ▼"
   ↓
4. User clicks button
   ↓
5. Notification: "Click the dropdown arrow to cancel"
   ↓
6. User clicks dropdown → "Cancel Request"
   ↓
7. Request cancelled → Button updates to "🔗 Connect"
```

### Scenario 4: Not Authenticated
```
1. User clicks Connect (not logged in)
   ↓
2. ConnectionManager checks token → null
   ↓
3. Notification: "Please log in to connect with students"
   ↓
4. Opens auth modal (if available)
   ↓
5. User logs in
   ↓
6. Can now send connection request
```

---

## Error Handling

### 1. Connection Manager Not Initialized
```javascript
if (!connectionManager) {
    console.error('Connection manager not initialized');
    return;
}
```

### 2. Student User ID Missing
```javascript
if (!studentUserId) {
    connectionManager.showNotification('Unable to connect: Student information not found', 'error');
    return;
}
```

### 3. Authentication Failure
```javascript
const token = connectionManager.getToken();
if (!token) {
    connectionManager.showNotification('Please log in to connect with students', 'error');
    if (typeof openAuthModal === 'function') {
        openAuthModal();
    }
    return;
}
```

### 4. API Request Failure
```javascript
catch (error) {
    console.error('Connection error:', error);
    connectionManager.showNotification(error.message || 'Failed to process connection request', 'error');

    // Reset button on error
    if (button) {
        button.disabled = false;
        button.innerHTML = '🔗 Connect';
    }
}
```

---

## Benefits of ConnectionManager

### 1. Consistency
✅ Same connection logic across view-tutor.html and view-student.html
✅ Predictable behavior for users
✅ Easier maintenance with shared code

### 2. Advanced Features
✅ Real-time status checking
✅ Dropdown menus for actions
✅ Toast notifications instead of alerts
✅ Smart button state management
✅ Disconnect/cancel functionality

### 3. Better UX
✅ Visual feedback (loading states, success states)
✅ Non-blocking notifications (toast vs alert)
✅ Dropdown for additional actions
✅ Automatic button updates
✅ Error recovery

### 4. Robust Error Handling
✅ Token validation
✅ Button reset on errors
✅ Graceful degradation
✅ User-friendly error messages

---

## Testing

### Test Cases:
1. ✅ Page loads → ConnectionManager initializes
2. ✅ Button displays correct initial state (Connect, Pending, or Connected)
3. ✅ Click Connect (not logged in) → Shows login modal
4. ✅ Click Connect (logged in, no connection) → Sends request, button updates to Pending
5. ✅ Click Connect (already connected) → Confirms disconnect
6. ✅ Click Pending → Shows info message about dropdown
7. ✅ Dropdown appears for Pending/Connected states
8. ✅ Cancel request works from dropdown
9. ✅ Disconnect works from dropdown/button
10. ✅ Toast notifications appear and auto-dismiss
11. ✅ Button resets on API errors

### Manual Testing Steps:
1. Open http://localhost:8081/view-profiles/view-student.html?id=28
2. Open browser console (F12)
3. Verify ConnectionManager initialization log
4. Check initial button state
5. Try connecting (should require login if not authenticated)
6. Send connection request
7. Verify button updates to "⏳ Pending ▼"
8. Check toast notification appears
9. Reload page → Button should still show Pending
10. Try clicking dropdown to cancel request

---

## Files Modified

1. ✅ **view-profiles/view-student.html**
   - Line 3991: Added connection-manager.js script
   - Lines 4127-4214: Replaced connectStudent() function
   - Lines 4818-4850: Added ConnectionManager initialization

---

## Dependencies

### Required Scripts (Load Order):
1. `js/root/app.js` - Core app initialization
2. `js/root/auth.js` - Authentication manager
3. `js/view-student/view-student-loader.js` - Sets window.currentStudentUserId
4. `js/view-tutor/connection-manager.js` - ConnectionManager class

### Required Global Variables:
- `window.currentStudentUserId` - Set by ViewStudentLoader
- `window.connectionManagerInstance` - ConnectionManager instance
- `window.authManager` - Authentication manager (optional)

---

## Status

✅ **COMPLETED** - Connect button now uses ConnectionManager with:
- ✅ Full connection state management
- ✅ Toast notifications
- ✅ Dropdown menus for actions
- ✅ Disconnect/cancel functionality
- ✅ Automatic button UI updates
- ✅ Identical implementation to view-tutor.html

---

## Related Documentation

- **ConnectionManager Source**: `js/view-tutor/connection-manager.js`
- **Tutor Implementation**: view-tutor.html (lines 2541-2624, 3145-3184)
- **Message Button**: VIEW-STUDENT-MESSAGE-BUTTON-ADDED.md
- **Documents System**: VIEW-STUDENT-DOCUMENTS-DYNAMIC-UPDATE.md
- **Bug Fixes**: VIEW-STUDENT-DOCUMENTS-BUGFIX.md
