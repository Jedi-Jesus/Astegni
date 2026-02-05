# Testing Role Switching - Quick Guide

## ✅ What Was Fixed

Role switching now properly navigates to the new role's profile page without bouncing back.

## 🧪 How to Test

### Prerequisites
- User account with multiple roles (student, tutor, parent, etc.)
- Browser with console open (F12 → Console tab)

### Test 1: Basic Role Switch
1. **Login** with a user that has 2+ roles
2. Navigate to any profile page (e.g., student-profile.html)
3. Click the **profile dropdown** (top-right)
4. Click on a **different role** (e.g., "Tutor")
5. **Expected Result**:
   - Toast shows "Switching to Tutor role..."
   - Page navigates to tutor-profile.html
   - Page loads successfully ✅
   - NO bounce back to student-profile ✅

### Test 2: Check Console Logs
Watch for these console messages after switching:
```
[switchToRole] Role switch successful, updating all state...
[switchToRole] Updated access token with new role
[switchToRole] Updated AuthManager.user.active_role to: tutor
[switchToRole] Updated localStorage.userRole to: tutor
[switchToRole] Updated currentUser object with new role
[switchToRole] Set role_switch_in_progress flag for: tutor
[switchToRole] Navigating to: ../profile-pages/tutor-profile.html

--- PAGE LOADS ---

[profile-system.checkRolePageMismatch] Role switch in progress to: tutor - skipping mismatch check
[profile-system] Page role matches active role (tutor) - no redirect needed
```

### Test 3: Multiple Switches
1. Switch from **Student** → **Tutor**
2. Wait for page to load
3. Switch from **Tutor** → **Parent**
4. Wait for page to load
5. Switch from **Parent** → **Student**
6. **Expected**: Each switch works correctly, no bounce-backs ✅

### Test 4: Page Refresh After Switch
1. Switch to a different role (e.g., Student → Tutor)
2. Wait for tutor-profile.html to load
3. Press **F5** to refresh the page
4. **Expected**: Page stays on tutor-profile.html ✅

### Test 5: Security - Manual URL Navigation
1. Login as **student only** (no other roles)
2. Manually type in address bar: `/profile-pages/tutor-profile.html`
3. **Expected**: Redirected back to student-profile.html ✅
4. Console shows: `Role mismatch detected: page=tutor, active=student`

## 🔍 What to Look For

### ✅ Success Indicators
- No infinite redirect loops
- Toast notification shows role switch progress
- Profile page loads and stays loaded
- Console logs show complete state update
- Dropdown shows correct active role after switch

### ❌ Failure Indicators (old behavior)
- Page bounces back to original role
- Infinite redirect loop
- Console shows repeated mismatch errors
- No "role_switch_in_progress" flag message

## 🐛 If Something Goes Wrong

### Issue: Still Bouncing Back
**Check:**
1. Hard refresh the page (Ctrl+Shift+R) to clear cache
2. Check if `profile-system.js` loaded correctly (Network tab)
3. Verify console shows all 5 state update logs
4. Check if sessionStorage flag is being set:
   ```javascript
   // In console, type:
   sessionStorage.getItem('role_switch_in_progress')
   // Should be 'true' immediately after clicking switch
   ```

### Issue: Console Shows Errors
**Common errors:**
- `Cannot read property 'active_role' of undefined`
  - **Fix**: Ensure you're logged in and have an active session
- `role_switch_in_progress is not defined`
  - **Fix**: Hard refresh, browser might have cached old JS

### Issue: Dropdown Shows Wrong Role
**Check:**
1. Open Console and type: `localStorage.getItem('userRole')`
2. Should match the role you switched to
3. If not, manually clear: `localStorage.clear()` and login again

## 🎯 Quick Verification Script

Paste this in browser console after switching roles:

```javascript
console.log('=== ROLE SWITCH STATE CHECK ===');
console.log('localStorage.userRole:', localStorage.getItem('userRole'));
console.log('sessionStorage.role_switch_in_progress:', sessionStorage.getItem('role_switch_in_progress'));
console.log('AuthManager.user.active_role:', window.AuthManager?.user?.active_role);
const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
console.log('currentUser.active_role:', currentUser.active_role);
console.log('currentUser.role:', currentUser.role);
console.log('=== All should match! ===');
```

**Expected output** (after switching to "tutor"):
```
=== ROLE SWITCH STATE CHECK ===
localStorage.userRole: tutor
sessionStorage.role_switch_in_progress: null (cleared after page load)
AuthManager.user.active_role: tutor
currentUser.active_role: tutor
currentUser.role: tutor
=== All should match! ===
```

## 📝 Test Checklist

- [ ] Basic role switch works (no bounce)
- [ ] Console logs show complete state update
- [ ] Multiple rapid switches work correctly
- [ ] Page refresh after switch stays on correct page
- [ ] Security check: Manual URL navigation still bounces unauthorized access
- [ ] Dropdown shows correct active role after switch
- [ ] Mobile menu role switcher works (if applicable)
- [ ] No errors in console
- [ ] Toast notifications appear correctly

## ✨ Expected Behavior Summary

**BEFORE THE FIX:**
- User clicks "Switch to Tutor"
- Page navigates to tutor-profile.html
- **IMMEDIATELY** bounces back to student-profile.html ❌
- Infinite loop, role switching broken ❌

**AFTER THE FIX:**
- User clicks "Switch to Tutor"
- Page navigates to tutor-profile.html
- Page loads successfully ✅
- User can use tutor profile ✅
- Role switching works! ✅

---

**Fix Applied**: 2026-01-24
**Files Modified**: js/root/profile-system.js
**Test Status**: Ready for testing
