# Tutor Community Panel - Complete File Map

## 📂 Core Files (Must Have)

### HTML
1. **`profile-pages/tutor-profile.html`** (Lines 2427-2992)
   - Contains the tutor-community-panel HTML structure
   - 4 main sections: Connections, Events, Clubs, Requests
   - Sub-sections for each with tabs and grids
   - Status: ✅ Active (includes min-h-[300px] fixes)

### JavaScript - Data Loading
2. **`js/tutor-profile/community-panel-data-loader.js`** (744 lines)
   - **Purpose**: Fetches and renders data for all sections
   - **Functions**:
     - `fetchConnections()` - API call to get connections
     - `fetchEvents()` - API call to get events
     - `fetchClubs()` - API call to get clubs
     - `loadConnectionsGrid()` - Renders connections in grid
     - `loadEventsGrid()` - Renders events in grid
     - `loadClubsGrid()` - Renders clubs in grid
     - `createConnectionCard()` - Creates connection card HTML
     - `createEventCard()` - Creates event card HTML
     - `createClubCard()` - Creates club card HTML
   - **Empty States**: ✅ Implemented with flex layout conversion
   - **Logging**: ✅ Comprehensive console logging added
   - Status: ✅ Active with latest fixes

3. **`js/tutor-profile/community-panel-integration.js`** (635 lines)
   - **Purpose**: Connects UI interactions with data loading
   - **Functions**:
     - `switchCommunityMainTab()` - Switches between main tabs (Connections/Events/Clubs/Requests)
     - `toggleConnectionsSubSection()` - Switches connection types (All/Students/Parents/Tutors)
     - `toggleEventsSubSection()` - Switches event filters
     - `toggleClubsSubSection()` - Switches club filters
     - `toggleRequestsSubSection()` - Switches requests (Sent/Received)
     - `loadConnectionRequests()` - Loads sent/received connection requests
     - `createConnectionRequestCard()` - Creates request card HTML
     - Search functions for all sections
   - **Empty States**: ✅ Implemented for requests section
   - **Logging**: ✅ Comprehensive console logging added
   - Status: ✅ Active with latest fixes

### CSS
4. **`css/tutor-profile/tutor-profile.css`**
   - Main stylesheet for tutor profile page
   - Includes community panel styles
   - Status: ✅ Active

5. **`css/tutor-profile/community-modal.css`** (Optional)
   - Styles for the community modal (separate from panel)
   - Status: ⚠️ For modal, not panel

## 📂 Related Files (Connected Features)

### Community Modal (Different from Panel)
6. **`js/tutor-profile/community-modal-manager.js`**
   - **Purpose**: Manages the community MODAL (popup), not the panel
   - Different from the panel - this is for a separate modal UI
   - Contains similar functions but for modal context
   - Status: ⚠️ Not directly used by panel

7. **`js/tutor-profile/bookstore-gamestore-communityModal.js`**
   - Combined file with bookstore, gamestore, and community modal logic
   - Status: ⚠️ Legacy/alternative implementation

8. **`js/tutor-profile/community-modal-functions.js`**
   - Helper functions for community modal
   - Status: ⚠️ Not directly used by panel

### Global/Shared Files
9. **`js/page-structure/communityManager.js`**
   - Global community management functions
   - Used across multiple profile types
   - Status: ℹ️ Shared utility

10. **`js/tutor-profile/modal-manager.js`**
    - General modal management
    - Opens/closes various modals
    - Status: ℹ️ Utility

11. **`js/tutor-profile/global-functions.js`**
    - Global utility functions for tutor profile
    - Status: ℹ️ Utility

### Other Profile Types (Similar Implementations)
12. **`js/student-profile/student-community-manager.js`**
    - Community panel for student profile
    - Similar structure to tutor panel
    - Status: ℹ️ Student version

