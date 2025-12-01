# Admin Tables Restructure - Complete ✓

## Summary

Successfully restructured admin database tables to separate personal information from statistics and updated review references to use usernames.

## New Table Structure

### 1. **admin_profile** (Personal Information)

Stores all personal and contact information for admin users.

**Fields:**
- `id` - Primary key
- `admin_id` - Foreign key to users table (UNIQUE)
- `first_name` - Admin's first name
- `father_name` - Admin's father's name (Ethiopian naming convention)
- `grandfather_name` - Admin's grandfather's name (Ethiopian naming convention)
- `admin_username` - Unique username for the admin (UNIQUE)
- `quote` - Personal quote/motto
- `bio` - Biographical information
- `phone_number` - Contact phone number
- `email` - Contact email address
- `department` - Admin's department (e.g., 'manage-tutors', 'manage-courses', 'manage-reviews', 'manage-schools', 'super-admin')
- `profile_picture_url` - URL to profile picture
- `cover_picture_url` - URL to cover picture
- `created_at` - Timestamp
- `updated_at` - Timestamp

**Example Data:**
```
first_name: Abebe
father_name: Kebede
grandfather_name: Tesfa
admin_username: abebe_kebede
department: manage-tutors
email: abebe.kebede@astegni.et
phone_number: +251911234567
```

### 2. **admin_profile_stats** (Statistics Only)

Stores all statistical and performance data for admins.

**Fields:**
- `id` - Primary key
- `admin_id` - Foreign key to users table (UNIQUE)
- `access_level` - Admin access level ('Admin', 'Super Admin', 'Moderator')
- `responsibilities` - Description of what the admin does (e.g., 'Course Creation & Management', 'Tutor Verification & Management')
- `employee_id` - Unique employee identifier (e.g., 'ADM-2024-001', 'SADM-2024-001')
- `last_login` - Last login timestamp
- `joined_date` - Date admin joined
- `rating` - Admin rating (DECIMAL 3,2)
- `total_reviews` - Number of reviews received
- `badges` - JSONB array of badge objects: `[{"text": "✔ Verified", "class": "verified"}]`
- `total_actions` - Total administrative actions performed
- `courses_managed` - Number of courses managed
- `tutors_verified` - Number of tutors verified
- `reviews_moderated` - Number of reviews moderated
- `created_at` - Timestamp
- `updated_at` - Timestamp

**Example Data:**
```
access_level: Admin
responsibilities: Tutor Verification & Management
employee_id: ADM-2024-001
rating: 4.80
total_reviews: 189
badges: [{"text": "✔ Tutor Specialist", "class": "verified"}, {"text": "👨‍🏫 Verification Expert", "class": "expert"}]
```

### 3. **admin_reviews** (Username-Based Reviews)

Stores reviews for admins using username references instead of names.

**Fields:**
- `id` - Primary key
- `admin_username` - Admin's username (references admin_profile.admin_username)
- `reviewer_username` - Reviewer's username from their respective profile
- `reviewer_role` - Role of reviewer ('tutor', 'student', 'parent', 'advertiser')
- `rating` - Rating (1-5)
- `review_text` - Review content
- `is_featured` - Boolean for featured reviews
- `helpful_count` - Number of helpful votes
- `created_at` - Timestamp
- `updated_at` - Timestamp

**Constraints:**
- UNIQUE constraint on (admin_username, reviewer_username) - prevents duplicate reviews
- Indexed on admin_username and reviewer_username for performance

**Example Data:**
```
admin_username: abebe_kebede
reviewer_username: john_doe_tutor
reviewer_role: tutor
rating: 5
review_text: "Excellent support for tutor verification process!"
```

## Department Values

Admins are assigned to specific departments matching the admin pages:

- `manage-tutors` - Tutor management and verification
- `manage-courses` - Course creation and management
- `manage-reviews` - Review moderation
- `manage-schools` - School partnership management
- `super-admin` - Full system administration
- `manage-students` - Student management
- `manage-parents` - Parent account management
- `manage-advertisers` - Advertiser management

## Migration Details

### Files Created:
1. **migrate_admin_restructure.py** - Main migration script
2. **verify_admin_tables.py** - Verification script
3. **seed_admin_profiles.py** - Sample data seeder
4. **query_admin_stats.py** - Query helper (UTF-8 safe)

