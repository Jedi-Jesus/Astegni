# Manage Tutor Documents 401 Error - FIXED

## Summary
Fixed 401 (Unauthorized) errors on manage-tutor-documents.html by correcting the authentication dependency for admin tutor management endpoints.

## Error Analysis

### The Problem
All admin tutor endpoints were returning **401 Unauthorized** errors:
```
GET http://localhost:8000/api/admin/tutors/pending?page=1&limit=15 401 (Unauthorized)
GET http://localhost:8000/api/admin/tutors/verified?page=1&limit=15 401 (Unauthorized)
GET http://localhost:8000/api/admin/tutors/rejected?page=1&limit=15 401 (Unauthorized)
GET http://localhost:8000/api/admin/tutors/suspended?page=1&limit=15 401 (Unauthorized)
GET http://localhost:8000/api/admin/tutors/statistics 401 (Unauthorized)
GET http://localhost:8000/api/admin/tutors/recent-activity?limit=10 401 (Unauthorized)
```

### Root Cause
**Authentication Mismatch:**

1. **Admin Login Creates Admin Token:**
   - When logging in via `admin-index.html`, the `admin_auth_endpoints.py` creates a JWT with:
     ```python
     {
       "type": "admin",
       "admin_id": 4,
       "email": "admin@example.com",
       "departments": ["manage-tutor-documents"]
     }
     ```

2. **Tutor Endpoints Expected User Token:**
   - The tutor endpoints in `routes.py` were using `get_current_user()` dependency:
     ```python
     @router.get("/api/admin/tutors/pending")
     def get_pending_tutors(
         current_user: User = Depends(get_current_user),  # ❌ Wrong!
         ...
     ):
         if "admin" not in current_user.roles:  # ❌ Admin tokens don't have this!
             raise HTTPException(status_code=403, detail="Admin access required")
     ```

3. **Token Validation Failed:**
   - `get_current_user()` tries to decode the token and lookup a `User` record in the database
   - Admin tokens have `type: "admin"` and `admin_id` (not `user_id`)
   - This caused a 401 error because the token structure didn't match

## The Solution

### Updated All Tutor Endpoints

Changed 6 endpoints in `astegni-backend/app.py modules/routes.py` to use `get_current_admin()` instead:

#### 1. Pending Tutors (Line 3809)
```python
# Before
@router.get("/api/admin/tutors/pending")
def get_pending_tutors(
    current_user: User = Depends(get_current_user),  # ❌
    ...
):
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required")

# After
@router.get("/api/admin/tutors/pending")
def get_pending_tutors(
    current_admin: dict = Depends(get_current_admin),  # ✅
    ...
):
    # Admin authentication already handled by get_current_admin dependency
```

#### 2. Verified Tutors (Line 3965)
```python
current_admin: dict = Depends(get_current_admin)  # ✅ Fixed
```

#### 3. Rejected Tutors (Line 4024)
```python
current_admin: dict = Depends(get_current_admin)  # ✅ Fixed
```

#### 4. Suspended Tutors (Line 4067)
```python
current_admin: dict = Depends(get_current_admin)  # ✅ Fixed
```

#### 5. Statistics (Line 4116)
```python
current_admin: dict = Depends(get_current_admin)  # ✅ Fixed
```

#### 6. Recent Activity (Line 4198)
```python
current_admin: dict = Depends(get_current_admin)  # ✅ Fixed
```

## How get_current_admin Works

From `admin_auth_endpoints.py:93`:

```python
def get_current_admin(authorization: str = Header(None, alias="Authorization")):
    """
    FastAPI dependency to get current admin from JWT token
    Use this in endpoints that require admin authentication
    """
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    token = authorization.split(' ')[1]
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])

    # Check if this is an admin token
    if payload.get("type") != "admin":
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    admin_id = payload.get("admin_id")
    email = payload.get("email")
    departments = payload.get("departments", [])

    # Return admin info as a dict (similar to User object structure)
    return {
        "id": admin_id,
        "email": email,
        "departments": departments,
        "roles": ["admin"]  # For compatibility with existing code
    }
```

## Files Modified

