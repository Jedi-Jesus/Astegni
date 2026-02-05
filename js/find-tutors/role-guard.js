/**
 * Role Guard for Find Tutors Page
 *
 * Ensures only students, parents, and users can access the find-tutors page.
 * Redirects or shows modal for unauthorized users.
 */

(function() {
    'use strict';

    const ALLOWED_ROLES = ['student', 'parent', 'user'];
    const REDIRECT_URL = '../index.html';

    // Cache for active roles to avoid multiple API calls
    let cachedActiveRoles = null;

    /**
     * Fetch active roles from backend API
     * This only returns roles that are not deactivated
     * @returns {Promise<Array<string>>} Array of active role names
     */
    async function fetchActiveRoles() {
        if (cachedActiveRoles !== null) {
            console.log('[RoleGuard] Using cached active roles:', cachedActiveRoles);
            return cachedActiveRoles;
        }

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

        if (!token) {
            console.log('[RoleGuard] No token available for fetching active roles');
            return [];
        }

        try {
            console.log('[RoleGuard] Fetching active roles from /api/my-roles...');
            const response = await fetch(`${API_BASE_URL}/api/my-roles`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                cachedActiveRoles = data.user_roles || [];
                console.log('[RoleGuard] ✅ Fetched active roles:', cachedActiveRoles);
                return cachedActiveRoles;
            } else {
                console.error('[RoleGuard] Failed to fetch active roles:', response.status);
                return [];
            }
        } catch (error) {
            console.error('[RoleGuard] Error fetching active roles:', error);
            return [];
        }
    }

    /**
     * Check if user has permission to access find-tutors page
     * @returns {Promise<boolean>} True if user has permission, false otherwise
     */
    async function checkAccess() {
        console.log('[RoleGuard] Checking access for find-tutors page...');

        // Get user from localStorage
        const userStr = localStorage.getItem('currentUser');
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');

        // If no token, user is not logged in - redirect to home
        if (!token) {
            console.log('[RoleGuard] ❌ No token found - user not logged in');
            showAuthRequiredModal();
            return false;
        }

        // If no user data, try to parse from token or redirect
        if (!userStr) {
            console.log('[RoleGuard] ❌ No user data found');
            showAuthRequiredModal();
            return false;
        }

        let user;
        try {
            user = JSON.parse(userStr);
        } catch (e) {
            console.error('[RoleGuard] ❌ Failed to parse user data:', e);
            showAuthRequiredModal();
            return false;
        }

        // CRITICAL: Get active role - check multiple properties for compatibility
        // Priority: user.active_role > user.role > localStorage.userRole
        let activeRole = user.active_role || user.role || localStorage.getItem('userRole');

        console.log('[RoleGuard] Debug Info:');
        console.log('  - user.active_role:', user.active_role);
        console.log('  - user.role:', user.role);
        console.log('  - localStorage.userRole:', localStorage.getItem('userRole'));
        console.log('  - Resolved activeRole:', activeRole);
        console.log('  - user.roles array:', user.roles);
        console.log('  - ALLOWED_ROLES:', ALLOWED_ROLES);

        // CRITICAL FIX 1: Block access if active_role is null, undefined, or empty string
        if (!activeRole || activeRole === 'null' || activeRole === 'undefined' || activeRole.trim() === '') {
            console.log('[RoleGuard] ❌ No active role selected (null/undefined/empty)');

            // Fetch ACTIVE roles from backend (filters out deactivated roles)
            const activeRoles = await fetchActiveRoles();
            console.log('[RoleGuard] Active roles from API:', activeRoles);

            // Check if user has any allowed AND active roles they can switch to
            if (activeRoles && activeRoles.length > 0) {
                const hasAllowedRole = activeRoles.some(role =>
                    ALLOWED_ROLES.includes(role.toLowerCase())
                );

                if (hasAllowedRole) {
                    console.log('[RoleGuard] ⚠️ User has active allowed roles - showing switch modal');
                    showRoleSwitchRequiredModal(activeRoles);
                    return false;
                } else {
                    console.log('[RoleGuard] ❌ User has no active allowed roles - showing access denied');
                    showAccessDeniedModal(null);
                    return false;
                }
            } else {
                console.log('[RoleGuard] ❌ User has no active roles at all - showing access denied');
                showAccessDeniedModal(null);
                return false;
            }
        }

        // CRITICAL FIX 2: Normalize active role to lowercase for comparison
        const normalizedActiveRole = activeRole.toLowerCase();

        // Check if user's active role is in the allowed list
        if (ALLOWED_ROLES.includes(normalizedActiveRole)) {
            console.log('[RoleGuard] ✅ Access granted - user is a', activeRole);
            return true;
        }

        // CRITICAL FIX 3: Active role is NOT in allowed list
        console.log('[RoleGuard] ❌ Active role "' + activeRole + '" not in allowed list:', ALLOWED_ROLES);

        // Fetch ACTIVE roles from backend (filters out deactivated roles)
        const activeRoles = await fetchActiveRoles();
        console.log('[RoleGuard] Active roles from API:', activeRoles);

        // Check if user has any allowed AND active role that they can switch to
        if (activeRoles && activeRoles.length > 0) {
            const hasAllowedRole = activeRoles.some(role =>
                ALLOWED_ROLES.includes(role.toLowerCase())
            );

            if (hasAllowedRole) {
                console.log('[RoleGuard] ⚠️ User has active allowed role but currently as "' + activeRole + '" - showing switch modal');
                showRoleSwitchRequiredModal(activeRoles);
                return false;
            }
        }

        // User doesn't have any active allowed role at all
        console.log('[RoleGuard] ❌ Access denied - user has no active student/parent/user role');
        showAccessDeniedModal(activeRole);
        return false;
    }

    /**
     * Show authentication required modal
     */
    function showAuthRequiredModal() {
        const modal = document.getElementById('authRequiredModal');
        if (modal) {
            const message = document.getElementById('authModalMessage');
            if (message) {
                message.textContent = 'Please login as a Student, Parent, or User to access the tutor marketplace.';
            }
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        } else {
            // Fallback to simple redirect if modal not available
            alert('Please login as a Student, Parent, or User to access the tutor marketplace.');
            setTimeout(() => {
                window.location.href = REDIRECT_URL;
            }, 100);
        }
    }

    /**
     * Show role switch required modal (for users who need to switch to an allowed role)
     */
    function showRoleSwitchRequiredModal(userRoles) {
        console.log('[RoleGuard] Showing role switch required modal for roles:', userRoles);

        // Filter to only show allowed roles
        const allowedUserRoles = userRoles.filter(role =>
            ALLOWED_ROLES.includes(role.toLowerCase())
        );

        if (allowedUserRoles.length === 0) {
            // No allowed roles - show access denied instead
            showAccessDeniedModal(null);
            return;
        }

        // Create a simple modal dynamically
        const existingModal = document.getElementById('roleSwitchRequiredModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div id="roleSwitchRequiredModal" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50" style="display: flex;">
                <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
                    <div class="text-center mb-6">
                        <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                            <svg class="h-10 w-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">Role Switch Required</h3>
                        <p class="text-gray-600">You need to be a Student, Parent, or User to access the tutor marketplace.</p>
                    </div>
                    <div class="bg-blue-50 rounded-xl p-4 mb-6">
                        <p class="text-sm text-blue-800 text-center">
                            Please switch to your <strong>${allowedUserRoles.join(' or ')}</strong> role to continue.
                        </p>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="goBackToPreviousPage()" class="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
                            Go Back
                        </button>
                        <button onclick="switchRoleAndRefresh('${allowedUserRoles[0]}')" class="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl">
                            Switch to ${allowedUserRoles[0].charAt(0).toUpperCase() + allowedUserRoles[0].slice(1)}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    /**
     * Show access denied modal for users with wrong role
     */
    async function showAccessDeniedModal(currentRole) {
        // Try to load the modal if not already in DOM
        let modal = document.getElementById('roleAccessDeniedModal');

        if (!modal) {
            console.log('[RoleGuard] Loading role access denied modal...');
            try {
                const response = await fetch('../modals/common-modals/role-access-denied-modal.html');
                if (response.ok) {
                    const html = await response.text();
                    document.body.insertAdjacentHTML('beforeend', html);
                    modal = document.getElementById('roleAccessDeniedModal');
                } else {
                    throw new Error('Failed to load modal');
                }
            } catch (error) {
                console.error('[RoleGuard] Failed to load modal, using fallback:', error);
                showFallbackAccessDenied(currentRole);
                return;
            }
        }

        // Get user data to check if they have student/parent roles
        const userStr = localStorage.getItem('currentUser');
        let user = null;
        try {
            user = JSON.parse(userStr);
        } catch (e) {
            console.error('[RoleGuard] Failed to parse user:', e);
        }

        // Check if user has student or parent in their roles array
        const hasAllowedRole = user && user.roles && user.roles.some(role =>
            ALLOWED_ROLES.includes(role.toLowerCase())
        );
        const allowedUserRoles = hasAllowedRole
            ? user.roles.filter(role => ALLOWED_ROLES.includes(role.toLowerCase()))
            : [];

        // Populate modal content
        const titleEl = document.getElementById('roleAccessDeniedTitle');
        const messageEl = document.getElementById('roleAccessDeniedMessage');
        const currentRoleText = document.getElementById('currentRoleText');
        const suggestionEl = document.getElementById('roleAccessDeniedSuggestion');
        const actionsEl = document.getElementById('roleAccessDeniedActions');

        if (titleEl) titleEl.textContent = 'Access Restricted';
        if (messageEl) messageEl.textContent = 'The tutor marketplace is only accessible to students, parents, and users.';
        if (currentRoleText) currentRoleText.textContent = currentRole || 'Unknown';

        // Set suggestion and actions based on whether user has the right role
        if (hasAllowedRole) {
            // User HAS student/parent role but it's not active - show switch option
            if (suggestionEl) {
                suggestionEl.innerHTML = `Please switch to your ${allowedUserRoles.join(' or ')} role to access this page.`;
            }

            if (actionsEl) {
                actionsEl.innerHTML = `
                    <button onclick="goBackToPreviousPage()"
                        class="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
                        Go Back
                    </button>
                    <button onclick="switchRoleAndRefresh('${allowedUserRoles[0]}')"
                        class="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                        </svg>
                        <span>Switch to ${allowedUserRoles[0].charAt(0).toUpperCase() + allowedUserRoles[0].slice(1)}</span>
                    </button>
                `;
            }
        } else {
            // User does NOT have student/parent/user role - show add role option
            if (suggestionEl) {
                suggestionEl.innerHTML = 'If you are a student, parent, or user, please add that role to your account.';
            }

            if (actionsEl) {
                actionsEl.innerHTML = `
                    <button onclick="goBackToPreviousPage()"
                        class="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
                        Go Back
                    </button>
                    <button onclick="openAddRoleModalFromGuard()"
                        class="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        <span>Add Role</span>
                    </button>
                `;
            }
        }

        // Show modal
        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        console.log('[RoleGuard] Access denied modal displayed');
    }

    /**
     * Fallback modal using alert if HTML modal fails to load
     */
    function showFallbackAccessDenied(currentRole) {
        const message = currentRole
            ? `The tutor marketplace is only accessible to students, parents, and users. You are currently logged in as a ${currentRole}.`
            : 'The tutor marketplace is only accessible to students, parents, and users.';

        alert(message);
        goBackToPreviousPage();
    }

    // Global helper functions
    window.goBackToPreviousPage = function() {
        console.log('[RoleGuard] Going back to previous page');
        closeRoleAccessDeniedModal();

        // Use document.referrer to go back to where they came from
        if (document.referrer && document.referrer !== window.location.href) {
            window.location.href = document.referrer;
        } else if (window.history.length > 1) {
            window.history.back();
        } else {
            // Fallback to home page
            window.location.href = REDIRECT_URL;
        }
    };

    window.closeRoleAccessDeniedModal = function(event) {
        // If event exists and target is not the overlay, don't close
        if (event && event.target !== event.currentTarget) {
            return;
        }

        const modal = document.getElementById('roleAccessDeniedModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    };

    window.openAddRoleModalFromGuard = async function() {
        console.log('[RoleGuard] 🎯 Opening add role modal from guard...');

        // Close the role access denied modal first
        closeRoleAccessDeniedModal();

        // Wait a moment for the modal to close and DOM to settle
        await new Promise(resolve => setTimeout(resolve, 350));

        // Try to use the global function if available
        if (typeof window.openAddRoleModal === 'function') {
            console.log('[RoleGuard] ✅ Calling window.openAddRoleModal()');
            await window.openAddRoleModal();
            console.log('[RoleGuard] ✅ Modal opened successfully via window function');
        } else {
            // Fallback: open modal directly
            console.warn('[RoleGuard] ⚠️ window.openAddRoleModal not found, opening modal directly');

            const modal = document.getElementById('add-role-modal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('show', 'active');
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
                console.log('[RoleGuard] ✅ Modal opened directly');
            } else {
                console.error('[RoleGuard] ❌ Add-role modal not found in DOM');
                alert('Unable to open Add Role modal. Please refresh the page.');
            }
        }
    };

    window.switchRoleAndRefresh = async function(role) {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

            const response = await fetch(`${API_BASE_URL}/api/switch-role`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: role })
            });

            if (response.ok) {
                const data = await response.json();
                // Update localStorage
                localStorage.setItem('userRole', role);

                // Update currentUser object
                const userStr = localStorage.getItem('currentUser');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    user.active_role = role;
                    localStorage.setItem('currentUser', JSON.stringify(user));
                }

                // Remove modal and reload page
                const modal = document.getElementById('roleSwitchRequiredModal');
                if (modal) modal.remove();

                window.location.reload();
            } else {
                throw new Error('Failed to switch role');
            }
        } catch (error) {
            console.error('[RoleGuard] Error switching role:', error);
            alert('Failed to switch role. Please try again or use the profile dropdown menu.');
        }
    };

    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('roleAccessDeniedModal');
            if (modal && !modal.classList.contains('hidden')) {
                closeRoleAccessDeniedModal();
            }
        }
    });

    // Initialize role guard
    function init() {
        console.log('[RoleGuard] Initializing...');

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', performAccessCheck);
        } else {
            // DOM already loaded, check after auth initializes
            performAccessCheck();
        }
    }

    function performAccessCheck() {
        console.log('[RoleGuard] Performing access check...');
        console.log('[RoleGuard] Debug - checking sessionStorage and localStorage:');
        console.log('  - sessionStorage.role_switch_in_progress:', sessionStorage.getItem('role_switch_in_progress'));
        console.log('  - sessionStorage.target_role:', sessionStorage.getItem('target_role'));
        console.log('  - localStorage.userRole:', localStorage.getItem('userRole'));
        console.log('  - localStorage.token:', localStorage.getItem('token') ? 'exists' : 'missing');
        console.log('  - localStorage.currentUser:', localStorage.getItem('currentUser') ? 'exists' : 'missing');

        // CRITICAL FIX: Check if role switch is in progress
        const switchInProgress = sessionStorage.getItem('role_switch_in_progress');
        const targetRole = sessionStorage.getItem('target_role');

        if (switchInProgress === 'true' && targetRole) {
            console.log('[RoleGuard] Role switch in progress to:', targetRole);

            // Clear the flags immediately to prevent interference
            sessionStorage.removeItem('role_switch_in_progress');
            sessionStorage.removeItem('target_role');

            // Check if target role is allowed for this page
            if (ALLOWED_ROLES.includes(targetRole.toLowerCase())) {
                console.log('[RoleGuard] ✅ Target role is allowed - page can display');
                // Allow page to load - profile-system will update the UI
                return;
            } else {
                console.log('[RoleGuard] ❌ Target role not allowed for this page');
                // Fall through to normal access check
            }
        }

        // CRITICAL FIX: Wait for auth.js to fully initialize and restore session
        // This prevents checking stale localStorage data before the API call completes
        let checkAttempts = 0;
        const maxAttempts = 30; // 30 attempts * 100ms = 3 seconds max wait

        const waitForAuthAndCheck = () => {
            checkAttempts++;
            console.log(`[RoleGuard] Auth check attempt ${checkAttempts}/${maxAttempts}`);

            // Check if we have fresh user data (either from API or valid cache)
            const userStr = localStorage.getItem('currentUser');
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');

            // If no token, user is definitely not logged in - proceed with check
            if (!token) {
                console.log('[RoleGuard] No token found - proceeding with access check');
                performFinalAccessCheck();
                return;
            }

            // If we have both token and user data, proceed
            if (token && userStr) {
                try {
                    const user = JSON.parse(userStr);
                    // Verify the user object has the required fields
                    if (user && user.id && ('active_role' in user || 'role' in user || 'roles' in user)) {
                        console.log('[RoleGuard] Valid user data found - proceeding with access check');
                        performFinalAccessCheck();
                        return;
                    }
                } catch (e) {
                    console.error('[RoleGuard] Failed to parse user data:', e);
                }
            }

            // If we haven't found valid data yet and haven't exceeded max attempts, wait and retry
            if (checkAttempts < maxAttempts) {
                console.log('[RoleGuard] Waiting for auth to initialize... retrying in 100ms');
                setTimeout(waitForAuthAndCheck, 100);
            } else {
                console.warn('[RoleGuard] Max wait time exceeded - proceeding with current data');
                performFinalAccessCheck();
            }
        };

        // Start the auth wait loop
        waitForAuthAndCheck();
    }

    async function performFinalAccessCheck() {
        console.log('[RoleGuard] Performing final access check...');

        const hasAccess = await checkAccess();

        if (!hasAccess) {
            console.log('[RoleGuard] ❌ Access denied - hiding page content');

            // Hide main content
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.style.display = 'none';
            }

            // Hide sidebar
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.style.display = 'none';
            }

            // Optionally hide footer
            const footer = document.getElementById('footer');
            if (footer) {
                footer.style.display = 'none';
            }
        } else {
            console.log('[RoleGuard] ✅ Access granted - page can display normally');
        }
    }

    // Start initialization
    init();

})();
