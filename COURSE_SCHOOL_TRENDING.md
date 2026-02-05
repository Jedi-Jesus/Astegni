# Course & School Trending System

## Overview
The Course & School Trending System tracks popularity based on search/view activity, similar to the tutor trending system. This allows popular courses and schools to be boosted in recommendations and rankings.

## How It Works

### 1. **Tracking System**
When courses/schools are displayed or viewed:
- `search_count` increments by 1
- `last_search_increment` updates to current timestamp
- `trending_score` is recalculated based on time-weighted formula

### 2. **Trending Score Calculation**

**Formula**: `trending_score = search_count × time_weight`

**Time Weights**:
- Last 24 hours: `1.0` (very recent)
- 1-7 days ago: `0.7` (recent)
- 7-30 days ago: `0.3` (somewhat recent)
- Over 30 days: `0.1` (old searches)

**Example**:
```
Course A: 50 searches, last searched 2 hours ago
→ trending_score = 50 × 1.0 = 50

Course B: 200 searches, last searched 10 days ago
→ trending_score = 200 × 0.3 = 60

School C: 500 searches, last searched 40 days ago
→ trending_score = 500 × 0.1 = 50
```

### 3. **Benefits**

**For Courses**:
- Popular courses get better visibility
- New trending courses can quickly rise
- Combined with rating and rating_count for quality ranking

**For Schools**:
- Popular schools get better visibility
- Combined with student_count (size) and rating for comprehensive ranking
- Verified/approved schools prioritized

## Database Schema

### New Fields Added

**Courses Table**:
```sql
ALTER TABLE courses
ADD COLUMN search_count INTEGER DEFAULT 0,
ADD COLUMN trending_score FLOAT DEFAULT 0.0,
ADD COLUMN last_search_increment TIMESTAMP;

CREATE INDEX idx_course_search_count ON courses(search_count DESC);
CREATE INDEX idx_course_trending_score ON courses(trending_score DESC);
```

**Schools Table**:
```sql
ALTER TABLE schools
ADD COLUMN search_count INTEGER DEFAULT 0,
ADD COLUMN trending_score FLOAT DEFAULT 0.0,
ADD COLUMN last_search_increment TIMESTAMP;

CREATE INDEX idx_school_search_count ON schools(search_count DESC);
CREATE INDEX idx_school_trending_score ON schools(trending_score DESC);
```

## API Endpoints

### 1. Track Course/School Views
```http
POST /api/courses-schools/track-views
Content-Type: application/json

{
  "course_ids": [1, 2, 3, 4, 5],
  "school_ids": [7, 8, 9]
}
```

**Response**:
```json
{
  "message": "Updated search tracking for 8 items",
  "courses_updated": 5,
  "schools_updated": 3,
  "timestamp": "2025-01-19T10:30:00Z"
}
```

### 2. Get Trending Courses
```http
GET /api/trending/courses?limit=20&min_searches=1
```

**Response**:
```json
{
  "trending_courses": [
    {
      "id": 42,
      "course_name": "Advanced Mathematics",
      "course_category": "Math",
      "course_description": "...",
      "thumbnail": "https://...",
      "rating": 4.8,
      "rating_count": 150,
      "search_count": 350,
      "trending_score": 245.0,
      "last_searched": "2025-01-19T09:45:00Z"
    }
  ],
  "total": 20
}
```

### 3. Get Trending Schools
```http
GET /api/trending/schools?limit=20&min_searches=1
```

**Response**:
```json
{
  "trending_schools": [
    {
      "id": 7,
      "name": "Unity University",
      "type": "University",
      "location": {"city": "Addis Ababa", "subcity": "Gerji"},
      "rating": 4.2,
      "student_count": 8500,
      "search_count": 450,
      "trending_score": 315.0,
      "last_searched": "2025-01-19T09:30:00Z"
    }
  ],
  "total": 20
}
```

### 4. Get Search Statistics
```http
GET /api/courses-schools/search-stats
```

**Response**:
```json
{
  "courses": {
    "total_courses": 150,
    "total_searches": 5000,
    "average_searches": 33.3,
    "max_searches": 500,
    "top_10": [
      {
        "id": 1,
        "name": "Advanced Math",
        "search_count": 500,
        "trending_score": 350.0
      }
    ]
  },
  "schools": {
    "total_schools": 15,
    "total_searches": 2000,
    "average_searches": 133.3,
    "max_searches": 450,
    "top_10": [
      {
        "id": 7,
        "name": "Unity University",
        "search_count": 450,
        "trending_score": 315.0
      }
    ]
  }
}
```

## Frontend Integration

### Find-Tutors Page (IMPLEMENTED ✅)

The find-tutors page now automatically tracks courses and schools:

**Files Modified**:
- [branch/find-tutors.html](branch/find-tutors.html:1210) - Added script tag
- [js/find-tutors/course-school-trending-tracker.js](js/find-tutors/course-school-trending-tracker.js) - NEW tracker
- [js/find-tutors/main-controller.js](js/find-tutors/main-controller.js:185-195) - Integrated tracking

**How it works**:
1. When tutors are loaded, extracts courses from `subjects` field and schools from `teaches_at` field
2. Tracks when user filters by subject (subject filter = course search)
3. Debounces API calls (2 seconds) to reduce server load
4. Automatically loads course/school name→ID mappings on page load

