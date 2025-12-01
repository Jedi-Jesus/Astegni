# View Profile Navigation Fix

## Problem
When clicking dropdown header or role buttons in view-student.html and view-tutor.html, users got a 404 error:
```
Error response
Error code: 404
Message: File not found.
```

## Root Cause
The `getProfileUrl()` function in `profile-system.js` didn't handle the `/view-profiles/` directory path. It only checked for:
- `/profile-pages/` ✓
- `/branch/` ✓
- Root directory ✓
- **Missing: `/view-profiles/`** ❌

## Solution
Added check for `/view-profiles/` directory in the path resolution logic.

### Code Change (js/root/profile-system.js - Lines 103-111)

**BEFORE:**
```javascript
const currentPath = window.location.pathname;
const isInProfilePages = currentPath.includes('/profile-pages/');
const isInBranch = currentPath.includes('/branch/');

if (isInProfilePages) {
    return `${role}-profile.html`;
} else if (isInBranch) {
    return `../profile-pages/${role}-profile.html`;
} else {
    return `profile-pages/${role}-profile.html`;
}
```

**AFTER:**
```javascript
const currentPath = window.location.pathname;
const isInProfilePages = currentPath.includes('/profile-pages/');
const isInViewProfiles = currentPath.includes('/view-profiles/');  // ← NEW
const isInBranch = currentPath.includes('/branch/');

if (isInProfilePages) {
    return `${role}-profile.html`;
} else if (isInViewProfiles) {                                      // ← NEW
    return `../profile-pages/${role}-profile.html`;                 // ← NEW
} else if (isInBranch) {
    return `../profile-pages/${role}-profile.html`;
} else {
    return `profile-pages/${role}-profile.html`;
}
```

## Path Resolution Examples

### Example 1: Student on view-student.html clicks dropdown header
```
Current page: /view-profiles/view-student.html
Active role: student
Generated URL: ../profile-pages/student-profile.html
Resolves to: /profile-pages/student-profile.html ✓
```

### Example 2: Student on view-student.html switches to Tutor role
```
Current page: /view-profiles/view-student.html
Target role: tutor
Generated URL: ../profile-pages/tutor-profile.html
Resolves to: /profile-pages/tutor-profile.html ✓
```

### Example 3: On view-tutor.html clicks Parent role
```
Current page: /view-profiles/view-tutor.html
Target role: parent
Generated URL: ../profile-pages/parent-profile.html
Resolves to: /profile-pages/parent-profile.html ✓
```

## Testing

### Test 1: Dropdown Header Navigation
1. Go to: `http://localhost:8080/view-profiles/view-student.html?id=28`
2. Click your name/avatar in the dropdown header
3. **Expected:** Navigate to `student-profile.html`
4. **Previous:** 404 error ❌
5. **Now:** Works ✓

### Test 2: Same Role Click
1. Go to: `http://localhost:8080/view-profiles/view-student.html?id=28`
2. Open dropdown → Click "Student" role
3. **Expected:** Navigate to `student-profile.html`
4. **Previous:** 404 error ❌
5. **Now:** Works ✓

### Test 3: Different Role Click (Role Switching)
1. Go to: `http://localhost:8080/view-profiles/view-student.html?id=28`
2. Open dropdown → Click "Tutor" role (if available)
3. **Expected:**
   - API call to `/api/switch-role`
   - Toast message: "Switching to Tutor role..."
   - Navigate to `tutor-profile.html`
4. **Previous:** 404 error ❌
5. **Now:** Works ✓

### Test 4: View-Tutor Page
1. Go to: `http://localhost:8080/view-profiles/view-tutor.html?id=1`
2. Click dropdown header
3. **Expected:** Navigate to current role's profile page
4. **Previous:** 404 error ❌
5. **Now:** Works ✓

## Files Modified
- `js/root/profile-system.js` - Added `/view-profiles/` path handling (lines 103-111)

## Status: ✅ FIXED
The navigation now works correctly from both view-student.html and view-tutor.html.

---

**Date:** 2025-11-25
**Issue:** 404 on dropdown navigation
**Fix:** Added view-profiles path check
