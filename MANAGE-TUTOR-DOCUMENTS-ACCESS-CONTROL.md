# Manage Tutor Documents - Access Control Configuration

## Summary
Verified and fixed department-based access control for the manage-tutor-documents.html page. Both `manage-tutor-documents` and `manage-system-settings` departments now have proper access.

## Access Control Architecture

### Three-Tier Access Control

**1. Frontend Navigation (admin-index.html)**
- Controls which pages appear in the dashboard
- Uses `requireAuth()` function to check department permissions before navigation

**2. Frontend Page Check (auth.js)**
- Validates department access before allowing page navigation
- Shows warning if department doesn't have access

**3. Backend API Verification (admin_profile_endpoints.py)**
- Server-side verification when loading profile data
- Returns 403 if department not allowed
- Most secure layer (cannot be bypassed)

## Allowed Departments

### manage-tutor-documents ✅
**Access Level:** Full Access
**Permissions:**
- View all tutor requests (pending, verified, rejected, suspended)
- Approve/reject tutor applications
- Manage tutor documents and verification
- Access all tutor management features

### manage-system-settings ✅
**Access Level:** Full Access (Super Admin)
**Permissions:**
- All permissions of manage-tutor-documents
- Plus: Access to ALL other admin pages
- System-wide settings control

### Other Departments ❌
**Access Level:** No Access
**Result:** 403 Forbidden with message:
> "Access denied. Only manage-tutor-documents and manage-system-settings departments can access this page."

## Configuration Details

### 1. Backend (astegni-backend/admin_auth_endpoints.py)

**Department Access Mapping (Lines 35-51):**
```python
DEPARTMENT_ACCESS = {
    "manage-campaigns": ["manage-campaigns.html"],
    "manage-schools": ["manage-schools.html"],
    "manage-courses": ["manage-courses.html"],
    "manage-tutor-documents": ["manage-tutor-documents.html"],  # ✅
    "manage-customers": ["manage-customers.html"],
    "manage-contents": ["manage-contents.html"],
    "manage-system-settings": [  # Full access ✅
        "manage-campaigns.html",
        "manage-schools.html",
        "manage-courses.html",
        "manage-tutor-documents.html",  # ✅ Included here
        "manage-customers.html",
        "manage-contents.html",
        "manage-system-settings.html"
    ]
}
```

### 2. Backend Profile Endpoint (astegni-backend/admin_profile_endpoints.py)

**Access Verification (Lines 763-771) - FIXED:**
```python
departments = profile["departments"] or []

# Check if admin has access to manage-tutor-documents
is_system_admin = "manage-system-settings" in departments
is_tutors_admin = "manage-tutor-documents" in departments  # ✅ FIXED (was "manage-tutor")

if not is_system_admin and not is_tutors_admin:
    raise HTTPException(
        status_code=403,
        detail="Access denied. Only manage-tutor-documents and manage-system-settings departments can access this page."
    )
```

**What Was Fixed:**
- **Before:** Checked for `"manage-tutor"` (incorrect department name)
- **After:** Checks for `"manage-tutor-documents"` (correct department name)

### 3. Frontend (admin-pages/js/auth.js)

**Department Access Mapping (Lines 677-693):**
```javascript
const departmentAccess = {
    'manage-campaigns': ['manage-campaigns.html'],
    'manage-schools': ['manage-schools.html'],
    'manage-courses': ['manage-courses.html'],
    'manage-tutor-documents': ['manage-tutor-documents.html'],  // ✅
    'manage-customers': ['manage-customers.html'],
    'manage-contents': ['manage-contents.html'],
    'manage-system-settings': [  // Full access ✅
        'manage-campaigns.html',
        'manage-schools.html',
        'manage-courses.html',
        'manage-tutor-documents.html',  // ✅ Included here
        'manage-customers.html',
        'manage-contents.html',
        'manage-system-settings.html'
    ]
};
```

**Access Check Logic:**
```javascript
const allowedPages = departmentAccess[department] || [];
const hasAccess = allowedPages.includes(page);

if (!hasAccess) {
    showNotification(`Access denied. Your department (${department}) cannot access this page.`, 'warning');
    return;
}
```

### 4. Frontend Page (js/admin-pages/manage-tutor-documents-profile.js)

**Error Handling (Lines 38-45):**
```javascript
if (!response.ok) {
    if (response.status === 403) {
        // Access denied - redirect to appropriate page
        alert('Access denied. Only manage-tutor-documents and manage-system-settings departments can access this page.');
        window.location.href = '../index.html';
        return;
    }
    throw new Error(`Failed to load profile: ${response.status}`);
}
```

## Testing Access Control

### Test Case 1: manage-tutor-documents Department

**Setup:**
```sql
-- Admin with manage-tutor-documents department
UPDATE admin_profile
SET departments = ARRAY['manage-tutor-documents']
WHERE email = 'tutor-admin@example.com';
```

**Expected Results:**
1. ✅ Login successful
2. ✅ "Manage Tutor Documents" button visible on dashboard
3. ✅ Can navigate to manage-tutor-documents.html
4. ✅ Profile loads successfully
5. ✅ All tutor panels load (pending, verified, rejected, suspended)
6. ✅ Can perform tutor management actions

