/**
 * Google OAuth 2.0 Sign-In Handler
 * Handles "Continue with Google" authentication
 *
 * This module provides direct Google Sign-In integration
 * without redirecting to a separate page.
 */

class GoogleOAuthManager {
    constructor() {
        this.clientId = null;
        this.initialized = false;
        this.googleLibraryLoaded = false;
        this.API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
        this.pendingRole = 'student'; // Default role for Google sign-in
    }

    /**
     * Initialize Google Sign-In
     * Must be called before using Google OAuth
     */
    async initialize() {
        if (this.initialized) {
            console.log('[GoogleOAuth] Already initialized');
            return true;
        }

        try {
            // Fetch Google OAuth config from backend
            console.log('[GoogleOAuth] Fetching OAuth config from backend...');
            const response = await fetch(`${this.API_BASE_URL}/api/oauth/google/config`);

            if (!response.ok) {
                console.warn('[GoogleOAuth] Backend not configured for Google OAuth');
                return false;
            }

            const config = await response.json();
            this.clientId = config.client_id;
            console.log('[GoogleOAuth] Client ID received');

            // Load Google Sign-In library
            await this.loadGoogleLibrary();

            // Initialize Google Sign-In
            this.initializeGoogleSignIn();

            this.initialized = true;
            console.log('[GoogleOAuth] Initialized successfully');
            return true;

        } catch (error) {
            console.error('[GoogleOAuth] Initialization failed:', error);
            return false;
        }
    }

    /**
     * Load the Google Sign-In library
     */
    loadGoogleLibrary() {
        return new Promise((resolve, reject) => {
            if (window.google && window.google.accounts) {
                console.log('[GoogleOAuth] Google library already loaded');
                this.googleLibraryLoaded = true;
                resolve();
                return;
            }

            console.log('[GoogleOAuth] Loading Google Sign-In library...');
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;

            script.onload = () => {
                // Wait for google.accounts to be available
                const check = setInterval(() => {
                    if (window.google && window.google.accounts) {
                        clearInterval(check);
                        console.log('[GoogleOAuth] Google library loaded');
                        this.googleLibraryLoaded = true;
                        resolve();
                    }
                }, 100);

                // Timeout after 5 seconds
                setTimeout(() => {
                    clearInterval(check);
                    if (!window.google || !window.google.accounts) {
                        reject(new Error('Google library loaded but API not available'));
                    }
                }, 5000);
            };

            script.onerror = () => reject(new Error('Failed to load Google library'));
            document.head.appendChild(script);
        });
    }

    /**
     * Initialize Google Sign-In with callback
     */
    initializeGoogleSignIn() {
        if (!window.google || !window.google.accounts) {
            console.error('[GoogleOAuth] Google library not loaded');
            return;
        }

        window.google.accounts.id.initialize({
            client_id: this.clientId,
            callback: this.handleCredentialResponse.bind(this),
            auto_select: false,
            cancel_on_tap_outside: true
        });

        console.log('[GoogleOAuth] Google Sign-In initialized');
    }

