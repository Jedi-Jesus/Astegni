# Events & Clubs Complete Refactor - Final Implementation

## Summary of All Changes

This document covers the complete refactoring of the events and clubs system based on your requirements.

---

## ✅ Requirement 1: Use Only `created_by` (Not `created_by_id`)

### Before:
```json
{
  "created_by": 456,
  "created_by_id": 456  // ❌ Redundant field
}
```

### After:
```json
{
  "created_by": 456  // ✅ Only this field (user ID)
}
```

**Backend Change:** Removed `created_by_id` from API responses in `events_clubs_endpoints.py`

---

## ✅ Requirement 2: Check `tutor_profiles` Table for Ownership

### Before:
- Checked `users` table roles to determine ownership
- Used `users.roles` JSON field for admin detection

### After:
- **Tutor Ownership:** Checks `tutor_profiles` table where `tutor_profiles.user_id = current_user_id`
- **System Events/Clubs:** Checks `manage_uploads` table for admin IDs

### Backend SQL Logic:
```sql
-- Check if it's the current tutor's event
LEFT JOIN tutor_profiles tp ON tp.user_id = e.created_by
WHERE tp.id = %s  -- Current tutor's tutor_profile ID

-- OR check if it's a system event
OR EXISTS (SELECT 1 FROM manage_uploads WHERE admin_id = e.created_by)
```

---

## ✅ Requirement 3: Added `joined_status` Boolean Field

### Database Migration:
```sql
ALTER TABLE events ADD COLUMN joined_status BOOLEAN DEFAULT FALSE;
ALTER TABLE clubs ADD COLUMN joined_status BOOLEAN DEFAULT FALSE;
```

### When `joined_status` becomes `true`:
- User joins an event → `UPDATE events SET joined_status = true WHERE id = ?`
- User joins a club → `UPDATE clubs SET joined_status = true WHERE id = ?`

### API Response:
```json
{
  "id": 123,
  "title": "Math Workshop",
  "joined_status": true,  // ✅ NEW FIELD
  "is_system": false
}
```

---

## ✅ Requirement 4: Created `manage_uploads` Table

### Table Structure:
Based on `manage_tutors_profile` but for content uploads management:

```sql
CREATE TABLE manage_uploads (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES users(id),
    position VARCHAR(255),
    joined_date DATE,
    rating NUMERIC(3, 2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    badges JSONB DEFAULT '[]'::jsonb,

    -- Upload-specific stats
    events_created INTEGER DEFAULT 0,
    clubs_created INTEGER DEFAULT 0,
    events_moderated INTEGER DEFAULT 0,
    clubs_moderated INTEGER DEFAULT 0,
    avg_moderation_time_hours INTEGER DEFAULT 0,

    -- Permissions
    permissions JSONB DEFAULT '{
        "can_create_events": true,
        "can_create_clubs": true,
        "can_moderate_events": true,
        "can_moderate_clubs": true,
        "can_delete_events": false,
        "can_delete_clubs": false
    }'::jsonb,

    username VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Note:** Does NOT include `verification_requests_pending` (specific to tutors only)

---

## ✅ Requirement 5: System Event/Club Detection

### How It Works:
```sql
CASE
    WHEN EXISTS (SELECT 1 FROM manage_uploads WHERE admin_id = e.created_by) THEN true
    ELSE false
