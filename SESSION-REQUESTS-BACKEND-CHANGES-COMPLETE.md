# Session Requests Backend Changes - COMPLETE ✅

## Summary

All backend endpoints in `astegni-backend/session_request_endpoints.py` have been updated to use **role-specific IDs** instead of `user_id`.

---

## Changes Made

### 1. ✅ `get_current_user()` - Extract role_ids from JWT (Lines 43-91)

**Added:**
```python
# Extract role_ids and active_role from JWT token
role_ids = payload.get("role_ids", {})
active_role = payload.get("role")

# Return user dict with role_ids from JWT
return {
    # ... existing fields ...
    "role_ids": role_ids  # Add role_ids from JWT payload
}
```

**Impact:** Now all endpoints have access to role-specific IDs via `current_user['role_ids']`

---

###2. ✅ `create_session_request()` - Use role-specific ID for requester (Lines 151-212)

**Before:**
```python
requester_type = 'student' if 'student' in current_user.get('roles', []) else 'parent'
cur.execute(..., (request.tutor_id, current_user['id'], requester_type, ...))
#                                      ❌ user_id
```

**After:**
```python
# Get active role and role-specific IDs from JWT
active_role = current_user.get('active_role')
role_ids = current_user.get('role_ids', {})

# Determine requester type and get role-specific ID
if active_role == 'student':
    requester_type = 'student'
    requester_id = role_ids.get('student')  # ✅ student_profiles.id
elif active_role == 'parent':
    requester_type = 'parent'
    requester_id = role_ids.get('parent')   # ✅ parent_profiles.id
else:
    raise HTTPException(403, "Only students and parents can request sessions")

cur.execute(..., (request.tutor_id, requester_id, requester_type, ...))
#                                    ✅ role-specific ID
```

**Impact:** Session requests now store `student_profiles.id` or `parent_profiles.id` in `requester_id`

---

### 3. ✅ `get_tutor_session_requests()` - JOIN by requester_type (Lines 218-320)

**Before:**
```python
LEFT JOIN users u ON sr.requester_id = u.id
WHERE sr.tutor_id = %s
""", (current_user['id'],))
#      ❌ user_id
```

**After:**
```python
# Get tutor's role-specific ID
tutor_id = role_ids.get('tutor')  # ✅ tutor_profiles.id

# Join based on requester_type
SELECT
    sr.*,
    CASE
        WHEN sr.requester_type = 'student' THEN
            (SELECT CONCAT(u.first_name, ' ', u.father_name)
             FROM student_profiles sp
             JOIN users u ON sp.user_id = u.id
             WHERE sp.id = sr.requester_id)  # ✅ student_profiles.id
        WHEN sr.requester_type = 'parent' THEN
            (SELECT CONCAT(u.first_name, ' ', u.father_name)
             FROM parent_profiles pp
             JOIN users u ON pp.user_id = u.id
             WHERE pp.id = sr.requester_id)  # ✅ parent_profiles.id
    END as requester_name,
    ...
FROM session_requests sr
WHERE sr.tutor_id = %s
""", (tutor_id,))  # ✅ tutor_profiles.id
```

**Impact:** Tutors now see correct requester names from student/parent profiles

---

### 4. ✅ `get_my_students()` - Use tutor role-specific ID (Lines 323-397)

**Before:**
```python
WHERE sr.tutor_id = %s AND sr.status = 'accepted'
""", (current_user['id'],))
#      ❌ user_id
```

**After:**
```python
# Get tutor's role-specific ID
tutor_id = role_ids.get('tutor')  # ✅ tutor_profiles.id

WHERE sr.tutor_id = %s AND sr.status = 'accepted'
""", (tutor_id,))  # ✅ tutor_profiles.id
```

**Impact:** Tutors see correct list of accepted students

---

### 5. ✅ `get_session_request_detail()` - Use tutor role-specific ID (Lines 399-488)

**Before:**
```python
LEFT JOIN users u ON sr.requester_id = u.id
WHERE sr.id = %s AND sr.tutor_id = %s
""", (request_id, current_user['id']))
#                  ❌ user_id
```

**After:**
```python
# Get tutor's role-specific ID
tutor_id = role_ids.get('tutor')  # ✅ tutor_profiles.id

# CASE statements to join based on requester_type
WHERE sr.id = %s AND sr.tutor_id = %s
""", (request_id, tutor_id))  # ✅ tutor_profiles.id
```

**Impact:** Tutor can only view requests addressed to their tutor profile

---

### 6. ✅ `update_session_request_status()` - Use tutor role-specific ID (Lines 490-537)

**Before:**
```python
WHERE id = %s AND tutor_id = %s AND status = 'pending'
""", (update.status, request_id, current_user['id']))
#                                 ❌ user_id
```

**After:**
```python
# Get tutor's role-specific ID
tutor_id = role_ids.get('tutor')  # ✅ tutor_profiles.id

WHERE id = %s AND tutor_id = %s AND status = 'pending'
""", (update.status, request_id, tutor_id))  # ✅ tutor_profiles.id
```

