/**
 * Account Restoration Modal
 * Automatically shows when user logs in with scheduled account deletion
 * Allows user to recover account or continue with deletion
 */

const AccountRestorationModal = {
    deletionData: null,

    /**
     * Check if account is scheduled for deletion
     * Called after successful login
     */
    async checkAndShowModal() {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/account/delete/status`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.log('[AccountRestoration] Could not check deletion status');
                return;
            }

            const data = await response.json();

            if (data.success && data.has_pending_deletion) {
                console.log('[AccountRestoration] Account scheduled for deletion - showing modal');
                this.deletionData = data;
                this.showModal(data);
            } else {
                console.log('[AccountRestoration] No pending deletion');
            }

        } catch (error) {
            console.error('[AccountRestoration] Error checking deletion status:', error);
        }
    },

    /**
     * Show the restoration modal with deletion info
     */
    showModal(data) {
        const modal = document.getElementById('account-restoration-modal');
        if (!modal) {
            console.error('[AccountRestoration] Modal element not found');
            return;
        }

        // Update days remaining (large number)
        const daysRemainingEl = document.getElementById('restoration-days-remaining');
        if (daysRemainingEl) {
            daysRemainingEl.textContent = data.days_remaining || 0;
        }

        // Update deletion date
        const deletionDateEl = document.getElementById('restoration-deletion-date');
        if (deletionDateEl && data.scheduled_deletion_at) {
            const deletionDate = new Date(data.scheduled_deletion_at);
            deletionDateEl.textContent = deletionDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Update time remaining (detailed)
        const timeRemainingEl = document.getElementById('restoration-time-remaining');
        if (timeRemainingEl && data.scheduled_deletion_at) {
            const timeRemaining = this.calculateTimeRemaining(data.scheduled_deletion_at);
            timeRemainingEl.textContent = timeRemaining;
        }

        // Update requested date
        const requestedDateEl = document.getElementById('restoration-requested-date');
        if (requestedDateEl && data.requested_at) {
            const requestedDate = new Date(data.requested_at);
            requestedDateEl.textContent = requestedDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        // Show reasons if available
        if (data.reasons && data.reasons.length > 0) {
            const reasonsSection = document.getElementById('restoration-reasons-section');
            const reasonsEl = document.getElementById('restoration-reasons');

            if (reasonsSection && reasonsEl) {
                const reasonMap = {
                    'not_useful': 'Not useful for me',
                    'too_expensive': 'Too expensive',
                    'found_alternative': 'Found an alternative',
                    'technical_issues': 'Technical issues',
                    'privacy_concerns': 'Privacy concerns',
                    'other': data.other_reason || 'Other reason'
                };

                const reasonsList = data.reasons.map(r => reasonMap[r] || r).join(', ');
                reasonsEl.textContent = reasonsList;
                reasonsSection.classList.remove('hidden');
            }
        }

        // Show modal
        modal.classList.remove('hidden');
    },

    /**
     * Calculate time remaining in human-readable format
     */
    calculateTimeRemaining(scheduledDeletionAt) {
        const now = new Date();
        const deletionDate = new Date(scheduledDeletionAt);
        const diff = deletionDate - now;

        if (diff <= 0) {
            return '0 days, 0 hours';
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return `${days} days, ${hours} hours, ${minutes} minutes`;
    },

    /**
     * Recover account (cancel deletion)
     */
    async recoverAccount() {
        const btn = document.getElementById('recover-account-btn');
        if (!btn) return;

        // Disable button
        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.innerHTML = `
            <svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Recovering...
        `;

        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error('No access token found');
            }

            const response = await fetch(`${API_BASE_URL}/api/account/delete/cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                console.log('[AccountRestoration] Account recovered successfully');

                // Show success message
                this.showSuccessMessage();

                // Close modal after 2 seconds
                setTimeout(() => {
                    this.closeModal();
                    // Refresh page to update UI
                    window.location.reload();
                }, 2000);

            } else {
                throw new Error(data.message || 'Failed to recover account');
            }

        } catch (error) {
            console.error('[AccountRestoration] Error recovering account:', error);

            // Show error message
            alert(`Failed to recover account: ${error.message}`);

            // Re-enable button
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    },

    /**
     * Show success message in modal
     */
    showSuccessMessage() {
        const modal = document.getElementById('account-restoration-modal');
        if (!modal) return;

        const content = modal.querySelector('.modal-content');
        if (!content) return;

        content.innerHTML = `
            <div class="text-center py-12">
                <div class="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <h3 class="text-3xl font-bold text-gray-800 mb-2">Account Recovered!</h3>
                <p class="text-gray-600 text-lg mb-4">Your account has been successfully restored.</p>
                <p class="text-gray-500 text-sm">Refreshing page...</p>
            </div>
        `;
    },

    /**
     * Close modal
     */
    closeModal() {
        const modal = document.getElementById('account-restoration-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
};

// Export for use in other modules
window.AccountRestorationModal = AccountRestorationModal;
