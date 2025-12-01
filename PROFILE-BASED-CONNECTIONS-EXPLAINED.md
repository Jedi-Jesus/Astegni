# Profile-Based Connections System - Complete Guide

## Overview

The Astegni connections system is now **fully profile-based**, meaning connections are stored using IDs from role-specific profile tables (`tutor_profiles`, `student_profiles`, `parent_profiles`, `advertiser_profiles`) rather than generic `users` table IDs.

## Why Profile-Based Connections?

### Problem with User-Based Connections
```
OLD APPROACH (User-based):
- User ID 50 connects with User ID 75
- Issue: User 50 might be both a tutor AND a student
- Question: Is this a professional or personal connection?
- Problem: No way to separate networks by role
```

### Solution: Profile-Based Connections
```
NEW APPROACH (Profile-based):
- Student Profile #12 (user_id=50) connects with Tutor Profile #85 (user_id=75)
- Same User 50 can also have Tutor Profile #42 connecting with other tutors
- Result: Role-specific, isolated networks
```

## Database Schema

### Connections Table Structure

```sql
CREATE TABLE connections (
    id INTEGER PRIMARY KEY,

    -- PROFILE-BASED (PRIMARY) - IDs from role-specific tables
    profile_id_1 INTEGER NOT NULL,           -- ID from tutor_profiles/student_profiles/etc.
    profile_type_1 VARCHAR(50) NOT NULL,     -- 'tutor', 'student', 'parent', 'advertiser'
    profile_id_2 INTEGER NOT NULL,           -- ID from tutor_profiles/student_profiles/etc.
    profile_type_2 VARCHAR(50) NOT NULL,     -- 'tutor', 'student', 'parent', 'advertiser'

    -- USER-BASED (LEGACY) - Kept for backwards compatibility
    user_id_1 INTEGER NOT NULL,              -- FK to users.id
    user_id_2 INTEGER NOT NULL,              -- FK to users.id

    -- Connection metadata
    connection_type VARCHAR NOT NULL,         -- 'connect' or 'block'
    status VARCHAR NOT NULL,                  -- 'connecting', 'connected', etc.
    initiated_by INTEGER NOT NULL,            -- user_id who initiated
    connection_message TEXT,

    -- Timestamps
    created_at TIMESTAMP,
    connected_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Indexes for Performance

```sql
-- Profile-based indexes (NEW)
CREATE INDEX idx_connections_profile_1 ON connections (profile_id_1, profile_type_1);
CREATE INDEX idx_connections_profile_2 ON connections (profile_id_2, profile_type_2);
CREATE INDEX idx_connections_profile_both ON connections (profile_id_1, profile_type_1, profile_id_2, profile_type_2);

-- User-based indexes (LEGACY - for backwards compatibility)
CREATE INDEX idx_connections_user_1 ON connections (user_id_1);
CREATE INDEX idx_connections_user_2 ON connections (user_id_2);
```

## How It Works

### Example Scenario

**User Ahmed (user_id = 50):**
- Has Student Profile (student_profiles.id = 12)
- Has Tutor Profile (tutor_profiles.id = 42)

**User Sara (user_id = 75):**
- Has Tutor Profile (tutor_profiles.id = 85)

**Connections:**

1. **Ahmed as Student connects with Sara as Tutor:**
   ```json
   {
       "profile_id_1": 12,
       "profile_type_1": "student",
       "profile_id_2": 85,
       "profile_type_2": "tutor",
       "user_id_1": 50,
       "user_id_2": 75,
       "connection_type": "connect",
       "status": "connected"
   }
   ```

2. **Ahmed as Tutor connects with another Tutor (professional network):**
   ```json
   {
       "profile_id_1": 42,
       "profile_type_1": "tutor",
       "profile_id_2": 90,
       "profile_type_2": "tutor",
       "user_id_1": 50,
       "user_id_2": 60,
       "connection_type": "connect",
       "status": "connected"
   }
   ```

**Key Point:** Ahmed (user_id 50) has TWO separate connections because he has TWO different profiles!

## API Usage

### Creating a Connection (Profile-Based)

**Endpoint:** `POST /api/connections`

**Method 1: Using Profile IDs (Preferred)**
```json
{
    "target_profile_id": 85,
    "target_profile_type": "tutor",
    "connection_type": "connect",
    "connection_message": "I'd like to learn from you!"
}
```

**Method 2: Using User ID (Legacy - auto-detects profile)**
```json
{
    "target_user_id": 75,
    "connection_type": "connect"
}
```
*Note: This will auto-detect the target user's primary profile (priority: tutor > student > parent > advertiser)*

### Response
```json
{
    "id": 123,
    "profile_id_1": 12,
    "profile_type_1": "student",
    "profile_id_2": 85,
    "profile_type_2": "tutor",
    "user_id_1": 50,
    "user_id_2": 75,
    "connection_type": "connect",
    "status": "connecting",
    "initiated_by": 50,
    "connection_message": "I'd like to learn from you!",
    "created_at": "2025-01-15T10:30:00Z",
    "user_1_name": "Ahmed Hassan",
    "user_2_name": "Sara Mohamed"
}
```

## Connection Status Flow

```
Astegni Terminology (NOT Facebook/Instagram terms):

