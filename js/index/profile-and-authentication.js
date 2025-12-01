// ============================================
//   PROFILE AND AUTHENTICATION MANAGEMENT
// ============================================

// Helper function to update role switcher display
function updateRoleSwitcher() {
    if (!APP_STATE.currentUser || !APP_STATE.currentUser.roles) return;

    const roleSwitcherSection = document.getElementById('role-switcher-section');
    const roleOptions = document.getElementById('role-options');

    if (!roleSwitcherSection || !roleOptions) return;

    // Filter out admin roles - admins should only access through admin-index.html
    const userFacingRoles = APP_STATE.currentUser.roles.filter(role => role !== 'admin');

    // Only show if user has multiple roles
    if (userFacingRoles.length > 1) {
        roleSwitcherSection.classList.remove('hidden');

        // Clear existing options
        roleOptions.innerHTML = '';

        // Add role options
        userFacingRoles.forEach(role => {
            const isActive = role === APP_STATE.currentUser.active_role;
            const roleOption = document.createElement('button');
            roleOption.className = `role-option ${isActive ? 'active disabled' : ''}`;
            roleOption.innerHTML = `
                <span class="role-icon">${getRoleIcon(role)}</span>
                <span class="role-name">${role.charAt(0).toUpperCase() + role.slice(1)}</span>
                ${isActive ? '<span class="active-badge">Active</span>' : ''}
            `;

            if (!isActive) {
                roleOption.onclick = () => switchRole(role);
            }

            roleOptions.appendChild(roleOption);
        });
    } else {
        roleSwitcherSection.classList.add('hidden');
    }
}

// Helper function to get role icon
function getRoleIcon(role) {
    const icons = {
        student: '🎓',
        tutor: '👨‍🏫',
        parent: '👨‍👩‍👧‍👦',
        advertiser: '📢',
        institute: '🏢',
        author: '✍️',
        bookstore: '📚',
        delivery: '🚚',
        user: '👤'
    };
    return icons[role] || '👤';
}

// Function to switch user role
async function switchRole(newRole) {
    if (!APP_STATE.currentUser) {
        console.error('[switchRole] No current user');
        return;
    }

    console.log('[switchRole] Attempting to switch to role:', newRole);

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('Please login to switch roles', 'error');
            return;
        }

        const response = await fetch('https://api.astegni.com/api/switch-role', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ role: newRole })  // Backend expects "role" not "new_role"
        });

        console.log('[switchRole] Response status:', response.status);

        // Handle expired token
        if (response.status === 401) {
            showToast('Session expired. Please login again.', 'warning');
            // Clear auth and redirect to login
            if (window.AuthManager) {
                window.AuthManager.clearAuth();
            }
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            return;
        }

        if (response.ok) {
            const data = await response.json();
            console.log('[switchRole] Switch successful:', data);

            // CRITICAL: Update tokens with new JWT that has updated role information
            if (data.access_token) {
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('access_token', data.access_token);
                console.log('[switchRole] Updated access token with new role');
            }

            if (data.refresh_token) {
                localStorage.setItem('refresh_token', data.refresh_token);
                console.log('[switchRole] Updated refresh token');
            }

            // Update AuthManager token if available
            if (window.AuthManager) {
                window.AuthManager.token = data.access_token;
            }

            // Update APP_STATE
            APP_STATE.currentUser.active_role = newRole;
            APP_STATE.userRole = newRole;

            // Update localStorage
            localStorage.setItem('userRole', newRole);
            localStorage.setItem('currentUser', JSON.stringify(APP_STATE.currentUser));

            // Show success message
            showToast(`Switched to ${newRole} role`, 'success');

            // Redirect to role-specific profile page
            const profileUrl = PROFILE_URLS[newRole];
            console.log('[switchRole] Redirecting to:', profileUrl);

            if (profileUrl) {
                setTimeout(() => {
                    window.location.href = profileUrl;
                }, 1000);
            } else {
                // Fallback: just reload the page with new role
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        } else {
            const errorData = await response.json();
            console.error('[switchRole] Failed:', errorData);
            showToast(errorData.detail || 'Failed to switch role', 'error');
        }
    } catch (error) {
        console.error('[switchRole] Error:', error);
        showToast('Error switching role', 'error');
    }
}

