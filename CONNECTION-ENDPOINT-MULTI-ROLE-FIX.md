# Connection Endpoint - Multi-Role User Fix

## Issue
Users with multiple profiles (e.g., both tutor AND student) could not receive connection requests because the backend was checking only the PRIMARY role instead of ALL roles.

**Error:**
```
Error: Target user does not have 'student' role
Status: 400 Bad Request
```

**Root Cause:**
The connection endpoint used `get_user_role()` which returns only the PRIMARY role with priority (tutor > student > parent > advertiser).

For user_id 115 who has BOTH tutor and student profiles:
- `get_user_role(115)` returns `'tutor'` (higher priority)
- Connection request to connect as 'student' fails validation

---

## Solution

Changed the role validation from primary role check to all roles check.

### File Modified: `astegni-backend/connection_endpoints.py`

**Lines 138-144**

**Before (Strict Primary Role Check):**
```python
# Verify target user has the specified role
target_user_role = get_user_role(db, target_user_id)
if target_user_role != target_role:
    raise HTTPException(
        status_code=400,
        detail=f"Target user does not have '{target_role}' role"
    )
```

**After (Flexible Multi-Role Check):**
```python
# Verify target user has the specified role (check all roles, not just primary)
target_user_roles = get_all_user_roles(db, target_user_id)
if target_role not in target_user_roles:
    raise HTTPException(
        status_code=400,
        detail=f"Target user does not have '{target_role}' role. Available roles: {', '.join(target_user_roles) if target_user_roles else 'none'}"
    )
```

---

## What Changed

### 1. Function Used
- **Before**: `get_user_role(db, target_user_id)` - Returns single primary role
- **After**: `get_all_user_roles(db, target_user_id)` - Returns list of all roles

### 2. Validation Logic
- **Before**: `target_user_role != target_role` - Exact match required
- **After**: `target_role not in target_user_roles` - Check if role exists in list

### 3. Error Message
- **Before**: "Target user does not have 'student' role"
- **After**: "Target user does not have 'student' role. Available roles: tutor, student"

The improved error message now shows what roles the user actually has, making debugging easier.

---

## Role Priority System

The `get_user_role()` function prioritizes roles as follows:

1. **tutor** (highest priority)
2. **student**
3. **parent**
4. **advertiser** (lowest priority)

**Example:**
- User has profiles: tutor + student
- `get_user_role()` → returns `'tutor'`
- `get_all_user_roles()` → returns `['tutor', 'student']`

This priority system is used for:
- Default role selection when user logs in
- Backward compatibility with old code
- Determining "primary identity" for analytics

But for connection validation, we need to check ALL roles, not just the primary.

---

## Why Multi-Role Users Exist

Users can have multiple profiles on Astegni:

**Common Scenarios:**
1. **Tutor + Student**: A tutor who is also taking advanced courses
2. **Student + Parent**: A student parent managing their child's education
3. **Tutor + Parent**: A tutor who has children on the platform
4. **All Roles**: Power users with complete platform access

**Database Structure:**
- `users` table: Base user account (email, password, etc.)
- `tutor_profiles` table: Tutor-specific data (subjects, rates, etc.)
- `student_profiles` table: Student-specific data (grade, subjects, etc.)
- `parent_profiles` table: Parent-specific data (children, etc.)
- `advertiser_profiles` table: Advertiser-specific data

One user can have multiple profile rows across these tables, all linked by `user_id`.

---

## Impact

### Before Fix:
❌ Tutor/Student user views student profile → Cannot connect
❌ Error: "Target user does not have 'student' role"
❌ Connection fails even though target IS a student

### After Fix:
✅ Tutor/Student user views student profile → Can connect as student
✅ System checks ALL roles, not just primary
✅ Connection succeeds if target has ANY matching role

---

## Testing

### Test Case 1: User with Single Role
**User**: user_id 50 (only student profile)
```python
get_user_role(50) → 'student'
get_all_user_roles(50) → ['student']
```
**Result**: ✅ Works before and after fix

### Test Case 2: User with Multiple Roles (Primary = tutor)
**User**: user_id 115 (tutor + student profiles)
```python
get_user_role(115) → 'tutor' (primary)
get_all_user_roles(115) → ['tutor', 'student']
```

**Before Fix:**
```
POST /api/connections
{
  "recipient_id": 115,
  "recipient_type": "student",
  "requester_type": "tutor"
}

Response: 400 Bad Request
Error: "Target user does not have 'student' role"
```

**After Fix:**
```
POST /api/connections
{
  "recipient_id": 115,
  "recipient_type": "student",
  "requester_type": "tutor"
}

Response: 201 Created
{
  "id": 42,
  "requested_by": 101,
  "recipient_id": 115,
  "requester_type": "tutor",
  "recipient_type": "student",
  "status": "pending",
  "created_at": "2025-11-24T..."
}
```

### Test Case 3: User Without Requested Role
**User**: user_id 75 (only advertiser profile)
```python
get_all_user_roles(75) → ['advertiser']
```