1. "connecting" - Connection request sent, awaiting response
2. "connected" - Connection accepted and active
3. "disconnect" - Connection terminated by one party
4. "connection_failed" - Connection request rejected
5. "blocked" - Profile blocked another profile
```

## Backend Implementation

### Current State

The `connection_endpoints.py` file **already supports profile-based connections**:

1. **Auto-Detection:** If you pass `target_user_id`, it auto-detects the profile
2. **Explicit Profile:** If you pass `target_profile_id` + `target_profile_type`, it uses them directly
3. **Validation:** Ensures both profiles exist before creating connection
4. **Storage:** Stores both profile data (primary) and user data (legacy)

### Helper Functions

Located in `connection_profile_helpers.py`:

```python
def get_profile_from_user_id(db, user_id):
    """Get primary profile for a user (priority: tutor > student > parent > advertiser)"""

def validate_profile_exists(db, profile_id, profile_type):
    """Validate that a profile exists in the database"""

def get_user_id_from_profile(db, profile_id, profile_type):
    """Get user_id from a profile_id and profile_type"""
```

## Frontend Integration

### Recommended Approach

When creating a connection from the frontend:

```javascript
// Option 1: If you know the profile type (PREFERRED)
const connectionData = {
    target_profile_id: tutorProfileId,  // From tutor_profiles.id
    target_profile_type: 'tutor',
    connection_type: 'connect',
    connection_message: 'Looking forward to learning!'
};

// Option 2: If you only have user_id (LEGACY)
const connectionData = {
    target_user_id: userId,  // Will auto-detect profile
    connection_type: 'connect'
};

// Make API call
const response = await fetch(`${API_BASE_URL}/api/connections`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(connectionData)
});
```

### Fetching Connections

```javascript
// Get all connections
const response = await fetch(`${API_BASE_URL}/api/connections?status=connected`, {
    headers: { 'Authorization': `Bearer ${token}` }
});

// Response includes both profile and user info
const connections = await response.json();
```

## Profile Types Reference

| Profile Type | Table Name | Description |
|-------------|-----------|-------------|
| `tutor` | `tutor_profiles` | Professional tutors |
| `student` | `student_profiles` | Students learning on platform |
| `parent` | `parent_profiles` | Parents managing children |
| `advertiser` | `advertiser_profiles` | Advertisers running campaigns |

## Migration Summary

The migration (`migrate_connections_profile_based.py`) did the following:

1. ✅ Populated `profile_id_1/2` and `profile_type_1/2` for existing connections
2. ✅ Made profile fields **non-nullable** (required)
3. ✅ Added indexes for optimal query performance
4. ✅ Verified all connections have valid profile data

### Before Migration
```sql
connections:
  user_id_1: 50 (from users table)
  user_id_2: 75 (from users table)
  profile_id_1: NULL
  profile_type_1: NULL
  profile_id_2: NULL
  profile_type_2: NULL
```

### After Migration
```sql
connections:
  user_id_1: 50 (legacy - kept for compatibility)
  user_id_2: 75 (legacy - kept for compatibility)
  profile_id_1: 12 (from student_profiles)
  profile_type_1: 'student'
  profile_id_2: 85 (from tutor_profiles)
  profile_type_2: 'tutor'
