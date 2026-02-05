# Deactivated Roles Hidden from Dropdown

## Summary
Modified the `/api/my-roles` endpoint to filter out deactivated roles. This ensures that deactivated roles do not appear in the profile dropdown menu or role switcher on any page.

## Change Made

### Backend: `app.py modules/routes.py` (lines 3486-3523)

**Before:**
```python
@router.get("/api/my-roles")
def get_user_roles(current_user: User = Depends(get_current_user)):
    """Get current user's roles and active role"""
    return {
        "user_roles": current_user.roles,
        "active_role": current_user.active_role
    }
```

**After:**
```python
@router.get("/api/my-roles")
def get_user_roles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's roles and active role (only returns active roles)"""
    # Filter out deactivated roles
    active_roles = []

    for role in current_user.roles:
        # Check if role is active
        is_active = True

        if role == 'student':
            profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
            if profile and hasattr(profile, 'is_active'):
                is_active = profile.is_active
        elif role == 'tutor':
            profile = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
            if profile and hasattr(profile, 'is_active'):
                is_active = profile.is_active
        elif role == 'parent':
            profile = db.query(ParentProfile).filter(ParentProfile.user_id == current_user.id).first()
            if profile and hasattr(profile, 'is_active'):
                is_active = profile.is_active
        elif role == 'advertiser':
            profile = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == current_user.id).first()
            if profile and hasattr(profile, 'is_active'):
                is_active = profile.is_active

        # Only include active roles
        if is_active:
            active_roles.append(role)

    return {
        "user_roles": active_roles,
        "active_role": current_user.active_role
    }
```

## Impact

### What Changed
- The `/api/my-roles` endpoint now queries each role's profile to check the `is_active` flag
- Only roles with `is_active = True` are included in the `user_roles` array
- Deactivated roles are automatically filtered out

### Where This Affects

1. **Profile Dropdown Menu** (all pages)
   - Uses `setupRoleSwitcher()` which calls `/api/my-roles`
   - Deactivated roles will not appear in the dropdown
   - User can only switch between active roles

2. **Mobile Role Switcher**
   - Also uses data from `/api/my-roles`
   - Deactivated roles hidden on mobile as well

3. **Role Badges/Tags**
   - Any UI component showing user's roles will only show active ones

## User Experience

### Before Deactivation
```
Profile Dropdown:
  - Student (ACTIVE)
  - Tutor
  - Parent
  + Add New Role
```

### After Deactivating Tutor Role
```
Profile Dropdown:
  - Student (ACTIVE)
  - Parent
  + Add New Role
```
(Tutor role is completely hidden from dropdown)

### After Reactivating Tutor Role
```
Profile Dropdown:
  - Student (ACTIVE)
  - Tutor
  - Parent
  + Add New Role
```
(Tutor role reappears immediately)

## How Reactivation Works

1. User deactivates a role → It disappears from dropdown
2. User clicks "+ Add New Role"
3. Selects the deactivated role
4. System detects it's deactivated and shows warning message
5. User enters password + OTP
6. Role is reactivated (`is_active = True`)
7. Role automatically reappears in dropdown on next load

## Technical Details

### Performance Consideration
- The endpoint now makes 1 additional database query per role to check `is_active`
- For a user with 4 roles, this is 4 additional queries
- This is acceptable because:
  - The endpoint is only called when opening the profile dropdown
  - Not called on every page load
  - Queries are simple primary key lookups (very fast)

### Caching
- Frontend caches user roles in `currentUser.roles`
- When roles are added/reactivated, `setupRoleSwitcher()` is called to refresh
- This ensures the dropdown updates immediately

## Testing Checklist

- [x] Deactivate role → Verify it disappears from dropdown
- [x] Deactivate role → Verify it disappears from mobile switcher
- [x] Reactivate role → Verify it reappears in dropdown
- [x] Switch between active roles → Verify only active roles shown
- [x] Multiple roles with one deactivated → Verify correct filtering
- [x] Last role deactivated → Verify still shows "Add Role" option

## Version
- **Modified**: January 23, 2026
- **Version**: 1.1.0
- **Related Feature**: Role Reactivation (ROLE_REACTIVATION_FEATURE.md)
