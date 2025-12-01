# Events and Clubs System Implementation

## Overview
Implemented a comprehensive events and clubs system where any user can create, manage, and join events/clubs.

## Database Schema

### Tables Created
1. **events** - Stores all events
2. **clubs** - Stores all clubs
3. **event_registrations** - Tracks user event registrations
4. **club_memberships** - Tracks club memberships

### Migration File
- File: `astegni-backend/migrate_create_events_clubs_tables.py`
- Status: ✅ Completed and executed successfully

### Events Table Fields
```sql
- id (SERIAL PRIMARY KEY)
- created_by (INTEGER FK to users)
- event_picture (TEXT)
- title (VARCHAR 255) *required
- type (VARCHAR 100) *required
- description (TEXT) *required
- location (VARCHAR 255) *required
- is_online (BOOLEAN)
- start_datetime (TIMESTAMP) *required
- end_datetime (TIMESTAMP) *required
- available_seats (INTEGER) *required
- registered_count (INTEGER)
- price (DECIMAL)
- subjects (JSONB array)
- grade_levels (JSONB array)
- requirements (TEXT)
- status (VARCHAR - upcoming/ongoing/completed/cancelled)
- created_at, updated_at (TIMESTAMP)
```

### Clubs Table Fields
```sql
- id (SERIAL PRIMARY KEY)
- created_by (INTEGER FK to users)
- club_picture (TEXT)
- title (VARCHAR 255) *required
- category (VARCHAR 100) *required
- description (TEXT) *required
- member_limit (INTEGER) *required
- member_count (INTEGER)
- membership_type (VARCHAR - open/approval_required/invite_only)
- is_paid (BOOLEAN)
- membership_fee (DECIMAL)
- subjects (JSONB array)
- meeting_schedule (VARCHAR 255)
- meeting_location (VARCHAR 255)
- rules (TEXT)
- status (VARCHAR - active/inactive/archived)
- created_at, updated_at (TIMESTAMP)
```

## Backend API Endpoints

### File
- `astegni-backend/events_clubs_endpoints.py`
- Registered in `app.py` ✅

### Events Endpoints
- `POST /api/events` - Create new event (authenticated)
- `GET /api/events` - Get all events (with filters: status, type)
- `GET /api/events/{event_id}` - Get specific event
- `PUT /api/events/{event_id}` - Update event (creator only)
- `DELETE /api/events/{event_id}` - Delete event (creator only)
- `GET /api/events/my/created` - Get user's created events

### Clubs Endpoints
- `POST /api/clubs` - Create new club (authenticated, auto-joins creator as admin)
- `GET /api/clubs` - Get all clubs (with filters: status, category)
- `GET /api/clubs/{club_id}` - Get specific club
- `PUT /api/clubs/{club_id}` - Update club (creator only)
- `DELETE /api/clubs/{club_id}` - Delete club (creator only)
- `GET /api/clubs/my/created` - Get user's created clubs

### Features
- ✅ Authentication required for create/update/delete
- ✅ Authorization checks (only creator can modify)
- ✅ Auto-increment member count for clubs
- ✅ Creator auto-joins club as admin
- ✅ Join with creator info (first_name, last_name, profile_picture)
- ✅ Filtering by status, type, category
- ✅ Pagination support (limit, offset)

## Frontend Changes

### HTML Updates
- File: `profile-pages/tutor-profile.html`
- ✅ Removed all hardcoded event cards from `#eventsGrid`
- ✅ Removed all hardcoded club cards from `#clubsGrid`
- ✅ Kept search boxes and section headers intact

### JavaScript Updates
- File: `js/tutor-profile/global-functions.js`
- ✅ Fixed `loadEventsSection()` - now only updates grid, not entire section
- ✅ Fixed `loadClubsSection()` - now only updates grid, not entire section
- ✅ Fixed `searchEvents()` - now only updates grid, preserves header/search
- ✅ Fixed `searchClubs()` - now only updates grid, preserves header/search

