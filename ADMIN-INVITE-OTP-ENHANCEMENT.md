# Admin Invite OTP Enhancement

## Overview
Enhanced the admin invitation system to automatically create department profile entries with `employee_id` and `joined_in` timestamp when sending OTP, rather than waiting for OTP verification.

## Changes Made

### 1. Backend Changes (`admin_management_endpoints.py`)

#### Updated `AdminInviteRequest` Model
```python
class AdminInviteRequest(BaseModel):
    first_name: str
    father_name: str
    grandfather_name: Optional[str] = ""
    email: EmailStr
    phone_number: Optional[str] = ""
    employee_id: Optional[str] = ""  # ✨ NEW: Added employee_id field
    department: str
    position: str
    welcome_message: Optional[str] = None
```

#### Updated `send_admin_otp` Endpoint
**Key Changes:**
- Creates department profile entry **immediately** when OTP is sent
- Saves `employee_id` and `joined_in` timestamp to the department profile table
- Works for both new admins and existing admins getting additional departments

**New Flow:**
1. **When OTP is sent:**
   - Admin profile created in `admin_profile` table
   - Department profile created in `{department}_profile` table with:
     - `admin_id` (links to admin_profile)
     - `employee_id` (e.g., "Emp-adm-1234-25")
     - `position` (e.g., "Manager")
     - `joined_in` (current timestamp)
     - `created_at` (current timestamp)

2. **Department Profile Table Updates:**
```sql
INSERT INTO {dept_table} (admin_id, employee_id, position, joined_in, created_at)
VALUES (%s, %s, %s, %s, %s)
ON CONFLICT (admin_id) DO UPDATE SET
    employee_id = EXCLUDED.employee_id,
    position = EXCLUDED.position,
    joined_in = EXCLUDED.joined_in
```

**Supported Department Tables:**
- `manage_tutor_documents_profile`
- `manage_courses_profile`
- `manage_campaigns_profile`
- `manage_schools_profile`
- `manage_customers_profile`
- `manage_system_settings_profile`
- `manage_contents_profile`

### 2. Frontend Changes

#### HTML (`manage-system-settings.html`)
Added "Joined In" field to the Invite Admin Modal:

```html
<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
    <div class="form-group">
        <label class="block text-sm font-medium mb-1">Employee ID</label>
        <input type="text" id="invite-admin-employee-id"
            class="w-full px-3 py-2 border rounded-lg bg-gray-50 cursor-not-allowed"
            placeholder="Auto-generated" readonly>
        <p class="text-xs text-gray-500 mt-1">Generated automatically upon creation</p>
    </div>
    <div class="form-group">
        <label class="block text-sm font-medium mb-1">Joined In</label>
        <input type="text" id="invite-admin-joined-in"
            class="w-full px-3 py-2 border rounded-lg bg-gray-50 cursor-not-allowed"
            placeholder="Auto-filled" readonly>
        <p class="text-xs text-gray-500 mt-1">Current date and time</p>
    </div>
</div>
```

#### JavaScript (`manage-system-settings.js`)

**Updated `openInviteAdminModal()`:**
Auto-fills the "Joined In" field with current date/time in format: `YYYY-MM-DD HH:MM:SS`

```javascript
function openInviteAdminModal() {
    const modal = document.getElementById('invite-admin-modal');
    if (modal) {
        resetInviteAdminModal();

        // Generate and set employee ID
        const employeeIdInput = document.getElementById('invite-admin-employee-id');
        if (employeeIdInput) {
            employeeIdInput.value = generateEmployeeId();
        }

        // Auto-fill joined in date/time ✨ NEW
        const joinedInInput = document.getElementById('invite-admin-joined-in');
        if (joinedInInput) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            joinedInInput.value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }

        modal.classList.remove('hidden');
    }
}
```

**Updated `resetInviteAdminModal()`:**
Added reset logic for the joined_in field.

## Benefits

### 1. **Immediate Data Availability**
- Department profile data is available immediately after sending OTP
- No need to wait for admin to verify OTP before accessing their profile

### 2. **Accurate Timestamp**
- `joined_in` captures the exact moment when the admin was invited
- Shows true invitation date, not verification date

### 3. **Complete Data Integrity**
- Employee ID is properly linked to department profile
- All department-specific data is in place from the start

### 4. **Better User Experience**
- Admin inviter sees the exact timestamp when invitation was sent
- Clear visibility of when each admin joined the system

### 5. **Simplified Workflow**
- Single API call creates both admin profile and department profile
- No separate step needed to populate department data

