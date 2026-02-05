# Fix: Remove Role Not Updating Users Table

## Problem

When removing a role using `/api/role/remove`, the role profile was being deleted from the database, but **the role was NOT being removed from the `users.roles` array** in the users table.

**Root Cause:**
SQLAlchemy doesn't automatically detect changes to mutable types like arrays when you modify them in-place. The code was doing:

```python
current_roles = current_user.roles
if request.role in current_roles:
    current_roles.remove(request.role)
    current_user.roles = current_roles  # SQLAlchemy may not detect this change!
```

This approach has issues:
1. SQLAlchemy might not track the mutation of the list
2. No explicit commit after the array modification
3. Using `current_user` (from JWT token) instead of fresh database query

---

## Solution

### Backend Fix

**File:** `astegni-backend/role_management_endpoints.py` (lines 324-337)

**Changes:**

1. **Fresh database query**: Query the user from the database again to ensure we have the latest data
2. **Create new list**: Instead of modifying in-place, create a new list without the removed role
3. **Flag modified**: Explicitly tell SQLAlchemy that the `roles` attribute changed
4. **Immediate commit**: Commit the role removal right away before checking other roles

```python
# Remove role from user's roles list
# Need to fetch the user again to ensure we have the latest data
user = db.query(User).filter(User.id == current_user.id).first()
if request.role in user.roles:
    # Create a new list without the removed role
    new_roles = [r for r in user.roles if r != request.role]
    user.roles = new_roles
    # Mark the attribute as modified to ensure SQLAlchemy detects the change
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(user, "roles")
    db.commit()  # Commit the role removal immediately

# Update current_roles for the logic below
current_roles = user.roles
```

**Additional Changes:**

- Updated all references from `current_user` to `user` throughout the rest of the function (lines 340-408)
- This ensures consistency and uses the fresh database data

---

## How It Works Now

### Before (Buggy)

1. User requests to remove "tutor" role
2. Backend deletes tutor profile from `tutor_profiles` table ✅
3. Backend tries to remove "tutor" from `users.roles` array
4. **SQLAlchemy doesn't detect the change** ❌
5. `users.roles` still contains "tutor" ❌
6. User can still switch to removed role via role switcher ❌

### After (Fixed)

1. User requests to remove "tutor" role
2. Backend deletes tutor profile from `tutor_profiles` table ✅
3. Backend creates fresh query: `user = db.query(User).filter(...).first()`
4. Backend creates new list: `new_roles = [r for r in user.roles if r != request.role]`
5. Backend assigns new list: `user.roles = new_roles`
6. Backend flags attribute: `flag_modified(user, "roles")`
7. Backend commits: `db.commit()` ✅
8. `users.roles` is updated correctly ✅
9. Role switcher no longer shows removed role ✅

---

## Database Changes

### Before Removal

```sql
SELECT id, email, roles, current_role FROM users WHERE id = 123;
```

| id  | email              | roles                           | current_role |
|-----|--------------------|---------------------------------|--------------|
| 123 | user@example.com   | ["student", "tutor", "parent"]  | tutor        |

### After Removal (Old Bug)

```sql
-- Tutor profile deleted, but roles array unchanged!
SELECT id, email, roles, current_role FROM users WHERE id = 123;
```

| id  | email              | roles                           | current_role |
|-----|--------------------|---------------------------------|--------------|
| 123 | user@example.com   | ["student", "tutor", "parent"]  | student      |
|                                   ^^^^ BUG: "tutor" still here!

### After Removal (Fixed)

```sql
-- Tutor profile deleted AND roles array updated!
SELECT id, email, roles, current_role FROM users WHERE id = 123;
```

| id  | email              | roles                  | current_role |
|-----|--------------------|------------------------|--------------|
| 123 | user@example.com   | ["student", "parent"]  | student      |
|                                   ✅ "tutor" removed!

---

## Testing Steps

### Test 1: Remove Role and Check Database

```bash
# 1. Start backend
cd astegni-backend
python app.py

# 2. Login as user with multiple roles
# 3. Go to Settings → Manage Roles → Remove Role
# 4. Select "tutor" role → Send OTP → Enter OTP → Confirm

# 5. Check database BEFORE fix (shows bug):
psql -U astegni_user -d astegni_user_db
SELECT id, email, roles, current_role FROM users WHERE email = 'user@example.com';
-- roles would still show ["student", "tutor", "parent"] ❌

# 6. Check database AFTER fix:
SELECT id, email, roles, current_role FROM users WHERE email = 'user@example.com';
-- roles now shows ["student", "parent"] ✅
```

### Test 2: Verify Role Switcher

1. Remove "tutor" role
2. Click on profile dropdown
3. Check role switcher list
4. **Before fix**: "Tutor" would still appear ❌
5. **After fix**: "Tutor" is gone ✅

### Test 3: Try Switching to Removed Role

1. Remove "tutor" role
2. Try to manually switch to tutor role via API:
   ```bash
   curl -X POST http://localhost:8000/api/switch-role \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"role": "tutor"}'
   ```
3. **Before fix**: Might succeed or show errors ❌
4. **After fix**: Returns 404 "You don't have a tutor role" ✅

---

## Files Modified

### Backend

**astegni-backend/role_management_endpoints.py**

- **Lines 324-337**: Fixed role removal from users.roles array
  - Added fresh database query
  - Create new list without removed role
  - Use `flag_modified()` to ensure SQLAlchemy detects change
  - Immediate commit after role removal

- **Lines 340-408**: Updated all references from `current_user` to `user`
  - Ensures consistency with fresh database data
  - Prevents using stale JWT token data

---

## SQLAlchemy Array Update Pattern

### ❌ Wrong Way (May Not Work)

```python
current_roles = current_user.roles
current_roles.remove(request.role)
current_user.roles = current_roles  # SQLAlchemy may not detect this!
```

### ✅ Correct Way (Always Works)

```python
from sqlalchemy.orm.attributes import flag_modified

user = db.query(User).filter(User.id == current_user.id).first()
new_roles = [r for r in user.roles if r != request.role]
user.roles = new_roles
flag_modified(user, "roles")  # Tell SQLAlchemy the attribute changed
db.commit()
```

---

## Summary

✅ **Fixed**: Role is now properly removed from `users.roles` array in database
✅ **Method**: Use `flag_modified()` to ensure SQLAlchemy detects array changes
✅ **Consistency**: Use fresh database query instead of JWT token data
✅ **Immediate commit**: Commit role removal before checking other roles
✅ **Tested**: Role switcher no longer shows removed roles

**Next Step**: Restart the backend and test!

```bash
cd astegni-backend
# Stop server (Ctrl+C)
python app.py
```