// FIX 1 & 2: Enhanced UI update with proper profile picture handling
function updateUIForLoggedInUser() {
    if (!APP_STATE.currentUser) {
        console.warn('[updateUIForLoggedInUser] No current user in APP_STATE');
        return;
    }

    console.log('[updateUIForLoggedInUser] Updating UI for user:', {
        name: APP_STATE.currentUser.name,
        role: APP_STATE.currentUser.active_role,
        profile_picture: APP_STATE.currentUser.profile_picture
    });

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

    console.log('[updateUIForLoggedInUser] Profile container found:', !!profileContainer);

    if (profileContainer) {
        profileContainer.classList.remove('hidden');
        profileContainer.style.display = 'flex';
        profileContainer.style.visibility = 'visible';
        console.log('[updateUIForLoggedInUser] Profile container shown');
    }

    if (notificationBell) {
        notificationBell.classList.remove('hidden');
        notificationBell.style.display = 'flex';
    }

    // Update profile name
    const profileName = document.getElementById('profile-name');
    const userName = APP_STATE.currentUser.name ||
        `${APP_STATE.currentUser.first_name} ${APP_STATE.currentUser.father_name}`;

    if (profileName) {
        profileName.textContent = userName;
        console.log('[updateUIForLoggedInUser] Profile name updated:', userName);
    }

    // Update profile picture
    const profilePic = document.getElementById('profile-pic');
    const dropdownProfilePic = document.getElementById('dropdown-profile-pic');
    const defaultAvatar = 'uploads/system_images/system_profile_pictures/man-user.png';
    const profilePicUrl = APP_STATE.currentUser.profile_picture || defaultAvatar;

    console.log('[updateUIForLoggedInUser] Profile picture URL:', profilePicUrl);
    console.log('[updateUIForLoggedInUser] Profile pic element found:', !!profilePic);
    console.log('[updateUIForLoggedInUser] Dropdown pic element found:', !!dropdownProfilePic);

    if (profilePic) {
        profilePic.src = profilePicUrl;
        profilePic.alt = userName || 'User';
        console.log('[updateUIForLoggedInUser] Main profile pic updated');
    }

    if (dropdownProfilePic) {
        dropdownProfilePic.src = profilePicUrl;
        dropdownProfilePic.alt = userName || 'User';
        console.log('[updateUIForLoggedInUser] Dropdown profile pic updated');
    }

    // Update dropdown user info
    const dropdownUserName = document.getElementById('dropdown-user-name');
    const dropdownUserEmail = document.getElementById('dropdown-user-email');
    const dropdownUserRole = document.getElementById('dropdown-user-role');
    const dropdownProfileLink = document.getElementById('dropdown-profile-link');

    if (dropdownUserName) {
        dropdownUserName.textContent = userName;
    }

    if (dropdownUserEmail) {
        // Display email or phone
        const contactInfo = APP_STATE.currentUser.email || APP_STATE.currentUser.phone || '';
        dropdownUserEmail.textContent = contactInfo;
    }

    if (dropdownUserRole) {
        const role = APP_STATE.currentUser.active_role || APP_STATE.userRole || 'user';
        dropdownUserRole.textContent = role.charAt(0).toUpperCase() + role.slice(1);
    }

    // Make profile header clickable - navigate to role profile page
    if (dropdownProfileLink) {
        const role = APP_STATE.currentUser.active_role || APP_STATE.userRole;
        const profileUrl = PROFILE_URLS[role] || 'index.html';
        dropdownProfileLink.href = profileUrl;
        console.log('[updateUIForLoggedInUser] Profile link set to:', profileUrl);
    }

    // Update role switcher if user has multiple roles
    updateRoleSwitcher();

    // Update mobile menu
    addMobileProfileOptions();

}

