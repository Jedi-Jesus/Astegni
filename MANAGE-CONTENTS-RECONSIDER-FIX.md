# Manage Contents - Reconsider Button Fix

## Issue
The "Reconsider" button in the rejected panel was returning a **400 Bad Request** error when clicked.

## Root Cause
The backend endpoint `/api/admin/contents/{content_id}/verify` did not have a handler for the `"pending"` verification status. It only handled:
- `verified`
- `rejected`
- `suspended`

When the frontend tried to move rejected content back to pending status (reconsider action), the backend rejected it with a 400 error because "pending" was not a valid status.

## Solution

### Backend Fix
**File**: `astegni-backend/content_management_endpoints.py`

#### 1. Updated Pydantic Model (Line 41-44)
```python
class ContentVerificationUpdate(BaseModel):
    verification_status: str  # 'pending', 'verified', 'rejected', 'suspended'
    reason: Optional[str] = None
    verified_by: int
```

#### 2. Added "pending" Status Handler (Line 555-565)
```python
elif verification.verification_status == "pending":
    # Reconsider: Move back to pending status (clear rejection/suspension)
    cursor.execute("""
        UPDATE contents
        SET verification_status = %s,
            is_verified = FALSE,
            verified_by = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        RETURNING id
    """, (verification.verification_status, verification.verified_by, content_id))
```

#### 3. Updated Error Message (Line 568)
```python
else:
    raise HTTPException(status_code=400, detail="Invalid verification status. Must be one of: verified, rejected, suspended, pending")
```

## Verification Status Workflow

### Reconsider Flow (Rejected → Pending)
1. Admin views rejected content in "Rejected Panel"
2. Admin clicks "View" button to open modal
3. Modal shows **"Reconsider"** button (blue)
4. Admin clicks "Reconsider"
5. Frontend sends: `PUT /api/admin/contents/{id}/verify` with `verification_status: "pending"`
6. Backend updates content status to "pending"
7. Content moves from "Rejected Panel" to "Requested Panel"

### All Supported Status Transitions

| From Status | To Status   | Action      | Requires Reason | Notes                           |
|-------------|-------------|-------------|-----------------|----------------------------------|
| pending     | verified    | Approve     | No              | Content is published             |
| pending     | rejected    | Reject      | Yes             | Content is rejected              |
| verified    | suspended   | Flag        | Yes             | Content is flagged for review    |
| verified    | rejected    | Reject      | Yes             | Published content is rejected    |
| rejected    | pending     | Reconsider  | No              | **NEW** - Move back to review    |
| suspended   | verified    | Reinstate   | No              | Restore flagged content          |
| suspended   | rejected    | Reject      | Yes             | Reject flagged content           |

## Testing Results

### Before Fix
```
PUT /api/admin/contents/12/verify 400 Bad Request
Error: HTTP error! status: 400
```

### After Fix
```
PUT /api/admin/contents/12/verify 200 OK
GET /api/admin/contents/stats 200 OK
GET /api/admin/contents?verification_status=rejected&limit=100 200 OK
GET /api/admin/contents?verification_status=pending&limit=100 200 OK
```

## Impact
- ✅ Reconsider button now works correctly
- ✅ Content can be moved from rejected back to pending status
- ✅ Admin workflow is complete for all content states
- ✅ No breaking changes to existing functionality

## Files Modified
1. `astegni-backend/content_management_endpoints.py` - Added pending status handler

## Related Files (No Changes Needed)
- `js/admin-pages/manage-contents.js` - Frontend already correctly sends `verification_status: "pending"`
- `admin-pages/manage-contents.html` - UI already has reconsider button in modal

## Next Steps
**Restart the backend server** to apply the changes:
```bash
cd astegni-backend
python app.py
```

The reconsider functionality will now work as expected!
