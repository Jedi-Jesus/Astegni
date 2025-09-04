// Enhanced index.js - Cleaned and Optimized Version

// ============================================
//   GLOBAL STATE & CONFIGURATION
// ============================================

// Error handler to ensure loading screen is removed
window.addEventListener("error", (e) => {
    console.error("Script error:", e);
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
        loadingScreen.style.display = "none";
    }
});

// API Configuration
const API_BASE_URL = "http://localhost:8000";

// Helper function for API calls
async function apiCall(endpoint, method = "GET", body = null, token = null) {
    const headers = {
        "Content-Type": "application/json",
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const config = {
        method,
        headers,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    return response;
}

// Application State
const APP_STATE = {
    isLoggedIn: false,
    currentUser: null,
    userRole: null,
    theme: localStorage.getItem("theme") || "light",
    notifications: [],
    cart: [],
    favorites: [],
    currentVideo: null,
    videoComments: [],
};

// Profile URL mapping based on user role
const PROFILE_URLS = {
    user: "my-profile-tier-1/user-profile.html",
    tutor: "my-profile-tier-1/tutor-profile.html",
    student: "my-profile-tier-1/student-profile.html",
    guardian: "my-profile-tier-1/parent-profile.html",
    bookstore: "my-profile-tier-1/bookstore-profile.html",
    delivery: "my-profile-tier-1/delivery-profile.html",
    advertiser: "my-profile-tier-1/advertiser-profile.html",
    church: "my-profile-tier-1/church-profile.html",
    author: "my-profile-tier-1/author-profile.html",
};

const CONFIG = {
    API_URL: "https://api.astegni.et",
    ANIMATION_DURATION: 300,
    SCROLL_THRESHOLD: 100,
    TYPING_SPEED: 100,
    COUNTER_DURATION: 2000,
};

// Comprehensive avatar system
const ROLE_AVATAR_SYSTEM = {
    student: {
        category: "Student",
        defaults: [
            {
                id: "student-boy-young",
                path: "pictures/student-kid-boy.jpeg",
                label: "Young Student (Boy)",
            },
            {
                id: "student-girl-young",
                path: "pictures/student-kid-girl.jpeg",
                label: "Young Student (Girl)",
            },
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
            },
            {
                id: "tutor-female-professional",
                path: "pictures/tutor-woman.jpg",
                label: "Professional Female Tutor",
            },
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
            },
            {
                id: "parent-mother-young",
                path: "pictures/Mom-profile.jpg",
                label: "Young Mother",
            },
        ],
        fallbackColor: "ef4444",
    },
    bookstore: {
        category: "Bookstore",
        defaults: [
            {
                id: "bookstore-modern",
                path: "pictures/bookstore-profile.jpg",
                label: "Modern Bookstore",
            },
        ],
        fallbackColor: "8b5cf6",
    },
    delivery: {
        category: "Delivery Service",
        defaults: [
            {
                id: "delivery-person-male",
                path: "pictures/delivery-man.jpg",
                label: "Male Delivery Person",
            },
        ],
        fallbackColor: "06b6d4",
    },
    advertiser: {
        category: "Advertiser",
        defaults: [
            {
                id: "advertiser-agency",
                path: "pictures/ad-profile-1.jpeg",
                label: "Ad Agency",
            },
        ],
        fallbackColor: "ec4899",
    },
    author: {
        category: "Author",
        defaults: [
            {
                id: "author-male-young",
                path: "pictures/author-boy.jpg",
                label: "Young Male Author",
            },
        ],
        fallbackColor: "6366f1",
    },
    church: {
        category: "Church/Religious Organization",
        defaults: [
            {
                id: "church-cross",
                path: "pictures/jesus-image-butterfly.jpg",
                label: "Church Cross",
            },
        ],
        fallbackColor: "a855f7",
    },
    user: {
        category: "General User",
        defaults: [
            {
                id: "user-avatar-1",
                path: "pictures/boy-user-image.jpg",
                label: "User Avatar 1",
            },
        ],
        fallbackColor: "6366f1",
    },
};

// Sample video data
const VIDEO_DATA = [
    {
        id: 1,
        title: "Introduction to Astegni Platform",
        description: "Learn how to navigate and use all features of Astegni educational platform.",
        duration: "5:23",
        views: "10K",
        category: "intro",
        likes: 523,
        dislikes: 12,
        comments: [],
    },
];

// ============================================
//   PROFILE AND AUTHENTICATION MANAGEMENT
// ============================================

