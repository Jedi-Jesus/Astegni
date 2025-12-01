# Tutor Community Panel - Database Flow Documentation

## Overview
This document explains step-by-step how the `tutor-community-panel` reads data from the database and displays it on the frontend.

---

## Architecture Components

### Frontend Files
- **HTML**: `profile-pages/tutor-profile.html` (lines 2427-2850+)
- **JavaScript Data Loader**: `js/tutor-profile/community-panel-data-loader.js`
- **JavaScript Event/Club Manager**: `js/tutor-profile/events-clubs-manager.js`

### Backend Files
- **Connections API**: `astegni-backend/connection_endpoints.py`
- **Events/Clubs API**: `astegni-backend/events_clubs_endpoints.py`
- **Database Models**: `astegni-backend/app.py modules/models.py`

### Database Tables
- **connections**: User-to-user connections (students, parents, tutors, advertisers)
- **events**: Educational events created by tutors or system
- **clubs**: Educational clubs created by tutors or system
- **users**: User authentication and basic info
- **tutor_profiles**: Tutor-specific profile data
- **student_profiles**: Student-specific profile data
- **parent_profiles**: Parent-specific profile data

---

## Data Flow: Step-by-Step

### **1. CONNECTIONS SECTION**

#### Step 1: User Opens Community Panel
```
User clicks "Community" card → tutor-profile.html loads #tutor-community-panel
```

#### Step 2: JavaScript Initialization
```javascript
// File: js/tutor-profile/community-panel-data-loader.js
// On page load, the connections section is active by default

// When user clicks "Connections" main tab or switches to a sub-tab:
switchCommunityMainTab('connections')
  → toggleConnectionsSubSection('all') // Default sub-tab
```

#### Step 3: Data Fetching (Frontend → Backend)
```javascript
// File: js/tutor-profile/community-panel-data-loader.js (lines 423-468)

async function loadConnectionsGrid(gridId, profileType = 'all') {
    // 1. Shows loading spinner
    grid.innerHTML = '<loading spinner>';

    // 2. Calls backend API
    const connections = await fetchConnections('accepted', profileType, 'all');
}

async function fetchConnections(status = 'accepted', profileType = null, direction = 'all') {
    // 1. Get JWT token from localStorage
    const token = localStorage.getItem('token');

    // 2. Build API URL
    let url = `${API_BASE_URL}/api/connections?status=${status}&direction=${direction}`;
    // Example: http://localhost:8000/api/connections?status=accepted&direction=all

    // 3. Make GET request with Authorization header
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    // 4. Parse response
    const data = await response.json();

    // 5. Filter by profile type (student, parent, tutor) if specified
    if (profileType && profileType !== 'all') {
        return data.filter(conn => {
            const currentUserId = getCurrentUserId();
            if (conn.requested_by === currentUserId) {
                return conn.requested_to_type === profileType;
            } else {
                return conn.requester_type === profileType;
            }
        });
    }

    return data;
}
```

#### Step 4: Backend Processing (API Endpoint)
```python
# File: astegni-backend/connection_endpoints.py (lines 66-200+)

@router.get("/api/connections", response_model=List[ConnectionResponse])
async def get_connections(
    status: str = Query('accepted'),
    direction: str = Query('all'),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get connections for current user
    - status: 'pending', 'accepted', 'rejected', 'blocked'
    - direction: 'all', 'outgoing', 'incoming'
    """
    user_id = current_user.id

    # Build query
    if direction == 'outgoing':
        # Connections where current user sent the request
        query = db.query(Connection).filter(
            Connection.requested_by == user_id,
            Connection.status == status
        )
    elif direction == 'incoming':
        # Connections where current user received the request
        query = db.query(Connection).filter(
            Connection.requested_to == user_id,
            Connection.status == status
        )
    else:  # direction == 'all'
        # All connections (sent or received)
        query = db.query(Connection).filter(
            or_(
                Connection.requested_by == user_id,
                Connection.requested_to == user_id
            ),
            Connection.status == status
        )

    connections = query.all()

    # Enrich with user details (names, emails, profile pictures)
    enriched_connections = []
    for conn in connections:
        # Fetch requester details
        requester = db.query(User).filter(User.id == conn.requested_by).first()
        recipient = db.query(User).filter(User.id == conn.requested_to).first()

        enriched_connections.append({
            'id': conn.id,
            'requested_by': conn.requested_by,
            'requested_to': conn.requested_to,
            'requester_type': conn.requester_type,
            'requested_to_type': conn.requested_to_type,
            'status': conn.status,
            'requester_name': requester.name,
            'requester_email': requester.email,
            'requester_profile_picture': requester.profile_picture,
            'recipient_name': recipient.name,
            'recipient_email': recipient.email,
            'recipient_profile_picture': recipient.profile_picture,
            'requested_at': conn.requested_at,
            'responded_at': conn.responded_at
        })

    return enriched_connections
```

