# Manage Courses Profile Header - Database Integration

## Overview
The profile header section in [manage-courses.html](admin-pages/manage-courses.html:155) now reads data from the database tables:
- `admin_profile` - Personal information (name, bio, quote, pictures)
- `manage_courses_profile` - Course management statistics (rating, reviews, badges, courses)

## Backend Changes

### New Endpoint
**Endpoint:** `GET /api/admin/manage-courses-profile/{admin_id}`

**File:** [admin_profile_endpoints.py](astegni-backend/admin_profile_endpoints.py:373)

**Response Structure:**
```json
{
  "id": 1,
  "username": "jediael_test1",
  "first_name": "Jediael",
  "father_name": "Jediael",
  "grandfather_name": null,
  "email": "test1@example.com",
  "phone_number": "+251911234567",
  "bio": "Experienced education administrator...",
  "quote": "Education is the most powerful weapon...",
  "profile_picture": null,
  "cover_picture": null,
  "departments": ["manage-system-settings"],
  "last_login": null,
  "created_at": "2025-10-17T18:31:11.029173",
  "courses_profile": {
    "position": "Senior Course Manager",
    "rating": 4.8,
    "total_reviews": 127,
    "badges": ["Expert Reviewer", "Top Performer", "Quality Champion"],
    "courses_created": 156,
    "courses_approved": 142,
    "courses_rejected": 8,
    "courses_archived": 6,
    "students_enrolled": 3250,
    "avg_course_rating": 4.6,
    "permissions": {...},
    "joined_date": "2024-10-18",
    "created_at": "2025-10-18T11:07:46.219088"
  }
}
```

## Frontend Changes

### Updated File
**File:** [js/admin-pages/manage-courses-dashboard-loader.js](js/admin-pages/manage-courses-dashboard-loader.js:193)

**Changes:**
1. `loadProfileStats()` now fetches from `/api/admin/manage-courses-profile/1`
2. `updateProfileHeader()` maps database fields to UI elements:
   - Username/display name
   - Profile picture and cover image
   - Rating and review count from `courses_profile`
   - Badges from `courses_profile.badges`
   - Position/department information
   - Bio and quote from `admin_profile`
   - Joined date calculation

## Profile Header UI Elements

### Elements Populated from Database:

| UI Element | Source Field | Table |
|------------|--------------|-------|
| Profile Picture | `profile_picture` | admin_profile |
| Cover Image | `cover_picture` | admin_profile |
| Username | `username` or `first_name + father_name` | admin_profile |
| Rating Value | `courses_profile.rating` | manage_courses_profile |
| Review Count | `courses_profile.total_reviews` | manage_courses_profile |
| Rating Stars | Calculated from `courses_profile.rating` | manage_courses_profile |
| Badges | `courses_profile.badges` | manage_courses_profile |
| Location/Position | `courses_profile.position` | manage_courses_profile |
| Quote | `quote` | admin_profile |
| Department | `departments` array | admin_profile |
| Employee ID | Generated as `EMP-{id}` | admin_profile |
| Joined Date | `courses_profile.joined_date` | manage_courses_profile |
| Bio | `bio` | admin_profile |

## Testing Instructions

### 1. Test Endpoint Directly
```bash
cd astegni-backend
curl http://localhost:8000/api/admin/manage-courses-profile/1 | python -m json.tool
```

Expected: JSON response with complete profile data

### 2. Seed Test Data (Already Done)
```bash
cd astegni-backend
python seed_manage_courses_profile.py
```

This creates/updates:
- Position: "Senior Course Manager"
- Rating: 4.8 with 127 reviews
- Badges: Expert Reviewer, Top Performer, Quality Champion
- 156 courses created, 142 approved
- 3,250 students enrolled

### 3. View in Browser

1. **Start Backend:**
   ```bash
   cd astegni-backend
   python app.py
   ```

2. **Start Frontend:**
   ```bash
   # From project root
   python -m http.server 8080
   ```

3. **Open Page:**
   Navigate to: http://localhost:8080/admin-pages/manage-courses.html

