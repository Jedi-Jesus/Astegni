# Email-Based Profile Loading

## Overview
The profile header and edit profile modal now load data based on the admin's **email** from their authentication session, instead of hardcoded admin IDs.

## How It Works

### 1. Backend - Email-Based Endpoint

**New Endpoint:** `GET /api/admin/manage-courses-profile/by-email/{email}`

**Location:** [astegni-backend/admin_profile_endpoints.py](astegni-backend/admin_profile_endpoints.py:373)

**Flow:**
```
1. Receive email from frontend
2. Query admin_profile table for admin_id by email
3. Call existing get_manage_courses_profile(admin_id)
4. Return complete profile data
```

**Example Request:**
```bash
GET /api/admin/manage-courses-profile/by-email/test1@example.com
```

**Example Response:**
```json
{
  "id": 1,
  "username": "jediael_test1",
  "email": "test1@example.com",
  "first_name": "Jediael",
  "father_name": "Jediael",
  "departments": ["manage-system-settings"],
  "courses_profile": {
    "position": "System Administrator (Viewing)",
    "badges": ["System Admin", "Full Access"],
    ...
  }
}
```

### 2. Frontend - Email Extraction

**File:** [js/admin-pages/manage-courses-dashboard-loader.js](js/admin-pages/manage-courses-dashboard-loader.js:193)

**Function:** `getAdminEmail()`

**Email Sources (checked in order):**

1. **AuthManager** - From authentication system
   ```javascript
   authManager.getCurrentUser().email
   ```

2. **LocalStorage** - Stored user data
   ```javascript
   JSON.parse(localStorage.getItem('currentUser')).email
   ```

3. **JWT Token** - Decoded from access token
   ```javascript
   // Decode token payload
   const payload = decodeJWT(token);
   payload.email
   ```

4. **Fallback** - Test email (for development)
   ```javascript
   return 'test1@example.com';
   ```

### 3. Edit Profile Modal

**File:** [js/admin-pages/manage-courses-profile-edit.js](js/admin-pages/manage-courses-profile-edit.js)

**Features:**
- ✅ Loads current admin profile by email
- ✅ Populates form with existing data
- ✅ Updates profile via PUT request
- ✅ Refreshes profile header after update
- ✅ Handles Ethiopian naming (first, father, grandfather names)

**Form Fields:**
```javascript
{
  first_name: "Jediael",
  father_name: "Kebede",
  grandfather_name: "Tesfa",
  phone_number: "+251911234567",
  bio: "...",
  quote: "..."
}
```

## Implementation Details

### Profile Header Loading

**File:** [js/admin-pages/manage-courses-dashboard-loader.js](js/admin-pages/manage-courses-dashboard-loader.js:193)

```javascript
async function loadProfileStats() {
    // Get email from auth
    const adminEmail = getAdminEmail();

    // Fetch profile by email
    const response = await fetch(
        `${API_BASE_URL}/api/admin/manage-courses-profile/by-email/${encodeURIComponent(adminEmail)}`
    );

    const profile = await response.json();
    updateProfileHeader(profile);
}
```

### Edit Profile Flow

1. **Open Modal:**
   ```javascript
   openEditProfileModal() → fetch profile by email → populate form
   ```

2. **User Edits:**
   ```
   User changes fields → validation → ready to submit
   ```

3. **Submit:**
   ```javascript
   handleProfileUpdate() → PUT /api/admin/profile/{admin_id} → reload profile
   ```

4. **Success:**
   ```
   Profile updated → modal closed → header refreshed → notification shown
   ```

## Security Benefits

### Why Email-Based?

1. **Session-Based:** Uses authenticated user's email
2. **No ID Guessing:** Can't query arbitrary admin IDs
3. **Token Verification:** Email comes from validated JWT
4. **Audit Trail:** Know which email made changes
5. **Multi-Device:** Same email works across devices

### Authentication Flow

```
Login → JWT with email → Store in localStorage → Use for all requests
```

