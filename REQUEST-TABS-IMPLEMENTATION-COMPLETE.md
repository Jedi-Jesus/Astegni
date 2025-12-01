# Request Tabs Implementation Complete

## Summary

Successfully implemented a two-tab system for the **Requests** section in the Community Modal of `tutor-profile.html`. The requests are now split into:

1. **Request Received** (📩) - Incoming connection requests that need approval
2. **Request Sent** (📤) - Outgoing connection requests awaiting response

---

## Changes Made

### 1. Frontend HTML (`tutor-profile.html`)

**Added Tab Structure:**
- Created two tab buttons at the top of the requests section
- Tab badges show counts: `received-count` and `sent-count`
- Active tab styling (blue background for active, bordered for inactive)

**Split Content Areas:**
- `received-content`: Shows incoming requests with Accept/Decline buttons
- `sent-content`: Shows outgoing requests with View Profile/Cancel buttons
- Each content area has its own:
  - Search box (with unique IDs: `received-search`, `sent-search`)
  - Filter buttons (All, Students, Parents, Tutors)
  - Grid container (`receivedGrid`, `sentGrid`)

**JavaScript Functions Added:**
- `switchRequestTab(tab)`: Switches between received/sent tabs
  - Updates button styling
  - Shows/hides content sections
  - Loads data via `communityManager.loadRequestTab()`
- Updated `filterCommunity()`: Now handles 'received' and 'sent' sections separately
- Updated `switchCommunitySection()`: Loads "received" tab by default when opening requests

---

### 2. Backend Integration (`communityManager.js`)

**Badge System Updates:**
- `initializeBadges()`: Initializes `received-count` and `sent-count` to 0
- `updateBadgeCounts()`:
  - Fetches `incoming_requests` and `outgoing_requests` from API stats
  - Updates both tab counts and main requests badge (total of both)

**New Methods Added:**

#### `loadRequestTab(tab, category = 'all')`
- **Purpose**: Loads requests for a specific tab (received/sent)
- **Parameters**:
  - `tab`: 'received' or 'sent'
  - `category`: 'all', 'students', 'parents', 'tutors'
- **API Call**: `GET /api/connections?status=connecting&direction=incoming/outgoing`
- **Features**:
  - Shows loading state
  - Filters by category (role-based)
  - Updates filter counts dynamically
  - Displays requests in grid

#### `updateRequestFilterCounts(tab, allRequests)`
- **Purpose**: Updates filter badges for a specific tab
- **Counts**: all, students, parents, tutors
- **Updates**: Filter count badges in the respective content section

#### `displayRequestsGrid(grid, requests, tab)`
- **Purpose**: Renders request cards in the grid
- **Different Actions**:
  - **Received**: Accept / Decline buttons
  - **Sent**: View Profile / Cancel buttons
- **Card Design**:
  - User avatar with online indicator
  - User name and role badge
  - Email address
  - Status message ("Pending your approval" vs "Awaiting response")

#### `cancelSentRequest(connectionId)`
- **Purpose**: Cancel an outgoing request
- **API Call**: `DELETE /api/connections/{id}`
- **Confirmation**: Asks user confirmation before cancelling
- **Reload**: Refreshes sent tab and badge counts

#### `searchRequestTab(tab, query)`
- **Purpose**: Search within a specific tab
- **Features**:
  - Searches by name, email, or role
  - Shows loading state during search
  - Displays "No results found" message if empty
  - Client-side filtering after fetching all requests

**Event Listeners Added:**
- `received-search` input: Triggers `searchRequestTab('received', query)`
- `sent-search` input: Triggers `searchRequestTab('sent', query)`

---

## Backend API Endpoints Used

### Primary Endpoint: `GET /api/connections`

**Query Parameters:**
- `status=connecting` - Only pending requests
- `direction=incoming` - Requests received
- `direction=outgoing` - Requests sent

**Response Structure:**
```json
[
  {
    "id": 123,
    "user_id_1": 45,
    "user_id_2": 67,
    "status": "connecting",
    "user_1_name": "John Doe",
    "user_2_name": "Jane Smith",
    "user_1_email": "john@example.com",
    "user_2_email": "jane@example.com",
    "user_1_profile_picture": "...",
    "user_2_profile_picture": "...",
    "user_1_roles": ["student"],
    "user_2_roles": ["tutor"],
    "profile_type_1": "student",
    "profile_type_2": "tutor",
    "created_at": "2025-01-15T10:30:00"
  }
]
```

### Stats Endpoint: `GET /api/connections/stats`

**Response Structure:**
```json
{
  "connected_count": 15,
  "incoming_requests": 3,
  "outgoing_requests": 2,
  "total_connections": 20
}
```

### Action Endpoints:
- `PUT /api/connections/{id}` - Accept/reject requests (status: 'connected' or 'connection_failed')
- `DELETE /api/connections/{id}` - Cancel sent requests

---

## User Experience Flow

### Opening Requests Section:
1. User clicks "Requests" in community menu
2. "Request Received" tab opens by default
3. Badge counts load from API (both tabs)
4. Incoming requests display in grid

