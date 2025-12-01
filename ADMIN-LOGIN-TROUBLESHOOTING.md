# Admin Login Troubleshooting Guide

## Issue: "Can't login from admin-index.html - there is nothing"

This guide will help you diagnose and fix the admin login issue.

## Quick Diagnosis Steps

### Step 1: Check if Backend is Running

Open a new terminal and check if the backend is running:

```bash
curl http://localhost:8000/api/admin/login
```

**Expected response:** Method not allowed or similar (the endpoint exists)
**If connection refused:** Backend is not running - start it with:
```bash
cd astegni-backend
uvicorn app:app --reload
```

### Step 2: Test Login with Debug Tool

1. Open `http://localhost:8080/test-admin-login-debug.html`
2. Enter your credentials
3. Click "Login"
4. **Check the debug log** - it will show you exactly what's happening

### Step 3: Check Browser Console

1. Open admin-index.html: `http://localhost:8080/admin-pages/admin-index.html`
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Try to login
5. Look for any **red error messages**

## Common Issues & Solutions

### Issue 1: Modal Not Opening

**Symptom:** Click "Login" button, nothing happens

**Check:**
1. Open browser console (F12)
2. Look for JavaScript errors
3. Check if `openLoginModal` function is defined

**Solution:**
The login form is in a modal. Check if the modal HTML exists:

```html
<div id="auth-modal" class="modal-overlay">
```

If modal exists but doesn't open, check CSS:
- Modal might have `display: none` and not being changed to `display: block`
- Check `js/auth.js` for `openLoginModal()` function

### Issue 2: Form Submits But Nothing Happens

**Symptom:** Click "Login to Dashboard" button, form submits, but no feedback

**Possible Causes:**
1. JavaScript error preventing execution
2. API call failing silently
3. Network error

**Debug:**
1. Open Network tab in Developer Tools
2. Try to login
3. Look for a POST request to `/api/admin/login`
4. Check the response

### Issue 3: CORS Error

**Symptom:** Console shows error like:
```
Access to fetch at 'http://localhost:8000/api/admin/login' from origin 'http://localhost:8080' has been blocked by CORS policy
```

**Solution:**
Backend CORS configuration issue. Check `astegni-backend/app.py modules/config.py`:

```python
# Should have localhost:8080 in allowed origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080"],
    # ...
)
```

### Issue 4: Wrong Credentials

**Symptom:** Error message "Invalid email or password"

**Solution:**
1. Make sure you have an admin account in the database
2. Check the test-admin-login.html page which has a default email
3. Create a new admin account or reset password

**To create an admin account:**
```bash
cd astegni-backend
python create_admin.py
```

### Issue 5: Backend Not Returning Success

**Symptom:** Login request goes through but returns error

**Check Backend Response:**
1. Look at the Network tab
2. Click on the `/api/admin/login` request
3. Check the **Response** tab
4. Look for error messages

**Common backend errors:**
- `"Account not verified"` - Admin account needs OTP verification
- `"Invalid email or password"` - Wrong credentials
- `500 Internal Server Error` - Database or backend issue

### Issue 6: JavaScript Not Loading

**Symptom:** Nothing happens when clicking login, no errors in console

**Check:**
1. View page source
2. Look for script tags at the bottom:
```html
<script src="js/theme-toggle.js"></script>
<script src="js/auth.js"></script>
<script src="js/neural-network.js"></script>
<script src="js/dashboard.js"></script>
```

3. Click each script link - should load the file
4. If 404 errors, check file paths are correct

### Issue 7: CSS Files Not Loading

**Symptom:** Page looks broken, unstyled

**Check:**
1. Developer Tools > Network tab
2. Look for red 404 errors for CSS files
3. Check paths in HTML:
```html
<link rel="stylesheet" href="css/dashboard.css">
```

4. Make sure files exist at those paths

## Detailed Debugging Process

### Use the Debug Tool

I created a simple debug page for you:

**File:** `test-admin-login-debug.html`

**How to use:**
1. Open `http://localhost:8080/test-admin-login-debug.html`
2. The email field is pre-filled with `jediael.s.abebe@gmail.com`
3. Enter your password
4. Click "Login"
5. Watch the **Debug Log** section

**What it shows:**
- API URL being called
- Request details
- Response status code
- Response data
- Token saved to localStorage
- Any errors that occur

