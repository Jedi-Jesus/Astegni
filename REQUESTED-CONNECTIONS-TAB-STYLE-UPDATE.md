# Requested Connections & Tab-Style Community Update

## Summary
Added "Requested" connections functionality and converted community cards to tab-style layout in parent-profile.html.

## Changes Made

### 1. Added "Requested" Tab to Parent-Community-Panel (parent-profile.html)

**Location:** Line 3221-3223
- Added a new "Requested" button with badge count display
- Positioned between "All" and "Tutors" tabs
- Shows incoming connection requests with status="connecting"

```html
<button class="connection-tab" data-tab="requested" onclick="switchConnectionTab('requested')" style="...">
    Requested <span class="filter-count" data-role="requested" style="...">0</span>
</button>
```

### 2. Added "Requested" Filter to CommunityModal (parent-profile.html)

**Location:** Line 5109-5111
- Added "🔔 Requested" filter button in community modal connections section
- Matches the same functionality as parent-community-panel
- Displays count badge for incoming connection requests

```html
<button class="filter-btn" data-filter="requested" onclick="filterConnectionsBy('requested')">
    🔔 Requested <span class="filter-count" data-role="requested">0</span>
</button>
```

### 3. Converted Community Cards to Tab-Style Layout (parent-profile.html)

**Location:** Line 3163-3191
- Replaced card-grid layout with horizontal tab navigation
- Modern tab design with active state styling
- Each tab shows icon, label, and count
- Responsive with overflow scrolling on mobile
- Tabs: Connections, Events, Clubs

**Before:** Grid of 3 clickable cards (280px minimum width each)
**After:** Horizontal tab bar with 3 tabs (140px minimum width each)

### 4. Updated ParentCommunityManager (parent-community-manager.js)

#### Constructor Updates (Line 14)
- Added `this.requestedConnections = []` array
- Updated `currentConnectionTab` comment to include "requested"

#### loadInitialCounts() Method (Lines 49-58)
- Added API call to fetch incoming connection requests:
  ```javascript
  const requestedResponse = await fetch(
    `${this.API_BASE_URL}/api/connections?status=connecting&direction=incoming`,
    { headers: { 'Authorization': `Bearer ${token}` }}
  );
  ```
- Stores requested connections in `this.requestedConnections`

#### updateConnectionCounts() Method (Lines 219-244)
- Added `requested: this.requestedConnections.length` to counts object
- Updated selector to include both `.connection-tab` and `.filter-btn` for badge updates

#### displayConnections() Method (Lines 246-281)
- Added handling for `tab === 'requested'`
- Shows `this.requestedConnections` when requested tab is active
- Uses `createRequestedConnectionCard()` for requested connections
- Custom empty state message: "No pending connection requests"

#### New Method: createRequestedConnectionCard() (Lines 337-392)
- Creates connection card with yellow/amber styling (#fbbf24 border)
- Shows "Wants to connect as [Role]" instead of "Connected as"
- Displays "Requested today/yesterday/X days ago"
- **Action Buttons:**
  - ✅ Accept (green #10b981)
  - ❌ Reject (red #ef4444)
  - 👤 View Profile (outlined)

#### New Method: acceptConnection() (Lines 394-423)
- Async method to accept connection requests
- API: `PUT /api/connections/${connectionId}/accept`
- Shows success/error alerts
- Reloads connections after acceptance

#### New Method: rejectConnection() (Lines 425-454)
- Async method to reject connection requests
- API: `PUT /api/connections/${connectionId}/reject`
- Shows success/error alerts
- Reloads connections after rejection

#### switchSection() Method Updates (Lines 94-139)
- Added tab styling logic for `.community-main-tab` elements
- Updates `background` and `color` based on active state
- Shows/hides `.community-tabs` instead of `.community-cards-grid`

## API Endpoints Used

### Fetch Requested Connections
```
GET /api/connections?status=connecting&direction=incoming
Authorization: Bearer {token}
```

**Response:** Array of connection objects with status="connecting"

### Accept Connection Request
```
PUT /api/connections/{connectionId}/accept
Authorization: Bearer {token}
```

### Reject Connection Request
```
PUT /api/connections/{connectionId}/reject
Authorization: Bearer {token}
```

## Connection Status Flow

1. **User A sends connection request to User B**
   - Status: "connecting"
   - User A sees it in "Outgoing" requests
   - User B sees it in "Requested" tab

2. **User B accepts the request**
   - Status changes to "connected"
   - Both users see each other in "All Connections"
   - Connection disappears from "Requested" tab

3. **User B rejects the request**
   - Status changes to "connection_failed"
   - Connection removed from both users' active lists

## Visual Design

### Requested Connection Cards
- **Border:** 2px solid yellow (#fbbf24)
- **Hover Shadow:** Yellow glow (rgba(251,191,36,0.3))
- **Background Highlight:** rgba(251,191,36,0.1)
- **Status Badge:** Yellow with white text
- **Indicator Dot:** Yellow circle (bottom-right of avatar)

### Tab-Style Navigation
- **Active Tab:**
  - Background: `var(--button-bg)` (primary color)
  - Text: white
  - Bold count number

- **Inactive Tab:**
  - Background: transparent
  - Text: `var(--text)` (normal text color)
  - Normal count number

- **Layout:**
  - Flex container with 0.5rem gap
  - 0.5rem padding around tabs
  - 1rem padding inside each tab
  - Border-radius: 12px (container), 8px (tabs)

## Testing Instructions

### 1. Test Requested Connections Tab
```bash
# Start backend
cd astegni-backend
python app.py

# Open parent profile
http://localhost:8080/profile-pages/parent-profile.html
```

1. Go to Community panel
2. Click "Connections" tab
3. Click "Requested" sub-tab
4. Should show incoming connection requests
5. Try Accept/Reject buttons

### 2. Test Tab-Style Layout
1. Navigate to Community panel in parent-profile
2. Verify horizontal tab navigation appears
3. Click each tab (Connections, Events, Clubs)
4. Active tab should have primary color background
5. Count numbers should update correctly

### 3. Test CommunityModal
1. Click "Connections" card in parent-community-panel
2. Modal should open with connection filters
3. Click "🔔 Requested" filter
4. Should show same requested connections as panel

## Browser Compatibility
- ✅ Modern browsers (Chrome, Firefox, Edge, Safari)
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Dark mode support via CSS variables
- ✅ Overflow scrolling on narrow screens

## Files Modified
1. `profile-pages/parent-profile.html` (3 sections updated)
2. `js/parent-profile/parent-community-manager.js` (9 methods updated/added)

## Related Documentation
- Connection system: `astegni-backend/connection_endpoints.py`
- Connection statuses: "connecting", "connected", "disconnect", "connection_failed", "blocked"
- Parent profile architecture: `PARENT-PROFILE-PANEL-STRUCTURE.md`

---

**Date:** 2025-01-XX
**Status:** ✅ Complete and ready for testing
**Feature:** Requested Connections + Tab-Style Community Navigation
