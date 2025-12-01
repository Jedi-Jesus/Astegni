# Created_By Field Explanation - Events & Clubs Tables

## Overview
The `created_by` field in both the `events` and `clubs` tables stores the **user ID** (from the `users` table) of the person who created the event or club.

## Database Schema

### Events Table
```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    created_by INTEGER NOT NULL,  -- Foreign key to users.id
    event_picture TEXT,
    title VARCHAR(255),
    type VARCHAR(100),
    description TEXT,
    location VARCHAR(255),
    is_online BOOLEAN,
    start_datetime TIMESTAMP,
    end_datetime TIMESTAMP,
    available_seats INTEGER,
    registered_count INTEGER DEFAULT 0,
    price DECIMAL(10, 2),
    subjects JSONB,
    grade_levels JSONB,
    requirements TEXT,
    status VARCHAR(50) DEFAULT 'upcoming',
    joined_status BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Clubs Table
```sql
CREATE TABLE clubs (
    id SERIAL PRIMARY KEY,
    created_by INTEGER NOT NULL,  -- Foreign key to users.id
    club_picture TEXT,
    title VARCHAR(255),
    category VARCHAR(100),
    description TEXT,
    member_limit INTEGER,
    member_count INTEGER DEFAULT 0,
    membership_type VARCHAR(50) DEFAULT 'open',
    is_paid BOOLEAN DEFAULT false,
    membership_fee DECIMAL(10, 2) DEFAULT 0.00,
    subjects JSONB,
    meeting_schedule TEXT,
    meeting_location TEXT,
    rules TEXT,
    status VARCHAR(50) DEFAULT 'active',
    joined_status BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Where Does `created_by` Come From?

### 1. When a Tutor Creates an Event/Club

**File:** `astegni-backend/events_clubs_endpoints.py`

**Create Event Endpoint (Line 88-114):**
```python
@router.post("/api/events", status_code=status.HTTP_201_CREATED)
async def create_event(event: EventCreate, current_user: dict = Depends(get_current_user)):
    """Create a new event"""
    cur.execute("""
        INSERT INTO events (
            created_by, event_picture, title, type, description, location,
            is_online, start_datetime, end_datetime, available_seats,
            price, subjects, grade_levels, requirements
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, created_at
    """, (
        current_user['id'],  # <--- created_by = current_user['id']
        event.event_picture, event.title, event.type,
        event.description, event.location, event.is_online,
        event.start_datetime, event.end_datetime, event.available_seats,
        event.price, event.subjects, event.grade_levels, event.requirements
    ))
```

**Create Club Endpoint (Line 478-497):**
```python
@router.post("/api/clubs", status_code=status.HTTP_201_CREATED)
async def create_club(club: ClubCreate, current_user: dict = Depends(get_current_user)):
    """Create a new club"""
    cur.execute("""
        INSERT INTO clubs (
            created_by, club_picture, title, category, description,
            member_limit, membership_type, is_paid, membership_fee,
            subjects, meeting_schedule, meeting_location, rules
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, created_at
    """, (
        current_user['id'],  # <--- created_by = current_user['id']
        club.club_picture, club.title, club.category,
        club.description, club.member_limit, club.membership_type,
        club.is_paid, club.membership_fee, club.subjects,
        club.meeting_schedule, club.meeting_location, club.rules
    ))
```

### 2. Current User Authentication

The `current_user` comes from the JWT authentication system:

**File:** `astegni-backend/utils.py`
```python
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract current user from JWT token"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id')

        # Fetch user from database
        conn = psycopg.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("SELECT id, email, roles FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()

        return {
            'id': user[0],      # <--- This becomes created_by
            'email': user[1],
            'roles': user[2]
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
```

## How `created_by` is Used

### 1. Determining Ownership (Frontend Logic)

**File:** `js/tutor-profile/global-functions.js`

```javascript
const user = JSON.parse(localStorage.getItem('user') || '{}');
const currentUserId = user.id;

// Check if event/club belongs to current user
if (event.created_by === currentUserId && !event.is_system) {
    creativeBadge = '<span class="creative-badge your-event">Your Event</span>';
}
```

### 2. Determining System Events/Clubs (Backend Query)

**File:** `astegni-backend/events_clubs_endpoints.py` (Line 172-186)

```sql
SELECT DISTINCT e.*, u.first_name, u.father_name, u.profile_picture,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM manage_uploads
            WHERE admin_id = e.created_by  -- <--- Check if creator is an admin
        ) THEN true
        ELSE false
    END as is_system
FROM events e
JOIN users u ON e.created_by = u.id
```

The backend checks if `created_by` exists in the `manage_uploads` table:
- **If YES**: The event/club was created by an admin → `is_system = true`
- **If NO**: The event/club was created by a regular tutor → `is_system = false`

### 3. Filtering Events/Clubs by Creator

**Show tutor's own events:**
```sql
SELECT * FROM events WHERE created_by = current_user_id
```

**Show events by specific tutor:**
```sql
SELECT e.* FROM events e
LEFT JOIN tutor_profiles tp ON tp.user_id = e.created_by
WHERE tp.id = 123  -- tutor_profile_id
```

## Summary Table

| Scenario | created_by Value | is_system | Badge Displayed |
|----------|-----------------|-----------|-----------------|
| Tutor creates event/club | `tutor_user_id` (from users table) | `false` | "Your Event/Club" |
| Admin creates event/club | `admin_user_id` (from users table) | `true` | "System Event/Club" |
| User joins another's event | `other_tutor_user_id` | `false` | "Participating" |
| User joins another's club | `other_tutor_user_id` | `false` | "Member" |

## Key Points

1. **`created_by` always stores `users.id`** - Never stores `tutor_profiles.id` or `manage_uploads.id`
2. **User ID is obtained from JWT token** - Extracted during authentication
3. **`is_system` flag is computed at query time** - By checking if `created_by` exists in `manage_uploads.admin_id`
4. **All creators must be in `users` table** - Whether they're tutors, admins, or other roles

## Database Relationships

```
users (id)
   ↓
   ├─→ tutor_profiles (user_id)  -- Tutor role
   ├─→ manage_uploads (admin_id) -- Admin role
   ├─→ events (created_by)       -- Who created the event
   └─→ clubs (created_by)        -- Who created the club
```

## How to Check Who Created an Event/Club

**SQL Query:**
```sql
-- Check if event was created by tutor or admin
SELECT
    e.id,
    e.title,
    e.created_by,
    u.email,
    u.first_name,
    CASE
        WHEN EXISTS (SELECT 1 FROM manage_uploads WHERE admin_id = e.created_by)
        THEN 'Admin (System)'
        ELSE 'Tutor'
    END as creator_type
FROM events e
JOIN users u ON e.created_by = u.id
WHERE e.id = 1;
```

## Frontend Implementation

The frontend compares `created_by` with the current logged-in user's ID to determine:
- ✅ **Your Event/Club** - You created it
- ✅ **System Event/Club** - Admin created it (backend sets `is_system = true`)
- ✅ **Participating/Member** - You joined someone else's event/club

All of this happens dynamically based on database values - no hardcoding!
