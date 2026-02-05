/**
 * Deletion Countdown Banner
 * Shows a warning banner in profile dropdown when a user has a ROLE scheduled for deletion (90-day grace period)
 *
 * NOTE: Account deletion (Leave Astegni) is handled separately by account-restoration-modal.js
 * which shows a full-screen modal on login, not a banner in the dropdown.
 */

const DeletionCountdownBanner = {
    /**
     * Check if user has any deletions scheduled
     * NOTE: Only checks ROLE deletion, not account deletion
     * (Account deletion is handled by account-restoration-modal on login)
     */
    async checkAndShowBanner() {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;

            // Check for role deletion only (not account deletion)
            // Account deletion is handled by the restoration modal on login
            const roleDeletion = await this.checkRoleDeletion(token);
            if (roleDeletion) {
                this.showBanner(roleDeletion);
                return;
            }

            // Nothing scheduled - hide banner
            this.hideBanner();

        } catch (error) {
            console.error('[DeletionCountdown] Error checking deletion status:', error);
        }
    },

    /**
     * Check if any role is scheduled for deletion
     */
    async checkRoleDeletion(token) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/role/deletion-status`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) return null;

            const data = await response.json();

            if (data.success && data.has_pending_deletion) {
                return {
                    type: 'role',
                    role: data.role,
                    days_remaining: data.days_remaining,
                    scheduled_deletion_at: data.scheduled_deletion_at
                };
            }

            return null;
        } catch (error) {
            console.log('[DeletionCountdown] Error checking role deletion:', error);
            return null;
        }
    },

    /**
     * Show the countdown banner with deletion info
     */
    showBanner(data) {
        const banner = document.getElementById('deletion-countdown-banner');
        const divider = document.getElementById('countdown-divider');
        const roleNameEl = document.getElementById('countdown-role-name');
        const daysEl = document.getElementById('countdown-days');

        if (!banner) return;

        // Update content
        if (roleNameEl) {
            roleNameEl.textContent = data.role;
        }

        if (daysEl) {
            daysEl.textContent = data.days_remaining;
        }

        // Store role info globally for restore button
        window.scheduledDeletionRole = data.role;

        // Show banner and divider
        banner.classList.remove('hidden');
        if (divider) {
            divider.style.display = 'block';
        }

        console.log(`[DeletionCountdown] Showing banner for role: ${data.role} (${data.days_remaining} days remaining)`);
    },

    /**
     * Hide the countdown banner
     */
    hideBanner() {
        const banner = document.getElementById('deletion-countdown-banner');
        const divider = document.getElementById('countdown-divider');

        if (banner) {
            banner.classList.add('hidden');
        }

        if (divider) {
            divider.style.display = 'none';
        }
    }
};

// Check for scheduled deletions when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for auth to initialize
    setTimeout(() => {
        DeletionCountdownBanner.checkAndShowBanner();
    }, 1000);
});

// Hook into profile dropdown toggle - retry if not available yet
function hookIntoProfileDropdown() {
    const originalToggleProfileDropdown = window.toggleProfileDropdown;
    if (typeof originalToggleProfileDropdown === 'function') {
        console.log('[DeletionCountdown] Hooking into toggleProfileDropdown');
        window.toggleProfileDropdown = function() {
            originalToggleProfileDropdown();
            DeletionCountdownBanner.checkAndShowBanner();
        };
    } else {
        console.warn('[DeletionCountdown] toggleProfileDropdown not found, retrying in 500ms');
        setTimeout(hookIntoProfileDropdown, 500);
    }
}

// Try to hook in immediately and retry if needed
hookIntoProfileDropdown();

// Export for use in other modules
window.DeletionCountdownBanner = DeletionCountdownBanner;

// Function to restore scheduled role (called from Restore Role button)
window.restoreScheduledRole = function() {
    const role = window.scheduledDeletionRole;
    if (!role) {
        console.error('[DeletionCountdown] No scheduled deletion role found');
        return;
    }

    console.log('[DeletionCountdown] Restoring role:', role);

    // Open add role modal with pre-selected role
    if (typeof window.openAddRoleModal === 'function') {
        window.openAddRoleModal(role);
    } else {
        console.error('[DeletionCountdown] openAddRoleModal function not found');
    }
};
