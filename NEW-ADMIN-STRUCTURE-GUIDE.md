# New Admin Profile Structure - Quick Reference Guide

## ✅ Migration Completed Successfully!

Your admin system now uses a **department-based architecture** with **one row per admin** (no duplicate emails).

---

## 📊 New Table Structure

### **1. admin_profile** (Core Admin Data - ONE row per person)

**Purpose:** Stores who the admin is (identity, contact, authentication)

**Columns:**
```sql
id                 - Primary key (unique per admin)
email              - UNIQUE email (no duplicates allowed!)
password_hash      - Hashed password
first_name         - Ethiopian first name
father_name        - Ethiopian father name
grandfather_name   - Ethiopian grandfather name
phone_number       - Contact phone
profile_picture    - Profile image URL
cover_picture      - Cover image URL
bio                - Personal bio
quote              - Personal quote
otp_code           - For registration/password reset
otp_expires_at     - OTP expiration timestamp
is_otp_verified    - Registration completed?
created_at         - Account creation date
updated_at         - Last update
last_login         - Last login timestamp
```

**Example Data:**
```
id | email                     | first_name | father_name
---|---------------------------|------------|------------
1  | test1@example.com         | Jane       | Doe
2  | kushstudios16@gmail.com   | John       | Smith
```

---

### **2. Department Profile Tables** (What they do in each department)

Each admin can have profiles in **multiple departments**. Each department has its own table:

#### **manage_campaigns_profile**
```sql
id, admin_id (FK → admin_profile.id)
position, joined_date, rating, total_reviews, badges

-- Campaign-specific metrics:
campaigns_approved, campaigns_rejected, campaigns_suspended
total_budget_managed, avg_campaign_performance

-- Permissions (JSONB):
permissions: {"can_approve": false, "can_reject": false, ...}
```

#### **manage_courses_profile**
```sql
id, admin_id (FK → admin_profile.id)
position, joined_date, rating, total_reviews, badges

-- Course-specific metrics:
courses_created, courses_approved, courses_rejected, courses_archived
students_enrolled, avg_course_rating

-- Permissions (JSONB):
permissions: {"can_create": false, "can_approve": false, ...}
```

#### **manage_schools_profile**
```sql
id, admin_id (FK → admin_profile.id)
position, joined_date, rating, total_reviews, badges

-- School-specific metrics:
schools_verified, schools_rejected, schools_suspended
total_students_managed, accreditation_reviews

-- Permissions (JSONB):
permissions: {"can_verify": false, "can_reject": false, ...}
```

#### **manage_tutors_profile**
```sql
id, admin_id (FK → admin_profile.id)
position, joined_date, rating, total_reviews, badges

-- Tutor-specific metrics:
tutors_verified, tutors_rejected, tutors_suspended
verification_requests_pending, avg_verification_time_hours

-- Permissions (JSONB):
permissions: {"can_verify": false, "can_reject": false, ...}
```

#### **manage_customers_profile**
```sql
id, admin_id (FK → admin_profile.id)
position, joined_date, rating, total_reviews, badges

-- Customer-specific metrics:
customers_managed, support_tickets_resolved
avg_response_time_hours, customer_satisfaction_rate

-- Permissions (JSONB):
permissions: {"can_suspend": false, "can_delete": false, ...}
```

#### **manage_contents_profile**
```sql
id, admin_id (FK → admin_profile.id)
position, joined_date, rating, total_reviews, badges

-- Content-specific metrics:
videos_uploaded, blogs_published, media_moderated
total_views, avg_engagement_rate

-- Permissions (JSONB):
permissions: {"can_upload": false, "can_publish": false, ...}
```

#### **manage_system_settings_profile** (Super Admin)
```sql
id, admin_id (FK → admin_profile.id)
position, joined_date, rating, total_reviews, badges

-- System-wide metrics:
total_actions, system_changes_made
admins_invited, critical_alerts_resolved

-- Full Access Permissions (JSONB):
permissions: {
    "full_access": true,
    "can_manage_admins": true,
    "can_change_settings": true,
    "can_access_all_departments": true
}
```

---

## 🔍 Example: Admin in Multiple Departments

**Admin:** kushstudios16@gmail.com