// Fetch current user data from database
async function fetchCurrentUserData() {
    try {
        const response = await fetch('http://localhost:8000/api/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const userData = await response.json();

            APP_STATE.currentUser = {
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

            APP_STATE.userRole = userData.role;

            localStorage.setItem('currentUser', JSON.stringify(APP_STATE.currentUser));
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

// Fetch user roles from database
async function fetchUserRoles() {
    try {
        const response = await fetch('http://localhost:8000/api/my-roles', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();

            if (APP_STATE.currentUser) {
                APP_STATE.currentUser.roles = data.roles || [];
                APP_STATE.userRole = data.active_role || APP_STATE.userRole;

                localStorage.setItem('currentUser', JSON.stringify(APP_STATE.currentUser));
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

// FIX 1 & 2: Enhanced UI update with proper profile picture handling
function updateUIForLoggedInUser() {
    if (!APP_STATE.currentUser) return;
    
    // Hide ALL login/register buttons
    const loginButtons = document.querySelectorAll(
        '#login-btn, #register-btn, #hero-login-btn, #hero-register-btn, ' +
        '#mobile-login-btn, #mobile-register-btn'
    );
    loginButtons.forEach(btn => {
        if (btn) {
            btn.style.display = 'none';
            btn.classList.add('hidden');
        }
    });
    
    // Show profile container and notifications
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
    if (profileName) {
        const userName = APP_STATE.currentUser.name || 
            `${APP_STATE.currentUser.first_name} ${APP_STATE.currentUser.last_name}`;
        profileName.textContent = userName;
    }
    
    // FIX 2: Update all profile pictures
    updateProfilePictures();
    
    // Update mobile menu
    addMobileProfileOptions();
    
    // Update dropdown
    updateProfileDropdown();
}

// FIX 2: Synchronized profile picture updates
function updateProfilePictures() {
    let avatarUrl = null;
    
    // Priority: user's uploaded picture > role default > UI Avatar
    if (APP_STATE.currentUser?.profile_picture) {
        avatarUrl = APP_STATE.currentUser.profile_picture;
    } else {
        const roleConfig = ROLE_AVATAR_SYSTEM[APP_STATE.userRole];
        if (roleConfig?.defaults?.[0]) {
            avatarUrl = roleConfig.defaults[0].path;
        } else {
            const name = APP_STATE.currentUser?.name || 'User';
            const color = roleConfig?.fallbackColor || '6366f1';
            avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff`;
        }
    }
    
    // Update ALL profile picture elements
    const profilePic = document.getElementById('profile-pic');
    const dropdownProfilePic = document.getElementById('dropdown-profile-pic');
    const mobileProfilePic = document.querySelector('.mobile-profile-pic');
    
    [profilePic, dropdownProfilePic, mobileProfilePic].forEach(element => {
        if (element) {
            element.src = avatarUrl;
            element.alt = `${APP_STATE.userRole || 'User'} avatar`;
            
            element.onerror = () => {
                const name = APP_STATE.currentUser?.name || 'User';
                element.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
            };
        }
    });
}

// Profile dropdown management
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

// FIX 3: Update profile dropdown with clickable header
async function updateProfileDropdown() {
    await fetchCurrentUserData();

    if (!APP_STATE.currentUser) return;

    const dropdownUserName = document.getElementById('dropdown-user-name');
    const dropdownUserEmail = document.getElementById('dropdown-user-email');
    const dropdownUserRole = document.getElementById('dropdown-user-role');

    const userName = APP_STATE.currentUser.name ||
        `${APP_STATE.currentUser.first_name} ${APP_STATE.currentUser.last_name}`;

    if (dropdownUserName) dropdownUserName.textContent = userName;
    if (dropdownUserEmail) dropdownUserEmail.textContent = APP_STATE.currentUser.email || '';
    if (dropdownUserRole) dropdownUserRole.textContent = formatRoleName(APP_STATE.userRole);

    // Update profile pictures
    updateProfilePictures();

    // FIX 3: Make dropdown header clickable
    const dropdownHeader = document.querySelector('.dropdown-header');
    if (dropdownHeader) {
        dropdownHeader.style.cursor = 'pointer';
        dropdownHeader.onclick = () => {
            const profileUrl = PROFILE_URLS[APP_STATE.userRole] || 'my-profile-tier-1/user-profile.html';
            window.location.href = profileUrl;
        };
    }

    // Setup role switcher
    await setupRoleSwitcher();
}

// FIX 5: Enhanced role switcher with Add Role option
async function setupRoleSwitcher() {
    const roleSwitcherSection = document.getElementById('role-switcher-section');
    const roleOptions = document.getElementById('role-options');

    if (!roleSwitcherSection || !roleOptions) return;

    try {
        const response = await fetch('http://localhost:8000/api/my-roles', {
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
        const activeRole = data.active_role || APP_STATE.userRole;

        if (APP_STATE.currentUser) {
            APP_STATE.currentUser.roles = userRoles;
        }
        APP_STATE.userRole = activeRole;
        localStorage.setItem('userRole', activeRole);

        // Always show role switcher
        roleSwitcherSection.classList.remove('hidden');
        roleOptions.innerHTML = '';

        if (userRoles.length === 1) {
            // FIX 5: Show current role and Add Role option
            const currentRoleOption = document.createElement('div');
            currentRoleOption.className = 'role-option active disabled';
            currentRoleOption.innerHTML = `
                <span class="role-name">${formatRoleName(activeRole)}</span>
                <span class="role-badge">CURRENT</span>
            `;
            roleOptions.appendChild(currentRoleOption);

            const addRoleOption = document.createElement('div');
            addRoleOption.className = 'role-option add-role-option';
            addRoleOption.innerHTML = `
                <span class="add-role-icon">+</span>
                <span class="role-name">Add New Role</span>
            `;
            addRoleOption.onclick = () => {
                closeProfileDropdown();
                openModal('register-modal');
                showToast('Register with same email to add a new role', 'info');
            };
            roleOptions.appendChild(addRoleOption);
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

            // Add "Add Role" option
            const addRoleOption = document.createElement('div');
            addRoleOption.className = 'role-option add-role-option';
            addRoleOption.innerHTML = `
                <span class="add-role-icon">+</span>
                <span class="role-name">Add New Role</span>
            `;
            addRoleOption.onclick = () => {
                closeProfileDropdown();
                openModal('register-modal');
                showToast('Register with same email to add a new role', 'info');
            };
            roleOptions.appendChild(addRoleOption);
        }

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
    if (newRole === APP_STATE.userRole) return;

    closeProfileDropdown();
    showToast(`Switching to ${formatRoleName(newRole)} role...`, 'info');

    try {
        const response = await fetch('http://localhost:8000/api/switch-role', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ new_role: newRole })
        });

        if (response.ok) {
            const data = await response.json();

            APP_STATE.userRole = data.active_role;
            localStorage.setItem('userRole', data.active_role);

            if (APP_STATE.currentUser) {
                APP_STATE.currentUser.role = data.active_role;
                localStorage.setItem('currentUser', JSON.stringify(APP_STATE.currentUser));
            }

            updateUIForLoggedInUser();
            updateProfileDropdown();
            updateProfileLink(data.active_role);

            showToast(`Switched to ${formatRoleName(data.active_role)} role`, 'success');

            setTimeout(() => {
                const profileUrl = PROFILE_URLS[data.active_role] || 'index.html';
                window.location.href = profileUrl;
            }, 500);
        } else {
            const error = await response.json();
            showToast(error.detail || 'Failed to switch role', 'error');
        }
    } catch (error) {
        console.error('Role switch error:', error);
        showToast('Error switching role', 'error');
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

// Authentication handlers
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("login-email")?.value;
    const password = document.getElementById("login-password")?.value;

    const result = await window.AuthManager.login(email, password);

    if (result.success) {
        // Update APP_STATE immediately before calling updateUI
        APP_STATE.isLoggedIn = true;
        APP_STATE.currentUser = result.user;
        APP_STATE.userRole = result.user.role;
        
        // Immediately hide buttons and show profile
        updateUIForLoggedInUser();
        updateProfileLink(result.user.role);
        closeModal("login-modal");
        showToast("Welcome back!", "success");

        const intendedDestination = localStorage.getItem("intendedDestination");
        if (intendedDestination) {
            localStorage.removeItem("intendedDestination");
            setTimeout(() => {
                window.location.href = intendedDestination;
            }, 500);
        }
    } else {
        showToast(result.error || "Invalid credentials", "error");
    }
}

// ============================================
//   PASSWORD CONFIRMATION VALIDATION
// ============================================

function validatePasswordMatch() {
    const password = document.getElementById('register-password');
    const confirmPassword = document.getElementById('register-confirm-password');
    const indicator = document.getElementById('password-match-indicator');
    
    if (!password || !confirmPassword || !indicator) return;
    
    // Only show indicator if confirm password has value
    if (confirmPassword.value === '') {
        indicator.textContent = '';
        indicator.className = 'password-match-indicator';
        return;
    }
    
    if (password.value === confirmPassword.value) {
        indicator.textContent = '✓ Passwords match';
        indicator.className = 'password-match-indicator match';
    } else {
        indicator.textContent = '✗ Passwords do not match';
        indicator.className = 'password-match-indicator no-match';
    }
}

// Enhanced password strength calculator
function calculatePasswordStrength(password) {
    let strength = 0;
    const strengthIndicator = document.getElementById('password-strength');
    
    if (password.length > 7) strength += 20;
    if (password.length > 10) strength += 20;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 10;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 10;
    
    if (strengthIndicator) {
        let color = '#dc2626'; // red
        let text = 'Weak';
        
        if (strength > 30 && strength <= 60) {
            color = '#f59e0b'; // orange
            text = 'Fair';
        } else if (strength > 60 && strength <= 80) {
            color = '#3b82f6'; // blue
            text = 'Good';
        } else if (strength > 80) {
            color = '#10b981'; // green
            text = 'Strong';
        }
        
        strengthIndicator.innerHTML = `
            <div style="width: 100%; height: 4px; background: #e5e7eb; border-radius: 2px; margin-top: 8px;">
                <div style="width: ${strength}%; height: 100%; background: ${color}; border-radius: 2px; transition: all 0.3s ease;"></div>
            </div>
            <span style="font-size: 0.75rem; color: ${color}; margin-top: 4px; display: block;">${text} password</span>
        `;
    }
    
    return strength;
}

// ============================================
//   COMING SOON MODAL
// ============================================

function openComingSoonModal(feature) {
    const modal = document.getElementById('coming-soon-modal');
    const message = document.getElementById('coming-soon-message');
    
    if (!modal || !message) return;
    
    // Customize message based on feature
    const messages = {
        'news': 'Our news section is being crafted to bring you the latest updates in education and technology!',
        'store': 'Our bookstore is being stocked with amazing educational resources. Get ready to explore!',
        'find-jobs': 'Our job portal is being designed to connect talented individuals with great opportunities!'
    };
    
    message.textContent = messages[feature] || "We're working hard to bring you this feature. Stay tuned!";
    
    openModal('coming-soon-modal');
}

function handleComingSoonNotification(e) {
    e.preventDefault();
    const email = document.getElementById('notify-email')?.value;
    
    if (!email) {
        showToast('Please enter your email address', 'warning');
        return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Subscribing...';
    
    // Simulate API call
    setTimeout(() => {
        // Reset button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        
        // Show success message
        showToast('You will be notified when this feature launches!', 'success');
        
        // Clear form
        document.getElementById('notify-email').value = '';
        
        // Close modal
        setTimeout(() => {
            closeModal('coming-soon-modal');
        }, 2000);
    }, 1500);
}

// Replace your existing handleRegister with this enhanced version
async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Get password fields
    const password = document.getElementById("register-password")?.value;
    const confirmPassword = document.getElementById("register-confirm-password")?.value;
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
    }
    
    // Check password strength
    const strength = calculatePasswordStrength(password);
    if (strength < 40) {
        showToast('Please choose a stronger password', 'warning');
        return;
    }

    const userData = {
        first_name: formData.get("register-firstname"),
        last_name: formData.get("register-lastname"),
        email: formData.get("register-email"),
        phone: document.getElementById("register-phone")?.value,
        password: password,
        role: document.getElementById("register-as")?.value,
    };

    // Use your existing async/await pattern
    const result = await window.AuthManager.register(userData);

    if (result.success) {
        // Update APP_STATE immediately before calling updateUI
        APP_STATE.isLoggedIn = true;
        APP_STATE.currentUser = result.user;
        APP_STATE.userRole = result.user.role;
        
        // Immediately hide buttons and show profile
        updateUIForLoggedInUser();
        updateProfileLink(result.user.role);
        closeModal("register-modal");
        showToast("Registration successful!", "success");
    } else {
        showToast(result.error || "Registration failed", "error");
    }
}

// FIX 4: Logout without redirect
function logout() {
    APP_STATE.isLoggedIn = false;
    APP_STATE.currentUser = null;
    APP_STATE.userRole = null;
    
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    localStorage.removeItem('token');
    
    // Show login/register buttons
    const loginButtons = document.querySelectorAll(
        '#login-btn, #register-btn, #hero-login-btn, #hero-register-btn, ' +
        '#mobile-login-btn, #mobile-register-btn'
    );
    loginButtons.forEach(btn => {
        if (btn) {
            btn.classList.remove('hidden');
            btn.style.display = '';
            btn.style.visibility = 'visible';
        }
    });
    
    // Hide profile elements
    const profileContainer = document.getElementById('profile-container');
    const notificationBell = document.getElementById('notification-bell');
    
    if (profileContainer) {
        profileContainer.classList.add('hidden');
        profileContainer.style.display = 'none';
    }
    
    if (notificationBell) {
        notificationBell.classList.add('hidden');
        notificationBell.style.display = 'none';
    }
    
    // Remove mobile profile section
    const mobileProfileSection = document.getElementById('mobile-profile-section');
    if (mobileProfileSection) {
        mobileProfileSection.remove();
    }
    
    // Call backend logout
    const token = localStorage.getItem('token');
    if (token) {
        fetch('http://localhost:8000/api/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }).catch(error => console.error('Logout API error:', error));
    }
    
    showToast('Logged out successfully', 'info');
    // NO REDIRECT - stay on current page
}

function updateProfileLink(role) {
    const profileLinks = document.querySelectorAll('a[href*="profile.html"]');
    const profileUrl = PROFILE_URLS[role] || "index.html";

    profileLinks.forEach((link) => {
        if (link.textContent.includes("My Profile")) {
            link.href = profileUrl;
        }
    });

    const mobileProfileLink = document.querySelector('.mobile-menu a[href*="profile.html"]');
    if (mobileProfileLink) {
        mobileProfileLink.href = "branch/" + profileUrl;
    }
}

// ============================================
//   FORGOT PASSWORD FUNCTIONALITY
// ============================================

function openForgotPasswordModal(event) {
    if (event) event.preventDefault();
    closeModal('login-modal');
    setTimeout(() => {
        openModal('forgot-password-modal');
    }, 300);
}

function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email')?.value;
    
    if (!email) {
        showToast('Please enter your email address', 'warning');
        return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    
    // Simulate API call
    setTimeout(() => {
        // Reset button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        
        // Show success message
        showToast('Password reset link sent to your email!', 'success');
        
        // Clear form
        document.getElementById('forgot-email').value = '';
        
        // Close modal after delay
        setTimeout(() => {
            closeModal('forgot-password-modal');
            openModal('login-modal');
        }, 2000);
    }, 2000);
}

// ============================================
//   RESPONSIVE NAVIGATION IMPROVEMENTS
// ============================================

function improveNavbarResponsiveness() {
    const navbar = document.querySelector('.navbar');
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    // Add resize listener for better responsiveness
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth >= 1024) {
                // Close mobile menu on larger screens
                if (menuBtn?.classList.contains('active')) {
                    menuBtn.classList.remove('active');
                    mobileMenu?.classList.add('hidden');
                    document.body.style.overflow = '';
                }
            }
        }, 250);
    });
    
    // Improve scroll behavior
    let lastScrollY = window.scrollY;
    let ticking = false;
    
    function updateNavbar() {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 100) {
            navbar?.classList.add('scrolled', 'compact');
        } else {
            navbar?.classList.remove('scrolled', 'compact');
        }
        
        // Hide/show navbar on scroll
        if (currentScrollY > lastScrollY && currentScrollY > 200) {
            navbar?.classList.add('navbar-hidden');
        } else {
            navbar?.classList.remove('navbar-hidden');
        }
        
        lastScrollY = currentScrollY;
        ticking = false;
    }
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(updateNavbar);
            ticking = true;
        }
    });
}

// ============================================
//   INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Check for saved user session
        const savedUser = localStorage.getItem("currentUser");
        const savedRole = localStorage.getItem("userRole");
        const savedToken = localStorage.getItem("token");

        if (savedUser && savedRole && savedToken) {
            try {
                APP_STATE.currentUser = JSON.parse(savedUser);
                APP_STATE.userRole = savedRole;
                APP_STATE.isLoggedIn = true;

                const isValid = await window.AuthManager.verifyToken();
                if (isValid) {
                    updateUIForLoggedInUser();
                    updateProfileLink(savedRole);
                } else {
                    window.AuthManager.clearAuth();
                }
            } catch (error) {
                console.error("Session restoration error:", error);
                window.AuthManager.clearAuth();
            }
        }
    // Add event listeners for new forms
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    }
    
    const comingSoonForm = document.getElementById('coming-soon-form');
    if (comingSoonForm) {
        comingSoonForm.addEventListener('submit', handleComingSoonNotification);
    }
    
    // Replace the existing register form handler with enhanced version
const registerForm = document.getElementById('register-form');
if (registerForm) {
    // Just add the event listener, no need to remove/re-add
    registerForm.addEventListener('submit', handleRegister);
}
    
    // Add password match validation listeners
    const registerPassword = document.getElementById('register-password');
    const registerConfirmPassword = document.getElementById('register-confirm-password');
    
    if (registerPassword) {
        registerPassword.addEventListener('input', (e) => {
            calculatePasswordStrength(e.target.value);
            validatePasswordMatch();
        });
    }
    
    if (registerConfirmPassword) {
        registerConfirmPassword.addEventListener('input', validatePasswordMatch);
    }
    
    // Initialize improved navbar responsiveness
    improveNavbarResponsiveness();
        // Initialize all features
        initializeNavigationAuth();
        initializeTheme();
        initializeNavigation();
        initializeHeroSection();
        initializeCounters();
        initializeNewsSection();
        initializeVideoCarousel();
        initializeCourses();
        initializeTestimonials();
        initializePartners();
        initializeModals();
        initializeScrollEffects();
        initializeFormValidation();
        initializeSearch();
        initializeNotifications();
        initializeTooltips();
        initializeLazyLoading();

        await loadRealData();

        // Hide loading screen
        setTimeout(() => {
            const loadingScreen = document.getElementById("loading-screen");
            if (loadingScreen) {
                loadingScreen.classList.add("fade-out");
                document.body.style.overflow = "hidden";

                setTimeout(() => {
                    loadingScreen.style.display = "none";
                    document.body.style.overflow = "";

                    const sections = document.querySelectorAll(
                        ".hero-section, .features-section, .news-section"
                    );
                    sections.forEach((section, index) => {
                        section.style.opacity = "0";
                        section.style.transform = "translateY(30px)";
                        setTimeout(() => {
                            section.style.transition = "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
                            section.style.opacity = "1";
                            section.style.transform = "translateY(0)";
                        }, index * 150);
                    });
                }, 600);
            }
        }, 3000);
    } catch (error) {
        console.error("Initialization error:", error);
    }
});

// ============================================
//   DATA LOADING
// ============================================
async function loadRealData() {
    try {
        const countersResponse = await apiCall("/api/counters");
        if (countersResponse.ok) {
            const counters = await countersResponse.json();
            counters.forEach((counter) => {
                const element = document.getElementById(`counter-${counter.counter_type}`);
                if (element) {
                    animateCounter(element, counter.count, "+");
                }
            });
        }

        const newsResponse = await apiCall("/api/news");
        if (newsResponse.ok) {
            const newsItems = await newsResponse.json();
            if (newsItems.length > 0 && window.updateNewsWithRealData) {
                window.updateNewsWithRealData(newsItems);
            }
        }

        const videosResponse = await apiCall("/api/videos");
        if (videosResponse.ok) {
            const videos = await videosResponse.json();
            if (videos.length > 0 && window.updateVideosWithRealData) {
                window.updateVideosWithRealData(videos);
            }
        }
    } catch (error) {
        console.error("Failed to load data:", error);
    }
}

// ============================================
//   THEME MANAGEMENT
// ============================================
function initializeTheme() {
    const theme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", theme);
    updateThemeIcons(theme);

    const themeToggleBtn = document.getElementById("theme-toggle-btn");
    const mobileThemeToggleBtn = document.getElementById("mobile-theme-toggle-btn");

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", toggleTheme);
    }
    if (mobileThemeToggleBtn) {
        mobileThemeToggleBtn.addEventListener("click", toggleTheme);
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    APP_STATE.theme = newTheme;

    updateThemeIcons(newTheme);
    showToast("Theme changed to " + newTheme + " mode", "info");
}

function updateThemeIcons(theme) {
    const iconPath = theme === "light"
        ? "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        : "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z";

    const themeIcon = document.querySelector("#theme-icon path");
    const mobileThemeIcon = document.querySelector("#mobile-theme-icon path");

    if (themeIcon) themeIcon.setAttribute("d", iconPath);
    if (mobileThemeIcon) mobileThemeIcon.setAttribute("d", iconPath);
}

// ============================================
//   NAVIGATION
// ============================================
function initializeNavigation() {
    const navbar = document.querySelector(".navbar");
    const menuBtn = document.getElementById("menu-btn");
    const mobileMenu = document.getElementById("mobile-menu");

    window.addEventListener("scroll", () => {
        if (window.scrollY > CONFIG.SCROLL_THRESHOLD) {
            navbar?.classList.add("scrolled");
        } else {
            navbar?.classList.remove("scrolled");
        }
    });

    if (menuBtn) {
        menuBtn.addEventListener("click", () => {
            menuBtn.classList.toggle("active");
            mobileMenu?.classList.toggle("hidden");
            document.body.style.overflow = mobileMenu?.classList.contains("hidden") ? "" : "hidden";
        });
    }

    document.querySelectorAll(".mobile-menu-item").forEach((item) => {
        item.addEventListener("click", () => {
            menuBtn?.classList.remove("active");
            mobileMenu?.classList.add("hidden");
            document.body.style.overflow = "";
        });
    });
}

function initializeNavigationAuth() {
    const navLinks = document.querySelectorAll(".nav-link, .mobile-menu a");

    navLinks.forEach((link) => {
        if (!link.href || !link.getAttribute("href")) return;
        if (link.href.includes("news.html")) return;

        const protectedPages = ["find-tutors", "store", "find-jobs", "reels"];
        const isProtected = protectedPages.some((page) => link.href.includes(page));

        if (isProtected) {
            link.addEventListener("click", (e) => {
                if (!APP_STATE.isLoggedIn) {
                    e.preventDefault();
                    showToast("Please login to access this feature", "warning");
                    localStorage.setItem("intendedDestination", link.href);
                    openModal("login-modal");
                }
            });
        }
    });
}

// ============================================
//   HERO SECTION
// ============================================
function initializeHeroSection() {
    const heroTexts = [
        "Discover Expert Tutors with Astegni",
        "Learn Anytime, Anywhere",
        "Your Learning Partner",
    ];

    let textIndex = 0;
    const textElement = document.getElementById("hero-text-content");

    if (textElement) {
        typeWriterEffect(textElement, heroTexts, textIndex);
    }

    createParticles();
    initializeHeroSlideshow();
    initializeCounterScrollEffect();

    const heroLoginBtn = document.getElementById("hero-login-btn");
    const heroRegisterBtn = document.getElementById("hero-register-btn");

    if (heroLoginBtn) {
        heroLoginBtn.addEventListener("click", () => openModal("login-modal"));
    }
    if (heroRegisterBtn) {
        heroRegisterBtn.addEventListener("click", () => openModal("register-modal"));
    }
}

function typeWriterEffect(element, texts, index) {
    if (!element || !texts || texts.length === 0) return;

    const text = texts[index];
    let charIndex = 0;
    element.textContent = "";

    const typeInterval = setInterval(() => {
        if (charIndex < text.length) {
            element.textContent += text[charIndex];
            charIndex++;
        } else {
            clearInterval(typeInterval);
            setTimeout(() => {
                deleteText(element, texts, index);
            }, 3000);
        }
    }, CONFIG.TYPING_SPEED);
}

function deleteText(element, texts, index) {
    if (!element) return;

    const deleteInterval = setInterval(() => {
        if (element.textContent.length > 0) {
            element.textContent = element.textContent.slice(0, -1);
        } else {
            clearInterval(deleteInterval);
            const nextIndex = (index + 1) % texts.length;
            typeWriterEffect(element, texts, nextIndex);
        }
    }, 50);
}

function createParticles() {
    const container = document.getElementById("hero-particles");
    if (!container) return;

    for (let i = 0; i < 20; i++) {
        const particle = document.createElement("div");
        particle.className = "particle";
        particle.style.left = Math.random() * 100 + "%";
        particle.style.width = Math.random() * 10 + 5 + "px";
        particle.style.height = particle.style.width;
        particle.style.animationDelay = Math.random() * 20 + "s";
        particle.style.animationDuration = Math.random() * 20 + 20 + "s";
        container.appendChild(particle);
    }
}

function initializeHeroSlideshow() {
    const images = [
        "https://picsum.photos/1920/1080?random=1",
        "https://picsum.photos/1920/1080?random=2",
        "https://picsum.photos/1920/1080?random=3",
    ];

    let currentImage = 0;
    const heroSection = document.querySelector(".hero-slideshow");

    if (heroSection) {
        setInterval(() => {
            currentImage = (currentImage + 1) % images.length;
            heroSection.style.backgroundImage = `url(${images[currentImage]})`;
        }, 7000);
    }
}

// ============================================
//   COUNTERS
// ============================================
function initializeCounters() {
    const counters = [
        { id: "counter-parents", target: 1000, current: 0, suffix: "+" },
        { id: "counter-students", target: 5000, current: 0, suffix: "+" },
        { id: "counter-tutors", target: 300, current: 0, suffix: "+" },
        { id: "counter-centers", target: 50, current: 0, suffix: "+" },
        { id: "counter-books", target: 100, current: 0, suffix: "+" },
        { id: "counter-jobs", target: 10, current: 0, suffix: "+" },
    ];

    const observerOptions = {
        threshold: 0.5,
        rootMargin: "0px",
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const counter = counters.find((c) => c.id === entry.target.id);
                if (counter && counter.current === 0) {
                    animateCounter(entry.target, counter.target, counter.suffix);
                    counter.current = counter.target;
                }
            }
        });
    }, observerOptions);

    counters.forEach((counter) => {
        const element = document.getElementById(counter.id);
        if (element) observer.observe(element);
    });

    window.countersData = counters;
}

function initializeCounterScrollEffect() {
    const heroSection = document.querySelector(".hero-section");
    let hasScrolledOut = false;
    let isResetting = false;

    window.addEventListener("scroll", () => {
        if (!heroSection || !window.countersData) return;

        const rect = heroSection.getBoundingClientRect();
        const isVisible = rect.bottom > 0;

        if (!isVisible && !hasScrolledOut) {
            hasScrolledOut = true;
            window.countersData.forEach((counter) => {
                const element = document.getElementById(counter.id);
                if (element) {
                    const halfValue = Math.floor(counter.target / 2);
                    element.textContent = halfValue.toLocaleString() + counter.suffix;
                    counter.current = halfValue;
                }
            });
        }

        if (isVisible && hasScrolledOut && !isResetting) {
            hasScrolledOut = false;
            isResetting = true;
            window.countersData.forEach((counter) => {
                const element = document.getElementById(counter.id);
                if (element) {
                    animateCounterFromValue(element, counter.current, counter.target, counter.suffix);
                    counter.current = counter.target;
                }
            });
            setTimeout(() => {
                isResetting = false;
            }, 2000);
        }
    });
}

function animateCounter(element, target, suffix) {
    if (!element) return;

    let current = 0;
    const increment = target / (CONFIG.COUNTER_DURATION / 16);

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current).toLocaleString() + suffix;
    }, 16);
}

function animateCounterFromValue(element, start, target, suffix) {
    if (!element) return;

    let current = start;
    const increment = (target - start) / (CONFIG.COUNTER_DURATION / 16);

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current).toLocaleString() + suffix;
    }, 16);
}

// ============================================
//   NEWS SECTION
// ============================================
function initializeNewsSection() {
    const newsItems = [
        {
            title: "New AI-Powered Learning Features Launched",
            content: "Experience personalized learning with our new AI tutor assistant.",
            category: "Technology",
            date: "Today",
        },
    ];

    let currentNewsIndex = 0;
    const titleElement = document.getElementById("news-title-content");
    const contentElement = document.getElementById("news-content-text");

    if (titleElement && contentElement) {
        typeNewsItem(newsItems[currentNewsIndex], titleElement, contentElement, () => {
            setInterval(() => {
                currentNewsIndex = (currentNewsIndex + 1) % newsItems.length;
                deleteNewsItem(titleElement, contentElement, () => {
                    typeNewsItem(newsItems[currentNewsIndex], titleElement, contentElement);
                });
            }, 8000);
        });
    }
}

function typeNewsItem(news, titleEl, contentEl, callback) {
    if (!titleEl || !contentEl) return;

    let titleIndex = 0;
    let contentIndex = 0;

    const typeTitle = setInterval(() => {
        if (titleIndex < news.title.length) {
            titleEl.textContent = news.title.substring(0, titleIndex + 1);
            titleIndex++;
        } else {
            clearInterval(typeTitle);
            const typeContent = setInterval(() => {
                if (contentIndex < news.content.length) {
                    contentEl.textContent = news.content.substring(0, contentIndex + 1);
                    contentIndex++;
                } else {
                    clearInterval(typeContent);
                    if (callback) callback();
                }
            }, 50);
        }
    }, 80);
}

function deleteNewsItem(titleEl, contentEl, callback) {
    if (!titleEl || !contentEl) return;

    const deleteContent = setInterval(() => {
        if (contentEl.textContent.length > 0) {
            contentEl.textContent = contentEl.textContent.slice(0, -1);
        } else {
            clearInterval(deleteContent);
            const deleteTitle = setInterval(() => {
                if (titleEl.textContent.length > 0) {
                    titleEl.textContent = titleEl.textContent.slice(0, -1);
                } else {
                    clearInterval(deleteTitle);
                    if (callback) callback();
                }
            }, 30);
        }
    }, 20);
}

// ============================================
//   VIDEO CAROUSEL
// ============================================
function initializeVideoCarousel() {
    const carousel = document.getElementById("video-carousel");
    if (!carousel) return;

    carousel.innerHTML = "";

    VIDEO_DATA.forEach((video, index) => {
        const card = createVideoCard(video, index);
        carousel.appendChild(card);
    });

    VIDEO_DATA.forEach((video, index) => {
        const card = createVideoCard(video, index);
        carousel.appendChild(card);
    });

    let currentPosition = 0;
    const cardWidth = 320 + 24;
    const totalCards = VIDEO_DATA.length;

    window.navigateCarousel = function(direction) {
        if (!carousel) return;

        if (direction === "left") {
            currentPosition = Math.max(0, currentPosition - 1);
        } else {
            currentPosition = Math.min(totalCards - 1, currentPosition + 1);
        }

        const scrollAmount = currentPosition * cardWidth;
        carousel.style.transform = `translateX(-${scrollAmount}px)`;
    };

    setInterval(() => {
        currentPosition = (currentPosition + 1) % totalCards;
        if (currentPosition === 0) {
            carousel.style.transition = "none";
            carousel.style.transform = "translateX(0)";
            setTimeout(() => {
                carousel.style.transition = "transform 0.5s ease";
            }, 50);
        } else {
            carousel.style.transform = `translateX(-${currentPosition * cardWidth}px)`;
        }
    }, 5000);

    document.querySelectorAll(".category-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            document.querySelector(".category-btn.active")?.classList.remove("active");
            e.target.classList.add("active");
            filterVideos(e.target.dataset.category);
        });
    });
}

function createVideoCard(video, index) {
    const card = document.createElement("div");
    card.className = "video-card";
    card.dataset.category = video.category;
    card.innerHTML = `
        <div class="video-thumbnail">
            <div class="video-play-btn">
                <svg width="20" height="20" fill="var(--button-bg)" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </div>
        </div>
        <div class="video-info">
            <h4 class="video-title">${video.title}</h4>
            <p class="video-description">${video.description.substring(0, 100)}...</p>
            <div class="video-meta">
                <span class="video-views">${video.views} views</span>
                <span class="video-duration">${video.duration}</span>
            </div>
        </div>
    `;

    card.addEventListener("click", () => openVideoPlayer(video));
    return card;
}

function filterVideos(category) {
    const cards = document.querySelectorAll(".video-card");
    cards.forEach((card) => {
        if (category === "all" || card.dataset.category === category) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}

// Video player functions
function openVideoPlayer(video) {
    APP_STATE.currentVideo = video;
    const titleEl = document.getElementById("video-title");
    const descEl = document.getElementById("video-description");
    if (titleEl) titleEl.textContent = video.title;
    if (descEl) descEl.textContent = video.description;
    loadVideoComments(video);
    openModal("video-player-modal");
    showToast("Loading video...", "info");
}

function loadVideoComments(video) {
    const commentsList = document.getElementById("comments-list");
    if (!commentsList) return;

    commentsList.innerHTML = "";

    if (video.comments && video.comments.length > 0) {
        video.comments.forEach((comment) => {
            const commentEl = createCommentElement(comment);
            commentsList.appendChild(commentEl);
        });
    } else {
        commentsList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No comments yet. Be the first to comment!</p>';
    }
}

function createCommentElement(comment) {
    const div = document.createElement("div");
    div.className = "comment-item";
    div.innerHTML = `
        <img src="${comment.avatar}" alt="${comment.author}" class="comment-avatar">
        <div class="comment-content">
            <div class="comment-header">
                <span class="comment-author">${comment.author}</span>
                <span class="comment-time">${comment.time}</span>
            </div>
            <p class="comment-text">${comment.text}</p>
            <div class="comment-footer">
                <button class="comment-like">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path>
                    </svg>
                    ${comment.likes || 0}
                </button>
                <button class="comment-dislike">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"></path>
                    </svg>
                </button>
                <button class="comment-reply">Reply</button>
            </div>
        </div>
    `;
    return div;
}

// ============================================
//   COURSES WITH FLIP CARDS AND DETAILS (8 CARDS)
// ============================================
function initializeCourses() {
    const coursesData = [
        {
            title: "Mathematics",
            icon: "📐",
            category: "tech",
            level: "Beginner",
            students: "2.5K",
            rating: "4.8",
            backTitle: "Religious Studies",
            backIcon: "⛪",
            backLevel: "All Levels",
            backStudents: "1.2K",
            backRating: "4.9",
        },
        {
            title: "Physics",
            icon: "⚛️",
            category: "tech",
            level: "Intermediate",
            students: "1.8K",
            rating: "4.9",
            backTitle: "Programming",
            backIcon: "💻",
            backLevel: "Beginner",
            backStudents: "5K",
            backRating: "5.0",
        },
        {
            title: "Chemistry",
            icon: "🧪",
            category: "tech",
            level: "Advanced",
            students: "1.2K",
            rating: "4.7",
            backTitle: "Sports Training",
            backIcon: "🏃",
            backLevel: "All Levels",
            backStudents: "800",
            backRating: "4.6",
        },
        {
            title: "Music",
            icon: "🎵",
            category: "arts",
            level: "Beginner",
            students: "3K",
            rating: "4.8",
            backTitle: "Culinary Arts",
            backIcon: "🍳",
            backLevel: "Intermediate",
            backStudents: "600",
            backRating: "4.7",
        },
        {
            title: "English",
            icon: "🇬🇧",
            category: "language",
            level: "All Levels",
            students: "4K",
            rating: "4.9",
            backTitle: "Chinese",
            backIcon: "🇨🇳",
            backLevel: "Beginner",
            backStudents: "1.5K",
            backRating: "4.8",
        },
        {
            title: "Business",
            icon: "📊",
            category: "business",
            level: "Intermediate",
            students: "2K",
            rating: "4.8",
            backTitle: "Marketing",
            backIcon: "🎯",
            backLevel: "Advanced",
            backStudents: "1.8K",
            backRating: "4.9",
        },
        {
            title: "Photography",
            icon: "📸",
            category: "arts",
            level: "All Levels",
            students: "1.5K",
            rating: "4.7",
            backTitle: "Graphic Design",
            backIcon: "🎨",
            backLevel: "Intermediate",
            backStudents: "2.2K",
            backRating: "4.8",
        },
        {
            title: "History",
            icon: "🏛️",
            category: "arts",
            level: "Beginner",
            students: "900",
            rating: "4.6",
            backTitle: "Geography",
            backIcon: "🌍",
            backLevel: "All Levels",
            backStudents: "1.1K",
            backRating: "4.7",
        },
    ];

    const container = document.getElementById("courses-container");
    if (!container) return;

    container.innerHTML = "";

    coursesData.forEach((course, index) => {
        const card = document.createElement("div");
        card.className = "course-flip-card";
        card.dataset.category = course.category;
        card.innerHTML = `
            <div class="course-flip-inner">
                <div class="course-flip-front">
                    <div class="course-flip-icon">${course.icon}</div>
                    <h3 class="course-flip-title">${course.title}</h3>
                    <div class="course-flip-details">
                        <p class="course-flip-level">${course.level}</p>
                        <div class="course-flip-stats">
                            <span class="course-flip-stat">
                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                                ${course.students}
                            </span>
                            <span class="course-flip-stat course-rating">
                                ⭐ ${course.rating}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="course-flip-back">
                    <div class="course-flip-icon">${course.backIcon}</div>
                    <h3 class="course-flip-title">${course.backTitle}</h3>
                    <div class="course-flip-details">
                        <p class="course-flip-level">${course.backLevel}</p>
                        <div class="course-flip-stats">
                            <span class="course-flip-stat">
                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                                ${course.backStudents}
                            </span>
                            <span class="course-flip-stat">
                                ⭐ ${course.backRating}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        card.addEventListener("click", () => handleCourseClick(course));
        container.appendChild(card);
    });

    // Course filters
    document.querySelectorAll(".filter-chip").forEach((chip) => {
        chip.addEventListener("click", (e) => {
            document.querySelector(".filter-chip.active")?.classList.remove("active");
            e.target.classList.add("active");
            filterCourses(e.target.dataset.filter);
        });
    });
}

function filterCourses(filter) {
    const cards = document.querySelectorAll(".course-flip-card");
    cards.forEach((card) => {
        if (filter === "all" || card.dataset.category === filter) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}

function handleCourseClick(course) {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to access this course", "warning");
        openModal("login-modal");
    } else {
        showToast(`Opening ${course.title} course...`, "info");
    }
}

function handleViewMoreCourses() {
    if (!APP_STATE.isLoggedIn) {
        openModal("login-modal");
    } else {
        window.location.href = "/courses";
    }
}

// ============================================
//   TESTIMONIALS WITH ZOOM ANIMATION
// ============================================
function initializeTestimonials() {
    const testimonialData = [
        {
            text: "Astegni helped me find the perfect math tutor. My grades improved from C to A in just 3 months!",
            author: "Sara Tadesse",
            role: "Grade 12 Student",
            avatar: "https://picsum.photos/60",
        },
        {
            text: "As a tutor, Astegni gave me the platform to reach students nationwide. I now teach over 50 students online!",
            author: "Daniel Bekele",
            role: "Physics Tutor",
            avatar: "https://picsum.photos/61",
        },
        {
            text: "The variety of courses and quality of instructors on Astegni is unmatched. Best investment in my child's education!",
            author: "Marta Alemu",
            role: "Parent",
            avatar: "https://picsum.photos/62",
        },
        {
            text: "I found my dream job through Astegni's job portal. The platform is truly life-changing!",
            author: "Yohannes Girma",
            role: "Software Developer",
            avatar: "https://picsum.photos/63",
        },
        {
            text: "Our training center reached 10x more students after joining Astegni. Highly recommended!",
            author: "Tigist Haile",
            role: "Training Center Director",
            avatar: "https://picsum.photos/64",
        },
        {
            text: "The online learning tools and resources are amazing. I can learn at my own pace!",
            author: "Abebe Mengistu",
            role: "University Student",
            avatar: "https://picsum.photos/65",
        },
    ];

    let currentSet = 0;
    const slider = document.getElementById("testimonials-slider");

    if (!slider) return;

    function updateTestimonials() {
        slider.innerHTML = "";
        const startIndex = currentSet * 3;

        for (let i = 0; i < 3; i++) {
            const testimonial =
                testimonialData[(startIndex + i) % testimonialData.length];
            const card = document.createElement("div");
            card.className = "testimonial-card active";
            card.innerHTML = `
                <div class="testimonial-content">
                    <div class="quote-icon">"</div>
                    <p class="testimonial-text">${testimonial.text}</p>
                    <div class="testimonial-author">
                        <img src="${testimonial.avatar}" alt="${testimonial.author}" class="author-avatar">
                        <div class="author-info">
                            <h4>${testimonial.author}</h4>
                            <p>${testimonial.role}</p>
                            <div class="rating">⭐⭐⭐⭐⭐</div>
                        </div>
                    </div>
                </div>
            `;
            slider.appendChild(card);
        }

        // Restart animation
        setTimeout(() => {
            document.querySelectorAll(".testimonial-card").forEach((card, index) => {
                card.style.animationDelay = `${index * 0.3}s`;
            });
        }, 100);
    }

    updateTestimonials();

    // Change testimonials every 9 seconds
    setInterval(() => {
        currentSet = (currentSet + 1) % Math.ceil(testimonialData.length / 3);
        updateTestimonials();
    }, 9000);
}

// ============================================
//   PARTNERS
// ============================================
function initializePartners() {
    const partners = ["Partner 1", "Partner 2", "Partner 3", "Partner 4", "Partner 5", "Partner 6"];
    const track = document.getElementById("partners-track");
    if (!track) return;

    track.innerHTML = "";

    partners.forEach((partner) => {
        const logo = document.createElement("div");
        logo.className = "partner-logo";
        logo.textContent = partner;
        track.appendChild(logo);
    });

    partners.forEach((partner) => {
        const logo = document.createElement("div");
        logo.className = "partner-logo";
        logo.textContent = partner;
        track.appendChild(logo);
    });
}

// ============================================
//   MODALS
// ============================================
function initializeModals() {
    document.querySelectorAll(".modal").forEach((modal) => {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");

    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener("submit", handleRegister);
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
        setTimeout(() => modal.classList.add("active"), 10);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("active");
        modal.classList.remove("front");
        setTimeout(() => {
            modal.style.display = "none";
            document.body.style.overflow = "";
        }, 300);
    }
}

function switchModal(fromModal, toModal) {
    closeModal(fromModal);
    setTimeout(() => openModal(toModal), 300);
}

// ============================================
//   SCROLL EFFECTS
// ============================================
function initializeScrollEffects() {
    window.addEventListener("scroll", () => {
        const scrollProgress = document.getElementById("scroll-progress");
        if (scrollProgress) {
            const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            scrollProgress.style.width = scrollPercent + "%";
        }
    });

    const backToTop = document.getElementById("back-to-top");
    window.addEventListener("scroll", () => {
        if (backToTop) {
            if (window.scrollY > 500) {
                backToTop.classList.add("visible");
            } else {
                backToTop.classList.remove("visible");
            }
        }
    });

    if (backToTop) {
        backToTop.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px",
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("animate-in");
            }
        });
    }, observerOptions);

    document.querySelectorAll(".feature-card, .course-flip-card, .testimonial-card").forEach((el) => {
        observer.observe(el);
    });
}

// ============================================
//   UTILITIES
// ============================================
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container") || createToastContainer();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const icons = {
        success: "✔",
        error: "✗",
        warning: "⚠",
        info: "ℹ",
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
    return container;
}

// Mobile profile options
function addMobileProfileOptions() {
    const mobileMenu = document.getElementById("mobile-menu");
    if (!mobileMenu || !APP_STATE.isLoggedIn) return;

    const existingSection = document.getElementById("mobile-profile-section");
    if (existingSection) existingSection.remove();

    const profileUrl = PROFILE_URLS[APP_STATE.userRole] || "myProfile/student-profile.html";

    const profileSection = document.createElement("div");
    profileSection.id = "mobile-profile-section";
    profileSection.innerHTML = `
        <div class="mobile-menu-divider"></div>
        <div class="mobile-profile-header">
            <img src="${APP_STATE.currentUser?.avatar || "https://picsum.photos/32"}" alt="Profile" class="mobile-profile-pic">
            <div class="mobile-profile-info">
                <span class="mobile-profile-name">${APP_STATE.currentUser?.name || "User"}</span>
                <span class="mobile-profile-role">${APP_STATE.userRole || "Member"}</span>
            </div>
        </div>
        <a class="mobile-menu-item" href="${profileUrl}">
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
            My Profile
        </a>
        <div class="mobile-menu-divider"></div>
        <button class="mobile-menu-item text-red-500" onclick="logout()">
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
            Logout
        </button>
    `;

    const menuContent = mobileMenu.querySelector(".mobile-menu-content");
    if (menuContent) {
        menuContent.appendChild(profileSection);
    }
}

// Remaining initialization functions
function initializeFormValidation() {
    const passwordInput = document.getElementById("register-password");
    if (passwordInput) {
        passwordInput.addEventListener("input", (e) => {
            const strength = calculatePasswordStrength(e.target.value);
            const indicator = document.getElementById("password-strength");
            if (indicator) {
                indicator.style.setProperty("--strength", strength + "%");
            }
        });
    }
}

function calculatePasswordStrength(password) {
    let strength = 0;
    if (password.length > 6) strength += 25;
    if (password.length > 10) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    return strength;
}

function initializeSearch() {
    const searchInput = document.getElementById("global-search");
    const suggestions = document.getElementById("search-suggestions");

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase();
            if (query.length > 2) {
                showSearchSuggestions(query, suggestions);
            } else if (suggestions) {
                suggestions.innerHTML = "";
            }
        });
    }
}

function showSearchSuggestions(query, container) {
    if (!container) return;

    const suggestions = [
        "Mathematics Tutors",
        "Physics Course",
        "English Language",
    ].filter((s) => s.toLowerCase().includes(query));

    container.innerHTML = suggestions.map((s) => `
        <div class="suggestion-item" onclick="selectSuggestion('${s}')">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            ${s}
        </div>
    `).join("");
}

function initializeNotifications() {
    setInterval(() => {
        if (APP_STATE.isLoggedIn && Math.random() > 0.8) {
            addNotification({
                title: "New Message",
                content: "You have a new message from your tutor",
                type: "info",
            });
        }
    }, 30000);
}

function addNotification(notification) {
    APP_STATE.notifications.push(notification);
    updateNotificationBadge();
}

function updateNotificationBadge() {
    const badge = document.getElementById("notification-count");
    if (badge) {
        badge.textContent = APP_STATE.notifications.length.toString();
        badge.style.display = APP_STATE.notifications.length > 0 ? "flex" : "none";
    }
}

function initializeTooltips() {
    document.querySelectorAll("[data-tooltip]").forEach((el) => {
        el.addEventListener("mouseenter", showTooltip);
        el.addEventListener("mouseleave", hideTooltip);
    });
}

function showTooltip(e) {
    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.textContent = e.target.dataset.tooltip;
    document.body.appendChild(tooltip);

    const rect = e.target.getBoundingClientRect();
    tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + "px";
    tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + "px";
}

function hideTooltip() {
    const tooltip = document.querySelector(".tooltip");
    if (tooltip) tooltip.remove();
}

function initializeLazyLoading() {
    const images = document.querySelectorAll("img[data-src]");
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute("data-src");
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach((img) => imageObserver.observe(img));
}

// Add CSS for navbar hide/show animation
const navbarStyles = document.createElement('style');
navbarStyles.textContent = `
    .navbar {
        transition: transform 0.3s ease-in-out, padding 0.3s ease;
    }
    
    .navbar.navbar-hidden {
        transform: translateY(-100%);
    }
    
    .navbar.compact {
        padding: 0.5rem 0;
    }
    
    .navbar.compact .logo-main {
        font-size: 1.125rem;
    }
    
    .navbar.compact .nav-link {
        padding: 0.375rem 0.75rem !important;
    }
`;
document.head.appendChild(navbarStyles);
// Export new functions
window.openForgotPasswordModal = openForgotPasswordModal;
window.openComingSoonModal = openComingSoonModal;
window.validatePasswordMatch = validatePasswordMatch;

// Export all necessary functions
window.toggleTheme = toggleTheme;
window.openModal = openModal;
window.closeModal = closeModal;
window.switchModal = switchModal;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logout = logout;
window.showToast = showToast;
// Improved handleNavLinkClick function for coming soon features
window.handleNavLinkClick = function(e, link) {
    // Define coming soon features
    const comingSoonFeatures = ['news', 'store', 'find-jobs'];
    
    // Check if it's a coming soon feature
    if (comingSoonFeatures.includes(link)) {
        e.preventDefault();
        e.stopPropagation();
        openComingSoonModal(link);
        return false;
    }
    
    // Existing protected pages logic
    if (APP_STATE.isLoggedIn) return true;
    
    const protectedPages = ['find-tutors', 'reels'];
    if (protectedPages.includes(link)) {
        e.preventDefault();
        e.stopPropagation();
        showToast(`Please login to access ${link.replace("-", " ")}`, "warning");
        openModal("login-modal");
        return false;
    }
    
    return true;
};
window.handleCourseClick = handleCourseClick;
window.handleViewMoreCourses = function() {
    if (!APP_STATE.isLoggedIn) {
        openModal("login-modal");
    } else {
        window.location.href = "/courses";
    }
};
window.toggleProfileDropdown = toggleProfileDropdown;
window.openProfileDropdown = openProfileDropdown;
window.closeProfileDropdown = closeProfileDropdown;
window.switchToRole = switchToRole;
window.formatRoleName = formatRoleName;
window.updateProfileDropdown = updateProfileDropdown;
window.fetchCurrentUserData = fetchCurrentUserData;
window.setupRoleSwitcher = setupRoleSwitcher;
window.updateUIForLoggedInUser = updateUIForLoggedInUser;
window.updateProfilePictures = updateProfilePictures;

// Additional video player functions
window.likeVideo = function() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to like videos", "warning");
        openModal("login-modal");
        return;
    }
    showToast("Video liked!", "success");
};

