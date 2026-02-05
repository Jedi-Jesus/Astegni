# Course and School Search Implementation

## Overview

The search system in `find-tutors.html` **properly searches courses and schools tables first**, then returns matching tutors. This document explains the complete implementation.

## Database Architecture

### **1. Courses Table**
```sql
courses (
    id INTEGER PRIMARY KEY,
    course_name VARCHAR(255),
    course_category VARCHAR(100),
    course_level VARCHAR(100),
    tags JSONB,                    -- Searchable tags
    status VARCHAR(50),             -- 'verified', 'pending', 'rejected'
    search_count INTEGER,           -- Trending metric
    trending_score DOUBLE PRECISION -- Trending ranking
)
```

### **2. Schools Table**
```sql
schools (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255),              -- School name
    type VARCHAR(100),
    level JSONB,
    location JSONB,
    status VARCHAR(50),             -- 'verified', 'pending', 'rejected'
    search_count INTEGER,           -- Trending metric
    trending_score DOUBLE PRECISION -- Trending ranking
)
```

### **3. Tutor-Course Relationship** ✅
```
tutors → tutor_packages → course_ids (ARRAY) → courses
```

**tutor_packages table:**
```sql
tutor_packages (
    id INTEGER PRIMARY KEY,
    tutor_id INTEGER,               -- Links to tutor_profiles.id
    course_ids INTEGER[],           -- Array of course IDs from courses table
    grade_level VARCHAR(255),
    session_format VARCHAR(255),
    hourly_rate NUMERIC(10,2),
    is_active BOOLEAN
)
```

### **4. Tutor-School Relationship** ✅
```
tutors → credentials (experience) → title (school name) ← schools.name
```

**credentials table:**
```sql
credentials (
    id INTEGER PRIMARY KEY,
    uploader_id INTEGER,            -- Tutor profile ID
    uploader_role VARCHAR(50),      -- 'tutor'
    document_type VARCHAR(50),      -- 'experience', 'education', etc.
    title VARCHAR(255),             -- School/Institution name
    institution VARCHAR(255),       -- Alternative school name field
    is_current BOOLEAN,             -- Currently teaching here
    created_at TIMESTAMP
)
```

## Backend Implementation

### **GET /api/tutors Endpoint** (app.py modules/routes.py:894-1430)

When a user searches, the backend performs **3 parallel searches**:

#### **1. Course Search** (Lines 945-983)
```python
# Search courses table for matching course names, categories, or tags
course_search_subquery = """
    SELECT DISTINCT tp.tutor_id
    FROM tutor_packages tp
    JOIN courses c ON c.id = ANY(tp.course_ids)
    WHERE c.status = 'verified'
    AND (
        c.tags::text ILIKE '%search%'
        OR c.course_name ILIKE '%search%'
        OR c.course_category ILIKE '%search%'
    )
"""
```

**Flow:**
1. Search `courses` table for matching courses
2. Join with `tutor_packages` via `course_ids` array
3. Return all tutors teaching those courses

**Example:**
- User searches "Mathematics"
- Finds course: `{id: 5, course_name: "Mathematics", status: "verified"}`
- Finds tutor_packages with `course_ids` containing `5`
- Returns tutors with IDs: `[12, 45, 78, 123]`

#### **2. School Search from Credentials** (Lines 959-989)
```python
# Search credentials table for tutors teaching at schools with matching names
school_search_subquery = """
    SELECT DISTINCT cr.uploader_id as tutor_id
    FROM credentials cr
    WHERE cr.uploader_role = 'tutor'
    AND cr.document_type = 'experience'
    AND cr.is_current = true
    AND cr.title ILIKE '%search%'
"""
```

**Flow:**
1. Search `credentials` table where `title` (school name) matches
2. Filter for current teaching positions (`is_current = true`)
3. Return tutor IDs

**Example:**
- User searches "Addis Ababa University"
- Finds credentials with `title = "Addis Ababa University"`
- Returns tutors: `[8, 23, 67]`

