# Manage Schools Profile Integration

This document explains how the profile header in `manage-schools.html` loads data from both the `admin_profile` and `manage_schools_profile` database tables.

## Overview

The profile header section in the manage-schools.html page dynamically loads admin profile data from two database tables:
1. **admin_profile** - Contains personal information (name, email, phone, bio, profile/cover pictures)
2. **manage_schools_profile** - Contains school management-specific information (badges, ratings, reviews, position)

## Architecture

### Files Involved

1. **Frontend:**
   - `admin-pages/manage-schools.html` - Main page with profile header section
   - `js/admin-pages/manage-schools-profile-loader.js` - Loads profile data from database
   - `js/admin-pages/manage-schools.js` - Handles profile editing functionality

2. **Backend (Expected):**
   - API endpoint: `GET /api/admin/manage-schools-profile/by-email/{email}`
   - Returns combined data from `admin_profile` and `manage_schools_profile` tables

## How It Works

### 1. Profile Loading on Page Load

When the page loads, `manage-schools-profile-loader.js` automatically:

```javascript
// 1. Gets the admin's email from authentication
const adminEmail = getAdminEmail();

// 2. Fetches profile data from backend
const response = await fetch(`${API_BASE_URL}/api/admin/manage-schools-profile/by-email/${encodeURIComponent(adminEmail)}`);

// 3. Updates the profile header with database values
updateProfileHeader(profile);
```

### 2. Authentication Email Detection

The system tries multiple methods to get the admin's email (in order):

1. **AuthManager**: Checks `authManager.getCurrentUser()`
2. **LocalStorage**: Checks `localStorage.getItem('currentUser')`
3. **JWT Token**: Decodes the JWT token to extract email
4. **Fallback**: Uses `test1@example.com` for development/testing

### 3. Profile Header Elements Updated

The following profile header elements are populated from the database:

#### From `admin_profile` table:
- Profile picture
- Cover picture
- Username (or Ethiopian name: `first_name + father_name`)
- Email
- Phone number
- Bio/Description
- Quote
- Departments
- Created date (for "Joined" field)

#### From `manage_schools_profile` table:
- Badges (e.g., "System Administrator", "School Management", "Education Expert")
- Performance rating (e.g., 4.9)
- Total reviews count (e.g., 156 reviews)
- Position/Role description
- Joined date (overrides admin_profile created_at if present)

### 4. Profile Editing Flow

When the admin clicks "Edit Profile":

```javascript
// 1. Opens modal and fetches current profile data
window.openEditProfileModal();

// 2. Populates form with current values
populateEditForm(currentAdminProfile);

// 3. User edits and submits
window.handleProfileUpdate(event);

// 4. Sends PUT request to update admin_profile
PUT /api/admin/profile/{admin_id}

// 5. Reloads profile header to show updated data
window.reloadProfileHeader();
```

## Database Schema Expected

### admin_profile table:
```sql
- id (integer, primary key)
- email (string, unique)
- first_name (string)
- father_name (string)
- grandfather_name (string)
- username (string)
- phone_number (string)
- bio (text)
- quote (string)
- profile_picture (string, URL)
- cover_picture (string, URL)
- departments (JSON array)
- created_at (timestamp)
```

### manage_schools_profile table:
```sql
- id (integer, primary key)
- admin_id (integer, foreign key to admin_profile)
- badges (JSON array)
  Example: [
    {"text": "System Administrator", "class": "verified"},
    {"text": "School Management", "class": "school"},
    {"text": "Education Expert", "class": "expert"}
  ]
- rating (decimal, e.g., 4.9)
- total_reviews (integer, e.g., 156)
- position (string, e.g., "Astegni Admin Panel | School Registration & Management")
- joined_date (timestamp)
```

## Backend API Response Format

Expected response from `GET /api/admin/manage-schools-profile/by-email/{email}`:

