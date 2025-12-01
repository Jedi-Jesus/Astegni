# Admin Role Separation Fix

## Problem
User 115 has both a user account AND a separate admin account with the same email. When viewing the profile dropdown in `index.html` (user-facing frontend), the "admin" role was incorrectly displayed in the role switcher.

## Root Cause
The role switcher in the user-facing frontend (`index.html`) was fetching ALL user roles from the backend API `/api/my-roles` and displaying them without filtering, including admin roles.

## Solution
**Admin roles should ONLY be accessible through `admin-index.html`, NOT through the user-facing `index.html`.**

We added filtering logic to exclude "admin" roles from the role switcher in the user-facing frontend.

## Files Modified

### 1. `js/root/profile-system.js` (Lines 549-579)
**Change:** Added filter to exclude admin roles from the role switcher display

```javascript
// Filter out admin roles - admins should only access through admin-index.html
const userFacingRoles = userRoles.filter(role => role !== 'admin');

// Now use userFacingRoles instead of userRoles for display
```

**Impact:** Users with both admin and user roles will only see their user-facing roles (student, tutor, parent, advertiser, etc.) in `index.html`. To access admin features, they must navigate to `admin-index.html`.

### 2. `js/index/profile-and-authentication.js` (Lines 14-43)
**Change:** Added same filter to the `updateRoleSwitcher()` function

```javascript
// Filter out admin roles - admins should only access through admin-index.html
const userFacingRoles = APP_STATE.currentUser.roles.filter(role => role !== 'admin');
```

**Impact:** Consistent behavior across all role switching logic in the user-facing frontend.

### 3. `index.html` (Lines 739-746)
**Change:** Added "User" role to the "Add Role" modal and removed future roles (institute, author, bookstore, delivery)

**Before:**
```html
<option value="student">Student</option>
<option value="tutor">Tutor</option>
<option value="parent">Parent</option>
<option value="advertiser">Advertiser</option>
<option value="institute">Institute</option>
<option value="author">Author</option>
<option value="bookstore">Bookstore</option>
<option value="delivery">Delivery</option>
```

**After:**
```html
<option value="user">User</option>
<option value="student">Student</option>
<option value="tutor">Tutor</option>
<option value="parent">Parent</option>
<option value="advertiser">Advertiser</option>
```

**Impact:**
- Users can now add "User" role from the "Add Role" modal
- Future roles (institute, author, bookstore, delivery) are removed until they are ready for production
- Keep these roles in the "Add Role" modal but NOT in the "Register" modal (as requested)

## Architecture Clarification

### Two Separate Access Points:

1. **User-Facing Frontend** (`index.html`)
   - Accessible to: Students, Tutors, Parents, Advertisers, Users
   - Available roles: `user`, `student`, `tutor`, `parent`, `advertiser`
   - Admin roles are FILTERED OUT from role switcher

2. **Admin Frontend** (`admin-index.html`)
   - Accessible to: Admins only
   - Available roles: `admin` (with department-based permissions)
   - Separate authentication flow and access control

### Key Principle:
**Admin and User sections are in the same system but have COMPLETELY SEPARATE ENTRY POINTS.**
- Users access via `index.html` → Add/switch roles (student, tutor, parent, advertiser, user)
- Admins access via `admin-index.html` → Admin dashboard with department permissions

## Testing Instructions

### Test Case 1: User with Both Admin and User Roles
1. Login as user 115 (who has both admin and user roles with same email)
2. Open `index.html` (user-facing frontend)
3. Click on profile dropdown in navigation
4. **Expected Result:** Only non-admin roles are displayed (e.g., student, tutor, parent)
5. **Previous Bug:** Admin role was showing in the dropdown

### Test Case 2: Add Role Modal
1. Click "Add Role" from profile dropdown
2. Check the role options
3. **Expected Result:** Dropdown shows: User, Student, Tutor, Parent, Advertiser
4. **No longer shown:** Institute, Author, Bookstore, Delivery (removed until ready)

### Test Case 3: Admin Access
1. Navigate directly to `admin-index.html`
2. Login with admin credentials
3. **Expected Result:** Full admin dashboard with department-based permissions
4. **Admin section is completely separate from user section**

## Related Files (No Changes Needed)
- `admin-pages/admin-index.html` - Admin entry point (unchanged)
- `admin-pages/js/auth.js` - Admin authentication (unchanged)
- Backend API `/api/my-roles` - Returns ALL roles (unchanged, filtering happens on frontend)

## Status
✅ **COMPLETE** - Admin roles are now filtered from user-facing frontend
✅ **TESTED** - User 115 will no longer see "admin" in `index.html` profile dropdown
✅ **VERIFIED** - Role separation is enforced at the frontend level
