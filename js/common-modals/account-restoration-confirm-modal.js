/**
 * Account Restoration Confirmation Modal with OTP
 * Two-panel system: Confirmation → OTP Verification
 * Shows BEFORE login when user has pending account deletion
 */

// Store pending login credentials and deletion info
let pendingLoginData = {
    email: null,
    password: null,
    deletionInfo: null
};

// OTP timer
let otpTimerInterval = null;
let otpExpiryTime = null;

/**
 * Show restoration confirmation modal (Panel 1)
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {object} deletionInfo - Deletion details from backend
 */
function showRestorationConfirmModal(email, password, deletionInfo) {
    console.log('[RestorationConfirm] Showing confirmation modal');
    console.log('[RestorationConfirm] Deletion info:', deletionInfo);

    // Store credentials for later use
    pendingLoginData.email = email;
    pendingLoginData.password = password;
    pendingLoginData.deletionInfo = deletionInfo;

    const modal = document.getElementById('account-restoration-confirm-modal');
    if (!modal) {
        console.error('[RestorationConfirm] Modal element not found');
        return;
    }

    // Reset to panel 1
    goToPanel(1);

    // Update days remaining
    const daysRemainingEl = document.getElementById('restore-confirm-days-remaining');
    if (daysRemainingEl && deletionInfo.days_remaining !== undefined) {
        daysRemainingEl.textContent = `${deletionInfo.days_remaining} days`;
    }

    // Update deletion date
    const deletionDateEl = document.getElementById('restore-confirm-deletion-date');
    if (deletionDateEl && deletionInfo.scheduled_deletion_at) {
        const deletionDate = new Date(deletionInfo.scheduled_deletion_at);
        deletionDateEl.textContent = deletionDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Update masked email
    const emailEl = document.getElementById('restore-confirm-email');
    if (emailEl && deletionInfo.email) {
        emailEl.textContent = maskEmail(deletionInfo.email);
    }

    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('active');
    modal.style.display = 'flex';
    console.log('[RestorationConfirm] Modal shown');
}

/**
 * Navigate between panels
 * @param {number} panelNumber - 1 or 2
 */
function goToPanel(panelNumber) {
    const container = document.getElementById('restoration-panels-container');
    if (!container) return;

    const offset = (panelNumber - 1) * 50; // 0% or 50%
    container.style.transform = `translateX(-${offset}%)`;

    console.log(`[RestorationConfirm] Navigated to panel ${panelNumber}`);
}

/**
 * Go back to panel 1
 */
function goBackToPanel1() {
    goToPanel(1);
    // Clear OTP input
    const otpInput = document.getElementById('restoration-otp-input');
    if (otpInput) otpInput.value = '';

    // Hide error message
    const errorMsg = document.getElementById('otp-error-message');
    if (errorMsg) {
        errorMsg.classList.add('hidden');
        errorMsg.textContent = '';
    }

    // Stop timer
    if (otpTimerInterval) {
        clearInterval(otpTimerInterval);
        otpTimerInterval = null;
    }
}

/**
 * Send OTP for account restoration
 */
async function sendRestorationOTP() {
    console.log('[RestorationConfirm] Sending OTP');

    const btn = document.getElementById('send-otp-btn');
    if (!btn) return;

    // Disable button and show loading state
    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `
        <svg class="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Sending...
    `;

    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

        const response = await fetch(`${API_BASE_URL}/api/account/restore/send-otp?email=${encodeURIComponent(pendingLoginData.email)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log('[RestorationConfirm] OTP sent successfully');

            // Update masked email in panel 2
            const otpEmailEl = document.getElementById('otp-sent-email');
            if (otpEmailEl) {
                otpEmailEl.textContent = maskEmail(pendingLoginData.email);
            }

            // Start OTP timer (5 minutes)
            startOTPTimer(5 * 60);

            // Move to panel 2
            goToPanel(2);

            // Focus on OTP input
            setTimeout(() => {
                const otpInput = document.getElementById('restoration-otp-input');
                if (otpInput) otpInput.focus();
            }, 400);

        } else {
            throw new Error(data.message || 'Failed to send OTP');
        }

    } catch (error) {
        console.error('[RestorationConfirm] Error sending OTP:', error);

        // Re-enable button
        btn.disabled = false;
        btn.innerHTML = originalHTML;

        if (window.showToast) {
            showToast('Failed to send OTP. Please try again.', 'error');
        } else {
            alert('Failed to send OTP. Please try again.');
        }
    }
}

/**
 * Resend OTP
 */
async function resendRestorationOTP() {
    console.log('[RestorationConfirm] Resending OTP');

    const btn = document.getElementById('resend-otp-btn');
    if (!btn) return;

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Sending...';

    try {
        await sendRestorationOTP();

        if (window.showToast) {
            showToast('OTP resent successfully!', 'success');
        }
    } catch (error) {
        console.error('[RestorationConfirm] Error resending OTP:', error);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

/**
 * Start OTP countdown timer
 * @param {number} seconds - Total seconds
 */
function startOTPTimer(seconds) {
    // Clear any existing timer
    if (otpTimerInterval) {
        clearInterval(otpTimerInterval);
    }

    otpExpiryTime = Date.now() + (seconds * 1000);

    const timerEl = document.getElementById('otp-timer');
    if (!timerEl) return;

    // Update immediately
    updateTimerDisplay();

    // Update every second
    otpTimerInterval = setInterval(() => {
        updateTimerDisplay();

        // Check if expired
        const remaining = Math.floor((otpExpiryTime - Date.now()) / 1000);
        if (remaining <= 0) {
            clearInterval(otpTimerInterval);
            timerEl.textContent = '0:00';
            timerEl.classList.add('text-red-600');
        }
    }, 1000);
}

/**
 * Update timer display
 */
function updateTimerDisplay() {
    const timerEl = document.getElementById('otp-timer');
    if (!timerEl) return;

    const remaining = Math.floor((otpExpiryTime - Date.now()) / 1000);

    if (remaining <= 0) {
        timerEl.textContent = '0:00';
        return;
    }

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Verify OTP and restore account
 */
async function verifyOTPAndRestore() {
    console.log('[RestorationConfirm] Verifying OTP and restoring account');

    const otpInput = document.getElementById('restoration-otp-input');
    const otpCode = otpInput?.value?.trim();

    if (!otpCode || otpCode.length !== 6) {
        showOTPError('Please enter a valid 6-digit code');
        return;
    }

    const btn = document.getElementById('verify-otp-btn');
    if (!btn) return;

    // Disable button and show loading state
    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `
        <svg class="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Verifying...
    `;

    try {
        // Login with restore_account=true and otp_code
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

        const formData = new URLSearchParams();
        formData.append('username', pendingLoginData.email);
        formData.append('password', pendingLoginData.password);

        const response = await fetch(`${API_BASE_URL}/api/login?restore_account=true&otp_code=${encodeURIComponent(otpCode)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();

            console.log('[RestorationConfirm] Account restored and logged in successfully');

            // Stop timer
            if (otpTimerInterval) {
                clearInterval(otpTimerInterval);
                otpTimerInterval = null;
            }

            // Store auth tokens
            if (window.AuthManager) {
                window.AuthManager.token = data.access_token;
                window.AuthManager.user = data.user;
            }

            localStorage.setItem('token', data.access_token);
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));

            if (data.user.active_role) {
                localStorage.setItem('userRole', data.user.active_role);
            }

            // Update APP_STATE if available
            if (window.APP_STATE) {
                window.APP_STATE.isLoggedIn = true;
                window.APP_STATE.currentUser = data.user;
                window.APP_STATE.userRole = data.user.active_role;
            }

            // Close modal
            closeRestorationConfirmModal();

            // Close login modal if it exists
            if (window.closeModal) {
                closeModal('login-modal');
            }

            // Show success message
            if (window.showToast) {
                showToast('Welcome back! Your account has been restored and you are now logged in.', 'success');
            }

            // Update UI - Must happen before redirect
            if (window.updateUIForLoggedInUser) {
                console.log('[RestorationConfirm] Updating UI for logged in user');
                updateUIForLoggedInUser();
            }

            if (window.updateProfileLink) {
                console.log('[RestorationConfirm] Updating profile link');
                updateProfileLink(data.user.active_role);
            }

            // Force reload APP_STATE check in navigation
            if (window.checkAuthState) {
                window.checkAuthState();
            }

            console.log('[RestorationConfirm] Login complete - redirecting to profile');

            // Redirect to profile page after UI updates
            setTimeout(() => {
                const profileUrl = window.PROFILE_URLS?.[data.user.active_role];
                if (profileUrl) {
                    console.log('[RestorationConfirm] Redirecting to:', profileUrl);
                    window.location.href = profileUrl;
                } else {
                    console.log('[RestorationConfirm] No profile URL found, reloading page');
                    window.location.reload();
                }
            }, 1500);

        } else {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to verify OTP');
        }

    } catch (error) {
        console.error('[RestorationConfirm] Error:', error);

        // Re-enable button
        btn.disabled = false;
        btn.innerHTML = originalHTML;

        // Show error message
        let errorMsg = 'Failed to verify OTP. Please try again.';
        if (error.message.includes('Invalid OTP')) {
            errorMsg = 'Invalid OTP code. Please check and try again.';
        } else if (error.message.includes('expired')) {
            errorMsg = 'OTP has expired. Please request a new one.';
        }

        showOTPError(errorMsg);
    }
}

