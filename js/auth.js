class AuthenticationManager {
    constructor() {
        this.API_BASE_URL = 'http://localhost:8000';
        this.token = null;
        this.user = null;
        
        // Try to restore session on initialization
        this.restoreSession();
    }
    
    // ============================================
    //   SESSION MANAGEMENT
    // ============================================
   async restoreSession() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
        this.token = token;
        this.user = JSON.parse(user);
        
        // Ensure user has roles array (for backward compatibility)
        if (!this.user.roles && this.user.role) {
            this.user.roles = [this.user.role];
        }
        
        // Verify token is still valid
        const isValid = await this.verifyToken();
        if (!isValid) {
            this.clearAuth();
            return false;
        }
        
        return true;
    }
    
    return false;
} 
    // ============================================
    //   API HELPER
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
            const response = await fetch(`${this.API_BASE_URL}${endpoint}`, config);
            return response;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }
    
    // ============================================
    //   AUTHENTICATION METHODS
    // ============================================
    // In the AuthenticationManager class, update the login method:
async login(email, password) {
    try {
        const response = await this.apiCall('/api/login', 'POST', {
            email,
            password
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }
        
        const data = await response.json();
        
        // Store token and user data
        this.token = data.access_token;
        this.user = data.user;
        
        // Format user data with profile picture
        const formattedUser = {
            id: data.user.id,
            name: `${data.user.first_name} ${data.user.last_name}`,
            first_name: data.user.first_name,
            last_name: data.user.last_name,
            email: data.user.email,
            phone: data.user.phone,
            role: data.user.role,
            profile_picture: data.user.profile_picture, // Include this
            created_at: data.user.created_at,
            is_active: data.user.is_active,
            email_verified: data.user.email_verified
        };
        
        // Save to localStorage
        localStorage.setItem('token', this.token);

        // In auth.js, in the login method after successful login:
// Store token with both keys for compatibility
localStorage.setItem('token', data.access_token);         // For auth.js compatibility
localStorage.setItem('access_token', data.access_token);  // For reels_dynamic.js
localStorage.setItem('refresh_token', data.refresh_token); // For token refresh
        localStorage.setItem('currentUser', JSON.stringify(formattedUser));
        localStorage.setItem('userRole', data.user.role);
        
        // Update global state
        if (window.APP_STATE) {
            window.APP_STATE.isLoggedIn = true;
            window.APP_STATE.currentUser = formattedUser;
            window.APP_STATE.userRole = data.user.role;
        }
        
        return { success: true, user: formattedUser };
        
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

    async register(userData) {
        try {
            const response = await this.apiCall('/api/register', 'POST', userData);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Registration failed');
            }
            
            const data = await response.json();
            
            // Store token and user data
            this.token = data.access_token;
            this.user = data.user;
            
            // Format user data
            const formattedUser = {
                id: data.user.id,
                name: `${data.user.first_name} ${data.user.last_name}`,
                first_name: data.user.first_name,
                last_name: data.user.last_name,
                email: data.user.email,
                phone: data.user.phone,
                role: data.user.role,
                created_at: data.user.created_at,
                is_active: data.user.is_active
            };
            
            // Save to localStorage
            localStorage.setItem('token', this.token);
            localStorage.setItem('currentUser', JSON.stringify(formattedUser));
            localStorage.setItem('userRole', data.user.role);
            
            // Update global state
            if (window.APP_STATE) {
                window.APP_STATE.isLoggedIn = true;
                window.APP_STATE.currentUser = formattedUser;
                window.APP_STATE.userRole = data.user.role;
            }
            
            return { success: true, user: formattedUser };
            
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
        }
    }
    
    async verifyToken() {
        if (!this.token) return false;
        
        try {
            const response = await this.apiCall('/api/verify-token', 'GET', null, true);
            
            if (response.ok) {
                const data = await response.json();
                
                // Update user data from verification
                const formattedUser = {
                    id: data.user.id,
                    name: `${data.user.first_name} ${data.user.last_name}`,
                    first_name: data.user.first_name,
                    last_name: data.user.last_name,
                    email: data.user.email,
                    phone: data.user.phone,
                    role: data.user.role,
                    created_at: data.user.created_at,
                    is_active: data.user.is_active
                };
                
                this.user = formattedUser;
                localStorage.setItem('currentUser', JSON.stringify(formattedUser));
                
                // Update global state
                if (window.APP_STATE) {
                    window.APP_STATE.isLoggedIn = true;
                    window.APP_STATE.currentUser = formattedUser;
                    window.APP_STATE.userRole = data.user.role;
                }
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Token verification error:', error);
            return false;
        }
    }
    
    logout() {
        // Clear local auth state
        this.token = null;
        this.user = null;
        
        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRole');
        
        // Update global state
        if (window.APP_STATE) {
            window.APP_STATE.isLoggedIn = false;
            window.APP_STATE.currentUser = null;
            window.APP_STATE.userRole = null;
        }
        
        // Redirect to home
        window.location.href = '/';
    }
    
    clearAuth() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
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
        return !!this.token && !!this.user;
    }
    
    getUser() {
        return this.user;
    }
    
    getToken() {
        return this.token;
    }
    
    getUserRole() {
        return this.user ? this.user.role : null;
    }
}

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthenticationManager;
}

// At the end of auth.js
window.AuthManager = new AuthenticationManager();





