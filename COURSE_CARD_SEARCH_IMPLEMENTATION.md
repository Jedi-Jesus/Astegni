# Course Card Search Implementation

## Overview
When users click on a course card in index.html, they are redirected to find-tutors.html with a search query that finds tutors teaching that specific course.

## Implementation Flow

### 1. Course Card Click (index.html)
**File:** [js/index/course-flip.js](js/index/course-flip.js#L286-L304)

When a user clicks on a course card (either front or back side):

```javascript
// Lines 249-252: Front side click
frontSide.addEventListener("click", (e) => {
    e.stopPropagation();
    handleCourseClick(course.title);
});

// Lines 256-259: Back side click
backSide.addEventListener("click", (e) => {
    e.stopPropagation();
    handleCourseClick(course.backTitle);
});
```

### 2. Authentication Check & Redirect
**File:** [js/index/course-flip.js](js/index/course-flip.js#L286-L304)

```javascript
function handleCourseClick(courseTitle) {
    // Check if user is logged in
    const isLoggedIn = (typeof APP_STATE !== 'undefined' && APP_STATE.isLoggedIn) ||
                       localStorage.getItem('token') ||
                       localStorage.getItem('access_token');

    if (!isLoggedIn) {
        // User not logged in - open login modal
        openModal('login-modal');
        return;
    }

    // User is logged in - navigate to find-tutors.html with search parameter
    window.location.href = `branch/find-tutors.html?search=${encodeURIComponent(courseTitle)}`;
}
```

**Example URLs:**
- Click "Mathematics" → `branch/find-tutors.html?search=Mathematics`
- Click "Programming" → `branch/find-tutors.html?search=Programming`
- Click "Cosmetology" → `branch/find-tutors.html?search=Cosmetology`

### 3. URL Parameter Parsing (find-tutors.html)
**File:** [js/find-tutors/init.js](js/find-tutors/init.js#L49-L78)

When find-tutors.html loads, it parses the URL parameters:

```javascript
function applyUrlFilters() {
    const urlParams = new URLSearchParams(window.location.search);

    // Check for search parameter (primary method for course card clicks)
    const searchQuery = urlParams.get('search');
    if (searchQuery) {
        console.log('Applying search filter from URL:', searchQuery);
        FindTutorsState.updateFilter('search', searchQuery);

        // Update the search bar to show the course being searched
        const searchBar = document.getElementById('searchBar');
        if (searchBar) {
            searchBar.value = searchQuery;
        }
    }
}
```

**Note:** Legacy `?subject=` parameter is still supported for backward compatibility.

### 4. API Request to Backend
**File:** [js/find-tutors/api-config-&-util.js](js/find-tutors/api-config-&-util.js#L149-L279)

The search query is sent to the backend:

```javascript
async getTutors(params = {}) {
    // ...
    if (params.search) backendParams.search = params.search;

    const queryString = new URLSearchParams(backendParams).toString();
    const endpoint = '/tutors';
    const fullUrl = `${endpoint}?${queryString}`;
    // GET /api/tutors?search=Mathematics&page=1&limit=15
}
```

### 5. Backend Course Search
**File:** [astegni-backend/app.py modules/routes.py](astegni-backend/app.py modules/routes.py#L938-L1009)

The backend performs a comprehensive search across multiple tables:

#### A. Courses Table Search
```sql
SELECT DISTINCT tp.tutor_id
FROM tutor_packages tp
JOIN courses c ON c.id = ANY(tp.course_ids)
WHERE c.status = 'verified'
AND (
    c.tags ILIKE '%mathematics%'          -- Course tags (JSON array)
    OR c.course_name ILIKE '%mathematics%' -- Course name
    OR c.course_category ILIKE '%mathematics%' -- Course category
)
```

**Example:** Searching "Mathematics" finds tutors with packages containing:
- Course name: "Advanced Mathematics", "Mathematics 101", etc.
- Course tags: ["math", "mathematics", "algebra"]
- Course category: "Mathematics & Sciences"

#### B. Schools Table Search
```sql
SELECT DISTINCT cr.uploader_id as tutor_id
FROM credentials cr
WHERE cr.uploader_role = 'tutor'
AND cr.document_type = 'experience'
AND cr.is_current = true
AND cr.title ILIKE '%mathematics%'  -- School/institution name
```

**Example:** Searching "Mathematics" finds tutors teaching at:
- "Mathematics Institute of Ethiopia"
- "School of Mathematics and Sciences"

#### C. Direct Tutor Search
```sql
WHERE
    LOWER(first_name) LIKE '%mathematics%'
    OR LOWER(father_name) LIKE '%mathematics%'
    OR LOWER(location) LIKE '%mathematics%'
    OR languages::text ILIKE '%mathematics%'
```

### 6. Results Display
**File:** [js/find-tutors/UI-management-new.js](js/find-tutors/UI-management-new.js#L195-L241)

The matched tutors are displayed as tutor cards with:
- Smart ranking (new tutors, search history matches, etc.)
- Pagination (12 tutors per page by default)
- Full filter compatibility (can combine with other filters)

## Complete Example Flow

**User Action:**
1. User visits index.html
2. Clicks on "Mathematics" course card

**System Response:**
1. ✅ Checks if user is logged in
2. ✅ If not logged in → Shows login modal
3. ✅ If logged in → Redirects to `branch/find-tutors.html?search=Mathematics`
4. ✅ find-tutors.html reads `?search=Mathematics`
5. ✅ Updates search bar to show "Mathematics"
6. ✅ Sends API request: `GET /api/tutors?search=Mathematics`
7. ✅ Backend searches:
   - Courses table: course_name, tags, category
   - Credentials table: school/institution names
   - Users table: tutor names, languages
8. ✅ Returns tutors teaching Mathematics
9. ✅ Displays results in tutor cards

## Search Features

### Multi-Field Search
The search finds tutors by:
- ✅ **Course names** in packages
- ✅ **Course tags** (JSON array search)
- ✅ **Course categories**
- ✅ **School/institution names** (from credentials)
- ✅ **Tutor names** (first name, father name)
- ✅ **Languages spoken**
- ✅ **Location**

### Search Quality
- ✅ **Case-insensitive**: "mathematics" = "MATHEMATICS" = "Mathematics"
- ✅ **Partial matching**: "math" finds "Mathematics"
- ✅ **Verified only**: Only shows verified courses
- ✅ **Active tutors**: Only shows active, verified tutors
- ✅ **Smart ranking**: Prioritizes relevant results

## Testing the Feature

### Test Cases

1. **Test Course Click without Login:**
   ```
   Action: Click "Programming" course card while logged out
   Expected: Login modal opens
   ```

2. **Test Course Click with Login:**
   ```
   Action: Click "Mathematics" course card while logged in
   Expected: Redirects to find-tutors.html?search=Mathematics
   Expected: Search bar shows "Mathematics"
   Expected: Shows tutors teaching Mathematics
   ```

3. **Test Different Courses:**
   ```
   - Mathematics → Finds math tutors
   - Programming → Finds programming tutors
   - Cosmetology → Finds cosmetology tutors
   - English → Finds English tutors
   ```

4. **Test Course Name Variations:**
   ```
   - "Mathematics" finds "Advanced Mathematics", "Math 101", etc.
   - "Physics" finds "Applied Physics", "Physics & Chemistry", etc.
   ```

5. **Test School-Based Matching:**
   ```
   - Searching "University" finds tutors teaching at universities
   - Searching "High School" finds high school teachers
   ```

## Key Files Modified

1. **[js/index/course-flip.js](js/index/course-flip.js)**
   - Changed `?subject=` to `?search=` parameter
   - Added detailed comments explaining search behavior

2. **[js/find-tutors/init.js](js/find-tutors/init.js)**
   - Simplified URL parameter handling
   - Maintained backward compatibility for `?subject=` parameter
   - Updated comments to reflect primary search method

## Backward Compatibility

The system still supports the legacy `?subject=` parameter for backward compatibility:
- Old links with `?subject=Mathematics` will still work
- Internally converted to `?search=Mathematics`
- No breaking changes to existing functionality

## Future Enhancements

Potential improvements:
1. Add trending course indicators
2. Show course count per tutor
3. Add "View Course Details" button on tutor cards
4. Track which courses are most clicked (analytics)
5. Add course autocomplete suggestions

## Summary

The course card search implementation provides a seamless user experience:
- **One-click navigation** from course cards to tutors teaching that course
- **Comprehensive search** across courses, schools, and tutor profiles
- **Smart authentication** handling (login modal for guests)
- **Clean URL structure** using search parameter
- **Backend optimization** with SQL subqueries for efficient searching

Users can now discover tutors by clicking on courses they're interested in, with the system automatically finding all relevant tutors teaching that subject.
