# Troubleshooting: Tutor Profile Access Issues

## Problem: "Page isn't working" when accessing tutor-profile.html

### Quick Fix Steps

1. **Start Both Servers**
   ```bash
   # Terminal 1 - Backend
   cd astegni-backend
   python app.py

   # Terminal 2 - Frontend
   cd ..
   python -m http.server 8080
   ```

2. **Login First**
   - Navigate to: http://localhost:8080
   - Click "Sign In" or go to: http://localhost:8080/branch/signin.html
   - Use credentials:
     - Email: jediael.s.abebe@gmail.com
     - Password: @JesusJediael1234

3. **After Login, Access Tutor Profile**
   - Go to: http://localhost:8080/profile-pages/tutor-profile.html
   - OR click on your profile icon in the navbar

4. **Test Your Setup**
   - Open: http://localhost:8080/test-tutor-profile-access.html
   - This page will help you diagnose any issues

---

## Common Issues & Solutions

### Issue 1: Backend Not Running
**Symptom:** "Failed to fetch" or API errors in console

**Solution:**
```bash
cd astegni-backend
python app.py
```
Should see: `INFO: Uvicorn running on http://0.0.0.0:8000`

---

### Issue 2: Frontend Server Not Running
**Symptom:** "This site can't be reached" or ERR_CONNECTION_REFUSED

**Solution:**
```bash
python -m http.server 8080
```
Should see: `Serving HTTP on :: port 8080`

---

### Issue 3: Not Logged In
**Symptom:** Redirected to login page or blank page

**Solution:**
1. Open browser console (F12)
2. Go to Application → Local Storage
3. Check if `token` and `user` exist
4. If not, login again

---

### Issue 4: Database Migration Not Run
**Symptom:** API errors about `hero_titles` column

**Solution:**
Already fixed! The database already has `hero_titles` as JSONB array.

To verify:
```bash
cd astegni-backend
python -c "import psycopg; import os; from dotenv import load_dotenv; load_dotenv(); db_url = os.getenv('DATABASE_URL'); conn = psycopg.connect(db_url); cur = conn.cursor(); cur.execute('SELECT hero_titles FROM tutor_profiles LIMIT 1'); print(cur.fetchone())"
```

Should see: `(['Title1', 'Title2'],)` or similar

---

### Issue 5: Modal Not Loading (Edit Profile Modal)
**Symptom:** "Edit Profile" button does nothing or modal doesn't appear

**Solution:**
1. Open browser console (F12)
2. Check for errors like:
   - "Failed to load edit-profile-modal.html"
   - "ModalLoader error"
3. Verify file exists: `modals/tutor-profile/edit-profile-modal.html`
4. Refresh page (Ctrl+F5)

---

### Issue 6: Course Types Not Loading
**Symptom:** Course Type dropdown is empty or shows errors

**Solution:**
1. Test the API endpoint:
   - Open: http://localhost:8000/api/course-types
   - Should return: `{"course_types": ["Academic", "Professional", "Both Academic & Professional"]}`
2. Check backend logs for errors
3. Verify database has course types:
   ```bash
   cd astegni-backend
   python -c "import psycopg; import os; from dotenv import load_dotenv; load_dotenv(); db_url = os.getenv('DATABASE_URL'); conn = psycopg.connect(db_url); cur = conn.cursor(); cur.execute('SELECT DISTINCT course_type FROM tutor_profiles WHERE course_type IS NOT NULL'); print(cur.fetchall())"
   ```

---

### Issue 7: JavaScript Errors in Console
**Symptom:** Red errors in browser console (F12)

**Common Errors & Fixes:**

1. **"Cannot read property 'hero_titles' of undefined"**
   - Profile data not loaded yet
   - Refresh page after login

2. **"fetchCourseTypes is not defined"**
   - Script not loaded properly
   - Check: `js/tutor-profile/edit-profile-modal.js` is included
   - Refresh page (Ctrl+F5)

3. **"CORS policy" errors**
   - Backend CORS misconfigured
   - Check `astegni-backend/app.py modules/config.py`
   - Should allow `http://localhost:8080`

