# Find-Tutors Course & School Tracking Integration

## Summary

Successfully integrated **course and school trending tracking** into the find-tutors page. Now tracks:
- **Courses**: When users filter by subject or when tutors have subjects listed
- **Schools**: When tutors display where they teach (`teaches_at` field)

## What Was Implemented

### 1. Backend Endpoints ✅

**Course/School Trending Endpoints** ([course_school_trending_endpoints.py](astegni-backend/course_school_trending_endpoints.py)):
- `POST /api/courses-schools/track-views` - Track views
- `GET /api/courses/trending` - Get trending courses
- `GET /api/schools/trending` - Get trending schools
- `GET /api/courses-schools/search-stats` - Statistics

**Public Schools Endpoint** ([schools_public_endpoints.py](astegni-backend/schools_public_endpoints.py)):
- `GET /api/schools` - List all verified/approved schools
- `GET /api/schools/{school_id}` - Get single school

Both routers registered in [app.py](astegni-backend/app.py:426-430).

### 2. Frontend Tracker ✅

**New File**: [js/find-tutors/course-school-trending-tracker.js](js/find-tutors/course-school-trending-tracker.js)

**Features**:
- Automatically loads course/school name→ID mappings on page load
- Debounces API calls (2 seconds) to reduce server load
- Extracts courses and schools from tutor data
- Tracks when user filters by subject
- Global instance: `CourseSchoolTracker`

**Key Methods**:
```javascript
CourseSchoolTracker.trackViews(courseIds, schoolIds)        // Immediate tracking
CourseSchoolTracker.queueViews(courseIds, schoolIds)        // Debounced tracking
CourseSchoolTracker.extractFromTutors(tutors, filters)      // Extract IDs from tutors
CourseSchoolTracker.trackFromFilters(filters)               // Track from search filters
CourseSchoolTracker.loadMappings()                          // Load name→ID maps
```

### 3. Integration into Find-Tutors ✅

**Modified Files**:

1. **[branch/find-tutors.html](branch/find-tutors.html:1210)**
   - Added script tag for course-school-trending-tracker.js

2. **[js/find-tutors/main-controller.js](js/find-tutors/main-controller.js:185-195)**
   - Added tracking when tutors are loaded
   - Extracts courses from tutors' `subjects` array
   - Extracts schools from tutors' `teaches_at` field
   - Tracks when user applies subject filter

**Integration Code**:
```javascript
// Track course and school views for trending rankings
if (tutors.length > 0 && typeof CourseSchoolTracker !== 'undefined') {
    const { courseIds, schoolIds } = CourseSchoolTracker.extractFromTutors(tutors, params);
    if (courseIds.length > 0 || schoolIds.length > 0) {
        CourseSchoolTracker.queueViews(courseIds, schoolIds);
        console.log(`📚 Queued ${courseIds.length} courses, ${schoolIds.length} schools for trending tracking`);
    }

    // Also track from filters (subject filter = course search)
    CourseSchoolTracker.trackFromFilters(params);
}
```

## How It Works

### Tracking Flow

1. **Page Load**:
   - `CourseSchoolTracker` initializes
   - Loads course and school mappings from `/api/courses` and `/api/schools`
   - Creates name→ID maps for fast lookup

2. **User Searches/Filters**:
   - User applies subject filter (e.g., "Mathematics")
   - Tracker looks up course ID from name
   - Queues course ID for tracking

3. **Tutors Displayed**:
   - Main controller loads tutors from API
   - Tracker extracts:
     - Courses from `tutor.subjects` array
     - Schools from `tutor.teaches_at` string
   - Looks up IDs from name→ID maps
   - Queues IDs for tracking

4. **Debounced API Call**:
   - After 2 seconds of inactivity
   - Sends single API call with all queued course/school IDs
   - Backend increments `search_count` and updates `trending_score`

### Data Extraction

**From Tutor Object**:
```javascript
{
  "id": 123,
  "first_name": "Abebe",
  "subjects": ["Mathematics", "Physics"],  // → Extract course IDs
  "teaches_at": "Unity University",        // → Extract school ID
  ...
}
```

**From Filter Object**:
```javascript
{
  "subject": "Mathematics",  // → Track this course
  "gradeLevel": "12",
  ...
}
```

## Tracked Scenarios

### ✅ Scenario 1: User Filters by Subject
```
User action: Selects "Mathematics" from subject dropdown
Result: Tracks Mathematics course
API call: POST /api/courses-schools/track-views { "course_ids": [5] }
```

### ✅ Scenario 2: Tutors with Schools Displayed
```
User action: Views search results
Tutors shown:
  - Tutor A teaches at "Unity University"
  - Tutor B teaches at "Addis Ababa University"
Result: Tracks both schools
API call: POST /api/courses-schools/track-views { "school_ids": [7, 12] }
```

### ✅ Scenario 3: Tutors with Multiple Subjects
```
User action: Views search results
Tutor shown:
  - Subjects: ["Mathematics", "Physics", "Chemistry"]
Result: Tracks all 3 courses
API call: POST /api/courses-schools/track-views { "course_ids": [5, 8, 12] }
```

