        // ============================================
        // AUTH MANAGER DEFINITION
        // ============================================
        if (!window.AuthManager) {
            window.AuthManager = {
                isAuthenticated() {
                    // Check both token keys for compatibility
                    return !!(localStorage.getItem('token') || localStorage.getItem('access_token'));
                },

                async restoreSession() {
                    // Check both token keys for compatibility
                    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
                    if (!token) return false;

                    try {
                        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/me`, {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });

                        if (response.ok) {
                            const user = await response.json();
                            this.user = user;
                            window.currentUser = user;
                            return true;
                        }

                        localStorage.removeItem('access_token');
                        localStorage.removeItem('refresh_token');
                        return false;
                    } catch (error) {
                        console.error('Session restore failed:', error);
                        return false;
                    }
                },

                getUser() {
                    return this.user || null;
                },

                getUserRole() {
                    return this.user?.active_role || 'user';
                },

                logout() {
                    // Clear both token keys for compatibility
                    localStorage.removeItem('token');
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.href = '../index.html';
                }
            };
        }

        // ============================================
        // PAGE INITIALIZATION
        // ============================================
        (async function initializePage() {
            console.log('Initializing reels page...');

            const auth = window.AuthManager;

            // Don't block page load for non-authenticated users
            // Allow viewing videos without login
            if (auth.isAuthenticated()) {
                const restored = await auth.restoreSession();
                if (restored) {
                    const user = auth.getUser();
                    const userRole = auth.getUserRole();

                    console.log('User authenticated:', user?.email);
                    console.log('User role:', userRole);

                    // Set global user for video player
                    // NOTE: Profile UI updates are handled by profile-system.js
                    // Don't update profile dropdown here to avoid conflicts with deletion-countdown-banner
                    if (user) {
                        window.currentUser = user;
                    }
                }
            } else {
                console.log('User not authenticated - viewing as guest');
                // Still allow viewing videos without authentication
            }

            // Continue loading the page regardless of auth status
            console.log('Page initialization complete');
        })();

        // Logout function
        function logout() {
            const auth = window.AuthManager;
            auth.logout();
        }

        // Profile dropdown toggle is now handled by profile-system.js
        // Removed duplicate function to prevent conflicts with deletion-countdown-banner.js

        // Show authentication modal
        function showAuthModal() {
            const modal = document.getElementById('authRequiredModal');
            if (modal) {
                modal.classList.add('active');
            }
        }

        // Redirect to login
        function redirectToLogin() {
            localStorage.setItem('redirectAfterLogin', window.location.href);
            window.location.href = '../index.html';
        }

        // Go back to previous page
        function goBack() {
            window.history.back();
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', function (event) {
            const profileContainer = document.getElementById('profile-container');
            const dropdownMenu = document.getElementById('profile-dropdown-menu');
            const toggleButton = document.getElementById('profile-dropdown-toggle');

            if (profileContainer && !profileContainer.contains(event.target) && dropdownMenu) {
                dropdownMenu.classList.remove('show');
                if (toggleButton) {
                    toggleButton.classList.remove('active');
                }
            }
        });
    