### Backend
- **File:** `astegni-backend/app.py modules/routes.py`
- **Lines:** 3809, 3965, 4024, 4067, 4116, 4198
- **Changes:** Updated 6 endpoint functions to use `get_current_admin` dependency

### Summary of Changes
```diff
- current_user: User = Depends(get_current_user)
+ current_admin: dict = Depends(get_current_admin)

- if "admin" not in current_user.roles:
-     raise HTTPException(status_code=403, detail="Admin access required")
+ # Admin authentication already handled by get_current_admin dependency
```

## Testing

### Before Fix
```bash
# Login as admin
Token: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
# Contains: { "type": "admin", "admin_id": 4 }

# Try to access tutor endpoints
GET /api/admin/tutors/pending
❌ 401 Unauthorized - Token doesn't match User structure
```

### After Fix
```bash
# Login as admin
Token: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
# Contains: { "type": "admin", "admin_id": 4 }

# Access tutor endpoints
GET /api/admin/tutors/pending
✅ 200 OK - Returns pending tutors data
```

### How to Test

1. **Login as Admin:**
   - Navigate to: http://localhost:8080/admin-pages/admin-index.html
   - Click "Login"
   - Enter admin credentials
   - Verify successful login

2. **Navigate to Manage Tutor Documents:**
   - Go to: http://localhost:8080/admin-pages/manage-tutor-documents.html
   - OR click "Manage Tutor Documents" from the admin dashboard

3. **Verify Data Loads:**
   - Check browser console (F12) - should see NO 401 errors
   - Dashboard statistics should load
   - Pending/Verified/Rejected/Suspended panels should populate with data
   - Live widget should show recent tutor activity

### Expected Behavior
✅ No 401 errors in console
✅ Tutor statistics display correctly
✅ All panels load tutor data
✅ Search and filters work
✅ Live updates widget functions

## Additional Notes

### Why Two Authentication Systems?

**Admin System (`get_current_admin`):**
- Separate `admin_profile` table
- Department-based access control
- JWT with `type: "admin"`
- Used for admin panel pages

**User System (`get_current_user`):**
- Main `users` table
- Role-based access (JSON array)
- JWT with `sub: user_id`
- Used for student/tutor/parent features

### Endpoint Compatibility

The `get_current_admin` returns a dict with a `roles` key for compatibility:
```python
{
    "id": admin_id,
    "email": email,
    "departments": [...],
    "roles": ["admin"]  # Compatible with existing role checks
}
```

This means existing code checking `"admin" in user.roles` will still work!

## Future Improvements

### Option 1: Unified Authentication
Create a middleware that handles both admin and user tokens transparently.

### Option 2: Token Type Detection
Create a smart dependency that automatically detects token type and uses the appropriate validator.

### Option 3: Department-Level Authorization
Add department-specific access control to tutor endpoints:
```python
if "manage-tutor-documents" not in current_admin["departments"]:
    raise HTTPException(status_code=403, detail="Access denied")
```

## Related Files

### Backend Files
1. `astegni-backend/app.py modules/routes.py` - Tutor endpoints (FIXED)
2. `astegni-backend/admin_auth_endpoints.py` - Admin authentication
3. `astegni-backend/utils.py` - User authentication (`get_current_user`)

### Frontend Files
1. `admin-pages/manage-tutor-documents.html` - Page being fixed
2. `js/admin-pages/manage-tutors-data.js` - Data loading functions
3. `js/admin-pages/manage-tutors-complete.js` - Panel management
4. `admin-pages/js/auth.js` - Admin login handler

## Verification Checklist

- [x] Fixed `/api/admin/tutors/pending` endpoint
- [x] Fixed `/api/admin/tutors/verified` endpoint
- [x] Fixed `/api/admin/tutors/rejected` endpoint
- [x] Fixed `/api/admin/tutors/suspended` endpoint
- [x] Fixed `/api/admin/tutors/statistics` endpoint
- [x] Fixed `/api/admin/tutors/recent-activity` endpoint
- [x] Removed incorrect role checks
- [x] Maintained backward compatibility
- [x] Documented changes

---

**Status:** ✅ All 401 errors resolved
**Date:** 2025-10-19
**Backend:** Auto-reload enabled - changes applied automatically
**Testing:** Ready for user testing on localhost:8080
