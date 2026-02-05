# Test Role Guard - Quick Start

## Prerequisites
1. Backend running: `cd astegni-backend && python app.py`
2. Frontend running: `python dev-server.py` (port 8081)

## Quick Test (2 minutes)

### Test 1: No Login ❌ Should Block
```bash
# Open browser console (F12)
localStorage.clear();
sessionStorage.clear();
# Navigate to: http://localhost:8081/branch/find-tutors.html
# Expected: Auth required modal appears
```

### Test 2: Student Role ✅ Should Pass
```javascript
// Console commands:
localStorage.setItem('token', 'mock_token');
localStorage.setItem('currentUser', JSON.stringify({
    id: 1,
    name: 'Test Student',
    email: 'student@test.com',
    active_role: 'student',
    roles: ['student']
}));
localStorage.setItem('userRole', 'student');
location.reload();
// Expected: Page loads normally
```

### Test 3: Tutor Role ❌ Should Block
```javascript
// Console commands:
localStorage.setItem('token', 'mock_token');
localStorage.setItem('currentUser', JSON.stringify({
    id: 1,
    name: 'Test Tutor',
    email: 'tutor@test.com',
    active_role: 'tutor',
    roles: ['tutor']
}));
localStorage.setItem('userRole', 'tutor');
location.reload();
// Expected: Access denied modal appears
```

### Test 4: NULL Role ❌ Should Block
```javascript
// Console commands:
localStorage.setItem('token', 'mock_token');
localStorage.setItem('currentUser', JSON.stringify({
    id: 1,
    name: 'Test User',
    email: 'user@test.com',
    active_role: null,
    roles: ['student', 'tutor']
}));
localStorage.removeItem('userRole');
location.reload();
// Expected: Role switch modal appears
```

### Test 5: Real User Test ✅
```bash
1. Login as real user at: http://localhost:8081/index.html
2. Make sure you're on student, parent, or user role
3. Navigate to: http://localhost:8081/branch/find-tutors.html
4. Expected: Page loads normally
5. Hard reload (Ctrl+Shift+R)
6. Expected: Brief wait (~100-300ms), then page loads
```

## Automated Test Page

### Option 1: Use Test Page
```bash
# Open in browser:
http://localhost:8081/test-role-guard-comprehensive.html

# Click each test button, then click "Navigate to Find Tutors"
# Use browser back to return to test page
```

## What to Look For

### ✅ Success Indicators
- Student/parent/user roles can access
- Page loads without flickering
- Console shows: `[RoleGuard] ✅ Access granted`

### ❌ Block Indicators
- Tutor/advertiser roles blocked
- NULL/undefined roles blocked
- Appropriate modal appears
- Page content hidden
- Console shows: `[RoleGuard] ❌ Access denied`

### ⚠️ Modal Indicators
- User with multiple roles sees "Switch Role" button
- Modal shows correct available roles
- "Switch Role" button actually switches role

## Common Issues

### Issue: "Access granted" but modal still shows
**Cause:** Old modal in DOM from previous test
**Fix:** Hard reload (Ctrl+Shift+R) or clear modals:
```javascript
document.getElementById('roleAccessDeniedModal')?.remove();
document.getElementById('roleSwitchRequiredModal')?.remove();
```

### Issue: Takes 3 seconds to load
**Cause:** Waiting for auth timeout (normal if backend is down)
**Fix:** Make sure backend is running on port 8000

### Issue: "Auth required" even though logged in
**Cause:** Token expired or invalid
**Fix:** Re-login at index.html

## Console Debugging

### View Current State
```javascript
console.log('Token:', localStorage.getItem('token') ? 'EXISTS' : 'MISSING');
console.log('User:', JSON.parse(localStorage.getItem('currentUser') || '{}'));
console.log('Role:', localStorage.getItem('userRole'));
```

### Force Allow Access (Debug Only)
```javascript
// Set valid student role
localStorage.setItem('token', 'debug_token');
localStorage.setItem('currentUser', JSON.stringify({
    id: 999,
    name: 'Debug User',
    email: 'debug@test.com',
    active_role: 'student',
    roles: ['student']
}));
localStorage.setItem('userRole', 'student');
location.reload();
```

## Expected Console Output

### When Access Granted (Student)
```
[RoleGuard] Initializing...
[RoleGuard] Performing access check...
[RoleGuard] Auth check attempt 1/30
[RoleGuard] Valid user data found - proceeding with access check
[RoleGuard] Performing final access check...
[RoleGuard] Checking access for find-tutors page...
[RoleGuard] Debug Info:
  - user.active_role: student
  - user.role: student
  - localStorage.userRole: student
  - Resolved activeRole: student
  - user.roles array: ["student"]
  - ALLOWED_ROLES: ["student", "parent", "user"]
[RoleGuard] ✅ Access granted - user is a student
[RoleGuard] ✅ Access granted - page can display normally
```

### When Access Denied (Tutor)
```
[RoleGuard] Initializing...
[RoleGuard] Performing access check...
[RoleGuard] Auth check attempt 1/30
[RoleGuard] Valid user data found - proceeding with access check
[RoleGuard] Performing final access check...
[RoleGuard] Checking access for find-tutors page...
[RoleGuard] Debug Info:
  - user.active_role: tutor
  - user.role: tutor
  - localStorage.userRole: tutor
  - Resolved activeRole: tutor
  - user.roles array: ["tutor"]
  - ALLOWED_ROLES: ["student", "parent", "user"]
[RoleGuard] ❌ Active role "tutor" not in allowed list: ["student", "parent", "user"]
[RoleGuard] ❌ Access denied - user has no student/parent/user role
[RoleGuard] Loading role access denied modal...
[RoleGuard] ❌ Access denied - hiding page content
```

## Pass Criteria

All these should pass:

| Test | Expected | Pass? |
|------|----------|-------|
| No login | Block with auth modal | [ ] |
| NULL role | Block with switch modal | [ ] |
| Student | Allow | [ ] |
| Parent | Allow | [ ] |
| User | Allow | [ ] |
| Tutor | Block with access denied | [ ] |
| Advertiser | Block with access denied | [ ] |
| Page reload | Wait for auth, then allow/block | [ ] |
| Multi-role (tutor+student) | Show switch modal | [ ] |

## Next Steps

After all tests pass:
1. Test with real user accounts
2. Test on different browsers (Chrome, Firefox, Edge)
3. Test on mobile devices
4. Deploy to production

## Files Changed

- ✅ [js/find-tutors/role-guard.js](js/find-tutors/role-guard.js) - Fixed logic
- ✅ [branch/find-tutors.html](branch/find-tutors.html) - Updated version
- ✅ [test-role-guard-comprehensive.html](test-role-guard-comprehensive.html) - Test suite
- ✅ [ROLE_GUARD_FIX_COMPLETE.md](ROLE_GUARD_FIX_COMPLETE.md) - Documentation
- ✅ [ROLE_GUARD_DEEP_ANALYSIS.md](ROLE_GUARD_DEEP_ANALYSIS.md) - Technical analysis

**Status: READY TO TEST ✅**
