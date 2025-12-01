# Role-Specific ID System

## Problem Statement

Previously, the platform was using `users.id` (the main user table ID) for all operations. However, this caused issues when accessing role-specific data because:

- **Users table** stores basic user info with `users.id`
- **Student profiles** have their own `student_profiles.id`
- **Tutor profiles** have their own `tutor_profiles.id`
- **Parent profiles** have their own `parent_profiles.id`
- **Advertiser profiles** have their own `advertiser_profiles.id`

When viewing a tutor profile at `view-tutor.html?id=123`, the ID `123` should refer to `tutor_profiles.id`, not `users.id`.

## Solution Overview

The JWT token now includes **both** the user's main ID and all their role-specific IDs:

```javascript
// JWT Token Payload Structure
{
  "sub": "456",                    // users.id (main user ID)
  "role": "tutor",                 // active role
  "role_ids": {
    "student": "789",              // student_profiles.id (if user is also a student)
    "tutor": "123",                // tutor_profiles.id
    "parent": null,                // not a parent
    "advertiser": null             // not an advertiser
  }
}
```

## Backend Changes

### 1. Updated Token Creation (utils.py)

```python
# utils.py - New helper function
def get_role_ids_from_user(user: User, db: Session) -> dict:
    """Get all role-specific IDs for a user"""
    role_ids = {}

    if 'student' in user.roles:
        student_profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == user.id
        ).first()
        role_ids['student'] = student_profile.id if student_profile else None

    # ... same for tutor, parent, advertiser

    return role_ids

# Enhanced token creation
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token with role-specific IDs"""
    # Now supports 'role_ids' in data
    # Automatically converts integers to strings for JWT compatibility
```

### 2. Updated Login/Register Endpoints (routes.py)

```python
# Now includes role_ids in token
role_ids = get_role_ids_from_user(user, db)

token_data = {
    "sub": user.id,
    "role": user.active_role,
    "role_ids": role_ids
}
access_token = create_access_token(data=token_data)
```

### 3. Updated get_current_user (utils.py)

```python
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get current authenticated user from JWT token"""
    # ... decode token ...

    # Attach role_ids to user object for easy access
    user.role_ids = payload.get("role_ids", {})
    # Convert string IDs back to integers
    if user.role_ids:
        user.role_ids = {
            role: int(role_id) if role_id and role_id.isdigit() else None
            for role, role_id in user.role_ids.items()
        }

    return user
```

## Frontend Changes

### New AuthManager Methods (js/root/auth.js)

```javascript
// 1. Get all role-specific IDs
authManager.getRoleIds()
// Returns: { student: 789, tutor: 123, parent: null, advertiser: null }

// 2. Get role-specific ID for active role
authManager.getActiveRoleId()
// Returns: 123 (if user is a tutor)

// 3. Get role-specific ID for any role
authManager.getRoleId('tutor')
// Returns: 123

// 4. Get main user ID (users.id)
authManager.getUserId()
// Returns: 456

// 5. Get context-appropriate ID
authManager.getCurrentContextId()
// Returns active role ID (123 for tutor)

authManager.getCurrentContextId('student')
// Returns student role ID (789)
```

## Usage Examples

### Example 1: View Tutor Profile

**Before (WRONG):**
```javascript
// view-tutor.html
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('id');  // This was users.id - WRONG!

fetch(`/api/tutor/${userId}`)  // Would fail or get wrong tutor
```

**After (CORRECT):**
```javascript
// view-tutor.html
const urlParams = new URLSearchParams(window.location.search);
const tutorId = urlParams.get('id');  // This is tutor_profiles.id - CORRECT!

fetch(`/api/tutor/${tutorId}`)  // Gets correct tutor
```

### Example 2: Find Tutors Page

**Before (WRONG):**
```javascript
// When clicking on a tutor card
window.location.href = `view-profiles/view-tutor.html?id=${tutor.user_id}`;  // WRONG!
```

**After (CORRECT):**
```javascript
// When clicking on a tutor card
window.location.href = `view-profiles/view-tutor.html?id=${tutor.id}`;  // tutor_profiles.id - CORRECT!
```

### Example 3: Getting Current User's Profile ID

**Student accessing their own profile:**
```javascript
// student-profile.html
const studentId = authManager.getActiveRoleId();  // student_profiles.id
fetch(`/api/student/profile/${studentId}`)
```

**Tutor accessing their own profile:**
```javascript
// tutor-profile.html
const tutorId = authManager.getActiveRoleId();  // tutor_profiles.id
fetch(`/api/tutor/profile/${tutorId}`)
```

### Example 4: Multi-Role User

If a user is both a student AND a tutor:

```javascript
// Get their student ID
const studentId = authManager.getRoleId('student');  // 789

// Get their tutor ID
const tutorId = authManager.getRoleId('tutor');      // 123

// Get active role ID (depends on what role they're currently using)
const activeId = authManager.getActiveRoleId();      // 123 if active_role is 'tutor'
```

## API Endpoint Patterns

### Pattern 1: Own Profile Endpoints
Use role-specific ID from token:

