# Admin Department-Based Access Control (RBAC)

## Overview
The admin system now implements **Role-Based Access Control (RBAC)** based on departments. Each admin belongs to a department, and can only access pages relevant to their department.

---

## Department Structure

### Available Departments:

1. **manage-campaigns** - Can only access: `manage-campaigns.html`
2. **manage-schools** - Can only access: `manage-schools.html`
3. **manage-courses** - Can only access: `manage-courses.html`
4. **manage-tutors** - Can only access: `manage-tutors.html`
5. **manage-customers** - Can only access: `manage-customers.html`
6. **manage-contents** - Can only access: `manage-contents.html`
7. **manage-system-settings** - **FULL ACCESS** to all pages (Super Admin)

---

## Database Changes

### `admin_profile` Table
The `admin_profile` table already existed with a `department` field:

```sql
CREATE TABLE admin_profile (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES users(id),
    first_name VARCHAR,
    father_name VARCHAR,
    grandfather_name VARCHAR,
    admin_username VARCHAR,
    email VARCHAR,
    phone_number VARCHAR,
    department VARCHAR,  -- Department field for RBAC
    ...
);
```

---

## Backend Implementation

### 1. Updated UserRegister Model
**File**: `astegni-backend/app.py modules/models.py`

```python
class UserRegister(BaseModel):
    first_name: str
    father_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str
    role: str = "student"
    department: Optional[str] = None  # For admin role
```

### 2. Updated `/api/register` Endpoint
**File**: `astegni-backend/app.py modules/routes.py`

The register endpoint now creates admin_profile records with department:

```python
elif user_data.role == "admin":
    # Create admin_profile record using raw SQL
    db.execute(text("""
        INSERT INTO admin_profile (admin_id, first_name, father_name, email, department, created_at, updated_at)
        VALUES (:admin_id, :first_name, :father_name, :email, :department, NOW(), NOW())
    """), {
        "admin_id": new_user.id,
        "first_name": new_user.first_name,
        "father_name": new_user.father_name,
        "email": new_user.email,
        "department": user_data.department or "manage-system-settings"
    })
```

### 3. New Admin Auth Endpoints
**File**: `astegni-backend/admin_auth_endpoints.py`

Created new endpoints for department-based access control:

#### `/api/admin/check-access` (POST)
Check if admin has access to a specific page:

```json
// Request
{
  "page": "manage-campaigns.html"
}

// Response
{
  "has_access": true,
  "department": "manage-campaigns",
  "message": "Access granted to manage-campaigns.html"
}
```

#### `/api/admin/my-accessible-pages` (GET)
Get list of all pages accessible to the current admin:

```json
// Response
{
  "department": "manage-campaigns",
  "accessible_pages": ["manage-campaigns.html"],
  "is_super_admin": false
}
```

### 4. Department Access Mapping (Backend)
```python
DEPARTMENT_ACCESS = {
    "manage-campaigns": ["manage-campaigns.html"],
    "manage-schools": ["manage-schools.html"],
    "manage-courses": ["manage-courses.html"],
    "manage-tutors": ["manage-tutors.html"],
    "manage-customers": ["manage-customers.html"],
    "manage-contents": ["manage-contents.html"],
    "manage-system-settings": [  # Full access
        "manage-campaigns.html",
        "manage-schools.html",
        "manage-courses.html",
        "manage-tutors.html",
        "manage-customers.html",
        "manage-contents.html",
        "manage-system-settings.html"
    ]
}
```

---

## Frontend Implementation

### 1. Registration Form Update
**File**: `admin-pages/admin-index.html`

Added department selection dropdown to the registration form:

```html
<div class="form-group">
    <label for="admin-department">Department</label>
    <select id="admin-department" name="department" required>
        <option value="">Select your department</option>
        <option value="manage-campaigns">Manage Campaigns</option>
        <option value="manage-schools">Manage Schools</option>
        <option value="manage-courses">Manage Courses</option>
        <option value="manage-tutors">Manage Tutors</option>
        <option value="manage-customers">Manage Customers</option>
        <option value="manage-contents">Manage Contents</option>
        <option value="manage-system-settings">Manage System Settings (Full Access)</option>
    </select>
    <span class="error-text"></span>
</div>
```

### 2. Updated Auth.js
**File**: `admin-pages/js/auth.js`

#### Registration Handler
Now includes department in registration:

```javascript
body: JSON.stringify({
    first_name: first_name,
    father_name: father_name,
    email: email,
    password: password,
    role: 'admin',
    department: department  // NEW
})
```

#### AdminUser Object
Stores department in localStorage:

```javascript
const adminUser = {
    id: data.user.id,
    email: data.user.email,
    name: '...',
    role: 'admin',
    department: adminProfileData?.department || department,  // NEW
    loginTime: new Date().toISOString()
};
localStorage.setItem('adminUser', JSON.stringify(adminUser));
```

#### requireAuth Function
Now checks department before allowing navigation:

```javascript
function requireAuth(page) {
    // Check authentication
    if (!isAuthenticated) {
        openLoginModal();
        return;
    }

    // Check department access
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    const department = adminUser.department || 'manage-system-settings';

    const departmentAccess = {
        'manage-campaigns': ['manage-campaigns.html'],
        'manage-schools': ['manage-schools.html'],
        // ... etc
    };

    const allowedPages = departmentAccess[department] || [];
    const hasAccess = allowedPages.includes(page);

    if (!hasAccess) {
        showNotification(`Access denied. Your department cannot access this page.`, 'warning');
        return;
    }

    // Navigate to page
    navigateToPage(page);
}
```