// Authentication handlers
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("login-email")?.value;
    const password = document.getElementById("login-password")?.value;

    const result = await window.AuthManager.login(email, password);

    if (result.success) {
        // Update APP_STATE
        APP_STATE.isLoggedIn = true;
        APP_STATE.currentUser = result.user;
        APP_STATE.userRole = result.user.role;

        // IMPORTANT: Close modal FIRST before updating UI
        closeModal("login-modal");

        // Then update UI
        updateUIForLoggedInUser();
        updateProfileLink(result.user.role);
        showToast("Welcome back!", "success");

        // Check for intended destination
        const intendedDestination = localStorage.getItem("intendedDestination");
        if (intendedDestination) {
            localStorage.removeItem("intendedDestination");
            setTimeout(() => {
                window.location.href = intendedDestination;
            }, 500);
        } else {
            // Redirect to role-specific profile page after login
            const profileUrl = PROFILE_URLS[result.user.role];
            if (profileUrl) {
                setTimeout(() => {
                    window.location.href = profileUrl;
                }, 1000);
            }
        }
    } else {
        showToast(result.error || "Invalid credentials", "error");
    }
}

// After successful login
function handleLoginSuccess() {
    // Check if there's a redirect URL stored
    const redirectUrl = localStorage.getItem('redirectAfterLogin');
    
    if (redirectUrl) {
        localStorage.removeItem('redirectAfterLogin');
        window.location.href = redirectUrl;
    } else {
        // Default behavior after login
        closeModal('login-modal');
        updateUIAfterLogin();
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


// Store registration data temporarily
let tempRegistrationData = null;

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

    // Validate either phone OR email is provided
    const phone = document.getElementById("register-phone")?.value;
    const email = formData.get("register-email");
    const countryCode = document.getElementById("country-code")?.value;

    if ((!phone || phone.trim() === '') && (!email || email.trim() === '')) {
        showToast('Please provide either a phone number or email address!', 'error');
        return;
    }

    // Store data temporarily
    tempRegistrationData = {
        first_name: formData.get("register-firstname"),
        father_name: formData.get("register-fathername"),
        grandfather_name: formData.get("register-grandfathername"),
        email: email || '',
        phone: phone ? countryCode + phone : '',
        password: password,
        role: document.getElementById("register-as")?.value,
    };

    // Show confirmation modal
    showOTPConfirmation();
}

// Show OTP confirmation modal with user data
function showOTPConfirmation() {
    if (!tempRegistrationData) return;

    // Update modal with user's information
    const phoneDisplay = document.getElementById('confirm-phone-display');
    const emailDisplay = document.getElementById('confirm-email-display');

    if (phoneDisplay) {
        phoneDisplay.textContent = tempRegistrationData.phone;
    }

    if (emailDisplay) {
        emailDisplay.textContent = tempRegistrationData.email || 'Not provided';
    }

    // Close register modal and open confirmation modal
    closeModal('register-modal');
    setTimeout(() => {
        openModal('contact-confirmation-modal');
    }, 300);
}

// Edit registration info - go back to register modal
window.editRegistrationInfo = function() {
    closeModal('contact-confirmation-modal');
    setTimeout(() => {
        openModal('register-modal');
        // Optionally prefill the form with stored data
        if (tempRegistrationData) {
            document.getElementById('register-firstname').value = tempRegistrationData.first_name;
            document.getElementById('register-fathername').value = tempRegistrationData.father_name;
            document.getElementById('register-grandfathername').value = tempRegistrationData.grandfather_name;
            document.getElementById('register-email').value = tempRegistrationData.email;
            // Phone number without country code
            const phoneWithoutCode = tempRegistrationData.phone.replace(/^\+\d+/, '');
            document.getElementById('register-phone').value = phoneWithoutCode;
        }
    }, 300);
};

// Send OTP for registration (Step 1: Request OTP)
window.sendOTP = async function() {
    if (!tempRegistrationData) {
        showToast('Registration data not found', 'error');
        return;
    }

    // Show loading state
    const sendOtpBtn = document.querySelector('#contact-confirmation-modal .submit-btn');
    if (sendOtpBtn) {
        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = 'Sending OTP...';
    }

    try {
        // Step 1: Send registration OTP (does NOT create account yet)
        const response = await fetch('https://api.astegni.com/api/send-registration-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: tempRegistrationData.email,
                phone: tempRegistrationData.phone
            })
        });

        const data = await response.json();

        // Reset button
        if (sendOtpBtn) {
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = 'Send OTP';
        }

        if (response.ok) {
            showToast(data.message || 'OTP sent! Please check your email/phone.', 'success');

            // If OTP is included in response (development mode), show it
            if (data.otp) {
                console.log('Development Mode - OTP:', data.otp);
                showToast(`Development Mode - OTP: ${data.otp}`, 'info');
            }

            // Switch to OTP verification modal
            closeModal('contact-confirmation-modal');
            setTimeout(() => {
                openModal('otp-verification-modal');
            }, 300);
        } else {
            showToast(data.detail || 'Failed to send OTP', 'error');
        }
    } catch (error) {
        console.error('Send OTP error:', error);
        if (sendOtpBtn) {
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = 'Send OTP';
        }
        showToast('Network error. Please try again.', 'error');
    }
};

