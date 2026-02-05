/**
 * Role Manager
 * Handles role deactivation and removal with OTP verification
 */

const RoleManager = {
    currentRole: null,
    currentAction: null,
    otpTimers: {}, // Track OTP timers for deactivate and remove

    /**
     * Initialize the role manager
     */
    init: async function() {
        console.log('Initializing Role Manager...');

        // Get current role from localStorage user object
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                if (user.current_role) {
                    this.currentRole = user.current_role;
                }
            }
        } catch (e) {
            console.error('Error parsing user from localStorage:', e);
        }

        // Also try window.user as fallback
        if (!this.currentRole && window.user && window.user.current_role) {
            this.currentRole = window.user.current_role;
        }

        // Show loading
        document.getElementById('manage-role-loading').classList.remove('hidden');
        document.getElementById('manage-role-options').classList.add('hidden');

        try {
            // Fetch user's roles from API to confirm
            const response = await fetch(`${API_BASE_URL}/api/my-roles`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[RoleManager] API response:', data);
                // Store all user roles
                this.userRoles = data.user_roles || [];
                // API returns 'active_role' not 'current_role'
                this.currentRole = data.active_role || data.current_role;
                console.log('[RoleManager] Set currentRole from API:', this.currentRole);
                console.log('[RoleManager] User has roles:', this.userRoles);
            } else {
                console.error('[RoleManager] API error:', response.status);
            }
        } catch (error) {
            console.error('Error fetching role data:', error);
        }

        // Update display AFTER API call completes (or after using cached role)
        console.log('[RoleManager] About to call updateRoleDisplay, currentRole is:', this.currentRole);

        // Check if we successfully got a role
        if (!this.currentRole) {
            console.error('[RoleManager] Unable to determine current role');
            document.getElementById('manage-role-loading').innerHTML = `
                <div class="text-center py-8">
                    <svg class="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">Unable to Load Role</h3>
                    <p class="text-gray-600 mb-4">We couldn't determine your current role. This may happen if you don't have an active role selected.</p>
                    <button onclick="location.reload()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Refresh Page
                    </button>
                </div>
            `;
            document.getElementById('manage-role-loading').classList.remove('hidden');
            return;
        }

        this.updateRoleDisplay();

        // Hide loading
        document.getElementById('manage-role-loading').classList.add('hidden');
        document.getElementById('manage-role-options').classList.remove('hidden');

        // Add checkbox listener (remove old listener first to avoid duplicates)
        const checkbox = document.getElementById('remove-confirmation-checkbox');
        if (checkbox) {
            // Remove old listener if exists
            checkbox.removeEventListener('change', this.checkboxChangeHandler);

            // Create handler function
            this.checkboxChangeHandler = () => {
                const removeBtn = document.getElementById('remove-btn');
                if (removeBtn) {
                    removeBtn.disabled = !checkbox.checked;
                }
            };

            // Add new listener
            checkbox.addEventListener('change', this.checkboxChangeHandler);
        }
    },

    /**
     * Update role display in the modal
     */
    updateRoleDisplay: function() {
        console.log('[RoleManager] updateRoleDisplay called');
        console.log('[RoleManager] currentRole:', this.currentRole);

        const roleName = document.getElementById('current-role-name');
        const roleDescription = document.getElementById('current-role-description');

        console.log('[RoleManager] roleName element:', roleName);
        console.log('[RoleManager] roleDescription element:', roleDescription);

        const roleDescriptions = {
            'tutor': 'Teach students and manage your tutoring business',
            'student': 'Learn from tutors and access educational content',
            'parent': 'Manage your children\'s education and monitor progress',
            'advertiser': 'Promote your brand and reach the Astegni community',
            'user': 'Access the Astegni platform as a general user'
        };

        if (roleName) {
            roleName.textContent = this.currentRole;
            console.log('[RoleManager] Set roleName.textContent to:', this.currentRole);
        } else {
            console.error('[RoleManager] roleName element not found!');
        }

        if (roleDescription) {
            roleDescription.textContent = roleDescriptions[this.currentRole] || 'Manage your role';
            console.log('[RoleManager] Set roleDescription.textContent to:', roleDescriptions[this.currentRole]);
        } else {
            console.error('[RoleManager] roleDescription element not found!');
        }
    },

    /**
     * Open an action panel (deactivate or remove)
     */
    openActionPanel: function(action) {
        this.currentAction = action;
        const panel = document.getElementById(`manage-role-panel-${action}`);

        if (panel) {
            // Update role name in panel
            const roleNameEl = document.getElementById(`${action}-role-name`);
            if (roleNameEl) {
                roleNameEl.textContent = this.currentRole;
            }

            // For remove panel, ensure button state matches checkbox
            if (action === 'remove') {
                const checkbox = document.getElementById('remove-confirmation-checkbox');
                const removeBtn = document.getElementById('remove-btn');
                const password = document.getElementById('remove-password');
                const otp = document.getElementById('remove-otp');

                // Clear previous values
                if (password) password.value = '';
                if (otp) otp.value = '';
                if (checkbox) checkbox.checked = false;

                if (checkbox && removeBtn) {
                    removeBtn.disabled = !checkbox.checked;
                }
            }

            // Show panel
            panel.classList.add('active');
        }
    },

    /**
     * Close the current action panel
     */
    closeActionPanel: function() {
        const panels = document.querySelectorAll('.manage-role-sliding-panel');
        panels.forEach(panel => panel.classList.remove('active'));

        // Clear password fields
        document.getElementById('deactivate-password').value = '';
        document.getElementById('remove-password').value = '';

        // Clear error messages
        document.getElementById('deactivate-error').classList.add('hidden');
        document.getElementById('remove-error').classList.add('hidden');

        // Reset checkbox
        const checkbox = document.getElementById('remove-confirmation-checkbox');
        if (checkbox) {
            checkbox.checked = false;
            document.getElementById('remove-btn').disabled = true;
        }

        this.currentAction = null;
    },

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility: function(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.type = field.type === 'password' ? 'text' : 'password';
        }
    },

    /**
     * Send OTP for role deactivation or removal
     */
    sendOTP: async function(action) {
        const purpose = action === 'deactivate' ? 'role_deactivate' : 'role_remove';
        const sendBtn = document.getElementById(`${action}-send-otp`);
        const timerEl = document.getElementById(`${action}-otp-timer`);
        const errorEl = document.getElementById(`${action}-error`);

        // Clear previous errors
        errorEl.classList.add('hidden');

        try {
            // Disable send button
            sendBtn.disabled = true;
            sendBtn.textContent = 'Sending...';

            const response = await fetch(`${API_BASE_URL}/api/send-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ purpose })
            });

            const data = await response.json();

            if (response.ok) {
                // Show success message
                if (window.showToast) {
                    window.showToast(`OTP sent to your ${data.destination}`, 'success');
                }

                // Update button to green "OTP Sent" state
                sendBtn.textContent = 'OTP Sent';
                sendBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
                sendBtn.classList.add('bg-green-600', 'hover:bg-green-700');

                // Start countdown timer (60 seconds)
                let seconds = 60;
                timerEl.classList.remove('hidden');
                timerEl.textContent = `(${seconds}s)`;

                // Clear existing timer if any
                if (this.otpTimers[action]) {
                    clearInterval(this.otpTimers[action]);
                }

                this.otpTimers[action] = setInterval(() => {
                    seconds--;
                    timerEl.textContent = `(${seconds}s)`;

                    if (seconds <= 0) {
                        clearInterval(this.otpTimers[action]);
                        timerEl.classList.add('hidden');
                        sendBtn.disabled = false;
                        sendBtn.textContent = 'Resend OTP';
                        // Change back to red for resend
                        sendBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                        sendBtn.classList.add('bg-red-600', 'hover:bg-red-700');
                    }
                }, 1000);

            } else {
                errorEl.textContent = data.detail || 'Failed to send OTP';
                errorEl.classList.remove('hidden');
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send OTP';
            }
        } catch (error) {
            console.error('Error sending OTP:', error);
            errorEl.textContent = 'An error occurred. Please try again.';
            errorEl.classList.remove('hidden');
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send OTP';
        }
    },

    /**
     * Confirm role deactivation
     */
    confirmDeactivate: async function() {
        const password = document.getElementById('deactivate-password').value;
        const errorEl = document.getElementById('deactivate-error');
        const btn = document.getElementById('deactivate-btn');
        const btnText = document.getElementById('deactivate-btn-text');

        // Clear previous errors
        errorEl.classList.add('hidden');

        // Validate role is set
        if (!this.currentRole) {
            errorEl.textContent = 'Unable to determine current role. Please refresh the page and try again.';
            errorEl.classList.remove('hidden');
            console.error('[RoleManager] currentRole is not set:', this.currentRole);
            return;
        }

        // Validate password
        if (!password) {
            errorEl.textContent = 'Please enter your password';
            errorEl.classList.remove('hidden');
            return;
        }

        // Show loading
        btn.disabled = true;
        btnText.textContent = 'Deactivating...';

        try {
            const response = await fetch(`${API_BASE_URL}/api/role/deactivate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    role: this.currentRole,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Success - update localStorage and redirect to index.html
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

                // Clear current role in localStorage
                localStorage.removeItem('userRole');
                user.current_role = null;
                user.active_role = null;
                currentUser.role = null;
                currentUser.active_role = null;
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('currentUser', JSON.stringify(currentUser));

                // CRITICAL: Update dropdown elements immediately BEFORE redirect
                const dropdownProfileLink = document.getElementById('dropdown-profile-link');
                const dropdownUserRole = document.getElementById('dropdown-user-role');

                if (dropdownProfileLink) {
                    dropdownProfileLink.href = '#';
                    dropdownProfileLink.onclick = (e) => {
                        e.preventDefault();
                        if (window.openAddRoleModal) {
                            window.openAddRoleModal();
                        }
                    };
                }

                if (dropdownUserRole) {
                    dropdownUserRole.textContent = 'No role selected';
                }

                // Update profile dropdown to reflect no active role
                if (typeof window.updateProfileDropdown === 'function') {
                    await window.updateProfileDropdown();
                }

                // Show success message
                alert(`Your ${this.currentRole} role has been deactivated successfully. You can reactivate it anytime by adding your role again.`);

                // Always redirect to index.html
                window.location.href = '/index.html';
            } else {
                // Show error
                errorEl.textContent = data.detail || 'Deactivation failed. Please check your password.';
                errorEl.classList.remove('hidden');
                btn.disabled = false;
                btnText.textContent = 'Deactivate Role';
            }
        } catch (error) {
            console.error('Error deactivating role:', error);
            errorEl.textContent = 'An error occurred. Please try again.';
            errorEl.classList.remove('hidden');
            btn.disabled = false;
            btnText.textContent = 'Deactivate Role';
        }
    },

    /**
     * Show final confirmation panel (after password + OTP entered)
     */
    showFinalConfirmation: function() {
        const password = document.getElementById('remove-password').value;
        const otp = document.getElementById('remove-otp').value;
        const checkbox = document.getElementById('remove-confirmation-checkbox');
        const errorEl = document.getElementById('remove-error');

        // Clear previous errors
        errorEl.classList.add('hidden');

        // Validate role is set
        if (!this.currentRole) {
            errorEl.textContent = 'Unable to determine current role. Please refresh the page and try again.';
            errorEl.classList.remove('hidden');
            console.error('[RoleManager] currentRole is not set:', this.currentRole);
            return;
        }

        // Validate checkbox
        if (!checkbox.checked) {
            errorEl.textContent = 'Please confirm that you understand this action is permanent';
            errorEl.classList.remove('hidden');
            return;
        }

        // Validate password
        if (!password) {
            errorEl.textContent = 'Please enter your password';
            errorEl.classList.remove('hidden');
            return;
        }

        // Validate OTP
        if (!otp || otp.length !== 6) {
            errorEl.textContent = 'Please enter a valid 6-digit OTP';
            errorEl.classList.remove('hidden');
            return;
        }

        // All validations passed - show final confirmation panel
        const removePanel = document.getElementById('manage-role-panel-remove');
        const finalPanel = document.getElementById('final-confirmation-panel');
        const finalRoleName = document.getElementById('final-role-name');

        // Update role name in final panel
        if (finalRoleName) {
            finalRoleName.textContent = this.currentRole;
        }

        // Slide out remove panel, slide in final confirmation
        if (removePanel && finalPanel) {
            removePanel.classList.remove('active');
            finalPanel.classList.remove('translate-x-full');
        } else {
            console.error('[RoleManager] Panels not found:', { removePanel, finalPanel });
        }
    },

    /**
     * Go back to remove panel from final confirmation
     */
    backToRemovePanel: function() {
        const removePanel = document.getElementById('manage-role-panel-remove');
        const finalPanel = document.getElementById('final-confirmation-panel');

        if (removePanel && finalPanel) {
            finalPanel.classList.add('translate-x-full');
            removePanel.classList.add('active');
        }
    },

    /**
     * Execute role removal (called from final confirmation panel)
     */
    executeRemove: async function() {
        const password = document.getElementById('remove-password').value;
        const otp = document.getElementById('remove-otp').value;
        const errorEl = document.getElementById('final-confirm-error');
        const btn = document.getElementById('final-remove-btn');
        const btnText = document.getElementById('final-remove-btn-text');

        // Clear previous errors
        errorEl.classList.add('hidden');

        // Show loading
        btn.disabled = true;
        btnText.textContent = 'Deleting...';

        try {
            const response = await fetch(`${API_BASE_URL}/api/role/remove`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    role: this.currentRole,
                    password: password,
                    otp: otp
                })
            });

            const data = await response.json();

            // Debug logging
            console.log('[RoleManager] Remove role response status:', response.status);
            console.log('[RoleManager] Response OK:', response.ok);
            console.log('[RoleManager] Response data:', data);
            console.log('[RoleManager] data.success:', data.success);

            if (response.ok && data.success) {
                // Success - role scheduled for deletion with 90-day grace period
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

                // Clear current role in localStorage (backend returns null for active_role)
                localStorage.removeItem('userRole');
                user.current_role = null;
                user.active_role = null;
                currentUser.role = null;
                currentUser.active_role = null;
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('currentUser', JSON.stringify(currentUser));

                // CRITICAL: Update dropdown elements immediately BEFORE redirect
                const dropdownProfileLink = document.getElementById('dropdown-profile-link');
                const dropdownUserRole = document.getElementById('dropdown-user-role');

                if (dropdownProfileLink) {
                    dropdownProfileLink.href = '#';
                    dropdownProfileLink.onclick = (e) => {
                        e.preventDefault();
                        if (window.openAddRoleModal) {
                            window.openAddRoleModal();
                        }
                    };
                }

                if (dropdownUserRole) {
                    dropdownUserRole.textContent = 'No role selected';
                }

                // Update profile dropdown to reflect no active role
                if (typeof window.updateProfileDropdown === 'function') {
                    await window.updateProfileDropdown();
                }

                // Show success panel in modal instead of alert
                this.showSuccessPanel(data);
            } else {
                // Show error
                errorEl.textContent = data.detail || 'Removal failed. Please check your credentials and try again.';
                errorEl.classList.remove('hidden');
                btn.disabled = false;
                btnText.textContent = 'Yes, Delete Permanently';
            }
        } catch (error) {
            console.error('Error removing role:', error);
            errorEl.textContent = 'An error occurred. Please try again.';
            errorEl.classList.remove('hidden');
            btn.disabled = false;
            btnText.textContent = 'Yes, Delete Permanently';
        }
    },

    /**
     * Show success panel after successful role removal
     */
    showSuccessPanel: function(data) {
        const finalPanel = document.getElementById('final-confirmation-panel');
        const successPanel = document.getElementById('success-panel');

        // Update role name
        const successRoleName = document.getElementById('success-role-name');
        if (successRoleName) {
            successRoleName.textContent = this.currentRole;
        }

        // Update deletion date
        const deletionDate = document.getElementById('deletion-date');
        const daysRemaining = document.getElementById('days-remaining');
        if (data.scheduled_deletion_at && deletionDate && daysRemaining) {
            const date = new Date(data.scheduled_deletion_at);
            deletionDate.textContent = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            daysRemaining.textContent = data.days_remaining || 90;
        }

        // Update remaining roles info
        const remainingRolesText = document.getElementById('remaining-roles-text');
        if (remainingRolesText) {
            const remainingCount = data.remaining_active_roles?.length || 0;
            if (remainingCount > 0) {
                const rolesList = data.remaining_active_roles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ');
                remainingRolesText.textContent = `You have ${remainingCount} other active role${remainingCount > 1 ? 's' : ''}: ${rolesList}`;
            } else {
                remainingRolesText.textContent = 'You have no active roles remaining. You can add a role from the homepage.';
            }
        }

        // Slide out final panel, slide in success panel
        if (finalPanel && successPanel) {
            finalPanel.classList.add('translate-x-full');
            successPanel.classList.remove('translate-x-full');
        }
    }
};

