// ============================================
//   PROFILE AND AUTHENTICATION MANAGEMENT
// ============================================

// Helper function to update role switcher display (desktop and mobile)
function updateRoleSwitcher() {
    if (!APP_STATE.currentUser || !APP_STATE.currentUser.roles) {
        console.log('[updateRoleSwitcher] No user or roles available');
        return;
    }

    // Desktop role switcher
    const roleSwitcherSection = document.getElementById('role-switcher-section');
    const roleOptions = document.getElementById('role-options');

    // Mobile role switcher
    const mobileRoleSwitcherSection = document.getElementById('mobile-role-switcher-section');
    const mobileRoleOptions = document.getElementById('mobile-role-options');

    console.log('[updateRoleSwitcher] Mobile elements found:', {
        section: !!mobileRoleSwitcherSection,
        options: !!mobileRoleOptions
    });

    // Filter out admin roles - admins should only access through admin-index.html
    const userFacingRoles = APP_STATE.currentUser.roles.filter(role => role !== 'admin');

    console.log('[updateRoleSwitcher] User roles:', APP_STATE.currentUser.roles);
    console.log('[updateRoleSwitcher] User-facing roles:', userFacingRoles);

    // Only show if user has multiple roles
    if (userFacingRoles.length > 1) {
        // Update desktop role switcher
        if (roleSwitcherSection && roleOptions) {
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
        }

        // Update mobile role switcher
        if (mobileRoleSwitcherSection && mobileRoleOptions) {
            mobileRoleSwitcherSection.classList.remove('hidden');

            // Clear existing options
            mobileRoleOptions.innerHTML = '';

            // Add role options for mobile
            userFacingRoles.forEach(role => {
                const isActive = role === APP_STATE.currentUser.active_role;
                const roleOption = document.createElement('button');
                roleOption.className = `mobile-role-option ${isActive ? 'active' : ''}`;
                roleOption.innerHTML = `
                    <span class="role-icon">${getRoleIcon(role)}</span>
                    <span class="role-name">${role.charAt(0).toUpperCase() + role.slice(1)}</span>
                    ${isActive ? '<span class="active-badge">Active</span>' : ''}
                `;

                if (!isActive) {
                    roleOption.onclick = () => switchRole(role);
                }

                mobileRoleOptions.appendChild(roleOption);
            });
        }
    } else {
        // Hide both role switchers if user has only one role
        if (roleSwitcherSection) {
            roleSwitcherSection.classList.add('hidden');
        }
        if (mobileRoleSwitcherSection) {
            mobileRoleSwitcherSection.classList.add('hidden');
        }
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
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            showToast('Please login to switch roles', 'error');
            return;
        }

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/switch-role`, {
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
            // Only store userRole if it has a valid value (prevent storing "undefined" string)
            if (newRole && newRole !== 'undefined') {
                localStorage.setItem('userRole', newRole);
            }
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
        const role = APP_STATE.currentUser.active_role || APP_STATE.userRole;

        // Handle case where user has no active role
        if (!role || role === 'null' || role === 'undefined') {
            dropdownUserRole.textContent = 'No role selected';
        } else {
            dropdownUserRole.textContent = role.charAt(0).toUpperCase() + role.slice(1);
        }
    }

    // Make profile header clickable - navigate to role profile page
    if (dropdownProfileLink) {
        const role = APP_STATE.currentUser.active_role || APP_STATE.userRole;

        // Handle case where user has no active role
        if (!role || role === 'null' || role === 'undefined') {
            dropdownProfileLink.href = '#';
            dropdownProfileLink.onclick = (e) => {
                e.preventDefault();
                // Open "Add Role" modal
                if (window.openAddRoleModal && typeof window.openAddRoleModal === 'function') {
                    window.openAddRoleModal();
                } else {
                    console.warn('[updateUIForLoggedInUser] openAddRoleModal function not found');
                }
            };
            console.log('[updateUIForLoggedInUser] No active role - profile link opens Add Role modal');
        } else {
            const profileUrl = PROFILE_URLS[role] || 'index.html';
            dropdownProfileLink.href = profileUrl;
            dropdownProfileLink.onclick = null; // Remove onclick if there was one
            console.log('[updateUIForLoggedInUser] Profile link set to:', profileUrl);
        }
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

        // Check if account is scheduled for deletion
        // If so, show restoration modal instead of redirecting
        if (window.AccountRestorationModal) {
            console.log('[Login] Checking for scheduled account deletion...');
            await window.AccountRestorationModal.checkAndShowModal();

            // Wait a moment to see if modal appears
            setTimeout(() => {
                const restorationModal = document.getElementById('account-restoration-modal');
                const isModalShowing = restorationModal && !restorationModal.classList.contains('hidden');

                if (!isModalShowing) {
                    // No deletion scheduled, proceed with normal redirect
                    proceedWithRedirect();
                }
            }, 500);
        } else {
            // AccountRestorationModal not loaded, proceed with redirect
            proceedWithRedirect();
        }

        function proceedWithRedirect() {
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
        }
    } else if (result.error) {
        // Check if error is account pending deletion (403 status)
        if (result.error.includes('ACCOUNT_PENDING_DELETION') || result.deletionInfo) {
            console.log('[Login] Account has pending deletion - showing confirmation modal');

            // Show restoration confirmation modal BEFORE logging in
            if (window.showRestorationConfirmModal) {
                window.showRestorationConfirmModal(email, password, result.deletionInfo);
            } else {
                // Fallback if modal not loaded
                showToast('Your account is scheduled for deletion. Please contact support.', 'error');
            }
        } else {
            // Normal login error
            showToast(result.error || "Invalid credentials", "error");
        }
    } else {
        showToast("Invalid credentials", "error");
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

    // Validate email is provided
    const email = formData.get("register-email");

    if (!email || email.trim() === '') {
        showToast('Please provide an email address!', 'error');
        return;
    }

    // Store data temporarily (no role - user will add roles later)
    tempRegistrationData = {
        email: email,
        phone: '',
        password: password,
    };

    // Show confirmation modal
    showOTPConfirmation();
}

// Show OTP confirmation modal with user data
function showOTPConfirmation() {
    if (!tempRegistrationData) return;

    // Update modal with user's information
    const emailDisplay = document.getElementById('confirm-email-display');

    if (emailDisplay) {
        emailDisplay.textContent = tempRegistrationData.email;
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
            document.getElementById('register-email').value = tempRegistrationData.email;
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
        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/send-registration-otp`, {
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

            // If OTP is included in response (development mode), log it to console
            if (data.otp) {
                console.log('Development Mode - OTP:', data.otp);
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
        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/verify-registration-otp`, {
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
            // Only store userRole if it has a valid value (prevent storing "undefined" string)
            if (data.user.active_role && data.user.active_role !== 'undefined') {
                localStorage.setItem('userRole', data.user.active_role);
            }

            // Update APP_STATE
            APP_STATE.isLoggedIn = true;
            APP_STATE.currentUser = formattedUser;
            APP_STATE.userRole = data.user.active_role || null;

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
        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/send-registration-otp`, {
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

            // If OTP is included in response (development mode), log it to console
            if (data.otp) {
                console.log('Development Mode - OTP:', data.otp);
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
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (token) {
        fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/logout`, {
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
        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/forgot-password`, {
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

            // If OTP is included in response (development mode), log it to console
            if (data.otp) {
                console.log('Development Mode - OTP:', data.otp);
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
        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/reset-password`, {
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
            APP_STATE.userRole = data.user.role || null;

            // Store in localStorage
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            // Only store userRole if it has a valid value (prevent storing "undefined" string)
            if (data.user.role && data.user.role !== 'undefined') {
                localStorage.setItem('userRole', data.user.role);
            }

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
        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: tempResetEmail })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('New OTP sent to your email!', 'success');

            // If OTP is included in response (development mode), log it to console
            if (data.otp) {
                console.log('Development Mode - OTP:', data.otp);
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
    // Support both old and new element IDs
    const menuBtn = document.getElementById('mobileMenuBtn') || document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobileMenu') || document.getElementById('mobile-menu');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

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
                    mobileMenuOverlay?.classList.add('hidden');
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

// socialLogin function is now defined in js/root/google-oauth.js
// DO NOT redefine it here - it will override the Google OAuth implementation

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

// ============================================
//   PARENT INVITATION FROM URL HANDLER
// ============================================

/**
 * Handle parent invitation registration from URL parameters.
 * When a new parent clicks the invitation link in their email,
 * the URL will contain: ?action=parent-register&token=xxx
 *
 * This function:
 * 1. Checks for the action=parent-register URL parameter
 * 2. Extracts the invitation token
 * 3. Fetches invitation details from the backend
 * 4. Opens a special parent registration modal with prefilled data
 */
async function handleParentInvitationFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const token = urlParams.get('token');

    // Only process parent registration invitations
    if (action !== 'parent-register' || !token) {
        return;
    }

    console.log('[Parent Invitation] Processing invitation with token:', token.substring(0, 10) + '...');

    try {
        // Fetch invitation details from backend
        const response = await fetch(`${API_BASE_URL}/api/parent/invitation/${token}`);

        if (!response.ok) {
            if (response.status === 404) {
                showToast('Invitation not found or has expired', 'error');
            } else if (response.status === 400) {
                showToast('This invitation has already been accepted', 'warning');
            } else {
                showToast('Error loading invitation. Please try again.', 'error');
            }
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        const invitation = await response.json();
        console.log('[Parent Invitation] Invitation details:', invitation);

        // Store invitation data for the registration form
        window.parentInvitationData = {
            token: token,
            email: invitation.email,
            phone: invitation.phone,
            first_name: invitation.first_name,
            father_name: invitation.father_name,
            grandfather_name: invitation.grandfather_name,
            gender: invitation.gender,
            relationship_type: invitation.relationship_type,
            student_name: invitation.student_name
        };

        // Open the parent registration modal
        openParentInvitationModal(invitation);

    } catch (error) {
        console.error('[Parent Invitation] Error:', error);
        showToast('Network error. Please check your connection.', 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

/**
 * Open a special registration modal for invited parents
 * Pre-fills their data from the invitation and asks only for password + OTP
 */
function openParentInvitationModal(invitation) {
    // Check if parent-invitation-modal exists, otherwise create it
    let modal = document.getElementById('parent-invitation-modal');

    if (!modal) {
        modal = createParentInvitationModal();
        document.body.appendChild(modal);
    }

    // Fill in the invitation details
    const studentNameEl = modal.querySelector('#invitation-student-name');
    const parentNameEl = modal.querySelector('#invitation-parent-name');
    const relationshipEl = modal.querySelector('#invitation-relationship');
    const emailEl = modal.querySelector('#invitation-email');

    if (studentNameEl) studentNameEl.textContent = invitation.student_name || 'Your child';
    if (parentNameEl) parentNameEl.textContent = `${invitation.first_name} ${invitation.father_name}` || 'Parent';
    if (relationshipEl) relationshipEl.textContent = invitation.relationship_type || 'Parent';
    if (emailEl) emailEl.textContent = invitation.email || invitation.phone || '';

    // Open the modal
    openModal('parent-invitation-modal');
}

/**
 * Create the parent invitation modal dynamically
 */
function createParentInvitationModal() {
    const modal = document.createElement('div');
    modal.id = 'parent-invitation-modal';
    modal.className = 'modal fixed inset-0 z-50 flex items-center justify-center hidden';
    modal.innerHTML = `
        <div class="modal-overlay fixed inset-0 bg-black/50 backdrop-blur-sm" onclick="closeModal('parent-invitation-modal')"></div>
        <div class="modal-content relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-modal-in">
            <!-- Header -->
            <div class="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-5 text-white">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                    </div>
                    <div>
                        <h2 class="text-xl font-bold">Welcome to Astegni!</h2>
                        <p class="text-purple-100 text-sm">Complete your parent registration</p>
                    </div>
                </div>
            </div>

            <!-- Body -->
            <div class="p-6">
                <!-- Invitation Info -->
                <div class="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 mb-5 border border-purple-200 dark:border-purple-700/50">
                    <p class="text-sm text-purple-700 dark:text-purple-300 mb-2">
                        <span id="invitation-student-name" class="font-semibold">Your child</span> has invited you as their <span id="invitation-relationship" class="font-semibold">parent</span>
                    </p>
                    <p class="text-xs text-purple-600 dark:text-purple-400">
                        Hello, <span id="invitation-parent-name" class="font-medium">Parent</span> (<span id="invitation-email" class="font-medium">email</span>)
                    </p>
                </div>

                <!-- Registration Form -->
                <form id="parent-invitation-form" onsubmit="handleParentInvitationSubmit(event)">
                    <!-- OTP Input -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Enter the 6-digit OTP from your email
                        </label>
                        <input type="text" id="parent-invitation-otp" required
                               maxlength="6" pattern="[0-9]{6}"
                               placeholder="Enter 6-digit OTP"
                               class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-purple-500 focus:outline-none transition-all text-center text-2xl font-mono tracking-widest">
                    </div>

                    <!-- Password -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Create your password
                        </label>
                        <input type="password" id="parent-invitation-password" required
                               minlength="6"
                               placeholder="Create a password (min 6 characters)"
                               class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-purple-500 focus:outline-none transition-all">
                        <div id="parent-password-strength" class="mt-1"></div>
                    </div>

                    <!-- Confirm Password -->
                    <div class="mb-5">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Confirm your password
                        </label>
                        <input type="password" id="parent-invitation-confirm-password" required
                               minlength="6"
                               placeholder="Confirm your password"
                               class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:border-purple-500 focus:outline-none transition-all">
                        <div id="parent-password-match" class="mt-1 text-sm"></div>
                    </div>

                    <!-- Submit -->
                    <button type="submit" id="parent-invitation-submit"
                            class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg flex items-center justify-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Complete Registration
                    </button>
                </form>
            </div>

            <!-- Close Button -->
            <button onclick="closeModal('parent-invitation-modal')" class="absolute top-4 right-4 text-white/80 hover:text-white transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
    `;

    // Add password validation listeners
    setTimeout(() => {
        const password = document.getElementById('parent-invitation-password');
        const confirmPassword = document.getElementById('parent-invitation-confirm-password');
        const strengthEl = document.getElementById('parent-password-strength');
        const matchEl = document.getElementById('parent-password-match');

        if (password) {
            password.addEventListener('input', () => {
                if (strengthEl && typeof calculatePasswordStrengthForElement === 'function') {
                    calculatePasswordStrengthForElement(password.value, strengthEl);
                }
                validateParentPasswordMatch();
            });
        }

        if (confirmPassword) {
            confirmPassword.addEventListener('input', validateParentPasswordMatch);
        }
    }, 100);

    return modal;
}

function validateParentPasswordMatch() {
    const password = document.getElementById('parent-invitation-password');
    const confirmPassword = document.getElementById('parent-invitation-confirm-password');
    const matchEl = document.getElementById('parent-password-match');

    if (!password || !confirmPassword || !matchEl) return;

    if (confirmPassword.value === '') {
        matchEl.textContent = '';
        matchEl.className = 'mt-1 text-sm';
        return;
    }

    if (password.value === confirmPassword.value) {
        matchEl.textContent = '✓ Passwords match';
        matchEl.className = 'mt-1 text-sm text-green-500';
    } else {
        matchEl.textContent = '✗ Passwords do not match';
        matchEl.className = 'mt-1 text-sm text-red-500';
    }
}

/**
 * Handle parent invitation form submission
 * Calls the OTP login endpoint to create the user and accept the invitation
 */
async function handleParentInvitationSubmit(event) {
    event.preventDefault();

    const otp = document.getElementById('parent-invitation-otp')?.value;
    const password = document.getElementById('parent-invitation-password')?.value;
    const confirmPassword = document.getElementById('parent-invitation-confirm-password')?.value;
    const submitBtn = document.getElementById('parent-invitation-submit');

    // Validation
    if (!otp || otp.length !== 6) {
        showToast('Please enter the 6-digit OTP from your email', 'error');
        return;
    }

    if (!password || password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    if (!window.parentInvitationData) {
        showToast('Invitation data not found. Please use the link from your email.', 'error');
        return;
    }

    // Show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating your account...
        `;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/parent/otp-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: window.parentInvitationData.email,
                phone: window.parentInvitationData.phone,
                otp_code: otp,
                new_password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Registration failed');
        }

        // Success! Store tokens and user data
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('refreshToken', data.refresh_token);
        localStorage.setItem('userRole', 'parent');

        // Fetch user data
        const userResponse = await fetch(`${API_BASE_URL}/api/me`, {
            headers: {
                'Authorization': `Bearer ${data.access_token}`
            }
        });

        if (userResponse.ok) {
            const userData = await userResponse.json();
            localStorage.setItem('currentUser', JSON.stringify(userData));
            APP_STATE.currentUser = userData;
        }

        APP_STATE.isLoggedIn = true;
        APP_STATE.userRole = 'parent';

        // Close modal and clear URL
        closeModal('parent-invitation-modal');
        window.history.replaceState({}, document.title, window.location.pathname);

        // Show success message
        showToast('🎉 Welcome to Astegni! Your account has been created.', 'success');

        // Redirect to parent profile after a delay
        setTimeout(() => {
            window.location.href = 'profile-pages/parent-profile.html';
        }, 1500);

    } catch (error) {
        console.error('[Parent Registration] Error:', error);
        showToast(error.message || 'Registration failed. Please try again.', 'error');

        // Reset button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Complete Registration
            `;
        }
    }
}

// Export functions
window.handleParentInvitationFromURL = handleParentInvitationFromURL;
window.handleParentInvitationSubmit = handleParentInvitationSubmit;
