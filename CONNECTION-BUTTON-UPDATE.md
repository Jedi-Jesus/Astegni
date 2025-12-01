# Connection Button Update - Simplified Schema

## Overview
Updated `connection-manager.js` to work with the new simplified `connections` table schema.

## Database Schema Changes

### Old Schema (Removed)
- Multiple status values: `connecting`, `connected`, `disconnect`, `connection_failed`, `blocked`
- Complex connection types
- Connection messages

### New Schema (Current)
```sql
connections table:
  id: INTEGER
  requested_by: INTEGER       -- User ID who initiated request
  requester_type: VARCHAR(50) -- Role: tutor, student, parent, advertiser
  recipient_id: INTEGER        -- User ID receiving request
  recipient_type: VARCHAR(50)  -- Role: tutor, student, parent, advertiser
  status: VARCHAR(50)          -- pending, accepted, rejected, blocked
  requested_at: TIMESTAMP
  connected_at: TIMESTAMP
  updated_at: TIMESTAMP
```

**Status Values:**
- `pending` - Connection request sent, awaiting response
- `accepted` - Connection established and active
- `rejected` - Connection request was rejected
- `blocked` - User has blocked another user

## Files Modified

### connection-manager.js ✅

**1. Updated Documentation (Lines 1-15)**
```javascript
// OLD statuses: connecting, connected, disconnect, connection_failed, blocked
// NEW statuses: pending, accepted, rejected, blocked
```

**2. Updated sendConnectionRequest() (Lines 111-155)**

**Before:**
```javascript
body: JSON.stringify({
    target_user_id: tutorUserId,
    connection_type: 'connect',
    connection_message: message
})
```

**After:**
```javascript
body: JSON.stringify({
    recipient_id: tutorUserId,
    recipient_type: 'tutor'  // Always 'tutor' for view-tutor page
})
```

**3. Updated disconnectFromTutor() (Lines 197-225)**

**Before:** Updated status to 'disconnect'
```javascript
method: 'PUT',
body: JSON.stringify({ status: 'disconnect' })
```

**After:** Delete the connection
```javascript
method: 'DELETE'
```

**4. Updated updateConnectionButtonUI() (Lines 232-331)**

**Status Mapping:**
| Old Status | New Status | Button Display |
|------------|------------|----------------|
| `null` | `null` | 🔗 Connect |
| `connecting` (outgoing) | `pending` (outgoing) | ⏳ Request Pending (dropdown) |
| `connecting` (incoming) | `pending` (incoming) | 📨 Accept Request |
| `connected` | `accepted` | ✓ Connected |
| `disconnect` | *removed* | *(connections are deleted)* |
| `connection_failed` | `rejected` | ✗ Request Declined |
| `blocked` | `blocked` | 🚫 Blocked |

**5. Renamed Method (Line 337)**
- `createConnectingDropdown()` → `createPendingDropdown()`
- Button text: "⏳ Connecting..." → "⏳ Request Pending"

## API Integration

### POST /api/connections
**Request:**
```json
{
  "recipient_id": 86,
  "recipient_type": "tutor"
}
```

**Response:**
```json
{
  "id": 123,
  "requested_by": 45,
  "requester_type": "student",
  "recipient_id": 86,
  "recipient_type": "tutor",
  "status": "pending",
  "requested_at": "2025-01-21T10:30:00Z",
  "connected_at": null,
  "updated_at": "2025-01-21T10:30:00Z"
}
```

### POST /api/connections/check
**Request:**
```json
{
  "target_user_id": 86
}
```

**Response:**
```json
{
  "is_connected": false,
  "status": "pending",
  "direction": "outgoing",
  "connection_id": 123,
  "requested_at": "2025-01-21T10:30:00Z",
  "connected_at": null
}
```

### DELETE /api/connections/{connection_id}
**Response:** `204 No Content`

## Testing

**1. Test Connect Flow:**
```
1. Visit view-tutor.html?id=64
2. Click "🔗 Connect" button
3. Should show "⏳ Request Pending" dropdown
4. Click dropdown → "✗ Cancel Connection"
5. Should return to "🔗 Connect"
```

**2. Test Backend:**
```bash
# Login first to get token
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jediael.s.abebe@gmail.com", "password":"@JesusJediael1234"}'

# Send connection request
curl -X POST http://localhost:8000/api/connections \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipient_id":86, "recipient_type":"tutor"}'

# Check status
curl -X POST http://localhost:8000/api/connections/check \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target_user_id":86}'
```

**3. Expected Behavior:**

| Scenario | Button State | On Click |
|----------|--------------|----------|
| No connection | 🔗 Connect | Send request → ⏳ Request Pending |
| Pending (outgoing) | ⏳ Request Pending | Show dropdown with Cancel option |
| Pending (incoming) | 📨 Accept Request | Accept the connection → ✓ Connected |
| Accepted | ✓ Connected | Show options to disconnect/message |
| Rejected | ✗ Request Declined | Disabled (cannot reconnect) |
| Blocked | 🚫 Blocked | Disabled |

## Breaking Changes

⚠️ **Removed Features:**
- `disconnect` status - connections are now deleted instead
- `connection_message` parameter - not used in current schema
- `connection_type` parameter - replaced with `recipient_type`

✅ **Backward Compatibility:**
- checkConnectionStatus() still returns same structure
- UI states work the same for end users
- Only internal implementation changed

## Summary

| Change | Before | After |
|--------|--------|-------|
| Status count | 5 statuses | 4 statuses (removed disconnect) |
| Disconnect action | Update to 'disconnect' | DELETE connection |
| Request payload | 3 fields | 2 fields |
| API endpoint | Same | Same |
| UI states | 7 states | 6 states |

**Status:** ✅ Complete - Ready for testing

**Last Updated:** 2025-01-21
