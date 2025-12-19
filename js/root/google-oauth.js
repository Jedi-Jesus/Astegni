/**
 * Google OAuth 2.0 Sign-In Handler
 * Handles "Continue with Google" authentication
 */

class GoogleOAuthManager {
    constructor() {
        this.clientId = null;
        this.initialized = false;
        this.API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
    }

    /**
     * Initialize Google Sign-In
     * Must be called before using Google OAuth
     */
    async initialize() {
        if (this.initialized) {
            console.log('[GoogleOAuth] Already initialized');
            return;
        }

        try {
            // Fetch Google OAuth config from backend
            const response = await fetch(`${this.API_BASE_URL}/api/oauth/google/config`);

            if (!response.ok) {
                console.warn('[GoogleOAuth] Backend not configured for Google OAuth');
                return;
            }

            const config = await response.json();
            this.clientId = config.client_id;

            // Load Google Sign-In library
            await this.loadGoogleLibrary();

            // Initialize Google Sign-In
            await this.initializeGoogleSignIn();

            this.initialized = true;
            console.log('[GoogleOAuth] Initialized successfully');

        } catch (error) {
            console.error('[GoogleOAuth] Initialization failed:', error);
        }
    }

    /**
     * Load Google Sign-In JavaScript library
     */
    loadGoogleLibrary() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.google && window.google.accounts) {
                resolve();
                return;
            }

            // Load Google Sign-In library
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;

            script.onload = () => {
                console.log('[GoogleOAuth] Library loaded');
                resolve();
            };

            script.onerror = () => {
                reject(new Error('Failed to load Google Sign-In library'));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Initialize Google Sign-In with client ID
     */
    async initializeGoogleSignIn() {
        return new Promise((resolve) => {
            // Wait for Google library to be ready
            const checkReady = setInterval(() => {
                if (window.google && window.google.accounts) {
                    clearInterval(checkReady);

                    // Initialize Google Sign-In
                    window.google.accounts.id.initialize({
                        client_id: this.clientId,
                        callback: this.handleCredentialResponse.bind(this),
                        auto_select: false,
                        cancel_on_tap_outside: true
                    });

                    console.log('[GoogleOAuth] Google Sign-In initialized');
                    resolve();
                }
            }, 100);

            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkReady);
                resolve();
            }, 5000);
        });
    }

    /**
     * Handle credential response from Google
     * This is called automatically when user signs in with Google
     */
    async handleCredentialResponse(response) {
        console.log('[GoogleOAuth] Received credential response');
        console.log('[GoogleOAuth] Response object:', response);

        try {
            const idToken = response.credential;
            console.log('[GoogleOAuth] ID Token received (first 50 chars):', idToken ? idToken.substring(0, 50) + '...' : 'null');

            if (!idToken) {
                throw new Error('No ID token received from Google');
            }

            // Determine role based on which modal is open
            const role = this.determineRegistrationRole();
            console.log('[GoogleOAuth] Selected role:', role);

            // Send to backend for verification and user creation/login
            console.log('[GoogleOAuth] Sending to backend:', `${this.API_BASE_URL}/api/oauth/google`);
            const authResult = await this.authenticateWithBackend(idToken, role);
            console.log('[GoogleOAuth] Backend response:', authResult);

            if (authResult.success) {
                console.log('[GoogleOAuth] Authentication successful');

                // Close any open modals
                this.closeAuthModals();

                // Show success message
                this.showSuccessMessage(authResult.user);

                // Navigate to appropriate dashboard
                this.navigateAfterLogin(authResult.user);
            } else {
                throw new Error(authResult.error || 'Authentication failed');
            }

        } catch (error) {
            console.error('[GoogleOAuth] Authentication error:', error);
            console.error('[GoogleOAuth] Error stack:', error.stack);
            this.showErrorMessage(error.message || 'Something went wrong. Please try again.');
        }
    }

    /**
     * Determine which role to register as based on open modal
     */
    determineRegistrationRole() {
        // Check if register modal is open and has role selected
        const registerModal = document.getElementById('register-modal');
        const roleSelect = document.getElementById('register-as');

        if (registerModal && !registerModal.classList.contains('hidden')) {
            const selectedRole = roleSelect?.value;
            if (selectedRole && selectedRole !== '') {
                return selectedRole;
            }
        }

        // Default to student
        return 'student';
    }

    /**
     * Send Google ID token to backend for verification and authentication
     */
    async authenticateWithBackend(idToken, role = 'student') {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/oauth/google`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id_token: idToken,
                    role: role
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Authentication failed');
            }

            const data = await response.json();

            // Store tokens and user data (same as regular login)
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            localStorage.setItem('userRole', data.user.active_role);

            // Update AuthManager if available
            if (window.AuthManager) {
                window.AuthManager.token = data.access_token;
                window.AuthManager.user = data.user;
            }

            // Update global state
            if (window.APP_STATE) {
                window.APP_STATE.isLoggedIn = true;
                window.APP_STATE.currentUser = data.user;
                window.APP_STATE.userRole = data.user.active_role;
            }

            return { success: true, user: data.user };

        } catch (error) {
            console.error('[GoogleOAuth] Backend authentication failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Trigger Google Sign-In popup
     * Called when user clicks "Continue with Google" button
     */
    signIn() {
        if (!this.initialized) {
            console.error('[GoogleOAuth] Not initialized. Call initialize() first.');
            this.showErrorMessage('Google Sign-In not available. Please try again later.');
            return;
        }

        if (!window.google || !window.google.accounts) {
            console.error('[GoogleOAuth] Google library not loaded');
            this.showErrorMessage('Google Sign-In not available. Please refresh the page.');
            return;
        }

        // Prompt Google Sign-In
        window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                console.log('[GoogleOAuth] Sign-in prompt not displayed');
                // Fallback: Show One Tap UI as popup
                this.showOneTapPopup();
            }
        });
    }

    /**
     * Show Google One Tap as a popup (fallback)
     */
    showOneTapPopup() {
        if (window.google && window.google.accounts) {
            // Create a temporary container for the button
            const container = document.createElement('div');
            container.id = 'google-signin-button-temp';
            container.style.position = 'fixed';
            container.style.top = '50%';
            container.style.left = '50%';
            container.style.transform = 'translate(-50%, -50%)';
            container.style.zIndex = '10000';
            document.body.appendChild(container);

            // Render Google Sign-In button
            window.google.accounts.id.renderButton(
                container,
                {
                    theme: 'outline',
                    size: 'large',
                    text: 'continue_with',
                    shape: 'rectangular',
                    logo_alignment: 'left'
                }
            );

            // Auto-remove after 10 seconds
            setTimeout(() => {
                container.remove();
            }, 10000);
        }
    }

    /**
     * Close authentication modals
     */
    closeAuthModals() {
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
 * Global function called by "Continue with Google" buttons
 * @param {string} provider - 'google' or 'socials'
 */
window.socialLogin = async function(provider) {
    if (provider === 'google') {
        if (!window.googleOAuthManager) {
            console.error('[GoogleOAuth] Manager not initialized');
            alert('Google Sign-In is not available. Please refresh the page and try again.');
            return;
        }

        // Trigger Google Sign-In
        window.googleOAuthManager.signIn();

    } else if (provider === 'socials') {
        // Coming soon modal for other social logins
        if (window.openModal) {
            window.openModal('coming-soon-modal');
        } else {
            alert('Social login coming soon!');
        }
    }
};

// ============================================
// AUTO-INITIALIZATION
// ============================================

// Create global instance
window.googleOAuthManager = new GoogleOAuthManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.googleOAuthManager.initialize();
    });
} else {
    // DOM already loaded
    window.googleOAuthManager.initialize();
}

console.log('[GoogleOAuth] Manager created and will initialize on DOM ready');
