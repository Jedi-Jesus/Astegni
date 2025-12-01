# Debug: Location & Gender Not Loading

## Problem
Location and Gender fields showing "Loading..." instead of actual data.

## Quick Check

### 1. Open Browser Console (F12)
Look for these messages:

**✅ GOOD - Should see:**
```
Loading profile for logged-in tutor
✅ Profile data loaded: {gender: "...", location: "..."}
✅ Location loaded: ...
✅ Gender loaded: ...
```

**❌ BAD - If you see:**
```
❌ Element #tutor-location not found
❌ Element #tutor-gender not found
```
OR
```
Error loading complete profile: ...
```

### 2. Check Network Tab (F12 → Network)
- Look for request to: `http://localhost:8000/api/tutor/profile`
- Click on it and check the Response
- Should see: `{"gender": "Male", "location": "Addis Ababa", ...}`

### 3. Check Elements Tab (F12 → Elements)
Search for:
- `id="tutor-location"` - Should exist
- `id="tutor-gender"` - Should exist

## Likely Causes

### Cause 1: TutorProfileDataLoader Not Running
**Check:** Console should show "Loading profile for logged-in tutor"

**Fix:** Already applied - `profile-data-loader.js` is loaded and initialized

### Cause 2: API Not Returning Data
**Check:** Network tab shows empty gender/location in response

**Fix:** Check database - run this SQL:
```sql
SELECT gender FROM users WHERE id = YOUR_USER_ID;
SELECT location FROM tutor_profiles WHERE user_id = YOUR_USER_ID;
```

### Cause 3: Script Loading Order
**Check:** `api-service.js` loads before `profile-data-loader.js`

**Current order:**
1. ✅ Line 3864: `api-service.js`
2. ✅ Line 3959: `profile-data-loader.js`
3. ✅ Initialization code right after

### Cause 4: Multiple Loaders Conflict
**Status:** ✅ RESOLVED - Deleted `profile-header-data-loader.js`

Only one loader now: `profile-data-loader.js`

## Manual Test

### Test in Browser Console:
```javascript
// 1. Check if loader exists
console.log('Loader:', typeof TutorProfileDataLoader);

// 2. Check current profile data
console.log('Profile:', TutorProfileDataLoader.profileData);

// 3. Check if elements exist
console.log('Location element:', document.getElementById('tutor-location'));
console.log('Gender element:', document.getElementById('tutor-gender'));

// 4. Manually trigger load
await TutorProfileDataLoader.init();
```

## Quick Fix to Try

### Option 1: Hard Reload
1. Press `Ctrl + Shift + R` (hard reload)
2. Clear cache
3. Reload page

### Option 2: Check if Init is Being Called
Add this to browser console:
```javascript
// Check when page loaded
console.log('DOMContentLoaded fired?', document.readyState);

// Manually init if needed
if (typeof TutorProfileDataLoader !== 'undefined') {
    TutorProfileDataLoader.init().then(() => {
        console.log('Manual init complete');
        console.log('Profile data:', TutorProfileDataLoader.profileData);
    });
}
```

## Expected Console Output

```
[AuthManager.restoreSession] ...
✅ State Manager loaded!
✅ API Service loaded
🚀 INITIALIZING TUTOR PROFILE PAGE
Loading profile for logged-in tutor
✅ Profile data loaded: {
    gender: "Male",
    location: "Addis Ababa, Ethiopia",
    ...
}
🔍 Profile data received from API:
  - location: Addis Ababa, Ethiopia
  - gender: Male
✅ Location loaded: Addis Ababa, Ethiopia
✅ Gender loaded: Male
Profile data loaded
```

## If Still Not Working

Try this in console to bypass the loader and set directly:
```javascript
// Set location manually
document.getElementById('tutor-location').textContent = 'Test Location';
document.getElementById('tutor-gender').textContent = 'Test Gender';
```

If this works, it means:
- ✅ Elements exist
- ❌ Loader is not running or failing silently

Then check console for errors!
