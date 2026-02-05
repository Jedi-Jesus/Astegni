# Profile Connections Cards - Complete Implementation

## Summary

Successfully implemented profile connection cards across all 5 main profile pages in the Astegni platform. Each profile now displays three clickable activity stat cards (Connections, Pending Requests, Received Requests) that navigate users to the relevant section/tab in the community modal.

## Files Modified

### HTML Profile Pages (5 files)

1. **profile-pages/user-profile.html** ✓ (Updated)
   - Location: Lines 1437-1469 (profile-header-section)
   - Updated onclick handlers to use `openCommunityModalTab`
   - Added transition styling to all stat-box elements

2. **profile-pages/tutor-profile.html** ✓ (Added)
   - Location: After social links container
   - Element IDs: `connections-count`, `pending-requests-count`, `received-requests-count`

3. **profile-pages/parent-profile.html** ✓ (Added)
   - Location: After social links container
   - Element IDs: `connections-count`, `pending-requests-count`, `received-requests-count`

4. **profile-pages/student-profile.html** ✓ (Added)
   - Location: After social links container
   - Element IDs: `connections-count`, `pending-requests-count`, `received-requests-count`

5. **profile-pages/advertiser-profile.html** ✓ (Added)
   - Location: After social links container
   - Element IDs: `connections-count`, `pending-requests-count`, `received-requests-count`

### JavaScript Files (1 file)

1. **js/common-modals/community-modal-manager.js** ✓ (Added)
   - Lines 450-495: `openCommunityModalTab()` function
   - Exported to window for global access

## HTML Template

All 5 profiles use this consistent structure:

```html
<!-- Connections Section -->
<div class="profile-connections" style="margin-top: 1.5rem;">
    <div class="connections-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h4 style="font-weight: 600; font-size: 0.95rem; color: var(--heading);">
            <span style="margin-right: 0.5rem;">📊</span>Activity Stats
        </h4>
    </div>
    <div class="connections-stats" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; text-align: center;">
        <!-- Connections Card -->
        <div class="stat-box" onclick="openCommunityModalTab('connections')"
            style="padding: 0.75rem; background: rgba(var(--button-bg-rgb), 0.05); border-radius: var(--radius-md); cursor: pointer; transition: all 0.3s ease;">
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--heading);"
                id="connections-count">0</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                Connections</div>
        </div>

        <!-- Pending Requests Card -->
        <div class="stat-box" onclick="openCommunityModalTab('pending')"
            style="padding: 0.75rem; background: rgba(var(--button-bg-rgb), 0.05); border-radius: var(--radius-md); cursor: pointer; transition: all 0.3s ease;">
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--heading);"
                id="pending-requests-count">0</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                Pending Requests</div>
        </div>

        <!-- Received Requests Card -->
        <div class="stat-box" onclick="openCommunityModalTab('received')"
            style="padding: 0.75rem; background: rgba(var(--button-bg-rgb), 0.05); border-radius: var(--radius-md); cursor: pointer; transition: all 0.3s ease;">
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--heading);"
                id="received-requests-count">0</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                Received Requests</div>
        </div>
    </div>
</div>
```

## JavaScript Implementation

### openCommunityModalTab Function

**File**: `js/common-modals/community-modal-manager.js:450-495`

```javascript
/**
 * Opens the community modal and navigates to a specific tab
 * @param {string} tab - The tab to open: 'connections', 'pending', or 'received'
 */
function openCommunityModalTab(tab) {
    console.log(`🔗 Opening community modal tab: ${tab}`);

    // Map tab names to modal sections and request tabs
    const tabMapping = {
        'connections': {
            section: 'connections',
            requestTab: null  // Open connections section (no sub-tab needed)
        },
        'pending': {
            section: 'requests',
            requestTab: 'sent'  // Open requests section, then switch to "Sent" tab
        },
        'received': {
            section: 'requests',
            requestTab: 'received'  // Open requests section, then switch to "Received" tab
        }
    };

    const mapping = tabMapping[tab];
    if (!mapping) {
        console.error(`❌ Invalid tab: ${tab}`);
        return;
    }

    // Open the modal with the correct section
    openCommunityModal(mapping.section);

    // If a specific request tab is needed, switch to it after modal opens
    if (mapping.requestTab) {
        // Small delay to allow modal animation to complete
        setTimeout(() => {
            switchRequestTab(mapping.requestTab);
        }, 100);
    }
}

// Make function globally available for HTML onclick handlers
window.openCommunityModalTab = openCommunityModalTab;
```

### How It Works

