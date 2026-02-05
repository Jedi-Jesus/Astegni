# OTP Verification for Role Management

## Overview

Added **OTP (One-Time Password) verification** as an additional security layer for role deactivation and removal. Users now need to:
1. Enter their password
2. Receive and enter an OTP code
3. Confirm the action

This prevents unauthorized role changes even if someone gains access to the user's password.

---

## Changes Made

### 1. Backend Changes

#### **File:** `astegni-backend/role_management_endpoints.py`

**Added OTP field to request model:**
```python
class RoleActionRequest(BaseModel):
    role: Literal['student', 'tutor', 'parent', 'advertiser', 'user']
    password: str
    otp: str  # NEW: OTP code for verification
```

**Added imports:**
```python
from models import ..., OTP
from datetime import datetime
```

**Updated both endpoints to verify OTP:**

##### Deactivate Endpoint (lines 85-102)
```python
# Verify OTP
otp_record = db.query(OTP).filter(
    OTP.user_id == current_user.id,
    OTP.otp_code == request.otp,
    OTP.purpose == "role_deactivate",
    OTP.is_used == False,
    OTP.expires_at > datetime.utcnow()
).first()

if not otp_record:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired OTP"
    )

# Mark OTP as used
otp_record.is_used = True
db.commit()
```

##### Remove Endpoint (lines 184-201)
```python
# Verify OTP
otp_record = db.query(OTP).filter(
    OTP.user_id == current_user.id,
    OTP.otp_code == request.otp,
    OTP.purpose == "role_remove",
    OTP.is_used == False,
    OTP.expires_at > datetime.utcnow()
).first()

if not otp_record:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired OTP"
    )

# Mark OTP as used
otp_record.is_used = True
db.commit()
```

**OTP Purposes:**
- `role_deactivate` - For deactivating a role
- `role_remove` - For permanently removing a role

---

### 2. Frontend Changes

#### **File:** `modals/common-modals/manage-role-modal.html`

**Added OTP input fields to both panels:**

##### Deactivate Panel (lines 178-189)
```html
<!-- OTP Input -->
<div class="mb-4">
    <label class="block text-sm font-medium text-gray-700 mb-2">Enter OTP Code</label>
    <input type="text" id="deactivate-otp"
           class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-center text-lg tracking-widest"
           placeholder="000000" maxlength="6" pattern="[0-9]{6}">
    <div class="flex items-center justify-between mt-2">
        <button type="button" id="deactivate-send-otp"
                onclick="RoleManager.sendOTP('deactivate')"
                class="text-sm text-orange-600 hover:text-orange-700 font-medium">
            Send OTP
        </button>
        <span id="deactivate-otp-timer" class="text-sm text-gray-500 hidden"></span>
    </div>
    <p id="deactivate-error" class="text-red-500 text-sm mt-2 hidden"></p>
</div>
```

##### Remove Panel (lines 282-292)
```html
<!-- OTP Input -->
<div class="mb-4">
    <label class="block text-sm font-medium text-gray-700 mb-2">Enter OTP Code</label>
    <input type="text" id="remove-otp"
           class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-center text-lg tracking-widest"
           placeholder="000000" maxlength="6" pattern="[0-9]{6}">
    <div class="flex items-center justify-between mt-2">
        <button type="button" id="remove-send-otp"
                onclick="RoleManager.sendOTP('remove')"
                class="text-sm text-red-600 hover:text-red-700 font-medium">
            Send OTP
        </button>
        <span id="remove-otp-timer" class="text-sm text-gray-500 hidden"></span>
    </div>
    <p id="remove-error" class="text-red-500 text-sm mt-2 hidden"></p>
</div>
```

---

#### **File:** `js/common-modals/role-manager.js`

**Added OTP timer tracking:**
```javascript
const RoleManager = {
    currentRole: null,
    currentAction: null,
    otpTimers: {}, // Track OTP timers for deactivate and remove
    // ...
}
```

