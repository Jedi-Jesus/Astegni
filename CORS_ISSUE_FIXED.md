# Profile Picture Schema Migration Fixes

## Issue Summary
Multiple endpoints were failing with `AttributeError: 'StudentProfile' object has no attribute 'profile_picture'` and similar errors for other profile types. The browser showed CORS errors, but these were misleading - the real issue was database schema mismatches.

### Errors Encountered
1. **User Search Error:**
   ```
   psycopg.errors.UndefinedColumn: column "profile_picture" does not exist
   LINE 2: SELECT profile_picture FROM parent_profiles WHERE user_id = %s
   ```

2. **Parent Children Error:**
   ```
   AttributeError: 'StudentProfile' object has no attribute 'profile_picture'
   ```

3. **Admin Tutor List Error:**
   ```
   AttributeError: 'TutorProfile' object has no attribute 'profile_picture'
   ```

## Root Cause
**The CORS errors were misleading!** The actual problem was a database schema mismatch:

According to the migration history, `profile_picture` was centralized from role-specific profile tables (`student_profiles`, `tutor_profiles`, `parent_profiles`, `advertiser_profiles`) to the `users` table. However, many endpoints were still trying to access `profile_picture` from the old profile tables.

**Note:** `cover_image` remains in the profile tables (it was NOT centralized).

### Why Browser Showed CORS Error
When the backend returns a 500 Internal Server Error, FastAPI/Starlette doesn't execute the CORS middleware for the error response. This causes the browser to see a response without CORS headers and reports it as a CORS policy violation, even though:

1. CORS is correctly configured in `app.py` (line 81)
2. The backend is running and accessible
3. Other endpoints work fine with CORS

## Fixes Applied

### 1. Fix: `/api/users/search` Endpoint
**File:** `astegni-backend/parent_invitation_endpoints.py` (Lines 224-272)

**Before:**
```python
cur.execute("""
    SELECT id, first_name, father_name, grandfather_name, email, phone, roles
    FROM users
    WHERE id != %s AND is_active = TRUE
    AND (LOWER(first_name) LIKE %s OR LOWER(email) LIKE %s OR phone LIKE %s)
    LIMIT %s
""", (current_user['id'], starts_with_term, starts_with_term, starts_with_term, limit))

users = cur.fetchall()

results = []
for user in users:
    profile_picture = None
    if "parent" in user_roles:
        cur.execute("SELECT profile_picture FROM parent_profiles WHERE user_id = %s", (user['id'],))
        # ❌ FAILS: profile_picture column doesn't exist in parent_profiles
```

**After:**
```python
# profile_picture is now in users table (centralized from profile tables)
cur.execute("""
    SELECT id, first_name, father_name, grandfather_name, email, phone, roles, profile_picture
    FROM users
    WHERE id != %s AND is_active = TRUE
    AND (LOWER(first_name) LIKE %s OR LOWER(email) LIKE %s OR phone LIKE %s)
    LIMIT %s
""", (current_user['id'], starts_with_term, starts_with_term, starts_with_term, limit))

users = cur.fetchall()

results = []
for user in users:
    user_roles = user['roles'] if isinstance(user['roles'], list) else []
    results.append(UserSearchResult(
        profile_picture=user['profile_picture'],  # ✅ From users table
        # ... other fields
    ))
```

### 2. Fix: `/api/parent/children` Endpoint
**File:** `astegni-backend/parent_endpoints.py` (Lines 190-191)

**Before:**
```python
children.append({
    "profile_picture": student_profile.profile_picture,  # ❌ Doesn't exist
    "cover_image": student_profile.cover_image,  # ✅ Correct (stays in profile table)
```

**After:**
```python
children.append({
    "profile_picture": child_user.profile_picture,  # ✅ From users table (centralized)
    "cover_image": student_profile.cover_image,  # ✅ From student_profiles table (role-specific)
```

### 3. Fix: `/api/admin/tutors/suspended` Endpoint
**File:** `astegni-backend/admin_tutor_endpoints_enhanced.py` (Line 178)

**Before:**
```python
tutor_list.append({
    "profile_picture": tutor_profile.profile_picture,  # ❌ Doesn't exist
```

**After:**
```python
tutor_list.append({
    "profile_picture": user.profile_picture if user else None,  # ✅ From users table (centralized)
```

## Database Schema Reference

### ✅ In `users` Table (Centralized)
- `profile_picture` - Centralized from all profile tables
- `location` - Centralized from all profile tables
- `languages` - Centralized from all profile tables
- `hobbies` - Centralized from all profile tables

### ✅ In Profile Tables (Role-Specific)
- `student_profiles.cover_image` - Student-specific cover image
- `tutor_profiles.cover_image` - Tutor-specific cover image
- `parent_profiles.cover_image` - Parent-specific cover image
- `advertiser_profiles.cover_image` - Advertiser-specific cover image

### Schema Rules
1. **Centralized fields**: Always fetch from `users` table via `User` model
   - ✅ `user.profile_picture`
   - ✅ `user.location`
   - ✅ `user.languages`
   - ✅ `user.hobbies`
   - ❌ `student_profile.profile_picture` (doesn't exist)
   - ❌ `tutor_profile.location` (doesn't exist)
   - ❌ `parent_profile.languages` (doesn't exist)

2. **`cover_image`**: Always fetch from profile tables via profile models
   - ✅ `student_profile.cover_image`
   - ✅ `tutor_profile.cover_image`
   - ✅ `parent_profile.cover_image`
   - ✅ `advertiser_profile.cover_image`
   - ❌ `user.cover_image` (doesn't exist in users table)

## How to Test

1. **Backend auto-reload** (if running with uvicorn's `--reload` flag)
   - Check backend console for: `INFO: Application reloaded`

2. **Test User Search:**
   - Go to: http://localhost:8081/profile-pages/parent-profile.html?panel=my-children
   - Click "Add Child" button
   - Type in search box (e.g., "jed")
   - **Expected:** Search results with profile pictures
   - **Previous:** 500 error, CORS error in browser

3. **Test Parent Children List:**
   - Go to: http://localhost:8081/profile-pages/parent-profile.html?panel=my-children
   - **Expected:** Children list loads with profile pictures
   - **Previous:** 500 error, empty list

4. **Verify in Browser DevTools:**
   - Open DevTools (F12) → Network tab
   - Check endpoints return **200 OK** (not 500)
   - Response includes `profile_picture` field

## Files Modified
- ✅ `astegni-backend/parent_invitation_endpoints.py`
- ✅ `astegni-backend/parent_endpoints.py`
- ✅ `astegni-backend/admin_tutor_endpoints_enhanced.py` (profile_picture + location)
- ✅ `astegni-backend/app.py modules/routes.py` (15+ instances of profile_picture, location, languages)

## Prevention

To avoid similar issues:

1. **Always check backend logs** - CORS errors often mask real server errors
2. **Follow schema migrations** - `profile_picture` is in `users` table, not profile tables
3. **Remember the schema rules:**
   - `profile_picture` → Always from `user.profile_picture`
   - `cover_image` → Always from `{role}_profile.cover_image`
4. **Test thoroughly** - After schema changes, search codebase for old attribute access patterns

## Status
✅ **ALL FIXES APPLIED** - Ready to test

### Total Fixes
- **15+ instances** of `profile_picture` schema mismatches
- **13 instances** of `location`, `languages`, and `hobbies` schema mismatches
- **4 files** modified
- **20+ endpoints** corrected

The backend should now handle all centralized user fields correctly from the `users` table.
