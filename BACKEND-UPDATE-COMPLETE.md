# Backend Update Complete - New Admin Structure

## ✅ What's Been Fixed

### 1. **Database Structure** ✓
- `admin_profile`: ONE row per admin (unique email)
- `departments` column: TEXT[] array tracking which departments admin belongs to
- 7 department tables created (manage_campaigns_profile, manage_courses_profile, etc.)
- Each department table has admin_id, position, and department-specific stats

### 2. **admin_management_endpoints.py** ✓ UPDATED

**New Features:**
- ✓ Registration creates ONE admin profile with departments array
- ✓ Can add multiple departments to same email
- ✓ Each department gets its own row in department-specific table
- ✓ No more duplicate emails in admin_profile!

**New Endpoints:**
```
POST /api/admin/send-otp
  - Creates admin OR adds department to existing admin
  - Returns OTP for verification

POST /api/admin/register
  - Verifies OTP and sets password
  - Creates entry in department table (manage_campaigns_profile, etc.)
  - Updates departments array in admin_profile

POST /api/admin/{admin_id}/add-department
  - Add new department to existing admin
  - Updates departments array + creates department profile

DELETE /api/admin/{admin_id}/remove-department/{department}
  - Remove department from admin
  - Deletes from departments array + department table

GET /api/admin/list?department=manage-campaigns
  - List admins filtered by department using array query
```

### 3. **admin_auth_endpoints.py** ⏳ NEEDS UPDATE

**What needs to change:**
- Login: Query departments array instead of single department column
- Access check: Use `department = ANY(departments)` query
- Token: Include all departments in JWT

### 4. **admin_profile_endpoints.py** ⏳ NEEDS UPDATE

**What needs to change:**
- Get profile: Join with specific department tables based on departments array
- Update profile: Handle shared fields (name, email) vs department-specific

---

## 📝 How New Registration Works

### Example: Register admin for "manage-campaigns"

**Step 1: Send OTP**
```bash
POST /api/admin/send-otp
{
  "first_name": "Abebe",
  "father_name": "Kebede",
  "email": "abebe@example.com",
  "department": "manage-campaigns",
  "position": "Manager"
}
```

**Result:**
```sql
admin_profile:
  id: 3
  email: abebe@example.com
  departments: ["manage-campaigns"]  ← Array with one department
  otp_code: "123456"
```

**Step 2: Register (Verify OTP)**
```bash
POST /api/admin/register
{
  "email": "abebe@example.com",
  "password": "SecurePass123",
  "otp_code": "123456",
  "department": "manage-campaigns"
}
```

**Result:**
```sql
admin_profile:
  id: 3
  email: abebe@example.com
  departments: ["manage-campaigns"]
  password_hash: "$2b$12$..."
  is_otp_verified: TRUE

manage_campaigns_profile:
  id: 1
  admin_id: 3  ← References admin_profile.id
  position: "Manager"
  campaigns_approved: 0
  ...
```

---

## 📝 How Adding Department Works

### Example: Add "manage-courses" to existing admin

**Request:**
```bash
POST /api/admin/3/add-department
{
  "department": "manage-courses",
  "position": "Staff"
}
```

**Result:**
```sql
admin_profile:
  id: 3
  email: abebe@example.com
  departments: ["manage-campaigns", "manage-courses"]  ← Updated!

manage_courses_profile:
  id: 1
  admin_id: 3  ← Same admin_id as campaigns
  position: "Staff"
  courses_created: 0
  ...
```

**Now one email has:**
- 1 row in `admin_profile`
- 1 row in `manage_campaigns_profile`
- 1 row in `manage_courses_profile`

---

## 🔍 How to Query

### Check which departments an admin has:
```sql
SELECT departments FROM admin_profile WHERE email = 'abebe@example.com';
-- Returns: ["manage-campaigns", "manage-courses"]
```

### Filter admins by department:
```sql
SELECT * FROM admin_profile
WHERE 'manage-campaigns' = ANY(departments);
```

### Get admin with their campaigns department data:
```sql
SELECT a.*, c.*
FROM admin_profile a
JOIN manage_campaigns_profile c ON a.id = c.admin_id
WHERE a.email = 'abebe@example.com';
```

---

## ⏳ Still To Do

1. **Update admin_auth_endpoints.py**
   - Modify login to return all departments
   - Fix access check to use departments array

2. **Update admin_profile_endpoints.py**
   - Get profile should join with all department tables
   - Return combined view of admin data

3. **Test flows**
   - Test registration
   - Test adding department
   - Test removing department
   - Test login

4. **Update frontend (admin-pages/)**
   - Update registration form
   - Display all departments in profile
   - Add "Add Department" button

---

## 🎯 Benefits Achieved

✅ **No duplicate emails** - One row per admin
✅ **Multiple departments** - departments array tracks all access
✅ **Department-specific data** - Each dept table has custom fields
✅ **Easy to query** - PostgreSQL array operators
✅ **Clear structure** - Who they are (admin_profile) vs What they do (dept tables)

---

**Next Step:** Update admin_auth_endpoints.py and admin_profile_endpoints.py
