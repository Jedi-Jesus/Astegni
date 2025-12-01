# Manage Schools - Profile Integration Quick Start

## What Was Implemented

The profile header in `manage-schools.html` now reads from both database tables:
- **admin_profile** (personal info: name, email, phone, bio, pictures)
- **manage_schools_profile** (role-specific: badges, ratings, reviews, position)

## Files Created/Modified

### ✅ Created Files:
1. `js/admin-pages/manage-schools-profile-loader.js` - Loads profile data from database

### ✅ Modified Files:
1. `admin-pages/manage-schools.html` - Added script reference for profile loader
2. `js/admin-pages/manage-schools.js` - Enhanced profile edit functionality

## How It Works

```
Page Load
    ↓
Get Admin Email (from auth/localStorage/JWT)
    ↓
API Call: GET /api/admin/manage-schools-profile/by-email/{email}
    ↓
Update Profile Header with Database Values
    ↓
Profile Displays:
- Username from admin_profile
- Badges from manage_schools_profile
- Rating/Reviews from manage_schools_profile
- Bio/Quote from admin_profile
- Pictures from admin_profile
```

## Testing Steps

### 1. Check Frontend Integration
Open browser console and navigate to:
```
http://localhost:8080/admin-pages/manage-schools.html
```

Look for console messages:
- ✅ "Schools Profile Loader initialized"
- ✅ "Loading profile for admin: {email}"
- ✅ "Profile header loaded from database: {profile_data}"

### 2. Verify Profile Header Elements

Check these elements update from database:
- [ ] Profile picture
- [ ] Cover picture
- [ ] Username/Display name
- [ ] Badges (System Administrator, School Management, etc.)
- [ ] Rating value (e.g., 4.9)
- [ ] Review count (e.g., 156 reviews)
- [ ] Position text
- [ ] Bio/Description
- [ ] Quote

### 3. Test Profile Editing

1. Click **"Edit Profile"** button
2. Verify form populates with current data
3. Change some fields
4. Click **"Update Profile"**
5. Verify:
   - Success notification appears
   - Profile header updates automatically
   - Changes persist on page reload

## Backend Requirements

You need to create this API endpoint:

### Endpoint: `GET /api/admin/manage-schools-profile/by-email/{email}`

**SQL Query Example:**
```sql
SELECT
    ap.*,
    json_build_object(
        'id', msp.id,
        'admin_id', msp.admin_id,
        'badges', msp.badges,
        'rating', msp.rating,
        'total_reviews', msp.total_reviews,
        'position', msp.position,
        'joined_date', msp.joined_date
    ) as schools_profile
FROM admin_profile ap
LEFT JOIN manage_schools_profile msp ON msp.admin_id = ap.id
WHERE ap.email = :email
```

**Response Format:**
```json
{
  "id": 1,
  "email": "admin@astegni.et",
  "first_name": "Abebe",
  "father_name": "Kebede",
  "grandfather_name": "Tesfa",
  "username": "abebe_admin",
  "phone_number": "+251911234567",
  "bio": "Senior System Administrator...",
  "quote": "Empowering educational institutions...",
  "profile_picture": "url_to_picture.jpg",
  "cover_picture": "url_to_cover.jpg",
  "departments": ["Educational Services"],
  "created_at": "2020-01-15T08:30:00Z",
  "schools_profile": {
    "badges": [
      {"text": "✔ System Administrator", "class": "verified"},
      {"text": "🏫 School Management", "class": "school"}
    ],
    "rating": 4.9,
    "total_reviews": 156,
    "position": "School Registration & Management",
    "joined_date": "2020-01-15T08:30:00Z"
  }
}
```

## Database Tables

### Create `manage_schools_profile` table:

```sql
CREATE TABLE IF NOT EXISTS manage_schools_profile (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admin_profile(id) ON DELETE CASCADE,
    badges JSONB DEFAULT '[]'::jsonb,
    rating DECIMAL(2,1) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    position VARCHAR(255),
    joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Seed Sample Data:

```sql
INSERT INTO manage_schools_profile (admin_id, badges, rating, total_reviews, position)
VALUES (
    1, -- Replace with actual admin_id
    '[
        {"text": "✔ System Administrator", "class": "verified"},
        {"text": "🏫 School Management", "class": "school"},
        {"text": "📊 Education Expert", "class": "expert"}
    ]'::jsonb,
    4.9,
    156,
    'Astegni Admin Panel | School Registration & Management'
);
```

## Troubleshooting

### Issue: Profile shows hardcoded data instead of database values

**Solution:**
1. Open browser DevTools → Network tab
2. Look for request to `/api/admin/manage-schools-profile/by-email/{email}`
3. Check if:
   - Request is being made ✓
   - Response status is 200 ✓
   - Response data is correct format ✓

### Issue: Console error "Failed to fetch profile data"

**Possible causes:**
- Backend endpoint doesn't exist
- Admin email not detected correctly
- Database query error
- CORS issue

**Fix:**
1. Check backend logs
2. Verify endpoint exists
3. Test endpoint directly: `http://localhost:8000/api/admin/manage-schools-profile/by-email/test1@example.com`

### Issue: Edit Profile doesn't update header

**Solution:**
1. Check `window.reloadProfileHeader` is defined
2. Verify PUT endpoint works: `/api/admin/profile/{id}`
3. Check browser console for errors

## Pattern Comparison

This follows the exact same pattern as manage-courses:

| Feature | manage-courses | manage-schools |
|---------|----------------|----------------|
| Profile Loader | `manage-courses-profile-loader.js` | `manage-schools-profile-loader.js` |
| Profile Table | `manage_courses_profile` | `manage_schools_profile` |
| API Endpoint | `/api/admin/manage-courses-profile/by-email/{email}` | `/api/admin/manage-schools-profile/by-email/{email}` |
| Data Source | `admin_profile` + `manage_courses_profile` | `admin_profile` + `manage_schools_profile` |

## Next Admin Pages

You can use this same pattern for other admin pages:

1. **manage-tutors.html** → `manage_tutors_profile` table
2. **manage-contents.html** → `manage_contents_profile` table
3. **manage-reviews.html** → `manage_reviews_profile` table
4. **etc.**

Just follow the pattern:
1. Create `manage-{page}-profile-loader.js`
2. Create `manage_{page}_profile` database table
3. Create backend endpoint: `/api/admin/manage-{page}-profile/by-email/{email}`
4. Add script to HTML page

## Success Checklist

- [ ] Profile header loads from database on page load
- [ ] Username displays from `admin_profile.username`
- [ ] Badges display from `manage_schools_profile.badges`
- [ ] Rating displays from `manage_schools_profile.rating`
- [ ] Review count displays from `manage_schools_profile.total_reviews`
- [ ] Bio displays from `admin_profile.bio`
- [ ] Quote displays from `admin_profile.quote`
- [ ] Edit Profile modal opens and populates correctly
- [ ] Saving edits updates the header automatically
- [ ] No console errors

## Reference Documentation

- [MANAGE-SCHOOLS-PROFILE-INTEGRATION.md](MANAGE-SCHOOLS-PROFILE-INTEGRATION.md) - Complete technical documentation
- [MANAGE-COURSES-PROFILE-DB-INTEGRATION.md](MANAGE-COURSES-PROFILE-DB-INTEGRATION.md) - Example implementation for manage-courses
- [CLAUDE.md](CLAUDE.md) - Overall project documentation
