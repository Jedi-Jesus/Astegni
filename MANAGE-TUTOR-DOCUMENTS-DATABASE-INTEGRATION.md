# Manage Tutor Documents - Database Integration Complete

## Overview
The `manage-tutor-documents.html` page has been updated to load profile data from the database using the `admin_profile` and `manage_tutors_profile` tables.

## Changes Made

### 1. Backend Endpoint Added
**File**: `astegni-backend/admin_profile_endpoints.py`

Added two new endpoints:

#### `/api/admin/manage-tutors-profile/by-email/{email}` (GET)
- Fetches admin profile by email (useful when admin logs in)
- Returns complete profile merged with manage_tutors_profile data
- Redirects to the main endpoint after finding admin_id

#### `/api/admin/manage-tutors-profile/{admin_id}` (GET)
- **RESTRICTED ACCESS**: Only `manage-tutors` and `manage-system-settings` departments
- Returns 403 for unauthorized departments
- Merges data from two tables:
  - `admin_profile`: Personal information (name, email, bio, etc.)
  - `manage_tutors_profile`: Department-specific stats and permissions

**Response Structure**:
```json
{
  "id": 1,
  "username": "abebe_kebede",
  "first_name": "Abebe",
  "father_name": "Kebede",
  "grandfather_name": "Tesfa",
  "email": "admin@astegni.et",
  "phone_number": "+251911234567",
  "bio": "Experienced tutor management specialist",
  "quote": "Empowering educators...",
  "profile_picture": "url/to/image.jpg",
  "cover_picture": "url/to/cover.jpg",
  "departments": ["manage-tutors"],
  "last_login": "2025-01-15T10:30:00",
  "created_at": "2024-01-01T00:00:00",
  "tutors_profile": {
    "position": "Tutor Management Specialist",
    "rating": 4.9,
    "total_reviews": 156,
    "badges": [{"text": "👨‍🏫 Tutor Management", "class": "school"}],
    "tutors_verified": 1250,
    "tutors_rejected": 45,
    "tutors_suspended": 12,
    "total_applications_processed": 1307,
    "verification_rate": 95.6,
    "permissions": {
      "can_verify_tutors": true,
      "can_reject_tutors": true,
      "can_suspend_tutors": true,
      "can_view_analytics": true
    },
    "joined_date": "2024-01-01T00:00:00",
    "has_profile": true
  }
}
```

### 2. Frontend JavaScript Module
**File**: `js/admin-pages/manage-tutor-documents-profile.js`

#### Key Functions:

1. **`loadManageTutorDocumentsProfile()`**
   - Loads profile on page load
   - Fetches from `/api/admin/manage-tutors-profile/by-email/{email}`
   - Handles 403 errors (access denied) and redirects unauthorized users
   - Falls back to sample data if API fails

2. **`updateProfileHeader(profileData)`**
   - Updates all profile header elements with database data
   - Updates username, profile picture, cover image
   - Updates rating, reviews, location, quote
   - Dynamically generates badges from database

3. **`openEditProfileModal()`**
   - Populates edit form with current profile data
   - Shows read-only department and stats information
   - Allows editing personal fields only

4. **`handleProfileUpdate(event)`**
   - Submits profile updates to backend
   - Updates UI in real-time
   - Calls `PUT /api/admin/profile/{admin_id}`

5. **Image Upload Functions**
   - `handleProfilePictureUpload()`: Uploads profile picture
   - `handleCoverImageUpload()`: Uploads cover image
   - Both use FormData and update UI immediately

### 3. HTML Integration
**File**: `admin-pages/manage-tutor-documents.html`

Added script import:
```html
<!-- Profile Loading Script - Load from admin_profile and manage_tutors_profile -->
<script src="../js/admin-pages/manage-tutor-documents-profile.js"></script>
```

## Access Control

### Allowed Departments:
- ✅ `manage-tutors`: Full tutor management access
- ✅ `manage-system-settings`: System admin viewing access
- ❌ All other departments: **403 Forbidden**

### Permission Levels:

**manage-tutors department:**
```json
{
  "position": "Tutor Management Specialist",
  "permissions": {
    "can_verify_tutors": true,
    "can_reject_tutors": true,
    "can_suspend_tutors": true,
    "can_view_analytics": true
  },
  "badges": [{"text": "👨‍🏫 Tutor Management", "class": "school"}]
}
```

**manage-system-settings department:**
```json
{
  "position": "System Administrator (Viewing)",
  "permissions": {
    "can_verify_tutors": true,
    "can_reject_tutors": true,
    "can_suspend_tutors": true,
    "can_view_analytics": true,
    "can_manage_notifications": true,
    "system_admin": true
  },
  "badges": [
    {"text": "✔ System Administrator", "class": "verified"},
    {"text": "Full Access", "class": "expert"}
  ]
}
```