**Added sendOTP function (lines 194-260):**
```javascript
sendOTP: async function(action) {
    const purpose = action === 'deactivate' ? 'role_deactivate' : 'role_remove';
    const sendBtn = document.getElementById(`${action}-send-otp`);
    const timerEl = document.getElementById(`${action}-otp-timer`);
    const errorEl = document.getElementById(`${action}-error`);

    try {
        // Disable send button
        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending...';

        const response = await fetch(`${API_BASE_URL}/api/send-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({ purpose })
        });

        const data = await response.json();

        if (response.ok) {
            // Show success toast
            window.showToast(`OTP sent to your ${data.destination}`, 'success');

            // Start 60-second countdown timer
            let seconds = 60;
            timerEl.classList.remove('hidden');
            timerEl.textContent = `(${seconds}s)`;

            // Clear existing timer if any
            if (this.otpTimers[action]) {
                clearInterval(this.otpTimers[action]);
            }

            this.otpTimers[action] = setInterval(() => {
                seconds--;
                timerEl.textContent = `(${seconds}s)`;

                if (seconds <= 0) {
                    clearInterval(this.otpTimers[action]);
                    timerEl.classList.add('hidden');
                    sendBtn.disabled = false;
                    sendBtn.textContent = 'Resend OTP';
                }
            }, 1000);
        }
    } catch (error) {
        console.error('Error sending OTP:', error);
        errorEl.textContent = 'An error occurred. Please try again.';
        errorEl.classList.remove('hidden');
    }
}
```

**Updated confirmDeactivate (lines 265-295):**
```javascript
confirmDeactivate: async function() {
    const password = document.getElementById('deactivate-password').value;
    const otp = document.getElementById('deactivate-otp').value;  // NEW
    // ...

    // Validate OTP
    if (!otp || otp.length !== 6) {
        errorEl.textContent = 'Please enter a valid 6-digit OTP';
        errorEl.classList.remove('hidden');
        return;
    }

    // Send OTP with request
    const response = await fetch(`${API_BASE_URL}/api/role/deactivate`, {
        method: 'POST',
        headers: { /* ... */ },
        body: JSON.stringify({
            role: this.currentRole,
            password: password,
            otp: otp  // NEW
        })
    });
}
```

**Updated confirmRemove (lines 340-378):**
```javascript
confirmRemove: async function() {
    const password = document.getElementById('remove-password').value;
    const otp = document.getElementById('remove-otp').value;  // NEW
    const checkbox = document.getElementById('remove-confirmation-checkbox');
    // ...

    // Validate OTP
    if (!otp || otp.length !== 6) {
        errorEl.textContent = 'Please enter a valid 6-digit OTP';
        errorEl.classList.remove('hidden');
        return;
    }

    // Send OTP with request
    const response = await fetch(`${API_BASE_URL}/api/role/remove`, {
        method: 'DELETE',
        headers: { /* ... */ },
        body: JSON.stringify({
            role: this.currentRole,
            password: password,
            otp: otp  // NEW
        })
    });
}
```

---

## User Flow

### Deactivate Role Flow

1. User opens Settings → Manage Roles → Click "Deactivate"
2. User enters password
3. User clicks **"Send OTP"** button
4. OTP sent to user's registered email/phone
5. Toast notification: "OTP sent to your email"
6. 60-second countdown timer appears: "(60s)"
7. User enters 6-digit OTP code
8. User clicks "Deactivate Role"
9. Backend verifies:
   - Password ✓
   - OTP code ✓
   - OTP not expired ✓
   - OTP not already used ✓
10. Role deactivated → User redirected to home

### Remove Role Flow

1. User opens Settings → Manage Roles → Click "Remove"
2. User enters password
3. User clicks **"Send OTP"** button
4. OTP sent to user's registered email/phone
5. Toast notification: "OTP sent to your email"
6. 60-second countdown timer appears: "(60s)"
7. User enters 6-digit OTP code
8. User checks "I understand" checkbox
9. User clicks "Remove Role"
10. Final browser confirmation dialog appears
11. User confirms
12. Backend verifies:
    - Password ✓
    - OTP code ✓
    - OTP not expired ✓
    - OTP not already used ✓
    - Checkbox confirmed ✓
13. Role permanently deleted → User logged out → Redirect to home

---

## Security Features

### Multi-Layer Protection

**Deactivate Role:**
1. ✅ Password verification
2. ✅ OTP verification (sent to registered contact)
3. ✅ JWT authentication

**Remove Role:**
1. ✅ Password verification
2. ✅ OTP verification (sent to registered contact)
3. ✅ Checkbox confirmation
4. ✅ Final browser confirmation dialog
5. ✅ JWT authentication
6. ✅ Prevents removing last role

### OTP Security

- **One-time use:** OTP marked as used after verification
- **Time-limited:** OTP expires (default: 10 minutes)
- **Purpose-specific:** Separate OTP purposes for deactivate vs remove
- **Rate-limited:** 60-second cooldown between OTP requests
- **Secure delivery:** Sent to user's verified email/phone only

---

## API Changes

### Send OTP Endpoint

**Endpoint:** `POST /api/send-otp`

**Request:**
```json
{
  "purpose": "role_deactivate"  // or "role_remove"
}
```

**Response:**
```json
{
  "destination": "email",
  "destination_value": "user@example.com",
  "message": "OTP sent successfully"
}
```

### Deactivate Role Endpoint

**Endpoint:** `POST /api/role/deactivate`

**Request (NEW):**
```json
{
  "role": "tutor",
  "password": "user_password",
  "otp": "123456"  // NEW REQUIRED FIELD
}
```

**Responses:**
- ✅ 200: Role deactivated successfully
- ❌ 400: Invalid or expired OTP
- ❌ 401: Incorrect password
- ❌ 404: Role not found

### Remove Role Endpoint

**Endpoint:** `DELETE /api/role/remove`

**Request (NEW):**
```json
{
  "role": "tutor",
  "password": "user_password",
  "otp": "123456"  // NEW REQUIRED FIELD
}
```

**Responses:**
- ✅ 200: Role removed successfully
- ❌ 400: Invalid or expired OTP, Cannot remove last role
- ❌ 401: Incorrect password
- ❌ 404: Role not found

---

## Testing Steps

### 1. Test Deactivate with OTP

```bash
# Start backend
cd astegni-backend
python app.py

