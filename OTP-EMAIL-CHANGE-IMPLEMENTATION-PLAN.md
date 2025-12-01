# OTP Email Change Implementation Plan

## Requirements
✅ Email and phone labels added to profile header
❌ OTP verification for current email before allowing changes
❌ OTP verification for new email address
❌ Update edit profile modal with OTP flow

## User Flow

### Step 1: Edit Profile Click
User clicks "Edit Profile" → Modal opens with current data populated

### Step 2: User Wants to Change Email
1. User clicks on email field
2. System detects email change attempt
3. Show warning: "Changing email requires verification"

### Step 3: Verify Current Email (Ownership)
1. Show OTP input for current email
2. Button: "Send OTP to Current Email"
3. Backend sends OTP to current email
4. User enters 6-digit OTP
5. System verifies OTP
6. ✅ Current email verified

### Step 4: Verify New Email (Validity)
1. User enters new email address
2. Button: "Send OTP to New Email"
3. Backend sends OTP to new email
4. User enters 6-digit OTP
5. System verifies OTP
6. ✅ New email verified

### Step 5: Update Email
1. Both OTPs verified
2. Backend updates email in database
3. Success message shown
4. Profile refreshed

## Backend Endpoints (Already Exist)

### 1. Send OTP to New Email
```
POST /api/admin-auth/send-otp-email-change
Body: {
  "new_email": "newemail@example.com"
}
Headers: {
  "Authorization": "Bearer {token}"
}
```

### 2. Verify OTP for New Email
```
POST /api/admin-auth/verify-otp-email-change
Body: {
  "new_email": "newemail@example.com",
  "otp_code": "123456"
}
Headers: {
  "Authorization": "Bearer {token}"
}
```

### 3. Update Email (After Verification)
Need to check if this exists or create it

## Frontend Components Needed

### 1. OTP Verification Modal
- **File**: `js/admin-pages/admin-email-otp-verification.js`
- **Features**:
  - Two-step verification UI
  - OTP input fields (6 digits)
  - Timer countdown (5 minutes)
  - Resend OTP button
  - Verification status indicators

### 2. Updated Edit Profile Modal
- **File**: `js/admin-pages/manage-courses-profile-edit.js`
- **Changes**:
  - Detect email field changes
  - Trigger OTP verification flow
  - Disable email field until verified
  - Show verification badges

### 3. OTP UI Components
- Current email verification section
- New email verification section
- OTP input (6-digit code)
- Success/error messages
- Countdown timer

## Database Schema

### admin_profile table
```sql
email VARCHAR(255) - Current email
otp_code VARCHAR(6) - OTP code
otp_expires_at TIMESTAMP - Expiry time
is_otp_verified BOOLEAN - Verification status
```

## Implementation Steps

### Phase 1: UI Components ✅
1. Add email/phone labels to profile header ✅
2. Update dashboard loader to show email/phone ✅

### Phase 2: OTP Modal (Next)
1. Create OTP verification modal HTML
2. Add to manage-courses.html
3. Style with TailwindCSS

### Phase 3: OTP JavaScript (Next)
1. Create admin-email-otp-verification.js
2. Implement two-step verification
3. Handle OTP sending
4. Handle OTP verification
5. Handle success/errors

### Phase 4: Integration (Next)
1. Update edit profile modal
2. Add "Change Email" button
3. Trigger OTP flow
4. Update email after verification

### Phase 5: Testing
1. Test current email OTP
2. Test new email OTP
3. Test email update
4. Test error handling
5. Test timer expiry

## Security Considerations

✅ **Two-Factor Verification**: Both old and new email verified
✅ **Time Limit**: OTP expires in 5 minutes
✅ **Single Use**: OTP can only be used once
✅ **Token Required**: Must be authenticated
✅ **Rate Limiting**: Prevent OTP spam

## Error Handling

- **OTP Send Failed**: Show retry button
- **OTP Expired**: Show resend button
- **OTP Invalid**: Show error, allow retry
- **Email Already Used**: Show error message
- **Network Error**: Show retry option

## Next Steps

1. Create OTP verification modal UI
2. Implement JavaScript OTP handling
3. Connect to backend endpoints
4. Test complete flow
5. Add success notifications

## Files to Create/Modify

### Create:
- `js/admin-pages/admin-email-otp-verification.js` - OTP handling logic
- Modal HTML in manage-courses.html

### Modify:
- `manage-courses.html` - Add OTP modal
- `js/admin-pages/manage-courses-profile-edit.js` - Integrate OTP flow
- `js/admin-pages/manage-courses-dashboard-loader.js` - Display email/phone ✅

### Backend (Check/Create):
- Verify OTP endpoints exist
- Create email update endpoint if needed
- Test OTP email sending

## Status

- ✅ Requirements analyzed
- ✅ Email/phone labels added
- ⏳ OTP modal UI - Next
- ⏳ OTP JavaScript - After UI
- ⏳ Integration - After JavaScript
- ⏳ Testing - Final step
