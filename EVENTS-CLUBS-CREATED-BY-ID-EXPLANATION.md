# Events & Clubs: `created_by_id` Data Flow Explained

## Question: Where does `created_by_id` come from?

## The Complete Data Flow

### 1️⃣ Database Layer (PostgreSQL)

#### Events Table Schema:
```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    created_by INTEGER REFERENCES users(id),  -- ⭐ This stores the creator's user ID
    event_picture TEXT,
    title VARCHAR(255),
    -- ... other fields ...
);
```

#### Clubs Table Schema:
```sql
CREATE TABLE clubs (
    id SERIAL PRIMARY KEY,
    created_by INTEGER REFERENCES users(id),  -- ⭐ This stores the creator's user ID
    club_picture TEXT,
    title VARCHAR(255),
    -- ... other fields ...
);
```

**Key Point:** The `created_by` column in the database stores the **user ID** (integer), not a name!

---

### 2️⃣ Backend API Layer (FastAPI)

#### When Creating an Event/Club:
```python
# File: events_clubs_endpoints.py, Line 88-133
@router.post("/api/events")
async def create_event(event: EventCreate, current_user: dict = Depends(get_current_user)):
    cur.execute("""
        INSERT INTO events (created_by, title, ...)
        VALUES (%s, %s, ...)
    """, (
        current_user['id'],  # ⭐ Stores the logged-in user's ID
        event.title,
        # ...
    ))
```

**Process:**
1. User creates event/club via POST request with JWT token
2. `get_current_user()` decodes the JWT token → gets user ID
3. User ID is inserted into `created_by` column

---

#### When Fetching Events/Clubs:
```python
# File: events_clubs_endpoints.py, Line 137-246
@router.get("/api/events")
async def get_events(...):
    query = """
        SELECT e.*, u.first_name, u.father_name, u.profile_picture, u.roles
        FROM events e
        JOIN users u ON e.created_by = u.id  -- ⭐ JOIN to get creator info
        WHERE (...)
    """

    for row in rows:
        events.append({
            "id": row[0],
            "created_by": row[1],      # ⭐ User ID from events.created_by
            "created_by_id": row[1],   # ⭐ ADDED: Same ID with explicit name
            "is_system": is_system,    # ⭐ ADDED: Boolean flag
            # ... other fields ...
            "creator": {               # ℹ️ Additional creator info from JOIN
                "first_name": row[19],
                "father_name": row[20],
                "roles": row[22]
            }
        })
```

**Process:**
1. Query joins `events` table with `users` table
2. Row[1] contains the `created_by` value (user ID)
3. API response includes:
   - `created_by`: User ID (backward compatibility)
   - `created_by_id`: User ID (explicit field name) ✅
   - `is_system`: Boolean flag (admin/super_admin role check) ✅
   - `creator`: Object with creator's name, picture, roles

---

### 3️⃣ Frontend Layer (JavaScript)

#### API Response Example:
```json
{
  "events": [
    {
      "id": 123,
      "created_by": 456,          // User ID
      "created_by_id": 456,       // Same ID (explicit)
      "is_system": false,         // Not a system event
      "title": "Math Study Group",
      "location": "Addis Ababa",
      "creator": {
        "first_name": "Abebe",
        "father_name": "Kebede",
        "roles": ["tutor"]
      }
    },
    {
      "id": 124,
      "created_by": 789,
      "created_by_id": 789,
      "is_system": true,          // System event (admin created)
      "title": "Welcome Orientation",
      "location": "Online",
      "creator": {
        "first_name": "System",
        "father_name": "Admin",
        "roles": ["admin"]
      }
    }
  ]
}
```

#### Frontend Detection Logic:
```javascript
// File: communityManager.js, Line 412-419
const events = allEvents.filter(event => {
  const createdById = event.created_by_id || event.creator_id;  // Get creator ID
  const isSystemEvent = !createdById || event.created_by === 'System Admin' || event.is_system;
  const isOwnEvent = createdById && createdById === currentUserId;
  const hasJoined = event.has_joined || event.is_registered ||
                    (event.participants && event.participants.includes(currentUserId));

  return isSystemEvent || isOwnEvent || hasJoined;  // Filter logic
});
```

---

## Summary: The Complete Flow

