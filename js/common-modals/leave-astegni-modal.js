/**
 * Open Leave Astegni Modal
 */
// ===== SUBSCRIPTION MANAGEMENT FUNCTIONS =====

let currentSubscription = null; // Track current subscription
let currentUnsubscribePlan = null; // Track plan being unsubscribed

/**
 * Open Switch Subscription Modal
 */
function openSwitchSubscriptionModal() {
    const modal = document.getElementById('switchSubscriptionModal');
    const optionsContainer = document.getElementById('switchSubscriptionOptions');

    if (!modal || !optionsContainer) {
        console.error('❌ Switch Subscription Modal or container not found!');
        return;
    }

    // Populate with all available plans
    const plans = [
        { name: 'Starter', price: 500, storage: 64 },
        { name: 'Basic', price: 750, storage: 100 },
        { name: 'Professional', price: 1875, storage: 250 },
        { name: 'Advanced', price: 3750, storage: 500 },
        { name: 'Enterprise', price: 7500, storage: 1000 }
    ];

    optionsContainer.innerHTML = plans.map(plan => `
        <div class="subscription-card ${currentSubscription === plan.name.toLowerCase() ? 'opacity-50' : ''}">
            <h3 class="subscription-title">${plan.name}</h3>
            <div class="subscription-price">
                <div class="price">${plan.price.toLocaleString()} ETB/month</div>
            </div>
            <ul class="subscription-features">
                <li><i class="fas fa-check"></i> ${plan.storage} GB Storage</li>
                <li><i class="fas fa-check"></i> Boosted Visibility</li>
            </ul>
            <div class="subscription-actions">
                <button class="subscribe-btn ${currentSubscription === plan.name.toLowerCase() ? 'opacity-50 cursor-not-allowed' : ''}"
                        onclick="switchToPlan('${plan.name.toLowerCase()}', ${plan.price}, ${plan.storage})"
                        ${currentSubscription === plan.name.toLowerCase() ? 'disabled' : ''}>
                    ${currentSubscription === plan.name.toLowerCase() ? 'Current Plan' : 'Switch to This'}
                </button>
            </div>
        </div>
    `).join('');

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function closeSwitchSubscriptionModal() {
    const modal = document.getElementById('switchSubscriptionModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function switchToPlan(plan, price, storage) {
    currentSubscription = plan;

    // Update button states
    document.querySelectorAll('.subscribe-btn').forEach(btn => {
        const btnPlan = btn.getAttribute('data-plan');
        if (btnPlan === plan) {
            btn.style.display = 'none';
            btn.classList.add('hidden');

            const switchBtn = btn.parentElement.querySelector('.switch-plan-btn');
            const unsubBtn = btn.parentElement.querySelector('.unsubscribe-btn');

            if (switchBtn) {
                switchBtn.classList.remove('hidden');
                switchBtn.style.display = 'block';
            }
            if (unsubBtn) {
                unsubBtn.classList.remove('hidden');
                unsubBtn.style.display = 'block';
            }
        } else {
            btn.style.display = 'block';
            btn.classList.remove('hidden');

            const switchBtn = btn.parentElement.querySelector('.switch-plan-btn');
            const unsubBtn = btn.parentElement.querySelector('.unsubscribe-btn');

            if (switchBtn) {
                switchBtn.classList.add('hidden');
                switchBtn.style.display = 'none';
            }
            if (unsubBtn) {
                unsubBtn.classList.add('hidden');
                unsubBtn.style.display = 'none';
            }
        }
    });

    // Update the current subscription card
    updateCurrentSubscriptionCard();

    closeSwitchSubscriptionModal();
    alert(`✅ Successfully switched to ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan!`);
}

/**
 * Start Unsubscribe Flow
 */
function startUnsubscribeFlow(plan) {
    currentUnsubscribePlan = plan;
    const modal = document.getElementById('unsubscribeModal1');
    if (modal) {
        // Clear previous selections
        document.querySelectorAll('input[name="unsubscribeReason"]').forEach(cb => cb.checked = false);
        document.getElementById('otherTextUnsubscribe').value = '';
        document.getElementById('otherTextUnsubscribe').style.display = 'none';

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

// Handle "Other" checkbox for unsubscribe
document.addEventListener('DOMContentLoaded', function () {
    const otherCheckbox = document.getElementById('unsubscribeOtherCheckbox');
    if (otherCheckbox) {
        otherCheckbox.addEventListener('change', function () {
            document.getElementById('otherTextUnsubscribe').style.display =
                this.checked ? 'block' : 'none';
        });
    }
});

function closeUnsubscribeModal1() {
    const modal = document.getElementById('unsubscribeModal1');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function submitUnsubscribeReasons() {
    const reasons = Array.from(document.querySelectorAll('input[name="unsubscribeReason"]:checked'))
        .map(cb => cb.value);
    const otherText = document.getElementById('otherTextUnsubscribe').value;

    if (reasons.length === 0) {
        alert('⚠️ Please select at least one reason.');
        return;
    }

    if (reasons.includes('other') && !otherText) {
        alert('⚠️ Please specify the reason for "Other".');
        return;
    }

    console.log('📝 Unsubscribe reasons:', reasons, otherText);
    closeUnsubscribeModal1();

    const modal = document.getElementById('unsubscribeConfirm1');
    if (modal) {
        document.getElementById('unsubscribeFirstConfirmText').textContent =
            `This decision will deactivate your ${currentUnsubscribePlan} subscription.`;
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

function closeUnsubscribeConfirm1() {
    const modal = document.getElementById('unsubscribeConfirm1');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function proceedToUnsubscribeFeeWarning() {
    closeUnsubscribeConfirm1();
    const modal = document.getElementById('unsubscribeConfirm2');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

function closeUnsubscribeConfirm2() {
    const modal = document.getElementById('unsubscribeConfirm2');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function proceedToUnsubscribePassword() {
    closeUnsubscribeConfirm2();
    const modal = document.getElementById('unsubscribePasswordModal');
    if (modal) {
        document.getElementById('unsubscribePassword').value = '';
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

function closeUnsubscribePasswordModal() {
    const modal = document.getElementById('unsubscribePasswordModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function finalConfirmUnsubscribe() {
    const password = document.getElementById('unsubscribePassword').value;

    if (!password) {
        alert('⚠️ Please enter your password.');
        return;
    }

    // TODO: Verify password with backend
    // For now, simulate success

    closeUnsubscribePasswordModal();

    // Update UI to show unsubscribed state
    document.querySelectorAll('.subscribe-btn').forEach(btn => {
        const btnPlan = btn.getAttribute('data-plan');
        if (btnPlan === currentUnsubscribePlan) {
            btn.style.display = 'block';
            btn.classList.remove('hidden');

            const switchBtn = btn.parentElement.querySelector('.switch-plan-btn');
            const unsubBtn = btn.parentElement.querySelector('.unsubscribe-btn');

            if (switchBtn) {
                switchBtn.classList.add('hidden');
                switchBtn.style.display = 'none';
            }
            if (unsubBtn) {
                unsubBtn.classList.add('hidden');
                unsubBtn.style.display = 'none';
            }
        }
    });

    currentSubscription = null;

    // Hide the current subscription card
    updateCurrentSubscriptionCard();

    const modal = document.getElementById('unsubscribeFinalModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

function closeUnsubscribeFinalModal() {
    const modal = document.getElementById('unsubscribeFinalModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

// ===== LEAVE ASTEGNI / DELETE ACCOUNT FUNCTIONS =====

let currentDeletePanel = 1; // Track current panel

/**
 * Open Leave Astegni Modal and reset to panel 1
 */
function openLeaveAstegniModal() {
    console.log('🔵 Opening Leave Astegni Modal...');
    const modal = document.getElementById('leave-astegni-modal');
    if (!modal) {
        console.error('❌ Leave Astegni Modal not found!');
        return;
    }

    // Reset to panel 1
    currentDeletePanel = 1;
    goToDeletePanel(1);

    // Clear previous inputs
    const deleteConfirmationInput = document.getElementById('deleteConfirmation');
    if (deleteConfirmationInput) {
        deleteConfirmationInput.value = '';
    }

    // Clear checkboxes and textarea in panel 2
    document.querySelectorAll('input[name="deleteReason"]').forEach(cb => cb.checked = false);
    const otherTextDelete = document.getElementById('otherTextDelete');
    if (otherTextDelete) {
        otherTextDelete.value = '';
        otherTextDelete.style.display = 'none';
    }

    // Setup "Other" checkbox listener using event delegation on parent
    // This ensures it works even if modal content is loaded dynamically
    setTimeout(() => {
        const deleteOtherCheckbox = document.getElementById('deleteOtherCheckbox');
        const otherTextDelete = document.getElementById('otherTextDelete');
        console.log('🔍 Looking for deleteOtherCheckbox:', deleteOtherCheckbox);
        console.log('🔍 Looking for otherTextDelete:', otherTextDelete);

        if (deleteOtherCheckbox && otherTextDelete) {
            // Force initial state
            otherTextDelete.style.display = deleteOtherCheckbox.checked ? 'block' : 'none';
            console.log('✅ Elements found and initial state set');
        } else {
            console.error('❌ Elements not found:', {
                checkbox: !!deleteOtherCheckbox,
                textarea: !!otherTextDelete
            });
        }
    }, 100); // Small delay to ensure modal content is loaded

    modal.classList.remove('hidden');
    modal.classList.add('active');
    modal.style.display = 'flex';
    console.log('✅ Leave Astegni Modal opened');
}

/**
 * Handle "Other" checkbox change
 */
function handleOtherCheckboxChange() {
    const otherTextDelete = document.getElementById('otherTextDelete');
    if (otherTextDelete) {
        otherTextDelete.style.display = this.checked ? 'block' : 'none';
        console.log('📝 Other textarea visibility:', this.checked ? 'visible' : 'hidden');
    }
}

/**
 * Toggle Other textarea (called from HTML onchange)
 */
function toggleOtherTextarea(checkbox) {
    const otherTextDelete = document.getElementById('otherTextDelete');
    console.log('🔄 toggleOtherTextarea called, checkbox checked:', checkbox.checked);
    console.log('🔍 otherTextDelete element:', otherTextDelete);
    if (otherTextDelete) {
        if (checkbox.checked) {
            // SHOW: Remove hidden class and explicitly set display to block
            otherTextDelete.classList.remove('hidden');
            otherTextDelete.style.display = 'block';
            console.log('✅ Removed hidden class and set display to block');
        } else {
            // HIDE: Add hidden class and set display to none
            otherTextDelete.classList.add('hidden');
            otherTextDelete.style.display = 'none';
            console.log('✅ Added hidden class and set display to none');
        }

        // Log the computed style and classes to verify
        const computedStyle = window.getComputedStyle(otherTextDelete);
        console.log('📊 Computed display value:', computedStyle.display);
        console.log('📋 Classes:', otherTextDelete.className);

        // Scroll textarea into view when it appears
        if (checkbox.checked) {
            setTimeout(() => {
                otherTextDelete.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                otherTextDelete.focus();
                console.log('📍 Scrolled textarea into view and focused');
            }, 150);
        }
    } else {
        console.error('❌ otherTextDelete textarea not found!');
    }
}

function closeLeaveAstegniModal() {
    const modal = document.getElementById('leave-astegni-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('active');
        modal.style.display = 'none';
        // Reset to panel 1
        currentDeletePanel = 1;
        goToDeletePanel(1);
    }
}

/**
 * Navigate to a specific panel with sliding animation
 */
function goToDeletePanel(panelNumber) {
    const panelsContainer = document.getElementById('leave-astegni-panels');
    if (!panelsContainer) {
        console.error('❌ Panels container not found!');
        return;
    }

    // Validate DELETE confirmation before moving from panel 1 to panel 2
    if (currentDeletePanel === 1 && panelNumber === 2) {
        const confirmationInput = document.getElementById('deleteConfirmation');
        if (confirmationInput && confirmationInput.value !== 'DELETE') {
            alert('⚠️ Please type "DELETE" to confirm account deletion');
            return;
        }
    }

    // When navigating to panel 4, fetch and mask the email immediately
    if (panelNumber === 4) {
        fetchAndMaskUserEmail();
    }

    currentDeletePanel = panelNumber;
    const offset = (panelNumber - 1) * 100;
    panelsContainer.style.transform = `translateX(-${offset}%)`;
    console.log(`📍 Navigated to panel ${panelNumber}`);
}

/**
 * Panel 2: Submit reasons and proceed to panel 3
 */
function submitDeleteReasons() {
    const reasons = Array.from(document.querySelectorAll('input[name="deleteReason"]:checked'))
        .map(cb => cb.value);
    const otherTextDelete = document.getElementById('otherTextDelete');
    const otherText = otherTextDelete ? otherTextDelete.value : '';

    if (reasons.length === 0) {
        alert('⚠️ Please select at least one reason.');
        return;
    }

    if (reasons.includes('other') && !otherText) {
        alert('⚠️ Please specify the reason for "Other".');
        return;
    }

    console.log('📝 Delete reasons:', reasons, otherText);
    goToDeletePanel(3); // Move to 90-day warning panel
}

/**
 * Panel 3: Check subscriptions before proceeding to panel 4
 */
async function proceedToSubscriptionCheck() {
    // Check if user has active subscriptions
    if (currentSubscription) {
        alert('⚠️ Please cancel all active subscriptions before proceeding with account deletion.\n\nGo to Settings → Subscription to manage your active subscriptions.');
        return;
    }

    // Just move to panel 4 (OTP will be sent from there)
    goToDeletePanel(4);
}

/**
 * Fetch user email from API and mask it in Panel 4
 */
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

/**
 * Mask email address for privacy
 * Example: jediael.s.abebe@gmail.com => j***@g******.com
 */
function maskEmail(email) {
    if (!email || !email.includes('@')) return email;

    const [localPart, domain] = email.split('@');
    const [domainName, ext] = domain.split('.');

    // Mask local part (show first char + ***)
    const maskedLocal = localPart.charAt(0) + '***';

    // Mask domain name (show first char + *** + extension length)
    const maskedDomain = domainName.charAt(0) + '*'.repeat(domainName.length - 1);

    return `${maskedLocal}@${maskedDomain}.${ext}`;
}

/**
 * Send OTP for account deletion
 */
async function sendDeleteOtp() {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (!token) {
        alert('⚠️ You must be logged in to delete your account.');
        window.location.href = '../index.html';
        return;
    }

    // Get send button and show loading state
    const sendBtn = document.getElementById('sendOtpBtn');
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending...';
        sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }

    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${API_BASE_URL}/api/account/delete/send-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log('✅ OTP sent successfully:', data);

            // Email is already masked when entering Panel 4, no need to update it here

            // Clear OTP and password inputs
            const otpInput = document.getElementById('deleteOtpCode');
            const passwordInput = document.getElementById('deletePassword');
            if (otpInput) otpInput.value = '';
            if (passwordInput) passwordInput.value = '';

            // Start OTP timer
            startOtpTimer(300); // 5 minutes

            // Show resend section
            const resendSection = document.getElementById('resendOtpSection');
            if (resendSection) {
                resendSection.classList.remove('hidden');
            }

            // Update button to "Sent" state
            if (sendBtn) {
                sendBtn.textContent = 'Sent';

                // Re-enable after 60 seconds
                setTimeout(() => {
                    sendBtn.disabled = false;
                    sendBtn.textContent = 'Send OTP';
                    sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                }, 60000);
            }

            // Show success message
            alert('✅ Verification code sent to your email. Please check your inbox.');
        } else {
            // Restore button on error
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send OTP';
                sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
            alert(`❌ ${data.detail || 'Failed to send OTP. Please try again.'}`);
        }
    } catch (error) {
        console.error('❌ Error sending OTP:', error);
        // Restore button on error
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send OTP';
            sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        alert('❌ Network error. Please check your connection and try again.');
    }
}

/**
 * Resend OTP for account deletion
 */
async function resendDeleteOtp() {
    await sendDeleteOtp();
}

/**
 * Start OTP countdown timer
 */
let otpTimerInterval = null;
function startOtpTimer(seconds) {
    // Clear existing timer
    if (otpTimerInterval) {
        clearInterval(otpTimerInterval);
    }

    const timerElement = document.getElementById('otpTimer');
    if (!timerElement) return;

    let remainingSeconds = seconds;

    otpTimerInterval = setInterval(() => {
        const minutes = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        timerElement.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;

        if (remainingSeconds <= 0) {
            clearInterval(otpTimerInterval);
            timerElement.textContent = 'Expired';
        }

        remainingSeconds--;
    }, 1000);
}

/**
 * Panel 4: Final confirmation with OTP + password - calls real API
 *
 * COMPLETE ACCOUNT DELETION:
 * - Deletes entire user account from users table
 * - Requires OTP verification + password confirmation
 */
async function finalConfirmDeleteAccount() {
    // Validate OTP
    const otpCode = document.getElementById('deleteOtpCode').value;
    if (!otpCode || otpCode.length !== 6) {
        alert('⚠️ Please enter the 6-digit OTP code.');
        return;
    }

    // Validate password
    const password = document.getElementById('deletePassword').value;
    if (!password) {
        alert('⚠️ Please enter your password.');
        return;
    }

    // Get the reasons from Panel 2
    const reasons = Array.from(document.querySelectorAll('input[name="deleteReason"]:checked'))
        .map(cb => cb.value);
    const otherTextDelete = document.getElementById('otherTextDelete');
    const otherReason = otherTextDelete ? otherTextDelete.value : null;

    // Get token from localStorage
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (!token) {
        alert('⚠️ You must be logged in to delete your account.');
        window.location.href = '../index.html';
        return;
    }

    console.log('🔄 Deleting entire account with OTP verification');

    // Show loading state
    const confirmBtn = document.querySelector('[onclick="finalConfirmDeleteAccount()"]');
    const originalText = confirmBtn ? confirmBtn.innerHTML : '';
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processing...';
    }

    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${API_BASE_URL}/api/account/delete/initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                otp_code: otpCode,
                password: password,
                reasons: reasons,
                other_reason: otherReason
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log('✅ Account deletion scheduled successfully:', data);

            // Clear OTP timer
            if (otpTimerInterval) {
                clearInterval(otpTimerInterval);
            }

            // Move to farewell panel
            goToDeletePanel(5);
        } else {
            // Handle specific errors
            if (response.status === 401) {
                alert('❌ Incorrect password or OTP. Please try again.');
            } else if (response.status === 400) {
                alert(`⚠️ ${data.detail || 'Invalid request. Please try again.'}`);
            } else {
                alert(`❌ ${data.detail || 'Failed to initiate account deletion. Please try again.'}`);
            }

            // Restore button
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = originalText;
            }
        }
    } catch (error) {
        console.error('❌ Error initiating account deletion:', error);
        alert('❌ Network error. Please check your connection and try again.');

        // Restore button
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalText;
        }
    }
}

/**
 * Panel 5: Close modal, logout and redirect to home
 */
function closeDeleteFinalModal() {
    console.log('🔓 Logging out and redirecting to home page...');
    localStorage.clear();
    window.location.href = '../index.html';
}

/**
 * Update Current Subscription Card visibility and details
 */
function updateCurrentSubscriptionCard() {
    const card = document.getElementById('current-subscription-card');
    if (!card) return;

    if (currentSubscription) {
        // Show the card
        card.classList.remove('hidden');

        // Update details
        const planData = {
            'starter': { name: 'Starter Plan', price: '500 ETB/month', storage: '64 GB Storage' },
            'basic': { name: 'Basic Plan', price: '750 ETB/month', storage: '100 GB Storage' },
            'professional': { name: 'Professional Plan', price: '1,875 ETB/month', storage: '250 GB Storage' },
            'advanced': { name: 'Advanced Plan', price: '3,750 ETB/month', storage: '500 GB Storage' },
            'enterprise': { name: 'Enterprise Plan', price: '7,500 ETB/month', storage: '1 TB Storage' }
        };

        const plan = planData[currentSubscription];
        if (plan) {
            document.getElementById('current-plan-name').textContent = plan.name;
            document.getElementById('current-plan-price').textContent = plan.price;
            document.getElementById('current-plan-storage').textContent = plan.storage;
        }
    } else {
        // Hide the card
        card.classList.add('hidden');
    }
}

// Make functions globally available
window.openSwitchSubscriptionModal = openSwitchSubscriptionModal;
window.closeSwitchSubscriptionModal = closeSwitchSubscriptionModal;
window.switchToPlan = switchToPlan;
window.updateCurrentSubscriptionCard = updateCurrentSubscriptionCard;
window.startUnsubscribeFlow = startUnsubscribeFlow;
window.closeUnsubscribeModal1 = closeUnsubscribeModal1;
window.submitUnsubscribeReasons = submitUnsubscribeReasons;
window.closeUnsubscribeConfirm1 = closeUnsubscribeConfirm1;
window.proceedToUnsubscribeFeeWarning = proceedToUnsubscribeFeeWarning;
window.closeUnsubscribeConfirm2 = closeUnsubscribeConfirm2;
window.proceedToUnsubscribePassword = proceedToUnsubscribePassword;
window.closeUnsubscribePasswordModal = closeUnsubscribePasswordModal;
window.finalConfirmUnsubscribe = finalConfirmUnsubscribe;
window.closeUnsubscribeFinalModal = closeUnsubscribeFinalModal;
window.openLeaveAstegniModal = openLeaveAstegniModal;
window.closeLeaveAstegniModal = closeLeaveAstegniModal;
window.goToDeletePanel = goToDeletePanel;
window.submitDeleteReasons = submitDeleteReasons;
window.proceedToSubscriptionCheck = proceedToSubscriptionCheck;
window.sendDeleteOtp = sendDeleteOtp;
window.resendDeleteOtp = resendDeleteOtp;
window.finalConfirmDeleteAccount = finalConfirmDeleteAccount;
window.closeDeleteFinalModal = closeDeleteFinalModal;
window.toggleOtherTextarea = toggleOtherTextarea;

console.log('✅ Subscription & Leave Astegni: JavaScript loaded');