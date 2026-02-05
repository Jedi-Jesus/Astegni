# Debug Guide: Add Role Button on Find Tutors Page

## Quick Console Test

Open the browser console on `find-tutors.html` and run this script to simulate the issue:

```javascript
// Simulate a user without student/parent/user role
localStorage.setItem('currentUser', JSON.stringify({
    id: 999,
    name: 'Test Tutor',
    email: 'test@example.com',
    active_role: 'tutor',
    roles: ['tutor']
}));
localStorage.setItem('userRole', 'tutor');
localStorage.setItem('token', 'test_token_12345');

// Reload the page
location.reload();

// After reload, you should see the role-access-denied modal
// Click the "Add Role" button and watch the console logs
```

## Expected Console Output

When you click the "Add Role" button, you should see:

```
[RoleGuard] Opening add role modal...
[RoleGuard] Step 1: Waiting for modal to be in DOM...
[RoleGuard] Waiting for add-role-modal to load... (attempt 1)
[RoleGuard] Waiting for add-role-modal to load... (attempt 2)
...
[RoleGuard] ✅ Add-role modal found in DOM
[RoleGuard] Step 2: Waiting for ProfileSystem...
[RoleGuard] Waiting for ProfileSystem.openAddRoleModal... (attempt 1)
...
[RoleGuard] ✅ Opening via window.openAddRoleModal()
[ProfileSystem] Add-role modal not found, waiting for modal loader... (attempt 1)
[ProfileSystem] ✅ Add Role Modal is in DOM
```

## What to Check

### 1. Modal Appears in DOM
```javascript
// In console after page loads
document.getElementById('add-role-modal')
// Should return: <div id="add-role-modal" class="modal hidden">...</div>
```

### 2. ProfileSystem is Loaded
```javascript
typeof window.openAddRoleModal
// Should return: "function"

typeof ProfileSystem
// Should return: "object"
```

### 3. Z-Index is Correct
```javascript
const accessDenied = document.getElementById('roleAccessDeniedModal');
const addRole = document.getElementById('add-role-modal');

console.log('Access Denied z-index:', window.getComputedStyle(accessDenied).zIndex);
console.log('Add Role z-index:', window.getComputedStyle(addRole).zIndex);

// Expected output:
// Access Denied z-index: 99999
// Add Role z-index: 100000
```

### 4. Modal is Visible
After clicking "Add Role" button:
```javascript
const modal = document.getElementById('add-role-modal');
console.log('Display:', modal.style.display);        // Should be "flex"
console.log('Has class "show":', modal.classList.contains('show')); // Should be true
console.log('Has class "active":', modal.classList.contains('active')); // Should be true
console.log('Z-index:', modal.style.zIndex);         // Should be "100000"
```

## Common Issues and Fixes

### Issue 1: Modal Not Found
**Symptom**: Console shows "❌ Add-role modal not found after waiting 5000ms"

**Fix**: Check if `common-modal-loader.js` is loaded:
```javascript
typeof CommonModalLoader
// Should return: "object"
```

If undefined, check the script tag in HTML:
```html
<script src="../modals/common-modals/common-modal-loader.js"></script>
```

### Issue 2: ProfileSystem Not Defined
**Symptom**: Modal opens but with direct DOM manipulation fallback

**Fix**: Check if `profile-system.js` is loaded:
```javascript
typeof ProfileSystem
// Should return: "object"
```

### Issue 3: Modal Behind Other Content
**Symptom**: Modal exists but can't see it

**Fix**: Check z-index and display:
```javascript
const modal = document.getElementById('add-role-modal');
modal.style.zIndex = '100000';
modal.style.display = 'flex';
modal.classList.add('show', 'active');
```

### Issue 4: Body Scroll Not Prevented
**Symptom**: Can scroll page behind modal

**Fix**:
```javascript
document.body.style.overflow = 'hidden';
```

## Manual Test Steps

1. **Clear localStorage** (simulate new user):
   ```javascript
   localStorage.clear();
   ```

2. **Set up tutor user**:
   ```javascript
   localStorage.setItem('currentUser', JSON.stringify({
       id: 1,
       name: 'John Tutor',
       email: 'tutor@example.com',
       active_role: 'tutor',
       roles: ['tutor']
   }));
   localStorage.setItem('userRole', 'tutor');
   localStorage.setItem('token', 'fake_token');
   ```

3. **Navigate to find-tutors page**:
   ```
   http://localhost:8081/branch/find-tutors.html
   ```

4. **Verify role-access-denied modal appears**:
   - Should see orange gradient header
   - "Access Restricted" title
   - "You are currently logged in as a Tutor" message
   - Two buttons: "Go Back" and "Add Role"

5. **Click "Add Role" button**

6. **Verify add-role-modal opens**:
   - Role access denied modal should close
   - Add role modal should appear on top
   - Should see "Add New Role" title
   - Form with role dropdown and password field

7. **Try interacting with the modal**:
   - Select a role from dropdown
   - Type in password field
   - Close button should work

## Network Tab Check

If modals are not loading, check Network tab in DevTools:

**Should see these requests**:
```
GET /modals/common-modals/add-role-modal.html - 200 OK
GET /modals/common-modals/role-access-denied-modal.html - 200 OK
```

**If you see 404 errors**, the path is incorrect. Check:
- Current page location
- Relative paths in `common-modal-loader.js`

## Timing Verification

To verify the async wait is working:

```javascript
// Force slow modal loading (simulate slow network)
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const url = args[0];
    if (url.includes('add-role-modal.html')) {
        console.log('Delaying add-role-modal.html by 2 seconds...');
        return new Promise(resolve => {
            setTimeout(() => resolve(originalFetch(...args)), 2000);
        });
    }
    return originalFetch(...args);
};
```

Then click "Add Role" - you should see the wait logs in console.

## Success Criteria

✅ Modal appears within 5 seconds of clicking button
✅ Modal is fully visible (not behind other elements)
✅ Form is interactive (can select role, type password)
✅ No console errors
✅ Body scroll is prevented
✅ Close button works
✅ ESC key closes modal

## Still Not Working?

If after all this the button still doesn't work:

1. **Check browser console** for any JavaScript errors
2. **Verify cache is cleared** (hard refresh: Ctrl+Shift+R)
3. **Check if CSS is loaded** (inspect element and look for styles)
4. **Try test page first**: `test-add-role-from-access-denied.html`
5. **Report issue** with full console output and screenshots

## Useful Console Commands

```javascript
// Check all modals in DOM
document.querySelectorAll('[id*="modal"]');

// Check ProfileSystem exports
Object.keys(ProfileSystem);

// Check window functions
Object.keys(window).filter(k => k.includes('modal') || k.includes('Modal'));

// Force open add-role modal
if (window.openAddRoleModal) {
    window.openAddRoleModal();
} else {
    const modal = document.getElementById('add-role-modal');
    modal.style.display = 'flex';
    modal.style.zIndex = '100000';
    modal.classList.add('show', 'active');
}

// Force close all modals
document.querySelectorAll('.modal').forEach(m => {
    m.style.display = 'none';
    m.classList.remove('show', 'active');
});
document.body.style.overflow = 'auto';
```

---

Last Updated: 2026-01-28
Version: 2.0 (with async wait fix)
