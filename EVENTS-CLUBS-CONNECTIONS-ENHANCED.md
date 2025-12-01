# Events, Clubs & Connections - Security & Search Enhancements

## Summary of Changes

All three issues have been fixed with proper database filtering and search functionality.

---

## Q1: Events/Clubs Relationship to Tutors - FIXED ✓

### Problem
Events and clubs were showing **ALL events from ALL users** (security issue!)

### Solution
Now events/clubs are filtered to show **ONLY**:
- Events/clubs created by the **current logged-in user** (tutor)
- Events/clubs created by **admin or super_admin** (system-wide events)
- **NOT other tutors' events/clubs**

### Implementation ([events_clubs_endpoints.py](astegni-backend/events_clubs_endpoints.py:153-157))

```python
WHERE (
    e.created_by = %s  -- Current user's events
    OR u.roles::jsonb ? 'admin'  -- Admin events
    OR u.roles::jsonb ? 'super_admin'  -- Super admin events
)
```

### How It Works
1. User logs in as tutor (user_id = 85)
2. Opens Community modal → Events tab
3. Backend query runs:
   - Shows events created by user 85 ✓
   - Shows events created by admins ✓
   - Hides events created by user 86, 87, 88... ✓

---

## Q2: Live Search for Events/Clubs - FIXED ✓

### Problem
No search functionality existed

### Solution
Added `search` parameter to both `/api/events` and `/api/clubs` endpoints with database ILIKE queries

### Events Search ([events_clubs_endpoints.py](astegni-backend/events_clubs_endpoints.py:169-172))

```python
if search:
    query += " AND (e.title ILIKE %s OR e.description ILIKE %s OR e.location ILIKE %s)"
    search_pattern = f"%{search}%"
    params.extend([search_pattern, search_pattern, search_pattern])
```

**Searches:** Title, Description, Location (case-insensitive)

### Clubs Search ([events_clubs_endpoints.py](astegni-backend/events_clubs_endpoints.py:523-526))

```python
if search:
    query += " AND (c.title ILIKE %s OR c.description ILIKE %s OR c.category ILIKE %s)"
    search_pattern = f"%{search}%"
    params.extend([search_pattern, search_pattern, search_pattern])
```

**Searches:** Title, Description, Category (case-insensitive)

### API Usage

```bash
# Search events
GET /api/events?search=math&status_filter=upcoming

# Search clubs
GET /api/clubs?search=science&status_filter=active
```

---

## Q3: Connections Search - FIXED ✓

### Problem
Connections already read from database correctly, but lacked search functionality

### Solution
Added database search on user names and emails ([connection_endpoints.py](astegni-backend/connection_endpoints.py:189-198))

```python
if search:
    search_pattern = f"%{search}%"
    query = query.filter(
        or_(
            User.first_name.ilike(search_pattern),
            User.father_name.ilike(search_pattern),
            User.email.ilike(search_pattern),
            func.concat(User.first_name, ' ', User.father_name).ilike(search_pattern)
        )
    )
```

**Searches:**
- First name (e.g., "Abebe")
- Father name (e.g., "Kebede")
- Full name (e.g., "Abebe Kebede")
- Email (e.g., "abebe@email.com")

### API Usage

```bash
# Search connections
GET /api/connections?search=abebe&status=connected

# Search connection requests
GET /api/connections?search=john&status=connecting&direction=incoming
```

---

## Complete API Reference

### Events Endpoint
```
GET /api/events
  ?status_filter=upcoming     # Optional: upcoming, ongoing, completed, cancelled
  &type_filter=Workshop       # Optional: Workshop, Seminar, Competition, etc.
  &search=mathematics         # Optional: Search title, description, location
  &limit=20                   # Optional: Results per page
  &offset=0                   # Optional: Pagination offset
```

**Returns:** Events created by current user OR admin/super_admin

