# Community Panel Complete Data Flow - Step by Step

## File Relationships

```
tutor-profile.html (HTML Structure)
        ↓
        ├── community-panel-integration.js (UI Controller & Event Handlers)
        │   ↓
        │   └── Calls functions from ↓
        │
        └── community-panel-data-loader.js (Data Fetching & Rendering)
            ↓
            └── Makes API calls to Backend
                    ↓
                    Backend APIs (connection_endpoints.py, events_clubs_endpoints.py)
                    ↓
                    PostgreSQL Database
```

---

## Complete Step-by-Step Flow

### **PHASE 1: PAGE INITIALIZATION**

#### Step 1: HTML Loads
```html
<!-- File: tutor-profile.html -->
<div id="tutor-community-panel" class="panel-content hidden">
    <!-- Main tab cards -->
    <div onclick="switchCommunityMainTab('connections')">Connections</div>
    <div onclick="switchCommunityMainTab('events')">Events</div>
    <div onclick="switchCommunityMainTab('clubs')">Clubs</div>
    <div onclick="switchCommunityMainTab('requests')">Requests</div>

    <!-- Tab content sections -->
    <div id="connections-main-tab-content">
        <!-- Sub-tabs -->
        <button onclick="toggleConnectionsSubSection('all')">All Connections</button>
        <button onclick="toggleConnectionsSubSection('students')">Students</button>
        ...

        <!-- Data grids -->
        <div id="all-connections-grid"></div>
        <div id="student-connections-grid"></div>
        ...
    </div>

    <div id="events-main-tab-content">...</div>
    <div id="clubs-main-tab-content">...</div>
</div>

<!-- JavaScript files loaded at bottom -->
<script src="../js/tutor-profile/community-panel-data-loader.js"></script>
<script src="../js/tutor-profile/community-panel-integration.js"></script>
```

#### Step 2: JavaScript Files Execute
```javascript
// File: community-panel-data-loader.js
// Defines data fetching functions:
- fetchConnections(status, profileType, direction)
- fetchEvents(statusFilter)
- fetchClubs(statusFilter)
- loadConnectionsGrid(gridId, profileType)
- loadEventsGrid(gridId, filter)
- loadClubsGrid(gridId, filter)
- createConnectionCard(connection)
- createEventCard(event)
- createClubCard(club)

// File: community-panel-integration.js
// Defines UI control functions:
- switchCommunityMainTab(tabName)
- toggleConnectionsSubSection(section)
- toggleEventsSubSection(section)
- toggleClubsSubSection(section)
- search functions for each section

// DOMContentLoaded event listener (lines 545-567)
document.addEventListener('DOMContentLoaded', function() {
    // Listen for panel switch events
    window.addEventListener('panelSwitch', function(event) {
        if (event.detail.panel === 'tutor-community') {
            // Auto-load connections when panel opens
            switchCommunityMainTab('connections');
        }
    });
});
```

---

### **PHASE 2: USER OPENS COMMUNITY PANEL**

#### Step 3: User Clicks "Community" Card
```
User Action: Click on Community card in sidebar
        ↓
Panel Manager (from other file) fires 'panelSwitch' event
        ↓
community-panel-integration.js catches event (line 549-556)
        ↓
Calls: switchCommunityMainTab('connections')
```

#### Step 4: Main Tab Switch Function Executes
```javascript
// File: community-panel-integration.js (lines 15-64)

function switchCommunityMainTab(tabName) {  // tabName = 'connections'

    // 1. Hide all main tab contents
    document.querySelectorAll('.community-main-tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    // 2. Remove active class from all main tab cards
    document.querySelectorAll('.community-main-card').forEach(card => {
        card.classList.remove('active-community-card');
    });

    // 3. Show selected tab content
    document.getElementById('connections-main-tab-content').classList.remove('hidden');

    // 4. Add active class to selected card
    document.getElementById('connections-main-tab').classList.add('active-community-card');

    // 5. Load data based on tab
    if (tabName === 'connections') {
        loadConnectionsGrid('all-connections-grid', 'all');  // ← DATA LOADING STARTS
    }
}
```

