# Astegni Connect System - Official Documentation

## Overview

Astegni proudly introduces its own unique "**Connect**" system - NOT borrowed from Facebook, Instagram, or any other platform. This is Astegni's original terminology for user connections.

---

## Astegni's Connection Terminology

### Connection Types

| Type | Description |
|------|-------------|
| **connect** | Standard Astegni connection between users |
| **block** | User blocking |

**Note**: Astegni does NOT use "follow" or "friend" - we use **Connect**!

### Connection Status (Astegni's Unique Terms)

| Status | Meaning | When Used |
|--------|---------|-----------|
| **connecting** | Connection request sent, awaiting response | User A requests to connect with User B |
| **connected** | Connection established and active | User B accepted the request |
| **disconnect** | Connection was terminated | Either party ended the connection |
| **connection_failed** | Connection request was rejected | User B declined the request |
| **blocked** | User has blocked another user | User A blocked User B |

---

## Database Schema

```sql
CREATE TABLE connections (
    id SERIAL PRIMARY KEY,
    user_id_1 INTEGER NOT NULL REFERENCES users(id),
    user_id_2 INTEGER NOT NULL REFERENCES users(id),

    connection_type VARCHAR(20) DEFAULT 'connect',  -- 'connect' or 'block'
    status VARCHAR(20) DEFAULT 'connecting',        -- Astegni statuses

    initiated_by INTEGER NOT NULL REFERENCES users(id),
    connection_message TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    connected_at TIMESTAMP,  -- When status changed to 'connected'
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### 1. Create Connection (Send Connect Request)

```http
POST /api/connections
Authorization: Bearer {token}

{
  "target_user_id": 123,
  "connection_type": "connect",
  "connection_message": "Hi! Let's connect on Astegni!"
}
```

**Response:**
```json
{
  "id": 1,
  "user_id_1": 98,
  "user_id_2": 123,
  "connection_type": "connect",
  "status": "connecting",
  "connection_message": "Hi! Let's connect on Astegni!",
  "created_at": "2025-01-15T10:30:00"
}
```

### 2. Accept Connection Request

```http
PUT /api/connections/{connection_id}
Authorization: Bearer {token}

{
  "status": "connected"
}
```

### 3. Reject Connection Request

```http
PUT /api/connections/{connection_id}
Authorization: Bearer {token}

{
  "status": "connection_failed"
}
```

### 4. Disconnect

```http
PUT /api/connections/{connection_id}
Authorization: Bearer {token}

{
  "status": "disconnect"
}
```

### 5. Block User

```http
POST /api/connections
Authorization: Bearer {token}

{
  "target_user_id": 123,
  "connection_type": "block"
}
```

### 6. Get My Connections

```http
GET /api/connections?status=connected
Authorization: Bearer {token}
```

### 7. Get Connection Statistics

```http
GET /api/connections/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "total_connections": 150,
  "connecting_count": 10,
  "connected_count": 150,
  "incoming_requests": 5,
  "outgoing_requests": 5,
  "disconnected_count": 3,
  "failed_count": 2,
  "blocked_count": 1
}
```

### 8. Check Connection Status

```http
POST /api/connections/check
Authorization: Bearer {token}

{
  "target_user_id": 123
}
```

**Response:**
```json
{
  "is_connected": true,
  "connection_type": "connect",
  "status": "connected",
  "direction": "outgoing",
  "connected_at": "2025-01-15T10:35:00"
}
```

---

## Connection Flow

### Student Connecting with Tutor

```
1. Student sends connect request
   POST /api/connections
   {
     "target_user_id": tutor_id,
     "connection_type": "connect"
   }

   Status: "connecting"

2. Tutor accepts
   PUT /api/connections/{id}
   {
     "status": "connected"
   }

   Status: "connected"

3. Now both can see each other in connections
   GET /api/connections?status=connected
```

### Connection Status Lifecycle

```
Initial Request
    |
    v
[connecting] ---reject---> [connection_failed]
    |
    accept
    |
    v
