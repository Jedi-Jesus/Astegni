# Email Masking Fix - Leave Astegni Modal

## Problem
The email in Panel 4 of the leave-astegni-modal was being read from the API response when sending OTP, which could potentially expose the full email address. The email wasn't loading initially because it relied on `window.user.email` which may not be available.

## Root Cause
1. **Initial Implementation**: Email was only masked when `window.user.email` was available (line 407-414)
2. **Secondary Issue**: After sending OTP, the email was re-masked using data from the API response (`data.email`), which contained the full email address
3. **Data Not Loading**: `window.user` object wasn't reliably populated when entering Panel 4

## Solution
Fixed the email masking to fetch user data directly from the `/api/me` endpoint when entering Panel 4, ensuring the email is:
1. ✅ Fetched reliably from the users table via API
2. ✅ Masked immediately when entering Panel 4
3. ✅ Never overwritten by subsequent API responses

## Changes Made

### File: `js/tutor-profile/leave-astegni-modal.js`

#### 1. Added `fetchAndMaskUserEmail()` Function (Lines 455-498)
```javascript
async function fetchAndMaskUserEmail() {
    const emailElement = document.getElementById('deleteOtpEmail');
    if (!emailElement) return;

    // Show loading state
    emailElement.textContent = 'Loading...';

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            emailElement.textContent = 'y***@e******.com';
            return;
        }

        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${API_BASE_URL}/api/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const userData = await response.json();
            if (userData.email) {
                const maskedEmail = maskEmail(userData.email);
                emailElement.textContent = maskedEmail;
                console.log('✅ User email fetched and masked:', maskedEmail);
            } else {
                emailElement.textContent = 'y***@e******.com';
            }
        } else {
            // Fallback if API call fails
            emailElement.textContent = 'y***@e******.com';
        }
    } catch (error) {
        console.error('❌ Error fetching user email:', error);
        // Fallback to placeholder
        emailElement.textContent = 'y***@e******.com';
    }
}
```

**Features:**
- Fetches user email from `/api/me` endpoint
- Shows "Loading..." while fetching
- Masks email immediately using `maskEmail()` function
- Provides fallback placeholder if fetch fails
- Includes error handling

#### 2. Updated `goToDeletePanel()` Function (Lines 407-410)
**Before:**
```javascript
// When navigating to panel 4, mask the email immediately using user data
if (panelNumber === 4) {
    const emailElement = document.getElementById('deleteOtpEmail');
    if (emailElement && window.user && window.user.email) {
        const maskedEmail = maskEmail(window.user.email);
        emailElement.textContent = maskedEmail;
    }
}
```

**After:**
```javascript
// When navigating to panel 4, fetch and mask the email immediately
if (panelNumber === 4) {
    fetchAndMaskUserEmail();
}
```

**Benefits:**
- Simpler and cleaner code
- Reliable data fetching from API
- No dependency on `window.user` object

#### 3. Removed Email Re-masking from `sendDeleteOtp()` (Line 545)
**Before:**
```javascript
if (response.ok && data.success) {
    console.log('✅ OTP sent successfully:', data);

    // Mask email and update display in panel 4
    const emailElement = document.getElementById('deleteOtpEmail');
    if (emailElement && data.email) {
        const maskedEmail = maskEmail(data.email);
        emailElement.textContent = maskedEmail;
    }

    // Clear OTP and password inputs
```

**After:**
```javascript
if (response.ok && data.success) {
    console.log('✅ OTP sent successfully:', data);

    // Email is already masked when entering Panel 4, no need to update it here

    // Clear OTP and password inputs
```

**Benefits:**
- Prevents potential email exposure from API response
- Email remains consistently masked throughout Panel 4
- Cleaner separation of concerns

## How It Works Now

### User Flow:
1. **User navigates to Panel 4** → `fetchAndMaskUserEmail()` is called
2. **Function fetches user data** → GET `/api/me` with JWT token
3. **Email is retrieved** → From users table in database
4. **Email is masked** → Using `maskEmail()` function (e.g., `jediael.s.abebe@gmail.com` → `j***@g******.com`)
5. **Masked email is displayed** → In Panel 4
6. **User clicks "Send OTP"** → OTP is sent, email display remains unchanged
7. **User can resend OTP** → Email display still remains unchanged

### Data Flow:
```
Panel 4 Entry
    ↓
fetchAndMaskUserEmail()
    ↓
GET /api/me (with JWT token)
    ↓
Backend reads from users table
    ↓
Returns user data (including email)
    ↓
Frontend masks email
    ↓
Display masked email
    ↓
User interacts with Panel 4 (Send OTP, Resend OTP, etc.)
    ↓
Masked email never changes
```

## Security & Privacy Improvements
1. ✅ Email is fetched securely using JWT authentication
2. ✅ Email is masked immediately before display
3. ✅ Email from API responses is never displayed
4. ✅ Consistent masking throughout the entire panel
5. ✅ Fallback placeholder if fetch fails

## Testing Checklist
- [ ] Open leave-astegni-modal
- [ ] Navigate through panels 1, 2, 3
- [ ] Reach Panel 4 - verify email shows "Loading..." then masked email
- [ ] Verify masked email format (e.g., `j***@g******.com`)
- [ ] Click "Send OTP" - verify email remains masked
- [ ] Click "Resend OTP" - verify email remains masked
- [ ] Test with different email formats
- [ ] Test with network error (email should show fallback placeholder)
- [ ] Test with invalid token (email should show fallback placeholder)

## Related Files
- **Frontend**: `js/tutor-profile/leave-astegni-modal.js`
- **Modal HTML**: `modals/common-modals/leave-astegni-modal.html`
- **Backend**: `astegni-backend/account_deletion_endpoints.py`
- **API Endpoints**:
  - `GET /api/me` - Fetch user data
  - `POST /api/account/delete/send-otp` - Send OTP

## Summary
The email masking system now reliably fetches user email from the database via the `/api/me` endpoint when entering Panel 4, masks it immediately, and ensures it's never overwritten by subsequent API responses. This provides better privacy protection and a more consistent user experience.