---

### **PHASE 3: DATA FETCHING (CONNECTIONS EXAMPLE)**

#### Step 5: Load Connections Grid
```javascript
// File: community-panel-data-loader.js (lines 423-468)

async function loadConnectionsGrid(gridId, profileType) {
    // gridId = 'all-connections-grid'
    // profileType = 'all'

    const grid = document.getElementById(gridId);

    // 1. Show loading spinner
    grid.innerHTML = `
        <div class="animate-spin...">Loading connections...</div>
    `;

    // 2. Fetch connections from API
    const connections = await fetchConnections('accepted', profileType, 'all');

    // 3. Check if empty
    if (connections.length === 0) {
        grid.innerHTML = `<div>No connections found</div>`;
        return;
    }

    // 4. Render connection cards
    grid.innerHTML = connections.map(conn => createConnectionCard(conn)).join('');
}
```

#### Step 6: Fetch Connections from API
```javascript
// File: community-panel-data-loader.js (lines 20-66)

async function fetchConnections(status = 'accepted', profileType = null, direction = 'all') {

    // 1. Get JWT token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No authentication token found');
        return [];
    }

    // 2. Build API URL
    let url = `http://localhost:8000/api/connections?status=accepted&direction=all`;

    // 3. Make GET request with Authorization header
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    // 4. Parse JSON response
    const data = await response.json();

    // 5. Filter by profile type if specified
    if (profileType && profileType !== 'all') {
        const currentUserId = getCurrentUserId();
        return data.filter(conn => {
            if (conn.requested_by === currentUserId) {
                return conn.requested_to_type === profileType;  // Filter by recipient type
            } else {
                return conn.requester_type === profileType;  // Filter by requester type
            }
        });
    }

    return data;  // Return all connections
}
```

---

### **PHASE 4: BACKEND API PROCESSING**

#### Step 7: Backend Receives API Request
```python
# File: astegni-backend/connection_endpoints.py

@router.get("/api/connections")
async def get_connections(
    status: str = 'accepted',
    direction: str = 'all',
    current_user: User = Depends(get_current_user),  # JWT decoded here
    db: Session = Depends(get_db)
):
    """
    Get connections for current user
    1. JWT token is decoded to get current_user.id
    2. Query connections table
    3. Enrich with user details
    4. Return JSON
    """

    user_id = current_user.id  # e.g., 123

    # Build SQLAlchemy query
    if direction == 'all':
        query = db.query(Connection).filter(
            or_(
                Connection.requested_by == user_id,
                Connection.requested_to == user_id
            ),
            Connection.status == status
        )

    connections = query.all()

    # Enrich with user details
    enriched_connections = []
    for conn in connections:
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

    return enriched_connections  # Returns JSON array
```

#### Step 8: Database Query Execution
```sql
-- PostgreSQL query executed by SQLAlchemy

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
WHERE id IN (456, 789, 234, ...);
```

---

### **PHASE 5: RESPONSE PROCESSING & RENDERING**

#### Step 9: Backend Returns JSON
```json
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
        "requester_profile_picture": "https://b2.../user_123.jpg",
        "recipient_name": "Jane Smith",
        "recipient_email": "jane@example.com",
        "recipient_profile_picture": "https://b2.../user_456.jpg",
        "requested_at": "2025-01-15T10:30:00Z",
        "responded_at": "2025-01-15T11:00:00Z"
    },
    {
        "id": 2,
        "requested_by": 789,
        "requested_to": 123,
        ...
    }
]
```

#### Step 10: Frontend Creates HTML Cards
```javascript
// File: community-panel-data-loader.js (lines 191-261)

