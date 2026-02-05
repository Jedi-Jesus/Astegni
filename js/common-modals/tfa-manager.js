// =============================================
// TFA MANAGER - Two-Factor Authentication Manager
// Handles In-App, Email, and Authenticator App 2FA
// =============================================

const TFAManager = {
    // State
    state: {
        currentMethod: null,        // 'inapp', 'email', 'authenticator', null
        isEnabled: false,
        userEmail: null,
        totpSecret: null,
        backupCodes: [],
        resendTimer: null,
        resendCountdown: 0,
        currentPageRole: null       // Detected from URL (tutor, student, parent, advertiser)
    },

    // API Base URL
    API_BASE_URL: (window.API_BASE_URL || 'http://localhost:8000').replace(/\/api\/?$/, ''),

    // Initialize
    init() {
        this.setupOTPInputListeners();
        this.detectCurrentRole();
        console.log('TFA Manager initialized for role:', this.state.currentPageRole);
    },

    // Detect which profile page we're on
    detectCurrentRole() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('tutor-profile')) {
            this.state.currentPageRole = 'tutor';
        } else if (path.includes('student-profile')) {
            this.state.currentPageRole = 'student';
        } else if (path.includes('parent-profile')) {
            this.state.currentPageRole = 'parent';
        } else if (path.includes('advertiser-profile')) {
            this.state.currentPageRole = 'advertiser';
        } else {
            this.state.currentPageRole = null; // Will use token role
        }
    },

    // ==================== MODAL CONTROLS ====================

    // Open the 2FA modal
    async open() {
        let modal = document.getElementById('two-factor-auth-modal');

        // If modal not in DOM yet, try to load it first
        if (!modal) {
            console.log('[TFAManager] Modal not found in DOM, attempting to load...');
            try {
                // Try ModalLoader first (used by profile pages)
                if (typeof ModalLoader !== 'undefined' && ModalLoader.load) {
                    await ModalLoader.load('two-factor-auth-modal.html');
                }
                // Try window.modalLoader as alternative
                else if (typeof window.modalLoader !== 'undefined' && window.modalLoader.loadModal) {
                    await window.modalLoader.loadModal('two-factor-auth-modal.html');
                }
                // Fallback: Direct fetch
                else {
                    await this.loadModalDirectly();
                }

                // Get modal after loading
                modal = document.getElementById('two-factor-auth-modal');
            } catch (error) {
                console.error('[TFAManager] Failed to load modal:', error);
            }
        }

        if (modal) {
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
            this.loadStatus();
        } else {
            console.error('[TFAManager] Could not load two-factor-auth-modal');
        }
    },

    // Fallback method to load modal directly via fetch
    async loadModalDirectly() {
        const paths = [
            '../modals/common-modals/two-factor-auth-modal.html',
            'modals/common-modals/two-factor-auth-modal.html',
            '../../modals/common-modals/two-factor-auth-modal.html'
        ];

        for (const path of paths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    const html = await response.text();
                    const container = document.createElement('div');
                    container.innerHTML = html;
                    // Append ALL children (modal div AND style tag)
                    while (container.firstChild) {
                        document.body.appendChild(container.firstChild);
                    }
                    console.log(`[TFAManager] Loaded modal from: ${path}`);
                    return;
                }
            } catch (e) {
                // Try next path
            }
        }
        throw new Error('Could not load modal from any path');
    },

    // Close the 2FA modal
    close() {
        const modal = document.getElementById('two-factor-auth-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        }
        this.closeMethodPanel();
        this.resetAllPanels();
    },

    // ==================== STATUS LOADING ====================

    // Load 2FA status from API
    async loadStatus() {
        const loading = document.getElementById('tfa-loading');
        const enabledState = document.getElementById('tfa-enabled-state');
        const disabledState = document.getElementById('tfa-disabled-state');

        // Show loading
        if (loading) loading.classList.remove('hidden');
        if (enabledState) enabledState.classList.add('hidden');
        if (disabledState) disabledState.classList.add('hidden');

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                throw new Error('Not authenticated');
            }

            // Build URL with optional role parameter
            let statusUrl = `${this.API_BASE_URL}/api/2fa/status`;
            if (this.state.currentPageRole) {
                statusUrl += `?role=${this.state.currentPageRole}`;
            }

            const response = await fetch(statusUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.state.isEnabled = data.enabled;
                this.state.currentMethod = data.method;
                this.state.userEmail = data.email;

                this.updateStatusUI(data);
            } else {
                // If endpoint doesn't exist yet, show disabled state
                this.showDisabledState();
            }
        } catch (error) {
            console.error('Error loading 2FA status:', error);
            // Show disabled state on error
            this.showDisabledState();
        } finally {
            if (loading) loading.classList.add('hidden');
        }
    },

    // Update UI based on status
    updateStatusUI(data) {
        const enabledState = document.getElementById('tfa-enabled-state');
        const disabledState = document.getElementById('tfa-disabled-state');

        if (data.enabled) {
            if (enabledState) enabledState.classList.remove('hidden');
            if (disabledState) disabledState.classList.add('hidden');

            // Update method display
            this.updateMethodDisplay(data.method, data.email);

            // Load protected panels for enabled state
            this.loadProtectedPanels();
        } else {
            this.showDisabledState();
        }
    },

    // Show disabled state
    showDisabledState() {
        const enabledState = document.getElementById('tfa-enabled-state');
        const disabledState = document.getElementById('tfa-disabled-state');
        const loading = document.getElementById('tfa-loading');

        if (loading) loading.classList.add('hidden');
        if (enabledState) enabledState.classList.add('hidden');
        if (disabledState) disabledState.classList.remove('hidden');

        // Load user email for email verification
        this.loadUserEmail();
    },

    // Load user email
    async loadUserEmail() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) return;

            const response = await fetch(`${this.API_BASE_URL}/api/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const user = await response.json();
                this.state.userEmail = user.email || user.emails?.[0];

                // Update email input
                const emailInput = document.getElementById('tfa-email-address');
                if (emailInput && this.state.userEmail) {
                    emailInput.value = this.state.userEmail;
                }
            }
        } catch (error) {
            console.error('Error loading user email:', error);
        }
    },

    // Update method display in enabled state
    updateMethodDisplay(method, email) {
        const iconContainer = document.getElementById('tfa-method-icon');
        const methodName = document.getElementById('tfa-method-name');
        const methodDetail = document.getElementById('tfa-method-detail');

        const methodConfig = {
            inapp: {
                name: 'In-App Verification',
                detail: 'Password verification on login',
                icon: `<svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>`,
                bgColor: 'bg-amber-100'
            },
            email: {
                name: 'Email Verification',
                detail: `Codes sent to ${this.maskEmail(email)}`,
                icon: `<svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>`,
                bgColor: 'bg-purple-100'
            },
            authenticator: {
                name: 'Authenticator App',
                detail: 'TOTP codes from your app',
                icon: `<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>`,
                bgColor: 'bg-green-100'
            }
        };

        const config = methodConfig[method] || methodConfig.email;

        if (iconContainer) {
            iconContainer.className = `w-10 h-10 ${config.bgColor} rounded-full flex items-center justify-center`;
            iconContainer.innerHTML = config.icon;
        }
        if (methodName) methodName.textContent = config.name;
        if (methodDetail) methodDetail.textContent = config.detail;
    },

    // Mask email for display
    maskEmail(email) {
        if (!email) return '***@***.***';
        const [local, domain] = email.split('@');
        const maskedLocal = local.charAt(0) + '***';
        return `${maskedLocal}@${domain}`;
    },

    // ==================== PANEL NAVIGATION ====================

    // Open a method panel (slides from right)
    openMethodPanel(method) {
        console.log(`[TFAManager] openMethodPanel called with method: ${method}`);

        // Close any open panel first
        this.closeMethodPanel();

        const panel = document.getElementById(`tfa-panel-${method}`);
        console.log(`[TFAManager] Panel element:`, panel);

        if (panel) {
            console.log(`[TFAManager] Panel found, adding active class`);
            setTimeout(() => {
                panel.classList.add('active');
                console.log(`[TFAManager] Active class added, panel classes:`, panel.className);
            }, 50);

            // Initialize the panel based on method
            if (method === 'email') {
                this.initEmailPanel();
            } else if (method === 'authenticator') {
                this.initAuthenticatorPanel();
            } else if (method === 'inapp') {
                this.initInAppPanel();
            } else if (method === 'protected-panels') {
                this.initProtectedPanelsPanel();
            }
        } else {
            console.error(`[TFAManager] Panel not found: tfa-panel-${method}`);
        }
    },

    // Close method panel
    closeMethodPanel() {
        const panels = document.querySelectorAll('.tfa-sliding-panel');
        panels.forEach(panel => panel.classList.remove('active'));
    },

    // Show disable panel
    showDisable() {
        // Show appropriate disable UI based on current 2FA method
        const inappPanel = document.getElementById('tfa-disable-inapp');
        const emailPanel = document.getElementById('tfa-disable-email');
        const authPanel = document.getElementById('tfa-disable-authenticator');

        // Hide all first
        if (inappPanel) inappPanel.classList.add('hidden');
        if (emailPanel) emailPanel.classList.add('hidden');
        if (authPanel) authPanel.classList.add('hidden');

        // Show the correct one
        if (this.state.currentMethod === 'inapp') {
            if (inappPanel) inappPanel.classList.remove('hidden');
        } else if (this.state.currentMethod === 'email') {
            if (emailPanel) emailPanel.classList.remove('hidden');
        } else if (this.state.currentMethod === 'authenticator') {
            if (authPanel) authPanel.classList.remove('hidden');
        }

        this.openMethodPanel('disable');
    },

    // Show change method (just show disabled state options)
    showChangeMethod() {
        // First disable current, then show options
        this.showDisable();
    },

    // Reset all panels to initial state
    resetAllPanels() {
        // Email panel
        document.getElementById('tfa-email-step1')?.classList.remove('hidden');
        document.getElementById('tfa-email-step2')?.classList.add('hidden');
        document.getElementById('tfa-email-step3')?.classList.add('hidden');
        this.clearOTPInputs('tfa-email-otp-inputs');

        // Authenticator panel
        document.getElementById('tfa-auth-step1')?.classList.remove('hidden');
        document.getElementById('tfa-auth-step2')?.classList.add('hidden');
        document.getElementById('tfa-auth-step3')?.classList.add('hidden');
        this.clearOTPInputs('tfa-auth-totp-inputs');

        // Clear timers
        if (this.state.resendTimer) {
            clearInterval(this.state.resendTimer);
            this.state.resendTimer = null;
        }
    },

    // ==================== IN-APP VERIFICATION ====================

    initInAppPanel() {
        // Reset to step 1
        document.getElementById('tfa-inapp-step1')?.classList.remove('hidden');
        document.getElementById('tfa-inapp-step2-login')?.classList.add('hidden');
        document.getElementById('tfa-inapp-step2-different')?.classList.add('hidden');
        document.getElementById('tfa-inapp-step3-success')?.classList.add('hidden');

        // Clear input fields
        const loginPasswordInput = document.getElementById('tfa-inapp-login-password');
        const currentPasswordInput = document.getElementById('tfa-inapp-current-password');
        const newPasswordInput = document.getElementById('tfa-inapp-new-password');
        const confirmPasswordInput = document.getElementById('tfa-inapp-confirm-password');

        if (loginPasswordInput) loginPasswordInput.value = '';
        if (currentPasswordInput) currentPasswordInput.value = '';
        if (newPasswordInput) newPasswordInput.value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';
    },

    // Select In-App password option
    selectInAppOption(option) {
        if (option === 'login') {
            // Show login password verification
            document.getElementById('tfa-inapp-step1')?.classList.add('hidden');
            document.getElementById('tfa-inapp-step2-login')?.classList.remove('hidden');
        } else if (option === 'different') {
            // Show different password setup
            document.getElementById('tfa-inapp-step1')?.classList.add('hidden');
            document.getElementById('tfa-inapp-step2-different')?.classList.remove('hidden');
        }
    },

    // Back to In-App options
    backToInAppOptions() {
        document.getElementById('tfa-inapp-step1')?.classList.remove('hidden');
        document.getElementById('tfa-inapp-step2-login')?.classList.add('hidden');
        document.getElementById('tfa-inapp-step2-different')?.classList.add('hidden');

        // Clear inputs
        document.getElementById('tfa-inapp-login-password').value = '';
        document.getElementById('tfa-inapp-new-password').value = '';
        document.getElementById('tfa-inapp-confirm-password').value = '';
    },

    // Setup In-App with login password
    async setupInAppLogin() {
        const passwordInput = document.getElementById('tfa-inapp-login-password');
        const password = passwordInput?.value;
        const btn = document.getElementById('tfa-inapp-login-btn');

        if (!password) {
            this.showToast('Please enter your login password', 'error');
            passwordInput?.focus();
            return;
        }

        // Show loading
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Verifying...';
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');

            const response = await fetch(`${this.API_BASE_URL}/api/2fa/inapp/setup`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    use_login_password: true,
                    password: password
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.state.isEnabled = true;
                this.state.currentMethod = 'inapp';
                this.state.backupCodes = data.backup_codes || [];

                // Show success step with backup codes
                this.showInAppSuccess(data.backup_codes);

                // Update the badge on the profile page
                this.updatePageBadge(true);

                this.showToast('In-App Verification enabled!', 'success');
            } else {
                const error = await response.json();
                this.showToast(error.detail || 'Invalid password', 'error');
            }
        } catch (error) {
            console.error('Error setting up In-App 2FA:', error);
            this.showToast('Setup failed. Please try again.', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Enable Verification';
            }
        }
    },

    // Setup In-App with different password
    async setupInAppDifferent() {
        const currentPasswordInput = document.getElementById('tfa-inapp-current-password');
        const newPasswordInput = document.getElementById('tfa-inapp-new-password');
        const confirmPasswordInput = document.getElementById('tfa-inapp-confirm-password');
        const currentPassword = currentPasswordInput?.value;
        const newPassword = newPasswordInput?.value;
        const confirmPassword = confirmPasswordInput?.value;
        const btn = document.getElementById('tfa-inapp-different-btn');

        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        if (newPassword.length < 8) {
            this.showToast('2FA password must be at least 8 characters', 'error');
            newPasswordInput?.focus();
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showToast('2FA passwords do not match', 'error');
            confirmPasswordInput?.focus();
            return;
        }

        // Security check: New 2FA password should be different from login password
        if (newPassword === currentPassword) {
            this.showToast('2FA password must be different from your login password', 'error');
            newPasswordInput?.focus();
            return;
        }

        // Show loading
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Verifying...';
        }

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');

            const response = await fetch(`${this.API_BASE_URL}/api/2fa/inapp/setup`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    use_login_password: false,
                    current_password: currentPassword,  // Add current password verification
                    password: newPassword
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.state.isEnabled = true;
                this.state.currentMethod = 'inapp';
                this.state.backupCodes = data.backup_codes || [];

                // Show success step with backup codes
                this.showInAppSuccess(data.backup_codes);

                // Update the badge on the profile page
                this.updatePageBadge(true);

                this.showToast('In-App Verification enabled!', 'success');
            } else {
                const error = await response.json();
                this.showToast(error.detail || 'Setup failed', 'error');
            }
        } catch (error) {
            console.error('Error setting up In-App 2FA:', error);
            this.showToast('Setup failed. Please try again.', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Enable Verification';
            }
        }
    },

    // Show In-App success with backup codes
    showInAppSuccess(backupCodes) {
        // Hide step 2 screens
        document.getElementById('tfa-inapp-step2-login')?.classList.add('hidden');
        document.getElementById('tfa-inapp-step2-different')?.classList.add('hidden');

        // Show success screen
        const successStep = document.getElementById('tfa-inapp-step3-success');
        successStep?.classList.remove('hidden');

        // Display backup codes
        const codesContainer = document.getElementById('tfa-inapp-backup-codes');
        if (codesContainer && backupCodes) {
            codesContainer.innerHTML = backupCodes.map(code =>
                `<div class="p-2 bg-white border border-gray-200 rounded text-center">${code}</div>`
            ).join('');
        }
    },

    // ==================== EMAIL VERIFICATION ====================

    initEmailPanel() {
        // Load user email
        const emailInput = document.getElementById('tfa-email-address');
        if (emailInput && this.state.userEmail) {
            emailInput.value = this.state.userEmail;
        }

        // Reset to step 1
        document.getElementById('tfa-email-step1')?.classList.remove('hidden');
        document.getElementById('tfa-email-step2')?.classList.add('hidden');
        document.getElementById('tfa-email-step3')?.classList.add('hidden');
    },

    // Send email OTP
    async sendEmailOTP() {
        const btn = document.getElementById('tfa-email-send-btn');
        const btnText = document.getElementById('tfa-email-send-btn-text');

        if (!this.state.userEmail) {
            this.showToast('No email address found', 'error');
            return;
        }

        // Show loading
        if (btn) btn.disabled = true;
        if (btnText) btnText.textContent = 'Sending...';

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');

            const response = await fetch(`${this.API_BASE_URL}/api/2fa/email/send-otp`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: this.state.userEmail })
            });

            if (response.ok) {
                // Show step 2
                document.getElementById('tfa-email-step1')?.classList.add('hidden');
                document.getElementById('tfa-email-step2')?.classList.remove('hidden');

                // Update email display
                const emailDisplay = document.getElementById('tfa-email-display');
                if (emailDisplay) emailDisplay.textContent = this.state.userEmail;

                // Start resend timer
                this.startResendTimer('email');

                // Focus first OTP input
                setTimeout(() => {
                    const firstInput = document.querySelector('#tfa-email-otp-inputs .tfa-otp-input');
                    if (firstInput) firstInput.focus();
                }, 100);

                this.showToast('Verification code sent!', 'success');
            } else {
                const error = await response.json();
                this.showToast(error.detail || 'Failed to send code', 'error');
            }
        } catch (error) {
            console.error('Error sending email OTP:', error);
            this.showToast('Failed to send code. Please try again.', 'error');
        } finally {
            if (btn) btn.disabled = false;
            if (btnText) btnText.textContent = 'Send Verification Code';
        }
    },

    // Resend email OTP
    async resendEmailOTP() {
        if (this.state.resendCountdown > 0) return;
        await this.sendEmailOTP();
    },

    // Go back to step 1
    emailBackToStep1() {
        document.getElementById('tfa-email-step1')?.classList.remove('hidden');
        document.getElementById('tfa-email-step2')?.classList.add('hidden');
        this.clearOTPInputs('tfa-email-otp-inputs');
    },

    // Verify email OTP
    async verifyEmailOTP() {
        const otp = this.getOTPValue('tfa-email-otp-inputs');
        const btn = document.getElementById('tfa-email-verify-btn');
        const btnText = document.getElementById('tfa-email-verify-btn-text');
        const errorEl = document.getElementById('tfa-email-otp-error');

        if (otp.length !== 6) {
            if (errorEl) {
                errorEl.textContent = 'Please enter the 6-digit code';
                errorEl.classList.remove('hidden');
            }
            this.shakeOTPInputs('tfa-email-otp-inputs');
            return;
        }

        // Show loading
        if (btn) btn.disabled = true;
        if (btnText) btnText.textContent = 'Verifying...';
        if (errorEl) errorEl.classList.add('hidden');

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');

            const response = await fetch(`${this.API_BASE_URL}/api/2fa/email/verify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: this.state.userEmail,
                    otp: otp
                })
            });

            if (response.ok) {
                this.state.isEnabled = true;
                this.state.currentMethod = 'email';

                // Mark inputs as success
                this.markOTPSuccess('tfa-email-otp-inputs');

                // Update the badge on the profile page
                this.updatePageBadge(true);

                // Show step 3
                setTimeout(() => {
                    document.getElementById('tfa-email-step2')?.classList.add('hidden');
                    document.getElementById('tfa-email-step3')?.classList.remove('hidden');

                    // Update success email display
                    const successEmail = document.getElementById('tfa-email-success-display');
                    if (successEmail) successEmail.textContent = this.state.userEmail;
                }, 500);

                this.showToast('Email 2FA enabled!', 'success');
            } else {
                const error = await response.json();
                if (errorEl) {
                    errorEl.textContent = error.detail || 'Invalid code. Please try again.';
                    errorEl.classList.remove('hidden');
                }
                this.shakeOTPInputs('tfa-email-otp-inputs');
            }
        } catch (error) {
            console.error('Error verifying email OTP:', error);
            if (errorEl) {
                errorEl.textContent = 'Verification failed. Please try again.';
                errorEl.classList.remove('hidden');
            }
        } finally {
            if (btn) btn.disabled = false;
            if (btnText) btnText.textContent = 'Verify & Enable';
        }
    },

    // ==================== AUTHENTICATOR APP ====================

    initAuthenticatorPanel() {
        // Reset to step 1
        document.getElementById('tfa-auth-step1')?.classList.remove('hidden');
        document.getElementById('tfa-auth-step2')?.classList.add('hidden');
        document.getElementById('tfa-auth-step3')?.classList.add('hidden');

        // Generate TOTP secret and QR code
        this.generateTOTPSecret();
    },

    // Generate TOTP secret
    async generateTOTPSecret() {
        const qrLoading = document.getElementById('tfa-auth-qr-loading');
        const qrCode = document.getElementById('tfa-auth-qr-code');
        const secretEl = document.getElementById('tfa-auth-secret');

        if (qrLoading) qrLoading.classList.remove('hidden');
        if (qrCode) qrCode.classList.add('hidden');

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');

            const response = await fetch(`${this.API_BASE_URL}/api/2fa/authenticator/setup`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.state.totpSecret = data.secret;

                // Display secret
                if (secretEl) {
                    // Format secret with dashes every 4 chars
                    const formatted = data.secret.match(/.{1,4}/g)?.join('-') || data.secret;
                    secretEl.textContent = formatted;
                }

                // Generate QR code
                if (qrCode && data.qr_uri) {
                    this.renderQRCode(data.qr_uri);
                }
            } else {
                // Fallback: generate client-side
                this.generateClientSideTOTP();
            }
        } catch (error) {
            console.error('Error generating TOTP:', error);
            this.generateClientSideTOTP();
        } finally {
            if (qrLoading) qrLoading.classList.add('hidden');
        }
    },

    // Generate client-side TOTP (fallback)
    generateClientSideTOTP() {
        // Generate random secret (Base32)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let secret = '';
        for (let i = 0; i < 16; i++) {
            secret += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        this.state.totpSecret = secret;

        const secretEl = document.getElementById('tfa-auth-secret');
        if (secretEl) {
            const formatted = secret.match(/.{1,4}/g)?.join('-') || secret;
            secretEl.textContent = formatted;
        }

        // Generate QR URI
        const issuer = 'Astegni';
        const account = this.state.userEmail || 'user';
        const uri = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

        this.renderQRCode(uri);
    },

    // Render QR code using simple text-based display (or external lib)
    renderQRCode(uri) {
        const qrCode = document.getElementById('tfa-auth-qr-code');
        const qrLoading = document.getElementById('tfa-auth-qr-loading');

        if (qrLoading) qrLoading.classList.add('hidden');

        if (qrCode) {
            qrCode.classList.remove('hidden');

            // Check if QRCode library is available
            if (typeof QRCode !== 'undefined') {
                qrCode.innerHTML = '';
                new QRCode(qrCode, {
                    text: uri,
                    width: 180,
                    height: 180,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
            } else {
                // Fallback: show the URI as text
                qrCode.innerHTML = `
                    <div class="text-center p-4">
                        <div class="w-40 h-40 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2 border-2 border-dashed border-gray-300">
                            <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                            </svg>
                        </div>
                        <p class="text-xs text-gray-500">Use the manual code above</p>
                    </div>
                `;
            }
        }
    },

    // Copy secret to clipboard
    async copySecret() {
        const secret = this.state.totpSecret;
        if (!secret) return;

        try {
            await navigator.clipboard.writeText(secret);
            this.showToast('Secret copied!', 'success');
        } catch (error) {
            // Fallback
            const secretEl = document.getElementById('tfa-auth-secret');
            if (secretEl) {
                const range = document.createRange();
                range.selectNode(secretEl);
                window.getSelection()?.removeAllRanges();
                window.getSelection()?.addRange(range);
                document.execCommand('copy');
                window.getSelection()?.removeAllRanges();
                this.showToast('Secret copied!', 'success');
            }
        }
    },

    // Go to step 2 (verify TOTP)
    authGoToStep2() {
        document.getElementById('tfa-auth-step1')?.classList.add('hidden');
        document.getElementById('tfa-auth-step2')?.classList.remove('hidden');

        // Focus first input
        setTimeout(() => {
            const firstInput = document.querySelector('#tfa-auth-totp-inputs .tfa-otp-input');
            if (firstInput) firstInput.focus();
        }, 100);
    },

    // Go back to step 1
    authBackToStep1() {
        document.getElementById('tfa-auth-step1')?.classList.remove('hidden');
        document.getElementById('tfa-auth-step2')?.classList.add('hidden');
        this.clearOTPInputs('tfa-auth-totp-inputs');
    },

    // Verify TOTP
    async verifyTOTP() {
        const totp = this.getOTPValue('tfa-auth-totp-inputs');
        const btn = document.getElementById('tfa-auth-verify-btn');
        const btnText = document.getElementById('tfa-auth-verify-btn-text');
        const errorEl = document.getElementById('tfa-auth-totp-error');

        if (totp.length !== 6) {
            if (errorEl) {
                errorEl.textContent = 'Please enter the 6-digit code';
                errorEl.classList.remove('hidden');
            }
            this.shakeOTPInputs('tfa-auth-totp-inputs');
            return;
        }

        // Show loading
        if (btn) btn.disabled = true;
        if (btnText) btnText.textContent = 'Verifying...';
        if (errorEl) errorEl.classList.add('hidden');

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');

            const response = await fetch(`${this.API_BASE_URL}/api/2fa/authenticator/verify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    secret: this.state.totpSecret,
                    totp: totp
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.state.isEnabled = true;
                this.state.currentMethod = 'authenticator';
                this.state.backupCodes = data.backup_codes || this.generateBackupCodes();

                // Mark inputs as success
                this.markOTPSuccess('tfa-auth-totp-inputs');

                // Update the badge on the profile page
                this.updatePageBadge(true);

                // Show step 3 with backup codes
                setTimeout(() => {
                    document.getElementById('tfa-auth-step2')?.classList.add('hidden');
                    document.getElementById('tfa-auth-step3')?.classList.remove('hidden');
                    this.displayBackupCodes();
                }, 500);

                this.showToast('Authenticator 2FA enabled!', 'success');
            } else {
                const error = await response.json();
                if (errorEl) {
                    errorEl.textContent = error.detail || 'Invalid code. Please try again.';
                    errorEl.classList.remove('hidden');
                }
                this.shakeOTPInputs('tfa-auth-totp-inputs');
            }
        } catch (error) {
            console.error('Error verifying TOTP:', error);
            if (errorEl) {
                errorEl.textContent = 'Verification failed. Please try again.';
                errorEl.classList.remove('hidden');
            }
        } finally {
            if (btn) btn.disabled = false;
            if (btnText) btnText.textContent = 'Verify & Enable';
        }
    },

    // Generate backup codes (client-side fallback)
    generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < 8; i++) {
            const code = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                         Math.random().toString(36).substring(2, 6).toUpperCase();
            codes.push(code);
        }
        return codes;
    },

    // Display backup codes
    displayBackupCodes() {
        const container = document.getElementById('tfa-auth-backup-codes');
        if (!container) return;

        container.innerHTML = this.state.backupCodes.map(code => `
            <div class="bg-white px-3 py-2 rounded-lg border border-gray-200 text-center">${code}</div>
        `).join('');
    },

    // Download backup codes
    downloadBackupCodes() {
        const content = `Astegni 2FA Backup Codes
Generated: ${new Date().toLocaleString()}

Keep these codes safe. Each code can only be used once.

${this.state.backupCodes.join('\n')}

If you lose access to your authenticator app, use one of these codes to log in.
`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'astegni-backup-codes.txt';
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('Backup codes downloaded!', 'success');
    },

    // Copy backup codes
    async copyBackupCodes() {
        const text = this.state.backupCodes.join('\n');
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Backup codes copied!', 'success');
        } catch (error) {
            this.showToast('Failed to copy', 'error');
        }
    },

    // ==================== DISABLE 2FA ====================

    // Send OTP for disabling Email 2FA
    async sendDisableOTP() {
        const btn = document.getElementById('tfa-send-disable-otp-btn');
        const btnText = document.getElementById('tfa-send-disable-otp-text');
        const errorEl = document.getElementById('tfa-disable-error');
        const otpContainer = document.getElementById('tfa-disable-otp-input-container');

        if (btn) btn.disabled = true;
        if (btnText) btnText.textContent = 'Sending...';
        if (errorEl) errorEl.classList.add('hidden');

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');

            const response = await fetch(`${this.API_BASE_URL}/api/2fa/disable/send-otp`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.showToast(`OTP sent to ${data.email}`, 'success');

                // Show OTP input container
                if (otpContainer) otpContainer.classList.remove('hidden');
                if (btn) btn.classList.add('hidden');

                // Start countdown timer
                this.startOTPTimer('tfa-disable-otp-timer', 300);

                // Focus first OTP input
                const firstInput = otpContainer.querySelector('.tfa-otp-input');
                if (firstInput) firstInput.focus();
            } else {
                const error = await response.json();
                if (errorEl) {
                    errorEl.textContent = error.detail || 'Failed to send OTP';
                    errorEl.classList.remove('hidden');
                }
            }
        } catch (error) {
            console.error('Error sending disable OTP:', error);
            if (errorEl) {
                errorEl.textContent = 'Failed to send OTP. Please try again.';
                errorEl.classList.remove('hidden');
            }
        } finally {
            if (btn) btn.disabled = false;
            if (btnText) btnText.textContent = 'Send Verification Code';
        }
    },

    // Confirm disable 2FA
    async confirmDisable() {
        const btn = document.getElementById('tfa-disable-btn');
        const btnText = document.getElementById('tfa-disable-btn-text');
        const errorEl = document.getElementById('tfa-disable-error');
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');

        let requestBody = {};

        // Build request based on current method
        if (this.state.currentMethod === 'inapp') {
            const password = document.getElementById('tfa-disable-password')?.value;
            if (!password) {
                if (errorEl) {
                    errorEl.textContent = 'Please enter your password';
                    errorEl.classList.remove('hidden');
                }
                return;
            }
            requestBody = { password };

        } else if (this.state.currentMethod === 'email') {
            const otp = this.getOTPFromInputs('.tfa-otp-input');
            if (!otp || otp.length !== 6) {
                if (errorEl) {
                    errorEl.textContent = 'Please enter the 6-digit OTP code';
                    errorEl.classList.remove('hidden');
                }
                return;
            }
            requestBody = { otp };

        } else if (this.state.currentMethod === 'authenticator') {
            const code = this.getOTPFromInputs('.tfa-auth-code-input');
            if (!code || code.length !== 6) {
                if (errorEl) {
                    errorEl.textContent = 'Please enter the 6-digit authenticator code';
                    errorEl.classList.remove('hidden');
                }
                return;
            }
            requestBody = { code };
        }

        // Show loading
        if (btn) btn.disabled = true;
        if (btnText) btnText.textContent = 'Disabling...';
        if (errorEl) errorEl.classList.add('hidden');

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/2fa/disable`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (response.ok) {
                this.state.isEnabled = false;
                this.state.currentMethod = null;

                // Update the badge on the profile page
                this.updatePageBadge(false);

                this.showToast('2FA has been disabled', 'success');

                // Close panel and refresh
                this.closeMethodPanel();

                // Clear inputs
                const passwordInput = document.getElementById('tfa-disable-password');
                if (passwordInput) passwordInput.value = '';
                this.clearOTPInputs('.tfa-otp-input');
                this.clearOTPInputs('.tfa-auth-code-input');

                setTimeout(() => {
                    this.loadStatus();
                }, 300);
            } else {
                const error = await response.json();
                if (errorEl) {
                    errorEl.textContent = error.detail || 'Verification failed';
                    errorEl.classList.remove('hidden');
                }
            }
        } catch (error) {
            console.error('Error disabling 2FA:', error);
            if (errorEl) {
                errorEl.textContent = 'Failed to disable. Please try again.';
                errorEl.classList.remove('hidden');
            }
        } finally {
            if (btn) btn.disabled = false;
            if (btnText) btnText.textContent = 'Disable 2FA';
        }
    },

    // Disable specific method
    async disableMethod(method) {
        if (confirm(`Are you sure you want to disable ${method === 'inapp' ? 'In-App Verification' : method} 2FA?`)) {
            this.showDisable();
        }
    },

    // ==================== UTILITY FUNCTIONS ====================

    // Setup OTP input listeners
    setupOTPInputListeners() {
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('tfa-otp-input')) {
                this.handleOTPInput(e.target);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('tfa-otp-input')) {
                this.handleOTPKeydown(e);
            }
        });

        document.addEventListener('paste', (e) => {
            if (e.target.classList.contains('tfa-otp-input')) {
                this.handleOTPPaste(e);
            }
        });
    },

    // Handle OTP input
    handleOTPInput(input) {
        const value = input.value.replace(/[^0-9]/g, '');
        input.value = value;

        if (value && input.nextElementSibling) {
            // Skip the dash separator
            let next = input.nextElementSibling;
            if (next.tagName === 'SPAN') next = next.nextElementSibling;
            if (next) next.focus();
        }
    },

    // Handle OTP keydown
    handleOTPKeydown(e) {
        if (e.key === 'Backspace' && !e.target.value) {
            let prev = e.target.previousElementSibling;
            if (prev?.tagName === 'SPAN') prev = prev.previousElementSibling;
            if (prev) {
                prev.focus();
                prev.value = '';
            }
        }
    },

    // Handle OTP paste
    handleOTPPaste(e) {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
        const container = e.target.parentElement;
        const inputs = container.querySelectorAll('.tfa-otp-input');

        pastedData.split('').slice(0, 6).forEach((char, i) => {
            if (inputs[i]) inputs[i].value = char;
        });

        // Focus last filled or next empty
        const lastIndex = Math.min(pastedData.length, 6) - 1;
        if (inputs[lastIndex]) inputs[lastIndex].focus();
    },

    // Get OTP value from inputs
    getOTPValue(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return '';

        const inputs = container.querySelectorAll('.tfa-otp-input');
        return Array.from(inputs).map(i => i.value).join('');
    },

    // Get OTP from inputs using CSS selector
    getOTPFromInputs(selector) {
        const inputs = document.querySelectorAll(selector);
        if (!inputs.length) return '';
        return Array.from(inputs).map(i => i.value).join('');
    },

    // Clear OTP inputs (supports both ID and selector)
    clearOTPInputs(containerIdOrSelector) {
        let inputs;

        // Try as ID first
        const container = document.getElementById(containerIdOrSelector);
        if (container) {
            inputs = container.querySelectorAll('.tfa-otp-input');
        } else {
            // Try as selector
            inputs = document.querySelectorAll(containerIdOrSelector);
        }

        if (inputs.length) {
            inputs.forEach(input => {
                input.value = '';
                input.classList.remove('error', 'success');
            });
        }
    },

    // Start OTP countdown timer
    startOTPTimer(timerElementId, seconds) {
        let remaining = seconds;
        const timerEl = document.getElementById(timerElementId);
        if (!timerEl) return;

        const updateTimer = () => {
            const minutes = Math.floor(remaining / 60);
            const secs = remaining % 60;
            timerEl.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;

            if (remaining > 0) {
                remaining--;
                setTimeout(updateTimer, 1000);
            } else {
                timerEl.textContent = 'Expired';
            }
        };

        updateTimer();
    },

    // Shake OTP inputs (error animation)
    shakeOTPInputs(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const inputs = container.querySelectorAll('.tfa-otp-input');
        inputs.forEach(input => {
            input.classList.add('error');
            setTimeout(() => input.classList.remove('error'), 500);
        });
    },

    // Mark OTP inputs as success
    markOTPSuccess(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const inputs = container.querySelectorAll('.tfa-otp-input');
        inputs.forEach(input => input.classList.add('success'));
    },

    // Start resend timer
    startResendTimer(type) {
        this.state.resendCountdown = 60;
        const resendBtn = document.getElementById(`tfa-${type}-resend-btn`);
        const timerSpan = document.getElementById(`tfa-${type}-resend-timer`);

        if (resendBtn) resendBtn.classList.add('hidden');
        if (timerSpan) {
            timerSpan.classList.remove('hidden');
            timerSpan.textContent = `(${this.state.resendCountdown}s)`;
        }

        this.state.resendTimer = setInterval(() => {
            this.state.resendCountdown--;

            if (timerSpan) {
                timerSpan.textContent = `(${this.state.resendCountdown}s)`;
            }

            if (this.state.resendCountdown <= 0) {
                clearInterval(this.state.resendTimer);
                this.state.resendTimer = null;

                if (resendBtn) resendBtn.classList.remove('hidden');
                if (timerSpan) timerSpan.classList.add('hidden');
            }
        }, 1000);
    },

    // Toggle password visibility
    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.type = input.type === 'password' ? 'text' : 'password';
        }
    },

    // Show toast notification
    showToast(message, type = 'info') {
        // Use existing toast system if available
        if (typeof showToast === 'function') {
            showToast(message, type);
            return;
        }

        // Fallback toast
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white z-50 ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' : 'bg-gray-700'
        }`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Update the 2FA status badge on the profile page
    updatePageBadge(enabled) {
        const badge = document.getElementById('2fa-status-badge');
        if (badge) {
            if (enabled) {
                badge.className = 'mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800';
                badge.textContent = 'Enabled';
            } else {
                badge.className = 'mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800';
                badge.textContent = 'Not Enabled';
            }
        }
    },

    // ==================== PROTECTED PANELS ====================

    // State for protected panels
    protectedPanelsState: {
        panels: [],
        protectedPanels: [],
        panelsByPage: {},       // Panels organized by page
        currentPageTab: null,   // Currently active page tab
        isLoading: false,
        verified: false,
        hasChanges: false
    },

    // Initialize protected panels panel (reset state)
    initProtectedPanelsPanel() {
        // Reset state
        this.protectedPanelsState.verified = false;

        // Show verify step, hide config step
        const verifyStep = document.getElementById('tfa-protected-panels-verify');
        const configStep = document.getElementById('tfa-protected-panels-config');
        const passwordInput = document.getElementById('tfa-protected-panels-password');
        const errorEl = document.getElementById('tfa-protected-panels-verify-error');

        if (verifyStep) verifyStep.classList.remove('hidden');
        if (configStep) configStep.classList.add('hidden');
        if (passwordInput) passwordInput.value = '';
        if (errorEl) errorEl.classList.add('hidden');
    },

    // Verify password before showing protected panels config
    async verifyForProtectedPanels() {
        const passwordInput = document.getElementById('tfa-protected-panels-password');
        const password = passwordInput?.value;
        const btn = document.getElementById('tfa-protected-panels-verify-btn');
        const errorEl = document.getElementById('tfa-protected-panels-verify-error');

        if (!password) {
            if (errorEl) {
                errorEl.textContent = 'Please enter your password';
                errorEl.classList.remove('hidden');
            }
            passwordInput?.focus();
            return;
        }

        // Show loading
        const originalText = btn?.textContent;
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Verifying...';
        }
        if (errorEl) errorEl.classList.add('hidden');

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) throw new Error('Not authenticated');

            // Verify password with 2FA endpoint
            const response = await fetch(`${this.API_BASE_URL}/api/2fa/verify-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });

            if (response.ok) {
                // Password verified - show config panel
                this.protectedPanelsState.verified = true;

                const verifyStep = document.getElementById('tfa-protected-panels-verify');
                const configStep = document.getElementById('tfa-protected-panels-config');

                if (verifyStep) verifyStep.classList.add('hidden');
                if (configStep) configStep.classList.remove('hidden');

                // Load protected panels
                await this.loadProtectedPanels();
            } else {
                const error = await response.json();
                if (errorEl) {
                    errorEl.textContent = error.detail || 'Invalid password';
                    errorEl.classList.remove('hidden');
                }
            }
        } catch (error) {
            console.error('Error verifying password:', error);
            if (errorEl) {
                errorEl.textContent = 'Verification failed. Please try again.';
                errorEl.classList.remove('hidden');
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalText || 'Continue';
            }
        }
    },

    // Load protected panels from API
    async loadProtectedPanels() {
        const container = document.getElementById('tfa-protected-panels-list');
        const loading = document.getElementById('tfa-protected-panels-loading');

        if (loading) loading.classList.remove('hidden');
        if (container) container.innerHTML = '';

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) throw new Error('Not authenticated');

            let url = `${this.API_BASE_URL}/api/2fa/protected-panels`;
            if (this.state.currentPageRole) {
                url += `?role=${this.state.currentPageRole}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.protectedPanelsState.panels = data.panels || [];
                this.protectedPanelsState.protectedPanels = data.protected_panels || [];

                this.renderProtectedPanelsList();
            } else {
                throw new Error('Failed to load protected panels');
            }
        } catch (error) {
            console.error('Error loading protected panels:', error);
            if (container) {
                container.innerHTML = '<p class="text-red-500 text-sm">Failed to load protected panels</p>';
            }
        } finally {
            if (loading) loading.classList.add('hidden');
        }
    },

    // Render the protected panels list with page-based tabs
    renderProtectedPanelsList() {
        const tabsContainer = document.getElementById('tfa-page-tabs-container');
        const tabsNav = document.getElementById('tfa-page-tabs');
        const tabsContent = document.getElementById('tfa-page-tabs-content');

        if (!tabsContainer || !tabsNav || !tabsContent) return;

        if (!this.protectedPanelsState.panels.length) {
            tabsContainer.classList.add('hidden');
            return;
        }

        // Get current page identifier (tutor-profile, student-profile, etc.)
        const currentPage = this.getCurrentPageIdentifier();

        // Filter panels to only show those for the current page
        const currentPagePanels = this.protectedPanelsState.panels.filter(panel => {
            return panel.page === currentPage;
        });

        if (currentPagePanels.length === 0) {
            tabsContainer.classList.add('hidden');
            tabsContent.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">No panels available for this page</p>';
            return;
        }

        // Organize current page panels by section/category if they have one
        this.protectedPanelsState.panelsByPage = {};
        currentPagePanels.forEach(panel => {
            const section = panel.section || 'General';
            if (!this.protectedPanelsState.panelsByPage[section]) {
                this.protectedPanelsState.panelsByPage[section] = [];
            }
            this.protectedPanelsState.panelsByPage[section].push(panel);
        });

        const sections = Object.keys(this.protectedPanelsState.panelsByPage).sort();

        // Set first section as current if not set
        if (!this.protectedPanelsState.currentPageTab && sections.length > 0) {
            this.protectedPanelsState.currentPageTab = sections[0];
        }

        // Render section tabs (only if there are multiple sections)
        if (sections.length > 1) {
            const tabsHTML = sections.map(section => `
                <button class="tfa-page-tab ${section === this.protectedPanelsState.currentPageTab ? 'active' : ''}"
                        data-page="${section}"
                        onclick="TFAManager.switchPageTab('${section}')">
                    ${this.formatPageName(section)}
                </button>
            `).join('');
            tabsNav.innerHTML = tabsHTML;
        } else {
            // Hide tabs if only one section
            tabsNav.innerHTML = '';
        }

        // Render tab content for each section
        const protectedPanelIds = this.protectedPanelsState.protectedPanels || [];

        const contentHTML = sections.map(section => {
            const panels = this.protectedPanelsState.panelsByPage[section];
            const panelsHTML = panels.map(panel => {
                const isProtected = protectedPanelIds.includes(panel.id);
                return `
                    <div class="tfa-panel-item">
                        <div class="flex items-center gap-3">
                            <span class="text-sm font-medium text-gray-800">${panel.name}</span>
                            ${panel.recommended ? '<span class="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Recommended</span>' : ''}
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox"
                                   class="sr-only peer tfa-panel-toggle"
                                   data-panel-id="${panel.id}"
                                   ${isProtected ? 'checked' : ''}
                                   onchange="TFAManager.togglePanelProtection('${panel.id}', this.checked)">
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                    </div>
                `;
            }).join('');

            return `
                <div class="tfa-page-tab-content ${section === this.protectedPanelsState.currentPageTab ? 'active' : ''}"
                     data-page="${section}">
                    <div class="space-y-0 max-h-[300px] overflow-y-auto">
                        ${panelsHTML}
                    </div>
                </div>
            `;
        }).join('');

        tabsContent.innerHTML = contentHTML;
        tabsContainer.classList.remove('hidden');
    },

    // Get current page identifier
    getCurrentPageIdentifier() {
        // Use the detected role from state
        if (this.state.currentPageRole) {
            return `${this.state.currentPageRole}-profile`;
        }

        // Fallback: detect from URL
        const path = window.location.pathname.toLowerCase();
        if (path.includes('tutor-profile')) {
            return 'tutor-profile';
        } else if (path.includes('student-profile')) {
            return 'student-profile';
        } else if (path.includes('parent-profile')) {
            return 'parent-profile';
        } else if (path.includes('advertiser-profile')) {
            return 'advertiser-profile';
        }

        // Default fallback
        return 'profile';
    },

    // Format page name for display
    formatPageName(page) {
        // Convert snake_case or kebab-case to Title Case
        return page
            .replace(/[-_]/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    },

    // Switch page tab
    switchPageTab(page) {
        this.protectedPanelsState.currentPageTab = page;

        // Update tab buttons
        const tabButtons = document.querySelectorAll('.tfa-page-tab');
        tabButtons.forEach(btn => {
            if (btn.dataset.page === page) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update tab content
        const tabContents = document.querySelectorAll('.tfa-page-tab-content');
        tabContents.forEach(content => {
            if (content.dataset.page === page) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    },

    // Toggle panel protection (local state only - no auto-save)
    togglePanelProtection(panelId, isProtected) {
        // Update local state only - save happens when user clicks "Save & Close"
        if (isProtected) {
            if (!this.protectedPanelsState.protectedPanels.includes(panelId)) {
                this.protectedPanelsState.protectedPanels.push(panelId);
            }
        } else {
            this.protectedPanelsState.protectedPanels = this.protectedPanelsState.protectedPanels.filter(p => p !== panelId);
        }

        // Mark as having unsaved changes
        this.protectedPanelsState.hasChanges = true;
    },

    // Save and close protected panels configuration
    async saveAndCloseProtectedPanels() {
        const btn = document.getElementById('tfa-protected-panels-save-btn');
        const originalHTML = btn?.innerHTML;

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `
                <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Saving...
            `;
        }

        try {
            await this.saveProtectedPanels();
            this.protectedPanelsState.hasChanges = false;
            this.showToast('Protected panels saved', 'success');
            this.closeMethodPanel();
        } catch (error) {
            console.error('Error saving protected panels:', error);
            this.showToast('Failed to save settings', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalHTML;
            }
        }
    },

    // Save protected panels to API
    async saveProtectedPanels() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) throw new Error('Not authenticated');

            let url = `${this.API_BASE_URL}/api/2fa/protected-panels`;
            if (this.state.currentPageRole) {
                url += `?role=${this.state.currentPageRole}`;
            }

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    panels: this.protectedPanelsState.protectedPanels
                })
            });

            if (response.ok) {
                this.showToast('Protected panels updated', 'success');
            } else {
                const error = await response.json();
                this.showToast(error.detail || 'Failed to save', 'error');
                // Reload to reset state
                await this.loadProtectedPanels();
            }
        } catch (error) {
            console.error('Error saving protected panels:', error);
            this.showToast('Failed to save settings', 'error');
        }
    },

    // Reset protected panels to defaults
    async resetProtectedPanels() {
        if (!confirm('Reset protected panels to recommended defaults?')) return;

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) throw new Error('Not authenticated');

            let url = `${this.API_BASE_URL}/api/2fa/protected-panels/reset`;
            if (this.state.currentPageRole) {
                url += `?role=${this.state.currentPageRole}`;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.protectedPanelsState.protectedPanels = data.protected_panels || [];
                this.showToast('Protected panels reset to defaults', 'success');
                await this.loadProtectedPanels();
            } else {
                const error = await response.json();
                this.showToast(error.detail || 'Failed to reset', 'error');
            }
        } catch (error) {
            console.error('Error resetting protected panels:', error);
            this.showToast('Failed to reset settings', 'error');
        }
    }
};

// Global functions for HTML onclick handlers
function closeTwoFactorAuthModal() {
    TFAManager.close();
}

function openTwoFactorAuthModal() {
    TFAManager.open();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    TFAManager.init();
});

// Make TFAManager globally accessible for HTML onclick handlers
window.TFAManager = TFAManager;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TFAManager;
}
