# Google OAuth Deletion Check Fix

## Problem
Google OAuth login bypassed the pending deletion check, allowing users with scheduled deletion to log in directly without going through the restoration flow.

## Solution
Added the same pending deletion check to Google OAuth endpoint that exists in regular login.

---

## Changes Made

### 1. Backend: Google OAuth Endpoint
**File:** `astegni-backend/google_oauth_endpoints.py`

**Added deletion check (lines 328-361):**
```python
else:
    # EXISTING USER - LOGIN
    user = existing_user

    # Check if account is scheduled for deletion (same as regular login)
    if user.account_status == 'pending_deletion':
        from sqlalchemy import text

        # Get deletion details
        deletion_request = db.execute(
            text("""
            SELECT scheduled_deletion_at, reasons, deletion_fee
            FROM account_deletion_requests
            WHERE user_id = :user_id AND status = 'pending'
            ORDER BY requested_at DESC
            LIMIT 1
            """),
            {"user_id": user.id}
        ).fetchone()

        if deletion_request:
            scheduled_at = deletion_request[0]
            days_remaining = (scheduled_at - datetime.utcnow()).days if scheduled_at else 0

            # Return 403 with deletion info
            raise HTTPException(
                status_code=403,
                detail={
                    "error_code": "ACCOUNT_PENDING_DELETION",
                    "message": "Your account is scheduled for deletion",
                    "days_remaining": days_remaining,
                    "scheduled_deletion_at": scheduled_at.isoformat() if scheduled_at else None,
                    "reasons": deletion_request[1] if deletion_request[1] else [],
                    "deletion_fee": float(deletion_request[2]) if deletion_request[2] else 200.00,
                    "email": user.email
                }
            )
```

### 2. Frontend: Google OAuth Handler
**File:** `js/root/google-oauth.js`

**Added 403 error handling (lines 146-160):**
```javascript
if (!res.ok) {
    const error = await res.json();

    // Check if it's account pending deletion (403)
    if (res.status === 403 && error.detail && error.detail.error_code === 'ACCOUNT_PENDING_DELETION') {
        console.log('[GoogleOAuth] Account has pending deletion - showing confirmation modal');
        this.hideLoadingState();
        this.closeAuthModals();

        // Show restoration confirmation modal
        // For Google OAuth, we don't have password, so pass empty string
        if (window.showRestorationConfirmModal) {
            window.showRestorationConfirmModal(error.detail.email, '', error.detail);
        } else {
            this.showErrorMessage('Your account is scheduled for deletion. Please log in with email/password to restore.');
        }
        return;
    }

    throw new Error(error.detail || 'Backend authentication failed');
}
```

---

## How It Works Now

### Google OAuth Login Flow with Pending Deletion

```
User clicks "Sign in with Google"
         ↓
Google verifies user
         ↓
Backend receives Google token
         ↓
Checks if user exists
         ↓
    YES → Check account_status
         ↓
   pending_deletion?
         ↓
    YES → Return 403 with deletion info
         ↓
Frontend receives 403
         ↓
Shows Restoration Confirmation Modal
         ↓
User clicks "Send OTP"
         ↓
(Same OTP flow as regular login)
         ↓
User enters OTP
         ↓
Clicks "Verify & Restore"
         ↓
Account restored & logged in
```

---

## Testing

### Test Case 1: Google OAuth with Pending Deletion

1. **Setup:**
   - Schedule account for deletion
   - Log out

2. **Google OAuth Login:**
   - Click "Sign in with Google"
   - Select Google account
   - ✅ Should show restoration modal (NOT log in directly)
   - ✅ Should display pending deletion info

3. **Restoration Flow:**
   - Click "Send OTP"
   - ✅ OTP sent to email
   - Enter OTP code
   - Click "Verify & Restore"
   - ✅ Account restored
   - ✅ Logged in successfully

### Test Case 2: Google OAuth without Pending Deletion

1. Regular Google account (no deletion scheduled)
2. Click "Sign in with Google"
3. ✅ Should log in normally (no modal)

---

## Important Note

**For Google OAuth users:**
- Password field is empty (Google OAuth users don't have passwords)
- Restoration still requires OTP verification
- OTP is sent to the email address associated with Google account
- After OTP verification, account is restored and user is logged in

---

## Backend Connection Refused Error

The error `ERR_CONNECTION_REFUSED` in the console means the backend is not running. To fix:

1. **Start the backend:**
   ```bash
   cd astegni-backend
   python app.py
   ```

2. **Verify backend is running:**
   - Backend should start on port 8000
   - Check console for: "Uvicorn running on http://0.0.0.0:8000"
   - Test: http://localhost:8000/docs

3. **Common issues:**
   - Port 8000 already in use → Kill process or use different port
   - Missing dependencies → `pip install -r requirements.txt`
   - Database not running → Start PostgreSQL

---

## Summary

✅ Google OAuth now properly checks for pending deletion
✅ Shows restoration modal instead of logging in
✅ Requires OTP verification to restore
✅ Same security level as regular email/password login
✅ Consistent user experience across all login methods

Both regular login and Google OAuth now have the same pending deletion check! 🎉
