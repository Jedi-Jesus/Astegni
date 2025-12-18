// Authentication System for Admin Dashboard
// API_BASE_URL is set globally by api-config.js (loaded first)
// This file should NOT redeclare it

// Initialize dashboard without requiring authentication
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is already authenticated via main auth system
    const token = localStorage.getItem('token');
    const currentUser = localStorage.getItem('currentUser');

    let isAuthenticated = false;
    let adminUser = null;

    if (token && currentUser) {
        try {
            const user = JSON.parse(currentUser);
            // Check if user has admin role
            if (user.roles && user.roles.includes('admin')) {
                isAuthenticated = true;
                // Sync with admin auth storage, preserving existing department info
                localStorage.setItem('adminAuth', 'true');
                const existingAdminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
                const mergedAdminUser = {
                    email: user.email || user.phone,
                    name: user.name || `${user.first_name} ${user.father_name}`,
                    role: 'admin',
                    loginTime: new Date().toISOString(),
                    // Preserve existing department info if available
                    department: existingAdminUser.department || user.department,
                    departments: existingAdminUser.departments || user.departments || []
                };
                localStorage.setItem('adminUser', JSON.stringify(mergedAdminUser));
                // Use the merged admin user with preserved department info
                adminUser = mergedAdminUser;
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }

    // Fallback to local admin auth if main auth not found
    if (!isAuthenticated) {
        isAuthenticated = localStorage.getItem('adminAuth') === 'true';
        const storedAdminUser = localStorage.getItem('adminUser');
        if (storedAdminUser) {
            adminUser = JSON.parse(storedAdminUser);
        }
    }

    // Dashboard is always visible
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        dashboard.style.display = 'block';
    }

    if (isAuthenticated && adminUser) {
        // User is logged in - show user controls
        showUserControls(adminUser);
    } else {
        // User is not logged in - show auth buttons
        showAuthButtons();
    }

    // Initialize dashboard components
    if (window.initializeDashboard) {
        window.initializeDashboard();
    }
});

// Show auth buttons in header
function showAuthButtons() {
    const authButtons = document.getElementById('auth-buttons');
    const userControls = document.getElementById('user-controls');

    if (authButtons) authButtons.style.display = 'flex';
    if (userControls) userControls.style.display = 'none';

    // Show lock icons on action buttons
    updateActionButtonLocks(false);

    // Update welcome message
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
        welcomeMessage.textContent = 'Login to unlock full admin features';
    }
}

// Show user controls in header
function showUserControls(adminUser) {
    const authButtons = document.getElementById('auth-buttons');
    const userControls = document.getElementById('user-controls');

    if (authButtons) authButtons.style.display = 'none';
    if (userControls) userControls.style.display = 'flex';

    // Update profile picture and name in toggle button
    const profilePic = document.getElementById('profile-pic');
    const profileName = document.getElementById('profile-name');

    if (profilePic) {
        // Use profile picture or fallback to placeholder SVG avatar
        profilePic.src = adminUser.profile_picture || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%234F46E5"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40" font-family="Arial">A%3C/text%3E%3C/svg%3E';
        profilePic.alt = adminUser.name || 'Admin';
        // Handle image load errors
        profilePic.onerror = function() {
            this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%234F46E5"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40" font-family="Arial">A%3C/text%3E%3C/svg%3E';
        };
    }

    if (profileName) {
        profileName.textContent = adminUser.name || 'Admin User';
    }

    // Update dropdown header info
    const dropdownProfilePic = document.getElementById('dropdown-profile-pic');
    const dropdownUserName = document.getElementById('dropdown-user-name');
    const dropdownUserEmail = document.getElementById('dropdown-user-email');
    const dropdownUserRole = document.getElementById('dropdown-user-role');

    if (dropdownProfilePic) {
        // Use profile picture or fallback to placeholder SVG avatar
        dropdownProfilePic.src = adminUser.profile_picture || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%234F46E5"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40" font-family="Arial">A%3C/text%3E%3C/svg%3E';
        dropdownProfilePic.alt = adminUser.name || 'Admin';
        // Handle image load errors
        dropdownProfilePic.onerror = function() {
            this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%234F46E5"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40" font-family="Arial">A%3C/text%3E%3C/svg%3E';
        };
    }

    if (dropdownUserName) {
        dropdownUserName.textContent = adminUser.name || 'Admin User';
    }

    if (dropdownUserEmail) {
        dropdownUserEmail.textContent = adminUser.email || '';
    }

    if (dropdownUserRole) {
        const currentDept = adminUser.department || 'manage-system-settings';
        dropdownUserRole.textContent = formatDepartmentName(currentDept);
    }

    // Update department switcher
    updateDepartmentSwitcher(adminUser);

    // Update profile link href to current department page
    const profileLink = document.getElementById('dropdown-profile-link');
    if (profileLink) {
        const currentDept = adminUser.department || 'manage-system-settings';
        profileLink.href = `${currentDept}.html`;
        profileLink.onclick = (e) => {
            e.preventDefault();
            navigateToPage(`${currentDept}.html`);
        };
    }

    // Hide lock icons on action buttons
    updateActionButtonLocks(true);

    // Update welcome message
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
        welcomeMessage.textContent = `Welcome back, ${adminUser.name || 'Admin'}! Monitor and manage your platform in real-time`;
    }
}

