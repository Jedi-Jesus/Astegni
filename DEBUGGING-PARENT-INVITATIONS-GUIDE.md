# 🔍 Complete Debugging Guide: Parent Invitations Not Displaying

## Quick Start - Run These 3 Commands

```bash
# 1. Check database (shows what invitations exist)
cd astegni-backend
python debug_parent_invitations.py

# 2. Start backend with debug logging (separate terminal)
python app.py

# 3. Open debug page in browser
http://localhost:8081/debug-invitations.html
```

---

## Step-by-Step Debugging Process

### **Step 1: Check Database** ✅

Run the debug script to see what's actually in the database:

```bash
cd astegni-backend
python debug_parent_invitations.py
```

**What to look for:**
- Total pending invitations count
- Sample invitation IDs and profile mappings
- Whether user 115 has the necessary profiles (student, tutor, parent)
- If test invitation was created

**Expected Output:**
```
📊 SECTION 1: INVITATION STATISTICS
Total invitations: 3
  - Pending: 2
  - Accepted: 1
  - Rejected: 0

📋 SECTION 2: ALL PENDING INVITATIONS
Invitation #1:
  ID: 5
  Inviter: student (profile_id=28)
  Invites: tutor (profile_id=85)
  Relationship: Parent
  ...
```

---

### **Step 2: Start Backend with Debug Logging** 📡

Open a **NEW TERMINAL** and start the backend:

```bash
cd astegni-backend
python app.py
```

**Watch for this output when API is called:**
```
================================================================================
🔍 [BACKEND DEBUG] /api/parent/pending-invitations CALLED
================================================================================
📋 Current User ID: 115
📋 Current User Email: jediael.s.abebe@gmail.com
📋 Current User Roles: ['student', 'tutor', 'parent', 'advertiser']
📋 Current User Role IDs: {'student': '28', 'tutor': '85', 'parent': '4', 'advertiser': '23'}

✅ Found parent_profile: ID = 4
✅ Found tutor_profile: ID = 85
✅ Found student_profile: ID = 28

📊 Total profiles found: 3
📊 Profile conditions: ['(pi.invites_id = %s AND pi.invites_profile_type = \'parent\')', ...]
📊 Profile params: [4, 85, 28]

🔍 SQL Query:
SELECT pi.*, sp.id as student_profile_id, ...
WHERE ((pi.invites_id = %s AND pi.invites_profile_type = 'parent') OR ...) AND pi.status = 'pending'
ORDER BY pi.created_at DESC

📈 Query executed successfully!
📈 Total invitations found: 2

📋 Invitation details:
  1. ID=5, inviter_id=28, invites_id=85, status=pending
  2. ID=6, inviter_id=30, invites_id=4, status=pending

✅ Returning 2 invitations to client
================================================================================
```

**Key things to check:**
1. ✅ User has profiles (student, tutor, parent)
2. ✅ Profile IDs are being found
3. ✅ SQL query is constructed correctly
4. ✅ Invitations are returned

**If you see:**
```
⚠️ WARNING: No profiles found for user - returning empty invitations list
```
**Problem**: User doesn't have the required profile types. They need at least one profile (student, tutor, or parent) to receive invitations.

**If you see:**
```
⚠️ No pending invitations found matching the criteria
🔍 DEBUG: Total pending invitations in database: 5
🔍 DEBUG: There are pending invitations, but none match this user's profiles
```
**Problem**: Invitations exist, but they're targeted at different profile IDs.

---

### **Step 3: Test in Browser** 🌐

1. **Login to Astegni** (any profile page)

2. **Open the debug page**:
   ```
   http://localhost:8081/debug-invitations.html
   ```

3. **Click "Check Authentication"**
   - Should show your user ID, role, and role IDs
   - If token is missing, go back and log in

4. **Click "Test GET /api/parent/pending-invitations"**
   - Watch the console logs
   - Check the API response panel
   - **Switch to backend terminal** to see server-side debug output

5. **Open Browser DevTools** (F12)
   - Go to **Console** tab
   - Look for logs from `ParentingInvitationManager`
   - Check for errors

---

### **Step 4: Check Profile Pages** 📄

#### **Tutor Profile:**
```
http://localhost:8081/profile-pages/tutor-profile.html
```

**Console should show:**
```
[Tutor Profile Init] Auto-loading parenting invitations...
[ParentingInvitationManager] 🔄 Loading parenting invitations (received)...
[ParentingInvitationManager] API URL: http://localhost:8000/api/parent/pending-invitations
[ParentingInvitationManager] API response status: 200 OK
[ParentingInvitationManager] ✅ API response data: {invitations: Array(2)}
[ParentingInvitationManager] Total invitations received: 2
[ParentingInvitationManager] Received invitations stored: 2
```