1. **User clicks a connection card** (e.g., "Pending Requests")
2. **onclick handler calls** `openCommunityModalTab('pending')`
3. **Function maps** 'pending' → `{ section: 'requests', requestTab: 'sent' }`
4. **Opens community modal** with requests section
5. **Switches to correct tab** (Sent/Received) after 100ms delay

### Tab Mapping

| Card Clicked | Function Call | Modal Section | Request Tab |
|--------------|--------------|---------------|-------------|
| Connections | `openCommunityModalTab('connections')` | connections | (none) |
| Pending Requests | `openCommunityModalTab('pending')` | requests | sent |
| Received Requests | `openCommunityModalTab('received')` | requests | received |

## Element IDs

All 5 profiles use the same element IDs for consistency:

- **`connections-count`** - Displays total number of connections
- **`pending-requests-count`** - Displays number of sent/pending requests
- **`received-requests-count`** - Displays number of received connection requests

## Styling Features

### Visual Design
- **Grid Layout**: 3 equal columns (`grid-template-columns: repeat(3, 1fr)`)
- **Card Background**: Semi-transparent button color (`rgba(var(--button-bg-rgb), 0.05)`)
- **Border Radius**: Medium rounded corners (`var(--radius-md)`)
- **Spacing**: 1rem gap between cards
- **Padding**: 0.75rem inside each card

### Typography
- **Count**: 1.5rem, font-weight 700, heading color
- **Label**: 0.75rem, muted color, 0.25rem top margin
- **Header**: 0.95rem, font-weight 600, with 📊 emoji

### Interactive States
- **Cursor**: Pointer on hover
- **Transition**: All properties animate smoothly (`transition: all 0.3s ease`)
- **Clickable**: Full card area is clickable via onclick handler

## Data Population

### Current Implementation
All cards display `0` by default. Counts should be populated by the respective profile data loaders.

### Future Enhancement Pattern

Each profile loader should fetch and populate counts:

```javascript
// Example: In student-profile/profile-data-loader.js
async loadConnectionCounts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/connections/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        // Update UI
        document.getElementById('connections-count').textContent = data.connections_count || 0;
        document.getElementById('pending-requests-count').textContent = data.pending_count || 0;
        document.getElementById('received-requests-count').textContent = data.received_count || 0;
    } catch (error) {
        console.error('Failed to load connection counts:', error);
    }
}
```

### API Endpoint Needed

**Endpoint**: `GET /api/connections/stats`

**Response**:
```json
{
    "connections_count": 24,
    "pending_count": 3,
    "received_count": 5
}
```

**SQL Query** (example):
```sql
-- Count accepted connections
SELECT COUNT(*) FROM connections
WHERE (profile_id = %s AND profile_type = %s AND status = 'accepted')
   OR (connected_profile_id = %s AND connected_profile_type = %s AND status = 'accepted');

-- Count pending (sent) requests
SELECT COUNT(*) FROM connections
WHERE profile_id = %s AND profile_type = %s AND status = 'pending';

-- Count received requests
SELECT COUNT(*) FROM connections
WHERE connected_profile_id = %s AND connected_profile_type = %s AND status = 'pending';
```

## Profile-Specific Locations

### user-profile.html
- **Lines**: 1437-1469
- **Location**: After user-hobbies, before social-links-container
- **Note**: Original template that others were based on

### tutor-profile.html
- **Location**: After social-links-container, before profile quote section
- **Context**: Within profile-header-section

### parent-profile.html
- **Location**: After social-links-container, before profile quote section
- **Context**: Within profile-header-section

### student-profile.html
- **Location**: After social-links-container, before profile quote section
- **Context**: Within profile-header-section

### advertiser-profile.html
- **Location**: After social-links-container, before bio section
- **Context**: Within profile-header-section

## Testing

### Manual Testing Steps

1. **Navigate to each profile page**:
   - user-profile.html
   - tutor-profile.html
   - parent-profile.html
   - student-profile.html
   - advertiser-profile.html

2. **Verify cards display**:
   - Three cards should be visible: Connections, Pending Requests, Received Requests
   - Each card shows "0" (default count)
   - Cards are laid out in a 3-column grid

3. **Test clicking Connections card**:
   - Click "Connections" card
   - Community modal should open
   - Should show "Connections" section
   - Should display list of accepted connections

4. **Test clicking Pending Requests card**:
   - Click "Pending Requests" card
   - Community modal should open
   - Should show "Requests" section
   - Should switch to "Sent" tab (pending requests you sent)

