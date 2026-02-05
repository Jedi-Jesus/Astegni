# 🧪 Test Location Filter Fix

## Quick Start

### Step 1: Start Servers (If Not Running)

```bash
# Backend (Terminal 1)
cd astegni-backend
python app.py

# Frontend (Terminal 2)
cd ..
python dev-server.py
```

**Check servers are running:**
- Backend: http://localhost:8000/docs
- Frontend: http://localhost:8081

---

## Test Method 1: Visual Test on Find Tutors Page

### Steps:

1. **Open find-tutors page:**
   ```
   http://localhost:8081/branch/find-tutors.html
   ```

2. **Open DevTools Console** (F12)

3. **Login:**
   - Email: `jediael.s.abebe@gmail.com`
   - Password: `@JesusJediael1234`

4. **Check the Location Filter dropdown** (in filters section on left side)

### ✅ Expected Result:

**Location Filter dropdown should show:**
```
All Locations
In Ethiopia (Country)
In Addis Ababa (City)
In Yeka (Sub-city/District)
In Megenagna (Neighborhood)
```

**Console should show:**
```
[LocationFilter] 🔍 INITIALIZING LOCATION FILTER
[LocationFilter] 📍 Final user location: Megenagna, Yeka, Addis Ababa, Ethiopia
[LocationFilter] ✅ Added country option
[LocationFilter] ✅ Added city option
[LocationFilter] ✅ Added sub-city option
[LocationFilter] ✅ Added neighborhood option
[LocationFilter] 🎉 Populated dropdown with 4 options
[LocationFilter] ✅ Initialization complete
```

### ❌ If Still Broken:

**Dropdown shows only:**
```
All Locations
Ethiopia
```

**Console shows:**
```
[LocationFilter] ❌ No user location found
```

**Fix:**
1. Check console for errors
2. Run: `LocationFilterManager.refresh()`
3. Check: `await LocationFilterManager.getUserLocation()`
4. If null, user doesn't have location in database

---

## Test Method 2: Interactive Debug Tool

### Steps:

1. **Open debug tool:**
   ```
   http://localhost:8081/test-location-filter-debug.html
   ```

2. **Login** (if not already logged in)

3. **Click "Run All Tests" button**

### ✅ Expected Result:

All 4 tests should show **✅ PASS**:

```
✅ localStorage - Location found: Megenagna, Yeka, Addis Ababa, Ethiopia
✅ API Call - Location: Megenagna, Yeka, Addis Ababa, Ethiopia
✅ Location Parsing - All test cases passed
✅ Filter Population - 5 options added
```

**Debug Log should show:**
```
[DEBUG] 🚀 RUNNING ALL TESTS
[DEBUG] ✅ Found user: Jediael
[DEBUG] ✅ Location found in localStorage: Megenagna, Yeka, Addis Ababa, Ethiopia
[DEBUG] ✅ API Response received
[DEBUG] ✅ Location found in API: Megenagna, Yeka, Addis Ababa, Ethiopia
[DEBUG] ✅ All location parsing tests passed
[DEBUG] ✅ Populated 5 options
[DEBUG] Summary: 4 passed, 0 failed
```

### ❌ If Tests Fail:

Check which test failed and review the debug log for details.

---

## Test Method 3: Console Commands

### Steps:

1. Open find-tutors page and login
2. Open Console (F12)
3. Run these commands:

```javascript
// 1. Check if initialized
LocationFilterManager.initialized
// Expected: true

// 2. Get user location
await LocationFilterManager.getUserLocation()
// Expected: "Megenagna, Yeka, Addis Ababa, Ethiopia"

// 3. Check dropdown
document.getElementById('locationFilter').options.length
// Expected: 5

// 4. List all options
Array.from(document.getElementById('locationFilter').options).map(o => o.text)
// Expected: ["All Locations", "In Ethiopia (Country)", "In Addis Ababa (City)", ...]

// 5. Force refresh
LocationFilterManager.refresh()
// Should re-populate dropdown
```

---

## Troubleshooting

### Issue 1: "No user location found"

**Check localStorage:**
```javascript
JSON.parse(localStorage.getItem('currentUser')).location
```

**If null/undefined, check API:**
```javascript
fetch('http://localhost:8000/api/me', {
  headers: {'Authorization': `Bearer ${localStorage.getItem('access_token')}`}
})
.then(r => r.json())
.then(d => console.log('API location:', d.location))
```

**If API also returns null:**
User doesn't have location in database. Set it:

```bash
cd astegni-backend
python -c "
from models import SessionLocal, User
db = SessionLocal()
user = db.query(User).filter(User.email == 'jediael.s.abebe@gmail.com').first()
user.location = 'Megenagna, Yeka, Addis Ababa, Ethiopia'
db.commit()
print('Location set!')
db.close()
"
```

Then logout and login again.

### Issue 2: Dropdown shows "All Locations" only (no default Ethiopia)

This means the filter is stuck in initialization. Try:

```javascript
LocationFilterManager.initialized = false
LocationFilterManager.retryCount = 0
await LocationFilterManager.init()
```

### Issue 3: Console shows errors

Common errors:

**"Location filter dropdown not found in DOM!"**
- Element ID mismatch
- Check: `document.getElementById('locationFilter')`
- Should not be null

**"API call failed: 401"**
- Token expired
- Logout and login again

**"No token available"**
- Not logged in
- Login first

---

## What Changed?

### Before (Broken):
```javascript
// Single 1-second retry
setTimeout(() => LocationFilterManager.init(), 1000);

// Only checked localStorage
const userStr = localStorage.getItem('currentUser');
if (!userStr || !user.location) {
    return null; // Give up
}
```

### After (Fixed):
```javascript
// Exponential backoff (1s, 2s, 4s, 8s, 16s)
const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
setTimeout(() => this.init(), delay);

// Multiple sources + API fallback
1. localStorage.getItem('currentUser')
2. window.user
3. window.authManager.user
4. fetch('/api/me') directly ← NEW!

// Periodic checks
setInterval(() => LocationFilterManager.init(), 1000) // for 10 seconds
```

---

## Success Criteria

✅ Location filter populates on page load
✅ Shows 5 options (All + 4 hierarchy levels)
✅ Works after login
✅ Works on page reload
✅ Retries automatically if data not ready
✅ No console errors
✅ Debug logs show success messages

---

## Quick Checklist

- [ ] Backend running (port 8000)
- [ ] Frontend running (port 8081)
- [ ] Logged in as jediael.s.abebe@gmail.com
- [ ] Opened find-tutors page
- [ ] Location dropdown shows 5 options
- [ ] Console shows success logs
- [ ] No errors in console
- [ ] Can select location and filter tutors

---

**Need help?** Check console logs or run the debug tool for detailed diagnostics.