```
┌──────────────────────────────────────────────────────────────┐
│ 1. USER CREATES EVENT                                        │
│    JWT Token (User ID: 456) → Backend extracts ID           │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. DATABASE STORAGE                                          │
│    INSERT INTO events (created_by, ...)                     │
│    VALUES (456, ...)  -- Stores user ID                     │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. FETCHING EVENTS (GET /api/events)                        │
│    SELECT e.*, u.first_name, u.roles                        │
│    FROM events e                                             │
│    JOIN users u ON e.created_by = u.id                      │
│                                                              │
│    Result Row:                                               │
│    [123, 456, "pic.jpg", "Math", ..., "Abebe", ["tutor"]]  │
│     │    │                              │       │           │
│     │    └─> created_by (User ID)      │       │           │
│     └─────> event ID                    │       │           │
│                                         └───────┴──> JOIN   │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. API RESPONSE (Backend formats data)                      │
│    {                                                         │
│      "id": 123,                                             │
│      "created_by": 456,          // Row[1]                  │
│      "created_by_id": 456,       // Row[1] duplicated ✅    │
│      "is_system": false,         // Check roles ✅          │
│      "creator": {                                            │
│        "first_name": "Abebe",   // Row[19]                  │
│        "roles": ["tutor"]       // Row[22]                  │
│      }                                                       │
│    }                                                         │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. FRONTEND LOGIC (communityManager.js)                     │
│    const createdById = event.created_by_id  // 456          │
│    const currentUserId = getCurrentUserId() // 789 (logged) │
│                                                              │
│    Detection:                                                │
│    ✓ is_system = false                                      │
│    ✓ isOwnEvent = (456 === 789) = false                    │
│    ✗ FILTERED OUT (not yours, not system, not joined)       │
└──────────────────────────────────────────────────────────────┘
```

---

## What We Fixed

### Before (Missing Fields):
```json
{
  "created_by": 456,  // Just the ID, ambiguous name
  // ❌ No created_by_id
  // ❌ No is_system flag
}
```
**Problem:** Frontend couldn't distinguish between user ID and system events easily.

### After (Complete Fields):
```json
{
  "created_by": 456,         // User ID (backward compatible)
  "created_by_id": 456,      // ✅ Explicit ID field
  "is_system": false,        // ✅ Boolean flag for system events
  "creator": {
    "first_name": "Abebe",
    "roles": ["tutor"]
  }
}
```
**Result:** Frontend has all fields needed for accurate detection!

---

## Testing the Flow

### Test 1: System Event
```bash
# Backend returns:
{
  "created_by_id": 10,      # Admin user ID
  "is_system": true,        # Admin role detected
  "creator": {
    "roles": ["admin"]
  }
}

# Frontend detects:
isSystemEvent = true  → Badge: "System Event" ✅
```

### Test 2: Your Event
```bash
# Backend returns:
{
  "created_by_id": 789,     # Your user ID
  "is_system": false
}

# Frontend (logged in as user 789):
isOwnEvent = true  → Badge: "Your Event" ✅
```

### Test 3: Other Tutor's Event
```bash
# Backend returns:
{
  "created_by_id": 456,     # Another tutor's ID
  "is_system": false
}

# Frontend (logged in as user 789):
isOwnEvent = false
hasJoined = false
→ FILTERED OUT (not shown) ✅
```

---

## Files Modified

### Backend:
- `astegni-backend/events_clubs_endpoints.py` (Lines 207-241, 594-627)
  - Added `created_by_id` field to API response
  - Added `is_system` boolean flag
  - Added role-based system detection

### Frontend:
- `js/page-structure/communityManager.js` (Already updated earlier)
  - Uses `created_by_id` for ownership detection
  - Uses `is_system` for system event detection

---

## Conclusion

**`created_by_id` comes from:**
1. **Database:** `events.created_by` column (stores user ID)
2. **Backend API:** Returns as both `created_by` (legacy) and `created_by_id` (explicit)
3. **Frontend:** Uses `created_by_id` to compare with logged-in user ID

**Now the system can correctly identify:**
- System events/clubs (admin created)
- Your events/clubs (you created)
- Joined events/clubs (you're a member)
- Other tutors' events/clubs (filtered out)
