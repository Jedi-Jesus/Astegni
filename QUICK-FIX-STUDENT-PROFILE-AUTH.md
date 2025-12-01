# Quick Fix: Student Profile Authentication Issue

## What Was Fixed

Removed **admin-related scripts** from `student-profile.html` that were causing authentication confusion.

### Changes Made:

**File:** `profile-pages/student-profile.html`

Removed these two lines:
```html
<!-- Line 5482 - REMOVED -->
<script src="../js/admin-pages/shared/sidebar-fix.js"></script>

<!-- Line 5557 - REMOVED (duplicate) -->
<script src="../js/admin-pages/shared/sidebar-fix.js"></script>
```

## Why This Fixes the Issue

**The Problem:**
- You have the same email in both `users` table (for students) and `admin_profile` table (for admins)
- These are **two completely separate authentication systems**
- Student-profile.html was accidentally loading admin scripts
- This caused the page to check the admin token instead of the user token

**The Solution:**
- Removed all admin scripts from student-profile.html
- Now the page ONLY checks user authentication (from `localStorage.token`)
- Admin authentication (from `localStorage.adminSession`) is no longer checked

## How to Test

### Step 1: Clear Your Browser Cache
Open browser console (F12) and run:
```javascript
localStorage.clear();
```

### Step 2: Log In as a User
1. Go to `http://localhost:8080/index.html`
2. Click "Login" and use your **user credentials** (not admin credentials)
3. System will call `POST /api/login` (queries `users` table)

### Step 3: Access Student Profile
1. Navigate to `http://localhost:8080/profile-pages/student-profile.html`
2. Should work without showing "logged in as admin" message
3. Reload the page → should still work!

### Step 4: Verify in Console
Open browser console and check:
```javascript
console.log('User token:', localStorage.getItem('token'));  // Should have a value
console.log('User data:', localStorage.getItem('currentUser'));  // Should have user data
console.log('Admin session:', localStorage.getItem('adminSession'));  // Should be null
```

## Two Separate Authentication Systems

### User Authentication (Students, Tutors, Parents)
- **Login Page:** `index.html`
- **Endpoint:** `POST /api/login`
- **Database Table:** `users`
- **Token Storage:** `localStorage.token`
- **Auth Manager:** `js/root/auth.js` (AuthenticationManager)
- **Pages:** `profile-pages/student-profile.html`, `profile-pages/tutor-profile.html`, etc.

### Admin Authentication (Admin Dashboard)
- **Login Page:** `admin-pages/admin-index.html`
- **Endpoint:** `POST /api/admin/login`
- **Database Table:** `admin_profile`
- **Token Storage:** `localStorage.adminSession`
- **Auth Manager:** `js/admin-pages/admin-index.js`
- **Pages:** `admin-pages/*.html` (all admin pages)

## Important Notes

### Same Email, Different Accounts
You can have the same email in BOTH tables:
- `users.email = 'john@example.com'` → Student/Tutor account
- `admin_profile.email = 'john@example.com'` → Admin account

**These are completely separate!** They use different:
- Database tables
- Login endpoints
- Authentication tokens
- localStorage keys

### Switching Between User and Admin

If you need to switch between user mode and admin mode:

1. **Log out completely:**
   ```javascript
   localStorage.clear();
   ```

2. **Log in to the system you need:**
   - For student/tutor: Go to `index.html` → login → use student-profile.html
   - For admin: Go to `admin-pages/admin-index.html` → login → use admin pages

## Troubleshooting

### Still seeing "logged in as admin"?
1. Clear localStorage: `localStorage.clear()`
2. Close ALL browser tabs for the site
3. Open a fresh tab
4. Log in again from `index.html`

### Can't access admin pages?
1. Make sure you're logging in through `admin-pages/admin-index.html`
2. Use your admin credentials (from `admin_profile` table)
3. This uses `POST /api/admin/login` endpoint

### Token confusion?
Check which tokens you have:
```javascript
console.log('Tokens:', {
    user_token: localStorage.getItem('token'),
    admin_session: localStorage.getItem('adminSession')
});
```

Only ONE should have a value depending on which system you're using.

## Summary

✅ **Fixed:** Removed admin scripts from student-profile.html
✅ **Result:** Student profile now only checks user authentication
✅ **Next:** Clear localStorage and test the fix
✅ **Remember:** Users and Admins are separate authentication systems - don't mix them!

## For More Details

See [AUTHENTICATION-SEPARATION-ISSUE.md](./AUTHENTICATION-SEPARATION-ISSUE.md) for complete analysis.
