# Issue Summary: Jediael Shows "Student" Badge Instead of "Tutor"

## Quick Facts

**Reporter:** kushstudios16@gmail.com (Kush Studios)
**Issue:** When viewing connection with jediael.s.abebe@gmail.com, the badge shows "Student" but jediael connected as a **Tutor**

---

## Database Investigation ✅ CONFIRMED CORRECT

### Actual Database Record (Connection ID: 21)

```
user_id_1:       141  (kushstudios16@gmail.com)
profile_id_1:    86   (Kush's tutor profile)
profile_type_1:  tutor

user_id_2:       115  (jediael.s.abebe@gmail.com)
profile_id_2:    85   (Jediael's tutor profile)
profile_type_2:  tutor  ✅ DATABASE SAYS "TUTOR"

Status: connected
Created: 2025-10-28 12:49:25
```

**Verification:**
- ✅ Jediael's profile_id_2 = 85 (exists in tutor_profiles table)
- ✅ Jediael's profile_type_2 = "tutor" (stored correctly)
- ✅ This is a tutor-to-tutor connection (professional network)

**Conclusion:** The database is 100% correct. Jediael DID connect as a tutor.

---

## What Should Happen

When Kush (user_id 141) views this connection:

```javascript
currentUserId = 141

if (connection.user_id_1 === currentUserId) {
    // Kush is user_id_1
    // Show user_id_2's profile type
    badge = connection.profile_type_2  // "tutor"
}

Result: Badge should display "Tutor" ✅
```

---

## Possible Root Causes

### 1. Frontend Using Wrong Data Source (Most Likely)

The badge function might be looking at:
- ❌ `connection.role` (legacy field) - might be hardcoded as "student"
- ❌ `connection.type` - might be set to "students"
- ❌ `connection.user_2_roles[0]` - wrong source (user roles ≠ connection profile)

Instead of:
- ✅ `connection.profile_type_2` - correct source

### 2. Sample Data Override

The page might be using hardcoded sample data instead of API data:

```javascript
// Sample data might have wrong values
const sampleConnections = [
    {
        name: 'Jediael',
        role: 'Student',  // ❌ Hardcoded wrong value
        profile_type_2: 'tutor'  // ✅ Correct but ignored
    }
];
```

### 3. API Not Returning Profile Types

Unlikely (we confirmed ConnectionResponse includes profile_type_1/2), but possible if:
- Using old backend version
- Cache serving old response structure
- Frontend not updating from API

### 4. Badge Function Logic Error

The `getProfileBadge()` function might have a bug that returns wrong value.

---

## Testing Instructions

### Test 1: Check API Response

**File:** [TEST-CONNECTION-API.md](TEST-CONNECTION-API.md)

1. Login as kushstudios16@gmail.com
2. Open browser console (F12)
3. Run test script
4. Check if `profile_type_2` is "tutor" in API response

**Expected:** profile_type_2 = "tutor"
**If different:** Backend issue or cache problem

### Test 2: Check Badge Function

```javascript
const testConn = {
    user_id_1: 141,
    user_id_2: 115,
    profile_type_2: "tutor"
};

window.user = { id: 141 };
console.log('Badge:', getProfileBadge(testConn));
```

**Expected:** "Tutor"
**If different:** Badge function has bug

### Test 3: Check Sample vs API Data

```javascript
// Check if page uses sample data
console.log('Using sample data?', typeof getConnectionsData === 'function');

// If yes, check sample data content
if (typeof getConnectionsData === 'function') {
    const data = getConnectionsData();
    const jediael = data.find(c => c.name?.includes('Jediael'));
    console.log('Jediael in sample data:', jediael);
}
```

**Expected:** Should use API data, not sample data
**If using sample:** Need to switch to API or fix sample data

---

## Solutions

### Solution 1: Fix Badge Function (If Using Wrong Field)

**File:** `js/tutor-profile/global-functions.js`