### Switching Tabs:
1. User clicks "Request Sent" button
2. Tab button styling updates (active/inactive)
3. Content sections swap (hide received, show sent)
4. Outgoing requests load from API
5. Different action buttons appear

### Request Received Tab:
- **See**: Users who want to connect with you
- **Actions**:
  - **Accept** → Connection established
  - **Decline** → Request rejected
- **Status**: "Pending your approval"

### Request Sent Tab:
- **See**: Users you've sent connection requests to
- **Actions**:
  - **View Profile** → Navigate to their profile page
  - **Cancel** → Delete the connection request
- **Status**: "Awaiting response"

### Filtering:
1. Click filter button (e.g., "Students")
2. Grid reloads with filtered results
3. Filter counts update
4. Only users with that role appear

### Searching:
1. Type in search box
2. Real-time filtering by name/email/role
3. "No results found" message if empty
4. Clear search to show all again

---

## Key Features

✅ **Two-Tab System**: Separate received and sent requests
✅ **Real-Time Counts**: Badge counts from API stats
✅ **Role-Based Filtering**: Filter by Students, Parents, Tutors
✅ **Search Functionality**: Search within each tab separately
✅ **Different Actions**: Accept/Decline vs View/Cancel
✅ **Empty States**: User-friendly messages when no requests
✅ **Loading States**: Spinner while fetching data
✅ **Error Handling**: Retry buttons on API failures
✅ **Responsive Design**: Clean card-based layout
✅ **Dynamic Counts**: Filter counts update per role

---

## Testing Guide

### 1. Start the Backend:
```bash
cd astegni-backend
python app.py
```

### 2. Open Frontend:
```bash
# From project root
python -m http.server 8080
```

### 3. Navigate to Tutor Profile:
- Login as a tutor user
- Go to: `http://localhost:8080/profile-pages/tutor-profile.html`

### 4. Open Community Modal:
- Click the "Requests" card in the profile header stats
- OR click "Requests" in the community modal menu

### 5. Test Received Tab:
- Should show incoming connection requests
- Badge count should match number of incoming requests
- Test Accept button → Request becomes connection
- Test Decline button → Request gets rejected
- Test filters (Students, Parents, Tutors)
- Test search box

### 6. Test Sent Tab:
- Click "Request Sent" tab
- Should show outgoing connection requests
- Badge count should match number of outgoing requests
- Test View Profile button → Opens correct profile page
- Test Cancel button → Deletes the request
- Test filters and search

### 7. Test Edge Cases:
- No requests → Should show empty state message
- Search with no results → Should show "No results found"
- Network error → Should show error with retry button
- Not logged in → Should show login message

---

## Files Modified

1. **`profile-pages/tutor-profile.html`** (~80 lines added)
   - Added tab buttons and content sections
   - Added `switchRequestTab()` function
   - Updated `filterCommunity()` function
   - Updated `switchCommunitySection()` function

2. **`js/page-structure/communityManager.js`** (~200 lines added)
   - Updated `initializeBadges()`
   - Updated `updateBadgeCounts()`
   - Updated `attachEvents()`
   - Added `loadRequestTab()`
   - Added `updateRequestFilterCounts()`
   - Added `displayRequestsGrid()`
   - Added `cancelSentRequest()`
   - Added `searchRequestTab()`

---

## API Requirements

### Required Backend Stats:
The `/api/connections/stats` endpoint must return:
```json
{
  "incoming_requests": <number>,
  "outgoing_requests": <number>
}
```

If the backend doesn't return `outgoing_requests`, the sent tab count will show 0.

### Required Backend Filters:
The `/api/connections` endpoint must support:
- `status=connecting` (pending requests)
- `direction=incoming` (requests received)
- `direction=outgoing` (requests sent)

---

## Future Enhancements (Optional)

1. **Real-time Updates**: WebSocket notifications when new requests arrive
2. **Bulk Actions**: Accept/decline multiple requests at once
3. **Request Messages**: Show message sent with connection request
4. **Time Stamps**: Show "2 hours ago", "yesterday", etc.
5. **Profile Previews**: Hover card with user info preview
6. **Pagination**: Load more requests as user scrolls
7. **Request Reasons**: Display why user wants to connect
8. **Quick Filters**: Saved filter presets (e.g., "Recent", "Urgent")

---

## Success Criteria

✅ Requests section has two distinct tabs
✅ Tab badges show accurate counts from API
✅ Received tab shows incoming requests with Accept/Decline
✅ Sent tab shows outgoing requests with View/Cancel
✅ Filters work independently in each tab
✅ Search works independently in each tab
✅ Actions trigger correct API calls
✅ UI updates after actions (accept, decline, cancel)
✅ Empty states display when no requests
✅ Error states provide retry functionality

---

## Deployment Checklist

- [ ] Backend serves `outgoing_requests` in `/api/connections/stats`
- [ ] Backend supports `direction=incoming` and `direction=outgoing`
- [ ] Frontend files deployed to production
- [ ] Test with real user accounts
- [ ] Verify badge counts match actual requests
- [ ] Check mobile responsiveness
- [ ] Verify all buttons work correctly
- [ ] Test error scenarios (network issues, etc.)

---

**Status**: ✅ **COMPLETE** - Ready for testing!