    /**
     * Handle credential response from Google
     */
    async handleCredentialResponse(response) {
        console.log('[GoogleOAuth] Received credential from Google');

        try {
            const idToken = response.credential;

            // Show loading state
            this.showLoadingState();

            // Send to backend
            console.log('[GoogleOAuth] Sending to backend...');
            const res = await fetch(`${this.API_BASE_URL}/api/oauth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_token: idToken,
                    role: this.pendingRole
                })
            });

            if (!res.ok) {
                const error = await res.json();

                // If 404, user doesn't have an account - open register modal
                if (res.status === 404) {
                    this.hideLoadingState();
                    this.closeGoogleModal();
                    this.showErrorMessage('No account found with this email. Please register first.');

                    // Open register modal after a short delay
                    setTimeout(() => {
                        if (window.openModal) {
                            window.openModal('register-modal');
                        } else {
                            const registerModal = document.getElementById('register-modal');
                            if (registerModal) {
                                registerModal.classList.add('active');
                            }
                        }
                    }, 1000);
                    return;
                }

                throw new Error(error.detail || 'Backend authentication failed');
            }

            const data = await res.json();
            console.log('[GoogleOAuth] Backend verified! Welcome,', data.user.first_name);

            // Save tokens
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            localStorage.setItem('userRole', data.user.active_role);

            // Update APP_STATE if available
            if (window.APP_STATE) {
                window.APP_STATE.isLoggedIn = true;
                window.APP_STATE.currentUser = data.user;
                window.APP_STATE.userRole = data.user.active_role;
            }

            // Update AuthManager if available
            if (window.AuthManager) {
                window.AuthManager.token = data.access_token;
                window.AuthManager.user = data.user;
            }

            // Close modals
            this.closeAuthModals();

            // Show success
            this.showSuccessMessage(data.user);

            // Navigate to profile
            this.navigateAfterLogin(data.user);

        } catch (error) {
            console.error('[GoogleOAuth] Error:', error.message);
            this.hideLoadingState();
            this.showErrorMessage(error.message);
        }
    }

    /**
     * Trigger Google Sign-In popup
     * @param {string} role - The role to register/login as (student, tutor, parent, advertiser)
     */
    async signIn(role = 'student') {
        console.log('[GoogleOAuth] Sign-in triggered for role:', role);
        this.pendingRole = role;

        // Ensure initialized
        if (!this.initialized) {
            console.log('[GoogleOAuth] Not initialized, initializing now...');
            const success = await this.initialize();
            if (!success) {
                this.showErrorMessage('Google Sign-In is not available. Please try again later.');
                return;
            }
        }

        // Show the Google Sign-In modal with rendered button
        if (window.google && window.google.accounts) {
            this.showGoogleSignInModal();
        } else {
            this.showErrorMessage('Google Sign-In is not available. Please try again later.');
        }
    }

    /**
     * Show the Google Sign-In modal with rendered button
     */
    showGoogleSignInModal() {
        // Create a modal with the Google button
        let modal = document.getElementById('google-signin-modal');

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'google-signin-modal';
            modal.className = 'modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(8px);
                z-index: 1001;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 1rem;
            `;
            modal.innerHTML = `
                <div class="modal-content enhanced" style="
                    position: relative;
                    width: 100%;
                    max-width: 420px;
                    background: var(--modal-bg, #ffffff);
                    border-radius: 16px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    overflow: hidden;
                    animation: modalSlideIn 0.3s ease;
                ">
                    <button class="modal-close-enhanced" onclick="window.googleOAuthManager.closeGoogleModal()" style="
                        position: absolute;
                        top: 1rem;
                        right: 1rem;
                        width: 32px;
                        height: 32px;
                        background: transparent;
                        border: none;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        z-index: 10;
                        transition: all 0.2s ease;
                    ">
                        <svg style="width: 20px; height: 20px; stroke: var(--text-primary, #333);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>

                    <div style="padding: 2rem; text-align: center;">
                        <!-- Google Icon -->
                        <div style="
                            width: 64px;
                            height: 64px;
                            margin: 0 auto 1.5rem;
                            background: linear-gradient(135deg, #4285F4, #34A853, #FBBC05, #EA4335);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 4px 15px rgba(66, 133, 244, 0.3);
                        ">
                            <svg style="width: 32px; height: 32px;" viewBox="0 0 24 24">
                                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                        </div>

                        <h3 style="
                            font-size: 1.5rem;
                            font-weight: 700;
                            color: var(--text-primary, #1f2937);
                            margin: 0 0 0.5rem 0;
                        ">Sign in with Google</h3>

                        <p style="
                            font-size: 0.875rem;
                            color: var(--text-muted, #6b7280);
                            margin: 0 0 1.5rem 0;
                        ">Click the button below to continue with your Google account</p>

                        <!-- Google Sign-In Button Container -->
                        <div id="google-signin-button-container" style="
                            display: flex;
                            justify-content: center;
                            min-height: 44px;
                        "></div>

                        <p style="
                            font-size: 0.75rem;
                            color: var(--text-muted, #9ca3af);
                            margin: 1.5rem 0 0 0;
                        ">By continuing, you agree to our Terms of Service and Privacy Policy</p>
                    </div>
                </div>
            `;

            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeGoogleModal();
                }
            });

