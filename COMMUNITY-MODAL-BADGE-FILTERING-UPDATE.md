# Community Modal Badge & Filtering Update

## Summary
Updated the Community Modal events and clubs cards to show ownership status and filter content appropriately.

## Changes Made to `communityManager.js`

### 1. Badge Text Updates
**Previous:** Showed location (for events) or category (for clubs) in the header badge
**New:** Shows ownership status in the header badge:

- **"Your Event"** / **"Your Club"** - Created by the current user
- **"System Event"** / **"System Club"** - Created by system/admin
- **"Joined"** - Created by another user but the current user has joined

### 2. Field Repositioning

#### Events Cards
- **Location** moved from `event-header` → `event-details` (with 📍 icon)
- **Created By badge** now in `event-header`

#### Clubs Cards
- **Category** moved from `event-header` → `event-details` (with 📚 icon)
- **Created By badge** now in `event-header`

### 3. Filtering Logic
Both events and clubs now **only display** if they meet one of these criteria:

1. **System-created** - No creator ID or marked as system
2. **User-created** - Created by the current logged-in user
3. **Joined** - The user has joined/registered for it

**This means:** Other tutors' events/clubs are hidden UNLESS the current user has joined them.

### 4. Functions Updated

All 4 rendering functions were updated:

1. **`loadEventsGrid(grid)`** - Events section grid
2. **`loadClubsGrid(grid)`** - Clubs section grid
3. **`loadGroups(container)`** - Groups tab (shows events)
4. **`loadClubs(container)`** - Clubs tab

## Detection Logic

### Events
```javascript
const createdById = event.created_by_id || event.creator_id;
const isSystemEvent = !createdById || event.created_by === 'System Admin' || event.is_system;
const isOwnEvent = createdById && createdById === currentUserId;
const hasJoined = event.has_joined || event.is_registered || (event.participants && event.participants.includes(currentUserId));
```

### Clubs
```javascript
const createdById = club.created_by_id || club.creator_id;
const isSystemClub = !createdById || club.created_by === 'System Admin' || club.is_system;
const isOwnClub = createdById && createdById === currentUserId;
const hasJoined = club.has_joined || club.is_member || (club.members && club.members.includes(currentUserId));
```

## API Field Requirements

For this to work correctly, the backend API should return:

### Events API (`/api/events`)
- `created_by_id` or `creator_id` - ID of the user who created it
- `created_by` - Name (used for fallback detection)
- `is_system` - Boolean flag for system events
- `has_joined` or `is_registered` - Boolean if user joined
- `participants` - Array of user IDs (alternative membership check)

### Clubs API (`/api/clubs`)
- `created_by_id` or `creator_id` - ID of the user who created it
- `created_by` - Name (used for fallback detection)
- `is_system` - Boolean flag for system clubs
- `has_joined` or `is_member` - Boolean if user joined
- `members` - Array of user IDs (alternative membership check)

## Visual Result

### Before
```
┌─────────────────────────────┐
│ Event Title                 │
│ Badge: "Addis Ababa" ──────────┐ (Location)
├─────────────────────────────┤
│ 📅 Jan 15, 2025            │
│ 🕐 2:00 PM                 │
│ 👥 25/50 registered        │
└─────────────────────────────┘
```

### After
```
┌─────────────────────────────┐
│ Event Title                 │
│ Badge: "Your Event" ────────────┐ (Ownership)
├─────────────────────────────┤
│ 📅 Jan 15, 2025            │
│ 🕐 2:00 PM                 │
│ 📍 Addis Ababa ────────────────┐ (Moved here)
│ 👥 25/50 registered        │
└─────────────────────────────┘
```

## Testing Checklist

- [ ] System events show "System Event" badge
- [ ] Your own events show "Your Event" badge
- [ ] Joined events show "Joined" badge
- [ ] Location appears in event-details with 📍 icon
- [ ] System clubs show "System Club" badge
- [ ] Your own clubs show "Your Club" badge
- [ ] Joined clubs show "Joined" badge
- [ ] Category appears in event-details with 📚 icon
- [ ] Only relevant events/clubs are displayed (filtered correctly)
- [ ] Other tutors' events/clubs are hidden unless joined

## Files Modified

- `js/page-structure/communityManager.js` - All 4 rendering functions updated

## Next Steps

If needed, the backend APIs (`/api/events` and `/api/clubs`) should be updated to return:
- `created_by_id` field
- `has_joined` or `is_member` boolean
- Proper system event/club flagging

This will ensure the filtering and badge logic works perfectly!