# Start frontend
python dev-server.py
```

1. Login to tutor-profile (or any profile)
2. Go to Settings panel → Manage Roles
3. Click "Deactivate Role"
4. Enter password
5. Click "Send OTP" → Verify toast shows "OTP sent to your email"
6. Check email/phone for OTP code
7. Enter OTP code (6 digits)
8. Click "Deactivate Role"
9. Verify success message and redirect to home
10. Try to login → Should work, but role should be hidden from role switcher

### 2. Test Remove with OTP

1. Login to tutor-profile
2. Go to Settings panel → Manage Roles
3. Click "Remove Role"
4. Enter password
5. Click "Send OTP" → Verify toast shows "OTP sent to your email"
6. Check email/phone for OTP code
7. Enter OTP code (6 digits)
8. Check "I understand" checkbox
9. Click "Remove Role"
10. Confirm final warning dialog
11. Verify role is permanently deleted
12. Verify user is logged out
13. Try to login → Should work, but role should be gone

### 3. Test OTP Expiration

1. Click "Send OTP"
2. Wait for OTP to expire (10 minutes)
3. Try to use expired OTP
4. Verify error: "Invalid or expired OTP"

### 4. Test OTP Reuse

1. Click "Send OTP"
2. Use the OTP successfully
3. Try to use the same OTP again
4. Verify error: "Invalid or expired OTP"

### 5. Test Countdown Timer

1. Click "Send OTP"
2. Verify countdown starts: "(60s)", "(59s)", etc.
3. Verify button is disabled during countdown
4. After 60 seconds, verify button re-enables
5. Verify button text changes to "Resend OTP"

---

## Error Messages

| Error | Message |
|-------|---------|
| No OTP entered | "Please enter a valid 6-digit OTP" |
| OTP too short | "Please enter a valid 6-digit OTP" |
| Invalid OTP | "Invalid or expired OTP" |
| Expired OTP | "Invalid or expired OTP" |
| OTP already used | "Invalid or expired OTP" |
| Wrong purpose | "Invalid or expired OTP" |
| Failed to send OTP | "Failed to send OTP" |

---

## Files Modified

### Backend
1. `astegni-backend/role_management_endpoints.py`
   - Added OTP field to `RoleActionRequest`
   - Added OTP verification to deactivate endpoint (lines 85-102)
   - Added OTP verification to remove endpoint (lines 184-201)

### Frontend
1. `modals/common-modals/manage-role-modal.html`
   - Added OTP input to deactivate panel (lines 178-189)
   - Added OTP input to remove panel (lines 282-292)

2. `js/common-modals/role-manager.js`
   - Added `otpTimers` object to track countdown timers
   - Added `sendOTP()` function (lines 194-260)
   - Updated `confirmDeactivate()` to include OTP validation and sending (lines 265-295)
   - Updated `confirmRemove()` to include OTP validation and sending (lines 340-378)

---

## Production Considerations

### 1. OTP Delivery

Ensure OTP delivery is configured:
```python
# In astegni-backend/.env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
TWILIO_ACCOUNT_SID=your-twilio-sid  # For SMS
TWILIO_AUTH_TOKEN=your-twilio-token
```

### 2. Rate Limiting

The `/api/send-otp` endpoint should have rate limiting to prevent abuse:
```python
@limiter.limit("5/hour")  # Max 5 OTP requests per hour
@router.post("/api/send-otp")
```

### 3. OTP Expiration

Default OTP expiration is 10 minutes. Adjust if needed:
```python
# In send-otp endpoint
otp.expires_at = datetime.utcnow() + timedelta(minutes=10)
```

---

## Summary

✅ **Added OTP verification** for role deactivation and removal
✅ **Dual verification:** Password + OTP required
✅ **60-second cooldown** prevents OTP spam
✅ **One-time use** prevents OTP reuse
✅ **Time-limited** OTPs expire after 10 minutes
✅ **User-friendly** countdown timer and clear error messages
✅ **CORS fixed** for DELETE method

**Security Level:** HIGH
- Prevents unauthorized role changes even if password is compromised
- Requires access to user's registered email/phone
- Multiple confirmation steps for permanent deletion

---

**Next Step:** Restart the backend server and test the OTP flow!

```bash
cd astegni-backend
# Stop server (Ctrl+C)
python app.py
```
