class AuthenticationManager {
    constructor() {
        // Debug: Log what window.API_BASE_URL is at initialization time
        console.log('[AuthManager] window.API_BASE_URL at init:', window.API_BASE_URL);
        console.log('[AuthManager] window.ASTEGNI_CONFIG:', window.ASTEGNI_CONFIG);

        this.API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
        this.token = null;
        this.user = null;
        this.isFetchingUserData = false; // Guard to prevent multiple fetches

        console.log('[AuthManager] Using API_BASE_URL:', this.API_BASE_URL);

        // Try to restore session on initialization
        this.restoreSession();
    }

    // ============================================
    //   MASKING UTILITY
    // ============================================
    maskContact(value, type = 'email') {
        if (!value) return '***';

        if (type === 'phone') {
            // Show first 3 digits and last 2 digits, mask the rest
            // Example: +251912345678 -> +25***78
            const cleaned = value.replace(/\s/g, '');
            if (cleaned.length <= 5) return '***';
            const first3 = cleaned.substring(0, 3);
            const last2 = cleaned.substring(cleaned.length - 2);
            return `${first3}${'*'.repeat(cleaned.length - 5)}${last2}`;
        } else {
            // Email: Show first 3 chars and last 2 chars before @, mask the rest
            // Example: johnsmith@gmail.com -> joh***th@gmail.com
            const [localPart, domain] = value.split('@');
            if (!domain) return '***';
            if (localPart.length <= 5) {
                return `***@${domain}`;
            }
            const first3 = localPart.substring(0, 3);
            const last2 = localPart.substring(localPart.length - 2);
            return `${first3}${'*'.repeat(localPart.length - 5)}${last2}@${domain}`;
        }
    }

    // Get primary contact method (returns 'email' or 'phone')
    getPrimaryContact(user) {
        if (!user) return null;
        // Prioritize email if both exist, otherwise use what's available
        if (user.email) return 'email';
        if (user.phone) return 'phone';
        return null;
    }

    // Get masked contact for display
    getMaskedContact(user) {
        if (!user) return '***';
        const contactType = this.getPrimaryContact(user);
        if (!contactType) return '***';

        const value = contactType === 'email' ? user.email : user.phone;
        return this.maskContact(value, contactType);
    }

