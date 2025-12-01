# Manage Tutors - Search & Filter Implementation

## Overview
Implemented comprehensive search and filter functionality for all panels in the manage-tutors.html page.

## Features Implemented

### 1. Search Bars in Each Panel
Each panel now has a fully functional search bar with visual enhancements:
- **Verified Tutors Panel** - Search with `#verified-search-input`
- **Tutor Requests Panel** - Search with `#requested-search-input`
- **Rejected Tutors Panel** - Search with `#rejected-search-input`
- **Suspended Tutors Panel** - Search with `#suspended-search-input`

### 2. Search Capabilities
The search functionality filters tutors by:
- **Name** (full_name, name fields)
- **Email** address
- **Location** (city, location fields)
- **Tutor ID** (numeric ID)
- **Subjects/Courses** (all subjects they teach)

### 3. Additional Filters
Each panel includes dropdown filters for:
- **Subject Filter** - Filter by specific subjects (Mathematics, Science, English, Biology, Physics, Chemistry)
- **Level Filter** - Filter by education level (Elementary, High School, University)

### 4. Visual Enhancements

#### Search Input Styling
- Search icon positioned inside the input field
- Focus ring effect (blue border on focus)
- Proper spacing and padding
- Placeholder text for guidance

#### Clear Filters Button
- X icon button to clear all filters
- Hover effect for better UX
- Instantly resets search and filter dropdowns

#### Result Count Display
- Shows number of results when filters are active
- Example: "Found 12 tutors"
- Automatically hidden when no filters are applied

### 5. Real-time Filtering
- **Instant search** - Filters as you type
- **Debounced input** - Prevents excessive filtering
- **Persisted filters** - Each panel maintains its own filter state
- **Auto-refresh** - Updates table immediately when filters change

## Technical Implementation

### JavaScript (manage-tutors.js)

#### New Class Properties
```javascript
this.currentPanel = 'dashboard';
this.panelFilters = {
    verified: { search: '', subject: '', level: '' },
    requested: { search: '', subject: '', level: '' },
    rejected: { search: '', subject: '', level: '' },
    suspended: { search: '', subject: '', level: '' }
};
```

#### Key Methods

**setupPanelSearchListeners(panelName)**
- Attaches event listeners to search input, subject filter, and level filter
- Triggers filtering only when the panel is active

**filterAndRenderPanel(panelName)**
- Filters tutors based on status (verified, pending, rejected, suspended)
- Applies search filter across multiple fields
- Applies subject and level filters
- Re-renders the table with filtered results

**renderPanelTable(panelName)**
- Renders filtered tutors in the panel's table
- Supports pagination
- Shows appropriate action buttons per panel
- Displays "No tutors found" message when empty

**updateResultCount(panelName)**
- Dynamically displays result count
- Shows/hides based on active filters

#### Global Functions
```javascript
window.clearVerifiedFilters()
window.clearRequestedFilters()
window.clearRejectedFilters()
window.clearSuspendedFilters()
```

### HTML Enhancements

Each panel now includes:
```html
<div class="card p-6 mb-6">
    <div class="flex flex-wrap gap-4 items-center">
        <!-- Search input with icon -->
        <div class="flex-1 min-w-[300px]">
            <div class="relative">
                <input type="text" id="[panel]-search-input"
                    class="w-full p-3 pl-10 border-2 rounded-lg focus:ring-2 focus:ring-blue-500">
                <svg class="search-icon">...</svg>
            </div>
        </div>

        <!-- Subject filter -->
        <select id="[panel]-subject-filter">...</select>

        <!-- Level filter -->
        <select id="[panel]-level-filter">...</select>

        <!-- Clear button -->
        <button onclick="clear[Panel]Filters()">
            <svg class="x-icon">...</svg>
        </button>
    </div>
</div>
```

## Usage

### For End Users

1. **Search by Text**
   - Type in the search box to filter tutors by name, email, location, ID, or subjects
   - Results update in real-time as you type

2. **Filter by Subject**
   - Select a subject from the dropdown to show only tutors teaching that subject
   - Combines with search text for more specific results

3. **Filter by Level**
   - Select education level to filter tutors by their teaching level
   - Works alongside search and subject filters

4. **Clear All Filters**
   - Click the X button to reset all filters at once
   - Returns to showing all tutors in that status

5. **View Results**
   - Result count appears below filters when active
   - Table updates immediately with filtered results

### For Developers

#### Adding New Filter Types
1. Add the filter field to `this.panelFilters` in constructor
2. Add HTML input/select for the filter
3. Extend `setupPanelSearchListeners()` to include the new filter
4. Update `filterAndRenderPanel()` logic to handle the new filter
5. Update clear filter function to reset the new field

#### Customizing Filter Behavior
- Modify the filter logic in `filterAndRenderPanel()` method
- Adjust search fields by editing the `matchesSearch` condition
- Change filter options by modifying the HTML select elements

## Panel Status Mapping

The filtering system maps panel names to tutor statuses:
```javascript
{
    'verified': 'verified',    // Shows verified tutors
    'requested': 'pending',    // Shows pending applications
    'rejected': 'rejected',    // Shows rejected applications
    'suspended': 'suspended'   // Shows suspended tutors
}
```

## Data Fields Searched

### Primary Fields
- `name` / `full_name` - Tutor's full name
- `email` - Email address
- `id` - Numeric tutor ID

### Location Fields
- `location` - General location
- `city` - City name

### Subject Fields (array search)
- `subjects` - Array of subjects taught
- `courses` - Alternative course array

### Level Fields
- `education_level` - Tutor's education level
- `grade_level` - Grade levels they teach

## Performance Considerations

1. **Real-time Search** - Uses input events for instant feedback
2. **Efficient Filtering** - Only filters when panel is active
3. **Pagination Support** - Limits displayed results to improve performance
4. **State Persistence** - Each panel maintains its own filter state

## Browser Compatibility

- Modern browsers with ES6 support
- Uses standard DOM APIs
- CSS Grid and Flexbox for layout
- SVG icons for cross-browser consistency

## Future Enhancements

Possible additions:
- [ ] Advanced filters (date range, rating range)
- [ ] Save filter presets
- [ ] Export filtered results
- [ ] Sort by column headers
- [ ] Multi-select for subjects
- [ ] Keyboard shortcuts for filters
- [ ] Filter history/undo

## Testing Checklist

- [x] Search by tutor name
- [x] Search by email
- [x] Search by location
- [x] Search by subject
- [x] Filter by subject dropdown
- [x] Filter by level dropdown
- [x] Combined search + filters
- [x] Clear filters button
- [x] Result count display
- [x] Panel switching maintains filters
- [x] Empty state message
- [x] Real-time updates

## Files Modified

1. `admin-pages/manage-tutors.html`
   - Added search icons to all input fields
   - Added clear filter buttons to all panels
   - Enhanced filter dropdowns with more subjects
   - Improved styling with focus states

2. `js/admin-pages/manage-tutors.js`
   - Added `panelFilters` object for state management
   - Implemented `setupPanelSearchListeners()` method
   - Implemented `filterAndRenderPanel()` method
   - Implemented `renderPanelTable()` method
   - Implemented `updateResultCount()` method
   - Added 4 clear filter functions

## Summary

The manage-tutors page now has a fully functional, real-time search and filter system across all four main panels (Verified, Requested, Rejected, Suspended). Users can search by multiple criteria, combine filters, and clear them with a single click. The system provides immediate visual feedback and maintains separate filter states for each panel.
