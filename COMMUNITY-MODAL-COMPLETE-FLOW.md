# Community Modal - Complete Data Flow

## Page Load Sequence

```
Page Loads
    ↓
tutor-profile.html
    ↓
Scripts Load in Order:
    1. communityManager.js
    2. init.js
    ↓
init.js DOMContentLoaded Event
    ↓
new CommunityManager() created
    ↓ (constructor)
    │
    ├─→ initModal()
    │   └─→ attachEvents()
    │
    └─→ loadBadgeCounts() ← AUTOMATIC!
        ↓
        ┌─────────────────────┐
        │  API Calls (Parallel)│
        ├─────────────────────┤
        │ /api/connections/stats
        │ /api/events
        │ /api/clubs
        └─────────────────────┘
        ↓
    updateBadgeCounts()
        ↓
    DOM Updates:
    - all-count = total
    - requests-badge = incoming
    - connections-badge = connected
```

## User Opens Community Modal

```
User Clicks Community Card
    ↓
openCommunityModal() in HTML
    ↓
Modal displays with badges showing counts
    ↓
User Clicks Section (e.g., "All")
    ↓
switchCommunitySection('all')
    ↓
communityManager.loadSectionGrid('all')
    ↓
    ┌──────────────────────────────┐
    │ Determine Section Type       │
    ├──────────────────────────────┤
    │ all/requests/connections     │
    │     ↓                        │
    │ loadConnectionsGrid()        │
    │     ↓                        │
    │ API: /api/connections?...    │
    │     ↓                        │
    │ Filter by category (optional)│
    │     ↓                        │
    │ updateFilterCounts()         │
    │     ↓                        │
    │ displayConnectionsGrid()     │
    │                              │
    │ OR                           │
    │                              │
    │ events                       │
    │     ↓                        │
    │ loadEventsGrid()             │
    │     ↓                        │
    │ API: /api/events             │
    │     ↓                        │
    │ Render event cards           │
    │                              │
    │ OR                           │
    │                              │
    │ clubs                        │
    │     ↓                        │
    │ loadClubsGrid()              │
    │     ↓                        │
    │ API: /api/clubs              │
    │     ↓                        │
    │ Render club cards            │
    └──────────────────────────────┘
```

## User Filters by Category

```
User Clicks "Students" Filter
    ↓
filterCommunity('all', 'students')
    ↓
Update active button styling
    ↓
communityManager.loadSectionGrid('all', 'students')
    ↓
loadConnectionsGrid('all', 'students', grid)
    ↓
Fetch: /api/connections?status=connected
    ↓
Filter connections where:
    otherUser.roles.includes('student')
    ↓
updateFilterCounts() - Recalculate all filters
    ↓
displayConnectionsGrid() - Render filtered cards
```

## Badge Count Update Flow

```
┌─────────────────────────────────────┐
│  loadBadgeCounts()                  │
├─────────────────────────────────────┤
│                                     │
│  Fetch /api/connections/stats       │
│    Returns:                         │
│    {                                │
│      connected_count: 245           │
│      incoming_requests: 12          │
│      outgoing_requests: 5           │
│      ...                            │
│    }                                │
│                                     │
│  Fetch /api/events                  │
│    Returns: { events: [], count: 3 }│
│                                     │
│  Fetch /api/clubs                   │
│    Returns: { clubs: [], count: 2 } │
│                                     │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  updateBadgeCounts()                │
├─────────────────────────────────────┤
│                                     │
│  totalCount = 245 + 12 + 3 + 2      │
│             = 262                   │
│                                     │
│  all-count.textContent = 262        │
│  requests-badge.textContent = 12    │
│  connections-badge.textContent = 245│
│                                     │
└─────────────────────────────────────┘
```

## Filter Count Calculation

```
┌───────────────────────────────────────┐
│  updateFilterCounts(section, conns)   │
├───────────────────────────────────────┤
│                                       │
│  For each connection:                 │
│    otherUser = getOtherUser(conn)     │
│    roles = otherUser.roles            │
│                                       │
│    if roles.includes('student')       │
│       counts.students++               │
│                                       │
│    if roles.includes('parent')        │
│       counts.parents++                │
│                                       │
│    if roles.includes('tutor')         │
│       counts.colleagues++             │
│                                       │
│  Find all filter-count elements       │
│  Update each based on onclick attr    │
│                                       │
│  Filter "All" → counts.all            │
│  Filter "Students" → counts.students  │
│  Filter "Parents" → counts.parents    │
│  Filter "Colleagues" → counts.colleagues
│  Filter "Fans" → counts.fans          │
│                                       │
└───────────────────────────────────────┘
```

## Data Sources

```
┌──────────────────────────────────────┐
│  Badge Counts                        │
├──────────────────────────────────────┤
│  all-count                           │
│    ← /api/connections/stats          │
│    ← /api/events                     │
│    ← /api/clubs                      │
│                                      │
│  requests-badge                      │
│    ← /api/connections/stats          │
│      .incoming_requests              │
│                                      │
│  connections-badge                   │
│    ← /api/connections/stats          │
│      .connected_count                │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  Grid Data                           │
├──────────────────────────────────────┤
│  allGrid                             │
│    ← /api/connections                │
│      ?status=connected&direction=all │
│                                      │
│  requestsGrid                        │
│    ← /api/connections                │
│      ?status=connecting&direction=incoming
│                                      │
│  connectionsGrid                     │
│    ← /api/connections                │
│      ?status=connected&direction=all │
│                                      │
│  eventsGrid                          │
│    ← /api/events                     │
│                                      │
│  clubsGrid                           │
│    ← /api/clubs                      │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  Filter Counts (Dynamic)             │
├──────────────────────────────────────┤
│  Calculated from loaded connections  │
│  by counting user roles:             │
│                                      │
│  - student → Students filter         │
│  - parent → Parents filter           │
│  - tutor → Colleagues filter         │
│  - all → Fans filter (placeholder)   │
└──────────────────────────────────────┘
```

## Key Components

### Backend
- `connection_endpoints.py` - Connection API with roles
- `events_clubs_endpoints.py` - Events/clubs API
- `models.py` - ConnectionResponse with roles

### Frontend
- `communityManager.js` - Main logic
- `tutor-profile.html` - UI structure
- `init.js` - Initialization

## Success Indicators

✅ Console shows: "✅ Community Manager initialized"
✅ Badges show numbers immediately on page load
✅ Numbers match database values
✅ Grids load from API
✅ Filter counts update dynamically
✅ No hardcoded values (257, 89, etc.)
