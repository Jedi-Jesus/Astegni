# Edit Profile Modal - Data Loading Flow

## Overview
The Edit Profile modal in `tutor-profile.html` loads data from the **backend API** (not localStorage) when opened.

## Data Source: API Endpoint

### Location in Code
**File**: `profile-pages/tutor-profile.html`
**Function**: `openEditProfileModal()` (lines 11014-11141)

### API Request
```javascript
// Endpoint based on active role
const endpoint = 'http://localhost:8000/api/tutor/profile';

// Fresh data fetched from database
const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

const user = await response.json();
```

### Backend Endpoint
**File**: `astegni-backend/app.py modules/routes.py`
**Endpoint**: `GET /api/tutor/profile` (line 746)

## Field Mapping: How Each Field Loads

### 1. Username
```javascript
// Line 11076-11079
const usernameInput = document.getElementById('username');
usernameInput.value = user.username || '';
```
**API Field**: `username` (from `tutor_profiles.username`)
**Modal Input**: `#username`

---

### 2. Location
```javascript
// Line 11090-11091
const locations = user.locations || user.location ? [user.location] : [];
loadLocations(locations);
```
**API Field**: `location` (from `tutor_profiles.location`)
**Modal Display**: Loaded via `loadLocations()` function
**Note**: Converts single location string to array format

---

### 3. Courses/Subjects
```javascript
// Line 11094-11095
const courses = user.courses || user.interested_in || [];
loadCourses(courses);
```
**API Field**: `courses` (from `tutor_profiles.courses`)
**Fallback**: `interested_in` (for student profiles)
**Modal Display**: Loaded via `loadCourses()` function

---

### 4. Quote
```javascript
// Line 11111-11114
const quoteInput = document.getElementById('profileQuote');
quoteInput.value = user.quote || '';
```
**API Field**: `quote` (from `tutor_profiles.quote`)
**Modal Input**: `#profileQuote`

---

### 5. About Us / Bio
```javascript
// Line 11117-11120
const aboutUsInput = document.getElementById('aboutUs');
aboutUsInput.value = user.about || user.bio || '';
```
**API Field**: `about` or `bio` (from `tutor_profiles.bio`)
**Modal Input**: `#aboutUs`
**Note**: API returns both `about` and `bio` pointing to same field

---

### 6. Hero Title
```javascript
// Line 11123-11127
const heroTitleInput = document.getElementById('heroTitle');
heroTitleInput.value = user.hero_title || '';
```
**API Field**: `hero_title` (from `tutor_profiles.hero_title`)
**Modal Input**: `#heroTitle`

---

### 7. Hero Subtitle
```javascript
// Line 11128-11130
const heroSubtitleInput = document.getElementById('heroSubtitle');
heroSubtitleInput.value = user.hero_subtitle || '';
```
**API Field**: `hero_subtitle` (from `tutor_profiles.hero_subtitle`)
**Modal Input**: `#heroSubtitle`

---

### 8. Grade Levels (Bonus)
```javascript
// Line 11082-11083
const gradeLevels = user.grade_levels || user.grades || [];
loadGradeLevels(gradeLevels);
```
**API Field**: `grades` or `grade_levels` (from `tutor_profiles.grades`)
**Modal Display**: Loaded via `loadGradeLevels()` function

---

### 9. Languages (Bonus)
```javascript
// Line 11086-11087
const languages = user.languages || [];
loadLanguages(languages);
```
**API Field**: `languages` (from `tutor_profiles.languages`)
**Modal Display**: Loaded via `loadLanguages()` function

---

### 10. Course Type (Bonus)
```javascript
// Line 11098-11101
const courseTypeSelect = document.getElementById('editCourseType');
courseTypeSelect.value = user.course_type || '';
```
**API Field**: `course_type` (from `tutor_profiles.course_type`)
**Modal Input**: `#editCourseType`

---

## Complete API Response Structure

The `/api/tutor/profile` endpoint returns:

```json
{
  "id": 85,
  "user_id": 115,
  "name": "Jediael Jediael Undefined",
  "username": null,
  "email": "jediael.s.abebe@gmail.com",
  "phone": null,
  "profile_picture": null,
  "cover_image": null,

  // Hero Section
  "hero_title": "Excellence in Education, Delivered with Passion",
  "hero_subtitle": "Empowering students through personalized learning...",

  // Bio and Personal
  "about": null,
  "bio": null,
  "quote": null,
  "location": null,

  // Teaching Info
  "courses": [],
  "subjects": [],
  "grades": [],
  "grade_levels": [],
  "grade_level": "",
  "languages": [],
  "course_type": null,
  "sessionFormat": null,
  "teaches_at": null,
  "experience": 0,

  // Status & Media
  "is_verified": false,
  "is_active": true,
  "social_links": {}
}
```

## Data Flow Diagram

```
User clicks "Edit Profile" button
         ↓
openEditProfileModal() called
         ↓
Fetch from API: GET /api/tutor/profile
         ↓
Backend queries database:
  - tutor_profiles table
  - users table (via JOIN)
         ↓
API returns JSON response
         ↓
Modal fields populated:
  - username ← user.username
  - location ← user.location
  - courses ← user.courses
  - quote ← user.quote
  - aboutUs ← user.bio
  - heroTitle ← user.hero_title
  - heroSubtitle ← user.hero_subtitle
  - grade_levels ← user.grades
  - languages ← user.languages
  - course_type ← user.course_type
         ↓
Modal displays to user
```

## For Your Test User (ID 115)

Based on database query, the modal will load:

| Field | Value in Database | Modal Display |
|-------|------------------|---------------|
| Username | `null` | Empty input |
| Location | `null` | No locations shown |
| Courses | `[]` | No courses shown |
| Quote | `null` | Empty textarea |
| About Us | `null` | Empty textarea |
| Hero Title | `"Excellence in Education..."` | Pre-filled |
| Hero Subtitle | `"Empowering students..."` | Pre-filled |
| Grade Levels | `[]` | No grades shown |
| Languages | `[]` | No languages shown |
| Course Type | `null` | Empty select |

## Key Insights

1. **Fresh Data Always**: Modal fetches fresh data from API each time it opens (not cached)
2. **Fallback Fields**: Code checks multiple field names for compatibility (e.g., `about || bio`, `courses || interested_in`)
3. **Array Fields**: Some fields use helper functions (`loadGradeLevels`, `loadLanguages`, `loadLocations`, `loadCourses`) to render arrays
4. **No Silent Failures**: Console logs show when data loads: `✅ Fresh profile data loaded from database`

## Console Logs to Watch For

When opening the Edit Profile modal:

```javascript
🔵 openEditProfileModal called
📡 Fetching fresh profile data from database...
✅ Fresh profile data loaded from database: {username: null, location: null, ...}
✅ Edit modal populated with fresh database data
```

If fields are empty in the modal, it means they're `null` or `[]` in the database!