5. **Test clicking Received Requests card**:
   - Click "Received Requests" card
   - Community modal should open
   - Should show "Requests" section
   - Should switch to "Received" tab (requests you received)

### Browser Console Testing

```javascript
// Test the function directly
openCommunityModalTab('connections');  // Should open connections section
openCommunityModalTab('pending');      // Should open requests → sent tab
openCommunityModalTab('received');     // Should open requests → received tab

// Verify function is globally available
console.log(typeof window.openCommunityModalTab);  // Should output: "function"

// Test tab mapping
const testMapping = {
    'connections': { section: 'connections', requestTab: null },
    'pending': { section: 'requests', requestTab: 'sent' },
    'received': { section: 'requests', requestTab: 'received' }
};
console.log(testMapping);
```

### Expected Console Output

When clicking a card:
```
🔗 Opening community modal tab: connections
(or)
🔗 Opening community modal tab: pending
(or)
🔗 Opening community modal tab: received
```

## Benefits

1. **Consistent UX**: Same cards and behavior across all 5 profiles
2. **Direct Navigation**: One click takes users to the exact section they need
3. **Visual Hierarchy**: Clear stats presentation with icons and labels
4. **Responsive Design**: Uses CSS variables for theme compatibility
5. **Accessible**: Clear labels and proper semantic HTML
6. **Maintainable**: Single template and single function for all profiles
7. **Future-Ready**: Easy to populate with real data via API

## Related Features

### Dependencies
- **Community Modal**: `modals/common-modals/community-modal.html`
- **Community Modal Manager**: `js/common-modals/community-modal-manager.js`
- **Connections API**: Backend endpoints for connections management

### Related Functions
- `openCommunityModal(section)` - Opens modal with specific section
- `switchRequestTab(tab)` - Switches between Sent/Received tabs in requests section

### Database Tables
- **connections**: Stores connection relationships
  - Columns: `profile_id`, `profile_type`, `connected_profile_id`, `connected_profile_type`, `status`
  - Status values: `'pending'`, `'accepted'`, `'rejected'`

## Migration Path for New Profiles

To add connection cards to a new profile type:

1. **Add HTML container** using the template above
2. **Place after social-links-container** in profile-header-section
3. **Use consistent element IDs**: `connections-count`, `pending-requests-count`, `received-requests-count`
4. **Use onclick handlers**: `openCommunityModalTab('connections')`, `openCommunityModalTab('pending')`, `openCommunityModalTab('received')`
5. **Include transition styling**: `transition: all 0.3s ease;` on each stat-box
6. **Load counts in profile loader**: Fetch from `/api/connections/stats` endpoint
7. **Test all three cards**: Verify each opens correct modal section/tab

## Known Issues & Future Enhancements

### Current Limitations
1. **Hardcoded Counts**: All cards show `0` - needs API integration
2. **No Loading State**: Counts appear instantly (should show loading indicator)
3. **No Error Handling**: If modal fails to open, no user feedback

### Planned Enhancements
1. **Real-time Counts**: Fetch actual connection counts from backend
2. **Loading Animation**: Show skeleton or spinner while fetching counts
3. **Hover Effects**: Add scale/shadow effects on hover
4. **Badge Indicators**: Show "New!" badge for recent received requests
5. **Refresh on Modal Close**: Update counts after user accepts/rejects requests
6. **Mobile Optimization**: Stack cards vertically on small screens
7. **Analytics**: Track which cards users click most frequently

## Related Documentation

- [HOBBIES_DISPLAY_CONTAINERS_COMPLETE.md](HOBBIES_DISPLAY_CONTAINERS_COMPLETE.md) - Hobbies implementation
- [SOCIAL_LINKS_IMPLEMENTATION_COMPLETE.md](SOCIAL_LINKS_IMPLEMENTATION_COMPLETE.md) - Social links implementation
- [CLAUDE.md](CLAUDE.md) - Full project architecture
- Connection endpoints: `astegni-backend/connection_endpoints.py`

## Summary

Successfully implemented profile connection cards across all 5 main profile pages (user, tutor, parent, student, advertiser). Each profile now displays three clickable activity stats that navigate to the correct section/tab in the community modal. Implementation uses consistent HTML template, single JavaScript function (`openCommunityModalTab`), and follows platform design patterns with CSS variables and smooth transitions.

**Files Modified**: 6 total
- 5 HTML profile pages
- 1 JavaScript community modal manager

**New Function**: `openCommunityModalTab(tab)` - Global function for modal navigation
**Element IDs**: `connections-count`, `pending-requests-count`, `received-requests-count` (consistent across all profiles)

Ready for API integration to populate real connection counts!
