# Role Guard - Deactivated Roles Issue

## Critical Issue Discovered

The role guard **does not check if roles are deactivated** before offering to switch to them.

## The Problem

### Backend Reality
Each profile table has `is_active` and `scheduled_deletion_at` fields:
```python
# TutorProfile, StudentProfile, ParentProfile, AdvertiserProfile all have:
is_active = Column(Boolean, default=True)
scheduled_deletion_at = Column(DateTime, nullable=True)
```

When a user deactivates a role:
- The role **stays in `users.roles` array** (e.g., `["student", "tutor"]`)
- The profile table gets `is_active = False`
- Optionally, `scheduled_deletion_at` is set for deletion after 90 days

###Frontend Reality
The frontend only receives:
```javascript
{
    "roles": ["student", "tutor"],  // Just role names, no status
    "active_role": "tutor"
}
```

### The Bug
When role guard checks if user has allowed roles:
```javascript
// Line 66-67 in role-guard.js
const hasAllowedRole = user.roles.some(role =>
    ALLOWED_ROLES.includes(role.toLowerCase())
);
```

This checks **all roles in the array**, including deactivated ones!

**Example:**
1. User has roles: `["student", "tutor"]`
2. User deactivates student role (sets `student_profiles.is_active = False`)
3. User tries to access find-tutors as tutor (blocked)
4. Role guard sees "student" in roles array
5. **Offers to switch to student role** ❌ (but it's deactivated!)
6. User clicks "Switch to Student"
7. API `/api/switch-role` returns error: "Student role is deactivated"

## Current Backend API

### `/api/me` Response (lines 890-970)
Returns basic user info:
```json
{
    "id": 1,
    "active_role": "tutor",
    "roles": ["student", "tutor"],  // ❌ No status info
    "...": "..."
}
```

### `/api/my-roles` Response (lines 3748-3786)
Returns **only active roles**:
```python
# Filter out deactivated roles
active_roles = []

for role in current_user.roles:
    is_active = True

    if role == 'student':
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if profile and hasattr(profile, 'is_active'):
            is_active = profile.is_active
    # ... (checks other roles)

    if is_active:
        active_roles.append(role)

return {
    "active_role": active_role,
    "user_roles": active_roles  // ✅ Only active roles
}
```

## Solution Options

### Option 1: Use `/api/my-roles` in Role Guard (Recommended)
**Pros:**
- Accurate - only shows roles that can actually be switched to
- No backend changes needed
- Uses existing endpoint

**Cons:**
- Additional API call on page load (but can be done in parallel with `/api/me`)
- Slight performance impact (~50-100ms)

**Implementation:**
```javascript
// In role-guard.js
async function getActiveRoles() {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/api/my-roles`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.ok) {
        const data = await response.json();
        return data.user_roles;  // Only active roles
    }

    return [];
}

