# OTP Add Role Implementation - Complete Guide

## Overview
Implemented a secure OTP-based role addition system that allows users to add new roles to their account with email or phone verification.

## Features Implemented

### ✅ Backend (Python/FastAPI)

1. **OTP Model** (`models.py`)
   - Table: `otps`
   - Fields: user_id, otp_code, purpose, expires_at, is_used, created_at
   - Supports multiple purposes: 'add_role', 'verify_email', 'reset_password'

2. **POST /api/send-otp**
   - Sends OTP to user's email or phone
   - Parameters:
     - `purpose`: "add_role" (default)
     - `send_to`: "email" or "phone" (default: "email")
   - Validates user has the requested contact method
   - Generates 6-digit random OTP
   - Expires in 5 minutes
   - Invalidates previous unused OTPs
   - Returns masked destination value for privacy
   - Development mode: Returns OTP in response and logs to console

3. **POST /api/add-role**
   - Verifies OTP, password, and adds role
   - Parameters:
     - `otp`: 6-digit code
     - `new_role`: Role to add (student, tutor, guardian, etc.)
     - `password`: User's password for verification
   - Validates OTP is valid and not expired
   - Verifies user password
   - Checks role doesn't already exist
   - Adds role to user's roles array
   - Creates corresponding profile (tutor/student)
   - Marks OTP as used (one-time use)

### ✅ Frontend (JavaScript/HTML)

1. **Enhanced Add Role Modal** (`index.html`)
   - OTP destination selector (Email/Phone)
   - OTP input field (6 digits)
   - Resend OTP with 60-second countdown
   - Role selection dropdown
   - Password confirmation
   - Forgot password link
   - Loading states and animations
   - Success/error handling

2. **Profile System Integration** (`profile-system.js`)
   - `openAddRoleModal()`: Opens modal and sends OTP automatically
   - `sendAddRoleOTP()`: Sends OTP to selected destination
   - `handleResendOTP()`: Resends OTP with timer
   - `handleAddRoleSubmit()`: Submits form with OTP verification
   - `handleOTPDestinationChange()`: Handles destination change
   - Auto-refresh role switcher after adding role
   - Prompts user to switch to new role

3. **Styling** (`auth-modal.css`)
   - Full CSS variable integration from `theme.css`
   - Light/dark mode support
   - Glassmorphism design
   - Floating labels
   - Custom select dropdown
   - Ripple button effects
   - Responsive design

### ✅ Security Features

1. **OTP Security**
   - 6-digit random generation
   - 5-minute expiration
   - One-time use enforcement
   - Automatic invalidation of old OTPs
   - User-specific validation

2. **Authentication**
   - Password verification required
   - JWT token authentication
   - Role duplication prevention
   - Automatic profile creation

3. **Privacy**
   - Masked destination values (e.g., "tes***@example.com", "+251***45")
   - Secure OTP transmission (to be implemented with email/SMS service)

## Usage Flow

### User Experience:
1. User clicks "Add New Role" in profile dropdown
2. Modal opens with destination selector (Email/Phone)
3. OTP is automatically sent to selected destination
4. User receives OTP via email or SMS
5. User enters: OTP + selects role + confirms password
6. System verifies all inputs
7. Role is added successfully
8. User is prompted to switch to new role

### Developer Testing:
1. Start backend: `cd astegni-backend && python app.py`
2. Start frontend: `python -m http.server 8080`
3. Login with test account
4. Click "Add New Role" in profile dropdown
5. Check backend console for OTP code
6. Enter OTP and complete form
7. Verify role was added in role switcher

## API Examples

### Send OTP (Email)
```bash
POST /api/send-otp
Authorization: Bearer <token>
Content-Type: application/json

{
  "purpose": "add_role",
  "send_to": "email"
}
```

**Response:**
```json
{
  "message": "OTP sent successfully to your email",
  "destination": "email",
  "destination_value": "tes***om",
  "expires_in": 300,
  "otp": "123456"  // Development only
}
```

### Send OTP (Phone)
```bash
POST /api/send-otp
Authorization: Bearer <token>
Content-Type: application/json

{
  "purpose": "add_role",
  "send_to": "phone"
}
```

### Add Role
```bash
POST /api/add-role
Authorization: Bearer <token>
Content-Type: application/json

{
  "otp": "123456",
  "new_role": "tutor",
  "password": "user_password"
}
```

**Response:**
```json
{
  "message": "Tutor role added successfully",
  "user_roles": ["student", "tutor"],
  "active_role": "student"
}
```

## Database Schema

### OTP Table
```sql
CREATE TABLE otps (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Testing

### Automated Test Script
```bash
cd astegni-backend
python test_otp_endpoints.py
```

The test script:
1. Logs in with test credentials
2. Gets current roles
3. Prompts for email/phone selection
4. Sends OTP
5. Adds new role
6. Verifies role was added

### Manual Testing Checklist
- [ ] OTP sent to email
- [ ] OTP sent to phone
- [ ] OTP expires after 5 minutes
- [ ] OTP can only be used once
- [ ] Invalid OTP shows error
- [ ] Invalid password shows error
- [ ] Duplicate role shows error
- [ ] Resend OTP works with timer
- [ ] Role switcher updates after adding role
- [ ] Switch to new role prompt works
- [ ] Modal closes after success
- [ ] Dark/light mode styling works

## Production Deployment

### Required Changes:

1. **Email Service Integration**
   ```python
   # In routes.py, replace console log with:
   send_email(
       to=current_user.email,
       subject="Your Astegni OTP Code",
       body=f"Your OTP code is: {otp_code}. Valid for 5 minutes."
   )
   ```

2. **SMS Service Integration**
   ```python
   # In routes.py, replace console log with:
   send_sms(
       to=current_user.phone,
       message=f"Your Astegni OTP code is: {otp_code}. Valid for 5 minutes."
   )
   ```

3. **Remove Development OTP**
   ```python
   # In /api/send-otp response, remove:
   "otp": otp_code  # REMOVE THIS LINE
   ```

4. **Environment Variables**
   ```env
   # Email Service (e.g., SendGrid)
   SENDGRID_API_KEY=your_key
   SENDGRID_FROM_EMAIL=noreply@astegni.com

   # SMS Service (e.g., Twilio)
   TWILIO_ACCOUNT_SID=your_sid
   TWILIO_AUTH_TOKEN=your_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

## Files Modified

### Backend:
- `app.py modules/models.py` - Added OTP model
- `app.py modules/routes.py` - Added /api/send-otp and /api/add-role
- `create_otp_table.py` - Migration script
- `test_otp_endpoints.py` - Test script

### Frontend:
- `index.html` - Updated add-role modal with destination selector
- `js/root/profile-system.js` - Added OTP functions
- `css/root/auth-modal.css` - Added modal styling

## Known Limitations

1. **Development Mode**: OTP is shown in response and console (remove in production)
2. **Email/SMS**: Not integrated yet (placeholders in code)
3. **Rate Limiting**: No specific OTP rate limiting implemented
4. **Brute Force**: No attempt limiting (consider adding after 3 failed attempts)

## Future Enhancements

1. Add OTP attempt limiting (max 3 attempts)
2. Add OTP rate limiting (max 3 OTPs per 15 minutes)
3. Implement email templates
4. Implement SMS templates
5. Add OTP verification for other purposes (password reset, email verification)
6. Add phone number verification before sending SMS
7. Add backup codes for OTP failures
8. Add audit logging for OTP usage

## Support

For issues or questions:
- Check backend console for OTP codes (development)
- Check browser console for frontend errors
- Review API responses for error details
- Test with `test_otp_endpoints.py` script