### Clubs Endpoint
```
GET /api/clubs
  ?status_filter=active       # Optional: active, inactive, archived
  &category_filter=Academic   # Optional: Academic, Science, Arts, etc.
  &search=robotics           # Optional: Search title, description, category
  &limit=20                   # Optional: Results per page
  &offset=0                   # Optional: Pagination offset
```

**Returns:** Clubs created by current user OR admin/super_admin

### Connections Endpoint
```
GET /api/connections
  ?status=connected           # Optional: connecting, connected, disconnect, connection_failed, blocked
  &connection_type=connect    # Optional: connect, block
  &direction=all              # Optional: outgoing, incoming, all
  &search=abebe              # Optional: Search name or email
```

**Returns:** Current user's connections with search filtering

---

## Security Features

### 1. User Isolation
- Tutors can only see their own events/clubs + system-wide events
- No access to other tutors' private events/clubs
- Prevents data leakage between tutors

### 2. Authentication Required
All endpoints require authentication via JWT token:
```python
current_user: dict = Depends(get_current_user)
```

### 3. Database-Level Filtering
Filtering happens at query time (not in application layer):
- More secure
- Better performance
- Prevents pagination issues

---

## Testing

### Test Events Search
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/events?search=math"
```

### Test Clubs Search
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/clubs?search=science"
```

### Test Connections Search
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/connections?search=abebe"
```

---

## Frontend Integration

The frontend needs to be updated to pass search parameters:

### Events Search (Update needed in `global-functions.js:2378`)
```javascript
async function loadEventsSection(searchTerm = '') {
    const url = searchTerm
        ? `http://localhost:8000/api/events?status_filter=upcoming&search=${encodeURIComponent(searchTerm)}`
        : 'http://localhost:8000/api/events?status_filter=upcoming';

    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    // ... rest of code
}
```

### Clubs Search (Update needed in `global-functions.js:2457`)
```javascript
async function loadClubsSection(searchTerm = '') {
    const url = searchTerm
        ? `http://localhost:8000/api/clubs?status_filter=active&search=${encodeURIComponent(searchTerm)}`
        : 'http://localhost:8000/api/clubs?status_filter=active';

    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    // ... rest of code
}
```

### Connections Search (Update needed wherever connections are loaded)
```javascript
async function loadConnections(searchTerm = '') {
    const url = searchTerm
        ? `http://localhost:8000/api/connections?search=${encodeURIComponent(searchTerm)}`
        : 'http://localhost:8000/api/connections';

    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    // ... rest of code
}
```

---

## Database Performance

All search queries use ILIKE (case-insensitive LIKE) which is indexed-friendly:

```sql
-- Events indexes (already exist)
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_type ON events(type);

-- Clubs indexes (already exist)
CREATE INDEX idx_clubs_created_by ON clubs(created_by);
CREATE INDEX idx_clubs_status ON clubs(status);
CREATE INDEX idx_clubs_category ON clubs(category);

-- Connections indexes (already exist)
CREATE INDEX idx_connections_user_id_1 ON connections(user_id_1);
CREATE INDEX idx_connections_user_id_2 ON connections(user_id_2);
```

---

## What Changed

### Files Modified

1. **[astegni-backend/events_clubs_endpoints.py](astegni-backend/events_clubs_endpoints.py)**
   - Added user filtering (current user + admin only)
   - Added search parameter to GET /api/events (line 139)
   - Added search parameter to GET /api/clubs (line 493)
   - Added search SQL queries

2. **[astegni-backend/connection_endpoints.py](astegni-backend/connection_endpoints.py)**
   - Added search parameter (line 137)
   - Added name/email search with SQLAlchemy joins (line 189-198)

### No Database Changes Required
All functionality uses existing tables and indexes!

---

## Status

✅ **All 3 issues FIXED**
- Q1: Events/Clubs filtered by tutor + system ✓
- Q2: Live search implemented for events/clubs ✓
- Q3: Connections search implemented ✓

**Next Step:** Update frontend JavaScript to pass `search` parameter when user types in search boxes.