#### Step 5: Database Query
```sql
-- PostgreSQL query executed by SQLAlchemy

-- Example: Get all accepted connections for user_id = 123
SELECT
    c.id,
    c.requested_by,
    c.requested_to,
    c.requester_type,
    c.requested_to_type,
    c.status,
    c.connection_message,
    c.requested_at,
    c.responded_at
FROM connections c
WHERE
    (c.requested_by = 123 OR c.requested_to = 123)
    AND c.status = 'accepted'
ORDER BY c.requested_at DESC;

-- Then for each connection, fetch user details:
SELECT id, name, email, profile_picture
FROM users
WHERE id IN (requester_ids, recipient_ids);
```

#### Step 6: Response Structure
```json
// Example API response: GET /api/connections?status=accepted&direction=all
[
    {
        "id": 1,
        "requested_by": 123,
        "requested_to": 456,
        "requester_type": "tutor",
        "requested_to_type": "student",
        "status": "accepted",
        "requester_name": "John Doe",
        "requester_email": "john@example.com",
        "requester_profile_picture": "https://b2.backblaze.com/.../user_123_profile.jpg",
        "recipient_name": "Jane Smith",
        "recipient_email": "jane@example.com",
        "recipient_profile_picture": "https://b2.backblaze.com/.../user_456_profile.jpg",
        "requested_at": "2025-01-15T10:30:00Z",
        "responded_at": "2025-01-15T11:00:00Z"
    },
    // ... more connections
]
```

#### Step 7: Rendering (Frontend Display)
```javascript
// File: js/tutor-profile/community-panel-data-loader.js (lines 186-261)

function createConnectionCard(connection) {
    // 1. Determine "other user" (the person you're connected to)
    const currentUserId = getCurrentUserId();
    let otherUserName, otherUserAvatar, profileType;

    if (connection.requested_by === currentUserId) {
        // You sent the request → other user is recipient
        otherUserName = connection.recipient_name;
        otherUserAvatar = connection.recipient_profile_picture;
        profileType = connection.requested_to_type;
    } else {
        // You received the request → other user is requester
        otherUserName = connection.requester_name;
        otherUserAvatar = connection.requester_profile_picture;
        profileType = connection.requester_type;
    }

    // 2. Create HTML card
    return `
        <div class="card p-4 hover:shadow-lg...">
            <img src="${otherUserAvatar}" alt="${otherUserName}">
            <h4>${otherUserName}</h4>
            <span class="badge">${profileType}</span>
            <button onclick="messageUser(...)">💬 Message</button>
            <button onclick="viewUserProfile(...)">👁️ View Profile</button>
        </div>
    `;
}

// 3. Inject cards into grid
grid.innerHTML = connections.map(conn => createConnectionCard(conn)).join('');
```

#### Visual Summary: Connections Flow
```
┌─────────────────────────────────────────────────────────────────┐
│ USER CLICKS "CONNECTIONS" → "ALL CONNECTIONS" TAB               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND: loadConnectionsGrid('all-connections-grid', 'all')   │
│ File: community-panel-data-loader.js                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ API CALL: GET /api/connections?status=accepted&direction=all   │
│ Headers: { Authorization: "Bearer <JWT_TOKEN>" }               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND: connection_endpoints.py → get_connections()           │
│ - Decode JWT to get current_user.id                            │
│ - Query connections table                                       │
│ - Join with users table for names/emails/avatars               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ DATABASE QUERY (PostgreSQL)                                     │
│ SELECT * FROM connections WHERE                                 │
│ (requested_by = user_id OR requested_to = user_id)             │
│ AND status = 'accepted'                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ RESPONSE: JSON array of enriched connection objects            │
│ [ { id, requested_by, requester_name, ... }, ... ]            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND RENDERING: createConnectionCard() for each item       │
│ → Display cards in #all-connections-grid                       │
└─────────────────────────────────────────────────────────────────┘
```