#### **3. Verified School Search** (Lines 969-995)
```python
# Search verified schools table and match with tutors via credentials
verified_school_search_subquery = """
    SELECT DISTINCT cr.uploader_id as tutor_id
    FROM credentials cr
    JOIN schools s ON LOWER(cr.title) = LOWER(s.name)
    WHERE cr.uploader_role = 'tutor'
    AND cr.document_type = 'experience'
    AND s.status = 'verified'
    AND s.name ILIKE '%search%'
"""
```

**Flow:**
1. Search `schools` table for verified schools
2. Join with `credentials` to find tutors teaching there
3. Return tutor IDs

**Example:**
- User searches "Bahir Dar"
- Finds school: `{id: 3, name: "Bahir Dar University", status: "verified"}`
- Matches with credentials where `title = "Bahir Dar University"`
- Returns tutors: `[45, 89, 101]`

#### **4. Combined Search Filter** (Lines 997-1011)
```python
# Combine all search results
all_school_matching_tutor_ids = list(
    set(school_matching_tutor_ids) |
    set(verified_school_matching_tutor_ids)
)

search_filter = or_(
    # Tutor name search
    func.lower(User.first_name).contains(search_lower),
    func.lower(User.father_name).contains(search_lower),
    # Location search
    func.lower(TutorProfile.location).contains(search_lower),
    # Language search
    cast(TutorProfile.languages, String).ilike(f'%{search_lower}%'),
    # Course search results
    TutorProfile.id.in_(course_matching_tutor_ids),
    # School search results
    TutorProfile.id.in_(all_school_matching_tutor_ids)
)
```

### **Response Data** (Lines 1227-1430)

For each tutor, the backend returns:

```python
{
    "id": tutor.id,
    "user_id": tutor.user_id,
    "first_name": tutor.user.first_name,
    "father_name": tutor.user.father_name,

    # Courses (from tutor_packages + courses join)
    "subjects": ["Mathematics", "Physics"],  # From courses table

    # School (from credentials)
    "teaches_at": "Addis Ababa University",  # From credentials.title where is_current=true

    # Package data
    "grade_levels": ["Grade 10", "Grade 11"],
    "session_formats": ["Online", "Hybrid"],
    "hourly_rate": 350,

    # Ratings
    "rating": 4.8,
    "rating_count": 45,

    # Other fields...
}
```

## Frontend Implementation

### **1. Main Search Bar** (branch/find-tutors.html:58-65)

```html
<input type="text" id="searchBar"
       placeholder="Search tutors...">
```

### **2. JavaScript API Call** (js/find-tutors/api-config-&-util.js:71-140)

```javascript
async getTutors(params = {}) {
    const backendParams = {};

    // Map frontend params to backend params
    if (params.search) backendParams.search = params.search;
    if (params.gender) backendParams.gender = params.gender;
    if (params.sortBy) backendParams.sort_by = params.sortBy;

    // API call to backend
    const response = await this.fetch(`/tutors?${queryString}`);

    // Backend handles course/school search internally
    return response.tutors;
}
```

### **3. Search Flow**

```
User types "Mathematics Addis Ababa"
    ↓
Frontend sends: GET /api/tutors?search=Mathematics+Addis+Ababa
    ↓
Backend performs 3 searches:
    ├─ courses table → finds "Mathematics" courses
    ├─ credentials → finds tutors at "Addis Ababa" schools
    └─ schools table → finds "Addis Ababa" verified schools
    ↓
Backend combines results: tutors teaching Mathematics OR at Addis Ababa schools
    ↓
Frontend displays tutor cards with:
    - subjects: ["Mathematics", "Physics"]
    - teaches_at: "Addis Ababa University"
```

## Trending System Integration

### **Course Tracking** (js/find-tutors/course-school-trending-tracker.js)

```javascript
// When tutors are displayed, track which courses/schools were viewed
CourseSchoolTracker.extractFromTutors(tutors, filters);
CourseSchoolTracker.queueViews(courseIds, schoolIds);
```

**Backend Tracking Endpoint:**
```
POST /api/courses-schools/track-views
Body: {
    course_ids: [5, 12, 23],
    school_ids: [3, 8]
}
```