function createConnectionCard(connection) {
    const currentUserId = getCurrentUserId();  // e.g., 123

    // Determine "other user" (the person you're connected to)
    let otherUserName, otherUserAvatar, profileType;

    if (connection.requested_by === currentUserId) {
        // You sent the request → other user is recipient
        otherUserName = connection.recipient_name;  // "Jane Smith"
        otherUserAvatar = connection.recipient_profile_picture;
        profileType = connection.requested_to_type;  // "student"
    } else {
        // You received the request → other user is requester
        otherUserName = connection.requester_name;  // "Alice Brown"
        otherUserAvatar = connection.requester_profile_picture;
        profileType = connection.requester_type;  // "parent"
    }

    const userRole = profileType.charAt(0).toUpperCase() + profileType.slice(1);  // "Student"
    const userAvatar = otherUserAvatar || getDefaultAvatar(userRole);

    // Create HTML card
    return `
        <div class="card p-4 hover:shadow-lg...">
            <div class="flex items-start gap-3 mb-3">
                <img src="${userAvatar}"
                     alt="${otherUserName}"
                     class="w-16 h-16 rounded-full...">
                <div class="flex-1">
                    <h4 class="font-bold text-gray-800...">${otherUserName}</h4>
                    <span class="text-xs px-2 py-1 rounded-full bg-blue-100...">
                        ${getRoleIcon(userRole)} ${userRole}
                    </span>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="messageUser(${connection.requested_to})">
                    💬 Message
                </button>
                <button onclick="viewUserProfile(${connection.requested_to}, '${userRole}')">
                    👁️ View Profile
                </button>
            </div>
        </div>
    `;
}
```

#### Step 11: Inject HTML into Grid
```javascript
// Back in loadConnectionsGrid() (line 457)
grid.innerHTML = connections.map(conn => createConnectionCard(conn)).join('');

// Result: HTML cards injected into #all-connections-grid div
```

#### Step 12: User Sees Cards on Screen
```
┌──────────────────────────────────────────────────────────┐
│ 👥 All Connections                                       │
├──────────────────────────────────────────────────────────┤
│ ┌───────────────┐  ┌───────────────┐  ┌───────────────┐ │
│ │  👨‍🎓 Jane Smith │  │  👨‍👩‍👧 Alice Brown│  │  👨‍🏫 Bob Johnson│ │
│ │  Student       │  │  Parent        │  │  Tutor        │ │
│ │  💬 Message    │  │  💬 Message    │  │  💬 Message   │ │
│ │  👁️ View       │  │  👁️ View       │  │  👁️ View      │ │
│ └───────────────┘  └───────────────┘  └───────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

### **PHASE 6: SUB-TAB SWITCHING (USER INTERACTION)**

#### Step 13: User Clicks "Students" Tab
```
User clicks: <button onclick="toggleConnectionsSubSection('students')">
        ↓
community-panel-integration.js (lines 73-121)
        ↓
function toggleConnectionsSubSection('students') {
    // 1. Update tab button styles
    // 2. Hide all .connections-subsection divs
    // 3. Show #students-connections-subsection div
    // 4. Load data
    loadConnectionsGrid('student-connections-grid', 'student');  // ← New data fetch
}
```

#### Step 14: Data Fetching Repeats (Same Process)
```
loadConnectionsGrid('student-connections-grid', 'student')
    ↓
fetchConnections('accepted', 'student', 'all')
    ↓
GET /api/connections?status=accepted&direction=all
    ↓
Filter by profileType === 'student' (frontend filter)
    ↓
createConnectionCard() for each student connection
    ↓
Inject HTML into #student-connections-grid
    ↓
User sees only student connections
```

---

## EVENTS & CLUBS FLOW (Similar Pattern)