**Example successful output:**
```
[10:30:15] Starting login attempt...
[10:30:15] Email: jediael.s.abebe@gmail.com
[10:30:15] API URL: http://localhost:8000/api/admin/login
[10:30:15] Sending POST request...
[10:30:16] Response status: 200 OK
[10:30:16] Response data: {"success": true, "admin_id": 4, ...}
[10:30:16] ✅ Login successful!
[10:30:16] Admin ID: 4
[10:30:16] Name: System Setting Admin
[10:30:16] Email: jediael.s.abebe@gmail.com
[10:30:16] Token: eyJhbGciOiJIUzI1NiIsInR5...
[10:30:16] Token saved to localStorage
[10:30:16] You can now go to admin-index.html
```

### Check Browser Console Errors

Common errors and what they mean:

1. **`Uncaught ReferenceError: handleLogin is not defined`**
   - The auth.js file didn't load
   - Check script tag path

2. **`Uncaught TypeError: Cannot read property 'value' of null`**
   - Form element with that ID doesn't exist
   - Check HTML form IDs match JavaScript

3. **`Failed to fetch`**
   - Backend not running
   - Wrong API URL
   - Network issue

4. **`NetworkError when attempting to fetch resource`**
   - CORS issue
   - Backend not responding
   - Firewall blocking request

### Check Backend Logs

When you try to login, check the backend terminal for logs:

**Expected successful login:**
```
INFO:     127.0.0.1:xxxxx - "POST /api/admin/login HTTP/1.1" 200 OK
```

**Expected failed login (wrong password):**
```
INFO:     127.0.0.1:xxxxx - "POST /api/admin/login HTTP/1.1" 401 Unauthorized
```

**Backend not receiving request:**
```
(No log appears)
```
This means frontend isn't sending the request - likely CORS or network issue.

## Testing Credentials

### Default Test Admin

If you ran the seed scripts, you should have these test admins:

**Email:** `jediael.s.abebe@gmail.com`
**Password:** (The one you set when creating the admin)

### Create a New Admin Account

```bash
cd astegni-backend
python create_admin.py
```

Follow the prompts to create a new admin account.

### Reset Admin Password

If you have database access:

```bash
cd astegni-backend
python set_test_admin_password.py
```

## Step-by-Step Testing

1. **Backend Check:**
   ```bash
   # Terminal 1
   cd astegni-backend
   uvicorn app:app --reload
   # Wait for "Application startup complete"
   ```

2. **Frontend Check:**
   ```bash
   # Terminal 2
   cd Astegni-v-1.1
   python -m http.server 8080
   ```

3. **Test with Debug Tool:**
   - Open: `http://localhost:8080/test-admin-login-debug.html`
   - Enter credentials
   - Click Login
   - Read the debug log

4. **If debug tool works:**
   - The backend is working
   - Credentials are correct
   - Problem is with admin-index.html frontend

5. **If debug tool fails:**
   - Check the error in debug log
   - Fix backend/credentials
   - Try again

## Browser Console Debugging

Add this to check if functions are loaded:

Press F12, go to Console tab, type:

```javascript
// Check if functions exist
typeof handleLogin
// Should return: "function"

typeof openLoginModal
// Should return: "function"

// Check if modal exists
document.getElementById('auth-modal')
// Should return: <div id="auth-modal" ...>

// Try opening modal manually
openLoginModal()
// Should show the login modal
```

## Final Checklist

- [ ] Backend is running on http://localhost:8000
- [ ] Frontend is running on http://localhost:8080
- [ ] No CORS errors in console
- [ ] auth.js file is loading (check Network tab)
- [ ] Modal HTML exists in admin-index.html
- [ ] handleLogin function is defined
- [ ] You have valid admin credentials
- [ ] Admin account is verified (is_otp_verified = true)

## Get More Help

If still not working after all these steps:

1. Take a screenshot of:
   - Browser console (F12 > Console tab)
   - Network tab showing the login request
   - Backend terminal logs

2. Note exactly what happens:
   - Do you see the login modal?
   - Can you type in the form?
   - What happens when you click submit?
   - Any error messages?

3. Use the test-admin-login-debug.html tool and copy the entire debug log output

## Quick Fix: Use the Working Test Page

If admin-index.html still doesn't work, you can use the simpler test-admin-login.html:

1. Login via: `http://localhost:8080/test-admin-login.html`
2. After successful login, go to: `http://localhost:8080/admin-pages/manage-tutor-documents.html`
3. You'll already be logged in

This bypasses the admin-index.html page entirely while we debug it.
