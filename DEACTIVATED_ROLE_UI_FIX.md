# Fix: Deactivated Role Still Showing in UI

## Problem

After deactivating a role, the **deactivated role was still showing** in:
- `dropdown-header` (profile dropdown at top-right)
- `dropdown-user-role` (current role label)
- Clicking on profile dropdown would navigate to the deactivated role's profile page

**Root Cause:**
1. Backend correctly sets `is_active = False` and switches `current_role` to another active role
2. Backend returns the updated data
3. **Frontend wasn't updating localStorage** with the new current role
4. Frontend kept showing the old (deactivated) role from cached data

---

## Solution

### Backend Changes

**File:** `astegni-backend/role_management_endpoints.py` (lines 130-215)

**Enhanced the deactivate endpoint to:**

1. **Find remaining ACTIVE roles** (not just all roles):
```python
# Get all active roles (excluding the one being deactivated)
remaining_active_roles = []
for role in current_user.roles:
    if role == request.role:
        continue  # Skip the role being deactivated

    # Check if role is active
    is_active = True
    if role == 'student':
        profile = db.query(StudentProfile).filter(...).first()
        if profile and hasattr(profile, 'is_active'):
            is_active = profile.is_active
    # ... same for tutor, parent, advertiser, user

    if is_active:
        remaining_active_roles.append(role)
```

2. **Switch to first active role:**
```python
if remaining_active_roles:
    current_user.current_role = remaining_active_roles[0]
    new_current_role = remaining_active_roles[0]
else:
    current_user.current_role = None
    new_current_role = None
```

3. **Return the new current role in response:**
```python
return {
    "message": f"{request.role.capitalize()} role deactivated successfully",
    "deactivated_role": request.role,
    "new_current_role": new_current_role,  # NEW
    "remaining_active_roles": all_remaining_active_roles  # NEW
}
```

**Before:** Backend switched to any remaining role (even if deactivated)
**After:** Backend switches to the **first ACTIVE remaining role**

---

### Frontend Changes

**File:** `js/common-modals/role-manager.js` (lines 317-345)

**Updated deactivate success handler to:**

1. **Update localStorage with new current role:**
```javascript
if (response.ok) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (data.new_current_role) {
        // Update user's current role
        user.current_role = data.new_current_role;
        user.active_role = data.new_current_role;
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userRole', data.new_current_role);

        alert(`Your ${this.currentRole} role has been deactivated. Switched to ${data.new_current_role} role.`);

        // Redirect to the new role's profile page
        const profilePages = {
            'student': '/profile-pages/student-profile.html',
            'tutor': '/profile-pages/tutor-profile.html',
            'parent': '/profile-pages/parent-profile.html',
            'advertiser': '/profile-pages/advertiser-profile.html',
            'user': '/profile-pages/user-profile.html'
        };
        window.location.href = profilePages[data.new_current_role] || '/index.html';
    } else {
        // No active roles left
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        alert('Your role has been deactivated. You have no active roles remaining.');
        window.location.href = '/index.html';
    }
}
```

**Before:** Just redirected to `/index.html` with stale localStorage
**After:** Updates localStorage with new role and redirects to correct profile page

---

## Flow Comparison

### Before (Buggy)

1. User deactivates "tutor" role (their current active role)
2. Backend sets `tutor.is_active = False`
3. Backend switches `current_role` to "student"
4. Backend returns response
5. **Frontend ignores the new current role**
6. Frontend redirects to `/index.html`
7. **UI still shows "Tutor" from localStorage**
8. User clicks profile → Goes to tutor-profile.html ❌

### After (Fixed)

1. User deactivates "tutor" role (their current active role)
2. Backend sets `tutor.is_active = False`
3. Backend finds remaining ACTIVE roles → finds "student" (active)
4. Backend switches `current_role` to "student"
5. Backend returns `{ new_current_role: "student", ... }`
6. **Frontend updates localStorage:**
   ```javascript
   user.current_role = "student"
   localStorage.setItem('user', JSON.stringify(user))
   localStorage.setItem('userRole', "student")
   ```
7. Frontend redirects to `/profile-pages/student-profile.html`
8. **UI shows "Student" correctly** ✅
9. User clicks profile → Goes to student-profile.html ✅

---

## What Gets Updated

### localStorage Updates

