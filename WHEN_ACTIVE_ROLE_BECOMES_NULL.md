# 🔍 WHEN DOES `active_role` BECOME NULL?

> **Complete Guide**: All situations where `active_role` can be `null`
> **Date**: January 25, 2026

---

## 📋 SUMMARY

There are **4 situations** where `active_role` can become `null`:

| # | Situation | File | Line | User Action |
|---|-----------|------|------|-------------|
| 1 | **Google OAuth Registration** | `google_oauth_endpoints.py` | 311 | User registers via "Sign in with Google" |
| 2 | **Deactivate Current Role** | `role_management_endpoints.py` | 122 | User deactivates their current active_role |
| 3 | **Delete Current Role** | `role_management_endpoints.py` | 324 | User permanently deletes their current active_role |
| 4 | **Delete Last Active Role** | `role_management_endpoints.py` | 324 | User deletes their only remaining active role |

---

## 📊 DETAILED BREAKDOWN

### Situation 1: Google OAuth Registration (NEW USER)

**When**: User registers using "Sign in with Google" button

**Flow**:
```
User clicks "Sign in with Google"
↓
Google authenticates user
↓
Backend receives Google user data
↓
Backend checks: User exists? NO
↓
Backend creates NEW user:
  - email: from Google
  - password_hash: random (can't login with password)
  - roles: null  ← NO ROLES
  - active_role: null  ← NO ACTIVE ROLE
↓
User lands on index.html with active_role = null
```