#### **Parent Profile:**
```
http://localhost:8081/profile-pages/parent-profile.html
```

**Console should show:**
```
[ParentProfile] Auto-loading parenting invitations...
[ParentRequestsManager] 🔄 Loading parenting invitations...
[ParentRequestsManager] API response status: 200 OK
[ParentRequestsManager] ✅ API response data: {invitations: Array(2)}
```

#### **Student Profile:**
```
http://localhost:8081/profile-pages/student-profile.html
```

**Console should show:**
```
[ParentPortalManager] 🔄 Loading pending invitations...
[ParentPortalManager] API response status: 200 OK
[ParentPortalManager] ✅ API response data: {invitations: Array(1)}
[ParentPortalManager] Pending invitations (status=pending): 1
```

---

## Common Issues & Solutions

### Issue 1: "No token found"
**Symptom**: Console shows `⚠️ No auth token found`

**Solution**:
1. Log in to Astegni (any profile page)
2. Check localStorage: Open DevTools → Application → Local Storage → Check for `token` or `access_token`
3. If missing, logout and login again

---

### Issue 2: "401 Unauthorized"
**Symptom**: API returns 401 error

**Solution**:
1. Token expired - logout and login again
2. Invalid token - clear localStorage and login again
   ```javascript
   localStorage.clear();
   location.reload();
   ```

---

### Issue 3: "No profiles found for user"
**Symptom**: Backend logs show `❌ No parent_profile found`, `❌ No tutor_profile found`, etc.

**Solution**:
User needs to create a profile first. Check database:
```sql
SELECT id FROM student_profiles WHERE user_id = 115;
SELECT id FROM tutor_profiles WHERE user_id = 115;
SELECT id FROM parent_profiles WHERE user_id = 115;
```

If missing, create profiles or use a different user account.

---

### Issue 4: "Invitations exist but don't match user"
**Symptom**: Backend shows pending invitations in DB, but none match user's profiles

**Solution**:
The invitations are targeted at different profile IDs. Either:
1. Login with the correct user account
2. Create new test invitations targeting the current user's profiles

Run the debug script - it will auto-create a test invitation if needed:
```bash
python debug_parent_invitations.py
```

---

### Issue 5: "SyntaxError: Identifier already declared"
**Symptom**: `ParentingInvitationManager has already been declared`

**Solution**:
Browser cache issue. Hard refresh:
- **Windows/Linux**: Ctrl + Shift + R
- **Mac**: Cmd + Shift + R
- Or: DevTools → Right-click refresh → "Empty Cache and Hard Reload"

---

### Issue 6: "CORS error"
**Symptom**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution**:
Backend CORS is misconfigured. Check `astegni-backend/app.py`:
```python
ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://localhost:8081",  # Add this if using dev-server.py
    # ... other origins
]
```

---

## Files Modified (Reference)

| File | Purpose |
|------|---------|
| `astegni-backend/parent_invitation_endpoints.py` | Added comprehensive backend debug logging |
| `astegni-backend/debug_parent_invitations.py` | **NEW** - Database inspection script |
| `debug-invitations.html` | **NEW** - Frontend debug tool |
| `profile-pages/tutor-profile.html` | Added auto-load + cache-busting version |
| `js/parent-profile/parent-profile.js` | Added auto-load invitations |
| `js/tutor-profile/parenting-invitation-manager.js` | Enhanced debug logging |
| `js/parent-profile/session-requests-manager.js` | Enhanced debug logging |
| `js/student-profile/parent-portal-manager.js` | Enhanced debug logging |

---

## Quick Reference Commands

```bash
# Check database
cd astegni-backend && python debug_parent_invitations.py

# Start backend with debug logs
cd astegni-backend && python app.py

# Start frontend dev server
python dev-server.py

# Manual database query (Windows)
cmd /c "set PGPASSWORD=Astegni2025&& psql -h localhost -U astegni_user -d astegni_user_db -c \"SELECT COUNT(*) FROM parent_invitations WHERE status = 'pending';\""

# Create test invitation (if needed - the debug script does this automatically)
# Just run: python debug_parent_invitations.py
```

---

## Expected Behavior (When Working Correctly)

1. **Backend Terminal**: Shows detailed debug output when API is called
2. **Browser Console**: Shows frontend API calls and responses
3. **Debug Page**: Shows invitations count and full JSON response
4. **Profile Pages**: Display invitation cards or "No pending invitations" message
5. **Badge Counts**: Update automatically on page load

---

## Support

If issues persist after following this guide:

1. ✅ Run `python debug_parent_invitations.py` and share output
2. ✅ Share backend terminal logs (from `python app.py`)
3. ✅ Share browser console logs (from profile pages)
4. ✅ Share screenshot of debug page (http://localhost:8081/debug-invitations.html)

This will provide complete visibility into where the issue is occurring.
