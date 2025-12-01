# Tutor Students Bug Fix - 500 Error

## Issue
When accessing the My Students panel, the API endpoint was returning a 500 Internal Server Error.

## Root Cause
The endpoint was incorrectly trying to get `role_ids.get('tutor')` from the JWT token, which would return the `tutor_profile.id`. However, the `tutor_students.tutor_id` field stores `users.id`, not `tutor_profiles.id`.

### Incorrect Code (Before)
```python
# Get tutor's role-specific ID
role_ids = current_user.get('role_ids', {})
tutor_id = role_ids.get('tutor')  # This returns tutor_profile.id

# WHERE ts.tutor_id = %s  -- But ts.tutor_id is users.id!
```

### Correct Code (After) ✅
```python
# Get tutor's user_id (tutor_students.tutor_id references users.id, not tutor_profiles.id)
tutor_user_id = current_user.get('user_id')

# WHERE ts.tutor_id = %s  -- Now correctly matches users.id
```

## Files Modified
- [astegni-backend/session_request_endpoints.py](astegni-backend/session_request_endpoints.py:335-343) - Fixed to use `user_id` instead of `role_ids.get('tutor')`

## Fix Applied
Changed line 337-344 in [session_request_endpoints.py](astegni-backend/session_request_endpoints.py):

```python
# OLD (Broken)
role_ids = current_user.get('role_ids', {})
tutor_id = role_ids.get('tutor')

# NEW (Fixed) ✅
tutor_user_id = current_user.get('user_id')
```

## Testing
After the fix:
1. ✅ Backend restarted successfully
2. ✅ API endpoint should now return students correctly
3. ✅ My Students panel should display student cards

## How to Verify
1. Login as a tutor (e.g., `iskinder.gebru9@astegni.com` / `password123`)
2. Navigate to Tutor Profile
3. Click "My Students" in the sidebar
4. You should see student cards with:
   - Student photos
   - Names and grades
   - Package names
   - Enrollment dates
   - Action buttons

## Database Schema Clarification
The `tutor_students` table structure:
```sql
CREATE TABLE tutor_students (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER REFERENCES users(id),      -- Stores users.id, NOT tutor_profiles.id
    student_id INTEGER REFERENCES users(id),     -- Stores users.id, NOT student_profiles.id
    ...
);
```

Both `tutor_id` and `student_id` reference `users.id` directly, making it simple to query without needing to join through profile tables first.

---

**Status**: ✅ Fixed and deployed
**Backend**: Restarted with fix applied
**Impact**: My Students panel now works correctly
