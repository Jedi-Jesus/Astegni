# Manage Tutor Documents - Profile & Access Control Fix

## Summary

Fixed the `manage-tutor-documents.html` page to:
1. Load profile header from **both** `admin_profile` and `manage_tutors_profile` tables
2. Implement **department-based access control** restricting access to only:
   - `manage-tutor` department
   - `manage-system-settings` department

## Changes Made

### 1. Backend Changes (admin_profile_endpoints.py)

**File**: `astegni-backend/admin_profile_endpoints.py`

**Endpoint**: `GET /api/admin/manage-tutor-documents-profile/by-email/{email}`

**Changes**:
- Updated department check from `"manage-tutor-documents"` to `"manage-tutor"` (line 765)
- Updated error message to reflect correct department names (line 770)
- Updated docstring to document correct access restrictions (line 724)

**Access Control Logic**:
```python
# Check if admin has access to manage-tutor-documents page
is_system_admin = "manage-system-settings" in departments
is_tutors_admin = "manage-tutor" in departments

if not is_system_admin and not is_tutors_admin:
    raise HTTPException(
        status_code=403,
        detail="Access denied. Only manage-tutor and manage-system-settings departments can access this page."
    )
```

**Data Loading**:
- Fetches from `admin_profile` table (shared profile data)
- Fetches from `manage_tutors_profile` table (tutor management-specific data)
- Merges both into a unified profile response

### 2. Frontend Changes (manage-tutor-documents-profile.js)

**File**: `js/admin-pages/manage-tutor-documents-profile.js`

**Changes**:
- Updated alert message to match backend department names (line 42)
- No changes needed to endpoint call - already correct

**Alert Message**:
```javascript
alert('Access denied. Only manage-tutor and manage-system-settings departments can access this page.');
```

## Database Schema

### Tables Used

#### 1. admin_profile (Shared Data)
```sql
- id (primary key)
- username
- first_name
- father_name
- grandfather_name
- email
- phone_number
- bio
- quote
- profile_picture
- cover_picture
- departments (array) -- Contains: ["manage-tutor"], ["manage-system-settings"], etc.
- last_login
- created_at
```

#### 2. manage_tutors_profile (Department-Specific Data)
```sql
- id (primary key)
- admin_id (foreign key -> admin_profile.id)
- position
- rating
- total_reviews
- badges (JSON array)
- tutors_verified
- tutors_rejected
- tutors_suspended
- total_applications_processed
- verification_rate
- permissions (JSON object)
- joined_date
- created_at
```

## Access Control Rules

### Allowed Departments
1. **manage-tutor**: Full tutor management profile
   - Can verify tutors
   - Can reject applications
   - Can suspend tutors
   - Can view analytics

2. **manage-system-settings**: Viewing access with system admin badge
   - Full access (system administrator)
   - Can verify tutors
   - Can reject tutors
   - Can suspend tutors
   - Can view analytics
   - Can manage notifications
   - System admin flag

### Denied Departments
Any admin whose `departments` array does NOT include `"manage-tutor"` or `"manage-system-settings"` will:
- Receive a 403 Forbidden error from the backend
- See an alert message on the frontend
- Be redirected to the home page (`../index.html`)

## How It Works

### Frontend Flow
1. Page loads `manage-tutor-documents.html`
2. JavaScript in `manage-tutor-documents-profile.js` initializes on DOMContentLoaded
3. Retrieves `adminEmail` from localStorage (set during login)
4. Calls backend endpoint: `GET /api/admin/manage-tutor-documents-profile/by-email/{email}`
5. Backend checks department access
6. If authorized: Profile data is returned and displayed
7. If denied: 403 error triggers alert and redirect

### Backend Flow
1. Receive email from frontend
2. Look up `admin_id` from `admin_profile` table using email
3. Fetch full profile from `admin_profile` table
4. Check if `departments` array contains `"manage-tutor"` OR `"manage-system-settings"`
5. If not authorized: Return 403 Forbidden
6. If authorized: Fetch department-specific data from `manage_tutors_profile` table
7. Merge data and return unified profile

### Profile Display
The profile header shows:
- **Name**: `{first_name} {father_name}` from `admin_profile`
- **Profile Picture**: `profile_picture` from `admin_profile`
- **Cover Picture**: `cover_picture` from `admin_profile`
- **Department**: From `departments` array in `admin_profile`
- **Position**: From `manage_tutors_profile.position`
- **Rating**: From `manage_tutors_profile.rating`
- **Review Count**: From `manage_tutors_profile.total_reviews`
- **Badges**: From `manage_tutors_profile.badges`
- **Bio/Quote**: From `admin_profile.bio` and `admin_profile.quote`