    // ============================================
    //   SESSION MANAGEMENT
    // ============================================
    async restoreSession() {
        console.log('[AuthManager.restoreSession] Starting session restoration...');

        // Check both 'token' and 'access_token' for compatibility
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const user = localStorage.getItem('currentUser');

        console.log('[AuthManager.restoreSession] Found token:', !!token, 'Found user:', !!user);

        if (token && user) {
            try {
                this.token = token;
                this.user = JSON.parse(user);

                console.log('[AuthManager.restoreSession] Parsed user:', {
                    id: this.user.id,
                    active_role: this.user.active_role,
                    roles: this.user.roles
                });

                // Ensure user has roles array (for backward compatibility)
                if (!this.user.roles && this.user.role) {
                    this.user.roles = [this.user.role];
                }

                // CRITICAL FIX: Check if role switch is in progress (within 10s grace period)
                // This must happen BEFORE syncing from localStorage.userRole
                const switchTimestamp = localStorage.getItem('role_switch_timestamp');
                const targetRole = localStorage.getItem('role_switch_target');

                if (switchTimestamp && targetRole) {
                    const timeSinceSwitch = Date.now() - parseInt(switchTimestamp);
                    const isWithinGracePeriod = timeSinceSwitch < 10000; // 10 seconds

                    console.log('[AuthManager.restoreSession] Role switch detected:', {
                        targetRole: targetRole,
                        timeSinceSwitch: timeSinceSwitch + 'ms',
                        gracePeriodValid: isWithinGracePeriod
                    });

                    if (isWithinGracePeriod) {
                        // FORCE the user object to have the target role (override any stale data)
                        console.log('[AuthManager.restoreSession] ✅ Within grace period - forcing active_role to:', targetRole);
                        this.user.active_role = targetRole;
                        this.user.role = targetRole;
                        // Also ensure localStorage.userRole matches (belt and suspenders)
                        localStorage.setItem('userRole', targetRole);

                        // CRITICAL: Update the currentUser object in localStorage with the new role
                        // This ensures the UI displays the correct profile data
                        localStorage.setItem('currentUser', JSON.stringify(this.user));
                        console.log('[AuthManager.restoreSession] Updated localStorage.currentUser with new role');

                        // Dispatch event to notify profile-system to refresh the UI
                        window.dispatchEvent(new CustomEvent('userRoleUpdated', {
                            detail: { role: targetRole, user: this.user }
                        }));
                        console.log('[AuthManager.restoreSession] Dispatched userRoleUpdated event');

                        console.log('[AuthManager.restoreSession] Role switch applied - user now has active_role:', this.user.active_role);

                        // Don't clear the flags here - let them expire naturally or be cleared by page-specific logic
                        // This ensures any subsequent checks within the grace period still pass
                    } else {
                        // Grace period expired - clear the flags
                        console.log('[AuthManager.restoreSession] ⏱️ Grace period expired - clearing flags');
                        localStorage.removeItem('role_switch_timestamp');
                        localStorage.removeItem('role_switch_target');

                        // Fall through to normal userRole sync below
                    }
                }

                // FIX: ALWAYS sync active_role from localStorage.userRole (source of truth)
                // This is critical for role switching - localStorage.userRole is updated first
                // BUT: Only do this if we're NOT in a grace period (already handled above)
                const storedUserRole = localStorage.getItem('userRole');
                if (storedUserRole && storedUserRole !== 'undefined' && storedUserRole !== 'null') {
                    // ALWAYS override with latest userRole from localStorage
                    // Don't check if active_role exists - always sync from source of truth
                    console.log('[AuthManager.restoreSession] Syncing active_role from userRole:', storedUserRole);
                    console.log('[AuthManager.restoreSession] Previous active_role:', this.user.active_role);
                    this.user.active_role = storedUserRole;
                    this.user.role = storedUserRole; // Also sync the role field
                } else {
                    // localStorage.userRole doesn't exist - need to establish it
                    console.log('[AuthManager.restoreSession] No localStorage.userRole found, establishing from user object...');

                    // Try to get active_role from currentUser object (already loaded from localStorage)
                    if (this.user.active_role && this.user.active_role !== 'undefined') {
                        // User object has active_role - sync it to localStorage
                        console.log('[AuthManager.restoreSession] Using user.active_role:', this.user.active_role);
                        localStorage.setItem('userRole', this.user.active_role);
                    } else if (this.user.role && this.user.role !== 'undefined') {
                        // Fallback to user.role
                        console.log('[AuthManager.restoreSession] Using user.role:', this.user.role);
                        this.user.active_role = this.user.role;
                        localStorage.setItem('userRole', this.user.role);
                    } else if (this.user.roles && Array.isArray(this.user.roles) && this.user.roles.length > 0) {
                        // Last resort: use first role in array
                        console.log('[AuthManager.restoreSession] Using first role from roles array:', this.user.roles[0]);
                        this.user.active_role = this.user.roles[0];
                        this.user.role = this.user.roles[0];
                        localStorage.setItem('userRole', this.user.roles[0]);
                    } else {
                        console.error('[AuthManager.restoreSession] NO ROLE FOUND! User object has no role information!');
                    }
                }

                // CRITICAL FIX: If role_ids is missing, fetch fresh user data from /api/me
                // But don't block - let the page load even if this fails
                if (!this.user.role_ids) {
                    console.log('[AuthManager.restoreSession] role_ids missing, fetching from /api/me...');
                    this.fetchUserData().catch(error => {
                        console.warn('[AuthManager.restoreSession] Failed to fetch user data:', error);
                    });
                }

                // Verify token in background - don't block session restoration
                this.verifyToken().catch(error => {
                    // Silently handle token verification errors
                    // Don't clear auth on network errors - allow offline usage
                });

                console.log('[AuthManager.restoreSession] Session restored successfully');
                return true;
            } catch (error) {
                console.error('[AuthManager.restoreSession] Error parsing user data:', error);
                // Clear corrupted data
                localStorage.removeItem('currentUser');
                this.user = null;
                return false;
            }
        }

        console.log('[AuthManager.restoreSession] No session to restore');
        return false;
    }

