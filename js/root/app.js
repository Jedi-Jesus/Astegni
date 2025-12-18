let user = null;
let token = null;
let theme = localStorage.getItem('theme') || 'light';
let notifications = JSON.parse(localStorage.getItem('notifications')) || [];

// Initialize session, theme, and notifications on page load
function initializeApp() {
    // Restore authentication
    const storedToken = localStorage.getItem('token') || localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('currentUser') || localStorage.getItem('user');
    if (storedToken && storedUser) {
        try {
            token = storedToken;
            user = JSON.parse(storedUser);
        } catch (error) {
            console.error('Failed to restore session:', error);
            logout();
        }
    }

    // Apply theme
    applyTheme();

    // Initialize notifications
    updateNotificationBell();

    // Update navbar
    updateNavbar();
    updateVerifyIcon();
}

document.addEventListener('DOMContentLoaded', initializeApp);

// Theme functions
function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    applyTheme();
}

function applyTheme() {
    // Apply both the class (for Tailwind) and data-theme attribute (for custom CSS)
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);

    // Update body classes for compatibility
    document.body.classList.toggle('dark', theme === 'dark');

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.innerHTML = theme === 'light' ?
            `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>` :
            `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`;
    }
}

// Notification functions
function addNotification(message) {
    notifications.push({ id: Date.now(), message, read: false });
    localStorage.setItem('notifications', JSON.stringify(notifications));
    updateNotificationBell();
}

function markNotificationsRead() {
    notifications = notifications.map(notif => ({ ...notif, read: true }));
    localStorage.setItem('notifications', JSON.stringify(notifications));
    updateNotificationBell();
}

function toggleNotificationDropdown() {
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
            const dropdownContent = document.getElementById('notification-dropdown-content');
            if (dropdownContent) {
                dropdownContent.innerHTML = notifications.length > 0 ?
                    notifications.map(notif => `
                        <div class="p-2 ${notif.read ? 'text-gray-500' : 'text-black font-bold'}">
                            ${notif.message}
                        </div>
                    `).join('') :
                    '<div class="p-2 text-gray-500">No notifications</div>';
            }
            markNotificationsRead();
        }
    }
}

function updateNotificationBell() {
    const bell = document.getElementById('notification-bell');
    const mobileBell = document.getElementById('mobile-notification-bell');
    const unreadCount = notifications.filter(notif => !notif.read).length;
    if (bell) {
        bell.classList.toggle('text-yellow-500', unreadCount > 0);
        bell.classList.toggle('text-gray-500', unreadCount === 0);
    }
    if (mobileBell) {
        mobileBell.classList.toggle('text-yellow-500', unreadCount > 0);
        mobileBell.classList.toggle('text-gray-500', unreadCount === 0);
    }
}

// Authentication functions
function openLoginRegisterModal() {
    const modal = document.getElementById('login-register-modal');
    if (modal) {
        modal.style.display = 'flex';
        showLogin();
    }
}

function openAdvertiseModal() {
    const modal = document.getElementById('advertise-modal');
    if (modal) {
        modal.style.display = 'flex';
        toggleAdvertiseFields();
    }
}

function showLogin() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const errorDiv = document.getElementById('login-error');
    if (loginForm && registerForm && errorDiv) {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        errorDiv.classList.add('hidden');
    }
}

function showRegister() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm && registerForm) {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        toggleRegisterFields();
    }
}

function toggleInput(type, method) {
    const emailInput = document.getElementById(`${type}-email`)?.parentElement;
    const phoneInput = document.getElementById(`${type}-phone`)?.parentElement;
    const countrySelect = document.getElementById(`${type}-country-container`);
    const socialFields = document.getElementById(`${type}-social-fields`);
    const socialButton = document.getElementById(`${type}-social-button`);

    if (emailInput) emailInput.classList.add('hidden');
    if (phoneInput) phoneInput.classList.add('hidden');
    if (countrySelect) countrySelect.classList.add('hidden');
    if (socialFields) socialFields.classList.add('hidden');
    if (socialButton) socialButton.classList.add('hidden');

    if (method === 'email' && emailInput) {
        emailInput.classList.remove('hidden');
    } else if (method === 'phone' && phoneInput && countrySelect) {
        phoneInput.classList.remove('hidden');
        countrySelect.classList.remove('hidden');
    } else if (method === 'social' && socialFields && socialButton) {
        socialFields.classList.remove('hidden');
        socialButton.classList.remove('hidden');
    }
}

