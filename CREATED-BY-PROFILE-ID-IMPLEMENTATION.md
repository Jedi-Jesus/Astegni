# Created_By Field - Profile ID Implementation

## Summary
Updated the `created_by` field in events and clubs tables to store:
- **`tutor_profiles.id`** when created by a tutor
- **`manage_uploads.id`** when created by an admin

Added `creator_type` column to distinguish between 'tutor' and 'admin' creators.

## Database Changes

### Migration Applied
**File:** `migrate_add_creator_type.py`

Added `creator_type` VARCHAR(20) column to both tables:
- `events` table: `creator_type` ('tutor' or 'admin')
- `clubs` table: `creator_type` ('tutor' or 'admin')

### New Table Structure

```sql
-- Events Table (Updated)
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    created_by INTEGER NOT NULL,  -- Now stores tutor_profiles.id OR manage_uploads.id
    creator_type VARCHAR(20) DEFAULT 'tutor',  -- NEW: 'tutor' or 'admin'
    event_picture TEXT,
    title VARCHAR(255),
    -- ... other fields
);

-- Clubs Table (Updated)
CREATE TABLE clubs (
    id SERIAL PRIMARY KEY,
    created_by INTEGER NOT NULL,  -- Now stores tutor_profiles.id OR manage_uploads.id
    creator_type VARCHAR(20) DEFAULT 'tutor',  -- NEW: 'tutor' or 'admin'
    club_picture TEXT,
    title VARCHAR(255),
    -- ... other fields
);
```

## Backend Changes

### 1. Create Event Endpoint Updated
**File:** `events_clubs_endpoints.py` (Lines 88-148)

**What Changed:**
```python
# OLD WAY:
created_by = current_user['id']  # Always users.id

# NEW WAY:
# Check if user is admin
cur.execute("SELECT id FROM manage_uploads WHERE admin_id = %s", (current_user['id'],))
admin_profile = cur.fetchone()

if admin_profile:
    creator_type = 'admin'
    creator_id = admin_profile[0]  # manage_uploads.id
else:
    # Check if user is tutor
    cur.execute("SELECT id FROM tutor_profiles WHERE user_id = %s", (current_user['id'],))
    tutor_profile = cur.fetchone()

    if tutor_profile:
        creator_type = 'tutor'
        creator_id = tutor_profile[0]  # tutor_profiles.id

# Insert with both values
INSERT INTO events (created_by, creator_type, ...) VALUES (%s, %s, ...)
```

### 2. Create Club Endpoint Updated
**File:** `events_clubs_endpoints.py` (Lines 503-547)

Same logic as events - determines profile ID and type before insertion.

### 3. GET Events Endpoint Updated (Partial)
**File:** `events_clubs_endpoints.py` (Lines 197-218)

**What Changed:**
```sql
-- NEW QUERY with proper joins:
SELECT DISTINCT e.*,
       CASE
           WHEN e.creator_type = 'tutor' THEN tp.user_id
           WHEN e.creator_type = 'admin' THEN mu.admin_id
       END as user_id,
       u.first_name, u.father_name, u.profile_picture,
       CASE WHEN e.creator_type = 'admin' THEN true ELSE false END as is_system
FROM events e
LEFT JOIN tutor_profiles tp ON e.created_by = tp.id AND e.creator_type = 'tutor'
LEFT JOIN manage_uploads mu ON e.created_by = mu.id AND e.creator_type = 'admin'
LEFT JOIN users u ON u.id = CASE
    WHEN e.creator_type = 'tutor' THEN tp.user_id
    WHEN e.creator_type = 'admin' THEN mu.admin_id
END
```

## How It Works Now

### Creating an Event/Club

1. **User authenticates** → Gets JWT token → `current_user['id']` extracted (users.id)

2. **Backend checks user's role:**
   - Query `manage_uploads` table: Is this user an admin?
   - If NO, query `tutor_profiles` table: Is this user a tutor?

3. **Store appropriate profile ID:**
   - If admin: `created_by = manage_uploads.id`, `creator_type = 'admin'`
   - If tutor: `created_by = tutor_profiles.id`, `creator_type = 'tutor'`

### Reading Events/Clubs

1. **Query uses `creator_type` to join correct table:**
   ```sql
   LEFT JOIN tutor_profiles tp ON e.created_by = tp.id AND e.creator_type = 'tutor'
   LEFT JOIN manage_uploads mu ON e.created_by = mu.id AND e.creator_type = 'admin'
   ```

2. **Get the users.id from joined table:**
   ```sql
   CASE
       WHEN e.creator_type = 'tutor' THEN tp.user_id
       WHEN e.creator_type = 'admin' THEN mu.admin_id
   END as user_id
   ```

3. **Frontend compares with current user:**
   ```javascript
   // Now compares user_id from response with current user
   if (event.user_id === currentUserId && !event.is_system) {
       badge = 'Your Event';
   }
   ```

## Database Relationships (NEW)

```
users (id)
   ↓
   ├─→ tutor_profiles (id, user_id)
   │      ↑
   │      └─ events/clubs (created_by, creator_type='tutor')
   │
   └─→ manage_uploads (id, admin_id)
          ↑
          └─ events/clubs (created_by, creator_type='admin')
```

## Frontend Changes Needed

### Update Badge Logic
**File:** `js/tutor-profile/global-functions.js`

**OLD:**
```javascript
if (event.created_by === currentUserId && !event.is_system) {
    badge = 'Your Event';
}
```

**NEW (Required):**
```javascript
if (event.user_id === currentUserId && !event.is_system) {
    badge = 'Your Event';
}
```

The backend now returns `user_id` field (derived from tutor_profiles.user_id or manage_uploads.admin_id) instead of raw `created_by`.

## Benefits of This Approach

1. ✅ **Direct Profile Association**: `created_by` directly references the profile table
2. ✅ **Clear Creator Type**: `creator_type` explicitly marks who created it
3. ✅ **Efficient Queries**: No need to check multiple tables to determine type
4. ✅ **Data Integrity**: Proper foreign key relationships

## Migration Status

### ✅ Completed:
1. Added `creator_type` column to events and clubs tables
2. Updated `create_event` endpoint to store profile IDs
3. Updated `create_club` endpoint to store profile IDs
4. Partially updated `GET events` endpoint with new joins

### ⏳ Remaining:
1. Update all GET event/club endpoints to use new join structure
2. Update response mapping to include `user_id` field
3. Update frontend to use `user_id` instead of `created_by` for comparisons
4. Update existing records in database with correct profile IDs
5. Test entire flow end-to-end

## Testing Required

1. **Create Event as Tutor**: Verify `created_by = tutor_profiles.id`, `creator_type = 'tutor'`
2. **Create Event as Admin**: Verify `created_by = manage_uploads.id`, `creator_type = 'admin'`
3. **View Events**: Verify correct badges show based on `user_id` comparison
4. **Same for Clubs**: Test all scenarios

## Status: 🚧 IN PROGRESS

The backend structure is partially updated. Need to complete all GET endpoints and update frontend logic.
