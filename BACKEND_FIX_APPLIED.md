# Backend Database Schema Fixes Applied

## Issues Fixed

### 1. **`cp.is_archived` Column Missing**
**Error:**
```
column cp.is_archived does not exist
LINE 12: cp.is_archived,
HINT: Perhaps you meant to reference the column "c.is_archived".
```

**Fix:**
Changed `cp.is_archived` to `c.is_archived` in GET `/api/chat/conversations` endpoint.

**File:** `astegni-backend/chat_endpoints.py:388`

```python
# BEFORE
cp.is_archived,

# AFTER
c.is_archived,
```

**Reason:** The `conversation_participants` table doesn't have `is_archived` column. It exists in the `conversations` table.

---

### 2. **`c.created_at` Column Missing in Connections Table**
**Error:**
```
column c.created_at does not exist
LINE 4: c.status, c.created_at
HINT: Perhaps you meant to reference the column "c.updated_at".
```

**Fix:**
Changed `c.created_at` to `c.requested_at` in connection requests queries.

**File:** `astegni-backend/chat_endpoints.py:225, 256`

```python
# BEFORE
SELECT c.id, c.requester_profile_id, c.requester_type,
       c.recipient_profile_id, c.recipient_type,
       c.status, c.created_at
FROM connections c
ORDER BY c.created_at DESC

# AFTER
SELECT c.id, c.requester_profile_id, c.requester_type,
       c.recipient_profile_id, c.recipient_type,
       c.status, c.requested_at as created_at
FROM connections c
ORDER BY c.requested_at DESC
```

**Reason:** The `connections` table has `requested_at` column, not `created_at`.

---

## Database Schema Reference

### `conversations` table:
- ✅ `is_archived` - EXISTS
- ✅ `is_muted` - EXISTS
- ✅ `created_at` - EXISTS

### `conversation_participants` table:
- ✅ `is_muted` - EXISTS
- ✅ `is_pinned` - EXISTS
- ❌ `is_archived` - DOES NOT EXIST (use `conversations.is_archived` instead)

### `connections` table:
- ✅ `requested_at` - EXISTS
- ✅ `connected_at` - EXISTS
- ✅ `updated_at` - EXISTS
- ❌ `created_at` - DOES NOT EXIST (use `requested_at` instead)

---

## Next Steps

### 1. Restart Backend
```bash
# Stop current backend (Ctrl+C)
# Then restart:
cd astegni-backend
python app.py
```

### 2. Test in Browser
```bash
# Hard refresh browser
Ctrl + Shift + R

# Click Message button
# Should now load conversations without 500 errors
```

### 3. Expected Results
- ✅ `/api/chat/conversations?user_id=1` returns 200 OK
- ✅ `/api/chat/connection-requests?user_id=1` returns 200 OK
- ✅ Conversations load in chat modal
- ✅ Connection requests load properly

---

## Remaining Issues (Not Schema Related)

These will still show until further backend updates:

1. **WebSocket Connection** - Needs user-based WebSocket endpoint
   ```
   ws://localhost:8000/ws/{user_id}  # Instead of /ws/{profile_id}/{profile_type}
   ```

2. **User Status Update** - 422 error
   ```
   POST /api/chat/users/status/update
   ```
   Needs endpoint parameter validation update.

---

## Files Modified

1. `astegni-backend/chat_endpoints.py`
   - Line 388: Changed `cp.is_archived` → `c.is_archived`
   - Line 225: Changed `c.created_at` → `c.requested_at as created_at`
   - Line 256: Changed `c.created_at` → `c.requested_at as created_at`

---

## Verification Commands

### Check if backend is using correct columns:
```bash
cd astegni-backend
grep -n "cp.is_archived\|c.is_archived" chat_endpoints.py
grep -n "c.created_at\|c.requested_at" chat_endpoints.py
```

Should show:
```
388:                c.is_archived,    # ✅ Correct
225:                c.status, c.requested_at as created_at    # ✅ Correct
256:                c.status, c.requested_at as created_at    # ✅ Correct
```

---

**Status:** ✅ Schema Issues Fixed
**Action Required:** Restart backend server
**Date:** 2026-02-02
