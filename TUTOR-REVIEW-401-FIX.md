# Tutor Review 401 Error - FIXED

## Problem Summary

When accessing `manage-tutor-documents.html` and clicking to review a tutor, you got:
```
GET /api/admin/tutor/71/review HTTP/1.1 401 Unauthorized
```

All other admin endpoints worked fine, but the tutor review endpoint returned 401.

## Root Cause

The application has **TWO different authentication systems**:

1. **Admin Authentication** (`admin_auth_endpoints.py`):
   - Used by `/api/admin/login`
   - Creates tokens with `"type": "admin"` in the JWT payload
   - Token structure: `{"admin_id": X, "email": "...", "departments": [...], "type": "admin"}`

2. **Regular User Authentication** (`utils.py` / `routes.py`):
   - Used by `/api/login`
   - Creates standard user tokens
   - Token structure: `{"sub": X, "roles": [...], ...}`

**The bug:** The tutor review endpoints (`/review`, `/verify`, `/reject`) were using `get_current_user` dependency, which expects regular user tokens, but you were logging in via `/api/admin/login` which creates admin tokens.

## Solution

Updated three endpoints in `app.py modules/routes.py` to use `get_current_admin` instead of `get_current_user`:

### 1. Review Endpoint (Line 3855-3862)
**Before:**
```python
@router.get("/api/admin/tutor/{tutor_id}/review")
def get_tutor_review_details(
    tutor_id: int,
    current_user: User = Depends(get_current_user),  # ❌ Wrong auth
    db: Session = Depends(get_db)
):
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required")
```

**After:**
```python
@router.get("/api/admin/tutor/{tutor_id}/review")
def get_tutor_review_details(
    tutor_id: int,
    current_admin: dict = Depends(get_current_admin),  # ✅ Correct admin auth
    db: Session = Depends(get_db)
):
    # Admin authentication is already verified by get_current_admin dependency
```

### 2. Verify Endpoint (Line 3895-3912)
**Before:**
```python
@router.post("/api/admin/tutor/{tutor_id}/verify")
def verify_tutor(
    tutor_id: int,
    current_user: User = Depends(get_current_user),  # ❌ Wrong auth
    db: Session = Depends(get_db)
):
    tutor_profile.verified_by = current_user.id  # ❌ Wrong user ID
```

**After:**
```python
@router.post("/api/admin/tutor/{tutor_id}/verify")
def verify_tutor(
    tutor_id: int,
    current_admin: dict = Depends(get_current_admin),  # ✅ Correct admin auth
    db: Session = Depends(get_db)
):
    tutor_profile.verified_by = current_admin["id"]  # ✅ Correct admin ID
```

### 3. Reject Endpoint (Line 3924-3947)
**Before:**
```python
@router.post("/api/admin/tutor/{tutor_id}/reject")
def reject_tutor(
    tutor_id: int,
    rejection_data: dict = Body(...),
    current_user: User = Depends(get_current_user),  # ❌ Wrong auth
    db: Session = Depends(get_db)
):
    tutor_profile.verified_by = current_user.id  # ❌ Wrong user ID
```

**After:**
```python
@router.post("/api/admin/tutor/{tutor_id}/reject")
def reject_tutor(
    tutor_id: int,
    rejection_data: dict = Body(...),
    current_admin: dict = Depends(get_current_admin),  # ✅ Correct admin auth
    db: Session = Depends(get_db)
):
    tutor_profile.verified_by = current_admin["id"]  # ✅ Correct admin ID
```

## Files Changed

1. **astegni-backend/app.py modules/routes.py**
   - Updated 3 endpoints to use `get_current_admin`
   - Changed `current_user.id` to `current_admin["id"]` (2 places)

2. **js/admin-pages/tutor-review.js** (Enhanced error handling)
   - Added better 401/403 error handling
   - Automatic redirect to login on auth failure
   - Clear error messages for users

3. **admin-pages/check-auth.html** (New diagnostic tool)
   - Tool to check authentication status
   - Decode JWT tokens
   - Test admin endpoints

## How to Test

### Option 1: Restart Backend and Test Manually
```bash
# In astegni-backend directory
# Press CTRL+C to stop the current server
uvicorn app:app --reload
```

Then:
1. Go to `http://localhost:8080/admin-pages/admin-index.html`
2. Log in with admin credentials
3. Navigate to `http://localhost:8080/admin-pages/manage-tutor-documents.html`
4. Click "Review" on any tutor
5. ✅ The modal should now load without 401 errors

### Option 2: Run Test Script
```bash
# In astegni-backend directory
python test_tutor_review_fix.py
```

Update the password in the test script first (line 19).

### Option 3: Use Diagnostic Tool
1. Open `http://localhost:8080/admin-pages/check-auth.html`
2. Click "Decode Token" to see token contents
3. Click "Test Admin Endpoint" to verify authentication works

## Expected Behavior After Fix

### Before (Broken):
```
127.0.0.1 - "GET /api/admin/tutor/71/review HTTP/1.1" 401 Unauthorized
```

Console error:
```
tutor-review.js:58 Error loading tutor details: Error: Failed to load tutor details: 401
```

### After (Fixed):
```
127.0.0.1 - "GET /api/admin/tutor/71/review HTTP/1.1" 200 OK
```

Modal opens showing:
- Tutor name, email, phone
- Profile picture and ID document
- Professional info (experience, education)
- Subjects and languages
- Approve/Reject buttons working

## Other Admin Endpoints Already Fixed

These endpoints were already using `get_current_admin` correctly:
- ✅ `/api/admin/tutors/pending`
- ✅ `/api/admin/tutors/verified`
- ✅ `/api/admin/tutors/rejected`
- ✅ `/api/admin/tutors/suspended`
- ✅ `/api/admin/tutors/statistics`
- ✅ `/api/admin/tutors/recent-activity`

That's why they worked fine while the review endpoint failed.

## Technical Details

### get_current_admin vs get_current_user

**get_current_admin** (admin_auth_endpoints.py:94-145):
```python
def get_current_admin(authorization: str = Header(None, alias="Authorization")):
    # Expects token with: {"type": "admin", "admin_id": X, "email": "...", "departments": [...]}
    if payload.get("type") != "admin":
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    return {"id": admin_id, "email": email, "departments": departments, "roles": ["admin"]}
```

**get_current_user** (utils.py:70-93):
```python
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    # Expects token with: {"sub": user_id, "roles": [...], ...}
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    return user  # Returns User model object
```

The token format is incompatible between the two systems!

## Prevention

To prevent this in the future:

1. **Naming Convention**: All admin endpoints should start with `/api/admin/`
2. **Authentication**: All admin endpoints MUST use `get_current_admin` dependency
3. **Code Review**: Check that endpoint path matches authentication type
4. **Testing**: Test with actual admin login (not user login with admin role)

## Related Files

- `astegni-backend/admin_auth_endpoints.py` - Admin authentication system
- `astegni-backend/utils.py` - Regular user authentication
- `admin-pages/js/auth.js` - Frontend admin authentication
- `js/root/auth.js` - Frontend user authentication