// Verify OTP and complete registration (Step 2: Verify OTP & Create Account)
window.verifyRegistrationOTP = async function() {
    if (!tempRegistrationData) {
        showToast('Registration data not found. Please start over.', 'error');
        closeModal('otp-verification-modal');
        setTimeout(() => {
            openModal('register-modal');
        }, 300);
        return;
    }

    const otpInput = document.getElementById('registration-otp-input');
    const otp = otpInput?.value?.trim();

    if (!otp || otp.length !== 6) {
        showToast('Please enter the 6-digit OTP', 'warning');
        return;
    }

    // Show loading state
    const verifyBtn = document.querySelector('#otp-verification-modal .submit-btn');
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';
    }

    try {
        // Step 2: Verify OTP and create account
        const response = await fetch('https://api.astegni.com/api/verify-registration-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                otp_code: otp,
                email: tempRegistrationData.email,
                phone: tempRegistrationData.phone,
                first_name: tempRegistrationData.first_name,
                father_name: tempRegistrationData.father_name,
                grandfather_name: tempRegistrationData.grandfather_name,
                password: tempRegistrationData.password,
                role: tempRegistrationData.role
            })
        });

        const data = await response.json();

        // Reset button
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify & Register';
        }

        if (response.ok) {
            // Store tokens
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);

            // Format user data
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
                email_verified: true  // Verified via OTP
            };

            // Update localStorage
            localStorage.setItem('currentUser', JSON.stringify(formattedUser));
            localStorage.setItem('userRole', data.user.active_role);

            // Update APP_STATE
            APP_STATE.isLoggedIn = true;
            APP_STATE.currentUser = formattedUser;
            APP_STATE.userRole = data.user.active_role;

            // Update AuthManager
            if (window.AuthManager) {
                window.AuthManager.token = data.access_token;
                window.AuthManager.user = formattedUser;
            }

            // Clear temp data
            tempRegistrationData = null;

            // Clear OTP input
            if (otpInput) otpInput.value = '';

            // Close modal and update UI
            closeModal('otp-verification-modal');
            updateUIForLoggedInUser();
            updateProfileLink(data.user.active_role);

            showToast('Registration successful! Welcome to Astegni!', 'success');

            // Redirect to profile page after a short delay
            const profileUrl = PROFILE_URLS[data.user.active_role];
            if (profileUrl) {
                setTimeout(() => {
                    window.location.href = profileUrl;
                }, 1500);
            }
        } else {
            showToast(data.detail || 'Invalid OTP. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Verify OTP error:', error);
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify & Register';
        }
        showToast('Network error. Please try again.', 'error');
    }
};