### ✅ Scenario 4: Combined Tracking
```
User action: Filters by "Mathematics", views 5 tutors
Result:
  - Tracks Mathematics course (from filter)
  - Tracks schools from tutors' teaches_at
  - Tracks additional courses from tutors' subjects
API call: POST /api/courses-schools/track-views {
  "course_ids": [5, 8, 12],
  "school_ids": [7, 9, 15]
}
```

## Performance Optimizations

### 1. **Debouncing** (2 seconds)
- Prevents excessive API calls
- Batches multiple tracking events into single request
- User filters 3 times → Only 1 API call after 2s

### 2. **Name→ID Mapping Cache**
- Loads all course/school data once on page load
- Fast lookups in memory (Map data structure)
- No repeated API calls for ID lookup

### 3. **Conditional Tracking**
- Only tracks when `CourseSchoolTracker` is defined
- Only tracks when tutors array is not empty
- Only tracks valid IDs (filters out null/undefined)

### 4. **Backend Indexes**
- Database indexes on `search_count DESC`
- Database indexes on `trending_score DESC`
- Fast sorting and filtering of trending items

## Console Logging

When tracking is active, you'll see:

```
📚 Loaded 150 course mappings
🏫 Loaded 15 school mappings
📚 Queued 3 courses, 2 schools for trending tracking
📊 Tracked 3 courses, 2 schools
```

## Testing

### 1. Check Mappings Loaded
Open find-tutors.html and check console:
```
✓ Should see: "📚 Loaded N course mappings"
✓ Should see: "🏫 Loaded N school mappings"
```

### 2. Filter by Subject
1. Select a subject from dropdown (e.g., "Mathematics")
2. Click "Apply Filters"
3. Check console:
```
✓ Should see: "📚 Queued 1 courses, 0 schools for trending tracking"
✓ After 2s: "📊 Tracked 1 courses, 0 schools"
```

### 3. View Tutors with Schools
1. Search for tutors
2. View results
3. Check console:
```
✓ Should see: "📚 Queued N courses, M schools for trending tracking"
✓ After 2s: "📊 Tracked N courses, M schools"
```

### 4. Verify in Database
```bash
cd astegni-backend
python check_course_school_trending.py
```

Should show:
```
📚 COURSES:
✓ Found X courses with search activity:
  Mathematics: 15 searches, score=10.5

🏫 SCHOOLS:
✓ Found Y schools with search activity:
  Unity University: 8 searches, score=5.6
```

## Benefits

### 1. **Meritocracy**
Popular courses/schools get visibility regardless of paid promotions

### 2. **Discovery**
Students discover trending courses and well-regarded schools

### 3. **Data-Driven**
Recommendations based on actual search behavior, not just ratings

### 4. **Time-Weighted**
Recent popularity matters more than old searches (prevents stale trends)

### 5. **User Experience**
- No extra user action required (automatic tracking)
- Fast (debounced, cached)
- Privacy-friendly (tracks aggregated counts, not individual users)

## Future Enhancements

### 1. **Direct Course/School Search Pages**
- Dedicated pages for browsing courses
- Dedicated pages for browsing schools
- Track views on those pages too

### 2. **Course/School Detail Pages**
- Individual detail pages for courses
- Individual detail pages for schools
- Track when users view details

### 3. **Personalization**
- Track which courses/schools individual users view
- Recommend based on viewing history
- "Students who searched for X also searched for Y"

### 4. **Analytics Dashboard**
- Admin view of trending courses/schools
- Graphs showing popularity over time
- Geographic trending (popular courses per city)

### 5. **Smart Recommendations**
- Use trending data in "Recommended Topics" widget
- Boost popular courses in search results
- Suggest schools based on trending searches

## Files Created/Modified

### New Files ✅
1. `astegni-backend/migrate_add_course_school_trending.py` - Database migration
2. `astegni-backend/course_school_trending_endpoints.py` - API endpoints
3. `astegni-backend/schools_public_endpoints.py` - Public schools API
4. `astegni-backend/check_course_school_trending.py` - Verification script
5. `astegni-backend/test_course_school_trending.py` - Test suite
6. `js/find-tutors/course-school-trending-tracker.js` - Frontend tracker
7. `COURSE_SCHOOL_TRENDING.md` - System documentation
8. `FIND_TUTORS_TRACKING_INTEGRATION.md` - This file

### Modified Files ✅
1. `astegni-backend/app.py modules/models.py` - Added trending fields to School model
2. `astegni-backend/app.py` - Registered new routers
3. `branch/find-tutors.html` - Added tracker script tag
4. `js/find-tutors/main-controller.js` - Integrated tracking logic
5. `COURSE_SCHOOL_TRENDING.md` - Updated with find-tutors integration

## Summary

✅ **Backend**: Database migrated, endpoints created, routers registered
✅ **Frontend**: Tracker created, integrated into find-tutors
✅ **Testing**: Verification scripts created
✅ **Documentation**: Comprehensive docs written

**Next Step**: The Recommended Topics widget can now use trending data to show popular courses and schools!
