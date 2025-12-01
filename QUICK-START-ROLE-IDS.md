# Quick Start: Role-Specific ID System

## TL;DR

**Problem:** Platform was using `users.id` everywhere, but profiles have their own IDs (`tutor_profiles.id`, `student_profiles.id`, etc.)

**Solution:** JWT tokens now include all role-specific IDs, and AuthManager provides helper methods to access them.

---

## Frontend Usage (Most Common)

### Getting IDs in JavaScript

```javascript
// Get the ID for current user's active role
const activeRoleId = authManager.getActiveRoleId();
// Example: If logged in as tutor, returns tutor_profiles.id

// Get ID for a specific role
const tutorId = authManager.getRoleId('tutor');
const studentId = authManager.getRoleId('student');

// Get main user ID (users.id)
const userId = authManager.getUserId();

// Get all role IDs at once
const roleIds = authManager.getRoleIds();
// Returns: { student: 123, tutor: 456, parent: null, advertiser: null }
```

### Common Use Cases

#### 1. Viewing a profile (view-tutor.html, view-student.html, etc.)

```javascript
// Get ID from URL parameter (this is the role-specific ID)
const urlParams = new URLSearchParams(window.location.search);
const tutorId = urlParams.get('id');  // This is tutor_profiles.id

// Fetch tutor data
fetch(`http://localhost:8000/api/tutor/${tutorId}`)
```

#### 2. Linking to a profile

```javascript
// When creating links to profiles, use role-specific ID
const tutorCard = `
  <a href="view-profiles/view-tutor.html?id=${tutor.id}">
    ${tutor.name}
  </a>
`;
// tutor.id should be tutor_profiles.id from the API response
```

#### 3. Accessing own profile data

```javascript
// Get your own role-specific ID
const myTutorId = authManager.getActiveRoleId();

// Fetch your own profile
fetch(`http://localhost:8000/api/tutor/profile/${myTutorId}`)
```

---

## Backend Usage

### Getting role-specific ID from current user

```python
from fastapi import Depends
from utils import get_current_user

@router.get("/api/tutor/profile")
def get_own_tutor_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # current_user.role_ids is now available!
    tutor_id = current_user.role_ids.get('tutor')

    if not tutor_id:
        raise HTTPException(status_code=400, detail="User is not a tutor")

    tutor = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    # ...
```

### Creating tokens with role IDs (already done in login/register)

```python
from utils import get_role_ids_from_user, create_access_token

# Get all role-specific IDs for a user
role_ids = get_role_ids_from_user(user, db)
# Returns: {'student': 123, 'tutor': 456, 'parent': None, 'advertiser': None}

# Create token with role IDs
token_data = {
    "sub": user.id,              # users.id
    "role": user.active_role,    # 'student', 'tutor', etc.
    "role_ids": role_ids         # All role-specific IDs
}
access_token = create_access_token(data=token_data)
```

---

## Quick Reference Table

| Context | What ID to Use | How to Get It (Frontend) | How to Get It (Backend) |
|---------|----------------|--------------------------|-------------------------|
| View tutor profile | `tutor_profiles.id` | `urlParams.get('id')` | URL param `tutor_id` |
| View student profile | `student_profiles.id` | `urlParams.get('id')` | URL param `student_id` |
| Own tutor profile | `tutor_profiles.id` | `authManager.getActiveRoleId()` | `current_user.role_ids['tutor']` |
| Own student profile | `student_profiles.id` | `authManager.getActiveRoleId()` | `current_user.role_ids['student']` |
| User authentication | `users.id` | `authManager.getUserId()` | `current_user.id` |
| Link to tutor | `tutor_profiles.id` | Use `tutor.id` from API | Return `tutor.id` in API |

---

## Testing

### 1. Check Token in Browser Console

```javascript
// After logging in, run in browser console:
const payload = authManager.decodeJWT(authManager.getToken());
console.log(payload);

// Should show:
// {
//   sub: "456",              // users.id
//   role: "tutor",
//   role_ids: {
//     student: "789",
//     tutor: "123",
//     parent: null,
//     advertiser: null
//   },
//   exp: 1234567890
// }
```

### 2. Test Helper Methods

```javascript
console.log('User ID:', authManager.getUserId());           // 456
console.log('Active Role:', authManager.getUserRole());     // 'tutor'
console.log('Active Role ID:', authManager.getActiveRoleId()); // 123
console.log('All Role IDs:', authManager.getRoleIds());     // {student:789, tutor:123, ...}
```

### 3. Backend Testing

```bash
# Run the test script
cd astegni-backend
python test_role_ids_in_token.py
```

---

## Migration Checklist

### Already Done ✅
- [x] Backend: `utils.py` - Token creation with role_ids
- [x] Backend: `routes.py` - Login/register endpoints updated
- [x] Backend: `utils.py` - get_current_user extracts role_ids
- [x] Frontend: `auth.js` - New helper methods added

### Need to Update 🔧
- [ ] Update all profile view pages to use role-specific IDs from URL
- [ ] Update all "view profile" links to pass role-specific IDs
- [ ] Update API responses to return role-specific IDs (not user_ids)
- [ ] Test complete user flow

### Pages to Check
- [ ] `branch/find-tutors.html` - Tutor card links
- [ ] `view-profiles/view-tutor.html` - Loading tutor data
- [ ] `view-profiles/view-student.html` - Loading student data
- [ ] `view-profiles/view-parent.html` - Loading parent data
- [ ] `profile-pages/tutor-profile.html` - Own profile access
- [ ] `profile-pages/student-profile.html` - Own profile access

---

## Common Mistakes

### ❌ DON'T: Use users.id for profile operations
```javascript
const userId = authManager.getUserId();  // This is users.id
window.location.href = `view-tutor.html?id=${userId}`;  // WRONG!
```

### ✅ DO: Use role-specific ID
```javascript
const tutorId = authManager.getActiveRoleId();  // This is tutor_profiles.id
window.location.href = `view-tutor.html?id=${tutorId}`;  // CORRECT!
```

---

## Need Help?

1. **Full Documentation:** See `ROLE-SPECIFIC-ID-SYSTEM.md`
2. **Test Script:** Run `python astegni-backend/test_role_ids_in_token.py`
3. **Browser Console:** Test `authManager.getRoleIds()` after login

---

## Summary

**The Key Concept:**
- `users.id` = Authentication (who you are)
- `tutor_profiles.id` / `student_profiles.id` / etc. = Profile data (your role-specific information)

**Always use role-specific IDs** when working with profile data, viewing profiles, or creating links to profiles.