Find `getProfileBadge()` function and ensure it uses `profile_type_2`:

```javascript
function getProfileBadge(connection) {
    // WRONG - Don't use these:
    // return connection.role;  ❌
    // return connection.type;  ❌
    // return connection.user_2_roles[0];  ❌

    // CORRECT - Use profile type:
    const currentUserId = window.user?.id;

    if (connection.user_id_1 === currentUserId) {
        return connection.profile_type_2;  // ✅
    } else {
        return connection.profile_type_1;  // ✅
    }
}
```

### Solution 2: Fix Sample Data (If Using Hardcoded Data)

**File:** `js/tutor-profile/global-functions.js`

Update sample data to match database:

```javascript
function getConnectionsData() {
    return [
        {
            id: 21,
            name: 'Jediael Jediael',
            role: 'Tutor',  // ✅ Fix this
            type: 'tutors',  // ✅ Fix this
            user_id_1: 141,
            user_id_2: 115,
            profile_type_1: 'tutor',
            profile_type_2: 'tutor'  // ✅ Correct
        }
    ];
}
```

### Solution 3: Switch to API Data (If Using Sample)

Replace sample data calls with API calls:

```javascript
// Instead of:
const connections = getConnectionsData();  // ❌ Sample data

// Use:
const connections = await fetchConnectionsFromAPI();  // ✅ Real data
```

### Solution 4: Clear Cache (If Old Data Cached)

```bash
# Restart backend
cd astegni-backend
python app.py

# Clear browser cache
# Or hard reload: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
```

---

## What We Know For Sure

✅ **Database is CORRECT:**
- Jediael connected as tutor (profile_type_2 = "tutor")
- Connection record has correct profile IDs and types

✅ **Backend API Model is CORRECT:**
- ConnectionResponse includes profile_type_1 and profile_type_2 fields
- Backend can return correct data

❓ **Unknown (Need Testing):**
- Is frontend receiving correct data from API?
- Is badge function using correct field?
- Is page using sample data or API data?

---

## Next Steps

1. **Run Test 1** (Check API Response)
   - This tells us if frontend is receiving correct data

2. **Based on Test 1 Results:**

   **If API returns profile_type_2 = "tutor":**
   - Problem is in frontend (badge function or sample data)
   - Run Test 2 and Test 3 to pinpoint

   **If API returns profile_type_2 = "student" or missing:**
   - Problem is in backend or cache
   - Restart backend and test again

3. **Apply Targeted Fix** based on findings

---

## Quick Diagnostic Commands

### Check Database (Already Confirmed ✅)
```bash
cd astegni-backend
python -c "
import psycopg
from dotenv import load_dotenv
import os
load_dotenv()
conn = psycopg.connect(os.getenv('DATABASE_URL').replace('postgresql://', 'postgresql://'))
cur = conn.cursor()
cur.execute('SELECT profile_type_2 FROM connections WHERE id = 21')
print('Database profile_type_2:', cur.fetchone()[0])
cur.close()
conn.close()
"
```

Expected: `Database profile_type_2: tutor` ✅

### Check Backend is Running
```bash
curl http://localhost:8000/api/health
```

Expected: 200 OK

### Check Frontend Global Function
```javascript
// In browser console on tutor-profile.html
console.log('getProfileBadge exists:', typeof getProfileBadge === 'function');
console.log('Function code:', getProfileBadge.toString());
```

This shows the actual code of the badge function.

---

## Summary

**Problem:** Badge shows "Student" instead of "Tutor"

**Database Status:** ✅ Correct (profile_type_2 = "tutor")

**Most Likely Cause:** Frontend using wrong data source or sample data with wrong values

**Next Action:** Run browser console tests to identify exact issue

**Files to Check:**
- `js/tutor-profile/global-functions.js` (badge function)
- `profile-pages/tutor-profile.html` (community modal)

**Quick Test:** See [TEST-CONNECTION-API.md](TEST-CONNECTION-API.md) for step-by-step testing