// Resend registration OTP
window.resendRegistrationOTP = async function() {
    if (!tempRegistrationData) {
        showToast('Registration data not found. Please start over.', 'error');
        closeModal('otp-verification-modal');
        setTimeout(() => {
            openModal('register-modal');
        }, 300);
        return;
    }

    try {
        const response = await fetch('https://api.astegni.com/api/send-registration-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: tempRegistrationData.email,
                phone: tempRegistrationData.phone
            })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('New OTP sent!', 'success');

            // If OTP is included in response (development mode), show it
            if (data.otp) {
                console.log('Development Mode - OTP:', data.otp);
                showToast(`Development Mode - OTP: ${data.otp}`, 'info');
            }
        } else {
            showToast(data.detail || 'Failed to resend OTP', 'error');
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        showToast('Network error. Please try again.', 'error');
    }
};

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
        fetch('https://api.astegni.com/api/logout', {
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
    const profileUrl = PROFILE_URLS[role] || "index.html";

    // Update dropdown profile link
    const dropdownProfileLink = document.getElementById('profile-link');
    if (dropdownProfileLink) {
        dropdownProfileLink.href = profileUrl;
    }

    // Update all profile links that contain "My Profile"
    const profileLinks = document.querySelectorAll('a[href*="profile.html"]');
    profileLinks.forEach((link) => {
        if (link.textContent.includes("My Profile")) {
            link.href = profileUrl;
        }
    });

    // Update mobile menu profile link
    const mobileProfileLink = document.querySelector('.mobile-menu a[href*="profile.html"]');
    if (mobileProfileLink) {
        mobileProfileLink.href = profileUrl;
    }
}

// ============================================
//   FORGOT PASSWORD FUNCTIONALITY
// ============================================

// Store email temporarily for password reset flow
let tempResetEmail = null;

function openForgotPasswordModal(event) {
    if (event) event.preventDefault();
    closeModal('login-modal');
    setTimeout(() => {
        openModal('forgot-password-modal');
    }, 300);
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email')?.value;

    if (!email) {
        showToast('Please enter your email address', 'warning');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address', 'warning');
        return;
    }

    // Show loading state
    const submitBtn = e.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending OTP...';

    try {
        const response = await fetch('https://api.astegni.com/api/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email })
        });

        const data = await response.json();

        // Reset button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;

        if (response.ok) {
            // Store email temporarily
            tempResetEmail = email;

            // Show success message
            showToast(data.message || 'OTP sent to your email!', 'success');

            // Update reset modal with email
            const resetEmailDisplay = document.getElementById('reset-email-display');
            if (resetEmailDisplay) {
                // Mask email for privacy
                const maskedEmail = email.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + b.replace(/./g, '*'));
                resetEmailDisplay.textContent = maskedEmail;
            }

            // Clear forgot password form
            document.getElementById('forgot-email').value = '';

            // Switch to reset password modal
            closeModal('forgot-password-modal');
            setTimeout(() => {
                openModal('reset-password-modal');
            }, 300);

            // If OTP is included in response (development mode), log it
            if (data.otp) {
                console.log('Development Mode - OTP:', data.otp);
                showToast(`Development Mode - OTP: ${data.otp}`, 'info');
            }
        } else {
            showToast(data.detail || 'Failed to send OTP', 'error');
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        showToast('Network error. Please try again.', 'error');
    }
}

