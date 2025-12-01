# Admin Invite Modal - Department & Position Update

## Summary

Updated the "Invite New Administrator" modal in `manage-system-settings.html` to replace "Role" with "Department" and add "Position" field. Also removed "Username" and "Access Permissions" sections.

## Changes Made

### Frontend Changes

#### 1. HTML Modal (`admin-pages/manage-system-settings.html`)

**Removed:**
- Username field (lines 4415-4422)
- Access Permissions section with checkboxes (lines 4475-4515)

**Changed:**
- "Role" field → "Department" dropdown with new options
- Added "Position" text input field after Department
- Section header: "Role & Identification" → "Department & Identification"

**New Department Options:**
1. Manage Tutors (`manage-tutors`)
2. Manage Courses (`manage-courses`)
3. Manage Campaigns (`manage-campaigns`)
4. Manage Schools (`manage-schools`)
5. Manage Customers (`manage-customers`)
6. Manage System Settings (`manage-system-settings`)
7. Manage Contents (`manage-contents`)

**New Fields:**
- `id="invite-admin-department"` - Department dropdown (required)
- `id="invite-admin-position"` - Position text input (required)

#### 2. JavaScript (`js/admin-pages/manage-system-settings.js`)

**Updated `handleAdminInvitation()` function:**
- Removed: `username`, `role`, `permissions` collection
- Added: `department`, `position` fields
- Removed username and permissions validation
- Added department and position validation
- Updated API request payload structure

**New API Payload Structure:**
```javascript
{
    first_name: string,
    father_name: string,
    grandfather_name: string (optional),
    email: string,
    phone_number: string (optional),
    employee_id: string (optional),
    department: string,
    position: string,
    welcome_message: string (optional)
}
```

### Backend Changes

#### 1. Pydantic Models (`astegni-backend/admin_management_endpoints.py`)

**Updated `AdminInviteRequest`:**
```python
class AdminInviteRequest(BaseModel):
    first_name: str
    father_name: str
    grandfather_name: Optional[str] = ""
    email: EmailStr
    phone_number: Optional[str] = ""
    employee_id: Optional[str] = ""
    department: str
    position: str
    welcome_message: Optional[str] = None
```

**Updated `AdminRoleUpdate`:**
```python
class AdminRoleUpdate(BaseModel):
    department: str
    position: str
```

**Updated `AdminResponse`:**
```python
class AdminResponse(BaseModel):
    id: int
    first_name: str
    father_name: str
    grandfather_name: Optional[str]
    email: str
    phone_number: Optional[str]
    employee_id: Optional[str]
    department: str
    position: str
    status: str
    created_at: datetime
    last_login: Optional[datetime]
    suspended_until: Optional[datetime]
    suspension_reason: Optional[str]
```

#### 2. API Endpoints

**Updated `/api/admin/invite` endpoint:**
- Now accepts Ethiopian name fields (first_name, father_name, grandfather_name)
- Accepts department and position instead of role and permissions
- Auto-generates employee_id in format: `ASTEG-DEPT-XXXX`
- Returns employee_id in response

**Updated `/api/admin/{admin_id}/role` endpoint:**
- Renamed to reflect new purpose
- Updates department and position instead of role and permissions
- Returns both new_department and new_position

**Updated `/api/admin/list` endpoint:**
- Filter parameter changed from `role` to `department`
- Query parameter: `?department=manage-tutors`

**Updated `/api/admin/invitation/resend` endpoint:**
- Query updated to fetch first_name and father_name instead of name

### Database Changes

#### Migration Script (`astegni-backend/migrate_admin_department_position.py`)

**New Database Columns:**
- `first_name` VARCHAR(100) NOT NULL
- `father_name` VARCHAR(100) NOT NULL
- `grandfather_name` VARCHAR(100)
- `phone_number` VARCHAR(20)
- `employee_id` VARCHAR(50) UNIQUE
- `department` VARCHAR(100) NOT NULL
- `position` VARCHAR(100) NOT NULL

**Data Migration:**
- Splits existing `name` field into first_name, father_name, grandfather_name
- Maps old roles to new departments:
  - `admin` → `manage-system-settings`
  - `moderator` → `manage-contents`
  - `support` → `manage-customers`
  - `content` → `manage-contents`
- Generates employee_id for existing admins
- Sets default positions based on old roles

**Old Columns (Kept for Safety):**
- `name`, `role`, `permissions`, `admin_username` - kept but no longer used
- Can be dropped after confirming migration success

## Employee ID Format

Auto-generated format: `ASTEG-{DEPT}-{NUMBER}`

Examples:
- Manage Tutors: `ASTEG-TUTO-0001`
- Manage Courses: `ASTEG-COUR-0002`
- Manage Campaigns: `ASTEG-CAMP-0003`
- Manage Schools: `ASTEG-SCHO-0004`
- Manage Customers: `ASTEG-CUST-0005`
- Manage System Settings: `ASTEG-SYST-0006`
- Manage Contents: `ASTEG-CONT-0007`

## Setup Instructions

### 1. Run Database Migration

```bash
cd astegni-backend
python migrate_admin_department_position.py
```

### 2. Restart Backend Server

```bash
cd astegni-backend
python app.py
```

### 3. Test the Changes

1. Open http://localhost:8080/admin-pages/manage-system-settings.html
2. Switch to "Manage Admins" panel
3. Click "Invite Administrator" button
4. Fill out the form:
   - Enter Ethiopian name (First, Father's, Grandfather's)
   - Enter email and phone (optional)
   - Select a Department
   - Enter a Position (e.g., "Manager", "Coordinator", "Specialist")
   - Add welcome message (optional)
5. Submit the form
6. Verify the invitation is sent and admin appears in the list

## Validation Rules

### Required Fields:
- First Name
- Father's Name
- Email
- Department
- Position

### Optional Fields:
- Grandfather's Name
- Phone Number
- Employee ID (auto-generated if not provided)
- Welcome Message

## API Testing

### Test Invite Endpoint:
```bash
curl -X POST http://localhost:8000/api/admin/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "first_name": "Abebe",
    "father_name": "Kebede",
    "grandfather_name": "Tesfa",
    "email": "abebe.kebede@astegni.et",
    "phone_number": "+251911234567",
    "department": "manage-tutors",
    "position": "Manager",
    "welcome_message": "Welcome to Astegni!"
  }'
```

### Test List with Department Filter:
```bash
curl http://localhost:8000/api/admin/list?department=manage-tutors \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Notes

- The migration keeps old columns (`role`, `permissions`, `name`) for safety
- Employee IDs are auto-generated but can be manually specified
- Department values use kebab-case format matching the page URLs
- Position field is free-text to allow flexibility (Manager, Coordinator, Specialist, etc.)
- Ethiopian naming convention maintained throughout

## Files Modified

1. `admin-pages/manage-system-settings.html` - Modal structure
2. `js/admin-pages/manage-system-settings.js` - Form handling
3. `astegni-backend/admin_management_endpoints.py` - API endpoints and models
4. `astegni-backend/migrate_admin_department_position.py` - Database migration (new)

## Rollback Plan

If issues occur:
1. The old columns are preserved in the database
2. Revert frontend changes to use old field IDs
3. Revert backend to use old models
4. No data loss occurs as migration doesn't delete old columns
