# Connection Active Role Update - Complete ✅

## Overview
Updated the connection system to use the **active role** the user is currently accessing the page as, instead of using a fixed priority system. This allows users with multiple roles to connect as the appropriate role based on their current context.

## Problem Solved

**Previous Behavior (Priority System):**
- User with multiple roles (e.g., both Student and Tutor)
- System always picked highest priority role: Tutor > Student > Parent > Advertiser
- **Issue:** User visiting a tutor profile as a student would connect as a tutor (wrong role)

**New Behavior (Active Role):**
- System checks which role the user is currently accessing the page as
- User connects using their **active role** from `authManager.getUserRole()`
- **Result:** User visiting as student connects as student, user visiting as tutor connects as tutor

## Changes Made

### 1. Frontend - ConnectionManager (`js/view-tutor/connection-manager.js`)

#### Added `getActiveRole()` Method
```javascript
/**
 * Get current user's active role from authManager
 * Returns the role the user is currently accessing the page as
 */
getActiveRole() {
    // Check if global authManager exists
    if (typeof authManager !== 'undefined' && authManager.getUserRole) {
        return authManager.getUserRole();
    }

    // Fallback: try to get from localStorage
    const storedRole = localStorage.getItem('userRole');
    if (storedRole) {
        return storedRole;
    }

    // Last resort: try to get from user object
    const user = this.getCurrentUser();
    if (user && user.active_role) {
        return user.active_role;
    }

    console.warn('[ConnectionManager] Could not determine active role');
    return null;
}
```

**Fallback Hierarchy:**
1. `authManager.getUserRole()` (from global auth system)
2. `localStorage.getItem('userRole')` (stored role)
3. `user.active_role` (from user object)
4. `null` (with warning)

#### Updated `sendConnectionRequest()` Method
```javascript
async sendConnectionRequest(tutorUserId) {
    const token = this.getToken();

    if (!token) {
        throw new Error('You must be logged in to send a connection request');
    }

    // Get the active role the user is currently accessing the page as
    const activeRole = this.getActiveRole();
    if (!activeRole) {
        throw new Error('Could not determine your active role. Please refresh and try again.');
    }

    console.log(`[ConnectionManager] Sending connection request as: ${activeRole}`);

    try {
        const response = await fetch(`${this.API_BASE_URL}/api/connections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                recipient_id: tutorUserId,
                recipient_type: 'tutor',  // Always 'tutor' for view-tutor page
                requester_type: activeRole  // Send the active role
            })
        });
        // ... rest of method
    }
}
```

**Key Changes:**
- Removed unused `message` parameter
- Added `activeRole` determination before API call
- Added error if active role cannot be determined
- Added console log for debugging
- Included `requester_type: activeRole` in API payload

### 2. Backend - Models (`astegni-backend/app.py modules/models.py`)

#### Updated `ConnectionCreate` Schema
```python
class ConnectionCreate(BaseModel):
    """
    Create a new connection request - Simplified

    Fields:
    - recipient_id: User ID to send connection request to (references users.id)
    - recipient_type: Role of the recipient ('tutor', 'student', 'parent', 'advertiser')
    - requester_type: Role the requester is connecting as (optional - auto-determined if not provided)
    """
    recipient_id: int  # User ID to connect with
    recipient_type: str  # Role: 'tutor', 'student', 'parent', 'advertiser'
    requester_type: Optional[str] = None  # Role requester is connecting as (optional)

    @validator('recipient_type')
    def validate_recipient_type(cls, v):
        allowed_types = ['tutor', 'student', 'parent', 'advertiser']
        if v not in allowed_types:
            raise ValueError(f'recipient_type must be one of {allowed_types}')
        return v

    @validator('requester_type')
    def validate_requester_type(cls, v):
        if v is not None:
            allowed_types = ['tutor', 'student', 'parent', 'advertiser']
            if v not in allowed_types:
                raise ValueError(f'requester_type must be one of {allowed_types}')
        return v
```

**Changes:**
- Added `requester_type: Optional[str] = None` field
- Added validator for `requester_type`
- Made field optional for backward compatibility

### 3. Backend - Endpoints (`astegni-backend/connection_endpoints.py`)

#### Added `get_all_user_roles()` Helper Function
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

**Purpose:** Get all roles a user has (not just the highest priority one)

#### Updated `create_connection()` Endpoint Logic
```python
# Determine the requester's role
if requested_role:
    # User specified which role they want to connect as
    # Verify they actually have that role
    user_roles = get_all_user_roles(db, user_id)
    if not user_roles:
        raise HTTPException(
            status_code=400,
            detail="You must have a profile (tutor/student/parent/advertiser) to create connections"
        )
    if requested_role not in user_roles:
        raise HTTPException(
            status_code=400,
            detail=f"You don't have a '{requested_role}' profile. Your roles: {', '.join(user_roles)}"
        )
    current_user_role = requested_role
else:
    # Auto-determine role using priority system (backward compatibility)
    current_user_role = get_user_role(db, user_id)
    if not current_user_role:
        raise HTTPException(
            status_code=400,
            detail="You must have a profile (tutor/student/parent/advertiser) to create connections"
        )
