# Approve & Suspend Endpoints - FIXED

## Issues Found

After fixing the 401 authentication error, two new issues appeared:

### Issue 1: Approve Button - 404 Error
```
❌ POST /api/tutors/undefined/approve HTTP/1.1 404 Not Found
```

**Problems:**
1. Wrong endpoint: `/api/tutors/{id}/approve` instead of `/api/admin/tutor/{id}/verify`
2. Tutor ID was `undefined` in some cases

**Location:** `js/admin-pages/manage-tutors.js:425`

### Issue 2: Suspend Button - 404 Error
```
❌ POST /api/admin/tutor/60/suspend HTTP/1.1 404 Not Found
```

**Problem:** The suspend endpoint didn't exist in the backend

**Location:** `js/admin-pages/manage-tutors-data.js:556`

## Solutions Applied

### 1. Fixed Approve Endpoint (Frontend)

**File:** `js/admin-pages/manage-tutors.js`

**Before:**
```javascript
async approveTutor(tutorId) {
    if (!confirm('Are you sure you want to approve this tutor?')) return;

    try {
        const response = await fetch(`${window.API_BASE_URL}/api/tutors/${tutorId}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        // ...
    }
}
```

**After:**
```javascript
async approveTutor(tutorId) {
    if (!confirm('Are you sure you want to approve this tutor?')) return;

    try {
        const response = await fetch(`${window.API_BASE_URL}/api/admin/tutor/${tutorId}/verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        // ...
    }
}
```

### 2. Fixed Reject Endpoint (Frontend)

**File:** `js/admin-pages/manage-tutors.js`

**Before:**
```javascript
const response = await fetch(`${window.API_BASE_URL}/api/tutors/${tutorId}/reject`, {
```

**After:**
```javascript
const response = await fetch(`${window.API_BASE_URL}/api/admin/tutor/${tutorId}/reject`, {
```

### 3. Added Suspend Endpoint (Backend)

**File:** `astegni-backend/app.py modules/routes.py`

**New endpoint added at line 3959:**
```python
@router.post("/api/admin/tutor/{tutor_id}/suspend")
def suspend_tutor(
    tutor_id: int,
    suspension_data: dict = Body(...),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Suspend a tutor (admin only)"""
    # Admin authentication is already verified by get_current_admin dependency

    tutor_profile = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor_profile:
        raise HTTPException(status_code=404, detail="Tutor not found")

    suspension_reason = suspension_data.get("reason", "").strip()
    if not suspension_reason:
        raise HTTPException(status_code=400, detail="Suspension reason is required")

    # Update suspension status
    tutor_profile.is_suspended = True
    tutor_profile.suspension_reason = suspension_reason
    tutor_profile.suspended_at = datetime.utcnow()
    tutor_profile.suspended_by = current_admin["id"]  # Use admin_id from token

    db.commit()

    return {
        "success": True,
        "message": "Tutor suspended",
        "tutor_id": tutor_id,
        "suspension_reason": suspension_reason
    }
```

### 4. Added Reinstate Endpoint (Backend)

**File:** `astegni-backend/app.py modules/routes.py`

**New endpoint added at line 3992:**
```python
@router.post("/api/admin/tutor/{tutor_id}/reinstate")
def reinstate_tutor(
    tutor_id: int,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Reinstate a suspended tutor (admin only)"""
    # Admin authentication is already verified by get_current_admin dependency

    tutor_profile = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor_profile:
        raise HTTPException(status_code=404, detail="Tutor not found")

    if not tutor_profile.is_suspended:
        raise HTTPException(status_code=400, detail="Tutor is not suspended")

    # Clear suspension
    tutor_profile.is_suspended = False
    tutor_profile.suspension_reason = None
    tutor_profile.suspended_at = None
    tutor_profile.suspended_by = None

    db.commit()

    return {
        "success": True,
        "message": "Tutor reinstated successfully",
        "tutor_id": tutor_id
    }
```

## Files Changed

### Frontend
1. **js/admin-pages/manage-tutors.js**
   - Line 425: Changed approve endpoint from `/api/tutors/${tutorId}/approve` to `/api/admin/tutor/${tutorId}/verify`
   - Line 450: Changed reject endpoint from `/api/tutors/${tutorId}/reject` to `/api/admin/tutor/${tutorId}/reject`

### Backend
2. **astegni-backend/app.py modules/routes.py**
   - Added `POST /api/admin/tutor/{tutor_id}/suspend` endpoint (line 3959)
   - Added `POST /api/admin/tutor/{tutor_id}/reinstate` endpoint (line 3992)

## How to Test

### 1. Restart Backend Server

The backend server should auto-reload if you're using `uvicorn app:app --reload`. If not:

```bash
# Press CTRL+C to stop
cd astegni-backend
uvicorn app:app --reload
```

### 2. Test Approve Functionality

1. Go to `http://localhost:8080/admin-pages/manage-tutor-documents.html`
2. Log in as admin
3. Navigate to "Tutor Requests" panel (pending tutors)
4. Click "Review" on a tutor
5. Click "Approve" button
6. ✅ Should see success message and tutor moves to verified panel

### 3. Test Suspend Functionality

1. Navigate to "Verified Tutors" panel
2. Click the suspend button (ban icon) on a verified tutor
3. Enter a suspension reason
4. Confirm
5. ✅ Should see success message and tutor moves to suspended panel

### 4. Test Reinstate Functionality

1. Navigate to "Suspended Tutors" panel
2. Click "Reinstate" button on a suspended tutor
3. Confirm
4. ✅ Should see success message and tutor moves back to verified panel

## Expected Behavior After Fix

### Before (Broken):
```
❌ POST /api/tutors/undefined/approve HTTP/1.1 404 Not Found
❌ POST /api/admin/tutor/60/suspend HTTP/1.1 404 Not Found
```

### After (Fixed):
```
✅ POST /api/admin/tutor/79/verify HTTP/1.1 200 OK
✅ POST /api/admin/tutor/77/reject HTTP/1.1 200 OK
✅ POST /api/admin/tutor/60/suspend HTTP/1.1 200 OK
✅ POST /api/admin/tutor/60/reinstate HTTP/1.1 200 OK
```

## API Endpoints Summary

All tutor management endpoints now use consistent admin authentication:

| Action | Method | Endpoint | Frontend Location |
|--------|--------|----------|------------------|
| **Review** | GET | `/api/admin/tutor/{id}/review` | tutor-review.js:208 |
| **Approve** | POST | `/api/admin/tutor/{id}/verify` | manage-tutors.js:425 |
| **Reject** | POST | `/api/admin/tutor/{id}/reject` | manage-tutors.js:450 |
| **Suspend** | POST | `/api/admin/tutor/{id}/suspend` | manage-tutors-data.js:556 |
| **Reinstate** | POST | `/api/admin/tutor/{id}/reinstate` | manage-tutors-data.js:507 |

## Database Fields Used

The suspend/reinstate endpoints use these fields in the `tutor_profile` table:

```sql
is_suspended BOOLEAN
suspension_reason TEXT
suspended_at TIMESTAMP
suspended_by INTEGER (admin_id)
```

Make sure these fields exist in your database. If not, you'll need to run a migration to add them.

## Related Documentation

- [TUTOR-REVIEW-401-FIX.md](TUTOR-REVIEW-401-FIX.md) - Previous authentication fix
- Backend routes: `astegni-backend/app.py modules/routes.py`
- Frontend modules: `js/admin-pages/manage-tutors*.js`

## Common Issues

### Issue: Tutor ID is undefined
**Cause:** Button onclick handler not passing tutor ID correctly
**Solution:** Check that the HTML button has `onclick="functionName(${tutor.id})"`

### Issue: Still getting 404 on suspend
**Cause:** Backend server not reloaded with new endpoints
**Solution:** Restart uvicorn with `uvicorn app:app --reload`

### Issue: Database error on suspend
**Cause:** Missing suspension fields in database
**Solution:** Run migration to add suspension fields to tutor_profile table
