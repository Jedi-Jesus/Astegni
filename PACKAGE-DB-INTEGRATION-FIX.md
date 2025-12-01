# Package Database Integration - Fix & Testing Guide

## Issue
Packages created from the modal aren't being saved to the database.

## What Was Fixed

### 1. Enhanced Logging in `package-manager-clean.js`
Added comprehensive console logging to track:
- `loadPackages()` - See if packages are loading from DB
- `addPackage()` - See if packages are saving to DB
- `updatePackage()` - See if package updates are saving to DB

### 2. Key Logging Points
- **Token check**: Shows if authentication token exists
- **API responses**: Shows HTTP status codes and error messages
- **Data conversion**: Shows frontend ↔ backend format conversion
- **Fallback behavior**: Shows when localStorage is used instead of DB

## How to Test

### Step 1: Start the Backend Server

```bash
cd astegni-backend
python app.py
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 2: Start the Frontend Server

```bash
# From project root (new terminal)
python -m http.server 8080
```

### Step 3: Login as a Tutor

1. Open: `http://localhost:8080/profile-pages/tutor-profile.html`
2. If not logged in, click "Login" and use a tutor account
3. **Important**: Make sure your user has the "tutor" role in their `roles` JSON array

### Step 4: Open Package Modal with DevTools

1. **Open Browser DevTools** (F12)
2. Go to **Console** tab
3. Click the **"Package"** button on the tutor profile page
4. Watch the console logs

**Expected logs:**
```
📡 loadPackages called
🔑 Token exists: true
📡 Fetching packages from database...
📨 Response status: 200
✅ Loaded packages from database: [...]
```

### Step 5: Create a New Package

1. Click **"Create Your First Package"** or the **"+"** button
2. Watch console logs:

**Expected logs:**
```
📦 addPackage called with: {name: "Package 1", courses: [], ...}
🔑 Token exists: true
📡 Sending to backend: {name: "Package 1", courses: "", hourly_rate: 0, ...}
📨 Response status: 201
✅ Package saved to database: {id: 123, tutor_id: 456, ...}
✅ Package added to local state
```

### Step 6: Fill Package Details

1. Enter package name (e.g., "Mathematics Package")
2. Add courses (type and press Enter for each):
   - Algebra
   - Geometry
   - Trigonometry
3. Set hourly rate (e.g., 250)
4. Set payment frequency (monthly or 2-weeks)
5. Set discounts (optional)
6. Click **"Save Package"**

**Expected logs:**
```
📝 updatePackage called for ID: 123 with data: {...}
🔑 Token exists: true
📡 Sending update to backend: {...}
📨 Response status: 200
✅ Package updated in database: {...}
✅ Package updated in local state
```

## Troubleshooting

### Problem: "❌ Backend error: 401"

**Cause:** Authentication token is invalid or expired

**Solution:**
1. Logout and login again
2. Check if token exists: `localStorage.getItem('token')`
3. Check if user is logged in as a tutor

### Problem: "❌ Backend error: 500"

**Cause:** Backend database error

**Solution:**
1. Check backend console for error details
2. Verify database is running
3. Check if `tutor_packages` table exists:

```bash
cd astegni-backend
python -c "
import psycopg, os
from dotenv import load_dotenv
load_dotenv()
conn = psycopg.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()
cur.execute(\"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tutor_packages')\")
print('Table exists:', cur.fetchone()[0])
cur.close()
conn.close()
"
```

### Problem: "⚠️ No token found - saving to localStorage only"

**Cause:** User is not logged in

**Solution:**
1. Login to the application
2. Verify token in localStorage: `console.log(localStorage.getItem('token'))`

### Problem: "❌ Error loading from database: TypeError: Failed to fetch"

**Cause:** Backend server is not running or CORS issue

**Solution:**
1. Verify backend is running on `http://localhost:8000`
2. Check API base URL in `package-manager-clean.js` (line 8): `const API_BASE_URL = 'http://localhost:8000';`
3. Check backend CORS settings allow `http://localhost:8080`

### Problem: Package shows in modal but not in database

**Cause:** API call failed but localStorage fallback succeeded

**Solution:**
1. Check console for error messages (❌ or ⚠️ emojis)
2. Look for "Response status: XXX" logs
3. If status is not 200/201, check the error message
4. Verify backend is running and accessible

## Verify Database Save

After creating a package, verify it's in the database:

```bash
cd astegni-backend
python -c "
import psycopg, os
from dotenv import load_dotenv
load_dotenv()
conn = psycopg.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()
cur.execute('SELECT id, tutor_id, name, courses, hourly_rate FROM tutor_packages ORDER BY created_at DESC LIMIT 5')
print('Recent packages:')
for row in cur.fetchall():
    print(f'  ID: {row[0]}, Tutor: {row[1]}, Name: {row[2]}, Courses: {row[3]}, Rate: {row[4]}')
cur.close()
conn.close()
"
```

## Files Modified

1. **[js/tutor-profile/package-manager-clean.js](js/tutor-profile/package-manager-clean.js)**
   - Enhanced `loadPackages()` with detailed logging (line 18-55)
   - Enhanced `addPackage()` with detailed logging (line 61-115)
   - Enhanced `updatePackage()` with detailed logging (line 149-206)

## Expected Workflow

1. **User creates package** → Frontend calls `POST /api/tutor/packages`
2. **Backend saves to database** → Returns package with ID
3. **Frontend receives response** → Adds to local state
4. **User edits package** → Frontend calls `PUT /api/tutor/packages/{id}`
5. **Backend updates database** → Returns updated package
6. **Frontend receives response** → Updates local state
7. **User reopens modal** → Frontend calls `GET /api/tutor/packages`
8. **Backend returns packages** → Frontend displays them

## Next Steps

1. **Open tutor-profile.html** in your browser
2. **Open DevTools Console** (F12)
3. **Click "Package" button** and watch the logs
4. **Create a package** and watch the API calls
5. **Report back** what you see in the console

The enhanced logging will show exactly what's happening at each step. If packages aren't saving to the database, the console will show the error message and status code.
