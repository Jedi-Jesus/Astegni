# Advertiser Profile Testing Guide

## Issue Fixed

The profile was falling back to sample data instead of always reading from the database. This has been fixed with improved error handling and console logging.

## Changes Made

### 1. **profile-data-loader.js**
- ✅ Removed automatic fallback to sample data
- ✅ Added detailed console logging
- ✅ Shows error message to user instead of silent fallback
- ✅ Throws error so calling code knows it failed

### 2. **profile-edit-handler.js**
- ✅ Added detailed console logging for save operations
- ✅ Better error handling
- ✅ Always reloads from database after save

## Testing Steps

### Step 1: Check Backend is Running

```bash
cd astegni-backend
python app.py
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 2: Login with Your Account

1. Open `index.html` in browser
2. Login with: `jediael.s.abebe@gmail.com`
3. Ensure "advertiser" is one of your roles

### Step 3: Navigate to Advertiser Profile

Click on your profile or navigate to:
```
profile-pages/advertiser-profile.html
```

### Step 4: Open Browser Console

Press **F12** to open Developer Tools, then click **Console** tab.

### Step 5: Watch Console Logs

You should see:
```
🔄 Loading advertiser profile from database...
✅ Profile data loaded from API: {company_name: "...", bio: "...", ...}
✅ Profile UI updated successfully
```

### Step 6: Edit Profile

1. Click "Edit Profile" button
2. Change company name to something new (e.g., "Test Company Updated")
3. Change bio, location, etc.
4. Click "Save Changes"

### Step 7: Watch Save Process in Console

You should see this sequence:
```
💾 Saving advertiser profile to database: {company_name: "Test Company Updated", ...}
✅ Profile save response: {message: "Profile updated successfully", id: 1}
🔄 Reloading profile from database...
🔄 Loading advertiser profile from database...
✅ Profile data loaded from API: {company_name: "Test Company Updated", ...}
✅ Profile UI updated successfully
✅ Profile header updated with latest data from database
```

### Step 8: Verify Profile Header Updated

Check that the profile header shows your NEW company name immediately.

### Step 9: Refresh Page

Press **Ctrl+R** or **F5** to refresh the page.

The profile should still show your updated data (not fallback data).

## Troubleshooting

### Issue: "Failed to load profile from database" Error

**Check:**
1. Is backend running?
2. Is user logged in? (check localStorage for 'token')
3. Does user have 'advertiser' role?

**Console Commands:**
```javascript
// Check if token exists
console.log('Token:', localStorage.getItem('token'));

// Check current user
fetch('http://localhost:8000/api/me', {
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
.then(r => r.json())
.then(data => console.log('Current user:', data));
```

### Issue: Profile Shows Fallback Data

This should NO LONGER happen. If it does:

**Check Console for:**
- ❌ Errors loading from API
- ⚠️ Warning messages

**Manual API Test:**
```javascript
// Test API directly
fetch('http://localhost:8000/api/advertiser/profile', {
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
.then(r => r.json())
.then(data => console.log('API Response:', data))
.catch(err => console.error('API Error:', err));
```

### Issue: Profile Doesn't Update After Save

**Check:**
1. Console shows save response
2. Console shows reload from database
3. No JavaScript errors

**Manual Test:**
```javascript
// Force reload profile
AdvertiserProfileDataLoader.loadCompleteProfile();
```

### Issue: 403 Forbidden Error

Your user doesn't have 'advertiser' role.

**Fix:**
```sql
-- In PostgreSQL, add advertiser role
UPDATE users
SET roles = roles || '["advertiser"]'::jsonb
WHERE email = 'jediael.s.abebe@gmail.com';
```

### Issue: 404 Not Found - Advertiser Profile

The backend will automatically create a profile for you on first access.

**Check:**
```sql
-- Verify profile was created
SELECT * FROM advertiser_profiles WHERE user_id = (
    SELECT id FROM users WHERE email = 'jediael.s.abebe@gmail.com'
);
```

## Expected Database Behavior

### On First Access:
1. Backend checks if advertiser_profile exists for your user_id
2. If not, creates one with default data:
   - `company_name`: "FirstName FatherName Inc."
   - All stats set to 0
   - `is_verified`: false
   - `is_premium`: false

### On Profile Edit:
1. Frontend sends PUT request to `/api/advertiser/profile`
2. Backend updates advertiser_profiles table
3. Frontend reloads data from database
4. UI updates with new data

### On Page Refresh:
1. Frontend calls GET `/api/advertiser/profile`
2. Backend returns data from database
3. UI populates with real data

## Console Logging Reference

### Good Flow (Everything Working):
```
🔄 Loading advertiser profile from database...
✅ Profile data loaded from API: {...}
✅ Profile UI updated successfully
```

### After Save:
```
💾 Saving advertiser profile to database: {...}
✅ Profile save response: {...}
🔄 Reloading profile from database...
🔄 Loading advertiser profile from database...
✅ Profile data loaded from API: {...}
✅ Profile UI updated successfully
✅ Profile header updated with latest data from database
```

### Error Flow:
```
🔄 Loading advertiser profile from database...
❌ Error loading profile from database: Error message here
```

## Database Verification

### Check Profile Data:
```sql
SELECT
    ap.id,
    ap.company_name,
    ap.bio,
    ap.location,
    ap.is_verified,
    ap.is_premium,
    u.email,
    u.roles
FROM advertiser_profiles ap
JOIN users u ON u.id = ap.user_id
WHERE u.email = 'jediael.s.abebe@gmail.com';
```

### After Update:
```sql
SELECT
    company_name,
    bio,
    location,
    updated_at
FROM advertiser_profiles
WHERE user_id = (SELECT id FROM users WHERE email = 'jediael.s.abebe@gmail.com');
```

The `updated_at` timestamp should change after each save.

## Success Criteria

✅ Profile loads from database on page load
✅ Console shows successful API calls
✅ Profile header displays correct data
✅ Edit and save updates database
✅ Profile header updates immediately after save
✅ Page refresh shows persisted data
✅ No fallback data appears

## Files Modified

- `js/advertiser-profile/profile-data-loader.js` - Removed fallback behavior
- `js/advertiser-profile/profile-edit-handler.js` - Enhanced logging

## Next Steps if Still Issues

1. Share console logs (screenshots or copy/paste)
2. Check Network tab for API requests/responses
3. Verify database records
4. Check JWT token is valid

The profile should now ALWAYS read from database and NEVER use fallback data silently! 🎉
