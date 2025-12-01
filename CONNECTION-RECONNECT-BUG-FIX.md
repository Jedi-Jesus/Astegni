# Connection Reconnect Bug Fix

## Problem
When a user disconnects from a tutor in `view-tutor.html` and tries to reconnect again, the system shows an error:
```
"Connection already exists with status: disconnect"
```

The reconnect button doesn't work because the old connection record with status `disconnect` still exists in the database.

## Root Cause
The backend (`connection_endpoints.py:94-98`) prevents creating a new connection if ANY connection already exists between the two users, including those with status `disconnect`:

```python
if existing_connection:
    raise HTTPException(
        status_code=400,
        detail=f"Connection already exists with status: {existing_connection.status}"
    )
```

## Solution
Updated the `sendConnectionRequest()` method in `js/view-tutor/connection-manager.js` to automatically handle this case:

### What Changed
1. **Detect disconnected connections**: When a 400 error is returned with the message "Connection already exists with status: disconnect"
2. **Auto-delete the old connection**: Call `cancelConnectionRequest()` to delete the disconnected connection
3. **Retrieve connection ID if needed**: If the connection ID is not in cache (e.g., after page refresh), fetch it using `checkConnectionStatus()`
4. **Retry automatically**: After deleting the old connection, retry the connection request

### Code Flow
```
User clicks "Reconnect"
  ↓
sendConnectionRequest() → POST /api/connections
  ↓
Backend returns 400: "Connection already exists with status: disconnect"
  ↓
Get connection ID (from cache or checkConnectionStatus)
  ↓
cancelConnectionRequest() → DELETE /api/connections/{id}
  ↓
Retry sendConnectionRequest() → POST /api/connections
  ↓
✅ Success: New connection created with status: connecting
```

## Files Modified
- `js/view-tutor/connection-manager.js` - Added automatic disconnected connection cleanup in `sendConnectionRequest()` method (lines 140-173)

## Testing Steps
1. Open `http://localhost:8080/view-profiles/view-tutor.html?id=1`
2. Log in as a user
3. Click "Connect" button
4. Click "Connected" → Confirm disconnect
5. Button should now show "🔄 Reconnect"
6. Click "🔄 Reconnect"
7. ✅ Should successfully send a new connection request without errors

## Alternative Approach Considered
We could have modified the backend to allow reconnecting by updating the existing connection's status from 'disconnect' to 'connecting', but deleting and recreating provides a cleaner slate and maintains the connection creation flow.

## Edge Cases Handled
- ✅ Reconnect after disconnect (same session)
- ✅ Reconnect after page refresh (connection ID lost from memory)
- ✅ Multiple reconnect attempts
- ✅ Network errors during cleanup

## Status
✅ **FIXED** - Users can now reconnect after disconnecting without any errors
