# Manage Contents - Database Integration Complete

## Overview
The manage-contents.html page has been fully integrated with the database. All profile data, statistics, and reviews are now loaded from:
- `admin_profile` table (personal information)
- `manage_contents_profile` table (department-specific stats)
- `admin_reviews` table (filtered by admin_id and department)

## Features Implemented

### 1. Profile Header Integration
✅ **Profile data loaded from database:**
- Profile picture and cover image
- Admin name (username or first_name + father_name)
- Badges from manage_contents_profile
- Rating and review count
- Position/location
- Bio and quote
- Employee ID and joined date

### 2. Edit Profile Modal
✅ **Full CRUD operations:**
- Opens with current data pre-populated
- Updates admin_profile table (personal information)
- Ethiopian naming convention (first name, father name, grandfather name)
- Username (display name)
- Contact information (email, phone)
- Bio and quote

### 3. Department-Based Access Control
✅ **Two departments allowed:**
- `manage-contents` (primary department)
- `manage-system-settings` (cross-department access)

Access verification happens at the backend endpoint level.

### 4. Statistics Integration
✅ **Dashboard stats from database:**
- Verified Contents
- Requested Contents
- Rejected Contents
- Flagged Contents
- Total Storage (GB)
- Approval Rate
- Avg Processing Time
- User Satisfaction

### 5. Recent Reviews
✅ **Filtered reviews from admin_reviews table:**
- Filtered by `admin_id` and `department = 'manage-contents'`
- Shows most recent reviews
- Featured reviews appear first
- Displays reviewer name, role, rating, and text

## Database Schema

### manage_contents_profile Table
```sql
CREATE TABLE manage_contents_profile (
    profile_id SERIAL PRIMARY KEY,
    admin_id INTEGER UNIQUE REFERENCES admin_profile(admin_id),

    -- Position and role
    position VARCHAR(100) DEFAULT 'Content Management',

    -- Performance metrics
    rating DECIMAL(2,1) DEFAULT 4.5,
    total_reviews INTEGER DEFAULT 0,
    badges JSONB,

    -- Employee information
    employee_id VARCHAR(50),
    joined_date VARCHAR(50),
    last_active TIMESTAMP,

    -- Content statistics
    verified_contents INTEGER DEFAULT 0,
    requested_contents INTEGER DEFAULT 0,
    rejected_contents INTEGER DEFAULT 0,
    flagged_contents INTEGER DEFAULT 0,
    total_storage_gb DECIMAL(10,2) DEFAULT 0.00,

    -- Performance metrics
    approval_rate DECIMAL(5,2) DEFAULT 93.00,
    avg_processing_hours DECIMAL(5,2) DEFAULT 2.00,
    user_satisfaction DECIMAL(5,2) DEFAULT 96.00,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## Backend Endpoints

### 1. Get Profile by Email
```
GET /api/admin/manage-contents-profile/by-email/{email}
```

**Access Control:** Checks if admin has `manage-contents` or `manage-system-settings` department

**Response:**
```json
{
  "admin_id": 1,
  "email": "test1@example.com",
  "username": "content_admin",
  "first_name": "Abebe",
  "father_name": "Kebede",
  "grandfather_name": "Tesfa",
  "phone_number": "+251911234567",
  "bio": "Content management specialist...",
  "quote": "Quality content builds trust",
  "profile_picture": "uploads/...",
  "cover_picture": "uploads/...",
  "departments": ["manage-contents"],
  "contents_profile": {
    "position": "Content Management Specialist",
    "rating": 4.9,
    "total_reviews": 156,
    "badges": [...],
    "employee_id": "ADM-CNT-2024",
    "joined_date": "January 2020",
    "verified_contents": 1245,
    "requested_contents": 48,
    "rejected_contents": 87,
    "flagged_contents": 12,
    "total_storage_gb": 470.0,
    "approval_rate": 93.0,
    "avg_processing_hours": 2.0,
    "user_satisfaction": 96.0
  }
}
```

### 2. Update Profile
```
PUT /api/admin/manage-contents-profile?admin_id=1&first_name=...&father_name=...
```

Updates only personal information in `admin_profile` table.

### 3. Get Reviews
```
GET /api/admin/manage-contents-reviews/{admin_id}
```

Returns reviews filtered by:
- `admin_id` (the admin being reviewed)
- `department = 'manage-contents'`

## Frontend Implementation

### Files Modified/Created

1. **Backend:**
   - `astegni-backend/manage_contents_endpoints.py` (NEW)
   - `astegni-backend/app.py` (updated to include router)
   - `astegni-backend/migrate_manage_contents_profile.py` (migration)
   - `astegni-backend/seed_manage_contents_reviews.py` (sample data)

2. **Frontend:**
   - `js/admin-pages/manage-contents-profile-loader.js` (NEW)
   - `admin-pages/manage-contents.html` (updated script imports)

### JavaScript Module Structure

**manage-contents-profile-loader.js:**
- `loadProfileHeader()` - Fetches and displays profile data
- `updateProfileHeader()` - Updates DOM with profile data
- `updateStatistics()` - Updates dashboard stat cards
- `loadRecentReviews()` - Fetches and displays reviews
- `openEditProfileModal()` - Opens modal with pre-populated data
- `handleProfileUpdate()` - Saves profile changes to database

## Setup Instructions

### Step 1: Run Database Migration
```bash
cd astegni-backend
python migrate_manage_contents_profile.py
```

This creates the `manage_contents_profile` table.

### Step 2: Seed Sample Data
```bash
python seed_manage_contents_reviews.py
```

This adds sample reviews for the test admin.

### Step 3: Ensure Admin Has Correct Department
```bash
# Connect to PostgreSQL
psql -U astegni_user -d astegni_db

