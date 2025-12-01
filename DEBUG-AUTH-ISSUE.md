# Debug Authentication Issue - User vs Admin Confusion

## The Problem

When you:
1. Login from index.html
2. Choose "Student" role
3. Access student-profile.html ✅ **Works**
4. Reload the page ❌ **Says you're admin instead of student**

## Understanding the System

According to your architecture, there are **TWO COMPLETELY SEPARATE** authentication systems:

### 1. User System (users table)
- **Table**: `users`
- **Roles**: `student`, `tutor`, `parent`, `advertiser`
- **Login Endpoint**: `POST /api/login`
- **Token**: JWT token in `Authorization: Bearer <token>`
- **Profile Tables**: `student_profiles`, `tutor_profiles`, `parent_profiles`, `advertiser_profiles`

### 2. Admin System (admin_profile table)
- **Table**: `admin_profile` (completely separate!)
- **Role**: `admin` only
- **Login Endpoint**: Different admin login endpoint
- **Token**: Separate admin token
- **Profile Table**: `admin_profile`

**KEY POINT**: A user in the `users` table should **NEVER** have `"admin"` as a role!

## Debug Steps

### Step 1: Check What's in localStorage

Open browser console (F12) and run:

```javascript
console.log('=== AUTH DEBUG ===');
console.log('Token:', localStorage.getItem('token'));
console.log('User Role:', localStorage.getItem('userRole'));
console.log('Current User:', JSON.parse(localStorage.getItem('currentUser') || '{}'));
console.log('User object from AuthManager:', window.AuthManager?.user);
console.log('Role from getUserRole():', window.AuthManager?.getUserRole());
```

**Expected output** (when logged in as student):
```javascript
Token: "eyJ..." // Some JWT token
User Role: "student"
Current User: {
    id: X,
    role: "student",
    active_role: "student",
    roles: ["student", ...] // May have multiple roles
}
```

**If you see `"admin"` anywhere**, that's the problem!

### Step 2: Check the JWT Token Payload

Run this in console:

```javascript
function decodeJWT(token) {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

const token = localStorage.getItem('token');
console.log('JWT Payload:', decodeJWT(token));
```

**Check the payload for**:
- `sub` - should be your user_id
- `active_role` - should be "student"
- `roles` - array of roles

### Step 3: Verify What the Backend Returns

Check the network tab when you reload student-profile.html:

1. Open Network tab (F12 → Network)
2. Reload the page
3. Look for `GET /api/student/profile` or `GET /api/me`
4. Check the response - what role does it say?

### Step 4: Check if You're Using Admin Token

**Question**: Did you login to the admin panel before trying to access student profile?

If yes:
- Admin login creates an **admin token**
- That token is stored in localStorage
- When you try to access student profile, it uses the admin token
- Admin token has role="admin"
- Student profile page sees "admin" and rejects you

**Solution**: Logout from admin panel first, then login as student!

## How the Role Check Works

In `init.js` (lines 32-39):

```javascript
// Check if user has student role
const userRole = window.AuthManager.getUserRole();
if (userRole !== 'student') {
    console.warn(`⚠️ User role is '${userRole}', not 'student'. Redirecting...`);
    alert(`This page is for students only. Your current role is: ${userRole}`);
    window.location.href = '../index.html';
    return;
}
```

`getUserRole()` checks:
1. `this.user.role`
2. `this.user.active_role`
3. `this.user.roles[0]` (first role in array)

If any of these is "admin", it will reject you.

## Possible Scenarios

### Scenario 1: You Have Both User and Admin Accounts ✅ THIS IS OK

**User Account** (`users` table):
- email: student@example.com
- roles: ["student"]
- Login via: index.html

**Admin Account** (`admin_profile` table):
- email: admin@example.com (different email!)
- Login via: admin panel

**These are COMPLETELY SEPARATE**. You should logout from one before logging into the other.

### Scenario 2: Your User Account Has "admin" in Roles Array ❌ THIS IS WRONG

If your user in the `users` table has:
```json
{
    "id": 1,
    "roles": ["student", "admin"]  // ❌ WRONG! Users can't be admins
}
```

This is incorrect! The `users` table should never have "admin" role.

**To fix**:
```sql
-- Check your roles
SELECT id, first_name, roles FROM users WHERE id = YOUR_USER_ID;

-- If it includes "admin", remove it:
UPDATE users
SET roles = array_remove(roles, 'admin')
WHERE id = YOUR_USER_ID;
```

### Scenario 3: Admin Token is Still in localStorage ❌ TOKEN CONFLICT

If you:
1. Login as admin
2. Then try to login as student (without logout)
3. Both tokens exist in localStorage
4. Student profile page uses admin token

**To fix**: Clear localStorage completely:
```javascript
localStorage.clear();
// Then login again as student
```

## Testing Instructions

### Clean Test

1. **Clear all storage**:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **Close all tabs** of your app

3. **Open fresh tab** to `http://localhost:8080/index.html`

4. **Login as student**:
   - Use email/password for a user in `users` table (NOT admin_profile)
   - Choose "Student" role
   - Navigate to student profile

5. **Check console** for any errors

6. **Reload the page** - it should still work

7. **Run debug script** (Step 1 above) and share output

## What to Check in Database

Run this SQL to verify your user data:

```sql
-- Check your user
SELECT
    id,
    first_name,
    father_name,
    email,
    roles,
    active_role,
    created_at
FROM users
WHERE email = 'YOUR_EMAIL_HERE';

-- Should show roles like: ["student"] or ["student", "tutor"]
-- Should NOT show: ["admin"] or ["student", "admin"]

-- Check if you have admin profile
SELECT
    id,
    email,
    department,
    position
FROM admin_profile
WHERE email = 'YOUR_EMAIL_HERE';

-- If this returns a row, you have BOTH user and admin accounts
```

## Summary

**The Issue**: Users in `users` table and admins in `admin_profile` table are **completely separate**. If you're seeing "admin" as the role, it means:
1. You're using an admin token (from admin login)
2. OR your user account incorrectly has "admin" in roles array

**The Fix**:
1. Clear localStorage
2. Login as student (not admin)
3. Verify the JWT token contains correct role
4. Check database to ensure user doesn't have "admin" role

**Share the output** of Step 1 debug script so I can see exactly what's happening!
