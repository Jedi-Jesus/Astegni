/* ============================================
   PROFILE SYSTEM JS - Reusable Component
   ============================================ */
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

// Check and create openModal if it doesn't exist
if (typeof window.openModal === 'undefined') {
    window.openModal = function(modalId) {
        if (modalId === 'register-modal') {
            if (confirm('To add a new role, please go to the main page. Go there now?')) {
                window.location.href = '../index.html#register';
            }
        } else {
            console.log(`Modal ${modalId} requested but not available on this page`);
        }
    };
}

// Profile System Configuration
const ProfileSystem = (function() {
    'use strict';

    // Configuration
    const API_BASE_URL = "http://localhost:8000";
    
    const PROFILE_URLS = {
        user: "../my-profile-tier-1/user-profile.html",
        tutor: "../my-profile-tier-1/tutor-profile.html",
        student: "../my-profile-tier-1/student-profile.html",
        guardian: "../my-profile-tier-1/parent-profile.html",
        bookstore: "../my-profile-tier-1/bookstore-profile.html",
        delivery: "../my-profile-tier-1/delivery-profile.html",
        advertiser: "../my-profile-tier-1/advertiser-profile.html",
        church: "../my-profile-tier-1/church-profile.html",
        author: "../my-profile-tier-1/author-profile.html",
    };

    const ROLE_AVATAR_SYSTEM = {
        student: {
            category: "Student",
            defaults: [
                {
                    id: "student-boy-young",
                    path: "pictures/student-kid-boy.jpeg",
                    label: "Young Student (Boy)",
                }
            ],
            fallbackColor: "10b981",
        },
        tutor: {
            category: "Tutor",
            defaults: [
                {
                    id: "tutor-male-professional",
                    path: "pictures/tutor-man.jpg",
                    label: "Professional Male Tutor",
                }
            ],
            fallbackColor: "f59e0b",
        },
        guardian: {
            category: "Parent/Guardian",
            defaults: [
                {
                    id: "parent-father-young",
                    path: "pictures/Dad-profile.jpg",
                    label: "Young Father",
                }
            ],
            fallbackColor: "ef4444",
        },
        user: {
            category: "General User",
            defaults: [
                {
                    id: "user-avatar-1",
                    path: "pictures/boy-user-image.jpg",
                    label: "User Avatar 1",
                }
            ],
            fallbackColor: "6366f1",
        }
    };

    // State
    let currentUser = null;
    let userRole = null;

    // API Functions
    async function fetchCurrentUserData() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                currentUser = {
                    id: userData.id,
                    name: `${userData.first_name} ${userData.last_name}`,
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    email: userData.email,
                    phone: userData.phone,
                    role: userData.role,
                    profile_picture: userData.profile_picture,
                    created_at: userData.created_at,
                    is_active: userData.is_active,
                    email_verified: userData.email_verified
                };
                userRole = userData.role;

                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                localStorage.setItem('userRole', userData.role);

                await fetchUserRoles();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error fetching user data:', error);
            return false;
        }
    }

    async function fetchUserRoles() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/my-roles`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (currentUser) {
                    currentUser.roles = data.roles || [];
                    userRole = data.active_role || userRole;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    localStorage.setItem('userRole', data.active_role);
                }
                return data.roles;
            }
            return [];
        } catch (error) {
            console.error('Error fetching user roles:', error);
            return [];
        }
    }

    // UI Update Functions
    function updateProfilePictures() {
        let avatarUrl = null;
        
        if (currentUser?.profile_picture) {
            avatarUrl = currentUser.profile_picture;
        } else {
            const roleConfig = ROLE_AVATAR_SYSTEM[userRole] || ROLE_AVATAR_SYSTEM.user;
            if (roleConfig?.defaults?.[0]) {
                avatarUrl = roleConfig.defaults[0].path;
            } else {
                const name = currentUser?.name || 'User';
                const color = roleConfig?.fallbackColor || '6366f1';
                avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff`;
            }
        }
        
        // Update ALL profile picture elements
        const elements = [
            document.getElementById('profile-pic'),
            document.getElementById('dropdown-profile-pic'),
            document.querySelector('.mobile-profile-pic')
        ];
        
        elements.forEach(element => {
            if (element) {
                element.src = avatarUrl;
                element.alt = `${userRole || 'User'} avatar`;
                
                element.onerror = () => {
                    const name = currentUser?.name || 'User';
                    element.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
                };
            }
        });
    }

    // Dropdown Management
    function toggleProfileDropdown() {
        const toggle = document.getElementById('profile-dropdown-toggle');
        const menu = document.getElementById('profile-dropdown-menu');

        if (!toggle || !menu) return;

        const isOpen = !menu.classList.contains('hidden');
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
        menu.classList.remove('hidden');

        setTimeout(() => {
            menu.classList.add('show');
        }, 10);

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

        setTimeout(() => {
            menu.classList.add('hidden');
        }, 300);

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
        await fetchCurrentUserData();

        if (!currentUser) return;

        const elements = {
            name: document.getElementById('dropdown-user-name'),
            email: document.getElementById('dropdown-user-email'),
            role: document.getElementById('dropdown-user-role'),
            profileName: document.getElementById('profile-name')
        };

        const userName = currentUser.name || `${currentUser.first_name} ${currentUser.last_name}`;

        if (elements.name) elements.name.textContent = userName;
        if (elements.email) elements.email.textContent = currentUser.email || '';
        if (elements.role) elements.role.textContent = formatRoleName(userRole);
        if (elements.profileName) elements.profileName.textContent = userName;

        updateProfilePictures();

        // Make dropdown header clickable
        const dropdownHeader = document.querySelector('.dropdown-header');
        if (dropdownHeader) {
            dropdownHeader.style.cursor = 'pointer';
            dropdownHeader.onclick = () => {
                const profileUrl = PROFILE_URLS[userRole] || 'my-profile-tier-1/user-profile.html';
                window.location.href = profileUrl;
            };
        }

        await setupRoleSwitcher();
    }

    // Role Switching
    async function setupRoleSwitcher() {
        const roleSwitcherSection = document.getElementById('role-switcher-section');
        const roleOptions = document.getElementById('role-options');

        if (!roleSwitcherSection || !roleOptions) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/my-roles`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('Failed to fetch user roles');
                roleSwitcherSection.classList.add('hidden');
                return;
            }

            const data = await response.json();
            const userRoles = data.roles || [];
            const activeRole = data.active_role || userRole;

            if (currentUser) {
                currentUser.roles = userRoles;
            }
            userRole = activeRole;
            localStorage.setItem('userRole', activeRole);

            roleSwitcherSection.classList.remove('hidden');
            roleOptions.innerHTML = '';

            if (userRoles.length === 1) {
                // Single role with Add Role option
                const currentRoleOption = document.createElement('div');
                currentRoleOption.className = 'role-option active disabled';
                currentRoleOption.innerHTML = `
                    <span class="role-name">${formatRoleName(activeRole)}</span>
                    <span class="role-badge">CURRENT</span>
                `;
                roleOptions.appendChild(currentRoleOption);
            } else {
                // Multiple roles
                userRoles.forEach(role => {
                    const roleOption = document.createElement('div');
                    roleOption.className = 'role-option';
                    
                    if (role === activeRole) {
                        roleOption.classList.add('active');
                    }
                    
                    roleOption.innerHTML = `
                        <span class="role-name">${formatRoleName(role)}</span>
                        ${role === activeRole ? '<span class="role-badge">ACTIVE</span>' : ''}
                    `;
                    
                    roleOption.onclick = () => switchToRole(role);
                    roleOptions.appendChild(roleOption);
                });
            }

            // Add "Add Role" option
            const addRoleOption = document.createElement('div');
            addRoleOption.className = 'role-option add-role-option';
            addRoleOption.innerHTML = `
                <span class="add-role-icon">+</span>
                <span class="role-name">Add New Role</span>
            `;
            addRoleOption.onclick = () => {
                closeProfileDropdown();
                if (window.openModal) {
                    window.openModal('register-modal');
                }
                if (window.showToast) {
                    window.showToast('Register with same email to add a new role', 'info');
                }
            };
            roleOptions.appendChild(addRoleOption);

            const dropdownUserRole = document.getElementById('dropdown-user-role');
            if (dropdownUserRole) {
                dropdownUserRole.textContent = formatRoleName(activeRole);
            }

        } catch (error) {
            console.error('Error fetching user roles:', error);
            roleSwitcherSection.classList.add('hidden');
        }
    }

    async function switchToRole(newRole) {
        if (newRole === userRole) return;

        closeProfileDropdown();
        if (window.showToast) {
            window.showToast(`Switching to ${formatRoleName(newRole)} role...`, 'info');
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/switch-role`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ new_role: newRole })
            });

            if (response.ok) {
                const data = await response.json();

                userRole = data.active_role;
                localStorage.setItem('userRole', data.active_role);

                if (currentUser) {
                    currentUser.role = data.active_role;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                }

                updateUI();
                updateProfileDropdown();

                if (window.showToast) {
                    window.showToast(`Switched to ${formatRoleName(data.active_role)} role`, 'success');
                }

                setTimeout(() => {
                    const profileUrl = PROFILE_URLS[data.active_role] || 'index.html';
                    window.location.href = profileUrl;
                }, 500);
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
            'guardian': 'Guardian',
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
        // Show profile container
        const profileContainer = document.getElementById('profile-container');
        const notificationBell = document.getElementById('notification-bell');
        
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
            const userName = currentUser.name || `${currentUser.first_name} ${currentUser.last_name}`;
            profileName.textContent = userName;
        }
        
        updateProfilePictures();
    }

    // Initialization
    async function initialize() {
        // Check for saved user session
        const savedUser = localStorage.getItem("currentUser");
        const savedRole = localStorage.getItem("userRole");
        const savedToken = localStorage.getItem("token");

        if (savedUser && savedRole && savedToken) {
            try {
                currentUser = JSON.parse(savedUser);
                userRole = savedRole;
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
            
            if (profileContainer && !profileContainer.contains(event.target) && dropdownMenu) {
                dropdownMenu.classList.add('hidden');
            }
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