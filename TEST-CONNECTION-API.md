# Testing Connection API for Badge Issue

## How to Test in Browser

### Step 1: Login as kushstudios16@gmail.com

1. Open http://localhost:8080
2. Login with:
   - Email: `kushstudios16@gmail.com`
   - Password: `@KushStudios16`
3. Open browser console (F12)

### Step 2: Check API Response

Paste this in console:

```javascript
// Get your token
const token = localStorage.getItem('token');
console.log('Token:', token ? 'Found' : 'Missing');

// Fetch connections
fetch('http://localhost:8000/api/connections/my', {
    headers: {
        'Authorization': 'Bearer ' + token
    }
})
.then(r => r.json())
.then(data => {
    console.log('=== ALL CONNECTIONS ===');
    console.log(data);

    // Find jediael connection (user_id 115)
    const jediaelConn = data.find(c =>
        c.user_id_1 === 115 || c.user_id_2 === 115
    );

    console.log('\n=== JEDIAEL CONNECTION ===');
    console.log('Full object:', jediaelConn);

    if (jediaelConn) {
        console.log('\n--- Profile Type Fields ---');
        console.log('profile_type_1:', jediaelConn.profile_type_1);
        console.log('profile_type_2:', jediaelConn.profile_type_2);

        console.log('\n--- User Role Fields ---');
        console.log('user_1_roles:', jediaelConn.user_1_roles);
        console.log('user_2_roles:', jediaelConn.user_2_roles);

        console.log('\n--- User IDs ---');
        console.log('user_id_1:', jediaelConn.user_id_1);
        console.log('user_id_2:', jediaelConn.user_id_2);

        // Test badge function
        console.log('\n--- Badge Calculation ---');
        const currentUserId = 141;  // Your user ID

        if (jediaelConn.user_id_1 === currentUserId) {
            console.log('You are user_id_1');
            console.log('Should show user_id_2 profile type:', jediaelConn.profile_type_2);
        } else {
            console.log('You are user_id_2');
            console.log('Should show user_id_1 profile type:', jediaelConn.profile_type_1);
        }
    } else {
        console.log('❌ No connection found with jediael (user_id 115)');
    }
})
.catch(err => console.error('Error:', err));
```

### Expected Output

```
=== ALL CONNECTIONS ===
[
  {
    "id": 21,
    "user_id_1": 141,
    "profile_id_1": 86,
    "profile_type_1": "tutor",      ← Your profile type
    "user_id_2": 115,
    "profile_id_2": 85,
    "profile_type_2": "tutor",      ← Jediael's profile type ✅ SHOULD BE "tutor"
    "user_2_name": "Jediael Jediael",
    "user_2_roles": ["admin", "tutor", "student", "parent"],
    "status": "connected"
  }
]

=== JEDIAEL CONNECTION ===
Full object: {...}

--- Profile Type Fields ---
profile_type_1: tutor
profile_type_2: tutor    ← THIS should be the badge!

--- User Role Fields ---
user_1_roles: ["tutor"]
user_2_roles: ["admin", "tutor", "student", "parent"]

--- User IDs ---
user_id_1: 141   (You)
user_id_2: 115   (Jediael)

--- Badge Calculation ---
You are user_id_1
Should show user_id_2 profile type: tutor  ← Badge should be "Tutor"
```

---

## Step 3: Check Badge Function

Paste this in console:

```javascript
// Test the getProfileBadge function
const testConnection = {
    id: 21,
    user_id_1: 141,
    user_id_2: 115,
    profile_type_1: "tutor",
    profile_type_2: "tutor"
};

// Set current user
window.user = { id: 141 };

// Test the function
if (typeof getProfileBadge === 'function') {
    const badge = getProfileBadge(testConnection);
    console.log('Badge returned by getProfileBadge():', badge);

    if (badge === 'Tutor') {
        console.log('✅ CORRECT: Badge function working properly');
    } else {
        console.log('❌ WRONG: Badge should be "Tutor" but got:', badge);
    }
} else {
    console.log('❌ ERROR: getProfileBadge function not found');
    console.log('Available functions:', Object.keys(window).filter(k => k.includes('Badge')));
}
```

---

## Step 4: Check Where Badge Is Displayed

```javascript
// Check the actual community modal data
if (typeof getConnectionsData === 'function') {
    const connections = getConnectionsData();
    console.log('Sample connections data:', connections);

    // This might be using SAMPLE data instead of API data!
    const jediaelSample = connections.find(c =>
        c.name && c.name.toLowerCase().includes('jediael')
    );

    if (jediaelSample) {
        console.log('Found jediael in SAMPLE data:');
        console.log('  Name:', jediaelSample.name);
        console.log('  Role (legacy):', jediaelSample.role);
        console.log('  profile_type_2:', jediaelSample.profile_type_2);
        console.log('  type:', jediaelSample.type);
    }
} else {
    console.log('getConnectionsData not found - might be using API data');
}
```

---

## Diagnosis Guide

### If profile_type_2 is "tutor" but badge shows "Student":

**Problem:** Frontend is using wrong data source

**Solutions:**
1. Check if using `connection.role` instead of `connection.profile_type_2`
2. Check if using `connection.type` instead of `connection.profile_type_2`
3. Check if using `connection.user_2_roles[0]` instead of `connection.profile_type_2`

### If profile_type_2 is "student":

**Problem:** Database has wrong value

**Solutions:**
1. Check if connection was created with wrong profile type
2. Manually update database record
3. Delete and recreate connection

### If profile_type_2 is missing/null:

**Problem:** API not returning field or old data structure

**Solutions:**
1. Check if backend is running latest version
2. Clear cache and restart backend
3. Check if migration was run for profile-based connections

---

## Quick Database Fix (If Needed)

If the database has the wrong profile_type_2 value:

```sql
UPDATE connections
SET profile_type_2 = 'tutor',
    profile_id_2 = 85
WHERE id = 21;
```

---

## Backend Status Check

Run this to verify backend is serving correct data:

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
result = cur.fetchone()
print('Database profile_type_2:', result[0])

if result[0] == 'tutor':
    print('Database is CORRECT - Jediael connected as tutor')
else:
    print('Database is WRONG - Should be tutor, found:', result[0])

cur.close()
conn.close()
"
```

Expected output:
```
Database profile_type_2: tutor
Database is CORRECT - Jediael connected as tutor
```

---

## Next Steps

1. **Run Step 1-4 tests** in browser console
2. **Note which test fails** (API response, badge function, or sample data)
3. **Report findings** so we can pinpoint the exact issue
4. **Apply targeted fix** based on results

The database is correct (profile_type_2 = "tutor"), so the issue is either:
- Frontend using wrong data source (most likely)
- API not returning profile_type_2 field
- Cache/version issue
