# Test Active Roles Fix - Quick Guide

## What Was Fixed

Role guard now only suggests switching to **ACTIVE roles** (not deactivated ones).

## Quick Test (5 minutes)

### Prerequisites
1. Backend running: `cd astegni-backend && python app.py`
2. Frontend running: `python dev-server.py`
3. User with multiple roles (e.g., tutor + student)

### Test 1: Verify API Returns Active Roles Only

```bash
# Open browser console (F12) on any page
# Run this command:

fetch('http://localhost:8000/api/my-roles', {
    headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
})
.then(r => r.json())
.then(data => {
    console.log('✅ Active roles from API:', data.user_roles);
    console.log('📋 All roles from user:', JSON.parse(localStorage.getItem('currentUser')).roles);
    console.log('🔍 Match?', JSON.stringify(data.user_roles) === JSON.stringify(JSON.parse(localStorage.getItem('currentUser')).roles));
});
```

**Expected:**
- If all roles are active: Both arrays match
- If some roles are deactivated: API array is shorter (only active roles)

### Test 2: Deactivate a Role in Database

```bash
# SSH or direct database access
# Deactivate student role for test user:

UPDATE student_profiles
SET is_active = FALSE
WHERE user_id = 1;  # Replace with your test user ID

# Verify:
SELECT user_id, is_active FROM student_profiles WHERE user_id = 1;
```

### Test 3: Check Role Guard Behavior

```bash
# 1. Login as user with deactivated student role
# 2. Switch to tutor role (if not already)
# 3. Navigate to: http://localhost:8081/branch/find-tutors.html
```

**Expected Behavior:**

**BEFORE FIX (WRONG):**
- Modal shows: "Switch to Student" ❌
- Clicking it fails with API error

**AFTER FIX (CORRECT):**
- Modal shows: "Add Student/Parent Role" ✅
- OR if you have other active allowed roles: "Switch to Parent"
- Does NOT show deactivated student role

### Test 4: Verify Console Logs

Open DevTools Console and look for:

```
[RoleGuard] Fetching active roles from /api/my-roles...
[RoleGuard] ✅ Fetched active roles: ["tutor"]
[RoleGuard] Active roles from API: ["tutor"]
[RoleGuard] ❌ Access denied - user has no active student/parent/user role
```

**Key indicators:**
- ✅ "Fetching active roles from /api/my-roles..." appears
- ✅ Active roles array is shorter than all roles (if role deactivated)
- ✅ Correct access decision based on active roles

### Test 5: Reactivate Role

```bash
# Reactivate student role:
UPDATE student_profiles
SET is_active = TRUE
WHERE user_id = 1;

# Reload find-tutors page
```

**Expected:**
- Now shows: "Switch to Student" ✅
- Clicking it works (successful switch)

## Test Matrix

| Scenario | Active Roles | Expected Modal | Pass? |
|----------|--------------|----------------|-------|
| Tutor (student deactivated) | `["tutor"]` | "Add Student Role" | [ ] |
| Tutor (student active) | `["tutor", "student"]` | "Switch to Student" | [ ] |
| Tutor (parent active, student deactivated) | `["tutor", "parent"]` | "Switch to Parent" | [ ] |
| Student (active) | `["student"]` | No modal (access granted) | [ ] |
| Advertiser (no allowed roles active) | `["advertiser"]` | "Add Student/Parent Role" | [ ] |

## Debug Commands

### Check Active Roles
```javascript
// In console on find-tutors page:
fetch('http://localhost:8000/api/my-roles', {
    headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
})
.then(r => r.json())
.then(d => console.table(d.user_roles));
```

### Check Profile Status in Database
```sql
-- Check which profiles are active
SELECT
    u.id,
    u.email,
    u.roles,
    u.active_role,
    tp.is_active as tutor_active,
    sp.is_active as student_active,
    pp.is_active as parent_active
FROM users u
LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
LEFT JOIN student_profiles sp ON sp.user_id = u.id
LEFT JOIN parent_profiles pp ON pp.user_id = u.id
WHERE u.id = 1;  -- Your test user
```

### Force Role Deactivation Test
```javascript
// Temporarily override for testing (browser console):
// This simulates what would happen if student role was deactivated

// 1. Check current state
console.log('Current roles:', JSON.parse(localStorage.getItem('currentUser')).roles);

// 2. Manually test with mocked API
// (This won't actually work - just shows the concept)
// Real test requires database change

// 3. Better: Use database update above, then reload page
```

## Common Issues

### Issue: Still shows deactivated role
**Cause:** Old cache version or role-guard.js not updated
**Fix:**
```bash
# Hard reload (Ctrl+Shift+R)
# Check version in HTML:
grep "role-guard.js" branch/find-tutors.html
# Should show: v=20250128b
```

### Issue: API call not appearing in console
**Cause:** Backend not running or wrong API URL
**Fix:**
```bash
# Check backend is running:
curl http://localhost:8000/api/health

# Check API_BASE_URL:
console.log(window.API_BASE_URL || 'http://localhost:8000');
```

### Issue: Cache not clearing between tests
**Fix:**
```javascript
// In console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

## Success Criteria

All these should be true:

- ✅ Console shows "Fetching active roles from /api/my-roles..."
- ✅ Deactivated roles don't appear in switch modal
- ✅ Active roles appear in switch modal
- ✅ Clicking "Switch" succeeds (no API error)
- ✅ Access granted when current role is allowed
- ✅ Access denied when current role not allowed AND no active allowed roles

## Performance Check

```javascript
// Time the API call:
console.time('fetchActiveRoles');
fetch('http://localhost:8000/api/my-roles', {
    headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
})
.then(r => r.json())
.then(d => {
    console.timeEnd('fetchActiveRoles');
    console.log('Roles:', d.user_roles);
});

// Expected: 50-150ms
```

## Cleanup After Testing

```sql
-- Reactivate all test roles:
UPDATE student_profiles SET is_active = TRUE WHERE user_id = 1;
UPDATE tutor_profiles SET is_active = TRUE WHERE user_id = 1;
UPDATE parent_profiles SET is_active = TRUE WHERE user_id = 1;
```

## Next Steps

1. ✅ Complete all test cases in matrix
2. ✅ Verify performance is acceptable (<200ms)
3. ✅ Test with real user accounts
4. ✅ Deploy to production

## Files to Review

- [js/find-tutors/role-guard.js](js/find-tutors/role-guard.js) - Implementation
- [ROLE_GUARD_ACTIVE_ROLES_FIX_COMPLETE.md](ROLE_GUARD_ACTIVE_ROLES_FIX_COMPLETE.md) - Full documentation
- [branch/find-tutors.html](branch/find-tutors.html) - Updated version

**Status:** READY TO TEST ✅