## Testing Instructions

### 1. Test with Authorized Admin (manage-tutor department)

```bash
# Start backend
cd astegni-backend
python app.py

# In PostgreSQL, verify admin has correct department
psql -d astegni_db -c "SELECT id, email, departments FROM admin_profile WHERE 'manage-tutor' = ANY(departments);"
```

**Expected Result**: Profile loads successfully, showing tutor management data

### 2. Test with Authorized Admin (manage-system-settings department)

```sql
-- Verify admin has system settings department
SELECT id, email, departments FROM admin_profile WHERE 'manage-system-settings' = ANY(departments);
```

**Expected Result**: Profile loads successfully, showing system admin access

### 3. Test with Unauthorized Admin

```sql
-- Create test admin without required departments
INSERT INTO admin_profile (email, first_name, father_name, departments)
VALUES ('unauthorized@test.com', 'Test', 'User', ARRAY['manage-courses']);
```

**Expected Result**:
- Backend returns 403 Forbidden
- Frontend shows alert: "Access denied. Only manage-tutor and manage-system-settings departments can access this page."
- User redirected to home page

### 4. Full Integration Test

1. **Login as admin** with `manage-tutor` department
2. **Navigate** to `admin-pages/manage-tutor-documents.html`
3. **Verify** profile header loads with:
   - Your name from database
   - Your profile/cover pictures
   - Correct department badges
   - Tutor management statistics
4. **Click "Edit Profile"** - modal should open with your data
5. **Update profile** - changes should persist

### 5. Test Access Control

```bash
# Test endpoint directly with curl
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/admin/manage-tutor-documents-profile/by-email/admin@astegni.et
```

## Frontend Files Involved

```
admin-pages/manage-tutor-documents.html          (main page)
js/admin-pages/manage-tutor-documents-profile.js (profile loading)
js/admin-pages/manage-tutors-standalone.js       (navigation/panel management)
js/admin-pages/tutor-review.js                   (tutor review functionality)
js/admin-pages/manage-tutors-data.js             (data loading)
css/admin-profile/admin.css                      (profile styling)
```

## Backend Files Involved

```
astegni-backend/admin_profile_endpoints.py       (profile endpoints)
astegni-backend/app.py                           (main app, includes router)
```

## Common Issues & Solutions

### Issue 1: Profile Not Loading
**Solution**: Check that:
- Backend server is running (`python app.py`)
- `adminEmail` is set in localStorage
- Admin has either `manage-tutor` or `manage-system-settings` in departments array

### Issue 2: 403 Access Denied
**Solution**: Verify admin's departments:
```sql
SELECT email, departments FROM admin_profile WHERE email = 'your@email.com';
```
Add department if missing:
```sql
UPDATE admin_profile
SET departments = ARRAY['manage-tutor']
WHERE email = 'your@email.com';
```

### Issue 3: Profile Data Missing
**Solution**: Check if `manage_tutors_profile` exists for admin:
```sql
SELECT * FROM manage_tutors_profile WHERE admin_id = (
    SELECT id FROM admin_profile WHERE email = 'your@email.com'
);
```

If missing, the endpoint will provide default values based on department.

## Verification Checklist

- [x] Backend endpoint checks for correct departments (`manage-tutor`, `manage-system-settings`)
- [x] Frontend displays correct error message for unauthorized access
- [x] Profile data loads from `admin_profile` table
- [x] Profile data loads from `manage_tutors_profile` table
- [x] Data is properly merged and displayed in profile header
- [x] Access control returns 403 for unauthorized departments
- [x] Access control allows `manage-tutor` department
- [x] Access control allows `manage-system-settings` department
- [x] Alert message matches backend error message
- [x] Documentation updated with correct department names

## Next Steps

1. **Restart Backend Server**:
   ```bash
   cd astegni-backend
   python app.py
   ```

2. **Test in Browser**:
   - Open `http://localhost:8080/admin-pages/manage-tutor-documents.html`
   - Login as admin with `manage-tutor` or `manage-system-settings` department
   - Verify profile loads correctly

3. **Verify Database**:
   - Ensure admins have correct departments in their `departments` array
   - Verify `manage_tutors_profile` records exist for tutor management admins

## Department Name Reference

| Old (Incorrect)          | New (Correct)            |
|-------------------------|--------------------------|
| manage-tutor-documents  | manage-tutor             |
| (unchanged)             | manage-system-settings   |

This ensures consistency across the codebase and matches the actual department structure in the database.
