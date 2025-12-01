# Fix 422 Error - Connection API Test

## The Error You Got

```
GET http://localhost:8000/api/connections/my 422 (Unprocessable Content)
TypeError: data.find is not a function
```

**What this means:**
- 422 = Validation error (usually auth token issue or missing required field)
- `data.find is not a function` = API returned error object instead of array

---

## Step 1: Check Error Details

Run this to see the actual error message:

```javascript
fetch('http://localhost:8000/api/connections/my', {
    headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
})
.then(r => r.json())
.then(data => {
    console.log('Response:', data);
    if (data.detail) {
        console.log('ERROR:', data.detail);
    }
})
.catch(err => console.error('Fetch error:', err));
```

---

## Common Causes of 422 Error

### 1. Token Expired or Invalid

**Check:**
```javascript
const token = localStorage.getItem('token');
console.log('Token exists:', !!token);
console.log('Token:', token?.substring(0, 50) + '...');
```

**Fix:** Re-login to get fresh token

### 2. Wrong User ID in Token

The token might be for a different user or corrupted.

**Fix:** Clear storage and re-login:
```javascript
localStorage.clear();
// Then re-login at http://localhost:8080
```

### 3. Backend Validation Error

The endpoint might be rejecting the request due to query parameters.

---

## Step 2: Try Simpler API Endpoint

Let's test with a simpler endpoint first:

```javascript
// Test 1: Check if you're authenticated
fetch('http://localhost:8000/api/me', {
    headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
})
.then(r => r.json())
.then(data => {
    console.log('Current user:', data);
    console.log('Your user ID:', data.id);
    console.log('Your roles:', data.roles);
})
.catch(err => console.error('Error:', err));
```

**Expected output:**
```json
{
    "id": 141,
    "email": "kushstudios16@gmail.com",
    "first_name": "Kush",
    "father_name": "Studios",
    "roles": ["tutor"]
}
```

---

## Step 3: Test Connection Stats Endpoint

If `/api/me` works, try the stats endpoint:

```javascript
fetch('http://localhost:8000/api/connections/stats', {
    headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
})
.then(r => r.json())
.then(data => {
    console.log('Connection stats:', data);
})
.catch(err => console.error('Error:', err));
```

**Expected output:**
```json
{
    "total_connections": 1,
    "total_connecting": 0,
    "total_connected": 1,
    "total_disconnect": 0,
    "total_connection_failed": 0
}
```

---

## Step 4: Check Backend Logs

While the frontend test runs, check backend terminal for error messages:

```bash
# Backend should be running with:
cd astegni-backend
python app.py

# Watch for error messages like:
# - "JWT token expired"
# - "Invalid token"
# - "User not found"
# - Any traceback with the 422 error
```

---

## Step 5: Test Direct Database Query

Let's bypass the API and check database directly:

```bash
cd astegni-backend
python -c "
import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
conn = psycopg.connect(os.getenv('DATABASE_URL').replace('postgresql://', 'postgresql://'))
cur = conn.cursor()

# Get your connections
cur.execute('''
    SELECT c.id, c.user_id_1, c.user_id_2,
           c.profile_type_1, c.profile_type_2,
           u1.first_name || '' '' || u1.father_name as user1_name,
           u2.first_name || '' '' || u2.father_name as user2_name,
           c.status
    FROM connections c
    JOIN users u1 ON c.user_id_1 = u1.id
    JOIN users u2 ON c.user_id_2 = u2.id
    WHERE c.user_id_1 = 141 OR c.user_id_2 = 141
    ORDER BY c.created_at DESC
''')

print('YOUR CONNECTIONS (user_id 141):')
print()
for row in cur.fetchall():
    print(f'Connection {row[0]}:')
    print(f'  {row[5]} (user {row[1]}, {row[3]}) <-> {row[6]} (user {row[2]}, {row[4]})')
    print(f'  Status: {row[7]}')
    print()

cur.close()
conn.close()
"
```

**Expected output:**
```
YOUR CONNECTIONS (user_id 141):

Connection 21:
  Kush Studios (user 141, tutor) <-> Jediael Jediael (user 115, tutor)
  Status: connected
```

---

## Step 6: Fix Authentication (If Needed)

### Option A: Re-login