**Tracked scenarios**:
- User searches with subject filter → tracks that course
- Tutors displayed → tracks schools where they teach
- Tutors displayed → tracks courses from their subjects array

### Tracking in Other Pages

For other pages, use the tracker manually:

```javascript
class CourseSchoolTrendingTracker {
    constructor() {
        this.API_BASE_URL = 'http://localhost:8000';
        this.pendingCourseIds = new Set();
        this.pendingSchoolIds = new Set();
        this.debounceTimer = null;
    }

    async trackViews(courseIds = [], schoolIds = []) {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/courses-schools/track-views`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    course_ids: courseIds,
                    school_ids: schoolIds
                })
            });

            if (response.ok) {
                console.log(`📊 Tracked ${courseIds.length} courses, ${schoolIds.length} schools`);
            }
        } catch (error) {
            console.error('Failed to track views:', error);
        }
    }

    queueViews(courseIds = [], schoolIds = [], delay = 2000) {
        courseIds.forEach(id => this.pendingCourseIds.add(id));
        schoolIds.forEach(id => this.pendingSchoolIds.add(id));

        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            const courses = Array.from(this.pendingCourseIds);
            const schools = Array.from(this.pendingSchoolIds);

            if (courses.length > 0 || schools.length > 0) {
                this.trackViews(courses, schools);
            }

            this.pendingCourseIds.clear();
            this.pendingSchoolIds.clear();
        }, delay);
    }
}

// Global instance
const CourseSchoolTracker = new CourseSchoolTrendingTracker();
```

### Usage in Search Results

```javascript
// When displaying courses
if (courses.length > 0) {
    const courseIds = courses.map(c => c.id);
    CourseSchoolTracker.queueViews(courseIds, []);
}

// When displaying schools
if (schools.length > 0) {
    const schoolIds = schools.map(s => s.id);
    CourseSchoolTracker.queueViews([], schoolIds);
}

// Track single course view
CourseSchoolTracker.trackViews([courseId], []);

// Track single school view
CourseSchoolTracker.trackViews([], [schoolId]);
```

## Migration

Run the migration to add trending fields:

```bash
cd astegni-backend
python migrate_add_course_school_trending.py
```

## Recommended Topics Widget

Update the "Recommended Topics" widget in [user-profile.html](profile-pages/user-profile.html) to load trending courses and schools:

```javascript
async function loadRecommendedTopics() {
    try {
        // Get trending courses
        const courseResponse = await fetch(`${API_BASE_URL}/api/courses/trending?limit=5&min_searches=1`);
        const courseData = await courseResponse.json();
        const courses = courseData.trending_courses || [];

        // Get trending schools
        const schoolResponse = await fetch(`${API_BASE_URL}/api/schools/trending?limit=5&min_searches=1`);
        const schoolData = await schoolResponse.json();
        const schools = schoolData.trending_schools || [];

        // Render topics (courses and schools combined)
        const container = document.getElementById('recommended-topics-container');
        container.innerHTML = [...courses, ...schools].slice(0, 5).map(item => {
            const isCourse = item.course_name !== undefined;
            const name = isCourse ? item.course_name : item.name;
            const type = isCourse ? 'Course' : 'School';
            const icon = isCourse ? '📚' : '🏫';

            return `
                <div class="topic-card">
                    <span>${icon}</span>
                    <div>
                        <p class="font-semibold">${name}</p>
                        <p class="text-xs text-gray-500">${type}</p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Failed to load recommended topics:', error);
    }
}
```

## Testing

1. **Check trending fields exist**:
   ```bash
   python check_course_school_trending.py
   ```

2. **Track some views**:
   ```bash
   curl -X POST http://localhost:8000/api/courses-schools/track-views \
     -H "Content-Type: application/json" \
     -d '{"course_ids": [1, 2, 3], "school_ids": [7, 8]}'
   ```

3. **Check trending courses**:
   ```bash
   curl http://localhost:8000/api/courses/trending?limit=10
   ```

4. **Check trending schools**:
   ```bash
   curl http://localhost:8000/api/schools/trending?limit=10
   ```

5. **Get statistics**:
   ```bash
   curl http://localhost:8000/api/courses-schools/search-stats
   ```

## Ranking Strategy

### Recommended Topics Widget

Combine multiple factors for comprehensive ranking:

**For Courses**:
```
score = (trending_score * 2) + (rating * 10) + (rating_count / 10)
```

**For Schools**:
```
score = (trending_score * 2) + (rating * 10) + (student_count / 100)
```

This ensures:
- Trending courses/schools get visibility boost
- Quality (rating) is heavily weighted
- Popularity (rating_count, student_count) contributes
- Recent activity matters more than old searches

## Future Enhancements

1. **Category-Specific Trending**: Track trending by course category or school type
2. **Geographic Trending**: Different trends per city/region
3. **Enrollment Rate**: Track which courses/schools convert views to enrollments
4. **Time-of-Day Trends**: Different rankings for different times
5. **User Personalization**: Recommend based on user's interests and past views
6. **A/B Testing**: Test different ranking formulas for optimal engagement

## Summary

- **2 Tables Updated**: courses, schools
- **6 New Columns**: 3 per table (search_count, trending_score, last_search_increment)
- **4 New Endpoints**: Track views, trending courses, trending schools, statistics
- **Time-Weighted Scoring**: Recent searches count more than old ones
- **Easy Integration**: Simple API for frontend tracking
- **Scalable**: Indexed for performance, works with large datasets