---

### **2. EVENTS SECTION**

#### Step 1: User Opens Events Tab
```
User clicks "Events" card → switchCommunityMainTab('events')
→ toggleEventsSubSection('all') // Default sub-tab: All Events
```

#### Step 2: Data Fetching (Frontend → Backend)
```javascript
// File: js/tutor-profile/community-panel-data-loader.js (lines 475-537)

async function loadEventsGrid(gridId, filter = 'all') {
    // 1. Shows loading spinner
    grid.innerHTML = '<loading spinner>';

    // 2. Calls backend API
    const events = await fetchEvents(filter);
}

async function fetchEvents(statusFilter = null) {
    // 1. Get JWT token
    const token = localStorage.getItem('token');

    // 2. Build API URL
    let url = `${API_BASE_URL}/api/events`;
    if (statusFilter) {
        url += `?status_filter=${statusFilter}`;
    }
    // Example: http://localhost:8000/api/events
    // Example: http://localhost:8000/api/events?status_filter=my-events

    // 3. Make GET request
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    // 4. Parse and return
    const data = await response.json();
    return data || [];
}
```

#### Step 3: Backend Processing (API Endpoint)
```python
# File: astegni-backend/events_clubs_endpoints.py (lines 150-200+)

@router.get("/api/events", response_model=List[EventResponse])
async def get_events(
    status_filter: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Get events for current user
    - status_filter: 'all', 'my-events', 'discover'
    """
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        user_id = current_user['id']

        if status_filter == 'my-events':
            # Events where user is registered/joined
            cur.execute("""
                SELECT e.*
                FROM events e
                JOIN event_registrations er ON e.id = er.event_id
                WHERE er.user_id = %s
                ORDER BY e.start_datetime DESC
            """, (user_id,))

        elif status_filter == 'discover':
            # Events user hasn't joined yet (public events)
            cur.execute("""
                SELECT e.*
                FROM events e
                WHERE e.id NOT IN (
                    SELECT event_id FROM event_registrations WHERE user_id = %s
                )
                AND e.status = 'active'
                ORDER BY e.start_datetime DESC
            """, (user_id,))

        else:  # 'all' or None
            # All events (system + tutor-created + joined)
            cur.execute("""
                SELECT * FROM events
                WHERE status = 'active'
                ORDER BY start_datetime DESC
            """)

        events = cur.fetchall()

        # Convert to dict format
        event_list = []
        for event in events:
            event_list.append({
                'id': event[0],
                'tutor_id': event[1],
                'event_picture': event[2],
                'title': event[3],
                'type': event[4],
                'description': event[5],
                'location': event[6],
                'is_online': event[7],
                'start_datetime': event[8],
                'end_datetime': event[9],
                'available_seats': event[10],
                'registered_count': event[11],
                'price': event[12],
                'subjects': event[13],
                'grade_levels': event[14],
                'requirements': event[15],
                'status': event[16],
                'created_at': event[17]
            })

        return event_list

    finally:
        cur.close()
        conn.close()
```

#### Step 4: Database Query
```sql
-- PostgreSQL queries for different filters

-- 1. ALL EVENTS (default)
SELECT * FROM events
WHERE status = 'active'
ORDER BY start_datetime DESC;

-- 2. MY EVENTS (events user registered for)
SELECT e.*
FROM events e
JOIN event_registrations er ON e.id = er.event_id
WHERE er.user_id = 123
ORDER BY e.start_datetime DESC;

-- 3. DISCOVER EVENTS (events user hasn't joined)
SELECT e.*
FROM events e
WHERE e.id NOT IN (
    SELECT event_id FROM event_registrations WHERE user_id = 123
)
AND e.status = 'active'
ORDER BY e.start_datetime DESC;
```

#### Step 5: Response Structure
```json
// Example API response: GET /api/events
[
    {
        "id": 1,
        "tutor_id": 456,
        "event_picture": "https://b2.backblaze.com/.../event_1.jpg",
        "title": "Mathematics Workshop for Grade 10",
        "type": "Workshop",
        "description": "Intensive workshop covering algebra and geometry...",
        "location": "Addis Ababa, Ethiopia",
        "is_online": false,
        "start_datetime": "2025-02-01T09:00:00Z",
        "end_datetime": "2025-02-01T17:00:00Z",
        "available_seats": 50,
        "registered_count": 23,
        "price": 500.00,
        "subjects": ["Mathematics", "Algebra", "Geometry"],
        "grade_levels": ["Grade 10", "Grade 11"],
        "requirements": "Bring calculator and notebook",
        "status": "active",
        "created_at": "2025-01-10T08:00:00Z"
    },
    // ... more events
]
```