```

## Benefits of Profile-Based Connections

1. **Role Isolation:** Separate professional and personal networks
2. **Context Clarity:** Know exactly what type of connection it is
3. **Better Analytics:** Track connections per role type
4. **Future-Proof:** Easy to add new profile types
5. **Privacy:** User can have different connection visibility per role

## Query Examples

### Get Tutor's Professional Network
```sql
SELECT * FROM connections
WHERE (profile_id_1 = 42 AND profile_type_1 = 'tutor')
   OR (profile_id_2 = 42 AND profile_type_2 = 'tutor')
  AND status = 'connected';
```

### Get Student's Learning Connections
```sql
SELECT * FROM connections
WHERE (profile_id_1 = 12 AND profile_type_1 = 'student')
   OR (profile_id_2 = 12 AND profile_type_2 = 'student')
  AND status = 'connected';
```

### Count Connections by Profile Type
```sql
SELECT
    profile_type_1,
    COUNT(*) as connection_count
FROM connections
WHERE status = 'connected'
GROUP BY profile_type_1;
```

## Common Use Cases

### 1. Student Connecting with Tutor
```javascript
// Frontend: On tutor profile page, click "Connect"
POST /api/connections
{
    "target_profile_id": tutorProfileId,
    "target_profile_type": "tutor",
    "connection_type": "connect"
}
```

### 2. Tutor Building Professional Network
```javascript
// Frontend: Tutor connecting with another tutor
POST /api/connections
{
    "target_profile_id": otherTutorProfileId,
    "target_profile_type": "tutor",
    "connection_type": "connect"
}
```

### 3. Parent Connecting with Child's Friends
```javascript
// Frontend: Parent connecting with another student
POST /api/connections
{
    "target_profile_id": studentProfileId,
    "target_profile_type": "student",
    "connection_type": "connect"
}
```

## Backwards Compatibility

The system maintains **full backwards compatibility**:

1. `user_id_1` and `user_id_2` are still stored
2. Old queries using user_id still work
3. Frontend can still use `target_user_id` (auto-detects profile)
4. No breaking changes to existing API responses

## Testing

### Verify Profile-Based Connections

```bash
cd astegni-backend

# Check connections table schema
python -c "
import psycopg
conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
cursor = conn.cursor()
cursor.execute(\"\"\"
    SELECT profile_id_1, profile_type_1, profile_id_2, profile_type_2
    FROM connections
    LIMIT 5
\"\"\")
for row in cursor.fetchall():
    print(row)
conn.close()
"
```

### Create Test Connection

```bash
# Using curl to test API
curl -X POST http://localhost:8000/api/connections \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_profile_id": 85,
    "target_profile_type": "tutor",
    "connection_type": "connect"
  }'
```

## Troubleshooting

### Issue: "No profile found for user"
**Solution:** Ensure the user has at least one profile (tutor/student/parent/advertiser)

### Issue: "Profile does not exist"
**Solution:** Verify the profile_id exists in the specified profile table

### Issue: "Cannot connect with yourself"
**Solution:** You're trying to connect with your own profile. Use a different target.

## Future Enhancements

Possible future features now enabled by profile-based connections:

1. **Role-Specific Feeds:** Show different content based on connection profile type
2. **Network Segmentation:** Separate "Professional Network" vs "Learning Network"
3. **Privacy Controls:** Different visibility settings per profile
4. **Analytics:** Track connection patterns by role
5. **Recommendations:** Suggest connections based on profile type

## Summary

✅ **DONE:**
- Connections table is now fully profile-based
- Profile IDs come from role-specific tables (tutor_profiles, student_profiles, etc.)
- Migration completed successfully
- Backwards compatibility maintained
- Proper indexes added

📝 **CURRENT STATE:**
- All connections use profile_id_1/2 (NOT NULL)
- user_id_1/2 kept for legacy support
- connection_endpoints.py already supports both approaches
- Frontend can use either target_profile_id or target_user_id

🎯 **BEST PRACTICE:**
- Always pass `target_profile_id` + `target_profile_type` from frontend
- This gives you explicit control over which profile is connecting
- Allows users to maintain separate networks per role
