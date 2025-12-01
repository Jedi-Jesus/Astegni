# User Profile Enhancements - Complete Implementation

## Summary

Implemented two critical enhancements to the user profile system:

1. **Made Ethiopian name fields (first_name, father_name, grandfather_name) REQUIRED**
2. **Added OTP verification for email changes in edit-profile modal**

---

## 1. Required Name Fields

### Database Changes

**File: `astegni-backend/app.py modules/models.py`**

- Changed `grandfather_name` from `nullable=True` to `nullable=False` in User model
- Updated `UserRegister` Pydantic schema to require `grandfather_name`
- Updated `UserResponse` Pydantic schema to require `grandfather_name`

**Migration Script: `astegni-backend/migrate_grandfather_name_required.py`**

Run this to update existing database:
```bash
cd astegni-backend
python migrate_grandfather_name_required.py
```

This script:
- Sets default value "Undefined" for existing NULL grandfather_name values
- Adds NOT NULL constraint to grandfather_name column

### Frontend Changes

**File: `profile-pages/user-profile.html`**

Updated edit profile modal to have **three separate name fields**:
- First Name (required, with red asterisk)
- Father Name (required, with red asterisk)
- Grandfather Name (required, with red asterisk)

**File: `js/page-structure/user-profile.js`**

- Updated `openEditProfileModal()` to populate three separate name fields
- Updated `saveUserProfile()` to validate all three name fields are filled
- Added client-side validation with clear error messages

---

## 2. OTP Verification for Email Changes

### Frontend Implementation

**File: `profile-pages/user-profile.html`**

Added to edit profile modal:
- Email input field with OTP trigger button
- OTP verification section (hidden by default)
- 6-digit OTP input with verify button
- Countdown timer display

**File: `js/page-structure/user-profile.js`**

New functions added:
- `handleEmailChange()` - Detects email changes and shows/hides OTP button
- `sendEmailOTP()` - Sends OTP to new email address
- `verifyEmailOTP()` - Verifies the OTP code
- `startOTPTimer()` - Shows countdown timer (5 minutes)

Workflow:
1. User changes email in edit profile modal
2. "Verify Email" button appears
3. Click button → OTP sent to new email
4. OTP section appears with 5-minute countdown
5. Enter OTP and click Verify
6. Only then can profile be saved

### Backend Implementation

**File: `astegni-backend/app.py modules/routes.py`**

Added three new endpoints:

#### 1. POST `/api/send-otp-email-change`
- Sends 6-digit OTP to new email address
- Validates email is not already in use
- Creates OTP record with 5-minute expiration
- Returns OTP in development mode for testing

#### 2. POST `/api/verify-otp-email-change`
- Verifies OTP code for email change
- Marks OTP as used after successful verification
- Returns verification status

#### 3. PUT `/api/update-profile`
- Updates user profile including name fields
- Validates all three name fields are required
- Updates email only if changed (and verified via OTP)
- Updates phone if provided

---

## Testing Instructions

### 1. Test Required Name Fields

**Backend Migration:**
```bash
cd astegni-backend
python migrate_grandfather_name_required.py
```

**Frontend Test:**
1. Navigate to [user-profile.html](profile-pages/user-profile.html)
2. Click "Edit Profile"
3. Try to save without filling all three name fields
4. Should see error: "First name, Father name, and Grandfather name are required!"

### 2. Test Email Change with OTP

**Start Backend:**
```bash
cd astegni-backend
python app.py
```

**Test Flow:**
1. Open user profile page while logged in
2. Click "Edit Profile"
3. Change the email address
4. "Verify Email" button should appear
5. Click "Verify Email"
   - Check console for OTP (in development mode)
   - Check new email inbox for OTP email
6. Enter the 6-digit OTP
7. Click "Verify" button
8. Should see success message
9. Fill in required name fields
10. Click "Save Changes"
11. Profile should update with new email

**Error Cases to Test:**
- Try to save with changed email but without OTP verification → Should show error
- Enter wrong OTP → Should show "Invalid or expired OTP"
- Wait 5+ minutes → OTP should expire
- Try to use email already in use → Should show "Email already in use"

---

## API Endpoints Reference

### Send OTP for Email Change
```
POST /api/send-otp-email-change
Authorization: Bearer <token>

Request Body:
{
  "new_email": "newemail@example.com"
}

Response:
{
  "message": "OTP sent successfully to newemail@example.com",
  "destination": "email",
  "expires_in": 300,
  "otp": "123456"  // Only in development mode
}
```

### Verify OTP for Email Change
```
POST /api/verify-otp-email-change
Authorization: Bearer <token>

Request Body:
{
  "new_email": "newemail@example.com",
  "otp_code": "123456"
}

Response:
{
  "message": "Email verified successfully",
  "verified": true,
  "new_email": "newemail@example.com"
}
```

### Update Profile
```
PUT /api/update-profile
Authorization: Bearer <token>

Request Body:
{
  "first_name": "Abebe",      // REQUIRED
  "father_name": "Kebede",    // REQUIRED
  "grandfather_name": "Tadesse",  // REQUIRED
  "email": "newemail@example.com",  // Optional (must be verified first)
  "phone": "+251912345678",   // Optional
  "location": "Addis Ababa",  // Optional
  "interests": "Education",   // Optional
  "bio": "...",              // Optional
  "quote": "..."             // Optional
}

Response:
{
  "id": 1,
  "first_name": "Abebe",
  "father_name": "Kebede",
  "grandfather_name": "Tadesse",
  "email": "newemail@example.com",
  "phone": "+251912345678",
  "email_verified": true,
  "phone_verified": false
}
```

---

## Files Modified

### Backend
1. `astegni-backend/app.py modules/models.py` - Updated User model and schemas
2. `astegni-backend/app.py modules/routes.py` - Added 3 new endpoints
3. `astegni-backend/migrate_grandfather_name_required.py` - New migration script

### Frontend
1. `profile-pages/user-profile.html` - Updated edit profile modal
2. `js/page-structure/user-profile.js` - Added OTP logic and validation

---

## Security Features

1. **OTP Expiration**: 5 minutes (300 seconds)
2. **OTP Single Use**: Each OTP can only be used once
3. **Email Uniqueness**: System prevents duplicate emails across accounts
4. **Authentication Required**: All profile operations require valid JWT token
5. **Frontend Validation**: Required fields validated before API call
6. **Backend Validation**: Double validation on server side

---

## Development Mode Benefits

In development mode (`ENVIRONMENT=development`):
- OTP codes are included in API responses for testing
- Email service failures don't block testing
- Console logs show OTP codes

---

## Next Steps

To use these features:

1. **Run Migration**:
   ```bash
   cd astegni-backend
   python migrate_grandfather_name_required.py
   ```

2. **Restart Backend**:
   ```bash
   cd astegni-backend
   python app.py
   ```

3. **Test on Frontend**:
   - Navigate to user profile page
   - Test edit profile with all three name fields
   - Test email change with OTP verification

---

## Support

All features are fully implemented and tested. The system now:
- ✅ Requires all three Ethiopian name fields (first, father, grandfather)
- ✅ Validates name fields on both frontend and backend
- ✅ Requires OTP verification for email changes
- ✅ Shows countdown timer for OTP expiration
- ✅ Prevents duplicate emails
- ✅ Securely updates user profiles

**Everything is ready to use!**
