# Leave Astegni: OTP Verification + Complete Account Deletion Update

## Summary of Changes

This update transforms the Leave Astegni (account deletion) feature from a **role-based** deletion system to a **complete account deletion** system with **OTP verification** added to the flow.

---

## Key Changes

### 1. **Added OTP Verification to Panel 4**
- Combined OTP verification and password confirmation into a single panel (Panel 4)
- User receives a 6-digit OTP code sent to their email
- 5-minute countdown timer for OTP expiration
- "Resend OTP" button available

### 2. **Changed from Role-Based to Complete Account Deletion**
- **OLD**: Deleted only specific role profiles (e.g., just tutor profile)
- **NEW**: Deletes the **entire user account** from the users table
- **CASCADE** automatically handles deletion of all profiles and related data

### 3. **Simplified Panel Structure**
- **Panel 1**: Initial Confirmation (type "DELETE")
- **Panel 2**: Why are you leaving? (reasons)
- **Panel 3**: 90-Day Warning + Deletion Fee
- **Panel 4**: **OTP + Password Verification** (combined)
- **Panel 5**: Farewell / Success

---

## Files Modified

### Frontend

#### 1. **[modals/common-modals/leave-astegni-modal.html](modals/common-modals/leave-astegni-modal.html)**
**Changes:**
- Added new Panel 4 with OTP input field + password input field
- OTP section includes:
  - Email display showing where OTP was sent
  - 6-digit OTP input (centered, large font)
  - Countdown timer (`<span id="otpTimer">5:00</span>`)
  - "Resend OTP" button
- Password input remains in same panel
- Renumbered panels:
  - Old Panel 4 (password only) → New Panel 4 (OTP + password)
  - Old Panel 5 (farewell) → Panel 5 (farewell) - stayed the same number

#### 2. **[js/tutor-profile/leave-astegni-modal.js](js/tutor-profile/leave-astegni-modal.js)**
**Changes:**
- **Added `sendDeleteOtp()` function**: Calls `POST /api/account/delete/send-otp` endpoint
- **Added `resendDeleteOtp()` function**: Allows user to request a new OTP
- **Added `startOtpTimer()` function**: 5-minute countdown timer for OTP expiration
- **Updated `proceedToSubscriptionCheck()`**: Now sends OTP before moving to Panel 4
- **Completely rewrote `finalConfirmDeleteAccount()`**:
  - **Removed**: Role detection logic (no longer checks URL path for role)
  - **Added**: OTP code validation (must be 6 digits)
  - **Changed API payload**: Now sends `{otp_code, password, reasons, other_reason}` instead of `{role, password, reasons, other_reason}`
  - **Removed**: Role-specific farewell messages
- Made `sendDeleteOtp` and `resendDeleteOtp` globally available

---

### Backend

#### 3. **[astegni-backend/account_deletion_endpoints.py](astegni-backend/account_deletion_endpoints.py)**

**New Endpoint:**
```python
@router.post("/delete/send-otp")
async def send_deletion_otp(current_user: dict = Depends(get_current_user))
```
- Generates 6-digit OTP
- Stores in `otp_verifications` table with purpose = `'account_deletion'`
- 5-minute expiration
- Returns OTP in response (for development - should send via email in production)

**Updated Endpoint:**
```python
@router.post("/delete/initiate")
async def initiate_account_deletion(
    request_data: DeletionInitiateRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
)
```
**Major Changes:**
1. **Added OTP verification step**:
   - Fetches OTP from `otp_verifications` table
   - Checks expiration
   - Verifies OTP code matches
   - Marks OTP as used

2. **Removed role-based logic**:
   - No longer accepts `role` parameter
   - No longer checks `ROLE_PROFILE_TABLES`
   - No longer counts user's roles
   - No longer has `delete_user` flag

3. **Simplified deletion**:
   - Always deletes from `users` table
   - CASCADE handles all related deletions
   - No need to update `users.roles` array
   - No need to switch active_role

4. **Updated database insert**:
   - Removed: `role`, `profile_id`, `delete_user` columns
   - Simplified to just `user_id`, `status`, `reasons`, `other_reason`, etc.

**Updated Schemas:**
```python
class DeletionInitiateRequest(BaseModel):
    otp_code: str  # NEW: Required for OTP verification
    password: str
    reasons: List[str]
    other_reason: Optional[str] = None
    # REMOVED: role parameter
```