#### Step 6: Rendering (Frontend Display)
```javascript
// File: js/tutor-profile/community-panel-data-loader.js (lines 263-334)

function createEventCard(event) {
    const eventTitle = event.title || 'Untitled Event';
    const eventType = event.type || 'General';
    const eventPicture = event.event_picture || '../uploads/system_images/default-event.jpg';
    const startDate = new Date(event.start_datetime).toLocaleDateString(...);
    const availableSeats = event.available_seats;
    const registeredCount = event.registered_count;
    const price = event.price ? `${event.price} ETB` : 'Free';

    return `
        <div class="card overflow-hidden hover:shadow-lg...">
            <img src="${eventPicture}" alt="${eventTitle}">
            <div class="p-4">
                <h4>${eventTitle}</h4>
                <span class="badge">${eventType}</span>
                <p>📅 ${startDate}</p>
                <p>📍 ${event.location}</p>
                <p>👥 ${registeredCount}/${availableSeats} seats</p>
                <p class="price">${price}</p>
                <button onclick="viewEventDetails(${event.id})">View Details</button>
                <button onclick="joinEvent(${event.id})">Join Event</button>
            </div>
        </div>
    `;
}

// Inject cards into grid
grid.innerHTML = events.map(event => createEventCard(event)).join('');
```

#### Visual Summary: Events Flow
```
┌─────────────────────────────────────────────────────────────────┐
│ USER CLICKS "EVENTS" → "ALL EVENTS" TAB                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND: loadEventsGrid('all-events-grid', 'all')             │
│ File: community-panel-data-loader.js                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ API CALL: GET /api/events                                       │
│ Headers: { Authorization: "Bearer <JWT_TOKEN>" }               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND: events_clubs_endpoints.py → get_events()              │
│ - Decode JWT to get current_user.id                            │
│ - Query events table (with optional filters)                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ DATABASE QUERY (PostgreSQL)                                     │
│ SELECT * FROM events WHERE status = 'active'                   │
│ ORDER BY start_datetime DESC                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ RESPONSE: JSON array of event objects                           │
│ [ { id, title, type, location, price, ... }, ... ]            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND RENDERING: createEventCard() for each item            │
│ → Display cards in #all-events-grid                            │
└─────────────────────────────────────────────────────────────────┘
```

---

### **3. CLUBS SECTION**

#### Step 1: User Opens Clubs Tab
```
User clicks "Clubs" card → switchCommunityMainTab('clubs')
→ toggleClubsSubSection('all') // Default sub-tab: All Clubs
```

#### Step 2: Data Fetching (Frontend → Backend)
```javascript
// File: js/tutor-profile/community-panel-data-loader.js (lines 544-592)

async function loadClubsGrid(gridId, filter = 'all') {
    // 1. Shows loading spinner
    grid.innerHTML = '<loading spinner>';

    // 2. Calls backend API
    const clubs = await fetchClubs(filter);
}

async function fetchClubs(statusFilter = null) {
    // 1. Get JWT token
    const token = localStorage.getItem('token');

    // 2. Build API URL
    let url = `${API_BASE_URL}/api/clubs`;
    if (statusFilter) {
        url += `?status_filter=${statusFilter}`;
    }
    // Example: http://localhost:8000/api/clubs
    // Example: http://localhost:8000/api/clubs?status_filter=my-clubs

    // 3. Make GET request
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    // 4. Parse and return
    const data = await response.json();
    return data || [];
}
```

