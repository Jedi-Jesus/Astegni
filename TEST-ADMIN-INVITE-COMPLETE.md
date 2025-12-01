# Test Admin Invitation System - Complete Guide

## Current Status

✅ **Migration Completed Successfully**
- All department profile tables now have `employee_id` and `joined_in` columns:
  - `manage_courses_profile`
  - `manage_campaigns_profile`
  - `manage_schools_profile`
  - `manage_customers_profile`
  - `manage_system_settings_profile`
  - `manage_contents_profile`

## Testing the New Flow

### Option 1: Test with Frontend (Recommended)

1. **Start Backend:**
```bash
cd astegni-backend
python app.py
```

2. **Open Frontend:**
Navigate to: `http://localhost:8080/admin-pages/manage-system-settings.html`

3. **Login as Admin:**
- Use existing admin credentials
- Or register a new admin

4. **Invite a New Admin:**
- Click "Invite Admin" button in the Admin Management panel
- You should see:
  - **Employee ID**: Auto-filled (e.g., `Emp-adm-5432-25`)
  - **Joined In**: Auto-filled with current timestamp (e.g., `2025-10-20 15:30:45`)

5. **Fill the Form:**
```
First Name: Abebe
Father Name: Kebede
Grandfather Name: Tesfa
Email: test.admin@astegni.et
Phone: +251911234567
Department: Manage Courses
Position: Course Manager
```

6. **Send OTP:**
- Click "Send OTP" button
- Check console for OTP (development mode)

7. **Verify Database:**
```bash
cd astegni-backend
python test_admin_invite_flow.py
```

### Option 2: Test with API Directly

Send a POST request to the send-otp endpoint:

```bash
curl -X POST http://localhost:8000/api/admin/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Abebe",
    "father_name": "Kebede",
    "grandfather_name": "Tesfa",
    "email": "test.admin@astegni.et",
    "phone_number": "+251911234567",
    "employee_id": "Emp-adm-5432-25",
    "department": "manage-courses",
    "position": "Course Manager"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to test.admin@astegni.et",
  "admin_id": 10,
  "employee_id": "Emp-adm-5432-25",
  "destination": "email",
  "expires_in": 604800,
  "otp": "123456"
}
```

### Option 3: Create Test Data with Script

Create a test script to simulate the invitation:

```python
# test_create_admin.py
import requests

API_URL = "http://localhost:8000/api/admin/send-otp"

data = {
    "first_name": "Abebe",
    "father_name": "Kebede",
    "grandfather_name": "Tesfa",
    "email": "test.admin@astegni.et",
    "phone_number": "+251911234567",
    "employee_id": "Emp-adm-5432-25",
    "department": "manage-courses",
    "position": "Course Manager"
}

response = requests.post(API_URL, json=data)
print(response.json())
```

Run it:
```bash
python test_create_admin.py
```

## Verifying the Results

After inviting an admin, run the verification script:

```bash
cd astegni-backend
python test_admin_invite_flow.py
```

**Expected Output:**
```
============================================================
ADMIN PROFILE DATA:
============================================================
[OK] Admin ID: 10
[OK] Name: Abebe Kebede
[OK] Email: test.admin@astegni.et
[OK] Departments: ['manage-courses']
[OK] Created At: 2025-10-20 15:30:45

============================================================
DEPARTMENT PROFILE: manage-courses
============================================================
[OK] Admin ID: 10
[OK] Employee ID: Emp-adm-5432-25
[OK] Position: Course Manager
[OK] Joined In: 2025-10-20 15:30:45
[OK] Created At: 2025-10-20 15:30:45

============================================================
TEST COMPLETE
============================================================
```

## What to Check

### ✅ In `admin_profile` table:
```sql
SELECT id, first_name, father_name, email, departments, created_at
FROM admin_profile
WHERE email = 'test.admin@astegni.et';
```

Expected:
- `id`: 10 (or your admin ID)
- `first_name`: "Abebe"
- `father_name`: "Kebede"
- `email`: "test.admin@astegni.et"
- `departments`: ["manage-courses"]
- `created_at`: Current timestamp

### ✅ In `manage_courses_profile` table:
```sql
SELECT admin_id, employee_id, position, joined_in, created_at
FROM manage_courses_profile
WHERE admin_id = 10;
```

Expected:
- `admin_id`: 10 (matches admin_profile.id)
- `employee_id`: "Emp-adm-5432-25"
- `position`: "Course Manager"
- `joined_in`: Same as admin_profile.created_at
- `created_at`: Current timestamp

## Troubleshooting

### Issue: No profile in department table
**Possible Cause:** Backend error during department profile creation

**Check Backend Logs:**
Look for:
```
Department profile creation error: <details>
```

**Solutions:**
1. Verify table exists: `SELECT * FROM manage_courses_profile;`
2. Check columns exist: Run migration again if needed
3. Check foreign key constraint

### Issue: employee_id is NULL
**Possible Cause:** Frontend not sending employee_id

**Solutions:**
1. Check browser console for errors
2. Verify modal has employee_id field
3. Check network request payload

### Issue: joined_in is NULL
**Possible Cause:** Backend not setting joined_in

**Solutions:**
1. Verify backend code has `joined_in = datetime.now()`
2. Check database column allows NULL (it should)
3. Restart backend server

## Next Steps

1. ✅ Migration complete
2. ✅ Columns added to all department tables
3. 🔄 Test with real invitation (pending)
4. 📊 Verify data in database
5. 🎉 Feature ready to use!

## Files Modified

**Backend:**
- `astegni-backend/admin_management_endpoints.py` - Send OTP with department profile creation
- `astegni-backend/migrate_add_employee_id_joined_in.py` - Migration script

**Frontend:**
- `admin-pages/manage-system-settings.html` - Added joined_in field
- `js/admin-pages/manage-system-settings.js` - Auto-fill logic

**Testing:**
- `astegni-backend/test_admin_invite_flow.py` - Verification script
