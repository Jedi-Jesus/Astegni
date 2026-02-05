# Quick Start: Fix Role Switch Issue

## 🎯 Problem Summary
When you switch roles (e.g., student → tutor), the role appears to change but then reverts back after 15-30 seconds. The root cause is **browser caching** - the browser is returning cached API responses without actually calling the backend.

## ✅ The Fix (Already Applied)

I've added cache-busting headers to the role switch API call in [js/root/profile-system.js](js/root/profile-system.js).

The fix adds these headers to prevent caching:
```javascript
'Cache-Control': 'no-cache, no-store, must-revalidate',
'Pragma': 'no-cache',
'Expires': '0'
```

## 🚀 Quick Start (5 Minutes)

### Step 1: Clear Your Browser Cache (CRITICAL)

**Option A - Automatic (Recommended):**
1. Open http://localhost:8081/clear-cache-and-test.html
2. Click "🧹 Clear Cache & Reload"
3. Wait for automatic reload

**Option B - Manual:**
1. Press `F12` to open DevTools
2. Right-click the Refresh button
3. Click "Empty Cache and Hard Reload"

### Step 2: Check for Multiple Backend Processes

```bash
# Run this script to check if multiple backends are running
check-multiple-backends.bat
```

If multiple Python processes are found:
1. Close all Python processes in Task Manager
2. Restart backend: `cd astegni-backend && python app.py`

### Step 3: Test the Fix

1. Open http://localhost:8081/test-role-switch-network.html
2. Click "Run Full Diagnostic"
3. **WATCH YOUR BACKEND TERMINAL** for these logs:
   ```
   [switch-role] BEFORE update: user 1 active_role = student
   [switch-role] AFTER update (before commit): user 1 active_role = tutor
   [switch-role] ✅ COMMIT SUCCESSFUL
   [switch-role] VERIFIED from DB (fresh query): user 1 active_role = tutor
   ```

### Step 4: Test in Real UI

1. Go to http://localhost:8081
2. Login with your account
3. Click profile dropdown
4. Click "Switch to [other role]"
5. Verify:
   - You're redirected to the new role's profile page
   - The role persists after page reload
   - **Backend terminal shows the `[switch-role]` logs**

## ✅ Success Indicators

You'll know the fix is working when:

1. **Backend logs appear** every time you switch roles
2. **Role persists** after page reload
3. **No more role reversion** after 15-30 seconds
4. **Database shows correct role** (check with diagnostic scripts)

## ❌ If Still Not Working

### Scenario A: Backend logs appear, but role still reverts
This means the cache fix worked, but there's a different issue.

**Run the diagnostic script:**
```bash
cd astegni-backend
python diagnose_role_issue.py
```

This will show if:
- Database is being updated correctly
- `/api/me` is overwriting the role
- JWT tokens are correct

### Scenario B: Backend logs still don't appear
The browser is still caching responses.

**Try these**:

1. **Test in Incognito Mode:**
   - Open browser in Incognito/Private mode
   - Go to http://localhost:8081
   - Login and switch roles
   - If it works in Incognito → Cache issue in regular browser

2. **Check Browser Extensions:**
   - Disable all extensions
   - Try role switching again
   - If it works → An extension is interfering

3. **Check Proxy Settings:**
   - Open browser settings → Network → Proxy
   - Make sure no proxy is enabled
   - If proxy is enabled → It might be caching responses

4. **Use Different Browser:**
   - Try Chrome, Firefox, or Edge
   - If it works in a different browser → Original browser has cache issue

## 📁 Files Changed

1. ✅ `js/root/profile-system.js` - Added cache-busting headers to `/api/switch-role` fetch call

## 📁 New Files

1. ✅ `test-role-switch-network.html` - Comprehensive diagnostic tool
2. ✅ `clear-cache-and-test.html` - Cache clearing tool
3. ✅ `check-multiple-backends.bat` - Check for multiple Python processes
4. ✅ `ROLE_SWITCH_CACHE_FIX.md` - Detailed explanation
5. ✅ `QUICK_START_ROLE_SWITCH_FIX.md` - This file

## 🆘 Need Help?

### Debug Checklist

Run through these checks:

- [ ] Backend is running on port 8000
- [ ] Frontend is running on port 8081
- [ ] User is logged in
- [ ] User has multiple roles (student, tutor, parent, etc.)
- [ ] Browser cache is cleared
- [ ] Only one Python backend process is running
- [ ] No service workers are active
- [ ] Browser DevTools shows no errors

### Diagnostic Commands

```bash
# Check backend is running
curl http://localhost:8000/api/health

# Check for multiple backends
check-multiple-backends.bat

# Run database diagnostic
cd astegni-backend
python diagnose_role_issue.py

# Test role switch endpoint directly
cd astegni-backend
python test_switch_role_endpoint.py
```

### Browser DevTools Check

1. Open DevTools (F12) → Network tab
2. Switch roles in the UI
3. Find the POST request to `/api/switch-role`
4. Check:
   - Status code (should be 200)
   - Does it say "(from cache)" or "(from disk cache)"? → **BAD**
   - Does it say "(fetch)" or no cache indicator? → **GOOD**
   - Response time (should be > 5ms, if 0ms = cached)

## 📝 Summary

The role switch issue was caused by **browser caching**. The fix adds cache-busting headers to force fresh API calls every time. After clearing your browser cache and testing, role switching should work permanently.

**Key Files**:
- `js/root/profile-system.js` - Contains the fix
- `test-role-switch-network.html` - Diagnostic tool
- `clear-cache-and-test.html` - Cache clearing tool

**Expected Outcome**: Role switching works reliably with no reversion.
