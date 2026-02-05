# Test Role Switch Sequence

## What We Need to Test

We need to see the EXACT sequence of events to find where the role is being reverted.

## Test Steps

1. **Clear browser cache** (important!)
   - Open http://localhost:8081/clear-cache-and-test.html
   - Click "Clear Cache & Reload"

2. **Login as student**
   - Go to http://localhost:8081
   - Login
   - You should be on student-profile.html

3. **Open browser console** (F12)
   - Click Console tab
   - Keep it open

4. **Open backend terminal**
   - Position it so you can see both browser console and backend terminal

5. **Switch to tutor**
   - Click profile dropdown (top-right)
   - Click "Switch to Tutor"

6. **IMMEDIATELY copy logs from BOTH:**

   **Browser Console - look for:**
   ```
   [switchToRole] Making API call to /api/switch-role...
   [switchToRole] API response data: ...
   [switchToRole] Updated access token with new role
   [switchToRole] Updated AuthManager.user.active_role to: tutor
   [switchToRole] Updated localStorage.userRole to: tutor
   ```

   **Backend Terminal - look for:**
   ```
   [switch-role] BEFORE update: user X active_role = student
   [switch-role] AFTER update (before commit): user X active_role = tutor
   [switch-role] ✅ COMMIT SUCCESSFUL
   [switch-role] VERIFIED from DB (fresh query): user X active_role = tutor
   [/api/me] Called for user X, current active_role in DB: ???
   ```

7. **Wait 5 seconds** (let the page fully load)

8. **Check dropdown again**
   - Click profile dropdown
   - What role does it show?

9. **Copy more logs**
   - Any `/api/me` calls after the role switch?
   - What did they return?

## What We're Looking For

The backend logs should show us:

1. **Immediately after `/api/switch-role`:**
   - Database has `active_role = tutor`

2. **When `/api/me` is called on the new page:**
   - Does database STILL have `active_role = tutor`?
   - OR did it somehow revert to `active_role = student`?

3. **What value is `/api/me` returning:**
   - If it returns `student`, where is that coming from?
   - Is the database wrong, or is the code reading the wrong field?

## Key Questions

1. After `[switch-role] VERIFIED from DB: active_role = tutor`, does the database stay as `tutor`?
2. When the new page loads and calls `/api/me`, what does the database have?
3. Is `/api/me` being called multiple times? What does each call return?
4. Is there any code that updates the database back to `student` after the switch?

## Please Copy-Paste

After doing the test above, please copy-paste:

1. **All backend logs** from the moment you clicked "Switch to Tutor" until the dropdown shows wrong role
2. **All browser console logs** from the moment you clicked "Switch to Tutor" until the dropdown shows wrong role

This will help us see the exact sequence and find where the reversion happens.
