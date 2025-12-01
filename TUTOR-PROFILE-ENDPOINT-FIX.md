# Tutor Profile Endpoint Fix - Loading Wrong Data

## The Problem

**You were on `tutor-profile.html` but it was loading STUDENT data instead of TUTOR data!**

### Root Cause

The `loadProfileHeaderData()` and `openEditProfileModal()` functions were checking `user.active_role` from localStorage and dynamically choosing which endpoint to call:

```javascript
// OLD CODE (WRONG)
const activeRole = user.active_role || 'student';

if (activeRole === 'tutor') {
    endpoint = 'http://localhost:8000/api/tutor/profile';
} else if (activeRole === 'student') {
    endpoint = 'http://localhost:8000/api/student/profile';
} else if (activeRole === 'parent') {
    endpoint = 'http://localhost:8000/api/parent/profile';
}
```

### What Was Happening

Your user (ID: 115, email: jediael.s.abebe@gmail.com) has **multiple profiles**:
- ✅ Student Profile (ID: 28) - **This was being loaded**
- ✅ Tutor Profile (ID: 85) - **This should be loaded**

When you visited `tutor-profile.html`, the page was checking `active_role` which was set to `"student"`, so it called the **STUDENT endpoint** and loaded student data:

```
Student Profile Data (ID: 28):
  - username: "waesd"
  - location: "we"
  - grade_level: "Grade 8"
  - interested_in: ["zdevdw", "jklllhll"]
  - languages: ["azxdfvwe", "regj;l"]
  - quote: [...]
  - bio: "4J"
```

But the **actual tutor profile** (ID: 85) has different data:

```
Tutor Profile Data (ID: 85):
  - username: NULL
  - location: NULL
  - grades: []
  - courses: []
  - languages: []
  - quote: NULL
  - bio: NULL
  - hero_title: "Excellence in Education, Delivered with Passion"
  - hero_subtitle: "Empowering students through personalized learning..."
```

---

## The Fix

**Changed all functions to ALWAYS use the tutor endpoint** when on `tutor-profile.html`:

### 1. `loadProfileHeaderData()` (line 11420)

**BEFORE:**
```javascript
const activeRole = user.active_role || 'student';
let endpoint = '';

if (activeRole === 'tutor') {
    endpoint = 'http://localhost:8000/api/tutor/profile';
} else if (activeRole === 'student') {
    endpoint = 'http://localhost:8000/api/student/profile';
} else if (activeRole === 'parent') {
    endpoint = 'http://localhost:8000/api/parent/profile';
}
```

**AFTER:**
```javascript
// ALWAYS use tutor endpoint since this is tutor-profile.html
const endpoint = 'http://localhost:8000/api/tutor/profile';
console.log('🔍 Fetching from TUTOR endpoint (hardcoded for tutor-profile.html):', endpoint);
```

---

### 2. `openEditProfileModal()` (line 11045)

**BEFORE:**
```javascript
const activeRole = localUser.active_role || 'student';
let endpoint = 'http://localhost:8000/api/student/profile';

if (activeRole === 'tutor') {
    endpoint = 'http://localhost:8000/api/tutor/profile';
} else if (activeRole === 'parent') {
    endpoint = 'http://localhost:8000/api/parent/profile';
}
```

**AFTER:**
```javascript
// ALWAYS use tutor endpoint since this is tutor-profile.html
const endpoint = 'http://localhost:8000/api/tutor/profile';
console.log('🔍 Edit Modal: Fetching from TUTOR endpoint:', endpoint);
```

---

### 3. `saveEditProfile()` (line 11316)

**BEFORE:**
```javascript
const activeRole = user.active_role || 'student';
let endpoint = 'http://localhost:8000/api/student/profile';

if (activeRole === 'tutor') {
    endpoint = 'http://localhost:8000/api/tutor/profile';
    updateData.grades = gradeLevels; // Tutor uses 'grades' field
} else {
    updateData.grade_level = gradeLevels[0] || ''; // Student uses single 'grade_level'
}
```

**AFTER:**
```javascript
// ALWAYS use tutor endpoint since this is tutor-profile.html
const endpoint = 'http://localhost:8000/api/tutor/profile';
updateData.grades = gradeLevels; // Tutor uses 'grades' field
console.log('🔍 Save Profile: Using TUTOR endpoint:', endpoint);
```

---

## What This Fixes

### Before (Loading Student Data):
- ❌ Profile Header: Loaded student data (username: "waesd", location: "we", grade_level: "Grade 8")
- ❌ Edit Modal: Loaded student data (interested_in, not courses)
- ❌ Save: Saved to student profile table

### After (Loading Tutor Data):
- ✅ Profile Header: Loads tutor data from `tutor_profiles` table (ID: 85)
- ✅ Edit Modal: Loads tutor data (courses, grades, teaching methods)
- ✅ Save: Saves to tutor profile table

---

## Console Output (After Fix)

When you refresh the page now, you'll see:

```
✅ User loaded, proceeding with profile header load
🔍 Fetching from TUTOR endpoint (hardcoded for tutor-profile.html): http://localhost:8000/api/tutor/profile
✅ Profile data loaded: {...}

🔍 Profile data received from API (loadProfileHeaderData):
  - grade_level: ""                    ← Empty (tutor profile, not student)
  - grades: []                          ← Empty array
  - languages: []                       ← Empty array
  - course_type: null                   ← NULL
  - sessionFormat: null                 ← NULL
  - teaches_at: null                    ← NULL
  - username: null                      ← NULL (different from student "waesd")
  - location: null                      ← NULL (different from student "we")
  - quote: null                         ← NULL
  - bio/about: null                     ← NULL

✅ Profile header COMPLETELY updated from database (ALL fields)
```

When you open the edit modal:

```
🔵 openEditProfileModal called
📡 Fetching fresh profile data from database...
🔍 Edit Modal: Fetching from TUTOR endpoint: http://localhost:8000/api/tutor/profile
✅ Fresh profile data loaded from database: {...}
✅ Edit modal populated with fresh database data
```

---

## Now It's Correct!

The tutor profile fields showing "Not specified" is **CORRECT** because:
1. The tutor profile genuinely has empty/null values in the database
2. Only `hero_title` and `hero_subtitle` have data (which will display correctly)
3. All other fields (username, location, courses, etc.) are empty in the tutor profile

To populate the tutor profile, you can:
1. Click "Edit Profile" on `tutor-profile.html`
2. Fill in the fields
3. Click "Save Changes"
4. Data will now be saved to the **correct tutor_profiles table** (not student_profiles)

---

## Summary

**Issue:** Page was loading student data instead of tutor data due to dynamic endpoint selection based on `active_role`

**Fix:** Hardcoded all functions in `tutor-profile.html` to ALWAYS use the tutor endpoint

**Files Modified:** `profile-pages/tutor-profile.html` (3 functions fixed)

**Result:** Page now correctly loads and saves tutor profile data