function updatePhonePlaceholder(type) {
    const countrySelect = document.getElementById(`${type}-country`);
    const phoneInput = document.getElementById(`${type}-phone`);
    if (countrySelect && phoneInput) {
        phoneInput.placeholder = `${countrySelect.value}912345678`;
    }
}

function updateSocialPlaceholder(type) {
    const platformSelect = document.getElementById(`${type}-social-platform`);
    const addressInput = document.getElementById(`${type}-social-address`);
    if (platformSelect && addressInput) {
        const platform = platformSelect.value;
        addressInput.placeholder = platform ? `Enter ${platform} address` : 'Enter social media address';
    }
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
}

function toggleRegisterFields() {
    const registerAs = document.getElementById('register-as')?.value;
    const genderField = document.getElementById('gender-field');
    const guardianTypeField = document.getElementById('guardian-type-field');
    const instituteTypeField = document.getElementById('institute-type');

    if (genderField) genderField.classList.add('hidden');
    if (guardianTypeField) guardianTypeField.classList.add('hidden');
    if (instituteTypeField) instituteTypeField.classList.add('hidden');

    if (registerAs === 'tutor' || registerAs === 'student') {
        if (genderField) genderField.classList.remove('hidden');
    } else if (registerAs === 'parent') {
        if (guardianTypeField) guardianTypeField.classList.remove('hidden');
    } else if (registerAs === 'institute') {
        if (instituteTypeField) instituteTypeField.classList.remove('hidden');
    }
}

function toggleAdvertiseFields() {
    const advertiseAs = document.getElementById('advertise-as')?.value;
    const genderField = document.getElementById('advertise-gender-field');
    const instituteTypeField = document.getElementById('advertise-institute-type-field');

    if (genderField) genderField.classList.add('hidden');
    if (instituteTypeField) instituteTypeField.classList.add('hidden');

    if (advertiseAs === 'tutor') {
        if (genderField) genderField.classList.remove('hidden');
    } else if (advertiseAs === 'institute') {
        if (instituteTypeField) instituteTypeField.classList.remove('hidden');
    }
}

function socialLogin(platform) {
    addNotification(`Attempted login with ${platform}`);
}

async function login() {
    const loginType = document.querySelector('input[name="login-type"]:checked')?.value;
    let identifier;
    const emailInput = document.getElementById('login-email-input');
    const phoneInput = document.getElementById('login-phone-input');
    const socialInput = document.getElementById('login-social-address');
    const passwordInput = document.getElementById('login-password');
    const errorDiv = document.getElementById('login-error');

    if (loginType === 'email') {
        identifier = emailInput?.value;
    } else if (loginType === 'phone') {
        identifier = phoneInput?.value;
    } else if (loginType === 'social') {
        identifier = socialInput?.value;
    }
    const password = passwordInput?.value;

    if (!identifier || !password) {
        if (errorDiv) {
            errorDiv.textContent = 'Please fill in all fields.';
            errorDiv.classList.remove('hidden');
        }
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identifier,
                password,
                login_type: loginType
            })
        });
        const result = await response.json();
        if (!response.ok) {
            if (result.detail === "This account isn't registered" && errorDiv) {
                errorDiv.textContent = result.detail;
                errorDiv.classList.remove('hidden');
            } else {
                addNotification(`Login failed: ${result.detail}`);
            }
            return;
        }
        user = {
            identifier: result.identifier,
            isVerified: result.is_verified,
            name: result.name,
            profilePic: result.profile_pic,
            role: result.role
        };
        token = result.access_token;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        if (errorDiv) errorDiv.classList.add('hidden');
        updateNavbar();
        updateVerifyIcon();
        addNotification(`User ${result.identifier} logged in`);
        closeModal('login-register-modal');
        alert('Login successful!');
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = 'An error occurred. Please try again.';
            errorDiv.classList.remove('hidden');
        }
    }
}