### **Events Flow:**
```
User clicks "Events" main tab
    ↓
switchCommunityMainTab('events')  [community-panel-integration.js:52]
    ↓
loadEventsGrid('joined-events-grid', 'joined')  [community-panel-data-loader.js:475]
    ↓
fetchEvents('joined')  [community-panel-data-loader.js:92]
    ↓
GET /api/events?status_filter=joined
    ↓
Backend: events_clubs_endpoints.py → get_events()
    ↓
SQL: SELECT * FROM events JOIN event_registrations WHERE user_id = 123
    ↓
JSON response with event objects
    ↓
createEventCard() for each event  [community-panel-data-loader.js:268]
    ↓
Inject HTML into #joined-events-grid
    ↓
User sees event cards
```

### **Clubs Flow:**
```
User clicks "Clubs" main tab
    ↓
switchCommunityMainTab('clubs')  [community-panel-integration.js:56]
    ↓
loadClubsGrid('joined-clubs-grid', 'joined')  [community-panel-data-loader.js:544]
    ↓
fetchClubs('joined')  [community-panel-data-loader.js:140]
    ↓
GET /api/clubs?status_filter=joined
    ↓
Backend: events_clubs_endpoints.py → get_clubs()
    ↓
SQL: SELECT * FROM clubs JOIN club_members WHERE user_id = 123
    ↓
JSON response with club objects
    ↓
createClubCard() for each club  [community-panel-data-loader.js:341]
    ↓
Inject HTML into #joined-clubs-grid
    ↓
User sees club cards
```

---

## FILE RESPONSIBILITIES BREAKDOWN

### **1. tutor-profile.html**
**Role**: Provides the HTML structure
- Defines panel container: `#tutor-community-panel`
- Defines main tab cards with `onclick="switchCommunityMainTab('...')"`
- Defines sub-tab buttons with `onclick="toggleConnectionsSubSection('...')"`
- Defines empty grid containers: `#all-connections-grid`, `#student-connections-grid`, etc.
- Loads JavaScript files at the end

### **2. community-panel-data-loader.js**
**Role**: Data fetching and rendering
- **Fetching Functions**: `fetchConnections()`, `fetchEvents()`, `fetchClubs()`
  - Makes API calls to backend
  - Handles authentication (JWT tokens)
  - Returns JSON data
- **Loading Functions**: `loadConnectionsGrid()`, `loadEventsGrid()`, `loadClubsGrid()`
  - Shows loading spinner
  - Calls fetching functions
  - Calls card creation functions
  - Injects HTML into grids
- **Card Creation Functions**: `createConnectionCard()`, `createEventCard()`, `createClubCard()`
  - Takes JSON object
  - Returns HTML string
- **Helper Functions**: `getCurrentUserId()`, `getRoleIcon()`, `getDefaultAvatar()`

### **3. community-panel-integration.js**
**Role**: UI control and event handling
- **Main Tab Switching**: `switchCommunityMainTab(tabName)`
  - Shows/hides main tab content
  - Updates active tab styling
  - Triggers initial data loading
- **Sub-Tab Switching**:
  - `toggleConnectionsSubSection(section)`
  - `toggleEventsSubSection(section)`
  - `toggleClubsSubSection(section)`
  - Shows/hides subsections
  - Updates tab button styles
  - Triggers data loading for that subsection
- **Search Functions**: `searchAllConnections()`, `searchJoinedEvents()`, etc.
  - Handles search input events
  - Re-triggers data loading with search query
- **Initialization**: DOMContentLoaded event listener
  - Listens for panel switch events
  - Auto-loads connections when panel opens
- **Exports**: All functions to `window` object for global access

---

