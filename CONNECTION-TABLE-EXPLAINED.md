# Connections Table - Complete Explanation

## Current Schema (Before Cleanup)

```sql
connections (
    id INTEGER PRIMARY KEY,

    -- ❌ REDUNDANT - Will be removed
    user_id_1 INTEGER,              -- First user (LEGACY)
    user_id_2 INTEGER,              -- Second user (LEGACY)

    -- ✅ CORRECT - Profile-based identification
    profile_id_1 INTEGER,           -- First profile ID (tutor_profile.id, student_profile.id, etc.)
    profile_type_1 VARCHAR,         -- Profile type ('tutor', 'student', 'parent', 'advertiser')
    profile_id_2 INTEGER,           -- Second profile ID
    profile_type_2 VARCHAR,         -- Profile type

    -- Connection details
    connection_type VARCHAR,        -- 'connect' or 'block'
    status VARCHAR,                 -- 'connecting', 'connected', 'disconnect', 'blocked'
    initiated_by INTEGER,           -- User ID who sent the request (references users.id)
    connection_message TEXT,        -- Optional message when requesting connection

    -- Timestamps
    created_at TIMESTAMP,
    connected_at TIMESTAMP,         -- When connection was accepted
    updated_at TIMESTAMP
)
```

---

## Why Remove user_id_1 and user_id_2?

### Problem: Redundant and Confusing

Astegni is a **multi-role platform** where one user can be:
- A Student (has `student_profile.id`)
- A Tutor (has `tutor_profile.id`)
- A Parent (has `parent_profile.id`)
- An Advertiser (has `advertiser_profile.id`)

**Example Confusion:**

```sql
-- ❌ CONFUSING: Using user_id
{
    user_id_1: 5,  -- Which role is this? Student? Tutor? Parent?
    user_id_2: 10, -- Same problem!
    status: 'connected'
}

-- ✅ CLEAR: Using profile_id + profile_type
{
    profile_id_1: 12,           -- Tutor profile ID 12
    profile_type_1: 'tutor',
    profile_id_2: 45,           -- Student profile ID 45
    profile_type_2: 'student',
    status: 'connected'
}
```

**With profile-based system, we know EXACTLY:**
- User A is connecting **as a tutor** (profile_id_1 = tutor_profile.id = 12)
- User B is connecting **as a student** (profile_id_2 = student_profile.id = 45)

---

## What is connection_type?

`connection_type` determines **HOW the connection works**.

### Values:

| connection_type | Meaning | Initial Status | Requires Acceptance? |
|----------------|---------|----------------|---------------------|
| **`'connect'`** | Normal connection/friend request | `'connecting'` (pending) | ✅ Yes |
| **`'block'`** | Block a user | `'blocked'` (immediate) | ❌ No |

### Examples:

**1. Normal Connection (connect):**

```sql
-- User A (tutor) sends connection request to User B (student)
INSERT INTO connections (
    profile_id_1, profile_type_1,
    profile_id_2, profile_type_2,
    connection_type, status, initiated_by
) VALUES (
    12, 'tutor',      -- User A as tutor
    45, 'student',    -- User B as student
    'connect',        -- Normal connection
    'connecting',     -- Pending acceptance
    5                 -- User A's user.id
);
```

**User B accepts:**

```sql
UPDATE connections
SET status = 'connected', connected_at = NOW()
WHERE id = 100;
```

**2. Blocking (block):**

```sql
-- User A blocks User B (immediate, no acceptance needed)
INSERT INTO connections (
    profile_id_1, profile_type_1,
    profile_id_2, profile_type_2,
    connection_type, status, initiated_by
) VALUES (
    12, 'tutor',
    45, 'student',
    'block',          -- Blocking action
    'blocked',        -- Immediate status
    5                 -- User A's user.id
);
```

No acceptance needed - User B is immediately blocked.

---

## Status Values Explained