**Updated `cancel_account_deletion()`:**
- Removed role restoration logic
- Simplified to just restore user account status
- No need to restore profile `is_active` or `users.roles`

**Updated `restore_account_on_login()`:**
- Removed role-based restoration logic
- Simplified to just restore user account
- No profile-specific restoration needed

**Updated `process_expired_deletions()`:**
- Removed role/profile branching logic
- Always deletes from `users` table
- CASCADE handles everything else

---

## API Changes

### New Endpoint
```
POST /api/account/delete/send-otp
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "OTP sent to your email",
  "expires_in_minutes": 5,
  "email": "user@example.com",
  "otp_code": "123456"  // DEVELOPMENT ONLY
}
```

### Updated Endpoint
```
POST /api/account/delete/initiate
Authorization: Bearer <token>
Content-Type: application/json

OLD Payload:
{
  "password": "string",
  "role": "tutor",  // REMOVED
  "reasons": ["not_useful", "too_expensive"],
  "other_reason": "string"
}

NEW Payload:
{
  "otp_code": "123456",  // NEW: Required
  "password": "string",
  "reasons": ["not_useful", "too_expensive"],
  "other_reason": "string"
}

Response:
{
  "success": true,
  "message": "Your account will be permanently deleted in 90 days",
  "deletion_request_id": 123,
  "requested_at": "2026-01-26T12:00:00",
  "scheduled_deletion_at": "2026-04-26T12:00:00",
  "days_until_deletion": 90,
  "deletion_fee": 200.00,
  "can_restore": true,
  "restore_message": "You can restore your account by logging in within 90 days"
}
```

---

## Updated Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INITIATES DELETION                   │
│  Location: Settings Panel → "Leave Astegni" Card (red gradient) │
│  Trigger: onclick="openLeaveAstegniModal()"                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  PANEL 1: Initial Confirmation                                  │
│  • User must type "DELETE" to proceed                           │
│  • Shows what will be deleted (profiles, uploads, data, etc.)   │
│  • [Cancel] [Continue →]                                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  PANEL 2: Why Are You Leaving?                                  │
│  • Checkboxes for reasons (not useful, too expensive, etc.)     │
│  • [← Back] [Continue →]                                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  PANEL 3: 90-Day Warning + Deletion Fee                         │
│  • "Data kept for 90 days, log in to restore"                  │
│  • "200 ETB deletion fee applies"                               │
│  • [← Back] [I Understand →]                                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼ (calls sendDeleteOtp())
┌─────────────────────────────────────────────────────────────────┐
│  SEND OTP TO EMAIL                                              │
│  POST /api/account/delete/send-otp                              │
│  • Generates 6-digit OTP                                        │
│  • Stores in otp_verifications table (5 min expiry)             │
│  • Sends to user's email                                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  PANEL 4: OTP + Password Verification (COMBINED)                │
│  • Display: "Code sent to: user@example.com"                   │
│  • Input: 6-digit OTP code (centered, large font)               │
│  • Timer: "Code expires in 5:00"                                │
│  • Button: "Resend OTP"                                         │
│  • Input: Password                                              │
│  • [← Back] [Confirm Deletion ✓]                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼ (calls finalConfirmDeleteAccount())
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND: Complete Account Deletion                             │
│  POST /api/account/delete/initiate                              │
│  1. Verify OTP (check code, expiration, mark as used)           │
│  2. Verify password with bcrypt                                 │
│  3. Check for existing pending deletion                         │
│  4. Validate reasons                                            │
│  5. Create account_deletion_requests record                     │
│  6. Deactivate ENTIRE user account:                             │
│     - users.account_status = 'pending_deletion'                 │
│     - users.is_active = FALSE                                   │
│     - users.scheduled_deletion_at = now + 90 days               │
│  7. Update deletion_reason_stats                                │
│  8. CASCADE handles profile deletions automatically             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  PANEL 5: Farewell / Success                                    │
│  • "Account Deactivated" heading (green checkmark)             │
│  • "Account scheduled for deletion in 90 days"                  │
│  • "Log in within 90 days to auto-restore"                      │
│  • [Goodbye ⊗] → Logout + redirect to home                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Requirements

