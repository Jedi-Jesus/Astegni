/**
 * Logout Modal Functions
 * Handles the logout confirmation modal functionality
 */

// Show logout modal with user info
function showLogoutModal() {
    const modal = document.getElementById('logout-modal');
    if (!modal) {
        console.error('[LogoutModal] Logout modal not found in DOM');
        // Fallback: just logout directly if modal doesn't exist
        if (typeof logout === 'function') {
            logout();
        }
        return;
    }

    // Try to populate user info
    populateLogoutUserInfo();

    // Show the modal
    if (typeof openModal === 'function') {
        openModal('logout-modal');
    } else {
        modal.classList.remove('hidden');
        modal.classList.add('active');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// Mask email for privacy (e.g., john.doe@gmail.com -> joh***oe@gmail.com)
function maskEmail(email) {
    if (!email || !email.includes('@')) return email;

    const [localPart, domain] = email.split('@');
    if (localPart.length <= 4) {
        return localPart[0] + '***@' + domain;
    }

    const first3 = localPart.substring(0, 3);
    const last2 = localPart.substring(localPart.length - 2);
    return `${first3}***${last2}@${domain}`;
}

// Mask phone for privacy (e.g., +251912345678 -> +251***5678)
function maskPhone(phone) {
    if (!phone) return phone;

    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.length <= 6) return cleaned;

    const first4 = cleaned.substring(0, 4);
    const last4 = cleaned.substring(cleaned.length - 4);
    return `${first4}***${last4}`;
}

// Get role icon
function getRoleIcon(role) {
    const icons = {
        student: '🎓',
        tutor: '👨‍🏫',
        parent: '👨‍👩‍👧',
        advertiser: '📢',
        institute: '🏢',
        admin: '⚙️',
        user: '👤'
    };
    return icons[role] || '👤';
}

// Populate user info in the logout modal
function populateLogoutUserInfo() {
    const sessionInfo = document.getElementById('logout-session-info');
    const userAvatar = document.getElementById('logout-user-avatar');
    const userName = document.getElementById('logout-user-name');
    const userEmail = document.getElementById('logout-user-email');
    const userRoles = document.getElementById('logout-user-roles');

    if (!sessionInfo) return;

    // Try to get user data from various sources
    let user = null;

    // Check AuthManager (window.AuthManager)
    if (typeof window.AuthManager !== 'undefined' && window.AuthManager.getUser) {
        user = window.AuthManager.getUser();
    }
    // Check APP_STATE
    else if (typeof APP_STATE !== 'undefined' && APP_STATE.currentUser) {
        user = APP_STATE.currentUser;
    }
    // Check localStorage currentUser
    else {
        try {
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                user = JSON.parse(storedUser);
            }
        } catch (e) {
            console.warn('[LogoutModal] Could not parse stored user data');
        }
    }

    if (user) {
        sessionInfo.style.display = 'block';

        // Set user name
        const fullName = [user.first_name, user.father_name, user.grandfather_name]
            .filter(Boolean)
            .join(' ') || user.name || user.username || 'User';

        if (userName) {
            userName.textContent = fullName;
        }

        // Set masked email/phone
        if (userEmail) {
            if (user.email) {
                userEmail.textContent = maskEmail(user.email);
            } else if (user.phone) {
                userEmail.textContent = maskPhone(user.phone);
            } else {
                userEmail.textContent = '';
            }
        }

        // Set user roles
        if (userRoles) {
            const roles = user.roles || (user.role ? [user.role] : []);
            const activeRole = user.active_role || user.role;

            if (roles.length > 0) {
                userRoles.innerHTML = roles.map(role => {
                    const isActive = role === activeRole;
                    const icon = getRoleIcon(role);
                    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
                    return `<span style="
                        display: inline-flex;
                        align-items: center;
                        gap: 4px;
                        padding: 3px 8px;
                        background: ${isActive ? 'rgba(99, 102, 241, 0.15)' : 'rgba(0, 0, 0, 0.05)'};
                        border: 1px solid ${isActive ? 'rgba(99, 102, 241, 0.3)' : 'transparent'};
                        border-radius: 12px;
                        font-size: 11px;
                        color: ${isActive ? 'var(--accent-color)' : 'var(--text-muted)'};
                        font-weight: ${isActive ? '600' : '500'};
                    ">${icon} ${roleLabel}${isActive ? ' ✓' : ''}</span>`;
                }).join('');
            } else {
                userRoles.innerHTML = '';
            }
        }

        // Set avatar
        if (userAvatar) {
            if (user.profile_picture) {
                userAvatar.innerHTML = `<img src="${user.profile_picture}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                // Show initials
                const initials = fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                userAvatar.textContent = initials || 'U';
            }
        }
    } else {
        sessionInfo.style.display = 'none';
    }
}

// Confirm logout action
function confirmLogout() {
    const logoutAllDevices = document.getElementById('logout-all-devices');
    const logoutAll = logoutAllDevices ? logoutAllDevices.checked : false;

    // Show loading state
    const logoutBtn = document.querySelector('#logout-modal .submit-btn[onclick="confirmLogout()"]');
    if (logoutBtn) {
        logoutBtn.disabled = true;
        logoutBtn.innerHTML = `
            <svg class="animate-spin" style="width: 18px; height: 18px; margin-right: 6px;" fill="none" viewBox="0 0 24 24">
                <circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Logging out...
        `;
    }

    // Perform logout
    performLogout(logoutAll);
}

// Perform the actual logout
async function performLogout(logoutAll = false) {
    try {
        // Try to call logout API if available
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const API_BASE_URL = window.API_BASE_URL || 'https://api.astegni.com';
                await fetch(`${API_BASE_URL}/api/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ logout_all_devices: logoutAll })
                });
            } catch (apiError) {
                console.warn('[LogoutModal] Logout API call failed:', apiError);
                // Continue with local logout even if API fails
            }
        }

        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentRole');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userRoles');

        // Clear session storage
        sessionStorage.clear();

        // Clear AuthManager state if available
        if (typeof window.AuthManager !== 'undefined') {
            if (window.AuthManager.logout) {
                window.AuthManager.logout();
            } else if (window.AuthManager.clearAuth) {
                window.AuthManager.clearAuth();
            }
        }

        // Update APP_STATE if available
        if (typeof APP_STATE !== 'undefined') {
            APP_STATE.isLoggedIn = false;
            APP_STATE.currentUser = null;
            APP_STATE.userRole = null;
        }

        // Close the modal
        if (typeof closeModal === 'function') {
            closeModal('logout-modal');
        }

        // Show success message if notification function exists
        if (typeof showToast === 'function') {
            showToast('You have been logged out successfully', 'success');
        } else if (typeof showNotification === 'function') {
            showNotification('You have been logged out successfully', 'success');
        }

        // Redirect to home page after a short delay
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 500);

    } catch (error) {
        console.error('[LogoutModal] Logout error:', error);

        // Reset button state
        const logoutBtn = document.querySelector('#logout-modal .submit-btn[onclick="confirmLogout()"]');
        if (logoutBtn) {
            logoutBtn.disabled = false;
            logoutBtn.innerHTML = `
                <svg style="width: 18px; height: 18px; margin-right: 6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7"></path>
                </svg>
                Log Out
            `;
        }

        // Show error
        if (typeof showToast === 'function') {
            showToast('Failed to log out. Please try again.', 'error');
        } else if (typeof showNotification === 'function') {
            showNotification('Failed to log out. Please try again.', 'error');
        } else {
            alert('Failed to log out. Please try again.');
        }
    }
}

// Make functions globally available
window.showLogoutModal = showLogoutModal;
window.confirmLogout = confirmLogout;
window.performLogout = performLogout;
window.populateLogoutUserInfo = populateLogoutUserInfo;

console.log('[LogoutModal] Logout modal functions loaded');
