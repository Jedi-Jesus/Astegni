/**
 * Active Role Guard
 * Protects profile pages from being accessed with deactivated roles
 *
 * Usage: Add this script BEFORE page-specific scripts
 * <script src="../js/root/active-role-guard.js"></script>
 */

(async function() {
    'use strict';

    // Configuration
    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
    const ALLOWED_PUBLIC_PAGES = [
        '/index.html',
        '/branch/find-tutors.html',
        '/branch/videos.html',
        '/view-profiles/',  // View other users' profiles
        ''  // Root
    ];

    /**
     * Check if current page is a public page
     */
    function isPublicPage() {
        const currentPath = window.location.pathname;
        return ALLOWED_PUBLIC_PAGES.some(page =>
            currentPath.includes(page) || currentPath === '/' || currentPath === ''
        );
    }

    /**
     * Check if current page is a profile page
     */
    function isProfilePage() {
        return window.location.pathname.includes('/profile-pages/');
    }

    /**
     * Get expected role from current page URL
     */
    function getExpectedRoleFromURL() {
        const path = window.location.pathname;

        if (path.includes('tutor-profile.html')) return 'tutor';
        if (path.includes('student-profile.html')) return 'student';
        if (path.includes('parent-profile.html')) return 'parent';
        if (path.includes('advertiser-profile.html')) return 'advertiser';
        if (path.includes('user-profile.html')) return 'user';

        return null;
    }

    /**
     * Main guard function - checks if user's active role is valid
     */
    async function checkActiveRoleStatus() {
        // Skip check for public pages
        if (isPublicPage()) {
            console.log('[ActiveRoleGuard] Public page - skipping check');
            return;
        }

        // Only check profile pages
        if (!isProfilePage()) {
            console.log('[ActiveRoleGuard] Not a profile page - skipping check');
            return;
        }

        console.log('[ActiveRoleGuard] Checking active role status...');

        // Get token
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (!token) {
            console.warn('[ActiveRoleGuard] No token found - redirecting to index');
            window.location.href = '/index.html';
            return;
        }

        // Get expected role from URL
        const expectedRole = getExpectedRoleFromURL();
        if (!expectedRole) {
            console.warn('[ActiveRoleGuard] Could not determine expected role from URL');
            return;
        }

        console.log('[ActiveRoleGuard] Expected role:', expectedRole);

        try {
            // Check if this role is active
            const response = await fetch(`${API_BASE_URL}/api/my-roles`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('[ActiveRoleGuard] Unauthorized - redirecting to index');
                    localStorage.clear();
                    window.location.href = '/index.html';
                    return;
                }
                throw new Error(`API returned ${response.status}`);
            }

            const data = await response.json();
            const activeRoles = data.user_roles || [];
            const currentActiveRole = data.active_role;

            console.log('[ActiveRoleGuard] Active roles:', activeRoles);
            console.log('[ActiveRoleGuard] Current active_role:', currentActiveRole);

            // Check 1: Is the expected role in the active roles list?
            if (!activeRoles.includes(expectedRole)) {
                console.warn(`[ActiveRoleGuard] Role "${expectedRole}" is NOT in active roles list`);
                console.warn('[ActiveRoleGuard] This role has been deactivated - bouncing to index');

                // Show alert
                alert(`Your ${expectedRole} role has been deactivated. Please select an active role or reactivate this role.`);

                // Redirect to index
                window.location.href = '/index.html';
                return;
            }

            // Check 2: Does current active_role match the page?
            if (currentActiveRole !== expectedRole) {
                console.warn(`[ActiveRoleGuard] Active role (${currentActiveRole}) doesn't match page role (${expectedRole})`);
                console.warn('[ActiveRoleGuard] User is on wrong profile page - bouncing to correct one');

                // Redirect to correct profile page
                if (currentActiveRole && currentActiveRole !== 'null') {
                    const correctPage = `${currentActiveRole}-profile.html`;
                    console.log(`[ActiveRoleGuard] Redirecting to ${correctPage}`);
                    window.location.href = correctPage;
                } else {
                    // No active role - go to index
                    console.warn('[ActiveRoleGuard] No active role - bouncing to index');
                    window.location.href = '/index.html';
                }
                return;
            }

            console.log('[ActiveRoleGuard] ✅ Active role check passed');

        } catch (error) {
            console.error('[ActiveRoleGuard] Error checking role status:', error);
            // Don't block on error - let page load but log the issue
        }
    }

    // Run the check immediately
    checkActiveRoleStatus();

    // Also expose for manual checks
    window.ActiveRoleGuard = {
        check: checkActiveRoleStatus,
        isPublicPage,
        isProfilePage,
        getExpectedRoleFromURL
    };

    console.log('[ActiveRoleGuard] Initialized');
})();