**Request:**
```
POST /api/connections
{
  "recipient_id": 75,
  "recipient_type": "student",
  "requester_type": "tutor"
}

Response: 400 Bad Request
Error: "Target user does not have 'student' role. Available roles: advertiser"
```
**Result**: ✅ Correctly rejects with helpful error message

---

## Related Functions

### `get_user_role(db, user_id)` - Primary Role
```python
def get_user_role(db: Session, user_id: int) -> Optional[str]:
    """
    Get the primary role for a user (prioritize: tutor > student > parent > advertiser)
    Returns the role type as string or None
    """
    if db.query(TutorProfile).filter(TutorProfile.user_id == user_id).first():
        return 'tutor'
    if db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first():
        return 'student'
    if db.query(ParentProfile).filter(ParentProfile.user_id == user_id).first():
        return 'parent'
    if db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user_id).first():
        return 'advertiser'
    return None
```

### `get_all_user_roles(db, user_id)` - All Roles
```python
def get_all_user_roles(db: Session, user_id: int) -> List[str]:
    """
    Get all roles for a user (for users with multiple profiles)
    Returns list of role types the user has
    """
    roles = []
    if db.query(TutorProfile).filter(TutorProfile.user_id == user_id).first():
        roles.append('tutor')
    if db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first():
        roles.append('student')
    if db.query(ParentProfile).filter(ParentProfile.user_id == user_id).first():
        roles.append('parent')
    if db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user_id).first():
        roles.append('advertiser')
    return roles
```

---

## API Endpoint Details

**POST /api/connections**

**Request Body:**
```json
{
  "recipient_id": 115,           // Target user's user_id
  "recipient_type": "student",   // Role to connect as (student/tutor/parent)
  "requester_type": "tutor"      // Your role when connecting (optional)
}
```

**Validation Steps:**
1. ✅ Check requester has `requester_type` profile (if specified)
2. ✅ Check target user exists
3. ✅ **Check target user has `recipient_type` profile** ← FIXED
4. ✅ Prevent self-connection
5. ✅ Check for existing connection
6. ✅ Create connection with status 'pending'

**Response:**
```json
{
  "id": 42,
  "requested_by": 101,
  "recipient_id": 115,
  "requester_type": "tutor",
  "recipient_type": "student",
  "status": "pending",
  "created_at": "2025-11-24T10:30:00.000Z",
  "updated_at": "2025-11-24T10:30:00.000Z"
}
```

---

## Backward Compatibility

### No Breaking Changes:
✅ Users with single role → Works exactly the same
✅ Existing connections → Not affected
✅ API contract → Same request/response format
✅ Error handling → Enhanced with better messages

### Improvements:
✅ Multi-role users can now receive connections for ANY of their roles
✅ Error messages show available roles for easier debugging
✅ More flexible and intuitive behavior

---

## Related Code

### Connection Manager (Frontend)
**File**: `js/view-tutor/connection-manager.js`

The ConnectionManager sends connection requests with the format:
```javascript
{
  recipient_id: targetUserId,
  recipient_type: 'student',  // or 'tutor', 'parent'
  requester_type: currentUserRole
}
```

### View Student Page
**File**: `view-profiles/view-student.html`

```javascript
async function connectStudent() {
    const connectionManager = window.connectionManagerInstance;
    const studentUserId = window.currentStudentUserId;

    // Sends request to connect with student
    await connectionManager.sendConnectionRequest(studentUserId);
}
```

### View Tutor Page
**File**: `view-profiles/view-tutor.html`

```javascript
async function connectTutor() {
    const connectionManager = window.connectionManagerInstance;
    const tutorUserId = window.currentTutorUserId;

    // Sends request to connect with tutor
    await connectionManager.sendConnectionRequest(tutorUserId);
}
```

---

## Status

✅ **FIXED** - Multi-role users can now receive connection requests for any of their roles, not just their primary role.

---

## Benefits

### For Users:
✅ Can connect with multi-role users without errors
✅ Intuitive behavior - if someone is a student, you can connect as student
✅ No need to know about "primary role" concept

### For Developers:
✅ Better error messages for debugging
✅ Shows available roles when validation fails
✅ More maintainable code
✅ Aligns with multi-role user architecture

### For Platform:
✅ Supports complex user scenarios
✅ Enables tutors who are also students
✅ Enables parents who are also tutors
✅ More flexible connection system

---

## Future Enhancements (Optional)

1. **Role-Specific Connections**:
   - Allow same users to connect in multiple roles
   - Example: Connected as tutor-student AND as friends (parent-parent)

2. **Connection Context**:
   - Store why users connected (tutoring, collaboration, networking)
   - Display connection type in UI

3. **Role Switching in Connections**:
   - After connecting, allow users to message from different role contexts
   - Example: "Message as tutor" vs "Message as student"

---

## Related Documentation

- **ConnectionManager Integration**: VIEW-STUDENT-CONNECTION-MANAGER-INTEGRATION.md
- **Message Button**: VIEW-STUDENT-MESSAGE-BUTTON-ADDED.md
- **Documents System**: VIEW-STUDENT-DOCUMENTS-DYNAMIC-UPDATE.md
- **Bug Fixes**: VIEW-STUDENT-DOCUMENTS-BUGFIX.md
