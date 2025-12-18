/**
 * Admin Access Control - Department-based Page Protection
 * Ensures admins can only access pages for their assigned departments
 *
 * NOTE: This script uses localStorage for department checks (like auth.js does)
 * instead of making API calls, to avoid issues with localhost/production URLs.
 */

(function() {
    'use strict';

    /**
     * Page to department mapping
     * Each page requires specific department access
     * Value can be a string (single department) or array (multiple departments allowed)
     * NOTE: 'manage-system-settings' department has FULL ACCESS to all pages (super admin)
     */
    const PAGE_DEPARTMENT_MAP = {
        'manage-courses.html': ['manage-courses', 'manage-system-settings'],
        'manage-credentials.html': ['manage-credentials', 'manage-system-settings'],
        'manage-system-settings.html': 'manage-system-settings',
        'manage-schools.html': ['manage-schools', 'manage-system-settings'],
        'manage-campaigns.html': ['manage-campaigns', 'manage-system-settings'],
        'manage-contents.html': ['manage-contents', 'manage-system-settings'],
        'manage-customers.html': ['manage-customers', 'manage-system-settings'],
        'manage-admins.html': ['manage-admins', 'manage-system-settings'],
        'manage-advertisers.html': ['manage-advertisers', 'manage-system-settings']
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
     * Uses localStorage instead of API calls (consistent with auth.js)
     */
    function checkPageAccess() {
        const currentPage = getCurrentPage();
        const requiredDepartments = PAGE_DEPARTMENT_MAP[currentPage];

        // If page doesn't require specific department access, allow
        if (!requiredDepartments) {
            console.log('✅ Page does not require department-specific access');
            return true;
        }

        // Normalize to array for consistent handling
        const allowedDepartments = Array.isArray(requiredDepartments)
            ? requiredDepartments
            : [requiredDepartments];

        console.log(`🔒 Checking access for page: ${currentPage}`);
        console.log(`📋 Allowed departments: ${allowedDepartments.join(', ')}`);

        // Check if user is authenticated
        const isAuthenticated = localStorage.getItem('adminAuth') === 'true';
        if (!isAuthenticated) {
            console.error('❌ User not authenticated');
            redirectToLogin('Please log in to access this page');
            return false;
        }

        // Get admin department from localStorage (same as auth.js does)
        const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
        const adminDepartment = adminUser.department || '';

        // Also check for departments array if available
        const adminDepartments = adminUser.departments || (adminDepartment ? [adminDepartment] : []);

        console.log(`👤 Admin department: ${adminDepartment}`);
        console.log(`👤 Admin departments array: ${adminDepartments.join(', ')}`);

        // Check if admin has at least one of the allowed departments
        const hasAccess = allowedDepartments.some(dept =>
            adminDepartments.includes(dept) || adminDepartment === dept
        );

        if (hasAccess) {
            console.log(`✅ Access granted to ${currentPage}`);
            return true;
        } else {
            console.error(`❌ Access denied - Admin does not have any of: ${allowedDepartments.join(', ')}`);
            redirectToAccessDenied(allowedDepartments, adminDepartments.length > 0 ? adminDepartments : [adminDepartment]);
            return false;
        }
    }

    /**
     * Redirect to login page
     * NOTE: Does NOT clear localStorage - just redirects to login
     */
    function redirectToLogin(reason) {
        alert(`Authentication Required: ${reason}`);
        // Don't clear localStorage - just redirect to index where they can log in
        window.location.href = 'index.html';
    }

    /**
     * Redirect to access denied page
     * @param {string|string[]} requiredDepts - Required department(s) for access
     * @param {string[]} userDepts - User's current departments
     */
    function redirectToAccessDenied(requiredDepts, userDepts) {
        // Normalize to array
        const deptList = Array.isArray(requiredDepts) ? requiredDepts : [requiredDepts];
        const deptDisplay = deptList.length > 1
            ? `one of: "${deptList.join('", "')}"`
            : `"${deptList[0]}"`;

        const message = `ACCESS DENIED\n\n` +
            `This page requires ${deptDisplay} department access.\n\n` +
            `Your departments: ${userDepts.length > 0 ? userDepts.join(', ') : 'None'}\n\n` +
            `Please contact your system administrator if you believe this is an error.`;

        alert(message);

        // Redirect to admin index page (don't clear localStorage - keep them logged in)
        window.location.href = 'index.html';
    }

    /**
     * Initialize access control on page load
     */
    function initAccessControl() {
        console.log('🔐 Initializing admin access control...');

        const hasAccess = checkPageAccess();

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
        getCurrentPage
    };

})();