            document.body.appendChild(modal);
        }

        // Show the modal
        modal.style.display = 'flex';

        // Render Google button in the container
        setTimeout(() => {
            const container = document.getElementById('google-signin-button-container');
            if (container && window.google && window.google.accounts) {
                container.innerHTML = ''; // Clear previous button
                window.google.accounts.id.renderButton(container, {
                    theme: 'filled_blue',
                    size: 'large',
                    text: 'signin_with',
                    shape: 'rectangular',
                    logo_alignment: 'left',
                    width: 300
                });
            }
        }, 100);
    }

    /**
     * Close the Google Sign-In modal
     */
    closeGoogleModal() {
        const modal = document.getElementById('google-signin-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Show loading state on the buttons
     */
    showLoadingState() {
        const googleButtons = document.querySelectorAll('.social-btn.google');
        googleButtons.forEach(btn => {
            btn.disabled = true;
            btn.dataset.originalText = btn.innerHTML;
            btn.innerHTML = `
                <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
            `;
        });
    }

    /**
     * Hide loading state on the buttons
     */
    hideLoadingState() {
        const googleButtons = document.querySelectorAll('.social-btn.google');
        googleButtons.forEach(btn => {
            btn.disabled = false;
            if (btn.dataset.originalText) {
                btn.innerHTML = btn.dataset.originalText;
            }
        });
    }

    /**
     * Close authentication modals
     */
    closeAuthModals() {
        // Close Google sign-in modal
        this.closeGoogleModal();

        const loginModal = document.getElementById('login-modal');
        const registerModal = document.getElementById('register-modal');

        if (loginModal) {
            loginModal.classList.add('hidden');
        }

        if (registerModal) {
            registerModal.classList.add('hidden');
        }

        // Call global closeModal if available
        if (window.closeModal) {
            window.closeModal('login-modal');
            window.closeModal('register-modal');
        }
    }

    /**
     * Show success message
     */
    showSuccessMessage(user) {
        const message = `Welcome, ${user.first_name}! You've successfully signed in with Google.`;

        // Use toast notification if available
        if (window.showToast) {
            window.showToast(message, 'success');
        } else {
            alert(message);
        }
    }

    /**
     * Show error message
     */
    showErrorMessage(message) {
        if (window.showToast) {
            window.showToast(message, 'error');
        } else {
            alert('Error: ' + message);
        }
    }

    /**
     * Navigate to appropriate page after login
     */
    navigateAfterLogin(user) {
        // Wait a moment for success message to be visible
        setTimeout(() => {
            const role = user.active_role;
            const profilePages = {
                student: '/profile-pages/student-profile.html',
                tutor: '/profile-pages/tutor-profile.html',
                parent: '/profile-pages/parent-profile.html',
                advertiser: '/profile-pages/advertiser-profile.html',
                user: '/profile-pages/user-profile.html'
            };

            const destination = profilePages[role] || '/index.html';
            window.location.href = destination;
        }, 1500);
    }

    /**
     * Check Google OAuth configuration status
     */
    async checkStatus() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/oauth/google/status`);
            const status = await response.json();

            console.log('[GoogleOAuth] Status:', status);
            return status;
        } catch (error) {
            console.error('[GoogleOAuth] Status check failed:', error);
            return { configured: false };
        }
    }
}

// ============================================
// GLOBAL FUNCTIONS
// ============================================

/**
 * Global function for Google Sign-In (LOGIN ONLY)
 * Called by "Continue with Google" buttons in login modal
 * @param {string} role - The role to sign in as (optional, defaults to 'student')
 */
window.googleSignIn = async function(role = 'student') {
    console.log('[GoogleOAuth] googleSignIn called with role:', role);
    if (window.googleOAuthManager) {
        await window.googleOAuthManager.signIn(role);
    } else {
        console.error('[GoogleOAuth] Manager not initialized');
        if (window.showToast) {
            window.showToast('Google Sign-In is not available. Please try again.', 'error');
        } else {
            alert('Google Sign-In is not available. Please try again.');
        }
    }
};

/**
 * Global function called by "Continue with Your Socials" buttons
 * @param {string} provider - 'socials'
 */
window.socialLogin = async function(provider) {
    if (provider === 'socials') {
        // Open social login options modal
        if (window.openModal) {
            window.openModal('social-login-modal');
        } else {
            alert('Social login coming soon!');
        }
    }
};

/**
 * Global function called when a social platform icon is clicked
 * Opens the coming soon modal with the platform name
 * @param {string} platformName - Name of the social platform
 */
window.openSocialComingSoon = function(platformName) {
    // Set the platform name in the modal
    const platformElement = document.getElementById('coming-soon-platform-name');
    if (platformElement) {
        platformElement.textContent = `${platformName} login is`;
    }

    // Open the coming soon modal
    if (window.openModal) {
        window.openModal('login-coming-soon-modal');
    } else {
        alert(`${platformName} login coming soon!`);
    }
};

// ============================================
// AUTO-INITIALIZATION
// ============================================

// Create global instance
window.googleOAuthManager = new GoogleOAuthManager();

// Initialize when DOM is ready (pre-load Google library for faster sign-in)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Delay initialization slightly to not block page load
        setTimeout(() => {
            window.googleOAuthManager.initialize();
        }, 1000);
    });
} else {
    // DOM already loaded
    setTimeout(() => {
        window.googleOAuthManager.initialize();
    }, 1000);
}

console.log('[GoogleOAuth] Manager created and will initialize on DOM ready');
