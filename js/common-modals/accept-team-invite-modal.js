/**
 * Accept Team Invite Modal
 * Handles accepting/declining brand team invitations from email links
 *
 * Usage: When user clicks invitation link (e.g., astegni.com?team_invite=TOKEN)
 * the modal opens automatically and shows invitation details
 */

const AcceptTeamInviteModal = {
    // State
    invitationToken: null,
    invitationData: null,
    isProcessing: false,

    /**
     * Initialize - Check URL for invitation token on page load
     */
    initialize() {
        // Check URL for team invite token
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('team_invite');

        if (token) {
            console.log('Team invite token found:', token.substring(0, 10) + '...');
            this.invitationToken = token;
            this.loadAndShowModal();
        }
    },

    /**
     * Load modal HTML and show it
     */
    async loadAndShowModal() {
        try {
            // Check if modal already exists
            let overlay = document.getElementById('accept-team-invite-modal-overlay');

            if (!overlay) {
                // Load modal HTML
                const response = await fetch('modals/common-modals/accept-team-invite-modal.html');
                if (!response.ok) {
                    console.error('Failed to load team invite modal');
                    return;
                }

                const html = await response.text();
                const container = document.createElement('div');
                container.innerHTML = html;
                document.body.appendChild(container.firstElementChild);

                overlay = document.getElementById('accept-team-invite-modal-overlay');
            }

            // Load CSS if not already loaded
            if (!document.querySelector('link[href*="accept-team-invite-modal.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'css/common-modals/accept-team-invite-modal.css';
                document.head.appendChild(link);
            }

            // Show modal
            this.open();

            // Validate token and load invitation data
            await this.validateInvitation();
        } catch (error) {
            console.error('Error loading team invite modal:', error);
        }
    },

    /**
     * Open the modal
     */
    open() {
        const overlay = document.getElementById('accept-team-invite-modal-overlay');
        if (overlay) {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },

    /**
     * Close the modal
     */
    close() {
        const overlay = document.getElementById('accept-team-invite-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';

            // Clean up URL parameter
            const url = new URL(window.location);
            url.searchParams.delete('team_invite');
            window.history.replaceState({}, '', url);
        }
    },

    /**
     * Show specific state in modal
     */
    showState(stateName) {
        const states = ['team-invite-loading', 'team-invite-error', 'team-invite-login-required',
                        'team-invite-content', 'team-invite-success'];

        states.forEach(state => {
            const el = document.getElementById(state);
            if (el) {
                el.style.display = state === stateName ? 'flex' : 'none';
            }
        });
    },

    /**
     * Validate invitation token via API
     */
    async validateInvitation() {
        this.showState('team-invite-loading');

        try {
            const response = await fetch(`${API_BASE_URL}/api/advertiser/team/invitation/${this.invitationToken}`);
            const data = await response.json();

            if (!response.ok) {
                // Show error state
                this.showError(data.detail || 'This invitation link is invalid or has expired.');
                return;
            }

            this.invitationData = data;

            // Check if user is logged in
            const token = localStorage.getItem('token');
            if (!token) {
                this.showLoginRequired();
                return;
            }

            // Check if logged-in user's email matches invitation
            const userResponse = await fetch(`${API_BASE_URL}/api/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!userResponse.ok) {
                // Token expired, show login required
                this.showLoginRequired();
                return;
            }

            const userData = await userResponse.json();

            if (userData.email.toLowerCase() !== data.email.toLowerCase()) {
                // Wrong account logged in
                this.showError(`This invitation was sent to ${data.email}. Please log in with that email address to accept.`);
                return;
            }

            // Show invitation content
            this.showInvitationContent();

        } catch (error) {
            console.error('Error validating invitation:', error);
            this.showError('Unable to validate invitation. Please try again later.');
        }
    },

    /**
     * Show error state
     */
    showError(message) {
        this.showState('team-invite-error');
        const messageEl = document.getElementById('team-invite-error-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
    },

    /**
     * Show login required state
     */
    showLoginRequired() {
        this.showState('team-invite-login-required');
        const emailEl = document.getElementById('team-invite-expected-email');
        if (emailEl && this.invitationData) {
            emailEl.textContent = this.invitationData.email;
        }
    },

    /**
     * Show invitation content
     */
    showInvitationContent() {
        this.showState('team-invite-content');

        const data = this.invitationData;
        if (!data) return;

        // Update inviter name
        const inviterEl = document.getElementById('team-invite-inviter-name');
        if (inviterEl) {
            inviterEl.textContent = data.inviter_name || 'Someone';
        }

        // Update brand name
        const brandNameEl = document.getElementById('team-invite-brand-name');
        if (brandNameEl) {
            brandNameEl.textContent = data.brand_name || 'A Brand';
        }

        // Update brand logo
        const brandLogoEl = document.getElementById('team-invite-brand-logo');
        if (brandLogoEl && data.brand_logo) {
            brandLogoEl.innerHTML = `<img src="${data.brand_logo}" alt="${data.brand_name}">`;
        }

        // Show can_set_price permission if applicable
        const pricePermissionEl = document.getElementById('team-invite-price-permission');
        if (pricePermissionEl) {
            pricePermissionEl.style.display = data.can_set_price ? 'flex' : 'none';
        }
    },

    /**
     * Open login modal
     */
    openLogin() {
        this.close();
        // Trigger login modal - depends on your login modal implementation
        if (typeof openLoginModal === 'function') {
            openLoginModal();
        } else if (typeof showLoginModal === 'function') {
            showLoginModal();
        } else {
            // Fallback: click the login button if exists
            const loginBtn = document.querySelector('[data-action="login"]') ||
                            document.querySelector('.login-btn') ||
                            document.getElementById('login-btn');
            if (loginBtn) {
                loginBtn.click();
            }
        }
    },

    /**
     * Open register modal
     */
    openRegister() {
        this.close();
        // Trigger register modal - depends on your register modal implementation
        if (typeof openRegisterModal === 'function') {
            openRegisterModal();
        } else if (typeof showRegisterModal === 'function') {
            showRegisterModal();
        } else {
            // Fallback: click the register button if exists
            const registerBtn = document.querySelector('[data-action="register"]') ||
                               document.querySelector('.register-btn') ||
                               document.getElementById('register-btn');
            if (registerBtn) {
                registerBtn.click();
            }
        }
    },

    /**
     * Decline invitation
     */
    async decline() {
        if (this.isProcessing) return;

        const confirmed = confirm('Are you sure you want to decline this invitation?');
        if (!confirmed) return;

        this.isProcessing = true;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/advertiser/team/invitation/${this.invitationToken}/decline`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.showError('You have declined the invitation.');
            } else {
                const data = await response.json();
                this.showError(data.detail || 'Failed to decline invitation.');
            }
        } catch (error) {
            console.error('Error declining invitation:', error);
            this.showError('Failed to decline invitation. Please try again.');
        } finally {
            this.isProcessing = false;
        }
    },

    /**
     * Accept invitation
     */
    async accept() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        const acceptBtn = document.getElementById('team-invite-accept-btn');
        if (acceptBtn) {
            acceptBtn.disabled = true;
            acceptBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Accepting...';
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/advertiser/team/invitation/${this.invitationToken}/accept`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Show success state
                this.showState('team-invite-success');
                const brandNameEl = document.getElementById('team-invite-success-brand');
                if (brandNameEl) {
                    brandNameEl.textContent = this.invitationData?.brand_name || 'the team';
                }

                // Show notification if available
                if (typeof showNotification === 'function') {
                    showNotification('Welcome to the team!', 'success');
                }
            } else {
                this.showError(data.detail || 'Failed to accept invitation.');
            }
        } catch (error) {
            console.error('Error accepting invitation:', error);
            this.showError('Failed to accept invitation. Please try again.');
        } finally {
            this.isProcessing = false;
            if (acceptBtn) {
                acceptBtn.disabled = false;
                acceptBtn.innerHTML = '<i class="fas fa-check"></i> Accept Invitation';
            }
        }
    },

    /**
     * Navigate to advertiser dashboard
     */
    goToAdvertiser() {
        this.close();
        window.location.href = 'profile-pages/advertiser-profile.html';
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    AcceptTeamInviteModal.initialize();
});

// Also check on popstate (browser back/forward)
window.addEventListener('popstate', () => {
    AcceptTeamInviteModal.initialize();
});