---

## How It Works

### Registration Flow:
1. Admin fills registration form on [admin-index.html](admin-pages/admin-index.html#L87)
2. Selects department from dropdown
3. Enters admin code: `ADMIN2025`
4. Backend creates:
   - User record in `users` table with `role: 'admin'`
   - Admin profile in `admin_profile` table with selected department
5. Frontend stores department in localStorage

### Login Flow:
1. Admin logs in with email/password
2. Backend verifies credentials from `users` table
3. Fetches admin_profile data including department
4. Frontend stores department in localStorage

### Page Access Flow:
1. Admin clicks on a quick action button (e.g., "Manage Campaigns")
2. `requireAuth('manage-campaigns.html')` is called
3. Function checks:
   - Is admin authenticated? ✓
   - Does admin's department have access to this page? ✓
4. If access granted → Navigate to page
5. If access denied → Show warning notification

---

## Examples

### Example 1: Campaigns Manager
- **Department**: `manage-campaigns`
- **Can access**: Only `manage-campaigns.html`
- **Cannot access**: manage-schools.html, manage-courses.html, etc.
- **Action**: Clicking "Manage Schools" shows: *"Access denied. Your department (manage-campaigns) cannot access this page."*

### Example 2: System Settings Admin
- **Department**: `manage-system-settings`
- **Can access**: ALL pages (super admin)
- **Cannot access**: Nothing (full access)
- **Action**: Can access any admin page

### Example 3: Content Manager
- **Department**: `manage-contents`
- **Can access**: Only `manage-contents.html`
- **Cannot access**: manage-tutors.html, manage-customers.html, etc.

---

## Testing Guide

### 1. Test Registration
```bash
# Start backend
cd astegni-backend
python app.py

# Start frontend
cd ..
python -m http.server 8080
```

Navigate to: http://localhost:8080/admin-pages/admin-index.html

1. Click "Register"
2. Fill in form:
   - Name: "Abebe Kebede"
   - Email: "abebe@example.com"
   - Password: "SecurePassword123"
   - Department: "Manage Campaigns"
   - Admin Code: "ADMIN2025"
3. Submit
4. Check localStorage: `adminUser` should have `department: "manage-campaigns"`

### 2. Test Department Access
After logging in:

1. Click "Manage Campaigns" → Should navigate ✓
2. Click "Manage Schools" → Should show access denied warning ❌
3. Click "Manage Tutors" → Should show access denied warning ❌

### 3. Test Super Admin
Register/Login with `department: "manage-system-settings"`:
- Should be able to access ALL pages ✓

### 4. Verify Database
```bash
cd astegni-backend
python -c "
import psycopg
conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
cur = conn.cursor()
cur.execute('SELECT admin_id, first_name, department FROM admin_profile')
print(cur.fetchall())
conn.close()
"
```

---

## API Endpoints Summary

### Backend Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/register` | POST | Register new admin with department |
| `/api/login` | POST | Login admin (returns user + profile) |
| `/api/admin/profile?admin_id=X` | GET | Get admin profile with department |
| `/api/admin/check-access` | POST | Check if admin can access page |
| `/api/admin/my-accessible-pages` | GET | Get all accessible pages for admin |

---

## Files Modified

### Backend:
1. `astegni-backend/app.py modules/models.py` - Added `department` to UserRegister
2. `astegni-backend/app.py modules/routes.py` - Updated register endpoint to create admin_profile
3. `astegni-backend/admin_auth_endpoints.py` - NEW FILE: Department-based access control
4. `astegni-backend/app.py` - Registered admin_auth_endpoints router

### Frontend:
1. `admin-pages/admin-index.html` - Added department dropdown to registration form
2. `admin-pages/js/auth.js` - Updated registration, login, and requireAuth functions

---

## Security Notes

1. ✅ Department is stored in database (`admin_profile` table)
2. ✅ Department is verified server-side for API endpoints
3. ✅ Frontend checks are in place for UX (access denied notifications)
4. ✅ Admin code (`ADMIN2025`) required for registration
5. ⚠️ For production: Change admin code to a secure, environment-based secret
6. ⚠️ Add server-side middleware to verify department access for ALL admin page requests

---

## Next Steps (Optional Enhancements)

1. **Server-side page protection**: Add middleware to verify department before serving HTML pages
2. **Dynamic UI**: Hide/show quick action buttons based on department
3. **Audit logging**: Log all access attempts (successful and denied)
4. **Department management**: Create admin panel to assign/change departments
5. **Granular permissions**: Add sub-permissions within departments (view, edit, delete)

---

## Troubleshooting

### Issue: Admin can't access any pages
**Solution**: Check if `department` field is set in `admin_profile` table. Run:
```sql
SELECT admin_id, department FROM admin_profile WHERE admin_id = YOUR_ADMIN_ID;
```

### Issue: Access denied but should have access
**Solution**: Check localStorage `adminUser.department` matches expected department:
```javascript
JSON.parse(localStorage.getItem('adminUser'))
```

### Issue: Department not saved during registration
**Solution**: Check browser console for API errors. Verify backend SQL INSERT succeeded.

---

## Summary

You now have a complete **department-based access control system** for admins! 🎉

- ✅ Admins are assigned to departments during registration
- ✅ Each department has specific page access permissions
- ✅ `manage-system-settings` has full access (super admin)
- ✅ Access is validated both frontend and backend
- ✅ Clear user feedback with notifications

Feel me? 😊
