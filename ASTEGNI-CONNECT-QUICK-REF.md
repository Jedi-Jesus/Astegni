# Astegni Connect - Quick Reference

## Terminology (DO NOT use Facebook/Instagram terms!)

### Connection Types
```
✅ 'connect'  - Astegni's unique connection type
✅ 'block'    - User blocking
❌ 'follow'   - DON'T use this (that's Instagram)
❌ 'friend'   - DON'T use this (that's Facebook)
```

### Connection Status
```
✅ 'connecting'         - Request pending
✅ 'connected'          - Connection active
✅ 'disconnect'         - Connection ended
✅ 'connection_failed'  - Request rejected
✅ 'blocked'            - User blocked

❌ 'pending'   - DON'T use (use 'connecting')
❌ 'accepted'  - DON'T use (use 'connected')
❌ 'rejected'  - DON'T use (use 'connection_failed')
```

---

## API Quick Reference

### Send Connect Request
```bash
POST /api/connections
{
  "target_user_id": 123,
  "connection_type": "connect"
}
```

### Accept Request
```bash
PUT /api/connections/{id}
{
  "status": "connected"
}
```

### Reject Request
```bash
PUT /api/connections/{id}
{
  "status": "connection_failed"
}
```

### Disconnect
```bash
PUT /api/connections/{id}
{
  "status": "disconnect"
}
```

### Block User
```bash
POST /api/connections
{
  "target_user_id": 123,
  "connection_type": "block"
}
```

### Check Status
```bash
POST /api/connections/check
{
  "target_user_id": 123
}
```

### Get Stats
```bash
GET /api/connections/stats
```

---

## Frontend Button Labels

### Button Text (Use These)
```
✅ "Connect"              - Initial state
✅ "Request Sent"         - Status: connecting
✅ "Accept Request"       - Incoming request
✅ "Decline"              - Incoming request
✅ "Connected ✓"          - Status: connected
✅ "Disconnect"           - End connection
✅ "Block User"           - Block action

❌ "Follow"       - NO (that's Instagram)
❌ "Add Friend"   - NO (that's Facebook)
❌ "Following"    - NO (that's Instagram)
❌ "Friends"      - NO (that's Facebook)
❌ "Unfollow"     - NO (that's Instagram)
❌ "Unfriend"     - NO (that's Facebook)
```

---

## Database Schema
```sql
connections table:
- connection_type: 'connect' or 'block'
- status: 'connecting', 'connected', 'disconnect', 'connection_failed', 'blocked'
- connected_at (NOT accepted_at)
```

---

## Status Lifecycle
```
NOT CONNECTED
     ↓
[connecting] → User sends request
     ↓
[connected] → Request accepted ✓
     OR
[connection_failed] → Request rejected ✗
     ↓
[disconnect] → Either party ends it
```

---

## Files to Know

1. **Backend:**
   - `app.py modules/models.py` - Connection model
   - `connection_endpoints.py` - API endpoints
   - `migrate_to_astegni_terminology.py` - Migration

2. **Documentation:**
   - `ASTEGNI-CONNECT-SYSTEM.md` - Full guide
   - `ASTEGNI-CONNECT-COMPLETE.md` - Summary
   - `ASTEGNI-CONNECT-QUICK-REF.md` - This file

3. **API:**
   - http://localhost:8000/docs - Swagger UI

---

## Key Points

1. **Astegni uses "Connect"** - NOT "follow" or "friend"
2. **Status is "connecting"** - NOT "pending"
3. **Status is "connected"** - NOT "accepted"
4. **Column is "connected_at"** - NOT "accepted_at"
5. **One connection type** - "connect" (simple!)

---

## Migration Status

✅ Database migrated
✅ 2 connections updated
✅ Models use Astegni terms
✅ API endpoints ready
✅ Documentation complete

---

**Remember: Astegni Connect is UNIQUE - not copied from anyone!** 🎓