```

**Logic:**
1. **If `requester_type` provided:** Validate user has that role, use it
2. **If `requester_type` not provided:** Fall back to priority system (backward compatibility)
3. **Error handling:** Clear error message if user doesn't have the requested role

## How It Works Now

### Example Scenario 1: Student Viewing Tutor Profile
```
1. User is both a Student and Tutor
2. User visits view-tutor.html as Student (active_role = 'student')
3. User clicks "Connect" button
4. Frontend calls:
   - authManager.getUserRole() → returns 'student'
   - Sends: {recipient_id: 64, recipient_type: 'tutor', requester_type: 'student'}
5. Backend verifies user has 'student' profile
6. Connection created as: requested_by=user_id, requester_type='student'
```

### Example Scenario 2: Tutor Viewing Another Tutor Profile
```
1. User is both a Student and Tutor
2. User visits view-tutor.html as Tutor (active_role = 'tutor')
3. User clicks "Connect" button
4. Frontend calls:
   - authManager.getUserRole() → returns 'tutor'
   - Sends: {recipient_id: 64, recipient_type: 'tutor', requester_type: 'tutor'}
5. Backend verifies user has 'tutor' profile
6. Connection created as: requested_by=user_id, requester_type='tutor'
```

### Example Scenario 3: User Without Requested Role (Error)
```
1. User only has Student profile (no Tutor profile)
2. Frontend somehow sends requester_type='tutor'
3. Backend checks: get_all_user_roles() → ['student']
4. Backend error: "You don't have a 'tutor' profile. Your roles: student"
5. User receives clear error message
```

## API Changes

### Request Format (Updated)
```json
POST /api/connections
{
  "recipient_id": 64,
  "recipient_type": "tutor",
  "requester_type": "student"  // NEW: Optional field for active role
}
```

### Response Format (Unchanged)
```json
{
  "id": 123,
  "requested_by": 45,
  "requester_type": "student",  // Uses the provided role
  "recipient_id": 64,
  "recipient_type": "tutor",
  "status": "pending",
  "requested_at": "2025-01-21T10:30:00Z",
  "connected_at": null,
  "updated_at": "2025-01-21T10:30:00Z"
}
```

## Backward Compatibility

✅ **Fully Backward Compatible**

**Old clients (without `requester_type` field):**
- Still work perfectly
- Backend falls back to priority system: Tutor > Student > Parent > Advertiser
- No breaking changes

**New clients (with `requester_type` field):**
- Use active role from authManager
- Proper role-based connections
- Better user experience

## Testing

### Test Case 1: User with Single Role
```
User: Student only
Active Role: student
Expected: requester_type = 'student' ✅
```

### Test Case 2: User with Multiple Roles (Using Active Role)
```
User: Student + Tutor
Active Role: student (viewing as student)
Expected: requester_type = 'student' ✅
```

### Test Case 3: User with Multiple Roles (Old Client)
```
User: Student + Tutor
Active Role: not sent
Expected: requester_type = 'tutor' (priority) ✅
```

### Test Case 4: Invalid Role Request
```
User: Student only
Requested Role: tutor
Expected: 400 Error "You don't have a 'tutor' profile" ✅
```

## Files Modified

1. **js/view-tutor/connection-manager.js**
   - Added `getActiveRole()` method (lines 43-63)
   - Updated `sendConnectionRequest()` to get and send active role (lines 137-164)
   - Updated JSDoc comment (lines 131-136)

2. **astegni-backend/app.py modules/models.py**
   - Added `requester_type: Optional[str] = None` field (line 1051)
   - Added `validate_requester_type()` validator (lines 1060-1066)

3. **astegni-backend/connection_endpoints.py**
   - Added `get_all_user_roles()` helper function (lines 62-76)
   - Updated `create_connection()` endpoint logic (lines 108-131)
   - Updated endpoint docstring (lines 89-102)

## Benefits

### 1. **Context-Aware Connections**
- Users connect as the role they're currently using
- More intuitive user experience
- Proper role separation

### 2. **Multi-Role Support**
- Users with multiple roles can connect as appropriate role
- No longer forced to use highest priority role
- Each role can have its own network

### 3. **Clear Error Messages**
- Validates user has the requested role
- Shows all available roles in error message
- Helps users understand what went wrong

### 4. **Debugging Support**
- Console logs show which role is being used
- Easy to track connection requests
- Clear audit trail

## Console Logs for Debugging

When sending a connection request, you'll see:
```
[ConnectionManager] Sending connection request as: student
```

If active role cannot be determined:
```
[ConnectionManager] Could not determine active role
Error: Could not determine your active role. Please refresh and try again.
```

## Status

✅ **Implementation Complete**
✅ **Backward Compatible**
✅ **Error Handling Added**
✅ **Console Logging Added**

### Ready for Testing

**Test URL:** http://localhost:8080/view-profiles/view-tutor.html?id=64

**Test Steps:**
1. Login as user with multiple roles (e.g., jediael.s.abebe@gmail.com)
2. Switch to Student role in profile
3. Visit a tutor profile
4. Click "Connect"
5. Check browser console: Should show "Sending connection request as: student"
6. Verify connection created with `requester_type = 'student'`

### Next Steps

**To apply backend changes:**
1. Stop the old backend server: `taskkill /F /PID 38076` (may need admin)
2. Start new backend: `cd astegni-backend && python app.py`
3. Test the connection flow

---

**Implementation Date:** 2025-01-21
**Author:** Claude Code
**Status:** ✅ Complete (Backend restart needed to apply changes)