### admin_profile:
```
id: 2
email: kushstudios16@gmail.com
first_name: John
father_name: Smith
```

### manage_schools_profile:
```
id: 1
admin_id: 2  ← Points to admin_profile.id
position: "Manager"
schools_verified: 45
```

### manage_courses_profile:
```
id: 1
admin_id: 2  ← Same admin in different department!
position: "Staff"
courses_created: 12
```

**Result:** One person (John Smith) has:
- **One row** in `admin_profile`
- **Two rows** across department tables (one in schools, one in courses)
- **No duplicate emails!** ✓

---

## 🔧 How to Query

### Get admin basic info:
```sql
SELECT * FROM admin_profile WHERE email = 'john@example.com';
```

### Get admin with their courses department data:
```sql
SELECT a.*, c.*
FROM admin_profile a
JOIN manage_courses_profile c ON a.id = c.admin_id
WHERE a.email = 'john@example.com';
```

### Get all departments for an admin:
```sql
SELECT
    a.email,
    CASE WHEN mc.id IS NOT NULL THEN 'manage-campaigns' END as campaigns,
    CASE WHEN mco.id IS NOT NULL THEN 'manage-courses' END as courses,
    CASE WHEN ms.id IS NOT NULL THEN 'manage-schools' END as schools,
    CASE WHEN mt.id IS NOT NULL THEN 'manage-tutors' END as tutors,
    CASE WHEN mcu.id IS NOT NULL THEN 'manage-customers' END as customers,
    CASE WHEN mcon.id IS NOT NULL THEN 'manage-contents' END as contents,
    CASE WHEN mss.id IS NOT NULL THEN 'manage-system-settings' END as system_settings
FROM admin_profile a
LEFT JOIN manage_campaigns_profile mc ON a.id = mc.admin_id
LEFT JOIN manage_courses_profile mco ON a.id = mco.admin_id
LEFT JOIN manage_schools_profile ms ON a.id = ms.admin_id
LEFT JOIN manage_tutors_profile mt ON a.id = mt.admin_id
LEFT JOIN manage_customers_profile mcu ON a.id = mcu.admin_id
LEFT JOIN manage_contents_profile mcon ON a.id = mcon.admin_id
LEFT JOIN manage_system_settings_profile mss ON a.id = mss.admin_id
WHERE a.email = 'john@example.com';
```

### Check if admin has access to specific department:
```sql
-- Check if admin can access courses department
SELECT EXISTS (
    SELECT 1
    FROM admin_profile a
    JOIN manage_courses_profile c ON a.id = c.admin_id
    WHERE a.email = 'john@example.com'
);
```

---

## 📝 Backend Endpoints to Update

### Files that need updating:
1. **admin_auth_endpoints.py** - Login/registration
2. **admin_management_endpoints.py** - Invite/manage admins
3. **admin_profile_endpoints.py** - Profile CRUD
4. **admin_dashboard_endpoints.py** - Dashboard stats

### Key changes needed:
- Registration: Create row in `admin_profile` + department table
- Login: Query `admin_profile` first, then join department table
- Profile update: Update `admin_profile` for shared fields, department table for dept-specific
- Access control: Check department table existence for access

---

## 🎯 Benefits of New Design

✅ **No duplicate emails** - One row per admin in admin_profile
✅ **No data redundancy** - Name, email, phone stored once
✅ **Department-specific data** - Each dept has custom fields
✅ **Easy to extend** - Add new department = Create new table
✅ **Clear separation** - Who they are (admin_profile) vs What they do (dept tables)
✅ **Performance** - Smaller tables, faster queries

---

## 🗑️ Old Tables (Backed Up)

- `admin_profile_old_backup` - Contains old multi-row design
- `admin_profile_stats` - Stats were merged into department tables

**You can safely delete these once you've verified everything works!**

---

## 🚀 Next Steps

1. ✅ **Migration completed** - New structure is in place
2. ⏳ **Update endpoints** - Modify backend to use new tables
3. ⏳ **Test flows** - Registration, login, profile updates
4. ⏳ **Update frontend** - Admin dashboard to show departments
5. ⏳ **Clean up** - Drop old backup tables once verified

---

**Questions?** Check [migrate_department_based_profiles.py](astegni-backend/migrate_department_based_profiles.py) for the full migration code.