**Code**: [google_oauth_endpoints.py:311](astegni-backend/google_oauth_endpoints.py#L311)
```python
new_user = User(
    email=email,
    password_hash=hash_password(secrets.token_urlsafe(32)),
    profile_picture=google_user.get("picture"),
    email_verified=True,
    has_password=False,  # OAuth user
    roles=None,          # NO ROLE
    active_role=None     # NO ACTIVE ROLE
)
```

**Why `null`?**
- Role-optional registration system
- User hasn't chosen a role yet
- They need to click "Add Role" to add student/tutor/parent

**What User Sees**:
- Index.html page
- Profile dropdown shows "Add Role" button
- No profile page accessible until role is added

**How to Fix**:
- User clicks "Add Role" in dropdown
- Selects role (student/tutor/parent/advertiser)
- POST `/api/register` with role
- `active_role` becomes the chosen role

---

### Situation 2: Deactivate Current Active Role

**When**: User deactivates the role they're currently using

**Flow**:
```
User State:
  active_role: student
  Active roles: [student, tutor, parent]

User goes to Settings → Manage Roles
User clicks "Deactivate" on student role
Enters password for confirmation
↓
POST /api/role/deactivate { role: "student", password: "..." }
↓
Backend checks: Is student the active_role? YES
↓
Backend sets: active_role = null
Backend sets: student_profiles.is_active = False
↓
Response: {
  "new_active_role": null,
  "remaining_active_roles": ["tutor", "parent"]
}
↓
Frontend redirects to index.html
User must choose next role from dropdown
```

**Code**: [role_management_endpoints.py:122](astegni-backend/role_management_endpoints.py#L122)
```python
# If this was the active role, clear it
if current_user.active_role == request.role:
    current_user.active_role = None  # ← SET TO NULL
```

**Why `null`?**
- User chose to deactivate their current role
- System respects user's choice (Option 2)
- User must manually select next role

**What User Sees**:
- Redirected to index.html
- Profile dropdown shows remaining roles: [tutor, parent]
- User clicks a role to switch
- POST `/api/switch-role` with chosen role

**How to Fix**:
- User selects a role from dropdown
- Or reactivates the deactivated role

---

### Situation 3: Delete Current Active Role

**When**: User permanently deletes the role they're currently using

**Flow**:
```
User State:
  active_role: student
  Active roles: [student, tutor, parent]

User goes to Settings → Manage Roles
User clicks "DELETE" (not deactivate) on student role
Enters password + OTP for confirmation (destructive action)
↓
DELETE /api/role/remove { role: "student", password: "...", otp: "..." }
↓
Backend checks: Is student the active_role? YES
Backend checks: Other active roles exist? YES
↓
Backend auto-switches to first remaining role:
  active_role = "tutor"  ← AUTO-SWITCHED
↓
Backend permanently deletes student profile (CASCADE)
Backend removes "student" from roles array
```

**Code**: [role_management_endpoints.py:319-321](astegni-backend/role_management_endpoints.py#L319-L321)
```python
if user.active_role == request.role:
    # Get remaining active roles
    if remaining_active_roles:
        user.active_role = remaining_active_roles[0]  # Auto-switch
    else:
        # NO OTHER ROLES!
        user.active_role = None  # ← ONLY IF NO OTHER ROLES
```

**Why `null`?** (ONLY IF NO OTHER ACTIVE ROLES)
- User deleted their active role
- System checked for other active roles
- Found NONE
- Sets to null

**What User Sees**:
- If other roles exist: Auto-switched to first role (NOT null)
- If no other roles: Redirected to index.html with `active_role = null`

---

### Situation 4: Delete Last Active Role

**When**: User deletes their ONLY remaining active role

**Flow**:
```
User State:
  active_role: student
  Active roles: [student]  ← ONLY ONE ROLE!

User clicks "DELETE" on student role
Enters password + OTP
↓
DELETE /api/role/remove { role: "student", password: "...", otp: "..." }
↓
Backend checks: Other active roles exist? NO
↓
Backend sets: active_role = null  ← NO OTHER OPTIONS
Backend deletes student profile
Backend removes "student" from roles array
↓
User State:
  active_role: null
  Active roles: []  ← NO ROLES AT ALL!
```

**Code**: [role_management_endpoints.py:324](astegni-backend/role_management_endpoints.py#L324)
```python
if remaining_active_roles:
    user.active_role = remaining_active_roles[0]
else:
    # If no active roles left, set to None
    user.active_role = None  # ← SET TO NULL
    new_active_role = None
```

**Why `null`?**
- User has NO active roles left
- System has no role to switch to
- Sets to null as fallback

**What User Sees**:
- Redirected to index.html
- Profile dropdown shows: "Add Role" button
- No roles to switch to
- User must add a new role to continue

---

## 🎯 SUMMARY TABLE

| Situation | `roles` Array | `active_role` | Remaining Roles | User Must... |
|-----------|---------------|---------------|-----------------|--------------|
| **OAuth Registration** | `null` or `[]` | `null` | None | Add first role |
| **Deactivate Active Role** | `[student, tutor, parent]` | `null` | `[tutor, parent]` | Choose from dropdown |
| **Delete Active Role (others exist)** | `[tutor, parent]` | `tutor` (auto) | `[tutor, parent]` | Nothing (auto-switched) |
| **Delete Last Active Role** | `[]` | `null` | None | Add new role |

---

## ✅ FRONTEND HANDLING

The frontend **already handles all these situations** via [js/root/profile-system.js:161-164](js/root/profile-system.js#L161-L164):

```javascript
function getProfileUrl(role) {
    // Guard against null/undefined role
    if (!role || role === 'undefined' || role === 'null') {
        console.warn('[profile-system] Invalid role - returning to index');
        return '/index.html';  // ✅ Safe redirect
    }

    // ... construct profile URL
}
```

**What happens when `active_role = null`:**
1. ✅ User stays on index.html
2. ✅ Profile dropdown shows "Add Role" or available roles
3. ✅ Clicking profile tries to go to null profile → redirects to index.html
4. ✅ User can add role or switch to existing role

---

## 🔄 HOW TO RECOVER FROM `active_role = null`

### Option 1: Switch to Existing Role
**If user has other active roles:**
```javascript
// User clicks role in dropdown
POST /api/switch-role { role: "tutor" }
// active_role becomes "tutor"
```

### Option 2: Add New Role
**If user has no active roles:**
```javascript
// User clicks "Add Role" → Selects "student"
POST /api/register {
    email: "user@example.com",
    password: "password",
    first_name: "Name",
    role: "student"
}
// active_role becomes "student"
```

### Option 3: Reactivate Deactivated Role
**If user deactivated a role:**
```javascript
// User clicks "Add Role" → Selects previously deactivated role
POST /api/register {
    email: "user@example.com",
    password: "password",
    role: "student"  // Previously deactivated
}
// Reactivation logic kicks in
// student_profiles.is_active = True
// active_role becomes "student"
```

---

## 🛡️ SAFETY CHECKS

### Backend Protection:
```python
# All endpoints that use active_role should check:
if not current_user.active_role:
    raise HTTPException(
        status_code=400,
        detail="No active role. Please select a role first."
    )
```

### Frontend Protection:
```javascript
// Before navigating to profile
if (!user.active_role) {
    showToast('Please select a role first', 'warning');
    return;
}
```

---

## 📊 FREQUENCY ANALYSIS

**How often does `active_role = null` happen?**

| Situation | Frequency | User Intent |
|-----------|-----------|-------------|
| **OAuth Registration** | Common | New user, needs to add role |
| **Deactivate Active Role** | Rare | Intentional deactivation |
| **Delete Active Role** | Very Rare | Usually auto-switches |
| **Delete Last Role** | Extremely Rare | User removing all roles |

**Most Common**: OAuth registration (new users)
**Least Common**: Deleting last role

---

## 🎯 DESIGN DECISION

**Why allow `active_role = null` at all?**

1. **Flexibility**: Role-optional registration
2. **User Control**: Let users choose when to add roles
3. **OAuth Support**: Google login doesn't require role immediately
4. **Deactivation UX**: User explicitly chooses next role (not automatic)

**Alternative (NOT chosen)**:
- Force role during registration ❌
- Auto-select first role during deactivation ❌
- Prevent deletion of last role ❌

---

## ✅ CONCLUSION

**`active_role` becomes `null` in 4 situations:**

1. ✅ **OAuth Registration** - New user hasn't added role yet
2. ✅ **Deactivate Current Role** - User chose to deactivate (must choose next)
3. ✅ **Delete Current Role (no others)** - User deleted only role
4. ✅ **Delete Last Active Role** - User removed all roles

**All situations are safe:**
- ✅ Frontend redirects to index.html
- ✅ User can add role or switch roles
- ✅ Profile pages protected from null access
- ✅ System handles gracefully

**No additional frontend changes needed** - the profile-system already handles `active_role = null` perfectly!

---

**Last Updated**: January 25, 2026
**Status**: ✅ Fully Documented
**Frontend**: ✅ Already Handles All Cases
