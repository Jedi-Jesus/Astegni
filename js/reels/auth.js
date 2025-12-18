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
                        const response = await fetch('http://localhost:8000/api/me', {
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

                    // Update UI with user info
                    if (user) {
                        const profilePic = document.getElementById('profile-pic');
                        const profileName = document.getElementById('profile-name');

                        if (profilePic && user.profile_picture) {
                            profilePic.src = user.profile_picture;
                        } else if (profilePic) {
                            // Use default avatar
                            profilePic.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="16" fill="%23667eea"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="14" font-family="Arial"%3EU%3C/text%3E%3C/svg%3E';
                        }

                        if (profileName) {
                            profileName.textContent = user.first_name || user.name?.split(' ')[0] || "User";
                        }

                        // Show profile container
                        const profileContainer = document.getElementById('profile-container');
                        if (profileContainer) {
                            profileContainer.classList.remove('hidden');
                        }

                        // Set global user for video player
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

        // Profile dropdown toggle
        function toggleProfileDropdown() {
            const dropdownMenu = document.getElementById('profile-dropdown-menu');
            const toggleButton = document.getElementById('profile-dropdown-toggle');
            if (dropdownMenu) {
                dropdownMenu.classList.toggle('show');
                // Also toggle active class on button for arrow animation
                if (toggleButton) {
                    toggleButton.classList.toggle('active');
                }
            }
        }
        // Expose to global scope for onclick handlers
        window.toggleProfileDropdown = toggleProfileDropdown;

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
    