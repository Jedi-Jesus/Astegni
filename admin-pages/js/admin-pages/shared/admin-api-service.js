/**
 * Admin API Service
 * Centralized API service for admin pages that reads from astegni_admin_db
 *
 * All admin-specific data (profiles, reviews, credentials, manage-* tables)
 * are now stored in astegni_admin_db and accessed via /api/admin-db/* endpoints
 */

(function() {
    'use strict';

    // API Base URL - uses same base as other endpoints
    // Check for admin config first (for dual-server setup), then fallback
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_BASE_URL = (window.ADMIN_API_CONFIG && window.ADMIN_API_CONFIG.API_BASE_URL)
        || window.API_BASE_URL
        || (isLocalhost ? 'http://localhost:8000' : 'https://api.astegni.com');

    /**
     * Admin Database API Service
     * Provides methods to interact with astegni_admin_db
     */
    const AdminDBService = {
        // ============================================================
        // ADMIN PROFILE ENDPOINTS
        // ============================================================

        /**
         * Get admin profile by ID
         * @param {number} adminId - Admin ID
         * @returns {Promise<Object>} - Admin profile data
         */
        async getAdminProfile(adminId) {
            const response = await fetch(`${API_BASE_URL}/api/admin-db/profile/${adminId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch admin profile: ${response.status}`);
            }
            return response.json();
        },

        /**
         * Get admin profile by email
         * @param {string} email - Admin email
         * @returns {Promise<Object>} - Admin profile data
         */
        async getAdminProfileByEmail(email) {
            const response = await fetch(`${API_BASE_URL}/api/admin-db/profile/by-email/${encodeURIComponent(email)}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch admin profile: ${response.status}`);
            }
            return response.json();
        },

        /**
         * Update admin profile
         * @param {number} adminId - Admin ID
         * @param {Object} data - Profile data to update
         * @returns {Promise<Object>} - Updated profile data
         */
        async updateAdminProfile(adminId, data) {
            const response = await fetch(`${API_BASE_URL}/api/admin-db/profile/${adminId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`Failed to update admin profile: ${response.status}`);
            }
            return response.json();
        },

        // ============================================================
        // ADMIN REVIEWS ENDPOINTS
        // ============================================================

        /**
         * Get admin reviews
         * @param {Object} options - Filter options
         * @param {number} options.adminId - Admin ID (optional)
         * @param {string} options.department - Department (optional)
         * @param {number} options.limit - Max results (default 50)
         * @returns {Promise<Array>} - Array of reviews
         */
        async getAdminReviews({ adminId, department, limit = 50 } = {}) {
            const params = new URLSearchParams();
            if (adminId) params.append('admin_id', adminId);
            if (department) params.append('department', department);
            params.append('limit', limit);

            const response = await fetch(`${API_BASE_URL}/api/admin-db/reviews?${params}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch admin reviews: ${response.status}`);
            }
            return response.json();
        },

        /**
         * Get recent admin reviews
         * @param {Object} options - Filter options
         * @returns {Promise<Array>} - Array of recent reviews
         */
        async getRecentAdminReviews({ adminId, department, limit = 3 } = {}) {
            const params = new URLSearchParams();
            if (adminId) params.append('admin_id', adminId);
            if (department) params.append('department', department);
            params.append('limit', limit);

            const response = await fetch(`${API_BASE_URL}/api/admin-db/reviews/recent?${params}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch recent reviews: ${response.status}`);
            }
            return response.json();
        },

        /**
         * Create admin review
         * @param {Object} data - Review data
         * @returns {Promise<Object>} - Created review
         */
        async createAdminReview(data) {
            const response = await fetch(`${API_BASE_URL}/api/admin-db/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`Failed to create admin review: ${response.status}`);
            }
            return response.json();
        },

        // ============================================================
        // MANAGE PROFILE ENDPOINTS (manage_*_profile tables)
        // ============================================================

        /**
         * Get management profile data
         * @param {string} tableName - Table name (e.g., 'manage_campaigns_profile')
         * @param {number} adminId - Admin ID (optional, returns all if not provided)
         * @returns {Promise<Object|Array>} - Profile data
         */
        async getManageProfile(tableName, adminId = null) {
            const url = adminId
                ? `${API_BASE_URL}/api/admin-db/manage/${tableName}?admin_id=${adminId}`
                : `${API_BASE_URL}/api/admin-db/manage/${tableName}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${tableName}: ${response.status}`);
            }
            return response.json();
        },

        /**
         * Get management profile by email
         * @param {string} tableName - Table name
         * @param {string} email - Admin email
         * @returns {Promise<Object>} - Profile data
         */
        async getManageProfileByEmail(tableName, email) {
            const response = await fetch(
                `${API_BASE_URL}/api/admin-db/manage/${tableName}/by-email/${encodeURIComponent(email)}`
            );
            if (!response.ok) {
                throw new Error(`Failed to fetch ${tableName}: ${response.status}`);
            }
            return response.json();
        },

        /**
         * Update management profile
         * @param {string} tableName - Table name
         * @param {number} profileId - Profile ID
         * @param {Object} data - Data to update
         * @returns {Promise<Object>} - Updated profile
         */
        async updateManageProfile(tableName, profileId, data) {
            const response = await fetch(`${API_BASE_URL}/api/admin-db/manage/${tableName}/${profileId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`Failed to update ${tableName}: ${response.status}`);
            }
            return response.json();
        },

        // ============================================================
        // ADMIN CREDENTIALS ENDPOINTS
        // ============================================================

        /**
         * Get admin credentials
         * @param {number} adminId - Admin ID (optional)
         * @param {number} limit - Max results
         * @returns {Promise<Array>} - Array of credentials
         */
        async getAdminCredentials(adminId = null, limit = 50) {
            const params = new URLSearchParams();
            if (adminId) params.append('admin_id', adminId);
            params.append('limit', limit);

            const response = await fetch(`${API_BASE_URL}/api/admin-db/credentials?${params}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch admin credentials: ${response.status}`);
            }
            return response.json();
        },

        /**
         * Create admin credential
         * @param {Object} data - Credential data
         * @returns {Promise<Object>} - Created credential
         */
        async createAdminCredential(data) {
            const response = await fetch(`${API_BASE_URL}/api/admin-db/credentials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`Failed to create admin credential: ${response.status}`);
            }
            return response.json();
        },

        // ============================================================
        // ADMIN STATS ENDPOINTS
        // ============================================================

        /**
         * Get admin database statistics
         * @returns {Promise<Object>} - Stats for all tables
         */
        async getAdminStats() {
            const response = await fetch(`${API_BASE_URL}/api/admin-db/stats`);
            if (!response.ok) {
                throw new Error(`Failed to fetch admin stats: ${response.status}`);
            }
            return response.json();
        },

        /**
         * Get admin profile stats
         * @param {number} adminId - Admin ID
         * @returns {Promise<Object>} - Profile stats
         */
        async getAdminProfileStats(adminId) {
            const response = await fetch(`${API_BASE_URL}/api/admin-db/profile-stats/${adminId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch profile stats: ${response.status}`);
            }
            return response.json();
        },

        // ============================================================
        // HELPER METHODS
        // ============================================================

        /**
         * Get campaigns profile (shorthand)
         */
        async getCampaignsProfile(adminId) {
            return this.getManageProfile('manage_campaigns_profile', adminId);
        },

        /**
         * Get contents profile (shorthand)
         */
        async getContentsProfile(adminId) {
            return this.getManageProfile('manage_contents_profile', adminId);
        },

        /**
         * Get courses profile (shorthand)
         */
        async getCoursesProfile(adminId) {
            return this.getManageProfile('manage_courses_profile', adminId);
        },

        /**
         * Get customers profile (shorthand)
         */
        async getCustomersProfile(adminId) {
            return this.getManageProfile('manage_customers_profile', adminId);
        },

        /**
         * Get schools profile (shorthand)
         */
        async getSchoolsProfile(adminId) {
            return this.getManageProfile('manage_schools_profile', adminId);
        },

        /**
         * Get system settings profile (shorthand)
         */
        async getSystemSettingsProfile(adminId) {
            return this.getManageProfile('manage_system_settings_profile', adminId);
        },

        /**
         * Get tutors profile (shorthand)
         */
        async getTutorsProfile(adminId) {
            return this.getManageProfile('manage_tutors_profile', adminId);
        },

        /**
         * Get uploads data (shorthand)
         */
        async getUploads(adminId) {
            return this.getManageProfile('manage_uploads', adminId);
        }
    };

    // Make available globally
    window.AdminDBService = AdminDBService;

    console.log('Admin DB Service initialized - using astegni_admin_db');

})();