#### Step 3: Backend Processing (API Endpoint)
```python
# File: astegni-backend/events_clubs_endpoints.py (lines 300-400+)

@router.get("/api/clubs", response_model=List[ClubResponse])
async def get_clubs(
    status_filter: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Get clubs for current user
    - status_filter: 'all', 'my-clubs', 'discover'
    """
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        user_id = current_user['id']

        if status_filter == 'my-clubs':
            # Clubs where user is a member
            cur.execute("""
                SELECT c.*
                FROM clubs c
                JOIN club_members cm ON c.id = cm.club_id
                WHERE cm.user_id = %s
                ORDER BY c.created_at DESC
            """, (user_id,))

        elif status_filter == 'discover':
            # Clubs user hasn't joined yet
            cur.execute("""
                SELECT c.*
                FROM clubs c
                WHERE c.id NOT IN (
                    SELECT club_id FROM club_members WHERE user_id = %s
                )
                AND c.status = 'active'
                ORDER BY c.created_at DESC
            """, (user_id,))

        else:  # 'all' or None
            # All clubs (system + tutor-created + joined)
            cur.execute("""
                SELECT * FROM clubs
                WHERE status = 'active'
                ORDER BY created_at DESC
            """)

        clubs = cur.fetchall()

        # Convert to dict format
        club_list = []
        for club in clubs:
            club_list.append({
                'id': club[0],
                'tutor_id': club[1],
                'club_picture': club[2],
                'title': club[3],
                'category': club[4],
                'description': club[5],
                'member_limit': club[6],
                'current_members': club[7],
                'membership_type': club[8],
                'is_paid': club[9],
                'membership_fee': club[10],
                'subjects': club[11],
                'meeting_schedule': club[12],
                'meeting_location': club[13],
                'rules': club[14],
                'status': club[15],
                'created_at': club[16]
            })

        return club_list

    finally:
        cur.close()
        conn.close()
```

#### Step 4: Database Query
```sql
-- PostgreSQL queries for different filters

-- 1. ALL CLUBS (default)
SELECT * FROM clubs
WHERE status = 'active'
ORDER BY created_at DESC;

-- 2. MY CLUBS (clubs user is a member of)
SELECT c.*
FROM clubs c
JOIN club_members cm ON c.id = cm.club_id
WHERE cm.user_id = 123
ORDER BY c.created_at DESC;

-- 3. DISCOVER CLUBS (clubs user hasn't joined)
SELECT c.*
FROM clubs c
WHERE c.id NOT IN (
    SELECT club_id FROM club_members WHERE user_id = 123
)
AND c.status = 'active'
ORDER BY c.created_at DESC;
```

#### Step 5: Response Structure
```json
// Example API response: GET /api/clubs
[
    {
        "id": 1,
        "tutor_id": 456,
        "club_picture": "https://b2.backblaze.com/.../club_1.jpg",
        "title": "Mathematics Olympiad Club",
        "category": "Academic",
        "description": "Prepare for national and international math competitions...",
        "member_limit": 30,
        "current_members": 18,
        "membership_type": "open",
        "is_paid": true,
        "membership_fee": 200.00,
        "subjects": ["Mathematics", "Problem Solving"],
        "meeting_schedule": "Every Saturday, 2:00 PM - 4:00 PM",
        "meeting_location": "Addis Ababa University, Room 301",
        "rules": "Regular attendance required, participate in competitions",
        "status": "active",
        "created_at": "2025-01-05T10:00:00Z"
    },
    // ... more clubs
]
```

#### Step 6: Rendering (Frontend Display)
```javascript
// File: js/tutor-profile/community-panel-data-loader.js (lines 336-412)

function createClubCard(club) {
    const clubTitle = club.title || 'Untitled Club';
    const clubCategory = club.category || 'General';
    const clubPicture = club.club_picture || '../uploads/system_images/default-club.jpg';
    const memberCount = club.current_members;
    const memberLimit = club.member_limit;
    const membershipType = club.membership_type || 'open';
    const membershipFee = club.is_paid ? `${club.membership_fee} ETB` : 'Free';

    return `
        <div class="card overflow-hidden hover:shadow-lg...">
            <img src="${clubPicture}" alt="${clubTitle}">
            <div class="p-4">
                <h4>${clubTitle}</h4>
                <span class="badge">${clubCategory}</span>
                <p>👥 ${memberCount}/${memberLimit} members</p>
                <p>🔒 ${membershipType}</p>
                <p class="fee">Membership: ${membershipFee}</p>
                <button onclick="viewClubDetails(${club.id})">View Details</button>
                <button onclick="joinClub(${club.id})">Join Club</button>
            </div>
        </div>
    `;
}

// Inject cards into grid
grid.innerHTML = clubs.map(club => createClubCard(club)).join('');
```

