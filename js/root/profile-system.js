/* ============================================
   PROFILE SYSTEM JS - Reusable Component
   Updated: 2025-10-03 - Removed default-avatar.png (v2)
   ============================================ */
// ============================================
// HELPER FUNCTIONS
// ============================================

// Get auth token from localStorage (checks both 'token' and 'access_token' for compatibility)
function getStoredAuthToken() {
    return localStorage.getItem('token') || localStorage.getItem('access_token');
}

// ============================================
// FALLBACK FUNCTIONS FOR OPTIONAL DEPENDENCIES
// ============================================

// Check and create showToast if it doesn't exist
if (typeof window.showToast === 'undefined') {
    window.showToast = function(message, type) {
        console.log(`[${type}] ${message}`);
        
        // Only show alert for errors to avoid annoying users
        if (type === 'error') {
            alert(`Error: ${message}`);
        }
    };
}

// Check and create togglePasswordVisibility if it doesn't exist
if (typeof window.togglePasswordVisibility === 'undefined') {
    window.togglePasswordVisibility = function(fieldId) {
        const field = document.getElementById(fieldId);
        const button = field?.parentElement?.querySelector('.password-toggle');

        if (!field) return;

        if (field.type === 'password') {
            field.type = 'text';
            if (button) {
                button.innerHTML = `
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                    </svg>
                `;
            }
        } else {
            field.type = 'password';
            if (button) {
                button.innerHTML = `
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                `;
            }
        }
    };
}

// Check and create openModal if it doesn't exist
if (typeof window.openModal === 'undefined') {
    window.openModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            // Generic modal opening - remove hidden, add active
            modal.classList.remove('hidden');
            modal.classList.add('active');
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } else if (modalId === 'register-modal') {
            if (confirm('To add a new role, please go to the main page. Go there now?')) {
                window.location.href = '../index.html#register';
            }
        } else {
            console.log(`Modal ${modalId} requested but not found in DOM`);
        }
    };
}

// Check and create closeModal if it doesn't exist
if (typeof window.closeModal === 'undefined') {
    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            // Generic modal closing - add hidden, remove active/show
            modal.classList.add('hidden');
            modal.classList.remove('active');
            modal.classList.remove('show');
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    };
}

// Add at the top of profile-system.js if not already defined
if (typeof UrlHelper === 'undefined') {
    window.UrlHelper = {
        isFileProtocol: window.location.protocol === 'file:',
        
        getApiBaseUrl() {
            return this.isFileProtocol 
                ? `${window.API_BASE_URL || 'http://localhost:8000'}/api`
                : '/api';
        },
        
        getAssetUrl(path) {
            if (!path) return '';
            
            // If already a full URL, return as is
            if (path.startsWith('http://') || path.startsWith('https://')) {
                return path;
            }
            
            // For file protocol, prepend backend server URL
            if (this.isFileProtocol) {
                return `${window.API_BASE_URL || 'http://localhost:8000'}${path}`;
            }
            
            // For http protocol, return as is
            return path;
        }
    };
}

