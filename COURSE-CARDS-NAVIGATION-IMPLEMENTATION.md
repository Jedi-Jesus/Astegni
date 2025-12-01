# Course Cards Navigation Implementation

## Summary
Successfully implemented click navigation from course flip cards on index.html to find-tutors.html with automatic subject filtering.

## What Was Implemented

### 1. Course Card Click Handlers ([js/index/course-flip.js](js/index/course-flip.js))
- **Separate click handlers for front and back sides** of flip cards
- Each side navigates to find-tutors.html with the appropriate subject filter
- Example: Clicking "Chemistry" (front) → filters for Chemistry tutors
- Example: Clicking "Sports Training" (back) → filters for Sports Training tutors

**Key Changes:**
```javascript
// Front side click
frontSide.addEventListener("click", (e) => {
    e.stopPropagation();
    handleCourseClick(course.title);  // e.g., "Chemistry"
});

// Back side click
backSide.addEventListener("click", (e) => {
    e.stopPropagation();
    handleCourseClick(course.backTitle);  // e.g., "Sports Training"
});
```

### 2. Navigation Function ([js/index/course-flip.js](js/index/course-flip.js:285-288))
```javascript
function handleCourseClick(courseTitle) {
    // Navigate to find-tutors.html with subject filter
    window.location.href = `branch/find-tutors.html?subject=${encodeURIComponent(courseTitle)}`;
}
```

### 3. "Explore All Courses" Button ([js/index/course-flip.js](js/index/course-flip.js:290-293))
```javascript
function handleViewMoreCourses() {
    // Navigate to find-tutors.html without filters
    window.location.href = "branch/find-tutors.html";
}
```

### 4. URL Parameter Parsing ([js/find-tutors/init.js](js/find-tutors/init.js:49-107))
- **Reads `?subject=` parameter from URL** on find-tutors page load
- Applies subject filter to FindTutorsState before loading tutors
- Updates search bar placeholder to show active filter
- Also supports `search`, `courseType`, and `gradeLevel` URL parameters

**Key Features:**
```javascript
// Parse subject from URL: ?subject=Chemistry
const subject = urlParams.get('subject');
if (subject) {
    FindTutorsState.updateFilter('subject', subject);
    searchBar.value = subject;
    searchBar.placeholder = `Showing tutors teaching: ${subject}`;
}
```

### 5. Subject Filter Integration ([js/find-tutors/api-config-&-util.js](js/find-tutors/api-config-&-util.js))
- Added `subject` to FindTutorsState.filters
- Added `subject` to API getTutors() parameter mapping
- Added `subject` to reset() function
- Backend already supports subject filtering (params.subject in getSampleTutors)

## How It Works

### User Flow:
1. **User visits index.html** → Sees 8 flip course cards (16 courses total)
2. **User clicks on "Chemistry" front side** → Navigates to `branch/find-tutors.html?subject=Chemistry`
3. **find-tutors page loads** → Reads URL parameter → Applies subject filter
4. **Tutors are filtered** → Only tutors teaching Chemistry are shown
5. **Search bar shows** → "Chemistry" with placeholder "Showing tutors teaching: Chemistry"

### Example URLs:
- Click Chemistry card: `branch/find-tutors.html?subject=Chemistry`
- Click Mathematics card: `branch/find-tutors.html?subject=Mathematics`
- Click "Explore All Courses": `branch/find-tutors.html` (no filters)

## Course Cards Available (8 flip cards = 16 subjects)

### Front Sides:
1. Mathematics
2. Physics
3. Chemistry
4. Music
5. English
6. Business
7. Photography
8. Special Needs

### Back Sides:
1. Cosmetology
2. Programming
3. Sports Training
4. Culinary Arts
5. Chinese
6. Marketing
7. Graphic Design
8. Sign Language

## Technical Details

### Subject Filtering Logic
The subject filter searches tutor data for matches in:
- `tutor.subjects` array (e.g., ["Mathematics", "Physics"])
- `tutor.subjects_expertise` array (additional specializations)
- Partial matching supported (e.g., "Math" matches "Mathematics")

### Backend Integration
- **Backend API** receives `subject` parameter: `/api/tutors?subject=Chemistry`
- **Sample data fallback** filters locally if API unavailable
- Filter is applied in [api-config-&-util.js](js/find-tutors/api-config-&-util.js:518-530)

### Search Bar Behavior
When subject filter is applied via URL:
- Search bar value = subject name (e.g., "Chemistry")
- Placeholder updates to indicate active filter
- User can still type to further refine search
- Clearing search bar removes subject filter

## Testing

### Test Steps:
1. Open http://localhost:8080
2. Scroll to "Trending Courses" section
3. Click on any course card (front or back side)
4. Verify navigation to find-tutors.html
5. Verify tutors are filtered by clicked subject
6. Verify search bar shows subject name
7. Click "Explore All Courses" → Verify no filters applied

### Example Test:
```
1. Click "Chemistry" card front side
2. URL becomes: branch/find-tutors.html?subject=Chemistry
3. Tutors shown: Only those teaching Chemistry
4. Search bar: Shows "Chemistry"
5. Placeholder: "Showing tutors teaching: Chemistry"
```

## Files Modified

1. **[js/index/course-flip.js](js/index/course-flip.js)**
   - Added separate click handlers for front/back sides (lines 243-260)
   - Updated handleCourseClick to use subject parameter (line 285-288)
   - Updated handleViewMoreCourses navigation (line 290-293)

2. **[js/find-tutors/init.js](js/find-tutors/init.js)**
   - Added applyUrlFilters() function (lines 49-107)
   - Parses subject, search, courseType, gradeLevel from URL
   - Updates search bar and dropdowns based on URL params
   - Called before FindTutorsController.init() (line 105)

3. **[js/find-tutors/api-config-&-util.js](js/find-tutors/api-config-&-util.js)**
   - Added `subject: ''` to FindTutorsState.filters (line 840)
   - Added `subject: ''` to reset() function (line 871)
   - Added subject parameter to getTutors() API mapping (line 43)

## Future Enhancements

### Possible Improvements:
1. **Multi-subject filtering** - Support multiple subjects via URL (e.g., `?subject=Math,Physics`)
2. **Category badges** - Show active filter badges on find-tutors page
3. **Clear filter button** - Quick way to remove subject filter
4. **Related subjects** - Suggest related subjects when filtering
5. **Subject autocomplete** - Dropdown with all available subjects
6. **URL state persistence** - Back button maintains filter state

## Notes

- **No authentication required** - Navigation works for logged-in and guest users
- **Responsive design** - Works on mobile, tablet, desktop
- **Backward compatible** - Existing find-tutors functionality unchanged
- **URL-friendly** - Course names are properly encoded (e.g., "Culinary Arts" → "Culinary%20Arts")
- **Extensible** - Easy to add more URL parameters (grade level, price range, etc.)

## Success Criteria ✅

- ✅ Course cards navigate to find-tutors.html
- ✅ Front and back sides navigate independently
- ✅ Subject filter applies automatically from URL
- ✅ Search bar shows active filter
- ✅ "Explore All Courses" navigates without filters
- ✅ Backend integration complete
- ✅ Fallback to sample data if API unavailable