window.dislikeVideo = function() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to rate videos", "warning");
        openModal("login-modal");
        return;
    }
    showToast("Feedback recorded", "info");
};

window.shareVideo = function() {
    openModal("share-modal");
};

window.toggleSaveMenu = function() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to save videos", "warning");
        openModal("login-modal");
        return;
    }
    const menu = document.getElementById("save-menu");
    if (menu) menu.classList.toggle("hidden");
};

window.expandCommentBox = function() {
    const input = document.getElementById("comment-input");
    const actions = document.getElementById("comment-actions");
    if (input) {
        input.classList.add("expanded");
        input.style.minHeight = "80px";
    }
    if (actions) actions.classList.remove("hidden");
};

window.collapseCommentBox = function() {
    const input = document.getElementById("comment-input");
    const actions = document.getElementById("comment-actions");
    if (input) {
        input.classList.remove("expanded");
        input.style.minHeight = "";
        input.value = "";
    }
    if (actions) actions.classList.add("hidden");
};

window.submitComment = function() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to comment", "warning");
        openModal("login-modal");
        return;
    }
    const input = document.getElementById("comment-input");
    if (!input || !input.value.trim()) {
        showToast("Please write a comment", "warning");
        return;
    }
    const newComment = {
        id: Date.now(),
        author: APP_STATE.currentUser?.name || "You",
        avatar: "https://picsum.photos/40?random=" + Date.now(),
        text: input.value.trim(),
        time: "Just now",
        likes: 0,
    };
    if (APP_STATE.currentVideo) {
        if (!APP_STATE.currentVideo.comments) {
            APP_STATE.currentVideo.comments = [];
        }
        APP_STATE.currentVideo.comments.unshift(newComment);
        loadVideoComments(APP_STATE.currentVideo);
    }
    collapseCommentBox();
    showToast("Comment posted!", "success");
};

