# Quick Fix Steps - Admin Session Issue

## Problem Identified
The server logs show manage-campaigns is requesting Admin ID **1** instead of **4**:
```
GET /api/manage-campaigns/profile/1
GET /api/manage-campaigns/stats/1
GET /api/admin-reviews/recent?admin_id=1
```

This means `adminSession` is NOT being stored in localStorage after login.

## Immediate Fix Steps

### Step 1: Check If AdminSession Exists
1. Open browser console (F12)
2. Run:
   ```javascript
   console.log(localStorage.getItem('adminSession'));
   ```

**Expected:** Should show JSON with admin data
**If NULL:** adminSession was never created (the problem!)

### Step 2: Use Debug Tool
1. Open: `http://localhost:8080/admin-pages/debug-session.html`
2. Click "Refresh LocalStorage"
3. Check if `adminSession` exists

**If it doesn't exist:**
- The login code fix didn't work
- OR you haven't logged in since the fix

### Step 3: Create AdminSession Manually (Temporary Fix)
On the debug page, click:
- **"Set Admin ID 4 (jediael.s.abebe@gmail.com)"**

This will:
1. Fetch Admin ID 4's profile from API
2. Create proper `adminSession` in localStorage
3. Store it for future page loads

### Step 4: Test Manage-Campaigns
1. Go to `manage-campaigns.html`
2. It should now load Admin ID 4's data
3. Check server logs - should see:
   ```
   GET /api/manage-campaigns/profile/4
   GET /api/manage-campaigns/stats/4
   GET /api/admin-reviews/recent?admin_id=4
   ```

---

## Root Cause Analysis

### Why Login Fix Didn't Work

Check `admin-index.js` line 691:

```javascript
const profileResponse = await fetch(`${API_BASE_URL}/api/admin-profile/profile/${data.user.id}`);
```

**Possible issues:**
1. **Wrong endpoint**: Should be `/api/admin/profile/4` not `/api/admin-profile/profile/4`
2. **CORS error**: API call might be failing silently
3. **Async timing**: Code continues before profile is fetched

Let me check the actual endpoint...