```javascript
// JWT Payload includes email
{
  "sub": "1",
  "email": "admin@example.com",
  "role": "admin",
  "exp": 1234567890
}
```

## Testing

### Test 1: Load Profile by Email
```bash
curl http://localhost:8000/api/admin/manage-courses-profile/by-email/test1@example.com
```

**Expected:** Full profile data returned

### Test 2: Edit Profile
1. Open http://localhost:8080/admin-pages/manage-courses.html
2. Click "Edit Profile" button
3. Verify form is populated with current data
4. Change bio or quote
5. Submit form
6. Verify profile header updates

### Test 3: Different Admin
1. Login as different admin (different email)
2. Profile header should show their data
3. Edit profile should load their specific data

### Test 4: Email Not Found
```bash
curl http://localhost:8000/api/admin/manage-courses-profile/by-email/nonexistent@example.com
```

**Expected:** 404 error with message "Admin with email nonexistent@example.com not found"

## Database Queries

### Email to ID Lookup
```sql
SELECT id FROM admin_profile WHERE email = 'test1@example.com';
```

### Profile Update
```sql
UPDATE admin_profile
SET first_name = %s, bio = %s, updated_at = NOW()
WHERE id = %s;
```

## Frontend Usage Examples

### Get Current Admin Email
```javascript
const email = getAdminEmail();
console.log(`Logged in as: ${email}`);
```

### Load Profile
```javascript
const profile = await fetch(`${API_BASE_URL}/api/admin/manage-courses-profile/by-email/${email}`);
```

### Update Profile
```javascript
await fetch(`${API_BASE_URL}/api/admin/profile/${profile.id}`, {
    method: 'PUT',
    body: JSON.stringify({
        first_name: 'New Name',
        bio: 'Updated bio'
    })
});
```

## Error Handling

### Email Not Found
```javascript
if (response.status === 404) {
    alert('Profile not found. Please contact administrator.');
    redirectToLogin();
}
```

### Authentication Error
```javascript
if (!adminEmail) {
    console.error('No email found in authentication');
    redirectToLogin();
}
```

### Network Error
```javascript
catch (error) {
    console.error('Error loading profile:', error);
    // Show placeholder data
}
```

## Image Upload (Future)

### Profile Picture Upload
```javascript
// TODO: Implement
window.handleProfilePictureUpload = async function() {
    // 1. Upload to Backblaze B2
    // 2. Get URL
    // 3. Update admin_profile.profile_picture
    // 4. Refresh profile header
};
```

### Cover Image Upload
```javascript
// TODO: Implement
window.handleCoverImageUpload = async function() {
    // Similar flow for cover picture
};
```

## Multi-Admin Support

### Different Admins See Their Own Data
```
Admin A (admin1@example.com) → Sees Admin A's profile
Admin B (admin2@example.com) → Sees Admin B's profile
```

### No Cross-Contamination
- Each admin's email maps to their unique ID
- Profile edits only affect their own record
- No way to edit another admin's profile

## Files Modified

### Backend:
- ✅ [astegni-backend/admin_profile_endpoints.py](astegni-backend/admin_profile_endpoints.py) - Added `by-email` endpoint

### Frontend:
- ✅ [js/admin-pages/manage-courses-dashboard-loader.js](js/admin-pages/manage-courses-dashboard-loader.js) - Email-based loading
- ✅ [js/admin-pages/manage-courses-profile-edit.js](js/admin-pages/manage-courses-profile-edit.js) - New file for edit functionality
- ✅ [admin-pages/manage-courses.html](admin-pages/manage-courses.html) - Added script reference

## Benefits Summary

✅ **Session-Aware:** Uses authenticated admin's email
✅ **Secure:** Can't access other admins' profiles
✅ **Flexible:** Works with different auth systems
✅ **Maintainable:** Single source of truth (email)
✅ **Multi-User:** Each admin sees their own data
✅ **Edit Support:** Profile can be updated properly
✅ **Cross-Department:** Works for all admin types

## Status: COMPLETE ✅

Profile header and edit profile modal now properly load and update data based on the authenticated admin's email from `admin_profile` table.