**Test Command:**
```bash
# Login and check access
curl -X POST http://localhost:8000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tutor-admin@example.com","password":"password"}'

# Access profile endpoint
curl http://localhost:8000/api/admin/manage-tutor-documents-profile/by-email/tutor-admin@example.com \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Case 2: manage-system-settings Department

**Setup:**
```sql
-- Admin with manage-system-settings department (super admin)
UPDATE admin_profile
SET departments = ARRAY['manage-system-settings']
WHERE email = 'superadmin@example.com';
```

**Expected Results:**
1. ✅ Login successful
2. ✅ ALL admin buttons visible on dashboard (including "Manage Tutor Documents")
3. ✅ Can navigate to manage-tutor-documents.html
4. ✅ Profile loads successfully
5. ✅ All tutor panels load
6. ✅ Full access to all features

### Test Case 3: Other Department (e.g., manage-campaigns)

**Setup:**
```sql
-- Admin with manage-campaigns department only
UPDATE admin_profile
SET departments = ARRAY['manage-campaigns']
WHERE email = 'campaign-admin@example.com';
```

**Expected Results:**
1. ✅ Login successful
2. ❌ "Manage Tutor Documents" button visible but shows lock icon
3. ❌ Clicking button shows: "Access denied. Your department (manage-campaigns) cannot access this page."
4. ❌ Direct URL access: Redirected to index with alert
5. ❌ API call returns: 403 Forbidden

**Test Command:**
```bash
# Try to access profile endpoint
curl http://localhost:8000/api/admin/manage-tutor-documents-profile/by-email/campaign-admin@example.com \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
# {
#   "detail": "Access denied. Only manage-tutor-documents and manage-system-settings departments can access this page."
# }
```

### Test Case 4: Multiple Departments

**Setup:**
```sql
-- Admin with both departments
UPDATE admin_profile
SET departments = ARRAY['manage-campaigns', 'manage-tutor-documents']
WHERE email = 'multi-dept-admin@example.com';
```

**Expected Results:**
1. ✅ Login successful
2. ✅ Can access manage-campaigns.html
3. ✅ Can access manage-tutor-documents.html
4. ✅ Access controlled per page

## Access Flow Diagram

```
User Login
    ↓
JWT Token Created (contains: admin_id, email, departments[])
    ↓
Stored in localStorage
    ↓
User Clicks "Manage Tutor Documents"
    ↓
┌─────────────────────────────────────┐
│ Frontend Check (auth.js)            │
│ - Read departments from token       │
│ - Check if page in allowed list     │
│ - Allow: Continue                   │
│ - Deny: Show warning, block nav     │
└─────────────────────────────────────┘
    ↓ (if allowed)
Page Loads: manage-tutor-documents.html
    ↓
Calls API: /api/admin/manage-tutor-documents-profile/by-email/{email}
    ↓
┌─────────────────────────────────────┐
│ Backend Check (admin_profile.py)    │
│ - Decode JWT token                  │
│ - Query admin_profile for depts     │
│ - Verify department access          │
│ - Allow: Return profile data        │
│ - Deny: 403 Forbidden               │
└─────────────────────────────────────┘
    ↓ (if allowed)
Profile Data Loaded → Page Fully Functional
```

## Security Notes

### Defense in Depth
The system uses multiple layers of security:

1. **Frontend Protection:** Quick feedback, better UX
2. **Backend Protection:** Secure, cannot be bypassed
3. **Database-Level:** Departments stored in admin_profile table

### JWT Token Structure
```json
{
  "type": "admin",
  "admin_id": 4,
  "email": "admin@example.com",
  "departments": ["manage-tutor-documents"],
  "exp": 1698765432
}
```

### Why Frontend + Backend?

**Frontend Check:**
- Fast user feedback
- Better user experience
- Prevents unnecessary API calls
- Shows appropriate UI elements

**Backend Check:**
- Cannot be bypassed
- Protects sensitive data
- Enforces security policy
- Required for API security

## Files Modified

### Backend
- **File:** `astegni-backend/admin_profile_endpoints.py`
- **Line 765:** Changed `"manage-tutor"` → `"manage-tutor-documents"`
- **Line 724:** Updated docstring to reflect correct department name

### Frontend
- No changes needed (already correct)

## Verification Checklist

- [x] Backend department access mapping includes both departments
- [x] Frontend department access mapping includes both departments
- [x] Profile endpoint verifies correct department name
- [x] Error messages mention both allowed departments
- [x] Documentation updated with correct department names
- [x] Access control works for manage-tutor-documents
- [x] Access control works for manage-system-settings
- [x] Access control blocks other departments
- [x] Multiple department support works correctly

## Quick Reference

### Which Departments Can Access?

| Department                  | Access | Level       |
|-----------------------------|--------|-------------|
| manage-tutor-documents      | ✅ Yes | Full Access |
| manage-system-settings      | ✅ Yes | Super Admin |
| manage-campaigns            | ❌ No  | Denied      |
| manage-schools              | ❌ No  | Denied      |
| manage-courses              | ❌ No  | Denied      |
| manage-customers            | ❌ No  | Denied      |
| manage-contents             | ❌ No  | Denied      |

### Error Messages

**Frontend (auth.js):**
> Access denied. Your department (DEPARTMENT_NAME) cannot access this page.

**Backend (admin_profile_endpoints.py):**
> Access denied. Only manage-tutor-documents and manage-system-settings departments can access this page.

**Frontend Page (manage-tutor-documents-profile.js):**
> Access denied. Only manage-tutor-documents and manage-system-settings departments can access this page.

---

**Status:** ✅ Access control properly configured
**Date:** 2025-10-19
**Tested:** Both departments have proper access
**Security:** Multi-layer protection active