async function submitRegistration() {
    const registerAs = document.getElementById('register-as')?.value;
    const loginType = document.querySelector('input[name="register-type"]:checked')?.value;
    let identifier;
    if (loginType === 'email') {
        identifier = document.getElementById('register-email')?.value;
    } else if (loginType === 'phone') {
        identifier = document.getElementById('register-phone')?.value;
    } else if (loginType === 'social') {
        identifier = document.getElementById('register-social-address')?.value;
    }
    const password = document.getElementById('register-password')?.value;
    const repeatPassword = document.getElementById('register-repeat-password')?.value;
    const gender = document.getElementById('register-gender')?.value || null;
    const guardianType = document.getElementById('register-guardian-type')?.value || null;
    const instituteType = document.getElementById('register-institute-type')?.value || null;

    if (!identifier || !password || password !== repeatPassword) {
        addNotification('Registration failed: Please fill in all fields correctly');
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identifier,
                password,
                register_as: registerAs,
                login_type: loginType,
                gender,
                guardian_type: guardianType,
                institute_type: instituteType
            })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail);
        user = {
            identifier: result.identifier,
            isVerified: result.is_verified,
            name: result.name,
            profilePic: result.profile_pic,
            role: registerAs
        };
        token = null;
        localStorage.removeItem('token');
        localStorage.setItem('user', JSON.stringify(user));
        updateNavbar();
        updateVerifyIcon();
        addNotification(`User ${result.identifier} registered successfully`);
        closeModal('login-register-modal');
        alert('Registration successful! Please log in.');
    } catch (error) {
        addNotification(`Registration failed: ${error.message}`);
    }
}

async function submitAdvertisement() {
    const advertiseAs = document.getElementById('advertise-as')?.value;
    const loginType = document.querySelector('input[name="advertise-type"]:checked')?.value;
    let identifier;
    if (loginType === 'email') {
        identifier = document.getElementById('advertise-email')?.value;
    } else if (loginType === 'phone') {
        identifier = document.getElementById('advertise-phone')?.value;
    } else if (loginType === 'social') {
        identifier = document.getElementById('advertise-social-address')?.value;
    }
    const password = document.getElementById('advertise-password')?.value;
    const repeatPassword = document.getElementById('advertise-repeat-password')?.value;
    const gender = document.getElementById('advertise-gender')?.value || null;
    const instituteType = document.getElementById('advertise-institute-type')?.value || null;

    if (!identifier || !password || password !== repeatPassword) {
        addNotification('Advertisement failed: Please fill in all fields correctly');
        return;
    }

    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
        addNotification('Please log in first');
        closeModal('advertise-modal');
        openLoginRegisterModal();
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/advertise', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${storedToken}`
            },
            body: JSON.stringify({
                identifier,
                password,
                advertise_as: advertiseAs,
                login_type: loginType,
                gender,
                institute_type: instituteType
            })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail);
        user = {
            identifier: result.identifier,
            isVerified: result.is_verified,
            name: result.name,
            profilePic: result.profile_pic,
            role: `advertiser_${advertiseAs}`
        };
        localStorage.setItem('user', JSON.stringify(user));
        updateNavbar();
        updateVerifyIcon();
        addNotification(`Advertisement account ${result.identifier} created`);
        closeModal('advertise-modal');
        alert('Advertisement account created!');
    } catch (error) {
        addNotification(`Advertisement failed: ${error.message}`);
    }
}

function logout() {
    user = null;
    token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateNavbar();
    updateVerifyIcon();
    addNotification('User logged out');
    alert('Logged out successfully.');
}

// REMOVED: Conflicted with profile-system.js version
// toggleProfileDropdown is now defined in profile-system.js
// which properly handles profile-dropdown-menu element