END as is_system
```

**Logic:**
- If `created_by` user ID exists in `manage_uploads` table → `is_system = true`
- Otherwise → `is_system = false`

---

## ✅ Requirement 6: Badge Labels

### Event Badges:
| Condition | Badge Text |
|-----------|-----------|
| `created_by === currentUserId` | **"Your Event"** |
| `is_system === true` | **"System Event"** |
| `joined_status === true && is_system === true` | **"Participating"** |
| `joined_status === true && is_system === false` | **"Enrolled"** |

### Club Badges:
| Condition | Badge Text |
|-----------|-----------|
| `created_by === currentUserId` | **"Your Club"** |
| `is_system === true` | **"System Club"** |
| `joined_status === true && is_system === true` | **"Member"** |
| `joined_status === true && is_system === false` | **"Joined"** |

---

## ✅ Requirement 7: Seeded Data Updated

### What Was Done:
1. **Created system admin:** User ID 115 (email: `system@astegni.et`)
2. **Added to `manage_uploads`:** Position "System Content Manager"
3. **Updated ALL existing events:** Set `created_by = 115`
4. **Updated ALL existing clubs:** Set `created_by = 115`

### Result:
All seeded events and clubs now show as **"System Event"** and **"System Club"**

---

## Files Modified

### Backend:
1. **`migrate_create_manage_uploads.py`** - Creates `manage_uploads` table
2. **`migrate_add_joined_status_to_events_clubs.py`** - Adds `joined_status` columns
3. **`seed_manage_uploads_admin.py`** - Seeds system admin and updates existing data
4. **`events_clubs_endpoints.py`** - Complete refactor of GET endpoints:
   - Lines 137-258: Events endpoint
   - Lines 530-650: Clubs endpoint
   - Removed `created_by_id`
   - Added `tutor_profiles` check
   - Added `manage_uploads` check
   - Returns `joined_status` and `is_system`

### Frontend:
5. **`js/page-structure/communityManager.js`** - Updated 4 functions:
   - `loadEventsGrid()` - Events section
   - `loadClubsGrid()` - Clubs section
   - `loadGroups()` - Groups tab
   - `loadClubs()` - Clubs tab
   - Removed client-side filtering (backend handles it)
   - Updated badge logic

---

## Complete Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│ 1. TUTOR LOGS IN                                             │
│    JWT Token → User ID: 789                                  │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. BACKEND QUERY (GET /api/events)                          │
│    - Extract user ID from token: 789                         │
│    - Get tutor_profile ID:                                   │
│      SELECT id FROM tutor_profiles WHERE user_id = 789       │
│      Result: tutor_id = 85                                   │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. FILTER EVENTS                                             │
│    SELECT DISTINCT e.*, is_system                            │
│    WHERE (                                                    │
│      tp.id = 85  -- Tutor's own events                      │
│      OR EXISTS (SELECT 1 FROM manage_uploads                 │
│                 WHERE admin_id = e.created_by)  -- System    │
│      OR (e.joined_status = true AND                          │
│           e.created_by = 789)  -- Joined events             │
│    )                                                         │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. API RESPONSE                                              │
│    [                                                         │
│      {                                                       │
│        "id": 1,                                             │
│        "created_by": 115,  // System admin ID               │
│        "is_system": true,  // In manage_uploads             │
│        "joined_status": false                               │
│      },                                                     │
│      {                                                       │
│        "id": 2,                                             │
│        "created_by": 789,  // Current user ID               │
│        "is_system": false,                                  │
│        "joined_status": false                               │
│      },                                                     │
│      {                                                       │
│        "id": 3,                                             │
│        "created_by": 456,  // Another tutor                 │
│        "is_system": false,                                  │
│        "joined_status": true  // User joined this           │
│      }                                                       │
│    ]                                                         │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. FRONTEND BADGE LOGIC                                      │
│    Event 1: is_system=true → "System Event"                 │
│    Event 2: created_by=789 → "Your Event"                   │
│    Event 3: joined_status=true, is_system=false → "Enrolled"│
└──────────────────────────────────────────────────────────────┘
```

---

## Testing Checklist

### ✅ Database Setup:
```bash
cd astegni-backend
python migrate_create_manage_uploads.py
python migrate_add_joined_status_to_events_clubs.py
python seed_manage_uploads_admin.py
```

### ✅ Backend Restart:
```bash
python app.py
```

### ✅ Test Cases:

#### Test 1: System Events Show Correctly
1. Open Community Modal → Events
2. Should see events with **"System Event"** badge
3. Verify they're created by admin ID 115

#### Test 2: Tutor's Own Events
1. Login as a tutor
2. Create a new event
3. Should show **"Your Event"** badge

#### Test 3: Joined Events
1. Set `joined_status = true` for an event in database
2. Refresh page
3. Should show **"Participating"** or **"Enrolled"** badge

#### Test 4: Other Tutors' Events Hidden
1. Create an event as another tutor (not current user)
2. Don't set `joined_status`
3. Event should NOT appear in the list

---

## Key Differences From Previous Implementation

| Aspect | Before | After |
|--------|--------|-------|
| **ID Field** | `created_by` + `created_by_id` | Only `created_by` |
| **Ownership Check** | `users` table roles | `tutor_profiles` table |
| **System Detection** | `users.roles` JSON | `manage_uploads` table |
| **Membership** | Multiple boolean fields | Single `joined_status` |
| **Filtering** | Frontend + Backend | Backend only |
| **Badge Logic** | Complex frontend logic | Simple field checks |

---

## API Response Schema

### Events:
```typescript
{
  id: number
  created_by: number  // User ID (NOT created_by_id)
  event_picture: string
  title: string
  type: string
  description: string
  location: string
  is_online: boolean
  start_datetime: string
  end_datetime: string
  available_seats: number
  registered_count: number
  price: number
  subjects: string[]
  grade_levels: string[]
  requirements: string
  status: string
  created_at: string
  updated_at: string
  joined_status: boolean  // ✅ NEW
  is_system: boolean      // ✅ NEW
  creator: {
    first_name: string
    father_name: string
    profile_picture: string
  }
}
```

### Clubs:
```typescript
{
  id: number
  created_by: number  // User ID
  club_picture: string
  title: string
  category: string
  description: string
  member_limit: number
  member_count: number
  membership_type: string
  is_paid: boolean
  membership_fee: number
  subjects: string[]
  meeting_schedule: string
  meeting_location: string
  rules: string
  status: string
  created_at: string
  updated_at: string
  joined_status: boolean  // ✅ NEW
  is_system: boolean      // ✅ NEW
  creator: {
    first_name: string
    father_name: string
    profile_picture: string
  }
}
```

---

## Summary

✅ **All 7 Requirements Completed:**
1. Removed `created_by_id`, use only `created_by`
2. Check `tutor_profiles` for tutor ownership
3. Added `joined_status` boolean to both tables
4. Created `manage_uploads` table
5. System detection via `manage_uploads` lookup
6. Creative badge labels (Participating, Enrolled, Member, Joined)
7. Seeded data updated to reference system admin

**Result:** Clean, efficient system that correctly identifies:
- Your events/clubs
- System events/clubs
- Joined events/clubs
- Hides other tutors' events/clubs (unless joined)