// Then in checkAccess()
const activeRoles = await getActiveRoles();
const hasAllowedRole = activeRoles.some(role =>
    ALLOWED_ROLES.includes(role.toLowerCase())
);
```

### Option 2: Enhance `/api/me` Response
**Pros:**
- No additional API call
- Better performance
- More complete user information

**Cons:**
- Requires backend changes
- More complex response structure

**Implementation:**

**Backend Change** (in `app.py modules/routes.py` line 890):
```python
@router.get("/api/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # ... existing code ...

    # Get active roles with status
    role_details = []
    for role in current_user.roles:
        is_active = True
        scheduled_deletion_at = None

        if role == 'student':
            profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
            if profile:
                is_active = profile.is_active if hasattr(profile, 'is_active') else True
                scheduled_deletion_at = profile.scheduled_deletion_at if hasattr(profile, 'scheduled_deletion_at') else None
        elif role == 'tutor':
            profile = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
            if profile:
                is_active = profile.is_active if hasattr(profile, 'is_active') else True
                scheduled_deletion_at = profile.scheduled_deletion_at if hasattr(profile, 'scheduled_deletion_at') else None
        # ... (check other roles)

        role_details.append({
            "role": role,
            "is_active": is_active,
            "scheduled_deletion_at": scheduled_deletion_at
        })

    return UserResponse(
        id=current_user.id,
        # ... existing fields ...
        roles=current_user.roles,  # Keep for backward compatibility
        role_details=role_details,  # NEW: Detailed role information
        # ... rest of response ...
    )
```

**Frontend Change** (in `role-guard.js`):
```javascript
// Check if user has role_details (new API) or fallback to roles array
const roleDetails = user.role_details;

if (roleDetails && Array.isArray(roleDetails)) {
    // Use new API with status info
    const hasAllowedRole = roleDetails.some(roleInfo =>
        roleInfo.is_active && ALLOWED_ROLES.includes(roleInfo.role.toLowerCase())
    );

    if (hasAllowedRole) {
        const activeAllowedRoles = roleDetails
            .filter(roleInfo => roleInfo.is_active && ALLOWED_ROLES.includes(roleInfo.role.toLowerCase()))
            .map(roleInfo => roleInfo.role);

        showRoleSwitchRequiredModal(activeAllowedRoles);  // Only show active roles
        return false;
    }
} else {
    // Fallback to old API (no status info)
    const hasAllowedRole = user.roles.some(role =>
        ALLOWED_ROLES.includes(role.toLowerCase())
    );
    // ... existing logic
}
```

### Option 3: Simple Fix - Cache `/api/my-roles` in localStorage
**Pros:**
- Quick to implement
- No performance impact after first load
- No backend changes

**Cons:**
- Cache can become stale
- Need to invalidate cache on role changes

**Implementation:**
```javascript
// In auth.js after /api/me call
async function cacheActiveRoles() {
    const response = await fetch(`${API_BASE_URL}/api/my-roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('activeRoles', JSON.stringify(data.user_roles));
    }
}

// In role-guard.js
const activeRoles = JSON.parse(localStorage.getItem('activeRoles') || '[]');
const hasAllowedRole = activeRoles.some(role =>
    ALLOWED_ROLES.includes(role.toLowerCase())
);
```

## Recommended Solution

**Use Option 1** (call `/api/my-roles` in role guard):

**Reasons:**
1. ✅ Accurate - always uses fresh data
2. ✅ No backend changes needed
3. ✅ Simple to implement
4. ✅ Only ~50-100ms performance impact
5. ✅ Works with existing API

**Implementation Plan:**
1. Modify `waitForAuthAndCheck()` to wait for both `/api/me` and `/api/my-roles`
2. Store active roles in a variable
3. Use active roles for all role checks in `checkAccess()`
4. Only offer to switch to active allowed roles

## Testing Scenarios

After implementing the fix, test these cases:

1. **User with active student role**
   - Current: tutor
   - Roles: ["tutor", "student"] (both active)
   - Expected: Offer to switch to student ✅

2. **User with deactivated student role**
   - Current: tutor
   - Roles: ["tutor", "student"] (student deactivated)
   - Expected: Block access, show "Add student role" ❌ (current: offers switch)

3. **User with scheduled deletion student role**
   - Current: tutor
   - Roles: ["tutor", "student"] (student scheduled for deletion)
   - Expected: Block access or show warning about scheduled deletion

4. **User with no active allowed roles**
   - Current: tutor
   - Roles: ["tutor", "advertiser"] (all deactivated)
   - Expected: Show "Add student/parent role"

## Implementation Code

See `ROLE_GUARD_ACTIVE_ROLES_FIX.md` for complete implementation code.

## Status

**Status:** ⚠️ ISSUE IDENTIFIED - FIX PENDING

**Priority:** HIGH (users may see confusing "switch to X" when X is deactivated)

**Impact:** Medium (error message from API prevents actual switch, but UX is confusing)

**Effort:** Low (~30 minutes to implement Option 1)