function toggleVerification() {
    if (user) {
        user.isVerified = !user.isVerified;
        localStorage.setItem('user', JSON.stringify(user));
        updateVerifyIcon();
        updateNavbar();
        toggleProfileDropdown();
        addNotification(`Account ${user.isVerified ? 'verified' : 'unverified'}`);
        alert(`Account ${user.isVerified ? 'verified' : 'unverified'}.`);
    } else {
        addNotification('No user logged in');
    }
}

function updateVerifyIcon() {
    const verifyIcon = document.getElementById('verify-icon');
    if (verifyIcon) {
        if (user && user.isVerified) {
            verifyIcon.innerHTML = `<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
        } else {
            verifyIcon.innerHTML = `<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
        }
    }
}

function updateNavbar() {
    // IMPORTANT: This function now delegates to the new auth system
    // Use APP_STATE.currentUser instead of the deprecated 'user' variable

    // Check if this is an admin page or profile page (different navigation structure)
    const isAdminPage = window.location.pathname.includes('/admin-pages/');
    const isProfilePage = window.location.pathname.includes('/profile-pages/') ||
                         window.location.pathname.includes('/view-profiles/');

    // Exit early for admin/profile pages as they have different navigation
    if (isAdminPage || isProfilePage) {
        return;
    }

    // Check if APP_STATE exists (new system)
    if (typeof APP_STATE !== 'undefined' && APP_STATE.currentUser) {
        // New auth system is in control - do nothing
        // The updateUIForLoggedInUser() function handles everything
        return;
    }

    // Fallback to old system only if new system isn't available
    const loginRegisterBtn = document.getElementById('login-register-btn');
    const profileContainer = document.getElementById('profile-container');

    // Only warn if critical elements are missing on non-admin/non-profile pages
    const criticalElements = [loginRegisterBtn, profileContainer];
    const hasCriticalElements = criticalElements.some(el => el !== null);

    if (!hasCriticalElements && !isAdminPage && !isProfilePage) {
        console.warn('Critical navigation elements are missing');
        return;
    }

    // Legacy code for backward compatibility (if new system not loaded)
    const mobileLoginRegisterBtn = document.getElementById('mobile-login-register-btn');
    const advertiseBtn = document.getElementById('advertise-btn');
    const mobileAdvertiseBtn = document.getElementById('mobile-advertise-btn');
    const mobileProfileContainer = document.getElementById('mobile-profile-container');
    const profileName = document.getElementById('profile-name');
    const mobileProfileName = document.getElementById('mobile-profile-name');
    const profilePic = document.getElementById('profile-pic');
    const mobileProfilePic = document.getElementById('mobile-profile-pic');
    const heroLoginBtn = document.getElementById('hero-login-btn');
    const heroAdvertiseBtn = document.getElementById('hero-advertise-btn');

    if (user) {
        loginRegisterBtn?.classList.add('hidden');
        mobileLoginRegisterBtn?.classList.add('hidden');
        heroLoginBtn?.classList.add('hidden');
        heroAdvertiseBtn?.classList.add('hidden');
        profileContainer?.classList.remove('hidden');
        mobileProfileContainer?.classList.remove('hidden');
        if (profileName) profileName.textContent = user.name || 'User';
        if (mobileProfileName) mobileProfileName.textContent = user.name || 'User';
        if (profilePic) profilePic.src = user.profilePic || 'https://picsum.photos/32';
        if (mobileProfilePic) mobileProfilePic.src = user.profilePic || 'https://picsum.photos/32';
    } else {
        if (loginRegisterBtn) loginRegisterBtn.textContent = 'Login/Register';
        loginRegisterBtn?.classList.remove('hidden');
        mobileLoginRegisterBtn?.classList.remove('hidden');
        advertiseBtn?.classList.remove('hidden');
        mobileAdvertiseBtn?.classList.remove('hidden');
        heroLoginBtn?.classList.remove('hidden');
        heroAdvertiseBtn?.classList.remove('hidden');
        profileContainer?.classList.add('hidden');
        mobileProfileContainer?.classList.add('hidden');
    }
}