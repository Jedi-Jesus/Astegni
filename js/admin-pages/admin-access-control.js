/**
 * Admin Access Control - Department-based Page Protection
 * Ensures admins can only access pages for their assigned departments
 */

(function() {
    'use strict';

    const API_BASE_URL = 'https://api.astegni.com';

    /**
     * Page to department mapping
     * Each page requires specific department access
     */
    const PAGE_DEPARTMENT_MAP = {
        'manage-courses.html': 'manage-courses',
        'manage-tutor-documents.html': 'manage-tutor-documents',
        'manage-system-settings.html': 'manage-system-settings',
        'manage-schools.html': 'manage-schools',
        'manage-campaigns.html': 'manage-campaigns',
        'manage-contents.html': 'manage-contents',
        'manage-customers.html': 'manage-customers'
    };

    /**
     * Get current page filename
     */
    function getCurrentPage() {
        const path = window.location.pathname;
        const pageName = path.substring(path.lastIndexOf('/') + 1);
        return pageName;
    }

    /**
     * Check if admin has access to current page
     */
    async function checkPageAccess() {
        const currentPage = getCurrentPage();
        const requiredDepartment = PAGE_DEPARTMENT_MAP[currentPage];

        // If page doesn't require specific department access, allow
        if (!requiredDepartment) {
            console.log('✅ Page does not require department-specific access');
            return true;
        }

        console.log(`🔒 Checking access for page: ${currentPage}`);
        console.log(`📋 Required department: ${requiredDepartment}`);

        try {
            // Get admin profile from API
            const adminId = getAdminIdFromToken();
            if (!adminId) {
                console.error('❌ No admin ID found in token');
                redirectToLogin('No authentication token found');
                return false;
            }

            const response = await fetch(`${API_BASE_URL}/api/admin/profile/${adminId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch admin profile');
            }

            const profile = await response.json();

            // Check if admin has the required department
            const departments = profile.departments || [];
            console.log(`👤 Admin departments: ${departments.join(', ')}`);

            if (departments.includes(requiredDepartment)) {
                console.log(`✅ Access granted to ${currentPage}`);
                return true;
            } else {
                console.error(`❌ Access denied - Admin does not have ${requiredDepartment} department`);
                redirectToAccessDenied(requiredDepartment, departments);
                return false;
            }

        } catch (error) {
            console.error('❌ Error checking page access:', error);
            redirectToLogin('Authentication error');
            return false;
        }
    }

    /**
     * Get admin ID from JWT token
     */
    function getAdminIdFromToken() {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');

        if (!token) {
            return null;
        }

        try {
            // Decode JWT token (simple base64 decode)
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const payload = JSON.parse(jsonPayload);
            return payload.sub || payload.user_id || payload.id || 1; // Fallback to 1 for testing

        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }

    /**
     * Redirect to login page
     */
    function redirectToLogin(reason) {
        alert(`Authentication Error: ${reason}\n\nPlease log in to continue.`);
        localStorage.clear();
        window.location.href = 'index.html';
    }

    /**
     * Redirect to access denied page
     */
    function redirectToAccessDenied(requiredDept, userDepts) {
        const message = `ACCESS DENIED\n\n` +
            `This page requires "${requiredDept}" department access.\n\n` +
            `Your departments: ${userDepts.length > 0 ? userDepts.join(', ') : 'None'}\n\n` +
            `Please contact your system administrator if you believe this is an error.`;

        alert(message);

        // Redirect to admin index page
        window.location.href = 'index.html';
    }

    /**
     * Initialize access control on page load
     */
    async function initAccessControl() {
        console.log('🔐 Initializing admin access control...');

        const hasAccess = await checkPageAccess();

        if (!hasAccess) {
            // Access check failed, page will redirect
            console.log('🚫 Access control check failed');
        } else {
            console.log('✅ Access control check passed');
        }
    }

    // Run access control check immediately when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAccessControl);
    } else {
        // DOM already loaded
        initAccessControl();
    }

    // Export for testing
    window.AdminAccessControl = {
        checkPageAccess,
        getCurrentPage,
        getAdminIdFromToken
    };

})();