    /**
     * Fetch fresh user data from /api/me and update localStorage
     * Used to ensure role_ids and other fields are up-to-date
     */
    async fetchUserData() {
        // Guard: Prevent multiple simultaneous fetches
        if (this.isFetchingUserData) {
            console.log('[AuthManager.fetchUserData] Already fetching, skipping duplicate request');
            return this.user;
        }

        try {
            this.isFetchingUserData = true;

            const response = await fetch(`${this.API_BASE_URL}/api/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch user data: ${response.status}`);
            }

            const userData = await response.json();
            console.log('[AuthManager.fetchUserData] Fresh user data received:', userData);

            // Update user object with fresh data (including role_ids)
            this.user = {
                ...this.user,
                ...userData,
                // Ensure critical fields are preserved/updated
                role_ids: userData.role_ids || this.getRoleIds()
            };

            // Update localStorage
            localStorage.setItem('currentUser', JSON.stringify(this.user));
            console.log('[AuthManager.fetchUserData] Updated localStorage with role_ids:', this.user.role_ids);

            // Dispatch custom event for components that need to react to user data updates
            document.dispatchEvent(new CustomEvent('userDataLoaded', { detail: this.user }));

            return this.user;
        } catch (error) {
            console.error('[AuthManager.fetchUserData] Error:', error);
            throw error;
        } finally {
            this.isFetchingUserData = false;
        }
    }

    // ============================================
    //   API HELPER WITH AUTO-REFRESH
    // ============================================
    async apiCall(endpoint, method = 'GET', body = null, authenticated = false) {
        const headers = {
            'Content-Type': 'application/json',
        };

        // Add authorization header if authenticated
        if (authenticated && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            method,
            headers,
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            let response = await fetch(`${this.API_BASE_URL}${endpoint}`, config);

            // If 401 and authenticated, try to refresh token and retry
            if (response.status === 401 && authenticated && this.token) {
                console.log('[AuthManager.apiCall] Got 401, attempting token refresh...');

                const refreshed = await this.refreshAccessToken();

                if (refreshed) {
                    console.log('[AuthManager.apiCall] Token refreshed, retrying request...');

                    // Update authorization header with new token
                    headers['Authorization'] = `Bearer ${this.token}`;
                    config.headers = headers;

                    // Retry the request with new token
                    response = await fetch(`${this.API_BASE_URL}${endpoint}`, config);
                    console.log('[AuthManager.apiCall] Retry response status:', response.status);
                } else {
                    // Don't auto-logout on refresh failure - might be a network error
                    // The refreshAccessToken method already handles 401 logout internally
                    console.warn('[AuthManager.apiCall] Token refresh failed, but keeping token for retry');
                }
            }

            return response;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    // ============================================
    //   UNIVERSAL FETCH WRAPPER (For all API calls)
    //   USE THIS FOR ALL AUTHENTICATED API CALLS
    // ============================================
    async authenticatedFetch(url, options = {}) {
        // Check if user is logged in - also check localStorage as fallback
        if (!this.token) {
            // Try to get token from localStorage
            const storedToken = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (storedToken) {
                console.log('[AuthManager.authenticatedFetch] Token found in localStorage, restoring...');
                this.token = storedToken;
            } else {
                console.warn('[AuthManager.authenticatedFetch] No token available');
                // DON'T auto-redirect - just throw error and let the calling code handle it
                throw new Error('Not authenticated');
            }
        }

        // Add authorization header
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
            'Authorization': `Bearer ${this.token}`
        };

        try {
            let response = await fetch(url, { ...options, headers });

            // If 401, try to refresh token and retry ONCE
            if (response.status === 401) {
                console.log('[AuthManager.authenticatedFetch] Got 401, attempting token refresh...');

                const refreshed = await this.refreshAccessToken();

                if (refreshed) {
                    console.log('[AuthManager.authenticatedFetch] Token refreshed successfully! Retrying request...');

                    // Update authorization header with new token
                    headers['Authorization'] = `Bearer ${this.token}`;

                    // Retry the request with new token
                    response = await fetch(url, { ...options, headers });
                    console.log('[AuthManager.authenticatedFetch] Retry response status:', response.status);

                    // If still 401 after refresh, DON'T auto-logout
                    // Let the calling code decide what to do
                    if (response.status === 401) {
                        console.error('[AuthManager.authenticatedFetch] Still 401 after refresh');
                    }
                } else {
                    // Don't auto-logout on refresh failure - might be a network error
                    console.warn('[AuthManager.authenticatedFetch] Token refresh failed, but keeping token for retry');
                }
            }

            return response;
        } catch (error) {
            console.error('[AuthManager.authenticatedFetch] Request failed:', error);
            throw error;
        }
    }






    // Update the login method to handle navigation after login
// In auth.js, remove or comment out the automatic navigation in the login method:
async login(email, password) {
    try {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await fetch(`${this.API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();

            // Check if it's account pending deletion (403)
            if (response.status === 403 && error.detail && error.detail.error_code === 'ACCOUNT_PENDING_DELETION') {
                // Return deletion info to frontend
                return {
                    success: false,
                    error: 'ACCOUNT_PENDING_DELETION',
                    deletionInfo: error.detail
                };
            }

            throw new Error(error.detail || 'Login failed');
        }

        const data = await response.json();

        console.log('[AuthManager.login] Login successful, received tokens');
        console.log('[AuthManager.login] Access token length:', data.access_token?.length);
        console.log('[AuthManager.login] Refresh token length:', data.refresh_token?.length);

        // Store all the data
        this.token = data.access_token;
        this.user = data.user;

        const formattedUser = {
            id: data.user.id,
            name: `${data.user.first_name} ${data.user.father_name}`,
            first_name: data.user.first_name,
            father_name: data.user.father_name,
            email: data.user.email,
            phone: data.user.phone,
            role: data.user.active_role,
            roles: data.user.roles,
            active_role: data.user.active_role,
            profile_picture: data.user.profile_picture,
            created_at: data.user.created_at,
            is_active: data.user.is_active,
            email_verified: data.user.email_verified,
            role_ids: data.user.role_ids || {},  // NEW: Include role-specific IDs
            // Add direct accessors for convenience
            student_profile_id: data.user.role_ids?.student,
            tutor_profile_id: data.user.role_ids?.tutor,
            parent_profile_id: data.user.role_ids?.parent,
            advertiser_profile_id: data.user.role_ids?.advertiser,
            location: data.user.location || null,
            country_code: data.user.country_code || null,
            currency: data.user.currency || null,
            is_verified: data.user.is_verified || false,
            kyc_verified: data.user.kyc_verified || false,
            verified: data.user.is_verified || data.user.kyc_verified || false
        };

        // Save to localStorage
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('currentUser', JSON.stringify(formattedUser));
        // Only store userRole if it has a valid value (prevent storing "undefined" string)
        if (data.user.active_role) {
            localStorage.setItem('userRole', data.user.active_role);
        }

        console.log('[AuthManager.login] Tokens saved to localStorage');

        // Test the token immediately
        setTimeout(async () => {
            console.log('[AuthManager.login] Testing token after 1 second...');
            const testResponse = await fetch(`${this.API_BASE_URL}/api/me`, {
                headers: { 'Authorization': `Bearer ${data.access_token}` }
            });
            console.log('[AuthManager.login] Token test result:', testResponse.status);
            if (!testResponse.ok) {
                const error = await testResponse.json();
                console.error('[AuthManager.login] Token already invalid!', error);
            }
        }, 1000);

        // Update global state
        if (window.APP_STATE) {
            window.APP_STATE.isLoggedIn = true;
            window.APP_STATE.currentUser = formattedUser;
            window.APP_STATE.userRole = data.user.active_role;
        }

        // REMOVE THIS LINE - Don't auto-navigate
        // this.navigateToRoleDashboard(data.user.active_role);

        return { success: true, user: formattedUser };

    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

    async register(userData) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    first_name: userData.first_name,
                    father_name: userData.father_name,
                    grandfather_name: userData.grandfather_name,
                    email: userData.email,
                    phone: userData.phone,
                    password: userData.password,
                    role: userData.role || 'student'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Registration failed');
            }

            const data = await response.json();

            // Rest of the code remains the same...
            this.token = data.access_token;
            this.user = data.user;

            const formattedUser = {
                id: data.user.id,
                name: `${data.user.first_name} ${data.user.father_name}`,
                first_name: data.user.first_name,
                father_name: data.user.father_name,
                email: data.user.email,
                phone: data.user.phone,
                role: data.user.active_role,
                roles: data.user.roles,
                profile_picture: data.user.profile_picture,
                created_at: data.user.created_at,
                is_active: data.user.is_active,
                email_verified: data.user.email_verified,
                location: data.user.location || null,
                country_code: data.user.country_code || null,
                currency: data.user.currency || null
            };

            // Save to localStorage
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            localStorage.setItem('currentUser', JSON.stringify(formattedUser));
            // Only store userRole if it has a valid value (prevent storing "undefined" string)
            if (data.user.active_role) {
                localStorage.setItem('userRole', data.user.active_role);
            }

            // Update global state
            if (window.APP_STATE) {
                window.APP_STATE.isLoggedIn = true;
                window.APP_STATE.currentUser = formattedUser;
                window.APP_STATE.userRole = data.user.active_role || null;
            }

            return { success: true, user: formattedUser };

        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
        }
    }

    async verifyToken() {
        console.log('[AuthManager.verifyToken] Starting token verification');

        if (!this.token) {
            console.log('[AuthManager.verifyToken] No token available');
            return false;
        }

        try {
            const response = await this.apiCall('/api/verify-token', 'GET', null, true);
            console.log('[AuthManager.verifyToken] Response status:', response.status);

            if (response.ok) {
                const data = await response.json();

                // Check if user data exists
                if (!data.user) {
                    // Silently fail - invalid token response
                    console.log('[AuthManager.verifyToken] No user data in response');
                    return false;
                }

                // Update user data from verification
                const formattedUser = {
                    id: data.user.id,
                    name: `${data.user.first_name} ${data.user.father_name}`,
                    first_name: data.user.first_name,
                    father_name: data.user.father_name,
                    email: data.user.email,
                    phone: data.user.phone,
                    role: data.user.role,
                    created_at: data.user.created_at,
                    is_active: data.user.is_active,
                    location: data.user.location || null,
                    country_code: data.user.country_code || null,
                    currency: data.user.currency || null
                };

                this.user = formattedUser;
                localStorage.setItem('currentUser', JSON.stringify(formattedUser));

                // Update global state
                if (window.APP_STATE) {
                    window.APP_STATE.isLoggedIn = true;
                    window.APP_STATE.currentUser = formattedUser;
                    window.APP_STATE.userRole = data.user.role;
                }

                console.log('[AuthManager.verifyToken] Token is valid');
                return true;
            } else if (response.status === 401) {
                // Token expired or invalid - return false so caller can refresh
                console.log('[AuthManager.verifyToken] Token expired or invalid (401)');
                return false;
            }

            console.log('[AuthManager.verifyToken] Unexpected status, returning true');
            return true; // Return true for other status codes

        } catch (error) {
            // Only log if not a network error - silently fail otherwise
            if (error.message && !error.message.includes('fetch')) {
                console.error('[AuthManager.verifyToken] Token verification error:', error);
            }
            console.log('[AuthManager.verifyToken] Error occurred, returning true for offline usage');
            return true; // Return true even on error to allow offline usage
        }
    }

    async refreshAccessToken() {
        const refreshToken = localStorage.getItem('refresh_token');

        if (!refreshToken) {
            console.error('No refresh token available');
            return false;
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh_token: refreshToken
                })
            });

            if (response.ok) {
                const data = await response.json();

                // Update tokens
                this.token = data.access_token;
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('access_token', data.access_token);

                console.log('[AuthManager] Token refreshed successfully');
                return true;
            } else {
                console.error('[AuthManager] Failed to refresh token:', response.status);
                // If refresh fails with 401, the refresh token is also expired
                if (response.status === 401) {
                    // Clear tokens but DON'T auto-redirect
                    // Let the page-level init code handle the redirect
                    console.error('[AuthManager] Refresh token expired - clearing auth state');
                    this.logout(false);
                }
                return false;
            }
        } catch (error) {
            console.error('[AuthManager] Error refreshing token:', error);
            return false;
        }
    }

    logout(redirect = false) {
        // Clear local auth state
        this.token = null;
        this.user = null;

        // Clear localStorage (including refresh token)
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRole');

        // Update global state
        if (window.APP_STATE) {
            window.APP_STATE.isLoggedIn = false;
            window.APP_STATE.currentUser = null;
            window.APP_STATE.userRole = null;
        }

        // Optional redirect to home
        if (redirect) {
            window.location.href = '../index.html';
        }
    }

    clearAuth() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRole');

        if (window.APP_STATE) {
            window.APP_STATE.isLoggedIn = false;
            window.APP_STATE.currentUser = null;
            window.APP_STATE.userRole = null;
        }
    }

    // ============================================
    //   GETTERS
    // ============================================
    isAuthenticated() {
        const hasToken = !!this.token;
        const hasUser = !!this.user;
        console.log('[AuthManager.isAuthenticated] token:', hasToken, 'user:', hasUser);
        return hasToken && hasUser;
    }

    getUser() {
        return this.user;
    }

    getToken() {
        return this.token;
    }

    getUserRole() {
        if (!this.user) return null;

        // FIX: Prioritize active_role first (most reliable)
        // Also check it's not the string "undefined"
        if (this.user.active_role && this.user.active_role !== 'undefined') {
            return this.user.active_role;
        }

        // Fallback to localStorage userRole (in case user object is corrupted)
        // Also validate it's not the string "undefined" or "null"
        const storedUserRole = localStorage.getItem('userRole');
        if (storedUserRole && storedUserRole !== 'undefined' && storedUserRole !== 'null') {
            console.log('[AuthManager.getUserRole] Using stored userRole:', storedUserRole);
            return storedUserRole;
        }

        // Check for single role property
        if (this.user.role && this.user.role !== 'undefined') {
            return this.user.role;
        }

        // If user has roles array but no active role, return first role
        if (this.user.roles && Array.isArray(this.user.roles) && this.user.roles.length > 0) {
            console.warn('[AuthManager.getUserRole] No active_role found, falling back to first role in array:', this.user.roles[0]);
            return this.user.roles[0];
        }

        return null;
    }

    // ============================================
    //   ROLE-SPECIFIC ID UTILITIES
    //   For accessing role-specific profiles (student_profiles.id, tutor_profiles.id, etc.)
    // ============================================

    /**
     * Decode JWT token to extract payload (client-side only for reading, not validation)
     * Note: This does NOT validate the signature - only the backend can do that
     */
    decodeJWT(token) {
        if (!token) return null;

        try {
            // JWT structure: header.payload.signature
            const parts = token.split('.');
            if (parts.length !== 3) return null;

            // Decode the payload (second part)
            const payload = parts[1];
            // Replace URL-safe chars and add padding
            const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('[AuthManager.decodeJWT] Error decoding token:', error);
            return null;
        }
    }

    /**
     * Get all role-specific IDs from the current token
     * Returns: { student: 123, tutor: 456, parent: null, ... }
     */
    getRoleIds() {
        if (!this.token) return {};

        const payload = this.decodeJWT(this.token);
        return payload?.role_ids || {};
    }

    /**
     * Get the role-specific ID for the user's active role
     * This is the ID you should use for API calls (e.g., tutor_profiles.id for tutors)
     */
    getActiveRoleId() {
        const roleIds = this.getRoleIds();
        const activeRole = this.getUserRole();

        if (!activeRole || !roleIds) return null;

        // Get the ID for the active role
        const roleId = roleIds[activeRole];

        // Convert string to number if needed
        return roleId ? parseInt(roleId) : null;
    }

    /**
     * Get role-specific ID for a specific role (even if not active)
     * @param {string} role - 'student', 'tutor', 'parent', 'advertiser'
     */
    getRoleId(role) {
        const roleIds = this.getRoleIds();
        const roleId = roleIds[role];
        return roleId ? parseInt(roleId) : null;
    }

    /**
     * Get user_id (from users table) - this is the main user ID
     */
    getUserId() {
        if (this.user && this.user.id) {
            return this.user.id;
        }

        // Fallback: decode from token
        const payload = this.decodeJWT(this.token);
        const userId = payload?.sub;
        return userId ? parseInt(userId) : null;
    }

    /**
     * Helper to get the correct ID based on context
     * For most profile/data operations, use role-specific ID
     * For authentication/user operations, use user_id
     */
    getCurrentContextId(forRole = null) {
        const role = forRole || this.getUserRole();

        // If asking for a specific role, return that role's ID
        if (role && role !== 'user') {
            return this.getRoleId(role);
        }

        // Default to user_id
        return this.getUserId();
    }
}

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthenticationManager;
}

// At the end of auth.js
window.AuthManager = new AuthenticationManager();