// Update lock icons on action buttons
function updateActionButtonLocks(isAuthenticated) {
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(btn => {
        const lockIcon = btn.querySelector('.auth-lock');
        if (lockIcon) {
            lockIcon.style.opacity = isAuthenticated ? '0' : '1';
        }
        btn.setAttribute('data-auth', isAuthenticated);
    });
}

// Open login modal
function openLoginModal() {
    const modal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (modal) modal.classList.add('active');
    if (loginForm) loginForm.classList.add('active');
    if (registerForm) registerForm.classList.remove('active');
}

// Open register modal
function openRegisterModal() {
    const modal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (modal) modal.classList.add('active');
    if (loginForm) loginForm.classList.remove('active');
    if (registerForm) registerForm.classList.add('active');
}

// Close authentication modal
function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('active');
}

// Switch between login and register forms
function switchAuthForm(formType) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotForm = document.getElementById('forgot-password-form');
    const resetForm = document.getElementById('reset-password-form');

    // Hide all forms first
    [loginForm, registerForm, forgotForm, resetForm].forEach(form => {
        if (form) form.classList.remove('active');
    });

    // Show the requested form
    if (formType === 'register' && registerForm) {
        registerForm.classList.add('active');
    } else if (formType === 'forgot-password' && forgotForm) {
        forgotForm.classList.add('active');
    } else if (formType === 'reset-password' && resetForm) {
        resetForm.classList.add('active');
    } else if (loginForm) {
        loginForm.classList.add('active');
    }

    // Clear all form errors
    clearFormErrors();
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();

    const form = event.target;
    const email = form.email.value.trim();
    const password = form.password.value;
    const remember = form.remember.checked;

    // Clear previous errors
    clearFormErrors();

    // Validate
    if (!email) {
        showFieldError('login-email', 'Email or username is required');
        return;
    }

    if (!password) {
        showFieldError('login-password', 'Password is required');
        return;
    }

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Logging in...</span>';
    submitBtn.disabled = true;

    try {
        // Make API call to backend
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }

        const data = await response.json();

        // Admin login returns: { admin_id, name, email, departments, access_token }
        if (!data.success) {
            throw new Error(data.message || 'Login failed');
        }

        // Save authentication data
        // Store token in multiple keys for compatibility across admin pages
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('adminToken', data.access_token);  // Primary admin token key
        localStorage.setItem('admin_access_token', data.access_token);  // Fallback
        localStorage.setItem('adminAuth', 'true');

        // Store admin_id for profile lookups
        localStorage.setItem('adminId', data.admin_id);

        // Fetch full admin profile from admin_profile table
        let adminProfileData = null;
        try {
            const profileResponse = await fetch(`${API_BASE_URL}/api/admin/profile/${data.admin_id}`, {
                headers: {
                    'Authorization': `Bearer ${data.access_token}`
                }
            });

            if (profileResponse.ok) {
                adminProfileData = await profileResponse.json();
                console.log('✅ Admin profile loaded:', adminProfileData);
                // Store the full admin profile
                localStorage.setItem('adminProfile', JSON.stringify(adminProfileData));
            }
        } catch (profileError) {
            console.warn('⚠️ Could not load admin profile, using basic data:', profileError);
        }

        // Determine the default department - prioritize manage-system-settings if user has it
        const userDepartments = data.departments || [];
        let defaultDepartment = 'manage-system-settings';
        if (userDepartments.length > 0) {
            // If user has manage-system-settings, use it (full access)
            // Otherwise, use the first department in the list
            defaultDepartment = userDepartments.includes('manage-system-settings')
                ? 'manage-system-settings'
                : userDepartments[0];
        }

        const adminUser = {
            id: data.admin_id,
            email: data.email,
            name: data.name || (adminProfileData ?
                  [adminProfileData.first_name, adminProfileData.father_name, adminProfileData.grandfather_name]
                      .filter(n => n).join(' ') :
                  'Admin User'),
            role: 'admin',
            departments: userDepartments,
            department: defaultDepartment,
            loginTime: new Date().toISOString(),
            admin_username: adminProfileData?.admin_username || data.email.split('@')[0]
        };

        localStorage.setItem('adminUser', JSON.stringify(adminUser));
        localStorage.setItem('adminEmail', data.email); // Store email separately for profile loading

        // ALSO store as adminSession for compatibility with manage-campaigns-data-loader.js and other pages
        const adminSession = {
            id: data.admin_id,
            email: data.email,
            username: adminProfileData?.username || data.email.split('@')[0],
            name: adminUser.name,
            department: adminUser.department,
            departments: data.departments || []
        };
        localStorage.setItem('adminSession', JSON.stringify(adminSession));

        if (remember) {
            localStorage.setItem('rememberAdmin', 'true');
        }

        // Update UI
        showUserControls(adminUser);
        closeAuthModal();

        // Show success message
        showNotification('Login successful! Welcome back.', 'success');

    } catch (error) {
        console.error('Login error:', error);
        showFieldError('login-password', error.message || 'Invalid credentials');
        shakeForm(form);
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Handle register form submission
async function handleRegister(event) {
    event.preventDefault();

    const form = event.target;
    const firstName = form.first_name.value.trim();
    const fatherName = form.father_name.value.trim();
    const grandfatherName = form.grandfather_name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirm = form.confirm.value;
    const department = form.department.value;
    const code = form.code.value.trim();

    // Clear previous errors
    clearFormErrors();

    // Validate
    let hasError = false;

    if (!firstName || firstName.length < 2) {
        showFieldError('register-first-name', 'Please enter your first name');
        hasError = true;
    }

    if (!fatherName || fatherName.length < 2) {
        showFieldError('register-father-name', 'Please enter your father\'s name');
        hasError = true;
    }

    // Grandfather name is optional, no validation needed

    if (!validateEmail(email)) {
        showFieldError('register-email', 'Please enter a valid email address');
        hasError = true;
    }

    if (!password || password.length < 8) {
        showFieldError('register-password', 'Password must be at least 8 characters');
        hasError = true;
    }

    if (password !== confirm) {
        showFieldError('register-confirm', 'Passwords do not match');
        hasError = true;
    }

    if (!department) {
        showFieldError('admin-department', 'Please select a department');
        hasError = true;
    }

    if (!code || code.length !== 6) {
        showFieldError('admin-code', 'Please enter the 6-digit OTP code sent to your email');
        hasError = true;
    }

    if (hasError) {
        shakeForm(form);
        return;
    }

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Verifying OTP...</span>';
    submitBtn.disabled = true;

    try {
        // Make API call to verify OTP and complete registration
        const response = await fetch(`${API_BASE_URL}/api/admin/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                first_name: firstName,
                father_name: fatherName,
                grandfather_name: grandfatherName,
                email: email,
                password: password,
                otp_code: code,
                department: department
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Registration failed');
        }

        const data = await response.json();

        // Admin register returns: { admin_id, name, email, departments, access_token }
        if (!data.success) {
            throw new Error(data.message || 'Registration failed');
        }

        // Save authentication data
        // Store token in multiple keys for compatibility across admin pages
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('adminToken', data.access_token);  // Primary admin token key
        localStorage.setItem('admin_access_token', data.access_token);  // Fallback
        localStorage.setItem('adminAuth', 'true');
        localStorage.setItem('adminId', data.admin_id);

        // Build full name from response or use the form values
        const fullName = data.name || `${firstName} ${fatherName}${grandfatherName ? ' ' + grandfatherName : ''}`;

        // Determine the default department - prioritize manage-system-settings if user has it
        const regDepartments = data.departments || [department];
        let regDefaultDepartment = department;
        if (regDepartments.includes('manage-system-settings')) {
            regDefaultDepartment = 'manage-system-settings';
        } else if (regDepartments.length > 0) {
            regDefaultDepartment = regDepartments[0];
        }

        const adminUser = {
            id: data.admin_id,
            email: data.email,
            name: fullName,
            first_name: firstName,
            father_name: fatherName,
            grandfather_name: grandfatherName,
            role: 'admin',
            departments: regDepartments,
            department: regDefaultDepartment,
            createdAt: new Date().toISOString()
        };

        localStorage.setItem('adminUser', JSON.stringify(adminUser));

        // ALSO store as adminSession for compatibility with manage-campaigns-data-loader.js and other pages
        const adminSession = {
            id: data.admin_id,
            email: data.email,
            username: data.email.split('@')[0],
            name: fullName,
            first_name: firstName,
            father_name: fatherName,
            grandfather_name: grandfatherName,
            department: adminUser.department,
            departments: data.departments || [department]
        };
        localStorage.setItem('adminSession', JSON.stringify(adminSession));

        // Update UI
        showUserControls(adminUser);
        closeAuthModal();

        // Show success message
        showNotification('Registration completed successfully! Welcome to Astegni.', 'success');

    } catch (error) {
        console.error('Registration error:', error);
        showFieldError('admin-code', error.message || 'Invalid OTP or registration failed');
        shakeForm(form);
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Handle forgot password form submission
async function handleForgotPassword(event) {
    event.preventDefault();

    const form = event.target;
    const email = form.email.value.trim();

    // Clear previous errors
    clearFormErrors();

    // Validate
    if (!validateEmail(email)) {
        showFieldError('forgot-email', 'Please enter a valid email address');
        shakeForm(form);
        return;
    }

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Sending OTP...</span>';
    submitBtn.disabled = true;

    try {
        // Make API call to request password reset
        const response = await fetch(`${API_BASE_URL}/api/admin/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to send reset OTP');
        }

        const data = await response.json();

        // Store email for reset form
        document.getElementById('reset-email').value = email;

        // Switch to reset password form
        switchAuthForm('reset-password');

        // Show success message with OTP in dev mode
        if (data.otp) {
            showNotification(`Reset OTP sent! [DEV: ${data.otp}]`, 'success');
        } else {
            showNotification('Password reset OTP sent to your email (valid for 15 minutes)', 'success');
        }

    } catch (error) {
        console.error('Forgot password error:', error);
        // For security, always show success message
        showNotification('If this email exists, a reset OTP has been sent', 'info');
        // But log actual error
        console.log('Actual error:', error.message);
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Handle reset password form submission
async function handleResetPassword(event) {
    event.preventDefault();

    const form = event.target;
    const email = form.email.value.trim();
    const otp = form.otp.value.trim();
    const newPassword = form.password.value;
    const confirmPassword = form.confirm.value;

    // Clear previous errors
    clearFormErrors();

    // Validate
    let hasError = false;

    if (!otp || otp.length !== 6) {
        showFieldError('reset-otp', 'Please enter the 6-digit OTP');
        hasError = true;
    }

    if (!newPassword || newPassword.length < 8) {
        showFieldError('reset-new-password', 'Password must be at least 8 characters');
        hasError = true;
    }

    if (newPassword !== confirmPassword) {
        showFieldError('reset-confirm-password', 'Passwords do not match');
        hasError = true;
    }

    if (hasError) {
        shakeForm(form);
        return;
    }

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Resetting password...</span>';
    submitBtn.disabled = true;

    try {
        // Make API call to reset password
        const response = await fetch(`${API_BASE_URL}/api/admin/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                otp_code: otp,
                new_password: newPassword
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Password reset failed');
        }

        const data = await response.json();

        // Switch to login form
        switchAuthForm('login');

        // Pre-fill email in login form
        document.getElementById('login-email').value = email;

        // Show success message
        showNotification('Password reset successfully! Please login with your new password.', 'success');

    } catch (error) {
        console.error('Reset password error:', error);
        showFieldError('reset-otp', error.message || 'Invalid OTP or password reset failed');
        shakeForm(form);
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Handle logout
async function handleLogout() {
    try {
        // Call backend logout endpoint if available
        const token = localStorage.getItem('token');
        if (token) {
            await fetch(`${API_BASE_URL}/api/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }).catch(() => {
                // Silently fail if logout endpoint doesn't exist
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    }

    // Clear all session data (including admin-specific tokens)
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminSession');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('adminId');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminProfile');
    localStorage.removeItem('rememberAdmin');
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');

    // Update UI
    showAuthButtons();

    // Show message
    showNotification('You have been logged out successfully.', 'info');
}

// Check if action requires authentication and department access
function requireAuth(page) {
    const isAuthenticated = localStorage.getItem('adminAuth') === 'true';

    console.log('requireAuth called with page:', page);
    console.log('Is authenticated:', isAuthenticated);

    if (!isAuthenticated) {
        // Open login modal
        openLoginModal();
        showNotification('Please login to access this feature', 'warning');
        return;
    }

    // Check department-based access
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    const department = adminUser.department || 'manage-system-settings';

    // Department access mapping
    // NOTE: 'manage-system-settings' has FULL ACCESS to all pages (super admin)
    const departmentAccess = {
        'manage-advertisers': ['manage-advertisers.html'],
        'manage-schools': ['manage-schools.html'],
        'manage-courses': ['manage-courses.html'],
        'manage-credentials': ['manage-credentials.html'],
        'manage-customers': ['manage-customers.html'],
        'manage-contents': ['manage-contents.html'],
        'manage-campaigns': ['manage-campaigns.html'],
        'manage-admins': ['manage-admins.html'],
        'manage-system-settings': [  // Full access (super admin)
            'manage-advertisers.html',
            'manage-schools.html',
            'manage-courses.html',
            'manage-credentials.html',
            'manage-customers.html',
            'manage-contents.html',
            'manage-campaigns.html',
            'manage-admins.html',
            'manage-system-settings.html'
        ]
    };

    const allowedPages = departmentAccess[department] || [];
    const hasAccess = allowedPages.includes(page);

    if (!hasAccess) {
        showNotification(`Access denied. Your department (${department}) cannot access this page.`, 'warning');
        console.log('Access denied for department:', department, 'to page:', page);
        return;
    }

    // Proceed with navigation
    console.log('Navigating to:', page);
    navigateToPage(page);
}

// Navigate to page
function navigateToPage(page) {
    console.log('navigateToPage called with:', page);
    // Navigate to the specified admin page
    window.location.href = page;
}

// Toggle profile dropdown
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profile-dropdown-menu');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

// Open add department modal
function openAddDepartmentModal() {
    const modal = document.getElementById('add-department-modal');
    if (modal) {
        modal.classList.add('active');
    }
    // Close profile dropdown
    const dropdown = document.getElementById('profile-dropdown-menu');
    if (dropdown) {
        dropdown.classList.add('hidden');
    }
}

// Close add department modal
function closeAddDepartmentModal() {
    const modal = document.getElementById('add-department-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    // Clear form
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
        clearFormErrors();
    }
}

// Request OTP for adding department
async function requestDepartmentOTP() {
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    const email = adminUser.email;

    if (!email) {
        showNotification('No email found. Please login again.', 'warning');
        return;
    }

    const department = document.getElementById('add-dept-department').value;
    if (!department) {
        showFieldError('add-dept-department', 'Please select a department first');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/request-department-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                email: email,
                department: department
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to send OTP');
        }

        const data = await response.json();
        showNotification('OTP sent to your email!', 'success');

        // Focus OTP field
        document.getElementById('add-dept-otp').focus();
    } catch (error) {
        console.error('Request OTP error:', error);
        showNotification(error.message || 'Failed to send OTP', 'warning');
    }
}

// Handle add department form submission
async function handleAddDepartment(event) {
    event.preventDefault();

    const form = event.target;
    const department = form.department.value;
    const position = form.position.value.trim();
    const otp = form.otp.value.trim();
    const password = form.password.value;

    // Clear previous errors
    clearFormErrors();

    // Validate
    let hasError = false;

    if (!department) {
        showFieldError('add-dept-department', 'Please select a department');
        hasError = true;
    }

    if (!position) {
        showFieldError('add-dept-position', 'Please enter your position');
        hasError = true;
    }

    if (!otp || otp.length !== 6) {
        showFieldError('add-dept-otp', 'Please enter the 6-digit OTP');
        hasError = true;
    }

    if (!password) {
        showFieldError('add-dept-password', 'Please confirm your password');
        hasError = true;
    }

    if (hasError) {
        shakeForm(form);
        return;
    }

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Adding department...</span>';
    submitBtn.disabled = true;

    try {
        const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

        const response = await fetch(`${API_BASE_URL}/api/admin/add-department`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                email: adminUser.email,
                department: department,
                position: position,
                otp_code: otp,
                password: password
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to add department');
        }

        const data = await response.json();

        // Update local admin user data
        const updatedAdminUser = {
            ...adminUser,
            departments: data.departments || [...(adminUser.departments || []), department]
        };
        localStorage.setItem('adminUser', JSON.stringify(updatedAdminUser));

        // Close modal
        closeAddDepartmentModal();

        // Update dropdown UI
        updateDepartmentSwitcher(updatedAdminUser);

        // Show success message
        showNotification('Department added successfully!', 'success');

    } catch (error) {
        console.error('Add department error:', error);
        showFieldError('add-dept-otp', error.message || 'Failed to add department');
        shakeForm(form);
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Update department switcher UI
function updateDepartmentSwitcher(adminUser) {
    const switcherSection = document.getElementById('department-switcher-section');
    const departmentOptions = document.getElementById('department-options');

    if (!switcherSection || !departmentOptions) return;

    if (!adminUser.departments || adminUser.departments.length <= 1) {
        // Hide switcher if only one department
        switcherSection.classList.add('hidden');
        return;
    }

    // Check if user is from system-settings department (has access to all departments)
    const isSystemSettings = adminUser.department === 'manage-system-settings' ||
                             adminUser.departments.includes('manage-system-settings');

    // Hide switcher for system-settings users - they have full access to all departments
    if (isSystemSettings) {
        switcherSection.classList.add('hidden');
        return;
    }

    // Show switcher for users with multiple departments (but not system-settings)
    switcherSection.classList.remove('hidden');

    // Clear existing options
    departmentOptions.innerHTML = '';

    // Add department options
    adminUser.departments.forEach(dept => {
        const option = document.createElement('button');
        option.className = 'department-option';
        if (dept === adminUser.department) {
            option.classList.add('active');
        }

        const icon = getDepartmentIcon(dept);
        option.innerHTML = `
            <i class="fas ${icon} department-icon"></i>
            <span class="department-name">${formatDepartmentName(dept)}</span>
            ${dept === adminUser.department ? '<i class="fas fa-check department-check"></i>' : ''}
        `;

        option.onclick = () => switchDepartment(dept);
        departmentOptions.appendChild(option);
    });
}

// Format department name for display
function formatDepartmentName(dept) {
    return dept
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Get department icon
function getDepartmentIcon(dept) {
    const icons = {
        'manage-courses': 'fa-graduation-cap',
        'manage-schools': 'fa-school',
        'manage-campaigns': 'fa-bullhorn',
        'manage-credentials': 'fa-certificate',
        'manage-contents': 'fa-photo-video',
        'manage-customers': 'fa-users',
        'manage-system-settings': 'fa-cog'
    };
    return icons[dept] || 'fa-folder';
}

// Switch active department
function switchDepartment(department) {
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

    // Check if already on this department
    if (adminUser.department === department) {
        // Just navigate to the page (refresh)
        navigateToPage(`${department}.html`);
        return;
    }

    adminUser.department = department;
    localStorage.setItem('adminUser', JSON.stringify(adminUser));

    // Show notification
    showNotification(`Switching to ${formatDepartmentName(department)}...`, 'info');

    // Close dropdown
    toggleProfileDropdown();

    // Navigate to the department page
    setTimeout(() => {
        navigateToPage(`${department}.html`);
    }, 300);
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const container = document.getElementById('profile-container');
    const dropdown = document.getElementById('profile-dropdown-menu');

    if (container && dropdown && !container.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

// Ensure all functions are globally accessible for onclick handlers
window.requireAuth = requireAuth;
window.navigateToPage = navigateToPage;
window.openLoginModal = openLoginModal;
window.openRegisterModal = openRegisterModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthForm = switchAuthForm;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleForgotPassword = handleForgotPassword;
window.handleResetPassword = handleResetPassword;
window.handleLogout = handleLogout;
window.togglePassword = togglePassword;
window.checkPasswordStrength = checkPasswordStrength;
window.toggleProfileMenu = toggleProfileMenu;
window.toggleProfileDropdown = toggleProfileDropdown;
window.openAddDepartmentModal = openAddDepartmentModal;
window.closeAddDepartmentModal = closeAddDepartmentModal;
window.requestDepartmentOTP = requestDepartmentOTP;
window.handleAddDepartment = handleAddDepartment;

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    // Add to body
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Toggle password visibility
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const button = field.nextElementSibling;
    const icon = button.querySelector('i');

    if (field.type === 'password') {
        field.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        field.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Check password strength
function checkPasswordStrength(password) {
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');

    if (!strengthBar || !strengthText) return;

    let strength = 0;
    let strengthLabel = 'Weak';
    let strengthColor = 'var(--text-danger)';

    // Check criteria
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    // Determine strength level
    if (strength <= 2) {
        strengthLabel = 'Weak';
        strengthColor = 'var(--text-danger)';
    } else if (strength <= 4) {
        strengthLabel = 'Medium';
        strengthColor = 'var(--text-warning)';
    } else {
        strengthLabel = 'Strong';
        strengthColor = 'var(--text-success)';
    }

    // Update UI
    const percentage = (strength / 6) * 100;
    strengthBar.style.setProperty('--strength', `${percentage}%`);
    strengthBar.style.setProperty('--strength-color', strengthColor);
    strengthText.textContent = `Password strength: ${strengthLabel}`;
}

// Show field error
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorText = field.parentElement.querySelector('.error-text');

    if (errorText) {
        errorText.textContent = message;
        errorText.classList.add('visible');
        field.style.borderColor = 'var(--text-danger)';
    }
}

// Clear all form errors
function clearFormErrors() {
    const errorTexts = document.querySelectorAll('.error-text');
    const inputs = document.querySelectorAll('input');

    errorTexts.forEach(error => {
        error.textContent = '';
        error.classList.remove('visible');
    });

    inputs.forEach(input => {
        input.style.borderColor = '';
    });
}

// Validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Shake form animation
function shakeForm(form) {
    form.style.animation = 'shake 0.5s';
    setTimeout(() => {
        form.style.animation = '';
    }, 500);
}

// Toggle profile dropdown menu
function toggleProfileMenu() {
    const dropdown = document.querySelector('.dropdown-menu');
    if (dropdown) dropdown.classList.toggle('active');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.admin-profile')) {
        const dropdown = document.querySelector('.dropdown-menu');
        if (dropdown) {
            dropdown.classList.remove('active');
        }
    }
});

// Add shake animation and notification styles
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }

    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        box-shadow: var(--shadow-lg);
    }

    .notification.show {
        transform: translateX(0);
    }

    .notification-success {
        border-left: 3px solid var(--text-success);
        color: var(--text-success);
    }

    .notification-warning {
        border-left: 3px solid var(--text-warning);
        color: var(--text-warning);
    }

    .notification-info {
        border-left: 3px solid var(--primary-color);
        color: var(--primary-color);
    }
`;
document.head.appendChild(style);