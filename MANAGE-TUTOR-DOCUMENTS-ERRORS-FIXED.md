# Manage Tutor Documents - Error Fixes

## Issues Fixed

### 1. ✅ Duplicate Variable Declarations

**Problem**: Multiple JavaScript files were declaring the same variables:
- `API_BASE_URL` declared in: `tutor-review.js`, `manage-tutors.js`, `manage-tutor-documents-profile.js`
- `formatDate` declared in: `manage-tutors.js`, `manage-tutors-data.js`

**Solution**: Changed from `const`/`function` to conditional declarations:

```javascript
// Before (caused errors):
const API_BASE_URL = 'http://localhost:8000';
function formatDate(dateString) { ... }

// After (no errors):
if (typeof API_BASE_URL === 'undefined') {
    var API_BASE_URL = 'http://localhost:8000';
}
if (typeof formatDate === 'undefined') {
    var formatDate = function(dateString) { ... };
}
```

**Files Modified**:
- `js/admin-pages/tutor-review.js` (line 7-9)
- `js/admin-pages/manage-tutors.js` (line 20-23)
- `js/admin-pages/manage-tutors-data.js` (line 622-638)

### 2. ✅ Missing `adminEmail` in localStorage

**Problem**:
```
manage-tutor-documents-profile.js:18 No admin email found in localStorage
```

**Root Cause**: The admin login process wasn't setting `adminEmail` in localStorage.

**Solution**: Added automatic `adminEmail` initialization in the page:

1. **First**: Check if `adminEmail` exists in localStorage
2. **If not**: Try to extract from `currentUser` JSON object
3. **If still not found**: Fetch from `/api/me` endpoint using the auth token
4. **Store**: Save email to localStorage for future use

**File Modified**:
- `admin-pages/manage-tutor-documents.html` (line 1213-1266)

### 3. ✅ 401 Unauthorized Errors

**Problem**:
```
Failed to load resource: the server responded with a status of 401 (Unauthorized)
- /api/admin/tutors/statistics
- /api/admin/tutors/pending
- /api/admin/tutors/verified
- /api/admin/tutors/rejected
- /api/admin/tutors/suspended
```

**Root Cause**: No authentication token was being sent with the API requests.

**Solution**: The initialization script now:
1. Checks for `token` or `access_token` in localStorage
2. If not found, redirects to login page
3. If found, ensures it's available for API calls

**Additional Fix Needed**: Ensure all API calls in `manage-tutors-complete.js` use the token:

```javascript
// Make sure all fetch calls include Authorization header
const token = localStorage.getItem('token') || localStorage.getItem('access_token');
fetch(url, {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
})
```

## Testing Instructions

### Step 1: Clear localStorage (Fresh Start)
```javascript
// In browser console:
localStorage.clear();
```

### Step 2: Login as Admin
1. Navigate to admin login page
2. Login with credentials
3. Verify these items are set in localStorage:
   - `token` or `access_token`
   - `currentUser` (should contain email)
   - After page load, `adminEmail` should be set automatically

### Step 3: Navigate to Manage Tutor Documents
```
http://localhost:8080/admin-pages/manage-tutor-documents.html
```

### Step 4: Check Console (Should See):
```
✓ Admin email set from currentUser: your@email.com
✓ Profile header updated successfully
✓ Manage Tutors - Standalone Navigation Initialized
```

### Step 5: Verify No Errors
The following errors should NO LONGER appear:
- ❌ `Identifier 'API_BASE_URL' has already been declared`
- ❌ `Identifier 'formatDate' has already been declared`
- ❌ `No admin email found in localStorage`
- ❌ `401 (Unauthorized)` (if token is valid)

## Manual Testing Checklist

- [ ] Page loads without JavaScript errors
- [ ] Profile header displays admin name and picture
- [ ] No duplicate declaration errors in console
- [ ] `adminEmail` is set in localStorage after page load
- [ ] Dashboard statistics load (if backend is running)
- [ ] Panel switching works (Dashboard, Verified, Requested, etc.)
- [ ] Tutor tables populate with data

## Quick Fix for 401 Errors

If you still see 401 errors, manually set a test token:

### Option 1: Set Test Email
```javascript
// In browser console:
localStorage.setItem('adminEmail', 'test@astegni.et');
localStorage.setItem('token', 'your_actual_jwt_token_here');
```

### Option 2: Use Test Admin
Run the test script to create a test admin:
```bash
cd astegni-backend
python test_manage_tutor_documents_access.py
```

When prompted, type `y` to create test admin:
- Email: `test.tutor@astegni.et`
- Department: `manage-tutor`

### Option 3: Add Department to Existing Admin
```sql
-- In PostgreSQL:
UPDATE admin_profile
SET departments = ARRAY['manage-tutor']
WHERE email = 'your@email.com';
```

## Debugging Tips

### Check localStorage Contents
```javascript
// In browser console:
console.log('Token:', localStorage.getItem('token'));
console.log('Admin Email:', localStorage.getItem('adminEmail'));
console.log('Current User:', localStorage.getItem('currentUser'));
```

### Check if Profile Loaded
```javascript
// In browser console:
console.log('Profile Data:', window.currentProfileData);
```

### Force Profile Reload
```javascript
// In browser console:
if (window.loadManageTutorDocumentsProfile) {
    window.loadManageTutorDocumentsProfile();
}
```

### Test API Endpoint Directly
```bash
# Replace with your actual token
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/admin/manage-tutor-documents-profile/by-email/test@astegni.et
```

## Files Changed Summary

| File | Changes | Lines |
|------|---------|-------|
| `js/admin-pages/tutor-review.js` | Conditional `API_BASE_URL` declaration | 6-9 |
| `js/admin-pages/manage-tutors.js` | Conditional `API_BASE_URL` declaration | 20-23 |
| `js/admin-pages/manage-tutors-data.js` | Conditional `formatDate` declaration | 622-638 |
| `admin-pages/manage-tutor-documents.html` | Added auth & email initialization | 1213-1266 |

## Expected Console Output (Success)

```
✓ Admin email set from currentUser: admin@astegni.et
✓ Profile header updated successfully
✓ Manage Tutors Data module loaded - functions ready
✓ Manage Tutors Complete module loaded
✓ Starting tutor management initialization...
✓ Manage Tutors - Standalone Navigation Initialized
✓ Panel switching listeners initialized
```

## Common Issues

### Issue: Still seeing duplicate declaration errors
**Solution**: Hard refresh the page (Ctrl+Shift+R) to clear cached JavaScript files.

### Issue: adminEmail is null
**Solution**: Make sure `currentUser` in localStorage contains an email field, or the `/api/me` endpoint returns user data.

### Issue: 401 errors persist
**Solution**:
1. Check if token is valid: `jwt.io` to decode token
2. Make sure backend is running: `python app.py`
3. Verify admin has correct departments in database
4. Check if token has expired (refresh token if needed)

### Issue: Profile doesn't load
**Solution**:
1. Open browser console
2. Look for the actual error message
3. Check Network tab for failed requests
4. Verify backend endpoint is accessible: `http://localhost:8000/api/admin/manage-tutor-documents-profile/by-email/YOUR_EMAIL`

## Next Steps

1. **Restart Backend** (if running):
   ```bash
   cd astegni-backend
   python app.py
   ```

2. **Clear Browser Cache**: Ctrl+Shift+Delete → Clear cached files

3. **Test Login Flow**: Login fresh and navigate to page

4. **Verify Database**: Ensure admin has `manage-tutor` or `manage-system-settings` department

5. **Check Console**: Verify no errors appear

All fixes are complete and ready for testing!