### Modal System Fix
- File: `profile-pages/tutor-profile.html`
- ✅ Added `js/index/init-modals.js` to enable `openModal()`/`closeModal()` functions
- ✅ Fixed "Create Event" and "Create Club" buttons to open coming soon modal

## Still To Do

### 1. Create Event Modal ⏳ IN PROGRESS
- Need to create modal HTML with form fields:
  - Event Picture upload
  - Title, Type, Description
  - Location, Is Online checkbox
  - Start/End DateTime pickers
  - Available Seats, Price
  - Subjects (multi-select)
  - Grade Levels (multi-select)
  - Requirements textarea
- Button handler: Change from `openComingSoonModal()` to `openCreateEventModal()`

### 2. Create Club Modal ⏳ PENDING
- Need to create modal HTML with form fields:
  - Club Picture upload
  - Title, Category, Description
  - Member Limit
  - Membership Type (radio: open/approval_required/invite_only)
  - Is Paid checkbox, Membership Fee
  - Subjects (multi-select)
  - Meeting Schedule, Meeting Location
  - Rules textarea
- Button handler: Change from `openComingSoonModal()` to `openCreateClubModal()`

### 3. Dynamic Loading ⏳ PENDING
- Update `loadEventsSection()` to fetch from `/api/events`
- Update `loadClubsSection()` to fetch from `/api/clubs`
- Handle empty state: "No events/clubs yet"
- Add loading spinners

### 4. Form Submission Handlers ⏳ PENDING
- Create `handleEventCreate()` function
- Create `handleClubCreate()` function
- Handle image upload to Backblaze B2
- Show success/error notifications
- Reload events/clubs list after creation

### 5. Event/Club Actions ⏳ PENDING
- View Details modal
- Join Event/Club functionality
- Registration endpoints
- Membership endpoints

## Key Design Decisions

1. **Universal Access**: Changed from `tutor_events`/`tutor_clubs` to `events`/`clubs` so ANY user can create them, not just tutors

2. **No External Meeting Links**: Removed Zoom/Google Meet link field - using internal Astegni meeting system only

3. **Auto-Membership**: When creating a club, creator is automatically added as admin member and `member_count` is set to 1

4. **Search Preservation**: Fixed search functions to only update grid content, preserving search boxes and headers

5. **Empty State**: When no events/clubs exist, grids will show appropriate empty state message instead of hardcoded data

## Testing

### Backend
```bash
cd astegni-backend
python migrate_create_events_clubs_tables.py  # ✅ Success
python app.py  # ✅ Server starts successfully
```

### API Endpoints
- Backend running on: `http://localhost:8000`
- API docs available at: `http://localhost:8000/docs`
- Can test all endpoints via Swagger UI

### Frontend
- Access: `http://localhost:8080/profile-pages/tutor-profile.html`
- Click "Community" tab
- Switch to "Events" or "Clubs"
- Should see empty grids (no hardcoded data)
- Search boxes visible and functional
- "Create Event"/"Create Club" buttons open coming soon modal (temporarily)

## Next Steps Priority

1. **Create Event Modal HTML** (highest priority)
2. **Create Club Modal HTML**
3. **Update button handlers** to open new modals
4. **Implement dynamic loading** from API
5. **Add form submission handlers**
6. **Test end-to-end** event/club creation flow

## Files Changed

### Backend
- ✅ `astegni-backend/migrate_create_events_clubs_tables.py` (new)
- ✅ `astegni-backend/events_clubs_endpoints.py` (new)
- ✅ `astegni-backend/app.py` (modified - added router)

### Frontend
- ✅ `profile-pages/tutor-profile.html` (modified - removed hardcoded data, added init-modals.js)
- ✅ `js/tutor-profile/global-functions.js` (modified - fixed load/search functions)

### Documentation
- ✅ `EVENTS-CLUBS-IMPLEMENTATION.md` (this file)