## DATA FLOW DIAGRAM (All Sections)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     USER OPENS COMMUNITY PANEL                      │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Panel Manager fires 'panelSwitch' event                            │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ community-panel-integration.js catches event (line 549)            │
│ Calls: switchCommunityMainTab('connections')                       │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ switchCommunityMainTab() executes:                                  │
│ 1. Hide all tabs                                                    │
│ 2. Show 'connections-main-tab-content'                             │
│ 3. Call: loadConnectionsGrid('all-connections-grid', 'all')       │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ community-panel-data-loader.js → loadConnectionsGrid():            │
│ 1. Show loading spinner in grid                                    │
│ 2. Call: fetchConnections('accepted', 'all', 'all')               │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ fetchConnections() executes:                                        │
│ 1. Get JWT token from localStorage                                 │
│ 2. Build URL: /api/connections?status=accepted&direction=all      │
│ 3. fetch() with Authorization header                               │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ BACKEND: connection_endpoints.py → get_connections()               │
│ 1. Decode JWT to get current_user.id                              │
│ 2. Query connections table with SQLAlchemy                         │
│ 3. Join with users table to get names/emails/avatars              │
│ 4. Return enriched JSON array                                      │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ DATABASE: PostgreSQL executes query                                 │
│ SELECT * FROM connections WHERE ...                                │
│ SELECT * FROM users WHERE id IN (...)                              │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Backend returns JSON:                                               │
│ [                                                                   │
│   { id: 1, requester_name: "John", recipient_name: "Jane", ... },│
│   { id: 2, requester_name: "Alice", recipient_name: "Bob", ... } │
│ ]                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ fetchConnections() returns data to loadConnectionsGrid()           │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ loadConnectionsGrid():                                              │
│ 1. Loop through connections array                                  │
│ 2. Call createConnectionCard(conn) for each                       │
│ 3. Join HTML strings                                                │
│ 4. Set grid.innerHTML = htmlString                                 │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ createConnectionCard():                                             │
│ 1. Determine "other user" from connection object                   │
│ 2. Get role icon and default avatar                                │
│ 3. Return HTML card string with buttons                            │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ USER SEES RENDERED CARDS ON SCREEN                                  │
│ ┌────────┐  ┌────────┐  ┌────────┐                                │
│ │ Jane   │  │ Alice  │  │ Bob    │                                 │
│ │ Student│  │ Parent │  │ Tutor  │                                 │
│ │ 💬 👁️  │  │ 💬 👁️  │  │ 💬 👁️  │                                 │
│ └────────┘  └────────┘  └────────┘                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## KEY DESIGN PATTERNS

### 1. **Separation of Concerns**
- **HTML**: Structure only (no inline JavaScript logic)
- **Integration JS**: UI control (tab switching, showing/hiding, event handling)
- **Data Loader JS**: Data fetching and rendering (API calls, card creation)

### 2. **Function Chaining**
```
User Click → UI Function → Data Loading Function → API Fetch Function → Card Creation → HTML Injection
```

### 3. **Global Function Exports**
```javascript
// community-panel-integration.js exports to window:
window.switchCommunityMainTab = switchCommunityMainTab;
window.toggleConnectionsSubSection = toggleConnectionsSubSection;
// etc.

// This allows HTML onclick handlers to work:
<button onclick="toggleConnectionsSubSection('students')">
```

### 4. **Event-Driven Architecture**
```javascript
// Panel manager fires custom event
window.dispatchEvent(new CustomEvent('panelSwitch', { detail: { panel: 'tutor-community' } }));

// Integration JS listens and reacts
window.addEventListener('panelSwitch', function(event) {
    if (event.detail.panel === 'tutor-community') {
        switchCommunityMainTab('connections');
    }
});
```

### 5. **Async/Await Data Flow**
```javascript
async function loadConnectionsGrid() {
    const connections = await fetchConnections();  // Wait for API
    grid.innerHTML = connections.map(createCard).join('');  // Then render
}
```

---

## SUMMARY: COMPLETE FLOW IN ONE SENTENCE

**User opens Community Panel → Integration JS switches tab → Data Loader JS fetches from backend API → Backend queries PostgreSQL → Backend returns enriched JSON → Data Loader JS creates HTML cards → HTML injected into grid → User sees connections/events/clubs.**