/**
 * Global function to open the manage role modal
 */
async function openManageRoleModal() {
    console.log('[openManageRoleModal] Opening modal...');

    // Check if modal is already loaded
    let modal = document.getElementById('manage-role-modal');

    if (!modal) {
        console.log('[openManageRoleModal] Modal not loaded, loading now...');

        // Load the modal first if it doesn't exist
        // Try different modal loader implementations
        if (typeof modalLoader !== 'undefined' && modalLoader.loadModal) {
            try {
                await modalLoader.loadModal('manage-role-modal.html');
                console.log('[openManageRoleModal] Modal loaded successfully');

                // Get modal after loading
                modal = document.getElementById('manage-role-modal');
            } catch (error) {
                console.error('[openManageRoleModal] Error loading modal:', error);
                return;
            }
        } else if (typeof ModalLoader !== 'undefined' && ModalLoader.load) {
            try {
                await ModalLoader.load('manage-role-modal.html');
                console.log('[openManageRoleModal] Modal loaded successfully');

                // Get modal after loading
                modal = document.getElementById('manage-role-modal');
            } catch (error) {
                console.error('[openManageRoleModal] Error loading modal:', error);
                return;
            }
        } else if (typeof CommonModalLoader !== 'undefined' && CommonModalLoader.load) {
            try {
                await CommonModalLoader.load('manage-role-modal.html');
                console.log('[openManageRoleModal] Modal loaded successfully via CommonModalLoader');

                // Get modal after loading
                modal = document.getElementById('manage-role-modal');
            } catch (error) {
                console.error('[openManageRoleModal] Error loading modal:', error);
                return;
            }
        } else {
            console.error('[openManageRoleModal] Modal loader not found and modal not in DOM');
            return;
        }
    }

    if (modal) {
        console.log('[openManageRoleModal] Showing modal and initializing...');
        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        // Initialize the manager
        await RoleManager.init();
    } else {
        console.error('[openManageRoleModal] Modal still not found after loading attempt');
    }
}

/**
 * Global function to close the manage role modal
 */
function closeManageRoleModal() {
    const modal = document.getElementById('manage-role-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';

        // Close any open panels
        RoleManager.closeActionPanel();

        // Refresh deletion countdown banner in case role status changed
        if (window.DeletionCountdownBanner) {
            window.DeletionCountdownBanner.checkAndShowBanner();
        }
    }
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('manage-role-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closeManageRoleModal();
        }
    }
});