| Status | Meaning | Used With |
|--------|---------|-----------|
| **`'connecting'`** | Pending connection request (waiting for acceptance) | `connection_type='connect'` |
| **`'connected'`** | Active connection (accepted and active) | `connection_type='connect'` |
| **`'disconnect'`** | Connection was active but now severed | `connection_type='connect'` |
| **`'connection_failed'`** | Connection request was rejected/failed | `connection_type='connect'` |
| **`'blocked'`** | User is blocked | `connection_type='block'` |

---

## Connection Lifecycle (connection_type='connect')

```
User A → "Connect" → User B
         ↓
    status: 'connecting'
    (appears in User B's "Received Requests")
         ↓
    User B clicks "Accept"
         ↓
    status: 'connected'
    connected_at: timestamp
    (appears in both users' "Connections")
         ↓
    [Later] User disconnects
         ↓
    status: 'disconnect'
```

---

## After Migration (Cleaned Up Schema)

```sql
connections (
    id INTEGER PRIMARY KEY,

    -- ✅ Profile-based identification (NO MORE user_id_1/user_id_2!)
    profile_id_1 INTEGER NOT NULL,
    profile_type_1 VARCHAR NOT NULL,
    profile_id_2 INTEGER NOT NULL,
    profile_type_2 VARCHAR NOT NULL,

    -- Connection details
    connection_type VARCHAR NOT NULL,    -- 'connect' or 'block'
    status VARCHAR NOT NULL,            -- 'connecting', 'connected', 'disconnect', 'blocked'
    initiated_by INTEGER NOT NULL,      -- User ID who sent request (references users.id)
    connection_message TEXT,

    -- Timestamps
    created_at TIMESTAMP,
    connected_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

---

## How Frontend Uses This

### Finding User's Connections:

**Backend Query (connection_endpoints.py):**

```python
# Get all connections for current user's tutor profile
connections = db.query(Connection).filter(
    or_(
        and_(
            Connection.profile_id_1 == tutor_profile_id,
            Connection.profile_type_1 == 'tutor'
        ),
        and_(
            Connection.profile_id_2 == tutor_profile_id,
            Connection.profile_type_2 == 'tutor'
        )
    ),
    Connection.connection_type == 'connect',
    Connection.status == 'connected'
).all()
```

**Frontend Filtering (community-panel-integration.js):**

```javascript
// Get pending requests
const allRequests = await fetchConnections('connecting', null, 'all');

// Received = others sent TO me
const receivedRequests = allRequests.filter(conn =>
    conn.initiated_by !== currentUserId
);

// Sent = I sent TO others
const sentRequests = allRequests.filter(conn =>
    conn.initiated_by === currentUserId
);
```

---

## Migration Script

Run: `python astegni-backend/migrate_remove_user_ids_from_connections.py`

This will:
1. ✅ Verify data integrity (all rows have profile_id values)
2. ✅ Drop foreign key constraints on user_id columns
3. ✅ Remove `user_id_1` column
4. ✅ Remove `user_id_2` column
5. ✅ Recreate necessary foreign keys (initiated_by)
6. ✅ Verify final schema

**IMPORTANT:** After migration, update all backend code that references `user_id_1` or `user_id_2` to use `profile_id_1/profile_type_1` instead.

---

## Summary

| Field | Purpose | Keep or Remove? |
|-------|---------|----------------|
| `user_id_1` | Legacy user identification | ❌ **REMOVE** |
| `user_id_2` | Legacy user identification | ❌ **REMOVE** |
| `profile_id_1` | Profile-based identification | ✅ **KEEP** |
| `profile_type_1` | Role identification | ✅ **KEEP** |
| `profile_id_2` | Profile-based identification | ✅ **KEEP** |
| `profile_type_2` | Role identification | ✅ **KEEP** |
| `connection_type` | 'connect' or 'block' | ✅ **KEEP** |
| `status` | Connection state | ✅ **KEEP** |
| `initiated_by` | Who sent request (users.id) | ✅ **KEEP** |

**Result:** Cleaner, more explicit, less confusing connections table! 🎉