window.openVideoPlayer = openVideoPlayer;
window.navigateVideo = function(direction) {
    showToast(`Loading ${direction} video...`, "info");
};

window.saveToFavorites = function() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to save to favorites", "warning");
        openModal("login-modal");
        return;
    }
    showToast("Video saved to favorites!", "success");
    const menu = document.getElementById("save-menu");
    if (menu) menu.classList.add("hidden");
};

window.createPlaylist = function() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to create playlists", "warning");
        openModal("login-modal");
        return;
    }
    const playlistName = prompt("Enter playlist name:");
    if (playlistName) {
        showToast(`Playlist "${playlistName}" created!`, "success");
    }
    const menu = document.getElementById("save-menu");
    if (menu) menu.classList.add("hidden");
};

window.addToPlaylist = function() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to add to playlist", "warning");
        openModal("login-modal");
        return;
    }
    showToast("Select a playlist to add this video", "info");
    const menu = document.getElementById("save-menu");
    if (menu) menu.classList.add("hidden");
};

window.copyShareLink = function() {
    const input = document.getElementById("share-link");
    if (input) {
        input.select();
        document.execCommand("copy");
        showToast("Link copied to clipboard!", "success");
    }
};

window.shareToSocial = function(platform) {
    const shareUrl = document.getElementById("share-link")?.value || "https://astegni.et/video/12345";
    const shareText = APP_STATE.currentVideo?.title || "Check out this amazing video on Astegni!";
    let url = "";
    
    switch(platform) {
        case "facebook":
            url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
            break;
        case "twitter":
            url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
            break;
        case "whatsapp":
            url = `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`;
            break;
        case "telegram":
            url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
            break;
        case "linkedin":
            url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
            break;
        case "email":
            url = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent("Check out this video: " + shareUrl)}`;
            break;
    }
    
    if (url) {
        window.open(url, "_blank");
        showToast(`Sharing to ${platform}...`, "info");
    }
};

window.scrollToSection = function(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
};

// ============================================
//   PASSWORD VISIBILITY TOGGLE
// ============================================

window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    const button = input?.nextElementSibling;
    
    if (!input) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        if (button) {
            button.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21">
                    </path>
                </svg>
            `;
        }
    } else {
        input.type = 'password';
        if (button) {
            button.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z">
                    </path>
                </svg>
            `;
        }
    }
};

window.toggleRegisterFields = function() {
    const select = document.getElementById("register-as");
    if (select) {
        const role = select.value;
        showToast(`Registering as ${role}`, "info");
    }
};

window.selectSuggestion = function(suggestion) {
    const searchInput = document.getElementById("global-search");
    if (searchInput) {
        searchInput.value = suggestion;
    }
    const suggestions = document.getElementById("search-suggestions");
    if (suggestions) {
        suggestions.innerHTML = "";
    }
    showToast(`Searching for "${suggestion}"...`, "info");
};

window.socialLogin = function(platform) {
    showToast(`Logging in with ${platform}...`, "info");
    setTimeout(() => {
        const defaultRole = "student";
        APP_STATE.isLoggedIn = true;
        APP_STATE.userRole = defaultRole;
        APP_STATE.currentUser = {
            name: "Social User",
            email: "user@" + platform + ".com",
            role: defaultRole,
        };
        localStorage.setItem("userRole", defaultRole);
        localStorage.setItem("currentUser", JSON.stringify(APP_STATE.currentUser));
        updateUIForLoggedInUser();
        updateProfileLink(defaultRole);
        closeModal("login-modal");
        showToast("Login successful!", "success");
    }, 1500);
};

window.openSearchModal = function() {
    const modal = document.getElementById("search-modal");
    if (modal) {
        modal.style.display = "flex";
        setTimeout(() => {
            const searchInput = document.getElementById("global-search");
            if (searchInput) searchInput.focus();
        }, 100);
    }
};

window.showTestimonial = function(index) {
    console.log("Testimonial index:", index);
};

// Add styles for the new features
const styleElement = document.createElement('style');
styleElement.textContent = `
    .add-role-option {
        border-top: 1px solid var(--border-color);
        margin-top: 0.5rem;
        padding-top: 0.5rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .add-role-icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--primary-color);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: bold;
    }
    
    .role-option.disabled {
        opacity: 0.7;
        cursor: default;
    }
    
    .dropdown-header {
        transition: background-color 0.3s ease;
    }
    
    .dropdown-header:hover {
        background-color: var(--hover-bg);
        border-radius: 8px;
    }
`;

if (!document.getElementById('add-role-styles')) {
    styleElement.id = 'add-role-styles';
    document.head.appendChild(styleElement);
}