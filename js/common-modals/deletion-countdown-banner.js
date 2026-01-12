/**
 * Deletion Countdown - Nav Integration
 * Shows a countdown timer in the role-switcher dropdown when user has a pending role deletion
 * Allows user to restore their deleted role before the 90-day grace period expires
 */

class DeletionCountdownNav {
    constructor() {
        this.deletionData = null;
        this.countdownInterval = null;
    }

    /**
     * Initialize - check for pending deletions and inject into nav
     */
    async init() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) return;

            const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
            const response = await fetch(`${API_BASE_URL}/api/account/delete/status`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) return;

            const data = await response.json();

            if (data.success && data.has_pending_deletion) {
                this.deletionData = data;
                this.injectIntoNav();
                this.startCountdown();
            }
        } catch (error) {
            console.error('Error checking deletion status:', error);
        }
    }

    /**
     * Inject the pending deletion notice into the role-switcher section
     */
    injectIntoNav() {
        // Find the role-switcher-section
        const roleSwitcherSection = document.getElementById('role-switcher-section');
        if (!roleSwitcherSection) {
            console.warn('Role switcher section not found, trying alternative placement');
            this.injectAlternative();
            return;
        }

        // Check if already injected
        if (document.getElementById('pending-deletion-notice')) return;

        const { role, days_remaining } = this.deletionData;

        // Create the pending deletion notice
        const notice = document.createElement('div');
        notice.id = 'pending-deletion-notice';
        notice.className = 'pending-deletion-notice';
        notice.innerHTML = `
            <div class="deletion-notice-header">
                <svg class="deletion-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="deletion-role">${this.capitalizeFirst(role)} Deletion</span>
            </div>
            <div class="deletion-countdown" id="nav-deletion-countdown">
                <span class="countdown-days">${days_remaining}</span> days remaining
            </div>
            <button class="restore-role-btn" onclick="deletionCountdownNav.restoreRole()">
                <svg class="restore-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Restore ${this.capitalizeFirst(role)}
            </button>
        `;

        // Add styles
        this.addStyles();

        // Insert before the role options
        const roleOptions = roleSwitcherSection.querySelector('.role-options');
        if (roleOptions) {
            roleSwitcherSection.insertBefore(notice, roleOptions);
        } else {
            roleSwitcherSection.appendChild(notice);
        }

        // Make sure role-switcher is visible
        roleSwitcherSection.classList.remove('hidden');
    }

    /**
     * Alternative placement if role-switcher not found - inject into profile dropdown
     */
    injectAlternative() {
        const profileDropdown = document.querySelector('.profile-dropdown-content, .dropdown-content');
        if (!profileDropdown) return;

        // Check if already injected
        if (document.getElementById('pending-deletion-notice')) return;

        const { role, days_remaining } = this.deletionData;

        const notice = document.createElement('div');
        notice.id = 'pending-deletion-notice';
        notice.className = 'pending-deletion-notice';
        notice.innerHTML = `
            <div class="deletion-notice-header">
                <svg class="deletion-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="deletion-role">${this.capitalizeFirst(role)} Deletion</span>
            </div>
            <div class="deletion-countdown" id="nav-deletion-countdown">
                <span class="countdown-days">${days_remaining}</span> days remaining
            </div>
            <button class="restore-role-btn" onclick="deletionCountdownNav.restoreRole()">
                <svg class="restore-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Restore ${this.capitalizeFirst(role)}
            </button>
        `;

        this.addStyles();

        // Insert at the beginning of dropdown
        const firstDivider = profileDropdown.querySelector('.dropdown-divider');
        if (firstDivider) {
            profileDropdown.insertBefore(notice, firstDivider);
        } else {
            profileDropdown.insertBefore(notice, profileDropdown.firstChild);
        }
    }

    /**
     * Add CSS styles
     */
    addStyles() {
        if (document.getElementById('deletion-nav-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'deletion-nav-styles';
        styles.textContent = `
            .pending-deletion-notice {
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                border: 1px solid #f59e0b;
                border-radius: 8px;
                padding: 10px 12px;
                margin: 8px 12px;
                animation: pulseWarning 2s ease-in-out infinite;
            }

            @keyframes pulseWarning {
                0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
                50% { box-shadow: 0 0 0 4px rgba(245, 158, 11, 0); }
            }

            .pending-deletion-notice .deletion-notice-header {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 4px;
            }

            .pending-deletion-notice .deletion-icon {
                width: 16px;
                height: 16px;
                color: #d97706;
            }

            .pending-deletion-notice .deletion-role {
                font-size: 12px;
                font-weight: 600;
                color: #92400e;
            }

            .pending-deletion-notice .deletion-countdown {
                font-size: 11px;
                color: #a16207;
                margin-bottom: 8px;
            }

            .pending-deletion-notice .countdown-days {
                font-weight: 700;
                font-size: 14px;
                color: #d97706;
            }

            .pending-deletion-notice .restore-role-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                width: 100%;
                padding: 6px 10px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .pending-deletion-notice .restore-role-btn:hover {
                background: linear-gradient(135deg, #059669 0%, #047857 100%);
                transform: translateY(-1px);
            }

            .pending-deletion-notice .restore-icon {
                width: 14px;
                height: 14px;
            }

            /* Dark mode support */
            .dark .pending-deletion-notice {
                background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
                border-color: #d97706;
            }

            .dark .pending-deletion-notice .deletion-role {
                color: #fef3c7;
            }

            .dark .pending-deletion-notice .deletion-countdown {
                color: #fcd34d;
            }

            .dark .pending-deletion-notice .countdown-days {
                color: #fbbf24;
            }

            /* Success state */
            .pending-deletion-notice.restored {
                background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
                border-color: #10b981;
                animation: none;
            }

            .pending-deletion-notice.restored .deletion-icon {
                color: #059669;
            }

            .pending-deletion-notice.restored .deletion-role {
                color: #065f46;
            }

            .pending-deletion-notice.restored .deletion-countdown {
                color: #047857;
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Start countdown timer
     */
    startCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        const scheduledDate = new Date(this.deletionData.scheduled_deletion_at);

        const updateCountdown = () => {
            const now = new Date();
            const diff = scheduledDate - now;

            if (diff <= 0) {
                clearInterval(this.countdownInterval);
                const countdown = document.getElementById('nav-deletion-countdown');
                if (countdown) {
                    countdown.innerHTML = '<span class="countdown-days" style="color: #dc2626;">Imminent</span>';
                }
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            const countdown = document.getElementById('nav-deletion-countdown');
            if (countdown) {
                if (days > 0) {
                    countdown.innerHTML = `<span class="countdown-days">${days}</span> days, ${hours}h left`;
                } else {
                    countdown.innerHTML = `<span class="countdown-days" style="color: #dc2626;">${hours}h</span> remaining`;
                }
            }
        };

        // Update immediately
        updateCountdown();

        // Then every minute
        this.countdownInterval = setInterval(updateCountdown, 60000);
    }

    /**
     * Restore the deleted role
     */
    async restoreRole() {
        const restoreBtn = document.querySelector('.pending-deletion-notice .restore-role-btn');
        if (!restoreBtn) return;

        const originalText = restoreBtn.innerHTML;

        try {
            restoreBtn.disabled = true;
            restoreBtn.innerHTML = `
                <svg class="restore-icon animate-spin" fill="none" viewBox="0 0 24 24" style="animation: spin 1s linear infinite;">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Restoring...
            `;

            // Add spin animation
            const spinStyle = document.createElement('style');
            spinStyle.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
            document.head.appendChild(spinStyle);

            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

            const response = await fetch(`${API_BASE_URL}/api/account/delete/cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showSuccess(data.role_restored);
            } else {
                alert(`Failed to restore role: ${data.detail || 'Unknown error'}`);
                restoreBtn.disabled = false;
                restoreBtn.innerHTML = originalText;
            }
        } catch (error) {
            console.error('Error restoring role:', error);
            alert('Network error. Please try again.');
            restoreBtn.disabled = false;
            restoreBtn.innerHTML = originalText;
        }
    }

    /**
     * Show success message and reload
     */
    showSuccess(role) {
        const notice = document.getElementById('pending-deletion-notice');
        if (notice) {
            notice.classList.add('restored');
            notice.innerHTML = `
                <div class="deletion-notice-header">
                    <svg class="deletion-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #059669;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span class="deletion-role" style="color: #065f46;">${this.capitalizeFirst(role)} Restored!</span>
                </div>
                <div class="deletion-countdown" style="color: #047857;">
                    Refreshing page...
                </div>
            `;
        }

        // Reload after a short delay
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    }

    /**
     * Capitalize first letter
     */
    capitalizeFirst(str) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    }
}

// Create global instance
const deletionCountdownNav = new DeletionCountdownNav();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure nav is fully rendered
    setTimeout(() => {
        deletionCountdownNav.init();
    }, 500);
});

// Export for use in other scripts
window.deletionCountdownNav = deletionCountdownNav;