async function handleResetPassword(e) {
    e.preventDefault();

    const otp = document.getElementById('reset-otp')?.value;
    const newPassword = document.getElementById('reset-new-password')?.value;
    const confirmPassword = document.getElementById('reset-confirm-password')?.value;

    // Validate inputs
    if (!otp || !newPassword || !confirmPassword) {
        showToast('Please fill in all fields', 'warning');
        return;
    }

    // Validate OTP format
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
        showToast('OTP must be 6 digits', 'warning');
        return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    // Check password strength
    const strength = calculatePasswordStrength(newPassword);
    if (strength < 40) {
        showToast('Please choose a stronger password', 'warning');
        return;
    }

    if (!tempResetEmail) {
        showToast('Session expired. Please start over.', 'error');
        closeModal('reset-password-modal');
        setTimeout(() => {
            openModal('forgot-password-modal');
        }, 300);
        return;
    }

    // Show loading state
    const submitBtn = e.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Resetting Password...';

    try {
        const response = await fetch('https://api.astegni.com/api/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: tempResetEmail,
                otp: otp,
                new_password: newPassword
            })
        });

        const data = await response.json();

        // Reset button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;

        if (response.ok) {
            // Clear temp email
            tempResetEmail = null;

            // Store tokens
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('refreshToken', data.refresh_token);

            // Update APP_STATE with user data
            APP_STATE.isLoggedIn = true;
            APP_STATE.currentUser = data.user;
            APP_STATE.userRole = data.user.role;

            // Store in localStorage
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            localStorage.setItem('userRole', data.user.role);

            // Clear form
            document.getElementById('reset-otp').value = '';
            document.getElementById('reset-new-password').value = '';
            document.getElementById('reset-confirm-password').value = '';

            // Close modal
            closeModal('reset-password-modal');

            // Update UI
            updateUIForLoggedInUser();
            updateProfileLink(data.user.role);

            // Show success message
            showToast(data.message || 'Password reset successful! You are now logged in.', 'success');
        } else {
            showToast(data.detail || 'Failed to reset password', 'error');
        }
    } catch (error) {
        console.error('Reset password error:', error);
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        showToast('Network error. Please try again.', 'error');
    }
}

async function resendPasswordResetOTP(event) {
    if (event) event.preventDefault();

    if (!tempResetEmail) {
        showToast('Session expired. Please start over.', 'error');
        closeModal('reset-password-modal');
        setTimeout(() => {
            openModal('forgot-password-modal');
        }, 300);
        return;
    }

    try {
        const response = await fetch('https://api.astegni.com/api/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: tempResetEmail })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('New OTP sent to your email!', 'success');

            // If OTP is included in response (development mode), log it
            if (data.otp) {
                console.log('Development Mode - OTP:', data.otp);
                showToast(`Development Mode - OTP: ${data.otp}`, 'info');
            }
        } else {
            showToast(data.detail || 'Failed to resend OTP', 'error');
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

// Add event listener for password strength on reset password field
document.addEventListener('DOMContentLoaded', () => {
    const resetNewPassword = document.getElementById('reset-new-password');
    const resetConfirmPassword = document.getElementById('reset-confirm-password');

    if (resetNewPassword) {
        resetNewPassword.addEventListener('input', () => {
            const strengthIndicator = document.getElementById('reset-password-strength');
            if (strengthIndicator) {
                calculatePasswordStrengthForElement(resetNewPassword.value, strengthIndicator);
            }
        });
    }

    if (resetConfirmPassword) {
        resetConfirmPassword.addEventListener('input', () => {
            validateResetPasswordMatch();
        });
    }
});

// Helper function for password strength display
function calculatePasswordStrengthForElement(password, strengthIndicator) {
    let strength = 0;

    if (password.length > 7) strength += 20;
    if (password.length > 10) strength += 20;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 10;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 10;

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

    return strength;
}

function validateResetPasswordMatch() {
    const password = document.getElementById('reset-new-password');
    const confirmPassword = document.getElementById('reset-confirm-password');
    const indicator = document.getElementById('reset-password-match-indicator');

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

// Export missing functions
window.openForgotPasswordModal = openForgotPasswordModal;
window.handleForgotPassword = handleForgotPassword;
window.handleResetPassword = handleResetPassword;
window.resendPasswordResetOTP = resendPasswordResetOTP;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.updateUIForLoggedInUser = updateUIForLoggedInUser;
window.updateProfileLink = updateProfileLink;
window.updateRoleSwitcher = updateRoleSwitcher;
window.switchRole = switchRole;
window.logout = logout;

// Add missing function
window.handleComingSoonNotification = function(e) {
    e?.preventDefault();
    const form = e?.target || document.getElementById('coming-soon-form');
    const email = form?.querySelector('input[type="email"]')?.value;

    if (email) {
        showToast('Thank you! We\'ll notify you when this feature is available.', 'success');
        if (window.closeModal) {
            window.closeModal('coming-soon-modal');
        }
    }
    return false;
};