1. Logout (if logged in)
2. Clear browser storage:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```
3. Login again at http://localhost:8080
4. Try API test again

### Option B: Get Fresh Token Manually

```javascript
// Login and get new token
fetch('http://localhost:8000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'kushstudios16@gmail.com',
        password: '@KushStudios16'  // Use your actual password
    })
})
.then(r => r.json())
.then(data => {
    console.log('Login response:', data);
    if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        console.log('✅ New token saved');

        // Now test connections API
        return fetch('http://localhost:8000/api/connections/my', {
            headers: { 'Authorization': 'Bearer ' + data.access_token }
        });
    }
})
.then(r => r?.json())
.then(data => {
    console.log('Connections:', data);
})
.catch(err => console.error('Error:', err));
```

---

## Step 7: Check Backend Error Details

If you have access to backend terminal, check for detailed error:

```python
# Backend might be logging errors like:

# JWT Error:
ERROR:    Exception in ASGI application
fastapi.exceptions.HTTPException: 422 Unprocessable Entity
Detail: Could not validate credentials

# Database Error:
sqlalchemy.exc.OperationalError: (psycopg.OperationalError)
server closed the connection unexpectedly

# Validation Error:
pydantic.error_wrappers.ValidationError: 1 validation error for ConnectionQuery
```

---

## Step 8: Alternative - Use Community Modal's Function

If you're on the tutor-profile.html page, try using the existing connection loading function:

```javascript
// Check if connections are loaded in the page
if (typeof loadConnectionsData === 'function') {
    loadConnectionsData();
}

// Or check if connections are already in memory
console.log('Window connections:', window.connections);

// Or check what the community modal displays
const allGrid = document.getElementById('allGrid');
console.log('Community modal grid:', allGrid?.innerHTML);
```

---

## Workaround: Check Sample Data

While we debug the API, check what the page is actually showing:

```javascript
// If page uses sample data
if (typeof getConnectionsData === 'function') {
    const connections = getConnectionsData();
    console.log('Sample connections:', connections);

    // Find jediael
    const jediael = connections.find(c =>
        c.name?.toLowerCase().includes('jediael') ||
        (c.user_id_2 === 115 || c.user_id_1 === 115)
    );

    if (jediael) {
        console.log('\nJediael connection in sample data:');
        console.log('  Name:', jediael.name);
        console.log('  Role (legacy):', jediael.role);
        console.log('  Type:', jediael.type);
        console.log('  profile_type_1:', jediael.profile_type_1);
        console.log('  profile_type_2:', jediael.profile_type_2);

        // Test badge function
        window.user = { id: 141 };
        const badge = getProfileBadge(jediael);
        console.log('  Badge displayed:', badge);
    }
}
```

---

## Quick Diagnosis Flow

```
1. Run Step 2 (Test /api/me)
   ├─ Works? → Backend auth is OK
   │          → Run Step 3 (Test /api/connections/stats)
   │             ├─ Works? → Issue is with /api/connections/my endpoint
   │             │          → Check backend logs (Step 4)
   │             └─ Fails? → Connection-related endpoints have issue
   │
   └─ Fails? → Token is invalid/expired
              → Run Step 6 (Re-login or get fresh token)
              → Then retry Step 2

2. If all API tests fail:
   → Use Step 5 (Direct database query) to verify data exists
   → Use Step 8 (Check sample data) to see what page displays

3. Report findings:
   - Which step failed?
   - What error message did you see?
   - What does backend terminal show?
```

---

## Expected Results

### If Everything Works:

```javascript
// Step 2 result:
Current user: { id: 141, email: "kushstudios16@gmail.com", ... }

// Step 3 result:
Connection stats: { total_connections: 1, total_connected: 1, ... }

// Step 4 result (after fixing 422):
Connections: [
    {
        id: 21,
        user_id_1: 141,
        user_id_2: 115,
        profile_type_1: "tutor",
        profile_type_2: "tutor",  ← This is what we need!
        user_2_name: "Jediael Jediael",
        status: "connected"
    }
]
```

### If Still Broken:

The page might be using **sample data** instead of API data. Check Step 8 results.

---

## Next Steps After Testing

Once you run these tests, report back:
1. **Which step worked?** (2, 3, 4, 5, or 8)
2. **What error messages?** (from console or backend)
3. **What does Step 8 show?** (sample data content)

Then we can apply the exact fix needed! 🎯
