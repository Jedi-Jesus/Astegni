// =============================================
// PROTECTED API WRAPPER - 2FA Verification for Protected Actions
// Automatically handles 2FA verification for protected endpoints
// =============================================

const ProtectedAPI = {
    // API Base URL
    API_BASE_URL: (window.API_BASE_URL || 'http://localhost:8000').replace(/\/api\/?$/, ''),

    // State
    state: {
        verificationToken: null,
        verificationExpiry: null,
        pendingRequest: null,
        user2faStatus: null,  // Cache 2FA status
        statusCheckedAt: null,  // Timestamp of last status check
        verificationInProgress: false,  // Prevent multiple verification modals
        lastActivityTime: null,  // Track last user activity
        inactivityCheckInterval: null  // Interval to check inactivity
    },

    // Configuration
    config: {
        inactivityTimeout: 10 * 60 * 1000,  // 10 minutes in milliseconds
        inactivityCheckFrequency: 30 * 1000  // Check every 30 seconds
    },

    // Initialize
    init() {
        // Clear token on page load - requires fresh verification for protected panels on every page reload
        this.clearTokenOnPageLoad();

        // Start inactivity tracking (will clear token after 10 min inactivity)
        this.startInactivityTracking();

        console.log('Protected API Wrapper initialized - fresh verification required on reload + inactivity tracking');
    },

    /**
     * Clear 2FA token on page load/reload
     * This ensures protected panels require fresh verification on every page visit
     * Non-protected panels are not affected
     */
    clearTokenOnPageLoad() {
        console.log('🔐 Page load detected - clearing 2FA verification token');
        this.clearToken();
        sessionStorage.removeItem('2fa_last_activity');
    },

    // ==================== INACTIVITY TRACKING ====================

    /**
     * Start tracking user inactivity
     * Will require re-verification after 10 minutes of inactivity
     */
    startInactivityTracking() {
        // Update last activity time
        this.updateLastActivity();

        // Track user activity events
        const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

        const activityHandler = () => {
            this.updateLastActivity();
        };

        // Add event listeners (with throttling to avoid performance issues)
        let throttleTimer = null;
        const throttledHandler = () => {
            if (!throttleTimer) {
                throttleTimer = setTimeout(() => {
                    activityHandler();
                    throttleTimer = null;
                }, 1000);  // Throttle to once per second
            }
        };

        activityEvents.forEach(event => {
            document.addEventListener(event, throttledHandler, { passive: true });
        });

        // Start periodic inactivity check
        this.state.inactivityCheckInterval = setInterval(() => {
            this.checkInactivity();
        }, this.config.inactivityCheckFrequency);

        console.log('🕐 Inactivity tracking started (timeout: 10 minutes)');
    },

    /**
     * Update the last activity timestamp
     */
    updateLastActivity() {
        this.state.lastActivityTime = Date.now();
        sessionStorage.setItem('2fa_last_activity', this.state.lastActivityTime.toString());
    },

    /**
     * Check if user has been inactive for too long
     * If so, clear the verification token and require re-verification
     */
    async checkInactivity() {
        // Get last activity time (prefer sessionStorage for persistence across page focus/blur)
        const storedActivity = sessionStorage.getItem('2fa_last_activity');
        const lastActivity = storedActivity ? parseInt(storedActivity) : this.state.lastActivityTime;

        if (!lastActivity) return;

        const inactiveTime = Date.now() - lastActivity;

        // If inactive for more than the timeout, require re-verification
        if (inactiveTime >= this.config.inactivityTimeout) {
            console.log(`🔐 User inactive for ${Math.round(inactiveTime / 60000)} minutes - requiring re-verification`);

            // Only trigger if 2FA is enabled and was previously verified
            if (this.state.pageLoadVerified) {
                // Clear the token
                this.clearToken();
                this.state.pageLoadVerified = false;

                // Check if user has 2FA enabled before showing modal
                const user2faStatus = await this.check2FAStatus();

                if (user2faStatus.enabled) {
                    // Show inactivity re-verification modal
                    this.showInactivityVerificationModal();
                }
            }
        }
    },

    /**
     * Show a modal requiring re-verification after inactivity
     */
    showInactivityVerificationModal() {
        // Remove any existing overlay first
        const existingOverlay = document.getElementById('2fa-inactivity-overlay');
        if (existingOverlay) existingOverlay.remove();

        const overlay = document.createElement('div');
        overlay.id = '2fa-inactivity-overlay';
        overlay.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]';
        overlay.innerHTML = `
            <div class="bg-white rounded-xl p-8 max-w-md mx-4 text-center shadow-2xl">
                <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <h2 class="text-xl font-bold text-gray-800 mb-2">Session Timed Out</h2>
                <p class="text-gray-600 mb-6">You've been inactive for 10 minutes. Please verify your identity to continue.</p>
                <div class="flex gap-3 justify-center">
                    <button onclick="window.location.href='../index.html'" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                        Go Home
                    </button>
                    <button onclick="ProtectedAPI.retryInactivityVerification()" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                        Verify Now
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    /**
     * Retry verification after inactivity timeout
     */
    async retryInactivityVerification() {
        const overlay = document.getElementById('2fa-inactivity-overlay');
        if (overlay) overlay.remove();

        // Update activity time to prevent immediate re-trigger
        this.updateLastActivity();

        // Re-verify using the standard verification flow
        const verified = await this.requireVerification('session_resume');

        if (verified) {
            console.log('✅ Inactivity re-verification successful');
        } else {
            // Show the modal again if verification failed/cancelled
            this.showInactivityVerificationModal();
        }
    },

    /**
     * Stop inactivity tracking (call when leaving the page)
     */
    stopInactivityTracking() {
        if (this.state.inactivityCheckInterval) {
            clearInterval(this.state.inactivityCheckInterval);
            this.state.inactivityCheckInterval = null;
        }
        console.log('🕐 Inactivity tracking stopped');
    },

    // ==================== TOKEN MANAGEMENT ====================

    // Save verification token to sessionStorage
    saveToken(token, expiresIn) {
        const expiry = Date.now() + (expiresIn * 1000);
        this.state.verificationToken = token;
        this.state.verificationExpiry = expiry;

        sessionStorage.setItem('2fa_verification_token', token);
        sessionStorage.setItem('2fa_verification_expiry', expiry.toString());
    },

    // Restore token from sessionStorage
    restoreToken() {
        const token = sessionStorage.getItem('2fa_verification_token');
        const expiry = sessionStorage.getItem('2fa_verification_expiry');

        if (token && expiry) {
            const expiryTime = parseInt(expiry);
            if (Date.now() < expiryTime) {
                this.state.verificationToken = token;
                this.state.verificationExpiry = expiryTime;
            } else {
                this.clearToken();
            }
        }
    },

    // Clear verification token
    clearToken() {
        this.state.verificationToken = null;
        this.state.verificationExpiry = null;
        sessionStorage.removeItem('2fa_verification_token');
        sessionStorage.removeItem('2fa_verification_expiry');
    },

    // Check if token is valid
    isTokenValid() {
        if (!this.state.verificationToken || !this.state.verificationExpiry) {
            return false;
        }
        return Date.now() < this.state.verificationExpiry;
    },

    // Get current token (or null if expired)
    getToken() {
        if (this.isTokenValid()) {
            return this.state.verificationToken;
        }
        this.clearToken();
        return null;
    },

    // ==================== API CALL WRAPPER ====================

    /**
     * Make a protected API call with automatic 2FA verification
     * @param {string} url - API endpoint URL
     * @param {object} options - Fetch options (method, body, headers, etc.)
     * @param {string} action - Action name for verification modal (e.g., 'access_settings')
     * @returns {Promise<Response>} - Fetch response
     */
    async call(url, options = {}, action = 'protected_action') {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');

        if (!token) {
            throw new Error('Not authenticated');
        }

        // Prepare headers
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add 2FA token if available
        const verificationToken = this.getToken();
        if (verificationToken) {
            headers['X-2FA-Token'] = verificationToken;
        }

        // Make initial request
        let response = await fetch(url, { ...options, headers });

        // Check if 2FA verification is required
        if (response.status === 403) {
            const errorData = await response.json();

            if (errorData.detail && errorData.detail.includes('2FA verification required')) {
                console.log('🔐 2FA verification required for:', action);

                // Show verification modal and get token
                const newToken = await this.verify(action);

                if (newToken) {
                    // Retry request with new token
                    headers['X-2FA-Token'] = newToken;
                    response = await fetch(url, { ...options, headers });
                } else {
                    throw new Error('2FA verification failed or cancelled');
                }
            }
        }

        return response;
    },

    // ==================== VERIFICATION FLOW ====================

    /**
     * PRE-VERIFY: Check if 2FA is enabled and verify BEFORE panel access
     * Use this to show verification modal BEFORE opening protected panels
     *
     * @param {string} action - Action name for display (e.g., 'access_settings')
     * @returns {Promise<boolean>} - True if access granted (verified or no 2FA)
     */
    async requireVerification(action) {
        // If valid token exists, no verification needed
        if (this.isTokenValid()) {
            console.log('Valid token exists, no verification needed');
            return true;
        }

        // Check if user has 2FA enabled
        const user2faStatus = await this.check2FAStatus();

        if (!user2faStatus.enabled) {
            console.log('2FA not enabled, access granted');
            return true;
        }

        // User has 2FA enabled but no valid token - verify now
        console.log('🔐 2FA verification required before panel access');
        const token = await this.verify(action);

        if (token) {
            console.log('✅ Verification successful, access granted');
            return true;
        } else {
            console.log('❌ Verification failed or cancelled');
            return false;
        }
    },

    /**
     * Verify user identity with 2FA
     * @param {string} action - Action name for display
     * @returns {Promise<string|null>} - Verification token or null
     */
    async verify(action) {
        // Check if user has 2FA enabled
        const user2faStatus = await this.check2FAStatus();

        if (!user2faStatus.enabled) {
            console.log('2FA not enabled, no verification needed');
            return null;
        }

        // Show verification modal based on method
        const method = user2faStatus.method;

        if (method === 'email') {
            return await this.verifyEmail(action);
        } else if (method === 'authenticator') {
            return await this.verifyAuthenticator(action);
        } else if (method === 'inapp') {
            return await this.verifyInApp(action);
        }

        return null;
    },

    // Check 2FA status
    async check2FAStatus(role = null) {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            let url = `${this.API_BASE_URL}/api/2fa/status`;
            if (role) {
                url += `?role=${role}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error checking 2FA status:', error);
        }

        return { enabled: false, method: null };
    },

    /**
     * Check if a specific panel is protected by 2FA
     * @param {string} panelId - The panel ID to check
     * @param {string} role - Optional role (tutor, student, parent, advertiser)
     * @returns {Promise<object>} - { is_protected, two_factor_enabled, requires_verification }
     */
    async isPanelProtected(panelId, role = null) {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            let url = `${this.API_BASE_URL}/api/2fa/is-panel-protected/${panelId}`;
            if (role) {
                url += `?role=${role}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error checking panel protection:', error);
        }

        return { is_protected: false, two_factor_enabled: false, requires_verification: false };
    },

    /**
     * PRE-VERIFY FOR PANEL: Check if panel is protected and verify if needed
     * Use this before switching to a protected panel
     *
     * @param {string} panelId - The panel ID (e.g., 'settings', 'packages')
     * @param {string} role - Optional role (will be auto-detected if not provided)
     * @returns {Promise<boolean>} - True if access granted
     */
    async requirePanelVerification(panelId, role = null) {
        // Auto-detect role from URL if not provided
        if (!role) {
            const path = window.location.pathname.toLowerCase();
            if (path.includes('tutor-profile')) role = 'tutor';
            else if (path.includes('student-profile')) role = 'student';
            else if (path.includes('parent-profile')) role = 'parent';
            else if (path.includes('advertiser-profile')) role = 'advertiser';
        }

        // If valid token exists, access granted
        if (this.isTokenValid()) {
            console.log(`✅ Valid token exists, panel '${panelId}' access granted`);
            return true;
        }

        // Check if this specific panel is protected
        const panelStatus = await this.isPanelProtected(panelId, role);

        // If 2FA is not enabled or panel is not protected, access granted
        if (!panelStatus.two_factor_enabled || !panelStatus.is_protected) {
            console.log(`✅ Panel '${panelId}' is not protected, access granted`);
            return true;
        }

        // Panel is protected and no valid token - require verification
        console.log(`🔐 Panel '${panelId}' is protected, verification required`);
        const token = await this.verify(`access ${panelId} panel`);

        if (token) {
            console.log(`✅ Verification successful, panel '${panelId}' access granted`);
            return true;
        } else {
            console.log(`❌ Verification failed or cancelled for panel '${panelId}'`);
            return false;
        }
    },

    // Verify with Email OTP
    async verifyEmail(action) {
        // Step 1: Send OTP
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');

        try {
            const sendResponse = await fetch(`${this.API_BASE_URL}/api/2fa/send-action-otp`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!sendResponse.ok) {
                this.showToast('Failed to send verification code', 'error');
                return null;
            }

            const sendData = await sendResponse.json();
            this.showToast(`Verification code sent to ${sendData.email}`, 'success');

            // Step 2: Show OTP input modal
            const otp = await this.showOTPInputModal(action, 'email');

            if (!otp) return null;

            // Step 3: Verify OTP
            const verifyResponse = await fetch(`${this.API_BASE_URL}/api/2fa/verify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ method: 'email', code: otp })
            });

            if (verifyResponse.ok) {
                const data = await verifyResponse.json();
                this.saveToken(data.verification_token, data.expires_in);
                this.showToast('Verification successful!', 'success');
                return data.verification_token;
            } else {
                const error = await verifyResponse.json();
                this.showToast(error.detail || 'Invalid code', 'error');
                return null;
            }
        } catch (error) {
            console.error('Email verification error:', error);
            this.showToast('Verification failed', 'error');
            return null;
        }
    },

    // Verify with Authenticator App
    async verifyAuthenticator(action) {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');

        // Show TOTP input modal
        const totp = await this.showOTPInputModal(action, 'authenticator');

        if (!totp) return null;

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/2fa/verify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ method: 'authenticator', code: totp })
            });

            if (response.ok) {
                const data = await response.json();
                this.saveToken(data.verification_token, data.expires_in);
                this.showToast('Verification successful!', 'success');
                return data.verification_token;
            } else {
                const error = await response.json();
                this.showToast(error.detail || 'Invalid code', 'error');
                return null;
            }
        } catch (error) {
            console.error('Authenticator verification error:', error);
            this.showToast('Verification failed', 'error');
            return null;
        }
    },

    // Verify with In-App Password
    async verifyInApp(action) {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');

        // Show password input modal
        const password = await this.showPasswordInputModal(action);

        if (!password) return null;

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/2fa/verify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ method: 'inapp', password })
            });

            if (response.ok) {
                const data = await response.json();
                this.saveToken(data.verification_token, data.expires_in);
                this.showToast('Verification successful!', 'success');
                return data.verification_token;
            } else {
                const error = await response.json();
                this.showToast(error.detail || 'Invalid password', 'error');
                return null;
            }
        } catch (error) {
            console.error('In-App verification error:', error);
            this.showToast('Verification failed', 'error');
            return null;
        }
    },

    // ==================== UI MODALS ====================

    // Show OTP input modal (Email or Authenticator)
    showOTPInputModal(action, method) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                    <h3 class="text-xl font-bold mb-4">Two-Factor Verification Required</h3>
                    <p class="text-gray-600 mb-4">
                        ${method === 'email' ? 'Enter the 6-digit code sent to your email' : 'Enter the code from your authenticator app'}
                    </p>

                    <div class="flex gap-2 justify-center mb-4" id="otp-inputs">
                        <input type="text" maxlength="1" class="w-12 h-12 text-center text-2xl border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" data-index="0">
                        <input type="text" maxlength="1" class="w-12 h-12 text-center text-2xl border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" data-index="1">
                        <input type="text" maxlength="1" class="w-12 h-12 text-center text-2xl border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" data-index="2">
                        <input type="text" maxlength="1" class="w-12 h-12 text-center text-2xl border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" data-index="3">
                        <input type="text" maxlength="1" class="w-12 h-12 text-center text-2xl border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" data-index="4">
                        <input type="text" maxlength="1" class="w-12 h-12 text-center text-2xl border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" data-index="5">
                    </div>

                    <div class="flex gap-3">
                        <button class="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300" id="cancel-btn">Cancel</button>
                        <button class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" id="verify-btn">Verify</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const inputs = modal.querySelectorAll('#otp-inputs input');
            const verifyBtn = modal.querySelector('#verify-btn');
            const cancelBtn = modal.querySelector('#cancel-btn');

            // Auto-focus and navigation
            inputs[0].focus();
            inputs.forEach((input, index) => {
                input.addEventListener('input', (e) => {
                    if (e.target.value && index < 5) {
                        inputs[index + 1].focus();
                    }
                });
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Backspace' && !e.target.value && index > 0) {
                        inputs[index - 1].focus();
                    }
                });
            });

            verifyBtn.addEventListener('click', () => {
                const code = Array.from(inputs).map(i => i.value).join('');
                if (code.length === 6) {
                    modal.remove();
                    resolve(code);
                } else {
                    this.showToast('Please enter all 6 digits', 'error');
                }
            });

            cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve(null);
            });

            // Close on escape
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    resolve(null);
                }
            });
        });
    },

    // Show password input modal (In-App)
    showPasswordInputModal(action) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                    <h3 class="text-xl font-bold mb-4">Two-Factor Verification Required</h3>
                    <p class="text-gray-600 mb-4">Enter your 2FA password to continue</p>

                    <input
                        type="password"
                        id="password-input"
                        class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none mb-4"
                        placeholder="Enter 2FA password"
                    >

                    <div class="flex gap-3">
                        <button class="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300" id="cancel-btn">Cancel</button>
                        <button class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" id="verify-btn">Verify</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const passwordInput = modal.querySelector('#password-input');
            const verifyBtn = modal.querySelector('#verify-btn');
            const cancelBtn = modal.querySelector('#cancel-btn');

            passwordInput.focus();

            verifyBtn.addEventListener('click', () => {
                const password = passwordInput.value;
                if (password) {
                    modal.remove();
                    resolve(password);
                } else {
                    this.showToast('Please enter your password', 'error');
                }
            });

            cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve(null);
            });

            // Submit on Enter
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    verifyBtn.click();
                }
            });

            // Close on escape
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    resolve(null);
                }
            });
        });
    },

    // ==================== UTILITY FUNCTIONS ====================

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
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    ProtectedAPI.init();
});

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.ProtectedAPI = ProtectedAPI;
}