## Testing

### Manual Testing Steps

1. **Open Invite Admin Modal:**
   - Navigate to Manage System Settings
   - Click "Invite Admin" button
   - Verify that "Employee ID" and "Joined In" fields are auto-filled

2. **Send OTP:**
   - Fill in admin details (name, email, department, position)
   - Click "Send OTP"
   - Note the employee_id from the modal

3. **Verify Database:**
   - Run the test script: `python astegni-backend/test_admin_invite_flow.py`
   - Check that:
     - `admin_profile` table has the new admin
     - Corresponding `{department}_profile` table has entry with:
       - Correct `admin_id`
       - Non-empty `employee_id`
       - Non-empty `joined_in` timestamp
       - Matching `position`

### Automated Test Script

Run the verification script:
```bash
cd astegni-backend
python test_admin_invite_flow.py
```

**Expected Output:**
```
============================================================
ADMIN PROFILE DATA:
============================================================
✓ Admin ID: 123
✓ Name: Abebe Kebede
✓ Email: abebe@astegni.et
✓ Departments: ['manage-courses']
✓ Created At: 2025-01-15 10:30:45

============================================================
DEPARTMENT PROFILE: manage-courses
============================================================
✓ Admin ID: 123
✓ Employee ID: Emp-adm-5432-25
✓ Position: Manager
✓ Joined In: 2025-01-15 10:30:45
✓ Created At: 2025-01-15 10:30:45

============================================================
TEST COMPLETE
============================================================
```

## Database Schema Requirements

Each department profile table must have these columns:
```sql
CREATE TABLE {department}_profile (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER UNIQUE REFERENCES admin_profile(id),
    employee_id VARCHAR(50),
    position VARCHAR(100),
    joined_in TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Migration Notes

**No migration required** if your department profile tables already have:
- `employee_id` column (VARCHAR/TEXT)
- `joined_in` column (TIMESTAMP)

If these columns are missing, run this migration for each department table:

```sql
ALTER TABLE manage_tutor_documents_profile
ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS joined_in TIMESTAMP;

ALTER TABLE manage_courses_profile
ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS joined_in TIMESTAMP;

-- Repeat for all department tables...
```

## API Response Changes

### Send OTP Endpoint Response
**Before:**
```json
{
    "success": true,
    "message": "OTP sent successfully to abebe@astegni.et",
    "admin_id": 123,
    "destination": "email",
    "expires_in": 604800,
    "otp": "123456"
}
```

**After (NEW):**
```json
{
    "success": true,
    "message": "OTP sent successfully to abebe@astegni.et",
    "admin_id": 123,
    "employee_id": "Emp-adm-5432-25",  // ✨ NEW
    "destination": "email",
    "expires_in": 604800,
    "otp": "123456"
}
```

## Troubleshooting

### Issue: Department profile not created
**Possible Causes:**
- Department table doesn't exist
- Missing columns (`employee_id` or `joined_in`)
- Database permissions

**Solution:**
Check backend logs for error messages:
```
Department profile creation error: <error details>
```

### Issue: employee_id is empty in database
**Possible Causes:**
- Frontend not sending employee_id in request
- Employee ID not generated on modal open

**Solution:**
- Verify `generateEmployeeId()` is called in `openInviteAdminModal()`
- Check network request payload includes `employee_id` field

### Issue: joined_in timestamp is incorrect
**Possible Causes:**
- Server timezone mismatch
- Frontend showing different timezone

**Solution:**
- Backend uses `datetime.now()` which captures server time
- Verify server timezone is correctly configured

## Future Enhancements

1. **Timezone Support:**
   - Store timezone with joined_in
   - Display in user's local timezone in frontend

2. **Employee ID Format Customization:**
   - Allow admins to configure ID format
   - Add prefix/suffix based on department

3. **Bulk Invite:**
   - Upload CSV to invite multiple admins
   - Automatically assign employee IDs sequentially

4. **Audit Trail:**
   - Track who invited each admin
   - Log invitation history

## Related Files

**Backend:**
- `astegni-backend/admin_management_endpoints.py` - Main endpoint logic
- `astegni-backend/test_admin_invite_flow.py` - Test script

**Frontend:**
- `admin-pages/manage-system-settings.html` - Modal HTML
- `js/admin-pages/manage-system-settings.js` - Modal logic

**Documentation:**
- `ADMIN-INVITE-QUICK-START.md` - Admin invitation guide
- `ADMIN-TABLE-RESTRUCTURE-COMPLETE.md` - Department structure
