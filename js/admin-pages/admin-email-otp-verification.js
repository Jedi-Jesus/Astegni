/**
 * Admin Email OTP Verification
 * Handles two-step email change verification with OTP
 */

(function() {
    'use strict';

    const API_BASE_URL = 'https://api.astegni.com';

    let currentEmail = '';
    let newEmail = '';
    let currentEmailTimer = null;
    let newEmailTimer = null;
    let currentEmailVerified = false;
    let newEmailVerified = false;

    /**
     * Open Change Email Modal
     */
    window.openChangeEmailModal = function() {
        // Get current email from the edit profile form
        const emailInput = document.getElementById('emailInput');
        if (!emailInput || !emailInput.value) {
            alert('Could not determine current email');
            return;
        }

        currentEmail = emailInput.value;
        currentEmailVerified = false;
        newEmailVerified = false;

        // Reset modal to step 1
        resetOTPModal();

        // Populate current email
        document.getElementById('currentEmailDisplay').value = currentEmail;

        // Show modal
        const modal = document.getElementById('otp-email-verification-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };

    /**
     * Close OTP Email Modal
     */
    window.closeOTPEmailModal = function() {
        const modal = document.getElementById('otp-email-verification-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        // Clear timers
        if (currentEmailTimer) clearInterval(currentEmailTimer);
        if (newEmailTimer) clearInterval(newEmailTimer);

        // Reset state
        resetOTPModal();
    };

    /**
     * Reset OTP Modal to initial state
     */
    function resetOTPModal() {
        // Show step 1, hide others
        document.getElementById('otp-step-1').style.display = 'block';
        document.getElementById('otp-step-2').style.display = 'none';
        document.getElementById('otp-success').style.display = 'none';

        // Reset step 1
        document.getElementById('currentEmailOTPSection').style.display = 'none';
        document.getElementById('currentEmailOTP').value = '';
        document.getElementById('sendCurrentEmailOTPBtn').style.display = 'block';
        document.getElementById('verifyCurrentEmailOTPBtn').style.display = 'none';
        document.getElementById('currentEmailStatus').innerHTML = '';

        // Reset step 2
        document.getElementById('newEmailInput').value = '';
        document.getElementById('newEmailOTPSection').style.display = 'none';
        document.getElementById('newEmailOTP').value = '';
        document.getElementById('sendNewEmailOTPBtn').style.display = 'block';
        document.getElementById('verifyNewEmailOTPBtn').style.display = 'none';
        document.getElementById('newEmailStatus').innerHTML = '';

        // Clear timers
        if (currentEmailTimer) clearInterval(currentEmailTimer);
        if (newEmailTimer) clearInterval(newEmailTimer);

        currentEmailVerified = false;
        newEmailVerified = false;
    }

    /**
     * Send OTP to Current Email (Step 1)
     */
    window.sendCurrentEmailOTP = async function() {
        const btn = document.getElementById('sendCurrentEmailOTPBtn');
        const statusDiv = document.getElementById('currentEmailStatus');

        btn.disabled = true;
        btn.textContent = 'Sending...';
        statusDiv.innerHTML = '';

        try {
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');

            const response = await fetch(`${API_BASE_URL}/api/admin/send-otp-current-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_email: currentEmail
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to send OTP');
            }

            // Show OTP input section
            document.getElementById('currentEmailOTPSection').style.display = 'block';
            btn.style.display = 'none';
            document.getElementById('verifyCurrentEmailOTPBtn').style.display = 'block';

            // Start timer
            startTimer('currentEmailTimer', 300); // 5 minutes

            showStatus(statusDiv, 'success', `✓ OTP sent to ${currentEmail}`);

        } catch (error) {
            console.error('Error sending current email OTP:', error);
            showStatus(statusDiv, 'error', `✗ ${error.message}`);
            btn.disabled = false;
            btn.textContent = 'Retry';
        }
    };

    /**
     * Verify Current Email OTP (Step 1)
     */
    window.verifyCurrentEmailOTP = async function() {
        const otpInput = document.getElementById('currentEmailOTP');
        const btn = document.getElementById('verifyCurrentEmailOTPBtn');
        const statusDiv = document.getElementById('currentEmailStatus');
        const otpCode = otpInput.value.trim();

        if (otpCode.length !== 6) {
            showStatus(statusDiv, 'error', '✗ Please enter a 6-digit OTP');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Verifying...';
        statusDiv.innerHTML = '';

        try {
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');

            const response = await fetch(`${API_BASE_URL}/api/admin/verify-otp-current-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_email: currentEmail,
                    otp_code: otpCode
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Invalid OTP');
            }

            // Clear timer
            if (currentEmailTimer) clearInterval(currentEmailTimer);

            currentEmailVerified = true;
            showStatus(statusDiv, 'success', '✓ Current email verified successfully!');

            // Move to step 2 after a short delay
            setTimeout(() => {
                document.getElementById('otp-step-1').style.display = 'none';
                document.getElementById('otp-step-2').style.display = 'block';
            }, 1500);

        } catch (error) {
            console.error('Error verifying current email OTP:', error);
            showStatus(statusDiv, 'error', `✗ ${error.message}`);
            btn.disabled = false;
            btn.textContent = 'Verify OTP';
        }
    };

    /**
     * Send OTP to New Email (Step 2)
     */
    window.sendNewEmailOTP = async function() {
        const newEmailInput = document.getElementById('newEmailInput');
        const btn = document.getElementById('sendNewEmailOTPBtn');
        const statusDiv = document.getElementById('newEmailStatus');

        newEmail = newEmailInput.value.trim();

        // Validate email
        if (!newEmail || !isValidEmail(newEmail)) {
            showStatus(statusDiv, 'error', '✗ Please enter a valid email address');
            return;
        }

        if (newEmail === currentEmail) {
            showStatus(statusDiv, 'error', '✗ New email must be different from current email');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Sending...';
        statusDiv.innerHTML = '';

        try {
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');

            const response = await fetch(`${API_BASE_URL}/api/admin/send-otp-email-change`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    new_email: newEmail
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to send OTP');
            }

            // Show OTP input section
            document.getElementById('newEmailOTPSection').style.display = 'block';
            btn.style.display = 'none';
            document.getElementById('verifyNewEmailOTPBtn').style.display = 'block';

            // Disable email input
            newEmailInput.readOnly = true;
            newEmailInput.classList.add('bg-gray-100', 'cursor-not-allowed');

            // Start timer
            startTimer('newEmailTimer', 300); // 5 minutes

            showStatus(statusDiv, 'success', `✓ OTP sent to ${newEmail}`);

        } catch (error) {
            console.error('Error sending new email OTP:', error);
            showStatus(statusDiv, 'error', `✗ ${error.message}`);
            btn.disabled = false;
            btn.textContent = 'Retry';
        }
    };

    /**
     * Verify New Email OTP and Update Email (Step 2)
     */
    window.verifyNewEmailOTP = async function() {
        const otpInput = document.getElementById('newEmailOTP');
        const btn = document.getElementById('verifyNewEmailOTPBtn');
        const statusDiv = document.getElementById('newEmailStatus');
        const otpCode = otpInput.value.trim();

        if (otpCode.length !== 6) {
            showStatus(statusDiv, 'error', '✗ Please enter a 6-digit OTP');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Verifying & Updating...';
        statusDiv.innerHTML = '';

        try {
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');

            // Step 1: Verify OTP
            const verifyResponse = await fetch(`${API_BASE_URL}/api/admin/verify-otp-email-change`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    new_email: newEmail,
                    otp_code: otpCode
                })
            });

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
                throw new Error(verifyData.detail || 'Invalid OTP');
            }

            // Step 2: Update email in database
            // Get admin ID from current profile
            const adminEmail = getAdminEmailFromAuth();
            const profileResponse = await fetch(`${API_BASE_URL}/api/admin/manage-courses-profile/by-email/${encodeURIComponent(adminEmail)}`);
            const profile = await profileResponse.json();

            const updateResponse = await fetch(`${API_BASE_URL}/api/admin/profile/${profile.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: newEmail
                })
            });

            if (!updateResponse.ok) {
                throw new Error('Failed to update email in database');
            }

            // Clear timer
            if (newEmailTimer) clearInterval(newEmailTimer);

            newEmailVerified = true;

            // Show success message
            document.getElementById('otp-step-2').style.display = 'none';
            document.getElementById('otp-success').style.display = 'block';

            // Update email in edit profile modal
            document.getElementById('emailInput').value = newEmail;

            // Update email in localStorage if present
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    user.email = newEmail;
                    localStorage.setItem('currentUser', JSON.stringify(user));
                } catch (e) {
                    console.error('Error updating stored user:', e);
                }
            }

            // Refresh profile header
            if (window.DashboardLoader && window.DashboardLoader.loadProfile) {
                setTimeout(() => {
                    window.DashboardLoader.loadProfile();
                }, 2000);
            }

        } catch (error) {
            console.error('Error verifying new email OTP:', error);
            showStatus(statusDiv, 'error', `✗ ${error.message}`);
            btn.disabled = false;
            btn.textContent = 'Verify & Update Email';
        }
    };

    /**
     * Start countdown timer
     */
    function startTimer(timerElementId, seconds) {
        const timerEl = document.getElementById(timerElementId);
        let timeLeft = seconds;

        const timer = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const secs = timeLeft % 60;
            timerEl.textContent = `OTP expires in ${minutes}:${secs.toString().padStart(2, '0')}`;

            timeLeft--;

            if (timeLeft < 0) {
                clearInterval(timer);
                timerEl.textContent = 'OTP expired! Please request a new one.';
                timerEl.classList.add('text-red-500');
            }
        }, 1000);

        // Store timer reference
        if (timerElementId === 'currentEmailTimer') {
            currentEmailTimer = timer;
        } else {
            newEmailTimer = timer;
        }

        return timer;
    }

    /**
     * Show status message
     */
    function showStatus(element, type, message) {
        const colorClass = type === 'success' ? 'text-green-600' :
                          type === 'error' ? 'text-red-600' :
                          'text-blue-600';

        element.innerHTML = `<p class="${colorClass} text-sm font-semibold">${message}</p>`;
    }

    /**
     * Validate email format
     */
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * Get admin email from authentication
     */
    function getAdminEmailFromAuth() {
        // Try authManager
        if (typeof authManager !== 'undefined' && authManager && authManager.getCurrentUser) {
            const user = authManager.getCurrentUser();
            if (user && user.email) {
                return user.email;
            }
        }

        // Try localStorage
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.email) {
                    return user.email;
                }
            } catch (e) {
                console.error('Error parsing stored user:', e);
            }
        }

        // Fallback to current email being changed from
        return currentEmail;
    }

    console.log('✅ Admin Email OTP Verification module initialized');

})();