[connected] ---disconnect---> [disconnect]
```

---

## Frontend Integration

### Check if Already Connected

```javascript
async function checkConnectionStatus(userId) {
    const response = await fetch('http://localhost:8000/api/connections/check', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ target_user_id: userId })
    });

    const data = await response.json();

    if (data.is_connected) {
        console.log('Connected!');
        // Show "Connected" or "Disconnect" button
    } else if (data.status === 'connecting') {
        console.log('Request pending...');
        // Show "Request Sent" button
    } else {
        console.log('Not connected');
        // Show "Connect" button
    }
}
```

### Send Connect Request

```javascript
async function connectWithUser(userId) {
    const response = await fetch('http://localhost:8000/api/connections', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            target_user_id: userId,
            connection_type: 'connect',
            connection_message: "Hi! Let's connect on Astegni!"
        })
    });

    if (response.ok) {
        const data = await response.json();
        console.log('Connect request sent!');
        // Update UI: "Connect" -> "Request Sent"
    }
}
```

### Accept Connection Request

```javascript
async function acceptConnection(connectionId) {
    const response = await fetch(`http://localhost:8000/api/connections/${connectionId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            status: 'connected'
        })
    });

    if (response.ok) {
        console.log('Connection accepted!');
        // Update UI and refresh connections list
    }
}
```

### Show Connection Stats

```javascript
async function loadConnectionStats() {
    const response = await fetch('http://localhost:8000/api/connections/stats', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const stats = await response.json();

    document.getElementById('connected-count').textContent = stats.connected_count;
    document.getElementById('requests-count').textContent = stats.incoming_requests;
}
```

---

## UI Button States

### Profile Page Button

```
State: Not Connected
Button: [+ Connect]
Color: Primary (blue)

State: connecting (outgoing)
Button: [Request Sent]
Color: Secondary (gray)
Disabled: true

State: connecting (incoming)
Button: [Accept Request] or [Decline]
Color: Primary (blue) / Secondary (gray)

State: connected
Button: [Connected ✓]
Dropdown: - Disconnect
          - Block User
Color: Success (green)

State: blocked
Button: [Blocked]
Color: Danger (red)
Disabled: true
```

---

## Migration Complete

### Before & After

**Before (Generic Terms):**
- connection_type: 'follow', 'friend'
- status: 'pending', 'accepted', 'rejected'
- Column: accepted_at

**After (Astegni Terms):**
- connection_type: 'connect', 'block'
- status: 'connecting', 'connected', 'disconnect', 'connection_failed', 'blocked'
- Column: connected_at

---

## Key Differences from Other Platforms

| Platform | Term | Astegni Term |
|----------|------|--------------|
| Facebook | Friend Request | Connect Request |
| Facebook | Friends | Connected |
| Instagram | Follow | Connect |
| Instagram | Followers | Connected Users |
| Twitter | Follow | Connect |
| LinkedIn | Connection | Connect (same!) |

**Astegni's terminology is unique and memorable!**

---

## Statistics Dashboard Example

```
┌─────────────────────────────────────┐
│  My Connections                     │
├─────────────────────────────────────┤
│  Connected:         150             │
│  Connecting:         10             │
│  Incoming Requests:   5             │
│  Outgoing Requests:   5             │
│                                     │
│  Disconnected:        3             │
│  Failed:              2             │
│  Blocked:             1             │
└─────────────────────────────────────┘
```

---

## Testing

### Quick Test

```bash
# 1. Check current connections
curl http://localhost:8000/api/connections/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Send connect request
curl -X POST http://localhost:8000/api/connections \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_user_id": 2,
    "connection_type": "connect",
    "connection_message": "Hi!"
  }'

# 3. Check status
curl -X POST http://localhost:8000/api/connections/check \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target_user_id": 2}'
```

---

## Summary

✅ **Database migrated** to Astegni terminology
✅ **Models updated** with Astegni terms
✅ **API endpoints** using Astegni's unique terminology
✅ **9 comprehensive endpoints** for complete connection management
✅ **2 existing connections** migrated successfully

**Astegni Connect is ready to use!** 🚀

---

## Files Modified

- ✅ `app.py modules/models.py` - Connection model with Astegni terminology
- ✅ `connection_endpoints.py` - API endpoints with Astegni terms
- ✅ `migrate_to_astegni_terminology.py` - Database migration script
- ✅ Database: `connections` table - Updated columns and values

---

**Next Steps:**

1. Test endpoints at http://localhost:8000/docs
2. Update frontend to use "Connect" terminology
3. Add "Connect" buttons to profile pages
4. Update UI to show Astegni's connection statuses

---

**Astegni Connect - Proudly Original!** 🎓
