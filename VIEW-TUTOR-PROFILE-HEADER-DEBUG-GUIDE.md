# View Tutor Profile Header Not Loading - Debug Guide

## Problem
When opening `view-tutor.html` from `find-tutors.html`, the profile header is not reading from the database.

## Investigation Results

### ✅ What's Working Correctly

1. **Backend Endpoint** (`view_tutor_endpoints.py`):
   - ✅ Endpoint exists: `GET /api/view-tutor/{tutor_id}`
   - ✅ Registered in app.py: `app.include_router(view_tutor_router)`
   - ✅ Returns full tutor profile with `full_name`, `username`, etc.

2. **Frontend Navigation** (`find-tutors.html`):
   - ✅ Correct URL: `../view-profiles/view-tutor.html?id=${tutorId}`
   - ✅ Opens in new tab: `window.open(url, '_blank')`

3. **Frontend Loader** (`view-tutor-db-loader.js`):
   - ✅ Reads `?id=` parameter from URL
   - ✅ Calls `loadMainProfile()` which fetches from `/api/view-tutor/${tutorId}`
   - ✅ Calls `populateProfileHeader()` to update DOM
   - ✅ Element exists in HTML: `<h1 id="tutorName">`

## Most Likely Causes

### 1. **Backend Not Running**
**Symptom:** Page loads but no data appears anywhere
**Check:**
```bash
# Check if backend is running
curl http://localhost:8000/api/view-tutor/1
```

**Fix:**
```bash
cd astegni-backend
python app.py
```

---

### 2. **CORS Error** (Most Common!)
**Symptom:** Browser console shows CORS error
**Check:** Open browser DevTools (F12) → Console tab

Look for:
```
Access to fetch at 'http://localhost:8000/api/view-tutor/1' from origin 'http://localhost:8080' has been blocked by CORS policy
```

**Fix:** Verify CORS is configured in `astegni-backend/app.py`:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### 3. **Invalid Tutor ID**
**Symptom:** 404 error in console
**Check:**
```bash
# Check what tutor IDs exist in database
cd astegni-backend
python -c "
import psycopg
import os
from dotenv import load_dotenv
load_dotenv()
conn = psycopg.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()
cur.execute('SELECT id, username FROM tutor_profiles LIMIT 10')
print('Available Tutor IDs:')
for row in cur.fetchall():
    print(f'  ID: {row[0]}, Username: {row[1]}')
"
```

**Fix:** Use a valid tutor ID when clicking from find-tutors, or seed data:
```bash
cd astegni-backend
python seed_tutor_data.py
```

---

### 4. **JavaScript Error**
**Symptom:** Script doesn't run at all
**Check:** Browser Console (F12) for JavaScript errors

Common errors:
- `Uncaught ReferenceError: API_BASE_URL is not defined`
- `Uncaught TypeError: Cannot read property 'full_name' of null`

**Fix:** Check that `API_BASE_URL` is defined in `view-tutor-db-loader.js`:
```javascript
const API_BASE_URL = 'http://localhost:8000';
```

---

### 5. **Database Connection Issue**
**Symptom:** Backend returns 500 error
**Check:** Backend terminal shows database error

**Fix:**
```bash
# Test database connection
cd astegni-backend
python test_connection.py

# If connection fails, check .env file
cat .env | grep DATABASE_URL
```

---

## Step-by-Step Debugging Process

### Step 1: Open Browser DevTools
1. Open `view-tutor.html?id=1` in browser
2. Press **F12** to open DevTools
3. Go to **Console** tab

### Step 2: Check Initialization
Look for this message:
```
🚀 Initializing View Tutor DB Loader for tutor ID: 1
```

**If missing:** Script didn't load → Check script tag in HTML

### Step 3: Check API Call
Look for this message:
```
✓ Profile loaded: {full_name: "...", username: "..."}
```

**If missing:** API call failed → Check:
1. Network tab for failed request
2. Backend terminal for errors
3. Response status (404, 500, CORS error)

### Step 4: Check DOM Update
Look at the `<h1 id="tutorName">` element:
1. Right-click on the name area
2. Select "Inspect Element"
3. Check if innerHTML was updated

**If empty:** `populateProfileHeader()` failed → Check:
1. If `profile` object exists
2. If `full_name` field is populated
3. Console errors