// Add this helper function in a common JS file
function navigateToPage(relativePath) {
    if (window.location.protocol === 'file:') {
        // For file protocol, use relative navigation
        window.location.href = relativePath;
    } else {
        // For http protocol, use absolute path
        window.location.href = relativePath;
    }
}
// Profile System Configuration
const ProfileSystem = (function() {
    'use strict';

    // Configuration
    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
    
    const PROFILE_URLS = {
        user: "../profile-pages/user-profile.html",
        tutor: "../profile-pages/tutor-profile.html",
        student: "../profile-pages/student-profile.html",
        parent: "../profile-pages/parent-profile.html",
        bookstore: "../profile-pages/bookstore-profile.html",
        delivery: "../profile-pages/delivery-profile.html",
        advertiser: "../profile-pages/advertiser-profile.html",
        church: "../profile-pages/church-profile.html",
        author: "../profile-pages/author-profile.html",
    };

    // Get current page context to determine correct relative path
    function getProfileUrl(role) {
        // CRITICAL FIX: Guard against undefined/null role
        if (!role || role === 'undefined' || role === 'null') {
            console.warn('[profile-system.getProfileUrl] Invalid role:', role, '- returning to index');
            return '/index.html';
        }

        const currentPath = window.location.pathname;
        const isInProfilePages = currentPath.includes('/profile-pages/');
        const isInViewProfiles = currentPath.includes('/view-profiles/');
        const isInBranch = currentPath.includes('/branch/');

        if (isInProfilePages) {
            // Already in profile-pages, use same directory
            return `${role}-profile.html`;
        } else if (isInViewProfiles) {
            // In view-profiles directory, go up and into profile-pages
            return `../profile-pages/${role}-profile.html`;
        } else if (isInBranch) {
            // In branch directory, go up and into profile-pages
            return `../profile-pages/${role}-profile.html`;
        } else {
            // In root directory
            return `profile-pages/${role}-profile.html`;
        }
    }

    // ROLE_AVATAR_SYSTEM removed - unused dead code with non-existent file paths

    // State
    let currentUser = null;
    let userRole = null;
    let _initialized = false;  // Guard to prevent multiple initializations

    // Helper function to refresh token
    async function attemptTokenRefresh() {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
                console.log('[profile-system] No refresh token available');
                return false;
            }

            const response = await fetch(`${API_BASE_URL}/api/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh_token: refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                // Update tokens
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);

                // Update user data if provided
                if (data.user) {
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
                        profile_picture: data.user.profile_picture
                    };
                    localStorage.setItem('currentUser', JSON.stringify(formattedUser));
                }

                console.log('[profile-system] Token refreshed successfully');
                return true;
            }

            // Refresh token is also expired or invalid
            if (response.status === 401) {
                console.log('[profile-system] Refresh token expired - clearing auth');
                clearAuthData();
                // Show a user-friendly message
                if (typeof showToast === 'function') {
                    showToast('Your session has expired. Please login again.', 'info');
                }
            } else {
                console.log('[profile-system] Token refresh failed:', response.status);
            }
            return false;
        } catch (error) {
            console.error('[profile-system] Token refresh error:', error);
            return false;
        }
    }

    // Helper function to clear auth data
    function clearAuthData() {
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRole');
        currentUser = null;
        userRole = null;
    }

    // Helper function to update user from API response
    function updateCurrentUserFromAPI(userData) {
        currentUser = {
            id: userData.id,
            name: `${userData.first_name} ${userData.father_name}`,
            first_name: userData.first_name,
            father_name: userData.father_name,
            email: userData.email,
            phone: userData.phone,
            role: userData.active_role,
            roles: userData.roles,
            active_role: userData.active_role,
            profile_picture: userData.profile_picture,
            created_at: userData.created_at,
            is_active: userData.is_active,
            email_verified: userData.email_verified
        };
        userRole = userData.active_role;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        // Only store userRole if it has a valid value (prevent storing "undefined" string)
        if (userRole && userRole !== 'undefined') {
            localStorage.setItem('userRole', userRole);
        }
        return true;
    }

    // API Functions
    async function fetchCurrentUserData() {
        try {
            const token = getStoredAuthToken();
            if (!token) {
                // No token, user is not logged in - this is normal, not an error
                return false;
            }

            const response = await fetch(`${API_BASE_URL}/api/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            // If token expired, DON'T try to refresh or logout
            if (response.status === 401) {
                console.log('[profile-system] Token expired, keeping user logged in with cached data');
                // Don't clear auth, just use cached user data
                const cachedUser = localStorage.getItem('currentUser');
                if (cachedUser) {
                    currentUser = JSON.parse(cachedUser);
                    return true;
                }
                return true; // Return true to keep user logged in
            }

            if (response.ok) {
                const userData = await response.json();
                currentUser = {
                    id: userData.id,
                    name: `${userData.first_name} ${userData.father_name}`,
                    first_name: userData.first_name,
                    father_name: userData.father_name,
                    email: userData.email,
                    phone: userData.phone,
                    role: userData.active_role,  // FIXED: Use active_role from API
                    active_role: userData.active_role,  // Include both for compatibility
                    profile_picture: userData.profile_picture,
                    created_at: userData.created_at,
                    is_active: userData.is_active,
                    email_verified: userData.email_verified
                };
                userRole = userData.active_role;  // FIXED: Use active_role instead of role

                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                // Only store userRole if it has a valid value (prevent storing "undefined" string)
                if (userData.active_role && userData.active_role !== 'undefined') {
                    localStorage.setItem('userRole', userData.active_role);  // FIXED: Use active_role
                }

                await fetchUserRoles();
                return true;
            } else if (response.status === 401) {
                // Token expired or invalid - clear auth silently
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('userRole');
                return false;
            }
            return false;
        } catch (error) {
            // Only log unexpected errors, not network errors when not logged in
            if (getStoredAuthToken()) {
                console.error('Error fetching user data:', error);
            }
            return false;
        }
    }

    async function fetchUserRoles() {
        try {
            const token = getStoredAuthToken();
            if (!token) {
                // No token, user is not logged in - this is normal, not an error
                return [];
            }

            const response = await fetch(`${API_BASE_URL}/api/my-roles`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (currentUser) {
                    currentUser.roles = data.user_roles || data.roles || [];
                    userRole = data.active_role || userRole;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    // Only store userRole if it has a valid value (prevent storing "undefined" string)
                    if (data.active_role && data.active_role !== 'undefined') {
                        localStorage.setItem('userRole', data.active_role);
                    }
                }
                return data.user_roles || data.roles || [];
            } else if (response.status === 401) {
                // Token expired or invalid - handled silently
                return [];
            }
            return [];
        } catch (error) {
            // Only log unexpected errors, not network errors when not logged in
            if (getStoredAuthToken()) {
                console.error('Error fetching user roles:', error);
            }
            return [];
        }
    }

function updateProfilePictures() {
    console.log('[updateProfilePictures] Called');

    // Use inline SVG placeholder instead of non-existent image
    const defaultPicture = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect width='150' height='150' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-family='sans-serif' font-size='16'%3E150x150%3C/text%3E%3C/svg%3E";

    // Get user data from localStorage or global state
    const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
    console.log('[updateProfilePictures] User data:', {
        id: userData.id,
        profile_picture: userData.profile_picture,
        hasProfilePicture: !!userData.profile_picture
    });

    // Helper function to fix image URLs
    const fixImageUrl = (url) => {
        if (!url) return defaultPicture;

        // If already a full URL, return as is
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        // Use UrlHelper if available
        if (typeof UrlHelper !== 'undefined') {
            return UrlHelper.getAssetUrl(url);
        }

        // Fallback for file protocol without UrlHelper
        if (window.location.protocol === 'file:') {
            return `${window.API_BASE_URL || 'http://localhost:8000'}${url}`;
        }

        return url;
    };

    // Update main profile picture in navigation
    const profilePic = document.getElementById('profile-pic');
    console.log('[updateProfilePictures] profile-pic element:', profilePic);

    if (profilePic) {
        if (userData.profile_picture) {
            const fixedUrl = fixImageUrl(userData.profile_picture);
            console.log('[updateProfilePictures] Setting profile-pic src to:', fixedUrl);
            profilePic.src = fixedUrl;
            profilePic.onerror = function() {
                console.warn('[updateProfilePictures] Failed to load profile picture, using default');
                this.src = defaultPicture;
            };
        } else {
            console.log('[updateProfilePictures] No profile_picture, using default');
            profilePic.src = defaultPicture;
        }
    } else {
        console.warn('[updateProfilePictures] profile-pic element not found in DOM');
    }
    
    // Update dropdown profile picture
    const dropdownProfilePic = document.getElementById('dropdown-profile-pic');
    if (dropdownProfilePic) {
        if (userData.profile_picture) {
            dropdownProfilePic.src = fixImageUrl(userData.profile_picture);
            dropdownProfilePic.onerror = function() {
                this.src = defaultPicture;
            };
        } else {
            dropdownProfilePic.src = defaultPicture;
        }
    }
    
    // Update any other profile pictures on the page (navbar/dropdown only)
    // IMPORTANT: Skip profile avatars in main content areas (view pages) - those show OTHER users' pictures
    document.querySelectorAll('.user-profile-pic, .profile-avatar').forEach(img => {
        // Skip if this is the main profile avatar in a view page (shows another user's picture)
        if (img.id === 'profile-avatar') return;
        // Skip if inside main content area (profile-header-section, profile-content, etc.)
        if (img.closest('.profile-header-section, .profile-content, .main-content, .content-area')) return;

        if (img && userData.profile_picture) {
            img.src = fixImageUrl(userData.profile_picture);
            img.onerror = function() {
                this.src = defaultPicture;
            };
        } else if (img) {
            img.src = defaultPicture;
        }
    });
    
    // Update creator avatars if they exist (for video cards, comments, etc.)
    document.querySelectorAll('[data-profile-pic]').forEach(element => {
        const picUrl = element.getAttribute('data-profile-pic');
        if (picUrl) {
            if (element.tagName === 'IMG') {
                element.src = fixImageUrl(picUrl);
                element.onerror = function() {
                    this.src = defaultPicture;
                };
            } else {
                // For div backgrounds
                element.style.backgroundImage = `url('${fixImageUrl(picUrl)}')`;
            }
        }
    });
}

    // Dropdown Management
    function toggleProfileDropdown() {
        const toggle = document.getElementById('profile-dropdown-toggle');
        const menu = document.getElementById('profile-dropdown-menu');

        if (!toggle || !menu) return;

        const isOpen = menu.classList.contains('show');
        if (isOpen) {
            closeProfileDropdown();
        } else {
            openProfileDropdown();
        }
    }

    function openProfileDropdown() {
        const toggle = document.getElementById('profile-dropdown-toggle');
        const menu = document.getElementById('profile-dropdown-menu');

        if (!toggle || !menu) return;

        toggle.classList.add('active');
        menu.classList.add('show');

        updateProfileDropdown();
        document.addEventListener('click', handleClickOutside);
        document.addEventListener('keydown', handleEscapeKey);
    }

    function closeProfileDropdown() {
        const toggle = document.getElementById('profile-dropdown-toggle');
        const menu = document.getElementById('profile-dropdown-menu');

        if (!toggle || !menu) return;

        toggle.classList.remove('active');
        menu.classList.remove('show');

        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
    }

    function handleClickOutside(event) {
        const container = document.getElementById('profile-container');
        if (container && !container.contains(event.target)) {
            closeProfileDropdown();
        }
    }

    function handleEscapeKey(event) {
        if (event.key === 'Escape') {
            closeProfileDropdown();
        }
    }

    async function updateProfileDropdown() {
        const token = getStoredAuthToken();
        if (!token) return;

        // CRITICAL: Re-read userRole from localStorage to get latest value
        // This ensures we have the most up-to-date role after deactivation/removal
        const latestRole = localStorage.getItem('userRole');
        if (latestRole && latestRole !== 'undefined' && latestRole !== 'null') {
            userRole = latestRole;
        }

        await fetchCurrentUserData();

        if (!currentUser) return;

        const elements = {
            name: document.getElementById('dropdown-user-name'),
            email: document.getElementById('dropdown-user-email'),
            role: document.getElementById('dropdown-user-role'),
            profileName: document.getElementById('profile-name')
        };

        const userName = currentUser.name || `${currentUser.first_name} ${currentUser.father_name}`;

        if (elements.name) elements.name.textContent = userName;
        // Display masked email or phone based on what user registered with
        if (elements.email && window.AuthManager) {
            elements.email.textContent = window.AuthManager.getMaskedContact(currentUser);
        } else if (elements.email) {
            elements.email.textContent = currentUser.email || '';
        }
        // CRITICAL FIX: Don't set role here - will be set below based on validity check
        // if (elements.role) elements.role.textContent = formatRoleName(userRole);
        if (elements.profileName) elements.profileName.textContent = userName;

        updateProfilePictures();

        // Make dropdown header link functional
        const dropdownProfileLink = document.getElementById('dropdown-profile-link');
        if (dropdownProfileLink) {
            // CRITICAL FIX: Check if userRole is valid before generating URL
            if (!userRole || userRole === 'undefined' || userRole === 'null') {
                console.warn('[profile-system] No active role, showing "Add Role" action');
                dropdownProfileLink.href = '#';
                dropdownProfileLink.onclick = (e) => {
                    e.preventDefault();
                    closeProfileDropdown();
                    if (typeof openAddRoleModal === 'function') {
                        openAddRoleModal();
                    } else {
                        console.error('openAddRoleModal function not found');
                    }
                };
                // Update text to show "No role selected"
                if (elements.role) {
                    elements.role.textContent = 'No role selected';
                }
            } else {
                // User has valid active role
                if (elements.role) {
                    elements.role.textContent = formatRoleName(userRole);
                }
                const profileUrl = getProfileUrl(userRole);
                dropdownProfileLink.href = profileUrl;
                dropdownProfileLink.onclick = (e) => {
                    closeProfileDropdown();
                };
            }
        }

        await setupRoleSwitcher();
    }

    // Role Switching
    async function setupRoleSwitcher() {
        const roleSwitcherSection = document.getElementById('role-switcher-section');
        const roleOptions = document.getElementById('role-options');

        if (!roleSwitcherSection || !roleOptions) return;

        // Check if user is logged in
        const token = getStoredAuthToken();
        if (!token) {
            roleSwitcherSection.classList.add('hidden');
            return;
        }

        // Always show the section for logged-in users
        roleSwitcherSection.classList.remove('hidden');
        roleOptions.innerHTML = '';

        try {
            const response = await fetch(`${API_BASE_URL}/api/my-roles`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                // Silently handle 401 (unauthorized) - don't log errors for expected auth failures
                if (response.status !== 401) {
                    console.error('Failed to fetch user roles');
                }
                // Still show Add Role option even if fetch fails
                const addRoleOption = document.createElement('div');
                addRoleOption.className = 'role-option add-role-option';
                addRoleOption.innerHTML = `
                    <span class="add-role-icon">+</span>
                    <span class="role-name">Add New Role</span>
                `;
                addRoleOption.onclick = () => {
                    closeProfileDropdown();
                    openAddRoleModal();
                };
                roleOptions.appendChild(addRoleOption);
                return;
            }

            const data = await response.json();
            const userRoles = data.user_roles || data.roles || [];
            const activeRole = data.active_role || userRole;

            if (currentUser) {
                currentUser.roles = userRoles;
            }
            userRole = activeRole;
            // Only store userRole if it has a valid value (prevent storing "undefined" string)
            if (activeRole && activeRole !== 'undefined') {
                localStorage.setItem('userRole', activeRole);
            }

            // Filter out admin roles - admins should only access through admin-index.html
            const userFacingRoles = userRoles.filter(role => role !== 'admin');

            if (userFacingRoles.length === 0) {
                // No roles at all - show message
                const noRoleMessage = document.createElement('div');
                noRoleMessage.className = 'role-option disabled';
                noRoleMessage.style.cssText = 'text-align: center; color: var(--text-muted); font-style: italic;';
                noRoleMessage.innerHTML = `
                    <span class="role-name">No roles yet</span>
                `;
                roleOptions.appendChild(noRoleMessage);
            } else if (userFacingRoles.length === 1) {
                // Single role with Add Role option
                const currentRoleOption = document.createElement('div');
                currentRoleOption.className = 'role-option active';
                currentRoleOption.innerHTML = `
                    <span class="role-name">${formatRoleName(userFacingRoles[0])}</span>
                    <span class="role-badge">CURRENT</span>
                `;
                // Make single role clickable to navigate to profile page
                currentRoleOption.onclick = () => {
                    const profileUrl = getProfileUrl(userFacingRoles[0]);
                    closeProfileDropdown();
                    window.location.href = profileUrl;
                };
                roleOptions.appendChild(currentRoleOption);
            } else if (userFacingRoles.length > 1) {
                // Multiple roles
                userFacingRoles.forEach(role => {
                    const roleOption = document.createElement('div');
                    roleOption.className = 'role-option';

                    if (role === activeRole) {
                        roleOption.classList.add('active');
                    }

                    roleOption.innerHTML = `
                        <span class="role-name">${formatRoleName(role)}</span>
                        ${role === activeRole ? '<span class="role-badge">ACTIVE</span>' : ''}
                    `;

                    roleOption.onclick = () => {
                        console.log('[roleOption.onclick] Clicked role:', role, 'Active role:', activeRole);

                        if (role === activeRole) {
                            // If clicking current role, just navigate to profile page
                            console.log('[roleOption.onclick] Same role - navigating to profile page');
                            const profileUrl = getProfileUrl(role);
                            closeProfileDropdown();
                            window.location.href = profileUrl;
                        } else {
                            // Switch to different role
                            console.log('[roleOption.onclick] Different role - calling switchToRole()');
                            switchToRole(role);
                        }
                    };
                    roleOptions.appendChild(roleOption);
                });
            }

            // Always add "Add Role" option
            const addRoleOption = document.createElement('div');
            addRoleOption.className = 'role-option add-role-option';
            addRoleOption.innerHTML = `
                <span class="add-role-icon">+</span>
                <span class="role-name">Add New Role</span>
            `;
            addRoleOption.onclick = () => {
                closeProfileDropdown();
                openAddRoleModal();
            };
            roleOptions.appendChild(addRoleOption);

            // Update dropdown-user-role only if there's an active role
            const dropdownUserRole = document.getElementById('dropdown-user-role');
            if (dropdownUserRole && activeRole && activeRole !== 'null' && activeRole !== 'undefined') {
                dropdownUserRole.textContent = formatRoleName(activeRole);
            }
            // If no active role, leave it as "No role selected" (set in updateProfileDropdown)

            // Also update mobile role switcher
            updateMobileRoleSwitcher(userFacingRoles, activeRole);

        } catch (error) {
            console.error('Error fetching user roles:', error);
            // Still show Add Role option even on error
            const addRoleOption = document.createElement('div');
            addRoleOption.className = 'role-option add-role-option';
            addRoleOption.innerHTML = `
                <span class="add-role-icon">+</span>
                <span class="role-name">Add New Role</span>
            `;
            addRoleOption.onclick = () => {
                closeProfileDropdown();
                openAddRoleModal();
            };
            roleOptions.appendChild(addRoleOption);
        }
    }

    // Add Role Modal Management
    let otpResendTimer = null;
    let otpResendSeconds = 60;
    let addRoleData = { role: null, password: null }; // Store data between steps

    // Role icons mapping (defined early for use in mobile role switcher)
    const roleIcons = {
        student: '🎓',
        tutor: '👨‍🏫',
        parent: '👨‍👩‍👧',
        advertiser: '📢',
        user: '👤',
        admin: '⚙️'
    };

    // Helper function to update mobile profile section visibility and data
    function updateMobileProfileSection() {
        const mobileProfileSection = document.getElementById('mobile-profile-section');
        const mobileAuthSection = document.getElementById('mobile-auth-section');
        const mobileNotificationBtn = document.getElementById('mobile-notification-btn');

        const token = getStoredAuthToken();
        const userData = JSON.parse(localStorage.getItem('currentUser') || 'null');

        if (token && userData) {
            // User is logged in - show profile section, hide auth buttons
            if (mobileProfileSection) {
                mobileProfileSection.classList.remove('hidden');

                // Use inline SVG placeholder instead of non-existent image
                const defaultPicture = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect width='150' height='150' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-family='sans-serif' font-size='16'%3E150x150%3C/text%3E%3C/svg%3E";

                // Helper to fix image URLs
                const fixImageUrl = (url) => {
                    if (!url) return defaultPicture;
                    if (url.startsWith('http://') || url.startsWith('https://')) return url;
                    if (typeof UrlHelper !== 'undefined') return UrlHelper.getAssetUrl(url);
                    if (window.location.protocol === 'file:') {
                        return `${window.API_BASE_URL || 'http://localhost:8000'}${url}`;
                    }
                    return url;
                };

                // Update profile info
                const profilePic = document.getElementById('mobile-profile-pic');
                const profileName = document.getElementById('mobile-profile-name');
                const profileRole = document.getElementById('mobile-profile-role');
                const dropdownPic = document.getElementById('mobile-dropdown-pic');
                const dropdownName = document.getElementById('mobile-dropdown-name');
                const dropdownEmail = document.getElementById('mobile-dropdown-email');
                const profileLink = document.getElementById('mobile-profile-link');

                const avatarUrl = fixImageUrl(userData.profile_picture_url || userData.profile_picture || userData.profilePicture);
                const name = userData.name || userData.full_name || `${userData.first_name || ''} ${userData.father_name || ''}`.trim() || 'User';
                const email = userData.email || '';
                let role = localStorage.getItem('userRole') || localStorage.getItem('active_role') || userData.role || userData.active_role;

                // Check if role is valid (not null, undefined, or the string versions)
                if (!role || role === 'null' || role === 'undefined') {
                    role = null;
                }

                if (profilePic) {
                    profilePic.src = avatarUrl;
                    profilePic.onerror = function() { this.src = defaultPicture; };
                }
                if (profileName) profileName.textContent = name;
                if (profileRole) {
                    profileRole.textContent = role ? formatRoleName(role) : 'No role selected';
                }
                if (dropdownPic) {
                    dropdownPic.src = avatarUrl;
                    dropdownPic.onerror = function() { this.src = defaultPicture; };
                }
                if (dropdownName) dropdownName.textContent = name;
                if (dropdownEmail) dropdownEmail.textContent = email;

                // Set profile link
                if (profileLink) {
                    if (role) {
                        const profilePage = getProfileUrl(role);
                        profileLink.href = profilePage;
                    } else {
                        // No role - link to add role action
                        profileLink.href = '#';
                        profileLink.onclick = (e) => {
                            e.preventDefault();
                            if (typeof openAddRoleModal === 'function') {
                                openAddRoleModal();
                            }
                        };
                    }
                }
            }

            if (mobileAuthSection) mobileAuthSection.classList.add('hidden');
            if (mobileNotificationBtn) mobileNotificationBtn.classList.remove('hidden');
        } else {
            // User is logged out - hide profile section, show auth buttons
            if (mobileProfileSection) mobileProfileSection.classList.add('hidden');
            if (mobileAuthSection) mobileAuthSection.classList.remove('hidden');
            if (mobileNotificationBtn) mobileNotificationBtn.classList.add('hidden');
        }
    }

    // Helper function to update mobile role switcher
    function updateMobileRoleSwitcher(userFacingRoles, activeRole) {
        const mobileRoleSwitcherSection = document.getElementById('mobile-role-switcher-section');
        const mobileRoleOptions = document.getElementById('mobile-role-options');

        if (!mobileRoleSwitcherSection || !mobileRoleOptions) return;

        // Always show section for logged-in users (even with single role, to show Add Role)
        mobileRoleSwitcherSection.classList.remove('hidden');
        mobileRoleOptions.innerHTML = '';

        // Add existing roles
        userFacingRoles.forEach(role => {
            const isActive = role === activeRole;
            const roleOption = document.createElement('button');
            roleOption.className = `mobile-role-option ${isActive ? 'active' : ''}`;
            roleOption.innerHTML = `
                <span class="role-icon">${roleIcons[role] || '👤'}</span>
                <span class="role-name">${formatRoleName(role)}</span>
                ${isActive ? '<span class="active-badge">Active</span>' : ''}
            `;

            if (isActive) {
                // If active role, clicking navigates to profile page
                roleOption.onclick = () => {
                    const profileUrl = getProfileUrl(role);
                    const mobileMenu = document.getElementById('mobile-menu');
                    if (mobileMenu) mobileMenu.classList.add('hidden');
                    const mobileMenuAlt = document.getElementById('mobileMenu');
                    if (mobileMenuAlt) mobileMenuAlt.classList.add('hidden');
                    window.location.href = profileUrl;
                };
            } else {
                // If inactive role, switch to it
                roleOption.onclick = () => switchToRole(role);
            }

            mobileRoleOptions.appendChild(roleOption);
        });

        // Always add "Add Role" option
        const addRoleOption = document.createElement('button');
        addRoleOption.className = 'mobile-role-option add-role-option';
        addRoleOption.innerHTML = `
            <span class="role-icon">+</span>
            <span class="role-name">Add New Role</span>
        `;
        addRoleOption.onclick = () => {
            // Close mobile menu if open
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu) mobileMenu.classList.add('hidden');
            const mobileMenuAlt = document.getElementById('mobileMenu');
            if (mobileMenuAlt) mobileMenuAlt.classList.add('hidden');
            openAddRoleModal();
        };
        mobileRoleOptions.appendChild(addRoleOption);
    }

    async function openAddRoleModal() {
        // Wait for modal to be loaded if using CommonModalLoader
        let attempts = 0;
        const maxAttempts = 50; // Max 5 seconds wait (50 * 100ms)

        const tryOpenModal = () => {
            const modal = document.getElementById('add-role-modal');
            if (!modal) {
                attempts++;
                if (attempts < maxAttempts) {
                    console.log('[ProfileSystem] Add-role modal not found, waiting for modal loader... (attempt ' + attempts + ')');
                    setTimeout(tryOpenModal, 100);
                } else {
                    console.error('[ProfileSystem] Add-role modal not found after ' + maxAttempts + ' attempts. Modal loader may not be configured.');
                    if (window.showToast) {
                        window.showToast('Unable to load add role modal. Please refresh the page.', 'error');
                    }
                }
                return;
            }

            // Ensure form event listener is attached (modal may have been loaded dynamically)
            attachAddRoleFormListener();

            openAddRoleModalInternal();
        };
        tryOpenModal();
    }

    // Attach form listener - can be called multiple times safely
    function attachAddRoleFormListener() {
        const addRoleForm = document.getElementById('add-role-form');
        if (addRoleForm && !addRoleForm.dataset.listenerAttached) {
            addRoleForm.addEventListener('submit', handleAddRoleSubmit);
            addRoleForm.dataset.listenerAttached = 'true';
            console.log('[ProfileSystem] Add-role form listener attached');
        }
    }

    function openAddRoleModalInternal() {
        const modal = document.getElementById('add-role-modal');
        if (!modal) return;

        // Reset to step 1
        const step1 = document.getElementById('add-role-step1');
        const step2 = document.getElementById('add-role-step2');
        if (step1) step1.style.display = 'block';
        if (step2) step2.style.display = 'none';

        // Reset form
        const form = document.getElementById('add-role-form');
        if (form) form.reset();

        // Update button text for step 1
        const btnText = document.querySelector('#add-role-form .btn-text');
        if (btnText) btnText.textContent = 'Verify & Continue';

        // Hide deactivated message
        const deactivatedMsg = document.getElementById('role-deactivated-message');
        if (deactivatedMsg) deactivatedMsg.style.display = 'none';

        // Clear stored data
        addRoleData = { role: null, password: null, isReactivation: false };

        // Populate user info in modal header
        populateAddRoleUserInfo();

        // Setup role selection change listener
        setupRoleSelectionListener();

        // Show modal - DON'T send OTP yet, wait for password verification
        if (window.openModal) {
            window.openModal('add-role-modal');
        } else {
            modal.classList.remove('hidden');
        }
    }

    // Setup listener for role selection changes
    function setupRoleSelectionListener() {
        const roleSelect = document.getElementById('add-role-type');
        if (!roleSelect || roleSelect.dataset.listenerAttached) return;

        roleSelect.addEventListener('change', async function() {
            const selectedRole = this.value;
            const deactivatedMsg = document.getElementById('role-deactivated-message');
            const btnText = document.getElementById('add-role-btn-text');

            if (!selectedRole || !deactivatedMsg || !btnText) return;

            // Check role status
            try {
                const response = await fetch(`${API_BASE_URL}/api/check-role-status?role=${selectedRole}`, {
                    headers: {
                        'Authorization': `Bearer ${getStoredAuthToken()}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();

                    if (data.is_deactivated) {
                        // Role exists but is deactivated
                        deactivatedMsg.style.display = 'block';
                        btnText.textContent = 'Activate Role';
                        addRoleData.isReactivation = true;
                    } else {
                        // Role doesn't exist or is already active
                        deactivatedMsg.style.display = 'none';
                        btnText.textContent = 'Verify & Continue';
                        addRoleData.isReactivation = false;
                    }
                }
            } catch (error) {
                console.error('Error checking role status:', error);
                // On error, assume it's a new role
                deactivatedMsg.style.display = 'none';
                btnText.textContent = 'Verify & Continue';
                addRoleData.isReactivation = false;
            }
        });

        roleSelect.dataset.listenerAttached = 'true';
    }

    function populateAddRoleUserInfo() {
        const userInfoSection = document.getElementById('add-role-user-info');
        const userNameEl = document.getElementById('add-role-user-name');
        const userRolesEl = document.getElementById('add-role-user-roles');
        const userContactEl = document.getElementById('add-role-user-contact');

        if (!userInfoSection || !userNameEl || !userRolesEl || !userContactEl) return;

        // Get current user from localStorage
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

        if (!user || !user.first_name) {
            userInfoSection.style.display = 'none';
            return;
        }

        // Show the section
        userInfoSection.style.display = 'block';

        // Set user name
        const fullName = [user.first_name, user.father_name, user.grandfather_name]
            .filter(Boolean)
            .join(' ');
        userNameEl.textContent = fullName || user.name || 'User';

        // Set user roles with stars
        const roles = user.roles || [user.role || user.active_role];
        userRolesEl.innerHTML = '';

        roles.forEach(role => {
            if (role && role !== 'admin') {
                const roleTag = document.createElement('span');
                roleTag.style.cssText = `
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15));
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 500;
                    color: var(--text-primary);
                `;
                const icon = roleIcons[role.toLowerCase()] || '⭐';
                const formattedRole = role.charAt(0).toUpperCase() + role.slice(1);
                roleTag.innerHTML = `<span>${icon}</span><span>${formattedRole}</span>`;
                userRolesEl.appendChild(roleTag);
            }
        });

        // Set contact info (email or phone with masking)
        let contactText = '';
        if (user.email) {
            // Mask email: show first 3 chars and domain
            const [localPart, domain] = user.email.split('@');
            if (localPart && domain) {
                const maskedLocal = localPart.length > 3
                    ? localPart.substring(0, 3) + '***'
                    : localPart + '***';
                contactText = `📧 ${maskedLocal}@${domain}`;
            } else {
                contactText = `📧 ${user.email}`;
            }
        }
        if (user.phone) {
            // Mask phone: show last 4 digits
            const maskedPhone = user.phone.length > 4
                ? '***' + user.phone.slice(-4)
                : user.phone;
            if (contactText) {
                contactText += `  •  📱 ${maskedPhone}`;
            } else {
                contactText = `📱 ${maskedPhone}`;
            }
        }
        userContactEl.textContent = contactText || 'No contact info';
    }

    function closeAddRoleModal() {
        const modal = document.getElementById('add-role-modal');
        if (!modal) return;

        if (window.closeModal) {
            window.closeModal('add-role-modal');
        } else {
            modal.classList.add('hidden');
            modal.classList.remove('active', 'show');
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }

        // Reset form
        const form = document.getElementById('add-role-form');
        if (form) form.reset();

        // Hide success panel and show form
        const successPanel = document.getElementById('add-role-success-panel');
        if (successPanel) successPanel.style.display = 'none';
        if (form) form.style.display = 'block';

        // Clear pending role switch data
        window.pendingRoleSwitch = null;

        // Clear timer
        if (otpResendTimer) {
            clearInterval(otpResendTimer);
            otpResendTimer = null;
        }

        // Hide OTP sent message
        const otpMessage = document.getElementById('otp-sent-message');
        if (otpMessage) otpMessage.style.display = 'none';

        // Clear stored data
        addRoleData = { role: null, password: null };

        // Refresh deletion countdown banner in case a role was restored
        if (window.DeletionCountdownBanner) {
            window.DeletionCountdownBanner.checkAndShowBanner();
        }
    }

    async function sendAddRoleOTP() {
        try {
            // Backend will automatically determine contact method (email or phone)
            // No need to specify send_to - it will use user's registered contact
            const response = await fetch(`${API_BASE_URL}/api/send-otp`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getStoredAuthToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    purpose: 'add_role'
                    // send_to is optional - backend auto-detects from user's registration
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Show OTP sent message
                const otpMessage = document.getElementById('otp-sent-message');
                const otpDestination = document.getElementById('otp-destination');

                if (otpMessage && otpDestination) {
                    const destText = data.destination === 'email' ? `email (${data.destination_value})` : `phone (${data.destination_value})`;
                    otpDestination.textContent = destText;
                    otpMessage.style.display = 'block';
                }

                // Start resend timer
                startResendTimer();

                if (window.showToast) {
                    window.showToast(`OTP sent to your ${data.destination}`, 'success');
                }
            } else {
                if (window.showToast) {
                    window.showToast(data.detail || 'Failed to send OTP', 'error');
                }
            }
        } catch (error) {
            console.error('Error sending OTP:', error);
            if (window.showToast) {
                window.showToast('Error sending OTP. Please try again.', 'error');
            }
        }
    }

    // Handle OTP destination change
    function handleOTPDestinationChange(event) {
        // User can change destination before sending OTP
        // Just update the UI, actual send happens on modal open or resend
    }

    function startResendTimer() {
        const resendLink = document.getElementById('resend-otp-link');
        const resendTimer = document.getElementById('resend-timer');

        if (!resendLink || !resendTimer) return;

        // Disable resend link
        resendLink.style.pointerEvents = 'none';
        resendLink.style.opacity = '0.5';
        resendTimer.style.display = 'inline';

        otpResendSeconds = 60;

        otpResendTimer = setInterval(() => {
            otpResendSeconds--;
            resendTimer.textContent = `(${otpResendSeconds}s)`;

            if (otpResendSeconds <= 0) {
                clearInterval(otpResendTimer);
                resendLink.style.pointerEvents = 'auto';
                resendLink.style.opacity = '1';
                resendTimer.style.display = 'none';
            }
        }, 1000);
    }

    async function handleResendOTP(event) {
        event.preventDefault();

        // Clear existing timer
        if (otpResendTimer) {
            clearInterval(otpResendTimer);
        }

        await sendAddRoleOTP();
    }

    // Go back to step 1
    function goBackToStep1(event) {
        if (event) event.preventDefault();
        const step1 = document.getElementById('add-role-step1');
        const step2 = document.getElementById('add-role-step2');
        if (step1) step1.style.display = 'block';
        if (step2) step2.style.display = 'none';

        // Update button text for step 1
        const btnText = document.querySelector('#add-role-form .btn-text');
        if (btnText) btnText.textContent = 'Verify & Continue';

        // Clear timer
        if (otpResendTimer) {
            clearInterval(otpResendTimer);
            otpResendTimer = null;
        }
    }

    async function handleAddRoleSubmit(event) {
        event.preventDefault();

        const step1 = document.getElementById('add-role-step1');
        const step2 = document.getElementById('add-role-step2');
        const isStep1Visible = step1 && step1.style.display !== 'none';

        const submitBtn = event.target.querySelector('button[type="submit"]');
        const btnText = submitBtn?.querySelector('.btn-text');
        const btnLoader = submitBtn?.querySelector('.btn-loader');

        const token = getStoredAuthToken();
        if (!token) {
            if (window.showToast) {
                window.showToast('Please login first', 'error');
            }
            return;
        }

        if (isStep1Visible) {
            // STEP 1: Verify password and send OTP
            const role = document.getElementById('add-role-type')?.value;
            const password = document.getElementById('add-role-password')?.value;

            if (!role) {
                if (window.showToast) {
                    window.showToast('Please select a role', 'warning');
                }
                return;
            }

            if (!password) {
                if (window.showToast) {
                    window.showToast('Please enter your password', 'warning');
                }
                return;
            }

            // Show loading state
            if (submitBtn) submitBtn.disabled = true;
            if (btnText) btnText.style.display = 'none';
            if (btnLoader) btnLoader.style.display = 'inline-flex';

            try {
                // Verify password first
                const verifyResponse = await fetch(`${API_BASE_URL}/api/verify-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ password: password })
                });

                const verifyData = await verifyResponse.json();

                if (!verifyResponse.ok) {
                    if (window.showToast) {
                        window.showToast(verifyData.detail || 'Invalid password', 'error');
                    }
                    return;
                }

                // Password verified, store data and send OTP
                addRoleData.role = role;
                addRoleData.password = password;

                // Send OTP
                await sendAddRoleOTP();

                // Show step 2
                if (step1) step1.style.display = 'none';
                if (step2) step2.style.display = 'block';

                // Update button text for step 2
                if (btnText) {
                    btnText.textContent = addRoleData.isReactivation ? 'Activate Role' : 'Add Role';
                }

                // Show selected role
                const roleDisplay = document.getElementById('selected-role-display');
                if (roleDisplay) {
                    roleDisplay.textContent = formatRoleName(role);
                }

            } catch (error) {
                console.error('Error in step 1:', error);
                if (window.showToast) {
                    window.showToast('An error occurred. Please try again.', 'error');
                }
            } finally {
                // Reset loading state
                if (submitBtn) submitBtn.disabled = false;
                if (btnText) btnText.style.display = 'inline';
                if (btnLoader) btnLoader.style.display = 'none';
            }

        } else {
            // STEP 2: Verify OTP and add role
            const otp = document.getElementById('add-role-otp')?.value;

            if (!otp || otp.length !== 6) {
                if (window.showToast) {
                    window.showToast('Please enter a valid 6-digit OTP', 'warning');
                }
                return;
            }

            // Show loading state
            if (submitBtn) submitBtn.disabled = true;
            if (btnText) btnText.style.display = 'none';
            if (btnLoader) btnLoader.style.display = 'inline-flex';

            try {
                const response = await fetch(`${API_BASE_URL}/api/add-role`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        otp: otp,
                        new_role: addRoleData.role,
                        password: addRoleData.password
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    const successMessage = data.role_reactivated
                        ? `${formatRoleName(addRoleData.role)} role reactivated successfully!`
                        : `${formatRoleName(addRoleData.role)} role added successfully!`;

                    if (window.showToast) {
                        window.showToast(successMessage, 'success');
                    }

                    // CRITICAL FIX: Update JWT tokens ONLY (backend keeps current active_role)
                    // DO NOT update active_role here - user must explicitly choose to switch
                    if (data.access_token) {
                        localStorage.setItem('token', data.access_token);
                        localStorage.setItem('access_token', data.access_token);
                        console.log('[handleAddRoleSubmit] Updated access token (active_role unchanged)');
                    }

                    if (data.refresh_token) {
                        localStorage.setItem('refresh_token', data.refresh_token);
                        console.log('[handleAddRoleSubmit] Updated refresh token');
                    }

                    // Update AuthManager with new token (but NOT the active role)
                    if (window.AuthManager && data.access_token) {
                        window.AuthManager.token = data.access_token;
                        // DO NOT update active_role - user hasn't chosen to switch yet
                    }

                    // Update current user data - ADD the new role to roles list, but DON'T change active_role
                    // CRITICAL: Always load from localStorage if currentUser is not in memory
                    if (!currentUser) {
                        const storedUser = localStorage.getItem('currentUser');
                        if (storedUser) {
                            currentUser = JSON.parse(storedUser);
                        }
                    }

                    if (currentUser) {
                        // Update roles list to include the new role
                        currentUser.roles = data.user_roles || [...(currentUser.roles || []), addRoleData.role];
                        // DO NOT update active_role or role - user hasn't chosen to switch yet
                        // currentUser.active_role = data.active_role;  // REMOVED
                        // currentUser.role = data.active_role;  // REMOVED
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    } else {
                        // Fallback: Create minimal currentUser object if it doesn't exist
                        console.warn('[handleAddRoleSubmit] currentUser not found, creating minimal object');
                        const minimalUser = {
                            id: window.AuthManager?.user?.id,
                            role: userRole,  // Keep current role
                            active_role: userRole,  // Keep current role
                            roles: data.user_roles || [addRoleData.role]
                        };
                        localStorage.setItem('currentUser', JSON.stringify(minimalUser));
                    }

                    // DO NOT update userRole variable or localStorage - user hasn't chosen to switch yet
                    // userRole = data.active_role;  // REMOVED
                    // localStorage.setItem('userRole', data.active_role);  // REMOVED

                    // Refresh role switcher to show the newly added role in dropdown
                    await setupRoleSwitcher();

                    // Refresh deletion countdown banner if role was restored
                    if (window.DeletionCountdownBanner && data.role_reactivated) {
                        await window.DeletionCountdownBanner.checkAndShowBanner();
                    }

                    // Store the new role data for the confirmation panel
                    // IMPORTANT: Use the newly ADDED role, not the current active_role from backend
                    window.pendingRoleSwitch = {
                        role: addRoleData.role,
                        active_role: addRoleData.role,  // The role we just added (not data.active_role which is the old role)
                        role_reactivated: data.role_reactivated
                    };

                    // Hide the form and show the success panel
                    document.getElementById('add-role-form').style.display = 'none';
                    const successPanel = document.getElementById('add-role-success-panel');
                    const roleNameElement = document.getElementById('add-role-success-role-name');
                    const successTitle = document.getElementById('add-role-success-title');
                    const switchBtnText = document.getElementById('switch-to-new-role-text');

                    if (roleNameElement) {
                        roleNameElement.textContent = formatRoleName(addRoleData.role);
                    }

                    if (successTitle) {
                        successTitle.textContent = data.role_reactivated
                            ? 'Role Reactivated Successfully!'
                            : 'Role Added Successfully!';
                    }

                    if (switchBtnText) {
                        switchBtnText.textContent = `Switch to ${formatRoleName(addRoleData.role)} Account`;
                    }

                    if (successPanel) {
                        successPanel.style.display = 'block';
                    }
                } else {
                    if (window.showToast) {
                        window.showToast(data.detail || 'Failed to add role', 'error');
                    }
                }
            } catch (error) {
                console.error('Error adding role:', error);
                if (window.showToast) {
                    window.showToast('Error adding role. Please try again.', 'error');
                }
            } finally {
                // Reset loading state
                if (submitBtn) submitBtn.disabled = false;
                if (btnText) btnText.style.display = 'inline';
                if (btnLoader) btnLoader.style.display = 'none';
            }
        }
    }

    async function switchToRole(newRole) {
        console.log('[switchToRole] Called with newRole:', newRole);
        console.log('[switchToRole] Current userRole:', userRole);
        console.log('[switchToRole] Current AuthManager.user.active_role:', window.AuthManager?.user?.active_role);
        console.log('[switchToRole] localStorage.userRole:', localStorage.getItem('userRole'));

        // REMOVED: The early return check was preventing role switches when the frontend state
        // didn't match the database state. Always make the API call to ensure database is updated.
        // The backend will handle checking if the role is already active.
        // if (newRole === userRole) {
        //     console.warn('[switchToRole] newRole === userRole, returning early (no switch needed)');
        //     return;
        // }

        closeProfileDropdown();
        if (window.showToast) {
            window.showToast(`Switching to ${formatRoleName(newRole)} role...`, 'info');
        }

        try {
            console.log('[switchToRole] Making API call to /api/switch-role...');
            const response = await fetch(`${API_BASE_URL}/api/switch-role`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getStoredAuthToken()}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                body: JSON.stringify({ role: newRole }),
                cache: 'no-cache'
            });

            console.log('[switchToRole] API response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('[switchToRole] API response data:', data);
                console.log('[switchToRole] Role switch successful, updating all state...');

                // CRITICAL: Update tokens with new JWT that has updated role information
                if (data.access_token) {
                    localStorage.setItem('token', data.access_token);
                    localStorage.setItem('access_token', data.access_token);
                    console.log('[switchToRole] Updated access token with new role');
                    console.log('[switchToRole] New token (first 50 chars):', data.access_token.substring(0, 50));
                }

                if (data.refresh_token) {
                    localStorage.setItem('refresh_token', data.refresh_token);
                    console.log('[switchToRole] Updated refresh token');
                }

                // FIX 1: Update AuthManager COMPLETELY (both token AND user object)
                if (window.AuthManager) {
                    window.AuthManager.token = data.access_token;

                    // CRITICAL: Update AuthManager's user object with new active_role
                    if (window.AuthManager.user) {
                        window.AuthManager.user.active_role = data.active_role;
                        window.AuthManager.user.role = data.active_role;
                        console.log('[switchToRole] Updated AuthManager.user.active_role to:', data.active_role);
                    }
                }

                // FIX 2: Update profile-system's userRole variable
                userRole = data.active_role;
                // Only store userRole if it has a valid value (prevent storing "undefined" string)
                if (data.active_role && data.active_role !== 'undefined') {
                    localStorage.setItem('userRole', data.active_role);
                    console.log('[switchToRole] Updated localStorage.userRole to:', data.active_role);
                }

                // FIX 3: Update currentUser object with active_role field
                // CRITICAL: Always load from localStorage if currentUser is not in memory
                if (!currentUser) {
                    const storedUser = localStorage.getItem('currentUser');
                    if (storedUser) {
                        currentUser = JSON.parse(storedUser);
                    }
                }

                if (currentUser) {
                    currentUser.role = data.active_role;
                    currentUser.active_role = data.active_role; // Add active_role field explicitly
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    console.log('[switchToRole] Updated currentUser object with new role');
                } else {
                    // Fallback: Create minimal currentUser object if it doesn't exist
                    console.warn('[switchToRole] currentUser not found in memory or localStorage, creating minimal object');
                    const minimalUser = {
                        id: window.AuthManager?.user?.id,
                        role: data.active_role,
                        active_role: data.active_role,
                        roles: data.user_roles || []
                    };
                    localStorage.setItem('currentUser', JSON.stringify(minimalUser));
                    console.log('[switchToRole] Created minimal currentUser object');
                }

                // FIX 4: Set localStorage flag to prevent bounce-back on next page
                // Use timestamp-based approach: valid for 5 seconds after role switch
                const switchTimestamp = Date.now();
                localStorage.setItem('role_switch_timestamp', switchTimestamp.toString());
                localStorage.setItem('role_switch_target', data.active_role);
                console.log('[switchToRole] Set role_switch_timestamp:', switchTimestamp, 'for role:', data.active_role);

                // CRITICAL FIX: Force localStorage sync before navigation
                // Some browsers may delay localStorage writes, so verify the token is actually stored
                const storedToken = localStorage.getItem('access_token');
                if (storedToken !== data.access_token) {
                    console.error('[switchToRole] WARNING: Token not properly stored! Retrying...');
                    localStorage.setItem('token', data.access_token);
                    localStorage.setItem('access_token', data.access_token);
                }

                console.log('[switchToRole] Final verification before navigation:');
                console.log('  - localStorage.access_token matches:', localStorage.getItem('access_token') === data.access_token);
                console.log('  - localStorage.userRole:', localStorage.getItem('userRole'));
                console.log('  - localStorage.role_switch_timestamp:', localStorage.getItem('role_switch_timestamp'));
                console.log('  - localStorage.role_switch_target:', localStorage.getItem('role_switch_target'));

                updateUI();
                updateProfileDropdown();

                if (window.showToast) {
                    window.showToast(`Switched to ${formatRoleName(data.active_role)} role`, 'success');
                }

                // FIX 5: Navigate after ensuring all state is updated
                setTimeout(() => {
                    const profileUrl = getProfileUrl(data.active_role);

                    // FINAL DEBUG: Verify flags are set before navigation
                    console.log('[switchToRole] ========== PRE-NAVIGATION STATE ==========');
                    console.log('  Target URL:', profileUrl);
                    console.log('  localStorage.role_switch_timestamp:', localStorage.getItem('role_switch_timestamp'));
                    console.log('  localStorage.role_switch_target:', localStorage.getItem('role_switch_target'));
                    console.log('  localStorage.userRole:', localStorage.getItem('userRole'));
                    console.log('  Time until expiry:', 10000 - (Date.now() - parseInt(localStorage.getItem('role_switch_timestamp'))), 'ms');
                    console.log('  Timestamp age:', Date.now() - parseInt(localStorage.getItem('role_switch_timestamp')), 'ms');
                    console.log('  Current time:', Date.now());
                    console.log('============================================');

                    window.location.href = profileUrl;
                }, 100);
            } else {
                const error = await response.json();
                if (window.showToast) {
                    window.showToast(error.detail || 'Failed to switch role', 'error');
                }
            }
        } catch (error) {
            console.error('Role switch error:', error);
            if (window.showToast) {
                window.showToast('Error switching role', 'error');
            }
        }
    }

    function formatRoleName(role) {
        const roleNames = {
            'user': 'User',
            'student': 'Student',
            'tutor': 'Tutor',
            'parent': 'Parent',
            'bookstore': 'Bookstore',
            'delivery': 'Delivery',
            'advertiser': 'Advertiser',
            'author': 'Author',
            'church': 'Church'
        };
        return roleNames[role] || role.charAt(0).toUpperCase() + role.slice(1);
    }

    // Main UI Update Function
    function updateUI() {
        // Show profile container and hide login/register buttons
        const profileContainer = document.getElementById('profile-container');
        const notificationBell = document.getElementById('notification-bell');
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const mobileAuthSection = document.getElementById('mobile-auth-section');
        const mobileLoginBtn = document.getElementById('mobile-login-btn');
        const mobileRegisterBtn = document.getElementById('mobile-register-btn');
        const heroLoginBtn = document.getElementById('hero-login-btn');
        const heroRegisterBtn = document.getElementById('hero-register-btn');

        // Hide login/register buttons for authenticated users (desktop nav)
        if (loginBtn) {
            loginBtn.classList.add('hidden');
            loginBtn.style.display = 'none';
        }
        if (registerBtn) {
            registerBtn.classList.add('hidden');
            registerBtn.style.display = 'none';
        }

        // Hide login/register buttons for authenticated users (mobile nav)
        if (mobileAuthSection) {
            mobileAuthSection.classList.add('hidden');
            mobileAuthSection.style.display = 'none';
        }
        if (mobileLoginBtn) {
            mobileLoginBtn.classList.add('hidden');
            mobileLoginBtn.style.display = 'none';
        }
        if (mobileRegisterBtn) {
            mobileRegisterBtn.classList.add('hidden');
            mobileRegisterBtn.style.display = 'none';
        }

        // Hide login/register buttons for authenticated users (hero section)
        if (heroLoginBtn) {
            heroLoginBtn.classList.add('hidden');
            heroLoginBtn.style.display = 'none';
        }
        if (heroRegisterBtn) {
            heroRegisterBtn.classList.add('hidden');
            heroRegisterBtn.style.display = 'none';
        }

        // Show profile container
        if (profileContainer) {
            profileContainer.classList.remove('hidden');
            profileContainer.style.display = 'flex';
            profileContainer.style.visibility = 'visible';
        }

        if (notificationBell) {
            notificationBell.classList.remove('hidden');
            notificationBell.style.display = 'flex';
        }

        // Update profile name
        const profileName = document.getElementById('profile-name');
        if (profileName && currentUser) {
            const userName = currentUser.name || `${currentUser.first_name} ${currentUser.father_name}`;
            profileName.textContent = userName;
        }

        updateProfilePictures();

        // Update mobile profile section
        updateMobileProfileSection();
    }

    // Check if current page matches user's active role
    let hasRedirected = false; // Prevent multiple redirects
    function checkRolePageMismatch() {
        console.log('[profile-system.checkRolePageMismatch] ========== FUNCTION CALLED ==========');
        console.log('[profile-system.checkRolePageMismatch] Current time:', Date.now());
        console.log('[profile-system.checkRolePageMismatch] URL:', window.location.pathname);
        console.log('[profile-system.checkRolePageMismatch] userRole variable:', userRole);

        // CRITICAL FIX: Check grace period FIRST before doing ANY checks
        // This prevents interference with role switching flow
        const switchTimestamp = localStorage.getItem('role_switch_timestamp');
        const targetRole = localStorage.getItem('role_switch_target');

        console.log('[profile-system.checkRolePageMismatch] localStorage.role_switch_timestamp:', switchTimestamp);
        console.log('[profile-system.checkRolePageMismatch] localStorage.role_switch_target:', targetRole);

        if (switchTimestamp) {
            const timeSinceSwitch = Date.now() - parseInt(switchTimestamp);
            const isWithinGracePeriod = timeSinceSwitch < 10000; // 10 seconds grace period

            console.log('[profile-system.checkRolePageMismatch] Timestamp age:', timeSinceSwitch, 'ms');
            console.log('[profile-system.checkRolePageMismatch] Is within grace period?', isWithinGracePeriod);

            if (isWithinGracePeriod) {
                console.log('[profile-system.checkRolePageMismatch] ✅ Role switch in progress to:', targetRole, '- COMPLETELY SKIPPING all checks (within 10s grace period)');
                console.log('[profile-system.checkRolePageMismatch] Time since switch:', timeSinceSwitch, 'ms');
                console.log('[profile-system.checkRolePageMismatch] Grace period expires in:', 10000 - timeSinceSwitch, 'ms');
                console.log('[profile-system.checkRolePageMismatch] ========== EARLY RETURN ==========');
                return; // IMMEDIATELY RETURN - Don't do ANY checks during grace period
            } else {
                // Grace period expired - Check if role switch completed successfully
                console.log('[profile-system.checkRolePageMismatch] ⏰ Grace period expired (', timeSinceSwitch, 'ms > 10000ms)');
                console.log('[profile-system.checkRolePageMismatch] Checking if role switch completed...');
                console.log('[profile-system.checkRolePageMismatch] Target role:', targetRole, 'Current userRole:', userRole);

                if (userRole === targetRole) {
                    // SUCCESS! Role switch completed
                    console.log('[profile-system.checkRolePageMismatch] ✅ Role switch SUCCESS! Clearing flags.');
                    localStorage.removeItem('role_switch_timestamp');
                    localStorage.removeItem('role_switch_target');
                    return; // Don't redirect, role is correct
                } else {
                    // FAILURE! Force update userRole to target
                    console.log('[profile-system.checkRolePageMismatch] ❌ Role reverted! Forcing userRole from', userRole, 'to', targetRole);
                    userRole = targetRole;
                    localStorage.setItem('userRole', targetRole);
                    localStorage.removeItem('role_switch_timestamp');
                    localStorage.removeItem('role_switch_target');
                    return; // Don't redirect, we fixed it
                }
            }
        } else {
            console.log('[profile-system.checkRolePageMismatch] No timestamp found - not a role switch');
        }

        // Don't check if already redirected
        if (hasRedirected) return;

        const currentPath = window.location.pathname;
        const isProfilePage = currentPath.includes('/profile-pages/');

        // CRITICAL FIX: Also check for undefined/null string values
        if (!isProfilePage || !userRole || userRole === 'undefined' || userRole === 'null' || !currentUser || !getStoredAuthToken()) {
            console.log('[profile-system.checkRolePageMismatch] Skipping check - not logged in or invalid role:', userRole);
            return; // Not on a profile page or no role set or not logged in
        }

        // Extract current page role from URL (e.g., "tutor-profile.html" -> "tutor")
        const pageMatch = currentPath.match(/\/([a-z-]+)-profile\.html$/);
        if (!pageMatch) return;

        const pageRole = pageMatch[1];

        // If page role doesn't match active role, show message and redirect
        if (pageRole !== userRole) {
            console.log(`[profile-system] Role mismatch detected: page=${pageRole}, active=${userRole}`);
            hasRedirected = true; // Mark as redirected

            // Show helpful message using toast if available, otherwise alert
            const message = `Your active role is ${formatRoleName(userRole)}. To view ${formatRoleName(pageRole)} profile, please use the role switcher in the navigation menu.`;

            if (window.showToast) {
                window.showToast(message, 'info');
            } else {
                // Fallback to subtle notification
                console.log(`[profile-system] ${message}`);
            }

            // Redirect to correct profile page
            console.log(`[profile-system] Redirecting to ${userRole} profile page...`);
            const correctProfileUrl = getProfileUrl(userRole);

            // Small delay to let the message show
            setTimeout(() => {
                window.location.replace(correctProfileUrl); // Use replace to avoid adding to history
            }, 100);
        } else {
            // Page matches role - no redirect needed
            console.log(`[profile-system] Page role matches active role (${userRole}) - no redirect needed`);
        }
    }

    // Initialization
    async function initialize() {
        // Prevent multiple initializations
        if (_initialized) {
            console.log('⚠️ ProfileSystem already initialized, skipping...');
            return;
        }
        _initialized = true;

        // Check for saved user session
        const savedUser = localStorage.getItem("currentUser");
        const savedRole = localStorage.getItem("userRole");
        const savedToken = getStoredAuthToken(); // Check both 'token' and 'access_token'

        // CRITICAL FIX: Check token and user, NOT role
        // User can be authenticated (have token) without having a role
        if (savedUser && savedToken) {
            try {
                currentUser = JSON.parse(savedUser);

                // CRITICAL: Always sync userRole from localStorage
                // Ensures we get the latest role after deactivation/removal
                if (savedRole && savedRole !== 'undefined' && savedRole !== 'null') {
                    userRole = savedRole;

                    // Also sync with currentUser object if mismatch
                    if (currentUser.role !== savedRole || currentUser.active_role !== savedRole) {
                        currentUser.role = savedRole;
                        currentUser.active_role = savedRole;
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    }
                } else {
                    // No valid role - clear the userRole variable
                    userRole = null;
                }

                // Check if current page matches active role (only if we have a role)
                if (userRole) {
                    checkRolePageMismatch();
                }

                // ALWAYS update UI for authenticated users (even without a role)
                updateUI();
                updateProfileDropdown();
            } catch (error) {
                console.error("Session restoration error:", error);
            }
        }

        // Setup event listeners
        document.addEventListener('click', function(event) {
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

        // Setup add role form submission
        // Try immediately in case modal is already in DOM
        attachAddRoleFormListener();

        // Also listen for modal loader events (modals load asynchronously)
        document.addEventListener('modalsLoaded', function() {
            console.log('[ProfileSystem] modalsLoaded event received, attaching form listener');
            attachAddRoleFormListener();
        });
        document.addEventListener('commonModalsLoaded', function() {
            console.log('[ProfileSystem] commonModalsLoaded event received, attaching form listener');
            attachAddRoleFormListener();
        });
    }

    // Public API
    return {
        initialize,
        updateUI,
        toggleProfileDropdown,
        openProfileDropdown,
        closeProfileDropdown,
        switchToRole,
        formatRoleName,
        updateProfileDropdown,
        fetchCurrentUserData,
        setupRoleSwitcher,
        updateProfilePictures,
        updateMobileProfileSection,
        openAddRoleModal,
        closeAddRoleModal,
        goBackToStep1,
        handleResendOTP,
        handleAddRoleSubmit,
        handleOTPDestinationChange,
        getCurrentUser: () => currentUser,
        getUserRole: () => userRole
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ProfileSystem.initialize);
} else {
    ProfileSystem.initialize();
}

// Listen for role updates from AuthManager (triggered after grace period role switch)
window.addEventListener('userRoleUpdated', function(event) {
    console.log('[profile-system] userRoleUpdated event received:', event.detail);

    // Reload currentUser from localStorage (AuthManager already updated it)
    const updatedUser = localStorage.getItem('currentUser');
    if (updatedUser) {
        try {
            const user = JSON.parse(updatedUser);
            console.log('[profile-system] Refreshing UI with updated user:', user);

            // Call updateUI to refresh the profile display
            if (ProfileSystem && ProfileSystem.updateUI) {
                ProfileSystem.updateUI();
                console.log('[profile-system] UI refreshed after role switch');
            }
        } catch (error) {
            console.error('[profile-system] Error parsing updated user:', error);
        }
    }
});

// Toggle mobile profile dropdown (for mobile menu)
window.toggleMobileProfileDropdown = function() {
    const dropdown = document.querySelector('.mobile-profile-dropdown');
    const toggle = document.getElementById('mobile-profile-toggle');

    if (dropdown) {
        dropdown.classList.toggle('open');
    }
    if (toggle) {
        toggle.classList.toggle('expanded');
    }
};

// Open login modal (for mobile menu and other places)
window.openLoginModal = window.openLoginModal || function() {
    if (window.openAuthModal) {
        window.openAuthModal('login');
    } else if (window.openModal) {
        window.openModal('login-modal');
    }
};

// Open register modal (for mobile menu and other places)
window.openRegisterModal = window.openRegisterModal || function() {
    if (window.openAuthModal) {
        window.openAuthModal('register');
    } else if (window.openModal) {
        window.openModal('register-modal');
    }
};

// Export functions to window for global access
window.toggleProfileDropdown = ProfileSystem.toggleProfileDropdown;
window.openProfileDropdown = ProfileSystem.openProfileDropdown;
window.closeProfileDropdown = ProfileSystem.closeProfileDropdown;
window.switchToRole = ProfileSystem.switchToRole;
window.formatRoleName = ProfileSystem.formatRoleName;
window.updateProfileDropdown = ProfileSystem.updateProfileDropdown;
window.fetchCurrentUserData = ProfileSystem.fetchCurrentUserData;
window.setupRoleSwitcher = ProfileSystem.setupRoleSwitcher;
window.updateProfilePictures = ProfileSystem.updateProfilePictures;
window.updateMobileProfileSection = ProfileSystem.updateMobileProfileSection;
window.openAddRoleModal = ProfileSystem.openAddRoleModal;
window.closeAddRoleModal = ProfileSystem.closeAddRoleModal;
window.goBackToStep1 = ProfileSystem.goBackToStep1;
window.handleResendOTP = ProfileSystem.handleResendOTP;
window.handleAddRoleSubmit = ProfileSystem.handleAddRoleSubmit;
window.handleOTPDestinationChange = ProfileSystem.handleOTPDestinationChange;

// ============================================
// ADD ROLE SUCCESS PANEL HANDLERS
// ============================================

/**
 * Confirm switch to the newly added role
 * Called when user clicks "Switch to Account" button in success panel
 */
window.confirmSwitchToNewRole = async function() {
    if (!window.pendingRoleSwitch) {
        console.error('[confirmSwitchToNewRole] No pending role switch data found');
        return;
    }

    const { role, active_role } = window.pendingRoleSwitch;

    console.log('[confirmSwitchToNewRole] Switching to newly added role:', active_role);

    // Close the modal first
    if (window.closeModal) {
        window.closeModal('add-role-modal');
    } else {
        document.getElementById('add-role-modal')?.classList.add('hidden');
    }

    // Use the switchToRole function to properly switch to the newly added role
    // This will update all state and navigate to the profile page
    await ProfileSystem.switchToRole(active_role);
};

/**
 * Stay with current role and close the modal
 * Called when user clicks "Stay Here" button in success panel
 */
window.stayWithCurrentRole = function() {
    console.log('[stayWithCurrentRole] User chose to stay with current role');

    // Clear pending role switch data
    window.pendingRoleSwitch = null;

    // Reset the modal state
    const successPanel = document.getElementById('add-role-success-panel');
    const form = document.getElementById('add-role-form');

    if (successPanel) {
        successPanel.style.display = 'none';
    }

    if (form) {
        form.style.display = 'block';
        form.reset();
    }

    // Reset to step 1
    const step1 = document.getElementById('add-role-step1');
    const step2 = document.getElementById('add-role-step2');

    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';

    // Close the modal
    if (window.closeModal) {
        window.closeModal('add-role-modal');
    } else {
        document.getElementById('add-role-modal')?.classList.add('hidden');
    }

    // Show success toast
    if (window.showToast) {
        window.showToast('Role added successfully! You can switch to it anytime from the profile dropdown.', 'success');
    }
};