/**
 * Show OTP error message
 * @param {string} message - Error message
 */
function showOTPError(message) {
    const errorEl = document.getElementById('otp-error-message');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }

    // Shake the OTP input
    const otpInput = document.getElementById('restoration-otp-input');
    if (otpInput) {
        otpInput.classList.add('border-red-500');
        otpInput.style.animation = 'shake 0.5s';

        setTimeout(() => {
            otpInput.style.animation = '';
        }, 500);
    }
}

/**
 * Close the restoration confirmation modal
 */
function closeRestorationConfirmModal() {
    const modal = document.getElementById('account-restoration-confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('active');
        modal.style.display = 'none';
    }

    // Clear pending data
    pendingLoginData = {
        email: null,
        password: null,
        deletionInfo: null
    };

    // Stop timer
    if (otpTimerInterval) {
        clearInterval(otpTimerInterval);
        otpTimerInterval = null;
    }

    // Reset to panel 1
    goToPanel(1);

    console.log('[RestorationConfirm] Modal closed');
}

/**
 * Cancel restoration and close modal
 */
function cancelRestorationAndCloseModal() {
    console.log('[RestorationConfirm] User cancelled restoration');
    closeRestorationConfirmModal();

    // Show message
    if (window.showToast) {
        showToast('Login cancelled. Your account deletion remains scheduled.', 'info');
    } else {
        alert('Login cancelled. Your account deletion remains scheduled.');
    }
}