### Required Table: `otp_verifications`
```sql
CREATE TABLE IF NOT EXISTS otp_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL,  -- 'account_deletion'
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_user_purpose ON otp_verifications(user_id, purpose);
```

### Updated Table: `account_deletion_requests`
**Columns no longer used (can be removed in migration):**
- `role` (VARCHAR)
- `profile_id` (INTEGER)
- `delete_user` (BOOLEAN)

These columns are now obsolete since we always delete the entire user account.

---

## Testing Checklist

- [ ] Open Leave Astegni modal from Settings panel
- [ ] Panel 1: Type "DELETE" → moves to Panel 2
- [ ] Panel 2: Select at least one reason → moves to Panel 3
- [ ] Panel 3: Click "I Understand" → sends OTP and moves to Panel 4
- [ ] Verify OTP sent to email (check console for dev OTP)
- [ ] Panel 4: Verify OTP timer counts down from 5:00
- [ ] Panel 4: Enter wrong OTP → shows error
- [ ] Panel 4: Enter correct OTP + wrong password → shows error
- [ ] Panel 4: Enter correct OTP + correct password → moves to Panel 5
- [ ] Panel 5: Click "Goodbye" → logs out and redirects to home
- [ ] Verify user account is deactivated in database
- [ ] Verify `users.is_active = FALSE`
- [ ] Verify `users.account_status = 'pending_deletion'`
- [ ] Verify `users.scheduled_deletion_at` is set to 90 days in future
- [ ] Test "Resend OTP" button functionality
- [ ] Test OTP expiration (wait 5 minutes)
- [ ] Test restore on login (log in within 90 days)

---

## Production Deployment Notes

### 1. **Email Service Integration**
The `send_deletion_otp()` function currently returns the OTP in the API response for development purposes. **You MUST integrate an email service before production:**

```python
# In send_deletion_otp() function, replace:
return {
    "success": True,
    "message": "OTP sent to your email",
    "expires_in_minutes": 5,
    "email": current_user["email"],
    "otp_code": otp_code  # REMOVE THIS LINE IN PRODUCTION!
}

# With proper email sending:
from email_service import email_service

email_service.send_otp_email(
    to_email=current_user["email"],
    otp_code=otp_code,
    purpose="account_deletion",
    expires_in_minutes=5
)

return {
    "success": True,
    "message": "OTP sent to your email",
    "expires_in_minutes": 5,
    "email": current_user["email"]
    # Don't return otp_code in production!
}
```

### 2. **Database Migration**
If `account_deletion_requests` table has `role`, `profile_id`, `delete_user` columns, you can optionally remove them:

```sql
ALTER TABLE account_deletion_requests
DROP COLUMN IF EXISTS role,
DROP COLUMN IF EXISTS profile_id,
DROP COLUMN IF EXISTS delete_user;
```

### 3. **Backend Restart**
After deploying changes, restart the backend:
```bash
cd astegni-backend
systemctl restart astegni-backend  # Production
# OR
python app.py  # Development
```

---

## Benefits of This Update

1. **Enhanced Security**: OTP verification adds an extra layer of protection against accidental or unauthorized account deletion
2. **Simplified Logic**: No more role-based branching - always delete the entire account
3. **Better UX**: Combined OTP + password on one panel reduces confusion
4. **Cleaner Code**: Removed complex role detection and profile-specific deletion logic
5. **Consistent Behavior**: Same deletion flow regardless of which profile page the user is on

---

## Rollback Plan

If you need to revert to the old role-based system:

1. **Frontend**: Restore previous versions of:
   - `modals/common-modals/leave-astegni-modal.html`
   - `js/tutor-profile/leave-astegni-modal.js`

2. **Backend**: Restore previous version of:
   - `astegni-backend/account_deletion_endpoints.py`

3. **Git Command**:
```bash
git checkout HEAD~1 -- modals/common-modals/leave-astegni-modal.html
git checkout HEAD~1 -- js/tutor-profile/leave-astegni-modal.js
git checkout HEAD~1 -- astegni-backend/account_deletion_endpoints.py
```

---

## Questions or Issues?

If you encounter any problems:
1. Check backend logs: `tail -f astegni-backend/logs/app.log`
2. Check browser console for JavaScript errors
3. Verify OTP is being generated and stored in database
4. Verify `otp_verifications` table exists
5. Test with dev OTP code returned in API response

**Last Updated**: 2026-01-26