4. **What You Should See:**
   - Profile header in dashboard panel shows:
     - Username: "jediael_test1" (or "Jediael Jediael")
     - Rating: 4.8 ★★★★★ (127 reviews)
     - Three badges: Expert Reviewer, Top Performer, Quality Champion
     - Position: "Senior Course Manager"
     - Quote: "Education is the most powerful weapon..."
     - Bio paragraph below profile info
     - Joined date: October 2024 (calculated from joined_date)

5. **Check Browser Console:**
   - Should see: "Profile stats loaded from database: {object}"
   - No errors related to profile loading

## Database Schema

### admin_profile table
```sql
id              INTEGER PRIMARY KEY
username        VARCHAR(100)
first_name      VARCHAR(100)
father_name     VARCHAR(100)
grandfather_name VARCHAR(100)
email           VARCHAR(255)
phone_number    VARCHAR(50)
bio             TEXT
quote           TEXT
profile_picture TEXT
cover_picture   TEXT
departments     TEXT[] (array)
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### manage_courses_profile table
```sql
id                  INTEGER PRIMARY KEY
admin_id            INTEGER (FK to admin_profile)
username            VARCHAR(100)
position            VARCHAR(100)
rating              NUMERIC(3,2)
total_reviews       INTEGER
badges              JSONB
courses_created     INTEGER
courses_approved    INTEGER
courses_rejected    INTEGER
courses_archived    INTEGER
students_enrolled   INTEGER
avg_course_rating   NUMERIC(3,2)
permissions         JSONB
joined_date         DATE
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

## Fallback Behavior

If data is missing or API call fails:
- Profile picture: Shows placeholder SVG
- Cover image: Shows placeholder SVG
- Username: Shows "admin_username" placeholder
- Rating: Shows "..." placeholder
- Badges: Empty (none displayed)
- Other fields: Show "..." or "Loading..." placeholders

## Future Enhancements

### Recommended Additions:
1. **Image Upload:**
   - Add endpoints for uploading profile_picture and cover_picture
   - Store in Backblaze B2 storage
   - Update database with URLs

2. **Real-time Updates:**
   - WebSocket integration for live profile updates
   - Refresh profile when changes occur

3. **Multi-admin Support:**
   - Dynamic admin_id from authentication
   - Currently hardcoded to admin_id = 1

4. **Profile Editing:**
   - Complete the Edit Profile modal integration
   - Update both tables when profile is edited

## Files Modified

### Backend:
- ✅ [astegni-backend/admin_profile_endpoints.py](astegni-backend/admin_profile_endpoints.py) - Added `get_manage_courses_profile()` endpoint

### Frontend:
- ✅ [js/admin-pages/manage-courses-dashboard-loader.js](js/admin-pages/manage-courses-dashboard-loader.js) - Updated `loadProfileStats()` and `updateProfileHeader()`

### Database Seeds:
- ✅ [astegni-backend/seed_manage_courses_profile.py](astegni-backend/seed_manage_courses_profile.py) - New seeding script

### Documentation:
- ✅ This file

## Troubleshooting

### Profile Data Not Showing
1. Check backend is running: `http://localhost:8000/docs`
2. Test endpoint directly: `curl http://localhost:8000/api/admin/manage-courses-profile/1`
3. Check browser console for JavaScript errors
4. Verify database has data: `python astegni-backend/seed_manage_courses_profile.py`

### Rating/Reviews Show 0
- Run seed script to populate manage_courses_profile table
- Check database: `SELECT * FROM manage_courses_profile WHERE admin_id = 1;`

### Badges Not Displaying
- Badges are stored as JSONB array in manage_courses_profile
- Check format: Should be `["Badge1", "Badge2"]` or `[{"text": "Badge", "class": "badge-class"}]`

### Profile Picture Not Loading
- Currently returns null - need to upload images first
- Placeholder SVG shown when null
- Future: Add upload functionality

## Success Criteria

✅ Profile header loads data from database tables
✅ Rating and reviews display correctly
✅ Badges render from courses_profile
✅ Bio and quote show from admin_profile
✅ Joined date calculates properly
✅ Fallback placeholders work when data missing
✅ No console errors during page load
✅ API endpoint returns complete profile structure

## Status: COMPLETE ✅

The profile header section now successfully reads from `admin_profile` and `manage_courses_profile` tables in the database.
