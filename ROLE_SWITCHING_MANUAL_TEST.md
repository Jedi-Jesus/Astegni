# Manual Role Switching Test Guide

## ⚠️ SECURITY NOTICE
You shared credentials publicly. **CHANGE THE PASSWORD IMMEDIATELY** after testing:
- Email: contact@astegni.com
- Password: ~~@ContactAstegni1234~~ (CHANGE THIS!)

## Step-by-Step Test Procedure

### Step 1: Login
1. Go to http://localhost:8081 (or your dev server)
2. Click "Login"
3. Enter:
   - Email: contact@astegni.com
   - Password: @ContactAstegni1234
4. Login successfully

### Step 2: Check Current State
1. Look at the top-right navigation
2. You should see a profile dropdown (NOT Login/Register buttons)
3. Click on the profile dropdown to open it
4. Check the "Switch Role" section

**What do you see?**
- [ ] No "Switch Role" section at all
- [ ] "Switch Role" section with "No roles yet"
- [ ] "Switch Role" section with 1 role listed
- [ ] "Switch Role" section with 2+ roles listed

### Step 3: Run Diagnostic Script
1. Press **F12** to open Developer Tools
2. Click on the **Console** tab
3. Copy the entire contents of `ROLE_SWITCHING_TEST_SCRIPT.js`
4. Paste into console and press Enter
5. **Read the output** - it will tell you what's wrong

### Step 4: Test Manual Role Switch (if you have 2+ roles)
In the browser console, type:
```javascript
window.switchToRole("student")
```

**Expected behavior:**
1. Dropdown closes
2. Toast message: "Switching to Student role..."
3. Page starts loading
4. Redirects to student profile page
5. Toast message: "Switched to Student role"

**If nothing happens:**
1. Check console for error messages
2. Go to Network tab
3. Look for a request to `/api/switch-role`
4. Check its status and response

### Step 5: Visual Click Test (if you have 2+ roles)
1. Open profile dropdown
2. Find the "Switch Role" section
3. You should see your roles listed (e.g., "Student", "Tutor", "Parent")
4. The active role will have an "ACTIVE" badge
5. Click on a **different** role (not the active one)

**What happens?**
- [ ] Nothing (dropdown stays open)
- [ ] Dropdown closes but nothing else
- [ ] Error message appears
- [ ] Page redirects successfully ✅

### Step 6: Check Network Tab
1. Keep DevTools open
2. Click on **Network** tab
3. Clear the network log (trash icon)
4. Try to switch roles again
5. Look for `/api/switch-role` request

**Check the request:**
- **Status Code:** Should be `200 OK`
- **Request Payload:** Should show `{"role": "student"}` (or whichever role)
- **Response:** Should show new tokens and active_role

**Common status codes:**
- `200`: Success ✅
- `400`: Bad request (invalid role name)
- `401`: Unauthorized (token expired)
- `404`: Endpoint not found
- `500`: Server error

### Step 7: Check Backend Logs (if API fails)
If you see a 500 error or the API call fails:

1. Go to your backend terminal (where `python app.py` is running)
2. Look for error messages
3. Common issues:
   - Database connection error
   - User doesn't have the role they're trying to switch to
   - JWT token issues

## Common Issues & Fixes

### Issue 1: "switchToRole is not defined"
**Symptom:** Console shows `Uncaught ReferenceError: switchToRole is not defined`

**Cause:** profile-system.js didn't load properly

**Fix:**
1. Hard refresh: **Ctrl+Shift+R**
2. Or clear browser cache
3. Check if profile-system.js loaded in Network tab

---

### Issue 2: Only 1 Role, Can't Click
**Symptom:** You have 1 role, it shows with "CURRENT" badge, clicking does nothing

**Cause:** This is **normal behavior** - can't switch to the role you're already using

**Fix:** Add another role first, then you can switch between them

---

### Issue 3: Dropdown Closes Immediately
**Symptom:** Click on role → dropdown closes → nothing happens

**Cause:** Might be clicking the overlay or the click event is being intercepted

**Fix:**
1. Make sure you're clicking directly on the role text
2. Try manual console command: `window.switchToRole("student")`
3. If manual works but click doesn't → issue with event handler

---

### Issue 4: 401 Unauthorized
**Symptom:** Network shows `/api/switch-role` returned 401

**Cause:** Token expired or invalid

**Fix:**
1. Logout
2. Login again
3. Try switching roles again

---

### Issue 5: Role Not Found (400 error)
**Symptom:** API returns 400 with "Role not found" message

**Cause:** Trying to switch to a role you don't have

**Fix:**
1. Check `/api/my-roles` to see what roles you actually have
2. Make sure the role name matches exactly (lowercase)

---

## Expected Database State

For contact@astegni.com to have multiple roles, the database should have:

**users table:**
```sql
SELECT email, current_role FROM users WHERE email = 'contact@astegni.com';
-- Should show: contact@astegni.com | student (or tutor, parent, etc.)
```

**Check which roles this user has:**
```sql
-- If is_student = true, user has student role
-- If is_tutor = true, user has tutor role
-- If is_parent = true, user has parent role
-- If is_advertiser = true, user has advertiser role

SELECT email, is_student, is_tutor, is_parent, is_advertiser
FROM users
WHERE email = 'contact@astegni.com';
```

## Manual Database Fix (if needed)

If the user doesn't have multiple roles, you can add them:

```sql
-- Add student role
UPDATE users
SET is_student = true
WHERE email = 'contact@astegni.com';

-- Add tutor role
UPDATE users
SET is_tutor = true
WHERE email = 'contact@astegni.com';

-- Add parent role
UPDATE users
SET is_parent = true
WHERE email = 'contact@astegni.com';
```

Then create the corresponding profile records:

```sql
-- Create student profile (if doesn't exist)
INSERT INTO students (user_id, grade_level)
SELECT id, '12' FROM users WHERE email = 'contact@astegni.com'
ON CONFLICT (user_id) DO NOTHING;

-- Create tutor profile (if doesn't exist)
INSERT INTO tutors (user_id)
SELECT id FROM users WHERE email = 'contact@astegni.com'
ON CONFLICT (user_id) DO NOTHING;

-- Create parent profile (if doesn't exist)
INSERT INTO parents (user_id)
SELECT id FROM users WHERE email = 'contact@astegni.com'
ON CONFLICT (user_id) DO NOTHING;
```

## Report Back

After running these tests, please provide:

1. **Output from diagnostic script** (copy entire console output)
2. **Number of roles you have**
3. **What happens when you try to switch** (detailed description)
4. **Any error messages** (from console or network tab)
5. **Screenshot** (if helpful)

This will help me identify and fix the exact issue!