#### Visual Summary: Clubs Flow
```
┌─────────────────────────────────────────────────────────────────┐
│ USER CLICKS "CLUBS" → "ALL CLUBS" TAB                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND: loadClubsGrid('all-clubs-grid', 'all')               │
│ File: community-panel-data-loader.js                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ API CALL: GET /api/clubs                                        │
│ Headers: { Authorization: "Bearer <JWT_TOKEN>" }               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND: events_clubs_endpoints.py → get_clubs()               │
│ - Decode JWT to get current_user.id                            │
│ - Query clubs table (with optional filters)                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ DATABASE QUERY (PostgreSQL)                                     │
│ SELECT * FROM clubs WHERE status = 'active'                    │
│ ORDER BY created_at DESC                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ RESPONSE: JSON array of club objects                            │
│ [ { id, title, category, members, fee, ... }, ... ]           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND RENDERING: createClubCard() for each item             │
│ → Display cards in #all-clubs-grid                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Complete System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    USER INTERACTION LAYER                               │
│  tutor-profile.html → Community Panel (#tutor-community-panel)         │
│  - Connections Tab (All, Students, Parents, Tutors)                    │
│  - Events Tab (All Events, My Events, Discover Events)                 │
│  - Clubs Tab (All Clubs, My Clubs, Discover Clubs)                     │
│  - Requests Tab (Sent, Received)                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                   FRONTEND JAVASCRIPT LAYER                             │
│  community-panel-data-loader.js                                         │
│  - fetchConnections() → GET /api/connections                           │
│  - fetchEvents() → GET /api/events                                     │
│  - fetchClubs() → GET /api/clubs                                       │
│  - createConnectionCard() / createEventCard() / createClubCard()       │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      BACKEND API LAYER                                  │
│  connection_endpoints.py                                                │
│  - GET /api/connections?status=accepted&direction=all                  │
│  events_clubs_endpoints.py                                              │
│  - GET /api/events?status_filter=my-events                             │
│  - GET /api/clubs?status_filter=discover                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER (PostgreSQL)                         │
│  Tables:                                                                │
│  - connections (user-to-user relationships)                            │
│  - events (educational events)                                          │
│  - clubs (educational clubs)                                            │
│  - event_registrations (user event enrollments)                        │
│  - club_members (user club memberships)                                │
│  - users (authentication and profiles)                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    RESPONSE DATA FLOW                                   │
│  Database → Backend (JSON serialization) → Frontend → DOM Rendering    │
│  - SQL rows converted to JSON objects                                   │
│  - Enriched with user details (names, avatars)                         │
│  - Filtered and formatted for display                                   │
│  - Injected into HTML grids as beautiful cards                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

```
1. User logs in → JWT token generated and stored in localStorage
2. Every API request includes: Authorization: Bearer <JWT_TOKEN>
3. Backend validates token and extracts user_id
4. User_id used to filter database queries (show only relevant data)
```

---

## Key Design Patterns

### 1. **Tab-Based Navigation**
```
Main Tabs (Cards): Connections | Events | Clubs | Requests
Sub-Tabs (Buttons): All | My Items | Discover
```

### 2. **Unified Card Pattern**
All sections use similar card components:
- Header with icon and badge
- Title and description
- Key info (counts, dates, prices)
- Action buttons (View, Join, Message)

### 3. **Filter Architecture**
```javascript
// All data loaded via:
fetchConnections(status, profileType, direction)
fetchEvents(statusFilter)
fetchClubs(statusFilter)

// Filters:
- Connections: status='accepted'|'pending', profileType='student'|'parent'|'tutor'
- Events: statusFilter='all'|'my-events'|'discover'
- Clubs: statusFilter='all'|'my-clubs'|'discover'
```

### 4. **Search Functionality**
Each subsection has a search input that filters displayed cards in real-time using JavaScript:
```javascript
function searchAllConnections(query) {
    // Filter displayed cards by name/email matching query
}
```

---

## Summary

The tutor-community-panel follows a clean **3-tier architecture**:

1. **Presentation Layer** (HTML/CSS): Displays tabs, grids, and cards
2. **Application Layer** (JavaScript): Fetches data, processes responses, renders UI
3. **Data Layer** (Backend API + Database): Stores and retrieves connections, events, clubs

**Data flows from Database → Backend → Frontend → User Interface** in a unidirectional pattern, with JWT authentication securing all requests.