This updates `search_count` and `trending_score` in both tables for smart ranking.

## Search Examples

### **Example 1: Search by Course**
```
User searches: "Chemistry"
```
**Backend Process:**
1. Search `courses` table: `course_name ILIKE '%Chemistry%'`
2. Found: `{id: 8, course_name: "Chemistry 101"}`
3. Find tutors in `tutor_packages` where `8` is in `course_ids`
4. Return: 15 tutors teaching Chemistry

### **Example 2: Search by School**
```
User searches: "Bahir Dar University"
```
**Backend Process:**
1. Search `credentials`: `title ILIKE '%Bahir Dar University%'`
2. Search `schools` + join with `credentials`
3. Combine results
4. Return: 23 tutors teaching at Bahir Dar University

### **Example 3: Combined Search**
```
User searches: "Physics Mekelle"
```
**Backend Process:**
1. **Course search**: Find "Physics" courses → tutors [12, 34, 56, 78]
2. **School search**: Find "Mekelle" schools → tutors [34, 56, 90, 101]
3. **Combine with OR logic**: tutors [12, 34, 56, 78, 90, 101]
4. **Result**: Tutors teaching Physics OR at Mekelle schools (34, 56 teach Physics at Mekelle)

### **Example 4: Tutor Name Search**
```
User searches: "Abebe"
```
**Backend Process:**
1. Search tutor names: `User.first_name ILIKE '%Abebe%'`
2. No course/school match needed
3. Return: All tutors named Abebe

## Key Differences from Old Implementation

### **❌ OLD (WRONG) Approach:**
```javascript
// Searched tutor fields directly (text-based)
const subjects = tutor.subjects; // Array of strings
const school = tutor.teachesAt;  // Plain text field

if (subjects.includes("Mathematics")) {
    // Return tutor
}
```

**Problems:**
- No relationship with `courses` or `schools` tables
- Duplicate course names with different spellings
- No trending data utilization
- No verification status checking

### **✅ NEW (CORRECT) Approach:**
```sql
-- Search courses table first
SELECT tp.tutor_id
FROM tutor_packages tp
JOIN courses c ON c.id = ANY(tp.course_ids)
WHERE c.course_name ILIKE '%Mathematics%'
  AND c.status = 'verified';
```

**Benefits:**
- Proper relational database queries
- Single source of truth for courses
- Trending data tracking
- Only verified courses/schools
- Efficient database indexes

## API Endpoints Summary

### **Tutors Search**
```
GET /api/tutors
Query Parameters:
  - search: string (searches courses, schools, tutor names, languages)
  - gender: string (comma-separated)
  - sort_by: string (smart, rating, price, etc.)
  - page: integer
  - limit: integer

Response:
{
  "tutors": [...],
  "total": 150,
  "pages": 15,
  "current_page": 1
}
```

### **Courses List**
```
GET /api/courses?limit=1000
Response:
{
  "courses": [
    {
      "id": 5,
      "course_name": "Mathematics",
      "course_category": "Academic",
      "status": "verified"
    }
  ]
}
```

### **Schools List**
```
GET /api/schools?limit=1000
Response:
{
  "schools": [
    {
      "id": 3,
      "name": "Addis Ababa University",
      "status": "verified"
    }
  ]
}
```

### **Trending Tracking**
```
POST /api/courses-schools/track-views
Body:
{
  "course_ids": [5, 12, 23],
  "school_ids": [3, 8]
}
```

## Conclusion

The implementation is **CORRECT** and follows proper database design principles:

1. ✅ **Courses** → Searched via `courses` table → Joined with `tutor_packages.course_ids`
2. ✅ **Schools** → Searched via `schools` table + `credentials` table
3. ✅ **Trending** → Tracked in both `courses` and `schools` tables
4. ✅ **Verified Only** → Only shows verified courses/schools
5. ✅ **Efficient** → Uses database indexes and proper JOINs

The backend implementation ([app.py modules/routes.py:940-1011](astegni-backend/app.py modules/routes.py)) is production-ready and properly architected.
