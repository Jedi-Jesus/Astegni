/**
 * Admin Pages Authentication Helpers
 * Centralized token and API management for all admin pages
 *
 * USAGE: Include this file AFTER api-config.js in your HTML
 */

(function() {
    'use strict';

    /**
     * Get API Base URL
     * Uses global config set by api-config.js
     */
    window.getApiBaseUrl = function() {
        return window.API_BASE_URL ||
               window.ADMIN_API_CONFIG?.API_BASE_URL ||
               'http://localhost:8000';
    };

    /**
     * Get auth token
     * Checks all possible localStorage keys used in admin pages
     * Priority: admin-specific tokens first, then fallback to regular tokens
     */
    window.getAuthToken = function() {
        const token = localStorage.getItem('adminToken') ||
                     localStorage.getItem('admin_access_token') ||
                     localStorage.getItem('access_token') ||
                     localStorage.getItem('token');

        // Debug: Log token retrieval
        if (window.location.search.includes('debug=auth')) {
            console.log('[Auth Debug] Token found:', token ? 'Yes (length: ' + token.length + ')' : 'No');
            console.log('[Auth Debug] Token starts with:', token ? token.substring(0, 20) + '...' : 'N/A');
        }

        return token;
    };

    /**
     * Get admin token (alias for getAuthToken for consistency)
     */
    window.getAdminToken = function() {
        return window.getAuthToken();
    };

    /**
     * Get admin session data
     * Returns parsed adminSession from localStorage
     */
    window.getAdminSession = function() {
        const sessionData = localStorage.getItem('adminSession');
        if (sessionData) {
            try {
                return JSON.parse(sessionData);
            } catch (e) {
                console.error('Error parsing admin session:', e);
                return null;
            }
        }
        return null;
    };

    /**
     * Get current admin ID
     * Tries multiple sources: adminSession, currentUser, JWT token
     */
    window.getCurrentAdminId = function() {
        // Method 1: Check adminSession
        const adminSession = window.getAdminSession();
        if (adminSession && adminSession.id) {
            return adminSession.id;
        }

        // Method 2: Check localStorage for currentUser
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.id) {
                    return user.id;
                }
            } catch (e) {
                console.error('Error parsing stored user:', e);
            }
        }

        // Method 3: Try to decode JWT token
        const token = window.getAuthToken();
        if (token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));

                const payload = JSON.parse(jsonPayload);
                if (payload.sub || payload.user_id || payload.id || payload.admin_id) {
                    return payload.sub || payload.user_id || payload.id || payload.admin_id;
                }
            } catch (e) {
                console.error('Error decoding token:', e);
            }
        }

        console.warn('Could not find admin ID');
        return null;
    };

    /**
     * Check if user is authenticated
     */
    window.isAuthenticated = function() {
        const token = window.getAuthToken();
        return !!token;
    };

    /**
     * Make authenticated API request
     * Automatically includes auth token in headers
     *
     * @param {string} endpoint - API endpoint (e.g., '/api/admin/profile')
     * @param {object} options - Fetch options (method, body, etc.)
     * @returns {Promise} - Fetch promise
     */
    window.authFetch = async function(endpoint, options = {}) {
        const token = window.getAuthToken();
        const apiBaseUrl = window.getApiBaseUrl();

        // Build full URL
        const url = endpoint.startsWith('http') ? endpoint : `${apiBaseUrl}${endpoint}`;

        // Merge headers
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add auth token if available
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Make request
        return fetch(url, {
            ...options,
            headers
        });
    };

    /**
     * Logout helper
     * Clears all auth-related data from localStorage
     */
    window.adminLogout = function() {
        // Clear all possible token keys
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('admin_access_token');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('refresh_token');

        // Clear user data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('user');
        localStorage.removeItem('adminSession');

        // Redirect to login
        window.location.href = 'index.html';
    };

    console.log('✅ Admin Auth Helpers loaded');
})();
