# Tutor Reconsider & Reinstate Endpoint Fix

## Problem
Two critical endpoints were missing or had issues:
1. **`/api/admin/tutor/{id}/reconsider`** - Endpoint didn't exist at all
2. **`/api/admin/tutor/{id}/reinstate`** - Endpoint existed but needed enhancement

## Root Cause
- The `/reconsider` endpoint was never created in the backend
- The `/reinstate` endpoint only checked `is_suspended` field, not `verification_status`
- This caused failures when trying to reconsider rejected tutors or reinstate suspended tutors

## Solution

### 1. Created `/reconsider` Endpoint
**File:** `astegni-backend/app.py modules/routes.py`

**New Endpoint:**
```python
@router.post("/api/admin/tutor/{tutor_id}/reconsider")
def reconsider_tutor(
    tutor_id: int,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Reconsider a rejected tutor application and move back to pending (admin only)"""

    tutor_profile = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor_profile:
        raise HTTPException(status_code=404, detail="Tutor not found")

    if tutor_profile.verification_status != "rejected":
        raise HTTPException(status_code=400, detail="Tutor is not in rejected status")

    # Clear rejection and move back to pending status
    tutor_profile.is_verified = False
    tutor_profile.verification_status = "pending"
    tutor_profile.rejection_reason = None
    tutor_profile.verified_at = None
    tutor_profile.verified_by = None

    db.commit()

    return {
        "success": True,
        "message": "Tutor application reconsidered successfully",
        "tutor_id": tutor_id,
        "verification_status": "pending"
    }
```

**What it does:**
- Validates tutor exists
- Checks tutor is in "rejected" status
- Clears rejection reason and related fields
- Changes `verification_status` from "rejected" to "pending"
- Returns success message

### 2. Enhanced `/reinstate` Endpoint
**File:** `astegni-backend/app.py modules/routes.py`

**Changes Made:**
```python
# Before
if not tutor_profile.is_suspended:
    raise HTTPException(status_code=400, detail="Tutor is not suspended")

# After
if not tutor_profile.is_suspended and tutor_profile.verification_status != "suspended":
    raise HTTPException(status_code=400, detail="Tutor is not suspended")
```

**Also added:**
- Set `is_verified = True` when reinstating
- Return `verification_status` in response for confirmation

**Full Enhanced Endpoint:**
```python
@router.post("/api/admin/tutor/{tutor_id}/reinstate")
def reinstate_tutor(
    tutor_id: int,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Reinstate a suspended tutor (admin only)"""

    tutor_profile = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()
    if not tutor_profile:
        raise HTTPException(status_code=404, detail="Tutor not found")

    # Check if tutor is suspended (check both fields for robustness)
    if not tutor_profile.is_suspended and tutor_profile.verification_status != "suspended":
        raise HTTPException(status_code=400, detail="Tutor is not suspended")

    # Clear suspension and restore to verified status
    tutor_profile.is_suspended = False
    tutor_profile.is_verified = True
    tutor_profile.verification_status = "verified"
    tutor_profile.suspension_reason = None
    tutor_profile.suspended_at = None
    tutor_profile.suspended_by = None

    db.commit()

    return {
        "success": True,
        "message": "Tutor reinstated successfully",
        "tutor_id": tutor_id,
        "verification_status": "verified"
    }
```

## Database Field Updates

### Reconsider Action (Rejected → Pending)
| Field | Before | After |
|-------|--------|-------|
| `is_verified` | False | False |
| `verification_status` | "rejected" | "pending" |
| `rejection_reason` | "reason text" | None |
| `verified_at` | timestamp or None | None |
| `verified_by` | admin_id or None | None |

### Reinstate Action (Suspended → Verified)
| Field | Before | After |
|-------|--------|-------|
| `is_suspended` | True | False |
| `is_verified` | varies | True |
| `verification_status` | "suspended" | "verified" |
| `suspension_reason` | "reason text" | None |
| `suspended_at` | timestamp | None |
| `suspended_by` | admin_id | None |

## API Endpoint Summary

### All Tutor Admin Endpoints
| Endpoint | Method | Purpose | Request Body |
|----------|--------|---------|--------------|
| `/api/admin/tutor/{id}/verify` | POST | Approve pending tutor | - |
| `/api/admin/tutor/{id}/reject` | POST | Reject tutor | `{ "reason": "..." }` |
| `/api/admin/tutor/{id}/suspend` | POST | Suspend verified tutor | `{ "reason": "..." }` |
| `/api/admin/tutor/{id}/reinstate` | POST | Reinstate suspended tutor | - |
| `/api/admin/tutor/{id}/reconsider` | POST | Reconsider rejected tutor | - |

## Testing

### Test Reconsider Endpoint
```bash
# Get a rejected tutor ID first
# Then reconsider it
curl -X POST http://localhost:8000/api/admin/tutor/123/reconsider \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Tutor application reconsidered successfully",
  "tutor_id": 123,
  "verification_status": "pending"
}
```

### Test Reinstate Endpoint
```bash
# Get a suspended tutor ID first
# Then reinstate it
curl -X POST http://localhost:8000/api/admin/tutor/456/reinstate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Tutor reinstated successfully",
  "tutor_id": 456,
  "verification_status": "verified"
}
```

## Restart Backend

After making these changes, restart the backend server:

```bash
cd astegni-backend
python app.py
```

Or if using uvicorn directly:
```bash
cd astegni-backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

## Frontend Integration

The frontend is already configured to use these endpoints:
- `reconsiderTutorFromModal()` in `js/admin-pages/tutor-review.js` calls `/reconsider`
- `reinstateTutorFromModal()` in `js/admin-pages/tutor-review.js` calls `/reinstate`

No frontend changes needed - just restart the backend!

## Verification Checklist

After restarting backend:
- [ ] Navigate to Rejected Tutors panel
- [ ] Click "View" on a rejected tutor
- [ ] Click "Reconsider" button
- [ ] Confirm action
- [ ] Verify tutor disappears from Rejected panel
- [ ] Verify tutor appears in Requested panel
- [ ] Navigate to Suspended Tutors panel
- [ ] Click "View" on a suspended tutor
- [ ] Click "Reinstate" button
- [ ] Confirm action
- [ ] Verify tutor disappears from Suspended panel
- [ ] Verify tutor appears in Verified panel

## Error Handling

Both endpoints include proper error handling:

**404 Not Found:**
```json
{
  "detail": "Tutor not found"
}
```

**400 Bad Request (Reconsider):**
```json
{
  "detail": "Tutor is not in rejected status"
}
```

**400 Bad Request (Reinstate):**
```json
{
  "detail": "Tutor is not suspended"
}
```

**401 Unauthorized:**
```json
{
  "detail": "Not authenticated"
}
```

## Notes

- Both endpoints require admin authentication via JWT token
- Authentication is handled by `get_current_admin` dependency
- Database changes are committed immediately
- Success responses include the new `verification_status` for confirmation
- Frontend automatically reloads the appropriate panel after success