```json
{
  "id": 1,
  "email": "admin@astegni.et",
  "first_name": "Abebe",
  "father_name": "Kebede",
  "grandfather_name": "Tesfa",
  "username": "abebe_kebede",
  "phone_number": "+251911234567",
  "bio": "Senior System Administrator with 5+ years of experience in educational platform management.",
  "quote": "Empowering educational institutions through efficient management and verification.",
  "profile_picture": "https://example.com/uploads/profile/admin1.jpg",
  "cover_picture": "https://example.com/uploads/cover/admin1_cover.jpg",
  "departments": ["Educational Services", "School Management"],
  "created_at": "2020-01-15T08:30:00Z",
  "schools_profile": {
    "id": 1,
    "admin_id": 1,
    "badges": [
      {"text": "✔ System Administrator", "class": "verified"},
      {"text": "🏫 School Management", "class": "school"},
      {"text": "📊 Education Expert", "class": "expert"}
    ],
    "rating": 4.9,
    "total_reviews": 156,
    "position": "Astegni Admin Panel | School Registration & Management",
    "joined_date": "2020-01-15T08:30:00Z"
  }
}
```

## Implementation Pattern

This implementation follows the same pattern as `manage-courses.html`:

1. **manage-courses.html** uses:
   - `manage-courses-profile-loader.js` (loads from `admin_profile` + `manage_courses_profile`)
   - `manage-courses-profile-edit.js` (handles profile editing)

2. **manage-schools.html** uses:
   - `manage-schools-profile-loader.js` (loads from `admin_profile` + `manage_schools_profile`)
   - Profile editing integrated into `manage-schools.js`

## Testing the Integration

### 1. Start Backend Server
```bash
cd astegni-backend
python app.py
```

### 2. Verify Backend Endpoint
Create the backend endpoint `/api/admin/manage-schools-profile/by-email/{email}` that:
- Joins `admin_profile` and `manage_schools_profile` tables
- Returns combined data in the format shown above

### 3. Test Frontend
1. Open `http://localhost:8080/admin-pages/manage-schools.html`
2. Check browser console for: "Profile header loaded from database"
3. Verify profile header displays:
   - Admin username
   - Badges from database
   - Rating and review count
   - Profile/cover pictures
   - Bio and quote

### 4. Test Profile Editing
1. Click "Edit Profile" button
2. Verify form populates with current data
3. Make changes and submit
4. Verify profile header updates automatically

## Key Features

✅ **Automatic Loading**: Profile loads automatically on page load
✅ **Database Integration**: Reads from both `admin_profile` and `manage_schools_profile` tables
✅ **Real-time Updates**: Profile header updates immediately after editing
✅ **Fallback Values**: Keeps hardcoded values if API fails (graceful degradation)
✅ **Multi-source Authentication**: Tries multiple methods to get admin email
✅ **Ethiopian Name Support**: Properly handles Ethiopian naming convention (first + father + grandfather)

## Troubleshooting

### Profile Not Loading
- Check browser console for errors
- Verify backend endpoint exists: `/api/admin/manage-schools-profile/by-email/{email}`
- Check admin email is correctly detected (look for console log)

### Profile Displays Hardcoded Data
- Backend endpoint may be failing (check network tab)
- Check API response format matches expected structure
- Verify `schools_profile` nested object exists in response

### Profile Edit Not Working
- Check `currentAdminProfile.id` is set correctly
- Verify PUT endpoint exists: `/api/admin/profile/{id}`
- Check network tab for request/response errors

## Next Steps

To complete the integration:

1. **Create Backend Endpoint**: Implement `GET /api/admin/manage-schools-profile/by-email/{email}`
2. **Database Migration**: Ensure `manage_schools_profile` table exists
3. **Seed Data**: Add sample data to `manage_schools_profile` for testing
4. **Test**: Follow testing steps above to verify integration

## Related Documentation

- [MANAGE-COURSES-PROFILE-DB-INTEGRATION.md](MANAGE-COURSES-PROFILE-DB-INTEGRATION.md) - Similar implementation for manage-courses
- [ADMIN-PROFILE-DB-INTEGRATION-COMPLETE.md](ADMIN-PROFILE-DB-INTEGRATION-COMPLETE.md) - Admin profile structure reference
- [CLAUDE.md](CLAUDE.md) - Project architecture and API documentation
