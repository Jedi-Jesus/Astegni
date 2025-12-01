# Clear Cache and Test - Manage Tutor Documents

## The Issue

The browser is caching the old JavaScript files with the duplicate declarations. Even though we've fixed the code, the browser is still loading the old cached versions.

## Solution: Hard Refresh

### Method 1: Keyboard Shortcut (RECOMMENDED)
```
Windows/Linux: Ctrl + Shift + R
OR
Ctrl + F5

Mac: Command + Shift + R
```

### Method 2: Developer Tools
1. Open Developer Tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Method 3: Clear All Cache
1. Press `Ctrl + Shift + Delete`
2. Select "Cached images and files"
3. Select "All time"
4. Click "Clear data"
5. Refresh the page normally (F5)

## After Clearing Cache

### Expected Console Output (Success):
```
✓ Admin email set from currentUser: admin@astegni.et
✓ Profile header updated successfully
✓ Manage Tutors Data module loaded - functions ready
✓ Manage Tutors Complete module loaded
✓ Starting tutor management initialization...
✓ Manage Tutors - Standalone Navigation Initialized
✓ Panel switching listeners initialized
```

### Errors Should Be GONE:
```
❌ Identifier 'API_BASE_URL' has already been declared  <- SHOULD BE GONE
❌ Identifier 'formatDate' has already been declared    <- SHOULD BE GONE
```

## If Errors Persist After Hard Refresh

### Check 1: Verify Files Were Updated
Open Developer Tools → Sources → Check these files:
- `js/admin-pages/tutor-review.js` - Line 7 should say `window.API_BASE_URL`
- `js/admin-pages/manage-tutors.js` - Line 21 should say `window.API_BASE_URL`
- `js/admin-pages/manage-tutors-data.js` - Line 622 should say `window.formatDate`

### Check 2: Disable Cache in DevTools
1. Open Developer Tools (F12)
2. Go to Network tab
3. Check "Disable cache" checkbox
4. Keep DevTools open
5. Refresh page (F5)

### Check 3: Try Incognito/Private Mode
```
Ctrl + Shift + N (Chrome/Edge)
Ctrl + Shift + P (Firefox)
```
Navigate to: `http://localhost:8080/admin-pages/manage-tutor-documents.html`

## Fixing the 401 Unauthorized Errors

The 401 errors are because you don't have a valid authentication token. Here's how to fix:

### Quick Fix: Set Test Credentials

Open Browser Console and run:
```javascript
// Set a test admin email
localStorage.setItem('adminEmail', 'test@astegni.et');

// You need a real token from your backend
// Login first or get a token from the backend
```

### Proper Fix: Login First

1. **Create a test admin** (run in backend directory):
   ```bash
   cd astegni-backend
   python test_manage_tutor_documents_access.py
   # Type 'y' when prompted to create test admin
   ```

2. **Add admin login endpoint** or manually create an admin:
   ```sql
   -- In PostgreSQL:
   INSERT INTO admin_profile (email, first_name, father_name, departments, username)
   VALUES ('test@astegni.et', 'Test', 'Admin', ARRAY['manage-tutor'], 'testadmin')
   RETURNING id;

   -- Use the returned ID in the next query
   INSERT INTO manage_tutors_profile (admin_id, position)
   VALUES (1, 'Tutor Management Specialist');
   ```

3. **Login through your admin login page** to get a valid token

4. **Verify token is set**:
   ```javascript
   // In browser console:
   console.log(localStorage.getItem('token'));
   console.log(localStorage.getItem('adminEmail'));
   ```

## Complete Test Sequence

### Step 1: Clear Cache
```
Ctrl + Shift + Delete → Clear "Cached images and files" → "All time"
```

### Step 2: Close All Browser Windows
Completely close and reopen your browser.

### Step 3: Start Backend
```bash
cd astegni-backend
python app.py
```

### Step 4: Login or Set Test Data
**Option A - Login** (if you have admin login page):
- Go to admin login page
- Login with credentials
- Navigate to manage-tutor-documents

**Option B - Manual** (for testing):
```javascript
// In browser console on http://localhost:8080
localStorage.setItem('adminEmail', 'test@astegni.et');
localStorage.setItem('token', 'YOUR_JWT_TOKEN_HERE');
```

### Step 5: Navigate to Page
```
http://localhost:8080/admin-pages/manage-tutor-documents.html
```

### Step 6: Check Console
Press F12 and look for:
```
✓ No duplicate declaration errors
✓ Admin email set from currentUser
✓ Profile header updated successfully
```

## Verification Checklist

- [ ] Hard refresh performed (Ctrl + Shift + R)
- [ ] Cache cleared (Ctrl + Shift + Delete)
- [ ] Backend server is running (`python app.py`)
- [ ] No duplicate declaration errors in console
- [ ] `adminEmail` is set in localStorage
- [ ] `token` is set in localStorage
- [ ] Profile header displays admin name
- [ ] No 401 errors (if token is valid)

## Common Issues

### Issue: Still seeing duplicate declaration errors
**Solution**:
1. Close ALL browser tabs/windows
2. Clear cache completely
3. Reopen browser
4. Navigate directly to page

### Issue: adminEmail is null
**Solution**:
```javascript
// Set manually:
localStorage.setItem('adminEmail', 'your@email.com');
```

### Issue: 401 errors everywhere
**Solution**: You need a valid authentication token. Either:
- Login through admin login page
- Get a token from backend manually
- Create an admin and login

### Issue: Page won't load at all
**Solution**:
1. Check backend is running: `http://localhost:8000/docs`
2. Check frontend is served: `http://localhost:8080`
3. Check browser console for actual error

## Debug Commands

### Check what's in localStorage:
```javascript
console.log('All localStorage:', { ...localStorage });
console.log('Token:', localStorage.getItem('token'));
console.log('Email:', localStorage.getItem('adminEmail'));
console.log('User:', JSON.parse(localStorage.getItem('currentUser') || '{}'));
```

### Check if files are cached:
```javascript
// In console, check the timestamp of loaded files
performance.getEntriesByType('resource')
    .filter(r => r.name.includes('.js'))
    .forEach(r => console.log(r.name, new Date(r.fetchStart)));
```

### Force reload specific script:
```javascript
// Remove and re-add script tag
const oldScript = document.querySelector('script[src="../js/admin-pages/tutor-review.js"]');
if (oldScript) {
    oldScript.remove();
    const newScript = document.createElement('script');
    newScript.src = '../js/admin-pages/tutor-review.js?v=' + Date.now();
    document.body.appendChild(newScript);
}
```

---

**TL;DR**: Press `Ctrl + Shift + R` to hard refresh, then reload the page. The duplicate declaration errors should be gone!
