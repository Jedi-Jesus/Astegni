# Cross-Department Access for Manage Courses

## Overview
The `manage-courses.html` page now properly supports cross-department admin access. Admins from **manage-system-settings** department can access and view the manage-courses page, even if they don't have a `manage_courses_profile` record.

## Access Levels

### 1. System Administrators (manage-system-settings)
**Access:** ✅ Full access with viewing capabilities

When a system admin accesses manage-courses.html:
- **Position:** "System Administrator (Viewing)"
- **Badges:** ["System Admin", "Full Access"]
- **Permissions:**
  - `can_approve_courses: true`
  - `can_reject_courses: true`
  - `can_suspend_courses: true`
  - `can_view_analytics: true`
  - `can_manage_notifications: true`
  - `system_admin: true`
- **Stats:** All 0 (no course management activity tracked)
- **Joined Date:** Uses their account creation date

### 2. Course Managers (manage-courses)
**Access:** ✅ Full course management access

When a course manager accesses manage-courses.html:
- **With Profile Record:**
  - Shows actual statistics (courses created, approved, etc.)
  - Custom position, rating, reviews from database
  - Earned badges displayed

- **Without Profile Record:**
  - **Position:** "Course Manager"
  - **Badges:** [] (empty, can earn through activity)
  - **Permissions:** Standard course management permissions
  - **Stats:** All 0 (initial state)

### 3. Other Departments
**Access:** ✅ View-only access

When other department admins access manage-courses.html:
- **Position:** "Admin (View Only)"
- **Badges:** [] (empty)
- **Permissions:** Only `can_view_analytics: true`
- **Stats:** All 0 (no activity)

## Backend Implementation

### Updated Endpoint
**File:** [astegni-backend/admin_profile_endpoints.py](astegni-backend/admin_profile_endpoints.py:373)

**Endpoint:** `GET /api/admin/manage-courses-profile/{admin_id}`

**Logic:**
```python
if has_manage_courses_profile_record:
    # Return actual profile data
    return full_profile_with_stats
elif "manage-system-settings" in departments:
    # System admin viewing
    return {
        "position": "System Administrator (Viewing)",
        "badges": ["System Admin", "Full Access"],
        "permissions": {full_permissions + system_admin: true},
        "has_profile": False
    }
elif "manage-courses" in departments:
    # Course manager without profile yet
    return {
        "position": "Course Manager",
        "badges": [],
        "permissions": {standard_course_permissions},
        "has_profile": False
    }
else:
    # Other departments - view only
    return {
        "position": "Admin (View Only)",
        "badges": [],
        "permissions": {"can_view_analytics": True},
        "has_profile": False
    }
```

## Testing

### Test 1: System Admin Without Courses Profile
```bash
# Admin with manage-system-settings department, no manage_courses_profile record
curl http://localhost:8000/api/admin/manage-courses-profile/1 | python -m json.tool
```

**Expected Response:**
```json
{
  "departments": ["manage-system-settings"],
  "courses_profile": {
    "position": "System Administrator (Viewing)",
    "rating": 0.0,
    "total_reviews": 0,
    "badges": ["System Admin", "Full Access"],
    "permissions": {
      "can_approve_courses": true,
      "can_reject_courses": true,
      "can_suspend_courses": true,
      "can_view_analytics": true,
      "can_manage_notifications": true,
      "system_admin": true
    },
    "has_profile": false
  }
}
```

### Test 2: Course Manager With Profile
```bash
# Admin with manage-courses department AND manage_courses_profile record
curl http://localhost:8000/api/admin/manage-courses-profile/2 | python -m json.tool
```

**Expected Response:**
```json
{
  "departments": ["manage-courses"],
  "courses_profile": {
    "position": "Senior Course Manager",
    "rating": 4.8,
    "total_reviews": 127,
    "badges": ["Expert Reviewer", "Top Performer", "Quality Champion"],
    "courses_created": 156,
    "courses_approved": 142,
    "permissions": {...},
    "has_profile": true
  }
}
```

## UI Behavior

### Profile Header Display

**For System Admins (manage-system-settings):**
- Username: From admin_profile
- Rating: 0.0 (no stars filled)
- Reviews: (0 reviews)
- Badges: "System Admin" and "Full Access" badges displayed
- Position: "System Administrator (Viewing)"
- Bio/Quote: From admin_profile

**For Course Managers:**
- Shows actual statistics if they have a profile
- Shows zeros and empty badges if no profile yet
- Can build up statistics through course management activities

## Department-Based Features

### System Admin Capabilities:
1. **View All Data:** Can see all course requests, active courses, etc.
2. **Approve/Reject:** Can manage course approvals
3. **Analytics:** Full access to course analytics
4. **Notifications:** Can send notifications to tutors
5. **System Badge:** Clearly identified as System Administrator

### Why System Admins Have Access:
- **Oversight:** System admins need to monitor all departments
- **Support:** Can assist course managers when needed
- **Auditing:** Can review course management decisions
- **Emergency:** Can handle urgent course approvals if course managers unavailable
- **Configuration:** May need to access all pages for system-wide settings

## Database Schema

### admin_profile.departments
```sql
departments TEXT[]  -- Array of department strings
```

Example values:
- `["manage-system-settings"]` - System admin
- `["manage-courses"]` - Course manager
- `["manage-courses", "manage-tutors"]` - Multi-department admin
- `["manage-system-settings", "manage-courses"]` - System admin with course management

### manage_courses_profile
- **Optional** - Only created when admin actively manages courses
- **admin_id** - Foreign key to admin_profile
- Contains course management statistics and activity

## Future Enhancements

### 1. Activity Tracking
When system admins perform course-related actions:
- Option to auto-create manage_courses_profile
- Track their course management activities
- Award badges for cross-department excellence

### 2. Multi-Department Profiles
For admins with both departments:
```json
{
  "departments": ["manage-system-settings", "manage-courses"],
  "courses_profile": {
    "position": "System Administrator & Course Manager",
    "badges": ["System Admin", "Course Expert", "Multi-Department"]
  }
}
```

### 3. Permission Inheritance
System admins automatically inherit all permissions from other departments they access.

## Security Notes

✅ **No Unauthorized Access:** Endpoint returns appropriate defaults, never errors
✅ **Department Validation:** Checks admin's departments array
✅ **Permission-Based:** Returns different permissions based on department
✅ **Audit Trail:** `has_profile` flag indicates if admin actively manages courses
✅ **Graceful Degradation:** Shows meaningful defaults when profile missing

## Troubleshooting

### Issue: System Admin Shows "0.0" Rating
**Expected Behavior** - System admins don't have course management activity tracked unless they actively manage courses.

### Issue: "System Admin" Badge Not Showing
**Check:**
1. Admin has `"manage-system-settings"` in departments array
2. No `manage_courses_profile` record exists (has_profile: false)
3. Frontend is correctly reading badges from API response

### Issue: System Admin Can't Access Page
**Check:**
1. Admin is authenticated
2. Token is valid
3. Admin profile exists in database
4. No access control script blocking them

## Status: COMPLETE ✅

System administrators from **manage-system-settings** department can now successfully access and use **manage-courses.html** with appropriate viewing permissions and badges.