13. **`js/parent-profile/parent-community-manager.js`**
    - Community panel for parent profile
    - Similar structure to tutor panel
    - Status: ℹ️ Parent version

14. **`css/parent-profile/parent-community.css`**
    - Styles for parent community panel
    - Status: ℹ️ Parent version

## 📋 Script Loading Order (in tutor-profile.html)

The scripts are loaded in this order (lines 3800-3850):

```html
<!-- Core Profile Scripts -->
<script src="../js/tutor-profile/init.js"></script>
<script src="../js/tutor-profile/state-manager.js"></script>
<script src="../js/tutor-profile/api-service.js"></script>

<!-- Community Panel Scripts (REQUIRED) -->
<script src="../js/tutor-profile/community-panel-data-loader.js"></script>  <!-- Line 3841 -->
<script src="../js/tutor-profile/community-panel-integration.js"></script>  <!-- Line 3844 -->

<!-- Global Community Manager -->
<script src="../js/page-structure/communityManager.js"></script>  <!-- Line 3847 -->

<!-- Community Modal (separate feature) -->
<script src="../js/tutor-profile/community-modal-manager.js"></script>  <!-- Line 3849 -->

<!-- Other profile scripts... -->
```

## 🔄 Data Flow

```
User clicks tab
    ↓
community-panel-integration.js → switchCommunityMainTab()
    ↓
Calls → toggleConnectionsSubSection() / toggleEventsSubSection() / toggleClubsSubSection() / loadConnectionRequests()
    ↓
Calls → community-panel-data-loader.js → loadConnectionsGrid() / loadEventsGrid() / loadClubsGrid()
    ↓
Calls → fetchConnections() / fetchEvents() / fetchClubs()
    ↓
API call to backend → http://localhost:8000/api/connections | /api/events | /api/clubs
    ↓
Returns data
    ↓
If empty → Show empty state (flex layout)
If has data → Render cards (grid layout)
```

## 🎯 Key Dependencies

### Backend API Endpoints Required:
- `GET /api/connections?status={status}&direction={direction}` - Get connections
- `GET /api/events?status_filter={filter}` - Get events
- `GET /api/clubs?status_filter={filter}` - Get clubs

### Authentication:
- Requires valid JWT token in localStorage (`token`)
- Uses `getCurrentUserId()` to decode user ID from token

### CSS Framework:
- TailwindCSS (via CDN)
- Responsive classes: `md:grid-cols-2`, `lg:grid-cols-3`
- Utility classes: `flex`, `items-center`, `justify-center`

## 📝 Recent Changes

### Empty State Fixes (Latest):
1. ✅ Added `min-h-[300px]` to all grid containers in HTML
2. ✅ Changed grid to flex layout for empty states in JavaScript
3. ✅ Added comprehensive console logging
4. ✅ Fixed requests section empty states

### Files Modified:
- `profile-pages/tutor-profile.html` - Added min-height to 19 containers
- `js/tutor-profile/community-panel-data-loader.js` - Grid to flex conversion + logging
- `js/tutor-profile/community-panel-integration.js` - Enhanced logging for requests

## 🚫 Files NOT Used by Panel (Can Ignore)

- `js/tutor-profile/bookstore-gamestore-communityModal.js` - Modal only
- `js/tutor-profile/community-modal-functions.js` - Modal only
- Any files in `old-pages/` directory
- `*-backup.html` or `*-refactored.html` files

## 📊 Summary

**Essential Files (3):**
1. `profile-pages/tutor-profile.html` - Structure
2. `js/tutor-profile/community-panel-data-loader.js` - Data fetching & rendering
3. `js/tutor-profile/community-panel-integration.js` - UI interactions & tab switching

**Supporting Files (2):**
4. `css/tutor-profile/tutor-profile.css` - Styling
5. `js/page-structure/communityManager.js` - Shared utilities

**Total Core Files**: 5 files
**Total Related Files**: 14 files (including student/parent versions and modal alternatives)