## Database Tables Used

### `admin_profile` (Main Profile)
Stores shared admin information:
- `id`, `username`, `first_name`, `father_name`, `grandfather_name`
- `email`, `phone_number`, `bio`, `quote`
- `profile_picture`, `cover_picture`
- `departments` (JSON array)
- `last_login`, `created_at`, `updated_at`

### `manage_tutors_profile` (Department-Specific)
Stores tutor management stats:
- `admin_id` (foreign key)
- `position`, `rating`, `total_reviews`
- `badges` (JSON array)
- `tutors_verified`, `tutors_rejected`, `tutors_suspended`
- `total_applications_processed`, `verification_rate`
- `permissions` (JSON object)
- `joined_date`, `created_at`, `updated_at`

## Data Flow

```
Page Load
    ↓
JavaScript loads (manage-tutor-documents-profile.js)
    ↓
Get adminEmail from localStorage
    ↓
Fetch /api/admin/manage-tutors-profile/by-email/{email}
    ↓
Backend checks department access (403 if denied)
    ↓
Backend queries admin_profile table
    ↓
Backend queries manage_tutors_profile table
    ↓
Backend merges data and returns JSON
    ↓
Frontend updates profile header UI
    ↓
Store profile data in window.currentProfileData
```

## Edit Profile Flow

```
User clicks "Edit Profile"
    ↓
openEditProfileModal() populates form
    ↓
User edits fields
    ↓
User submits form
    ↓
handleProfileUpdate() sends PUT request
    ↓
Backend updates admin_profile table
    ↓
Backend returns updated profile
    ↓
Frontend updates UI with new data
    ↓
Modal closes, success message shown
```

## Testing Instructions

### 1. Verify Backend Endpoint
```bash
# Start backend server
cd astegni-backend
python app.py
```

Test endpoint:
```bash
curl -X GET "http://localhost:8000/api/admin/manage-tutors-profile/by-email/admin@astegni.et" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Test Frontend Integration

1. **Login as admin with manage-tutors or manage-system-settings department**
   - Email should be stored in localStorage as 'adminEmail'
   - Token should be stored in localStorage as 'token'

2. **Navigate to manage-tutor-documents.html**
   ```
   http://localhost:8080/admin-pages/manage-tutor-documents.html
   ```

3. **Verify profile loads:**
   - ✅ Profile header shows admin name
   - ✅ Profile picture and cover image display
   - ✅ Rating and review count shown
   - ✅ Badges display correctly
   - ✅ Department and position shown

4. **Test Edit Profile:**
   - Click "Edit Profile" button
   - Verify form populates with current data
   - Change bio or quote
   - Submit form
   - Verify UI updates immediately

5. **Test Access Control:**
   - Login as admin from different department
   - Try accessing page
   - Should see 403 error and redirect to home

### 3. Check Browser Console

Look for:
```
Profile header updated successfully
```

If errors:
```
Error loading manage-tutor-documents profile: [error details]
Loading fallback profile data
```

## Fallback Behavior

If API fails, the page loads with sample data:
- Admin username from localStorage
- Default rating: 4.9
- Default position: "Tutor Management Specialist"
- Empty stats (0 verified, 0 rejected, etc.)

This ensures the page is always functional, even without backend connection.

## Future Enhancements

1. **Real-time Stats Updates**: WebSocket integration for live tutor count updates
2. **Advanced Permissions**: Granular control over specific actions
3. **Activity Log**: Track admin actions (verifications, rejections, suspensions)
4. **Notification System**: Alert admins of pending reviews
5. **Analytics Dashboard**: Charts and graphs of verification trends

## Related Files

### Backend:
- `astegni-backend/admin_profile_endpoints.py` - Profile endpoints
- `astegni-backend/app.py` - Main application (imports router)
- `astegni-backend/migrate_department_based_profiles.py` - Table migrations

### Frontend:
- `admin-pages/manage-tutor-documents.html` - Main page
- `js/admin-pages/manage-tutor-documents-profile.js` - Profile loading logic
- `js/admin-pages/manage-tutors-standalone.js` - Navigation and panels
- `js/admin-pages/manage-tutors-data.js` - Tutor data loading
- `css/admin-profile/admin.css` - Profile header styles

## Summary

The manage-tutor-documents page now:
✅ Loads profile from `admin_profile` table
✅ Loads department stats from `manage_tutors_profile` table
✅ Restricts access to authorized departments only (403 for others)
✅ Supports profile editing with real-time UI updates
✅ Handles image uploads for profile and cover pictures
✅ Falls back gracefully if backend is unavailable
✅ Follows the same pattern as manage-courses and manage-schools pages

All profile data is now database-driven, ensuring consistency across the admin panel!
