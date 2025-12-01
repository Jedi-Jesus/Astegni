# Authentication Separation Issue - Analysis & Solution

## The Problem

When you log in from index.html and access student-profile.html, it works fine. But when you **reload** student-profile.html, it says you're logged in as an admin. This is because **you have the same email in both the `users` table AND the `admin_profile` table**, and the authentication system is **mixing up the two different authentication systems**.

## Root Cause: Two Separate Authentication Systems

Astegni has **TWO COMPLETELY SEPARATE** authentication systems:

### 1. **User Authentication System** (For Students, Tutors, Parents, etc.)
- **Table:** `users`
- **Login Endpoint:** `POST /api/login`
- **Token Storage:** `localStorage.getItem('token')`
- **User Data:** `localStorage.getItem('currentUser')`
- **Auth Manager:** `js/root/auth.js` (AuthenticationManager class)
- **Token Type:** Contains `role` and `role_ids` (no `type` field)
- **Used By:** Student-profile, Tutor-profile, Parent-profile, User-profile

### 2. **Admin Authentication System** (For Admin Dashboard)
- **Table:** `admin_profile`
- **Login Endpoint:** `POST /api/admin/login`
- **Token Storage:** `localStorage.getItem('adminSession')`
- **Admin Data:** `localStorage.getItem('adminProfile')`
- **Auth Manager:** `js/admin-pages/admin-index.js` (separate admin login)
- **Token Type:** Contains `type: "admin"` and `admin_id` and `departments`
- **Used By:** admin-pages/*.html (all admin dashboard pages)

## Why You're Seeing "Logged in as Admin"

Here's what's happening:

### Scenario 1: Fresh Login from index.html → Works Fine ✅
1. You log in via the regular user login form
2. `POST /api/login` is called → queries `users` table
3. Token is stored in `localStorage.token`
4. User data stored in `localStorage.currentUser`
5. You navigate to student-profile.html
6. **student-profile.html** uses `AuthenticationManager` from `js/root/auth.js`
7. It checks `localStorage.token` → finds your user token
8. Everything works!

### Scenario 2: Direct Access / Reload student-profile.html → Shows Admin ❌
1. You reload the page or directly access student-profile.html
2. The page has **BOTH** tokens in localStorage:
   - `localStorage.token` (user token from `/api/login`)
   - `localStorage.adminSession` (admin token from `/api/admin/login` - if you logged into admin pages before)
3. Some JavaScript code is checking the **WRONG** token
4. It finds the admin token and thinks you're an admin

## The Architecture Issue

Looking at your code structure, there's a **fundamental conflict**:

### Current State (WRONG):
```javascript
// student-profile.html loads:
<script src="../js/root/auth.js"></script>  // User auth system
<script src="../js/admin-pages/shared/sidebar-fix.js"></script>  // Admin code!
<script src="../js/student-profile/init.js"></script>

// init.js checks:
if (!window.AuthManager.isAuthenticated()) {
    alert('Please log in to access your student profile.');
    window.location.href = '../index.html';
    return;
}

// BUT somewhere, admin code is also running and checking adminSession!
```

### What Should Happen (CORRECT):
- **User profile pages** should ONLY check `localStorage.token` and use `AuthenticationManager`
- **Admin pages** should ONLY check `localStorage.adminSession` and use admin auth system
- **NEVER mix the two!**

## The Solution

### Option 1: Clear localStorage Before Login (Quick Fix)
Before logging in as a student, clear all localStorage:
```javascript
// In your login handler
localStorage.clear();  // Clear ALL localStorage (both user and admin tokens)
// Then proceed with login
```

### Option 2: Namespace Separation (Recommended)
Change the storage keys to avoid conflicts:

**User Auth:**
- `localStorage.setItem('user_token', token)`
- `localStorage.setItem('user_data', JSON.stringify(user))`

**Admin Auth:**
- `localStorage.setItem('admin_token', token)`
- `localStorage.setItem('admin_data', JSON.stringify(admin))`

### Option 3: Complete Separation (Best Practice)
Based on CLAUDE.md principles, you should have **completely separate authentication flows**:

#### For Users (students, tutors, parents):
1. **Login URL:** `index.html` → uses `/api/login`
2. **Profile Pages:** `profile-pages/student-profile.html`, `profile-pages/tutor-profile.html`, etc.
3. **Auth System:** `js/root/auth.js` (AuthenticationManager)
4. **Storage Keys:** `token`, `currentUser`, `refreshToken`
5. **NO ADMIN CODE** should be loaded on these pages!

#### For Admins:
1. **Login URL:** `admin-pages/admin-index.html` → uses `/api/admin/login`
2. **Profile Pages:** `admin-pages/*.html` (all admin pages)
3. **Auth System:** `admin-pages/admin-index.js` (admin login handler)
4. **Storage Keys:** `adminSession`, `adminProfile`, `adminId`, `adminEmail`
5. **NO USER AUTH CODE** should be loaded on these pages!

## Immediate Fix for student-profile.html

Remove admin-related scripts from student-profile.html:

### Current (WRONG):
```html
<!-- Line 5482: WHY IS THIS HERE?! -->
<script src="../js/admin-pages/shared/sidebar-fix.js"></script>

<!-- Line 5557: DUPLICATE AND WRONG! -->
<script src="../js/admin-pages/shared/sidebar-fix.js"></script>
```

### Fixed (CORRECT):
```html
<!-- Remove ALL admin-pages scripts from student-profile.html -->
<!-- Students should NOT have ANY admin code running! -->
```

## Database Structure Clarification

You have **TWO SEPARATE TABLES** for authentication:

### `users` table (Regular Users)
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,  -- Can be the same email as admin!
    password_hash VARCHAR(255),
    roles JSONB,  -- ["student", "tutor", "parent"]
    active_role VARCHAR(50),
    -- ... other user fields
);
```

### `admin_profile` table (Admin Users)
```sql
CREATE TABLE admin_profile (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,  -- Can be the same email as users!
    password_hash VARCHAR(255),
    departments TEXT[],  -- ["manage-courses", "manage-tutors"]
    -- ... other admin fields
);
```

**IMPORTANT:** You can have `john@example.com` in BOTH tables! They are separate accounts:
- `users.email = 'john@example.com'` → Student/Tutor account (uses `/api/login`)
- `admin_profile.email = 'john@example.com'` → Admin account (uses `/api/admin/login`)

## Why This Separation Exists

According to CLAUDE.md, this is **by design**:

> **User-Admin Separation Guide:**
> - Users table: Multi-role authentication with JSON roles field (student, tutor, parent, advertiser, institute)
> - Admin_profile table: Department-based access control for admin dashboard
> - **These are completely separate authentication systems**

The separation exists because:
1. **Different permissions:** Users have roles (student/tutor/parent), Admins have departments
2. **Different UIs:** User profiles vs Admin dashboard
3. **Security:** Admin access should be completely isolated from regular users
4. **Scalability:** Admin system can be managed independently

## How to Test the Fix

### Step 1: Clear localStorage
```javascript
// Open browser console on student-profile.html
localStorage.clear();
```

### Step 2: Log in ONLY as a user
1. Go to `index.html`
2. Log in with your **user credentials** (uses `/api/login`)
3. Navigate to student-profile.html
4. Should work!

### Step 3: Verify authentication
```javascript
// Open browser console on student-profile.html
console.log('User token:', localStorage.getItem('token'));
console.log('User data:', localStorage.getItem('currentUser'));
console.log('Admin session:', localStorage.getItem('adminSession'));  // Should be null!
```

### Step 4: Log in as admin (separate)
1. Go to `admin-pages/admin-index.html`
2. Log in with your **admin credentials** (uses `/api/admin/login`)
3. Access admin pages
4. Should work!

## Code Changes Required

### 1. Remove admin scripts from student-profile.html

**File:** `profile-pages/student-profile.html`

Remove these lines:
```html
<!-- Line 5482 -->
<script src="../js/admin-pages/shared/sidebar-fix.js"></script>

<!-- Line 5557 (duplicate) -->
<script src="../js/admin-pages/shared/sidebar-fix.js"></script>
```

### 2. Update init.js to ONLY check user auth

**File:** `js/student-profile/init.js`

Current code is already correct! It only checks user auth:
```javascript
// Check if user is authenticated
if (!window.AuthManager.isAuthenticated()) {
    console.warn('⚠️ User not authenticated. Redirecting to login...');
    alert('Please log in to access your student profile.');
    window.location.href = '../index.html';
    return;
}

// Check if user has student role
const userRole = window.AuthManager.getUserRole();
if (userRole !== 'student') {
    console.warn(`⚠️ User role is '${userRole}', not 'student'. Redirecting...`);
    alert(`This page is for students only. Your current role is: ${userRole}`);
    window.location.href = '../index.html';
    return;
}
```

**This is perfect!** Don't change it.

### 3. Ensure AuthenticationManager ONLY checks user tokens

**File:** `js/root/auth.js`

The `restoreSession()` method should ONLY check user tokens:
```javascript
async restoreSession() {
    const token = localStorage.getItem('token');  // User token only!
    const user = localStorage.getItem('currentUser');  // User data only!

    // DO NOT check adminSession here!

    if (token && user) {
        this.token = token;
        this.user = JSON.parse(user);
        // ... rest of code
    }
}
```

**This is already correct!** Don't change it.

## Summary

### The Problem:
- Same email in both `users` and `admin_profile` tables
- Two separate auth systems (user vs admin)
- Student-profile.html is accidentally loading admin scripts
- localStorage contains BOTH user and admin tokens

### The Solution:
1. **Remove admin scripts** from student-profile.html
2. **Keep auth systems separate** - user pages use `AuthenticationManager`, admin pages use `adminSession`
3. **Clear localStorage** when switching between user and admin accounts
4. **Never mix the two systems!**

### Key Takeaway:
**Users and Admins are COMPLETELY SEPARATE authentication systems.** They use different tables, different endpoints, different tokens, and different localStorage keys. Student-profile.html should NEVER load admin code, and admin pages should NEVER load user auth code.

## Next Steps

1. Remove the admin script tags from student-profile.html
2. Test by clearing localStorage and logging in fresh
3. If you need to switch between user and admin:
   - Log out completely (clear localStorage)
   - Log back in with the correct credentials for the correct system
4. Consider creating a "Switch Account Type" button that clears localStorage and redirects to the appropriate login page

## Reference

- **User Login:** `POST /api/login` → queries `users` table
- **Admin Login:** `POST /api/admin/login` → queries `admin_profile` table
- **User Auth Code:** `js/root/auth.js`
- **Admin Auth Code:** `js/admin-pages/admin-index.js`
- **User Storage:** `token`, `currentUser`
- **Admin Storage:** `adminSession`, `adminProfile`