/**
 * Mask email for privacy
 * @param {string} email
 * @returns {string} Masked email
 */
function maskEmail(email) {
    if (!email || !email.includes('@')) return email;

    const [localPart, domain] = email.split('@');
    const [domainName, ext] = domain.split('.');

    // Mask local part (show first char + ***)
    const maskedLocal = localPart.charAt(0) + '***';

    // Mask domain name (show first char + ***)
    const maskedDomain = domainName.charAt(0) + '*'.repeat(domainName.length - 1);

    return `${maskedLocal}@${maskedDomain}.${ext}`;
}

// Auto-submit OTP when 6 digits are entered
document.addEventListener('DOMContentLoaded', () => {
    const otpInput = document.getElementById('restoration-otp-input');
    if (otpInput) {
        otpInput.addEventListener('input', (e) => {
            // Only allow numbers
            e.target.value = e.target.value.replace(/[^0-9]/g, '');

            // Hide error when typing
            const errorEl = document.getElementById('otp-error-message');
            if (errorEl) {
                errorEl.classList.add('hidden');
            }

            const otpInputEl = document.getElementById('restoration-otp-input');
            if (otpInputEl) {
                otpInputEl.classList.remove('border-red-500');
            }
        });
    }
});

// Make functions globally available
window.showRestorationConfirmModal = showRestorationConfirmModal;
window.closeRestorationConfirmModal = closeRestorationConfirmModal;
window.cancelRestorationAndCloseModal = cancelRestorationAndCloseModal;
window.sendRestorationOTP = sendRestorationOTP;
window.resendRestorationOTP = resendRestorationOTP;
window.verifyOTPAndRestore = verifyOTPAndRestore;
window.goBackToPanel1 = goBackToPanel1;

console.log('✅ Account Restoration Confirmation Modal: JavaScript loaded (with OTP)');