**Impact:** Only the correct tutor can accept/reject their requests

---

### 7. ✅ `get_my_session_requests()` - Filter by role-specific ID (Lines 539-620)

**Before:**
```python
LEFT JOIN users u ON sr.tutor_id = u.id
WHERE sr.requester_id = %s
ORDER BY sr.created_at DESC
""", (current_user['id'],))
#      ❌ user_id
```

**After:**
```python
# Get active role and role-specific IDs
active_role = current_user.get('active_role')
role_ids = current_user.get('role_ids', {})

# Determine requester type and get role-specific ID
if active_role == 'student':
    requester_type = 'student'
    requester_id = role_ids.get('student')  # ✅ student_profiles.id
elif active_role == 'parent':
    requester_type = 'parent'
    requester_id = role_ids.get('parent')   # ✅ parent_profiles.id

# Join with tutor_profiles to get tutor info
LEFT JOIN tutor_profiles tp ON sr.tutor_id = tp.id
LEFT JOIN users u ON tp.user_id = u.id
WHERE sr.requester_id = %s AND sr.requester_type = %s
ORDER BY sr.created_at DESC
""", (requester_id, requester_type))
#      ✅ role-specific ID and type filter
```

**Impact:** Students/parents only see requests they sent in their current role

---

## Database Impact

### session_requests Table

**Before fix:**
```
id  | tutor_id | requester_id | requester_type
1   | 789      | 123          | 'student'
     (tutor)    (users.id ❌)
```

**After fix:**
```
id  | tutor_id | requester_id | requester_type
1   | 789      | 456          | 'student'
     (tutor     (student_profiles.id ✅)
      _profiles
      .id)
```

---

## Benefits

### 1. **Proper Role Separation**
- User with both student + parent roles has separate request histories
- Switching roles shows only relevant requests

### 2. **Data Integrity**
- Foreign key relationships are logically correct
- `requester_id` actually points to the requester's profile table

### 3. **Accurate Queries**
- JOINs now fetch correct profile information
- No mix-up between different role identities

### 4. **Security**
- Users can only access requests for their current role
- Tutors can only manage their own tutor profile's requests

---

## Testing Scenarios

### Scenario 1: User with Single Role (Student Only)

```
User: Alice (users.id = 100)
└─ Student Profile (student_profiles.id = 200)

1. Alice requests session from Tutor Bob
   → requester_id = 200 (student_profiles.id) ✅

2. Alice views "My Requests" in student-profile.html
   → Query: WHERE requester_id = 200 AND requester_type = 'student'
   → Shows: Her request to Bob ✅
```

### Scenario 2: User with Multiple Roles (Student + Parent)

```
User: John (users.id = 100)
├─ Student Profile (student_profiles.id = 200)
└─ Parent Profile (parent_profiles.id = 300)

1. John (as Student) requests session from Tutor Bob
   → requester_id = 200, requester_type = 'student' ✅

2. John switches to Parent role

3. John (as Parent) requests session from Tutor Sara
   → requester_id = 300, requester_type = 'parent' ✅

4. John (as Student) views "My Requests"
   → Query: WHERE requester_id = 200 AND requester_type = 'student'
   → Shows: Only request to Bob (not Sara) ✅

5. John (as Parent) views "My Requests"
   → Query: WHERE requester_id = 300 AND requester_type = 'parent'
   → Shows: Only request to Sara (not Bob) ✅
```

### Scenario 3: Tutor Receiving Requests

```
Tutor: Bob (users.id = 110)
└─ Tutor Profile (tutor_profiles.id = 789)

1. Receives request from Student Alice (student_profiles.id = 200)
2. Receives request from Parent John (parent_profiles.id = 300)

3. Bob views "Session Requests" in tutor-profile.html
   → Query: WHERE tutor_id = 789
   → Shows:
     - Request from Alice (requester_id=200, requester_type='student')
     - Request from John (requester_id=300, requester_type='parent')
   → Names fetched correctly via CASE statements ✅
```

---

## What's Next?

### Frontend Updates Needed:

1. ✅ **Backend is complete** - No changes needed to API calls
2. ⏳ **Add "My Session Requests" panel to student-profile.html**
3. ⏳ **Add "My Session Requests" panel to parent-profile.html**
4. ⏳ **Test end-to-end flow**

The frontend already sends the correct JWT token with role_ids, so no JavaScript changes are needed for making requests. We just need to add UI panels to display the requests.

---

## Files Modified

- ✅ `astegni-backend/session_request_endpoints.py` (All 7 endpoints updated)

## Lines Changed

- `get_current_user()`: Lines 43-91
- `create_session_request()`: Lines 151-212
- `get_tutor_session_requests()`: Lines 218-320
- `get_my_students()`: Lines 323-397
- `get_session_request_detail()`: Lines 399-488
- `update_session_request_status()`: Lines 490-537
- `get_my_session_requests()`: Lines 539-620

---

## Status: ✅ BACKEND COMPLETE!

All backend changes are complete and ready for testing. The session request system now properly uses role-specific IDs throughout the entire flow.