### Backup Tables:
- `admin_profile_stats_backup` - Backup of old structure
- `admin_reviews_backup` - Backup of old reviews structure

### What Changed:

**Before:**
- Single `admin_profile_stats` table with mixed personal and statistical data
- `admin_reviews` used `admin_name` and `reviewer_name` (string names)

**After:**
- `admin_profile` - Personal information only
- `admin_profile_stats` - Statistics only
- `admin_reviews` - Uses `admin_username` and `reviewer_username` with `reviewer_role`

## Sample Admin Data

Ethiopian admin profiles with proper naming:

1. **Abebe Kebede Tesfa** (abebe_kebede)
   - Department: manage-tutors
   - Responsibilities: Tutor Verification & Management
   - Employee ID: ADM-2024-001

2. **Tigist Hailu Alemayehu** (tigist_hailu)
   - Department: manage-courses
   - Responsibilities: Course Creation & Management
   - Employee ID: ADM-2024-002

3. **Yohannes Girma Bekele** (yohannes_girma)
   - Department: manage-reviews
   - Responsibilities: Review Moderation & Trust Management
   - Employee ID: ADM-2024-004

4. **Selam Tesfaye Wolde** (selam_tesfaye)
   - Department: manage-schools
   - Responsibilities: School Partnership & Management
   - Employee ID: ADM-2024-005

5. **Dawit Mulugeta Getachew** (dawit_mulugeta)
   - Department: super-admin
   - Responsibilities: Full System Administration & Security
   - Employee ID: SADM-2024-001
   - Access Level: Super Admin

## Usage Examples

### Query Admin Profile with Stats
```sql
SELECT
    ap.first_name,
    ap.father_name,
    ap.admin_username,
    ap.department,
    ap.email,
    aps.access_level,
    aps.responsibilities,
    aps.employee_id,
    aps.rating,
    aps.total_reviews
FROM admin_profile ap
LEFT JOIN admin_profile_stats aps ON ap.admin_id = aps.admin_id
WHERE ap.admin_username = 'abebe_kebede';
```

### Query Admin Reviews
```sql
SELECT
    ar.admin_username,
    ar.reviewer_username,
    ar.reviewer_role,
    ar.rating,
    ar.review_text,
    ar.created_at
FROM admin_reviews ar
WHERE ar.admin_username = 'abebe_kebede'
ORDER BY ar.created_at DESC;
```

### Get Admin with Review Count
```sql
SELECT
    ap.admin_username,
    ap.first_name || ' ' || ap.father_name AS full_name,
    aps.rating,
    aps.total_reviews,
    COUNT(ar.id) as actual_review_count
FROM admin_profile ap
LEFT JOIN admin_profile_stats aps ON ap.admin_id = aps.admin_id
LEFT JOIN admin_reviews ar ON ap.admin_username = ar.admin_username
GROUP BY ap.admin_username, ap.first_name, ap.father_name, aps.rating, aps.total_reviews;
```

## Python Query Scripts

### Query Admin Data (UTF-8 Safe for Windows)
```bash
cd astegni-backend
python query_admin_stats.py
```

### Verify Table Structure
```bash
cd astegni-backend
python verify_admin_tables.py
```

### Seed Sample Data
```bash
cd astegni-backend
python seed_admin_profiles.py
```

## Next Steps

1. **Update Backend Endpoints:**
   - Update admin profile GET/PUT endpoints to use new table structure
   - Update admin reviews endpoints to use username-based queries
   - Add endpoints for fetching admin by department

2. **Update Frontend:**
   - Modify admin profile pages to display Ethiopian naming (first + father + grandfather)
   - Update forms to include all personal fields
   - Update review components to use usernames instead of names

3. **Add More Sample Data:**
   - Create more admin accounts
   - Add sample reviews from tutors/students to admins
   - Populate statistics (courses_managed, tutors_verified, etc.)

## Notes

- ✓ Tables successfully created and migrated
- ✓ Data preserved in backup tables
- ✓ Indexes created for performance
- ✓ UTF-8 encoding handled for Windows terminals
- ✓ Ethiopian naming convention implemented
- ✓ Department-based organization ready

All admin tables are now properly structured and ready for use!