---

## Quick Fix Checklist

Run these commands in order:

```bash
# 1. Start backend
cd astegni-backend
python app.py
# Should show: INFO:     Uvicorn running on http://localhost:8000

# 2. Test API endpoint (in new terminal)
curl http://localhost:8000/api/view-tutor/1
# Should return JSON with tutor data

# 3. Start frontend (in new terminal)
cd ..
python -m http.server 8080
# Should show: Serving HTTP on 0.0.0.0 port 8080

# 4. Open in browser
# http://localhost:8080/view-profiles/view-tutor.html?id=1

# 5. Check browser console (F12)
# Should see: "🚀 Initializing View Tutor DB Loader for tutor ID: 1"
# Should see: "✓ Profile loaded: ..."
```

---

## Expected Console Output (Success)

```
🚀 Initializing View Tutor DB Loader for tutor ID: 1
🔄 Loading tutor profile from database...
✓ Profile loaded: {full_name: "Abebe Kebede Tesfaye", username: "abebe_kebede", ...}
✓ Loaded 5 reviews
✓ Loaded 3 achievements
✓ Loaded 2 certificates
✓ Loaded 1 experience records
✓ Loaded 0 videos
✓ Loaded 4 packages
✓ Loaded week availability
✅ All data loaded successfully!
```

---

## Testing from find-tutors.html

1. **Open find-tutors page:**
   ```
   http://localhost:8080/branch/find-tutors.html
   ```

2. **Click "View Profile" on any tutor card**
   - Should open in new tab
   - URL should be: `/view-profiles/view-tutor.html?id=X`
   - Profile header should load within 1-2 seconds

3. **If it doesn't work:**
   - Check the tutor card has a valid ID
   - Check browser console in the NEW tab (not the find-tutors tab)
   - Verify backend is running

---

## Common Mistakes

### ❌ Wrong: Opening file directly
```
file:///C:/Users/.../view-tutor.html?id=1
```
**Problem:** CORS doesn't work with `file://` protocol

### ✅ Correct: Opening via HTTP server
```
http://localhost:8080/view-profiles/view-tutor.html?id=1
```

---

### ❌ Wrong: Backend not running
Browser console shows:
```
Failed to fetch
net::ERR_CONNECTION_REFUSED
```

### ✅ Correct: Backend running
Backend terminal shows:
```
INFO:     127.0.0.1:XXXXX - "GET /api/view-tutor/1 HTTP/1.1" 200 OK
```

---

## Still Not Working?

### Full Reset Procedure

```bash
# 1. Stop all servers
# Press Ctrl+C in all terminal windows

# 2. Clear browser cache
# Chrome: Ctrl+Shift+Delete → Clear cache
# Or use Incognito mode: Ctrl+Shift+N

# 3. Restart backend
cd astegni-backend
python app.py

# 4. Restart frontend (new terminal)
cd ..
python -m http.server 8080

# 5. Test API directly
curl http://localhost:8000/api/view-tutor/1

# 6. Open in browser (Incognito)
# http://localhost:8080/view-profiles/view-tutor.html?id=1

# 7. Open DevTools BEFORE clicking
# Press F12 first, then navigate

# 8. Watch console output
```

---

## Database Verification

Check if tutor profiles exist:

```bash
cd astegni-backend
python -c "
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

# Check tutor profiles table
cur.execute('''
    SELECT
        tp.id,
        tp.username,
        u.first_name,
        u.father_name,
        u.grandfather_name
    FROM tutor_profiles tp
    JOIN users u ON tp.user_id = u.id
    LIMIT 5
''')

print('Tutor Profiles in Database:')
print('-' * 80)
for row in cur.fetchall():
    full_name = f\"{row[2] or ''} {row[3] or ''} {row[4] or ''}\".strip()
    print(f'ID: {row[0]:3d} | Username: {row[1]:20s} | Name: {full_name}')

conn.close()
"
```

If no results, seed data:
```bash
python seed_tutor_data.py
```

---

## Contact Information

If none of these solutions work, provide:
1. Browser console screenshot (F12 → Console tab)
2. Backend terminal output
3. Network tab screenshot (F12 → Network tab)
4. The exact URL you're using