```python
@router.get("/api/tutor/profile")
def get_own_tutor_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Use role_ids from token
    tutor_id = current_user.role_ids.get('tutor')
    tutor = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
```

### Pattern 2: View Other's Profile
Use role-specific ID from URL parameter:

```python
@router.get("/api/tutor/{tutor_id}")
def get_tutor_by_id(tutor_id: int, db: Session = Depends(get_db)):
    # tutor_id is from tutor_profiles.id
    tutor = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
```

### Pattern 3: List/Search Endpoints
Return role-specific IDs in response:

```python
@router.get("/api/tutors")
def search_tutors(db: Session = Depends(get_db)):
    tutors = db.query(TutorProfile).all()
    return [
        {
            "id": tutor.id,              # tutor_profiles.id - CORRECT!
            "user_id": tutor.user_id,    # users.id (if needed for joins)
            "name": f"{user.first_name} {user.father_name}",
            # ... other fields
        }
        for tutor in tutors
    ]
```

## Database Relationships

### Understanding the ID Relationships

```
users table:
  id: 456 (main user identifier)
  ├─> student_profiles.user_id = 456
  │   └─> student_profiles.id = 789 (student-specific ID)
  │
  └─> tutor_profiles.user_id = 456
      └─> tutor_profiles.id = 123 (tutor-specific ID)

URL patterns:
  - view-student.html?id=789  (uses student_profiles.id)
  - view-tutor.html?id=123    (uses tutor_profiles.id)

NOT:
  - view-student.html?id=456  (DON'T use users.id)
  - view-tutor.html?id=456    (DON'T use users.id)
```

## Migration Checklist

### Files that need updates:

- [x] **Backend:**
  - [x] `astegni-backend/utils.py` - Token creation with role_ids
  - [x] `astegni-backend/app.py modules/routes.py` - Login/register endpoints
  - [x] `astegni-backend/utils.py` - get_current_user extraction

- [x] **Frontend:**
  - [x] `js/root/auth.js` - New helper methods

- [ ] **Pages to update (use role-specific IDs):**
  - [ ] `branch/find-tutors.html` - Tutor card links
  - [ ] `branch/reels.html` - Profile links
  - [ ] `view-profiles/view-tutor.html` - Load tutor data
  - [ ] `view-profiles/view-student.html` - Load student data
  - [ ] `view-profiles/view-parent.html` - Load parent data
  - [ ] Any other profile view pages

### Quick Test Script

```javascript
// Console test after login
console.log('User ID (users.id):', authManager.getUserId());
console.log('All role IDs:', authManager.getRoleIds());
console.log('Active role:', authManager.getUserRole());
console.log('Active role ID:', authManager.getActiveRoleId());

// Should see something like:
// User ID: 456
// All role IDs: {student: 789, tutor: 123, parent: null, advertiser: null}
// Active role: tutor
// Active role ID: 123
```

## Common Mistakes to Avoid

### ❌ WRONG:
```javascript
// Using user.id from users table for profile operations
const userId = authManager.getUserId();
window.location.href = `view-tutor.html?id=${userId}`;  // WRONG!
```

### ✅ CORRECT:
```javascript
// Using role-specific ID
const tutorId = authManager.getActiveRoleId();
window.location.href = `view-tutor.html?id=${tutorId}`;  // CORRECT!
```

### ❌ WRONG:
```javascript
// In tutor card data from API
{
  "id": tutor.user_id,  // WRONG! This is users.id
  "name": "John Doe"
}
```

### ✅ CORRECT:
```javascript
// In tutor card data from API
{
  "id": tutor.id,  // CORRECT! This is tutor_profiles.id
  "user_id": tutor.user_id,  // Optional: keep for reference
  "name": "John Doe"
}
```

## Testing the Implementation

### 1. Test Token Structure
After logging in, check the token in browser console:

```javascript
const payload = authManager.decodeJWT(authManager.getToken());
console.log('Token payload:', payload);
// Should show: sub, role, role_ids
```

### 2. Test Role ID Retrieval
```javascript
console.log('Student ID:', authManager.getRoleId('student'));
console.log('Tutor ID:', authManager.getRoleId('tutor'));
console.log('Active role ID:', authManager.getActiveRoleId());
```

### 3. Test Profile Access
Navigate to a profile page and verify the correct ID is being used:

```javascript
// In view-tutor.html console
const urlParams = new URLSearchParams(window.location.search);
const tutorId = urlParams.get('id');
console.log('Tutor ID from URL:', tutorId);
console.log('Should be tutor_profiles.id, not users.id');
```

## Benefits of This System

1. **Correct Data Access**: Always fetch data using the right ID for the context
2. **Multi-Role Support**: Users with multiple roles (student + tutor) work correctly
3. **URL Sharing**: Profile URLs work correctly when shared
4. **API Consistency**: Backend and frontend agree on which IDs to use
5. **Security**: Token-based role verification prevents accessing wrong data

## Next Steps

1. ✅ Backend token generation updated
2. ✅ Frontend AuthManager methods added
3. ⏳ Update all frontend pages to use role-specific IDs
4. ⏳ Test complete user flow (register → login → view profiles)
5. ⏳ Update API documentation