# Check admin departments
SELECT admin_id, email, departments FROM admin_profile WHERE email = 'test1@example.com';

# If needed, add manage-contents department
UPDATE admin_profile
SET departments = array_append(departments, 'manage-contents')
WHERE email = 'test1@example.com'
AND NOT ('manage-contents' = ANY(departments));
```

### Step 4: Start Backend Server
```bash
cd astegni-backend
python app.py
```

Server runs on http://localhost:8000

### Step 5: Start Frontend Server
```bash
# From project root
python -m http.server 8080
```

Frontend runs on http://localhost:8080

### Step 6: Open Page
Navigate to: http://localhost:8080/admin-pages/manage-contents.html

## Testing Checklist

### Profile Header
- [ ] Profile picture loads from database
- [ ] Cover image loads from database
- [ ] Admin name displays correctly
- [ ] Badges display from contents_profile
- [ ] Rating and review count show correct values
- [ ] Location/position displays correctly
- [ ] Quote displays correctly
- [ ] Employee ID and joined date show correct values

### Statistics Cards
- [ ] Verified Contents shows database value
- [ ] Requested Contents shows database value
- [ ] Rejected Contents shows database value
- [ ] Flagged Contents shows database value
- [ ] Total Storage shows database value
- [ ] Approval Rate shows database value
- [ ] Avg Processing shows database value
- [ ] User Satisfaction shows database value

### Edit Profile Modal
- [ ] Opens with current data pre-populated
- [ ] All fields editable
- [ ] Save updates database
- [ ] Profile header refreshes after save
- [ ] Success message displays
- [ ] Modal closes after save

### Recent Reviews
- [ ] Reviews load from admin_reviews table
- [ ] Filtered by admin_id
- [ ] Filtered by department = 'manage-contents'
- [ ] Reviews display correctly
- [ ] Stars show correct rating
- [ ] Time ago calculates correctly

### Department Access Control
- [ ] Admin with manage-contents department can access
- [ ] Admin with manage-system-settings department can access
- [ ] Admin without either department gets 403 error
- [ ] Error message shows required departments

## Troubleshooting

### Profile Not Loading
1. Check browser console for errors
2. Verify admin email in localStorage/JWT token
3. Check backend logs for database errors
4. Verify admin exists in admin_profile table
5. Ensure manage_contents_profile table has data

### 403 Access Denied
1. Check admin departments in database:
   ```sql
   SELECT departments FROM admin_profile WHERE email = 'your_email@example.com';
   ```
2. Add required department:
   ```sql
   UPDATE admin_profile
   SET departments = array_append(departments, 'manage-contents')
   WHERE email = 'your_email@example.com';
   ```

### Reviews Not Loading
1. Verify admin_id is set (check console logs)
2. Check if reviews exist:
   ```sql
   SELECT * FROM admin_reviews
   WHERE admin_id = YOUR_ADMIN_ID
   AND department = 'manage-contents';
   ```
3. Run seed script if no reviews exist

### Edit Profile Not Working
1. Check if admin_id is available in window.currentAdminId
2. Verify form fields have correct IDs
3. Check backend logs for update errors
4. Ensure admin_profile table has correct schema

## Department Configuration

To add an admin to manage-contents department:

```sql
-- Add single department
UPDATE admin_profile
SET departments = ARRAY['manage-contents']
WHERE email = 'admin@example.com';

-- Add multiple departments
UPDATE admin_profile
SET departments = ARRAY['manage-contents', 'manage-system-settings']
WHERE email = 'admin@example.com';

-- Append to existing departments
UPDATE admin_profile
SET departments = array_append(departments, 'manage-contents')
WHERE email = 'admin@example.com';
```

## Success Criteria

✅ **All features working:**
1. Profile data loads from admin_profile table
2. Statistics load from manage_contents_profile table
3. Reviews load from admin_reviews table filtered by department
4. Edit profile modal updates database
5. Department-based access control enforced
6. Two departments can access: manage-contents and manage-system-settings

## Next Steps

1. **Content Management Logic:** Implement actual content approval/rejection workflow
2. **Storage Analytics:** Build storage analytics dashboard
3. **Real-time Updates:** Add WebSocket for live content feed
4. **Batch Operations:** Add bulk approve/reject functionality
5. **Advanced Filters:** Implement content type and date range filters

## Notes

- Edit modal only updates `admin_profile` table (personal info)
- Statistics in `manage_contents_profile` should be updated by backend jobs/triggers
- Department access control is enforced at endpoint level
- Profile loader handles authentication via multiple methods (authManager, localStorage, JWT)
- Fallback to test email (test1@example.com) for development

## Related Documentation

- [Admin Profile Integration](ADMIN-PROFILE-DB-INTEGRATION-COMPLETE.md)
- [Manage Campaigns Setup](MANAGE-CAMPAIGNS-SETUP-GUIDE.md)
- [Manage System Settings](SYSTEM-SETTINGS-COMPLETE.md)
- [Department-Based Access Control](ADMIN-DEPARTMENT-BASED-ACCESS-CONTROL.md)