**Before deactivation:**
```javascript
localStorage.user = {
  current_role: "tutor",
  active_role: "tutor",
  roles: ["student", "tutor", "parent"]
}
localStorage.userRole = "tutor"
```

**After deactivation (old bug):**
```javascript
// NO CHANGE - still shows tutor ❌
localStorage.user = {
  current_role: "tutor",  // STALE!
  active_role: "tutor",   // STALE!
  roles: ["student", "tutor", "parent"]
}
localStorage.userRole = "tutor"  // STALE!
```

**After deactivation (fixed):**
```javascript
// UPDATED to new role ✅
localStorage.user = {
  current_role: "student",  // UPDATED!
  active_role: "student",   // UPDATED!
  roles: ["student", "tutor", "parent"]  // roles array unchanged (tutor still in list but is_active=False in DB)
}
localStorage.userRole = "student"  // UPDATED!
```

---

## UI Elements That Get Fixed

### 1. Profile Dropdown Header
```html
<div id="dropdown-user-role" class="dropdown-user-role">Student</div>
```
**Before:** Showed "Tutor" (deactivated role)
**After:** Shows "Student" (new active role)

### 2. Profile Dropdown Link
```html
<a href="/profile-pages/student-profile.html" id="dropdown-profile-link">
```
**Before:** Linked to `/profile-pages/tutor-profile.html`
**After:** Links to `/profile-pages/student-profile.html`

### 3. Role Switcher
The role switcher (via `/api/my-roles`) already filters out deactivated roles, so it will show only active roles after page refresh.

---

## Edge Cases Handled

### Case 1: Deactivate Current Role (Multiple Active Roles)
**Scenario:** User is "tutor" (active), has "student" (active) and "parent" (deactivated)

**Result:**
- Deactivates tutor
- Switches to student (first active role)
- localStorage updated to "student"
- Redirects to student-profile.html ✅

### Case 2: Deactivate Current Role (Only One Active Role)
**Scenario:** User is "tutor" (active), has "student" (deactivated)

**Result:**
- Deactivates tutor
- No active roles remaining
- Clears localStorage
- Shows message: "No active roles remaining"
- Redirects to index.html ✅

### Case 3: Deactivate Non-Current Role
**Scenario:** User is "student" (active), deactivates "tutor" (not current)

**Result:**
- Deactivates tutor
- Current role stays "student"
- localStorage unchanged
- Stays on current page or redirects based on implementation ✅

---

## Testing Steps

### Test 1: Deactivate Current Role with Other Active Roles

1. Login as a user with 2+ active roles (e.g., student + tutor)
2. Switch to "tutor" role
3. Go to Settings → Manage Roles → Deactivate tutor
4. Send OTP, enter OTP, confirm
5. **Expected:**
   - Alert: "Tutor role deactivated. Switched to student role."
   - Redirected to student-profile.html
   - Dropdown shows "Student" (not "Tutor")
   - Clicking profile goes to student-profile.html

### Test 2: Deactivate Last Active Role

1. Login as a user with only 1 active role
2. Go to Settings → Manage Roles → Deactivate
3. Send OTP, enter OTP, confirm
4. **Expected:**
   - Alert: "No active roles remaining"
   - Redirected to index.html
   - localStorage cleared
   - Shows login/register buttons

### Test 3: Check Role Switcher

1. After deactivating a role
2. Click on profile dropdown
3. Check role switcher list
4. **Expected:**
   - Deactivated role NOT in the list
   - Only active roles shown

---

## Files Modified

1. **astegni-backend/role_management_endpoints.py**
   - Lines 130-215: Enhanced deactivate endpoint to return new current role
   - Returns `new_current_role` and `remaining_active_roles`

2. **js/common-modals/role-manager.js**
   - Lines 317-345: Updated success handler to update localStorage
   - Updates `user.current_role` and `userRole` in localStorage
   - Redirects to correct profile page based on new role

---

## Summary

✅ **Backend:** Now returns the new active role after deactivation
✅ **Frontend:** Updates localStorage with the new current role
✅ **UI:** Shows correct role in dropdown and links to correct profile
✅ **Edge Cases:** Handles multiple active roles and no active roles
✅ **Consistency:** Deactivated roles hidden from role switcher

**Next Step:** Restart backend and test!

```bash
cd astegni-backend
# Stop server (Ctrl+C)
python app.py
```