---

## Complete Diagnostic Checklist

Run through this checklist to diagnose issues:

- [ ] Backend server is running (http://localhost:8000)
- [ ] Frontend server is running (http://localhost:8080)
- [ ] Logged in with valid credentials
- [ ] Token exists in localStorage
- [ ] User object exists in localStorage
- [ ] User has "tutor" role
- [ ] Browser console has no red errors
- [ ] `/api/course-types` endpoint works
- [ ] `modals/tutor-profile/edit-profile-modal.html` file exists
- [ ] Database `hero_titles` column is JSONB type

---

## Browser Console Commands

Open browser console (F12) and run these to debug:

```javascript
// Check authentication
console.log('Token:', localStorage.getItem('token'));
console.log('User:', JSON.parse(localStorage.getItem('user') || '{}'));

// Test course types API
fetch('http://localhost:8000/api/course-types')
  .then(r => r.json())
  .then(d => console.log('Course Types:', d))
  .catch(e => console.error('API Error:', e));

// Check if modal loader is initialized
console.log('ModalLoader:', typeof ModalLoader !== 'undefined' ? 'Loaded' : 'Not Loaded');

// Check if edit modal functions exist
console.log('Edit Modal Functions:', {
  openEditProfileModal: typeof window.openEditProfileModal,
  fetchCourseTypes: typeof window.fetchCourseTypes,
  addHeroTitle: typeof window.addHeroTitle
});

// Force reload modals
if (typeof ModalLoader !== 'undefined') {
  ModalLoader.clearCache();
  ModalLoader.preloadAll();
}
```

---

## Testing New Features

### Test 1: Course Types Loading from Database

1. Login as tutor
2. Open Edit Profile modal
3. Check Course Type dropdown
4. Should show options from database (not hardcoded)
5. Open Network tab (F12) → Look for `/api/course-types` request

### Test 2: Multiple Hero Titles

1. Login as tutor
2. Open Edit Profile modal
3. Scroll to "Hero Titles" section
4. Click "+ Add Hero Title" button
5. Should see new input field
6. Add multiple titles
7. Save and verify in database

### Test 3: Fire Streak Widget

1. Login as tutor
2. Look at right sidebar
3. Find "📊 This Week" widget
4. Should see:
   - Sessions Completed progress bar
   - Hours Taught progress bar
   - 🔥 Weekly Streak with 7 days (M-S)
   - Fire emojis for achieved days
   - Gray circles for incomplete days

---

## Still Having Issues?

1. **Clear browser cache:**
   - Press Ctrl+Shift+Delete
   - Clear cached images and files
   - Refresh (Ctrl+F5)

2. **Check file paths:**
   - Ensure all files are in correct locations
   - Paths are case-sensitive on some systems

3. **Restart servers:**
   - Stop both backend and frontend
   - Start backend first, then frontend
   - Wait 5 seconds between each

4. **Check server logs:**
   - Backend logs: Terminal where `python app.py` is running
   - Look for error messages
   - Common errors: database connection, CORS, missing modules

5. **Verify database connection:**
   ```bash
   cd astegni-backend
   python test_connection.py
   ```

---

## Working Configuration

This is a known working setup:

**Backend:**
- Python 3.13
- FastAPI running on http://0.0.0.0:8000
- PostgreSQL database: astegni_db
- Database has `hero_titles` column (JSONB array)

**Frontend:**
- Python http.server on http://localhost:8080
- All modal files in `modals/tutor-profile/`
- JavaScript files in `js/tutor-profile/`

**Login:**
- Email: jediael.s.abebe@gmail.com
- Password: @JesusJediael1234
- User must have "tutor" role

---

## Next Steps After Successful Login

Once you can access tutor-profile.html successfully:

1. Test Edit Profile modal
2. Add multiple hero titles
3. Select course type from database
4. Save changes
5. Verify fire streak widget displays
6. Check weekly goal progress bar is removed

All features should work without errors!

---

**Date:** 2025-11-19
**Status:** ✅ Ready for Testing
