# Registration OTP Flow - Implementation Status

## ✅ BACKEND COMPLETE

### New Endpoints Added:
1. **POST `/api/send-registration-otp`** (Public - No Auth)
   - Sends OTP to email or phone
   - Validates no existing user with that contact
   - Returns OTP in development mode
   - Expires in 5 minutes

2. **POST `/api/verify-registration-otp`** (Public - No Auth)
   - Verifies OTP code
   - Creates user account
   - Creates role-specific profile
   - Returns JWT tokens (access + refresh)
   - Auto-login after registration

### Database Changes:
- ✅ Modified `OTP` table:
  - Made `user_id` nullable (for registration before user exists)
  - Added `contact` field (stores email or phone)
  - Added index on `contact` for fast lookups
  - Added `registration` purpose type

### Files Modified:
- `astegni-backend/app.py modules/routes.py` - Added endpoints (lines 2381-2609)
- `astegni-backend/app.py modules/models.py` - Updated OTP model (lines 81-91)
- `astegni-backend/migrate_add_otp_contact_field.py` - Migration script (NEW)

## ⏳ FRONTEND TODO

### Step 1: Update Registration Form Handler

**File:** `js/index/profile-and-authentication.js`

**Current Flow:**
```javascript
handleRegister() → stores data → showOTPConfirmation() → sendOTP() → creates account immediately
```

**New Flow:**
```javascript
handleRegister() → stores data → calls /api/send-registration-otp → shows OTP modal
User enters OTP → calls /api/verify-registration-otp → account created + auto-login
```

### Step 2: Create New OTP Modal

**Add to `index.html` after line 1000:**

```html
<!-- Registration OTP Verification Modal -->
<div id="register-otp-modal" class="modal hidden">
    <div class="modal-content enhanced">
        <button class="modal-close-enhanced" onclick="closeModal('register-otp-modal')">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>

        <h2 class="modal-title">Verify Your Contact</h2>
        <p class="modal-subtitle">
            We've sent a 6-digit code to <strong id="otp-destination-display"></strong>
        </p>

        <form id="register-otp-form" class="auth-form">
            <div class="form-group">
                <input type="text" id="register-otp-input" placeholder=" " maxlength="6" pattern="[0-9]{6}" required autocomplete="one-time-code">
                <label>Enter 6-Digit Code</label>
            </div>

            <p class="text-sm text-muted">
                Code expires in: <span id="otp-timer" class="font-bold">5:00</span>
            </p>

            <button type="submit" class="submit-btn">
                <span class="btn-text">Verify & Create Account</span>
                <span class="btn-loader hidden">
                    <svg class="spinner" viewBox="0 0 50 50">
                        <circle cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
                    </svg>
                </span>
            </button>
        </form>

        <p class="auth-footer">
            Didn't receive the code?
            <a href="#" onclick="resendRegistrationOTP()">Resend OTP</a>
        </p>
    </div>
</div>
```

### Step 3: Update JavaScript Functions

**File:** `js/index/profile-and-authentication.js`

Replace current `handleRegister` and related functions with:

```javascript
// Step 1: User fills form and submits
async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    // Validate password match
    const password = document.getElementById("register-password")?.value;
    const confirmPassword = document.getElementById("register-confirm-password")?.value;

    if (password !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
    }

    // Check password strength
    const strength = calculatePasswordStrength(password);
    if (strength < 40) {
        showToast('Please choose a stronger password', 'warning');
        return;
    }

    // Get contact info
    const phone = document.getElementById("register-phone")?.value;
    const email = formData.get("register-email");
    const countryCode = document.getElementById("country-code")?.value;

    if ((!phone || phone.trim() === '') && (!email || email.trim() === '')) {
        showToast('Please provide either a phone number or email address!', 'error');
        return;
    }

    // Store registration data globally
    window.pendingRegistration = {
        first_name: formData.get("register-firstname"),
        father_name: formData.get("register-fathername"),
        grandfather_name: formData.get("register-grandfathername"),
        email: email || '',
        phone: phone ? countryCode + phone : '',
        password: password,
        role: document.getElementById("register-as")?.value,
    };

    // Send OTP
    try {
        const response = await fetch('http://localhost:8000/api/send-registration-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: window.pendingRegistration.email,
                phone: window.pendingRegistration.phone
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Failed to send OTP');
        }

        // Show OTP in console for development
        if (data.otp) {
            console.log(`[DEV] Your OTP is: ${data.otp}`);
        }

        // Update destination display
        document.getElementById('otp-destination-display').textContent = data.destination_value;

        // Close register modal and show OTP modal
        closeModal('register-modal');
        setTimeout(() => {
            openModal('register-otp-modal');
            startOTPTimer(300); // 5 minutes
        }, 300);

        showToast(data.message, 'success');

    } catch (error) {
        showToast(error.message || 'Failed to send OTP', 'error');
    }
}

// Step 2: User submits OTP
document.getElementById('register-otp-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const otpCode = document.getElementById('register-otp-input').value;
    const submitButton = e.target.querySelector('button[type="submit"]');
    const btnText = submitButton.querySelector('.btn-text');
    const btnLoader = submitButton.querySelector('.btn-loader');

    // Show loading state
    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';
    submitButton.disabled = true;

    try {
        const response = await fetch('http://localhost:8000/api/verify-registration-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                otp_code: otpCode,
                ...window.pendingRegistration
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Invalid OTP');
        }

        // Save tokens
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('userRole', data.user.active_role);

        // Update global state
        APP_STATE.isLoggedIn = true;
        APP_STATE.currentUser = data.user;
        APP_STATE.userRole = data.user.active_role;

        // Update UI
        updateUIForLoggedInUser();
        updateProfileLink(data.user.active_role);

        closeModal('register-otp-modal');
        showToast('Registration successful! Welcome to Astegni!', 'success');

        // Clear pending data
        delete window.pendingRegistration;

    } catch (error) {
        showToast(error.message || 'Invalid or expired OTP', 'error');
    } finally {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        submitButton.disabled = false;
    }
});

// Resend OTP
window.resendRegistrationOTP = async function() {
    if (!window.pendingRegistration) {
        showToast('Registration data not found', 'error');
        return;
    }

    try {
        const response = await fetch('http://localhost:8000/api/send-registration-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: window.pendingRegistration.email,
                phone: window.pendingRegistration.phone
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Failed to resend OTP');
        }

        if (data.otp) {
            console.log(`[DEV] Your new OTP is: ${data.otp}`);
        }

        startOTPTimer(300);
        showToast('New OTP sent successfully!', 'success');

    } catch (error) {
        showToast(error.message || 'Failed to resend OTP', 'error');
    }
};

// Timer function
function startOTPTimer(seconds) {
    const timerElement = document.getElementById('otp-timer');
    let remaining = seconds;

    const interval = setInterval(() => {
        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        timerElement.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;

        if (remaining <= 0) {
            clearInterval(interval);
            timerElement.textContent = 'Expired';
        }

        remaining--;
    }, 1000);
}
```

## 🎯 NEXT STEPS

1. Add the OTP modal HTML to `index.html`
2. Replace the `handleRegister` function in `js/index/profile-and-authentication.js`
3. Add the OTP form submit handler
4. Add the resend OTP function
5. Test the complete flow

## 📊 BENEFITS OF NEW FLOW

1. **Security**: OTP verifies user owns the email/phone before account creation
2. **No Spam Accounts**: Prevents fake registrations
3. **Better UX**: Clear two-step process with visual feedback
4. **Auto-login**: User is logged in immediately after successful verification
5. **Development Mode**: OTP shown in console for easy testing

## 🧪 TESTING

1. Fill registration form
2. Submit → Backend sends OTP
3. Check console for OTP (development mode)
4. Enter OTP in modal
5. Submit → Account created + auto-login
6. Verify tokens saved in localStorage
7. Verify UI updates (profile dropdown shown)
